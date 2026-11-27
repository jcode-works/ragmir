---
title: "RAG agéntico: qué es y cuándo conviene usarlo | Ragmir"
description: "Qué es el RAG agéntico: el agente decide cuándo buscar, reformula consultas, amplía citas y se detiene con evidencia débil. Con el bucle y un ejemplo local."
h1: "¿Qué es el RAG agéntico y cuándo conviene usarlo?"
summary: "El RAG agéntico pone la recuperación bajo el control del agente. Decide cuándo buscar, reformula la pregunta, abre los pasajes citados que necesita y se detiene cuando la evidencia es débil. Ragmir aporta el lado de recuperación. El agente y su modelo se encargan del razonamiento, la respuesta y cualquier acción."
section: guide
setup: agents
translationKey: "agentic-rag"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["rag-without-vector-database", "case-studies/ragmir-repository", "benchmarks", "mcp-rag-server"]
---

En el RAG agéntico, la recuperación es una herramienta que el agente invoca cuando necesita evidencia.

En el RAG clásico (generación aumentada por recuperación), una aplicación toma la pregunta del usuario, recupera los pasajes una sola vez y se los entrega a un modelo. En el RAG agéntico, el agente busca cuando lo necesita. Cambia la redacción entre llamadas y lee un pasaje completo antes de decidir qué buscar después. También puede concluir que los documentos no cubren la pregunta.

Ragmir está diseñado para ese patrón. Devuelve citas compactas, amplía las que el agente selecciona, no devuelve nada cuando ningún pasaje tiene evidencia real y marca un pasaje débil con `weakEvidence`. No ejecuta el bucle del agente ni redacta la respuesta.

## RAG agéntico frente a RAG clásico

| | RAG clásico | RAG agéntico |
| --- | --- | --- |
| Cuándo se recupera | Una vez, antes de generar | Cada vez que el agente decide que necesita evidencia |
| Qué se busca | La pregunta tal como está escrita | La pregunta, las reformulaciones del agente y sus preguntas de seguimiento |
| Qué lee el modelo | Los pasajes devueltos | Los pasajes que el agente amplía, o un documento leído ventana a ventana |
| Sin buena evidencia | El paso único responde o declina | El agente reformula una vez, busca en otra parte o informa del hueco |
| Interfaz de Ragmir | `RagmirRetriever` o `search()` | Herramientas MCP, o `createRagmirTools` y `RagmirToolkit` para agentes de LangChain |

## El bucle del agente

<figure>
  <img src="/diagrams/agentic-rag-loop-es.svg" alt="El bucle del RAG agéntico: el agente decide si necesita evidencia, llama a ragmir_search, informa de un hueco cuando el resultado está vacío, amplía la cita seleccionada con ragmir_expand y vuelve a buscar hasta que la evidencia basta para responder o actuar." width="800" height="560" loading="lazy" decoding="async">
</figure>

El bucle que describe la documentación de Ragmir tiene cinco pasos:

1. El agente lee una sola vez la identidad, los ámbitos y la actualidad de la base, desde `ragmir://context` o `ragmir_status`.
2. Llama a `ragmir_search` con una consulta concreta, o envía hasta cinco preguntas relacionadas en `queries`.
3. Amplía con `ragmir_expand` la cita en la que se apoyará la respuesta.
4. Cuando la evidencia es incompleta, reformula con `searches`. También puede acotar la búsqueda a carpetas o a un ámbito con nombre, o listar los documentos con `ragmir_sources`.
5. Responde citando cada afirmación, señala los huecos y verifica las citas antes de actuar.

## Cómo implementa Ragmir la parte de recuperación

- **Varias formulaciones en una sola búsqueda.** `searches` añade hasta cinco formulaciones de la misma necesidad, fusionadas con la pregunta en un único ranking. Una formulación `lex` contiene palabras clave (una `"frase"` es obligatoria y un `-palabra` se excluye). Una formulación `vec` es una paráfrasis. Una formulación `hyde` es un pasaje redactado como podría leerse la respuesta. Cada una pesa la mitad que las listas propias de la pregunta, y un pasaje `hyde` pesa un cuarto. Solo la pregunta decide si hay respuesta, así que las formulaciones nunca convierten una negativa en una respuesta.
- **Un contexto acotado.** La búsqueda devuelve tres citas compactas por defecto, dentro de un presupuesto de salida de 32 KB por llamada. Los pasajes que ya se devolvieron en la sesión llegan como breves stubs `seen`, de modo que una segunda búsqueda gasta su presupuesto en evidencia nueva.
- **Ampliación bajo demanda.** `ragmir_expand` devuelve una cita con sus vecinos, hasta cinco citas a la vez, y un `nextCitation` para leer un documento largo de principio a fin.
- **Señales que el agente puede usar.** Un resultado vacío significa que la base no tiene evidencia para la pregunta. `weakEvidence` marca un respaldo débil, `sourceStatus` marca un archivo modificado desde la indexación (`ragmir_ingest` actualiza el índice) y un aviso nombra las palabras de la pregunta que ningún pasaje indexado contiene.
- **Preguntas fuera de tema.** En el repositorio de Ragmir, entre 23 y 28 de cada 30 preguntas fuera de tema no devolvieron nada el 27 de noviembre de 2026 ([benchmarks](/es/benchmarks/)).

Una búsqueda con formulaciones, tal como la envía el agente:

```json
{
  "query": "How are API requests throttled?",
  "searches": [
    { "type": "lex", "query": "\"rate limit\" quota -deprecated" },
    { "type": "vec", "query": "limits on how many calls a client may send" },
    { "type": "hyde", "query": "Each API key may send 600 requests per minute." }
  ],
  "intent": "gateway configuration"
}
```

## Cuándo usar RAG agéntico y cuándo basta el RAG clásico

El RAG clásico basta cuando una sola búsqueda con las palabras del usuario encuentra el pasaje. Entonces la aplicación solo tiene que responder o rechazar.

El asistente de contratos de la documentación de Ragmir es ese caso: `RagmirRetriever` devuelve la cláusula que responde, con su cita de página, o ningún documento cuando los contratos callan, así que la aplicación lo dice en lugar de adivinar. El ejemplo de modelo local de la documentación también es una sola pasada de recuperación, no un agente autónomo.

El RAG agéntico encaja en tareas en las que un solo pasaje no basta para responder:

- implementar una funcionalidad a partir de una especificación y luego buscar de nuevo sus excepciones;
- diagnosticar un incidente a partir de un runbook, un informe de incidente y el código de reintentos;
- leer un PDF largo o una especificación ventana a ventana;
- preguntas formuladas de forma distinta a los documentos, cuando las palabras clave, la paráfrasis o la respuesta probable del agente llegan a pasajes que las palabras de la pregunta no alcanzan.

En un repositorio de código pequeño, la búsqueda propia de un agente de programación suele bastar. grep sigue siendo la herramienta para listar cada aparición o buscar una expresión regular.

## Ejecutarlo en local

Indexa un proyecto y consúltalo desde la shell. El mismo índice sirve a los agentes que conecta `rgr setup`:

```bash
npm install -D @jcode.labs/ragmir@6.20.0
npx rgr setup --no-ingest --agents claude,codex
npx rgr sources add "docs/**/*.md" "specs/**/*.docx" "src/**/*.ts"
npx rgr ingest
npx rgr search "authentication contract" --compact
```

Desde la CLI, `--lex`, `--vec` y `--hyde` añaden formulaciones, y `--explain` lista las formulaciones que encontraron cada resultado.

Aquí tienes un turno del bucle. Se registró el 27 de noviembre de 2026 con Ragmir 6.20.0 y las once guías de la carpeta `docs/` de Ragmir indexadas:

```text
ragmir_search({ query: "How do I run Ragmir on a server without internet access?" })
  [1] docs/server-deployment.md:L123-L138#8  Run Ragmir on a server > Without internet access
  [2] docs/docker.md:L96-L105#5              Run Ragmir with Docker > Servers and CI
  [3] docs/python.md:L211-L218#12            Use Ragmir from Python > Without Node.js
ragmir_expand({ citation: "docs/server-deployment.md:L123-L138#8" })
  ## Without internet access
  Build the image where the npm registry is reachable, then move it with `docker save` and
  `docker load`, or install from your internal npm mirror. At runtime, `local-hash` makes no
  network call [...]
```

Las salidas se muestran tal como se imprimieron, en inglés.

El agente leyó 4 539 bytes de respuestas para llegar al pasaje y a su rango de líneas, mientras que abrir enteros los tres archivos citados habría costado 22 014 bytes.

Para una aplicación, `createRagmirTools` desde `@jcode.labs/ragmir/langchain` ofrece a un agente de LangChain.js las mismas herramientas `ragmir_search` y `ragmir_expand`. `RagmirToolkit` hace lo mismo en Python. La [integración con LangChain](/es/integraciones/langchain/) muestra ambas.

## Límites

- Ragmir no incluye un modelo, no ejecuta un agente ni abre un puerto HTTP. La planificación, la generación y las acciones quedan en el agente o en la aplicación.
- Los pasajes van adonde se ejecute el modelo del agente: con un agente respaldado por la nube, los extractos seleccionados llegan a su proveedor.
- Un host expuesto a la red se encarga de la autenticación, la autorización por usuario, la seguridad del transporte y los límites de tasa; Ragmir no filtra los resultados por usuario.
- El texto recuperado es evidencia que el agente debe sopesar, nunca instrucciones que deba seguir.

## Próximos pasos

- [RAG sin base de datos vectorial](/es/rag-sin-base-vectorial/)
- [Servidor MCP de Ragmir para agentes](/es/servidor-mcp-rag/)
- [Guía de integración de agentes](/docs/agent-integration/)
- [Cómo usa el repositorio de Ragmir su propio Ragmir](/es/caso-de-estudio/repositorio-ragmir/)
