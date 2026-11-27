---
title: "RAG para Codex con MCP: documentación local del proyecto | Ragmir"
description: "Da a OpenAI Codex acceso citado a la documentación del proyecto con el plugin de Ragmir o un servidor MCP propio: instala, indexa una vez y busca con citas."
h1: "Cómo dar a Codex acceso a la documentación del proyecto"
summary: "Añade el plugin de Ragmir a OpenAI Codex, o registra el servidor MCP de Ragmir en el archivo .codex/config.toml del proyecto, y luego indexa el proyecto una vez. Codex buscará en tus especificaciones, ADR, PDF y código con herramientas locales, y citará cada pasaje que use."
section: integration
setup: agents
translationKey: "integrations/codex"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["local-vs-cloud-rag", "integrations/claude-code", "mcp-rag-server", "docs/agent-integration"]
logo: "terminal"
group: "agents"
---

Añade el plugin, indexa el proyecto una vez y Codex podrá buscar en él con citas.

Codex puede hacer grep y leer unos pocos archivos de texto. Grep solo encuentra palabras exactas y
no puede buscar dentro de archivos PDF u Office. Ragmir indexa los archivos que selecciones, en tu
máquina. Sus herramientas MCP devuelven pasajes citados a su línea, página, diapositiva o celda.

Codex decide qué buscar y qué cita abrir. Escribe con su propio modelo. El índice vive en la carpeta
`.ragmir/` del proyecto, que Git ignora. La recuperación predeterminada no necesita modelo, GPU ni
clave de API.

## Instalar el plugin de Codex

```bash
codex plugin marketplace add jcode-works/ragmir
codex plugin add ragmir@ragmir
```

Con Codex CLI 0.172.0, el 27 de noviembre de 2026, los dos comandos imprimieron (rutas acortadas):

```text
Added marketplace `ragmir` from https://github.com/jcode-works/ragmir.git.
Installed marketplace root: ~/.codex/.tmp/marketplaces/ragmir
Added plugin `ragmir` from marketplace `ragmir`.
Installed plugin root: ~/.codex/plugins/cache/ragmir/ragmir/1.7.5
```

El plugin incluye el servidor MCP con las skills de recuperación e indexado. El servidor ejecuta una
versión fijada de Ragmir desde npm y arranca en la carpeta del espacio de trabajo.

Indexa cada proyecto una vez. Usa la skill `ragmir-index` incluida, o ejecuta estos comandos desde
la raíz del proyecto:

```bash
npx --yes @jcode.labs/ragmir@6.20.0 init
npx --yes @jcode.labs/ragmir@6.20.0 sources add "docs/**/*.md" "specs/**/*.pdf" "src/**/*.ts"
npx --yes @jcode.labs/ragmir@6.20.0 ingest
```

## O registra un servidor del proyecto

Sin el plugin, instala Ragmir en el proyecto y deja que `rgr setup` prepare el asistente de Codex:

```bash
pnpm add -D @jcode.labs/ragmir
pnpm exec rgr setup --no-ingest --agents codex
pnpm exec rgr sources add "docs/**/*.md" "specs/**/*.docx" "src/**/*.ts"
pnpm exec rgr ingest
```

`rgr setup` escribe `.ragmir/codex-mcp.toml`, y `.ragmir/agent-setup.md` lo explica. Copia el
asistente en el archivo `.codex/config.toml` del proyecto. Codex lo carga cuando el proyecto es de
confianza.

Elige una sola ruta por proyecto. Junto al plugin, `rgr setup --agents codex` registraría un segundo
servidor.

## Mantén el servidor limitado a un proyecto

Evita `~/.codex/config.toml`. Un servidor registrado allí responde a todos los espacios de trabajo
desde la misma base. Codex en un proyecto sin relación leería los documentos de este proyecto como
propios.

Codex no comparte raíces MCP. Por eso, el ejecutor registra el directorio desde el que Codex lanzó
el servidor y lo compara con la base. Un espacio de trabajo sin relación recibe un aviso de ámbito
con cada resultado. Define `mcpAllowedRoots` en la configuración para rechazarlo en su lugar.

`rgr doctor` lista los servidores de Ragmir registrados en Codex. Avisa de los que están registrados
para todos los proyectos.

## Haz preguntas sobre la documentación en una sola llamada

Las preguntas sobre documentación suelen llegar en grupo. Codex puede enviar hasta cinco preguntas
relacionadas en `queries`. Comparten un mismo presupuesto de salida y pueden acotarse a un ámbito
con nombre:

```json
{ "queries": ["release approval", "rollback owner"], "scope": "docs", "maxBytes": 4096 }
```

Un pasaje encontrado por varias preguntas aparece una sola vez.

Cuando los documentos usan otras palabras que la pregunta, Codex puede enviar esa `query` junto con
`searches`:

- sus propias palabras clave (`lex`)
- una paráfrasis (`vec`)
- una respuesta probable (`hyde`)

Estas formulaciones se fusionan con la pregunta en un único ranking. Reordenan y completan los
resultados. Nunca convierten una negativa en respuesta, así que un resultado vacío sigue
significando que los documentos no tienen evidencia.

Codex lee después la cita en la que se apoya con `ragmir_expand`.

## Límites

- Codex envía a su proveedor de modelos los fragmentos que lee. El índice queda en local. La
  conversación, no.
- Ragmir no puede usar el modelo de Codex para su propio ranking. Los modelos de Codex no generan
  embeddings, y Codex no admite MCP sampling.
- Los plugins necesitan archivos locales, así que funcionan en agentes de programación, no en apps
  de chat web o móviles.
- `ragmir_ingest` se niega mientras haya configurado OCR local u otro extractor externo. Ejecuta la
  ingesta desde una terminal:

  ```bash
  rgr ingest
  ```

- Cada estación de trabajo tiene su propio índice. Comparte las fuentes a través de Git y ejecuta la
  ingesta en cada máquina:

  ```bash
  rgr ingest
  ```

## Próximos pasos

- [Cómo funciona el servidor MCP de Ragmir](/es/servidor-mcp-rag/)
- [Guía de integración con agentes](/docs/agent-integration/)
- [Configuración y ámbitos](/docs/configuration/)
