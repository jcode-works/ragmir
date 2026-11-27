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

Ragmir covers the retrieval part of shipping RAG on a customer's documents inside the customer's
perimeter.

Parsing, embeddings, the index, and search run in one Node.js process on the customer's machine.
There is no embedding API, vector database, telemetry, or hosted store to declare in a security
review.

The customer's service or agent keeps the model, the user interface, and the access rules.

## From a laptop demo to the customer's server

Start with a cited demo on a laptop, then run the same `ragmir.config.json` on the customer's
server. Linux, macOS, and Windows are tested on every release.

Debian or Alpine containers run Ragmir as a non-root user with a read-only root filesystem and no
network.

- Point `storageDir` at a persistent volume and mount the documents read-only.
- `local-hash` needs no model and makes no network call. Stage a semantic model or OCR engines
  first when the questions or the scans need them ([air-gapped RAG](/air-gapped-rag/)).
- Review the configuration, then approve its commands and endpoints:

  ```bash
  rgr trust --yes
  ```

  In an image you build and review yourself, set `RAGMIR_TRUST_PROJECT_CONFIG=1` instead.

- Check coverage before trusting the corpus. The audit lists the files that were skipped and why:

  ```bash
  rgr audit --unsupported
  ```

The [self-hosted RAG guide](/self-hosted-rag/) has the container commands and a deployment
checklist.

## Prove retrieval quality before production

Measure retrieval on the customer's own questions before anyone relies on the answers.

Collect 20 to 50 real questions to start. Take them from users, tickets, or agent sessions, and
phrase them the way people ask them, not as copies of headings.

Add hard negatives. These are plausible questions the documents do not answer, including
near-domain ones that share the vocabulary but miss the fact. Ragmir must return nothing for them.

Keep the golden file under `.ragmir/` when the questions themselves are confidential.

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

<figure>
  <img src="/guides/evaluate-offline.webp" alt="Terminal running rgr evaluate in the official 6.20.0 image with --network none on an eight-question golden file. Recall@5 is 1.000, but falsePositiveRate is 1.000, the maximumFalsePositiveRate gate fails, and the two hard negatives list the files they returned." width="1440" height="1523" loading="lazy" decoding="async">
  <figcaption>A real run on a demo corpus of eleven Markdown guides and one PDF. Every answerable question finds its file in the top 5, but both hard negatives return passages: the false-positive gate fails and the command exits with status 1. That is the case to fix before anyone relies on the answers.</figcaption>
</figure>

The report covers Recall@1/3/5/10, Precision@5, MRR@10, nDCG@10, the exact citation rate, the
false-positive rate on hard negatives, and p50 and p95 latency. It runs against the local index, so
the whole measurement stays inside the perimeter.

When a case misses, two commands help:

```bash
rgr search "<query>" --explain --top-k 10
rgr preview --path <file> --json
```

The first shows each result's vector and keyword ranks. The second shows how the expected file was
chunked.

Change one setting at a time and compare against the baseline. Keep a change only when the report
improves without new false positives. Never edit expectations or lower thresholds to make a change
pass.

A suite passes for verification when it meets all of these conditions:

- at least 100 cases
- graded relevance
- exact citations
- hard negatives
- every threshold met

A passing suite stores a fingerprint in the index. `rgr doctor --deep` then reports retrieval
quality as verified while the golden file, corpus, model revision, retrieval profile, and index
policy stay the same.

The same `rgr evaluate` command gates CI after `rgr ingest`.

## Hand over the CLI and images

- **A pinned release.** The npm package in the customer's lockfile, or an exact image tag such as
  `ghcr.io/jcode-works/ragmir:6.20.0` (`6.20.0-full` adds the semantic runtime and OCR).
- **One committed configuration.** `ragmir.config.json` ships with the deployment, so the next team
  inherits the same sources and settings. The index, models, and documents stay out of Git.
- **Health and diagnosis.** `rgr status --json` reports `ready`, the base name, and the indexed file
  count; `rgr doctor` checks freshness and configuration and lists the next steps.
- **Safe upgrades.** Start with the upgrade check. Upgrades keep the last validated index until
  its replacement passes, so a repair never starts by deleting `.ragmir/storage/`.

  ```bash
  rgr upgrade --check
  ```

- **Agent skills.** Install the setup and evaluation skills, among others, for the customer's own
  agents:

  ```bash
  npx skills add jcode-works/ragmir
  ```

## What the customer's application still owns

- **No user interface.** Ragmir returns citations to a line, page, slide, cell, or section. It does
  not render documents or show highlighted previews; opening the cited page belongs to the
  customer's application.
- **No authentication or per-user access control.** Ragmir has no HTTP server and does not know the
  users. The host owns TLS, authentication, authorization, and rate limits. Give each audience its
  own base and check access before calling `search`.
- **No model.** Generation goes to the model the application chooses: local, self-hosted, or a
  provider that receives the passages it is sent.
- **No compliance claim.** Exact citations, explicit source selection, and evaluation reports
  support traceability. They do not by themselves make a system compliant with GDPR or the EU AI
  Act, and none of this is legal advice.

Ragmir is open source under AGPL-3.0-only. JCode Works also offers a commercial license for uses
the AGPL does not fit, such as integrating Ragmir into proprietary software or a hosted service.

## Next steps

- [Self-hosted RAG and its deployment checklist](/self-hosted-rag/)
- [Air-gapped RAG without internet access](/air-gapped-rag/)
- [CLI reference, including retrieval quality](/docs/cli-reference/)
- [The `ragmir-evaluate` skill](https://github.com/jcode-works/ragmir/blob/main/skills/ragmir-evaluate/SKILL.md)
