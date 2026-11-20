import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface GuidelinesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GuidelinesModal({ isOpen, onClose }: GuidelinesModalProps) {
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
      aria-labelledby="guidelines-title"
    >
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 id="guidelines-title" className="font-display text-base font-semibold text-slate-900">
              Protocolo PKM Obsidian & NotebookLM Aplicado
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Regras estruturais aplicadas automaticamente pelo Gemini em cada conversão
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar diretrizes"
            className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-5 text-sm text-slate-700 leading-relaxed">
          <div>
            <h3 className="font-display text-sm font-semibold text-slate-900">
              1. Limpeza e Fidelidade para NotebookLM
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              Remove saudações, piadas, coloquialismos e marcações de tempo. Preserva integralmente a doutrina, correntes divergentes e transcreve a lei seca em blockquotes limpos — sem nenhum marcador de citação ([1], [Cite:1], 【1】).
            </p>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h3 className="font-display text-sm font-semibold text-slate-900">
              2. Hierarquia Limpa e Links Exclusivos de Legislação
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              Frontmatter YAML válido seguido do título em H2. Os subtítulos (<code className="font-mono bg-slate-100 px-1 rounded">###</code>, <code className="font-mono bg-slate-100 px-1 rounded">####</code>) e termos conceituais no texto permanecem em texto limpo, sem links quebrados — preservando <code className="font-mono bg-slate-100 px-1 rounded">[[...]]</code> exclusivamente para citações de legislação.
            </p>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h3 className="font-display text-sm font-semibold text-slate-900">
              3. Deep Linking de Legislação (#Art. Xº)
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              Artigos citados são linkados diretamente para o cabeçalho da nota da lei correspondente (<code className="font-mono bg-slate-100 px-1 rounded">&gt; [[Codigo Civil#Art. 2º|Art. 2º]]</code>), seguidos pelo texto legal integral sem aspas. Leis fora do Vault padrão são linkadas pelo nome oficial e listadas em <em>Notas de lei a criar</em>.
            </p>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h3 className="font-display text-sm font-semibold text-slate-900">
              4. Callouts de Jurisprudência e "Cai em Prova"
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              Julgados e Súmulas do STF/STJ vão em <code className="font-mono bg-slate-100 px-1 rounded">[!info]</code>. Alertas de aula são classificados automaticamente em <code className="font-mono bg-slate-100 px-1 rounded">[!tip]</code> (macete), <code className="font-mono bg-slate-100 px-1 rounded">[!warning]</code> (pegadinha), <code className="font-mono bg-slate-100 px-1 rounded">[!info]</code> (complemento) ou <code className="font-mono bg-slate-100 px-1 rounded">[!danger]</code> (altíssima incidência).
            </p>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-200 bg-slate-50/70 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[38px] px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
