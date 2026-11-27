import type * as React from "react"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { CodeCopyButton } from "./command-copy"
import { CommandCopyToast } from "./command-copy-toast"

interface ArticleCodeCopyProps {
  /** The element whose code blocks get a copy button. */
  containerId: string
  copyLabel: string
  copiedMessage: string
  /** Said when the browser refuses the clipboard; `{shortcut}` becomes ⌘C or Ctrl+C. */
  failedMessage: string
}

interface CodeBlock {
  slot: HTMLElement
  code: string
}

/**
 * Gives each code block of an article the landing's copy button. The blocks come from Markdown,
 * so the island wraps each `pre` once it runs and renders the buttons into the wrappers; without
 * JavaScript the code stays readable and selectable.
 */
export function ArticleCodeCopy({
  containerId,
  copyLabel,
  copiedMessage,
  failedMessage,
}: ArticleCodeCopyProps): React.JSX.Element {
  const [blocks, setBlocks] = useState<CodeBlock[]>([])

  useEffect(() => {
    const container = document.getElementById(containerId)
    if (!container) return
    const wrapped = [...container.querySelectorAll("pre")].map((pre) => {
      const wrapper = document.createElement("div")
      wrapper.dataset.codeBlock = ""
      const slot = document.createElement("div")
      slot.className = "code-copy-slot"
      pre.before(wrapper)
      wrapper.append(pre, slot)
      return { pre, wrapper, slot, code: (pre.textContent ?? "").trimEnd() }
    })
    setBlocks(wrapped.map(({ slot, code }) => ({ slot, code })))
    return () => {
      for (const { pre, wrapper } of wrapped) {
        wrapper.before(pre)
        wrapper.remove()
      }
    }
  }, [containerId])

  return (
    <>
      {blocks.map(({ slot, code }, index) =>
        createPortal(<CodeCopyButton code={code} copyLabel={copyLabel} />, slot, String(index)),
      )}
      <CommandCopyToast copiedMessage={copiedMessage} failedMessage={failedMessage} />
    </>
  )
}
