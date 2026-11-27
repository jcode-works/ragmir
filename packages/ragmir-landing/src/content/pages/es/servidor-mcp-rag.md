---
title: "Servidor MCP de RAG: búsqueda local con citas exactas | Ragmir"
description: "Qué es un servidor MCP de RAG, las herramientas y límites del servidor local de Ragmir, cómo lo inician Claude Code, Codex y Cursor, y cinco criterios para compararlos."
h1: "Un servidor MCP de RAG local para tu código y tus documentos"
summary: "Un servidor MCP de RAG da a un agente de IA herramientas de búsqueda sobre un índice de documentos. El servidor de Ragmir se ejecuta en tu máquina mediante stdio e indexa código, Markdown, PDF y archivos de Office. Cada búsqueda devuelve tres citas compactas dentro de un presupuesto de 32 KB, así que el agente solo amplía los pasajes que necesita."
section: guide
setup: agents
translationKey: "mcp-rag-server"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["local-vs-cloud-rag", "integrations", "integrations/claude-code", "docs/agent-integration"]
---

Un servidor MCP de RAG da a un agente herramientas para buscar en un índice. El agente envía una
pregunta y recibe pasajes ordenados por relevancia. Después decide qué leer a continuación.

El servidor de Ragmir responde desde el índice que construye `rgr ingest` en la carpeta `.ragmir/`
del proyecto, ignorada por Git. Se ejecuta como un proceso local mediante stdio, sin puerto HTTP,
cuenta ni almacén alojado. La recuperación predeterminada, `local-hash`, no necesita modelo, GPU ni
clave de API.

También funciona como servidor MCP de documentación para tu propia documentación: las
especificaciones, las decisiones de arquitectura, los runbooks y las descripciones de API se quedan
en el repositorio, y el agente las busca donde están.

El servidor recupera y cita. El agente planifica, razona y redacta con el modelo que hayas elegido.

## Qué expone el servidor

| Herramienta | Úsala para | Efecto |
| --- | --- | --- |
| `ragmir_status` | Comprobar la disponibilidad, la actualidad, los ámbitos y los límites | Solo lectura |
| `ragmir_search` | Encontrar pasajes citados para una pregunta o hasta cinco relacionadas | Solo lectura |
| `ragmir_expand` | Leer una cita con sus vecinos, o recorrer un documento por páginas | Solo lectura |
| `ragmir_sources` | Listar los documentos indexados por carpeta o glob | Solo lectura |
| `ragmir_audit` | Encontrar fuentes que faltan, obsoletas, no compatibles o duplicadas | Solo lectura |
| `ragmir_ingest` | Actualizar el índice cuando cambian los archivos | Solo escribe en el índice privado de Ragmir |

Tres prompts sirven a los clientes que no cargan ninguna skill:

- `answer` pide una cita para cada afirmación y una declaración sencilla cuando los documentos no
  contienen evidencia.
- `compile-source` convierte una fuente en páginas Markdown con citas.
- `audit-knowledge` propone correcciones para lo que encuentra la auditoría del conocimiento.

Dos recursos acotados, `ragmir://context` y `ragmir://sources`, describen la base. Las instrucciones
del servidor y las descripciones de las herramientas nombran la base que sirve.

### Citas compactas y, después, una sola ampliación

Por defecto, la búsqueda devuelve como máximo tres citas compactas por pregunta. Cada una contiene:

- la cita,
- un extracto que empieza en las líneas que contienen las palabras de la pregunta,
- `weakEvidence` cuando el respaldo es escaso,
- `sourceStatus` cuando el archivo citado cambió después de indexarse.

<figure>
  <img src="/guides/inspector-search.webp" alt="MCP Inspector 2.16.0 ejecutando ragmir_search con la pregunta en inglés &quot;How do I run Ragmir on a server without internet access?&quot;. Los resultados muestran docs/server-deployment.md:L1-L8#0 y docs/docker.md:L98-L107#5, cada uno con su ruta de encabezados, su extracto y su rango de líneas." width="1400" height="908" loading="lazy" decoding="async">
  <figcaption>Una llamada a <code>ragmir_search</code> en MCP Inspector 2.16.0, contra Ragmir 6.20.0 sirviendo una carpeta de guías en Markdown y un PDF. La llamada tardó 169 ms.</figcaption>
</figure>

Una llamada se mantiene dentro de `mcpMaxOutputBytes`, 32 KB por defecto. `_meta["ragmir/output"]`
informa de cualquier recorte. Los pasajes ya devueltos en la sesión vuelven como versiones
abreviadas `seen`, así que la siguiente búsqueda gasta su presupuesto en evidencia nueva.

Después, el agente llama a `ragmir_expand` con la única cita en la que se apoyará. La herramienta
devuelve el pasaje indexado con vecinos acotados y un `nextCitation` para leer un documento largo
ventana a ventana.

Cuando la evidencia es débil, la búsqueda no devuelve nada. Entonces el agente puede decir que los
documentos no cubren la pregunta.

## PDF y Markdown en un mismo índice

Las citas siguen el formato de cada archivo, así que un único servidor responde a partir de
Markdown, PDF, archivos de Office y código:

- `docs/runbook.md:L12-L18#3` cita líneas.
- `contracts/msa-acme-2026.pdf:p7#3` cita una página de PDF.
- Otros formatos usan coordenadas de diapositiva, de hoja y celda, de lomo de EPUB o de sección con
  nombre.

Los pasajes de Markdown incluyen su ruta de encabezados, y `ragmir_sources` lista el título y la
descripción del front matter de cada página. Más de 900 extensiones y nombres de archivo se indexan
sin instalar nada más.

Las páginas escaneadas necesitan un motor OCR local que activas con este comando:

```bash
rgr ocr setup
```

`rgr audit --unsupported` lista lo que se omitió.

## Cómo inicia cada cliente el servidor

| Cliente | Configuración |
| --- | --- |
| Claude Code | `/plugin install ragmir --marketplace jcode-works/ragmir` y, después, `/ragmir:index`; o `rgr setup --agents claude` |
| OpenAI Codex | `codex plugin marketplace add jcode-works/ragmir` y, después, `codex plugin add ragmir@ragmir`; o `rgr setup --agents codex` |
| Cursor | La carpeta del plugin `plugins/ragmir`, copiada a `~/.cursor/plugins/local/ragmir` hasta que aparezca en el Cursor Marketplace |
| Gemini CLI | `gemini extensions install https://github.com/jcode-works/ragmir` |
| Qwen Code | `qwen extensions install jcode-works/ragmir:ragmir` |
| Kimi, OpenCode, Cline | `rgr setup --agents kimi,opencode,cline` |

Los plugins y las extensiones ejecutan una versión de Ragmir fijada desde npm contra el proyecto que
el agente tiene abierto. Cualquier otro cliente que admita MCP sobre stdio acepta esta entrada,
adaptada a su formato documentado:

```json
{
  "mcpServers": {
    "ragmir": {
      "command": "node",
      "args": ["/absolute/project/.ragmir/run.cjs", "serve-mcp"],
      "env": { "RAGMIR_PROJECT_ROOT": "/absolute/project" }
    }
  }
}
```

Registra el servidor por proyecto, con un `.mcp.json` incluido en Git o con `.codex/config.toml` de
Codex. Un servidor registrado para todos los proyectos responde a espacios de trabajo no
relacionados desde la misma base. `rgr doctor` avisa de estos registros en Claude Code y Codex, y
`mcpAllowedRoots` rechaza esos espacios de trabajo.

El MCP Registry lista el servidor como `io.github.jcode-works/ragmir`.

## Adónde van los datos

El análisis, el índice y la búsqueda se quedan en la máquina que ejecuta Ragmir, sin telemetría.

Lo que sale de la máquina depende del agente. Un agente de código en la nube envía los extractos que
lee a su proveedor de modelos. Un modelo local los mantiene en la máquina.

Ragmir conserva el texto de origen sin enmascararlo, así que elige las fuentes teniendo esa ruta en
cuenta. Los archivos `.env`, las claves y los certificados nunca llegan al índice. No hay
autenticación ni filtrado por usuario, así que el host que expone el servidor a varias personas se
encarga del control de acceso.

## Cómo elegir el mejor servidor MCP de RAG

Ningún servidor es el mejor para todos los proyectos, pero cinco criterios los distinguen. La última
columna está completa solo para Ragmir 6.20.0, según su documentación, para que puedas hacer a otros
servidores las mismas preguntas.

| Criterio | Qué revisar | Ragmir |
| --- | --- | --- |
| Se ejecuta en local | Si indexar o buscar necesita una cuenta, una clave de API, un índice alojado o una API de embeddings | Un único proceso local por stdio; sin cuenta ni clave de API; `local-hash` no necesita modelo |
| Formatos indexados | Qué archivos analiza, si funcionan los escaneos y si se informa de los archivos omitidos | Más de 900 extensiones y nombres de archivo; OCR local cuando está activado; omitidos listados por `rgr audit --unsupported` |
| Granularidad de las citas | Si un resultado solo nombra un archivo o una línea, página, diapositiva o celda que el agente puede volver a abrir | Líneas, páginas de PDF, diapositivas, rangos de hoja y celda, elementos de lomo de EPUB, objetos exportados |
| Presupuesto de salida | Número de resultados por defecto, límite de tamaño por llamada y si se informa del recorte | Tres citas compactas, 32 KB por llamada (`mcpMaxOutputBytes`), techo de 1 MiB, recorte en `_meta["ragmir/output"]` |
| Licencia | La licencia del servidor y cualquier opción comercial | AGPL-3.0-only; licencia comercial de JCode Works |

Después, haz una pregunta que tus documentos no respondan. Un servidor que no devuelve nada permite
que el agente lo diga, en lugar de responder con el pasaje más cercano. El comando `rgr evaluate` de
Ragmir mide esta tasa con tus propias preguntas de referencia.

## Próximos pasos

- [Añade el plugin a Claude Code](/es/integraciones/claude-code/)
- [Guía de integración con agentes](/docs/agent-integration/)
- [RAG local o en la nube: qué envía cada configuración](/es/rag-local-o-nube/)
- [Formatos compatibles](/docs/supported-formats/)
