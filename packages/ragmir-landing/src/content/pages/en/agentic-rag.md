---
title: "Agentic RAG: what it is and when to use it | Ragmir"
description: "What agentic RAG is: the agent decides when to search, rewords queries, expands citations, and stops on weak evidence. With the loop and a local example."
h1: "What is agentic RAG, and when should you use it?"
summary: "Agentic RAG lets the agent control retrieval. It decides when to search, rewords the question, opens the cited passages it needs, and stops when the evidence is weak. Ragmir provides the retrieval side. The agent and its model own the reasoning, the answer, and any action."
section: guide
setup: agents
translationKey: "agentic-rag"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["rag-without-vector-database", "case-studies/ragmir-repository", "benchmarks", "mcp-rag-server"]
---

Agentic RAG makes retrieval a tool that the agent calls when it needs evidence.

In plain retrieval-augmented generation, an application takes the user's question, retrieves
passages once, and hands them to a model. In agentic RAG, the agent searches when it needs to. It
changes its wording between calls and reads one passage in full before deciding what to look for
next. It can also conclude that the documents do not cover the question.

Ragmir is built for that pattern. It returns compact citations, expands the ones the agent selects,
and returns nothing when the evidence is weak. It does not run the agent loop or write the answer.

## Agentic RAG vs RAG

| | Plain RAG | Agentic RAG |
| --- | --- | --- |
| When retrieval runs | Once, before generation | Each time the agent decides it needs evidence |
| What is searched | The question as written | The question, the agent's rewordings, and its follow-up questions |
| What the model reads | The passages returned | The passages the agent expands, or a document read window by window |
| No good evidence | The single step answers or declines | The agent rewords once, searches elsewhere, or reports the gap |
| Ragmir interface | `RagmirRetriever` or `search()` | MCP tools, or `createRagmirTools` and `RagmirToolkit` for LangChain agents |

## The agent loop

<figure>
  <img src="/diagrams/agentic-rag-loop.svg" alt="The agentic RAG loop: the agent decides whether it needs evidence, calls ragmir_search, reports a gap on an empty result, expands the selected citation with ragmir_expand, and searches again until the evidence is enough to answer or act." width="800" height="560" loading="lazy" decoding="async">
</figure>

The loop that Ragmir's docs describe has five steps:

1. The agent reads the base's identity, scopes, and freshness once, from `ragmir://context` or
   `ragmir_status`.
2. It calls `ragmir_search` with a focused query, or sends up to five related questions in
   `queries`.
3. It expands the citation the answer will rely on with `ragmir_expand`.
4. When the evidence is incomplete, it rewords with `searches`. It can also narrow the search to
   folders or a named scope, or list the documents with `ragmir_sources`.
5. It answers with a citation for each claim, names the gaps, and verifies citations before
   acting.

## How Ragmir implements the retrieval side

- **Several formulations in one search.** `searches` adds up to five formulations of the same need,
  fused with the question into one ranking. A `lex` formulation holds keywords (a `"phrase"` is
  required, a `-word` excluded). A `vec` formulation is a paraphrase. A `hyde` formulation is a
  passage written as the answer might read. Each weighs half as much as the question's own lists,
  and a `hyde` passage a quarter. Only the question decides whether there is an answer, so
  formulations never turn a refusal into one.
- **A bounded context.** Search returns three compact citations by default within a 32 KB output
  budget per call. Passages already returned in the session come back as short `seen` stubs. A
  second search then spends its budget on new evidence.
- **Expansion on demand.** `ragmir_expand` returns a citation with its neighbours, up to five
  citations at once, and a `nextCitation` to read a long document through.
- **Signals the agent can act on.** An empty result means the base holds no evidence for the
  question. `weakEvidence` marks thin support. `sourceStatus` marks a file changed since indexing
  (`ragmir_ingest` refreshes the index). A notice names the question's words that no indexed
  passage holds.
- **Off-topic questions.** On Ragmir's own repository, 23 to 28 of 30 off-topic questions returned
  nothing on November 27, 2026 ([benchmarks](/benchmarks/)).

One search with formulations, as the agent sends it:

```json
{
  "query": "How are API requests throttled?",
  "searches": [
    { "type": "lex", "query": "\"rate limit\" quota -deprecated" },
    { "type": "vec", "query": "limits on how many calls a client may send" },
    { "type": "hyde", "query": "Each API key may send 600 requests per minute." }
  ],
  "intent": "gateway configuration"
}
```

## When to use agentic RAG, and when plain RAG is enough

Plain RAG is enough when one search with the user's own words finds the passage. The application
then only has to answer or decline.

The contract assistant in Ragmir's docs is that case. `RagmirRetriever` returns the clause that
answers with its page citation, or no documents when the contracts are silent. The application says
so instead of guessing. The docs' local-model example is likewise one retrieval pass, not an
autonomous agent.

Agentic RAG fits tasks where one passage is not the whole answer:

- implementing a feature from a specification, then searching again for its exceptions;
- diagnosing an incident from a runbook, an incident report, and the retry code;
- reading a long PDF or specification window by window;
- questions worded differently from the documents, where the agent's own keywords, paraphrase, or
  likely answer reach passages the question's words miss.

On a small code repository, a coding agent's own search is often enough. Grep remains the tool to
list every occurrence or match a regular expression.

## Run it locally

Index a project and query it from the shell. The same index serves the agents that `rgr setup`
connects:

```bash
npm install -D @jcode.labs/ragmir@6.20.0
npx rgr setup --no-ingest --agents claude,codex
npx rgr sources add "docs/**/*.md" "specs/**/*.docx" "src/**/*.ts"
npx rgr ingest
npx rgr search "authentication contract" --compact
```

From the CLI, `--lex`, `--vec`, and `--hyde` add formulations. `--explain` lists the formulations
that found each result.

Here is one turn of the loop. It was recorded on November 27, 2026 against Ragmir 6.20.0, with the
eleven guides of Ragmir's `docs/` folder indexed:

```text
ragmir_search({ query: "How do I run Ragmir on a server without internet access?" })
  [1] docs/server-deployment.md:L123-L138#8  Run Ragmir on a server > Without internet access
  [2] docs/docker.md:L96-L105#5              Run Ragmir with Docker > Servers and CI
  [3] docs/python.md:L211-L218#12            Use Ragmir from Python > Without Node.js
ragmir_expand({ citation: "docs/server-deployment.md:L123-L138#8" })
  ## Without internet access
  Build the image where the npm registry is reachable, then move it with `docker save` and
  `docker load`, or install from your internal npm mirror. At runtime, `local-hash` makes no
  network call [...]
```

The agent read 4,539 bytes of replies to reach the passage and its line range. Opening the three
cited files whole would have cost 22,014 bytes.

For an application, `createRagmirTools` from `@jcode.labs/ragmir/langchain` gives a LangChain.js
agent the same `ragmir_search` and `ragmir_expand` tools. `RagmirToolkit` does the same in Python.
The [LangChain integration](/integrations/langchain/) shows both.

## Limits

- Ragmir does not bundle a model, run an agent, or open an HTTP port. Planning, generation, and
  actions stay in the agent or application.
- Passages go wherever the agent's model runs. With a cloud-backed agent, the selected excerpts
  reach its provider.
- A network-facing host owns authentication, per-user authorization, transport security, and rate
  limits. Ragmir does not filter results per user.
- Retrieved text is evidence for the agent to weigh, never instructions to follow.

## Next steps

- [RAG without a vector database](/rag-without-vector-database/)
- [Ragmir's MCP server for agents](/mcp-rag-server/)
- [Agent integration guide](/docs/agent-integration/)
- [How Ragmir's own repository uses Ragmir](/case-studies/ragmir-repository/)
