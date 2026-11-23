/**
 * A card row marked `data-scroll-row` scrolls sideways on phones, so it is a tab stop there and the
 * keyboard can reach the cards it hides. Laid out as a grid it scrolls nothing, so it leaves the tab
 * order. The server renders `tabindex="0"`, which keeps the row reachable without JavaScript.
 */
const rows = new Set<HTMLElement>()
let resizes: ResizeObserver | undefined

function syncTabStop(row: HTMLElement): void {
  if (row.scrollWidth > row.clientWidth + 1) row.setAttribute("tabindex", "0")
  else row.removeAttribute("tabindex")
}

/** Runs on every `astro:page-load`; rows from a page the router has replaced are released. */
export function initScrollRows(): void {
  if (typeof ResizeObserver === "undefined") return
  resizes ??= new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.target instanceof HTMLElement) syncTabStop(entry.target)
    }
  })
  for (const row of rows) {
    if (row.isConnected) continue
    resizes.unobserve(row)
    rows.delete(row)
  }
  for (const row of document.querySelectorAll<HTMLElement>("[data-scroll-row]")) {
    if (rows.has(row)) continue
    rows.add(row)
    syncTabStop(row)
    resizes.observe(row)
  }
}
