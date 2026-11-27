import type { CollectionEntry } from "astro:content"
import { readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { DOC_GROUPS, DOC_ORDER, DOC_PAGES, docsMenu, docTitle } from "./docs-pages"

const guides = readdirSync(fileURLToPath(new URL("../../../../docs", import.meta.url)))
  .filter((name) => name.endsWith(".md"))
  .map((name) => name.replace(/\.md$/u, ""))
  .sort()

// docTitle reads only the entry's id and body.
const doc = (id: string, body?: string): CollectionEntry<"docs"> =>
  ({ id, body }) as unknown as CollectionEntry<"docs">

describe("docs pages", () => {
  it("should give every guide of docs/ its search metadata and a place in the menu", () => {
    expect(Object.keys(DOC_PAGES).sort()).toEqual(guides)
    expect([...DOC_ORDER].sort()).toEqual(guides)
  })

  it("should keep each title and description unique and within search lengths", () => {
    const pages = Object.values(DOC_PAGES)
    expect(new Set(pages.map((page) => page.title)).size).toBe(pages.length)
    expect(new Set(pages.map((page) => page.description)).size).toBe(pages.length)
    for (const page of pages) {
      expect(page.title).toMatch(/ \| Ragmir docs$/u)
      expect(page.title.length).toBeLessThanOrEqual(70)
      expect(page.description.length).toBeGreaterThanOrEqual(100)
      expect(page.description.length).toBeLessThanOrEqual(170)
      expect(`${page.title}${page.description}${page.summary}`).not.toMatch(/[–—]/u)
    }
  })

  it("should list every guide once across the menu sections, in reading order", () => {
    expect(DOC_GROUPS.flatMap((group) => group.ids)).toEqual([...DOC_ORDER])
  })

  it("should open the docs menu on the overview, group it by section, and end with other sites", () => {
    const menu = docsMenu((id) => `Title of ${id}`, "configuration")
    expect(menu[0]?.links).toEqual([{ title: "Overview", href: "/docs/", current: false }])
    expect(menu.slice(1, -1).map((group) => group.title)).toEqual(
      DOC_GROUPS.map((group) => group.title),
    )
    const current = menu.flatMap((group) => group.links).filter((link) => link.current)
    expect(current).toEqual([
      { title: "Title of configuration", href: "/docs/configuration/", current: true },
    ])
    const more = menu.at(-1)?.links ?? []
    expect(more.find((link) => link.href.startsWith("https://context7.com/"))?.external).toBe(true)
    expect(docsMenu((id) => id, undefined)[0]?.links[0]?.current).toBe(true)
  })

  it("should title a guide with its own H1, or its id without one", () => {
    expect(docTitle(doc("quick-start", "# Quick start\n\nInstall Ragmir."))).toBe("Quick start")
    expect(docTitle(doc("migration", "Intro without a title.\n## Section"))).toBe("migration")
    expect(docTitle(doc("python"))).toBe("python")
  })
})
