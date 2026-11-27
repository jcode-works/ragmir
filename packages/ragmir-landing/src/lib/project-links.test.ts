import { describe, expect, it } from "vitest"
import { isExternalLink, PROJECT_LINKS } from "./project-links"

describe("project links", () => {
  it("should tell pages of the site from destinations that leave it", () => {
    expect(isExternalLink(PROJECT_LINKS.github)).toBe(true)
    expect(isExternalLink("http://localhost:4322/")).toBe(true)
    expect(isExternalLink(PROJECT_LINKS.docs)).toBe(false)
    expect(isExternalLink("/benchmarks/")).toBe(false)
  })
})
