---
title: "On-Premise RAG for Forward Deployed Engineers | Ragmir"
description: "Ship RAG on a customer's documents inside their network: index on their servers, prove retrieval with rgr evaluate, then hand over the CLI and Docker images."
h1: "RAG for forward deployed engineers, inside the customer's perimeter"
summary: "Index the customer's documents on their own infrastructure, measure retrieval on their questions before anyone relies on the answers, and leave a pinned CLI, Docker image, and committed configuration behind. The customer's application keeps the interface, authentication, and per-user access."
section: use-case
translationKey: "use-cases/forward-deployed-engineers"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["self-hosted-rag", "air-gapped-rag", "rag-citations", "local-rag"]
---

This page is for forward deployed engineers who ship RAG on a customer's documents inside the
customer's perimeter. Ragmir covers the retrieval part of that job. Parsing, embeddings, the index,
and search run in one Node.js process on the customer's machine, so there is no embedding API,
vector database, telemetry, or hosted store to declare in a security review. The customer's service
or agent keeps the model, the user interface, and the access rules.

## From a laptop demo to the customer's server

Start with a cited demo on a laptop, then run the same `ragmir.config.json` on the customer's
server. Linux, macOS, and Windows are tested on every release, and Debian or Alpine containers run
Ragmir as a non-root user with a read-only root filesystem and no network.

- Point `storageDir` at a persistent volume and mount the documents read-only.
- `local-hash` needs no model and makes no network call. Stage a semantic model or OCR engines
  first when the questions or the scans need them ([air-gapped RAG](/air-gapped-rag/)).
- Review the configuration, then approve its commands and endpoints with `rgr trust --yes`, or set
  `RAGMIR_TRUST_PROJECT_CONFIG=1` in an image you build and review yourself.
- Check coverage before trusting the corpus: `rgr audit --unsupported` lists the files that were
  skipped and why.

The [self-hosted RAG guide](/self-hosted-rag/) has the container commands and a deployment
checklist.

## Prove retrieval quality before production

Measure retrieval on the customer's own questions before anyone relies on the answers. Collect 20
to 50 real questions to start, from users, tickets, or agent sessions, phrased the way people ask
them rather than copied from headings. Add hard negatives: plausible questions the documents do not
answer, including near-domain ones that share the vocabulary but miss the fact. Ragmir must return
nothing for them. Keep the golden file under `.ragmir/` when the questions themselves are
confidential.

```json
{
  "topK": 5,
  "thresholds": { "recallAt5": 0.8, "maximumFalsePositiveRate": 0.2 },
  "queries": [
    { "id": "approval", "query": "Who signs off a production release?", "expectedPaths": ["docs/releases.md"] },
    {
      "query": "How long do we keep invoices?",
      "relevanceJudgments": [{ "kind": "path", "value": "policies/retention.pdf", "relevance": 3 }]
    },
    { "query": "Which Helm chart deploys the billing API?", "answerable": false, "category": "negative" }
  ]
}
```

```bash
rgr evaluate --golden ragmir.golden.json          # exits with status 1 when a threshold fails
rgr evaluate --golden ragmir.golden.json --json   # adds gates, per-category groups, and fingerprints
rgr evaluate --golden ragmir.golden.json --baseline before.json   # signed change per metric
```

The report covers Recall@1/3/5/10, Precision@5, MRR@10, nDCG@10, the exact citation rate, the
false-positive rate on hard negatives, and p50 and p95 latency. It runs against the local index, so
the whole measurement stays inside the perimeter. When a case misses,
`rgr search "<query>" --explain --top-k 10` shows each result's vector and keyword ranks, and
`rgr preview --path <file> --json` shows how the expected file was chunked. Change one setting at a
time, compare against the baseline, and keep a change only when the report improves without new
false positives. Never edit expectations or lower thresholds to make a change pass.

A passing suite with at least 100 cases, graded relevance, exact citations, hard negatives, and
every threshold stores a fingerprint in the index. `rgr doctor --deep` then reports retrieval
quality as verified while the golden file, corpus, model revision, retrieval profile, and index
policy stay the same. The same `rgr evaluate` command gates CI after `rgr ingest`.

## Hand over the CLI and images

- **A pinned release.** The npm package in the customer's lockfile, or an exact image tag such as
  `ghcr.io/jcode-works/ragmir:6.20.0` (`6.20.0-full` adds the semantic runtime and OCR).
- **One committed configuration.** `ragmir.config.json` ships with the deployment, so the next team
  inherits the same sources and settings; the index, models, and documents stay out of Git.
- **Health and diagnosis.** `rgr status --json` reports `ready`, the base name, and the indexed file
  count; `rgr doctor` checks freshness and configuration and lists the next steps.
- **Safe upgrades.** Start with `rgr upgrade --check`. Upgrades keep the last validated index until
  its replacement passes, so a repair never starts by deleting `.ragmir/storage/`.
- **Agent skills.** `npx skills add jcode-works/ragmir` installs the setup and evaluation skills,
  among others, for the customer's own agents.

## What the customer's application still owns

- **No user interface.** Ragmir returns citations to a line, page, slide, cell, or section. It does
  not render documents or show highlighted previews; opening the cited page belongs to the
  customer's application.
- **No authentication or per-user access control.** Ragmir has no HTTP server and does not know the
  users. The host owns TLS, authentication, authorization, and rate limits: give each audience its
  own base and check access before calling `search`.
- **No model.** Generation goes to the model the application chooses: local, self-hosted, or a
  provider that receives the passages it is sent.
- **No compliance claim.** Exact citations, explicit source selection, and evaluation reports
  support traceability, but they do not by themselves make a system compliant with GDPR or the EU
  AI Act, and none of this is legal advice.

Ragmir is open source under AGPL-3.0-only. JCode Works also offers a commercial license for uses the
AGPL does not fit, such as integrating Ragmir into proprietary software or a hosted service.

## Next steps

- [Self-hosted RAG and its deployment checklist](/self-hosted-rag/)
- [Air-gapped RAG without internet access](/air-gapped-rag/)
- [CLI reference, including retrieval quality](/docs/cli-reference/)
- [The `ragmir-evaluate` skill](https://github.com/jcode-works/ragmir/blob/main/skills/ragmir-evaluate/SKILL.md)
