---
title: "Codex RAG over MCP：本地项目文档检索 | Ragmir"
description: "通过 Ragmir 插件或项目 MCP 服务器，让 OpenAI Codex 带引用地访问项目文档：安装，为项目建立一次索引，然后检索规格说明、ADR、PDF 和代码，并获得引用。"
h1: "如何让 Codex 访问项目文档"
summary: "将 Ragmir 插件添加到 OpenAI Codex，或在项目的 .codex/config.toml 中注册 Ragmir 的 MCP 服务器，然后为项目建立一次索引。此后 Codex 会通过本地工具检索你的规格说明、ADR、PDF 和代码，并为所用的每段内容附上引用。"
section: integration
setup: agents
translationKey: "integrations/codex"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["local-vs-cloud-rag", "integrations/claude-code", "mcp-rag-server", "docs/agent-integration"]
logo: "terminal"
group: "agents"
---

只需添加插件并为项目建立一次索引，Codex 就能带引用地检索它。

Codex 可以对少量文本文件执行 grep 和读取。Grep 只能匹配完全相同的词，无法搜索 PDF 或 Office 文件的内容。Ragmir 在你的机器上为你选定的文件建立索引，其 MCP 工具返回的段落会精确引用到行、页、幻灯片或单元格。

Codex 决定搜索什么、打开哪条引用，并用它自己的模型撰写回答。索引保存在项目中被 Git 忽略的 `.ragmir/` 文件夹里。默认检索不需要模型、GPU 或 API 密钥。

## 安装 Codex 插件

```bash
codex plugin marketplace add jcode-works/ragmir
codex plugin add ragmir@ragmir
```

在 2026 年 11 月 27 日使用 Codex CLI 0.172.0 时，这两条命令的输出如下（路径已缩短）：

```text
Added marketplace `ragmir` from https://github.com/jcode-works/ragmir.git.
Installed marketplace root: ~/.codex/.tmp/marketplaces/ragmir
Added plugin `ragmir` from marketplace `ragmir`.
Installed plugin root: ~/.codex/plugins/cache/ragmir/ragmir/1.7.5
```

插件将 MCP 服务器与检索和索引技能打包在一起。该服务器运行 npm 上一个固定版本的 Ragmir，并在工作区文件夹中启动。

为每个项目建立一次索引。可以使用内置的 `ragmir-index` 技能，也可以在项目根目录下运行以下命令：

```bash
npx --yes @jcode.labs/ragmir@6.20.0 init
npx --yes @jcode.labs/ragmir@6.20.0 sources add "docs/**/*.md" "specs/**/*.pdf" "src/**/*.ts"
npx --yes @jcode.labs/ragmir@6.20.0 ingest
```

## 或注册项目服务器

若不使用插件，请在项目中安装 Ragmir，并让 `rgr setup` 准备 Codex 辅助配置：

```bash
pnpm add -D @jcode.labs/ragmir
pnpm exec rgr setup --no-ingest --agents codex
pnpm exec rgr sources add "docs/**/*.md" "specs/**/*.docx" "src/**/*.ts"
pnpm exec rgr ingest
```

上述命令会写入 `.ragmir/codex-mcp.toml`， `.ragmir/agent-setup.md` 对其作了说明。将该辅助配置复制到项目的 `.codex/config.toml` 中，项目受信任后 Codex 即会加载它。

每个项目只选择一种方式。若在插件之外还运行 `rgr setup --agents codex`，会再注册一个服务器。

## 让服务器只作用于一个项目

避免使用 `~/.codex/config.toml`。在那里注册的服务器会为每个工作区提供来自同一基础的回答。在无关项目中运行的 Codex 会把本项目的文档当成它自己的文档来读取。

Codex 不共享 MCP roots。因此运行器会记录 Codex 启动服务器时所在的目录，并将其与基础目录比较。无关的工作区会在每个结果旁附带一条范围提示。若要直接拒绝，请在配置中设置 `mcpAllowedRoots`。

`rgr doctor` 会列出在 Codex 中注册的 Ragmir 服务器，并对为所有项目注册的服务器发出警告。

## 一次调用提出多个文档问题

文档问题通常成组出现。Codex 可以在 `queries` 中一次发送最多五个相关问题。它们共享同一个输出预算，并可以限定在指定的范围内：

```json
{ "queries": ["release approval", "rollback owner"], "scope": "docs", "maxBytes": 4096 }
```

被多个问题同时命中的段落只会出现一次。

当文档使用的措辞与问题不同时，Codex 可以把该 `query` 与 `searches` 一起发送：

- 它自己的关键词（`lex`）
- 一种改写（`vec`）
- 一个可能的答案（`hyde`）

这些内容会与原问题融合为一个排序结果。它们只用于重新排序和补充结果，绝不会把拒绝回答变成答案，因此空结果仍然表示文档中没有证据。

随后，Codex 用 `ragmir_expand` 读取它所依据的那条引用。

## 限制

- Codex 会把它读取的摘录发送给其模型提供方。索引保留在本地，但对话不在本地。
- Ragmir 无法使用 Codex 的模型进行自身排序。Codex 模型不生成嵌入向量，Codex 也不支持 MCP sampling。
- 插件需要本地文件，因此它运行在编程智能体中，而不是网页或移动端聊天应用中。
- 配置了本地 OCR 或其他外部提取器时，`ragmir_ingest` 会拒绝运行。请在终端中执行摄入：

  ```bash
  rgr ingest
  ```
- 每台工作站各自持有索引。请通过 Git 共享数据源，然后在每台机器上执行摄入：

  ```bash
  rgr ingest
  ```

## 后续步骤

- [Ragmir 的 MCP 服务器如何工作](/zh/mcp-rag-server/)
- [智能体集成指南](/docs/agent-integration/)
- [配置与范围](/docs/configuration/)
