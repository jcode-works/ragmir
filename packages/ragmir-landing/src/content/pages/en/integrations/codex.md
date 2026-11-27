---
title: "Codex RAG over MCP: local project documentation | Ragmir"
description: "Give OpenAI Codex cited access to your project documentation with the Ragmir plugin or a project MCP server: install, index once, and search with citations."
h1: "How to give Codex access to project documentation"
summary: "Add the Ragmir plugin to OpenAI Codex, or register Ragmir's MCP server in the project's .codex/config.toml, then index the project once. Codex then searches your specifications, ADRs, PDFs, and code through local tools and cites each passage it uses."
section: integration
translationKey: "integrations/codex"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["integrations", "integrations/claude-code", "mcp-rag-server", "docs/agent-integration"]
---

Add the plugin, index the project once, and Codex can search it with citations.

Codex can grep and read a few text files. Grep matches only exact words and cannot search inside
PDF or Office files. Ragmir indexes the files you select, on your machine. Its MCP tools return
passages cited to their line, page, slide, or cell.

Codex decides what to search and which citation to open. It writes with its own model. The index
lives in the project's Git-ignored `.ragmir/` folder. The default retrieval needs no model, GPU, or
API key.

## Install the Codex plugin

```bash
codex plugin marketplace add jcode-works/ragmir
codex plugin add ragmir@ragmir
```

With Codex CLI 0.172.0 on November 27, 2026, the two commands printed (paths shortened):

```text
Added marketplace `ragmir` from https://github.com/jcode-works/ragmir.git.
Installed marketplace root: ~/.codex/.tmp/marketplaces/ragmir
Added plugin `ragmir` from marketplace `ragmir`.
Installed plugin root: ~/.codex/plugins/cache/ragmir/ragmir/1.7.5
```

The plugin bundles the MCP server with the retrieval and indexing skills. The server runs a pinned
Ragmir release from npm and starts in the workspace folder.

Index each project once. Use the bundled `ragmir-index` skill, or run these commands from the
project root:

```bash
npx --yes @jcode.labs/ragmir@6.20.0 init
npx --yes @jcode.labs/ragmir@6.20.0 sources add "docs/**/*.md" "specs/**/*.pdf" "src/**/*.ts"
npx --yes @jcode.labs/ragmir@6.20.0 ingest
```

## Or register a project server

Without the plugin, install Ragmir in the project and let `rgr setup` prepare the Codex helper:

```bash
pnpm add -D @jcode.labs/ragmir
pnpm exec rgr setup --no-ingest --agents codex
pnpm exec rgr sources add "docs/**/*.md" "specs/**/*.docx" "src/**/*.ts"
pnpm exec rgr ingest
```

Setup writes `.ragmir/codex-mcp.toml`, and `.ragmir/agent-setup.md` explains it. Copy the helper
into the project's `.codex/config.toml`. Codex loads it once the project is trusted.

Pick one route per project. Next to the plugin, `rgr setup --agents codex` would register a second
server.

## Keep the server scoped to one project

Avoid `~/.codex/config.toml`. A server registered there answers every workspace from the same
base. Codex in an unrelated project would then read this project's documents as its own.

Codex shares no MCP roots. So the runner records the directory Codex launched the server from and
compares it with the base. An unrelated workspace gets a scope notice with every result. Set
`mcpAllowedRoots` in the configuration to refuse it instead.

`rgr doctor` lists the Ragmir servers registered in Codex. It warns about the ones registered for
every project.

## Ask documentation questions in one call

Documentation questions often come in groups. Codex can send up to five related questions in
`queries`. They share one output budget and can be narrowed to a named scope:

```json
{ "queries": ["release approval", "rollback owner"], "scope": "docs", "maxBytes": 4096 }
```

A passage found by several questions appears once.

When the documents use other words than a question, Codex can send that `query` with `searches`:

- its own keywords (`lex`)
- a paraphrase (`vec`)
- a likely answer (`hyde`)

These are fused with the question into one ranking. They reorder and complete results. They never
turn a refusal into an answer, so an empty result still means the documents hold no evidence.

Codex then reads the citation it relies on with `ragmir_expand`.

## Limits

- Codex sends the excerpts it reads to its model provider. The index stays local. The conversation
  does not.
- Ragmir cannot use Codex's model for its own ranking. Codex models produce no embeddings, and Codex
  does not support MCP sampling.
- Plugins need local files, so they run in coding agents, not in web or mobile chat apps.
- `ragmir_ingest` refuses while local OCR or another external extractor is configured. Run
  `rgr ingest` from a terminal.
- Each workstation owns its index. Share sources through Git, then run `rgr ingest` on each machine.

## Next steps

- [How Ragmir's MCP server works](/mcp-rag-server/)
- [Agent integration guide](/docs/agent-integration/)
- [Configuration and scopes](/docs/configuration/)
