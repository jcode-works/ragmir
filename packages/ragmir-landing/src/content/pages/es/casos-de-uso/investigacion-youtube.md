---
title: "RAG para YouTube: guiones con citas de tus fuentes | Ragmir"
description: "Usa Ragmir como mesa de investigación de tu canal de YouTube: indexa libros, estudios y subtítulos previos, revisa guiones con fuentes citadas y mantén un wiki al día."
h1: "RAG para creadores de YouTube: investigación, guiones y un wiki con tus fuentes"
summary: "Indexa una vez los libros, estudios, artículos y archivos de subtítulos detrás de tus vídeos. Tu asistente de IA responde entonces preguntas de investigación con citas, revisa un guión contra tus fuentes y mantiene un wiki de temas que crece de un vídeo al siguiente. Ragmir busca y cita; no escribe, graba ni publica."
section: use-case
setup: creator
translationKey: "use-cases/youtube-research"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["local-vs-cloud-rag", "rag-citations", "agentic-rag", "local-rag"]
---

¿Cómo vuelves a encontrar la fuente de cada dato de tu vídeo? Un vídeo basado en investigación
necesita fuentes que puedas localizar de nuevo. Ragmir convierte la carpeta de tu canal en una base
que tu asistente de IA puede buscar, y cada respuesta apunta a la página o a la línea de donde sale.

## Qué va a la base

- **Libros y lecturas largas** en PDF o EPUB, citados por página o por sección del EPUB.
- **Estudios, informes y artículos** guardados en PDF, HTML o Markdown.
- **Tus vídeos anteriores** en archivos de subtítulos: `.srt`, `.vtt`, `.sbv` y otros formatos de
  subtítulos se citan por línea, y las líneas incluyen las marcas de tiempo.
- **Notas, guiones y figuras** en Markdown, Word o Excel, citados por línea, pasaje o celda.

Ragmir indexa más de 900 tipos de archivo; la [lista de formatos
admitidos](/docs/supported-formats/) los enumera todos. Lee texto, no sonido: un vídeo necesita sus
subtítulos o una transcripción antes de que Ragmir pueda citarlo.

## Prepara la carpeta de investigación

Guarda las fuentes tal como las recibiste en una carpeta, y las páginas que escribe tu IA en otra.
Esta es la estructura que usa la habilidad `ragmir-wiki` de Ragmir:

```text
channel/
  raw/    books, papers, articles, and caption files, never edited
  wiki/   topic pages your AI maintains, one topic per page
```

Instala Ragmir en la carpeta, añade las dos partes como fuentes y construye el índice:

```bash
npm install -D @jcode.labs/ragmir
npx rgr init
npx rgr sources add "raw/**" "wiki/**"
npx rgr ingest
```

Después conecta tu asistente. Un chat de escritorio que admita servidores MCP locales, o un agente
de programación como Claude Code, Codex o Cursor, arranca el servidor de Ragmir sobre esta carpeta;
las [integraciones](/es/integraciones/) muestran cada una. Para dar a tu agente las habilidades que
ejecutan los pasos de abajo, incluida `ragmir-wiki`:

```bash
npx skills add jcode-works/ragmir
```

## Investiga un vídeo con citas

Pregúntale a tu asistente las preguntas que el vídeo tiene que responder. Busca en la base, lee los
pasajes que necesita y cita cada uno.

<figure>
  <img src="/guides/creator-search.webp" alt="Terminal ejecutando rgr search con la pregunta Should passwords be changed periodically. Los resultados citan una página del wiki, wiki/password-rotation.md:L8-L12#1, los subtítulos del episodio 12, raw/captions/ep-12-password-myths.vtt:L1-L16#0, y la página 25 de un PDF del NIST, raw/papers/nist-sp-800-63b-4.pdf:p25#56." width="1440" height="934" loading="lazy" decoding="async">
  <figcaption>Una pregunta sobre la carpeta de un canal de demostración: una página temática del wiki, los subtítulos de un episodio anterior y la página de la guía del NIST en la que se basan ambas, cada una con su cita.</figcaption>
</figure>

Cuando las fuentes no contienen evidencia, Ragmir no devuelve nada y el asistente puede decir que tu
investigación no cubre la pregunta. Ese es el momento de buscar una fuente nueva, no de improvisar.

## Revisa un guión antes de grabar

Pega un borrador y pide al asistente que compruebe cada afirmación contra la base. El servidor MCP de
Ragmir incluye un prompt `answer` que pide una cita para cada afirmación y una declaración sencilla
cuando los documentos no contienen evidencia.

Un pasaje marcado como `weakEvidence` merece una segunda revisión. Una afirmación sin ningún pasaje
necesita una fuente o una reescritura.

## Mantén un wiki por temas que crezca con el canal

El wiki es donde se acumula la investigación: una página Markdown por tema, escrita por tu asistente a
partir de las fuentes, con una cita detrás de cada afirmación. Ragmir nunca escribe una página. Busca,
cita, enumera y audita.

- El prompt `compile-source` guía al modelo para convertir una fuente en páginas citadas. La habilidad
  `ragmir-wiki` también actualiza las páginas que ya cubren un tema antes de crear otras nuevas.
- Cada página registra en su front matter las fuentes de las que se escribió, y enlaza páginas
  relacionadas con `[[wikilinks]]`.
- `rgr audit --knowledge` revisa el wiki: enlaces rotos, páginas que faltan, citas cambiadas y páginas
  cuyas fuentes cambiaron desde que se escribieron.

```bash
npx rgr audit --knowledge --path wiki
```

<figure>
  <img src="/guides/creator-audit.webp" alt="Terminal ejecutando rgr audit --knowledge --path wiki sobre la carpeta de demostración. Informa de una página con dos enlaces y dos citas válidas, de dos páginas que faltan, Passkeys y Password myths, a las que enlaza la página, y de una página a la que todavía no enlaza ninguna otra." width="1440" height="681" loading="lazy" decoding="async">
  <figcaption>La auditoría del wiki de demostración: ambas citas siguen siendo válidas, y la página enlaza a dos temas que aún no tienen página, una lista preparada para la siguiente sesión de investigación.</figcaption>
</figure>

## Automatiza la mesa de investigación

La rutina funciona sin ti una vez configurada:

- Coloca las fuentes nuevas en `raw/` e ingiérelas. Solo lee los archivos nuevos y modificados:

  ```bash
  npx rgr ingest
  ```

- Al empezar una sesión, el asistente lista lo que cambió desde la anterior con `ragmir_sources` y
  `changedSince`, y después compila esas fuentes en el wiki.
- Un `npx rgr audit --knowledge` programado marca las páginas que hay que actualizar cuando cambia una
  fuente.
- Para el siguiente vídeo, el asistente redacta un esquema a partir del wiki, con las citas que
  compruebas antes de grabar.

Grabar, editar y publicar siguen siendo cosa tuya. Ragmir es la capa de investigación que hay detrás.

## Mantén tu investigación en local o usa una IA en la nube

El índice se queda en tu equipo en cualquier caso. Con un modelo local a través de Ollama, nada sale de
él. Con un asistente en la nube, los pasajes que lee llegan a su proveedor, lo que importa si trabajas
con guiones sin publicar, acuerdos con patrocinadores o notas privadas. La [guía de RAG local o en la
nube](/es/rag-local-o-nube/) explica los modelos, el hardware y qué revisar antes de elegir.

## Cada función de Ragmir que usa este flujo de trabajo

| Paso | Función | Más información |
| --- | --- | --- |
| Reúne las fuentes | Más de 900 tipos de archivo: PDF, EPUB, Word, Excel, Markdown y archivos de subtítulos | [Formatos admitidos](/docs/supported-formats/) |
| Libros escaneados y fotos | OCR local, que solo se ejecuta cuando lo activas con `rgr ocr setup` | [Configuración](/docs/configuration/) |
| Construye y actualiza el índice | `rgr ingest` lee solo los archivos nuevos y modificados | [Referencia de la CLI](/docs/cli-reference/) |
| Busca con tus propias palabras | Búsqueda por palabras clave de forma predeterminada; un modelo local opcional para sinónimos y otros idiomas | [RAG local o en la nube](/es/rag-local-o-nube/) |
| Cita cada pasaje | La página, la línea, la celda o la sección del EPUB de cada resultado | [Citas RAG](/es/rag-citas/) |
| Consulta el contexto de una cita | `ragmir_expand` devuelve el pasaje con sus vecinos | [Servidor MCP de RAG](/es/servidor-mcp-rag/) |
| Revisa un guión | El prompt `answer` pide una cita para cada afirmación | Esta página |
| Escribe el wiki | La habilidad `ragmir-wiki` y el prompt `compile-source` | Esta página |
| Audita el wiki | `rgr audit --knowledge`: enlaces rotos, páginas que faltan, citas cambiadas | Esta página |
| Retoma donde lo dejaste | `ragmir_sources` con `changedSince` lista lo que ha cambiado | Esta página |
| Mantenlo en privado | El índice se queda en tu equipo; un modelo local puede escribir las respuestas | [RAG local o en la nube](/es/rag-local-o-nube/) |

## Límites

- Ragmir no transcribe audio ni vídeo. Exporta los subtítulos o transcribe antes.
- Una cita de subtítulos apunta a líneas del archivo de subtítulos, cuyas marcas de tiempo te llevan de
  vuelta al momento; no abre el reproductor de vídeo.
- El asistente escribe el esquema y el wiki. Compara cada cita textual con su pasaje citado antes de
  que aparezca en pantalla.

## Próximos pasos

- [RAG local o en la nube: modelos, hardware y tus datos](/es/rag-local-o-nube/)
- [Citas RAG: línea, página, diapositiva y celda](/es/rag-citas/)
- [RAG agéntico: cómo busca el asistente](/es/rag-agentico/)
- [Formatos admitidos](/docs/supported-formats/)
