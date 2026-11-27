import { describe, expect, it } from "vitest"
import { articleSchema } from "./page-schema"

describe("articleSchema", () => {
  const [webPage, article, breadcrumbs] = articleSchema({
    siteBase: new URL("https://ragmir.com"),
    pageUrl: "https://ragmir.com/docs/quick-start/",
    title: "Quick start | Ragmir docs",
    description: "Install Ragmir and run a first cited search.",
    headline: "Quick start",
    locale: "zh",
    articleType: "TechArticle",
    datePublished: new Date("2026-11-01T00:00:00Z"),
    dateModified: new Date("2026-11-27T00:00:00Z"),
    breadcrumbs: [
      { name: "Ragmir", href: "/" },
      { name: "Docs", href: "/docs/" },
      { name: "Quick start", href: "/docs/quick-start/" },
    ],
  })

  it("ties the article to its page, its author, and its dates", () => {
    expect(webPage).toMatchObject({
      "@type": "WebPage",
      "@id": "https://ragmir.com/docs/quick-start/#webpage",
      name: "Quick start | Ragmir docs",
      inLanguage: "zh-Hans",
    })
    expect(article).toMatchObject({
      "@type": "TechArticle",
      headline: "Quick start",
      datePublished: "2026-11-01T00:00:00.000Z",
      dateModified: "2026-11-27T00:00:00.000Z",
      author: { "@type": "Person", name: "Jean-Baptiste Thery" },
      mainEntityOfPage: { "@id": "https://ragmir.com/docs/quick-start/#webpage" },
      image: ["https://ragmir.com/og/ragmir-og.png"],
    })
  })

  it("lists the breadcrumb trail with absolute URLs in order", () => {
    expect(breadcrumbs).toMatchObject({
      "@type": "BreadcrumbList",
      itemListElement: [
        { position: 1, name: "Ragmir", item: "https://ragmir.com/" },
        { position: 2, name: "Docs", item: "https://ragmir.com/docs/" },
        { position: 3, name: "Quick start", item: "https://ragmir.com/docs/quick-start/" },
      ],
    })
  })
})
