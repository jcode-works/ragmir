import { type CSSProperties, type RefObject, useEffect, useState } from "react"

/** Whether a horizontal row hides more items before or after what it shows. */
export interface ScrollEdges {
  start: boolean
  end: boolean
}

/**
 * Follows the hidden sides of a horizontal scroll row as it scrolls and as it or its items resize,
 * such as when fonts load. Both stay false while the row fits, and on the server.
 */
export function useScrollEdges(ref: RefObject<HTMLElement | null>): ScrollEdges {
  const [edges, setEdges] = useState<ScrollEdges>({ start: false, end: false })

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const update = () => {
      const start = element.scrollLeft > 4
      const end = element.scrollLeft + element.clientWidth < element.scrollWidth - 4
      setEdges((current) =>
        current.start === start && current.end === end ? current : { start, end },
      )
    }
    update()
    element.addEventListener("scroll", update, { passive: true })
    const resizes = new ResizeObserver(update)
    resizes.observe(element)
    for (const child of Array.from(element.children)) resizes.observe(child)
    return () => {
      element.removeEventListener("scroll", update)
      resizes.disconnect()
    }
  }, [ref])

  return edges
}

/** Fades a row only on the sides where more items wait. */
export function scrollEdgeMask(edges: ScrollEdges): CSSProperties | undefined {
  if (!edges.start && !edges.end) return undefined
  const fade = 40
  const start = edges.start ? `transparent 0, #000 ${fade}px` : "#000 0"
  const end = edges.end ? `#000 calc(100% - ${fade}px), transparent 100%` : "#000 100%"
  const mask = `linear-gradient(to right, ${start}, ${end})`
  return { maskImage: mask, WebkitMaskImage: mask }
}
