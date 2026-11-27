---
title: "LlamaIndex retriever for local files with citations | Ragmir"
description: "Install llama-index-retrievers-ragmir to give a LlamaIndex query engine a retriever over local code, PDFs, and Office files, with the citation in every node."
h1: "LlamaIndex retriever for local files"
summary: "The llama-index-retrievers-ragmir package adds a RagmirRetriever that LlamaIndex query engines accept. It searches a Ragmir index of your local files, built and queried on your machine, and every node carries the passage's citation."
section: integration
translationKey: "integrations/llamaindex"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["integrations", "integrations/langchain", "docs/python", "docs/supported-formats"]
---

A LlamaIndex query engine needs a retriever that returns nodes for a question. Ragmir's retriever
returns them from an index of the files you choose, such as code, Markdown, PDFs, Word, PowerPoint,
and Excel files, mail, and design or API exports, parsed and indexed on the machine that runs
Ragmir. Each node carries the passage's citation, so an answer can point to the line, PDF page,
slide, or cell it came from. Ragmir retrieves; LlamaIndex and the model you configure write the
response.

## Install

```bash
pip install llama-index-retrievers-ragmir
```

The package needs Python 3.11 or later, and Node.js 22.12 or later or Docker, because it drives
Ragmir's own engine: the project's npm install of `@jcode.labs/ragmir` when there is one, else a
global `rgr`, else the matching npm release through `npx`, else the `ghcr.io/jcode-works/ragmir`
image. Set `RAGMIR_COMMAND` to choose another command.

## Index the local files

Select the sources and build the index once, from the project root:

```bash
npx --yes @jcode.labs/ragmir@6.20.0 init
npx --yes @jcode.labs/ragmir@6.20.0 sources add "docs/**/*.md"
npx --yes @jcode.labs/ragmir@6.20.0 ingest
```

Name the package as above: `npx rgr` only works once a project installs `@jcode.labs/ragmir` with
npm. `sources add` accepts more globs, such as `"specs/**/*.pdf"`, and `!` exclusions. Ingestion is
incremental, so later runs read only new and changed files. The `ragmir` Python client
(`pip install ragmir`) offers the same steps as `init_project`, `add_sources`, and `ingest()`.

## Query with the retriever

```python
from llama_index.core import Settings
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.llms.ollama import Ollama
from llama_index.retrievers.ragmir import RagmirRetriever

Settings.llm = Ollama(model="gemma4:12b-it-qat", request_timeout=180.0)
retriever = RagmirRetriever("/path/to/project", similarity_top_k=4)
engine = RetrieverQueryEngine.from_args(retriever)
response = engine.query("How do I run Ragmir on a server without internet access?")
print(response)
for node in response.source_nodes:
    print(node.node.metadata["citation"])
```

The query engine uses the LLM set in `Settings`, here a local model served by Ollama
(`pip install llama-index-llms-ollama`), so the whole query stays on the machine. Run on November
27, 2026 with `llama-index-retrievers-ragmir` 6.20.0 over the eleven guides of Ragmir's `docs/`
folder, it took 53 seconds on an Apple M3 Max, most of it generation, and ended with the four
cited sources:

```text
[...]
*   **Runtime:** The container can ingest and search with `--network none` because `local-hash` does not make any network calls.
[...]
docs/server-deployment.md:L123-L138#8
docs/docker.md:L96-L105#5
docs/python.md:L211-L218#12
docs/agent-integration.md:L43-L54#6
```

Only the citation and its context path reach the LLM prompt from the node metadata. Nodes keep
Ragmir's ranking order without a similarity score, so read their order rather than a score.

## What the retriever brings to local files

- More than 900 extensions and file names index with no extra install. Scanned PDFs, photos, and
  legacy `.doc` files use local extractors that you enable.
- Citations follow each format: `docs/runbook.md:L12-L18#3` for lines,
  `contracts/msa-acme-2026.pdf:p7#3` for a PDF page, and slide, sheet and cell, or named-section
  coordinates for the rest.
- Ragmir search returns nothing when the evidence is weak, so a question the documents do not cover
  can be answered as such instead of from the nearest passage.
- The default `local-hash` retrieval needs no embedding API or GPU; a local semantic model is
  optional.

## Limits

- Ragmir calls no model and opens no port. The LLM your query engine calls receives the passages in
  its prompt, so a hosted model sees them.
- Ragmir does not filter results per user. Authenticate callers in your application and give each
  audience its own base.
- An ingest started through the Python client is refused while `rgr security-audit` warns, for
  example when local OCR commands are configured. Run `run_cli("/path/to/project", "ingest")` from
  an operator script instead.
- In a long-running service, use one Ragmir client per project and close it at shutdown.

## Next steps

- [Use Ragmir from Python](/docs/python/)
- [Supported formats](/docs/supported-formats/)
- [LangChain local retriever with citations](/integrations/langchain/)
