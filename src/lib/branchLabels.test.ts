import { describe, expect, it } from "vitest";
import { dedupeBranchLabels, formatBranchLabel } from "./branchLabels";

describe("formatBranchLabel", () => {
  it("returns local branch name unchanged", () => {
    expect(formatBranchLabel("main", false)).toBe("main");
    expect(formatBranchLabel("feature/foo", false)).toBe("feature/foo");
  });

  it("strips first remote segment only", () => {
    expect(formatBranchLabel("origin/main", true)).toBe("main");
    expect(formatBranchLabel("upstream/feature/x", true)).toBe("feature/x");
  });

  it("leaves remote name without slash unchanged", () => {
    expect(formatBranchLabel("origin", true)).toBe("origin");
  });
});

describe("dedupeBranchLabels", () => {
  it("removes HEAD local label from graph chips", () => {
    const out = dedupeBranchLabels([
      { name: "main", isHead: true, isRemote: false },
      { name: "feature", isHead: false, isRemote: false },
    ]);
    expect(out.map((l) => l.name)).toEqual(["feature"]);
  });

  it("keeps HEAD remote label", () => {
    const out = dedupeBranchLabels([
      { name: "origin/main", isHead: true, isRemote: true },
    ]);
    expect(out).toHaveLength(1);
  });

  it("drops remote when local with same short name exists", () => {
    const out = dedupeBranchLabels([
      { name: "main", isHead: false, isRemote: false },
      { name: "origin/main", isHead: false, isRemote: true },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe("main");
  });

  it("dedupes remotes that format to the same short name", () => {
    const out = dedupeBranchLabels([
      { name: "origin/foo", isHead: false, isRemote: true },
      { name: "upstream/foo", isHead: false, isRemote: true },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe("origin/foo");
  });

  it("preserves distinct local and unmatched remote branches", () => {
    const out = dedupeBranchLabels([
      { name: "main", isHead: false, isRemote: false },
      { name: "origin/release", isHead: false, isRemote: true },
    ]);
    expect(out.map((l) => l.name).sort()).toEqual(["main", "origin/release"]);
  });
});
