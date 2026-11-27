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

Every integration reads the same index in the project's `.ragmir/` folder and returns the same
citations, to lines, PDF pages, slides, or spreadsheet cells. Pick your tool in the cards above.

Coding agents reach the index through Ragmir's MCP server. Plugins and extensions install it with
one command and run it against the project the agent has open. Applications call the TypeScript
client or the Python packages. The agent or the application chooses the model and writes the
answer; Ragmir only retrieves and cites.

## Any other MCP client

Ragmir's setup prepares Kimi, OpenCode, and Cline:

```bash
npx rgr setup --agents kimi,opencode,cline
```

Any client that speaks MCP over stdio can start the server from a generic entry. The MCP Registry
lists it as `io.github.jcode-works/ragmir`, and [the RAG MCP server guide](/mcp-rag-server/) has
the entry and the tools it exposes:

```bash
node .ragmir/run.cjs serve-mcp
```

Agents that load skill folders can also install Ragmir's Agent Skills:

```bash
npx skills add jcode-works/ragmir
```

## What stays the same everywhere

- The index stays on the machine that runs Ragmir, and the default `local-hash` retrieval needs no
  model, GPU, or API key.
- A cloud agent or model provider receives the excerpts that your agent or application sends it.
  A local index does not make that conversation local: see [local or cloud RAG](/local-vs-cloud-rag/).
- Ragmir has no authentication or per-user access control. A service that exposes it owns both.
- Plugins and extensions need local files, so they run in coding agents, not in web or mobile chat
  apps.
