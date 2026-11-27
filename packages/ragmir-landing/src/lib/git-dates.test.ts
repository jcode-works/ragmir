import { mkdtempSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { gitDates } from "./git-dates"

describe("git dates", () => {
  it("should date a tracked file from its first and last commits", () => {
    const dates = gitDates(fileURLToPath(new URL("../../../../README.md", import.meta.url)))
    expect(dates).not.toBeNull()
    expect(Number.isNaN(dates?.published.getTime())).toBe(false)
    expect(dates?.published.getTime()).toBeLessThanOrEqual(dates?.modified.getTime() ?? 0)
  })

  it("should return null for a file Git does not know", () => {
    const outside = path.join(mkdtempSync(path.join(os.tmpdir(), "ragmir-git-dates-")), "page.md")
    writeFileSync(outside, "# Untracked\n")
    expect(gitDates(outside)).toBeNull()
  })
})
