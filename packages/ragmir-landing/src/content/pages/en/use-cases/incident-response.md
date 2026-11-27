---
title: "RAG for incident response: cited diagnosis, then fix | Ragmir"
description: "Ground an on-call fix in your runbooks, postmortems, and code: Claude Code or Codex diagnoses the incident with Ragmir citations, then fixes it and adds a test."
h1: "RAG for incident response: diagnose from your runbooks, then fix with a test"
summary: "Index your runbooks, past incident reports, and source code once. When an incident fires, your coding agent diagnoses it from those documents, cites each source, and only then changes the code and adds a test. Ragmir finds and cites; the agent reasons and edits."
section: use-case
setup: agents
translationKey: "use-cases/incident-response"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["claude-code-rag", "integrations/claude-code", "integrations/codex", "rag-citations"]
---

At 3 a.m. the checkout times out. The answer is often already written down: a runbook step, a
postmortem from the last time it happened, a comment in the code that calls the payment service.
Ragmir lets your coding agent find those pages and cite them before it touches production code.

## What goes into the base

- **Runbooks and on-call guides** in Markdown, cited to the line.
- **Postmortems and incident reports** as Markdown, Word, or PDF, cited to the line or the page.
- **Architecture notes and ADRs**, so the agent knows why a timeout or a retry exists.
- **Source code and configuration**, cited to the line, in the languages and formats Ragmir reads.
- **Exported logs or alert rules** you choose to keep, such as `.log`, `.json`, or `.yaml` files.

Ragmir indexes more than 900 file types; the [supported formats](/docs/supported-formats/) list
them all. Credentials, `.env` files, and keys never reach the index.

## Set up the folder

Run these in the repository, or in a folder that holds the runbooks next to it:

```bash
npm install -D @jcode.labs/ragmir
npx rgr init
npx rgr sources add "docs/runbooks/**" "docs/postmortems/**" "src/**"
npx rgr ingest
```

Then connect your agent. The [Claude Code](/integrations/claude-code/) and
[Codex](/integrations/codex/) pages show how each one starts Ragmir's MCP server on your machine.
The skills below teach the agent the search, expand, and refine loop:

```bash
npx skills add jcode-works/ragmir
```

Ingestion is incremental. Run `npx rgr ingest` again after each postmortem you add; it reads only
new and changed files.

## Diagnose with citations, then fix

Give the agent the symptom and the rule that the fix waits for the diagnosis:

```prompt
Checkout requests are timing out since the last deploy. Before changing any code, search the runbooks, past postmortems, and the payment client. Cite every source you rely on.

Has this failure happened before? What did the postmortem change, and is that change still in the code?

Propose the fix, name the cited passage that justifies it, then implement it and add a test.
```

The agent searches, expands the passages it needs with `ragmir_expand`, and cites each one. When
the documents hold no evidence, Ragmir returns nothing and the agent says so, instead of guessing
from the symptom alone. A passage marked `weakEvidence` deserves a second look.

You can also run the same search yourself:

```bash
npx rgr search "checkout timeout payment gateway" --compact
```

## Keep the runbook honest

An incident is also a test of your documents. If the agent had to say "no evidence", the runbook
has a gap. Write the missing step once the incident is closed, then re-ingest it.

- The agent can list what changed since the last session with `ragmir_sources` and `changedSince`.
- `rgr audit` compares your sources with the index and lists missing, stale, or skipped files.
- Ragmir's `answer` prompt in the MCP server asks for a citation on every claim and a plain
  statement when the documents hold no evidence.

## Keep it local, or use a cloud AI

The index stays on your machine either way. Claude Code and Codex send the passages they read to
their provider's model. Runbooks and code can name internal hosts, customers, or incidents, so
choose which folders enter the base. The [local or cloud guide](/local-vs-cloud-rag/) lists what to
check: training, retention, region, access, and scope.

## Limits

- Ragmir does not watch your systems. It reads documents, not live metrics, traces, or dashboards.
  Paste or export the data the agent needs.
- Retrieved passages can be incomplete. The agent must check that the fact it needs is present.
- The agent writes the fix and the test. Review the diff and run the checks before you deploy.
- Ragmir does not page anyone, run commands in production, or close the incident.

## Next steps

- [Claude Code with Ragmir](/integrations/claude-code/)
- [Codex with Ragmir](/integrations/codex/)
- [RAG citations: line, page, slide, and cell](/rag-citations/)
- [Local or cloud RAG: models, hardware, and your data](/local-vs-cloud-rag/)
