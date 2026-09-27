import { describe, expect, it } from "vitest";
import { diffKind } from "./diffKind";
import { fileDiff } from "./testFixtures";

describe("diffKind", () => {
  it("detects added files (no old path)", () => {
    expect(diffKind(fileDiff({ oldPath: null, newPath: "new.txt" }))).toBe("added");
  });

  it("detects deleted files (no new path)", () => {
    expect(diffKind(fileDiff({ oldPath: "old.txt", newPath: null }))).toBe("deleted");
  });

  it("detects modified when both paths present", () => {
    expect(diffKind(fileDiff({ oldPath: "f.txt", newPath: "f.txt" }))).toBe("modified");
  });

  it("treats rename as modified (paths differ)", () => {
    expect(diffKind(fileDiff({ oldPath: "a.ts", newPath: "b.ts" }))).toBe("modified");
  });
});
