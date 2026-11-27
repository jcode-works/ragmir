---
title: "LangChain local retriever with citations | Ragmir"
description: "Use Ragmir as a local LangChain retriever in JavaScript or Python, with an exact citation in each document's metadata and search tools for LangGraph agents."
h1: "LangChain local retriever with citations"
summary: "RagmirRetriever returns LangChain documents whose metadata holds an exact citation, in LangChain.js and in Python. It searches an index built on your machine, returns nothing when the documents hold no evidence, and comes with search and expand tools for LangChain and LangGraph agents."
section: integration
translationKey: "integrations/langchain"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["integrations", "integrations/llamaindex", "docs/api-reference", "docs/python"]
---

A LangChain retriever turns a question into documents for a chain or an agent. Ragmir's retriever
searches an index of the files you choose, built on the machine that runs Ragmir. The default
`local-hash` retrieval runs offline on the CPU, with no GPU, embedding API, or database server: the
index is an embedded LanceDB store in the Git-ignored `.ragmir/` folder. LangChain.js and the
Python package read the same index, and return the same citations, as Ragmir's MCP server and CLI.

## Index the documents

Index outside the request path, during setup, deployment, CI, or a scheduled job; searching never
indexes. From the project root:

```bash
npx --yes @jcode.labs/ragmir@6.20.0 init
npx --yes @jcode.labs/ragmir@6.20.0 sources add "docs/**/*.md"
npx --yes @jcode.labs/ragmir@6.20.0 ingest
```

`sources add` takes more globs, such as `"contracts/**/*.pdf"`, to index PDFs, Office files, or code
next to the Markdown. Ingestion is incremental: unchanged files are reused, and the previous index
stays searchable until the new one passes validation.

## LangChain.js retriever

Install the optional peer `@langchain/core` 1.x next to Ragmir:

```bash
npm install @jcode.labs/ragmir@6.20.0 @langchain/core
```

```ts
import { createRagmirClient } from "@jcode.labs/ragmir"
import { RagmirRetriever } from "@jcode.labs/ragmir/langchain"

const ragmir = await createRagmirClient({ cwd: process.cwd() })
const retriever = new RagmirRetriever({ client: ragmir, topK: 3, includePaths: ["docs"] })
try {
  const documents = await retriever.invoke("run on a server without internet access")
  for (const document of documents) {
    console.log(document.metadata.citation, document.pageContent.slice(0, 80))
  }
} finally {
  await ragmir.close()
}
```

Run on November 27, 2026 with Ragmir 6.20.0 and `@langchain/core` 1.5.1, over the eleven guides
of Ragmir's `docs/` folder, it printed each citation and the start of its passage:

```text
docs/server-deployment.md:L123-L138#8 ## Without internet access

Build the image where the npm registry is reachable,
docs/docker.md:L96-L105#5 ## Servers and CI

Run `rgr ingest` from a scheduled job after the documents cha
docs/python.md:L211-L218#12 ## Without Node.js

Without Node.js, the client runs the official image, so Dock
```

Each document keeps `source`, `citation`, line or page ranges, `contextPath`, `weakEvidence`, and
`sourceStatus` in its metadata. A question the sources cannot answer returns an empty array, so the
chain can say so instead of answering from unrelated text.

The retriever accepts the same search options as the client's `search`, such as `includePaths`,
`scope`, or `searches`, except `explain` and `signal`. Pass `projectRoot` instead of `client` to let
it open its own client, then call `retriever.close()` during shutdown.

## Python retriever

```bash
pip install langchain-ragmir
```

```python
from langchain_ragmir import RagmirRetriever

retriever = RagmirRetriever(project_root="/path/to/project", k=4, include_paths=["docs"])
for document in retriever.invoke("How do I run Ragmir on a server without internet access?"):
    print(document.metadata["citation"], document.page_content[:70].replace("\n", " "))
```

With `langchain-ragmir` 6.20.0 on Python 3.12, the same index answered:

```text
docs/server-deployment.md:L123-L138#8 ## Without internet access  Build the image where the npm registry is
docs/docker.md:L96-L105#5 ## Servers and CI  Run `rgr ingest` from a scheduled job after the doc
docs/python.md:L211-L218#12 ## Without Node.js  Without Node.js, the client runs the official imag
docs/agent-integration.md:L43-L54#6 ## Choose where inference runs  | Setup | Where evidence goes | What y
```

The package needs Python 3.11 or later, and Node.js 22.12 or later or Docker, because it drives
Ragmir's own engine. Prefer it to `langchain-mcp-adapters`, which is no longer maintained.

## RAG with citations in LangChain and LangGraph agents

For agentic RAG, give the agent tools instead of a fixed retrieval step:

```python
from langchain.agents import create_agent
from langchain_ragmir import RagmirToolkit

agent = create_agent(
    "anthropic:claude-sonnet-5-5",
    tools=RagmirToolkit(project_root="/path/to/project").get_tools(),
    system_prompt="Answer from the project documents and cite every claim with its citation.",
)
result = agent.invoke({"messages": [{"role": "user", "content": "What is the refund policy?"}]})
```

This agent calls Anthropic's API, so it needs your key; it was not run for this page.

`ragmir_search` answers the model with numbered citations and passage text, flags weak matches and
changed files, and keeps the documents as the tool message artifact. `ragmir_expand` reads one
citation with its neighbours and the next citation to read on. In LangChain.js,
`createRagmirTools({ client })` gives `createAgent` and LangGraph agents the same two tools. The
tools pass LangChain's standard retriever and tool test suites.

## Limits

- Ragmir calls no model and opens no port. Your application chooses the model, writes the prompt,
  and decides where passages go; a hosted model receives the passages you send it.
- Ragmir does not filter results per user. Authenticate and authorize the caller before searching,
  and give each audience its own base.
- Open one client per project root in a long-running process and close it at shutdown. A retriever
  never closes a client you passed in.
- Check passages flagged `weakEvidence` (`weak_evidence` in Python) before relying on them.

## Next steps

- [LlamaIndex retriever for local files](/integrations/llamaindex/)
- [TypeScript API reference](/docs/api-reference/)
- [Use Ragmir from Python](/docs/python/)
