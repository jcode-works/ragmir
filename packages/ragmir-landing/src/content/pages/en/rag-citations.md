---
title: "RAG Citations: Exact Lines, Pages, Slides, and Cells | Ragmir"
description: "What a checkable RAG citation looks like: line, PDF page, slide, cell, EPUB spine, and section coordinates per format, and how Ragmir checks each source."
h1: "RAG with citations: exact sources you can check"
summary: "A RAG citation names the source passage behind an answer. Ragmir cites each passage by its project path plus a native coordinate (lines, a PDF page, a slide, a sheet and cell range, an EPUB spine item, or a named section) and emits a coordinate only when it can be verified."
section: guide
translationKey: "rag-citations"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["rag-vs-mcp", "local-rag", "use-cases/forward-deployed-engineers", "self-hosted-rag"]
---

A citation is useful when a reader can open it and land on the text that supports the claim. A
file name alone sends the reader back to searching the document, and a wrong page sends them to the
wrong text. Ragmir returns a citation with every passage, built from the parsed source, and checks
it again when the passage is expanded. The agent or application that writes the answer quotes the
citation next to the claim it supports.

## What a Ragmir citation looks like

```text
contracts/msa-acme-2026.pdf:p7#3
```

- `contracts/msa-acme-2026.pdf` is the project-relative path, stored with forward slashes and in
  Unicode NFC on every platform.
- `:p7` is the coordinate: page 7 of the PDF.
- `#3` is the index of the passage (the chunk) within the document.

The shape stays the same for every format, and only the coordinate changes:
`docs/adr/0012-authentication.md:L18-L26#2` cites lines 18 to 26, and
`book.xlsx:sheet=Dashboard:cells=A2-F12#0` a cell range.

## Citation coordinates per format

| Source | Coordinate | Example from the docs |
| --- | --- | --- |
| Code, Markdown and other text, CSV, most configuration | Source lines | `:L10-L12`, `docs/runbook.md:L12-L18#3` |
| PDF | Page, or a page range when short consecutive pages share a passage | `:p3`, `agenda.pdf:p1-p9#0` |
| PowerPoint | Slide | `:slide12` |
| Excel | Sheet and cell range; consecutive rows of one table share a passage | `:sheet=Finance%20Ops:cells=A7-D7` |
| EPUB | Spine item | `:spine2` |
| Word, JSON, YAML, `.eml` and `.msg` mail | Passage number | `specs/account-recovery.docx#2` |
| Data models, diagrams, API descriptions, mailboxes, design files, notes, GeoJSON, SARIF | Named section per object, or lines | `model.pdm:section=Table%20INVOICE#3` |
| Scanned pages, images, legacy `.doc` (optional local extractor) | Page or passage | |

Markdown passages also carry their heading path, and two spreadsheet tables, two sheets, or a
sheet chart never share a passage. [Supported formats](/docs/supported-formats/) lists every
extension and its citation.

## Page number citations for PDFs

- Embedded PDF text is extracted first. Optional local OCR runs only on pages without extracted
  text, in bounded batches with a cache keyed by source checksum and page, among other fields.
- When short consecutive pages share a passage, the citation names the whole range, such as
  `agenda.pdf:p1-p9#0`, rather than one page.
- Line coordinates appear only for source-preserving text. A PDF passage never gets invented
  source lines, and its coordinates are not byte offsets into the binary file.

## When page citations go wrong

Page citations can go wrong in at least two ways: the page drifts, so the citation points one page
off, or the page number is lost between indexing and display, so the viewer opens the document at
its start. Two public bug reports in the Open WebUI project show both.
[Issue #33603](https://github.com/open-webui/open-webui/issues/33603) reported that Docling-indexed
PDFs had no `page_label`, so the model opened and cited the page before the right one.
[Issue #35108](https://github.com/open-webui/open-webui/issues/35108) reported that native Knowledge
citations lost the PDF page number and opened at the start of the document. Both are now closed.

In Ragmir, the page is part of the citation string, so it travels wherever the citation goes; the
LangChain.js retriever also keeps the citation and its line or page range in each document's
`metadata`. Coordinates are emitted only when they are verifiable. You can test them too: in a
golden file, `expectedCitations` requires exact citations, and an `exactCitationRate` threshold
fails `rgr evaluate` when they drift. Keep exact citations for facts that must be cited precisely,
because they change when the file is edited. The repository's
[document evidence benchmark](https://github.com/jcode-works/ragmir/blob/main/packages/ragmir-core/examples/document-evidence-benchmark/README.md)
gates an exact PDF page citation the same way.

Ragmir has no document viewer. Opening the file at the cited page and highlighting the passage is
the job of the application that shows the answer, so test that last step in your own interface.

## How expansion checks the source

1. `sourceStatus: "modified"` or `"missing"` flags a result whose file changed or disappeared after
   indexing, from one `stat` per cited file.
2. `evidence.id` identifies the indexed passage. Pass it as `expectedEvidenceId` to
   `expandCitation` (or to `ragmir_expand`), and changed indexed content is rejected with
   `EVIDENCE_CHANGED`.
3. A citation whose lines moved fails with the passage's current citation in the message. One that
   finds nothing returns `found: false` with a `suggestedCitation` or `similarPaths`.
4. Citations written into Markdown pages are checked by `rgr audit --knowledge`, which reports
   `brokenCitations` when their passage changed or left the index.

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

A citation shows where a passage came from, not that it covers everything the question asks:
expand the evidence and check exceptions and missing facts before acting on it.

## Next steps

- [Supported formats and their citations](/docs/supported-formats/)
- [TypeScript API: search and expansion](/docs/api-reference/)
- [RAG vs MCP](/rag-vs-mcp/)
- [Local RAG tutorial](/local-rag/)
