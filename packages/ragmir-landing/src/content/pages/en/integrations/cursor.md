---
title: "Cursor RAG MCP for cited documentation search | Ragmir"
description: "Connect Cursor to Ragmir's local MCP server with the plugin folder or .cursor/mcp.json, then search docs, PDFs, and code with citations and path filters."
h1: "Cursor RAG MCP: search your documentation with citations"
summary: "Cursor's agent can call Ragmir's local MCP server to search a project's documentation, code, PDFs, and Office files. Install the Ragmir plugin folder or add one entry to .cursor/mcp.json, index the project, and every result comes back with a citation."
section: integration
setup: agents
translationKey: "integrations/cursor"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["local-vs-cloud-rag", "mcp-rag-server", "integrations/claude-code", "docs/agent-integration"]
logo: "cursor"
group: "agents"
---

Connect Cursor to Ragmir's MCP server, index the project once, and the agent can search it with
citations.

The agent searches a local index of the files you select. That includes PDFs, Word files, and slide
decks, which grep cannot search inside. Each result carries a citation to its line, page, slide, or
spreadsheet cell. The agent can expand it before relying on the passage.

Cursor decides when to search and which citation to open. Ragmir retrieves and cites. The index
stays in the project's Git-ignored `.ragmir/` folder on your machine.

## Install the Cursor plugin

The repository ships one plugin, in `plugins/ragmir`, with a manifest for Cursor. It bundles the MCP
server with the retrieval and indexing skills. The server runs a pinned Ragmir release from npm.

Until the plugin is listed in the Cursor Marketplace, copy the repository's `plugins/ragmir` folder
to `~/.cursor/plugins/local/ragmir`.

Then index each project once. Use the bundled `ragmir-index` skill, or run these commands from the
project root:

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

The runner finds the project's installed Ragmir package by looking from the project folder upward.
It needs Node.js 22.12 or later.

Without Node.js, the [Docker guide](/docs/docker/) gives the same entry. It uses `docker` as the
command and the official `ghcr.io/jcode-works/ragmir` image.

## Check the connection

1. Reload Cursor, and approve the server if Cursor asks.
2. Ask the agent to call `ragmir_status`. It names the base, its root, and whether it is ready.
3. Ask a question the sources answer. The agent runs one `ragmir_search`. Check the citation it
   returns.

## Use it day to day

Ask in Cursor's agent chat, and name Ragmir when the answer must come from the project's files.
These requests cover most days.

### Answer a question with its sources

```prompt
Use Ragmir: how do we roll back a failed release? Cite the file and lines behind each step.
```

The agent searches, expands the citations it relies on, and answers with citations such as
`docs/release.md:L40-L58`.

### Search one folder or one file type

```prompt
Search only the PDFs under specs/ with Ragmir: what response time does the contract promise?
```

The folder or glob becomes `includePaths`, so code and other documents do not compete with the
contract.

### Check the documents before a change

```prompt
Before you change the retry policy, use Ragmir to find what the docs and decision records say about retries, and list what the change would contradict.
```

### Read a long document in order

```prompt
Read docs/migration.md through Ragmir from the start and list every breaking change with its citation.
```

The agent expands the first passage and follows `nextCitation` window by window, instead of
loading the whole file at once.

### Refresh after an edit

```prompt
I updated docs/release.md. Refresh the Ragmir index, then answer again.
```

The agent calls `ragmir_ingest`, which reads only new and changed files. The previous index stays
searchable until the new one passes validation.

## Search documentation from Cursor

Path filters keep a documentation question out of the code. `includePaths` and `excludePaths` take
folders, files, or globs. `["docs"]` searches everything under `docs/`, and `["**/*.pdf"]` only PDF
files.

A named scope saves the agent from repeating paths. Define it in `ragmir.config.json`:

```json
{
  "scopes": {
    "docs": { "includePaths": ["docs", "README.md"], "description": "Product documentation" }
  }
}
```

The server lists scope names and descriptions in its instructions, so Cursor's agent can pass
`scope: "docs"`.

For a long document, `ragmir_sources` with `outline: true` lists each heading with the citation of
its first passage. `ragmir_expand` follows `nextCitation` to read the document window by window.

## Limits

- Cursor sends the excerpts its agent reads to the model it uses. The index stays local. The
  conversation does not.
- Plugins need local files, so they run in coding agents, not in web or mobile chat apps.
- Ragmir has no per-user access control. Each workstation builds its own index. Share sources
  through Git, then run the ingest on each machine:

  ```bash
  rgr ingest
  ```
- `ragmir_ingest` refuses while local OCR or another external extractor is configured. Run the
  ingest from a terminal:

  ```bash
  rgr ingest
  ```

## Next steps

- [How Ragmir's MCP server works](/mcp-rag-server/)
- [Run Ragmir with Docker](/docs/docker/)
