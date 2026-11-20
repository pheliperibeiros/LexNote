import type { NoteMetadata, NoteStats, ProcessedNoteResult } from './types';
import { DEFAULT_VAULT_LAWS } from './promptBuilder';

/**
 * Strips an outer ```markdown ... ``` or ``` ... ``` wrapper if Gemini returned
 * the whole note inside a single fenced code block.
 */
export function unwrapOuterCodeFence(raw: string): string {
  let trimmed = raw.replace(/^\uFEFF/, '').trim();
  const fenceMatch = trimmed.match(/^```(?:markdown|md|yaml)?\s*\n([\s\S]*?)\n```\s*$/i);
  if (fenceMatch && fenceMatch[1]) {
    return fenceMatch[1].trim();
  }
  // Also strip an unclosed opening code fence on line 1
  if (/^```(?:markdown|md|yaml)?\s*\n/i.test(trimmed)) {
    trimmed = trimmed.replace(/^```(?:markdown|md|yaml)?\s*\n/i, '');
    trimmed = trimmed.replace(/\n```\s*$/i, '');
  }
  return trimmed.trim();
}

/**
 * Removes accidental LLM citation/reference markers like [1], [Cite:1], [Fonte], (ref. 1), 【1】
 * while preserving Obsidian WikiLinks [[...]], callouts [!info], and markdown links [text](url).
 */
export function stripCitationMarkers(text: string): string {
  // Remove 【1】 style markers
  let cleaned = text.replace(/【[^】]*】/g, '');
  // Remove [Cite:1], [cite], [Fonte], [Source], [ref 1] (only single brackets, never [[...]])
  cleaned = cleaned.replace(/(?<!\[)\[(?:cite(?:\s*:\s*[\d,\s]+)?|fonte|source|ref\.?\s*\d*)\](?!\[|\()/gi, '');
  // Remove standalone numeric citations like [1], [1, 2] not preceded by '[' and not followed by ']' or '('
  cleaned = cleaned.replace(/(?<!\[)\[\d+(?:\s*,\s*\d+)*\](?!\[|\()/g, '');
  // Remove parenthetical (ref. 1) or (Fonte 1)
  cleaned = cleaned.replace(/\(\s*(?:ref\.?|cite)\s*[:.]?\s*\d+\s*\)/gi, '');
  // Clean up double spaces created on lines without breaking indentation or trailing double-space linebreaks
  cleaned = cleaned.replace(/([^\n ]) {2,}([^\n ])/g, '$1 $2');
  return cleaned;
}

/**
 * Normalizes the YAML frontmatter block at the top of the note:
 * - Guarantees a single opening `---` at line 1 and single closing `---`.
 * - Absorbs `tags:` even if placed below an early `---` or formatted as a bullet list.
 * - Removes blank lines inside frontmatter and any duplicate/stray `---` lines before the H2 heading.
 */
export function ensureFrontmatterDelimiters(markdown: string): string {
  const normalized = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trimStart();
  const lines = normalized.split('\n');
  if (lines.length === 0) return markdown;

  const frontmatterKeyRe = /^(assunto|disciplina|tipo|data|tags)\s*:\s*(.*)$/i;
  const genericYamlKeyRe = /^[a-zA-Z0-9_-]+\s*:\s*.*$/;
  const headingOrBodyRe = /^(#{1,6}\s+|>|```|\*\*|\d+\.\s+)/;

  // Check if the top of the document actually contains frontmatter metadata
  const scanLimit = Math.min(lines.length, 25);
  let hasHeaderKeys = false;
  for (let i = 0; i < scanLimit; i++) {
    const t = lines[i].trim();
    if (frontmatterKeyRe.test(t)) {
      hasHeaderKeys = true;
      break;
    }
    if (headingOrBodyRe.test(t)) break;
  }

  if (!hasHeaderKeys) {
    return normalized;
  }

  const yamlLines: string[] = [];
  let bodyStartIdx = 0;
  let inTagsList = false;
  const collectedTags: string[] = [];

  const flushTagsList = () => {
    if (inTagsList) {
      yamlLines.push(`tags: [${collectedTags.join(', ')}]`);
      inTagsList = false;
      collectedTags.length = 0;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (headingOrBodyRe.test(trimmed)) {
      bodyStartIdx = i;
      break;
    }

    // Ignore separator lines (`---` / `***`) and blank lines while collecting header metadata
    if (trimmed === '' || /^-{3,}$/.test(trimmed) || /^\*{3,}$/.test(trimmed)) {
      bodyStartIdx = i + 1;
      continue;
    }

    // Multi-line YAML tags list items (`- tag-1`)
    if (inTagsList && /^-\s+(.+)$/.test(trimmed)) {
      const tagVal = trimmed.replace(/^-\s+/, '').replace(/^["'#]|["']$/g, '').trim();
      if (tagVal) collectedTags.push(tagVal);
      bodyStartIdx = i + 1;
      continue;
    }

    const kvMatch = trimmed.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*)$/);
    if (kvMatch && genericYamlKeyRe.test(trimmed)) {
      flushTagsList();
      const key = kvMatch[1];
      const val = kvMatch[2].trim();

      if (key.toLowerCase() === 'tags') {
        if (!val) {
          inTagsList = true;
        } else {
          // Strip accidental `#` from inline tags like [#direito, #civil]
          const cleanVal = val.replace(/(^|[\s\[,])#([a-zA-Z0-9_-]+)/g, '$1$2');
          yamlLines.push(`tags: ${cleanVal}`);
        }
      } else {
        yamlLines.push(`${key}: ${val}`);
      }
      bodyStartIdx = i + 1;
      continue;
    }

    // Reached non-YAML prose before any heading
    bodyStartIdx = i;
    break;
  }

  flushTagsList();

  if (yamlLines.length === 0) {
    return normalized;
  }

  // Strip any stray horizontal rules or leading blank lines right at the start of the body
  let restLines = lines.slice(bodyStartIdx);
  while (
    restLines.length > 0 &&
    (restLines[0].trim() === '' || /^-{3,}$/.test(restLines[0].trim()))
  ) {
    restLines = restLines.slice(1);
  }

  const body = restLines.join('\n');
  return `---\n${yamlLines.join('\n')}\n---\n\n${body}`.trimEnd();
}

/**
 * Extracts YAML frontmatter fields safely.
 */
export function extractMetadata(markdown: string): { metadata: NoteMetadata; hasValidFrontmatter: boolean } {
  const defaults: NoteMetadata = {
    assunto: 'Resumo de Aula',
    disciplina: 'Direito',
    tipo: 'Resumo de Aula',
    data: '',
    tags: [],
  };

  const match = markdown.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) {
    // Try extracting H2 heading as fallback assunto
    const h2Match = markdown.match(/^##\s+(.+)$/m);
    if (h2Match) {
      defaults.assunto = h2Match[1].replace(/\[\[|\]\]/g, '').trim();
    }
    return { metadata: defaults, hasValidFrontmatter: false };
  }

  const yamlBlock = match[1];
  const lines = yamlBlock.split('\n');
  const parsed: NoteMetadata = { ...defaults };

  for (const line of lines) {
    const kvMatch = line.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*)$/);
    if (!kvMatch) continue;
    const key = kvMatch[1].toLowerCase();
    const rawVal = kvMatch[2].trim().replace(/^["']|["']$/g, '');

    if (key === 'assunto') parsed.assunto = rawVal || defaults.assunto;
    else if (key === 'disciplina') parsed.disciplina = rawVal || defaults.disciplina;
    else if (key === 'tipo') parsed.tipo = rawVal || defaults.tipo;
    else if (key === 'data') parsed.data = rawVal;
    else if (key === 'tags') {
      const bracketMatch = kvMatch[2].trim().match(/^\[(.*)\]$/);
      if (bracketMatch) {
        parsed.tags = bracketMatch[1]
          .split(',')
          .map((t) => t.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean);
      } else if (rawVal) {
        parsed.tags = rawVal
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
      }
    }
  }

  return { metadata: parsed, hasValidFrontmatter: true };
}

/**
 * Creates a clean Obsidian-friendly filename slug from assunto.
 */
export function buildSuggestedFilename(assunto?: string, disciplina?: string): string {
  const base = (assunto && assunto !== 'Resumo de Aula' ? assunto : disciplina || 'resumo-de-aula')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return `${base || 'resumo-obsidian'}.md`;
}

function normalizeForLawMatch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Determines whether an Obsidian WikiLink inner expression (`Target#Anchor|Alias`)
 * points to a legislation/statute note rather than a conceptual/doctrine note.
 */
export function isLegislationWikiLink(
  inner: string,
  vaultLaws: string[] = DEFAULT_VAULT_LAWS
): boolean {
  const [pathPart] = inner.split('|');
  const [rawTarget, rawAnchor] = pathPart.split('#');
  const target = (rawTarget ?? '').trim();
  const anchor = (rawAnchor ?? '').trim();
  if (!target) return false;

  const normTarget = normalizeForLawMatch(target);
  const normLaws = vaultLaws.map(normalizeForLawMatch);

  if (normLaws.some((law) => normTarget === law || normTarget.startsWith(law))) {
    return true;
  }

  // Anchor explicitly references an article/paragraph/inciso (e.g. #Art. 2º)
  if (/^art\.?\s*\d+/i.test(anchor)) {
    return true;
  }

  // Matches official legislation naming patterns
  const lawNamePattern =
    /^(?:lei(?:\s+(?:complementar|delegada|federal|estadual|municipal|organica|orgânica|das?\s|n[º°]?))?|decreto(?:-lei)?|constituicao|constituição|adct|codigo|código|estatuto|medida\s+provisoria|medida\s+provisória|emenda\s+constitucional|resolucao|resolução|portaria|consolidacao|consolidação|clt|eca|ctn|cdc|lindb|ldb|lrf|lonmp)\b/i;
  return lawNamePattern.test(target) || lawNamePattern.test(normTarget);
}

/**
 * Removes non-legislation [[WikiLinks]], unwrapping them to plain text (alias if present, else target)
 * while keeping all legislation links intact.
 */
export function stripNonLegislationLinks(
  markdown: string,
  vaultLaws: string[] = DEFAULT_VAULT_LAWS
): string {
  return markdown.replace(/\[\[([^\]]+)\]\]/g, (fullMatch, inner: string) => {
    if (isLegislationWikiLink(inner, vaultLaws)) {
      return fullMatch;
    }
    const [pathPart, aliasPart] = inner.split('|');
    if (aliasPart && aliasPart.trim()) {
      return aliasPart.trim();
    }
    const [target] = pathPart.split('#');
    return target.trim();
  });
}

/**
 * Cleans, validates, and extracts stats from the generated Obsidian markdown note.
 */
export function cleanAndValidateObsidianMarkdown(
  rawOutput: string,
  vaultLaws: string[] = DEFAULT_VAULT_LAWS
): ProcessedNoteResult {
  const warnings: string[] = [];

  let markdown = unwrapOuterCodeFence(rawOutput);
  markdown = stripCitationMarkers(markdown);
  markdown = ensureFrontmatterDelimiters(markdown);
  markdown = stripNonLegislationLinks(markdown, vaultLaws);

  // Ensure uppercase callouts get normalized to lowercase [!tip], [!info], [!warning], [!danger]
  markdown = markdown.replace(/>\s*\[!(INFO|TIP|WARNING|DANGER)\]/g, (_, kind: string) => {
    return `> [!${kind.toLowerCase()}]`;
  });

  const { metadata, hasValidFrontmatter } = extractMetadata(markdown);
  if (!hasValidFrontmatter) {
    warnings.push('Bloco YAML frontmatter (---) não detectado ou incompleto no início da nota.');
  }

  // Remove YAML block for content metrics
  const bodyWithoutYaml = markdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '');
  const words = bodyWithoutYaml
    .replace(/[#>*`\[\]|=]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const headingMatches = bodyWithoutYaml.match(/^#{2,6}\s+.+$/gm) ?? [];
  const wikiLinksMatches = bodyWithoutYaml.match(/\[\[[^\]]+\]\]/g) ?? [];
  const lawDeepLinksMatches = bodyWithoutYaml.match(/\[\[[^\]#]+#Art\.?[^\]]*\]\]/gi) ?? [];

  const calloutInfo = (bodyWithoutYaml.match(/>\s*\[!info\]/gi) ?? []).length;
  const calloutTip = (bodyWithoutYaml.match(/>\s*\[!tip\]/gi) ?? []).length;
  const calloutWarning = (bodyWithoutYaml.match(/>\s*\[!warning\]/gi) ?? []).length;
  const calloutDanger = (bodyWithoutYaml.match(/>\s*\[!danger\]/gi) ?? []).length;

  // Detect "Notas de lei a criar" section if present
  const lawsToCreate: string[] = [];
  const lawsSectionMatch = bodyWithoutYaml.match(/###\s+Notas de lei a criar\s*\n([\s\S]*?)(?:\n###|\n##|$)/i);
  if (lawsSectionMatch) {
    const sectionLines = lawsSectionMatch[1].split('\n');
    for (const line of sectionLines) {
      const cleaned = line.replace(/^[-*•]\s*/, '').replace(/\[\[|\]\]/g, '').trim();
      if (cleaned) lawsToCreate.push(cleaned);
    }
  }

  return {
    markdown,
    stats: {
      wordCount: words.length,
      lineCount: markdown.split('\n').length,
      headingCount: headingMatches.length,
      wikiLinksCount: wikiLinksMatches.length,
      lawDeepLinksCount: lawDeepLinksMatches.length,
      calloutCounts: {
        info: calloutInfo,
        tip: calloutTip,
        warning: calloutWarning,
        danger: calloutDanger,
        total: calloutInfo + calloutTip + calloutWarning + calloutDanger,
      },
      hasValidFrontmatter,
      metadata,
      suggestedFilename: buildSuggestedFilename(metadata.assunto, metadata.disciplina),
      lawsToCreate,
    },
    warnings,
  };
}
