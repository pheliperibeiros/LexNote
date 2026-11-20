import React, { useState } from 'react';
import { Copy, Check, Download, Eye, Code2, AlertCircle, BookOpen } from 'lucide-react';
import type { NoteStats } from '../lib/types';
import { ObsidianPreview } from './ObsidianPreview';

export type OutputViewMode = 'preview' | 'raw';

interface ObsidianOutputPanelProps {
  markdown: string;
  onMarkdownEdit: (updated: string) => void;
  stats: NoteStats | null;
  warnings: string[];
  isConverting: boolean;
  streamingText: string;
  errorMessage: string | null;
  onCopy: () => Promise<void>;
  onDownload: () => void;
  copied: boolean;
  onLoadSampleAndConvertHint: () => void;
}

export function ObsidianOutputPanel({
  markdown,
  onMarkdownEdit,
  stats,
  warnings,
  isConverting,
  streamingText,
  errorMessage,
  onCopy,
  onDownload,
  copied,
  onLoadSampleAndConvertHint,
}: ObsidianOutputPanelProps) {
  const [viewMode, setViewMode] = useState<OutputViewMode>('raw');

  const activeContent = isConverting ? streamingText : markdown;
  const hasOutput = Boolean(activeContent.trim());

  return (
    <section
      aria-label="Saída formatada para Obsidian"
      className="flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden"
    >
      {/* Output Header & Controls */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3.5">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0" role="tablist" aria-label="Modo de visualização da nota">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'raw'}
            onClick={() => setViewMode('raw')}
            className={`inline-flex items-center gap-1.5 min-h-[32px] px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
              viewMode === 'raw'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Markdown Bruto</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'preview'}
            onClick={() => setViewMode('preview')}
            className={`inline-flex items-center gap-1.5 min-h-[32px] px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
              viewMode === 'preview'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Visualização</span>
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onCopy}
            disabled={!hasOutput || isConverting}
            className={`inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
              copied
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
            }`}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Copiar Markdown</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onDownload}
            disabled={!hasOutput || isConverting}
            className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Baixar .md</span>
          </button>
        </div>
      </div>

      {/* Unboxed Metadata Metrics Bar (Zero-Pill Rule) */}
      {stats && !isConverting && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-5 py-2.5 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-2 tabular-nums">
            <span className="font-medium text-slate-800">{stats.metadata.disciplina}</span>
            <span aria-hidden="true">·</span>
            <span>{stats.wordCount.toLocaleString('pt-BR')} palavras</span>
            <span aria-hidden="true">·</span>
            <span>{stats.wikiLinksCount} links de lei</span>
            <span aria-hidden="true">·</span>
            <span>{stats.lawDeepLinksCount} artigos</span>
            <span aria-hidden="true">·</span>
            <span>{stats.calloutCounts.total} callouts</span>
          </div>
          <span className="font-mono text-[11px] text-slate-500 truncate max-w-[260px]">
            {stats.suggestedFilename}
          </span>
        </div>
      )}

      {/* Warnings if any */}
      {warnings.length > 0 && !isConverting && (
        <div className="border-b border-amber-200 bg-amber-50/70 px-5 py-2.5 text-xs text-amber-900">
          {warnings.map((w, idx) => (
            <div key={idx}>{w}</div>
          ))}
        </div>
      )}

      {/* Body Area */}
      <div className="flex-1 flex flex-col p-5 min-h-[380px] lg:min-h-[420px]">
        {errorMessage && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50/80 p-4 text-sm text-red-900"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-700 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold">Não foi possível converter a transcrição</p>
              <p className="mt-0.5 text-xs text-red-800">{errorMessage}</p>
            </div>
          </div>
        )}

        {isConverting && !streamingText && (
          <div className="flex-1 flex flex-col justify-center space-y-4 py-12 px-4">
            <div className="space-y-2.5 max-w-md mx-auto w-full">
              <p className="text-sm font-medium text-slate-700 text-center">
                Limpando coloquialismos e aplicando Deep Linking do Vault...
              </p>
              <div className="h-3 w-full rounded bg-slate-100 animate-pulse" />
              <div className="h-3 w-5/6 rounded bg-slate-100 animate-pulse" />
              <div className="h-3 w-4/6 rounded bg-slate-100 animate-pulse" />
            </div>
          </div>
        )}

        {!hasOutput && !isConverting && !errorMessage && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 mb-4">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="font-display text-base font-semibold text-slate-900">
              Nota pronta para o seu Vault
            </h3>
            <p className="mt-1.5 max-w-md text-sm text-slate-500 leading-relaxed">
              Cole a transcrição da aula ao lado e clique em{' '}
              <strong className="font-medium text-slate-700">Converter para Obsidian</strong>.
              O resumo será gerado com YAML frontmatter, títulos limpos sem excesso de links,
              legislação com âncora{' '}
              <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">#Art. Xº</code> e
              callouts de prova.
            </p>
            <button
              type="button"
              onClick={onLoadSampleAndConvertHint}
              className="mt-5 min-h-[40px] px-4 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            >
              Carregar Transcrição de Exemplo
            </button>
          </div>
        )}

        {hasOutput && viewMode === 'raw' && (
          <div className="flex-1 flex flex-col">
            <label htmlFor="obsidian-raw-output" className="sr-only">
              Código Markdown gerado para Obsidian
            </label>
            <textarea
              id="obsidian-raw-output"
              value={activeContent}
              onChange={(e) => onMarkdownEdit(e.target.value)}
              readOnly={isConverting}
              spellCheck={false}
              className="w-full flex-1 min-h-[380px] resize-y rounded-lg border border-slate-200 bg-[#FBFBFA] p-4 font-mono text-[13px] leading-relaxed text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
            />
          </div>
        )}

        {hasOutput && viewMode === 'preview' && (
          <div className="flex-1 overflow-y-auto pr-1">
            <ObsidianPreview markdown={activeContent} />
          </div>
        )}
      </div>
    </section>
  );
}
