---
title: "Claude or Claude with Ragmir: when to add local RAG | Ragmir"
description: "When Claude answers well from your files on its own, and when a local Ragmir index helps: PDFs and Office files, private documents, citations, and context."
h1: "Claude alone or Claude with Ragmir: when to add a local index"
summary: "Claude already reads your files: Claude Code greps the repository, and a project in the Claude apps searches what you upload. Ragmir adds a local index with exact citations where that falls short: PDFs and Office files in a repository, documents that must stay on your machine, citations you need to check, and long tasks where context counts."
section: comparison
setup: agents
translationKey: "compare/claude-vs-rag"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["claude-code-rag", "local-vs-cloud-rag", "integrations/claude-code", "benchmarks"]
---

Claude does not need Ragmir to read a file. What changes with Ragmir is how much Claude reads to
find the right passage, which files it can search at all, and where your documents go on the way.

## Three ways Claude reaches your documents

| | Claude Code alone | A project in the Claude apps | Claude with Ragmir |
| --- | --- | --- | --- |
| Setup | Nothing to install | Upload the files to a project | Install Ragmir, index once, connect it through MCP or the plugin |
| How it finds text | grep and find, then whole files | Whole files, or a project knowledge search once they outgrow the context window | A local index returns ranked passages with citations |
| PDFs, Office files, scans | grep cannot search inside them | Uploaded like any file | Searched like text, cited to the page, slide, or cell; scans through local OCR |
| Where the documents go | Claude reads them on your machine and sends what it reads to its model provider | Uploaded to Anthropic | The index stays on your machine; Claude receives the passages it reads |
| Text read per answer | A median of 71.4 KiB with a grep first pass | Not measured | A median of 4.7 to 4.8 KiB |
| Questions the documents do not answer | grep still matched files for 28 of 30 | Not measured | Nothing returned for 23 to 28 of 30 |

The measured rows come from 89 developer questions on Ragmir's own repository, run on November 27,
2026; [Claude Code and RAG](/claude-code-rag/) has the method and the full results. The project
column comes from Anthropic's help center, read the same day: on paid plans, a project switches to
retrieval automatically when its knowledge nears the context window
([RAG for projects](https://support.claude.com/en/articles/11473015-retrieval-augmented-generation-rag-for-projects)).

## Use Claude alone when

- The documents are text files in a repository, and questions use the words of the code. A grep
  first pass put an answering file in the top 10 for all 89 questions.
- You need every occurrence of an identifier, or every match of a regular expression. That is
  grep's job.
- You chat about a few documents you are free to upload, in a Claude project, with nothing to set
  up.

## Add Ragmir when

- The answers sit in PDFs, Word, PowerPoint, Excel, or scans, which grep cannot read.
- The documents must stay on your machine or your server, and only the passages Claude reads may
  leave it.
- You need a citation you can check: a line, a PDF page, a slide, or a cell.
- A long task needs its context window for the work, not for whole files read along the way.
- Several tools should share one index: Claude Code, Codex, Cursor, a desktop chat that starts
  local MCP servers, or your own code calling the Claude API.
- Claude should be able to say that the documents do not cover a question, instead of answering
  from the nearest file.

## What leaves your machine

With Ragmir, the index and the search run where Ragmir runs. Claude is still a cloud model: your
question and the passages it reads reach its provider. Before you connect confidential documents,
check what your plan allows for training on conversations and how long they are kept.

The [local or cloud guide](/local-vs-cloud-rag/) lists what to check, and shows how to answer with
a local model instead, so that nothing leaves the machine.

## Next steps

- [Does Claude Code use RAG? The measurements](/claude-code-rag/)
- [Add the Ragmir plugin to Claude Code](/integrations/claude-code/)
- [Local or cloud RAG: models, hardware, and your data](/local-vs-cloud-rag/)
- [Every benchmark and how to rerun it](/benchmarks/)
