import { describe, expect, it } from "vitest";
import { fileDiff } from "./testFixtures";
import { mergeWorkingDiffs } from "./mergeWorkingDiffs";

describe("mergeWorkingDiffs", () => {
  it("merges staged and unstaged by path", () => {
    const staged = [fileDiff({ newPath: "a.ts" })];
    const unstaged = [fileDiff({ newPath: "b.ts" })];
    const merged = mergeWorkingDiffs(staged, unstaged);
    expect(merged.map((d) => d.newPath).sort()).toEqual(["a.ts", "b.ts"]);
  });

  it("prefers unstaged when same path", () => {
    const staged = [fileDiff({ newPath: "x.ts", hunks: [{ header: "s", lines: [] }] })];
    const unstaged = [fileDiff({ newPath: "x.ts", hunks: [{ header: "u", lines: [] }] })];
    const merged = mergeWorkingDiffs(staged, unstaged);
    expect(merged).toHaveLength(1);
    expect(merged[0].hunks[0]?.header).toBe("u");
  });
});
