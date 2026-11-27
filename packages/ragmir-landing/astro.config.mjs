import { execFileSync } from "node:child_process"
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { satteri } from "@astrojs/markdown-satteri"
import react from "@astrojs/react"
import sitemap from "@astrojs/sitemap"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "astro/config"
import { docsPagesPlugin } from "./scripts/docs-pages-plugin.mjs"
import { noTranslateCodePlugin } from "./scripts/no-translate-code-plugin.mjs"

const siteUrl = process.env.PUBLIC_RAGMIR_LANDING_URL ?? "https://ragmir.com"
const docsDirectory = fileURLToPath(new URL("../../docs", import.meta.url))
const locales = ["en", "fr", "es", "zh"]
const defaultLocale = "en"
const isProduction = new URL(siteUrl).hostname === "ragmir.com"
const sitemapLanguages = { en: "en", fr: "fr", es: "es", zh: "zh-Hans" }
// A translated long-form page may use its own path (fr/rag-local for local-rag), and the sitemap
// plugin pairs locales by path only, so those pages take their alternates from translationKey.
const docsModified = docsPageModified(docsDirectory)
const contentPages = contentPageMetadata(
  fileURLToPath(new URL("./src/content/pages", import.meta.url)),
)

/**
 * By URL, the sitemap alternates of each long-form page that exists in several languages, and the
 * dateModified its front matter states and the page displays.
 */
function contentPageMetadata(directory) {
  const groups = new Map()
  const modified = new Map()
  for (const file of readdirSync(directory, { recursive: true }).map(String)) {
    const [locale, ...segments] = file.split(path.sep)
    if (!file.endsWith(".md") || !Object.hasOwn(sitemapLanguages, locale)) continue
    const source = readFileSync(path.join(directory, file), "utf8")
    const pagePath = segments.join("/").replace(/\.md$/u, "")
    const url = new URL(`${locale === defaultLocale ? "" : `${locale}/`}${pagePath}/`, siteUrl).href
    const date = source.match(/^dateModified:\s*"?(\d{4}-\d{2}-\d{2})"?\s*$/mu)?.[1]
    if (date) modified.set(url, date)
    const key = source.match(/^translationKey:\s*"?([^"\n]+)"?\s*$/mu)?.[1]
    if (!key) continue
    groups.set(key, [...(groups.get(key) ?? []), { url, lang: sitemapLanguages[locale] }])
  }
  const alternates = new Map()
  for (const links of groups.values()) {
    if (links.length > 1) for (const link of links) alternates.set(link.url, links)
  }
  return { alternates, modified }
}

/**
 * By URL, the day each docs page last changed in Git, as the page states it (src/lib/git-dates.ts),
 * and the latest of them for the docs overview. Empty without Git history.
 */
function docsPageModified(directory) {
  const modified = new Map()
  for (const file of readdirSync(directory).filter((name) => name.endsWith(".md"))) {
    try {
      const date = execFileSync(
        "git",
        ["log", "-1", "--format=%cI", "--", path.join(directory, file)],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      ).slice(0, 10)
      if (/^\d{4}-\d{2}-\d{2}$/u.test(date)) {
        modified.set(new URL(`docs/${file.replace(/\.md$/u, "")}/`, siteUrl).href, date)
      }
    } catch {
      // No Git history: the page states no Git date either.
    }
  }
  const latest = [...modified.values()].sort().at(-1)
  if (latest) modified.set(new URL("docs/", siteUrl).href, latest)
  return modified
}

export default defineConfig({
  site: siteUrl,
  output: "static",
  server: ({ command }) => ({
    port: command === "preview" ? 4323 : 4322,
  }),
  compressHTML: true,
  i18n: {
    defaultLocale,
    locales,
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    react(),
    ...(isProduction
      ? [
          sitemap({
            // lastmod only where a page states its own dateModified: Google uses lastmod only when
            // it is verifiably accurate, and Bing asks not to stamp unchanged pages with the build
            // time, which every release would do. Each URL lists the same alternates as its
            // hreflang links, x-default included.
            serialize: (item) => {
              const lastmod = contentPages.modified.get(item.url) ?? docsModified.get(item.url)
              const dated = lastmod ? { ...item, lastmod } : item
              const links = contentPages.alternates.get(item.url) ?? item.links
              const english = links?.find((link) => link.lang === defaultLocale)
              // The plugin shares one links array between a page's locales: copy, never push. A
              // page that exists in one language only gets no x-default, like its HTML.
              return english && links.length > 1
                ? { ...dated, links: [...links, { url: english.url, lang: "x-default" }] }
                : dated
            },
            i18n: {
              defaultLocale,
              locales: sitemapLanguages,
            },
          }),
        ]
      : []),
  ],
  markdown: {
    // A dark theme whose purples, greens, and oranges stay readable on the card grey that
    // global.css gives every code block.
    // A `prompt` fence is plain text that the code block labels and wraps.
    shikiConfig: { theme: "tokyo-night", langAlias: { prompt: "text" } },
    processor: satteri({
      hastPlugins: [docsPagesPlugin({ docsDirectory }), noTranslateCodePlugin()],
    }),
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "viewport",
  },
  experimental: {
    // Prerender prefetched links via the Speculation Rules API for faster locale navigation.
    clientPrerender: true,
  },
  vite: {
    plugins: [tailwindcss()],
    envPrefix: ["PUBLIC_"],
  },
})
