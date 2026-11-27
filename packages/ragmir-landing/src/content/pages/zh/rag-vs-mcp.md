---
title: "RAG 与 MCP：区别、Token 用量与同时使用 | Ragmir"
description: "RAG 与 MCP 并不相同：MCP 把智能体连接到工具，而检索决定返回哪些文本以及每段有多长。本文说明二者如何协同工作，解释哪些因素决定 token 用量，以及 Ragmir 如何限制每次调用的返回内容。"
h1: "RAG 与 MCP 是同一回事吗？能否同时使用？"
summary: "不是。MCP 是智能体调用工具所用的协议。RAG 从你的数据源中检索段落，让模型基于这些段落作答。当 MCP 服务器提供检索时，二者可以协同工作，此时决定有多少文本送达模型的是检索，而不是协议。"
section: guide
setup: agents
translationKey: "rag-vs-mcp"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["mcp-rag-server", "rag-citations", "local-rag", "integrations/claude-code"]
---

RAG 与 MCP 是两回事。MCP 是一种协议，而 RAG 是一种模式，MCP 服务器可以承载这种模式。

MCP，即 Model Context Protocol（模型上下文协议），规定了 Claude Code、Codex 或 Cursor 等客户端如何发现服务器暴露的工具、调用这些工具并接收结果。它不决定工具返回哪些文本，也不决定文本有多长。

RAG，即检索增强生成，负责找出能回答问题的段落。随后，模型基于这些段落写出答案。

Ragmir 是一个检索层，你既可以通过 MCP 使用，也可以不经 MCP 使用。它的 MCP 服务器、`rgr` CLI、TypeScript、Python、LangChain 和 LlamaIndex 读取的是同一个索引，返回的引用也完全相同。

## RAG 与 MCP 是同一回事吗？

不是。二者工作在不同的层级：

| | MCP | 检索（RAG） |
| --- | --- | --- |
| 它是什么 | 客户端与工具服务器之间的协议 | 对你的数据源建立的索引，以及其上的检索步骤 |
| 它决定什么 | 工具如何被列出、调用和应答 | 返回哪些段落、返回多少条，以及每条有多长 |
| 缺少另一方时 | MCP 工具不一定需要检索文档 | Ragmir 也可以通过 CLI、TypeScript 和 Python 运行 |

## RAG 与 MCP 能否同时使用？

能。MCP 服务器可以把检索暴露为工具，由智能体决定何时调用。

Ragmir 的服务器通过 stdio 运行。它已在 MCP Registry 中登记为 `io.github.jcode-works/ragmir`，并暴露六个工具：

- `ragmir_search`、`ragmir_expand`、 `ragmir_sources`、`ragmir_status` 和 `ragmir_audit` 均为只读。
- `ragmir_ingest` 刷新索引，并且只写入 Ragmir 自己的私有索引。

智能体先检索，展开其所需的那一个段落，必要时再次检索。下文测量的会话正是这种模式：一次检索，再一次展开。智能体自己的模型阅读证据并写出答案，Ragmir 只返回证据。

为 Claude Code、Codex 或 Cursor 安装插件，或设置项目级 MCP 服务器：

```bash
rgr setup --agents claude,codex
```

请按项目注册 Ragmir，切勿为所有项目统一注册。

## RAG 与 MCP 的 token 用量

决定工具返回多少内容的不是协议，而是背后的服务器。一个整文件返回的工具，会让上下文被整文件占满。 Ragmir 对每次调用的返回内容设定了上限：

- `ragmir_search` 默认每个问题最多返回三条精简引用，每条都是一段摘录，从包含问题关键词的那几行开始。
- 每次响应都不超过 `mcpMaxOutputBytes`，默认为 32,768 字节，且绝对上限为服务器 1 MiB。调用方可以通过 `maxBytes` 要求更少的内容， `_meta["ragmir/output"]` 会报告任何被裁剪的部分。
- `queries` 中最多五个相关问题共用同一份预算，被多个问题命中的段落只出现一次。
- 会话中已经返回过的段落，会以简短的 `seen` 占位形式再次返回（包含引用、路径和证据 ID），且不计入 `topK`。
- 智能体只展开它将要依赖的内容：`ragmir_expand` 返回一条引用的完整文本及其有界的相邻段落，或在同一预算内最多返回五条引用。
- 当证据较弱时，检索不返回任何结果，因此一个无关问题的代价只是一个空结果。

```json
{ "queries": ["release approval", "rollback owner"], "scope": "docs", "maxBytes": 4096 }
```

| | 智能体读取文件 | 智能体调用 Ragmir |
| --- | --- | --- |
| 上下文窗口 | 整文件，每个新会话都要重新读取 | 默认三条精简引用，每次调用的预算为 32 KB；已见过的段落以单行占位形式返回 |
| 发送给模型的内容 | 智能体打开的所有内容 | 仅有精简摘录，以及智能体展开的段落 |

### 一个问题的实测结果

2026 年 11 月 27 日，一次针对 Ragmir 6.20.0 的智能体会话在索引了 Ragmir 自身 `docs/` 文件夹中的十一份指南后，提出一个问题，并展开了第一条引用：

```text
ragmir_search({ query: "How do I run Ragmir on a server without internet access?" })
  [1] docs/server-deployment.md:L123-L138#8  Run Ragmir on a server > Without internet access
  [2] docs/docker.md:L96-L105#5              Run Ragmir with Docker > Servers and CI
  [3] docs/python.md:L211-L218#12            Use Ragmir from Python > Without Node.js
ragmir_expand({ citation: "docs/server-deployment.md:L123-L138#8" })
  ## Without internet access
  Build the image where the npm registry is reachable, then move it with `docker save` [...]
```

| 智能体读取的内容 | 字节数 |
| --- | ---: |
| `ragmir_search` 的回复：三条精简引用 | 2,244 |
| `ragmir_expand` 的回复：它所依赖的那一个段落 | 2,295 |
| 通过 Ragmir 读取的总量 | 4,539 |
| 若改为整体读取这三个被引用的文件 | 22,014 |

在关于整个 Ragmir 代码仓库的 89 个开发者问题中，同样的模式依然成立。 [首轮基准测试](/zh/benchmarks/)展示了智能体分别使用 grep 和 Ragmir 时读取的字节数。

预算以字节而非 token 计量，且属于 MCP 服务器。直接调用库的应用会获得其请求的至多 `topK` 个段落。它自行根据模型的上下文窗口来确定证据的规模。

## 何时使用 RAG、MCP 或两者

- **智能体自带的工具**在小型代码仓库中通常已经足够。若要列出所有出现位置或匹配正则表达式， grep 仍是首选工具。
- **通过 MCP 检索**适合 MCP 客户端（Claude Code、Codex、 Cursor、Gemini CLI、Qwen Code，或任何通过 stdio 连接的客户端）。当智能体需要从数百份 PDF、Office 文件或扫描件中获取答案，或者需要从措辞与问题不同的文档中获取答案时，它会很有帮助。
- **不经 MCP 的检索**适合应用或流水线。`createRagmirClient()`、 LangChain.js 检索器以及 Python 包读取的是同一个索引。
- **仅远程的聊天**需要它自己的连接器，或调用该库的应用。Ragmir 没有内置 HTTP 服务器，而 Ollama 等模型端点本身并不会连接到 MCP 服务器。

## 后续步骤

- [将 Ragmir 用作 MCP RAG 服务器](/zh/mcp-rag-server/)
- [Claude Code 集成](/zh/integrations/claude-code/)
- [智能体集成指南](/docs/agent-integration/)
- [RAG 引用](/zh/rag-citations/)
