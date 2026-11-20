export type CalloutType = 'info' | 'tip' | 'warning' | 'danger';

export type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'wikilink'; target: string; anchor?: string; label: string }
  | { type: 'highlight'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'italic'; value: string }
  | { type: 'code'; value: string };

export type ObsidianBlock =
  | { type: 'frontmatter'; entries: Array<{ key: string; value: string }> }
  | { type: 'heading'; level: number; raw: string; tokens: InlineToken[] }
  | { type: 'callout'; calloutType: CalloutType; title: string; titleTokens: InlineToken[]; lines: InlineToken[][] }
  | { type: 'blockquote'; lines: InlineToken[][] }
  | { type: 'list'; ordered: boolean; items: InlineToken[][] }
  | { type: 'codeblock'; lang: string; code: string }
  | { type: 'hr' }
  | { type: 'paragraph'; tokens: InlineToken[] };

/**
 * Tokenizes inline Obsidian syntax: [[WikiLinks#Anchor|Alias]], ==highlights==,
 * **bold**, *italic*, and `inline code`.
 */
export function tokenizeInline(input: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const pattern = /(\[\[[^\]]+\]\]|==[^=]+==|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(input)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: input.slice(lastIndex, match.index) });
    }

    const tokenStr = match[0];
    if (tokenStr.startsWith('[[')) {
      const inner = tokenStr.slice(2, -2);
      const [pathPart, aliasPart] = inner.split('|');
      const [target, anchor] = pathPart.split('#');
      const label = aliasPart ? aliasPart.trim() : anchor ? `${target.trim()} — ${anchor.trim()}` : target.trim();
      tokens.push({
        type: 'wikilink',
        target: target.trim(),
        anchor: anchor?.trim(),
        label,
      });
    } else if (tokenStr.startsWith('==')) {
      tokens.push({ type: 'highlight', value: tokenStr.slice(2, -2) });
    } else if (tokenStr.startsWith('**')) {
      tokens.push({ type: 'bold', value: tokenStr.slice(2, -2) });
    } else if (tokenStr.startsWith('*')) {
      tokens.push({ type: 'italic', value: tokenStr.slice(1, -1) });
    } else if (tokenStr.startsWith('`')) {
      tokens.push({ type: 'code', value: tokenStr.slice(1, -1) });
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < input.length) {
    tokens.push({ type: 'text', value: input.slice(lastIndex) });
  }

  return tokens;
}

/**
 * Parses an Obsidian Markdown note into structured blocks for safe React rendering.
 */
export function parseObsidianMarkdown(markdown: string): ObsidianBlock[] {
  const blocks: ObsidianBlock[] = [];
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  let i = 0;

  // 1. YAML Frontmatter
  if (lines[0]?.trim() === '---') {
    const entries: Array<{ key: string; value: string }> = [];
    let endIdx = -1;
    for (let j = 1; j < lines.length; j++) {
      if (lines[j].trim() === '---') {
        endIdx = j;
        break;
      }
      const kv = lines[j].match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*)$/);
      if (kv) {
        entries.push({ key: kv[1], value: kv[2].trim().replace(/^["']|["']$/g, '') });
      }
    }
    if (endIdx !== -1) {
      blocks.push({ type: 'frontmatter', entries });
      i = endIdx + 1;
    }
  }

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Code block
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push({ type: 'codeblock', lang, code: codeLines.join('\n') });
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Headings
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        raw: headingMatch[2],
        tokens: tokenizeInline(headingMatch[2]),
      });
      i++;
      continue;
    }

    // Callout or Blockquote
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }

      const firstLine = quoteLines[0] ?? '';
      const calloutMatch = firstLine.match(/^\[!(info|tip|warning|danger)\]\s*(.*)$/i);
      if (calloutMatch) {
        const calloutType = calloutMatch[1].toLowerCase() as CalloutType;
        const title = calloutMatch[2].trim() || calloutType.toUpperCase();
        const bodyLines = quoteLines.slice(1).filter((l, idx, arr) => !(l === '' && idx === 0 && arr.length > 1));
        blocks.push({
          type: 'callout',
          calloutType,
          title,
          titleTokens: tokenizeInline(title),
          lines: bodyLines.map((l) => tokenizeInline(l)),
        });
      } else {
        blocks.push({
          type: 'blockquote',
          lines: quoteLines.map((l) => tokenizeInline(l)),
        });
      }
      continue;
    }

    // Unordered or ordered list
    const ulMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (ulMatch || olMatch) {
      const ordered = Boolean(olMatch);
      const items: InlineToken[][] = [];
      while (i < lines.length) {
        const cur = lines[i].trim();
        const m = ordered ? cur.match(/^\d+\.\s+(.+)$/) : cur.match(/^[-*+]\s+(.+)$/);
        if (!m) break;
        items.push(tokenizeInline(m[1]));
        i++;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    // Paragraph (gather contiguous non-special lines)
    const paraLines: string[] = [trimmed];
    i++;
    while (i < lines.length) {
      const next = lines[i].trim();
      if (
        !next ||
        next.startsWith('#') ||
        next.startsWith('>') ||
        next.startsWith('```') ||
        /^[-*+]\s+/.test(next) ||
        /^\d+\.\s+/.test(next) ||
        /^(-{3,}|\*{3,})$/.test(next)
      ) {
        break;
      }
      paraLines.push(next);
      i++;
    }
    blocks.push({
      type: 'paragraph',
      tokens: tokenizeInline(paraLines.join(' ')),
    });
  }

  return blocks;
}
