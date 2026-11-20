import React, { useEffect, useState } from 'react';
import { Header, type ActiveModal } from './components/Header';
import { TranscriptInputPanel } from './components/TranscriptInputPanel';
import { ObsidianOutputPanel } from './components/ObsidianOutputPanel';
import { VaultLawsModal } from './components/VaultLawsModal';
import { HistoryModal } from './components/HistoryModal';
import { GuidelinesModal } from './components/GuidelinesModal';
import {
  DEFAULT_VAULT_LAWS,
  TARGET_EXAMS,
  getTodayBrDate,
} from './lib/promptBuilder';
import { cleanAndValidateObsidianMarkdown } from './lib/markdownProcessor';
import { SAMPLE_TRANSCRIPT } from './lib/sampleTranscript';
import type { HistoryEntry, NoteStats, ProcessedNoteResult } from './lib/types';

const VAULT_LAWS_STORAGE_KEY = 'lexnote_vault_laws_v1';
const HISTORY_STORAGE_KEY = 'lexnote_history_v1';

export default function App() {
  const [activeModal, setActiveModal] = useState<ActiveModal>('none');

  // Input state
  const [transcript, setTranscript] = useState('');
  const [disciplina, setDisciplina] = useState('');
  const [assunto, setAssunto] = useState('');
  const [dataAula, setDataAula] = useState(() => getTodayBrDate());
  const [targetExam, setTargetExam] = useState(TARGET_EXAMS[0]);
  const [extraInstructions, setExtraInstructions] = useState('');
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);

  // Vault laws persisted in localStorage
  const [vaultLaws, setVaultLaws] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(VAULT_LAWS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_VAULT_LAWS;
  });

  // History persisted in localStorage
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });

  // Output & conversion state
  const [outputMarkdown, setOutputMarkdown] = useState('');
  const [stats, setStats] = useState<NoteStats | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(VAULT_LAWS_STORAGE_KEY, JSON.stringify(vaultLaws));
    } catch {
      // ignore storage errors
    }
  }, [vaultLaws]);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch {
      // ignore storage errors
    }
  }, [history]);

  const handleFileLoaded = (content: string, filename: string) => {
    setTranscript(content);
    setUploadedFilename(filename);
    setValidationError(null);
    setApiError(null);
  };

  const handleLoadSample = () => {
    setTranscript(SAMPLE_TRANSCRIPT);
    setDisciplina('Direito Civil');
    setAssunto('');
    setUploadedFilename(null);
    setValidationError(null);
    setApiError(null);
  };

  const handleClear = () => {
    setTranscript('');
    setUploadedFilename(null);
    setValidationError(null);
    setApiError(null);
  };

  const handleResetWorkspace = () => {
    setTranscript('');
    setDisciplina('');
    setAssunto('');
    setDataAula(getTodayBrDate());
    setExtraInstructions('');
    setUploadedFilename(null);
    setOutputMarkdown('');
    setStats(null);
    setWarnings([]);
    setStreamingText('');
    setValidationError(null);
    setApiError(null);
    setActiveModal('none');
  };

  const saveToHistory = (result: ProcessedNoteResult, sourceTranscript: string) => {
    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      markdown: result.markdown,
      stats: result.stats,
      transcriptSnippet: sourceTranscript.slice(0, 140),
      targetExam,
    };
    setHistory((prev) => [entry, ...prev].slice(0, 25));
  };

  const handleConvert = async () => {
    const trimmed = transcript.trim();
    if (trimmed.length < 20) {
      setValidationError(
        'Cole ou envie uma transcrição com pelo menos 20 caracteres antes de converter.'
      );
      return;
    }

    setValidationError(null);
    setApiError(null);
    setIsConverting(true);
    setStreamingText('');
    setCopied(false);

    try {
      const response = await fetch('/api/convert/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: trimmed,
          disciplina: disciplina.trim() || undefined,
          assunto: assunto.trim() || undefined,
          data: dataAula.trim() || undefined,
          targetExam,
          vaultLaws,
          extraInstructions: extraInstructions.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Erro HTTP ${response.status}`);
      }

      if (!response.headers.get('content-type')?.includes('text/event-stream')) {
        throw new Error('O servidor não retornou o fluxo de conversão esperado. Tente novamente após atualizar a página.');
      }

      if (!response.body) {
        throw new Error('Fluxo de resposta indisponível no navegador.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';
      let completedResult: ProcessedNoteResult | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const rawEvent of events) {
          const dataLine = rawEvent
            .split('\n')
            .find((line) => line.startsWith('data: '));
          if (!dataLine) continue;

          const payload = JSON.parse(dataLine.slice(6));
          if (payload.type === 'chunk' && typeof payload.text === 'string') {
            accumulated += payload.text;
            setStreamingText(accumulated);
          } else if (payload.type === 'done' && payload.result) {
            completedResult = payload.result as ProcessedNoteResult;
          } else if (payload.type === 'error') {
            throw new Error(payload.error || 'Falha ao processar a transcrição.');
          }
        }
      }

      if (!completedResult) {
        throw new Error('A conexão com o servidor foi interrompida antes de concluir a conversão. Tente novamente.');
      }
      const finalResult = completedResult;

      setOutputMarkdown(finalResult.markdown);
      setStats(finalResult.stats);
      setWarnings(finalResult.warnings);
      saveToHistory(finalResult, trimmed);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Erro inesperado ao comunicar com o servidor.';
      setApiError(msg);
    } finally {
      setIsConverting(false);
    }
  };

  const handleMarkdownEdit = (updated: string) => {
    setOutputMarkdown(updated);
    const reprocessed = cleanAndValidateObsidianMarkdown(updated, vaultLaws);
    setStats(reprocessed.stats);
    setWarnings(reprocessed.warnings);
  };

  const copyTextToClipboard = async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for restricted clipboard contexts
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadMarkdownFile = (content: string, filename: string) => {
    if (!content) return;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename || 'resumo-obsidian.md';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-slate-900">
      <Header
        activeModal={activeModal}
        onSelectModal={setActiveModal}
        onResetWorkspace={handleResetWorkspace}
        historyCount={history.length}
      />

      <main className="flex-1 mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-6 lg:px-8">
        {/* Editorial Page Intro */}
        <div className="mb-4 flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div className="max-w-2xl">
            <h1 className="font-display text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900 text-balance">
              Conversor de Transcrições para Obsidian
            </h1>
            <p className="mt-1 text-sm text-slate-600 leading-relaxed">
              Transforme transcrições brutas de vídeo-aulas em resumos jurídicos limpos, com deep linking exclusivo para legislações do Vault e callouts de prova prontos para o NotebookLM.
            </p>
          </div>
          <div className="text-xs text-slate-500 whitespace-nowrap shrink-0">
            Foco ativo: <span className="font-medium text-slate-800">{targetExam}</span>
          </div>
        </div>

        {/* Main Split Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <TranscriptInputPanel
            transcript={transcript}
            onTranscriptChange={(val) => {
              setTranscript(val);
              if (validationError) setValidationError(null);
            }}
            disciplina={disciplina}
            onDisciplinaChange={setDisciplina}
            assunto={assunto}
            onAssuntoChange={setAssunto}
            dataAula={dataAula}
            onDataAulaChange={setDataAula}
            targetExam={targetExam}
            onTargetExamChange={setTargetExam}
            extraInstructions={extraInstructions}
            onExtraInstructionsChange={setExtraInstructions}
            uploadedFilename={uploadedFilename}
            onFileLoaded={handleFileLoaded}
            onLoadSample={handleLoadSample}
            onClear={handleClear}
            onConvert={handleConvert}
            isConverting={isConverting}
            validationError={validationError}
            vaultLawsCount={vaultLaws.length}
            onOpenVaultModal={() => setActiveModal('laws')}
          />

          <ObsidianOutputPanel
            markdown={outputMarkdown}
            onMarkdownEdit={handleMarkdownEdit}
            stats={stats}
            warnings={warnings}
            isConverting={isConverting}
            streamingText={streamingText}
            errorMessage={apiError}
            onCopy={() => copyTextToClipboard(outputMarkdown)}
            onDownload={() =>
              downloadMarkdownFile(
                outputMarkdown,
                stats?.suggestedFilename ?? 'resumo-obsidian.md'
              )
            }
            copied={copied}
            onLoadSampleAndConvertHint={handleLoadSample}
          />
        </div>
      </main>

      <footer className="border-t border-slate-200/80 bg-[#FAF9F6] py-4 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>LexNote — Caderno Digital Jurídico para Obsidian & NotebookLM</span>
          <span>Deep linking automático para {vaultLaws.length} leis do Vault</span>
        </div>
      </footer>

      <VaultLawsModal
        isOpen={activeModal === 'laws'}
        onClose={() => setActiveModal('none')}
        laws={vaultLaws}
        onChangeLaws={setVaultLaws}
      />

      <HistoryModal
        isOpen={activeModal === 'history'}
        onClose={() => setActiveModal('none')}
        entries={history}
        onLoadEntry={(entry) => {
          setOutputMarkdown(entry.markdown);
          setStats(entry.stats);
          setWarnings([]);
          setApiError(null);
          setActiveModal('none');
        }}
        onCopyEntry={(entry) => copyTextToClipboard(entry.markdown)}
        onDownloadEntry={(entry) =>
          downloadMarkdownFile(entry.markdown, entry.stats.suggestedFilename)
        }
        onDeleteEntry={(id) =>
          setHistory((prev) => prev.filter((item) => item.id !== id))
        }
        onClearAll={() => setHistory([])}
      />

      <GuidelinesModal
        isOpen={activeModal === 'guidelines'}
        onClose={() => setActiveModal('none')}
      />
    </div>
  );
}
