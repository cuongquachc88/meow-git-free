import { describe, expect, it, vi } from "vitest";
import { openFileInCenter } from "./openFileInCenter";
import { fileDiff } from "./testFixtures";

describe("openFileInCenter", () => {
  it("selects diff and opens center viewer", () => {
    const setSelectedDiff = vi.fn();
    const openCenter = vi.fn();
    const d = fileDiff({ newPath: "a.ts" });
    openFileInCenter(d, setSelectedDiff, openCenter, "diff");
    expect(setSelectedDiff).toHaveBeenCalledWith(d);
    expect(openCenter).toHaveBeenCalledWith("diff");
  });
});
