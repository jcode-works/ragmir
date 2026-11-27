---
title: "RAG 引用：精确到行、页、幻灯片与单元格 | Ragmir"
description: "可核对的 RAG 引用是什么样子：各格式的行、PDF 页、幻灯片、单元格、EPUB 书脊与章节坐标，以及 Ragmir 如何核对每个源文件。只有能够验证时，Ragmir 才会输出坐标，并可在展开时再次核对。"
h1: "带引用的 RAG：可以核对的精确来源"
summary: "RAG 引用标明答案背后的来源段落。Ragmir 通过项目路径加上原生坐标来引用每个段落：行号、PDF 页码、幻灯片、工作表与单元格范围、EPUB 书脊条目或具名章节。只有在能够验证时，它才会输出坐标。"
section: guide
setup: agents
translationKey: "rag-citations"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["rag-vs-mcp", "local-rag", "use-cases/forward-deployed-engineers", "self-hosted-rag"]
---

好的引用能让读者打开它，直接找到支持该论断的文字。仅有文件名，读者还得回头在文档中搜索。错误的页码则会把他们带到错误的文字处。

Ragmir 会为每个段落返回一条引用，该引用由解析后的源文件生成。展开段落时，它会再次核对引用。撰写答案的智能体或应用，会把引用紧挨着其所支持的论断一并引用。

## Ragmir 引用的样子

```text
contracts/msa-acme-2026.pdf:p7#3
```

- `contracts/msa-acme-2026.pdf` 是相对于项目的路径，在所有平台上都使用正斜杠，并采用 Unicode NFC 规范化形式存储。
- `:p7` 是坐标：PDF 的第 7 页。
- `#3` 是该段落（分块）在文档中的序号。

所有格式的结构都相同，只有坐标不同。例如，`docs/adr/0012-authentication.md:L18-L26#2` 引用第 18 到 26 行。`book.xlsx:sheet=Dashboard:cells=A2-F12#0` 引用一个单元格范围。

<figure>
  <img src="/guides/citations-search.webp" alt="两次 rgr 搜索的终端输出。第一次返回 specs/nist-sp-800-63b-4.pdf:p25#56，其段落涉及定期更改密码。第二次返回 docs/server-deployment.md:L125-L140#8，其章节涉及在无互联网环境中运行。" width="1440" height="763" loading="lazy" decoding="async">
  <figcaption>在一个包含 Markdown 指南和一份公开 NIST PDF 的索引上，使用 Ragmir 6.20.0 进行的两次搜索：PDF 使用页码，Markdown 文件使用行范围。</figcaption>
</figure>

## 各格式的引用坐标

| 源文件 | 坐标 | 文档中的示例 |
| --- | --- | --- |
| 代码、Markdown 及其他文本、CSV、大多数配置文件 | 源文件行号 | `:L10-L12`，`docs/runbook.md:L12-L18#3` |
| PDF | 页码；当连续的短页面共享同一段落时使用页码范围 | `:p3`，`agenda.pdf:p1-p9#0` |
| PowerPoint | 幻灯片 | `:slide12` |
| Excel | 工作表与单元格范围；同一表格的连续行共享一个段落 | `:sheet=Finance%20Ops:cells=A7-D7` |
| EPUB | 书脊条目 | `:spine2` |
| Word、JSON、YAML、`.eml` 和 `.msg` 邮件 | 段落序号 | `specs/account-recovery.docx#2` |
| 数据模型、图表、API 描述、邮箱、设计文件、笔记、GeoJSON、SARIF | 每个对象的具名章节，或行号 | `model.pdm:section=Table%20INVOICE#3` |
| 扫描页面、图片、旧版 `.doc`（可选的本地提取器） | 页码或段落 | |

Markdown 段落同样携带其标题路径。两个电子表格表格、两个工作表或工作表图表，绝不会共享同一段落。

[支持的格式](/docs/supported-formats/)列出了每种扩展名及其引用形式。

## PDF 的页码引用

- 首先提取 PDF 中嵌入的文本。可选的本地 OCR 仅对没有提取到文本的页面运行。它以有界批次工作，缓存以源文件校验和、页码及其他字段作为键。
- 当连续的短页面共享同一段落时，引用会标明整个范围，例如 `agenda.pdf:p1-p9#0`，而不是某一个页面。
- 行坐标只出现在保留源文本结构的文本中。PDF 段落绝不会被赋予虚构的源行号。其坐标也不是二进制文件中的字节偏移量。

<figure>
  <img src="/guides/citations-pdf-page.webp" alt="NIST SP 800-63B-4 第 25 页，第 3.1.1.2 节 Password Verifiers（密码验证者）。第 6 条已高亮：验证者和 CSP 不得要求用户定期更改密码。" width="1536" height="1342" loading="lazy" decoding="async">
  <figcaption>通过 <code>specs/nist-sp-800-63b-4.pdf:p25#56</code> 引用的段落，此处在其所在页面上高亮显示。<code>p25</code> 统计的是文件中的页数：该页本身印刷的页码为 14。</figcaption>
</figure>

## 页码引用出错的情况

页码引用至少可能以两种方式出错：

- 页码发生偏移，引用指向了相邻的一页。
- 页码在建立索引与显示之间丢失，因此查看者会从文档开头打开它。

Open WebUI 项目中的两份公开缺陷报告展示了这两种情况：

- [Issue #33603](https://github.com/open-webui/open-webui/issues/33603) 报告称，经 Docling 建立索引的 PDF 没有 `page_label`。模型打开并引用的是正确页之前的那一页。
- [Issue #35108](https://github.com/open-webui/open-webui/issues/35108) 报告称，原生 Knowledge 引用丢失了 PDF 页码，并从文档开头打开。

两个问题现已关闭。

在 Ragmir 中，页码是引用字符串的一部分，因此它会随引用一同传递。LangChain.js 检索器也会在每个文档的 `metadata` 中保存引用及其行或页码范围。只有在能够验证时，才会输出坐标。

你也可以对它们进行测试。在黄金数据集中，`expectedCitations` 要求引用完全精确。当引用发生偏移时，`exactCitationRate` 阈值会使 `rgr evaluate` 失败。对于必须精确引用的事实，才保留精确引用，因为文件被编辑时它们会随之变化。仓库中的[文档证据基准测试](https://github.com/jcode-works/ragmir/blob/main/packages/ragmir-core/examples/document-evidence-benchmark/README.md)同样以这种方式对精确的 PDF 页码引用进行门禁检查。

Ragmir 没有文档查看器。显示答案的应用必须在被引用的页面打开文件，并高亮该段落。请在你自己的界面中测试最后这一步。

## 展开时如何核对源文件

1. `sourceStatus: "modified"` 或 `"missing"` 会标记文件在建立索引后发生变化或消失的结果。每个被引用的文件耗费一次 `stat` 操作。
2. `evidence.id` 用于标识已索引的段落。将其作为 `expectedEvidenceId` 传给 `expandCitation`（或 `ragmir_expand`）。此时，若已索引的内容发生变化，则会以 `EVIDENCE_CHANGED` 拒绝。
3. 若引用的行已移动，则该引用失败，错误信息会给出段落当前的引用。查找不到任何内容的引用会返回 `found: false`，并附带 `suggestedCitation` 或 `similarPaths`。
4. `rgr audit --knowledge` 会检查写入 Markdown 页面的引用。当引用的段落发生变化或已离开索引时，它会报告 `brokenCitations`。

```ts
import { createRagmirClient } from "@jcode.labs/ragmir"

const ragmir = await createRagmirClient({ cwd: process.cwd() })
try {
  await ragmir.ingest()
  const passages = await ragmir.search("authentication contract", { topK: 3 })
  for (const passage of passages) {
    console.log(passage.citation, passage.weakEvidence ? "(verify)" : "", passage.text)
  }
  if (passages[0]) {
    console.log(await ragmir.expandCitation(passages[0].citation, {
      expectedEvidenceId: passages[0].evidence?.id,
    }))
  }
} finally {
  await ragmir.close()
}
```

引用只说明段落来自何处，并不说明该段落涵盖了问题所问的全部内容。在据此行动之前，请展开证据，并检查例外情况和缺失的事实。

## 后续步骤

- [支持的格式及其引用](/docs/supported-formats/)
- [TypeScript API：搜索与展开](/docs/api-reference/)
- [RAG 与 MCP](/zh/rag-vs-mcp/)
- [本地 RAG 教程](/zh/local-rag/)
