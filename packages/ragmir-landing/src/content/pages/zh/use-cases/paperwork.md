---
title: "私密 RAG 处理文书：本地 AI 并附带页面证明 | Ragmir"
description: "在你自己的电脑上索引银行对账单、工资单、合同、租赁协议和税务通知等各类文书。本地模型可以回答问题，或整理出一份文件，并以确切的页面作为证明，任何内容都不会离开你的电脑。"
h1: "用本地 AI 处理你的文书，并精确指向页面"
summary: "把银行对账单、工资单、合同、证书和通知保存在电脑上的同一个文件夹中。Ragmir 会在本地为它们建立索引，Ollama 等本地模型可以回答问题，或据此整理文件，并以确切的页面作为证明。任何文档都不会发送到云服务。"
section: use-case
setup: local
translationKey: "use-cases/paperwork"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["local-rag", "local-vs-cloud-rag", "rag-citations", "air-gapped-rag"]
---

文书总是一再提出同样的问题：哪些工资单能证明我的收入？合同对提前通知有什么规定？去年的税务通知在哪里？答案就藏在你扫描或下载的 PDF 里，而且这些内容都是私密的。Ragmir 在你的电脑上为它们建立索引，因此本地模型可以回答问题，并给出对应页面。

## 知识库包含哪些内容

- **银行对账单、工资单和发票**，格式为 PDF，按页引用。
- **合同、保险单和租赁协议**，格式为 PDF 或 Word，按页或段落引用。
- **证书、税务通知和信函**，格式为 PDF，或借助本地 OCR 处理的照片和扫描件。
- **你自己的电子表格**，例如 Excel 中的预算表，按工作表和单元格引用；或 CSV 导出文件，按行引用。
- **你保存的电子邮件**，格式为 `.eml` 或 `.mbox` 文件。

Ragmir 可以索引 900 多种文件类型， [支持的格式](/docs/supported-formats/)列出了全部类型。扫描页面和图片需要可选的本地 OCR，它会在你的电脑上运行一条命令。

## 设置文件夹

新建一个文件夹，例如 `paperwork/`，把文档放入其中的 `documents/` 子文件夹，然后在 `paperwork/` 中打开终端。这需要 Node.js 22.12 或更高版本：

```bash
npm install -D @jcode.labs/ragmir
npx rgr init
npx rgr sources add "documents/**"
npx rgr ingest
```

如果部分文件是扫描件，请先检查本地 OCR 引擎，然后进行设置：

```bash
npx rgr ocr doctor
npx rgr ocr setup
```

导入是增量的。新对账单到达时，把它放入文件夹，然后再次运行 `npx rgr ingest`。

## 带页面证明地提问

搜索本身无需任何模型即可工作。每个结果都带有引用，例如 PDF 的页码：

```bash
npx rgr search "notice period employment contract" --compact
```

如果想得到文字形式的回答，可以添加本地模型。 [本地 RAG 教程](/zh/local-rag/)介绍了如何安装 Ollama，并运行一个简短脚本，只把选中的片段发送给模型。你可以这样提问：

```prompt
列出最近三个月的工资单，并引用每一份的页码。

我的租赁合同第几页写明了押金金额？

我申请时需要住址证明和收入证明。我的哪些文件包含这些内容？请指出页码，并说明还缺什么。
```

如果文档中没有证据，Ragmir 不返回任何结果，模型应该明确说明。匹配较弱的结果会被标记为 `weakEvidence`。

## 完全保留在本地

首先按照[本地 RAG 教程](/zh/local-rag/)的说明关闭 Ollama 的云功能：在 `~/.ollama/server.json` 中设置 `"disable_ollama_cloud": true`，然后重启 Ollama。仅凭 localhost 地址并不能证明模型在本地运行，因为 Ollama 也支持云端模型。

使用本地模型和本地聊天时，索引、搜索和模型调用都保留在你的电脑上。请像备份其他私人文件一样备份这个文件夹。

## 改用云端 AI

云端助手同样可以使用，但它会接收所读取的片段。对于文书而言，这可能包括账号、薪资和住址。 [本地还是云端指南](/zh/local-vs-cloud-rag/)列出了需要检查的事项：训练、保留期限、地域、访问权限和范围。请把最敏感的文档排除在云端助手所读取的知识库之外。

## 限制

- 模型负责起草，你负责核对。把文件发给任何人之前，请先打开每一个被引用的页面。
- Ragmir 不提供法律、税务或财务建议，模型的回答同样不构成建议。
- Ragmir 不填写表格、不发送邮件，也不联系任何机构。这些由你或助手完成。
- OCR 可能会误读扫描件。请将被引用的页面与原件进行比对。
- 小型本地模型可能会遗漏细节。请要求它给出页码，然后亲自阅读该页。

## 后续步骤

- [本地 RAG 教程：文档、Ollama 和纯 CPU 运行](/zh/local-rag/)
- [本地还是云端 RAG：模型、硬件和你的数据](/zh/local-vs-cloud-rag/)
- [RAG 引用：行、页、幻灯片和单元格](/zh/rag-citations/)
- [支持的格式](/docs/supported-formats/)
