import { describe, expect, it } from "vitest";
import {
  buildGraph,
  graphWidth,
  GRAPH_MAX_W,
  laneScale,
  paintGraphCanvas,
} from "./commitGraphLayout";
import { commit } from "./testFixtures";

function mockCtx(): CanvasRenderingContext2D {
  const gradient = { addColorStop: () => undefined };
  return {
    clearRect: () => undefined,
    beginPath: () => undefined,
    moveTo: () => undefined,
    lineTo: () => undefined,
    bezierCurveTo: () => undefined,
    stroke: () => undefined,
    arc: () => undefined,
    fill: () => undefined,
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
  } as unknown as CanvasRenderingContext2D;
}

describe("buildGraph", () => {
  it("keeps linear history on one lane", () => {
    const rows = buildGraph([commit("c2", ["c1"]), commit("c1")]);
    expect(rows).toHaveLength(2);
    expect(rows[0].lane).toBe(0);
    expect(rows[1].lane).toBe(0);
  });

  it("links first parent to same lane as child", () => {
    const rows = buildGraph([commit("child", ["parent"]), commit("parent")]);
    const child = rows.find((r) => r.commit.id === "child")!;
    expect(child.parentLanes[0].lane).toBe(child.lane);
    expect(child.parentLanes[0].parentId).toBe("parent");
  });

  it("assigns second parent to a new lane on merge", () => {
    const rows = buildGraph([
      commit("merge", ["p1", "p2"]),
      commit("p1"),
      commit("p2"),
    ]);
    const merge = rows.find((r) => r.commit.id === "merge")!;
    expect(merge.parentLanes).toHaveLength(2);
    expect(merge.parentLanes[0].lane).toBe(merge.lane);
    expect(merge.parentLanes[1].lane).not.toBe(merge.lane);
  });

  it("handles three-way merge history", () => {
    const rows = buildGraph([
      commit("m", ["a", "b"]),
      commit("a", ["base"]),
      commit("b", ["base"]),
      commit("base"),
    ]);
    const m = rows.find((r) => r.commit.id === "m")!;
    expect(m.parentLanes.map((p) => p.parentId).sort()).toEqual(["a", "b"]);
  });
});

describe("graphWidth", () => {
  it("returns minimum width for empty graph", () => {
    expect(graphWidth([])).toBeGreaterThan(0);
  });

  it("caps width for wide branch graphs", () => {
    const tips = Array.from({ length: 10 }, (_, i) => `t${i}`);
    const merge = commit("merge", tips);
    const rows = buildGraph([merge, ...tips.map((id) => commit(id))]);
    expect(graphWidth(rows)).toBe(GRAPH_MAX_W);
  });
});

describe("laneScale", () => {
  it("returns 1 when graph fits naturally", () => {
    const rows = buildGraph([commit("c2", ["c1"]), commit("c1")]);
    const w = graphWidth(rows);
    expect(laneScale(rows, w)).toBe(1);
  });

  it("scales down when width is capped", () => {
    const tips = Array.from({ length: 10 }, (_, i) => `t${i}`);
    const rows = buildGraph([commit("merge", tips), ...tips.map((id) => commit(id))]);
    const scale = laneScale(rows, GRAPH_MAX_W);
    expect(scale).toBeLessThan(1);
    expect(scale).toBeGreaterThan(0);
  });

  it("returns 1 for empty rows", () => {
    expect(laneScale([], 100)).toBe(1);
  });
});

describe("paintGraphCanvas", () => {
  it("renders linear history without throwing", () => {
    const rows = buildGraph([commit("c2", ["c1"]), commit("c1")]);
    const w = graphWidth(rows);
    expect(() =>
      paintGraphCanvas(mockCtx(), rows, {
        graphW: w,
        visStart: 0,
        visCount: rows.length,
        selectedCommitId: "c2",
      }),
    ).not.toThrow();
  });

  it("renders merge with virtual window", () => {
    const rows = buildGraph([
      commit("merge", ["p1", "p2"]),
      commit("p1"),
      commit("p2"),
    ]);
    const w = graphWidth(rows);
    expect(() =>
      paintGraphCanvas(mockCtx(), rows, {
        graphW: w,
        visStart: 0,
        visCount: 2,
      }),
    ).not.toThrow();
  });
});
