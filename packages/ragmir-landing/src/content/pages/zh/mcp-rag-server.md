---
title: "RAG MCP 服务器：带精确引用的本地搜索 | Ragmir"
description: "什么是 RAG MCP 服务器，Ragmir 本地服务器提供哪些工具以及有哪些限制，Claude Code、Codex 和 Cursor 如何启动它，还有比较不同服务器时可参考的五项标准。"
h1: "面向代码与文档的本地 RAG MCP 服务器"
summary: "RAG MCP 服务器为 AI 智能体提供对文档索引的搜索工具。Ragmir 的服务器通过 stdio 在你的机器上运行，并为代码、Markdown、PDF 和 Office 文件建立索引。每次搜索都会在 32 KB 的预算内返回三条紧凑引用，因此智能体只展开它所需要的段落。"
section: guide
setup: agents
translationKey: "mcp-rag-server"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["local-vs-cloud-rag", "integrations", "integrations/claude-code", "docs/agent-integration"]
---

RAG MCP 服务器为智能体提供搜索索引的工具。智能体发送一个问题，并取回排好序的段落。之后，由它决定接下来读取什么。

Ragmir 的服务器从 `rgr ingest` 在项目被 Git 忽略的 `.ragmir/` 文件夹中建立的索引中作答。它以本地进程的形式通过 stdio 运行，没有 HTTP 端口、账户或托管存储。默认的 `local-hash` 检索不需要模型、GPU 或 API 密钥。

它也可以作为你自己文档的 MCP 文档服务器使用：规格说明、架构决策、运维手册和 API 描述都保留在仓库中，智能体就在它们所在的位置进行搜索。

服务器负责检索并提供引用。智能体则使用你选择的模型进行规划、推理和写作。

## 服务器提供的功能

| 工具 | 用途 | 作用 |
| --- | --- | --- |
| `ragmir_status` | 检查就绪状态、新鲜度、范围和限制 | 只读 |
| `ragmir_search` | 为一个问题或最多五个相关问题查找带引用的段落 | 只读 |
| `ragmir_expand` | 读取一条引用及其相邻内容，或逐页浏览一份文档 | 只读 |
| `ragmir_sources` | 按文件夹或通配符列出已索引的文档 | 只读 |
| `ragmir_audit` | 查找缺失、过期、不受支持或重复的源文件 | 只读 |
| `ragmir_ingest` | 文件变更后刷新索引 | 仅写入 Ragmir 的私有索引 |

有三个提示词供不加载技能的客户端使用：

- `answer` 要求每个论断都附上引用；当文档中没有证据时，则给出明确的说明。
- `compile-source` 将一个源文件转换为带引用的 Markdown 页面。
- `audit-knowledge` 针对知识审计发现的问题提出修复建议。

两个有界资源 `ragmir://context` 和 `ragmir://sources` 用于描述知识库。服务器的说明和工具描述会指明它所服务的知识库。

### 紧凑引用，然后展开一次

默认情况下，每个问题的搜索最多返回三条紧凑引用。每条引用包含：

- 引用本身；
- 从包含问题词语的行开始的摘录；
- 当支持证据较少时的 `weakEvidence`；
- 当被引用的文件在建立索引后发生变化时的 `sourceStatus`。

<figure>
  <img src="/guides/inspector-search.webp" alt="MCP Inspector 2.16.0 运行 ragmir_search，问题为“How do I run Ragmir on a server without internet access?”。结果列出 docs/server-deployment.md:L1-L8#0 和 docs/docker.md:L98-L107#5，每条都带有标题路径、摘录和行范围。" width="1400" height="908" loading="lazy" decoding="async">
  <figcaption>在 MCP Inspector 2.16.0 中调用 <code>ragmir_search</code>，针对的是 Ragmir 6.20.0 提供的一个 Markdown 指南文件夹和一个 PDF。该调用耗时 169 ms。</figcaption>
</figure>

单次调用的输出不超过 `mcpMaxOutputBytes`，默认为 32 KB。`_meta["ragmir/output"]` 会报告任何截断情况。会话中已返回过的段落会以简短的 `seen` 占位形式返回，因此下一次搜索会把预算用在新的证据上。

之后，智能体会对它将要依据的那一条引用调用 `ragmir_expand`。该工具返回已索引的段落，附带有限数量的相邻内容，以及一个 `nextCitation`，用于逐个窗口地读取长文档。

当证据较弱时，搜索不返回任何结果。此时，智能体可以说明文档并未涵盖该问题。

## 同一索引中的 PDF 与 Markdown

引用遵循各自的格式，因此同一台服务器可以从 Markdown、PDF、Office 文件和代码中作答：

- `docs/runbook.md:L12-L18#3` 引用行号。
- `contracts/msa-acme-2026.pdf:p7#3` 引用 PDF 页码。
- 其他格式使用幻灯片、工作表与单元格、EPUB 书脊或具名章节的坐标。

Markdown 段落携带其标题路径，`ragmir_sources` 会列出每个页面前置元数据（front matter）中的标题和描述。超过 900 种扩展名和文件名无需额外安装即可建立索引。

扫描页面需要本地 OCR 引擎，请使用以下命令启用：

```bash
rgr ocr setup
```

`rgr audit --unsupported` 会列出被跳过的内容。

## 各客户端如何启动它

Claude Code、Codex、Cursor、Gemini CLI 和 Qwen Code 以插件或扩展的形式安装 Ragmir，而 `rgr setup --agents kimi,opencode,cline` 为 Kimi、OpenCode 和 Cline 做好准备。每个客户端的确切步骤见[集成页面](/zh/integrations/)。

插件和扩展会针对智能体当前打开的项目，运行从 npm 固定版本的 Ragmir 发布版本。其他支持通过 stdio 使用 MCP 的客户端，可采用以下条目，并按其文档中的格式进行调整：

```json
{
  "mcpServers": {
    "ragmir": {
      "command": "node",
      "args": ["/absolute/project/.ragmir/run.cjs", "serve-mcp"],
      "env": { "RAGMIR_PROJECT_ROOT": "/absolute/project" }
    }
  }
}
```

请按项目注册服务器，可使用已提交的 `.mcp.json`，或 Codex 的 `.codex/config.toml`。若为每个项目都注册同一服务器，则它会用同一个知识库回答无关工作区的问题。`rgr doctor` 会在 Claude Code 和 Codex 中对此类注册发出警告，而 `mcpAllowedRoots` 会拒绝这些工作区。

MCP Registry 将该服务器列为 `io.github.jcode-works/ragmir`。

## 数据去向

解析、索引和搜索都保留在运行 Ragmir 的机器上，且不进行任何遥测。

离开机器的内容取决于所用的智能体。云端编程智能体会把它读取的摘录发送给其模型服务商。本地模型则将它们保留在机器上。

Ragmir 会保留源文本而不做遮蔽，因此选择源文件时请考虑这一路径。`.env` 文件、密钥和证书永远不会进入索引。服务器没有身份验证或按用户过滤功能，因此若将服务器开放给多人使用，由托管方负责访问控制。

## 如何选择最佳的 RAG MCP 服务器

没有哪个服务器适合所有项目，但有五项标准可以区分它们。最后一列仅针对 Ragmir 6.20.0，依据其文档填写，以便你可以向其他服务器提出相同的问题。

| 标准 | 需要检查什么 | Ragmir |
| --- | --- | --- |
| 本地运行 | 建立索引或搜索是否需要账户、API 密钥、托管索引或嵌入 API | 一个本地 stdio 进程；无需账户或 API 密钥；`local-hash` 不需要模型 |
| 已索引的格式 | 它解析哪些文件，扫描件能否处理，以及被跳过的文件是否会报告 | 900 多种扩展名和文件名；启用时支持本地 OCR；被跳过的文件由 `rgr audit --unsupported` 列出 |
| 引用粒度 | 结果只指明文件，还是指明智能体可以重新打开的行、页、幻灯片或单元格 | 行、PDF 页、幻灯片、工作表与单元格范围、EPUB 书脊条目、导出对象 |
| 输出预算 | 默认结果数量、每次调用的大小上限，以及是否报告截断 | 三条紧凑引用，每次调用 32 KB（`mcpMaxOutputBytes`），上限 1 MiB，截断情况记录在 `_meta["ragmir/output"]` 中 |
| 许可证 | 服务器的许可证以及任何商业授权选项 | AGPL-3.0-only；JCode Works 提供商业许可 |

然后，提出一个你的文档无法回答的问题。一个在这种情况下什么也不返回的服务器，会让智能体直接说明这一点，而不是根据最接近的段落作答。可用 Ragmir 的 `rgr evaluate` 在你自己的黄金数据集上测量这一比率。

## 后续步骤

- [为 Claude Code 添加插件](/zh/integrations/claude-code/)
- [智能体集成指南](/docs/agent-integration/)
- [本地或云端 RAG：每种方案发送的内容](/zh/local-vs-cloud-rag/)
- [支持的格式](/docs/supported-formats/)
