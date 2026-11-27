---
title: "Private RAG for paperwork: local AI with page proof | Ragmir"
description: "Index bank statements, payslips, contracts, and tax notices on your own computer. A local model answers and points to the exact page, and nothing leaves your machine."
h1: "Handle your paperwork with a local AI that points to the exact page"
summary: "Keep bank statements, payslips, contracts, certificates, and notices in one folder on your computer. Ragmir indexes them there, and a local model such as Ollama answers questions or assembles a file with the exact page as proof. No document is sent to a cloud service."
section: use-case
setup: local
translationKey: "use-cases/paperwork"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["local-rag", "local-vs-cloud-rag", "rag-citations", "air-gapped-rag"]
---

Paperwork asks the same questions again and again. Which payslips prove my income? What does the
contract say about notice? Where is last year's tax notice? The answers sit in PDFs you scanned or
downloaded, and they are private. Ragmir indexes them on your machine, so a local model can answer
and show the page.

## What goes into the base

- **Bank statements, payslips, and invoices** as PDF, cited to the page.
- **Contracts, insurance policies, and leases** as PDF or Word, cited to the page or the passage.
- **Certificates, tax notices, and letters** as PDF, or as photos and scans with local OCR.
- **Spreadsheets of your own**, such as a budget in Excel, cited to the sheet and cell, or a CSV
  export, cited to the line.
- **Emails you saved** as `.eml` or `.mbox` files.

Ragmir indexes more than 900 file types; the [supported formats](/docs/supported-formats/) list
them all. Scanned pages and images need optional local OCR, which runs a command on your machine.

## Set up the folder

Create a folder such as `paperwork/`, put the documents in a `documents/` folder inside it, and
open a terminal in `paperwork/`. This needs Node.js 22.12 or later:

```bash
npm install -D @jcode.labs/ragmir
npx rgr init
npx rgr sources add "documents/**"
npx rgr ingest
```

If some files are scans, check the local OCR engine, then set it up:

```bash
npx rgr ocr doctor
npx rgr ocr setup
```

Ingestion is incremental. When a new statement arrives, drop it in the folder and run
`npx rgr ingest` again.

## Ask with page proof

Search works on its own, without any model. Each result carries a citation such as a PDF page:

```bash
npx rgr search "notice period employment contract" --compact
```

To get an answer in words, add a local model. The [local RAG tutorial](/local-rag/) shows how to
install Ollama and run a short script that sends only the selected passages to the model. Ask it
things like:

```prompt
List the payslips from the last three months, and cite the page of each one.

Which page of my lease states the amount of the deposit?

I need proof of address and proof of income for an application. Which of my documents contain them? Point to the page, and tell me what is missing.
```

If the documents hold no evidence, Ragmir returns nothing and the model should say so. A weak match
is flagged as `weakEvidence`.

## Keep it fully local

Disable Ollama's cloud features first, as the [local RAG tutorial](/local-rag/) explains: set
`"disable_ollama_cloud": true` in `~/.ollama/server.json` and restart Ollama. A localhost address
alone does not prove that the model runs locally, because Ollama also supports cloud models.

With a local model and a local chat, the index, the search, and the model calls all stay on your
machine. Back up the folder the way you back up your other private files.

## Use a cloud AI instead

A cloud assistant also works, but it receives the passages it reads. For paperwork, that can mean
account numbers, salaries, and addresses. The
[local or cloud guide](/local-vs-cloud-rag/) lists what to check: training, retention, region,
access, and scope. Keep the most sensitive documents out of the base that a cloud assistant reads.

## Limits

- The model drafts; you check. Open each cited page before you send a file to anyone.
- Ragmir gives no legal, tax, or financial advice, and a model's answer is not advice either.
- Ragmir does not fill forms, send emails, or contact an office. You or the assistant do.
- OCR can misread a scan. Compare the cited page with the original.
- A small local model can miss details. Ask for the page, then read it.

## Next steps

- [Local RAG tutorial: documents, Ollama, and CPU only](/local-rag/)
- [Local or cloud RAG: models, hardware, and your data](/local-vs-cloud-rag/)
- [RAG citations: line, page, slide, and cell](/rag-citations/)
- [Supported formats](/docs/supported-formats/)
