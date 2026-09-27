import { useEffect, useState, useMemo } from "react";
import { useRepoStore } from "../../store/repoStore";
import { git } from "../../ipc/git";
import type { FileDiff, DiffLine, BlameLine } from "../../types/git";
import { formatDistanceToNow } from "date-fns";
import { PANEL_HEADER_H } from "../../constants/layout";
import { IconBlame, IconChevronLeft, IconDiff, IconExpand } from "../shared/icons/GitIcons";

type ViewMode = "diff" | "blame";

// ─── Blame colour — stable hash of commit id ──────────────────────────────────
const BLAME_COLORS = [
  "#818cf8","#34d399","#fb923c","#c084fc",
  "#38bdf8","#f472b6","#a3e635","#fbbf24",
];
function blameColor(commitId: string) {
  let h = 0;
  for (let i = 0; i < commitId.length; i++) h = (h * 31 + commitId.charCodeAt(i)) >>> 0;
  return BLAME_COLORS[h % BLAME_COLORS.length];
}

// ─── DiffViewer ───────────────────────────────────────────────────────────────

export function DiffViewer({
  expanded = false,
  variant = "default",
  forcedMode,
  onExpand,
  onCollapse,
  onRequestBlameFullscreen,
}: {
  expanded?: boolean;
  /** panel: sidebar; center: full main column */
  variant?: "default" | "panel" | "center";
  forcedMode?: ViewMode;
  onExpand?: () => void;
  onCollapse?: () => void;
  /** Panel only: open blame in center column */
  onRequestBlameFullscreen?: () => void;
}) {
  const { activeRepoPath, activeDiffs, selectedDiff, setSelectedDiff } = useRepoStore();
  const [mode, setMode] = useState<ViewMode>("diff");
  const [blameLines, setBlameLines] = useState<BlameLine[]>([]);
  const [blameLoading, setBlameLoading] = useState(false);
  const [hoveredCommit, setHoveredCommit] = useState<string | null>(null);

  useEffect(() => {
    setBlameLines([]);
    if (!forcedMode) setMode("diff");
  }, [selectedDiff, forcedMode]);

  // Load blame when switching to blame mode
  const activeMode = forcedMode ?? mode;

  useEffect(() => {
    if (activeMode !== "blame" || !activeRepoPath || !selectedDiff) return;
    const filePath = selectedDiff.newPath ?? selectedDiff.oldPath;
    if (!filePath) return;
    setBlameLoading(true);
    setBlameLines([]);
    git.blameFile(activeRepoPath, filePath)
      .then(setBlameLines)
      .catch(() => setBlameLines([]))
      .finally(() => setBlameLoading(false));
  }, [activeMode, selectedDiff, activeRepoPath]);

  const diffs = activeDiffs;
  const selected = selectedDiff;
  const setSelected = setSelectedDiff;

  const selectedPath = selected?.newPath ?? selected?.oldPath ?? "";
  const panelMode = variant === "panel";
  const centerMode = variant === "center";

  const setViewMode = (next: ViewMode) => {
    if (next === "blame" && panelMode && onRequestBlameFullscreen) {
      onRequestBlameFullscreen();
      return;
    }
    setMode(next);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden min-h-0">
      {/* Toolbar: file tabs + mode toggle */}
      <div
        className="flex items-center border-b shrink-0 gap-1.5 px-2 py-1.5"
        style={{
          borderColor: "var(--border)",
          background: "var(--bg-surface)",
          minHeight: panelMode ? 36 : PANEL_HEADER_H,
        }}
      >
        {(centerMode || expanded) && onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            className="glass-btn flex items-center gap-1.5 px-2.5 py-1 shrink-0 text-[12px]"
            title="Back to commit graph"
          >
            <IconChevronLeft size={14} />
            {centerMode ? "Graph" : "Back"}
          </button>
        )}
        {panelMode && onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            className="glass-btn flex items-center gap-1 px-2 py-0.5 shrink-0 text-[11px]"
            title="Close diff"
          >
            <IconChevronLeft size={14} />
          </button>
        )}
        {panelMode ? (
          <span
            className="flex-1 min-w-0 text-[11px] font-mono truncate px-1"
            style={{ color: "var(--text-secondary)" }}
            title={selectedPath}
          >
            {selectedPath.split("/").pop() ?? selectedPath}
          </span>
        ) : centerMode ? (
          <div className="flex-1 min-w-0 px-1">
            <p className="text-[11px] font-mono truncate" style={{ color: "var(--text-secondary)" }} title={selectedPath}>
              {selectedPath}
            </p>
            <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--text-faint)" }}>
              {activeMode === "blame" ? "Blame" : "Diff"}
            </p>
          </div>
        ) : (
          /* File tabs */
          <div className="flex flex-1 overflow-x-auto min-w-0">
            {diffs.map((d) => {
              const name = (d.newPath ?? d.oldPath ?? "?").split("/").pop()!;
              const isSel = selected === d;
              return (
                <button
                  key={d.newPath ?? d.oldPath}
                  onClick={() => { setSelected(d); }}
                  className="px-3 py-1.5 text-[11px] border-r whitespace-nowrap shrink-0 transition-colors"
                  style={{
                    borderColor: "var(--border)",
                    color: isSel ? "var(--text-primary)" : "var(--text-muted)",
                    background: isSel ? "var(--bg-surface-2)" : "transparent",
                    borderBottom: isSel ? "2px solid var(--accent)" : "2px solid transparent",
                    marginBottom: isSel ? -1 : 0,
                  }}
                >
                  {name}
                </button>
              );
            })}
          </div>
        )}

        {/* Mode toggle + expand button */}
        <div className="flex items-center gap-1 pl-1 pr-0.5 shrink-0">
          {selected && !selected.isBinary && !forcedMode && (
            <>
              <button
                type="button"
                onClick={() => setViewMode("diff")}
                className="glass-btn px-2.5 py-1 text-[11px] rounded-md flex items-center gap-1"
                style={activeMode === "diff" ? { color: "var(--accent)", background: "var(--accent-bg)", borderColor: "var(--accent-border)" } : {}}
              >
                <IconDiff size={13} /> Diff
              </button>
              <button
                type="button"
                onClick={() => setViewMode("blame")}
                className="glass-btn px-2.5 py-1 text-[11px] rounded-md flex items-center gap-1"
                style={activeMode === "blame" ? { color: "var(--accent)", background: "var(--accent-bg)", borderColor: "var(--accent-border)" } : {}}
                title={panelMode ? "Open blame full screen" : "Blame"}
              >
                <IconBlame size={13} /> Blame
              </button>
            </>
          )}
          {/* Expand / collapse */}
          {!expanded && onExpand && (
            <button
              onClick={onExpand}
              className="glass-btn w-7 h-7 p-0 flex items-center justify-center ml-1"
              title="Expand"
            >
              <IconExpand size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto font-mono text-[11px] leading-snug">
        {!selected ? (
          <div className="flex items-center justify-center h-full text-sm" style={{ color: "var(--text-muted)" }}>
            {diffs.length === 0 ? "Select a commit or change a file" : "Select a file"}
          </div>
        ) : selected.isBinary ? (
          <div className="flex items-center justify-center h-full" style={{ color: "var(--text-muted)" }}>
            Binary file — no diff available
          </div>
        ) : activeMode === "blame" ? (
          <BlameView
            lines={blameLines}
            loading={blameLoading}
            hoveredCommit={hoveredCommit}
            onHoverCommit={setHoveredCommit}
            filePath={selectedPath}
          />
        ) : (
          <DiffView diff={selected} />
        )}
      </div>
    </div>
  );
}

// ─── Diff view ────────────────────────────────────────────────────────────────

function DiffView({ diff }: { diff: FileDiff }) {
  return (
    <table className="w-full border-collapse">
      <tbody>
        {diff.hunks.map((hunk, hi) => (
          <>
            <tr key={`hunk-${hi}`} className="diff-hunk">
              <td className="w-10 text-right px-2 py-0.5 select-none border-r tabular-nums"
                style={{ color: "var(--text-faint)", borderColor: "var(--border)" }}>···</td>
              <td className="w-10 text-right px-2 py-0.5 select-none border-r"
                style={{ borderColor: "var(--border)" }} />
              <td className="px-4 py-0.5" style={{ color: "var(--diff-hunk-text)" }}>
                {hunk.header.trim()}
              </td>
            </tr>
            {hunk.lines.map((line, li) => (
              <DiffLineRow key={`${hi}-${li}`} line={line} />
            ))}
          </>
        ))}
      </tbody>
    </table>
  );
}

function DiffLineRow({ line }: { line: DiffLine }) {
  const isAdd = line.origin === "+";
  const isDel = line.origin === "-";
  return (
    <tr className={isAdd ? "diff-add" : isDel ? "diff-del" : ""}>
      <td className="w-10 text-right px-2 py-px select-none border-r tabular-nums"
        style={{ color: "var(--text-faint)", borderColor: "var(--border)" }}>
        {(isDel || line.origin === " ") ? (line.oldLineno ?? "") : ""}
      </td>
      <td className="w-10 text-right px-2 py-px select-none border-r tabular-nums"
        style={{ color: "var(--text-faint)", borderColor: "var(--border)" }}>
        {(isAdd || line.origin === " ") ? (line.newLineno ?? "") : ""}
      </td>
      <td className="px-4 py-px whitespace-pre"
        style={{ color: isAdd ? "var(--diff-add-text)" : isDel ? "var(--diff-del-text)" : "var(--text-secondary)" }}>
        <span style={{ opacity: 0.5, marginRight: 4 }}>
          {line.origin === " " ? " " : line.origin}
        </span>
        {line.content.replace(/\n$/, "")}
      </td>
    </tr>
  );
}

// ─── Blame view ───────────────────────────────────────────────────────────────

function BlameView({
  lines,
  loading,
  hoveredCommit,
  onHoverCommit,
  filePath: _filePath,
}: {
  lines: BlameLine[];
  loading: boolean;
  hoveredCommit: string | null;
  onHoverCommit: (id: string | null) => void;
  filePath: string;
}) {
  // Group consecutive lines from the same commit for sidebar rendering
  const groups = useMemo(() => {
    const g: { commitId: string; startIdx: number; count: number }[] = [];
    lines.forEach((l, i) => {
      if (i === 0 || l.commitId !== lines[i - 1].commitId) {
        g.push({ commitId: l.commitId, startIdx: i, count: 1 });
      } else {
        g[g.length - 1].count++;
      }
    });
    return g;
  }, [lines]);

  // Map lineIdx → group idx for quick lookup
  const lineGroup = useMemo(() => {
    const m = new Map<number, number>();
    groups.forEach((g, gi) => {
      for (let i = 0; i < g.count; i++) m.set(g.startIdx + i, gi);
    });
    return m;
  }, [groups]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: "var(--text-muted)" }}>
        Loading blame…
      </div>
    );
  }
  if (lines.length === 0) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: "var(--text-muted)" }}>
        No blame data
      </div>
    );
  }

  return (
    <table className="w-full border-collapse">
      <tbody>
        {lines.map((line, idx) => {
          const gi = lineGroup.get(idx)!;
          const group = groups[gi];
          const isGroupStart = group.startIdx === idx;
          const color = blameColor(line.commitId);
          const isHovered = hoveredCommit === line.commitId;

          return (
            <tr
              key={idx}
              onMouseEnter={() => onHoverCommit(line.commitId)}
              onMouseLeave={() => onHoverCommit(null)}
              style={{
                background: isHovered ? `${color}14` : "transparent",
                transition: "background 0.1s",
              }}
            >
              {/* Blame sidebar */}
              <td
                className="select-none border-r align-top"
                style={{
                  borderColor: "var(--border)",
                  width: 200,
                  paddingLeft: 2,
                  borderLeft: `3px solid ${isGroupStart ? color : "transparent"}`,
                }}
              >
                {isGroupStart ? (
                  <div className="px-2 py-px">
                    <span
                      className="font-mono text-[10px]"
                      style={{ color }}
                      title={`${line.commitId}\n${line.summary}\n${line.author} · ${formatDistanceToNow(new Date(line.timestamp * 1000), { addSuffix: true })}`}
                    >
                      {line.shortId}
                    </span>
                    <span className="ml-2 text-[10px] truncate" style={{ color: "var(--text-muted)", maxWidth: 100, display: "inline-block", verticalAlign: "bottom" }}>
                      {line.author}
                    </span>
                    <span className="ml-1 text-[9px]" style={{ color: "var(--text-faint)" }}>
                      {formatDistanceToNow(new Date(line.timestamp * 1000), { addSuffix: true })}
                    </span>
                  </div>
                ) : (
                  <div style={{ height: "1.5rem" }} />
                )}
              </td>

              {/* Line number */}
              <td className="w-10 text-right px-2 py-px tabular-nums select-none border-r"
                style={{ color: "var(--text-faint)", borderColor: "var(--border)" }}>
                {line.lineNo}
              </td>

              {/* Code */}
              <td className="px-4 py-px whitespace-pre" style={{ color: "var(--text-secondary)" }}>
                {line.content}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

