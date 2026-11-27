import type { CollectionEntry } from "astro:content"
import { defaultLang, getLocalizedUrl, locales } from "../i18n/utils"

export type ContentPage = CollectionEntry<"pages">

type Section = ContentPage["data"]["section"]

/** The hub pages, by site path: the sections each one lists and the key of its short label. */
export const HUBS: Readonly<Record<string, { sections: readonly Section[]; labelKey: string }>> = {
  integrations: { sections: ["integration"], labelKey: "nav_integrations" },
  guides: { sections: ["guide", "use-case", "comparison"], labelKey: "nav_guides" },
}

/** The site path of the hub that lists a section, if one does. */
export function hubOf(section: Section): string | undefined {
  return Object.entries(HUBS).find(([, hub]) => hub.sections.includes(section))?.[0]
}

/** The locale and the site path of a page, read from its file path `<locale>/<path>.md`. */
export function pageLocation(entry: ContentPage): { locale: string; path: string } {
  const [locale = defaultLang, ...segments] = entry.id.split("/")
  if (!(locales as readonly string[]).includes(locale) || segments.length === 0) {
    throw new Error(`Content page ${entry.id} must live under a locale folder.`)
  }
  return { locale, path: segments.join("/") }
}

/** The root-relative URL of a site path in a locale, with its trailing slash. */
export function pageHref(path: string, locale: string): string {
  return getLocalizedUrl(`/${path}`, locale)
}

/**
 * The page at an English site path in a locale, or the English page when it is not translated. A
 * translation may live at another path (`fr/rag-local` for `local-rag`): its `translationKey` ties
 * it to the English page.
 */
export function findPage(
  path: string,
  locale: string,
  all: readonly ContentPage[],
): ContentPage | undefined {
  const english = all.find((entry) => {
    const location = pageLocation(entry)
    return location.locale === defaultLang && location.path === path
  })
  if (!english || locale === defaultLang) return english
  return (
    all.find(
      (entry) =>
        pageLocation(entry).locale === locale &&
        entry.data.translationKey === english.data.translationKey,
    ) ?? english
  )
}

/** The root-relative URL of each locale's version of a page, by locale. */
export function pageAlternates(
  entry: ContentPage,
  all: readonly ContentPage[],
): Record<string, string> {
  return Object.fromEntries(
    all
      .filter((candidate) => candidate.data.translationKey === entry.data.translationKey)
      .map((candidate) => {
        const location = pageLocation(candidate)
        return [location.locale, pageHref(location.path, location.locale)]
      }),
  )
}

/** The pages of some sections in a locale, English ones filling the untranslated gaps. */
export function sectionPages(
  sections: readonly Section[],
  locale: string,
  all: readonly ContentPage[],
): ContentPage[] {
  const paths = [
    ...new Set(
      all
        .filter((entry) => sections.includes(entry.data.section))
        .map((entry) => pageLocation(entry).path),
    ),
  ].sort()
  return paths.flatMap((path) => {
    const page = findPage(path, locale, all)
    return page ? [page] : []
  })
}
