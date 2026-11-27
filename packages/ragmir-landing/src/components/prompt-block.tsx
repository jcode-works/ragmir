import type * as React from "react"
import { cn } from "../lib/utils"
import { TextCopyButton } from "./command-copy"

interface PromptBlockProps {
  prompt: string
  /** Names the block in its bar, such as "Prompt". */
  label: string
  copyLabel: string
  copiedLabel: string
  /** Unique on the page: a refused copy selects the prompt by this id. */
  id: string
  className?: string
  /** Caps the prompt's height where the block shares a compact panel. */
  promptClassName?: string
}

/**
 * A prompt to paste into an AI agent, set as a code block: a bar with its label and a copy button,
 * then the prompt, which wraps and scrolls on its own.
 */
export function PromptBlock({
  prompt,
  label,
  copyLabel,
  copiedLabel,
  id,
  className,
  promptClassName,
}: PromptBlockProps): React.JSX.Element {
  return (
    <div className={cn("overflow-hidden rounded-xl bg-card", className)}>
      <div className="flex min-h-11 items-center justify-between gap-3 border-border border-b py-1.5 pr-2 pl-5">
        <span className="font-semibold text-muted-foreground text-xs">{label}</span>
        <TextCopyButton
          className="px-3 py-1.5 text-xs"
          copiedLabel={copiedLabel}
          copyLabel={copyLabel}
          selectTargetId={id}
          text={prompt}
        />
      </div>
      {/* Focusable, so the keyboard can scroll a long prompt. */}
      <pre
        className={cn(
          "max-h-80 overflow-y-auto whitespace-pre-wrap break-words px-5 py-4 font-mono text-foreground/85 text-xs leading-5",
          promptClassName,
        )}
        id={id}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must take keyboard focus.
        tabIndex={0}
        translate="no"
      >
        <code>{prompt}</code>
      </pre>
    </div>
  )
}
