---
title: "Integrations: Claude Code, Codex, Cursor, LangChain | Ragmir"
description: "Pick the Ragmir page for your tool: plugins for Claude Code, Codex, and Cursor, extensions for Gemini CLI and Qwen Code, LangChain and LlamaIndex retrievers."
h1: "Connect Ragmir to your agent or framework"
summary: "Ragmir serves one local index and the same citations to coding agents through plugins and MCP, and to applications through LangChain.js, LangChain, LangGraph, and LlamaIndex. Changing tools does not require re-indexing."
section: hub
translationKey: "integrations"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["mcp-rag-server", "integrations/claude-code", "integrations/langchain", "docs/agent-integration"]
---

Every integration reads the same index in the project's `.ragmir/` folder. Each one returns the
same citations, to lines, PDF pages, slides, or spreadsheet cells.

Coding agents reach the index through Ragmir's MCP server. Plugins and extensions install it with
one command and run it against the project the agent has open. Applications call the TypeScript
client or the Python packages.

The agent or the application chooses the model and writes the answer. Ragmir only retrieves and
cites.

## Coding agents

### Claude Code

The Ragmir plugin adds an MCP server, the retrieval skill, and the `/ragmir:index` command. The
command proposes sources and asks before indexing.
[How to add RAG to Claude Code](/integrations/claude-code/) covers the install, a
search-then-expand session, and what the plugin adds over grep and file reads.

### OpenAI Codex

Codex installs the same plugin from the repository's marketplace. It can also read a
project-level server from `.codex/config.toml`.
[Give Codex access to project documentation](/integrations/codex/) explains both routes and how to
keep the server scoped to one project.

### Cursor

Cursor takes the plugin folder or one entry in `.cursor/mcp.json`.
[Cursor RAG MCP](/integrations/cursor/) shows both. It also shows how path filters and named scopes
narrow a documentation search.

### Gemini CLI and Qwen Code

One command installs Ragmir as an extension for either tool. A context file walks the model
through searching, expanding, and citing.
[The Gemini CLI extension page](/integrations/gemini-cli/) covers both tools and the tools for
maintaining a Markdown knowledge base.

## Frameworks

### LangChain and LangGraph

`RagmirRetriever` returns LangChain documents whose metadata holds the citation. It works in
LangChain.js and in Python, and it returns nothing when the documents hold no evidence.

Agent tools let LangChain and LangGraph agents decide what to search and which citation to read.
See [LangChain local retriever with citations](/integrations/langchain/).

### LlamaIndex

`llama-index-retrievers-ragmir` gives a LlamaIndex query engine a retriever over your local files,
with the citation in each node.
See [LlamaIndex retriever for local files](/integrations/llamaindex/).

## Any other MCP client

`rgr setup --agents kimi,opencode,cline` prepares Kimi, OpenCode, and Cline.

Any client that speaks MCP over stdio can start `node .ragmir/run.cjs serve-mcp` from a generic
entry. The MCP Registry lists the server as `io.github.jcode-works/ragmir`.
[The RAG MCP server guide](/mcp-rag-server/) has that entry and the tools it exposes.

Agents that load skill folders can also install Ragmir's five Agent Skills with
`npx skills add jcode-works/ragmir`.

## What stays the same everywhere

- The index stays on the machine that runs Ragmir, and the default `local-hash` retrieval needs no
  model, GPU, or API key.
- A cloud agent or model provider receives the excerpts that your agent or application sends it.
  A local index does not make that conversation local.
- Ragmir has no authentication or per-user access control. A service that exposes it owns both.
- Plugins and extensions need local files, so they run in coding agents, not in web or mobile chat
  apps.

## Next steps

- [RAG MCP server guide](/mcp-rag-server/)
- [Agent integration guide](/docs/agent-integration/)
- [Use Ragmir from Python](/docs/python/)
- [TypeScript API reference](/docs/api-reference/)
