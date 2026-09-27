import { describe, expect, it } from "vitest";
import { openBranchName } from "./headBranch";
import { branch } from "./testFixtures";

describe("openBranchName", () => {
  it("returns checked-out local branch", () => {
    const name = openBranchName([
      branch({ name: "main", isHead: true, kind: "Local" }),
      branch({ name: "origin/main", isHead: false, kind: "Remote" }),
    ]);
    expect(name).toBe("main");
  });

  it("prefers local HEAD over remote HEAD", () => {
    const name = openBranchName([
      branch({ name: "origin/feature", isHead: true, kind: "Remote" }),
      branch({ name: "feature", isHead: true, kind: "Local" }),
    ]);
    expect(name).toBe("feature");
  });

  it("falls back to any HEAD when no local HEAD", () => {
    const name = openBranchName([
      branch({ name: "origin/main", isHead: true, kind: "Remote" }),
    ]);
    expect(name).toBe("origin/main");
  });

  it("returns null when nothing is checked out", () => {
    expect(openBranchName([branch({ name: "main" })])).toBeNull();
    expect(openBranchName([])).toBeNull();
  });
});
