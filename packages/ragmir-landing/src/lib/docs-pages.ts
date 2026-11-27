/**
 * Search metadata of the guides rendered from `docs/`, which stay plain Markdown for GitHub: the
 * site gives each one a unique title and description, a summary, and its place in the docs menu.
 * The guides are written in English only.
 */
export interface DocPage {
  title: string
  description: string
  summary: string
}

export const DOC_PAGES: Readonly<Record<string, DocPage>> = {
  "quick-start": {
    title: "Quick start: local RAG with exact citations | Ragmir docs",
    description:
      "Install Ragmir with Node.js 22.12+, add sources, ingest, and search a project with cited passages on macOS, Windows, or Linux, with no model or GPU by default.",
    summary:
      "Install the package, add the sources an agent should search, build the index, and run a first cited search.",
  },
  "agent-integration": {
    title: "Agentic RAG with Claude Code, Codex, and MCP | Ragmir docs",
    description:
      "Connect Claude Code, Codex, Cursor, Gemini CLI, or any MCP client to a local Ragmir index, run the retrieval loop, and choose where inference runs.",
    summary:
      "Connect a coding agent or a chat to Ragmir through MCP, plugins, or skills, and run the search, expand, and answer loop.",
  },
  "cli-reference": {
    title: "rgr CLI reference: commands and options | Ragmir docs",
    description:
      "The rgr commands for setup, sources, ingestion, search, freshness, safe upgrades, monorepos, retrieval quality, semantic models, and local OCR.",
    summary: "Every rgr command and its options, grouped by the job it does.",
  },
  "api-reference": {
    title: "TypeScript API for local RAG with citations | Ragmir docs",
    description:
      "Use @jcode.labs/ragmir from a Node.js 22.12+ application: index and search a project, expand citations, and plug the LangChain.js retriever into an agent.",
    summary:
      "The TypeScript library: the client, the one-shot functions, and the LangChain.js retriever and tools.",
  },
  configuration: {
    title: "Configuration reference for Ragmir indexes | Ragmir docs",
    description:
      "Where Ragmir reads its configuration, the sources, models, limits, and retrieval profiles it accepts, and the RAGMIR_ environment variables that override them.",
    summary: "The configuration file, its options, and the environment overrides.",
  },
  docker: {
    title: "Run Ragmir with Docker: standard and full images | Ragmir docs",
    description:
      "Run the rgr CLI and the MCP server from the official images on a laptop, in CI, or on a server, without Node.js; the full image adds the semantic runtime and OCR.",
    summary:
      "The official images, what each one holds, and how to run the CLI and the MCP server from them.",
  },
  migration: {
    title: "Migrate to Ragmir's focused retrieval surface | Ragmir docs",
    description:
      "What changed when Ragmir concentrated on local indexing, search, exact citations, OCR, and agent integration, and how to update older commands and settings.",
    summary: "The breaking change to focused retrieval and how to move an older setup to it.",
  },
  python: {
    title: "Python RAG with citations: ragmir on PyPI | Ragmir docs",
    description:
      "Use the ragmir, langchain-ragmir, and llama-index-retrievers-ragmir packages to search the same local index, with the same citations, from Python applications.",
    summary:
      "The three PyPI packages, from a plain client to LangChain, LangGraph, and LlamaIndex retrievers.",
  },
  "server-deployment": {
    title: "Run Ragmir on a VPS or an offline server | Ragmir docs",
    description:
      "Run Ragmir on a VPS, an on-premise server, a CI runner, a container, or a customer network without internet access, as a library and CLI rather than a service.",
    summary:
      "What runs where on a server, and how to install, index, and serve agents in a closed network.",
  },
  "supported-formats": {
    title: "Supported formats and citation coordinates | Ragmir docs",
    description:
      "The code, documents, Office files, PDFs, scans, spreadsheets, and exports Ragmir indexes, and the line, page, slide, or cell each citation points to.",
    summary: "Every format Ragmir indexes and the coordinates its citations use.",
  },
  troubleshooting: {
    title: "Troubleshooting Ragmir indexing and search | Ragmir docs",
    description:
      "Diagnose Ragmir with rgr doctor, then fix uninitialized projects, stale or missing files, interrupted ingestion, PDFs without text, weak search, and MCP tools.",
    summary: "The smallest diagnostic first, then one section per symptom.",
  },
}

/** The guides in reading order for the docs menu. */
export const DOC_ORDER: readonly string[] = [
  "quick-start",
  "agent-integration",
  "cli-reference",
  "api-reference",
  "python",
  "configuration",
  "supported-formats",
  "server-deployment",
  "docker",
  "troubleshooting",
  "migration",
]
