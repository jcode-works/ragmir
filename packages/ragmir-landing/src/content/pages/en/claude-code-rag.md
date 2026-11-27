---
title: "Claude Code RAG: grep or a local index, measured | Ragmir"
description: "Does Claude Code use RAG? It greps and reads files. We measured that first pass against Ragmir's MCP server on 89 questions, then show how to add RAG."
h1: "Does Claude Code use RAG? Grep versus a local index"
summary: "Claude Code keeps no index of your code: it loads CLAUDE.md, then searches with grep and find and reads files as it goes. On 89 questions about Ragmir's repository, a grep first pass ranked answering files about as well as Ragmir's MCP server, but the agent read a median of 71 KiB to reach one, against under 5 KiB through Ragmir."
section: guide
translationKey: "claude-code-rag"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["integrations/claude-code", "rag-vs-mcp", "benchmarks", "agentic-rag"]
---

Claude Code finds context the way a developer does at a terminal: it lists files, greps for words,
and opens what looks relevant. That works well on code whose identifiers match the question. RAG
adds a ranked, cited shortlist before anything is opened. This page answers what Claude Code does
by default, measures both first passes on the same questions, and shows how to add Ragmir when the
shortlist is worth it.

## Does Claude Code use RAG?

Not by default. Anthropic describes Claude Code as a hybrid: `CLAUDE.md` files are "naively dropped
into context up front", and "primitives like glob and grep allow it to navigate its environment and
retrieve files just-in-time, effectively bypassing the issues of stale indexing and complex syntax
trees" ([Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents),
Anthropic, September 29, 2025). The current
[tools reference](https://code.claude.com/docs/en/tools-reference) adds that on macOS, Linux, and
WSL, Claude searches with `find` and `grep` through the Bash tool, while Windows keeps the Glob and
Grep tools; Grep is built on ripgrep. No embedding index is built or queried.

That design has real strengths: nothing goes stale, exact identifiers are found every time, and
there is nothing to install. Its costs show up elsewhere, in how much the agent reads and in what
happens when the answer is not in the repository at all.

## Claude Code RAG vs grep, measured

We asked the 89 developer questions of Ragmir's public question set (each listed with every file
that answers it) over the same 287 tracked files of Ragmir's repository, plus 30 off-topic and 40
near-domain questions that the repository does not answer. The grep side greps each question word
of three characters or more, minus common English words, ranks files by how many of those words
they hold, and opens them whole in that order until one answers. The Ragmir side runs its MCP
server: the default search, a second search with ten results when needed, then one expansion of the
answering citation. Bytes count the text the model reads.

| First pass | Answer in top 3 | Answer in top 10 | Median bytes read to reach it | Off-topic refused | Near-domain refused |
| --- | ---: | ---: | ---: | ---: | ---: |
| ripgrep, question words, files read whole | 85% | 100% | 71.4 KiB | 2 of 30 | 0 of 40 |
| Ragmir MCP, `local-hash`, no model | 82% | 99% | 4.7 KiB | 23 of 30 | 7 of 40 |
| Ragmir MCP, hybrid with `mxbai-embed-xsmall-v1` | 87% | 100% | 4.8 KiB | 28 of 30 | 13 of 40 |

Measured on November 27, 2026 at commit `10bb9f6` with Ragmir 6.20.0's code, ripgrep 15.2.0, Node.js
22, and an Apple M3 Max: `pnpm bench:first-pass`, method in the
[benchmark README](https://github.com/jcode-works/ragmir/blob/main/packages/ragmir-core/benchmarks/README.md),
raw report in [first-pass-2026-11-27.json](/benchmarks/first-pass-2026-11-27.json).

What the numbers say:

- **Ranking is close.** On a repository whose questions share words with its files, grep puts an
  answering file in the top 10 every time. A retrieval index is not needed to find the right file
  here.
- **The context cost is not.** Reaching the answer took a median of 71.4 KiB of greps and whole
  files, about fifteen times the 4.7 to 4.8 KiB of compact citations and one expanded passage. On a
  long task, that difference is the context window the agent keeps for the work itself.
- **Grep rarely says "not here".** 28 of the 30 off-topic questions still matched some files, so
  the agent would read them before concluding. Ragmir returned nothing for 23 to 28 of the 30.

The measure has limits: one repository, English questions, text files only, and an agent that
stops at the first answering file. Grep also cannot search inside PDFs or Office files, whose text
is compressed or stored in a binary layout; Ragmir extracts text from them and cites the page,
slide, or cell. Run `rgr evaluate` with your own questions before trusting any number on your
project.

## Agentic search vs RAG

They are not exclusive. With Ragmir connected, Claude Code still decides what to look for: it calls
`ragmir_search` like any other tool, expands the one citation it will rely on, and keeps grep for
what grep does best, listing every occurrence of an identifier or matching a regular expression.
Retrieval only changes the first step, from "open files and read" to "read a ranked, cited
shortlist, then open one passage". See [RAG vs MCP](/rag-vs-mcp/) for how the protocol and the
retrieval fit together, and [agentic RAG](/agentic-rag/) for the loop.

## How to add RAG to Claude Code

Install the plugin, then index each project once:

```text
/plugin install ragmir --marketplace jcode-works/ragmir
/ragmir:index docs/**/*.md specs/**/*.pdf src/**/*.ts
```

From a terminal, `claude plugin marketplace add jcode-works/ragmir` then
`claude plugin install ragmir@ragmir` do the same install; with Claude Code 2.1.329 they printed
`✔ Successfully installed plugin: ragmir@ragmir (scope: user)`. The plugin runs a pinned Ragmir
release from npm against the open project, with no account or API key. The
[Claude Code integration page](/integrations/claude-code/) covers the setup without the plugin,
freshness, and the limits.

## Codex and Cursor

The same index serves other coding agents. Codex installs the plugin with
`codex plugin marketplace add jcode-works/ragmir` and `codex plugin add ragmir@ragmir`; Cursor takes
the plugin folder until it is listed in its marketplace. Both run the same MCP server, so the
numbers above apply to their first pass too. See the [Codex](/integrations/codex/) and
[Cursor](/integrations/cursor/) pages.

## Next steps

- [Add the plugin to Claude Code](/integrations/claude-code/)
- [Every benchmark and how to rerun it](/benchmarks/)
- [RAG vs MCP: protocol and retrieval](/rag-vs-mcp/)
- [Agent integration guide](/docs/agent-integration/)
