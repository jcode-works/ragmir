---
title: "智能体式 RAG 是什么，以及何时使用 | Ragmir"
description: "智能体式 RAG 是指由智能体自行决定何时检索、如何改写查询、展开哪些引用，并在证据薄弱时停止。本页介绍这一循环的各个步骤、Ragmir 提供的检索接口，以及一个可在本地运行的示例。"
h1: "什么是智能体式 RAG，何时应该使用它？"
summary: "智能体式 RAG 让智能体掌控检索。它决定何时搜索、改写问题、打开所需的引用段落，并在证据薄弱时停止。Ragmir 提供检索部分；推理、答案和任何操作都由智能体及其模型负责。"
section: guide
setup: agents
translationKey: "agentic-rag"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["rag-without-vector-database", "case-studies/ragmir-repository", "benchmarks", "mcp-rag-server"]
---

在智能体式 RAG 中，检索是一种工具：智能体需要证据时就调用它。

在普通的检索增强生成中，应用接收用户的问题，检索一次段落，然后把它们交给模型。在智能体式 RAG 中，智能体在需要时才搜索。它会在两次调用之间改换措辞，并在决定下一步查找什么之前完整阅读某个段落。它还可能得出结论：文档并未涵盖这个问题。

Ragmir 正是为这种模式设计的。它返回精简的引用，展开智能体选中的引用，在没有段落包含真正证据时不返回任何内容，并用 `weakEvidence` 标记证据薄弱的段落。它不运行智能体循环，也不撰写答案。

## 智能体式 RAG 与普通 RAG

| | 普通 RAG | 智能体式 RAG |
| --- | --- | --- |
| 检索何时运行 | 生成之前，仅一次 | 每当智能体判断需要证据时 |
| 检索什么 | 用户原样提出的问题 | 问题本身、智能体的改写，以及它的后续问题 |
| 模型读取什么 | 返回的段落 | 智能体展开的段落，或逐窗口阅读的文档 |
| 没有可靠证据时 | 单步直接作答或拒绝 | 智能体改写一次、换个位置搜索，或报告缺口 |
| Ragmir 接口 | `RagmirRetriever` 或 `search()` | MCP 工具，或供 LangChain 智能体使用的 `createRagmirTools` 与 `RagmirToolkit` |

## 智能体循环

<figure>
  <img src="/diagrams/agentic-rag-loop.svg" alt="智能体式 RAG 循环：智能体判断是否需要证据，调用 ragmir_search，搜索结果为空时报告缺口，用 ragmir_expand 展开所选引用，并继续搜索，直到证据足以作答或行动。" width="800" height="560" loading="lazy" decoding="async">
</figure>

Ragmir 文档描述的循环包含五个步骤：

1. 智能体通过 `ragmir://context` 或 `ragmir_status`，一次性读取知识库的身份、范围和新鲜度。
2. 它用聚焦的查询调用 `ragmir_search`，或在 `queries` 中发送最多五个相关问题。
3. 它用 `ragmir_expand` 展开答案所依据的引用。
4. 证据不完整时，它用 `searches` 改写查询。它还可以把搜索范围缩小到某些文件夹或指定的作用域，或用 `ragmir_sources` 列出文档。
5. 它为每项论述附上引用作答，指出缺口，并在行动前核对引用。

## Ragmir 如何实现检索部分

- **一次搜索中的多种表述。** `searches` 最多可为同一需求添加五种表述，并与问题本身一起融合为一个排序。`lex` 表述由关键词组成（必须有一个 `"phrase"` 形式的短语， `-word` 形式表示排除）。`vec` 表述是改写后的语句。`hyde` 表述是一段写得像答案的段落。每种表述的权重为问题自身列表的一半，`hyde` 段落的权重为四分之一。只有问题本身能决定是否存在答案，因此任何表述都不会把拒答变成答案。
- **有界的上下文。** 默认情况下，每次调用的输出预算为 32 KB，搜索返回三条精简引用。会话中已返回过的段落会以简短的 `seen` 占位形式返回。随后的第二次搜索会把预算用在新的证据上。
- **按需展开。** `ragmir_expand` 返回一条引用及其相邻内容，一次最多可展开五条引用，并返回 `nextCitation`，用于逐段阅读长文档。
- **智能体可据以行动的信号。** 空结果表示知识库中没有该问题的证据。`weakEvidence` 标记支持薄弱。`sourceStatus` 标记自索引以来已变更的文件（`ragmir_ingest` 会刷新索引）。提示会指出问题中哪些词没有出现在任何已索引段落中。
- **无关问题。** 在 Ragmir 自身的代码仓库上，2026 年 11 月 27 日，30 个无关问题中有 23 至 28 个没有返回任何结果（[基准测试](/zh/benchmarks/)）。

智能体发送的、包含多种表述的一次搜索：

```json
{
  "query": "How are API requests throttled?",
  "searches": [
    { "type": "lex", "query": "\"rate limit\" quota -deprecated" },
    { "type": "vec", "query": "limits on how many calls a client may send" },
    { "type": "hyde", "query": "Each API key may send 600 requests per minute." }
  ],
  "intent": "gateway configuration"
}
```

## 何时使用智能体式 RAG，何时普通 RAG 就够了

当用户自己的措辞一次搜索就能找到段落时，普通 RAG 就够用了。此时应用只需作答或拒答。

Ragmir 文档中的合同助手就属于这种情况。`RagmirRetriever` 返回能回答问题的条款及其页码引用；合同未作规定时则不返回任何文档。应用会直接说明这一点，而不是猜测。文档中的本地模型示例同样只进行一轮检索，而不是自主运行的智能体。

智能体式 RAG 适用于单个段落无法构成完整答案的任务：

- 依据规格说明实现功能，然后再次搜索其中的例外情况；
- 结合运行手册、事故报告和重试代码诊断事故；
- 逐窗口阅读很长的 PDF 或规格说明；
- 问题的措辞与文档不同，此时智能体自己的关键词、改写或可能的答案，能找到问题原文遗漏的段落。

在小型代码仓库中，编程智能体自身的搜索通常已经足够。若要列出每一处出现位置或匹配正则表达式，grep 仍是更合适的工具。

## 在本地运行

为项目建立索引，并在 shell 中查询。同一个索引可服务于 `rgr setup` 所连接的各个智能体：

```bash
npm install -D @jcode.labs/ragmir@6.20.0
npx rgr setup --no-ingest --agents claude,codex
npx rgr sources add "docs/**/*.md" "specs/**/*.docx" "src/**/*.ts"
npx rgr ingest
npx rgr search "authentication contract" --compact
```

在 CLI 中，`--lex`、`--vec` 和 `--hyde` 可添加表述。`--explain` 会列出找到每条结果的表述。

以下是循环中的一轮。记录于 2026 年 11 月 27 日，使用 Ragmir 6.20.0，并已索引 Ragmir `docs/` 文件夹中的十一篇指南：

```text
ragmir_search({ query: "How do I run Ragmir on a server without internet access?" })
  [1] docs/server-deployment.md:L123-L138#8  Run Ragmir on a server > Without internet access
  [2] docs/docker.md:L96-L105#5              Run Ragmir with Docker > Servers and CI
  [3] docs/python.md:L211-L218#12            Use Ragmir from Python > Without Node.js
ragmir_expand({ citation: "docs/server-deployment.md:L123-L138#8" })
  ## Without internet access
  Build the image where the npm registry is reachable, then move it with `docker save` and
  `docker load`, or install from your internal npm mirror. At runtime, `local-hash` makes no
  network call [...]
```

智能体读取了 4,539 字节的回复，才找到该段落及其行范围。若完整打开三个被引用的文件，则需要 22,014 字节。

对应用而言，来自 `@jcode.labs/ragmir/langchain` 的 `createRagmirTools` 可为 LangChain.js 智能体提供同样的 `ragmir_search` 和 `ragmir_expand` 工具。 `RagmirToolkit` 在 Python 中实现同样的功能。 [LangChain 集成](/zh/integrations/langchain/)页面对两者都有说明。

## 限制

- Ragmir 不内置模型，不运行智能体，也不开放 HTTP 端口。规划、生成和操作都留在智能体或应用中。
- 段落会被发送到智能体模型运行的任何地方。若智能体由云端支持，所选摘录就会到达其服务商。
- 面向网络的主机负责身份验证、按用户授权、传输安全和速率限制。Ragmir 不会按用户过滤结果。
- 检索到的文本是供智能体权衡的证据，绝不是需要遵循的指令。

## 后续步骤

- [不使用向量数据库的 RAG](/zh/rag-without-vector-database/)
- [面向智能体的 Ragmir MCP 服务器](/zh/mcp-rag-server/)
- [智能体集成指南](/docs/agent-integration/)
- [Ragmir 自身代码仓库如何使用 Ragmir](/zh/case-studies/ragmir-repository/)
