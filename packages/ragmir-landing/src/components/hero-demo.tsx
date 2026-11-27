import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react"
import type * as React from "react"
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import { highlightCall, highlightCode, highlightCommand } from "../lib/command-syntax"
import { cn } from "../lib/utils"
import { CommandCopyButton } from "./command-copy"
import {
  DEFAULT_HERO_DEMO_SCENARIO,
  findHeroDemoScenario,
  HERO_DEMO_SCENARIOS,
  type TerminalLineKind,
  type TerminalScriptLine,
} from "./hero-demo-script"
import { scrollEdgeMask, useScrollEdges } from "./scroll-edges"
import { TabIndicator } from "./tab-indicator"

interface HeroDemoProps {
  translations: Record<string, string>
}

interface PlaybackState {
  visibleCount: number
  typingLineIndex: number | null
  typedText: string
  isComplete: boolean
}

const INITIAL_PLAYBACK_STATE: PlaybackState = {
  visibleCount: 0,
  typingLineIndex: null,
  typedText: "",
  isComplete: false,
}

const TYPEABLE_LINE_KINDS = new Set<TerminalLineKind>(["shell", "codex"])
/** Within this distance of the bottom the terminal follows new lines; scrolled further up, it stays. */
const FOLLOW_THRESHOLD_PX = 24
const COPYABLE_TERMINAL_LINE_KINDS = new Set<TerminalLineKind>(["shell", "codex"])
const TAB_ROW_ARROW_CLASS_NAME =
  "absolute top-1/2 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--card-hover)] text-foreground transition-colors hover:bg-[#2a2a2a] active:bg-[var(--card-press)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-disabled:pointer-events-none aria-disabled:opacity-40 sm:flex"

export function HeroDemo({ translations }: HeroDemoProps): React.JSX.Element {
  const t = useCallback((key: string): string => translations[key] ?? key, [translations])
  const [activeScenarioId, setActiveScenarioId] = useState(DEFAULT_HERO_DEMO_SCENARIO.id)
  const activeScenario = useMemo(() => findHeroDemoScenario(activeScenarioId), [activeScenarioId])
  const [playback, setPlayback] = useState<PlaybackState>(INITIAL_PLAYBACK_STATE)
  const baseId = useId()
  const panelId = `${baseId}-panel`
  const descriptionId = `${baseId}-description`
  const tabId = (scenarioId: string): string => `${baseId}-tab-${scenarioId}`
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isVisible = useRef(false)
  const hasPlayedRef = useRef(false)
  // Whether the terminal is scrolled to its last lines, so new lines may scroll it.
  const followRef = useRef(true)
  // Once a visitor picks a tab or replays, the demo stops moving on by itself.
  const [manual, setManual] = useState(false)
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearAllTimeouts = useCallback(() => {
    for (const timeout of timeoutsRef.current) clearTimeout(timeout)
    timeoutsRef.current = []
  }, [])

  const resolveLineText = useCallback(
    (line: TerminalScriptLine): string => {
      if (line.text !== undefined) return line.text
      return t(line.textKey)
    },
    [t],
  )

  const startSequence = useCallback(() => {
    clearAllTimeouts()
    followRef.current = true
    containerRef.current?.removeAttribute("data-reading")
    const prefersReducedMotion =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (prefersReducedMotion) {
      setPlayback({
        visibleCount: activeScenario.lines.length,
        typingLineIndex: null,
        typedText: "",
        isComplete: true,
      })
      return
    }

    setPlayback(INITIAL_PLAYBACK_STATE)
    let elapsed = 350

    const schedule = (callback: () => void, delay: number) => {
      timeoutsRef.current.push(setTimeout(callback, delay))
    }

    for (let i = 0; i < activeScenario.lines.length; i++) {
      const line = activeScenario.lines[i]
      if (!line) continue
      const lineIndex = i
      const text = resolveLineText(line)

      if (TYPEABLE_LINE_KINDS.has(line.kind)) {
        const characters = Array.from(text)
        const typingDuration = clamp(characters.length * 24, 560, 1800)
        const stepMs = Math.max(18, Math.round(typingDuration / Math.max(characters.length, 1)))

        schedule(
          () =>
            setPlayback({
              visibleCount: lineIndex,
              typingLineIndex: lineIndex,
              typedText: "",
              isComplete: false,
            }),
          elapsed,
        )

        for (let characterIndex = 0; characterIndex < characters.length; characterIndex++) {
          const partialText = characters.slice(0, characterIndex + 1).join("")
          schedule(
            () =>
              setPlayback((current) =>
                current.typingLineIndex === lineIndex
                  ? { ...current, typedText: partialText }
                  : current,
              ),
            elapsed + (characterIndex + 1) * stepMs,
          )
        }

        elapsed += typingDuration + 180
      } else {
        elapsed += line.kind === "tree" ? 260 : 430
      }

      schedule(
        () =>
          setPlayback((current) => ({
            ...current,
            visibleCount: lineIndex + 1,
            typingLineIndex: null,
            typedText: "",
          })),
        elapsed,
      )

      elapsed += line.holdMs ?? defaultLineHoldMs(line.kind)
    }

    schedule(() => setPlayback((current) => ({ ...current, isComplete: true })), elapsed + 250)
  }, [activeScenario, clearAllTimeouts, resolveLineText])

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    // Off screen or in a hidden tab, the line that leads to the next story holds still.
    const syncOffscreen = () =>
      element.toggleAttribute("data-offscreen", !isVisible.current || document.hidden)
    const observer = new IntersectionObserver(
      (entries) => {
        const wasVisible = isVisible.current
        isVisible.current = entries[0]?.isIntersecting ?? false
        syncOffscreen()
        if (isVisible.current && !wasVisible && !hasPlayedRef.current) {
          hasPlayedRef.current = true
          startSequence()
        }
      },
      { threshold: 0.3 },
    )
    observer.observe(element)
    document.addEventListener("visibilitychange", syncOffscreen)
    return () => {
      observer.disconnect()
      document.removeEventListener("visibilitychange", syncOffscreen)
      clearAllTimeouts()
    }
  }, [startSequence, clearAllTimeouts])

  useEffect(() => {
    if (isVisible.current || hasPlayedRef.current) {
      startSequence()
    }
  }, [startSequence])

  useEffect(() => {
    // New lines scroll the terminal only while the reader is at its last lines.
    if (followRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  })

  // A reader who scrolls the terminal up keeps the lines they read, and the demo waits for them.
  const handleTerminalScroll = useCallback(() => {
    const element = scrollRef.current
    if (!element) return
    followRef.current =
      element.scrollHeight - element.scrollTop - element.clientHeight <= FOLLOW_THRESHOLD_PX
    containerRef.current?.toggleAttribute("data-reading", !followRef.current)
  }, [])

  // Until the visitor picks a story, a finished story leads to the next one once the line under
  // its tab has filled (`.demo-advance`, held under the pointer, focus, or reading).
  const advanceStory = useCallback(() => {
    const index = HERO_DEMO_SCENARIOS.findIndex((scenario) => scenario.id === activeScenario.id)
    const next = HERO_DEMO_SCENARIOS[(index + 1) % HERO_DEMO_SCENARIOS.length]
    if (next) setActiveScenarioId(next.id)
  }, [activeScenario.id])
  const autoAdvancing = playback.isComplete && !manual

  // The story tabs slide in one row, like a streaming catalogue row: swipe on touch, arrows on
  // wider screens, and edges that fade only where more stories wait.
  const tabScrollRef = useRef<HTMLDivElement>(null)
  const tabEdges = useScrollEdges(tabScrollRef)

  useEffect(() => {
    // Keep the active story in view inside the row, without ever scrolling the page.
    const container = tabScrollRef.current
    const active = container?.querySelector<HTMLElement>(
      `[data-scenario-id="${activeScenario.id}"]`,
    )
    if (container && active) revealInRow(container, active)
  }, [activeScenario.id])

  // The stories form one tab stop (APG tabs, manual activation): the arrows, Home, and End move
  // focus along the row, and Enter or Space plays the focused story.
  const handleTabKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]'))
    const focused = document.activeElement
    const current = focused instanceof HTMLElement ? tabs.indexOf(focused) : -1
    if (current === -1) return
    const target = {
      ArrowRight: (current + 1) % tabs.length,
      ArrowLeft: (current - 1 + tabs.length) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    }[event.key]
    const tab = target === undefined ? undefined : tabs[target]
    if (!tab) return
    event.preventDefault()
    tab.focus({ preventScroll: true })
    const container = tabScrollRef.current
    if (container) revealInRow(container, tab)
  }, [])

  const scrollTabs = useCallback((direction: 1 | -1) => {
    const element = tabScrollRef.current
    if (!element) return
    element.scrollBy({
      left: direction * element.clientWidth * 0.7,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    })
  }, [])

  const handleReplay = useCallback(() => {
    setManual(true)
    startSequence()
  }, [startSequence])

  const handleScenarioSelect = useCallback(
    (scenarioId: string) => {
      setManual(true)
      if (scenarioId === activeScenario.id) {
        startSequence()
        return
      }

      setActiveScenarioId(scenarioId)
    },
    [activeScenario.id, startSequence],
  )

  const lineClass: Record<TerminalLineKind, string> = {
    shell: "",
    codex: "text-amber-300",
    script: "text-cyan-300",
    tree: "text-sky-300/90",
    output: "text-muted-foreground",
    mcp: "",
    citation: "font-semibold text-yellow-300",
    insight: "text-emerald-300",
    change: "text-cyan-300",
    success: "text-emerald-400",
  }

  const linePrefix: Partial<Record<TerminalLineKind, string>> = {
    shell: "Shell",
    codex: t("demo_agent_prefix"),
    script: t("demo_script_prefix"),
    mcp: "Ragmir",
  }

  // One keyed list: a line being typed and the same line once finished share a key, so React
  // updates it in place and its entrance animation plays only once.
  const renderedLines = activeScenario.lines.slice(0, playback.visibleCount).map((line, index) =>
    renderTerminalLine({
      key: `${activeScenario.id}-${index}`,
      line,
      lineClass,
      linePrefix,
      copyLabel: t("copy_command"),
      text: resolveLineText(line),
    }),
  )
  if (playback.typingLineIndex !== null) {
    renderedLines.push(
      renderTerminalLine({
        key: `${activeScenario.id}-${playback.typingLineIndex}`,
        line: activeScenario.lines[playback.typingLineIndex],
        lineClass,
        linePrefix,
        copyLabel: t("copy_command"),
        text: playback.typedText,
        showCursor: true,
      }),
    )
  }

  return (
    <div
      className="mx-auto flex h-[34rem] min-h-[34rem] max-h-[34rem] min-w-0 w-full max-w-full shrink-0 flex-col overflow-hidden rounded-xl bg-card sm:max-w-xl lg:max-w-none"
      data-demo
      ref={containerRef}
    >
      <div className="flex shrink-0 items-center gap-3 px-4 pt-3 pb-2.5">
        <div aria-hidden="true" className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </div>
        <span className="min-w-0 flex-1 truncate font-mono text-[0.68rem] text-muted-foreground">
          {activeScenario.terminalTitle}
        </span>
        <button
          aria-label={t("demo_replay_label")}
          className="-my-1 flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[var(--card-hover)] hover:text-foreground active:bg-[var(--card-press)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={handleReplay}
          title={t("demo_replay_label")}
          type="button"
        >
          <RotateCcw aria-hidden="true" className="size-3.5" />
        </button>
      </div>

      <div className="relative mx-3 shrink-0">
        <div
          aria-label={t("demo_tabs_label")}
          className="overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onKeyDown={handleTabKeyDown}
          ref={tabScrollRef}
          role="tablist"
          style={scrollEdgeMask(tabEdges)}
        >
          {/* From `sm`, the row leaves room at both ends for its arrow buttons. */}
          <div className="group/scenario-tabs relative flex w-max gap-1.5 sm:px-10">
            <TabIndicator activeSelector='[aria-selected="true"]' className="z-[1]" />
            {HERO_DEMO_SCENARIOS.map((scenario) => {
              const isActive = scenario.id === activeScenario.id

              return (
                <button
                  aria-controls={panelId}
                  aria-selected={isActive}
                  className={cn(
                    "relative h-8 shrink-0 rounded-full px-3.5 font-semibold text-xs transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive
                      ? "bg-foreground text-background group-data-[indicator=ready]/scenario-tabs:bg-background"
                      : "bg-background text-muted-foreground hover:text-foreground active:bg-[var(--card-press)]",
                  )}
                  data-scenario-id={scenario.id}
                  id={tabId(scenario.id)}
                  key={scenario.id}
                  onClick={() => handleScenarioSelect(scenario.id)}
                  role="tab"
                  tabIndex={isActive ? 0 : -1}
                  type="button"
                >
                  <span className="relative z-[2]">{t(scenario.titleKey)}</span>
                  {isActive && autoAdvancing && (
                    // A faint track, so a line held at its start still shows the demo is waiting.
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-3 bottom-1 z-[3] h-0.5 overflow-hidden rounded-full bg-background/15 motion-reduce:hidden"
                    >
                      <span
                        className="demo-advance block h-full rounded-full bg-background/60"
                        onAnimationEnd={advanceStory}
                      />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
        {/* At an end of the row its arrow is disabled, not removed, so it keeps keyboard focus. */}
        {(tabEdges.start || tabEdges.end) && (
          <>
            <button
              aria-disabled={!tabEdges.start}
              aria-label={t("demo_tabs_previous")}
              className={cn(TAB_ROW_ARROW_CLASS_NAME, "left-0")}
              onClick={() => {
                if (tabEdges.start) scrollTabs(-1)
              }}
              type="button"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
            </button>
            <button
              aria-disabled={!tabEdges.end}
              aria-label={t("demo_tabs_next")}
              className={cn(TAB_ROW_ARROW_CLASS_NAME, "right-0")}
              onClick={() => {
                if (tabEdges.end) scrollTabs(1)
              }}
              type="button"
            >
              <ChevronRight aria-hidden="true" className="arrow-forward size-4" />
            </button>
          </>
        )}
      </div>

      <p
        className="min-h-16 px-4 pt-3 pb-2 text-xs leading-5 text-muted-foreground"
        id={descriptionId}
      >
        {t(activeScenario.descriptionKey)}
      </p>

      {/* The terminal is the story's panel and a tab stop, so the keyboard can scroll it. */}
      <div
        aria-describedby={descriptionId}
        aria-labelledby={tabId(activeScenario.id)}
        className="mx-3 mb-3 min-h-0 flex-1 overflow-y-auto rounded-xl bg-background p-4 font-mono text-[0.68rem] leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-xs"
        id={panelId}
        onScroll={handleTerminalScroll}
        ref={scrollRef}
        role="tabpanel"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: APG makes a panel that starts with text a tab stop.
        tabIndex={0}
      >
        {renderedLines}

        {playback.typingLineIndex === null && !playback.isComplete && (
          <span className="inline-block h-3.5 w-2 animate-pulse bg-foreground/60" />
        )}
      </div>
    </div>
  )
}

function renderTerminalLine(input: {
  key: string
  line: TerminalScriptLine | undefined
  lineClass: Record<TerminalLineKind, string>
  linePrefix: Partial<Record<TerminalLineKind, string>>
  copyLabel: string
  text: string
  showCursor?: boolean
}): React.JSX.Element | null {
  const { key, line, lineClass, linePrefix, copyLabel, text, showCursor = false } = input

  if (!line) return null

  const prefix = line.prefix ?? linePrefix[line.kind]
  const copyable = !showCursor && COPYABLE_TERMINAL_LINE_KINDS.has(line.kind) && text.trim()
  const body =
    line.kind === "shell"
      ? highlightCommand(text)
      : line.kind === "mcp"
        ? highlightCall(text)
        : line.kind === "script" && text.includes("(")
          ? highlightCode(text)
          : text
  const content = (
    <span
      className={cn("min-w-0 whitespace-pre-wrap break-words", lineClass[line.kind])}
      data-copy-text
    >
      {body}
      {showCursor && (
        <span className="ml-1 inline-block h-3.5 w-2 animate-pulse bg-foreground/70" />
      )}
    </span>
  )

  if (prefix) {
    return (
      <div className="group/terminal-line terminal-line-in mt-3 mb-1" data-copy-line key={key}>
        <span className="mb-1 block font-sans text-[0.68rem] font-semibold text-muted-foreground">
          {prefix}
        </span>
        <div className="flex min-w-0 items-start gap-2">
          <span className="min-w-0 flex-1">{content}</span>
          {copyable && (
            <CommandCopyButton
              // Shown on hover and focus; touch screens, which never hover, keep it half visible.
              className="mt-0.5 opacity-0 group-hover/terminal-line:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-50"
              command={text}
              copyLabel={copyLabel}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "terminal-line-in mb-0.5",
        line.kind === "citation" && "citation-mark -mx-1 px-1",
        lineClass[line.kind],
      )}
      key={key}
    >
      {content}
    </div>
  )
}

function defaultLineHoldMs(kind: TerminalLineKind): number {
  if (kind === "citation" || kind === "insight" || kind === "success") return 1050
  if (kind === "mcp") return 750
  if (kind === "tree" || kind === "change") return 520
  return 680
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Scrolls a row of tabs sideways so `element` shows with a margin, never scrolling the page. */
function revealInRow(container: HTMLElement, element: HTMLElement): void {
  const containerRect = container.getBoundingClientRect()
  const elementRect = element.getBoundingClientRect()
  const margin = 32
  if (
    elementRect.left < containerRect.left + margin ||
    elementRect.right > containerRect.right - margin
  ) {
    container.scrollTo({
      left: container.scrollLeft + elementRect.left - containerRect.left - margin,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    })
  }
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}
