---
title: "Air-Gapped RAG: Offline Retrieval Without Egress | Ragmir"
description: "Run RAG without internet access: stage Ragmir's image or npm package, an optional model, and OCR once, keep egress at zero by default, and verify it offline."
h1: "Air-gapped RAG: run retrieval without internet access"
summary: "Ragmir's default retrieval makes no network call. Retrieval in an air-gapped network needs only what you stage in advance: the Docker image or the npm package, plus an optional semantic model and OCR engines. After that, ingestion, search, and evaluation run with the network off."
section: guide
translationKey: "air-gapped-rag"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["self-hosted-rag", "local-rag", "use-cases/forward-deployed-engineers", "rag-citations"]
---

Offline RAG has two halves, and both have to live inside the network.

Ragmir covers retrieval. Parsing, the index, and search run in its own process. There is no
telemetry, account, or hosted store, and normal retrieval keeps remote model loading disabled.

Generation is yours to place, for example a local Ollama model or an inference server inside the
same network. A local index does not make a remote conversation local. The air gap only holds if
the model and the client that calls it stay inside it too.

## What needs a download once

| Component | Needed for | How to stage it |
| --- | --- | --- |
| `ghcr.io/jcode-works/ragmir` image | The CLI and MCP server without Node.js | Pull it where the registry is reachable, then move it with `docker save` and `docker load` |
| `@jcode.labs/ragmir` npm package | Running on Node.js 22.12 or later | Install it where the npm registry is reachable, or from your internal npm mirror |
| `@huggingface/transformers` and a model snapshot | Optional semantic retrieval | Download the model once where the network is available, then ship `.ragmir/models` with the config |
| Tesseract or OCRmyPDF | Optional OCR of scans and photos | Install them in your image, or use the `:full` image, which bundles Tesseract, Poppler, and antiword |
| The model that writes answers | Generation | Outside Ragmir: a local or self-hosted model inside the network |

Pin what you stage, so every machine runs the release you tested. Use an exact image tag such as
`6.20.0` (or `6.20.0-full`), or the version in your lockfile.

## Stage the image or the package

Pull the image where the registry is reachable, then move it with `docker save` and `docker load`.
The standard image needs no network after it is pulled.

To bake a configuration into your own image, build it from the Dockerfile in the
[server guide](/docs/server-deployment/) where the npm registry is reachable. Move it the same way.

Without containers, install Node.js 22.12 or later and `@jcode.labs/ragmir` from your internal npm
mirror.

Keep the package installed in each project that agents use. The generated MCP runner resolves it
from the project folder. It falls back to `npx --prefer-offline` only when no local package
exists, and `rgr doctor` reports that case.

## Stage a semantic model and OCR

`local-hash` needs no model. For semantic retrieval, download the model once on a connected machine,
then carry the project folder into the network.

Without Docker, add `@huggingface/transformers` and run `rgr setup --semantic`. With the full
image, use:

```bash
alias rgr='docker run --rm -it -v "$PWD:/workspace" --user "$(id -u):$(id -g)" ghcr.io/jcode-works/ragmir:full'
rgr models list                      # the recommended model, download size, and memory
rgr models pull --enable --model onnx-community/granite-embedding-97m-multilingual-r2-ONNX
```

The model lands in the project's `.ragmir/models` (`embeddingModelPath`). The config records its
pinned 40-character revision and artifact digest.

Ragmir loads only ONNX weights through Transformers.js, with no pickled objects and no remote code.
It keeps downloads disabled after setup, so the server never fetches the model again. The next
`rgr ingest` rebuilds the index with semantic vectors.

For scanned documents, run `rgr ocr doctor` and `rgr ocr setup` inside the network. Then run
`rgr ingest` from a terminal, because MCP clients cannot start an ingest while external extractors
are configured.

A container forgets approvals between runs. After reviewing the configuration, pass
`-e RAGMIR_TRUST_PROJECT_CONFIG=1` or mount a folder as `RAGMIR_TRUST_DIR`.

## No egress by default

- `local-hash` makes no network call. The server guide's container ingests and searches with
  `--network none`.
- Some settings would send data off the machine. They stay inactive until someone approves them on
  that machine with `rgr trust`. They are an `embeddingEndpoint` outside the machine,
  `embeddingApiKeyEnv`, and `transformersAllowRemoteModels: true`. Until then, model downloads stay
  off and embedding calls fail with `UNTRUSTED_CONFIG` before any request leaves the process.
- OCR runs through a configured local command, never a shell or a cloud service.
- With Ollama, set `"disable_ollama_cloud": true` in `~/.ollama/server.json`. A localhost endpoint
  alone does not prove local inference, because Ollama also supports cloud models.

## Verify the offline install

1. Ingest and search in a container without network access. With the image built from the server
   guide's Dockerfile:

   ```bash
   docker run --rm --read-only --tmpfs /tmp --network none \
     -v /srv/handbook:/srv/ragmir/docs:ro -v ragmir-index:/var/lib/ragmir \
     ragmir-handbook ingest
   docker run --rm --read-only --tmpfs /tmp --network none \
     -v /srv/handbook:/srv/ragmir/docs:ro -v ragmir-index:/var/lib/ragmir \
     ragmir-handbook search "checkout retry policy" --compact
   ```

2. Run `rgr security-audit`. It warns about an embedding endpoint that is not local and about
   configured external extractors. With OCR on, that advisory is expected, and OCR stays usable
   while it is reported.
3. Run `rgr status --json` and check `ready`. `rgr doctor` lists pending approvals and next steps.
4. Run `rgr evaluate --golden golden.json` on real questions, including hard negatives that must
   return nothing.
5. If semantic ingestion reports that Transformers.js loaded the model without its tokenizer, the
   model folder is not an offline snapshot. Run `rgr models pull --enable` again on the connected
   machine, ship the folder, then run `rgr ingest --rebuild`.

<figure>
  <img src="/guides/search-offline.webp" alt="Terminal running ghcr.io/jcode-works/ragmir:6.20.0 with --network none on a mounted project. The search returns specs/nist-sp-800-63b-4.pdf:p25#56 with the passage on periodic password changes." width="1440" height="555" loading="lazy" decoding="async">
  <figcaption>The same check with the official 6.20.0 image: with <code>--network none</code>, search still returns a cited PDF page from the project's index.</figcaption>
</figure>

## Next steps

- [Self-hosted RAG on a VPS or on-premise server](/self-hosted-rag/)
- [Run Ragmir with Docker](/docs/docker/)
- [Configuration and the settings that need approval](/docs/configuration/)
- [Deploying RAG inside a customer's perimeter](/use-cases/forward-deployed-engineers/)
