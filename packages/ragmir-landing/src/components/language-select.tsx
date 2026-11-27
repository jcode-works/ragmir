import { Check, ChevronDown, Languages } from "lucide-react"
import type * as React from "react"
import { useEffect, useId, useRef, useState } from "react"
import { cn } from "../lib/utils"

interface LanguageOption {
  locale: string
  label: string
  href: string
}

interface LanguageSelectProps {
  /** Names the control for screen readers, such as "Language". */
  label: string
  locale: string
  options: readonly LanguageOption[]
  /** Places the list: under the trigger at the top of a panel, above it at the bottom of a page. */
  menuClassName: string
  /** Runs before the browser follows a language link, such as to keep the reader's place. */
  onSelect?: (event: React.MouseEvent<HTMLAnchorElement>, href: string) => void
}

/** BCP 47 tag of each landing locale, so screen readers read every language name in its language. */
const LANGUAGE_TAGS: Record<string, string> = { zh: "zh-Hans" }

/**
 * The page language as a select: the trigger shows the current language, and the list holds one
 * link per language. Links, not a native select, so crawlers follow every translation and a
 * keyboard user never leaves the page by moving through the options.
 */
export function LanguageSelect({
  label,
  locale,
  options,
  menuClassName,
  onSelect,
}: LanguageSelectProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listId = useId()
  const current = options.find((option) => option.locale === locale)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      // Inside the drawer, Escape closes the list first and leaves the drawer open: a canceled
      // keydown makes no close request to the dialog.
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      buttonRef.current?.focus()
    }
    // Tab past the last language, or back before the trigger, and the list closes behind focus.
    const onFocusIn = (event: FocusEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown, true)
    document.addEventListener("focusin", onFocusIn)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown, true)
      document.removeEventListener("focusin", onFocusIn)
    }
  }, [open])

  return (
    <nav aria-label={label} className="relative" ref={rootRef}>
      <button
        aria-controls={listId}
        aria-expanded={open}
        aria-label={`${label}: ${current?.label ?? locale}`}
        className={cn(
          "flex h-10 items-center gap-2 rounded-full bg-card pr-3 pl-3.5 font-semibold text-foreground text-sm transition-colors hover:bg-[var(--card-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-[var(--card-press)]",
          open && "bg-[var(--card-hover)]",
        )}
        onClick={() => setOpen((value) => !value)}
        ref={buttonRef}
        type="button"
      >
        <Languages aria-hidden="true" className="size-4 text-muted-foreground" />
        <span aria-hidden="true" lang={LANGUAGE_TAGS[locale] ?? locale}>
          {current?.label ?? locale}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-4 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none",
            open && "rotate-180",
          )}
        />
      </button>
      <ul
        className={cn(
          "absolute z-20 grid min-w-48 gap-0.5 rounded-2xl bg-[var(--card-hover)] p-1.5 shadow-2xl shadow-black/70",
          menuClassName,
        )}
        hidden={!open}
        id={listId}
      >
        {options.map((option) => (
          <li key={option.locale}>
            <a
              aria-current={option.locale === locale ? "page" : undefined}
              className="flex items-center justify-between gap-4 rounded-xl px-3 py-2 font-semibold text-muted-foreground text-sm transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-foreground/10 aria-[current=page]:text-foreground"
              href={option.href}
              hrefLang={LANGUAGE_TAGS[option.locale] ?? option.locale}
              lang={LANGUAGE_TAGS[option.locale] ?? option.locale}
              onClick={onSelect ? (event) => onSelect(event, option.href) : undefined}
            >
              {option.label}
              {option.locale === locale && (
                <Check aria-hidden="true" className="size-4 shrink-0 text-foreground" />
              )}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
