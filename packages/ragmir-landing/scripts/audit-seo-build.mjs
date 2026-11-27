#!/usr/bin/env node
// Audits the built site the way search engines read it, after every build (deploy builds too):
// one self canonical per indexable page, the same hreflang set on every translation of a page (a
// page may exist in fewer languages; hreflang and x-default appear once it has two), the page
// language in `lang`, Open Graph and JSON-LD that match the page, titles and descriptions unique
// within each language, internal links that reach a built page or file, error pages without
// canonical or alternates, and in production a sitemap listing exactly the indexable pages with the
// same alternates as their HTML.

import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const DIST_DIRECTORY = fileURLToPath(new URL("../dist/", import.meta.url))
const SITE = new URL(process.env.PUBLIC_RAGMIR_LANDING_URL ?? "https://ragmir.com")
const IS_PRODUCTION = SITE.hostname === "ragmir.com"
const DEFAULT_LOCALE = "en"
// The same tags as `languageTags` in src/i18n/utils.ts, which the contract test enforces.
const LANGUAGE_TAGS = { en: "en", fr: "fr", es: "es", zh: "zh-Hans" }
const OPEN_GRAPH_LOCALES = { en: "en_US", fr: "fr_FR", es: "es_ES", zh: "zh_CN" }
const ERROR_PAGES = ["404.html", "500.html"]
// A relative href resolves under the page's own path; links must be root-relative, a fragment, a
// query, or absolute.
const RELATIVE_HREF = /^(?![a-z][a-z\d+.-]*:|[/#?])/iu

const failures = []

function check(condition, message) {
  if (!condition) failures.push(message)
}

function decodeEntities(value) {
  return value
    .replace(/&#x([\da-f]+);/giu, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/gu, (_, decimal) => String.fromCodePoint(Number(decimal)))
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
}

function attributes(tag) {
  const result = {}
  for (const match of tag.matchAll(/([:\w-]+)(?:="([^"]*)")?/gu)) {
    result[match[1].toLowerCase()] = decodeEntities(match[2] ?? "")
  }
  return result
}

function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "giu"))].map((match) =>
    attributes(match[0].slice(name.length + 1, -1)),
  )
}

function meta(head, key) {
  const entry = tags(head, "meta").find((tag) => tag.name === key || tag.property === key)
  return entry?.content
}

function alternates(head) {
  return new Map(
    tags(head, "link")
      .filter((tag) => tag.rel === "alternate" && tag.hreflang)
      .map((tag) => [tag.hreflang, tag.href]),
  )
}

function sameAlternates(left, right) {
  return left.size === right.size && [...left].every(([code, href]) => right.get(code) === href)
}

function jsonLd(html, file) {
  return [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gu)]
    .map((match) => {
      try {
        return JSON.parse(match[1])
      } catch {
        failures.push(`${file}: JSON-LD does not parse`)
        return undefined
      }
    })
    .filter(Boolean)
}

// Content pages (og:type article) carry one Article or TechArticle node with an author, both dates,
// and the page language, a breadcrumb that ends at the page, and a visible date; others carry none.
function auditArticle(where, html, head, nodes, { expectedUrl, locale }) {
  const articles = nodes.filter((node) => ["Article", "TechArticle"].includes(node["@type"]))
  if (meta(head, "og:type") !== "article") {
    check(articles.length === 0, `${where}: only article pages carry Article markup`)
    return
  }
  check(articles.length === 1, `${where}: an article page needs one Article or TechArticle node`)
  for (const article of articles) {
    const published = Date.parse(article.datePublished)
    const modified = Date.parse(article.dateModified)
    check(
      Boolean(article.author?.["@id"] && article.author?.name),
      `${where}: the article names no author`,
    )
    check(
      Number.isFinite(published) && Number.isFinite(modified) && modified >= published,
      `${where}: the article needs datePublished and a dateModified on or after it`,
    )
    check(
      article.inLanguage === LANGUAGE_TAGS[locale],
      `${where}: the article inLanguage should be ${LANGUAGE_TAGS[locale]}`,
    )
    check(
      typeof article.headline === "string" && article.headline.length > 0,
      `${where}: the article has no headline`,
    )
  }
  const trail = nodes.find((node) => node["@type"] === "BreadcrumbList")?.itemListElement ?? []
  check(trail.at(-1)?.item === expectedUrl, `${where}: the breadcrumb should end at the page`)
  check(/<time datetime="/u.test(html), `${where}: the article shows no date`)
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map((entry) => {
      const fullPath = path.join(directory, entry.name)
      return entry.isDirectory() ? walk(fullPath) : [fullPath]
    }),
  )
  return files.flat()
}

function auditPage(file, html) {
  const relativePath = path.relative(DIST_DIRECTORY, file)
  const pathname = `/${path.dirname(relativePath).split(path.sep).join("/")}/`.replace("/./", "/")
  const expectedUrl = new URL(pathname, SITE).href
  const firstSegment = pathname.split("/")[1]
  const locale = Object.hasOwn(LANGUAGE_TAGS, firstSegment) ? firstSegment : DEFAULT_LOCALE
  const head = html.split("</head>")[0]
  const htmlTag = attributes(html.match(/<html\b[^>]*>/u)?.[0] ?? "")
  const title = decodeEntities(head.match(/<title>([\s\S]*?)<\/title>/u)?.[1] ?? "")
  const description = meta(head, "description") ?? ""
  const robots = meta(head, "robots") ?? ""
  const canonicals = tags(head, "link").filter((tag) => tag.rel === "canonical")
  const pageAlternates = alternates(head)
  const where = relativePath

  check(htmlTag.lang === LANGUAGE_TAGS[locale], `${where}: lang should be ${LANGUAGE_TAGS[locale]}`)
  check(htmlTag.dir === "ltr", `${where}: dir should be ltr`)
  check(Boolean(title), `${where}: missing title`)
  check(Boolean(description), `${where}: missing meta description`)
  check(robots === meta(head, "googlebot"), `${where}: robots and googlebot differ`)
  check(
    /\bnoindex\b/u.test(robots) === !IS_PRODUCTION,
    `${where}: robots "${robots}" does not match the ${IS_PRODUCTION ? "production" : "staging"} policy`,
  )
  check(canonicals.length === 1, `${where}: expected exactly one canonical`)
  check(canonicals[0]?.href === expectedUrl, `${where}: canonical should be ${expectedUrl}`)
  check(meta(head, "og:url") === expectedUrl, `${where}: og:url should be ${expectedUrl}`)
  check(meta(head, "og:title") === title, `${where}: og:title differs from the title`)
  check(meta(head, "og:description") === description, `${where}: og:description differs`)
  check(
    meta(head, "og:locale") === OPEN_GRAPH_LOCALES[locale],
    `${where}: og:locale should be ${OPEN_GRAPH_LOCALES[locale]}`,
  )
  const pageLanguages = [...pageAlternates.keys()].filter((code) => code !== "x-default")
  const ogAlternates = tags(head, "meta")
    .filter((tag) => tag.property === "og:locale:alternate")
    .map((tag) => tag.content)
    .sort()
  const expectedOgAlternates = Object.entries(OPEN_GRAPH_LOCALES)
    .filter(([entry]) => entry !== locale && pageLanguages.includes(LANGUAGE_TAGS[entry]))
    .map(([, value]) => value)
    .sort()
  check(
    ogAlternates.join() === expectedOgAlternates.join(),
    `${where}: og:locale:alternate should list ${expectedOgAlternates.join(", ")}`,
  )
  check((html.match(/<h1\b/gu) ?? []).length === 1, `${where}: expected exactly one h1`)
  check((html.match(/<main\b/gu) ?? []).length === 1, `${where}: expected exactly one main`)

  if (pageAlternates.size === 0) {
    check(locale === DEFAULT_LOCALE, `${where}: a page in one language must be the English page`)
  } else {
    check(pageLanguages.length > 1, `${where}: hreflang needs at least two languages`)
    check(
      pageLanguages.every((code) => Object.values(LANGUAGE_TAGS).includes(code)),
      `${where}: hreflang lists an unknown language: ${pageLanguages.join(", ")}`,
    )
    check(
      pageAlternates.get(LANGUAGE_TAGS[locale]) === expectedUrl,
      `${where}: its own hreflang should point to its canonical`,
    )
    check(
      pageLanguages.includes(LANGUAGE_TAGS[DEFAULT_LOCALE]),
      `${where}: every page exists in English, the x-default language`,
    )
    check(
      pageAlternates.get("x-default") === pageAlternates.get(LANGUAGE_TAGS[DEFAULT_LOCALE]),
      `${where}: x-default should point to the English page`,
    )
  }
  for (const href of pageAlternates.values()) {
    check(href?.startsWith(`${SITE.origin}/`), `${where}: hreflang URL ${href} is not absolute`)
  }

  const internalLinks = []
  for (const anchor of tags(html, "a")) {
    check(
      !anchor.href || !RELATIVE_HREF.test(anchor.href),
      `${where}: relative link ${anchor.href}`,
    )
    if (anchor.href?.startsWith("/") && !anchor.href.startsWith("//")) {
      internalLinks.push(anchor.href)
    }
  }

  const nodes = jsonLd(html, where)
  const pageNodes = nodes.filter((node) => ["WebPage", "AboutPage"].includes(node["@type"]))
  check(pageNodes.length === 1, `${where}: expected one WebPage or AboutPage JSON-LD node`)
  for (const node of pageNodes) {
    check(node.url === expectedUrl, `${where}: JSON-LD page url should be ${expectedUrl}`)
    check(
      node.inLanguage === LANGUAGE_TAGS[locale],
      `${where}: JSON-LD inLanguage should be ${LANGUAGE_TAGS[locale]}`,
    )
  }
  auditArticle(where, html, head, nodes, { expectedUrl, locale })

  return {
    url: expectedUrl,
    locale,
    title,
    description,
    alternates: pageAlternates,
    internalLinks,
  }
}

/** A root-relative link reaches a built page (a path ending in /) or a built file. */
async function auditInternalLinks(pages) {
  const pagePaths = new Set(pages.map((page) => new URL(page.url).pathname))
  for (const page of pages) {
    for (const href of new Set(page.internalLinks)) {
      const target = href.replace(/[?#].*$/u, "")
      if (target.endsWith("/")) {
        check(pagePaths.has(target), `${page.url}: link ${href} reaches no built page`)
        continue
      }
      try {
        await readFile(path.join(DIST_DIRECTORY, decodeURIComponent(target)))
      } catch {
        failures.push(`${page.url}: link ${href} reaches no built file`)
      }
    }
  }
}

function auditErrorPage(name, html) {
  const head = html.split("</head>")[0]
  const robots = meta(head, "robots") ?? ""
  check(/\bnoindex\b/u.test(robots), `${name}: error pages must be noindex`)
  check(
    !tags(head, "link").some((tag) => tag.rel === "canonical"),
    `${name}: an error page answers any path and must not name a canonical`,
  )
  check(meta(head, "og:url") === undefined, `${name}: an error page must not set og:url`)
  check(alternates(head).size === 0, `${name}: an error page must not list hreflang alternates`)
}

async function auditSitemap(pages) {
  let indexXml = ""
  try {
    indexXml = await readFile(path.join(DIST_DIRECTORY, "sitemap-index.xml"), "utf8")
  } catch {
    failures.push("sitemap-index.xml is missing from the production build")
    return 0
  }
  const sitemapFiles = [...indexXml.matchAll(/<loc>([^<]+)<\/loc>/gu)].map(
    (match) => new URL(match[1]).pathname,
  )
  check(sitemapFiles.length > 0, "sitemap-index.xml lists no sitemap")
  const entries = new Map()
  for (const sitemapPath of sitemapFiles) {
    const xml = await readFile(path.join(DIST_DIRECTORY, sitemapPath), "utf8")
    for (const block of xml.matchAll(/<url>([\s\S]*?)<\/url>/gu)) {
      const loc = block[1].match(/<loc>([^<]+)<\/loc>/u)?.[1] ?? ""
      check(!entries.has(loc), `sitemap: duplicate entry ${loc}`)
      check(
        !block[1].includes("<lastmod>"),
        `sitemap: ${loc} has a lastmod, which must date a real content change, not the build`,
      )
      const links = new Map(
        [...block[1].matchAll(/<xhtml:link\b([^>]*)\/?>/gu)].map((match) => {
          const link = attributes(match[1])
          return [link.hreflang, link.href]
        }),
      )
      entries.set(loc, links)
    }
  }
  for (const page of pages) {
    const links = entries.get(page.url)
    check(Boolean(links), `sitemap: ${page.url} is missing`)
    check(
      !links || sameAlternates(links, page.alternates),
      `sitemap: ${page.url} lists other alternates than its hreflang links`,
    )
  }
  for (const loc of entries.keys()) {
    check(
      pages.some((page) => page.url === loc),
      `sitemap: ${loc} is not a built indexable page`,
    )
  }
  return entries.size
}

async function main() {
  const files = await walk(DIST_DIRECTORY)
  const pageFiles = files.filter((file) => path.basename(file) === "index.html")
  const pages = []
  for (const file of pageFiles) {
    pages.push(auditPage(file, await readFile(file, "utf8")))
  }

  for (const locale of Object.keys(LANGUAGE_TAGS)) {
    check(
      pages.some((page) => page.locale === locale),
      `no page was built for the ${locale} locale`,
    )
  }
  const byUrl = new Map(pages.map((page) => [page.url, page]))
  for (const page of pages) {
    for (const href of page.alternates.values()) {
      const target = byUrl.get(href)
      check(Boolean(target), `${page.url}: hreflang target ${href} is not a built page`)
      check(
        !target || sameAlternates(target.alternates, page.alternates),
        `${page.url}: hreflang set differs on ${href}, so the alternates are not reciprocal`,
      )
    }
  }
  await auditInternalLinks(pages)
  const seen = new Map()
  for (const page of pages) {
    for (const [field, value] of [
      ["title", page.title],
      ["description", page.description],
    ]) {
      const key = `${page.locale}:${field}:${value}`
      check(!seen.has(key), `${page.url}: ${field} duplicates ${seen.get(key)}`)
      seen.set(key, page.url)
    }
  }

  for (const name of ERROR_PAGES) {
    auditErrorPage(name, await readFile(path.join(DIST_DIRECTORY, name), "utf8"))
  }

  let sitemapEntries = 0
  if (IS_PRODUCTION) {
    sitemapEntries = await auditSitemap(pages)
    const robotsTxt = await readFile(path.join(DIST_DIRECTORY, "robots.txt"), "utf8")
    check(
      robotsTxt.includes(`Sitemap: ${SITE.origin}/sitemap-index.xml`),
      "robots.txt must name the sitemap",
    )
    check(!/^Disallow: \/$/mu.test(robotsTxt), "the production robots.txt must not disallow /")
  }

  if (failures.length > 0) {
    console.error(`SEO audit failed with ${failures.length} problem(s):`)
    for (const failure of failures) console.error(`- ${failure}`)
    process.exit(1)
  }
  console.log(
    `SEO audit passed: ${pages.length} pages in ${Object.keys(LANGUAGE_TAGS).length} languages, ` +
      `${ERROR_PAGES.length} error pages${IS_PRODUCTION ? `, ${sitemapEntries} sitemap URLs` : ""}.`,
  )
}

await main()
