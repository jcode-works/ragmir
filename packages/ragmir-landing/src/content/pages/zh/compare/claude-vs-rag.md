---
title: "Claude 或 Claude 搭配 Ragmir：何时添加本地 RAG | Ragmir"
description: "Claude 何时能独立从你的文件中给出好答案，何时本地 Ragmir 索引会有帮助：涉及 PDF 与 Office 文件、私密文档、可核对的引用以及上下文窗口。二者的差别在于读取量、可搜索的文件，以及文档的去向。"
h1: "仅用 Claude，还是 Claude 搭配 Ragmir：何时添加本地索引"
summary: "Claude 本来就能读取你的文件：Claude Code 会用 grep 搜索代码仓库，Claude 应用中的项目则会搜索你上传的内容。当这些方式力有不逮时，Ragmir 会添加一个带精确引用的本地索引：例如代码仓库中的 PDF 与 Office 文件、必须留在你机器上的文档、需要核对的引用，以及上下文很重要的长任务。"
section: comparison
setup: agents
translationKey: "compare/claude-vs-rag"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["claude-code-rag", "local-vs-cloud-rag", "integrations/claude-code", "benchmarks"]
---

Claude 读取文件并不需要 Ragmir。使用 Ragmir 改变的是：Claude 为找到正确段落需要读取多少内容，它究竟能搜索哪些文件，以及你的文档在途中会去往何处。

## Claude 接触你文档的三种方式

| | 仅 Claude Code | Claude 应用中的项目 | Claude 搭配 Ragmir |
| --- | --- | --- | --- |
| 设置 | 无需安装 | 将文件上传到项目 | 安装 Ragmir，建立一次索引，然后通过 MCP 或插件连接 |
| 如何查找文本 | grep 与 find，然后读取整文件 | 整文件；一旦超出上下文窗口，则使用项目知识搜索 | 本地索引返回带引用的排序段落 |
| PDF、Office 文件、扫描件 | grep 无法搜索其内部 | 与任何文件一样上传 | 像文本一样搜索，引用到页、幻灯片或单元格；扫描件通过本地 OCR 处理 |
| 文档去往何处 | Claude 在你的机器上读取文档，并将其读取的内容发送给其模型提供方 | 上传至 Anthropic | 索引保留在你的机器上；Claude 只接收它所读取的段落 |
| 每次回答读取的文本 | 使用 grep 首轮扫描时，中位数为 71.4 KiB | 未测量 | 中位数为 4.7 至 4.8 KiB |
| 文档未能回答的问题 | 30 个中有 28 个，grep 仍然匹配到了文件 | 未测量 | 30 个中有 23 至 28 个不返回任何结果 |

表中实测的数据来自 Ragmir 自身代码仓库中的 89 个开发者问题，于 2026 年 11 月 27 日进行；[Claude Code 与 RAG](/zh/claude-code-rag/)一文包含方法和完整结果。项目一列的信息来自 Anthropic 帮助中心，同日查阅：在付费方案中，当项目的知识接近上下文窗口时，项目会自动切换为检索（[项目的 RAG](https://support.claude.com/en/articles/11473015-retrieval-augmented-generation-rag-for-projects)）。

## 何时仅使用 Claude

- 文档是代码仓库中的文本文件，并且问题使用的是代码中的词汇。grep 的首轮扫描使全部 89 个问题的答案文件都进入了前 10。
- 你需要某个标识符的每一次出现，或正则表达式的每一处匹配。这正是 grep 的工作。
- 你只是在 Claude 项目中，就几份可以自由上传的文档进行对话，无需任何设置。

## 何时添加 Ragmir

- 答案位于 PDF、Word、PowerPoint、Excel 或扫描件中，而这些内容 grep 无法读取。
- 文档必须留在你的机器或服务器上，并且只有 Claude 读取的段落可以离开它。
- 你需要可以核对的引用：一行、一个 PDF 页面、一张幻灯片或一个单元格。
- 长任务需要把上下文窗口用于工作本身，而不是用于途中读取的整文件。
- 多个工具应共享同一个索引：Claude Code、Codex、Cursor、会启动本地 MCP 服务器的桌面聊天，或调用 Claude API 的你自己的代码。
- Claude 应当能够说明文档并未涵盖某个问题，而不是基于最接近的文件作答。

## 哪些内容会离开你的机器

使用 Ragmir 时，索引与检索都在 Ragmir 运行的地方进行。Claude 仍然是云端模型：你的问题以及它读取的段落会到达其提供方。在连接机密文档之前，请确认你的方案允许如何使用对话进行训练，以及对话会保留多长时间。

[本地或云端指南](/zh/local-vs-cloud-rag/)列出了需要检查的事项，并说明如何改用本地模型作答，从而确保没有任何内容离开机器。

## 后续步骤

- [Claude Code 是否使用 RAG？实测结果](/zh/claude-code-rag/)
- [为 Claude Code 添加 Ragmir 插件](/zh/integrations/claude-code/)
- [本地或云端 RAG：模型、硬件与你的数据](/zh/local-vs-cloud-rag/)
- [所有基准测试及其复现方法](/zh/benchmarks/)
