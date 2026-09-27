import { useState } from "react";
import { useRepoStore } from "../../store/repoStore";
import { git } from "../../ipc/git";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  added:      { label: "A", color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  modified:   { label: "M", color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  deleted:    { label: "D", color: "#f87171", bg: "rgba(248,113,113,0.12)" },
  renamed:    { label: "R", color: "#c084fc", bg: "rgba(192,132,252,0.12)" },
  conflicted: { label: "!", color: "#fb923c", bg: "rgba(251,146,60,0.15)" },
  untracked:  { label: "?", color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
};

function StatusBadge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span
      className="text-[9px] font-bold font-mono px-1 py-px rounded shrink-0 w-5 text-center"
      style={{ color, background: bg, lineHeight: "14px" }}
    >
      {label}
    </span>
  );
}

// ─── Commit diff file list ────────────────────────────────────────────────────
function CommitFileList() {
  const { activeDiffs, selectedDiff, setSelectedDiff } = useRepoStore();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 flex items-center gap-1.5 px-3 py-1 border-b" style={{ borderColor: "var(--border)" }}>
        <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
          Changed files
        </span>
        <span className="text-[9px]" style={{ color: "var(--text-faint)" }}>({activeDiffs.length})</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeDiffs.map((d) => {
          const path = d.newPath ?? d.oldPath ?? "?";
          const filename = path.split("/").pop() ?? path;
          const dir = path.includes("/") ? path.substring(0, path.lastIndexOf("/")) : "";
          const isSelected = selectedDiff === d;
          const label = d.oldPath === null ? "A" : d.newPath === null ? "D" : "M";
          const cfg = label === "A"
            ? { color: "#34d399", bg: "rgba(52,211,153,0.12)" }
            : label === "D"
            ? { color: "#f87171", bg: "rgba(248,113,113,0.12)" }
            : { color: "#fbbf24", bg: "rgba(251,191,36,0.12)" };

          return (
            <div
              key={path}
              onClick={() => setSelectedDiff(d)}
              className="flex items-center gap-2 px-3 py-0.5 cursor-pointer transition-colors"
              style={{
                background: isSelected ? "var(--accent-bg)" : undefined,
                borderLeft: `2px solid ${isSelected ? "var(--accent)" : "transparent"}`,
              }}
              onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "var(--bg-hover)"; }}
              onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = ""; }}
            >
              <StatusBadge label={label} color={cfg.color} bg={cfg.bg} />
              <div className="flex-1 min-w-0">
                <span className="text-[11px] truncate block" style={{ color: isSelected ? "var(--text-primary)" : "var(--text-secondary)" }}>
                  {filename}
                </span>
                {dir && (
                  <span className="text-[9px] truncate block" style={{ color: "var(--text-faint)" }}>{dir}/</span>
                )}
              </div>
            </div>
          );
        })}
        {activeDiffs.length === 0 && (
          <p className="px-3 py-2 text-[11px]" style={{ color: "var(--text-faint)" }}>No files</p>
        )}
      </div>
    </div>
  );
}

// ─── Working tree file list ───────────────────────────────────────────────────
export function FilesPanel() {
  const { activeRepoPath, status, selectedCommit, refreshStatus, setSelectedDiff, activeDiffs } = useRepoStore();
  const [search, setSearch] = useState("");

  // When a commit is selected, show that commit's diff files
  if (selectedCommit) {
    return <CommitFileList />;
  }

  const staged = status.filter((f) => f.isStaged && (!search || f.path.toLowerCase().includes(search.toLowerCase())));
  const unstaged = status.filter((f) => !f.isStaged && (!search || f.path.toLowerCase().includes(search.toLowerCase())));

  const handleStage = async (file: string) => {
    if (!activeRepoPath) return;
    await git.stageFile(activeRepoPath, file).then(() => refreshStatus());
  };

  const handleUnstage = async (file: string) => {
    if (!activeRepoPath) return;
    await git.unstageFile(activeRepoPath, file).then(() => refreshStatus());
  };

  const handleStageAll = async () => {
    if (!activeRepoPath) return;
    await git.stageAll(activeRepoPath).then(() => refreshStatus());
  };

  const handleFileClick = (path: string) => {
    const diff = activeDiffs.find((d) => (d.newPath ?? d.oldPath) === path);
    if (diff) setSelectedDiff(diff);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden text-sm">
      {/* Search */}
      <div className="shrink-0 px-3 py-2 border-b" style={{ borderColor: "var(--border)" }}>
        <input
          className="glass-input w-full text-[11px] px-2 py-1 rounded-md"
          placeholder="Filter files…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Staged */}
      <div className="shrink-0">
        <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--text-faint)" }}>
            <span style={{ color: "#34d399" }}>●</span>
            Staged <span className="font-normal">({staged.length})</span>
          </span>
          {status.filter((f) => !f.isStaged).length > 0 && (
            <button
              onClick={handleStageAll}
              className="text-[10px] px-2 py-0.5 rounded transition-colors"
              style={{ color: "var(--accent)", background: "var(--accent-bg)", border: "1px solid var(--accent-border)" }}
            >
              Stage all ↑
            </button>
          )}
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: 110 }}>
          {staged.map((f) => {
            const s = f.status[0] ?? "untracked";
            const cfg = STATUS_CONFIG[s] ?? STATUS_CONFIG["untracked"];
            return (
              <FileRow
                key={f.path}
                path={f.path}
                badge={<StatusBadge label={cfg.label} color={cfg.color} bg={cfg.bg} />}
                actionIcon={<UnstageIcon />}
                actionTitle="Unstage"
                onAction={() => handleUnstage(f.path)}
                onClick={() => handleFileClick(f.path)}
              />
            );
          })}
          {staged.length === 0 && (
            <p className="px-3 py-1.5 text-[11px]" style={{ color: "var(--text-faint)" }}>Nothing staged</p>
          )}
        </div>
      </div>

      <div className="shrink-0 mx-3 my-1" style={{ height: 1, background: "var(--border)" }} />

      {/* Unstaged */}
      <div className="flex flex-col min-h-0 flex-1">
        <div className="shrink-0 flex items-center justify-between px-3 pt-1 pb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--text-faint)" }}>
            <span style={{ color: "#fbbf24" }}>●</span>
            Unstaged <span className="font-normal">({unstaged.length})</span>
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {unstaged.map((f) => {
            const s = f.status[0] ?? "untracked";
            const cfg = STATUS_CONFIG[s] ?? STATUS_CONFIG["untracked"];
            return (
              <FileRow
                key={f.path}
                path={f.path}
                badge={<StatusBadge label={cfg.label} color={cfg.color} bg={cfg.bg} />}
                actionIcon={<StageIcon />}
                actionTitle="Stage"
                onAction={() => handleStage(f.path)}
                onClick={() => handleFileClick(f.path)}
              />
            );
          })}
          {unstaged.length === 0 && (
            <p className="px-3 py-1.5 text-[11px]" style={{ color: "var(--text-faint)" }}>Working tree clean</p>
          )}
        </div>
      </div>
    </div>
  );
}

function FileRow({
  path,
  badge,
  actionIcon,
  actionTitle,
  onAction,
  onClick,
}: {
  path: string;
  badge: React.ReactNode;
  actionIcon: React.ReactNode;
  actionTitle: string;
  onAction: () => void;
  onClick?: () => void;
}) {
  const filename = path.split("/").pop() ?? path;
  const dir = path.includes("/") ? path.substring(0, path.lastIndexOf("/")) : "";

  return (
    <div
      className="flex items-center gap-2 px-3 py-1 hover:bg-[color:var(--bg-hover)] group cursor-pointer"
      onClick={onClick}
    >
      {badge}
      <div className="flex-1 min-w-0">
        <span className="text-[12px] truncate block" style={{ color: "var(--text-secondary)" }}>{filename}</span>
        {dir && <span className="text-[10px] truncate block" style={{ color: "var(--text-faint)" }}>{dir}/</span>}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onAction(); }}
        title={actionTitle}
        className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded transition-all"
        style={{ color: "var(--text-muted)" }}
      >
        {actionIcon}
      </button>
    </div>
  );
}

const StageIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="18 15 12 9 6 15"/>
  </svg>
);
const UnstageIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
