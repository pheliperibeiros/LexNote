import React from 'react';

export type ActiveModal = 'none' | 'laws' | 'history' | 'guidelines';

interface HeaderProps {
  activeModal: ActiveModal;
  onSelectModal: (modal: ActiveModal) => void;
  onResetWorkspace: () => void;
  historyCount: number;
}

export function Header({
  activeModal,
  onSelectModal,
  onResetWorkspace,
  historyCount,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-[#FAF9F6]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-8 px-4 py-3 sm:px-6 lg:px-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => onSelectModal('none')}
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 hover:text-indigo-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-sm cursor-pointer"
        >
          LexNote
        </button>

        {/* Zone 2: 4 clean single-line text navigation links */}
        <nav
          aria-label="Navegação principal"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          <button
            type="button"
            onClick={() => onSelectModal('none')}
            className={`py-1.5 whitespace-nowrap shrink-0 transition-colors border-b-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-sm ${
              activeModal === 'none'
                ? 'border-indigo-600 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Estúdio
          </button>
          <button
            type="button"
            onClick={() => onSelectModal('laws')}
            className={`py-1.5 whitespace-nowrap shrink-0 transition-colors border-b-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-sm ${
              activeModal === 'laws'
                ? 'border-indigo-600 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Leis do Vault
          </button>
          <button
            type="button"
            onClick={() => onSelectModal('history')}
            className={`py-1.5 whitespace-nowrap shrink-0 transition-colors border-b-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-sm ${
              activeModal === 'history'
                ? 'border-indigo-600 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Histórico{historyCount > 0 ? ` (${historyCount})` : ''}
          </button>
          <button
            type="button"
            onClick={() => onSelectModal('guidelines')}
            className={`py-1.5 whitespace-nowrap shrink-0 transition-colors border-b-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-sm ${
              activeModal === 'guidelines'
                ? 'border-indigo-600 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Diretrizes
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onResetWorkspace}
            className="min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 active:scale-[0.99] transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
          >
            Nova Nota
          </button>
        </div>
      </div>

      {/* Mobile navigation row (clean single-line links) */}
      <nav
        aria-label="Navegação móvel"
        className="flex md:hidden items-center justify-between gap-3 border-t border-slate-200/70 px-4 py-2 text-xs font-medium text-slate-600 overflow-x-auto"
      >
        <button
          type="button"
          onClick={() => onSelectModal('none')}
          className={`min-h-[36px] px-2 whitespace-nowrap shrink-0 ${
            activeModal === 'none' ? 'text-indigo-700 font-semibold' : ''
          }`}
        >
          Estúdio
        </button>
        <button
          type="button"
          onClick={() => onSelectModal('laws')}
          className={`min-h-[36px] px-2 whitespace-nowrap shrink-0 ${
            activeModal === 'laws' ? 'text-indigo-700 font-semibold' : ''
          }`}
        >
          Leis do Vault
        </button>
        <button
          type="button"
          onClick={() => onSelectModal('history')}
          className={`min-h-[36px] px-2 whitespace-nowrap shrink-0 ${
            activeModal === 'history' ? 'text-indigo-700 font-semibold' : ''
          }`}
        >
          Histórico ({historyCount})
        </button>
        <button
          type="button"
          onClick={() => onSelectModal('guidelines')}
          className={`min-h-[36px] px-2 whitespace-nowrap shrink-0 ${
            activeModal === 'guidelines' ? 'text-indigo-700 font-semibold' : ''
          }`}
        >
          Diretrizes
        </button>
      </nav>
    </header>
  );
}
