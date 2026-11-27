---
title: "RAG MCP server: local search with exact citations | Ragmir"
description: "What a RAG MCP server is, the tools and limits of Ragmir's local server, how each coding agent starts it, and five criteria to compare servers."
h1: "A local RAG MCP server for your code and documents"
summary: "A RAG MCP server gives an AI agent search tools over an index of documents. Ragmir's server runs on your machine over stdio and indexes code, Markdown, PDFs, and Office files. Each search returns three compact citations within a 32 KB budget, so the agent expands only the passages it needs."
section: guide
translationKey: "mcp-rag-server"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["docs-mcp-server", "integrations", "integrations/claude-code", "docs/agent-integration"]
---

A RAG MCP server gives an agent tools to search an index. The agent sends a question and gets ranked
passages back. It then decides what to read next.

Ragmir's server answers from the index that `rgr ingest` builds in the project's Git-ignored
`.ragmir/` folder. It runs as a local process over stdio, with no HTTP port, account, or hosted
store. The default `local-hash` retrieval needs no model, GPU, or API key.

The server retrieves and cites. The agent plans, reasons, and writes with the model you chose.

## What the server exposes

| Tool | Use it to | Effect |
| --- | --- | --- |
| `ragmir_status` | Check readiness, freshness, scopes, and limits | Read-only |
| `ragmir_search` | Find cited passages for one question or up to five related ones | Read-only |
| `ragmir_expand` | Read one citation with its neighbours, or page through a document | Read-only |
| `ragmir_sources` | List the indexed documents by folder or glob | Read-only |
| `ragmir_audit` | Find missing, stale, unsupported, or duplicated sources | Read-only |
| `ragmir_ingest` | Refresh the index after files change | Writes Ragmir's private index only |

Three prompts serve clients that load no skills:

- `answer` asks for a citation on every claim and a plain statement when the documents hold no
  evidence.
- `compile-source` turns one source into cited Markdown pages.
- `audit-knowledge` proposes fixes for what the knowledge audit finds.

Two bounded resources, `ragmir://context` and `ragmir://sources`, describe the base. The server's
instructions and tool descriptions name the base it serves.

### Compact citations, then one expansion

Search returns at most three compact citations per question by default. Each one holds:

- the citation,
- an excerpt that starts at the lines holding the question's words,
- `weakEvidence` when support is thin,
- `sourceStatus` when the cited file changed after indexing.

<figure>
  <img src="/guides/inspector-search.webp" alt="MCP Inspector 2.16.0 running ragmir_search with the question &quot;How do I run Ragmir on a server without internet access?&quot;. The results list docs/server-deployment.md:L1-L8#0 and docs/docker.md:L98-L107#5, each with its heading path, excerpt, and line range." width="1400" height="908" loading="lazy" decoding="async">
  <figcaption>A <code>ragmir_search</code> call in MCP Inspector 2.16.0, against Ragmir 6.20.0 serving a folder of Markdown guides and one PDF. The call took 169 ms.</figcaption>
</figure>

A call stays within `mcpMaxOutputBytes`, 32 KB by default. `_meta["ragmir/output"]` reports any
trimming. Passages already returned in the session come back as short `seen` stubs, so the next
search spends its budget on new evidence.

The agent then calls `ragmir_expand` on the one citation it will rely on. It returns the indexed
passage with bounded neighbours and a `nextCitation` to read a long document window by window.

When the evidence is weak, search returns nothing. The agent can then say the documents do not cover
the question.

## PDF and Markdown in one index

Citations follow each format, so one server answers from Markdown, PDFs, Office files, and code:

- `docs/runbook.md:L12-L18#3` cites lines.
- `contracts/msa-acme-2026.pdf:p7#3` cites a PDF page.
- Other formats use slide, sheet and cell, EPUB spine, or named-section coordinates.

Markdown passages carry their heading path, and `ragmir_sources` lists each page's front matter
title and description. More than 900 extensions and file names index with no extra install.

Scanned pages need a local OCR engine that you enable with `rgr ocr setup`.
`rgr audit --unsupported` lists what was skipped.

## How each client starts it

| Client | Setup |
| --- | --- |
| Claude Code | `/plugin install ragmir --marketplace jcode-works/ragmir`, then `/ragmir:index`; or `rgr setup --agents claude` |
| OpenAI Codex | `codex plugin marketplace add jcode-works/ragmir`, then `codex plugin add ragmir@ragmir`; or `rgr setup --agents codex` |
| Cursor | The plugin folder `plugins/ragmir`, copied to `~/.cursor/plugins/local/ragmir` until it is listed in the Cursor Marketplace |
| Gemini CLI | `gemini extensions install https://github.com/jcode-works/ragmir` |
| Qwen Code | `qwen extensions install jcode-works/ragmir:ragmir` |
| Kimi, OpenCode, Cline | `rgr setup --agents kimi,opencode,cline` |

Plugins and extensions run a pinned Ragmir release from npm against the project the agent has open.
Any other client that supports MCP over stdio takes this entry, adapted to its documented format:

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

Register the server per project, with a committed `.mcp.json` or Codex's `.codex/config.toml`. A
server registered for every project answers unrelated workspaces from the same base. `rgr doctor`
warns about such registrations in Claude Code and Codex, and `mcpAllowedRoots` refuses those
workspaces.

The MCP Registry lists the server as `io.github.jcode-works/ragmir`.

## Where the data goes

Parsing, the index, and search stay on the machine that runs Ragmir, with no telemetry.

What leaves the machine depends on the agent. A cloud coding agent sends the excerpts it reads to
its model provider. A local model keeps them on the machine.

Ragmir preserves source text without masking, so choose sources with that path in mind. `.env`
files, keys, and certificates never reach the index. There is no authentication or per-user
filtering, so a host that exposes the server to several people owns access control.

## How to choose the best RAG MCP server

No server is best for every project, but five criteria separate them. The last column is filled
for Ragmir 6.20.0 only, from its documentation, so you can ask other servers the same questions.

| Criterion | What to check | Ragmir |
| --- | --- | --- |
| Runs locally | Whether indexing or search needs an account, API key, hosted index, or embedding API | One local stdio process; no account or API key; `local-hash` needs no model |
| Formats indexed | Which files it parses, whether scans work, and whether skipped files are reported | 900+ extensions and file names; local OCR when enabled; skips listed by `rgr audit --unsupported` |
| Citation granularity | Whether a result names only a file, or a line, page, slide, or cell the agent can reopen | Lines, PDF pages, slides, sheet and cell ranges, EPUB spine items, exported objects |
| Output budget | Default result count, size cap per call, and whether trimming is reported | Three compact citations, 32 KB per call (`mcpMaxOutputBytes`), 1 MiB ceiling, trimming in `_meta["ragmir/output"]` |
| Licence | The licence of the server and any commercial option | AGPL-3.0-only; commercial license from JCode Works |

Then ask a question your documents do not answer. A server that returns nothing lets the agent say
so instead of answering from the nearest passage. Ragmir's `rgr evaluate` measures this rate on
your own golden questions.

## Next steps

- [Add the plugin to Claude Code](/integrations/claude-code/)
- [Agent integration guide](/docs/agent-integration/)
- [Serve your own documentation to agents](/docs-mcp-server/)
- [Supported formats](/docs/supported-formats/)
