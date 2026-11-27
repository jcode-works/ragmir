---
title: "Docs MCP server for your own documentation | Ragmir"
description: "Run a local docs MCP server over your own Markdown, PDFs, Office files, and code: offline by default, cited to the line or page, complementary to Context7."
h1: "A docs MCP server for your own documentation"
summary: "Ragmir indexes the documentation in your repository or folders on your machine and serves it to coding agents through a local MCP server, offline by default, with citations to lines, pages, slides, or cells. It complements Context7, which serves public library documentation."
section: use-case
translationKey: "docs-mcp-server"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["compare/context7", "mcp-rag-server", "integrations", "air-gapped-rag"]
---

Coding agents can fetch public library documentation from hosted services, but the documents that
describe your own system, such as specifications, architecture decisions, runbooks, contracts, and
API descriptions, live in your repository and shared folders. Ragmir indexes those files where they
are and serves them through a local MCP server. Parsing, the index, and search run on your machine
with no account or hosted store, and the default `local-hash` retrieval makes no network call. The
agent searches, expands the citations it needs, and answers with its own model.

## Why keep documentation search local

- **Private documents stay put.** The index lives in the project's Git-ignored `.ragmir/` folder,
  and credential files such as `.env` never reach it.
- **Offline by default.** `local-hash` needs no model, GPU, API key, or network, so the server also
  works inside a network without internet access. A semantic model is optional and is downloaded
  only after you approve it.
- **No upload step.** Sources are globs in `ragmir.config.json`, and `rgr ingest` reads only new
  and changed files.

Developers have asked for this on Context7's own tracker. In 2025,
[issue #103](https://github.com/upstash/context7/issues/103) proposed syncing documentation into a
local or project folder (Context7 closed it without adopting that direction), and
[issue #320](https://github.com/upstash/context7/issues/320) asked for offline documentation in
air-gapped environments, which Context7 answered by pointing to its on-premise deployment.

## Set up a local docs MCP server

1. Install Ragmir in the project and prepare your agents:

   ```bash
   pnpm add -D @jcode.labs/ragmir
   pnpm exec rgr setup --no-ingest --agents claude,codex
   ```

2. Select the documentation and code worth citing, then build the index:

   ```bash
   pnpm exec rgr sources add "docs/**/*.md" "specs/**/*.docx" "src/**/*.ts"
   pnpm exec rgr ingest
   ```

3. Check one cited result:

   ```bash
   pnpm exec rgr search "authentication contract" --compact
   ```

4. Connect the helper that `.ragmir/agent-setup.md` describes. Claude Code, Codex, Cursor, Gemini
   CLI, and Qwen Code can use a plugin or extension instead; see the [integrations](/integrations/).

To keep the server current, `rgr hooks install` refreshes the index after commits, merges, and
checkouts, and agents can call `ragmir_ingest` when a result reports a changed file.

## Formats beyond Markdown

| Documentation | Citation |
| --- | --- |
| Markdown, MDX, AsciiDoc, reStructuredText | Lines, with the heading path; `ragmir_sources` lists front matter titles and descriptions |
| PDF | Page, such as `:p3`; scanned pages through local OCR |
| Word, PowerPoint, Excel | Passage, slide (`:slide12`), or sheet and cells (`:sheet=Finance%20Ops:cells=A7-D7`) |
| EPUB | Spine item (`:spine2`) |
| HTML and saved web pages | Passage |
| OpenAPI, AsyncAPI, Postman, Insomnia | One section per operation or request |
| Confluence, Notion, Google Docs | Export to Word, PDF, HTML, or Markdown first |

More than 900 extensions and file names index with no extra install, and `rgr audit --unsupported`
lists the files in your sources that Ragmir skipped.

## Ragmir and Context7 serve different documentation

Context7 brings up-to-date, version-specific documentation and code examples for public libraries
into coding agents. Ragmir indexes your own files. One agent can use both: Context7 for how a
framework's API works, Ragmir for what your specification or ADR says. Ragmir's own guides are on
Context7 as [/jcode-works/ragmir](https://context7.com/jcode-works/ragmir).

Looking for a self-hosted Context7 alternative for private docs? Context7 itself offers private
sources on its Pro and Enterprise plans, and a self-hosted deployment on Enterprise. Ragmir has a
different shape: an open-source library and CLI that runs in one Node.js process, with no server to
operate, no account, and no model needed to index. The [comparison](/compare/context7/) sets the two
side by side.

## Limits

- Ragmir has no catalog of public library documentation and no connectors: export Confluence,
  Notion, or Google Docs pages before indexing them.
- It has no web interface or document preview, and no authentication or per-user access control.
  A service that exposes it owns both.
- Each workstation runs its own index: share sources through Git, then run `rgr ingest` on each
  machine.
- A cloud coding agent sends the excerpts it reads to its model provider. A local index does not
  make that conversation local.

## Next steps

- [Ragmir and Context7 compared](/compare/context7/)
- [How Ragmir's MCP server works](/mcp-rag-server/)
- [Supported formats](/docs/supported-formats/)
