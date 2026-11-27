---
title: "本地还是云端 RAG：模型、硬件与你的数据 | Ragmir"
description: "RAG 可以完全在本地运行，可以部署在你自己的服务器上，也可以搭配云端 AI 使用。本文说明每种方案所需的模型、运行它们的硬件配置，以及云服务商会接收哪些内容，并列出发送文档前应核对的事项。"
h1: "本地还是云端 RAG：该运行哪些模型，文档会流向何处"
summary: "Ragmir 的索引始终保留在运行它的机器上。变化的是生成答案的模型：可以在你的机器上、你的服务器上，或在接收你所发送段落的云服务商处运行。下面列出每种方案的配置和硬件要求，以及在文档到达云端模型之前需要检查的事项。"
section: guide
setup: local
translationKey: "local-vs-cloud-rag"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["local-rag", "air-gapped-rag", "self-hosted-rag", "docs/agent-integration"]
---

一套 RAG 方案会运行两个模型，你可以选择每个模型的运行位置。Ragmir 负责检索：它查找段落并为其提供引用。另一个模型阅读这些段落并生成答案。

## 两个模型，两项决定

| 组成部分 | 作用 | 运行位置 |
| --- | --- | --- |
| Ragmir 中的检索 | 为你的文件建立索引，然后为每个问题返回带引用的段落 | 始终在运行 Ragmir 的机器上 |
| 你的对话、智能体或应用中的回答 | 阅读这些段落并生成答案 | 由你选择：你的机器、你的服务器或云服务商 |

默认情况下，检索部分不需要模型。回答部分则始终需要一个模型，而这一选择决定了你的文档会流向何处。

## 检索：所需的模型与机器

默认的 `local-hash` 检索使用 BM25 对关键词证据进行排序，不需要模型、GPU 或 API 密钥。当问题使用的词语与文档不同时，例如同义词或其他语言，请加入语义模型。

| 方案 | 最低要求 | 舒适配置 |
| --- | --- | --- |
| 关键词搜索，`local-hash`（默认） | 无需模型、GPU 或 API 密钥，也无需下载任何内容 | 内存随语料库增长 |
| 语义检索，`mxbai-embed-xsmall-v1`（英语） | 建立索引需要 0.75 GB 内存，下载 97 MB | 1.5 GB 内存和 2 个 CPU |
| 语义检索，Granite R2（多语言，大多数机器默认选择） | 1 GB 内存，下载 124 MB | 2 GB 内存和 2 个 CPU |
| 语义检索，`multilingual-e5-small` | 1.5 GB 内存，下载 492 MB | 3 GB 内存和 2 个 CPU |
| 语义检索，`Qwen3-Embedding-0.6B` | 4 GB 内存，下载 624 MB | 8 GB 内存和 2 个 CPU |

这些数字来自 Ragmir README 中的[系统要求](https://github.com/jcode-works/ragmir#system-requirements)。在安装了 Ragmir 的项目中，请对照你自己的机器进行核对，包括容器的内存限制：

```bash
npx rgr models list
```

要在 Ragmir 内运行语义模型，请安装可选运行时，并让 Ragmir 选择适合本机的模型。下载只进行一次，正常检索会保持禁止远程加载模型。

```bash
npm install -D @huggingface/transformers
npx rgr setup --semantic
npx rgr ingest --rebuild
```

若要使用你已通过 Ollama、vLLM 或 LM Studio 提供的模型生成嵌入，请在 `ragmir.config.json` 中将 Ragmir 指向其兼容 OpenAI 的 API：

```json
{
  "embeddingProvider": "openai-compatible",
  "embeddingEndpoint": "http://localhost:11434/v1",
  "embeddingModel": "nomic-embed-text"
}
```

使用端点时，段落文本和查询会发送到该端点。对于机密源文件，请将端点保留在本机或你自己的服务器上。`rgr security-audit` 会在端点不是本地端点时发出警告。

## 回答：模型的三种运行位置

### 在你的机器上，使用 Ollama

当对话或脚本同样在本地运行时，没有任何内容会离开这台机器。首先，在 `~/.ollama/server.json` 中设置 `"disable_ollama_cloud": true` 以关闭 Ollama 的云端功能，然后重启 Ollama：仅使用 localhost 端点并不能证明推理在本地完成。

[本地 RAG 教程](/zh/local-rag/)完整演示了此方案。2026 年 11 月 27 日，在一台 Apple M3 Max 上，`gemma4:12b-it-qat`（在 Ollama 中的下载大小为 7.2 GB）根据 Ragmir 的段落作答，耗时 49 秒：

```bash
node answer.mjs "gemma4:12b-it-qat" "How do I run Ragmir on a server without internet access?"
```

一般来说，本地模型除了需要超出其下载大小的可用内存外，还需要为你发送的段落和问题留出空间。较小的模型回答更快，但会遗漏更多细微之处。

### 在你自己的服务器上

同一个脚本可以调用任何支持 chat completions 格式的端点，例如你自己运行的 vLLM 服务器。请通过运行时的密钥配置提供任何所需的密钥，然后设置聊天 URL 和已部署的模型：

```bash
LLM_API=chat-completions \
LLM_CHAT_URL=https://llm.example.org/v1/chat/completions \
node answer.mjs "your-deployed-model" "How is a release approved?"
```

问题和展开后的段落会通过网络发送到你的端点。部署、访问、传输、保留和日志均由你掌控。

### 在云服务商处

Claude Code、Codex、Cursor 和 Gemini CLI 等编程智能体会在你的机器上运行 Ragmir 的 MCP 服务器，然后把它们读取的段落发送给其服务商的模型。[集成页面](/zh/integrations/)介绍了每一种的设置方式。

应用程序也可以通过服务商的 SDK 实现同样的做法。[智能体集成指南](/docs/agent-integration/)中有一个 Claude 示例：三个段落和问题会到达 Anthropic 的 API，而索引和其他文档则留在 Ragmir 运行的地方。

## 你的文档去向

| 方案 | 证据流向何处 | 你可以掌控什么 |
| --- | --- | --- |
| 本地模型与本地对话，例如 Ollama | 当整个应用在本地运行且没有外部转发时，段落保留在本机 | 模型权重、聊天记录、日志、扩展以及机器访问权限 |
| 部署在你的服务器或租用云基础设施上的自托管模型 | 所选段落通过网络发送到你的推理端点 | 部署、访问控制、传输、日志、备份以及托管安排 |
| 托管模型 API 或云端智能体 | 所选段落通过所用的应用到达所选的服务商 | 源文件的选择和应用设置；服务商适用的数据政策同样重要 |

本地索引并不会让远程对话变成本地的。工具结果可能包含文档文本、引用、文件名和项目路径。Ragmir 会保留源文本，不做遮蔽。

## 文档到达云端模型之前

服务商接收的是你的智能体或应用发送的内容。Ragmir 不会强制执行服务商的政策，也不会对段落进行匿名化处理。在连接云端模型之前，请针对你实际使用的套餐和账户检查以下各点：

- **训练。** 服务商是否可以用你的提示词以及其中所含的段落来训练模型，以及某项设置或你的套餐是否会改变这一点。消费级聊天应用与企业或 API 套餐的默认设置可能不同。
- **保留期限。** 提示词、输出和日志保留多久，以及你的账户能否使用更短或零保留的选项。
- **地区。** 数据在何处处理和存储。
- **访问。** 谁可以读取这些段落：既包括服务商处，也包括你自己的技术栈中的代理和监控工具等。
- **范围。** 哪些源文件可以离开本机。请将其他文件排除在知识库之外，或为它们单独建立一个只供本地模型读取的知识库。

以上内容均不构成法律建议。请与负责文档合规的人员确认你的义务。

## 三种可行的方案

| 目标 | 检索 | 回答 | 离开机器的内容 |
| --- | --- | --- | --- |
| 完全离线 | `local-hash` 或预先准备好的语义模型 | 关闭云端功能的 Ollama | 无 |
| 私有基础设施 | 部署在你服务器上的 Ragmir | 你自行托管的模型，例如 vLLM | 段落发送到你自己的端点 |
| 最佳模型，本地索引 | 通过插件或 MCP 使用 Ragmir | 你的编程智能体所用的云端模型 | 智能体读取的段落 |

[离线 RAG 指南](/zh/air-gapped-rag/)介绍了无互联网访问的第一种方案，[自托管指南](/zh/self-hosted-rag/)介绍了在 VPS 或本地服务器上的第二种方案。

## 后续步骤

- [在你的机器上搭建本地 RAG](/zh/local-rag/)
- [在无互联网访问的环境中运行 RAG](/zh/air-gapped-rag/)
- [在 VPS 或本地服务器上自托管 RAG](/zh/self-hosted-rag/)
- [智能体集成：本地、自托管或云端](/docs/agent-integration/)
