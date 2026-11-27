---
title: "Claude Code RAG 插件：带引用的本地检索 | Ragmir"
description: "用 Ragmir 插件为 Claude Code 添加 RAG：安装插件，在每个项目中运行一次 /ragmir:index 建立索引；检索结果会引用到具体的代码行、PDF 页、幻灯片或单元格，索引留在你的机器上。"
h1: "如何为 Claude Code 添加 RAG"
summary: "一条命令安装 Ragmir 插件，然后在每个项目中运行一次 /ragmir:index。之后 Claude Code 即可检索你的代码、规格说明、PDF 和 Office 文件，并把每段内容引用到具体的行、页、幻灯片或单元格，而索引始终保存在你的机器上。"
section: integration
setup: agents
translationKey: "integrations/claude-code"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["compare/claude-vs-rag", "local-vs-cloud-rag", "mcp-rag-server", "docs/agent-integration"]
logo: "claude"
group: "agents"
---

安装 Ragmir 插件，为项目建立一次索引，Claude Code 就能带引用地检索它。

Claude Code 会读取文件并运行 grep，这在少量文本文件上可行。插件为你选定的文件建立索引，索引在你的机器上生成。MCP 工具返回的段落会精确引用到具体的行、PDF 页、幻灯片或电子表格单元格。

插件包含三部分：

- `/ragmir:index` 命令
- 检索技能（`/ragmir:ragmir`）
- 一个 MCP 服务器，提供五个只读工具和 `ragmir_ingest`

该服务器会运行 npm 上一个固定版本的 Ragmir，作用于 Claude Code 打开的项目。无需账号、API 密钥或托管存储。

## 安装 Claude Code RAG 插件

1. 安装插件：

   ```text
   /plugin install ragmir --marketplace jcode-works/ragmir
   ```

   在终端中，同样的安装需要两条命令。2026 年 11 月 27 日使用 Claude Code 2.1.329 时，它们的输出如下：

   ```text
   $ claude plugin marketplace add jcode-works/ragmir
   ✔ Successfully added marketplace: ragmir (declared in user settings)
   $ claude plugin install ragmir@ragmir
   ✔ Successfully installed plugin: ragmir@ragmir (scope: user)
   ```

2. 在每个项目中，为 Claude 可能读取的来源建立索引：

   ```text
   /ragmir:index docs/**/*.md specs/**/*.pdf src/**/*.ts
   ```

   不带参数时，Claude 会先提议来源，并在建立索引前询问你。

3. 每次新增来源后，重新运行索引命令：

   ```text
   /ragmir:index
   ```

你也可以在项目根目录下手动建立相同的索引：

```bash
npx --yes @jcode.labs/ragmir@6.20.0 init
npx --yes @jcode.labs/ragmir@6.20.0 sources add "docs/**/*.md" "specs/**/*.pdf" "src/**/*.ts"
npx --yes @jcode.labs/ragmir@6.20.0 ingest
```

在使用插件的项目中，请跳过 `rgr setup --agents claude`，它会再注册一个项目级服务器。不使用插件时，才需要运行该命令作为替代方案。

Claude Code 只有在你批准后，才会启动 `.mcp.json` 中声明的服务器。批准之前， `rgr doctor` 会报告 `approval=pending`。

## Claude Code 相比 grep 和文件读取增加了什么

| | 仅 Claude Code | 使用 Ragmir |
| --- | --- | --- |
| PDF、Office 文件、扫描件 | 逐个打开；grep 无法搜索其中的内容 | 一次建立索引，扫描件可通过可选的本地 OCR 处理，每段内容引用到行、页、幻灯片或单元格 |
| 不同的措辞 | 只有完全相同的词才能匹配 | 一次检索最多融合五种改写，并提示哪些词在任何文件中都不存在 |
| 上下文窗口 | 整个文件，每次会话都要重新读取 | 默认每次调用返回三条精简引用，且不超过 32 KB；已见过的段落以单行存根返回 |
| 文档中没有的内容 | 部分匹配仍可能被当作答案 | 证据不足时不返回任何内容 |

在小型代码仓库中，Claude Code 自带的搜索通常已经够用。需要列出每一处出现位置或匹配正则表达式时， grep 仍是合适的工具。Ragmir 返回的则是按相关性排序的段落。

## 一次检索，展开其中一条引用

本次会话于 2026 年 11 月 27 日运行，使用 npm 上的 Ragmir 6.20.0。项目是干净的，包含 Ragmir `docs/` 文件夹中的十一份指南（11 个文件，256 个分块，不到一秒完成索引）。返回结果为 JSON。下面各行保留了引用和标题。

```text
ragmir_search({ query: "How do I run Ragmir on a server without internet access?" })
  [1] docs/server-deployment.md:L123-L138#8  Run Ragmir on a server > Without internet access
  [2] docs/docker.md:L96-L105#5              Run Ragmir with Docker > Servers and CI
  [3] docs/python.md:L211-L218#12            Use Ragmir from Python > Without Node.js
  3 compact citations, 2,244 bytes of text

ragmir_expand({ citation: "docs/server-deployment.md:L123-L138#8" })
  ## Without internet access
  Build the image where the npm registry is reachable, then move it with `docker save` and
  `docker load`, or install from your internal npm mirror. At runtime, `local-hash` makes no
  network call: the container above ingests and searches with `--network none`.
  [...]
  one passage, 2,295 bytes of text
```

Claude 读取了 4.5 KB 才找到答案及其来源的行范围。若完整打开这三个被引用的文件，则需要 22 KB。

在较长的任务中，已经返回过的段落会以简短的 `seen` 存根形式出现，之后的检索会把预算用于新的证据。

若只针对一个问题，可以使用插件的 `answer` 提示词（`/mcp__plugin_ragmir_ragmir__answer`）。它会要求 Claude 为每项论断附上引用，并在文档中没有证据时明确说明。

## 保持知识库最新

若结果所对应的文件在建立索引后发生了变化，该结果会带有 `sourceStatus`。此时 Claude 可以调用 `ragmir_ingest`。它只读取新增和已变化的文件。在新索引通过校验之前，旧索引仍可检索。

要在提交、合并和切换分支后刷新索引，请在项目根目录下运行：

```bash
npx --yes @jcode.labs/ragmir@6.20.0 hooks install
```

## 限制

- 插件需要本地文件。它运行在 Claude Code 中，而不是 Claude 网页版、桌面应用或移动应用的聊天中。
- Ragmir 只返回证据，由 Claude 撰写答案。Claude 读取的摘录会发送给其模型提供方，因此本地索引并不会让对话变为本地的。
- Ragmir 无法借用 Claude 的模型进行自身排序。Claude 模型不生成嵌入向量， Claude Code 也不支持 MCP sampling。
- 配置了本地 OCR 或其他外部提取器时，`ragmir_ingest` 会拒绝运行。请改为在终端中执行摄入。
- 没有文档预览界面。引用直接指向文件本身。

## 后续步骤

- [Ragmir 的 MCP 服务器如何工作](/zh/mcp-rag-server/)
- [智能体集成指南](/docs/agent-integration/)
- [支持的格式](/docs/supported-formats/)
- [Codex 的同款设置](/zh/integrations/codex/)
