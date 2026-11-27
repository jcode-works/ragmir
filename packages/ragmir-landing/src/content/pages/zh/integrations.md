---
title: "集成指南：Claude Code、Codex、Cursor、LangChain | Ragmir"
description: "选择适合你工具的 Ragmir 页面：Claude Code、Codex 和 Cursor 使用插件，Gemini CLI 和 Qwen Code 使用扩展，LangChain 和 LlamaIndex 则提供检索器。"
h1: "将 Ragmir 连接到你的智能体或框架"
summary: "Ragmir 通过插件和 MCP 为 Claude Code、Codex、Cursor 和 Gemini CLI 提供同一个本地索引和相同的引用，并通过 LangChain.js、LangChain、LangGraph 和 LlamaIndex 为应用提供服务。更换工具无需重新索引。"
section: hub
translationKey: "integrations"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["mcp-rag-server", "integrations/claude-code", "integrations/langchain", "docs/agent-integration"]
notes:
  - title: "其他 MCP 客户端"
    cards:
      - title: "Kimi、OpenCode 和 Cline"
        text: "Ragmir 的安装命令会在你运行它的项目中，用一条命令同时为这三者完成准备。"
        command: "npx rgr setup --agents kimi,opencode,cline"
      - title: "任何通过 stdio 使用 MCP 的客户端"
        text: "从通用入口启动服务器。MCP Registry 将其登记为 io.github.jcode-works/ragmir。"
        command: "node .ragmir/run.cjs serve-mcp"
        link: { href: "/zh/mcp-rag-server/", label: "入口与工具" }
      - title: "Agent Skills"
        text: "能够加载技能文件夹的工具可以安装 Ragmir 的技能：检索、安装和 wiki。"
        command: "npx skills add jcode-works/ragmir"
  - title: "所有工具中保持不变的内容"
    cards:
      - title: "同一个本地索引，相同的引用"
        text: "每个集成都读取项目 .ragmir/ 文件夹中的索引，并引用行、PDF 页、幻灯片或单元格。默认的 local-hash 检索不需要模型、GPU 或 API 密钥。"
      - title: "云端模型能看到你发送的内容"
        text: "云端智能体或模型服务商会收到你的智能体或应用发送给它的摘录。本地索引并不会让这段对话变成本地的。"
        link: { href: "/zh/local-vs-cloud-rag/", label: "本地还是云端 RAG" }
      - title: "访问控制由你的服务负责"
        text: "Ragmir 没有身份验证，也没有按用户划分的访问控制。对外提供它的服务需要同时负责这两点。"
      - title: "插件需要你的文件"
        text: "插件和扩展运行在你机器上已安装的工具中，与项目放在一起，而不是运行在网页或移动端聊天应用里。"
---
