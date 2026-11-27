---
title: "RAG sin base vectorial, GPU ni clave de API | Ragmir"
description: "Cuándo basta la búsqueda BM25 por palabras clave, con embeddings locales opcionales: cómo funciona la ruta predeterminada de Ragmir, qué ha medido y sus contrapartidas."
h1: "RAG sin base vectorial: cuándo basta la búsqueda por palabras clave"
summary: "RAG necesita un índice de búsqueda, no un servidor de base de datos vectorial. La recuperación predeterminada de Ragmir, local-hash, ordena primero la evidencia por palabras clave BM25 en un índice integrado bajo la carpeta .ragmir del proyecto. No necesita modelo de embeddings, GPU ni clave de API. En el propio repositorio de Ragmir colocó un archivo de respuesta entre los 3 primeros en el 82 % de 89 preguntas de desarrolladores, y entre los 10 primeros en el 99 %. Añade un modelo local de embeddings cuando las preguntas usen palabras que tus documentos no usan."
section: guide
setup: agents
translationKey: "rag-without-vector-database"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["agentic-rag", "benchmarks", "local-rag"]
---

RAG necesita una forma de encontrar los pasajes que responden a una pregunta. No necesita un
servidor de base de datos.

Ragmir hace esto en un único proceso de Node.js. El análisis, el índice y la búsqueda se ejecutan
donde se ejecuta Ragmir. El índice es un almacén LanceDB integrado en la carpeta `.ragmir/`,
ignorada por Git.

No hay ningún servidor de base de datos que desplegar ni ninguna API de embeddings que llamar. Con
el proveedor predeterminado `local-hash`, tampoco hay ningún modelo que descargar. El agente o la
aplicación que llama a Ragmir redacta la respuesta con el modelo que elija.

## ¿Puede funcionar RAG sin base de datos vectorial?

Sí, cuando la evidencia por palabras clave contiene la respuesta. El proveedor predeterminado
`local-hash` funciona así:

1. **BM25 va primero.** El índice de texto completo cubre el cuerpo de cada pasaje, su contexto
   estructural y el texto de los encabezados citados. También cubre la ruta relativa del origen y
   las partes de los identificadores en camelCase, PascalCase, siglas y combinaciones de letras y
   dígitos. Por eso, la pregunta «login attempts» puede llegar a `LoginAttemptService.java`.
2. **El texto se normaliza.** Las mayúsculas, los acentos y otros signos diacríticos se normalizan
   igual en los pasajes y en las consultas. Después, el analizador aplica el stemming en inglés y
   elimina las palabras vacías (stop words) del inglés.
3. **Los vectores con hash solo desempatan.** El vector de `local-hash` es una señal léxica con
   hash, sin frecuencia inversa de documento. Recibe un peso de 0,01 en la fusión por rango
   recíproco (reciprocal-rank fusion). Solo desempata o añade pasajes que el índice de texto
   completo no devolvió.
4. **La evidencia débil no devuelve nada.** `local-hash` exige evidencia léxica. No responde nada
   cuando las palabras que no aparecen en ningún lugar del índice suman la mitad del peso IDF de la
   pregunta. Un ejemplo es «How does it sync with Pinecone?» sobre un corpus que nunca menciona
   Pinecone. Una búsqueda cuyos cinco primeros resultados son todos débiles tampoco devuelve ningún
   resultado.

Así que incluso la opción predeterminada conserva vectores. Están con hash, viven en la carpeta
`.ragmir/` del proyecto y ningún servidor los almacena.

## Búsqueda híbrida: BM25 más embeddings locales opcionales

Con un modelo local de Transformers, Ragmir fusiona los resultados vectoriales y de texto completo
mediante la fusión por rango recíproco con `k = 60`, con pesos iguales. El modelo se ejecuta a
través de la peer dependency opcional `@huggingface/transformers`:

```bash
pnpm add -D @huggingface/transformers
pnpm exec rgr setup --semantic
pnpm exec rgr ingest
```

`rgr setup --semantic` instala el modelo que mejor se adapta a esta máquina (Granite R2 multilingüe
en la mayoría), salvo que el proyecto ya haya elegido uno. `rgr models list` muestra el tamaño de
descarga de cada modelo y la memoria que necesita la indexación. Cambiar de modelo prepara una
reconstrucción validada en la siguiente ingesta.

Para generar embeddings con un modelo que ya sirves, define `embeddingProvider: "openai-compatible"`. Ragmir envía entonces las peticiones a Ollama, vLLM u otro endpoint compatible
con OpenAI. El texto de los pasajes y las consultas se envía a ese endpoint.

## RAG sin GPU ni clave de API

- **La recuperación no necesita ninguno de los dos.** `local-hash` funciona sin conexión en la CPU,
  sin modelo, GPU ni clave de API. Los modelos semánticos también se ejecutan en la CPU. La GPU es
  opcional: solo genera los embeddings de los lotes de ingesta (`ingestEmbeddingDevice: "webgpu"`).
  La búsqueda sigue calculando en la CPU los embeddings de las consultas breves.
- **La respuesta es una elección aparte.** El modelo que llama tu agente o aplicación puede
  necesitar una clave. Un modelo local mantiene los pasajes en la máquina cuando toda la aplicación
  se ejecuta en local. Un ejemplo es Ollama con sus funciones en la nube desactivadas. La [guía de
  integración con agentes](/docs/agent-integration/) incluye ese ejemplo.

## Qué muestran las mediciones

El 27 de noviembre de 2026, `pnpm bench:competitors` planteó 89 preguntas de desarrolladores, 30
preguntas fuera de tema y 40 preguntas de dominio cercano sobre 287 archivos del repositorio de
Ragmir, en Ragmir y en otras bibliotecas locales de recuperación. Los
[benchmarks](/es/benchmarks/) ofrecen la tabla completa, un gráfico y el informe sin procesar.

Sin ningún modelo, Ragmir colocó un archivo de respuesta en el top 3 con más frecuencia (82 %)
que el pipeline de LangChain.js con un modelo de embeddings (70 %). Además, no devolvió nada en
la mayoría de las preguntas fuera de tema.

Añadir el modelo subió el top 3 del 82 al 87 %. También aumentó los rechazos de preguntas fuera
de tema y de dominio cercano.

## Compromisos que conviene valorar

- **Vocabulario.** Las palabras clave encuentran las palabras que usan tus documentos. Añade un
  modelo cuando las preguntas usen otras palabras (sinónimos, paráfrasis u otro idioma). Añádelo
  también cuando los rechazos deban seguir el significado y no las palabras clave. Sin modelo, un
  agente puede enviar con la pregunta sus propias palabras clave `lex`, una paráfrasis `vec` o una
  respuesta probable `hyde`. Ragmir busca sus palabras, que llegan a pasajes que las palabras de la
  pregunta no alcanzan.
- **Los rechazos siguen a las palabras clave.** Una pregunta de dominio cercano que comparte el
  vocabulario del proyecto puede seguir devolviendo pasajes, como muestra la columna de dominio
  cercano.
- **Velocidad.** Las bibliotecas en memoria respondieron más rápido. Ragmir busca en un índice en
  disco que se actualiza de forma incremental.
- **Tu corpus decide.** Un solo repositorio no es el tuyo. Ejecuta `rgr evaluate` con tus propias
  preguntas, con y sin modelo, antes de elegir.

## ¿Es esto RAG sin vectores?

No, el RAG sin vectores es otra idea. El proyecto PageIndex lo describe como la construcción de un
«índice jerárquico en árbol» para cada documento, como «una tabla de contenidos optimizada para LLM
y agentes». Después, un LLM busca en ese árbol razonando, con «ni bases de datos vectoriales ni
fragmentación».

Ragmir fragmenta los documentos y guarda vectores con hash o de modelo junto a un índice de palabras
clave. Ordena los pasajes sin pedir a un modelo generativo que los elija.

Un agente puede seguir navegando por la estructura. `ragmir_sources` con `outline: true` devuelve
las secciones de un documento con la cita del primer pasaje de cada sección. Ampliar cada
`nextCitation` con `ragmir_expand` permite leer el documento completo.

## Pruébalo

```bash
pnpm add -D @jcode.labs/ragmir
pnpm exec rgr setup --no-ingest --agents claude,codex
pnpm exec rgr sources add "docs/**/*.md" "specs/**/*.docx" "src/**/*.ts"
pnpm exec rgr ingest
pnpm exec rgr search "authentication contract" --compact
```

Añade `--explain` a una búsqueda para ver el rango por palabras clave y el rango vectorial de cada
resultado, y sus términos coincidentes.

## Próximos pasos

- [¿Qué es el RAG agéntico?](/es/rag-agentico/)
- [Benchmarks, método y límites](/es/benchmarks/)
- [Configuración: ranking y abstención](/docs/configuration/)
- [Crea un RAG local](/es/rag-local/)
