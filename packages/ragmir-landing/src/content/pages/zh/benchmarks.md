---
title: "可复现的 RAG 检索基准测试 | Ragmir"
description: "在 Ragmir 的公开代码仓库上测量其检索表现，并与 grep、LangChain.js、Orama 和 MiniSearch 对比：涵盖测试方法、带日期的结果、原始报告和可执行的命令。"
h1: "可以复现的 RAG 检索基准测试"
summary: "针对 Ragmir 公开代码仓库的 89 个开发者问题，Ragmir 6.20.0 的代码让 99% 至 100% 的问题在前 10 条结果中命中可回答的文件；在 30 个无关问题中，有 23 至 28 个没有返回任何结果。编程智能体用 grep 进行首轮检索时，文件排序质量大致相当，但需要读取中位数 71 KiB 的文本才能找到答案；通过 Ragmir 则不到 5 KiB。测量时间为 2026 年 11 月 27 日。"
section: benchmark
setup: agents
translationKey: "benchmarks"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["claude-code-rag", "rag-without-vector-database", "case-studies/ragmir-repository"]
highlights:
  - value: "99–100%"
    label: "89 个开发者问题中，答案文件进入前 10 条的比例"
  - value: "4.7 KiB"
    label: "智能体为找到答案而读取的文本中位数，使用 grep 时为 71.4 KiB"
  - value: "30 中 28"
    label: "无关问题返回空结果（使用混合模型），不使用模型时为 23 个"
  - value: "17.3 ms"
    label: "不使用模型时的搜索耗时中位数，使用混合模型时为 19.1 ms"
---

在本代码仓库的问题上，Ragmir 找到可回答文件的频率与 grep 大致相当。它为此读取的文本要少得多，并且对大多数无关问题不返回任何结果。

这些基准测试只衡量检索层，检查以下内容：

- 能回答问题的文件是否被返回，以及其排名有多靠前；
- 来源无法回答的问题是否返回空结果；
- 一次搜索耗时多久；
- 智能体为找到答案需要读取多少文本。

它们不评估模型撰写的答案，也不评估智能体采取的行动。

以下每个数字都在 2026 年 11 月 27 日于提交 `10bb9f6` 上测得，该提交包含 Ragmir 6.20.0 的 Core 代码。测试机器为一台 Apple M3 Max，运行 Node.js 22。每个数字都链接到其原始报告。

## 问题与文件

两个基准测试索引的都是 Ragmir 代码仓库中同样的 287 个受 Git 跟踪的文件。这些文件包括文档、Core 源代码、技能、落地页的源代码和文案，以及脚本。问题公开于 [`repository-questions.json`](https://github.com/jcode-works/ragmir/blob/main/packages/ragmir-core/benchmarks/fixtures/repository-questions.json)：

- **89 个开发者问题**，每个问题都列出了所有能回答它的文件。
- **30 个无关问题**，涉及体育、烹饪、天气或无意义内容，应当不返回任何结果。
- **40 个近域问题**，把项目的词汇与项目并不具备的集成、服务或格式搭配在一起，例如已停用的 Chat 和 TTS 包。它们同样应当不返回任何结果。

当某个问题的文件出现在前 3 条或前 10 条结果中时，该问题即计为在前 3 条或前 10 条中得到回答。

MRR@10 是前 10 条结果中第一个可回答文件的平均倒数排名。拒答即为空结果。

## 编程智能体的首轮检索：grep 还是 Ragmir

`pnpm bench:first-pass` 比较智能体找到可回答文件的方式。

grep 一侧的流程如下：

1. 使用不区分大小写的 ripgrep，搜索问题中每个长度不少于三个字符的词，并去掉常见英文单词。
2. 按文件包含这些词的数量排序，数量相同时再按匹配次数排序。
3. 逐个完整打开文件，直到某个文件能回答问题。

Ragmir 一侧为每个问题新建一个会话，运行其 MCP 服务器：

1. 运行默认搜索。
2. 若第一次搜索没有可回答的文件，则运行第二次搜索，返回十条结果。
3. 展开一次可回答问题的引用。

字节数统计的是智能体模型所读取的文本。

| 首轮检索 | 前 3 条命中答案 | 前 10 条命中答案 | 找到答案 | 找到答案所读字节数的中位数 | 无关问题被拒绝 | 近域问题被拒绝 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| ripgrep 15.2.0，按问题词检索，整文件读取 | 85% | 100% | 89 中 89 | 71.4 KiB | 30 中 2 | 40 中 0 |
| Ragmir MCP，不使用模型的 `local-hash` | 82% | 99% | 89 中 88 | 4.7 KiB | 30 中 23 | 40 中 7 |
| Ragmir MCP，混合模式，使用 `mxbai-embed-xsmall-v1` | 87% | 100% | 89 中 89 | 4.8 KiB | 30 中 28 | 40 中 13 |

原始报告：[first-pass-2026-11-27.json](/benchmarks/first-pass-2026-11-27.json)。

<figure>
  <img src="/guides/first-pass-chart.webp" alt="比较 89 个开发者问题上 grep 首轮检索与 Ragmir MCP 服务器的柱状图。前 3 条命中答案：grep 85%，Ragmir local-hash 82%，Ragmir 混合模式 87%。读取到答案的文本中位数：grep 71.4 KiB，Ragmir 为 4.7 和 4.8 KiB。30 个无关问题中被拒绝的数量：grep 2 个，Ragmir 23 和 28 个。" width="1440" height="1163" loading="lazy" decoding="async">
  <figcaption>按比例绘制的上方首轮检索表格。</figcaption>
</figure>

在本代码仓库中，问题与文件共享词汇，因此 grep 的排序效果与索引一样好。差别在于智能体消耗的上下文，以及无法回答的问题最终是否得到空结果。[Claude Code RAG](/zh/claude-code-rag/) 讨论了这对编程智能体意味着什么。

## 与其他检索方案对比

`pnpm bench:competitors` 用本地 TypeScript 检索库运行同样的问题。

所有向量一侧都使用 Ragmir 的嵌入函数和 `mxbai-embed-xsmall-v1`，因此模型、前缀和向量完全相同。其他方案读取同样的文件，并由 LangChain 的 `RecursiveCharacterTextSplitter` 切分（1,000 个字符，重叠 200 个字符，共 4,365 个分块）。

Orama 分别以其默认的 0.8 混合相似度和 0.1 运行，后者让其向量一侧参与排序。搜索耗时中位数是同一进程中连续预热搜索的中位数。

| 系统 | 前 3 条命中答案 | 前 10 条命中答案 | MRR@10 | 无关问题被拒绝 | 近域问题被拒绝 | 搜索耗时中位数 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| **Ragmir**，混合模式，使用 `mxbai-embed-xsmall-v1` | **87%** | **100%** | 0.658 | **30 中 28** | **40 中 13** | 19.1 ms |
| **Ragmir**，`local-hash`，不使用模型 | **82%** | **99%** | **0.675** | **30 中 23** | **40 中 7** | 17.3 ms |
| LangChain.js 切分器配合精确余弦搜索，即 `MemoryVectorStore` | 70% | 93% | 0.581 | 30 中 0 | 40 中 0 | 6.5 ms |
| Orama 混合模式，默认相似度 0.8 | 14% | 20% | 0.102 | 30 中 2 | 40 中 0 | 8.5 ms |
| Orama 混合模式，相似度 0.1 | 35% | 71% | 0.303 | 30 中 0 | 40 中 0 | 9.9 ms |
| MiniSearch BM25 | 74% | 98% | 0.596 | 30 中 2 | 40 中 0 | 1.5 ms |

原始报告：[competitors-2026-11-27.json](/benchmarks/competitors-2026-11-27.json)。

<figure>
  <img src="/guides/competitors-chart.webp" alt="在 89 个开发者问题和 30 个无关问题上，将 Ragmir 与其他本地检索库进行对比的柱状图。前 3 条命中答案：Ragmir 混合模式 87%，Ragmir local-hash 82%，MiniSearch BM25 74%，LangChain.js 内存存储 70%，Orama 相似度 0.1 为 35%，Orama 默认值为 14%。30 个无关问题中被拒绝的数量：28、23、2、0、0 和 2。搜索耗时：19.1、17.3、1.5、6.5、9.9 和 8.5 ms。" width="1440" height="1703" loading="lazy" decoding="async">
  <figcaption>上方表格按比例绘制：这些库搜索得更快，但 Ragmir 能把答案排得更靠前，并对大多数无关问题不返回任何结果。</figcaption>
</figure>

内存型库回答得更快。但它们几乎对每个无关问题都会返回结果，而且没有一个能在前 3 条中如此频繁地命中答案。

## 私有语料库上的结果

首页引用了维护者在一个私有 Java 与 TypeScript 单体仓库上的测量结果。该结果来自 [README 基准测试部分](https://github.com/jcode-works/ragmir/blob/main/README.md#benchmarks)。

本次运行于 2026 年 11 月 1 日进行，使用 Ragmir 6.5，同样的 Apple M3 Max，Node.js 24、 LanceDB 0.30 以及 `quality` 检索配置。这些语料库是私有的，因此无法复现这两行结果。方法相同， `rgr evaluate` 可将其应用于你自己的文档。

| 语料库 | 嵌入模型 | 前 3 条命中答案 | 前 10 条命中答案 | 无关问题被拒绝 | 近域问题被拒绝 | 搜索耗时中位数 |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 包含 Office 文件和扫描件的 Java 与 TypeScript 单体仓库：2,325 个文件，30,171 个分块，101 个开发者问题 | `multilingual-e5-base` | 77% | 94% | 30 中 22 | 30 中 11 | 36 ms |
| 法语和英语产品文档：299 个文件，21,011 个分块，60 个问题 | `mxbai-embed-xsmall` | 100% | 100% | 30 中 23 | 30 中 9 | 26 ms |

## 如何复现

在 Ragmir 代码仓库的 `10bb9f6` 提交检出副本的根目录下执行：

```bash
pnpm install --frozen-lockfile
pnpm bench:first-pass -- --model-path /path/to/models
pnpm bench:competitors -- --model-path /path/to/models
```

`bench:first-pass` 需要 ripgrep（`rg`）位于 PATH 中。向量一侧需要 `mxbai-embed-xsmall-v1` 已存在于模型路径中。基准测试仅在使用本地模型时才使用 Transformers，远程模型下载保持禁用。

每次运行都会将报告写入 `packages/ragmir-core/benchmarks/.results/`。报告包含提交、机器、运行时版本以及所有指标。

[基准测试指南](https://github.com/jcode-works/ragmir/blob/main/packages/ragmir-core/benchmarks/README.md) 描述了这两种方法以及其他测试套件（质量门禁、规模、向量索引、解析器），并列出每一项所强制执行的结论规则。`pnpm bench:quality` 是回归门禁，而非研究结论，因此本页不报告其平均值。

## 衡量你自己的语料库

这些数字描述的是一个公开代码仓库，而不是你的文档。`rgr evaluate` 会对你的文件进行同类测量。

golden 文件列出真实问题及回答它们的文件，还列出必须返回空结果的 `answerable: false` 问题。

```json
{
  "topK": 5,
  "thresholds": { "recallAt5": 0.8, "maximumFalsePositiveRate": 0.2 },
  "queries": [
    { "id": "approval", "query": "Who signs off a production release?", "expectedPaths": ["docs/releases.md"] },
    { "query": "Which Helm chart deploys the billing API?", "answerable": false, "category": "negative" }
  ]
}
```

```bash
npx rgr evaluate --golden ragmir.golden.json
npx rgr evaluate --golden ragmir.golden.json --baseline before.json
```

报告给出 Recall@1/3/5/10、Precision@5、MRR@10、nDCG@10、精确引用率，以及困难负例上的误报率。

阈值未通过时以状态码 1 退出，因此同一条命令可以用于控制 CI 任务的门禁。`--baseline` 会按指标输出相对于更早的 `--json` 报告的带符号变化量。

## 限制

- 所有测试都在一台机器上运行，即一台 Apple M3 Max。
- 可复现的结果只使用一个公开语料库，即 Ragmir 自身的代码仓库，内容为英文，且仅包含文本文件。请用你自己的文档衡量你所安装的版本。
- 首轮检索的智能体在找到第一个可回答文件时即停止。真实的智能体可能读取得更多，也可能更少。
- 近域问题仍是最困难的情形。使用模型时，40 个问题中仍有 27 个返回了段落。
- 上述两个私有语料库只作描述，不公开发布，且使用 Ragmir 6.5 测量。

## 后续步骤

- [Claude Code RAG：grep 与本地索引的对比](/zh/claude-code-rag/)
- [不使用向量数据库的 RAG](/zh/rag-without-vector-database/)
- [Ragmir 自身代码仓库如何使用 Ragmir](/zh/case-studies/ragmir-repository/)
- [CLI 参考，包括 `rgr evaluate`](/docs/cli-reference/)
