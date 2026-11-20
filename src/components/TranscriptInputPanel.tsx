import React, { useRef, useState } from 'react';
import { Upload, Sparkles, Eraser, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { DISCIPLINAS_SUGERIDAS, TARGET_EXAMS } from '../lib/promptBuilder';

interface TranscriptInputPanelProps {
  transcript: string;
  onTranscriptChange: (val: string) => void;
  disciplina: string;
  onDisciplinaChange: (val: string) => void;
  assunto: string;
  onAssuntoChange: (val: string) => void;
  dataAula: string;
  onDataAulaChange: (val: string) => void;
  targetExam: string;
  onTargetExamChange: (val: string) => void;
  extraInstructions: string;
  onExtraInstructionsChange: (val: string) => void;
  uploadedFilename: string | null;
  onFileLoaded: (content: string, filename: string) => void;
  onLoadSample: () => void;
  onClear: () => void;
  onConvert: () => void;
  isConverting: boolean;
  validationError: string | null;
  vaultLawsCount: number;
  onOpenVaultModal: () => void;
}

export function TranscriptInputPanel({
  transcript,
  onTranscriptChange,
  disciplina,
  onDisciplinaChange,
  assunto,
  onAssuntoChange,
  dataAula,
  onDataAulaChange,
  targetExam,
  onTargetExamChange,
  extraInstructions,
  onExtraInstructionsChange,
  uploadedFilename,
  onFileLoaded,
  onLoadSample,
  onClear,
  onConvert,
  isConverting,
  validationError,
  vaultLawsCount,
  onOpenVaultModal,
}: TranscriptInputPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
  const charCount = transcript.length;

  const handleFile = async (file: File) => {
    const allowedExtensions = /\.(txt|md|srt|vtt|csv|log)$/i;
    if (!allowedExtensions.test(file.name) && !file.type.startsWith('text/')) {
      return;
    }
    const text = await file.text();
    onFileLoaded(text, file.name);
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFile(file);
      e.target.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await handleFile(file);
    }
  };

  return (
    <section
      aria-label="Entrada de transcrição"
      className="flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden"
    >
      {/* Panel Header */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold text-slate-900 truncate">
            Transcrição Bruta da Aula
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 truncate">
            Cole o texto ou envie .txt, .md, .srt ou .vtt
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onLoadSample}
            disabled={isConverting}
            className="min-h-[36px] px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            Carregar Exemplo
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isConverting}
            className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Enviar Arquivo</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.srt,.vtt,text/plain,text/markdown"
            onChange={handleFileInputChange}
            className="hidden"
            aria-label="Selecionar arquivo de transcrição"
          />
        </div>
      </div>

      {/* Metadata Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
        <div>
          <label htmlFor="disciplina-input" className="block text-xs font-medium text-slate-600 mb-1">
            Disciplina (opcional)
          </label>
          <input
            id="disciplina-input"
            list="disciplinas-list"
            type="text"
            value={disciplina}
            onChange={(e) => onDisciplinaChange(e.target.value)}
            placeholder="Ex: Direito Civil"
            className="w-full min-h-[38px] rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <datalist id="disciplinas-list">
            {DISCIPLINAS_SUGERIDAS.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </div>

        <div>
          <label htmlFor="assunto-input" className="block text-xs font-medium text-slate-600 mb-1">
            Assunto da Nota (opcional)
          </label>
          <input
            id="assunto-input"
            type="text"
            value={assunto}
            onChange={(e) => onAssuntoChange(e.target.value)}
            placeholder="Detectar automaticamente"
            className="w-full min-h-[38px] rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div>
          <label htmlFor="data-aula-input" className="block text-xs font-medium text-slate-600 mb-1">
            Data da Aula
          </label>
          <input
            id="data-aula-input"
            type="text"
            value={dataAula}
            onChange={(e) => onDataAulaChange(e.target.value)}
            placeholder="DD/MM/AAAA"
            className="w-full min-h-[38px] rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-mono tabular-nums text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Advanced options disclosure */}
      <div className="border-b border-slate-100 px-5 py-2 bg-white">
        <button
          type="button"
          aria-expanded={showAdvanced}
          onClick={() => setShowAdvanced((prev) => !prev)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 py-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded"
        >
          {showAdvanced ? (
            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span>Opções de Concurso e Prompt</span>
          <span className="text-slate-400" aria-hidden="true">·</span>
          <span className="text-slate-500 font-normal truncate max-w-[260px]">
            {targetExam}
          </span>
        </button>

        {showAdvanced && (
          <div className="mt-2 pb-2 grid grid-cols-1 gap-3 border-t border-slate-100 pt-3">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div className="flex-1">
                <label htmlFor="target-exam-select" className="block text-xs font-medium text-slate-600 mb-1">
                  Concurso / Carreira Alvo
                </label>
                <select
                  id="target-exam-select"
                  value={targetExam}
                  onChange={(e) => onTargetExamChange(e.target.value)}
                  className="w-full min-h-[38px] rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {TARGET_EXAMS.map((exam) => (
                    <option key={exam} value={exam}>
                      {exam}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={onOpenVaultModal}
                className="min-h-[38px] px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Leis do Vault ({vaultLawsCount})
              </button>
            </div>

            <div>
              <label htmlFor="extra-instructions-input" className="block text-xs font-medium text-slate-600 mb-1">
                Instruções Adicionais (opcional)
              </label>
              <input
                id="extra-instructions-input"
                type="text"
                value={extraInstructions}
                onChange={(e) => onExtraInstructionsChange(e.target.value)}
                placeholder="Ex: Enfatizar posições institucionais do MP e Súmulas do STJ"
                className="w-full min-h-[38px] rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
        )}
      </div>

      {/* Dropzone + Textarea */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative flex-1 flex flex-col p-5 transition-colors ${
          isDragging ? 'bg-indigo-50/60' : 'bg-white'
        }`}
      >
        {uploadedFilename && (
          <div className="mb-2.5 flex items-center justify-between text-xs text-slate-600 border-b border-slate-100 pb-2">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 truncate">
              <FileText className="h-3.5 w-3.5 text-indigo-600 shrink-0" aria-hidden="true" />
              <span className="truncate">Arquivo carregado: {uploadedFilename}</span>
            </span>
            <span className="text-slate-400 whitespace-nowrap shrink-0">
              Timestamps .srt/.vtt são limpos na conversão
            </span>
          </div>
        )}

        <label htmlFor="transcript-textarea" className="sr-only">
          Texto da transcrição da aula
        </label>
        <textarea
          id="transcript-textarea"
          value={transcript}
          onChange={(e) => onTranscriptChange(e.target.value)}
          placeholder="Cole aqui a transcrição bruta da aula (ou arraste um arquivo .txt, .md, .srt, .vtt)...&#10;&#10;Saudações, marcações de tempo, piadas e repetições serão removidas automaticamente. Artigos de lei, jurisprudência do STF/STJ e alertas de 'cai em prova' serão estruturados no padrão Obsidian + NotebookLM."
          rows={12}
          className="w-full flex-1 min-h-[280px] lg:min-h-[300px] resize-y rounded-lg border border-slate-200 bg-[#FCFBF9] p-4 text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
        />

        {validationError && (
          <div
            role="alert"
            className="mt-3 rounded-lg border border-red-200 bg-red-50/80 px-3.5 py-2.5 text-xs font-medium text-red-800"
          >
            {validationError}
          </div>
        )}
      </div>

      {/* Footer Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/70 px-5 py-3.5">
        <div className="flex items-center gap-2 text-xs text-slate-500 tabular-nums">
          <span>{wordCount.toLocaleString('pt-BR')} palavras</span>
          <span aria-hidden="true">·</span>
          <span>{charCount.toLocaleString('pt-BR')} caracteres</span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClear}
            disabled={isConverting || (!transcript && !uploadedFilename)}
            aria-label="Limpar transcrição"
            className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            <Eraser className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Limpar</span>
          </button>

          <button
            type="button"
            onClick={onConvert}
            disabled={isConverting}
            className="inline-flex items-center gap-2 min-h-[40px] px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 disabled:cursor-wait focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span>{isConverting ? 'Estruturando Nota...' : 'Converter para Obsidian'}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
