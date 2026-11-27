import { Check, Copy, X } from "lucide-react"
import type * as React from "react"
import { useEffect, useRef, useState } from "react"
import { highlightCommand } from "../lib/command-syntax"
import { cn } from "../lib/utils"
import { COPY_FEEDBACK_MS, emitCopyNotice } from "./command-copy-toast"

type CopyState = "idle" | "copied" | "failed"

interface CommandCopyBoxProps {
  command: string
  copyLabel: string
}

/**
 * Copies `text` and shows the outcome for `COPY_FEEDBACK_MS`, then announces it through the copy
 * toast. When the browser refuses the clipboard, `selectInstead` selects the same text on the page,
 * so the visitor can copy it with the keyboard shortcut the toast names.
 */
function useCopy(
  text: string,
  { toast }: { toast: boolean },
): {
  state: CopyState
  copy: (selectInstead: () => void) => Promise<void>
} {
  const [state, setState] = useState<CopyState>("idle")
  const resetTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (resetTimeout.current) clearTimeout(resetTimeout.current)
    }
  }, [])

  const copy = async (selectInstead: () => void) => {
    let copied = true
    try {
      await writeCommandToClipboard(text)
    } catch {
      copied = false
      selectInstead()
    }
    setState(copied ? "copied" : "failed")
    emitCopyNotice({ copied, toast: toast || !copied })
    if (resetTimeout.current) clearTimeout(resetTimeout.current)
    resetTimeout.current = setTimeout(() => setState("idle"), COPY_FEEDBACK_MS)
  }

  return { state, copy }
}

async function writeCommandToClipboard(command: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(command)
    return
  }

  const textarea = document.createElement("textarea")
  textarea.value = command
  textarea.setAttribute("readonly", "")
  textarea.style.position = "fixed"
  textarea.style.left = "-9999px"
  document.body.append(textarea)
  textarea.select()
  // The deprecated command is the only copy path where the async clipboard is missing (plain HTTP,
  // older browsers), so it stays as the fallback.
  // noinspection JSDeprecatedSymbols
  const copyFallback = document.execCommand.bind(document) as (commandId: string) => boolean
  const copied = copyFallback("copy")
  textarea.remove()
  if (!copied) {
    throw new Error("Clipboard copy failed.")
  }
}

/** Selects the text of `element` on the page, ready for the copy shortcut. */
function selectText(element: Element | null | undefined): void {
  const selection = window.getSelection()
  if (!element || !selection) return
  const range = document.createRange()
  range.selectNodeContents(element)
  selection.removeAllRanges()
  selection.addRange(range)
}

/** Selects all of a text field or a block of text, ready for the copy shortcut. */
function selectField(id: string | undefined): void {
  const field = id ? document.getElementById(id) : null
  if (!(field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement)) {
    selectText(field)
    return
  }
  field.focus()
  field.select()
}

/** The copy icon, then a check after a copy or a cross after a refusal. */
function CopyStateIcon({
  state,
  className,
}: {
  state: CopyState
  className?: string
}): React.JSX.Element {
  if (state === "copied") {
    return (
      <Check
        aria-hidden="true"
        className={cn("copy-confirm shrink-0 text-[var(--accent-title)]", className)}
      />
    )
  }
  if (state === "failed") {
    return <X aria-hidden="true" className={cn("copy-confirm shrink-0", className)} />
  }
  return <Copy aria-hidden="true" className={cn("shrink-0", className)} />
}

export function CommandCopyBox({ command, copyLabel }: CommandCopyBoxProps): React.JSX.Element {
  const { state, copy } = useCopy(command, { toast: true })
  const codeRef = useRef<HTMLElement>(null)

  return (
    <button
      aria-label={`${copyLabel}: ${command}`}
      className="group flex w-full items-center justify-between gap-3 rounded-xl bg-background px-3.5 py-3 text-left transition-colors hover:bg-[var(--inset-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-[var(--card-press)]"
      onClick={() => void copy(() => selectText(codeRef.current))}
      type="button"
    >
      <code className="select-text overflow-x-auto font-mono text-xs leading-5" ref={codeRef}>
        {highlightCommand(command)}
      </code>
      <CopyStateIcon
        className={cn(
          "size-4",
          state === "idle" && "text-muted-foreground transition-colors group-hover:text-foreground",
        )}
        state={state}
      />
    </button>
  )
}

interface CommandCopyButtonProps extends CommandCopyBoxProps {
  className?: string
  iconClassName?: string
}

interface TextCopyButtonProps {
  text: string
  copyLabel: string
  copiedLabel: string
  /** The field that shows `text`, selected instead when the browser refuses the clipboard. */
  selectTargetId?: string
  className?: string
}

/**
 * A labelled copy button. Both labels share one grid cell, so the button keeps its width, and its
 * name is the visible label: the hidden one is not read.
 */
export function TextCopyButton({
  text,
  copyLabel,
  copiedLabel,
  selectTargetId,
  className,
}: TextCopyButtonProps): React.JSX.Element {
  const { state, copy } = useCopy(text, { toast: false })
  const copied = state === "copied"

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-4 py-2 font-bold text-background text-sm transition-colors hover:bg-[var(--foreground-hover)] active:bg-[var(--foreground-press)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      onClick={() => void copy(() => selectField(selectTargetId))}
      type="button"
    >
      <CopyStateIcon className="size-4" state={state} />
      <span className="grid justify-items-center">
        <span className={cn("[grid-area:1/1]", copied && "invisible")}>{copyLabel}</span>
        <span className={cn("[grid-area:1/1]", !copied && "invisible")}>{copiedLabel}</span>
      </span>
    </button>
  )
}

/**
 * The icon-only copy button of a terminal line. A refused copy selects the line's text, found as
 * the `[data-copy-text]` element of the enclosing `[data-copy-line]`.
 */
export function CommandCopyButton({
  command,
  copyLabel,
  className,
  iconClassName,
}: CommandCopyButtonProps): React.JSX.Element {
  const { state, copy } = useCopy(command, { toast: true })

  return (
    <button
      aria-label={`${copyLabel}: ${command}`}
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground transition-colors hover:bg-[var(--card-hover)] hover:text-foreground active:bg-[var(--card-press)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      onClick={(event) => {
        const line = event.currentTarget.closest("[data-copy-line]")
        void copy(() => selectText(line?.querySelector("[data-copy-text]")))
      }}
      title={`${copyLabel}: ${command}`}
      type="button"
    >
      <CopyStateIcon className={cn("size-3.5", iconClassName)} state={state} />
    </button>
  )
}

/**
 * The icon-only copy button of a code block in an article. A refused copy selects the block's
 * code, found as the `pre` of the enclosing `[data-code-block]`.
 */
export function CodeCopyButton({
  code,
  copyLabel,
}: {
  code: string
  copyLabel: string
}): React.JSX.Element {
  const { state, copy } = useCopy(code, { toast: true })

  return (
    <button
      aria-label={copyLabel}
      className="inline-flex size-8 items-center justify-center rounded-full bg-background/70 text-muted-foreground transition-colors hover:bg-[var(--card-hover)] hover:text-foreground active:bg-[var(--card-press)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={(event) => {
        const block = event.currentTarget.closest("[data-code-block]")
        void copy(() => selectText(block?.querySelector("pre")))
      }}
      title={copyLabel}
      type="button"
    >
      <CopyStateIcon className="size-4" state={state} />
    </button>
  )
}
