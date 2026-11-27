---
title: "RAG without a vector database, GPU, or API key | Ragmir"
description: "When BM25 keyword search plus optional local embeddings is enough for RAG: how Ragmir's default path works, what it measured, and the honest trade-offs."
h1: "RAG without a vector database: when keyword search is enough"
summary: "RAG needs a search index, not a vector database server. Ragmir's default local-hash retrieval ranks BM25 keyword evidence first in an embedded index under the project's .ragmir folder and needs no embedding model, GPU, or API key; on Ragmir's own repository it put an answering file in the top 3 for 82% of 89 developer questions and in the top 10 for 99%. Add a local embedding model when questions use words your documents do not."
section: guide
translationKey: "rag-without-vector-database"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["agentic-rag", "benchmarks", "local-rag"]
---

Retrieval-augmented generation only needs a way to find the passages that answer a question.
Ragmir does that in one Node.js process: parsing, the index, and search run where Ragmir runs, and
the index is an embedded LanceDB store in the git-ignored `.ragmir/` folder. There is no database
server to deploy and no embedding API to call, and with the default `local-hash` provider there is
no model to download either. Ragmir is the retrieval layer: the agent or application that calls it
writes the answer with the model it chooses.

## Can RAG work without a vector database?

Yes, when keyword evidence carries the answer. The default `local-hash` provider works like this:

1. **BM25 leads.** The full-text index covers each passage's body, structural context, and cited
   header text, plus its relative source path and the parts of camelCase, PascalCase, acronym, and
   letter-digit identifiers. A question about "login attempts" can therefore reach
   `LoginAttemptService.java`.
2. **Text is folded.** Case, accents, and other diacritics fold the same way in passages and
   queries, then the analyzer applies English stemming and removes English stop words.
3. **Hashed vectors only break ties.** The `local-hash` vector is a hashed lexical signal without
   inverse document frequency. It gets a weight of 0.01 in the reciprocal-rank fusion, so it only
   breaks ties or appends passages the full-text index did not return.
4. **Weak evidence returns nothing.** `local-hash` requires lexical evidence. It answers nothing
   when the words found nowhere in the index carry half of the question's IDF weight, as in "How
   does it sync with Pinecone?" on a corpus that never mentions Pinecone, and a search whose first
   five results are all weak returns no result.

So even the default keeps vectors, but they are hashed, they live in the project's `.ragmir/`
folder, and no server holds them.

## Hybrid search: BM25 plus optional local embeddings

With a local Transformers model, Ragmir fuses vector and full-text results by reciprocal-rank
fusion with `k = 60`, at equal weights. The model runs through the optional
`@huggingface/transformers` peer:

```bash
pnpm add -D @huggingface/transformers
pnpm exec rgr setup --semantic
pnpm exec rgr ingest
```

`rgr setup --semantic` installs the model this machine suits (multilingual Granite R2 on most)
unless the project already chose one, and `rgr models list` shows each model's download and the
memory indexing needs. Changing the model stages a validated rebuild on the next ingest. To embed
with a model you already serve, `embeddingProvider: "openai-compatible"` posts to Ollama, vLLM, or
another OpenAI-compatible endpoint; passage text and queries then go to that endpoint.

## RAG without a GPU or an API key

- **Retrieval needs neither.** `local-hash` runs offline on the CPU with no model, GPU, or API key.
  Semantic models run on the CPU too. A GPU is optional and only embeds ingestion batches
  (`ingestEmbeddingDevice: "webgpu"`); search keeps embedding short queries on the CPU.
- **The answer is a separate choice.** The model your agent or application calls may need a key. A
  local model, for example through Ollama with its cloud features disabled, keeps passages on the
  machine when the whole application runs locally; the
  [agent integration guide](/docs/agent-integration/) has that example.

## What the measurements show

On November 27, 2026, `pnpm bench:competitors` indexed 287 tracked files of Ragmir's repository in
several stacks and asked each its 89 developer questions, 30 off-topic, and 40 near-domain
questions, with `mxbai-embed-xsmall-v1` on every vector side (commit `10bb9f6`, Ragmir 6.20.0's
Core code, an Apple M3 Max; [method and raw report](/benchmarks/)):

| System | Answer in top 3 | Answer in top 10 | MRR@10 | Off-topic refused | Near-domain refused | Median search |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| **Ragmir**, hybrid with `mxbai-embed-xsmall-v1` | **87%** | **100%** | 0.658 | **28** of 30 | **13** of 40 | 19.1 ms |
| **Ragmir**, `local-hash` without a model | **82%** | **99%** | **0.675** | **23** of 30 | **7** of 40 | 17.3 ms |
| LangChain.js splitter with exact cosine search, as `MemoryVectorStore` | 70% | 93% | 0.581 | 0 of 30 | 0 of 40 | 6.5 ms |
| Orama hybrid, default similarity 0.8 | 14% | 20% | 0.102 | 2 of 30 | 0 of 40 | 8.5 ms |
| Orama hybrid, similarity 0.1 | 35% | 71% | 0.303 | 0 of 30 | 0 of 40 | 9.9 ms |
| MiniSearch BM25 | 74% | 98% | 0.596 | 2 of 30 | 0 of 40 | 1.5 ms |

Without any model, Ragmir ranked an answering file in the top 3 more often (82%) than the
LangChain.js pipeline with an embedding model (70%), and returned nothing for most off-topic
questions. Adding the model
raised the top 3 from 82 to 87% and the refusals of off-topic and near-domain questions.

## Trade-offs to weigh

- **Vocabulary.** Keywords find the words your documents use. Add a model when questions use other
  words (synonyms, paraphrases, another language) or when refusals should follow meaning, not
  keywords. Without one, an agent can send its own `lex` keywords, a `vec` paraphrase, or a `hyde`
  likely answer with the question: Ragmir searches their words, which reach passages the question's
  own words miss.
- **Refusals follow keywords.** A near-domain question that shares the project's vocabulary can
  still return passages, as the near-domain column shows.
- **Speed.** The in-memory libraries answered faster; Ragmir searches an on-disk index that ingests
  incrementally.
- **Your corpus decides.** One repository is not yours: run `rgr evaluate` on your own questions,
  with and without a model, before choosing.

## Is this vectorless RAG?

No, vectorless RAG is a different idea. As the PageIndex project describes it, it builds a
"hierarchical tree index" for each document, like "a table of contents optimized for LLMs and
agents", and has an LLM search that tree by reasoning, with "no vector DBs or chunking". Ragmir
chunks documents, keeps hashed or model vectors next to a keyword index, and ranks passages without
asking a generative model to pick them. An agent can still navigate by structure:
`ragmir_sources` with `outline: true` returns a document's sections with the citation of each
section's first passage, and expanding each `nextCitation` with `ragmir_expand` reads a document
through.

## Try it

```bash
pnpm add -D @jcode.labs/ragmir
pnpm exec rgr setup --no-ingest --agents claude,codex
pnpm exec rgr sources add "docs/**/*.md" "specs/**/*.docx" "src/**/*.ts"
pnpm exec rgr ingest
pnpm exec rgr search "authentication contract" --compact
```

Add `--explain` to a search to see each result's keyword and vector ranks and its matched terms.

## Next steps

- [What is agentic RAG?](/agentic-rag/)
- [Benchmarks, method, and limits](/benchmarks/)
- [Configuration: ranking and abstention](/docs/configuration/)
- [Build a local RAG](/local-rag/)
