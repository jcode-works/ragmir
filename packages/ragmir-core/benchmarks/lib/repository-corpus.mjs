// The public Ragmir repository as a retrieval corpus: the tracked documentation and source a
// developer agent asks about, the questions of fixtures/repository-questions.json, and the
// file-level ranking metrics that bench:competitors and bench:first-pass share.
import { execFileSync } from "node:child_process"
import { readFile } from "node:fs/promises"
import path from "node:path"
import picomatch from "picomatch"

export const REPOSITORY_SOURCES = [
  "README.md",
  "AGENTS.md",
  "CLAUDE.md",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "RELEASING.md",
  "SECURITY.md",
  "SECURITY-HARDENING.md",
  "llms.txt",
  "package.json",
  "docs/**/*.md",
  "packages/*/README.md",
  "packages/*/package.json",
  "packages/ragmir-core/src/**/*.ts",
  "packages/ragmir-core/skills/**/*.md",
  "packages/ragmir-core/benchmarks/README.md",
  "packages/ragmir-landing/src/**/*.{astro,ts,tsx}",
  "packages/ragmir-landing/messages/*.json",
  "scripts/*.mjs",
]

/** The tracked files of the repository that the sources select, sorted. */
export function repositoryFiles(repositoryRoot) {
  const isSource = picomatch(REPOSITORY_SOURCES, { dot: true })
  return execFileSync("git", ["ls-files", "-z"], { cwd: repositoryRoot, encoding: "utf8" })
    .split("\0")
    .filter((file) => file && isSource(file))
    .sort()
}

export async function repositoryQuestions(packageRoot) {
  return JSON.parse(
    await readFile(path.join(packageRoot, "benchmarks/fixtures/repository-questions.json"), "utf8"),
  )
}

/** File-level metrics: a passage counts when its file answers the question; repeats count once. */
export function rankingMetrics(paths, expectedPaths, topK = 10) {
  const expected = new Set(expectedPaths)
  const seen = new Set()
  let dcg = 0
  let reciprocalRank = 0
  for (const [index, file] of paths.slice(0, topK).entries()) {
    if (!expected.has(file) || seen.has(file)) continue
    seen.add(file)
    dcg += 1 / Math.log2(index + 2)
    if (reciprocalRank === 0) reciprocalRank = 1 / (index + 1)
  }
  let ideal = 0
  for (let index = 0; index < Math.min(expected.size, topK); index += 1) {
    ideal += 1 / Math.log2(index + 2)
  }
  const hit = (k) => paths.slice(0, k).some((file) => expected.has(file))
  return { hit1: hit(1), hit3: hit(3), hit10: hit(topK), rr: reciprocalRank, ndcg: dcg / ideal }
}
