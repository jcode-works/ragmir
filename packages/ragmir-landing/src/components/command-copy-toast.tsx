import { Check, X } from "lucide-react"
import type * as React from "react"
import { useEffect, useRef, useState } from "react"
import { cn } from "../lib/utils"

/** How long a copy outcome shows: on the button that copied, and in the toast. */
export const COPY_FEEDBACK_MS = 2000

export interface CopyNotice {
  copied: boolean
  /** Whether the toast shows too; a button that says "Copied" itself is only announced. */
  toast: boolean
}

const copyNoticeSubscribers = new Set<(notice: CopyNotice) => void>()

export function emitCopyNotice(notice: CopyNotice): void {
  for (const notify of copyNoticeSubscribers) notify(notice)
}

interface CommandCopyToastProps {
  copiedMessage: string
  /** Said when the browser refuses the clipboard; `{shortcut}` becomes ⌘C or Ctrl+C. */
  failedMessage: string
}

/**
 * Reports every copy in a polite live region. Its text is written for each copy and cleared
 * afterwards, so screen readers announce a second copy too. Copies from icon-only buttons, and
 * every refusal, also show the toast at the bottom of the screen, which screen readers skip.
 */
export function CommandCopyToast({
  copiedMessage,
  failedMessage,
}: CommandCopyToastProps): React.JSX.Element {
  const [announcement, setAnnouncement] = useState("")
  const [toast, setToast] = useState({ copied: true, text: "", visible: false })
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    const clearTimers = () => {
      for (const timer of timers.current) clearTimeout(timer)
      timers.current = []
    }
    const notify = ({ copied, toast: showToast }: CopyNotice) => {
      clearTimers()
      const text = copied ? copiedMessage : failedMessage.replace("{shortcut}", copyShortcut())
      setAnnouncement("")
      timers.current.push(setTimeout(() => setAnnouncement(text), 50))
      setToast((current) =>
        showToast ? { copied, text, visible: true } : { ...current, visible: false },
      )
      timers.current.push(
        setTimeout(() => {
          setAnnouncement("")
          setToast((current) => ({ ...current, visible: false }))
        }, COPY_FEEDBACK_MS),
      )
    }
    copyNoticeSubscribers.add(notify)
    return () => {
      copyNoticeSubscribers.delete(notify)
      clearTimers()
    }
  }, [copiedMessage, failedMessage])

  return (
    <>
      <p className="sr-only" role="status">
        {announcement}
      </p>
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-6 z-50 mx-auto flex w-fit max-w-[calc(100%-2.5rem)] items-center gap-2 rounded-full bg-[#1f1f1f] px-4 py-2 font-semibold text-foreground text-sm shadow-2xl shadow-black/40 transition-[opacity,translate] duration-300",
          // Reduced motion keeps the fade and drops the rise.
          toast.visible
            ? "translate-y-0 opacity-100"
            : "translate-y-3 opacity-0 motion-reduce:translate-y-0",
        )}
      >
        {toast.copied ? (
          <Check className="size-4 shrink-0 text-[var(--accent-title)]" />
        ) : (
          <X className="size-4 shrink-0" />
        )}
        {toast.text}
      </div>
    </>
  )
}

/** The keyboard shortcut that copies a selection on this device (iPadOS reports a Mac). */
function copyShortcut(): string {
  return /Mac|iPhone|iPad|iPod/u.test(navigator.userAgent) ? "⌘C" : "Ctrl+C"
}
