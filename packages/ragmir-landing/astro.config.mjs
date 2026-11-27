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
const translatedAlternates = contentPageAlternates(
  fileURLToPath(new URL("./src/content/pages", import.meta.url)),
)

/** Sitemap alternates of each long-form page that exists in several languages, by URL. */
function contentPageAlternates(directory) {
  const groups = new Map()
  for (const file of readdirSync(directory, { recursive: true }).map(String)) {
    const [locale, ...segments] = file.split(path.sep)
    if (!file.endsWith(".md") || !Object.hasOwn(sitemapLanguages, locale)) continue
    const key = readFileSync(path.join(directory, file), "utf8").match(
      /^translationKey:\s*"?([^"\n]+)"?\s*$/mu,
    )?.[1]
    if (!key) continue
    const pagePath = segments.join("/").replace(/\.md$/u, "")
    const url = new URL(`${locale === defaultLocale ? "" : `${locale}/`}${pagePath}/`, siteUrl).href
    groups.set(key, [...(groups.get(key) ?? []), { url, lang: sitemapLanguages[locale] }])
  }
  const byUrl = new Map()
  for (const links of groups.values()) {
    if (links.length > 1) for (const link of links) byUrl.set(link.url, links)
  }
  return byUrl
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
            // No lastmod: Google uses it only when it is verifiably accurate, and Bing asks not to
            // stamp pages that did not change with the build time, which every release would do.
            // Each URL lists the same alternates as its hreflang links, x-default included.
            serialize: (item) => {
              const links = translatedAlternates.get(item.url) ?? item.links
              const english = links?.find((link) => link.lang === defaultLocale)
              // The plugin shares one links array between a page's locales: copy, never push. A
              // page that exists in one language only gets no x-default, like its HTML.
              return english && links.length > 1
                ? { ...item, links: [...links, { url: english.url, lang: "x-default" }] }
                : item
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
