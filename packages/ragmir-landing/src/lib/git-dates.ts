import { execFileSync } from "node:child_process"

/**
 * When a file was first committed and last changed, from Git at build time, so a page's dates
 * follow real content changes instead of the build time. Null without Git history for the file.
 */
export function gitDates(absolutePath: string): { published: Date; modified: Date } | null {
  try {
    const dates = execFileSync("git", ["log", "--follow", "--format=%cI", "--", absolutePath], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split("\n")
      .filter(Boolean)
    const first = dates.at(-1)
    const last = dates[0]
    return first && last ? { published: new Date(first), modified: new Date(last) } : null
  } catch {
    return null
  }
}
