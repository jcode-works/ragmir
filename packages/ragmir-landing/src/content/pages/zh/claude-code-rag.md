---
title: "Claude Code RAG：grep 还是本地索引，实测对比 | Ragmir"
description: "Claude Code 会使用 RAG 吗？默认不会，它用 grep 搜索并读取文件。我们用 89 个开发者问题测量这种初次检索，与 Ragmir 的 MCP 服务器对比，并说明如何加入 RAG。"
h1: "Claude Code 会使用 RAG 吗？grep 与本地索引的对比"
summary: "Claude Code 不保留代码索引。它先加载 CLAUDE.md，然后用 grep 和 find 搜索，边找边读取文件。在关于 Ragmir 仓库的 89 个问题上，grep 的初次检索在找到答案文件方面与 Ragmir 的 MCP 服务器大致相当。智能体读取一个答案所需内容的中位数为 71 KiB，通过 Ragmir 则不到 5 KiB。"
section: guide
setup: agents
translationKey: "claude-code-rag"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["integrations/claude-code", "rag-vs-mcp", "benchmarks", "agentic-rag"]
---

Claude Code 找上下文的方式与开发者在终端里的做法相同：列出文件，用 grep 搜索关键词，然后打开看起来相关的文件。当代码中的标识符与问题用词一致时，这种方式效果很好。

RAG 会在打开任何文件之前，先给出一份带排序和引用的候选列表。本页在相同问题上测量这两种初次检索的表现，并说明当候选列表值得时，如何加入 Ragmir。

## Claude Code 会使用 RAG 吗？

默认不会。Anthropic 把 Claude Code 描述为一种混合方案。`CLAUDE.md` 文件会被“简单地预先放入上下文”，而“glob 和 grep 等基本工具让它能够探索所在环境，并即时检索文件，从而有效规避索引过期和复杂语法树的问题”（[面向 AI 智能体的有效上下文工程](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)，Anthropic，2025 年 9 月 29 日）。

当前的[工具参考](https://code.claude.com/docs/en/tools-reference)补充了两个细节。在 macOS、Linux 和 WSL 上，Claude 默认通过 Bash 工具使用 `find` 和 `grep` 搜索。在 Windows 上，基于 ripgrep 构建的专用 Glob 和 Grep 工具仍是默认方式。它不构建也不查询嵌入索引。

这种设计有真正的优势：内容不会过期，精确的标识符每次都能找到，而且无需安装任何东西。它的代价体现在别处：智能体读取了多少内容，以及答案根本不在仓库里时会发生什么。

## Claude Code RAG 与 grep 的实测对比

我们用 Ragmir 公开问题集中的 89 个开发者问题进行测试。每个问题都列出了能回答它的全部文件。测试在 Ragmir 仓库中同样的 287 个受 Git 跟踪的文件上进行。我们还加入了 30 个与主题无关的问题和 40 个近领域问题，这些问题在仓库中都没有答案。

grep 一侧会对每个问题中三个字符及以上的词进行搜索，并去掉常见英文词。文件按包含这些词的数量排序。然后按此顺序整体打开文件，直到找到能回答问题的那个。

Ragmir 一侧运行其 MCP 服务器。先做默认搜索；需要时再做一次返回十条结果的搜索；最后展开一条答案引用。字节数统计的是模型读取的文本。

| 初次检索 | 答案位于前 3 | 答案位于前 10 | 找到答案所读取字节的中位数 | 正确拒答：无关问题 | 正确拒答：近领域问题 |
| --- | ---: | ---: | ---: | ---: | ---: |
| ripgrep，按问题词搜索，整体读取文件 | 85% | 100% | 71.4 KiB | 30 中 2 | 40 中 0 |
| Ragmir MCP，`local-hash`，不使用模型 | 82% | 99% | 4.7 KiB | 30 中 23 | 40 中 7 |
| Ragmir MCP，混合检索，使用 `mxbai-embed-xsmall-v1` | 87% | 100% | 4.8 KiB | 30 中 28 | 40 中 13 |

测量于 2026 年 11 月 27 日，使用提交 `10bb9f6` 中 Ragmir 6.20.0 的代码、ripgrep 15.2.0、Node.js 22 和一台 Apple M3 Max。命令为 `pnpm bench:first-pass`。方法见 [基准测试说明](https://github.com/jcode-works/ragmir/blob/main/packages/ragmir-core/benchmarks/README.md)，原始报告见 [first-pass-2026-11-27.json](/benchmarks/first-pass-2026-11-27.json)。

<figure>
  <img src="/guides/first-pass-chart.webp" alt="对比 grep 与 Ragmir MCP 服务器在 89 个开发者问题上初次检索表现的柱状图。前 3 名中的答案：grep 85%，Ragmir local-hash 82%，Ragmir 混合检索 87%。读取到答案所需文本的中位数：grep 71.4 KiB，Ragmir 为 4.7 和 4.8 KiB。30 个无关问题中正确拒答的数量：grep 2 个，Ragmir 23 和 28 个。" width="1440" height="1163" loading="lazy" decoding="async">
  <figcaption>与上表相同，但以图表形式呈现：排序结果相近，读取文本量与拒答数量则相差很大。</figcaption>
</figure>

数字说明了什么：

- **排序结果相近。** 在问题与文件共享词汇的仓库中，grep 每次都能把答案文件放进前 10 名。在这里，找到正确文件并不需要检索索引。
- **上下文成本则相差很大。** 找到答案时，grep 与整体文件读取的中位数为 71.4 KiB。这大约是紧凑引用加一个展开段落所用 4.7 到 4.8 KiB 的十五倍。在长任务中，这个差距就是智能体为实际工作保留的上下文窗口。
- **grep 很少会说“这里没有”。** 30 个无关问题中仍有 28 个匹配到部分文件，因此智能体在得出结论前还得先读它们。在这 30 个问题中，Ragmir 对其中 23 到 28 个没有返回任何结果。

这项测量有其局限。它只涵盖一个仓库、英文问题和纯文本文件。它还假定智能体在找到第一个能回答问题的文件时就会停止。

grep 无法搜索 PDF 或 Office 文件内部，因为它们的文本经过压缩，或以二进制格式存储。Ragmir 会从中提取文本，并引用页码、幻灯片或单元格。

在相信项目中的任何数字之前，请先用你自己的问题运行 `rgr evaluate`。

## 智能体式搜索与 RAG

两者并不互斥。连接 Ragmir 之后，Claude Code 仍然自行决定要查找什么。它像调用其他工具一样调用 `ragmir_search`，并展开它将要依据的那条引用。对于 grep 最擅长的事情，例如列出标识符的每次出现位置或匹配正则表达式，它仍然使用 grep。

检索只改变第一步。智能体不再打开文件逐个阅读，而是先阅读一份带排序和引用的候选列表，再打开其中一个段落。关于协议与检索如何配合，请参阅 [RAG 与 MCP](/zh/rag-vs-mcp/)；关于这一循环，请参阅 [智能体式 RAG](/zh/agentic-rag/)。

## 什么时候只用 Claude 就够，什么时候需要加入 RAG

Claude 可以通过三种方式访问你的文档。它们各自适合不同的任务。

| | 仅使用 Claude Code | Claude 应用中的项目 | 使用 Claude Code 或与 Ragmir 连接的对话 |
| --- | --- | --- | --- |
| 文档位于 | 你的仓库，在你的机器上 | 上传至 Anthropic | 在你的机器上；只有 Claude 读取的段落会离开本机 |
| 文本如何被找到 | 先用 grep，再读取整个文件 | 整个文件；当文件超出上下文窗口后，改用项目知识搜索 | 本地索引返回带排序和引用的段落 |
| PDF 与 Office 文件 | grep 无法搜索其内部 | 与其他文件一样上传 | 像文本一样搜索，并引用到页码、幻灯片或单元格 |
| 在本仓库中每次回答读取的文本 | 中位数为 71.4 KiB | 未测量 | 中位数为 4.7 到 4.8 KiB |
| 文档无法回答的问题 | 30 个中仍有 28 个被 grep 匹配到文件 | 未测量 | 30 个中有 23 到 28 个没有返回任何结果 |

“Claude 应用”一列的内容来自 Anthropic 帮助中心，阅读于 2026 年 11 月 27 日：在付费套餐中，当项目的知识接近上下文窗口时，项目会自动切换为检索模式，并且可容纳多达十倍的内容（[项目中的 RAG](https://support.claude.com/en/articles/11473015-retrieval-augmented-generation-rag-for-projects)）。

**仅使用 Claude Code**，适用于纯文本代码仓库，且问题使用代码自身词汇的情况，也适用于需要查找标识符每一次出现位置的情况。它不需要安装任何东西。

**使用 Claude 应用中的项目**，可以在付费套餐下，就你可以上传至 Anthropic 的文档进行对话，无需进行任何设置。

**加入 Ragmir**，适用于文档是 PDF、Office 文件或扫描件的情况，适用于文档必须留在本机的情况，适用于需要能逐行或逐页核对引用的情况，也适用于多个智能体和应用应共享同一索引的情况。若使用本地模型而非 Claude，则没有任何内容会离开本机：参见 [本地或云端 RAG](/zh/local-vs-cloud-rag/)。

## 如何为 Claude Code 加入 RAG

安装插件，然后为每个项目建立一次索引：

```text
/plugin install ragmir --marketplace jcode-works/ragmir
/ragmir:index docs/**/*.md specs/**/*.pdf src/**/*.ts
```

在终端中，以下两条命令执行相同的安装：

```bash
claude plugin marketplace add jcode-works/ragmir
claude plugin install ragmir@ragmir
```

在 Claude Code 2.1.329 中，它们输出了 `✔ Successfully installed plugin: ragmir@ragmir (scope: user)`。

该插件会针对当前打开的项目，运行从 npm 固定版本的 Ragmir 发布版本，无需账户或 API 密钥。[Claude Code 集成页面](/zh/integrations/claude-code/)介绍了不使用插件时的设置、索引的时效性以及各项限制。

## Codex 与 Cursor

同一个索引也可以服务其他编程智能体。Codex 使用以下命令安装插件：

```bash
codex plugin marketplace add jcode-works/ragmir
codex plugin add ragmir@ragmir
```

在 Cursor 插件市场收录该插件之前，Cursor 使用插件文件夹进行安装。

两者运行的是同一个 MCP 服务器，因此上面的数字同样适用于它们的初次检索。请参阅 [Codex](/zh/integrations/codex/) 和 [Cursor](/zh/integrations/cursor/) 页面。

## 后续步骤

- [为 Claude Code 添加插件](/zh/integrations/claude-code/)
- [全部基准测试及重新运行方法](/zh/benchmarks/)
- [RAG 与 MCP：协议与检索](/zh/rag-vs-mcp/)
- [智能体集成指南](/docs/agent-integration/)
