// The side rails of the guides and the documentation. The contents list lights the section being
// read, in the rail and in the folded list, and a rail that scrolls on its own keeps its lit link in
// view. The router swaps pages without running this module again, so each page is wired on
// `astro:page-load`.
let unwire: (() => void) | undefined

/** Brings a lit link into its rail's view by scrolling the rail, never the page. */
function revealInRail(link: Element): void {
  const rail = link.closest<HTMLElement>(".article-rail")
  if (!rail || rail.scrollHeight <= rail.clientHeight) return
  const railBox = rail.getBoundingClientRect()
  const linkBox = link.getBoundingClientRect()
  // Clear of the fades at both ends of the rail.
  const margin = 40
  if (linkBox.top < railBox.top + margin) rail.scrollTop -= railBox.top + margin - linkBox.top
  else if (linkBox.bottom > railBox.bottom - margin) {
    rail.scrollTop += linkBox.bottom - railBox.bottom + margin
  }
}

document.addEventListener("astro:page-load", () => {
  unwire?.()
  unwire = undefined
  for (const page of document.querySelectorAll('.article-rail [aria-current="page"]')) {
    revealInRail(page)
  }
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[data-toc-link]"))
  if (links.length === 0) return
  const targetOf = (link: HTMLAnchorElement): string => decodeURIComponent(link.hash.slice(1))
  const headings = Array.from(new Set(links.map(targetOf)))
    .map((id) => document.getElementById(id))
    .filter((heading) => heading !== null)
  let frame = 0
  const update = () => {
    frame = 0
    // A section counts as read once its heading passes the upper third of the window.
    const line = window.innerHeight / 3
    let current = ""
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top > line) break
      current = heading.id
    }
    for (const link of links) {
      if (targetOf(link) !== current) link.removeAttribute("aria-current")
      else if (!link.hasAttribute("aria-current")) {
        link.setAttribute("aria-current", "location")
        revealInRail(link)
      }
    }
  }
  const onScroll = () => {
    if (frame === 0) frame = requestAnimationFrame(update)
  }
  window.addEventListener("scroll", onScroll, { passive: true })
  update()
  unwire = () => {
    window.removeEventListener("scroll", onScroll)
    cancelAnimationFrame(frame)
  }
})
