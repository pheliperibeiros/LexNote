import React from 'react';
import { Lightbulb, AlertTriangle, Info, ShieldAlert, Link2 } from 'lucide-react';
import {
  parseObsidianMarkdown,
  type CalloutType,
  type InlineToken,
} from '../lib/obsidianParser';

interface ObsidianPreviewProps {
  markdown: string;
}

function renderInlineTokens(tokens: InlineToken[], keyPrefix: string) {
  return tokens.map((token, idx) => {
    const key = `${keyPrefix}-${idx}`;
    switch (token.type) {
      case 'text':
        return <React.Fragment key={key}>{token.value}</React.Fragment>;
      case 'wikilink':
        return (
          <span
            key={key}
            title={token.anchor ? `${token.target}#${token.anchor}` : token.target}
            className="inline-flex items-baseline gap-0.5 font-medium text-indigo-700 underline decoration-indigo-300 decoration-1 underline-offset-2"
          >
            <span>{token.label}</span>
          </span>
        );
      case 'highlight':
        return (
          <mark
            key={key}
            className="rounded-xs bg-amber-100/90 px-1 py-0.5 text-slate-900 font-medium"
          >
            {token.value}
          </mark>
        );
      case 'bold':
        return (
          <strong key={key} className="font-semibold text-slate-900">
            {token.value}
          </strong>
        );
      case 'italic':
        return (
          <em key={key} className="italic text-slate-700">
            {token.value}
          </em>
        );
      case 'code':
        return (
          <code
            key={key}
            className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800"
          >
            {token.value}
          </code>
        );
    }
  });
}

function getCalloutStyle(type: CalloutType) {
  switch (type) {
    case 'tip':
      return {
        container: 'border-emerald-200 bg-emerald-50/60',
        title: 'text-emerald-900',
        body: 'text-emerald-950/90',
        Icon: Lightbulb,
        iconClass: 'text-emerald-700',
      };
    case 'warning':
      return {
        container: 'border-amber-200 bg-amber-50/70',
        title: 'text-amber-900',
        body: 'text-amber-950/90',
        Icon: AlertTriangle,
        iconClass: 'text-amber-700',
      };
    case 'danger':
      return {
        container: 'border-rose-200 bg-rose-50/70',
        title: 'text-rose-900',
        body: 'text-rose-950/90',
        Icon: ShieldAlert,
        iconClass: 'text-rose-700',
      };
    case 'info':
    default:
      return {
        container: 'border-sky-200 bg-sky-50/60',
        title: 'text-sky-900',
        body: 'text-sky-950/90',
        Icon: Info,
        iconClass: 'text-sky-700',
      };
  }
}

export function ObsidianPreview({ markdown }: ObsidianPreviewProps) {
  const blocks = parseObsidianMarkdown(markdown);

  return (
    <article className="space-y-4 text-sm leading-relaxed text-slate-800">
      {blocks.map((block, index) => {
        const key = `block-${index}`;

        if (block.type === 'frontmatter') {
          return (
            <div
              key={key}
              className="rounded-lg border border-slate-200 bg-slate-50/80 p-3.5 text-xs"
            >
              <div className="mb-2 font-mono text-[11px] font-medium text-slate-500">
                Propriedades da Nota (YAML)
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                {block.entries.map((entry, idx) => (
                  <div key={`${key}-prop-${idx}`} className="flex items-baseline gap-2 min-w-0">
                    <dt className="font-mono text-slate-500 shrink-0">{entry.key}:</dt>
                    <dd className="text-slate-800 font-medium truncate">{entry.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        }

        if (block.type === 'heading') {
          if (block.level <= 2) {
            return (
              <h2
                key={key}
                className="font-display text-xl font-bold text-slate-900 pt-2 pb-1 border-b border-slate-200"
              >
                {renderInlineTokens(block.tokens, key)}
              </h2>
            );
          }
          if (block.level === 3) {
            return (
              <h3
                key={key}
                className="font-display text-base font-semibold text-slate-900 pt-2"
              >
                {renderInlineTokens(block.tokens, key)}
              </h3>
            );
          }
          return (
            <h4
              key={key}
              className="font-display text-sm font-semibold text-slate-800 pt-1"
            >
              {renderInlineTokens(block.tokens, key)}
            </h4>
          );
        }

        if (block.type === 'callout') {
          const style = getCalloutStyle(block.calloutType);
          const { Icon } = style;
          return (
            <div
              key={key}
              className={`rounded-lg border p-3.5 ${style.container}`}
            >
              <div className={`flex items-center gap-2 font-display text-xs font-semibold ${style.title}`}>
                <Icon className={`h-4 w-4 shrink-0 ${style.iconClass}`} aria-hidden="true" />
                <span>{renderInlineTokens(block.titleTokens, `${key}-title`)}</span>
              </div>
              <div className={`mt-1.5 space-y-1.5 text-sm leading-relaxed ${style.body}`}>
                {block.lines.map((lineTokens, lineIdx) => (
                  <p key={`${key}-line-${lineIdx}`}>
                    {renderInlineTokens(lineTokens, `${key}-l-${lineIdx}`)}
                  </p>
                ))}
              </div>
            </div>
          );
        }

        if (block.type === 'blockquote') {
          return (
            <blockquote
              key={key}
              className="rounded-lg border border-slate-200 bg-[#F8F7F3] px-4 py-3 text-sm text-slate-800 space-y-1.5"
            >
              {block.lines.map((lineTokens, lineIdx) => {
                const hasLink = lineTokens.some((t) => t.type === 'wikilink');
                return (
                  <p
                    key={`${key}-q-${lineIdx}`}
                    className={hasLink ? 'flex items-center gap-1.5 font-medium text-indigo-800' : 'text-slate-700'}
                  >
                    {hasLink && <Link2 className="h-3.5 w-3.5 shrink-0 text-indigo-600" aria-hidden="true" />}
                    <span>{renderInlineTokens(lineTokens, `${key}-ql-${lineIdx}`)}</span>
                  </p>
                );
              })}
            </blockquote>
          );
        }

        if (block.type === 'list') {
          const ListTag = block.ordered ? 'ol' : 'ul';
          return (
            <ListTag
              key={key}
              className={`space-y-1.5 pl-5 ${block.ordered ? 'list-decimal' : 'list-disc'} text-slate-800`}
            >
              {block.items.map((itemTokens, itemIdx) => (
                <li key={`${key}-item-${itemIdx}`}>
                  {renderInlineTokens(itemTokens, `${key}-it-${itemIdx}`)}
                </li>
              ))}
            </ListTag>
          );
        }

        if (block.type === 'codeblock') {
          return (
            <pre
              key={key}
              className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-900 p-3.5 font-mono text-xs text-slate-100"
            >
              <code>{block.code}</code>
            </pre>
          );
        }

        if (block.type === 'hr') {
          return <hr key={key} className="border-slate-200 my-3" />;
        }

        return (
          <p key={key} className="text-slate-800 leading-relaxed">
            {renderInlineTokens(block.tokens, key)}
          </p>
        );
      })}
    </article>
  );
}
