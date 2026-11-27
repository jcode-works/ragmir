import { describe, expect, it } from "vitest"
import {
  type ContentPage,
  findPage,
  HUBS,
  hubOf,
  pageAlternates,
  pageHref,
  pageLocation,
  sectionPages,
} from "./content-pages"

// The helpers read only an entry's id and these data fields, so a fixture needs no more.
const entry = (
  id: string,
  section: ContentPage["data"]["section"],
  translationKey: string,
): ContentPage => ({ id, data: { section, translationKey } }) as unknown as ContentPage

const pages = [
  entry("en/local-rag", "guide", "local-rag"),
  entry("fr/rag-local", "guide", "local-rag"),
  entry("es/rag-local", "guide", "local-rag"),
  entry("en/agentic-rag", "guide", "agentic-rag"),
  entry("en/compare/context7", "comparison", "compare/context7"),
  entry("en/integrations/claude-code", "integration", "integrations/claude-code"),
  entry("en/guides", "hub", "guides"),
]

describe("content pages", () => {
  it("should read the locale and the site path from the file path", () => {
    expect(pageLocation(entry("fr/rag-local", "guide", "local-rag"))).toEqual({
      locale: "fr",
      path: "rag-local",
    })
    expect(pageLocation(entry("en/integrations/claude-code", "integration", "x"))).toEqual({
      locale: "en",
      path: "integrations/claude-code",
    })
    expect(() => pageLocation(entry("local-rag", "guide", "local-rag"))).toThrow(/locale folder/u)
    expect(() => pageLocation(entry("de/rag-lokal", "guide", "local-rag"))).toThrow(
      /locale folder/u,
    )
  })

  it("should build root-relative URLs with the locale prefix and a trailing slash", () => {
    expect(pageHref("local-rag", "en")).toBe("/local-rag/")
    expect(pageHref("rag-local", "fr")).toBe("/fr/rag-local/")
  })

  it("should find a hub for the sections that have one", () => {
    expect(hubOf("integration")).toBe("integrations")
    expect(hubOf("use-case")).toBe("guides")
    expect(hubOf("comparison")).toBe("guides")
    expect(hubOf("benchmark")).toBeUndefined()
    expect(HUBS.guides?.labelKey).toBe("nav_guides")
  })

  it("should group each hub's cards, the guides by section and the integrations by kind", () => {
    expect(HUBS.guides?.groups.map((group) => group.sections)).toEqual([
      ["guide"],
      ["use-case"],
      ["comparison"],
    ])
    expect(HUBS.integrations?.groups.map((group) => group.labelKey)).toEqual([
      "integrations_group_agents",
      "integrations_group_frameworks",
      "integrations_group_protocols",
    ])
    const extras = HUBS.integrations?.groups.flatMap((group) => group.extra ?? []) ?? []
    expect(extras.every((extra) => extra.mark !== undefined)).toBe(true)
  })

  it("should find a translation by its key and fall back to English", () => {
    expect(findPage("local-rag", "fr", pages)?.id).toBe("fr/rag-local")
    expect(findPage("local-rag", "en", pages)?.id).toBe("en/local-rag")
    expect(findPage("agentic-rag", "zh", pages)?.id).toBe("en/agentic-rag")
    expect(findPage("missing", "fr", pages)).toBeUndefined()
  })

  it("should list the URL of each locale's version of a page", () => {
    expect(pageAlternates(pages[0] as ContentPage, pages)).toEqual({
      en: "/local-rag/",
      fr: "/fr/rag-local/",
      es: "/es/rag-local/",
    })
    expect(pageAlternates(pages[3] as ContentPage, pages)).toEqual({ en: "/agentic-rag/" })
  })

  it("should list a hub's sections in a locale, translations first", () => {
    expect(sectionPages(["guide", "comparison"], "fr", pages).map((page) => page.id)).toEqual([
      "en/agentic-rag",
      "en/compare/context7",
      "fr/rag-local",
    ])
    expect(sectionPages(["integration"], "en", pages).map((page) => page.id)).toEqual([
      "en/integrations/claude-code",
    ])
  })
})
