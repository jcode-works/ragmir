---
title: "Ragmir and Context7: your docs and library docs | Ragmir"
description: "A dated, sourced comparison of Ragmir and Context7: what each indexes, where it runs, formats, citations, and licence, and how one coding agent can use both."
h1: "Ragmir and Context7: how they compare and work together"
summary: "Context7 serves current, version-specific documentation for public libraries from a hosted service. Ragmir indexes your own files on your machine and returns exact citations. They cover different sources, and one coding agent can use both."
section: comparison
translationKey: "compare/context7"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["docs-mcp-server", "mcp-rag-server", "integrations", "docs/agent-integration"]
---

Both give coding agents documentation through MCP, but they start from different sources.

Context7 indexes public libraries from their repositories and websites. It refreshes them
automatically and serves the results from its hosted service. Private sources need a paid plan, and
a self-hosted deployment needs its Enterprise plan.

Ragmir indexes the files you select, such as code, specifications, PDFs, and Office documents. It
runs in one process on your machine and returns passages cited to the line, page, slide, or cell.

Ragmir's own documentation is listed on Context7 as
[/jcode-works/ragmir](https://context7.com/jcode-works/ragmir).

## Criteria compared

Checked on November 27, 2026, against Context7's public documentation and Ragmir 6.20.0. Plans and
features change, so check the sources below before deciding.

| Criterion | Context7 | Ragmir |
| --- | --- | --- |
| What it indexes | Public library documentation, which anyone can add; private sources on Pro and Enterprise plans | Files you select in a project or folder |
| Where indexing and search run | Context7's hosted service; a self-hosted deployment on the Enterprise plan | One Node.js process on your machine or server |
| Network when searching | Needed: the remote endpoint and the npm MCP server both query Context7's API; on-premise with an offline license makes no calls to Context7 Cloud | None with the default `local-hash` retrieval |
| Models | LLMs rerank results; on-premise, the AI provider you configure parses, embeds, and reranks | None by default; optional local embedding model |
| Account | API key or OAuth sign-in recommended; the free plan includes 1,000 API calls a month | None |
| Formats | Documentation text (Markdown, MDX, reStructuredText, AsciiDoc, HTML, notebooks), PDF and DOCX converted to text, OpenAPI, websites, llms.txt; Confluence and Notion as private sources; examples generated from code when a repository has little documentation | 900+ extensions: code, Markdown, PDF, Office, EPUB, mail, design and API exports; local OCR when enabled |
| Documentation language | Hosted: English, other pages skipped; on-premise: any language for Git, Confluence, Google Drive, and Notion | Text indexed as written; a multilingual model for French, English, or mixed sources |
| Citation granularity | A source URL per snippet | Lines, PDF pages, slides, sheet cells, EPUB spine items, exported objects |
| Output budget per call | Not documented | Three compact citations by default within 32 KB |
| When the docs do not answer | Not documented | Returns nothing when the evidence is weak |
| Freshness | Refreshed in the background once older than 1 to 45 days, by popularity; private libraries refreshed manually | Incremental `rgr ingest`, Git hooks, `sourceStatus` on changed files |
| Access control | Teamspaces, policies, OAuth; SSO on Enterprise | None; the host owns authentication and permissions |
| Licence | MCP server under MIT; API backend, parsing, and crawling engines private | AGPL-3.0-only; commercial license available |

Context7 column, from the [Context7 README](https://github.com/upstash/context7),
[Plans & Pricing](https://context7.com/docs/plans-pricing),
[Adding Libraries](https://context7.com/docs/adding-libraries),
[Private Sources](https://context7.com/docs/howto/private-sources),
[On-Premise Deployment](https://context7.com/docs/enterprise/on-premise),
[Keeping Libraries Fresh](https://context7.com/docs/library-updates), the
[context API reference](https://context7.com/docs/api-reference/context/get-documentation-context),
and [Data Privacy](https://context7.com/docs/security/data-privacy). Ragmir column, from its
[README](https://github.com/jcode-works/ragmir/blob/main/README.md) and
[agent integration guide](/docs/agent-integration/).

## When Context7 is the right tool

- **Public library documentation.** Context7 already indexes public libraries, and anyone can add
  one, so an agent gets a framework's current API without indexing anything.
- **Up to date and version-specific.** Libraries refresh in the background after 1 to 45 days
  depending on their popularity, and a prompt can name the library version it needs.
- **Hosted.** There is no index to build or run: add the remote MCP server or the `ctx7` CLI, with
  plugins and connectors for many clients, Claude and ChatGPT included.
- **Teams.** Teamspaces, policies, a dashboard for managing libraries, and SSO on Enterprise.

## When Ragmir is the right tool

- **Your own files, kept local.** Specifications, ADRs, runbooks, contracts, and code are indexed
  where they live, with no upload and no account.
- **Offline by default.** Indexing and search need no network, model, or API key.
- **Formats beyond documentation.** Office files cited by slide or cell, scanned PDFs through local
  OCR, mail, and design or API exports.
- **Checkable answers.** Exact citations, `weakEvidence` flags, no passage when the documents are
  silent, and `rgr evaluate` to measure retrieval on your own questions.

## Use them together

An agent can run both servers. Ask Context7 how a library works. Ask Ragmir what your own
specification, ADR, or code says about it.

The references differ. Context7 gives a documentation URL, and Ragmir gives a file with its line or
page.

Context7 also serves Ragmir itself. Assistants that fetch library documentation find Ragmir's
guides and rules as `/jcode-works/ragmir`, refreshed from the repository after each release.

## Next steps

- [A docs MCP server for your own documentation](/docs-mcp-server/)
- [How Ragmir's MCP server works](/mcp-rag-server/)
- [Integrations](/integrations/)
