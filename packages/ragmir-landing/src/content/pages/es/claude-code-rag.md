---
title: "RAG en Claude Code: grep o un índice local, medidos | Ragmir"
description: "¿Usa RAG Claude Code? Busca con grep y lee archivos. Medimos esa primera pasada frente al servidor MCP de Ragmir con 89 preguntas y después mostramos cómo añadir RAG."
h1: "¿Usa Claude Code RAG? Grep frente a un índice local"
summary: "Claude Code no mantiene un índice de tu código. Carga CLAUDE.md y después busca con grep y find, y lee archivos según avanza. En 89 preguntas sobre el repositorio de Ragmir, una primera pasada con grep ordenó los archivos que responden casi tan bien como el servidor MCP de Ragmir. El agente leyó una mediana de 71 KiB hasta llegar a uno, frente a menos de 5 KiB con Ragmir."
section: guide
setup: agents
translationKey: "claude-code-rag"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["integrations/claude-code", "rag-vs-mcp", "benchmarks", "agentic-rag"]
---

Claude Code encuentra contexto como lo haría un desarrollador en la terminal. Lista archivos, busca
palabras con grep y abre lo que parece relevante. Funciona bien con código cuyos identificadores
coinciden con la pregunta.

RAG añade una lista corta, ordenada y citada antes de abrir nada. Esta página mide ambas primeras
pasadas con las mismas preguntas y muestra cómo añadir Ragmir cuando esa lista compensa.

## ¿Usa RAG Claude Code?

Por defecto, no. Anthropic describe Claude Code como un enfoque híbrido. Los archivos `CLAUDE.md` se
cargan «de forma ingenua en el contexto desde el principio», y las primitivas «como glob y grep le
permiten navegar por su entorno y recuperar archivos justo a tiempo, evitando en la práctica los
problemas de los índices desactualizados y de los árboles sintácticos complejos» ([Effective context
engineering for AI
agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents),
Anthropic, 29 de septiembre de 2025).

La [referencia de herramientas](https://code.claude.com/docs/en/tools-reference) actual añade dos
detalles. En macOS, Linux y WSL, Claude busca con `find` y `grep` a través de la herramienta Bash.
En Windows se mantienen las herramientas Glob y Grep. Grep se basa en ripgrep. No se construye ni se
consulta ningún índice de embeddings.

Este diseño tiene ventajas reales. Nada queda desactualizado, los identificadores exactos se
encuentran siempre y no hay nada que instalar. Sus costes aparecen en otro lugar: en cuánto lee el
agente y en lo que ocurre cuando la respuesta no está en el repositorio.

## RAG de Claude Code frente a grep, medido

Planteamos las 89 preguntas de desarrolladores del conjunto público de preguntas de Ragmir. Cada
pregunta enumera todos los archivos que la responden. Las ejecutamos sobre los mismos 287 archivos
versionados del repositorio de Ragmir. Añadimos 30 preguntas fuera de tema y 40 de dominio cercano
que el repositorio no responde.

El lado de grep busca con grep cada palabra de la pregunta de tres caracteres o más, sin las
palabras comunes del inglés. Ordena los archivos según cuántas de esas palabras contienen. Los abre
completos en ese orden hasta que uno responde.

El lado de Ragmir ejecuta su servidor MCP. Hace la búsqueda predeterminada, una segunda búsqueda con
diez resultados cuando hace falta y, después, una ampliación de la cita que responde. Los bytes
cuentan el texto que lee el modelo.

| Primer paso | Respuesta en los 3 primeros | Respuesta en los 10 primeros | Mediana de bytes leídos hasta llegar | Fuera de tema rechazadas | Dominio cercano rechazadas |
| --- | ---: | ---: | ---: | ---: | ---: |
| ripgrep, palabras de la pregunta, archivos leídos completos | 85 % | 100 % | 71,4 KiB | 2 de 30 | 0 de 40 |
| Ragmir MCP, `local-hash`, sin modelo | 82 % | 99 % | 4,7 KiB | 23 de 30 | 7 de 40 |
| Ragmir MCP, híbrido con `mxbai-embed-xsmall-v1` | 87 % | 100 % | 4,8 KiB | 28 de 30 | 13 de 40 |

Medido el 27 de noviembre de 2026 en el commit `10bb9f6` con el código de Ragmir 6.20.0, ripgrep
15.2.0, Node.js 22 y un Apple M3 Max. El comando es `pnpm bench:first-pass`. El método está en el
[README de
benchmarks](https://github.com/jcode-works/ragmir/blob/main/packages/ragmir-core/benchmarks/README.md),
y el informe completo, en [first-pass-2026-11-27.json](/benchmarks/first-pass-2026-11-27.json).

<figure>
  <img src="/guides/first-pass-chart.webp" alt="Gráficos de barras que comparan la primera pasada de grep con el servidor MCP de Ragmir en 89 preguntas de desarrolladores. Respuesta en los 3 primeros: grep 85 %, Ragmir local-hash 82 %, Ragmir híbrido 87 %. Mediana de texto leído hasta la respuesta: grep 71,4 KiB, Ragmir 4,7 y 4,8 KiB. Preguntas fuera de tema rechazadas de 30: grep 2, Ragmir 23 y 28." width="1440" height="1163" loading="lazy" decoding="async">
  <figcaption>La misma tabla en forma de gráfico: el ranking está muy igualado, pero el texto leído y los rechazos no.</figcaption>
</figure>

Lo que dicen las cifras:

- **El ranking está muy igualado.** En un repositorio cuyas preguntas comparten palabras con sus
  archivos, grep coloca un archivo que responde entre los 10 primeros en todos los casos. Aquí no
  hace falta un índice de recuperación para encontrar el archivo correcto.
- **El coste de contexto sí es muy distinto.** Llegar a la respuesta costó una mediana de 71,4 KiB
  entre resultados de grep y archivos completos. Eso equivale a unas quince veces los 4,7 a 4,8 KiB
  de citas compactas y un pasaje ampliado. En una tarea larga, la diferencia es la ventana de
  contexto que el agente conserva para el trabajo en sí.
- **Grep casi nunca dice «aquí no está».** En 28 de las 30 preguntas fuera de tema, grep seguía
  encontrando coincidencias en algunos archivos, así que el agente los leería antes de concluir.
  Ragmir no devolvió nada en entre 23 y 28 de las 30.

La medición tiene límites. Cubre un único repositorio, preguntas en inglés y solo archivos de texto.
Además, supone un agente que se detiene en el primer archivo que responde.

Grep no puede buscar dentro de PDF ni de archivos de Office, cuyo texto está comprimido o almacenado
en un formato binario. Ragmir extrae el texto de ellos y cita la página, la diapositiva o la celda.

Ejecuta `rgr evaluate` con tus propias preguntas antes de fiarte de cualquier cifra de tu proyecto.

## Búsqueda agéntica frente a RAG

No son excluyentes. Con Ragmir conectado, Claude Code sigue decidiendo qué buscar. Llama a
`ragmir_search` como a cualquier otra herramienta y amplía la única cita en la que va a basarse.
Conserva grep para lo que mejor hace: listar todas las apariciones de un identificador o encontrar
coincidencias con una expresión regular.

La recuperación solo cambia el primer paso. En lugar de abrir archivos y leerlos, el agente lee una
lista corta, ordenada y citada, y después abre un único pasaje. Consulta [RAG frente a
MCP](/es/rag-vs-mcp/) para ver cómo encajan el protocolo y la recuperación, y [RAG
agéntico](/es/rag-agentico/) para el bucle.

## Cuándo basta Claude y cuándo añadir RAG

Claude puede llegar a tus documentos de tres formas. Cada una se adapta a trabajos distintos.

| | Claude Code solo | Un proyecto en las apps de Claude | Claude Code o un chat con Ragmir |
| --- | --- | --- | --- |
| Dónde están los documentos | Tu repositorio, en tu equipo | Subidos a Anthropic | En tu equipo; solo salen los pasajes que lee Claude |
| Cómo se encuentra el texto | grep, y después archivos completos | Archivos completos, o una búsqueda en el conocimiento del proyecto cuando superan la ventana de contexto | Un índice local devuelve pasajes ordenados y citados |
| PDF y archivos de Office | grep no puede buscar dentro de ellos | Se suben como cualquier otro archivo | Se buscan como texto y se citan por página, diapositiva o celda |
| Texto leído por respuesta en este repositorio | Una mediana de 71,4 KiB | No medido | Una mediana de 4,7 a 4,8 KiB |
| Preguntas que los documentos no responden | grep seguía encontrando archivos en 28 de 30 | No medido | Sin resultados en 23 a 28 de 30 |

La columna de las apps de Claude procede del centro de ayuda de Anthropic, consultado el 27 de
noviembre de 2026: en los planes de pago, un proyecto pasa a la recuperación automáticamente cuando
su conocimiento se acerca a la ventana de contexto, y admite hasta diez veces más contenido ([RAG
para
proyectos](https://support.claude.com/en/articles/11473015-retrieval-augmented-generation-rag-for-projects)).

**Usa Claude Code solo** para un repositorio de código con archivos de texto cuyas preguntas usen
las palabras del propio código, y siempre que necesites todas las apariciones de un identificador.
No necesita instalar nada.

**Usa un proyecto en las apps de Claude** para conversar sobre documentos que puedes subir a
Anthropic, con un plan de pago, sin configurar nada.

**Añade Ragmir** cuando los documentos sean PDF, archivos de Office o escaneos, cuando deban
quedarse en tu equipo, cuando necesites una cita que puedas comprobar hasta la línea o la página, o
cuando varios agentes y aplicaciones deban compartir un mismo índice. Con un modelo local en lugar
de Claude, no sale nada del equipo: consulta [RAG local o en la nube](/es/rag-local-o-nube/).

## Cómo añadir RAG a Claude Code

Instala el plugin y después indexa cada proyecto una vez:

```text
/plugin install ragmir --marketplace jcode-works/ragmir
/ragmir:index docs/**/*.md specs/**/*.pdf src/**/*.ts
```

Desde una terminal, estos dos comandos hacen la misma instalación:

```bash
claude plugin marketplace add jcode-works/ragmir
claude plugin install ragmir@ragmir
```

Con Claude Code 2.1.329 mostraron `✔ Successfully installed plugin: ragmir@ragmir (scope: user)`.

El plugin ejecuta una versión fijada de Ragmir desde npm sobre el proyecto abierto, sin cuenta ni
clave de API. La [página de integración con Claude Code](/es/integraciones/claude-code/) explica la
configuración sin el plugin, cómo mantener el índice actualizado y los límites.

## Codex y Cursor

El mismo índice sirve a otros agentes de código. Codex instala el plugin con:

```bash
codex plugin marketplace add jcode-works/ragmir
codex plugin add ragmir@ragmir
```

Cursor usa la carpeta del plugin hasta que aparezca en su marketplace.

Ambos ejecutan el mismo servidor MCP, así que las cifras anteriores también valen para su primera
pasada. Consulta las páginas de [Codex](/es/integraciones/codex/) y
[Cursor](/es/integraciones/cursor/).

## Próximos pasos

- [Añade el plugin a Claude Code](/es/integraciones/claude-code/)
- [Todos los benchmarks y cómo repetirlos](/es/benchmarks/)
- [RAG frente a MCP: protocolo y recuperación](/es/rag-vs-mcp/)
- [Guía de integración de agentes](/docs/agent-integration/)
