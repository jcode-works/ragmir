---
title: "Cursor RAG MCP：带引用地搜索文档 | Ragmir"
description: "通过插件文件夹或 .cursor/mcp.json 将 Cursor 连接到 Ragmir 的本地 MCP 服务器，然后使用路径过滤器带引用地检索文档、PDF 和代码，每条结果都附带引用。"
h1: "Cursor RAG MCP：带引用地搜索你的文档"
summary: "Cursor 的智能体可以调用 Ragmir 的本地 MCP 服务器，检索项目的文档、代码、PDF 和 Office 文件。安装 Ragmir 插件文件夹，或在 .cursor/mcp.json 中添加一条配置，为项目建立索引后，每条结果都会附带引用。"
section: integration
setup: agents
translationKey: "integrations/cursor"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["local-vs-cloud-rag", "mcp-rag-server", "integrations/claude-code", "docs/agent-integration"]
logo: "cursor"
group: "agents"
---

将 Cursor 连接到 Ragmir 的 MCP 服务器，为项目建立一次索引，智能体即可带引用地检索它。

智能体检索的是你选定文件的本地索引，其中包括 grep 无法搜索内容的 PDF、Word 文件和幻灯片。每条结果都附有指向具体行、页、幻灯片或电子表格单元格的引用。智能体在依赖某段内容之前，可以先展开该引用。

Cursor 决定何时检索以及打开哪条引用，Ragmir 负责检索并给出引用。索引保存在你机器上项目中被 Git 忽略的 `.ragmir/` 文件夹里。

## 安装 Cursor 插件

仓库中的 `plugins/ragmir` 是唯一的插件，附带 Cursor 的清单文件。它将 MCP 服务器与检索和索引技能打包在一起，该服务器运行 npm 上一个固定版本的 Ragmir。

在 Cursor 插件市场上架之前，请将仓库中的 `plugins/ragmir` 文件夹复制到 `~/.cursor/plugins/local/ragmir`。

然后为每个项目建立一次索引。可以使用内置的 `ragmir-index` 技能，也可以在项目根目录下运行以下命令：

```bash
npx --yes @jcode.labs/ragmir@6.20.0 init
npx --yes @jcode.labs/ragmir@6.20.0 sources add "docs/**/*.md" "specs/**/*.pdf" "src/**/*.ts"
npx --yes @jcode.labs/ragmir@6.20.0 ingest
```

## 或在 .cursor/mcp.json 中添加条目

在项目中安装 Ragmir 后，`rgr setup` 会在 `.ragmir/` 下写入一个本地运行器：

```bash
pnpm add -D @jcode.labs/ragmir
pnpm exec rgr setup --no-ingest
pnpm exec rgr sources add "docs/**/*.md" "specs/**/*.docx" "src/**/*.ts"
pnpm exec rgr ingest
```

然后将以下条目添加到项目的 `.cursor/mcp.json` 中，并把 `/absolute/project` 替换为项目根目录：

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

运行器会从项目文件夹向上查找，以定位项目已安装的 Ragmir 包。它需要 Node.js 22.12 或更高版本。

没有 Node.js 时，[Docker 指南](/docs/docker/)提供相同的条目。它使用 `docker` 作为命令，并使用官方镜像 `ghcr.io/jcode-works/ragmir`。

## 检查连接

1. 重新加载 Cursor，若 Cursor 询问，请批准该服务器。
2. 让智能体调用 `ragmir_status`。它会返回基础名称、其根目录，以及是否已就绪。
3. 提出一个来源能够回答的问题。智能体会运行一次 `ragmir_search`，请检查它返回的引用。

## 日常使用

在 Cursor 的智能体聊天中提问，当答案必须来自项目文件时，请点名 Ragmir。以下请求涵盖大多数日常场景。

### 用引用的来源回答问题

```prompt
使用 Ragmir：我们如何回滚失败的发布？请引用每个步骤所依据的文件和行。
```

智能体会检索，展开它所依据的引用，并以 `docs/release.md:L40-L58` 这样的引用作答。

### 只搜索某个文件夹或某种文件类型

```prompt
使用 Ragmir，只搜索 specs/ 下的 PDF：合同承诺的响应时间是多少？
```

该文件夹或 glob 会成为 `includePaths`，因此代码和其他文档不会与合同相互干扰。

### 修改前检查文档

```prompt
修改重试策略之前，使用 Ragmir 查找文档和决策记录中关于重试的内容，并列出该改动会与哪些内容相矛盾。
```

### 按顺序阅读长文档

```prompt
通过 Ragmir 从头读取 docs/migration.md，列出每个破坏性变更及其引用。
```

智能体会展开第一段摘录，并沿着 `nextCitation` 逐个窗口读取，而不是一次性加载整个文件。

### 编辑后刷新

```prompt
我更新了 docs/release.md。请刷新 Ragmir 索引，然后重新回答。
```

智能体会调用 `ragmir_ingest`，它只读取新增和变更的文件。在新索引通过校验之前，旧索引仍可检索。

## 从 Cursor 检索文档

路径过滤器可以让文档问题不涉及代码。`includePaths` 和 `excludePaths` 接受文件夹、文件或 glob。 `["docs"]` 会检索 `docs/` 下的全部内容，`["**/*.pdf"]` 则只检索 PDF 文件。

命名范围可以省去智能体重复写路径的麻烦。在 `ragmir.config.json` 中定义它：

```json
{
  "scopes": {
    "docs": { "includePaths": ["docs", "README.md"], "description": "Product documentation" }
  }
}
```

服务器会在其说明中列出范围名称及描述，因此 Cursor 的智能体可以传入 `scope: "docs"`。

对于长文档，带有 `outline: true` 的 `ragmir_sources` 会列出每个标题，以及其第一段的引用。 `ragmir_expand` 会跟随 `nextCitation`，逐窗口地阅读整份文档。

## 限制

- Cursor 会把其智能体读取的摘录发送给它所使用的模型。索引保留在本地，但对话不在本地。
- 插件需要本地文件，因此它运行在编程智能体中，而不是网页或移动端聊天应用中。
- Ragmir 没有按用户划分的访问控制。每台工作站各自构建索引。请通过 Git 共享数据源，然后在每台机器上执行摄入：

  ```bash
  rgr ingest
  ```
- 配置了本地 OCR 或其他外部提取器时，`ragmir_ingest` 会拒绝运行。请在终端中执行摄入：

  ```bash
  rgr ingest
  ```

## 后续步骤

- [Ragmir 的 MCP 服务器如何工作](/zh/mcp-rag-server/)
- [使用 Docker 运行 Ragmir](/docs/docker/)
