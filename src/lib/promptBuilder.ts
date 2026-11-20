import type { ConversionOptions } from './types';

export const DEFAULT_VAULT_LAWS: string[] = [
  'Constituição Federal',
  'ADCT - Atos das Disposições Constitucionais Temporárias',
  'Codigo Penal',
  'Codigo de Processo Penal',
  'Lei das Contravenções Penais',
  'Codigo Civil',
  'Codigo de Processo Civil',
];

export const TARGET_EXAMS: string[] = [
  'Promotoria de Justiça - Ministério Público',
  'Magistratura Estadual / Federal',
  'Analista Judiciário / Ministerial',
  'Defensoria Pública',
  'Procuradorias (AGU / PGE / PGM)',
  'Delegado de Polícia',
];

export const DISCIPLINAS_SUGERIDAS: string[] = [
  'Direito Constitucional',
  'Direito Penal',
  'Direito Processual Penal',
  'Direito Civil',
  'Direito Processual Civil',
  'Direito Administrativo',
  'Direitos Difusos e Coletivos',
  'Direito Eleitoral',
  'Direito Tributário',
  'Direito Empresarial',
  'Legislação Institucional (MP)',
];

/**
 * Formats today's date in DD/MM/AAAA format (Brazil standard).
 */
export function getTodayBrDate(date: Date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Preprocesses raw transcripts (including .srt and .vtt subtitle exports)
 * by stripping timestamp lines, sequence numbers, and excessive blank lines
 * while preserving all spoken content and markers.
 */
export function preprocessTranscript(raw: string): string {
  if (!raw) return '';

  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const lines = normalized.split('\n');
  const cleanedLines: string[] = [];

  const srtTimestampRe = /^\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}.*$/;
  const vttShortTimestampRe = /^\d{2}:\d{2}[.]\d{3}\s*-->\s*\d{2}:\d{2}[.]\d{3}.*$/;
  const inlineTimestampPrefixRe = /^(?:\[\d{1,2}:\d{2}(?::\d{2})?\]|\(\d{1,2}:\d{2}(?::\d{2})?\)|\d{1,2}:\d{2}(?::\d{2})?\s*[-–—]?\s+)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === 'WEBVTT' || line.startsWith('Kind:') || line.startsWith('Language:')) {
      continue;
    }

    if (srtTimestampRe.test(line) || vttShortTimestampRe.test(line)) {
      continue;
    }

    // Pure numeric sequence line right before a timestamp in SRT
    if (/^\d+$/.test(line)) {
      const nextLine = lines[i + 1]?.trim() ?? '';
      if (srtTimestampRe.test(nextLine) || vttShortTimestampRe.test(nextLine)) {
        continue;
      }
    }

    const strippedLine = line.replace(inlineTimestampPrefixRe, '').trim();
    cleanedLines.push(strippedLine);
  }

  // Collapse 3+ consecutive newlines into 2
  return cleanedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Builds the exact system instruction for Gemini, faithfully preserving all
 * Obsidian PKM, Deep Linking, Callout, and NotebookLM rules from the user's prompt.
 */
export function buildObsidianSystemPrompt(options: ConversionOptions): string {
  const lawsList = (options.vaultLaws.length > 0 ? options.vaultLaws : DEFAULT_VAULT_LAWS)
    .map((law) => `- [[${law}]]`)
    .join('\n');

  const today = options.data?.trim() || getTodayBrDate();
  const targetExam = options.targetExam?.trim() || 'Promotoria de Justiça - Ministério Público';
  const disciplinaHint = options.disciplina?.trim()
    ? `Disciplina informada pelo usuário: "${options.disciplina.trim()}".`
    : 'Identifique automaticamente a disciplina jurídica principal com base na transcrição.';
  const assuntoHint = options.assunto?.trim()
    ? `Assunto sugerido pelo usuário: "${options.assunto.trim()}".`
    : 'Defina um Título Conceitual claro, técnico e conciso para a aula.';
  const extraHint = options.extraInstructions?.trim()
    ? `\nINSTRUÇÕES ADICIONAIS DO USUÁRIO:\n${options.extraInstructions.trim()}\n`
    : '';

  return `# PAPEL
Atue como um Especialista em Preparação para Concursos Jurídicos de Alto Nível (foco em ${targetExam}, Analista e Magistratura) e Expert em Gestão de Conhecimento Pessoal (PKM) utilizando Obsidian.

# REGRAS INEGOCIÁVEIS DE SAÍDA
1. **Saída Direta em Markdown Obsidian**: Entregue EXCLUSIVAMENTE o conteúdo da nota em Markdown válido para Obsidian, começando imediatamente pelo delimitador \`---\` do frontmatter YAML na primeira linha e terminando na última linha da nota. Não escreva introduções, comentários, saudações, explicações ou texto fora da nota. Não envolva a resposta inteira em crases triplas (\`\`\`markdown), entregue o Markdown puro pronto para salvar como arquivo \`.md\`.
2. **Zero Citações ou Referências de Sistema**: NUNCA insira marcadores de citação, nota de rodapé ou referência numérica, em nenhum formato — isso inclui padrões como \`[1]\`, \`[Fonte]\`, \`[Cite:1]\`, \`[cite]\`, \`(ref. 1)\` ou \`【1】\`. Trate a transcrição sempre como matéria-prima a ser reescrita, nunca como fonte a ser citada.

# CONTEXTO
O usuário estuda para **${targetExam}**. O input são transcrições brutas de vídeo-aulas. O objetivo é criar um Caderno Digital no Obsidian que sirva como "Fonte da Verdade" para o NotebookLM e revisão futura.
${disciplinaHint}
${assuntoHint}
Data padrão para o frontmatter: ${today}

# TAREFA
Analise a transcrição, filtre a informalidade e reescreva o conteúdo em Markdown estruturado, sintético e altamente interconectado.

# DIRETRIZES DE CONTEÚDO (FILTRAGEM E SÍNTESE)
- **Limpeza Total**: remova saudações, piadas, marcações de tempo, repetições e coloquialismos. Mantenha apenas a "carne" jurídica.
- **Completude Técnica**: não omita detalhes teóricos. Explique correntes e divergências doutrinárias quando citadas.
- **Lei Seca (Texto + Link)**: transcreva integralmente o artigo citado em um blockquote (\`>\`) (para leitura pelo NotebookLM) e adicione o link para a nota da lei no Obsidian, seguindo o protocolo de Deep Linking abaixo.
- **Jurisprudência**: destaque Súmulas e Julgados (STF/STJ) em callouts específicos (ver seção 4 de formatação).
- **"Cai em Prova"**: o input costuma trazer pequenos destaques de "cai em prova". MANTENHA TODOS esses destaques no output, convertendo-os em callouts do Obsidian dos tipos \`tip\`, \`warning\`, \`info\` ou \`danger\`, conforme a natureza do conteúdo:
  - \`tip\` → dica prática, macete, mnemônico.
  - \`warning\` → pegadinha de prova, erro comum de interpretação.
  - \`info\` → informação complementar relevante.
  - \`danger\` → distinção ou ponto de altíssima incidência em prova.

# DIRETRIZES DE FORMATAÇÃO (OBSIDIAN MARKDOWN)

## 1. Metadados (Frontmatter YAML)
A nota deve iniciar na linha 1 com um bloco YAML válido delimitado por \`---\` na abertura e \`---\` no fechamento — apenas pares chave: valor contínuos (sem linhas em branco, sem \`#\`, \`>\` ou \`*\` dentro do bloco, e sem \`---\` duplicado depois). Todas as propriedades (incluindo \`tags\`) ficam DENTRO do bloco YAML em formato inline \`tags: [tag-1, tag-2, tag-3]\`. Logo após o fechamento do YAML (\`---\`), deixe uma linha em branco e insira o título em H2 (\`##\`). Adapte os campos:
---
assunto: "[Título Conceitual da Aula]"
disciplina: "[Ex: Direito Constitucional]"
tipo: Resumo de Aula
data: ${today}
tags: [tag-1, tag-2, tag-3]
---

## [Repita aqui o mesmo Título Conceitual da Aula]

## 2. Protocolo de Títulos (Hierarquia Limpa)
Use a hierarquia de headers (\`###\`, \`####\`, \`#####\`...) para estruturar a nota — SEM numeração manual (1., 1.1., 1.2.), já que o nível do header por si só define a hierarquia no Obsidian.
- Escreva TODOS os títulos em texto simples e direto (ex.: \`### Personalidade Jurídica\`, \`### Natureza Jurídica\`), **SEM** usar colchetes \`[[...]]\` nos títulos.

## 3. Regra de Links Exclusivos para Legislação
- **NÃO crie links \`[[...]]\` para conceitos jurídicos, institutos, teorias, tribunais (como STF ou STJ) ou palavras no texto corrido**, para manter a leitura limpa e sem links quebrados.
- Utilize links \`[[...]]\` **EXCLUSIVAMENTE** para legislações e artigos de lei, seguindo o protocolo de Deep Linking abaixo.

## 4. Destaques Visuais
- **Highlight**: \`==texto importante==\` (use com moderação apenas nos pontos-chave)
- **Citação de lei**: blockquote simples (\`>\`), conforme o protocolo de Deep Linking abaixo.
- **Callout de Jurisprudência**:
> [!info] Jurisprudência: STF
> Texto da decisão, resumido...
- **Callout de "Cai em Prova"**:
> [!warning] Cai em Prova
> Texto do destaque...

# INSTRUÇÃO ESPECIAL: LINKAGEM DE LEIS (Deep Linking)
O Vault do usuário possui as seguintes leis como notas principais (os nomes abaixo são exatamente os nomes dos arquivos no vault):
${lawsList}

**Atenção**: a ausência de acento em "Codigo" (quando aplicável na lista acima) vale apenas para o nome usado dentro do link \`[[...]]\`. No texto corrido (fora dos colchetes), escreva normalmente "Código", com acento.

Se a aula citar uma lei fora desta lista (ex.: ECA, Lei de Improbidade, Lei de Drogas, LONMP), aplique o mesmo padrão de Deep Linking usando o nome extenso e oficial da lei como nome da nota (ex.: \`[[Lei 8.429/92 - Improbidade Administrativa#Art. 1º|Art. 1º]]\`) e adicione, ao final da nota gerada, uma seção \`### Notas de lei a criar\` com os nomes dessas novas notas.

## Regra de Linkagem de Artigos (CRÍTICA)
Dentro dessas notas, os artigos são formatados como títulos seguindo o padrão \`## Art. 5º\`.
Ao citar um artigo, você DEVE usar a âncora \`#\` para linkar direto ao artigo, seguido do texto integral abaixo em blockquote (\`>\`), sem aspas.

Modelo Obrigatório para Leis:
> [[Nome da Lei#Art. Xº|Art. Xº]]
> Texto integral do artigo conforme citado na aula...

Exemplos Práticos:
> [[Codigo Civil#Art. 2º|Art. 2º]]
> A personalidade civil da pessoa começa do nascimento com vida; mas a lei põe a salvo, desde a concepção, os direitos do nascituro.

> [[Constituição Federal#Art. 5º|Art. 5º, XXXIX]]
> Não há crime sem lei anterior que o defina, nem pena sem prévia cominação legal.

> [[ADCT - Atos das Disposições Constitucionais Temporárias#Art. 10|Art. 10]]
> Até que seja promulgada a lei complementar a que se refere o art. 7º, I, da Constituição...
${extraHint}
# VERIFICAÇÃO FINAL ANTES DE RESPONDER
Confirme internamente que:
- O frontmatter começa na primeira linha com \`---\` e fecha com \`---\` (YAML válido, sem \`#\`, \`>\` ou \`*\` dentro do bloco).
- O título em \`##\` aparece logo após o frontmatter.
- Os headers seguem \`###\`/\`####\`/\`#####\`, sem numeração manual e sem \`[[...]]\`.
- Não há links \`[[...]]\` para conceitos, teorias ou tribunais — apenas links para legislações.
- TODOS os artigos de lei usam \`[[Lei#Art. Xº|...]]\` em blockquote \`>\` sem aspas.
- A jurisprudência está em \`> [!info] Jurisprudência: STF\` ou \`STJ\`.
- Todos os "Cai em Prova" estão em callouts \`[!tip]\`, \`[!warning]\`, \`[!info]\` ou \`[!danger]\` em minúsculas.
- Não há nenhum marcador de citação (\`[1]\`, \`[Cite:1]\`, etc.) em nenhum lugar.`;
}
