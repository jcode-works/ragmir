---
title: "RAG vs MCP: Differences, Token Usage, Using Both | Ragmir"
description: "RAG and MCP are not the same: MCP connects an agent to tools, and retrieval decides what text comes back. How they work together and what drives token usage."
h1: "RAG vs MCP: are they the same, and can you use both?"
summary: "No. MCP is the protocol an agent uses to call tools. RAG retrieves passages from your sources so a model can answer from them. They work together when an MCP server exposes retrieval, and then the retrieval, not the protocol, decides how much text reaches the model."
section: guide
translationKey: "rag-vs-mcp"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["mcp-rag-server", "rag-citations", "local-rag", "integrations/claude-code"]
---

RAG and MCP are different things. MCP is a protocol, and RAG is a pattern that an MCP server can
serve.

MCP, the Model Context Protocol, defines how a client such as Claude Code, Codex, or Cursor
discovers the tools a server exposes, calls them, and receives their results. It does not decide
which text a tool returns or how long that text is.

RAG, retrieval-augmented generation, finds the passages that answer a question. A model then writes
from them.

Ragmir is a retrieval layer you can reach with or without MCP. Its MCP server, the `rgr` CLI,
TypeScript, Python, LangChain, and LlamaIndex all read the same index and return the same
citations.

## Are RAG and MCP the same thing?

No. They work at different layers:

| | MCP | Retrieval (RAG) |
| --- | --- | --- |
| What it is | A protocol between a client and tool servers | An index and a search step over your sources |
| What it decides | How tools are listed, called, and answered | Which passages come back, how many, and how long they are |
| Without the other | MCP tools need not search documents at all | Ragmir also runs from the CLI, TypeScript, and Python |

## Can RAG and MCP be used together?

Yes. An MCP server can expose retrieval as tools, and the agent decides when to call them.

Ragmir's server runs over stdio. It is listed in the MCP Registry as `io.github.jcode-works/ragmir`
and exposes six tools:

- `ragmir_search`, `ragmir_expand`, `ragmir_sources`, `ragmir_status`, and `ragmir_audit` are
  read-only.
- `ragmir_ingest` refreshes the index and writes nothing but Ragmir's private index.

The agent searches, expands the one passage it needs, and searches again when it must. The session
measured below follows that pattern: one search, then one expansion. The agent's own model reads
the evidence and writes the answer. Ragmir only returns evidence.

Install the plugin for Claude Code, Codex, or Cursor, or run `rgr setup --agents claude,codex` for
a project MCP server. Register Ragmir per project, never for every project.

## RAG vs MCP token usage

The protocol does not decide how much a tool returns. The server behind it does. A tool that hands
back whole files fills the context with whole files. Ragmir bounds what each call returns:

- `ragmir_search` starts with at most three compact citations per question, each an excerpt that
  starts at the lines holding the question's words.
- Each response stays within `mcpMaxOutputBytes`, 32,768 bytes by default, under an absolute 1 MiB
  server ceiling. A call can ask for less with `maxBytes`, and `_meta["ragmir/output"]` reports any
  trimming.
- Up to five related questions share one budget in `queries`, and a passage found by several of
  them appears once.
- Passages already returned in the session come back as short `seen` stubs (citation, path,
  evidence id), and they do not count toward `topK`.
- The agent expands only what it will rely on: `ragmir_expand` returns the full text of one
  citation and its bounded neighbours, or up to five citations in one budget.
- When the evidence is weak, search returns nothing, so an off-topic question costs an empty
  result.

```json
{ "queries": ["release approval", "rollback owner"], "scope": "docs", "maxBytes": 4096 }
```

| | Agent reading files | Agent calling Ragmir |
| --- | --- | --- |
| Context window | Whole files, read again in every new session | Three compact citations by default within a 32 KB budget per call; passages already seen come back as one-line stubs |
| Sent to the model | Everything the agent opens | Only compact excerpts and the passages the agent expands |

### One question, measured

On November 27, 2026, an agent session against Ragmir 6.20.0, with the eleven guides of Ragmir's
own `docs/` folder indexed, asked one question and expanded the first citation:

```text
ragmir_search({ query: "How do I run Ragmir on a server without internet access?" })
  [1] docs/server-deployment.md:L123-L138#8  Run Ragmir on a server > Without internet access
  [2] docs/docker.md:L96-L105#5              Run Ragmir with Docker > Servers and CI
  [3] docs/python.md:L211-L218#12            Use Ragmir from Python > Without Node.js
ragmir_expand({ citation: "docs/server-deployment.md:L123-L138#8" })
  ## Without internet access
  Build the image where the npm registry is reachable, then move it with `docker save` [...]
```

| What the agent reads | Bytes |
| --- | ---: |
| `ragmir_search` reply: three compact citations | 2,244 |
| `ragmir_expand` reply: the one passage it relies on | 2,295 |
| Total through Ragmir | 4,539 |
| The three cited files read whole instead | 22,014 |

Across 89 developer questions about the whole Ragmir repository, the same pattern holds. The
[first-pass benchmark](/benchmarks/) shows the bytes an agent reads with grep and with Ragmir.

The budget is set in bytes, not tokens, and it belongs to the MCP server. An application that calls
the library directly gets up to the `topK` passages it asks for. It sizes the evidence to its
model's context window itself.

## When to use RAG, MCP, or both

- **The agent's own tools** are often enough on a small code repository. Grep stays the tool to
  list every occurrence or match a regular expression.
- **Retrieval over MCP** suits an MCP client (Claude Code, Codex, Cursor, Gemini CLI, Qwen Code, or
  any client over stdio). It helps when the agent needs answers from hundreds of PDFs, Office
  files, or scans, or from documents that use other words than the question.
- **Retrieval without MCP** suits an application or a pipeline. `createRagmirClient()`, the
  LangChain.js retriever, and the Python packages read the same index.
- **A remote-only chat** needs its own connector or an application that calls the library. Ragmir
  has no built-in HTTP server, and a model endpoint such as Ollama does not attach to an MCP server
  by itself.

## Next steps

- [Ragmir as an MCP RAG server](/mcp-rag-server/)
- [Claude Code integration](/integrations/claude-code/)
- [Agent integration guide](/docs/agent-integration/)
- [RAG citations](/rag-citations/)
