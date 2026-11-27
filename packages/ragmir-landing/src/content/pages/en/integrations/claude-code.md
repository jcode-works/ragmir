---
title: "Claude Code RAG plugin with cited local search | Ragmir"
description: "Add RAG to Claude Code with the Ragmir plugin: install it, index a project with /ragmir:index, and get passages cited to lines, PDF pages, slides, or cells."
h1: "How to add RAG to Claude Code"
summary: "Install the Ragmir plugin with one command, then run /ragmir:index once in each project. Claude Code can then search your code, specifications, PDFs, and Office files and cite each passage to its line, page, slide, or cell, while the index stays on your machine."
section: integration
translationKey: "integrations/claude-code"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["integrations", "mcp-rag-server", "integrations/codex", "docs/agent-integration"]
---

Claude Code reads files and runs grep, which works on a few text files. The Ragmir plugin gives it a
knowledge base it can cite: an index of the files you choose, built on your machine, and MCP tools
that return passages cited to the exact line, PDF page, slide, or spreadsheet cell. The plugin
bundles the `/ragmir:index` command, the retrieval skill (`/ragmir:ragmir`), and an MCP server with
five read-only tools and `ragmir_ingest`. Its server runs a pinned Ragmir release from npm against
the project Claude Code has open, with no account, API key, or hosted store.

## Install the Claude Code RAG plugin

1. Install the plugin:

   ```text
   /plugin install ragmir --marketplace jcode-works/ragmir
   ```

   From a terminal, the same install takes two commands. With Claude Code 2.1.329 on November 27,
   2026, they printed:

   ```text
   $ claude plugin marketplace add jcode-works/ragmir
   ✔ Successfully added marketplace: ragmir (declared in user settings)
   $ claude plugin install ragmir@ragmir
   ✔ Successfully installed plugin: ragmir@ragmir (scope: user)
   ```

2. In each project, index the sources Claude may read:

   ```text
   /ragmir:index docs/**/*.md specs/**/*.pdf src/**/*.ts
   ```

   Without arguments, Claude proposes the sources and asks before indexing.

3. Run `/ragmir:index` again whenever you add sources.

You can also build the same index by hand from the project root:

```bash
npx --yes @jcode.labs/ragmir@6.20.0 init
npx --yes @jcode.labs/ragmir@6.20.0 sources add "docs/**/*.md" "specs/**/*.pdf" "src/**/*.ts"
npx --yes @jcode.labs/ragmir@6.20.0 ingest
```

Skip `rgr setup --agents claude` in a project that uses the plugin: it registers a second,
project-level server. Without the plugin, that command is the alternative. Claude Code then starts
the server declared in `.mcp.json` only after you approve it, and `rgr doctor` reports
`approval=pending` until you do.

## What Claude Code gains over grep and file reads

| | Claude Code alone | With Ragmir |
| --- | --- | --- |
| PDF, Office, scans | Opened one at a time; grep cannot search inside them | Indexed once, scans through optional local OCR, each passage cited to its line, page, slide, or cell |
| Different words | Only exact words match | Up to five rewordings fused in one search, and a notice naming the words no file contains |
| Context window | Whole files, read again in every session | Three compact citations by default within 32 KB per call; passages already seen return as one-line stubs |
| Not in the documents | Partial matches can still become an answer | Nothing returned when the evidence is weak |

On a small code repository, Claude Code's own search is often enough, and grep stays the tool to
list every occurrence or match a regular expression. Ragmir returns ranked passages.

## A search, then one expanded citation

This session ran on November 27, 2026 against Ragmir 6.20.0 from npm, with the eleven guides of
Ragmir's `docs/` folder indexed in a clean project (11 files, 256 chunks, indexed in under a
second). The replies are JSON; the lines below keep their citations and headings.

```text
ragmir_search({ query: "How do I run Ragmir on a server without internet access?" })
  [1] docs/server-deployment.md:L123-L138#8  Run Ragmir on a server > Without internet access
  [2] docs/docker.md:L96-L105#5              Run Ragmir with Docker > Servers and CI
  [3] docs/python.md:L211-L218#12            Use Ragmir from Python > Without Node.js
  3 compact citations, 2,244 bytes of text

ragmir_expand({ citation: "docs/server-deployment.md:L123-L138#8" })
  ## Without internet access
  Build the image where the npm registry is reachable, then move it with `docker save` and
  `docker load`, or install from your internal npm mirror. At runtime, `local-hash` makes no
  network call: the container above ingests and searches with `--network none`.
  [...]
  one passage, 2,295 bytes of text
```

Claude read 4.5 KB to reach the answer and its source line range. Opening the three cited files
whole would have cost 22 KB. In a longer task, passages already returned come back as short `seen`
stubs, so a second search spends its budget on new evidence. For a single question, the plugin's
`answer` prompt (`/mcp__plugin_ragmir_ragmir__answer`) asks Claude to cite every claim and to say
so when the documents hold no evidence.

## Keep the knowledge base current

A result whose file changed after indexing carries `sourceStatus`. Claude can then call
`ragmir_ingest`, which reads only new and changed files and keeps the previous index searchable
until the new one passes validation. To refresh the index after commits, merges, and checkouts, run
`npx --yes @jcode.labs/ragmir@6.20.0 hooks install` from the project root.

## Limits

- The plugin needs local files. It runs in Claude Code, not in the Claude web, desktop chat, or
  mobile apps.
- Ragmir returns evidence and Claude writes the answer, so the excerpts Claude reads go to its
  model provider. A local index does not make the conversation local.
- Ragmir cannot borrow Claude's model for its own ranking: Claude models produce no embeddings, and
  Claude Code does not support MCP sampling.
- `ragmir_ingest` refuses while local OCR or another external extractor is configured; run the
  ingest from a terminal instead.
- There is no interface for document previews. Citations point to the files themselves.

## Next steps

- [How Ragmir's MCP server works](/mcp-rag-server/)
- [Agent integration guide](/docs/agent-integration/)
- [Supported formats](/docs/supported-formats/)
- [The same setup for Codex](/integrations/codex/)
