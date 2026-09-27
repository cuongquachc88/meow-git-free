import { useEffect, useRef, useState, useMemo, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRepoStore } from "../../store/repoStore";
import type { CommitInfo } from "../../types/git";
import { git } from "../../ipc/git";
import { formatDistanceToNow } from "date-fns";
import { dedupeBranchLabels, formatBranchLabel, type BranchLabel } from "../../lib/branchLabels";
import {
  buildGraph,
  graphWidth,
  paintGraphCanvas,
  GRAPH_ROW_H,
} from "../../lib/commitGraphLayout";
import {
  IconCherryPick,
  IconCreateBranch,
  IconMore,
  IconRebase,
  IconReset,
  IconRevert,
  IconSearch,
} from "../shared/icons/GitIcons";

const ROW_H = GRAPH_ROW_H;
/** Commit graph filter bar: search + selects share one height */
const GRAPH_FILTER_H = 30;
const graphFilterClass =
  "glass-input box-border text-[11px] py-0 px-2.5 shrink-0";
const HASH_W = 68;
const AUTHOR_W = 96;
const DATE_W = 88;
const ROW_MENU_W = 28;
const MSG_MIN_W = 180;

// ─── Context Menu ─────────────────────────────────────────────────────────────

interface CtxMenu {
  x: number;
  y: number;
  commit: CommitInfo;
}

function promptBranchName(shortId: string): string | null {
  const name = window.prompt(`New branch name (from ${shortId}):`, "");
  if (name === null) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  if (trimmed.includes("..") || trimmed.startsWith("/") || trimmed.endsWith("/") || trimmed.includes(" ")) {
    throw new Error("Invalid branch name");
  }
  return trimmed;
}

function CommitContextMenu({
  menu,
  repoPath,
  onClose,
  onRefresh,
}: {
  menu: CtxMenu;
  repoPath: string;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const { setActiveRepo } = useRepoStore();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(true);
    setFeedback("");
    try {
      await fn();
      setFeedback(`✓ ${label}`);
      setTimeout(() => { onClose(); onRefresh(); }, 900);
    } catch (e) {
      if (e === "PROMPT_CANCEL") {
        onClose();
        setBusy(false);
        return;
      }
      setFeedback(`✗ ${String(e).split("\n")[0]}`);
      setBusy(false);
    }
  };

  const { commit } = menu;

  const items: { label: string; icon: ReactNode; danger?: boolean; action: () => Promise<void> }[] = [
    {
      label: "Create branch here…",
      icon: <IconCreateBranch size={15} />,
      action: async () => {
        const branch = promptBranchName(commit.shortId);
        if (!branch) throw "PROMPT_CANCEL";
        await git.createBranch(repoPath, branch, commit.id);
        await git.checkoutBranch(repoPath, branch);
        await setActiveRepo(repoPath);
      },
    },
    {
      label: "Cherry-pick",
      icon: <IconCherryPick size={15} />,
      action: () => git.cherryPick(repoPath, commit.id),
    },
    {
      label: "Revert commit",
      icon: <IconRevert size={15} />,
      action: () => git.revertCommit(repoPath, commit.id),
    },
    {
      label: "Reset HEAD here (mixed)",
      icon: <IconReset size={15} />,
      action: () => git.resetToRef(repoPath, commit.id, "mixed"),
    },
    {
      label: "Reset HEAD here (soft)",
      icon: <IconReset size={15} strokeWidth={1.25} />,
      action: () => git.resetToRef(repoPath, commit.id, "soft"),
    },
    {
      label: "Reset HEAD here (hard)",
      icon: <IconReset size={15} strokeWidth={2.5} />,
      danger: true,
      action: () => git.resetToRef(repoPath, commit.id, "hard"),
    },
    {
      label: "Rebase onto this commit",
      icon: <IconRebase size={15} />,
      action: () => git.rebaseOnto(repoPath, commit.id),
    },
  ];

  const MENU_W = 240;
  const MENU_H = 340;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const left = Math.min(menu.x + 2, vw - MENU_W - 8);
  const top = menu.y + MENU_H > vh
    ? Math.max(8, menu.y - MENU_H)
    : menu.y + 2;

  return (
    <div className="fixed inset-0" style={{ zIndex: 9998, pointerEvents: "none" }}>
      <div
        className="fixed inset-0"
        style={{ pointerEvents: "auto" }}
        onClick={onClose}
        onContextMenu={(e) => { e.preventDefault(); onClose(); }}
      />
      <div
        className="fixed glass-panel rounded-xl py-1 shadow-lg"
        style={{
          pointerEvents: "auto",
          zIndex: 1,
          left,
          top,
          width: MENU_W,
          maxHeight: MENU_H,
          overflowY: "auto",
          background: "var(--bg-surface-2)",
          border: "1px solid var(--border-strong)",
        }}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Commit header */}
        <div className="px-3 py-2 border-b" style={{ borderColor: "var(--border)" }}>
          <p className="text-[11px] font-mono" style={{ color: "var(--accent)" }}>
            {commit.shortId}
          </p>
          <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {commit.summary}
          </p>
        </div>

        {/* Actions */}
        {items.map((item) => (
          <button
            key={item.label}
            disabled={busy}
            onClick={() => run(item.label, item.action)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] transition-colors text-left"
            style={{
              color: item.danger ? "rgba(239,68,68,0.8)" : "var(--text-secondary)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = item.danger
                ? "rgba(239,68,68,0.08)"
                : "var(--bg-hover)";
              (e.currentTarget as HTMLButtonElement).style.color = item.danger
                ? "rgba(239,68,68,1)"
                : "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "";
              (e.currentTarget as HTMLButtonElement).style.color = item.danger
                ? "rgba(239,68,68,0.8)"
                : "var(--text-secondary)";
            }}
          >
            <span className="w-5 flex items-center justify-center shrink-0 opacity-80">{item.icon}</span>
            {item.label}
          </button>
        ))}

        {feedback && (
          <div
            className="px-3 py-1.5 text-[11px] border-t mt-1"
            style={{
              borderColor: "var(--border)",
              color: feedback.startsWith("✓") ? "rgba(34,197,94,0.8)" : "rgba(239,68,68,0.8)",
            }}
          >
            {feedback}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CommitGraph ─────────────────────────────────────────────────────────────

export function CommitGraph({ onOpenChangesPanel }: { onOpenChangesPanel?: () => void } = {}) {
  const { commits, selectedCommit, selectCommit, activeRepoPath, refreshLog, refreshBranches, refreshStatus, branches } =
    useRepoStore();

  const handleCommitClick = (commit: CommitInfo) => {
    selectCommit(commit);
    onOpenChangesPanel?.();
  };
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);
  const [search, setSearch] = useState("");
  const [authorFilter, setAuthorFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");

  const commitById = useMemo(() => new Map(commits.map((c) => [c.id, c])), [commits]);
  const commitByIdRef = useRef(commitById);
  commitByIdRef.current = commitById;

  const openCtxMenuAt = (clientX: number, clientY: number, commit: CommitInfo) => {
    setCtxMenu({ x: clientX, y: clientY, commit });
  };

  const localBranches = useMemo(() => branches.filter((b) => b.kind === "Local"), [branches]);

  const commitBranchLabels = useMemo(() => {
    const raw = new Map<string, BranchLabel[]>();
    branches.forEach((b) => {
      if (!b.tipId) return;
      if (!raw.has(b.tipId)) raw.set(b.tipId, []);
      raw.get(b.tipId)!.push({ name: b.name, isHead: b.isHead, isRemote: b.kind === "Remote" });
    });
    const m = new Map<string, BranchLabel[]>();
    raw.forEach((labels, tipId) => m.set(tipId, dedupeBranchLabels(labels)));
    return m;
  }, [branches]);

  // Unique authors for the filter dropdown
  const authors = useMemo(() => {
    const s = new Set<string>();
    commits.forEach((c) => s.add(c.authorName));
    return Array.from(s).sort();
  }, [commits]);

  // Build reachable-commit set for branch filter (walk parentIds)
  const reachableFromBranch = useMemo(() => {
    if (!branchFilter) return null;
    const branch = localBranches.find((b) => b.name === branchFilter);
    if (!branch?.tipId) return null;
    const commitMap = new Map(commits.map((c) => [c.id, c]));
    const reachable = new Set<string>();
    const queue = [branch.tipId];
    while (queue.length) {
      const id = queue.pop()!;
      if (reachable.has(id)) continue;
      reachable.add(id);
      commitMap.get(id)?.parentIds.forEach((pid) => queue.push(pid));
    }
    return reachable;
  }, [branchFilter, localBranches, commits]);

  // Filter commits by search + author + branch
  const filteredCommits = useMemo(() => {
    const q = search.trim().toLowerCase();
    const a = authorFilter.trim().toLowerCase();
    return commits.filter((c) => {
      if (q && !c.summary.toLowerCase().includes(q) && !c.id.startsWith(q) && !c.shortId.startsWith(q)) return false;
      if (a && c.authorName.toLowerCase() !== a) return false;
      if (reachableFromBranch && !reachableFromBranch.has(c.id)) return false;
      return true;
    });
  }, [commits, search, authorFilter, reachableFromBranch]);

  const rows = buildGraph(filteredCommits);
  const graphW = graphWidth(rows);
  const rowGridCols = `${graphW}px ${HASH_W}px minmax(${MSG_MIN_W}px, 1fr) ${AUTHOR_W}px ${DATE_W}px ${ROW_MENU_W}px`;
  const rowMinWidth = graphW + HASH_W + MSG_MIN_W + AUTHOR_W + DATE_W + ROW_MENU_W + 80;
  const totalH = filteredCommits.length * ROW_H;

  const vpH = scrollRef.current?.clientHeight ?? 600;
  const useVirtual = rows.length > 150;
  const visStart = useVirtual ? Math.max(0, Math.floor(scrollTop / ROW_H) - 2) : 0;
  const visCount = useVirtual ? Math.ceil(vpH / ROW_H) + 6 : rows.length;
  const visRows = rows.slice(visStart, visStart + visCount);

  // Capture on document — works in Tauri WKWebView (React onContextMenu is unreliable).
  useEffect(() => {
    const openFromDom = (e: MouseEvent) => {
      const row = (e.target as Element).closest("[data-commit-row]");
      if (!row) return;
      if ((e.target as Element).closest("[data-commit-menu-btn]")) return;
      e.preventDefault();
      e.stopPropagation();
      const id = row.getAttribute("data-commit-id");
      if (!id) return;
      const commit = commitByIdRef.current.get(id);
      if (!commit) return;
      openCtxMenuAt(e.clientX, e.clientY, commit);
    };

    document.addEventListener("contextmenu", openFromDom, true);
    return () => document.removeEventListener("contextmenu", openFromDom, true);
  }, []);

  useEffect(() => {
    if (!ctxMenu) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setCtxMenu(null);
    };
    const scrollEl = scrollRef.current;
    const onScroll = () => setCtxMenu(null);
    window.addEventListener("keydown", onKey);
    scrollEl?.addEventListener("scroll", onScroll);
    return () => {
      window.removeEventListener("keydown", onKey);
      scrollEl?.removeEventListener("scroll", onScroll);
    };
  }, [ctxMenu]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const h = visRows.length * ROW_H;
    canvas.width = graphW * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${graphW}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    paintGraphCanvas(ctx, rows, {
      graphW,
      visStart,
      visCount: visRows.length,
      selectedCommitId: selectedCommit?.id,
    });
  }, [rows, visRows.length, visStart, selectedCommit, graphW]);

  const handleRefresh = async () => {
    await Promise.all([refreshLog(), refreshBranches(), refreshStatus()]);
  };

  if (commits.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
        No commits yet
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search / filter bar */}
      <div
        className="flex items-center gap-2 px-3 py-1 shrink-0 border-b"
        style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
      >
        <div className="relative flex-1 min-w-0" style={{ height: GRAPH_FILTER_H }}>
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-faint)" }}>
            <IconSearch size={11} />
          </span>
          <input
            className={`${graphFilterClass} w-full pl-7`}
            style={{ height: GRAPH_FILTER_H, minHeight: GRAPH_FILTER_H }}
            placeholder="Search commits by message or hash…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setScrollTop(0);
              if (scrollRef.current) scrollRef.current.scrollTop = 0;
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px]"
              style={{ color: "var(--text-muted)" }}
            >×</button>
          )}
        </div>

        <select
          className={graphFilterClass}
          style={{ width: 130, height: GRAPH_FILTER_H, minHeight: GRAPH_FILTER_H }}
          value={branchFilter}
          onChange={(e) => {
            setBranchFilter(e.target.value);
            setScrollTop(0);
            if (scrollRef.current) scrollRef.current.scrollTop = 0;
          }}
        >
          <option value="">All branches</option>
          {localBranches.map((b) => (
            <option key={b.name} value={b.name}>
              {b.isHead ? "⎇ " : ""}{b.name}
            </option>
          ))}
        </select>

        <select
          className={graphFilterClass}
          style={{ width: 120, height: GRAPH_FILTER_H, minHeight: GRAPH_FILTER_H }}
          value={authorFilter}
          onChange={(e) => setAuthorFilter(e.target.value)}
        >
          <option value="">All authors</option>
          {authors.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        {(search || authorFilter || branchFilter) && (
          <button
            onClick={() => { setSearch(""); setAuthorFilter(""); setBranchFilter(""); }}
            className="glass-btn px-2 py-1 text-[10px] shrink-0"
            title="Clear all filters"
          >
            Clear
          </button>
        )}

        {(search || authorFilter || branchFilter) && (
          <span className="text-[10px] shrink-0" style={{ color: "var(--text-muted)" }}>
            {filteredCommits.length}/{commits.length}
          </span>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-auto min-h-0"
        onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
        style={{ background: "var(--bg-base)" }}
      >
        {/* Virtual scroll spacer only when list is large */}
        <div
          style={
            useVirtual
              ? { height: totalH, position: "relative", minWidth: rowMinWidth }
              : { position: "relative", minWidth: rowMinWidth }
          }
        >
          <div
            style={useVirtual ? {
              position: "absolute",
              top: visStart * ROW_H,
              width: "100%",
              minWidth: rowMinWidth,
            } : { minWidth: rowMinWidth }}
          >
            <canvas
              ref={canvasRef}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                pointerEvents: "none",
              }}
            />

            {visRows.map(({ commit, color }) => {
              const isSelected = commit.id === selectedCommit?.id;
              const labels = commitBranchLabels.get(commit.id) ?? [];
              return (
                <div
                  key={commit.id}
                  data-commit-row
                  data-commit-id={commit.id}
                  onClick={() => handleCommitClick(commit)}
                  style={{
                    height: ROW_H,
                    display: "grid",
                    gridTemplateColumns: rowGridCols,
                    alignItems: "center",
                    columnGap: 8,
                    paddingLeft: 4,
                    paddingRight: 8,
                    background: isSelected ? "var(--accent-bg)" : undefined,
                    borderLeft: `2px solid ${isSelected ? "var(--accent)" : "transparent"}`,
                  }}
                  className="w-full cursor-pointer select-none transition-colors duration-100 group hover:bg-[color:var(--bg-hover)]"
                >
                  <div aria-hidden />
                  <span
                    className="font-mono text-[11px] tabular-nums truncate"
                    style={{ color: color + "99" }}
                  >
                    {commit.shortId}
                  </span>

                  <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                    {labels.map((lbl) => (
                      <span
                        key={lbl.name}
                        className="shrink-0 text-[10px] px-1.5 py-px rounded font-medium max-w-[120px] truncate"
                        style={
                          lbl.isHead
                            ? { background: "var(--accent-bg)", border: "1px solid var(--accent-border)", color: "var(--accent)" }
                            : lbl.isRemote
                            ? { background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)", color: "rgba(52,211,153,0.8)" }
                            : { background: "rgba(251,146,60,0.10)", border: "1px solid rgba(251,146,60,0.25)", color: "rgba(251,146,60,0.8)" }
                        }
                        title={lbl.name}
                      >
                        {formatBranchLabel(lbl.name, lbl.isRemote)}
                      </span>
                    ))}
                    <span
                      className="text-[12px] truncate min-w-0 flex-1"
                      style={{ color: "var(--text-primary)", opacity: isSelected ? 1 : 0.85 }}
                      title={commit.summary}
                    >
                      {commit.summary || "(no message)"}
                    </span>
                  </div>

                  <span
                    className="text-[11px] truncate text-right"
                    style={{ color: "var(--text-muted)" }}
                    title={commit.authorName}
                  >
                    {commit.authorName}
                  </span>
                  <span
                    className="text-[11px] text-right tabular-nums truncate"
                    style={{ color: "var(--text-faint)" }}
                  >
                    {(() => {
                      const d = new Date(commit.authorTime * 1000);
                      const ago = Date.now() - d.getTime();
                      return ago > 30 * 24 * 3600 * 1000
                        ? d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" })
                        : formatDistanceToNow(d, { addSuffix: true });
                    })()}
                  </span>
                  <button
                    type="button"
                    data-commit-menu-btn
                    title="Commit actions"
                    className={`w-6 h-6 flex items-center justify-center rounded-md transition-opacity justify-self-end ${
                      isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                    style={{ color: "var(--text-muted)" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      const r = e.currentTarget.getBoundingClientRect();
                      openCtxMenuAt(r.right - 8, r.bottom + 4, commit);
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    }}
                  >
                      <IconMore size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {ctxMenu && createPortal(
        activeRepoPath ? (
          <CommitContextMenu
            menu={ctxMenu}
            repoPath={activeRepoPath}
            onClose={() => setCtxMenu(null)}
            onRefresh={handleRefresh}
          />
        ) : (
          <div
            className="fixed glass-panel rounded-xl px-4 py-3 text-[12px]"
            style={{ zIndex: 9999, left: ctxMenu.x, top: ctxMenu.y, background: "var(--bg-surface-2)" }}
          >
            No repository open
          </div>
        ),
        document.body,
      )}
    </div>
  );
}
