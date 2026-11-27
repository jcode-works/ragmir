---
title: "Integrations: Claude Code, Codex, Cursor, LangChain | Ragmir"
description: "Pick the Ragmir page for your tool: plugins for Claude Code, Codex, and Cursor, extensions for Gemini CLI and Qwen Code, LangChain and LlamaIndex retrievers."
h1: "Connect Ragmir to your agent or framework"
summary: "Ragmir serves one local index and the same citations to Claude Code, Codex, Cursor, and Gemini CLI through plugins and MCP, and to applications through LangChain.js, LangChain, LangGraph, and LlamaIndex. Changing tools does not require re-indexing."
section: hub
translationKey: "integrations"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["mcp-rag-server", "integrations/claude-code", "integrations/langchain", "docs/agent-integration"]
notes:
  - title: "Any other MCP client"
    cards:
      - title: "Kimi, OpenCode, and Cline"
        text: "Ragmir's setup prepares all three in one command, in the project you run it from."
        command: "npx --yes @jcode.labs/ragmir setup --agents kimi,opencode,cline"
      - title: "Any client that speaks MCP over stdio"
        text: "Start the server from a generic entry. The MCP Registry lists it as io.github.jcode-works/ragmir."
        command: "node .ragmir/run.cjs serve-mcp"
        link: { href: "/mcp-rag-server/", label: "Entry and tools" }
      - title: "Agent Skills"
        text: "Tools that load skill folders can install Ragmir's skills: retrieval, setup, and the wiki."
        command: "npx skills add jcode-works/ragmir"
  - title: "What stays the same in every tool"
    cards:
      - title: "One local index, the same citations"
        text: "Every integration reads the index in the project's .ragmir/ folder and cites lines, PDF pages, slides, or cells. The default local-hash retrieval needs no model, GPU, or API key."
      - title: "A cloud model sees what you send"
        text: "A cloud agent or model provider receives the excerpts your agent or application sends it. A local index does not make that conversation local."
        link: { href: "/local-vs-cloud-rag/", label: "Local or cloud RAG" }
      - title: "Access control stays with your service"
        text: "Ragmir has no authentication or per-user access control. A service that exposes it owns both."
      - title: "Plugins need your files"
        text: "Plugins and extensions run in tools installed on your machine, next to the project, not in web or mobile chat apps."
---
