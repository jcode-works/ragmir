import type { CollectionEntry } from "astro:content"
import { defaultLang, getLocalizedUrl, locales } from "../i18n/utils"

export type ContentPage = CollectionEntry<"pages">

/** The hub page of each section that has one, by the hub's site path. */
export const HUB_SECTIONS: Readonly<Record<string, ContentPage["data"]["section"]>> = {
  integrations: "integration",
  "use-cases": "use-case",
  "case-studies": "case-study",
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

/** The locales a page exists in, in the site's locale order. */
export function pageLocales(entry: ContentPage, all: readonly ContentPage[]): string[] {
  const found = new Set(
    all
      .filter((candidate) => candidate.data.translationKey === entry.data.translationKey)
      .map((candidate) => pageLocation(candidate).locale),
  )
  return locales.filter((locale) => found.has(locale))
}

/** The page at a site path in a locale, or its English version when it is not translated. */
function findPage(
  path: string,
  locale: string,
  all: readonly ContentPage[],
): ContentPage | undefined {
  const at = (wanted: string) =>
    all.find((entry) => {
      const location = pageLocation(entry)
      return location.path === path && location.locale === wanted
    })
  return at(locale) ?? at(defaultLang)
}

/** The pages listed under a page's `related`, resolved in its locale and skipping unknown paths. */
export function relatedPages(entry: ContentPage, all: readonly ContentPage[]): ContentPage[] {
  const { locale } = pageLocation(entry)
  return entry.data.related.flatMap((path) => {
    const page = findPage(path, locale, all)
    return page ? [page] : []
  })
}

/** The pages of one section in a locale, English ones filling the untranslated gaps. */
export function sectionPages(
  section: ContentPage["data"]["section"],
  locale: string,
  all: readonly ContentPage[],
): ContentPage[] {
  const paths = [
    ...new Set(
      all
        .filter((entry) => entry.data.section === section)
        .map((entry) => pageLocation(entry).path),
    ),
  ].sort()
  return paths.flatMap((path) => {
    const page = findPage(path, locale, all)
    return page ? [page] : []
  })
}
