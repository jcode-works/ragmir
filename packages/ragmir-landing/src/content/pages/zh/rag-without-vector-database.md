---
title: "没有向量数据库、GPU 或 API 密钥的 RAG | Ragmir"
description: "何时仅靠 BM25 关键词检索，再加上可选的本地嵌入，就足以支撑 RAG。本文说明 Ragmir 默认路径的工作方式、它在自身代码仓库上的实测结果，以及需要权衡的各项取舍。"
h1: "没有向量数据库的 RAG：何时关键词检索已经足够"
summary: "RAG 需要的是搜索索引，而不一定是向量数据库服务器。Ragmir 默认的 local-hash 检索会先按 BM25 关键词证据排序，索引是位于项目 .ragmir 文件夹下的嵌入式索引。它不需要嵌入模型、GPU 或 API 密钥。在 Ragmir 自己的代码仓库上，89 个开发者问题中，82% 的答案文件进入前 3，99% 进入前 10。当问题使用的词汇与文档不同时，再添加本地嵌入模型。"
section: guide
setup: agents
translationKey: "rag-without-vector-database"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["agentic-rag", "benchmarks", "local-rag"]
---

RAG 需要一种方法来找到能回答问题的段落，但它并不需要数据库服务器。

Ragmir 在一个 Node.js 进程中完成这些工作。解析、索引和检索都在 Ragmir 运行的地方进行。索引是一个嵌入式 LanceDB 存储，位于被 Git 忽略的 `.ragmir/` 文件夹中。

无需部署数据库服务器，也无需调用嵌入 API。使用默认的 `local-hash` 提供方时，连模型也无需下载。调用 Ragmir 的智能体或应用，会用它所选的模型来撰写答案。

## 没有向量数据库，RAG 能否工作？

能，前提是关键词证据足以支撑答案。默认的 `local-hash` 提供方的工作方式如下：

1. **BM25 优先。** 全文索引覆盖每个段落的正文、结构上下文和被引用的标题文本，也覆盖相对源路径，以及 camelCase、PascalCase、缩写和字母数字混合标识符的各个组成部分。因此，关于“login attempts”的问题可以找到 `LoginAttemptService.java`。
2. **文本折叠。** 段落与查询中的大小写、重音符号及其他变音符号以相同方式折叠。随后，分析器对英文做词干提取，并移除英文停用词。
3. **哈希向量只用于打破平局。** `local-hash` 向量是一种不带逆文档频率的哈希词汇信号。它在倒数排名融合中的权重为 0.01，只用于打破平局，或追加全文索引未返回的段落。
4. **弱证据不返回任何结果。** `local-hash` 要求有词汇证据。当在索引中完全找不到的那些词占了问题 IDF 权重的一半时，它不返回任何答案。例如，在一个从未提及 Pinecone 的语料上提问“How does it sync with Pinecone?”。如果检索的前五个结果全都是弱证据，它同样不返回结果。

因此，即便是默认配置也保留了向量。它们经过哈希处理，存放在项目的 `.ragmir/` 文件夹中，且没有任何服务器持有它们。

## 混合检索：BM25 加可选的本地嵌入

使用本地 Transformers 模型时，Ragmir 通过倒数排名融合（`k = 60`，权重相等）合并向量结果与全文结果。该模型通过可选的 `@huggingface/transformers` 对等依赖运行：

```bash
pnpm add -D @huggingface/transformers
pnpm exec rgr setup --semantic
pnpm exec rgr ingest
```

`rgr setup --semantic` 会安装适合本机的模型（多数机器上为多语言 Granite R2），除非项目已经选定了模型。`rgr models list` 会显示每个模型的下载大小以及建立索引所需的内存。更换模型后，下一次摄入会暂存一次经过验证的重建。

若要使用你已经在运行的模型进行嵌入，请设置 `embeddingProvider: "openai-compatible"`。此后，Ragmir 会向 Ollama、vLLM 或其他兼容 OpenAI 的端点发送请求。段落文本和查询都会发送到该端点。

## 无需 GPU 或 API 密钥的 RAG

- **检索两者都不需要。** `local-hash` 在 CPU 上离线运行，无需模型、GPU 或 API 密钥。语义模型同样在 CPU 上运行。GPU 是可选的，它只用于为摄入批次生成嵌入（`ingestEmbeddingDevice: "webgpu"`）。检索时，短查询的嵌入始终在 CPU 上完成。
- **答案是另一项选择。** 你的智能体或应用所调用的模型可能需要密钥。当整个应用都在本地运行时，本地模型可以让段落留在机器上。例如，关闭云功能的 Ollama 就是一个例子。 [智能体集成指南](/docs/agent-integration/)中有这个示例。

## 实测结果

2026 年 11 月 27 日，`pnpm bench:competitors` 在 Ragmir 代码仓库的 287 个文件上，针对 Ragmir 及其他本地检索库，提出了 89 个开发者问题、30 个无关问题和 40 个相近领域问题。完整的表格、图表和原始报告请见[基准测试](/zh/benchmarks/#与其他检索方案对比)。

在不使用任何模型的情况下，Ragmir 将答案文件排进前 3 的比例（82%）高于带嵌入模型的 LangChain.js 流水线（70%）。它对大多数无关问题也不返回任何结果。

加入 `mxbai-embed-xsmall-v1` 后，前 3 的比例从 82% 提高到 87%。无关问题与相近领域问题的拒答数量也随之增加。

## 需要权衡的取舍

- **词汇。** 关键词能找到文档中使用的词。当问题使用其他词汇（同义词、改写或另一种语言）时，请添加模型。当拒答应当依据语义而非关键词时，也请添加模型。在没有模型的情况下，智能体可以随问题一起发送它自己的 `lex` 关键词、`vec` 改写，或 `hyde` 式的可能答案。Ragmir 会检索这些词，从而找到问题本身的词所遗漏的段落。
- **拒答依据关键词。** 如相近领域一列所示，与项目使用相同词汇的相近领域问题，仍然可能返回段落。
- **速度。** 内存型库的响应更快。Ragmir 检索的是磁盘上的索引，且该索引支持增量摄入。
- **由你的语料决定。** 一个代码仓库并不代表你的数据。选择之前，请用你自己的问题运行 `rgr evaluate`，分别测试有模型和无模型的情况。

## 这是无向量 RAG 吗？

不是，无向量 RAG 是另一种思路。PageIndex 项目将其描述为为每份文档构建“层级树索引”，就像“为 LLM 和智能体优化的目录”。随后，LLM 通过推理在这棵树上搜索，并且“没有向量数据库，也没有分块”。

Ragmir 会对文档分块，并在关键词索引旁保存哈希向量或模型向量。它对段落排序时，不要求生成式模型来挑选段落。

智能体仍可以按结构进行导航。带有 `outline: true` 的 `ragmir_sources` 会返回文档的各个章节，以及每个章节第一个段落的引用。用 `ragmir_expand` 展开每个 `nextCitation`，即可把整份文档读完。

## 试一试

```bash
pnpm add -D @jcode.labs/ragmir
pnpm exec rgr setup --no-ingest --agents claude,codex
pnpm exec rgr sources add "docs/**/*.md" "specs/**/*.docx" "src/**/*.ts"
pnpm exec rgr ingest
pnpm exec rgr search "authentication contract" --compact
```

在检索时添加 `--explain`，即可查看每个结果的关键词排名、向量排名以及命中的词。

## 后续步骤

- [什么是智能体式 RAG？](/zh/agentic-rag/)
- [基准测试、方法与局限](/zh/benchmarks/)
- [配置：排序与拒答](/docs/configuration/)
- [构建本地 RAG](/zh/local-rag/)
