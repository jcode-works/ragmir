---
title: "Self-Hosted RAG on a VPS or On-Premise Server | Ragmir"
description: "Run Ragmir on a VPS or on-premise server with the slim or full Docker image: where the index and models live, how to share a base, and a deployment checklist."
h1: "Self-hosted RAG on your VPS or on-premise server"
summary: "Ragmir is a retrieval layer you host yourself. It parses, indexes, and searches your documents on your server and returns cited passages to the service or agent that calls it. Your service keeps TLS, authentication, per-user access, rate limits, and the model."
section: guide
translationKey: "self-hosted-rag"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["air-gapped-rag", "local-rag", "use-cases/forward-deployed-engineers", "rag-citations"]
---

Ragmir runs wherever Node.js 22.12 runs, or in Docker on amd64 and arm64. That includes a VPS, an
on-premise server, a CI runner, or a container.

Ragmir is a library and a CLI, not a hosted service. It opens no port and needs no account. The
default `local-hash` provider makes no network call.

It is a retrieval layer, not a chat platform. It ships no chat interface, user accounts, or model.
It works next to whatever writes the answers: a local Ollama model, your own vLLM server, or a
hosted API that receives the passages you send.

## What runs where

| Piece | Where it runs |
| --- | --- |
| Parsing, optional OCR, embeddings, index, search | Inside the Ragmir process on the server |
| Index | `storageDir`, for example a volume at `/var/lib/ragmir` |
| TLS, authentication, authorization, rate limits | Your service or gateway |
| Generation | The model your application chooses |

## RAG with Docker: the slim and full images

| Image | Holds |
| --- | --- |
| `ghcr.io/jcode-works/ragmir` | The CLI and MCP server with the offline `local-hash` provider, on `node:22-bookworm-slim` |
| `ghcr.io/jcode-works/ragmir:full` | The same, plus the semantic model runtime, Tesseract OCR (English, French, German, Spanish, Italian, Portuguese), Poppler, and antiword |

Both images are published for `linux/amd64` and `linux/arm64` with SBOM and provenance
attestations. They run as the unprivileged `node` user and use `/workspace` as the working
directory.

Each release publishes `X.Y.Z`, `X.Y`, `X`, and `latest` tags, plus `-full` variants. Pin an exact
version in production, such as `6.20.0` or `6.20.0-full`.

Mount the project and pass your user ID so the files Ragmir writes belong to you:

```bash
alias rgr='docker run --rm -it -v "$PWD:/workspace" --user "$(id -u):$(id -g)" ghcr.io/jcode-works/ragmir'
rgr init
rgr sources add "docs/**/*.md" "specs/**/*.pdf"
rgr ingest
rgr search "release approval" --compact
```

For a locked-down run, add `--read-only --tmpfs /tmp --network none`. The slim image needs no
network after it is pulled.

<figure>
  <img src="/guides/search-offline.webp" alt="Terminal running ghcr.io/jcode-works/ragmir:6.20.0 with --network none on a mounted project. The search returns specs/nist-sp-800-63b-4.pdf:p25#56 with the passage on periodic password changes." width="1440" height="555" loading="lazy" decoding="async">
  <figcaption>The official 6.20.0 image searching a mounted project's index with <code>--network none</code>.</figcaption>
</figure>

To bake a configuration into your own image and pin dependencies with a lockfile, start from the
Dockerfile in the [server guide](/docs/server-deployment/). It was checked on Debian and Alpine as
a non-root user, with a read-only root filesystem and no network access.

## Where your data lives

`ragmir.config.json` names the base, selects the sources, and can move the index out of the
project:

```json
{
  "name": "handbook",
  "description": "Runbooks and architecture decisions",
  "sources": ["docs/**/*.md", "docs/**/*.pdf", "docs/**/*.docx"],
  "storageDir": "/var/lib/ragmir/storage"
}
```

- **Index:** under `.ragmir/storage/` by default, or in `storageDir` (`RAGMIR_STORAGE_DIR`) on a
  persistent volume.
- **Models:** in `embeddingModelPath`, `.ragmir/models` by default, loaded from a local snapshot.
- **OCR cache:** private `.ragmir/ocr-cache/` entries keyed by source checksum and page, among
  other fields.
- **Approvals:** `~/.config/ragmir/trust.json`, or a folder you set as `RAGMIR_TRUST_DIR`.
- **Documents:** baked into your image or mounted read-only.

Commit `ragmir.config.json` with the deployment, and keep the index, models, and documents out of
Git.

## Keep the index fresh

Run `rgr ingest` from cron, a systemd timer, or your CI after the documents change. Ingestion is
incremental and resumable:

- Unchanged files are reused.
- A changed file that fails to parse keeps its last good evidence and is reported as stale.
- A rebuild keeps the previous index active until its replacement passes validation.

Searches keep working while an ingest runs.

## Share a base across machines and teams

- **One writer per machine.** Ragmir serializes writers with a lock under `storageDir`, and readers
  stay available. The lock does not coordinate machines. Never share one writable index over NFS
  or SMB. Give each host its own index, or let one host write and copy the result.
- **Sources travel through Git or file sync.** Commit `ragmir.config.json`, then run `rgr ingest`
  on each workstation.
- **Read-only for agents.** `"mcpIngest": false` keeps a shared deployment read-only for MCP
  clients.
- **One base per audience.** Ragmir does not filter results per user. Give each audience its own
  base and check access before calling `search`.

## Serve retrieval to your service or agent

An agent on the same machine launches `rgr serve-mcp` over stdio, from the project folder or with
`docker run -i ... serve-mcp`.

Your own service embeds one client per project root in a long-running process. It calls the client
after its own authentication and authorization checks:

```ts
import { createRagmirClient } from "@jcode.labs/ragmir"

const ragmir = await createRagmirClient({ cwd: "/srv/ragmir" })

/** Call from an authenticated route; Ragmir does not filter results per user. */
export async function retrieve(question: string) {
  const passages = await ragmir.search(question, { topK: 5, timeoutMs: 5_000 })
  return passages.map(({ citation, text, weakEvidence }) => ({ citation, text, weakEvidence }))
}

process.once("SIGTERM", () => {
  void ragmir.close().finally(() => process.exit(0))
})
```

Returned passages contain document text. Log citations instead of passages when the corpus is
confidential.

Python services get the same calls from `pip install ragmir` ([Python guide](/docs/python/)).

## On-premise deployment checklist

1. Pin the image tag, or the npm version in your lockfile.
2. Commit `ragmir.config.json` with `name`, `description`, `sources`, and `storageDir`.
3. Put `storageDir` on a persistent volume with a single writer.
4. Run as a non-root user with a read-only root filesystem, and add `--network none` when nothing
   needs the network.
5. Review the config, then approve its commands and endpoints with `rgr trust --yes`, or set
   `RAGMIR_TRUST_PROJECT_CONFIG=1` in an image whose configuration you build and review yourself.
6. Schedule `rgr ingest` after the documents change.
7. Health-check with `rgr status --json`. It reports `ready`, the base name, and the indexed file
   count. `rgr doctor` checks freshness, and `rgr audit --unsupported` lists skipped files.
8. Measure with `rgr evaluate --golden golden.json` on real questions, including hard negatives
   that must return nothing.
9. Keep TLS, authentication, authorization, and rate limits in your service.

## Next steps

- [Air-gapped RAG without internet access](/air-gapped-rag/)
- [Run Ragmir on a server](/docs/server-deployment/)
- [Run Ragmir with Docker](/docs/docker/)
- [Deploying RAG inside a customer's perimeter](/use-cases/forward-deployed-engineers/)
