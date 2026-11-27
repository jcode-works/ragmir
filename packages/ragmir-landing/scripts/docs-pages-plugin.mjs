// Sätteri HAST plugin for the guides the site renders from the repository's `docs/` folder. It
// drops their H1, which the page template prints, and the "On the web" pointer under it, which
// would link the page to itself; it turns their relative links into site pages (other guides) or
// GitHub URLs (any other repository file), since the build audit allows no relative link. Other
// Markdown files leave it out of their pipeline.
import { existsSync, statSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const REPOSITORY_URL = "https://github.com/jcode-works/ragmir"
const SCHEME = /^[a-z][a-z\d+.-]*:/iu
const WEB_POINTER = /^\s*On the web: ragmir\.com\/docs\//u

/** @param {{ docsDirectory: string }} options absolute path of the repository's `docs/` folder */
export function docsPagesPlugin({ docsDirectory }) {
  const repositoryRoot = path.dirname(docsDirectory)
  return ({ fileURL }) => {
    const source = fileURL ? fileURLToPath(fileURL) : undefined
    if (!source || path.dirname(source) !== docsDirectory) {
      return false
    }
    let titleRemoved = false
    let pointerRemoved = false
    return {
      name: "ragmir-docs-pages",
      element: {
        filter: ["h1", "blockquote", "a"],
        visit(node, context) {
          const topLevel = context.parent(node)?.type === "root"
          if (node.tagName === "h1") {
            if (!titleRemoved && topLevel) {
              titleRemoved = true
              context.removeNode(node)
            }
            return
          }
          if (node.tagName === "blockquote") {
            if (!pointerRemoved && topLevel && WEB_POINTER.test(context.textContent(node))) {
              pointerRemoved = true
              context.removeNode(node)
            }
            return
          }
          const href = node.properties?.href
          if (typeof href === "string" && !SCHEME.test(href) && !/^[#/?]/u.test(href)) {
            context.setProperty(node, "href", siteHref(href, path.dirname(source)))
          }
        },
      },
    }
  }

  function siteHref(href, sourceDirectory) {
    const [target, hash = ""] = href.split("#")
    const fragment = hash ? `#${hash}` : ""
    const absolute = path.resolve(sourceDirectory, target)
    if (path.dirname(absolute) === docsDirectory && absolute.endsWith(".md")) {
      return `/docs/${path.basename(absolute, ".md")}/${fragment}`
    }
    const relative = path.relative(repositoryRoot, absolute).split(path.sep).join("/")
    const kind = existsSync(absolute) && statSync(absolute).isDirectory() ? "tree" : "blob"
    return `${REPOSITORY_URL}/${kind}/main/${relative}${fragment}`
  }
}
