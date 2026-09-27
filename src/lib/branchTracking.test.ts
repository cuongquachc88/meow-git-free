import { describe, expect, it } from "vitest";
import { describeBranchTracking } from "./branchTracking";
import { branch } from "./testFixtures";

describe("describeBranchTracking", () => {
  it("summarizes ahead and behind", () => {
    const d = describeBranchTracking(
      branch({ isHead: true, ahead: 2, behind: 1, upstream: "origin/main" }),
    );
    expect(d?.summary).toBe("↑2 ahead, ↓1 behind of origin/main");
  });

  it("reports in sync", () => {
    const d = describeBranchTracking(
      branch({ isHead: true, ahead: 0, behind: 0, upstream: "origin/main" }),
    );
    expect(d?.inSync).toBe(true);
    expect(d?.summary).toBe("In sync with origin/main");
  });
});
