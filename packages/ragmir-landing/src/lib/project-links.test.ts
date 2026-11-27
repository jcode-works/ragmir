import { describe, expect, it } from "vitest"
import { isExternalLink, localizeProjectLinks, PROJECT_LINKS } from "./project-links"

describe("project links", () => {
  it("should tell pages of the site from destinations that leave it", () => {
    expect(isExternalLink(PROJECT_LINKS.github)).toBe(true)
    expect(isExternalLink("http://localhost:4322/")).toBe(true)
    expect(isExternalLink(PROJECT_LINKS.docs)).toBe(false)
    expect(isExternalLink("/benchmarks/")).toBe(false)
  })

  it("should send links to long-form pages to their translation and keep the docs and other sites", () => {
    const links = localizeProjectLinks((path) => `/fr/${path}/`)
    expect(links.guides).toBe("/fr/guides/")
    expect(links.claudePlugin).toBe("/fr/integrations/claude-code/")
    expect(links.benchmarks).toBe("/fr/benchmarks/")
    expect(links.docs).toBe("/docs/")
    expect(links.apiReference).toBe("/docs/api-reference/")
    expect(links.github).toBe(PROJECT_LINKS.github)
  })
})
