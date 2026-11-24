import { createHash } from "node:crypto"
import { MARKDOWN_EXTENSIONS, markdownFenceSpans, structuralSpans } from "./document-structure.js"
import { throwIfAborted } from "./operation.js"
import { identifierParts, normalizeForMatch } from "./text.js"
import type { ParsedDocument, ParsedPage, ParsedRegion, TextChunk } from "./types.js"

const PARAGRAPH_BREAK_MIN_RATIO = 0.45
const SENTENCE_BREAK_MIN_RATIO = 0.55
const LINE_BREAK_MIN_RATIO = 0.65
const WHITESPACE_BREAK_MIN_RATIO = 0.75
const SENTENCE_BOUNDARIES = [". ", "? ", "! ", "。", "？", "！"]

export interface ChunkDocumentOptions {
  maxChunks?: number
  signal?: AbortSignal
}

export function chunkDocument(
  document: ParsedDocument,
  chunkSize: number,
  chunkOverlap: number,
  options: ChunkDocumentOptions = {},
): TextChunk[] {
  throwIfAborted(options.signal)
  if (!document.text) {
    return []
  }

  const chunks: TextChunk[] = []
  const firstChunkByRegion = new Map<number, TextChunk>()
  const lineStarts = lineStartOffsets(document.text, options.signal)
  const locationRegions = sortedCharacterIntervals(document.regions ?? [])
  const pages = sortedCharacterIntervals(document.pages ?? [])
  const sourceRegions = locationRegions.map((region) => ({
    charStart: region.charStart,
    charEnd: region.charEnd,
    contextPath: region.contextPath,
    headerRegionIndex: region.headerRegionIndex,
  }))
  const structured =
    sourceRegions.length > 0
      ? sourceRegions
      : structuralSpans(document.text, document.file.extension, chunkSize)
  const regions =
    structured.length > 0
      ? packRegions(document.text, structured, locationRegions, chunkSize)
      : [
          {
            charStart: 0,
            charEnd: document.text.length,
            contextPath: "",
            kind: "markdown-section" as const,
          },
        ]
  const fences = MARKDOWN_EXTENSIONS.has(document.file.extension)
    ? markdownFenceSpans(document.text)
    : []
  const fenceStarts = new Set(fences.map((fence) => fence.start))
  let chunkIndex = 0

  for (const region of regions) {
    throwIfAborted(options.signal)
    const headerRegion =
      "headerRegionIndex" in region && typeof region.headerRegionIndex === "number"
        ? document.regions?.[region.headerRegionIndex]
        : undefined
    const headerChunk = headerRegion ? firstChunkByRegion.get(headerRegion.charStart) : undefined
    const completeHeader =
      headerRegion && headerChunk && headerChunk.charEnd >= headerRegion.charEnd
        ? headerChunk
        : undefined
    let cursor = region.charStart
    while (cursor < region.charEnd) {
      throwIfAborted(options.signal)
      const end = chooseChunkEnd(document.text, cursor, chunkSize, region.charEnd, fences)
      const span = trimmedSpan(document.text, cursor, end)

      if (span.text) {
        if (options.maxChunks !== undefined && chunks.length >= options.maxChunks) {
          throw new Error(
            `Chunk limit of ${options.maxChunks} exceeded for ${document.file.relativePath}. Increase chunkSize or split the source file.`,
          )
        }
        const id = createHash("sha256")
          .update(`${document.file.relativePath}:${chunkIndex}:${region.contextPath}:${span.text}`)
          .digest("hex")
        const lineCoordinates =
          document.sourceLineCoordinates === false
            ? {}
            : {
                lineStart: lineNumberForOffset(lineStarts, span.start),
                lineEnd: lineNumberForOffset(lineStarts, Math.max(span.start, span.end - 1)),
              }
        chunks.push({
          id,
          source: document.file.source,
          relativePath: document.file.relativePath,
          chunkIndex,
          contextPath: region.contextPath,
          ...(completeHeader
            ? { headerChunkIndex: completeHeader.chunkIndex, headerText: completeHeader.text }
            : {}),
          text: span.text,
          charStart: span.start,
          charEnd: span.end,
          ...lineCoordinates,
          ...pageRangeForSpan(pages, span.start, span.end),
          ...sourceLocationForSpan(locationRegions, span.start, span.end),
          checksum: document.file.checksum,
          bytes: document.file.bytes,
          mtimeMs: document.file.mtimeMs,
        })
        const chunk = chunks.at(-1)
        if (chunk && !firstChunkByRegion.has(region.charStart)) {
          firstChunkByRegion.set(region.charStart, chunk)
        }
        chunkIndex += 1
      }

      if (end >= region.charEnd) {
        break
      }
      const next = fenceStarts.has(end)
        ? end
        : Math.max(end - chunkOverlap, cursor + 1, region.charStart)
      cursor = splitsSurrogatePair(document.text, next) ? next + 1 : next
    }
  }

  return chunks
}

/**
 * The citable location of a span, across every region it covers. A packed chunk spans several
 * regions, so its citation has to carry the whole range - slides 4 to 7, not slide 4 - the way page
 * ranges already do.
 */
function sourceLocationForSpan(
  regions: readonly ParsedRegion[],
  start: number,
  end: number,
): Pick<
  TextChunk,
  "locationKind" | "locationStart" | "locationEnd" | "locationLabel" | "cellStart" | "cellEnd"
> {
  const firstIndex = firstIntervalEndingAfter(regions, start)
  const first = regions[firstIndex]
  if (!first || first.charStart >= end) {
    return {}
  }
  let last = first
  for (let index = firstIndex + 1; index < regions.length; index += 1) {
    const region = regions[index]
    if (!region || region.charStart >= end) {
      break
    }
    if (region.location.kind === first.location.kind) {
      last = region
    }
  }
  const cellEnd = last.location.cellEnd ?? last.location.cellStart
  return {
    locationKind: first.location.kind,
    locationStart: first.location.start,
    locationEnd: Math.max(first.location.end, last.location.end),
    ...(first.location.label ? { locationLabel: first.location.label } : {}),
    ...(first.location.cellStart ? { cellStart: first.location.cellStart } : {}),
    ...(cellEnd ? { cellEnd } : {}),
  }
}

export function chunkSearchText(
  chunk: Pick<TextChunk, "contextPath" | "text" | "headerText">,
): string {
  return [chunk.contextPath, chunk.headerText, chunk.text].filter(Boolean).join("\n")
}

/**
 * Text indexed for keyword retrieval: the embedded text plus source path terms and identifier
 * parts, so a question about "login attempts" can reach `LoginAttemptService.java`. It is folded
 * like query terms before the full-text analyzer stems it, because the analyzer stems before it
 * folds accents: an unfolded "Réfraction" would never match the query term "refraction".
 * Embeddings keep using {@link chunkSearchText}.
 */
export function chunkLexicalText(
  chunk: Pick<TextChunk, "contextPath" | "text" | "headerText" | "relativePath">,
): string {
  return normalizeForMatch(
    [
      chunkSearchText(chunk),
      [chunk.relativePath, ...identifierParts(chunk.relativePath)].join(" "),
      identifierParts(chunk.text).join(" "),
    ]
      .filter(Boolean)
      .join("\n"),
  )
}

function pageRangeForSpan(
  pages: readonly ParsedPage[],
  start: number,
  end: number,
): { pageStart?: number; pageEnd?: number } {
  if (pages.length === 0) {
    return {}
  }
  const firstIndex = firstIntervalEndingAfter(pages, start)
  const first = pages[firstIndex]
  if (!first || first.charStart >= end) {
    return {}
  }
  let last = first
  for (let index = firstIndex + 1; index < pages.length; index += 1) {
    const page = pages[index]
    if (!page || page.charStart >= end) {
      break
    }
    last = page
  }
  return { pageStart: first.pageNumber, pageEnd: last.pageNumber }
}

function chooseChunkEnd(
  text: string,
  cursor: number,
  chunkSize: number,
  regionEnd: number,
  fences: Array<{ start: number; end: number }>,
): number {
  const hardEnd = Math.min(cursor + chunkSize, regionEnd)
  if (hardEnd === regionEnd) {
    return hardEnd
  }

  const intersectedFence = fenceAtOffset(fences, hardEnd)
  if (
    intersectedFence &&
    intersectedFence.end <= regionEnd &&
    intersectedFence.end - intersectedFence.start <= chunkSize
  ) {
    return intersectedFence.start > cursor ? intersectedFence.start : intersectedFence.end
  }

  const window = text.slice(cursor, hardEnd)
  const paragraphBreak = window.lastIndexOf("\n\n")
  if (paragraphBreak > chunkSize * PARAGRAPH_BREAK_MIN_RATIO) {
    return cursor + paragraphBreak
  }

  const sentenceBreakEnd = lastSentenceBreakEnd(window)
  if (sentenceBreakEnd > chunkSize * SENTENCE_BREAK_MIN_RATIO) {
    return cursor + sentenceBreakEnd
  }

  const lineBreak = window.lastIndexOf("\n")
  if (lineBreak > chunkSize * LINE_BREAK_MIN_RATIO) {
    return cursor + lineBreak
  }

  const whitespace = window.lastIndexOf(" ")
  if (whitespace > chunkSize * WHITESPACE_BREAK_MIN_RATIO) {
    return cursor + whitespace
  }

  return splitsSurrogatePair(text, hardEnd) ? hardEnd - 1 : hardEnd
}

/**
 * Whether an offset falls between the two halves of a surrogate pair, such as an emoji: a chunk
 * cut there holds a lone half, which embedding endpoints reject as invalid text.
 */
function splitsSurrogatePair(text: string, offset: number): boolean {
  const before = text.charCodeAt(offset - 1)
  const after = text.charCodeAt(offset)
  return before >= 0xd800 && before <= 0xdbff && after >= 0xdc00 && after <= 0xdfff
}

function lastSentenceBreakEnd(text: string): number {
  let end = -1
  for (const boundary of SENTENCE_BOUNDARIES) {
    const index = text.lastIndexOf(boundary)
    if (index >= 0) {
      end = Math.max(end, index + (boundary.endsWith(" ") ? boundary.length - 1 : boundary.length))
    }
  }
  return end
}

interface TextSpan {
  start: number
  end: number
  text: string
}

function trimmedSpan(text: string, start: number, end: number): TextSpan {
  let trimmedStart = start
  let trimmedEnd = end
  while (trimmedStart < trimmedEnd && /\s/u.test(text[trimmedStart] ?? "")) {
    trimmedStart += 1
  }
  while (trimmedEnd > trimmedStart && /\s/u.test(text[trimmedEnd - 1] ?? "")) {
    trimmedEnd -= 1
  }
  return {
    start: trimmedStart,
    end: trimmedEnd,
    text: text.slice(trimmedStart, trimmedEnd),
  }
}

/** Offsets where each line of a text starts. */
export function lineStartOffsets(text: string, signal: AbortSignal | undefined): number[] {
  const starts = [0]
  for (let index = 0; index < text.length; index += 1) {
    if (signal && index % 16_384 === 0) {
      throwIfAborted(signal)
    }
    if (text[index] === "\n" && index + 1 < text.length) {
      starts.push(index + 1)
    }
  }
  return starts
}

interface CharacterInterval {
  charStart: number
  charEnd: number
}

function sortedCharacterIntervals<T extends CharacterInterval>(intervals: readonly T[]): T[] {
  return [...intervals].sort(
    (left, right) => left.charEnd - right.charEnd || left.charStart - right.charStart,
  )
}

/** Most regions a single chunk may cover, so packing stays bounded on heavily split documents. */
const MAX_PACKED_REGIONS = 64

/** Longest run of separator characters between two regions that still counts as contiguous text. */
const MAX_REGION_GAP = 8

interface ChunkRegion {
  charStart: number
  charEnd: number
  contextPath: string
  headerRegionIndex?: number | undefined
}

/**
 * Whether two adjacent regions can share a chunk without losing anything the region expressed.
 *
 * Only pagination qualifies. A PDF page region repeats the page interval the document already
 * reports separately, and its context path is just "Page 7", so a merged chunk still cites the
 * exact page range and gives up no structure. Every other region means something a chunk cannot
 * carry for two of them at once: a slide or Markdown section names the passage and answers context
 * filters, a spreadsheet region binds rows to their own table header and cell range.
 */
function regionsAreCitableTogether(
  left: ParsedRegion | undefined,
  right: ParsedRegion | undefined,
): boolean {
  return left?.location.kind === "page" && right?.location.kind === "page"
}

/** The deepest context path both breadcrumbs share, such as "Guide" for "Guide > A" and "Guide > B". */
function sharedContextPath(left: string, right: string): string {
  if (left === right) {
    return left
  }
  const leftParts = left.split(" > ")
  const rightParts = right.split(" > ")
  const shared: string[] = []
  for (let index = 0; index < Math.min(leftParts.length, rightParts.length); index += 1) {
    if (leftParts[index] !== rightParts[index]) {
      break
    }
    shared.push(leftParts[index] as string)
  }
  return shared.join(" > ")
}

/**
 * Group consecutive regions into chunk-sized units.
 *
 * A region is the finest citable unit a parser reports: a PDF page, a slide, a spreadsheet row
 * group, a Markdown section. Chunking each one on its own caps a chunk at its region, so documents
 * split into short regions produced passages far below `chunkSize` - an agenda PDF or a slide deck
 * became dozens of one-line passages. Each held too little text to embed meaningfully, inflated the
 * index, and spent the per-document result cap on fragments of one page.
 *
 * Packing merges adjacent regions up to `chunkSize` while their merged citation stays exact, so a
 * passage carries the context a reader needs and one vector covers chunk-sized text. Regions
 * already at or above `chunkSize` are untouched and still split inside themselves.
 */
function packRegions(
  text: string,
  regions: readonly ChunkRegion[],
  locationRegions: readonly ParsedRegion[],
  chunkSize: number,
): ChunkRegion[] {
  if (regions.length < 2) {
    return [...regions]
  }
  // Indexed by interval: a spreadsheet reports thousands of regions, where a scan per region would
  // cost O(regions squared) before the first one is even ruled out.
  const locationsByInterval = new Map<string, ParsedRegion>()
  for (const candidate of locationRegions) {
    locationsByInterval.set(`${candidate.charStart}:${candidate.charEnd}`, candidate)
  }
  const locationOf = (region: ChunkRegion): ParsedRegion | undefined =>
    locationsByInterval.get(`${region.charStart}:${region.charEnd}`)
  const packed: ChunkRegion[] = []
  let current: ChunkRegion | null = null
  let currentLocation: ParsedRegion | undefined
  let merged = 0

  for (const region of regions) {
    const location = locationOf(region)
    const gap = current === null ? 0 : region.charStart - current.charEnd
    const fits =
      current !== null &&
      region.charEnd - current.charStart <= chunkSize &&
      gap >= 0 &&
      gap <= MAX_REGION_GAP &&
      text.slice(current.charEnd, region.charStart).trim() === "" &&
      merged < MAX_PACKED_REGIONS &&
      regionsAreCitableTogether(currentLocation, location)
    if (current !== null && fits) {
      current = {
        charStart: current.charStart,
        charEnd: region.charEnd,
        contextPath: sharedContextPath(current.contextPath, region.contextPath),
        ...(current.headerRegionIndex === undefined
          ? {}
          : { headerRegionIndex: current.headerRegionIndex }),
      }
      merged += 1
      continue
    }
    if (current !== null) {
      packed.push(current)
    }
    current = { ...region }
    currentLocation = location
    merged = 1
  }
  if (current !== null) {
    packed.push(current)
  }
  return packed
}

function firstIntervalEndingAfter<T extends CharacterInterval>(
  intervals: readonly T[],
  offset: number,
): number {
  let low = 0
  let high = intervals.length
  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    const interval = intervals[mid]
    if (interval && interval.charEnd <= offset) {
      low = mid + 1
    } else {
      high = mid
    }
  }
  return low
}

function fenceAtOffset(
  fences: ReadonlyArray<{ start: number; end: number }>,
  offset: number,
): { start: number; end: number } | undefined {
  let low = 0
  let high = fences.length
  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    const fence = fences[mid]
    if (fence && fence.end <= offset) {
      low = mid + 1
    } else {
      high = mid
    }
  }
  const fence = fences[low]
  return fence && fence.start < offset && fence.end > offset ? fence : undefined
}

/** The line, from 1, that holds a character offset. */
export function lineNumberForOffset(lineStarts: number[], offset: number): number {
  let low = 0
  let high = lineStarts.length - 1
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const lineStart = lineStarts[mid] ?? 0
    if (lineStart <= offset) {
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  return Math.max(1, high + 1)
}
