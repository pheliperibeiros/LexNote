import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_VAULT_LAWS,
  buildObsidianSystemPrompt,
  preprocessTranscript,
} from './promptBuilder';
import {
  cleanAndValidateObsidianMarkdown,
  isLegislationWikiLink,
  stripCitationMarkers,
  stripNonLegislationLinks,
  unwrapOuterCodeFence,
} from './markdownProcessor';
import { parseObsidianMarkdown, tokenizeInline } from './obsidianParser';

test('preprocessTranscript strips SRT and inline timestamps cleanly', () => {
  const srtInput = `1
00:00:01,000 --> 00:00:04,500
Olá pessoal, bem-vindos!

2
00:00:05,000 --> 00:00:09,200
[00:00:05] Hoje vamos estudar o artigo 2º do Código Civil.`;

  const cleaned = preprocessTranscript(srtInput);
  assert.equal(cleaned.includes('-->'), false);
  assert.equal(cleaned.includes('[00:00:05]'), false);
  assert.match(cleaned, /Olá pessoal, bem-vindos!/);
  assert.match(cleaned, /Hoje vamos estudar o artigo 2º do Código Civil\./);
});

test('buildObsidianSystemPrompt embeds all vault laws, target exam, and legislation-only link rule', () => {
  const prompt = buildObsidianSystemPrompt({
    targetExam: 'Promotoria de Justiça - Ministério Público',
    disciplina: 'Direito Civil',
    data: '20/11/2026',
    vaultLaws: DEFAULT_VAULT_LAWS,
  });

  assert.match(prompt, /\[\[Codigo Civil\]\]/);
  assert.match(prompt, /\[\[Constituição Federal\]\]/);
  assert.match(prompt, /Promotoria de Justiça - Ministério Público/);
  assert.match(prompt, /Direito Civil/);
  assert.match(prompt, /20\/11\/2026/);
  assert.match(prompt, /NÃO crie links `\[\[\.\.\.\]\]` para conceitos jurídicos/);
});

test('unwrapOuterCodeFence removes only the outer markdown wrapper', () => {
  const wrapped = '```markdown\n---\nassunto: "Teste"\n---\n## Teste\n```';
  const unwrapped = unwrapOuterCodeFence(wrapped);
  assert.equal(unwrapped, '---\nassunto: "Teste"\n---\n## Teste');
});

test('stripCitationMarkers removes LLM citations without breaking WikiLinks or callouts', () => {
  const text =
    'Veja [[Codigo Civil#Art. 2º|Art. 2º]] segundo a doutrina [1] e julgados [Cite:2] 【3】 (ref. 4).\n> [!info] Jurisprudência: STJ';
  const cleaned = stripCitationMarkers(text);
  assert.match(cleaned, /\[\[Codigo Civil#Art\. 2º\|Art\. 2º\]\]/);
  assert.match(cleaned, /\[\!info\]/);
  assert.equal(cleaned.includes('[1]'), false);
  assert.equal(cleaned.includes('[Cite:2]'), false);
  assert.equal(cleaned.includes('【3】'), false);
  assert.equal(cleaned.includes('(ref. 4)'), false);
});

test('stripNonLegislationLinks unwraps concept/tribunal links and keeps only legislation links', () => {
  const input = `### [[Personalidade Jurídica]]
O [[Nascituro]] e os [[Crime Doloso|crimes dolosos]] segundo o [[STJ]].

> [[Codigo Civil#Art. 2º|Art. 2º]]
> A personalidade civil da pessoa começa do nascimento com vida.

> [[Constituição Federal#Art. 5º|Art. 5º, XXXIX]]
> Não há crime sem lei anterior que o defina.

> [[Lei 8.069/90 - Estatuto da Criança e do Adolescente#Art. 7º|Art. 7º]]
> A criança e o adolescente têm direito à proteção à vida.`;

  const stripped = stripNonLegislationLinks(input, DEFAULT_VAULT_LAWS);
  assert.match(stripped, /^### Personalidade Jurídica$/m);
  assert.match(stripped, /O Nascituro e os crimes dolosos segundo o STJ\./);
  assert.match(stripped, /\[\[Codigo Civil#Art\. 2º\|Art\. 2º\]\]/);
  assert.match(stripped, /\[\[Constituição Federal#Art\. 5º\|Art\. 5º, XXXIX\]\]/);
  assert.match(
    stripped,
    /\[\[Lei 8\.069\/90 - Estatuto da Criança e do Adolescente#Art\. 7º\|Art\. 7º\]\]/
  );
  assert.equal(isLegislationWikiLink('Teoria Concepcionista'), false);
  assert.equal(isLegislationWikiLink('Codigo Penal#Art. 121|Art. 121'), true);
});

test('cleanAndValidateObsidianMarkdown extracts metadata, metrics, filename, and strips concept links', () => {
  const sampleNote = `\`\`\`markdown
---
assunto: "Personalidade Jurídica e Capacidade Civil"
disciplina: "Direito Civil"
tipo: Resumo de Aula
data: 09/02/2025
tags: [personalidade-juridica, nascituro]
---
## Personalidade Jurídica e Capacidade Civil

### [[Personalidade Jurídica]]
Aptidão genérica para ==titularizar direitos== [1].

> [[Codigo Civil#Art. 2º|Art. 2º]]
> A personalidade civil da pessoa começa do nascimento com vida.

> [!warning] Cai em Prova
> Cuidado com a diferença entre capacidade e personalidade.

> [!info] Jurisprudência: [[STJ]]
> O STJ adota a [[Teoria Concepcionista]] para dano moral ao [[Nascituro]].

### Notas de lei a criar
- Lei 8.069/90 - Estatuto da Criança e do Adolescente
\`\`\``;

  const result = cleanAndValidateObsidianMarkdown(sampleNote);
  assert.equal(result.stats.hasValidFrontmatter, true);
  assert.equal(result.stats.metadata.assunto, 'Personalidade Jurídica e Capacidade Civil');
  assert.equal(result.stats.metadata.disciplina, 'Direito Civil');
  assert.deepEqual(result.stats.metadata.tags, ['personalidade-juridica', 'nascituro']);
  assert.equal(result.stats.suggestedFilename, 'personalidade-juridica-e-capacidade-civil.md');
  assert.equal(result.stats.wikiLinksCount, 1);
  assert.equal(result.stats.lawDeepLinksCount, 1);
  assert.equal(result.stats.calloutCounts.warning, 1);
  assert.equal(result.stats.calloutCounts.info, 1);
  assert.equal(result.stats.calloutCounts.total, 2);
  assert.deepEqual(result.stats.lawsToCreate, ['Lei 8.069/90 - Estatuto da Criança e do Adolescente']);
  assert.equal(result.markdown.includes('[1]'), false);
  assert.equal(result.markdown.includes('[[Personalidade Jurídica]]'), false);
  assert.equal(result.markdown.includes('[[STJ]]'), false);
  assert.equal(result.markdown.includes('[[Teoria Concepcionista]]'), false);
  assert.equal(result.markdown.includes('[[Nascituro]]'), false);
  assert.match(result.markdown, /\[\[Codigo Civil#Art\. 2º\|Art\. 2º\]\]/);
});

test('parseObsidianMarkdown and tokenizeInline parse blocks and inline tokens accurately', () => {
  const md = `---
assunto: "Legalidade Penal"
disciplina: "Direito Penal"
---
## Legalidade Penal

### Princípio da Legalidade
Aplica-se aos crimes dolosos com ==reserva legal==.

> [!tip] Cai em Prova
> Lembre do mnemônico ART.

> [[Constituição Federal#Art. 5º|Art. 5º, XXXIX]]
> Não há crime sem lei anterior que o defina.`;

  const blocks = parseObsidianMarkdown(md);
  assert.equal(blocks[0].type, 'frontmatter');
  assert.equal(blocks[1].type, 'heading');
  assert.equal(blocks[2].type, 'heading');
  assert.equal(blocks[3].type, 'paragraph');
  assert.equal(blocks[4].type, 'callout');
  assert.equal(blocks[5].type, 'blockquote');

  if (blocks[4].type === 'callout') {
    assert.equal(blocks[4].calloutType, 'tip');
    assert.equal(blocks[4].title, 'Cai em Prova');
  }

  const inline = tokenizeInline('Veja [[Codigo Penal#Art. 1º|Art. 1º]] e ==destaque==.');
  const wikilink = inline.find((t) => t.type === 'wikilink');
  const highlight = inline.find((t) => t.type === 'highlight');
  assert.deepEqual(wikilink, {
    type: 'wikilink',
    target: 'Codigo Penal',
    anchor: 'Art. 1º',
    label: 'Art. 1º',
  });
  assert.deepEqual(highlight, { type: 'highlight', value: 'destaque' });
});

test('cleanAndValidateObsidianMarkdown fixes tags placed below --- and removes stray --- lines', () => {
  const brokenTagsBelowHr = `---
assunto: "Controle de Constitucionalidade"
disciplina: "Direito Constitucional"
tipo: Resumo de Aula
data: 20/11/2026
---
tags: [controle-constitucionalidade, adi]
---
---
## Controle de Constitucionalidade

### Controle Concentrado
Texto de exemplo.`;

  const result1 = cleanAndValidateObsidianMarkdown(brokenTagsBelowHr);
  assert.equal(result1.stats.hasValidFrontmatter, true);
  assert.deepEqual(result1.stats.metadata.tags, ['controle-constitucionalidade', 'adi']);
  assert.equal(
    result1.markdown.startsWith(
      '---\nassunto: "Controle de Constitucionalidade"\ndisciplina: "Direito Constitucional"\ntipo: Resumo de Aula\ndata: 20/11/2026\ntags: [controle-constitucionalidade, adi]\n---\n\n## Controle de Constitucionalidade'
    ),
    true
  );

  const missingOpeningDelimiter = `assunto: "Princípio da Legalidade"
disciplina: "Direito Penal"
tipo: Resumo de Aula
data: 20/11/2026
tags:
  - #legalidade
  - #direito-penal
---
## Princípio da Legalidade`;

  const result2 = cleanAndValidateObsidianMarkdown(missingOpeningDelimiter);
  assert.equal(result2.stats.hasValidFrontmatter, true);
  assert.deepEqual(result2.stats.metadata.tags, ['legalidade', 'direito-penal']);
  assert.equal(
    result2.markdown,
    '---\nassunto: "Princípio da Legalidade"\ndisciplina: "Direito Penal"\ntipo: Resumo de Aula\ndata: 20/11/2026\ntags: [legalidade, direito-penal]\n---\n\n## Princípio da Legalidade'
  );
});
