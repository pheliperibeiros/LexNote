import React, { useEffect, useState } from 'react';
import { X, Plus, Trash2, RotateCcw } from 'lucide-react';
import { DEFAULT_VAULT_LAWS } from '../lib/promptBuilder';

interface VaultLawsModalProps {
  isOpen: boolean;
  onClose: () => void;
  laws: string[];
  onChangeLaws: (laws: string[]) => void;
}

export function VaultLawsModal({
  isOpen,
  onClose,
  laws,
  onChangeLaws,
}: VaultLawsModalProps) {
  const [newLaw, setNewLaw] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newLaw.replace(/\[\[|\]\]/g, '').trim();
    if (!cleaned) return;
    if (!laws.includes(cleaned)) {
      onChangeLaws([...laws, cleaned]);
    }
    setNewLaw('');
  };

  const handleRemove = (target: string) => {
    onChangeLaws(laws.filter((l) => l !== target));
  };

  const handleReset = () => {
    onChangeLaws(DEFAULT_VAULT_LAWS);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[1px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vault-laws-title"
    >
      <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 id="vault-laws-title" className="font-display text-base font-semibold text-slate-900">
              Notas de Leis Principais do Vault
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Nomes exatos dos arquivos no seu Obsidian para Deep Linking com #Art. Xº
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela de leis do Vault"
            className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <form onSubmit={handleAdd} className="flex items-center gap-2">
            <label htmlFor="new-law-input" className="sr-only">
              Nome da nota de lei no Obsidian
            </label>
            <input
              id="new-law-input"
              type="text"
              value={newLaw}
              onChange={(e) => setNewLaw(e.target.value)}
              placeholder="Ex: Lei 8.429/92 - Improbidade Administrativa"
              className="flex-1 min-h-[40px] rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Adicionar</span>
            </button>
          </form>

          <ul className="max-h-72 overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-200">
            {laws.map((law) => (
              <li
                key={law}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-slate-50"
              >
                <span className="font-mono text-xs text-slate-800 truncate">
                  [[{law}]]
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(law)}
                  aria-label={`Remover ${law}`}
                  className="min-h-[32px] min-w-[32px] inline-flex items-center justify-center rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>

          <p className="text-xs text-slate-500 leading-relaxed">
            Leis citadas em aula fora desta lista recebem deep linking com nome oficial completo e são listadas ao final da nota em <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">Notas de lei a criar</code>.
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/70 px-6 py-3.5">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Restaurar Padrão (7 leis)</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[38px] px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}
