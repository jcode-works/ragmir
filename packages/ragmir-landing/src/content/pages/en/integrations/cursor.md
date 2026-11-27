---
title: "Cursor RAG MCP for cited documentation search | Ragmir"
description: "Connect Cursor to Ragmir's local MCP server with the plugin folder or .cursor/mcp.json, then search docs, PDFs, and code with citations and path filters."
h1: "Cursor RAG MCP: search your documentation with citations"
summary: "Cursor's agent can call Ragmir's local MCP server to search a project's documentation, code, PDFs, and Office files. Install the Ragmir plugin folder or add one entry to .cursor/mcp.json, index the project, and every result comes back with a citation."
section: integration
translationKey: "integrations/cursor"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["integrations", "mcp-rag-server", "docs-mcp-server", "docs/agent-integration"]
---

Ragmir gives Cursor's agent a search tool over a local index of the files you select, including
PDFs, Word files, and slide decks that grep cannot search inside. Each result comes back with a
citation to its line, page, slide, or spreadsheet cell, which the agent can expand before relying
on the passage. Cursor decides when to search and which citation to open; Ragmir retrieves and
cites. The index stays in the project's Git-ignored `.ragmir/` folder on your machine.

## Install the Cursor plugin

The repository ships one plugin, in `plugins/ragmir`, with a manifest for Cursor. It bundles the MCP
server with the retrieval and indexing skills and runs a pinned Ragmir release from npm. Until the
plugin is listed in the Cursor Marketplace, copy the repository's `plugins/ragmir` folder to
`~/.cursor/plugins/local/ragmir`. Then index each project once, through the bundled `ragmir-index`
skill or from the project root:

```bash
npx --yes @jcode.labs/ragmir@6.20.0 init
npx --yes @jcode.labs/ragmir@6.20.0 sources add "docs/**/*.md" "specs/**/*.pdf" "src/**/*.ts"
npx --yes @jcode.labs/ragmir@6.20.0 ingest
```

## Or add an entry to .cursor/mcp.json

With Ragmir installed in the project, `rgr setup` writes a local runner under `.ragmir/`:

```bash
pnpm add -D @jcode.labs/ragmir
pnpm exec rgr setup --no-ingest
pnpm exec rgr sources add "docs/**/*.md" "specs/**/*.docx" "src/**/*.ts"
pnpm exec rgr ingest
```

Then add this entry to the project's `.cursor/mcp.json`, with `/absolute/project` replaced by the
project root:

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

The runner resolves the project's installed Ragmir package from the project folder upward and needs
Node.js 22.12 or later. Without Node.js, the [Docker guide](/docs/docker/) gives the same entry with
`docker` as the command and the official `ghcr.io/jcode-works/ragmir` image.

## Check the connection

1. Reload Cursor, and approve the server if Cursor asks.
2. Ask the agent to call `ragmir_status`: it names the base, its root, and whether it is ready.
3. Ask a question the sources answer, so the agent runs one `ragmir_search`, and check the citation
   it returns.

## Search documentation from Cursor

Path filters keep a documentation question out of the code. `includePaths` and `excludePaths` take
folders, files, or globs: `["docs"]` searches everything under `docs/`, and `["**/*.pdf"]` only PDF
files. A named scope saves the agent from repeating paths; define it in `ragmir.config.json`:

```json
{
  "scopes": {
    "docs": { "includePaths": ["docs", "README.md"], "description": "Product documentation" }
  }
}
```

The server lists scope names and descriptions in its instructions, so Cursor's agent can pass
`scope: "docs"`. For a long document, `ragmir_sources` with `outline: true` lists each heading with
the citation of its first passage, and `ragmir_expand` follows `nextCitation` to read the document
window by window.

## Limits

- Cursor sends the excerpts its agent reads to the model it uses. The index stays local; the
  conversation does not.
- Plugins need local files, so they run in coding agents, not in web or mobile chat apps.
- Ragmir has no per-user access control. Each workstation builds its own index: share sources
  through Git, then run `rgr ingest` on each machine.
- `ragmir_ingest` refuses while local OCR or another external extractor is configured; run
  `rgr ingest` from a terminal.

## Next steps

- [How Ragmir's MCP server works](/mcp-rag-server/)
- [Serve your own documentation to agents](/docs-mcp-server/)
- [Run Ragmir with Docker](/docs/docker/)
