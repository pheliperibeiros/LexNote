import React, { useEffect } from 'react';
import { X, Copy, Download, Trash2, ArrowUpRight } from 'lucide-react';
import type { HistoryEntry } from '../lib/types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: HistoryEntry[];
  onLoadEntry: (entry: HistoryEntry) => void;
  onCopyEntry: (entry: HistoryEntry) => void;
  onDownloadEntry: (entry: HistoryEntry) => void;
  onDeleteEntry: (id: string) => void;
  onClearAll: () => void;
}

export function HistoryModal({
  isOpen,
  onClose,
  entries,
  onLoadEntry,
  onCopyEntry,
  onDownloadEntry,
  onDeleteEntry,
  onClearAll,
}: HistoryModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[1px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-modal-title"
    >
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 id="history-modal-title" className="font-display text-base font-semibold text-slate-900">
              Histórico de Resumos Convertidos
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Armazenado localmente neste navegador para cópia ou download rápido
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar histórico"
            className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {entries.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-medium text-slate-700">
                Nenhuma nota convertida ainda
              </p>
              <p className="mt-1 text-xs text-slate-500">
                As notas geradas ficarão disponíveis aqui para reabertura ou exportação em .md.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
              {entries.map((entry) => (
                <li key={entry.id} className="p-4 hover:bg-slate-50/70 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-display text-sm font-semibold text-slate-900 truncate">
                        {entry.stats.metadata.assunto}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 tabular-nums">
                        <span>{entry.stats.metadata.disciplina}</span>
                        <span aria-hidden="true">·</span>
                        <span>{entry.stats.wordCount} palavras</span>
                        <span aria-hidden="true">·</span>
                        <span>{entry.stats.lawDeepLinksCount} artigos</span>
                        <span aria-hidden="true">·</span>
                        <span>{new Date(entry.createdAt).toLocaleString('pt-BR')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onLoadEntry(entry)}
                        aria-label={`Abrir ${entry.stats.metadata.assunto}`}
                        className="inline-flex items-center gap-1 min-h-[34px] px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md cursor-pointer"
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Abrir</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onCopyEntry(entry)}
                        aria-label={`Copiar ${entry.stats.metadata.assunto}`}
                        className="inline-flex items-center justify-center min-h-[34px] min-w-[34px] rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDownloadEntry(entry)}
                        aria-label={`Baixar ${entry.stats.suggestedFilename}`}
                        className="inline-flex items-center justify-center min-h-[34px] min-w-[34px] rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteEntry(entry.id)}
                        aria-label={`Excluir ${entry.stats.metadata.assunto}`}
                        className="inline-flex items-center justify-center min-h-[34px] min-w-[34px] rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/70 px-6 py-3.5">
          {entries.length > 0 ? (
            <button
              type="button"
              onClick={onClearAll}
              className="min-h-[36px] px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
            >
              Limpar histórico
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            className="min-h-[38px] px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
