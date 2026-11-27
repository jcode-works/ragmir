---
title: "Air-Gapped RAG: Offline Retrieval Without Egress | Ragmir"
description: "Run RAG without internet access: stage Ragmir's image or npm package, an optional model, and OCR once, keep egress at zero by default, and verify it offline."
h1: "Air-gapped RAG: run retrieval without internet access"
summary: "Ragmir's default retrieval makes no network call, so retrieval in an air-gapped network needs only what you stage in advance: the Docker image or the npm package, plus an optional semantic model and OCR engines. After that, ingestion, search, and evaluation run with the network off."
section: guide
translationKey: "air-gapped-rag"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["self-hosted-rag", "local-rag", "use-cases/forward-deployed-engineers", "rag-citations"]
---

Offline RAG has two halves, and both have to live inside the network. Ragmir covers retrieval:
parsing, the index, and search run in its own process, there is no telemetry, account, or hosted
store, and normal retrieval keeps remote model loading disabled. Generation is yours to place: a
local Ollama model or an inference server inside the same network. A local index does not make a
remote conversation local, so the air gap only holds if the model and the client that calls it
stay inside it too.

## What needs a download once

| Component | Needed for | How to stage it |
| --- | --- | --- |
| `ghcr.io/jcode-works/ragmir` image | The CLI and MCP server without Node.js | Pull it where the registry is reachable, then move it with `docker save` and `docker load` |
| `@jcode.labs/ragmir` npm package | Running on Node.js 22.12 or later | Install it where the npm registry is reachable, or from your internal npm mirror |
| `@huggingface/transformers` and a model snapshot | Optional semantic retrieval | Download the model once where the network is available, then ship `.ragmir/models` with the config |
| Tesseract or OCRmyPDF | Optional OCR of scans and photos | Install them in your image, or use the `:full` image, which bundles Tesseract, Poppler, and antiword |
| The model that writes answers | Generation | Outside Ragmir: a local or self-hosted model inside the network |

Pin what you stage: an exact image tag such as `6.20.0` (or `6.20.0-full`), or the version in your
lockfile, so every machine runs the release you tested.

## Stage the image or the package

Pull the image where the registry is reachable, then move it with `docker save` and `docker load`;
the standard image needs no network after it is pulled. To bake a configuration into your own
image, build it from the Dockerfile in the [server guide](/docs/server-deployment/) where the npm
registry is reachable, and move it the same way. Without containers, install Node.js 22.12 or later
and `@jcode.labs/ragmir` from your internal npm mirror.

Keep the package installed in each project that agents use. The generated MCP runner resolves it
from the project folder and falls back to `npx --prefer-offline` only when no local package exists,
which `rgr doctor` reports.

## Stage a semantic model and OCR

`local-hash` needs no model. For semantic retrieval, download the model once on a connected machine,
then carry the project folder into the network. Without Docker, add `@huggingface/transformers` and
run `rgr setup --semantic`; with the full image:

```bash
alias rgr='docker run --rm -it -v "$PWD:/workspace" --user "$(id -u):$(id -g)" ghcr.io/jcode-works/ragmir:full'
rgr models list                      # the recommended model, download size, and memory
rgr models pull --enable --model onnx-community/granite-embedding-97m-multilingual-r2-ONNX
```

The model lands in the project's `.ragmir/models` (`embeddingModelPath`), and the config records its
pinned 40-character revision and artifact digest. Ragmir loads only ONNX weights through
Transformers.js, with no pickled objects and no remote code, and keeps downloads disabled after
setup, so the server never fetches the model again. The next `rgr ingest` rebuilds the index with
semantic vectors.

For scanned documents, run `rgr ocr doctor` and `rgr ocr setup` inside the network, then start the
ingest with `rgr ingest` from a terminal: MCP clients cannot start an ingest while external
extractors are configured. A container forgets approvals between runs, so after reviewing the
configuration, pass `-e RAGMIR_TRUST_PROJECT_CONFIG=1` or mount a folder as `RAGMIR_TRUST_DIR`.

## No egress by default

- `local-hash` makes no network call: the server guide's container ingests and searches with
  `--network none`.
- Settings that would send data off the machine stay inactive until someone approves them on that
  machine with `rgr trust`: an `embeddingEndpoint` outside the machine, `embeddingApiKeyEnv`, and
  `transformersAllowRemoteModels: true`. Until then, model downloads stay off and embedding calls
  fail with `UNTRUSTED_CONFIG` before any request leaves the process.
- OCR runs through a configured local command, never a shell or a cloud service.
- With Ollama, set `"disable_ollama_cloud": true` in `~/.ollama/server.json`: a localhost endpoint
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
   configured external extractors; with OCR on, that advisory is expected, and OCR stays usable
   while it is reported.
3. Run `rgr status --json` and check `ready`; `rgr doctor` lists pending approvals and next steps.
4. Run `rgr evaluate --golden golden.json` on real questions, including hard negatives that must
   return nothing.
5. If semantic ingestion reports that Transformers.js loaded the model without its tokenizer, the
   model folder is not an offline snapshot: run `rgr models pull --enable` again on the connected
   machine, ship the folder, then run `rgr ingest --rebuild`.

## Next steps

- [Self-hosted RAG on a VPS or on-premise server](/self-hosted-rag/)
- [Run Ragmir with Docker](/docs/docker/)
- [Configuration and the settings that need approval](/docs/configuration/)
- [Deploying RAG inside a customer's perimeter](/use-cases/forward-deployed-engineers/)
