---
title: "RAG retrieval benchmarks you can rerun | Ragmir"
description: "Ragmir's retrieval measured on its public repository against grep, LangChain.js, Orama, and MiniSearch: method, dated results, raw reports, and commands."
h1: "RAG retrieval benchmarks you can rerun"
summary: "On 89 developer questions about Ragmir's public repository, Ragmir 6.20.0's code put an answering file in the top 10 for 99 to 100% of them and returned nothing for 23 to 28 of 30 off-topic questions. A coding agent's grep first pass ranked files about as well but read a median of 71 KiB to reach an answer, against under 5 KiB through Ragmir. Measured on November 27, 2026."
section: benchmark
setup: agents
translationKey: "benchmarks"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["claude-code-rag", "rag-without-vector-database", "case-studies/ragmir-repository"]
---

On this repository's questions, Ragmir finds an answering file about as often as grep does. It
reads far less text to get there, and it returns nothing for most off-topic questions.

The benchmarks measure the retrieval layer only. They check:

- whether a file that answers a question comes back, and how high it ranks;
- whether questions the sources cannot answer return nothing;
- how long a search takes;
- how much text an agent reads to reach the answer.

They do not score the answers a model writes or the actions an agent takes.

Every figure below was measured on November 27, 2026 at commit `10bb9f6`, which carries Ragmir
6.20.0's Core code. The machine was one Apple M3 Max with Node.js 22. Each figure links to its raw
report.

## The questions and the files

Both benchmarks index the same 287 tracked files of Ragmir's repository. They include
documentation, Core source, skills, the landing's source and messages, and scripts. The questions
are public in
[`repository-questions.json`](https://github.com/jcode-works/ragmir/blob/main/packages/ragmir-core/benchmarks/fixtures/repository-questions.json):

- **89 developer questions**, each listed with every file that answers it.
- **30 off-topic questions** about sports, cooking, weather, or nonsense, which should return nothing.
- **40 near-domain questions** that pair the project's vocabulary with an integration, service, or
  format it does not have, such as its retired Chat and TTS packages. They should return nothing too.

A question counts as answered in the top 3 or top 10 when one of its files appears there.

MRR@10 is the mean reciprocal rank of the first answering file within the first 10 results. A
refusal is an empty result.

## A coding agent's first pass: grep or Ragmir

`pnpm bench:first-pass` compares how an agent reaches an answering file.

The grep side works like this:

1. It greps each question word of three characters or more, minus common English words, with
   case-insensitive ripgrep.
2. It ranks files by how many of those words they hold, then by matches.
3. It opens the files whole until one answers.

The Ragmir side runs its MCP server in a new session per question:

1. It runs the default search.
2. It runs a second search with ten results when the first holds no answering file.
3. It expands the answering citation once.

Bytes count the text the agent's model reads.

| First pass | Answer in top 3 | Answer in top 10 | Answer reached | Median bytes read to reach it | Off-topic refused | Near-domain refused |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| ripgrep 15.2.0, question words, files read whole | 85% | 100% | 89 of 89 | 71.4 KiB | 2 of 30 | 0 of 40 |
| Ragmir MCP, `local-hash` without a model | 82% | 99% | 88 of 89 | 4.7 KiB | 23 of 30 | 7 of 40 |
| Ragmir MCP, hybrid with `mxbai-embed-xsmall-v1` | 87% | 100% | 89 of 89 | 4.8 KiB | 28 of 30 | 13 of 40 |

Raw report: [first-pass-2026-11-27.json](/benchmarks/first-pass-2026-11-27.json).

<figure>
  <img src="/guides/first-pass-chart.webp" alt="Bar charts comparing grep&#x27;s first pass with Ragmir&#x27;s MCP server on 89 developer questions. Answer in the top 3: grep 85%, Ragmir local-hash 82%, Ragmir hybrid 87%. Median text read to reach the answer: grep 71.4 KiB, Ragmir 4.7 and 4.8 KiB. Off-topic questions refused out of 30: grep 2, Ragmir 23 and 28." width="1440" height="1163" loading="lazy" decoding="async">
  <figcaption>The first-pass table above, drawn to scale.</figcaption>
</figure>

On this repository, the questions share words with the files, so grep ranks as well as an index.
The difference is the context the agent spends, and whether an unanswerable question ends with
nothing. [Claude Code RAG](/claude-code-rag/) discusses what this means for coding agents.

## Against other retrieval stacks

`pnpm bench:competitors` runs the same questions through local TypeScript retrieval libraries.

Every vector side uses Ragmir's embedding function with `mxbai-embed-xsmall-v1`, so models,
prefixes, and vectors are identical. The other stacks read the same files, split by LangChain's
`RecursiveCharacterTextSplitter` (1,000 characters, 200 overlap, 4,365 chunks).

Orama runs with its default 0.8 hybrid similarity and with 0.1, which lets its vector side rank.
Median search is the median of warm sequential searches in one process.

| System | Answer in top 3 | Answer in top 10 | MRR@10 | Off-topic refused | Near-domain refused | Median search |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| **Ragmir**, hybrid with `mxbai-embed-xsmall-v1` | **87%** | **100%** | 0.658 | **28** of 30 | **13** of 40 | 19.1 ms |
| **Ragmir**, `local-hash` without a model | **82%** | **99%** | **0.675** | **23** of 30 | **7** of 40 | 17.3 ms |
| LangChain.js splitter with exact cosine search, as `MemoryVectorStore` | 70% | 93% | 0.581 | 0 of 30 | 0 of 40 | 6.5 ms |
| Orama hybrid, default similarity 0.8 | 14% | 20% | 0.102 | 2 of 30 | 0 of 40 | 8.5 ms |
| Orama hybrid, similarity 0.1 | 35% | 71% | 0.303 | 0 of 30 | 0 of 40 | 9.9 ms |
| MiniSearch BM25 | 74% | 98% | 0.596 | 2 of 30 | 0 of 40 | 1.5 ms |

Raw report: [competitors-2026-11-27.json](/benchmarks/competitors-2026-11-27.json).

The in-memory libraries answer faster. They also return results for almost every off-topic
question, and none ranks an answering file in the top 3 as often.

## Results on private corpora

The home page quotes the maintainer's own measurement on a private Java and TypeScript monorepo.
It comes from the
[README benchmark section](https://github.com/jcode-works/ragmir/blob/main/README.md#benchmarks).

The run used Ragmir 6.5 on November 1, 2026, on the same Apple M3 Max with Node.js 24, LanceDB
0.30, and the `quality` retrieval profile. The corpora are private, so you cannot rerun these two
rows. The method is the same, and `rgr evaluate` applies it to your own documents.

| Corpus | Embeddings | Answer in top 3 | Answer in top 10 | Off-topic refused | Near-domain refused | Median search |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Java and TypeScript monorepo with Office files and scans: 2,325 files, 30,171 chunks, 101 developer questions | `multilingual-e5-base` | 77% | 94% | 22 of 30 | 11 of 30 | 36 ms |
| French and English product documentation: 299 files, 21,011 chunks, 60 questions | `mxbai-embed-xsmall` | 100% | 100% | 23 of 30 | 9 of 30 | 26 ms |

## How to reproduce

From a checkout of the Ragmir repository at commit `10bb9f6`, at its root:

```bash
pnpm install --frozen-lockfile
pnpm bench:first-pass -- --model-path /path/to/models
pnpm bench:competitors -- --model-path /path/to/models
```

`bench:first-pass` needs ripgrep (`rg`) on the path. The vector sides need
`mxbai-embed-xsmall-v1` already present at the model path. The benchmarks use Transformers only
with a local model, and remote model downloads remain disabled.

Each run writes its report under `packages/ragmir-core/benchmarks/.results/`. The report holds the
commit, machine, runtime versions, and every metric.

The
[benchmark guide](https://github.com/jcode-works/ragmir/blob/main/packages/ragmir-core/benchmarks/README.md)
describes both methods and the other harnesses (quality gate, scale, vector index, parsers), with
the claim rules each one enforces. `pnpm bench:quality` is a regression gate, not a finding, so its
averages are not reported here.

## Measure your own corpus

These figures describe one public repository, not your documents. `rgr evaluate` runs the same
kind of measurement on your files.

A golden file lists real questions with the files that answer them. It also lists
`answerable: false` questions that must return nothing.

```json
{
  "topK": 5,
  "thresholds": { "recallAt5": 0.8, "maximumFalsePositiveRate": 0.2 },
  "queries": [
    { "id": "approval", "query": "Who signs off a production release?", "expectedPaths": ["docs/releases.md"] },
    { "query": "Which Helm chart deploys the billing API?", "answerable": false, "category": "negative" }
  ]
}
```

```bash
npx rgr evaluate --golden ragmir.golden.json
npx rgr evaluate --golden ragmir.golden.json --baseline before.json
```

The report gives Recall@1/3/5/10, Precision@5, MRR@10, nDCG@10, the exact citation rate, and the
false-positive rate on hard negatives.

A failed threshold exits with status 1, so the same command can gate a CI job. `--baseline` prints
the signed change per metric against an earlier `--json` report.

## Limits

- Everything ran on one machine, an Apple M3 Max.
- The reproducible rows use one public corpus, Ragmir's own repository, in English, with text files
  only. Measure the release you install on your own documents.
- The first-pass agent stops at the first answering file. A real agent may read more, or less.
- Near-domain questions stay the hardest case. With a model, 27 of 40 still returned passages.
- The two private corpora above are described, not published, and were measured with Ragmir 6.5.

## Next steps

- [Claude Code RAG: grep versus a local index](/claude-code-rag/)
- [RAG without a vector database](/rag-without-vector-database/)
- [How Ragmir's own repository uses Ragmir](/case-studies/ragmir-repository/)
- [CLI reference, including `rgr evaluate`](/docs/cli-reference/)
