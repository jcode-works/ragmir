// First-pass retrieval for a coding agent on the public Ragmir repository. A ripgrep baseline greps
// the question's words and ranks files by how many of them they hold, the way an agent greps before
// it opens files; Ragmir answers through its MCP server, with local-hash and with a local embedding
// model. For the 89 developer questions it records whether an answering file ranks in the top 3
// and top 10, and how many bytes the agent reads before it reaches one: grep listings plus whole
// files in rank order for the baseline, search and expansion replies for Ragmir. It also counts the
// off-topic and near-domain questions each side refuses. Writes benchmarks/.results/first-pass.json
// (or --result) and prints a Markdown table.
import { execFileSync, spawnSync } from "node:child_process"
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { DEFAULT_CONFIG } from "../dist/defaults.js"
import { createRagmirClient, initProject } from "../dist/index.js"
import { environmentMetadata } from "./lib/metrics.mjs"
import {
  rankingMetrics,
  REPOSITORY_SOURCES,
  repositoryFiles,
  repositoryQuestions,
} from "./lib/repository-corpus.mjs"

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const repositoryRoot = path.resolve(packageRoot, "../..")
const cliEntry = path.join(packageRoot, "dist/cli-entry.js")
const options = parseOptions(process.argv.slice(2))
const model = options.model ?? "mixedbread-ai/mxbai-embed-xsmall-v1"
const revision = options.revision ?? "e6ac24e5d6efb8782b59de1647b3ececb4ece94e"
const modelPath = path.resolve(options.modelPath ?? path.join(repositoryRoot, ".ragmir/models"))
const resultPath = path.resolve(
  options.result ?? path.join(packageRoot, "benchmarks/.results/first-pass.json"),
)
const TOP_K = 10
// Words that most questions share with most files; an agent leaves them out of its greps.
const STOP_WORDS = new Set(
  (
    "a about after all an and any are as at be before but by can could do does for from has have " +
    "how i if in into is it its may more must my no not of on or our should so than that the their " +
    "them then there these they this to under up was we what when where which while who why will " +
    "with without would you your"
  ).split(" "),
)

const ripgrep = spawnSync("rg", ["--version"], { encoding: "utf8" })
if (ripgrep.error) throw new Error("Install ripgrep (rg) to run the grep baseline.")
const questions = await repositoryQuestions(packageRoot)
const files = repositoryFiles(repositoryRoot)
const commit = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: repositoryRoot,
  encoding: "utf8",
}).trim()

const workspace = await mkdtemp(path.join(os.tmpdir(), "ragmir-first-pass-"))
const sizes = new Map()
const systems = []
try {
  for (const file of files) {
    const target = path.join(workspace, file)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, await readFile(path.join(repositoryRoot, file)))
    sizes.set(file, (await stat(target)).size)
  }
  await initProject(workspace)

  systems.push(await measureGrep())
  const configs = [
    ["Ragmir MCP (local-hash, no model)", { ...DEFAULT_CONFIG, sources: REPOSITORY_SOURCES }],
    [
      `Ragmir MCP (hybrid, ${model.split("/").pop()})`,
      {
        ...DEFAULT_CONFIG,
        sources: REPOSITORY_SOURCES,
        embeddingProvider: "transformers",
        embeddingModel: model,
        embeddingModelRevision: revision,
        embeddingModelPath: modelPath,
      },
    ],
  ]
  for (const [name, config] of configs) {
    await writeFile(path.join(workspace, ".ragmir/config.json"), JSON.stringify(config))
    systems.push(await measureRagmir(name))
  }

  const report = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    commit,
    environment: environmentMetadata(),
    ripgrep: ripgrep.stdout.split("\n")[0],
    corpus: { trackedFiles: files.length, bytes: [...sizes.values()].reduce((a, b) => a + b, 0) },
    model: { name: model, revision },
    questions: {
      answerable: questions.answerable.length,
      unrelated: questions.unrelated.length,
      nearDomain: questions.nearDomain.length,
    },
    systems,
  }
  await mkdir(path.dirname(resultPath), { recursive: true })
  await writeFile(resultPath, `${JSON.stringify(report, null, 2)}\n`)
  console.log(markdownTable(report))
  console.log(`\nWrote ${path.relative(process.cwd(), resultPath)}`)
} finally {
  await rm(workspace, { recursive: true, force: true })
}

/** The words of a question an agent would grep for: three characters or more, no stop word. */
function questionTerms(query) {
  const words = query.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}_./-]*[\p{L}\p{N}]/gu) ?? []
  return [...new Set(words.filter((word) => word.length >= 3 && !STOP_WORDS.has(word)))]
}

/** One case-insensitive fixed-string grep per question word; files rank by words held, then hits. */
function grepRanking(query) {
  const scores = new Map()
  let outputBytes = 0
  for (const term of questionTerms(query)) {
    const result = spawnSync(
      "rg",
      ["--count-matches", "--ignore-case", "--fixed-strings", "--no-messages", "--glob", "!.ragmir"]
        .concat(["--", term, "."]),
      { cwd: workspace, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    )
    outputBytes += Buffer.byteLength(result.stdout)
    for (const line of result.stdout.split("\n")) {
      const match = line.match(/^(.+):(\d+)$/u)
      if (!match) continue
      const file = match[1].replace(/^\.\//u, "")
      const score = scores.get(file) ?? { terms: 0, hits: 0 }
      score.terms += 1
      score.hits += Number(match[2])
      scores.set(file, score)
    }
  }
  const ranked = [...scores]
    .sort(([leftPath, left], [rightPath, right]) => {
      return right.terms - left.terms || right.hits - left.hits || leftPath.localeCompare(rightPath)
    })
    .map(([file]) => file)
  return { ranked, outputBytes }
}

async function measureGrep() {
  const ranking = []
  const reachedBytes = []
  const missedBytes = []
  for (const entry of questions.answerable) {
    const { ranked, outputBytes } = grepRanking(entry.query)
    ranking.push(rankingMetrics(ranked, entry.expectedPaths, TOP_K))
    // The agent opens the ranked files whole, in order, until one answers the question.
    let bytes = outputBytes
    let reached = false
    for (const file of ranked.slice(0, TOP_K)) {
      bytes += sizes.get(file) ?? 0
      if (entry.expectedPaths.includes(file)) {
        reached = true
        break
      }
    }
    ;(reached ? reachedBytes : missedBytes).push(bytes)
  }
  const refused = (list) => list.filter((query) => grepRanking(query).ranked.length === 0).length
  return summary("ripgrep, question words, files read whole", ranking, reachedBytes, missedBytes, {
    unrelatedRefused: refused(questions.unrelated),
    nearDomainRefused: refused(questions.nearDomain),
  })
}

async function measureRagmir(name) {
  const library = await createRagmirClient({ cwd: workspace })
  const ranking = []
  let unrelatedRefused = 0
  let nearDomainRefused = 0
  try {
    const ingest = await library.ingest({ rebuild: true })
    if (ingest.errors.length > 0) throw new Error(JSON.stringify(ingest.errors))
    for (const entry of questions.answerable) {
      const paths = (await library.search(entry.query, { topK: TOP_K })).map((r) => r.relativePath)
      ranking.push(rankingMetrics(paths, entry.expectedPaths, TOP_K))
    }
    for (const query of questions.unrelated) {
      if ((await library.search(query, { topK: TOP_K })).length === 0) unrelatedRefused += 1
    }
    for (const query of questions.nearDomain) {
      if ((await library.search(query, { topK: TOP_K })).length === 0) nearDomainRefused += 1
    }
  } finally {
    await library.close()
  }

  // Bytes come from real MCP sessions, one per question: the default search, a second search with
  // ten results when the first holds no answering file, then one expansion of the answering
  // citation. Bytes count the text the agent's model reads, as for the grep baseline.
  const reachedBytes = []
  const missedBytes = []
  for (const entry of questions.answerable) {
    const client = new Client({ name: "ragmir-first-pass", version: "1.0.0" })
    await client.connect(
      new StdioClientTransport({
        command: process.execPath,
        args: [cliEntry, "serve-mcp"],
        cwd: workspace,
        stderr: "ignore",
      }),
    )
    try {
      let bytes = 0
      let answering
      for (const topK of [undefined, TOP_K]) {
        const reply = await client.callTool({
          name: "ragmir_search",
          arguments: topK ? { query: entry.query, topK } : { query: entry.query },
        })
        bytes += replyBytes(reply)
        answering = replyResults(reply).find((result) =>
          entry.expectedPaths.includes(result.relativePath),
        )
        if (answering) break
      }
      if (answering) {
        const reply = await client.callTool({
          name: "ragmir_expand",
          arguments: { citation: answering.citation },
        })
        bytes += replyBytes(reply)
      }
      ;(answering ? reachedBytes : missedBytes).push(bytes)
    } finally {
      await client.close()
    }
  }
  return summary(name, ranking, reachedBytes, missedBytes, { unrelatedRefused, nearDomainRefused })
}

function replyBytes(reply) {
  return Buffer.byteLength(reply.content.map((part) => part.text ?? "").join("\n"))
}

function replyResults(reply) {
  try {
    const parsed = JSON.parse(reply.content[0]?.text ?? "[]")
    return (Array.isArray(parsed) ? parsed : (parsed.results ?? [])).filter(
      (result) => typeof result?.relativePath === "string",
    )
  } catch {
    return []
  }
}

function summary(name, ranking, reachedBytes, missedBytes, refusals) {
  const share = (key) => ranking.filter((entry) => entry[key]).length / ranking.length
  return {
    name,
    hitAt3: round(share("hit3")),
    hitAt10: round(share("hit10")),
    mrrAt10: round(ranking.reduce((sum, entry) => sum + entry.rr, 0) / ranking.length),
    answerReached: reachedBytes.length,
    medianBytesToAnswer: median(reachedBytes),
    medianBytesWhenMissed: median(missedBytes),
    ...refusals,
  }
}

function median(values) {
  if (values.length === 0) return null
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.floor(sorted.length / 2)]
}

function markdownTable(report) {
  const percent = (value) => `${Math.round(value * 100)}%`
  const kib = (value) => (value === null ? "n/a" : `${(value / 1024).toFixed(1)} KiB`)
  const { answerable, unrelated, nearDomain } = report.questions
  const rows = report.systems.map(
    (system) =>
      `| ${system.name} | ${percent(system.hitAt3)} | ${percent(system.hitAt10)} | ${system.answerReached}/${answerable} | ${kib(system.medianBytesToAnswer)} | ${system.unrelatedRefused}/${unrelated} | ${system.nearDomainRefused}/${nearDomain} |`,
  )
  return [
    `${answerable} developer questions over ${report.corpus.trackedFiles} tracked files at ${report.commit.slice(0, 7)}`,
    "",
    "| First pass | Answer in top 3 | Answer in top 10 | Answer reached | Median bytes read to reach it | Off-topic refused | Near-domain refused |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...rows,
  ].join("\n")
}

function round(value, digits = 3) {
  return Number(value.toFixed(digits))
}

function parseOptions(argumentsList) {
  // pnpm may forward its `--` separator: skip it.
  const values = argumentsList.filter((argument) => argument !== "--")
  const parsed = {}
  for (let index = 0; index < values.length; index += 2) {
    const current = values[index]
    if (!current?.startsWith("--") || values[index + 1] === undefined) {
      throw new Error(`Expected --name value pairs, got ${current}`)
    }
    parsed[current.slice(2).replace(/-([a-z])/gu, (_, letter) => letter.toUpperCase())] =
      values[index + 1]
  }
  return parsed
}
