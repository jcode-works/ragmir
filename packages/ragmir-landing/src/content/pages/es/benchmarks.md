---
title: "Benchmarks de recuperación RAG que puedes repetir | Ragmir"
description: "Resultados de recuperación de Ragmir en su repositorio público frente a grep, LangChain.js, Orama y MiniSearch: método, fechas, informes y comandos."
h1: "Benchmarks de recuperación RAG que puedes repetir"
summary: "Con 89 preguntas de desarrolladores sobre el repositorio público de Ragmir, el código de la versión 6.20.0 colocó un archivo que responde entre los 10 primeros resultados en entre el 99 y el 100 % de los casos, y no devolvió nada en entre 23 y 28 de 30 preguntas fuera de tema. La primera pasada de un agente con grep ordenó los archivos casi igual de bien, pero leyó una mediana de 71 KiB hasta llegar a una respuesta, frente a menos de 5 KiB con Ragmir. Medido el 27 de noviembre de 2026."
section: benchmark
setup: agents
translationKey: "benchmarks"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["claude-code-rag", "rag-without-vector-database", "case-studies/ragmir-repository"]
highlights:
  - value: "99–100 %"
    label: "de 89 preguntas de desarrolladores obtienen un archivo que responde entre los 10 primeros"
  - value: "4,7 KiB"
    label: "de texto que lee de mediana un agente hasta la respuesta, frente a 71,4 KiB con grep"
  - value: "28 de 30"
    label: "preguntas fuera de tema sin resultados con el modelo híbrido, y 23 sin modelo"
  - value: "17,3 ms"
    label: "de búsqueda mediana sin modelo, y 19,1 ms con el modelo híbrido"
---

En las preguntas de este repositorio, Ragmir encuentra un archivo que responde casi con la misma
frecuencia que grep. Para llegar hasta él lee mucho menos texto y no devuelve nada en la mayoría de
las preguntas fuera de tema.

Los benchmarks miden solo la capa de recuperación. Comprueban:

- si vuelve un archivo que responde a la pregunta y en qué posición queda;
- si las preguntas que las fuentes no pueden responder no devuelven nada;
- cuánto tarda una búsqueda;
- cuánto texto lee un agente hasta llegar a la respuesta.

No puntúan las respuestas que escribe un modelo ni las acciones que realiza un agente.

Todas las cifras de abajo se midieron el 27 de noviembre de 2026 en el commit `10bb9f6`, que
contiene el código Core de Ragmir 6.20.0. La máquina fue un Apple M3 Max con Node.js 22. Cada cifra
enlaza a su informe completo.

## Las preguntas y los archivos

Los dos benchmarks indexan los mismos 287 archivos versionados del repositorio de Ragmir. Incluyen
documentación, código fuente de Core, skills, el código fuente y los mensajes de la landing, y
scripts. Las preguntas son públicas en
[`repository-questions.json`](https://github.com/jcode-works/ragmir/blob/main/packages/ragmir-core/benchmarks/fixtures/repository-questions.json):

- **89 preguntas de desarrolladores**, cada una con la lista de todos los archivos que la responden.
- **30 preguntas fuera de tema** sobre deportes, cocina, el tiempo o sinsentidos, que no deberían
  devolver nada.
- **40 preguntas de dominio cercano** que combinan el vocabulario del proyecto con una integración,
  un servicio o un formato que no tiene, como sus paquetes retirados de Chat y TTS. Tampoco deberían
  devolver nada.

Una pregunta cuenta como respondida en los 3 o los 10 primeros cuando aparece en ellos uno de sus
archivos.

MRR@10 es la media del recíproco de la posición del primer archivo que responde dentro de los 10
primeros resultados. Un rechazo es un resultado vacío.

## El primer paso de un agente de código: grep o Ragmir

`pnpm bench:first-pass` compara cómo llega un agente a un archivo que responde.

El lado de grep funciona así:

1. Busca con grep cada palabra de la pregunta de tres caracteres o más, sin las palabras comunes del
   inglés, con ripgrep sin distinguir mayúsculas.
2. Ordena los archivos según cuántas de esas palabras contienen y después según las coincidencias.
3. Abre los archivos completos hasta que uno responde.

El lado de Ragmir ejecuta su servidor MCP en una sesión nueva por pregunta:

1. Ejecuta la búsqueda predeterminada.
2. Ejecuta una segunda búsqueda con diez resultados cuando la primera no contiene ningún archivo que
   responda.
3. Amplía una vez la cita que responde.

Los bytes cuentan el texto que lee el modelo del agente.

| Primer paso | Respuesta en los 3 primeros | Respuesta en los 10 primeros | Respuesta alcanzada | Mediana de bytes leídos hasta llegar | Fuera de tema rechazadas | Dominio cercano rechazadas |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| ripgrep 15.2.0, palabras de la pregunta, archivos leídos completos | 85 % | 100 % | 89 de 89 | 71,4 KiB | 2 de 30 | 0 de 40 |
| Ragmir MCP, `local-hash` sin modelo | 82 % | 99 % | 88 de 89 | 4,7 KiB | 23 de 30 | 7 de 40 |
| Ragmir MCP, híbrido con `mxbai-embed-xsmall-v1` | 87 % | 100 % | 89 de 89 | 4,8 KiB | 28 de 30 | 13 de 40 |

Informe completo: [first-pass-2026-11-27.json](/benchmarks/first-pass-2026-11-27.json).

<figure>
  <img src="/guides/first-pass-chart.webp" alt="Gráficos de barras que comparan la primera pasada de grep con el servidor MCP de Ragmir en 89 preguntas de desarrolladores. Respuesta en los 3 primeros: grep 85 %, Ragmir local-hash 82 %, Ragmir híbrido 87 %. Mediana de texto leído hasta la respuesta: grep 71,4 KiB, Ragmir 4,7 y 4,8 KiB. Preguntas fuera de tema rechazadas de 30: grep 2, Ragmir 23 y 28." width="1440" height="1163" loading="lazy" decoding="async">
  <figcaption>La tabla anterior dibujada a escala.</figcaption>
</figure>

En este repositorio, las preguntas comparten palabras con los archivos, así que grep ordena tan bien
como un índice. La diferencia está en el contexto que consume el agente y en si una pregunta sin
respuesta termina sin resultados. [RAG en Claude Code](/es/claude-code-rag/) explica qué significa
esto para los agentes de código.

## Frente a otras pilas de recuperación

`pnpm bench:competitors` pasa las mismas preguntas por bibliotecas locales de recuperación en
TypeScript.

Todas las variantes vectoriales usan la función de embeddings de Ragmir con `mxbai-embed-xsmall-v1`,
así que los modelos, los prefijos y los vectores son idénticos. Las demás pilas leen los mismos
archivos, divididos con `RecursiveCharacterTextSplitter` de LangChain (1.000 caracteres,
solapamiento de 200, 4.365 fragmentos).

Orama se ejecuta con su similitud híbrida predeterminada de 0,8 y con 0,1, que permite que su parte
vectorial ordene los resultados. La búsqueda mediana es la mediana de las búsquedas secuenciales en
caliente dentro de un mismo proceso.

| Sistema | Respuesta en los 3 primeros | Respuesta en los 10 primeros | MRR@10 | Fuera de tema rechazadas | Dominio cercano rechazadas | Búsqueda mediana |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| **Ragmir**, híbrido con `mxbai-embed-xsmall-v1` | **87 %** | **100 %** | 0,658 | **28** de 30 | **13** de 40 | 19,1 ms |
| **Ragmir**, `local-hash` sin modelo | **82 %** | **99 %** | **0,675** | **23** de 30 | **7** de 40 | 17,3 ms |
| Divisor de LangChain.js con búsqueda exacta por coseno, como `MemoryVectorStore` | 70 % | 93 % | 0,581 | 0 de 30 | 0 de 40 | 6,5 ms |
| Orama híbrido, similitud predeterminada 0,8 | 14 % | 20 % | 0,102 | 2 de 30 | 0 de 40 | 8,5 ms |
| Orama híbrido, similitud 0,1 | 35 % | 71 % | 0,303 | 0 de 30 | 0 de 40 | 9,9 ms |
| MiniSearch BM25 | 74 % | 98 % | 0,596 | 2 de 30 | 0 de 40 | 1,5 ms |

Informe completo: [competitors-2026-11-27.json](/benchmarks/competitors-2026-11-27.json).

<figure>
  <img src="/guides/competitors-chart.webp" alt="Gráficos de barras que comparan Ragmir con otras bibliotecas locales de recuperación en 89 preguntas de desarrolladores y 30 preguntas fuera de tema. Respuesta en los 3 primeros: Ragmir híbrido 87 %, Ragmir local-hash 82 %, MiniSearch BM25 74 %, almacén en memoria de LangChain.js 70 %, Orama con similitud 0,1 35 %, Orama predeterminado 14 %. Preguntas fuera de tema rechazadas de 30: 28, 23, 2, 0, 0 y 2. Búsqueda mediana: 19,1, 17,3, 1,5, 6,5, 9,9 y 8,5 ms." width="1440" height="1703" loading="lazy" decoding="async">
  <figcaption>La tabla anterior dibujada a escala: las bibliotecas buscan más rápido, pero Ragmir ordena mejor las respuestas y no devuelve nada en la mayoría de las preguntas fuera de tema.</figcaption>
</figure>

Las bibliotecas en memoria responden más rápido. Además, devuelven resultados en casi todas las
preguntas fuera de tema, y ninguna sitúa un archivo que responde entre los 3 primeros con tanta
frecuencia.

## Resultados en corpus privados

La página de inicio cita la medición del propio mantenedor en un monorepo privado de Java y
TypeScript. Procede de la [sección de benchmarks del
README](https://github.com/jcode-works/ragmir/blob/main/README.md#benchmarks).

La ejecución usó Ragmir 6.5 el 1 de noviembre de 2026, en el mismo Apple M3 Max con Node.js 24,
LanceDB 0.30 y el perfil de recuperación `quality`. Los corpus son privados, así que no puedes
repetir estas dos filas. El método es el mismo, y `rgr evaluate` lo aplica a tus propios documentos.

| Corpus | Embeddings | Respuesta en los 3 primeros | Respuesta en los 10 primeros | Fuera de tema rechazadas | Dominio cercano rechazadas | Búsqueda mediana |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Monorepo de Java y TypeScript con archivos de Office y escaneos: 2.325 archivos, 30.171 fragmentos, 101 preguntas de desarrolladores | `multilingual-e5-base` | 77 % | 94 % | 22 de 30 | 11 de 30 | 36 ms |
| Documentación de producto en francés e inglés: 299 archivos, 21.011 fragmentos, 60 preguntas | `mxbai-embed-xsmall` | 100 % | 100 % | 23 de 30 | 9 de 30 | 26 ms |

## Cómo reproducirlo

Desde una copia del repositorio de Ragmir en el commit `10bb9f6`, en su raíz:

```bash
pnpm install --frozen-lockfile
pnpm bench:first-pass -- --model-path /path/to/models
pnpm bench:competitors -- --model-path /path/to/models
```

`bench:first-pass` necesita ripgrep (`rg`) en el PATH. Las variantes vectoriales necesitan que
`mxbai-embed-xsmall-v1` ya esté presente en la ruta del modelo. Los benchmarks usan Transformers
solo con un modelo local, y las descargas remotas de modelos siguen desactivadas.

Cada ejecución escribe su informe en `packages/ragmir-core/benchmarks/.results/`. El informe
contiene el commit, la máquina, las versiones de ejecución y todas las métricas.

La [guía de
benchmarks](https://github.com/jcode-works/ragmir/blob/main/packages/ragmir-core/benchmarks/README.md)
describe ambos métodos y los demás bancos de prueba (control de calidad, escala, índice vectorial y
analizadores), junto con las reglas sobre lo que se puede afirmar que aplica cada uno. `pnpm bench:quality` es un control de regresión, no un hallazgo, por eso sus medias no se publican aquí.

## Mide tu propio corpus

Estas cifras describen un único repositorio público, no tus documentos. `rgr evaluate` realiza el
mismo tipo de medición sobre tus archivos.

Un archivo golden enumera preguntas reales con los archivos que las responden. También enumera las
preguntas con `answerable: false`, que no deben devolver nada.

```json
{
  "topK": 5,
  "thresholds": { "recallAt5": 0.8, "maximumFalsePositiveRate": 0.2 },
  "queries": [
    { "id": "approval", "query": "Who signs off a production release?", "expectedPaths": ["docs/releases.md"] },
    { "query": "Which Helm chart deploys the billing API?", "answerable": false, "category": "negative" }
  ]
}
```

```bash
npx rgr evaluate --golden ragmir.golden.json
npx rgr evaluate --golden ragmir.golden.json --baseline before.json
```

El informe muestra Recall@1/3/5/10, Precision@5, MRR@10, nDCG@10, la tasa de citas exactas y la tasa
de falsos positivos en las negativas difíciles.

Un umbral no superado termina con el código 1, así que el mismo comando puede bloquear un trabajo de
CI. `--baseline` muestra el cambio con signo de cada métrica frente a un informe `--json` anterior.

## Límites

- Todo se ejecutó en una sola máquina, un Apple M3 Max.
- Las filas reproducibles usan un único corpus público, el propio repositorio de Ragmir, en inglés y
  solo con archivos de texto. Mide la versión que instales con tus propios documentos.
- El agente del primer paso se detiene en el primer archivo que responde. Un agente real puede leer
  más o menos.
- Las preguntas de dominio cercano siguen siendo el caso más difícil. Con un modelo, 27 de 40
  seguían devolviendo pasajes.
- Los dos corpus privados anteriores se describen, pero no se publican, y se midieron con Ragmir
  6.5.

## Próximos pasos

- [RAG en Claude Code: grep frente a un índice local](/es/claude-code-rag/)
- [Recuperación RAG sin base de datos vectorial](/es/rag-sin-base-vectorial/)
- [Cómo usa Ragmir su propio repositorio](/es/caso-de-estudio/repositorio-ragmir/)
- [Referencia de la CLI, incluido `rgr evaluate`](/docs/cli-reference/)
