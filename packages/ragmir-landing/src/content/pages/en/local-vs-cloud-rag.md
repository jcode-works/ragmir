---
title: "Local or cloud RAG: models, hardware, and your data | Ragmir"
description: "Run RAG fully local, on your own server, or with a cloud AI: the models each setup needs, the machine to run them, and what a cloud provider receives."
h1: "Local or cloud RAG: which models to run, and where your documents go"
summary: "Ragmir's index always stays on the machine that runs it. What changes is the model that writes the answers: on your machine, on your server, or at a cloud provider that receives the passages you send. Here is the configuration and the hardware for each setup, and what to check before documents reach a cloud model."
section: guide
setup: local
translationKey: "local-vs-cloud-rag"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["local-rag", "air-gapped-rag", "self-hosted-rag", "docs/agent-integration"]
---

A RAG setup runs two models, and you choose where each one runs. Ragmir handles retrieval: it
finds and cites the passages. Another model reads those passages and writes the answer.

## Two models, two decisions

| Part | What it does | Where it runs |
| --- | --- | --- |
| Retrieval, in Ragmir | Indexes your files, then returns cited passages for each question | On the machine that runs Ragmir, always |
| Answering, in your chat, agent, or app | Reads the passages and writes the answer | Your choice: your machine, your server, or a cloud provider |

The retrieval side needs no model by default. The answering side always needs one, and that choice
decides where your documents go.

## Retrieval: the model and the machine it needs

The default `local-hash` retrieval ranks keyword evidence with BM25 and needs no model, GPU, or API
key. Add a semantic model when questions use words your documents do not, such as synonyms or
another language.

| Setup | Minimum | Comfortable |
| --- | --- | --- |
| Keyword search, `local-hash` (the default) | No model, GPU, or API key, and nothing to download | Memory grows with the corpus |
| Semantic, `mxbai-embed-xsmall-v1` (English) | 0.75 GB of memory to index, 97 MB download | 1.5 GB of memory and 2 CPUs |
| Semantic, Granite R2 (multilingual, picked on most machines) | 1 GB of memory, 124 MB download | 2 GB and 2 CPUs |
| Semantic, `multilingual-e5-small` | 1.5 GB of memory, 492 MB download | 3 GB and 2 CPUs |
| Semantic, `Qwen3-Embedding-0.6B` | 4 GB of memory, 624 MB download | 8 GB and 2 CPUs |

These figures come from the
[system requirements](https://github.com/jcode-works/ragmir#system-requirements) in Ragmir's
README. Check them against your own machine, a container's memory limit included:

```bash
npx rgr models list
```

To run a semantic model inside Ragmir, install the optional runtime and let Ragmir pick the model
that fits the machine. The download happens once, and normal retrieval keeps remote model loading
disabled.

```bash
npm install -D @huggingface/transformers
npx rgr setup --semantic
npx rgr ingest --rebuild
```

To embed with a model you already serve through Ollama, vLLM, or LM Studio, point Ragmir at its
OpenAI-compatible API in `ragmir.config.json`:

```json
{
  "embeddingProvider": "openai-compatible",
  "embeddingEndpoint": "http://localhost:11434/v1",
  "embeddingModel": "nomic-embed-text"
}
```

With an endpoint, passage text and queries go to that endpoint. Keep it on the machine or on your
own server for confidential sources. `rgr security-audit` warns when the endpoint is not local.

## Answering: three places to run the model

### On your machine, with Ollama

Nothing leaves the machine when the chat or script also runs locally. First turn off Ollama's cloud
features with `"disable_ollama_cloud": true` in `~/.ollama/server.json`, then restart Ollama: a
localhost endpoint alone does not prove local inference.

The [local RAG tutorial](/local-rag/) runs this setup end to end. On November 27, 2026,
`gemma4:12b-it-qat` (a 7.2 GB download in Ollama) answered from Ragmir's passages in 49 seconds on
an Apple M3 Max:

```bash
node answer.mjs "gemma4:12b-it-qat" "How do I run Ragmir on a server without internet access?"
```

As a rule of thumb, a local model needs free memory beyond its download size, plus room for the
passages and the question you send it. Smaller models answer faster and miss more nuance.

### On your own server

The same script calls any endpoint that speaks the chat completions format, such as a vLLM server
you run. Supply any key through your runtime's secret configuration, then set the chat URL and the
deployed model:

```bash
LLM_API=chat-completions \
LLM_CHAT_URL=https://llm.example.org/v1/chat/completions \
node answer.mjs "your-deployed-model" "How is a release approved?"
```

The question and the expanded passages cross the network to your endpoint. You control the
deployment, access, transport, retention, and logs.

### At a cloud provider

Coding agents such as Claude Code, Codex, Cursor, and Gemini CLI run Ragmir's MCP server on your
machine, then send the passages they read to their provider's model. The
[integrations](/integrations/) cover each one.

An application can do the same with the provider's SDK. The
[agent integration guide](/docs/agent-integration/) has a Claude example: three passages and the
question reach Anthropic's API, while the index and the other documents stay where Ragmir runs.

## Where your documents go

| Setup | Where evidence goes | What you control |
| --- | --- | --- |
| Local model and local chat, for example Ollama | Passages stay on the machine when the entire application runs locally without external forwarding | Model weights, chat history, logs, extensions, and machine access |
| Self-hosted model on your server or rented cloud infrastructure | Selected passages cross the network to your inference endpoint | Deployment, access controls, transport, logs, backups, and the hosting arrangement |
| Managed model API or cloud agent | Selected passages reach the chosen provider through the consuming application | Source selection and application settings; the provider's applicable data policies also matter |

A local index does not make a remote conversation local. Tool results can contain document text,
citations, file names, and project paths. Ragmir preserves source text without masking it.

## Before your documents reach a cloud model

The provider receives what your agent or application sends. Ragmir does not enforce a provider's
policy, and it does not anonymize the passages. Before you connect a cloud model, check these points
for the plan and the account you actually use:

- **Training.** Whether the provider may train models on your prompts and on the passages they
  carry, and whether a setting or your plan changes that. Consumer chat apps and business or API
  plans can have different defaults.
- **Retention.** How long prompts, outputs, and logs are kept, and whether your account can use a
  shorter or zero retention option.
- **Region.** Where the data is processed and stored.
- **Access.** Who can read the passages: at the provider, and in your own stack, such as proxies and
  monitoring tools.
- **Scope.** Which sources may leave at all. Keep the others out of the base, or give them their own
  base that only a local model reads.

None of this is legal advice. Check your obligations with whoever owns compliance for the documents.

## Three setups that work

| Goal | Retrieval | Answers | What leaves the machine |
| --- | --- | --- | --- |
| Fully offline | `local-hash` or a staged semantic model | Ollama with cloud features off | Nothing |
| Private infrastructure | Ragmir on your server | A model you host, such as vLLM | Passages to your own endpoint |
| Best model, local index | Ragmir through the plugin or MCP | Your coding agent's cloud model | The passages the agent reads |

The [air-gapped guide](/air-gapped-rag/) covers the first setup without internet access, and the
[self-hosted guide](/self-hosted-rag/) covers the second on a VPS or an on-premise server.

## Next steps

- [Build local RAG on your machine](/local-rag/)
- [Run RAG without internet access](/air-gapped-rag/)
- [Self-hosted RAG on a VPS or on-premise server](/self-hosted-rag/)
- [Agent integration: local, self-hosted, or cloud](/docs/agent-integration/)
