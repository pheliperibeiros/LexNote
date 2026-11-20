import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import {
  DEFAULT_VAULT_LAWS,
  buildObsidianSystemPrompt,
  preprocessTranscript,
} from './promptBuilder';
import { cleanAndValidateObsidianMarkdown } from './markdownProcessor';
import type { ConversionOptions, ConversionResult } from './types';

const PRIMARY_MODEL = 'gemini-4-hydrogen';
const FALLBACK_MODEL = 'gemini-3.1-flash-lite';

export async function convertTranscriptStreamClient(
  rawTranscript: string,
  rawOptions: Partial<ConversionOptions>,
  onChunk: (piece: string) => void
): Promise<ConversionResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY não configurada no Netlify.');
  }

  const transcript = preprocessTranscript(rawTranscript);
  if (!transcript || transcript.length < 20) {
    throw new Error('Insira uma transcrição válida com pelo menos 20 caracteres.');
  }

  const options: ConversionOptions = {
    disciplina: rawOptions.disciplina,
    assunto: rawOptions.assunto,
    data: rawOptions.data,
    targetExam: rawOptions.targetExam?.trim() || 'Promotoria de Justiça - Ministério Público',
    vaultLaws: rawOptions.vaultLaws?.length ? rawOptions.vaultLaws : DEFAULT_VAULT_LAWS,
    extraInstructions: rawOptions.extraInstructions,
  };

  const ai = new GoogleGenAI({ apiKey });
  const systemInstruction = buildObsidianSystemPrompt(options);

  let stream;
  try {
    stream = await ai.models.generateContentStream({
      model: PRIMARY_MODEL,
      contents: `TRANSCRIÇÃO BRUTA DA AULA:\n\n${transcript}`,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });
  } catch {
    stream = await ai.models.generateContentStream({
      model: FALLBACK_MODEL,
      contents: `TRANSCRIÇÃO BRUTA DA AULA:\n\n${transcript}`,
      config: { systemInstruction },
    });
  }

  let fullText = '';
  for await (const chunk of stream) {
    const piece = chunk.text ?? '';
    if (piece) {
      fullText += piece;
      onChunk(piece);
    }
  }

  if (!fullText.trim()) {
    throw new Error('O modelo retornou uma resposta vazia. Tente novamente.');
  }

  return cleanAndValidateObsidianMarkdown(fullText, options.vaultLaws);
}
