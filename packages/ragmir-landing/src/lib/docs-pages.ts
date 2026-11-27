/**
 * Search metadata of the guides rendered from `docs/`, which stay plain Markdown for GitHub: the
 * site gives each one a unique title and description, a summary, and its place in the docs menu.
 * The guides are written in English only.
 */
import type { CollectionEntry } from "astro:content"
import { PROJECT_LINKS } from "./project-links"

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
      "Connect Claude Code, Codex, a chat, or any MCP client through plugins, skills, or MCP, and run the search, expand, and answer loop.",
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

/** The documentation's sections in its left menu, each with its guides in reading order. */
export const DOC_GROUPS: ReadonlyArray<{ title: string; ids: readonly string[] }> = [
  { title: "Get started", ids: ["quick-start", "agent-integration"] },
  {
    title: "Reference",
    ids: ["cli-reference", "api-reference", "python", "configuration", "supported-formats"],
  },
  { title: "Deploy", ids: ["server-deployment", "docker"] },
  { title: "Help", ids: ["troubleshooting", "migration"] },
]

/** The guides in reading order, section after section. */
export const DOC_ORDER: readonly string[] = DOC_GROUPS.flatMap((group) => group.ids)

/** Pages beyond the documentation, listed at the foot of its menu; some leave the site. */
const DOC_MENU_MORE: ReadonlyArray<{ title: string; href: string; external?: boolean }> = [
  { title: "All guides", href: "/guides/" },
  { title: "Use cases", href: "/guides/#use-cases" },
  { title: "Integrations", href: "/integrations/" },
  { title: "Local or cloud RAG", href: "/local-vs-cloud-rag/" },
  { title: "Claude alone or with Ragmir", href: "/compare/claude-vs-rag/" },
  { title: "Benchmarks", href: "/benchmarks/" },
  { title: "Docs on GitHub", href: `${PROJECT_LINKS.github}/tree/main/docs`, external: true },
  { title: "Releases", href: PROJECT_LINKS.releases, external: true },
]

/** Shortcuts on the documentation's overview: where the guides, packages, and releases live. */
export const DOC_SHORTCUTS: ReadonlyArray<{ title: string; href: string }> = [
  { title: "Docs on GitHub", href: `${PROJECT_LINKS.github}/tree/main/docs` },
  { title: "Releases", href: PROJECT_LINKS.releases },
  { title: "Changelog", href: PROJECT_LINKS.changelog },
  { title: "npm package", href: PROJECT_LINKS.npm },
  { title: "Python packages", href: PROJECT_LINKS.pypi },
  { title: "Docker images", href: `${PROJECT_LINKS.github}/pkgs/container/ragmir` },
  { title: "Agent Skills", href: PROJECT_LINKS.agentSkills },
  { title: "Context7", href: PROJECT_LINKS.context7 },
  { title: "Issues", href: `${PROJECT_LINKS.github}/issues` },
]

/**
 * The documentation's left menu: an overview, its sections, then the site's guides. `current` is
 * the id of the guide on screen, or `undefined` on the overview.
 */
export function docsMenu(
  titleOf: (id: string) => string,
  current: string | undefined,
): Array<{
  title?: string
  links: Array<{ title: string; href: string; current: boolean; external?: boolean }>
}> {
  return [
    { links: [{ title: "Overview", href: "/docs/", current: current === undefined }] },
    ...DOC_GROUPS.map((group) => ({
      title: group.title,
      links: group.ids.map((id) => ({
        title: titleOf(id),
        href: `/docs/${id}/`,
        current: id === current,
      })),
    })),
    {
      title: "More",
      links: DOC_MENU_MORE.map((link) => ({ ...link, current: false })),
    },
  ]
}

/** A guide's title: its own H1, which the docs pages plugin removes from the rendered body. */
export function docTitle(entry: CollectionEntry<"docs">): string {
  return entry.body?.match(/^# (.+)$/mu)?.[1]?.trim() ?? entry.id
}
