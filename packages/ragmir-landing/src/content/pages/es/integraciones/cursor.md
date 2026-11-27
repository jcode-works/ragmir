---
title: "RAG MCP para Cursor: búsqueda citada en documentación | Ragmir"
description: "Conecta Cursor al servidor MCP local de Ragmir con la carpeta del plugin o con .cursor/mcp.json, y busca en documentos, PDF y código con citas y filtros de ruta."
h1: "RAG MCP para Cursor: busca en tu documentación con citas"
summary: "El agente de Cursor puede llamar al servidor MCP local de Ragmir para buscar en la documentación, el código, los PDF y los archivos de Office de un proyecto. Instala la carpeta del plugin o añade una sola entrada a .cursor/mcp.json, indexa el proyecto y cada resultado llegará con una cita."
section: integration
setup: agents
translationKey: "integrations/cursor"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["local-vs-cloud-rag", "mcp-rag-server", "integrations/claude-code", "docs/agent-integration"]
logo: "cursor"
group: "agents"
---

Conecta Cursor al servidor MCP de Ragmir, indexa el proyecto una vez y el agente podrá buscar en él
con citas.

El agente busca en un índice local de los archivos que selecciones. Eso incluye PDF, documentos de
Word y presentaciones, dentro de los cuales grep no puede buscar. Cada resultado lleva una cita a su
línea, página, diapositiva o celda de hoja de cálculo. El agente puede ampliarla antes de apoyarse
en el pasaje.

Cursor decide cuándo buscar y qué cita abrir. Ragmir recupera y cita. El índice permanece en la
carpeta `.ragmir/` del proyecto, que Git ignora, en tu máquina.

## Instalar el plugin de Cursor

El repositorio incluye un único plugin, en `plugins/ragmir`, con un manifiesto para Cursor. El
plugin incluye el servidor MCP con las skills de recuperación e indexado. El servidor ejecuta una
versión fijada de Ragmir desde npm.

Hasta que el plugin aparezca en el Marketplace de Cursor, copia la carpeta `plugins/ragmir` del
repositorio en `~/.cursor/plugins/local/ragmir`.

Después, indexa cada proyecto una vez. Usa la skill `ragmir-index` incluida, o ejecuta estos
comandos desde la raíz del proyecto:

```bash
npx --yes @jcode.labs/ragmir@6.20.0 init
npx --yes @jcode.labs/ragmir@6.20.0 sources add "docs/**/*.md" "specs/**/*.pdf" "src/**/*.ts"
npx --yes @jcode.labs/ragmir@6.20.0 ingest
```

## O añade una entrada a .cursor/mcp.json

Con Ragmir instalado en el proyecto, `rgr setup` escribe un ejecutor local dentro de `.ragmir/`:

```bash
pnpm add -D @jcode.labs/ragmir
pnpm exec rgr setup --no-ingest
pnpm exec rgr sources add "docs/**/*.md" "specs/**/*.docx" "src/**/*.ts"
pnpm exec rgr ingest
```

Luego añade esta entrada al archivo `.cursor/mcp.json` del proyecto, sustituyendo
`/absolute/project` por la raíz del proyecto:

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

El ejecutor busca el paquete de Ragmir instalado en el proyecto subiendo desde la carpeta del
proyecto. Necesita Node.js 22.12 o posterior.

Sin Node.js, la [guía de Docker](/docs/docker/) muestra la misma entrada. Usa `docker` como comando
y la imagen oficial `ghcr.io/jcode-works/ragmir`.

## Comprueba la conexión

1. Recarga Cursor y aprueba el servidor si Cursor lo pide.
2. Pide al agente que llame a `ragmir_status`. Te indicará la base, su raíz y si está lista.
3. Haz una pregunta que respondan las fuentes. El agente ejecuta un único `ragmir_search`. Revisa la
   cita que devuelve.

## Úsalo a diario

Pregunta en el chat del agente de Cursor y menciona Ragmir cuando la respuesta deba venir de los
archivos del proyecto. Estas peticiones cubren casi todo el día a día.

### Responde una pregunta con sus fuentes

```prompt
Usa Ragmir: ¿cómo revertimos un despliegue fallido? Cita el archivo y las líneas de cada paso.
```

El agente busca, amplía las citas en las que se apoya y responde con citas como
`docs/release.md:L40-L58`.

### Busca en una carpeta o en un tipo de archivo

```prompt
Busca solo los PDF de specs/ con Ragmir: ¿qué tiempo de respuesta promete el contrato?
```

La carpeta o el glob se convierte en `includePaths`, así que el código y otros documentos no
compiten con el contrato.

### Revisa los documentos antes de un cambio

```prompt
Antes de cambiar la política de reintentos, usa Ragmir para encontrar lo que dicen la documentación y los registros de decisiones sobre los reintentos, y enumera lo que el cambio contradiría.
```

### Lee un documento largo en orden

```prompt
Lee docs/migration.md con Ragmir desde el principio y enumera cada cambio incompatible con su cita.
```

El agente amplía el primer pasaje y sigue `nextCitation` ventana a ventana, en lugar de cargar el
archivo completo de una vez.

### Actualiza tras una edición

```prompt
Actualicé docs/release.md. Actualiza el índice de Ragmir y responde de nuevo.
```

El agente llama a `ragmir_ingest`, que lee solo los archivos nuevos y modificados. El índice
anterior sigue disponible para búsquedas hasta que el nuevo supera la validación.

## Busca en la documentación desde Cursor

Los filtros de ruta evitan que una pregunta sobre documentación se mezcle con el código.
`includePaths` y `excludePaths` admiten carpetas, archivos o globs. `["docs"]` busca en todo lo que
hay bajo `docs/`, y `["**/*.pdf"]` solo en los archivos PDF.

Un ámbito con nombre evita que el agente repita las rutas. Defínelo en `ragmir.config.json`:

```json
{
  "scopes": {
    "docs": { "includePaths": ["docs", "README.md"], "description": "Product documentation" }
  }
}
```

El servidor incluye los nombres y descripciones de los ámbitos en sus instrucciones, así que el
agente de Cursor puede pasar `scope: "docs"`.

En un documento largo, `ragmir_sources` con `outline: true` lista cada encabezado con la cita de su
primer pasaje. `ragmir_expand` sigue `nextCitation` para leer el documento ventana a ventana.

## Límites

- Cursor envía al modelo que usa los fragmentos que lee su agente. El índice queda en local. La
  conversación, no.
- Los plugins necesitan archivos locales, así que funcionan en agentes de programación, no en apps
  de chat web o móviles.
- Ragmir no tiene control de acceso por usuario. Cada estación de trabajo crea su propio índice.
  Comparte las fuentes a través de Git y ejecuta la ingesta en cada máquina:

  ```bash
  rgr ingest
  ```

- `ragmir_ingest` se niega mientras haya configurado OCR local u otro extractor externo. Ejecuta la
  ingesta desde una terminal:

  ```bash
  rgr ingest
  ```

## Próximos pasos

- [Cómo funciona el servidor MCP de Ragmir](/es/servidor-mcp-rag/)
- [Ejecutar Ragmir con Docker](/docs/docker/)
