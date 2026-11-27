---
title: "RAG frente a MCP: diferencias, tokens y cómo usar ambos | Ragmir"
description: "RAG y MCP no son lo mismo: MCP conecta un agente con herramientas, y la recuperación decide qué texto vuelve. Cómo trabajan juntos y qué determina el uso de tokens."
h1: "RAG frente a MCP: ¿son lo mismo y puedes usar los dos?"
summary: "No. MCP es el protocolo que usa un agente para llamar a herramientas. RAG recupera pasajes de tus fuentes para que un modelo pueda responder a partir de ellos. Trabajan juntos cuando un servidor MCP expone la recuperación, y entonces es la recuperación, no el protocolo, la que decide cuánto texto llega al modelo."
section: guide
setup: agents
translationKey: "rag-vs-mcp"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["mcp-rag-server", "rag-citations", "local-rag", "integrations/claude-code"]
---

RAG y MCP son cosas distintas. MCP es un protocolo, y RAG es un patrón que un servidor MCP puede
servir.

MCP, el Model Context Protocol, define cómo un cliente como Claude Code, Codex o Cursor descubre las
herramientas que expone un servidor, las llama y recibe sus resultados. No decide qué texto devuelve
una herramienta ni cuánto mide ese texto.

RAG, la generación aumentada por recuperación (retrieval-augmented generation), encuentra los
pasajes que responden a una pregunta. Después, un modelo redacta a partir de ellos.

Ragmir es una capa de recuperación a la que puedes acceder con MCP o sin él. Su servidor MCP, la CLI
`rgr`, TypeScript, Python, LangChain y LlamaIndex leen el mismo índice y devuelven las mismas citas.

## ¿Son RAG y MCP lo mismo?

No. Trabajan en capas distintas:

| | MCP | Recuperación (RAG) |
| --- | --- | --- |
| Qué es | Un protocolo entre un cliente y servidores de herramientas | Un índice y un paso de búsqueda sobre tus fuentes |
| Qué decide | Cómo se listan, se llaman y se responden las herramientas | Qué pasajes vuelven, cuántos son y cuánto miden |
| Sin la otra | Las herramientas de MCP no tienen por qué buscar en documentos | Ragmir también se ejecuta desde la CLI, TypeScript y Python |

## ¿Se pueden usar RAG y MCP juntos?

Sí. Un servidor MCP puede exponer la recuperación como herramientas, y el agente decide cuándo
llamarlas.

El servidor de Ragmir se ejecuta por stdio. Aparece en el MCP Registry como
`io.github.jcode-works/ragmir` y expone seis herramientas:

- `ragmir_search`, `ragmir_expand`, `ragmir_sources`, `ragmir_status` y `ragmir_audit` son de solo
  lectura.
- `ragmir_ingest` actualiza el índice y no escribe nada fuera del índice privado de Ragmir.

El agente busca, amplía el único pasaje que necesita y vuelve a buscar cuando hace falta. La sesión
medida más abajo sigue ese patrón: una búsqueda y después una ampliación. El propio modelo del
agente lee la evidencia y redacta la respuesta. Ragmir solo devuelve evidencia.

Instala el plugin para Claude Code, Codex o Cursor, o configura un servidor MCP del proyecto:

```bash
rgr setup --agents claude,codex
```

Registra Ragmir por proyecto, nunca para todos los proyectos.

## Uso de tokens: RAG frente a MCP

El protocolo no decide cuánto devuelve una herramienta. Lo decide el servidor que hay detrás. Una
herramienta que devuelve archivos completos llena el contexto con archivos completos. Ragmir acota
lo que devuelve cada llamada:

- `ragmir_search` empieza con como máximo tres citas compactas por pregunta, cada una un extracto
  que comienza en las líneas que contienen las palabras de la pregunta.
- Cada respuesta se mantiene dentro de `mcpMaxOutputBytes`, 32.768 bytes por defecto, bajo un techo
  absoluto de 1 MiB en el servidor. Una llamada puede pedir menos con `maxBytes`, y
  `_meta["ragmir/output"]` informa de cualquier recorte.
- Hasta cinco preguntas relacionadas comparten un único presupuesto en `queries`, y un pasaje que
  encuentran varias de ellas aparece una sola vez.
- Los pasajes ya devueltos en la sesión vuelven como versiones abreviadas `seen` (cita, ruta e id de
  evidencia), y no cuentan para `topK`.
- El agente amplía solo lo que va a usar: `ragmir_expand` devuelve el texto completo de una cita y
  sus vecinos acotados, o hasta cinco citas dentro de un único presupuesto.
- Cuando ningún pasaje tiene evidencia real, la búsqueda no devuelve nada, así que una pregunta
  fuera de tema cuesta un resultado vacío. Un pasaje débil que sí llega lleva `weakEvidence`.

```json
{ "queries": ["release approval", "rollback owner"], "scope": "docs", "maxBytes": 4096 }
```

| | Agente que lee archivos | Agente que llama a Ragmir |
| --- | --- | --- |
| Ventana de contexto | Archivos completos, que se vuelven a leer en cada sesión nueva | Tres citas compactas por defecto dentro de un presupuesto de 32 KB por llamada; los pasajes ya vistos vuelven como versiones abreviadas de una línea |
| Enviado al modelo | Todo lo que abre el agente | Solo extractos compactos y los pasajes que el agente amplía |

### Una pregunta, medida

El 27 de noviembre de 2026, una sesión de agente contra Ragmir 6.20.0, con las once guías de la
carpeta `docs/` del propio Ragmir indexadas, hizo una pregunta y amplió la primera cita:

```text
ragmir_search({ query: "How do I run Ragmir on a server without internet access?" })
  [1] docs/server-deployment.md:L123-L138#8  Run Ragmir on a server > Without internet access
  [2] docs/docker.md:L96-L105#5              Run Ragmir with Docker > Servers and CI
  [3] docs/python.md:L211-L218#12            Use Ragmir from Python > Without Node.js
ragmir_expand({ citation: "docs/server-deployment.md:L123-L138#8" })
  ## Without internet access
  Build the image where the npm registry is reachable, then move it with `docker save` [...]
```

| Lo que lee el agente | Bytes |
| --- | ---: |
| Respuesta de `ragmir_search`: tres citas compactas | 2.244 |
| Respuesta de `ragmir_expand`: el único pasaje en el que se apoya | 2.295 |
| Total a través de Ragmir | 4.539 |
| Los tres archivos citados leídos enteros | 22.014 |

En 89 preguntas de desarrolladores sobre todo el repositorio de Ragmir, se mantiene el mismo patrón.
El [benchmark de primera pasada](/es/benchmarks/) muestra los bytes que lee un agente con grep y con
Ragmir.

El presupuesto se fija en bytes, no en tokens, y pertenece al servidor MCP. Una aplicación que llama
a la biblioteca directamente recibe hasta los `topK` pasajes que pide. Ella misma ajusta la
evidencia a la ventana de contexto de su modelo.

## Cuándo usar RAG, MCP o ambos

- **Las herramientas propias del agente** suelen bastar en un repositorio de código pequeño. Grep
  sigue siendo la herramienta para listar cada aparición o para buscar con una expresión regular.
- **Recuperación mediante MCP** encaja con un cliente MCP (Claude Code, Codex, Cursor, Gemini CLI,
  Qwen Code o cualquier cliente por stdio). Ayuda cuando el agente necesita respuestas de cientos de
  PDF, archivos de Office o escaneos, o de documentos que usan otras palabras que la pregunta.
- **Recuperación sin MCP** encaja con una aplicación o un pipeline. `createRagmirClient()`, el
  recuperador de LangChain.js y los paquetes de Python leen el mismo índice.
- **Un chat solo remoto** necesita su propio conector o una aplicación que llame a la biblioteca.
  Ragmir no incluye servidor HTTP, y un endpoint de modelo como Ollama no se conecta por sí solo a
  un servidor MCP.

## Próximos pasos

- [Ragmir como servidor MCP de RAG](/es/servidor-mcp-rag/)
- [Integración con Claude Code](/es/integraciones/claude-code/)
- [Guía de integración con agentes](/docs/agent-integration/)
- [Citas en RAG](/es/rag-citas/)
