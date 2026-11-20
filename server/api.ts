import express, { type Request, type Response } from 'express';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import {
  DEFAULT_VAULT_LAWS,
  buildObsidianSystemPrompt,
  preprocessTranscript,
} from '../src/lib/promptBuilder.js';
import { cleanAndValidateObsidianMarkdown } from '../src/lib/markdownProcessor.js';
import type { ConversionOptions } from '../src/lib/types.js';

const PRIMARY_MODEL = 'gemini-4-hydrogen';
const FALLBACK_MODEL = 'gemini-3.1-flash-lite';

function createGeminiClient(): GoogleGenAI {
  return new GoogleGenAI({});
}

function parseConversionPayload(body: Record<string, unknown>): {
  transcript: string;
  options: ConversionOptions;
} {
  const rawTranscript = typeof body.transcript === 'string' ? body.transcript : '';
  const cleanedTranscript = preprocessTranscript(rawTranscript);

  const vaultLaws = Array.isArray(body.vaultLaws)
    ? body.vaultLaws.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : DEFAULT_VAULT_LAWS;

  const options: ConversionOptions = {
    disciplina: typeof body.disciplina === 'string' ? body.disciplina : undefined,
    assunto: typeof body.assunto === 'string' ? body.assunto : undefined,
    data: typeof body.data === 'string' ? body.data : undefined,
    targetExam:
      typeof body.targetExam === 'string' && body.targetExam.trim().length > 0
        ? body.targetExam
        : 'Promotoria de Justiça - Ministério Público',
    vaultLaws: vaultLaws.length > 0 ? vaultLaws : DEFAULT_VAULT_LAWS,
    extraInstructions: typeof body.extraInstructions === 'string' ? body.extraInstructions : undefined,
  };

  return { transcript: cleanedTranscript, options };
}

function isTransientGeminiError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('503') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('high demand') ||
    msg.includes('ECONNRESET') ||
    msg.includes('ETIMEDOUT')
  );
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts && isTransientGeminiError(err)) {
        const delayMs = 700 * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

async function generateWithModelFallback(
  ai: GoogleGenAI,
  transcript: string,
  systemInstruction: string
): Promise<string> {
  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: PRIMARY_MODEL,
        contents: `TRANSCRIÇÃO BRUTA DA AULA:\n\n${transcript}`,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      })
    );
    return response.text ?? '';
  } catch (err) {
    if (!isTransientGeminiError(err)) throw err;
    const fallbackResponse = await withRetry(() =>
      ai.models.generateContent({
        model: FALLBACK_MODEL,
        contents: `TRANSCRIÇÃO BRUTA DA AULA:\n\n${transcript}`,
        config: {
          systemInstruction,
        },
      })
    );
    return fallbackResponse.text ?? '';
  }
}

async function openStreamWithModelFallback(
  ai: GoogleGenAI,
  transcript: string,
  systemInstruction: string
) {
  try {
    return await withRetry(() =>
      ai.models.generateContentStream({
        model: PRIMARY_MODEL,
        contents: `TRANSCRIÇÃO BRUTA DA AULA:\n\n${transcript}`,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      })
    );
  } catch (err) {
    if (!isTransientGeminiError(err)) throw err;
    return await withRetry(() =>
      ai.models.generateContentStream({
        model: FALLBACK_MODEL,
        contents: `TRANSCRIÇÃO BRUTA DA AULA:\n\n${transcript}`,
        config: {
          systemInstruction,
        },
      })
    );
  }
}

function formatGeminiError(err: unknown): { status: number; message: string } {
  const rawMessage = err instanceof Error ? err.message : String(err);
  if (rawMessage.includes('GEMINI_API_KEY')) {
    return {
      status: 500,
      message: 'O serviço de IA está indisponível no servidor. Tente novamente mais tarde.',
    };
  }
  if (rawMessage.includes('403') || rawMessage.includes('PERMISSION_DENIED') || rawMessage.includes('API_KEY_INVALID')) {
    return {
      status: 403,
      message: 'Não foi possível autenticar o serviço de IA. Tente novamente mais tarde.',
    };
  }
  if (rawMessage.includes('429') || rawMessage.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message: 'Limite de requisições da API Gemini atingido temporariamente. Aguarde alguns instantes e tente novamente.',
    };
  }
  if (rawMessage.includes('503') || rawMessage.includes('UNAVAILABLE')) {
    return {
      status: 503,
      message: 'O modelo Gemini está com alta demanda temporária no momento. Tente novamente em alguns segundos.',
    };
  }
  return {
    status: 500,
    message: 'Erro ao processar transcrição com Gemini. Tente novamente.',
  };
}

export function createApiApp() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, model: PRIMARY_MODEL });
  });

  app.post('/api/convert', async (req: Request, res: Response) => {
    try {
      const { transcript, options } = parseConversionPayload(req.body ?? {});
      if (!transcript || transcript.length < 20) {
        res.status(400).json({
          error: 'Insira uma transcrição válida com pelo menos 20 caracteres para gerar o resumo.',
        });
        return;
      }

      const ai = createGeminiClient();
      const systemInstruction = buildObsidianSystemPrompt(options);
      const rawText = await generateWithModelFallback(ai, transcript, systemInstruction);

      if (!rawText.trim()) {
        res.status(502).json({ error: 'O modelo retornou uma resposta vazia. Tente novamente.' });
        return;
      }

      const result = cleanAndValidateObsidianMarkdown(rawText, options.vaultLaws);
      res.json(result);
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/convert/stream', async (req: Request, res: Response) => {
    const { transcript, options } = parseConversionPayload(req.body ?? {});
    if (!transcript || transcript.length < 20) {
      res.status(400).json({
        error: 'Insira uma transcrição válida com pelo menos 20 caracteres para gerar o resumo.',
      });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendEvent = (payload: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    try {
      const ai = createGeminiClient();
      const systemInstruction = buildObsidianSystemPrompt(options);
      const stream = await openStreamWithModelFallback(ai, transcript, systemInstruction);

      let fullText = '';
      for await (const chunk of stream) {
        const piece = chunk.text ?? '';
        if (piece) {
          fullText += piece;
          sendEvent({ type: 'chunk', text: piece });
        }
      }

      if (!fullText.trim()) {
        sendEvent({ type: 'error', error: 'O modelo retornou uma resposta vazia. Tente novamente.' });
        res.end();
        return;
      }

      const result = cleanAndValidateObsidianMarkdown(fullText, options.vaultLaws);
      sendEvent({ type: 'done', result });
      res.end();
    } catch (err) {
      const formatted = formatGeminiError(err);
      sendEvent({ type: 'error', error: formatted.message });
      res.end();
    }
  });

  return app;
}
