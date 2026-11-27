import { defineCollection } from "astro:content"
import { glob } from "astro/loaders"
import { z } from "astro/zod"

/** Kinds of long-form pages; each one picks its JSON-LD type and its breadcrumb parent. */
export const PAGE_SECTIONS = [
  "guide",
  "integration",
  "use-case",
  "comparison",
  "case-study",
  "benchmark",
  "hub",
] as const

/**
 * Long-form pages, one Markdown file per locale: `src/content/pages/<locale>/<path>.md` is served
 * at `/<path>/` in English and `/<locale>/<path>/` otherwise. Interface strings stay in
 * `messages/*.json`.
 */
const pages = defineCollection({
  loader: glob({ base: "./src/content/pages", pattern: "**/*.md" }),
  schema: z.object({
    title: z.string().min(20).max(70),
    description: z.string().min(80).max(170),
    h1: z.string().min(10).max(90),
    summary: z.string().min(40),
    section: z.enum(PAGE_SECTIONS),
    translationKey: z.string().min(1),
    datePublished: z.coerce.date(),
    dateModified: z.coerce.date(),
    related: z.array(z.string()).default([]),
  }),
})

/** The repository's guides in `docs/`, rendered at `/docs/<file>/` from their only copy. */
const docs = defineCollection({
  loader: glob({ base: "../../docs", pattern: "*.md" }),
})

export const collections = { pages, docs }
