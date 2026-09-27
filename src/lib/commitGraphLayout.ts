import type { CommitInfo } from "../types/git";

export const LANE_COLORS = [
  "#818cf8", "#34d399", "#fb923c", "#c084fc",
  "#38bdf8", "#f472b6", "#a3e635", "#fbbf24",
];

export const GRAPH_ROW_H = 26;
export const GRAPH_LANE_W = 12;
export const GRAPH_PAD = 6;
/** Hard cap so wide histories do not eat the commit list */
export const GRAPH_MAX_W = 112;

export interface GraphRow {
  commit: CommitInfo;
  lane: number;
  color: string;
  parentLanes: Array<{ lane: number; color: string; parentId: string }>;
}

/** Git-style lane assignment (newest commit first). */
export function buildGraph(commits: CommitInfo[]): GraphRow[] {
  /** Commit id expected in each lane column, or null if free */
  const pending: (string | null)[] = [];
  const laneColor = new Map<number, string>();
  const rows: GraphRow[] = [];

  const ensureLane = (lane: number) => {
    while (pending.length <= lane) pending.push(null);
  };

  const firstFreeLane = (): number => {
    const idx = pending.indexOf(null);
    return idx === -1 ? pending.length : idx;
  };

  const colorForLane = (lane: number) => {
    if (!laneColor.has(lane)) {
      laneColor.set(lane, LANE_COLORS[lane % LANE_COLORS.length]);
    }
    return laneColor.get(lane)!;
  };

  for (const commit of commits) {
    let lane = pending.findIndex((id) => id === commit.id);
    if (lane === -1) lane = firstFreeLane();
    ensureLane(lane);
    pending[lane] = null;

    const color = colorForLane(lane);
    const parentLanes: GraphRow["parentLanes"] = [];

    commit.parentIds.forEach((pid, pi) => {
      const pLane = pi === 0 ? lane : firstFreeLane();
      ensureLane(pLane);
      pending[pLane] = pid;
      parentLanes.push({
        lane: pLane,
        color: colorForLane(pLane),
        parentId: pid,
      });
    });

    rows.push({ commit, lane, color, parentLanes });
  }

  return rows;
}

export function graphWidth(rows: GraphRow[]): number {
  if (!rows.length) return GRAPH_PAD + GRAPH_LANE_W;
  const maxLane = Math.max(
    ...rows.map((r) => r.lane),
    ...rows.flatMap((r) => r.parentLanes.map((p) => p.lane)),
  );
  const natural = GRAPH_PAD + (maxLane + 1) * GRAPH_LANE_W;
  return Math.min(GRAPH_MAX_W, natural);
}

/** When width is capped, scale lane positions to fit. */
export function laneScale(rows: GraphRow[], graphW: number): number {
  if (!rows.length) return 1;
  const maxLane = Math.max(
    ...rows.map((r) => r.lane),
    ...rows.flatMap((r) => r.parentLanes.map((p) => p.lane)),
  );
  const natural = GRAPH_PAD + (maxLane + 1) * GRAPH_LANE_W;
  if (natural <= graphW) return 1;
  const inner = graphW - GRAPH_PAD * 2;
  const innerNatural = (maxLane + 1) * GRAPH_LANE_W;
  return innerNatural > 0 ? inner / innerNatural : 1;
}

function laneX(lane: number, scale: number) {
  const step = GRAPH_LANE_W * scale;
  return GRAPH_PAD + lane * step + step / 2;
}

function strokeEdge(
  ctx: CanvasRenderingContext2D,
  gi: number,
  gj: number,
  fromLane: number,
  toLane: number,
  colorFrom: string,
  colorTo: string,
  visStart: number,
  visEnd: number,
  scale: number,
) {
  if (gj <= gi) return;
  if (gj < visStart || gi >= visEnd) return;

  const yMid = (idx: number) => (idx - visStart) * GRAPH_ROW_H + GRAPH_ROW_H / 2;
  const yTop = (idx: number) => (idx - visStart) * GRAPH_ROW_H;
  const yBot = (idx: number) => yTop(idx) + GRAPH_ROW_H;

  const cx = laneX(fromLane, scale);
  const px = laneX(toLane, scale);
  const cy = yMid(gi);
  const py = yMid(gj);

  ctx.beginPath();
  ctx.moveTo(cx, cy);

  if (gj === gi + 1) {
    if (fromLane === toLane) {
      ctx.lineTo(px, py);
    } else {
      const bend = GRAPH_ROW_H * 0.45;
      ctx.bezierCurveTo(cx, cy + bend, px, py - bend, px, py);
    }
  } else {
    const yLeave = yBot(gi);
    ctx.lineTo(cx, yLeave);
    if (fromLane !== toLane) {
      const yEnter = yTop(gi + 1);
      ctx.bezierCurveTo(cx, yLeave + GRAPH_ROW_H * 0.15, px, yEnter - GRAPH_ROW_H * 0.15, px, yEnter);
    } else if (gi + 1 < gj) {
      ctx.lineTo(cx, yTop(gi + 1));
    }
    for (let k = gi + 1; k < gj; k++) {
      ctx.lineTo(px, yBot(k));
    }
    ctx.lineTo(px, py);
  }

  const grad = ctx.createLinearGradient(cx, cy, px, py);
  grad.addColorStop(0, colorFrom + "cc");
  grad.addColorStop(1, colorTo + "cc");
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

export function paintGraphCanvas(
  ctx: CanvasRenderingContext2D,
  rows: GraphRow[],
  opts: {
    graphW: number;
    visStart: number;
    visCount: number;
    selectedCommitId?: string | null;
    dotR?: number;
    dotRHead?: number;
  },
) {
  const { graphW, visStart, visCount, selectedCommitId, dotR = 4.5, dotRHead = 5.5 } = opts;
  const visEnd = Math.min(rows.length, visStart + visCount);
  const idToIdx = new Map(rows.map((r, i) => [r.commit.id, i]));
  const scale = laneScale(rows, graphW);

  ctx.clearRect(0, 0, graphW, visCount * GRAPH_ROW_H);

  for (let gi = 0; gi < rows.length; gi++) {
    const row = rows[gi];
    for (const pl of row.parentLanes) {
      const gj = idToIdx.get(pl.parentId);
      if (gj === undefined) continue;
      strokeEdge(ctx, gi, gj, row.lane, pl.lane, row.color, pl.color, visStart, visEnd, scale);
    }
  }

  for (let gi = visStart; gi < visEnd; gi++) {
    const row = rows[gi];
    const cx = laneX(row.lane, scale);
    const cy = (gi - visStart) * GRAPH_ROW_H + GRAPH_ROW_H / 2;
    const isHead = row.commit.id === selectedCommitId;

    if (isHead) {
      ctx.beginPath();
      ctx.arc(cx, cy, dotRHead + 3, 0, Math.PI * 2);
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, dotRHead + 3);
      glow.addColorStop(0, row.color + "55");
      glow.addColorStop(1, row.color + "00");
      ctx.fillStyle = glow;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(cx, cy, isHead ? dotRHead : dotR, 0, Math.PI * 2);
    ctx.fillStyle = isHead ? "#fff" : row.color;
    ctx.fill();

    if (isHead) {
      ctx.beginPath();
      ctx.arc(cx, cy, dotRHead + 1.5, 0, Math.PI * 2);
      ctx.strokeStyle = row.color;
      ctx.lineWidth = 1.25;
      ctx.stroke();
    }
  }
}
