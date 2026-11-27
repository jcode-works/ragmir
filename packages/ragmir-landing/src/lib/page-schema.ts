/**
 * The JSON-LD of a long-form page, shared by the guides and the documentation: the web page, the
 * article with its author and dates, and the breadcrumb trail shown above the title.
 */
import { languageTag } from "../i18n/utils"
import { MAINTAINER } from "./maintainer"

export interface Crumb {
  name: string
  href: string
}

export interface ArticleSchemaInput {
  /** The site's origin, which turns root-relative paths into absolute URLs. */
  siteBase: URL
  pageUrl: string
  title: string
  description: string
  /** The visible H1. */
  headline: string
  locale: string
  articleType: "TechArticle" | "Article"
  datePublished: Date
  dateModified: Date
  breadcrumbs: readonly Crumb[]
}

export function articleSchema(input: ArticleSchemaInput): Record<string, unknown>[] {
  const { siteBase, pageUrl, title, description, headline, locale, articleType } = input
  const ogImageUrl = new URL("/og/ragmir-og.png", siteBase).href
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: title,
      description,
      inLanguage: languageTag(locale),
      isPartOf: { "@id": "https://ragmir.com/#website" },
      about: { "@id": "https://ragmir.com/#source" },
      publisher: { "@id": "https://ragmir.com/#organization" },
      primaryImageOfPage: { "@type": "ImageObject", url: ogImageUrl, width: 2400, height: 1260 },
    },
    {
      "@context": "https://schema.org",
      "@type": articleType,
      "@id": `${pageUrl}#article`,
      headline,
      description,
      inLanguage: languageTag(locale),
      datePublished: input.datePublished.toISOString(),
      dateModified: input.dateModified.toISOString(),
      author: { "@type": "Person", ...MAINTAINER },
      publisher: { "@id": "https://ragmir.com/#organization" },
      mainEntityOfPage: { "@id": `${pageUrl}#webpage` },
      about: { "@id": "https://ragmir.com/#source" },
      image: [ogImageUrl],
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: input.breadcrumbs.map((crumb, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: crumb.name,
        item: new URL(crumb.href, siteBase).href,
      })),
    },
  ]
}
