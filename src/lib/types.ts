export interface ConversionOptions {
  disciplina?: string;
  assunto?: string;
  data?: string;
  targetExam: string;
  vaultLaws: string[];
  extraInstructions?: string;
}

export interface NoteMetadata {
  assunto: string;
  disciplina: string;
  tipo: string;
  data: string;
  tags: string[];
}

export interface NoteStats {
  wordCount: number;
  lineCount: number;
  headingCount: number;
  wikiLinksCount: number;
  lawDeepLinksCount: number;
  calloutCounts: {
    info: number;
    tip: number;
    warning: number;
    danger: number;
    total: number;
  };
  hasValidFrontmatter: boolean;
  metadata: NoteMetadata;
  suggestedFilename: string;
  lawsToCreate: string[];
}

export interface ProcessedNoteResult {
  markdown: string;
  stats: NoteStats;
  warnings: string[];
}

export interface HistoryEntry {
  id: string;
  createdAt: string;
  markdown: string;
  stats: NoteStats;
  transcriptSnippet: string;
  targetExam: string;
}
