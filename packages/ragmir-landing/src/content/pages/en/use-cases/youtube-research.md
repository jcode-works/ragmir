---
title: "RAG for YouTube research: cited scripts from your sources | Ragmir"
description: "Use Ragmir as the research desk of a YouTube channel: index books, papers, and past captions, check scripts against cited sources, and keep a topic wiki current."
h1: "RAG for YouTube creators: research, scripts, and a wiki from your sources"
summary: "Index the books, papers, articles, and caption files behind your videos once. Your AI assistant then answers research questions with citations, checks a script against your sources, and keeps a wiki of topics that grows from one video to the next. Ragmir finds and cites; it does not write, record, or publish."
section: use-case
translationKey: "use-cases/youtube-research"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["local-vs-cloud-rag", "rag-citations", "agentic-rag", "local-rag"]
---

A video built on research needs sources you can find again. Ragmir turns the folder behind your
channel into a base your AI assistant can search, and every answer points to the page or the line
it came from.

## What goes into the base

- **Books and long reads** as PDF or EPUB, cited to the page or to the EPUB section.
- **Papers, reports, and articles** saved as PDF, HTML, or Markdown.
- **Your own past videos** as caption files: `.srt`, `.vtt`, `.sbv`, and other subtitle formats are
  cited to their lines, which carry the timestamps.
- **Notes, scripts, and figures** in Markdown, Word, or Excel, cited to the line, the passage, or
  the cell.

Ragmir indexes more than 900 file types; the [supported formats](/docs/supported-formats/) list
them all. It reads text, not sound: a video needs its captions or a transcript before Ragmir can
cite it.

## Set up the research folder

Keep the sources as you received them in one folder, and the pages your AI writes in another. This
is the layout of Ragmir's `ragmir-wiki` skill:

```text
channel/
  raw/    books, papers, articles, and caption files, never edited
  wiki/   topic pages your AI maintains, one topic per page
```

Install Ragmir in the folder, add both parts as sources, and build the index:

```bash
npm install -D @jcode.labs/ragmir
npx rgr init
npx rgr sources add "raw/**" "wiki/**"
npx rgr ingest
```

Then connect your assistant. A desktop chat that supports local MCP servers, or a coding agent such
as Claude Code, Codex, or Cursor, starts Ragmir's server against this folder; the
[integrations](/integrations/) show each one. To give your agent the skills that drive the steps
below, including `ragmir-wiki`:

```bash
npx skills add jcode-works/ragmir
```

## Research a video with citations

Ask your assistant the questions the video has to answer. It searches the base, reads the passages
it needs, and cites each one.

<figure>
  <img src="/guides/creator-search.webp" alt="Terminal running rgr search with the question Should passwords be changed periodically. The results cite a wiki page, wiki/password-rotation.md:L8-L12#1, the captions of episode 12, raw/captions/ep-12-password-myths.vtt:L1-L16#0, and page 25 of a NIST PDF, raw/papers/nist-sp-800-63b-4.pdf:p25#56." width="1440" height="934" loading="lazy" decoding="async">
  <figcaption>One question on a demo channel folder: a topic page of the wiki, the captions of a past episode, and the page of the NIST guideline behind both, each with its citation.</figcaption>
</figure>

When the sources hold no evidence, Ragmir returns nothing, and the assistant can say that your
research does not cover the question. That is the moment to find a new source, not to improvise.

## Check a script before you record

Paste a draft and ask the assistant to check each claim against the base. Ragmir's MCP server ships
an `answer` prompt that asks for a citation on every claim and a plain statement when the documents
hold no evidence. A passage marked `weakEvidence` deserves a second look, and a claim with no
passage at all needs a source or a rewrite.

## Keep a topic wiki that grows with the channel

The wiki is where research accumulates: one Markdown page per topic, written by your assistant from
the sources, with a citation behind every claim. Ragmir never writes a page. It searches, cites,
lists, and audits.

- The `compile-source` prompt walks the model through turning one source into cited pages. The
  `ragmir-wiki` skill also updates the pages that already cover a topic before creating new ones.
- Each page records the sources it was written from in its front matter, and links related pages
  with `[[wikilinks]]`.
- `rgr audit --knowledge` lints the wiki: broken links, missing pages, changed citations, and pages
  whose sources changed since they were written.

```bash
npx rgr audit --knowledge --path wiki
```

<figure>
  <img src="/guides/creator-audit.webp" alt="Terminal running rgr audit --knowledge --path wiki on the demo folder. It reports one page with two links and two valid citations, two missing pages, Passkeys and Password myths, that the page links to, and one page that no other page links to yet." width="1440" height="681" loading="lazy" decoding="async">
  <figcaption>The audit of the demo wiki: both citations still hold, and the page links to two topics that have no page yet, a ready list for the next research session.</figcaption>
</figure>

## Automate the research desk

The routine runs without you once it is set up:

- Drop new sources into `raw/` and run `npx rgr ingest`; it reads only new and changed files.
- At the start of a session, the assistant lists what changed since the last one with
  `ragmir_sources` and `changedSince`, then compiles those sources into the wiki.
- A scheduled `npx rgr audit --knowledge` flags pages to update when a source changes.
- For the next video, the assistant drafts an outline from the wiki, with the citations you check
  before recording.

Recording, editing, and publishing stay yours. Ragmir is the research layer behind them.

## Keep your research local, or use a cloud AI

The index stays on your machine either way. With a local model through Ollama, nothing leaves it.
With a cloud assistant, the passages it reads reach its provider, which matters for unpublished
scripts, sponsor agreements, or private notes. The [local or cloud guide](/local-vs-cloud-rag/)
covers the models, the hardware, and what to check before you choose.

## Limits

- Ragmir does not transcribe audio or video. Export captions, or transcribe first.
- A caption citation points to lines of the caption file, whose timestamps lead you back to the
  moment; it does not open the video player.
- The assistant writes the outline and the wiki. Check each quote against its cited passage before
  it goes on screen.

## Next steps

- [Local or cloud RAG: models, hardware, and your data](/local-vs-cloud-rag/)
- [RAG citations: line, page, slide, and cell](/rag-citations/)
- [Agentic RAG: how the assistant searches](/agentic-rag/)
- [Supported formats](/docs/supported-formats/)
