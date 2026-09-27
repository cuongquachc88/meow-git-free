import { useEffect, useRef, useState } from "react";
import { useRepoStore } from "../../store/repoStore";
import type { CommitInfo } from "../../types/git";
import { formatDistanceToNow } from "date-fns";

const ROW_HEIGHT = 28;
const LANE_WIDTH = 14;
const DOT_RADIUS = 5;

const COLORS = [
  "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ef4444", "#06b6d4", "#ec4899", "#84cc16",
];

function buildGraph(commits: CommitInfo[]) {
  const laneMap = new Map<string, number>();
  const colorMap = new Map<string, string>();
  const rows: { commit: CommitInfo; lane: number; color: string; parentLanes: number[] }[] = [];
  let nextLane = 0;

  for (const commit of commits) {
    let lane = laneMap.get(commit.id) ?? nextLane++;
    const color = colorMap.get(commit.id) ?? COLORS[lane % COLORS.length];
    laneMap.set(commit.id, lane);
    colorMap.set(commit.id, color);

    const parentLanes: number[] = [];
    commit.parentIds.forEach((pid, i) => {
      if (!laneMap.has(pid)) {
        const pLane = i === 0 ? lane : nextLane++;
        laneMap.set(pid, pLane);
        colorMap.set(pid, i === 0 ? color : COLORS[pLane % COLORS.length]);
      }
      parentLanes.push(laneMap.get(pid)!);
    });

    rows.push({ commit, lane, color, parentLanes });
  }

  return rows;
}

export function CommitGraph() {
  const { commits, selectedCommit, selectCommit } = useRepoStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const rows = buildGraph(commits);
  const maxLane = Math.max(0, ...rows.map((r) => r.lane));
  const graphWidth = (maxLane + 1) * LANE_WIDTH + LANE_WIDTH;
  const totalHeight = rows.length * ROW_HEIGHT;

  const visibleStart = Math.floor(scrollTop / ROW_HEIGHT);
  const visibleCount = Math.ceil(window.innerHeight / ROW_HEIGHT) + 2;
  const visibleRows = rows.slice(visibleStart, visibleStart + visibleCount);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const h = visibleRows.length * ROW_HEIGHT;
    canvas.width = graphWidth * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${graphWidth}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, graphWidth, h);

    visibleRows.forEach(({ commit, lane, color, parentLanes }, vi) => {
      const cx = lane * LANE_WIDTH + LANE_WIDTH / 2;
      const cy = vi * ROW_HEIGHT + ROW_HEIGHT / 2;
      // Lines to parents
      parentLanes.forEach((pLane, pi) => {
        const px = pLane * LANE_WIDTH + LANE_WIDTH / 2;
        const py = cy + ROW_HEIGHT;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        if (pLane === lane) {
          ctx.lineTo(px, py);
        } else {
          ctx.bezierCurveTo(cx, cy + ROW_HEIGHT * 0.5, px, py - ROW_HEIGHT * 0.5, px, py);
        }
        ctx.strokeStyle = pi === 0 ? color : COLORS[pLane % COLORS.length];
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Dot
      ctx.beginPath();
      ctx.arc(cx, cy, DOT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = commit.id === selectedCommit?.id ? "#fff" : color;
      ctx.fill();
    });
  }, [visibleRows, selectedCommit, graphWidth]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto bg-gray-950 text-sm text-gray-300 font-mono"
      onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            top: visibleStart * ROW_HEIGHT,
            width: "100%",
          }}
        >
          <div style={{ display: "flex" }}>
            <canvas ref={canvasRef} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              {visibleRows.map(({ commit }) => (
                <div
                  key={commit.id}
                  onClick={() => selectCommit(commit)}
                  style={{ height: ROW_HEIGHT }}
                  className={`flex items-center px-2 gap-3 cursor-pointer hover:bg-gray-800 ${
                    selectedCommit?.id === commit.id ? "bg-gray-800" : ""
                  }`}
                >
                  <span className="text-gray-500 text-xs w-16 shrink-0">{commit.shortId}</span>
                  <span className="flex-1 truncate">{commit.summary}</span>
                  <span className="text-gray-500 text-xs shrink-0 w-28 text-right">
                    {commit.authorName}
                  </span>
                  <span className="text-gray-600 text-xs shrink-0 w-24 text-right">
                    {formatDistanceToNow(new Date(commit.authorTime * 1000), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
