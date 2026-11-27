---
title: "RAG for job search: cover letters that cite your proof | Ragmir"
description: "Index your CVs, annual reviews, and project reports, match a job offer to your own evidence, and write cover letters that invent nothing, each claim cited."
h1: "Job search with RAG: match an offer to your evidence, and invent nothing"
summary: "Index every CV, annual review, and project report you have. Then match a job offer against your own evidence and draft a cover letter where each claim points to the page it comes from. Ragmir finds and cites; the assistant writes, and you decide what goes out."
section: use-case
setup: local
translationKey: "use-cases/job-search"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["local-rag", "local-vs-cloud-rag", "rag-citations", "use-cases/youtube-research"]
---

A good cover letter is specific: a result, a project, a figure from your last review. Over the
years, that proof ends up scattered across old CVs, review documents, and reports. Ragmir indexes
them in one place, so an assistant can pick the evidence that fits an offer and cite where it
comes from.

## What goes into the base

- **Every version of your CV**, as PDF or Word, cited to the page or the passage.
- **Annual reviews and feedback** from your employers, cited to the page.
- **Project reports, slide decks, and write-ups** you authored, cited to the page, slide, or line.
- **Past cover letters and application notes** in Markdown or Word.
- **Certificates, references, and a list of skills** you keep.

Ragmir indexes more than 900 file types; the [supported formats](/docs/supported-formats/) list
them all. Scans and images need optional local OCR.

## Set up the folder

Keep the documents in one folder, add it as a source, and build the index. This needs Node.js 22.12
or later:

```bash
npm install -D @jcode.labs/ragmir
npx rgr init
npx rgr sources add "career/**"
npx rgr ingest
```

For scanned documents, check the local OCR engine, then set it up:

```bash
npx rgr ocr doctor
npx rgr ocr setup
```

Save each job offer as a text, Markdown, or PDF file in the folder, or paste it into the chat. Run
`npx rgr ingest` again when you add documents; it reads only new and changed files.

## Match the offer, then write with citations

Ask the assistant to work from your evidence only. For example:

```prompt
Here is a job offer. List its five main requirements. For each, find the evidence in my documents and cite the page. Tell me which requirements I have no evidence for.

Write a cover letter using only claims you can cite. Put the citation after each claim, and do not add a skill, a result, or a date that my documents do not state.

Which of my annual reviews mention teamwork? Quote the passage and cite it.
```

You can run the same search by hand:

```bash
npx rgr search "led the migration project results" --compact
```

When the documents hold no evidence, Ragmir returns nothing. A requirement with no cited passage is
a gap to tell the recruiter about honestly, not one to fill in. A passage marked `weakEvidence`
needs a second look. Ragmir's MCP server also ships an `answer` prompt that asks for a citation
on every claim.

## Local model or cloud assistant

Career documents are private: reviews carry judgments, CVs carry your contact details. A local
model through Ollama is the safest choice, because nothing leaves your machine. The
[local RAG tutorial](/local-rag/) shows the setup, including how to disable Ollama's cloud features.

A cloud assistant also works. It receives the passages it reads, not the whole folder, and its
provider's policy then applies. Check training, retention, region, access, and scope in the
[local or cloud guide](/local-vs-cloud-rag/) before you connect one.

## Limits

- The assistant drafts; you decide. Check each cited page before you send a letter.
- Ragmir does not apply for jobs, fill forms, or send emails. It does not read a job board.
- It gives no career, legal, or HR advice, and it cannot judge your fit for a role.
- The letter is only as good as your documents. Thin evidence gives a short letter.
- OCR can misread a scan. Compare the cited page with the original.

## Next steps

- [Local RAG tutorial: documents, Ollama, and CPU only](/local-rag/)
- [Local or cloud RAG: models, hardware, and your data](/local-vs-cloud-rag/)
- [RAG citations: line, page, slide, and cell](/rag-citations/)
- [Supported formats](/docs/supported-formats/)
