import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useRepoStore } from "../../store/repoStore";
import { git } from "../../ipc/git";
import { diffKind } from "../../lib/diffKind";
import { openBranchName } from "../../lib/headBranch";
import { MergeConflictResolver } from "../git/MergeConflictResolver";
import { useUIStore } from "../../store/uiStore";
import { joinCommitMessage, messageFromHeadCommit } from "../git/CommitMessageFields";
import { CommitComposeSection } from "../git/CommitComposeSection";
import { DiffViewer } from "./DiffViewer";
import { IconFileStatus, type FileChangeKind } from "../shared/icons/GitIcons";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  added: { label: "A", color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  modified: { label: "M", color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  deleted: { label: "D", color: "#f87171", bg: "rgba(248,113,113,0.12)" },
  renamed: { label: "R", color: "#c084fc", bg: "rgba(192,132,252,0.12)" },
  conflicted: { label: "!", color: "#fb923c", bg: "rgba(251,146,60,0.15)" },
  untracked: { label: "?", color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
};

function statusToFileKind(statusKey: string): FileChangeKind {
  if (statusKey === "added") return "added";
  if (statusKey === "deleted") return "deleted";
  if (statusKey === "renamed") return "renamed";
  if (statusKey === "conflicted") return "conflicted";
  if (statusKey === "untracked") return "untracked";
  return "modified";
}

function CommitHeader() {
  const { selectedCommit, commits, selectCommit, activeDiffs } = useRepoStore();

  const stats = useMemo(() => {
    let added = 0;
    let modified = 0;
    let deleted = 0;
    activeDiffs.forEach((d) => {
      const k = diffKind(d);
      if (k === "added") added++;
      else if (k === "deleted") deleted++;
      else modified++;
    });
    return { added, modified, deleted };
  }, [activeDiffs]);

  if (!selectedCommit) return null;

  const parentId = selectedCommit.parentIds[0];
  const parentCommit = parentId ? commits.find((c) => c.id === parentId) : null;
  const body = selectedCommit.message.replace(/^\s*\S[^\n]*\n?/, "").trim();
  const authored = new Date(selectedCommit.authorTime * 1000);

  const statParts: string[] = [];
  if (stats.modified) statParts.push(`${stats.modified} modified`);
  if (stats.added) statParts.push(`${stats.added} added`);
  if (stats.deleted) statParts.push(`${stats.deleted} deleted`);

  return (
    <div className="shrink-0 px-4 py-3 border-b overflow-y-auto max-h-[160px]" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="font-mono text-[13px] font-semibold" style={{ color: "var(--accent)" }}>
          {selectedCommit.shortId}
        </span>
      </div>

      <p className="text-[13px] font-medium leading-snug mb-1" style={{ color: "var(--text-primary)" }}>
        {selectedCommit.summary}
      </p>
      {body && (
        <p className="text-[11px] leading-relaxed mb-3 whitespace-pre-wrap" style={{ color: "var(--text-muted)" }}>
          {body}
        </p>
      )}

      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
          style={{ background: "var(--accent-bg)", color: "var(--accent)", border: "1px solid var(--accent-border)" }}
        >
          {selectedCommit.authorName.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="text-[12px] truncate" style={{ color: "var(--text-primary)" }}>{selectedCommit.authorName}</p>
          <p className="text-[10px]" style={{ color: "var(--text-faint)" }}>
            authored {format(authored, "MM/dd/yyyy @ h:mm a")}
          </p>
        </div>
      </div>

      {parentCommit && (
        <button
          type="button"
          onClick={() => selectCommit(parentCommit)}
          className="text-[10px] font-mono mb-2 hover:underline"
          style={{ color: "var(--text-muted)" }}
        >
          parent: {parentCommit.shortId}
        </button>
      )}

      {statParts.length > 0 && (
        <p className="text-[11px] mb-1" style={{ color: "var(--text-secondary)" }}>
          {statParts.join(" · ")}
        </p>
      )}
      <p className="text-[10px]" style={{ color: "var(--text-faint)" }}>Click a file to view diff</p>
    </div>
  );
}

function DiffFileList({ compact }: { compact?: boolean }) {
  const { activeDiffs, selectedDiff, setSelectedDiff } = useRepoStore();

  return (
    <div
      className={`flex flex-col min-h-0 overflow-hidden ${compact ? "shrink-0 max-h-[38%] border-b" : "flex-1"}`}
      style={compact ? { borderColor: "var(--border)" } : undefined}
    >
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: "var(--border)" }}>
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
          Files
        </span>
        <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>{activeDiffs.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {activeDiffs.map((d) => {
          const path = d.newPath ?? d.oldPath ?? "?";
          const filename = path.split("/").pop() ?? path;
          const dir = path.includes("/") ? path.substring(0, path.lastIndexOf("/")) : "";
          const isSelected = selectedDiff === d;
          const kind = diffKind(d);

          return (
            <div
              key={path}
              onClick={() => setSelectedDiff(d)}
              className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer transition-colors"
              style={{
                background: isSelected ? "var(--accent-bg)" : undefined,
                borderLeft: `2px solid ${isSelected ? "var(--accent)" : "transparent"}`,
              }}
              onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "var(--bg-hover)"; }}
              onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = ""; }}
              title={path}
            >
              <IconFileStatus kind={kind === "added" || kind === "deleted" ? kind : "modified"} />
              <div className="flex-1 min-w-0">
                <span className="text-[12px] truncate block" style={{ color: "var(--text-primary)" }}>{filename}</span>
                {dir && <span className="text-[10px] truncate block font-mono" style={{ color: "var(--text-faint)" }}>{dir}/</span>}
              </div>
            </div>
          );
        })}
        {activeDiffs.length === 0 && (
          <p className="px-3 py-4 text-[12px] text-center" style={{ color: "var(--text-faint)" }}>No file changes</p>
        )}
      </div>
    </div>
  );
}

function WorkingTreeCommitForm() {
  const { activeRepoPath, status, commits, branches, refreshLog, refreshStatus, refreshBranches } = useRepoStore();
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [amend, setAmend] = useState(false);
  const [busy, setBusy] = useState(false);

  const headCommit = commits[0] ?? null;
  const stagedCount = status.filter((f) => f.isStaged).length;
  const branchName = openBranchName(branches) ?? "HEAD";
  const fullMessage = joinCommitMessage(summary, description);
  const canSubmit =
    activeRepoPath && fullMessage.trim() && (amend ? !!headCommit : stagedCount > 0);

  const clearMessage = () => {
    setSummary("");
    setDescription("");
  };

  const handleSubmit = async () => {
    if (!activeRepoPath || !canSubmit || busy) return;
    setBusy(true);
    try {
      await git.createCommit(activeRepoPath, fullMessage.trim(), amend);
      clearMessage();
      setAmend(false);
      await Promise.all([refreshLog(), refreshStatus(), refreshBranches()]);
    } catch (e) {
      alert(`${amend ? "Amend" : "Commit"} failed: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  const handleAmendChange = (next: boolean) => {
    setAmend(next);
    if (next && headCommit) {
      const parts = messageFromHeadCommit(headCommit.message);
      setSummary(parts.summary);
      setDescription(parts.description);
    } else if (!next) clearMessage();
  };

  return (
    <CommitComposeSection
      compact
      summary={summary}
      description={description}
      onSummaryChange={setSummary}
      onDescriptionChange={setDescription}
      amend={amend}
      onAmendChange={handleAmendChange}
      headCommit={headCommit}
      branchName={branchName}
      stagedCount={stagedCount}
      canSubmit={!!canSubmit}
      busy={busy}
      onSubmit={() => void handleSubmit()}
    />
  );
}

function WorkingTreePanel() {
  const { activeRepoPath, status, refreshStatus, refreshDiffs, setSelectedDiff, activeDiffs, selectedCommit, selectedDiff } = useRepoStore();
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!selectedCommit) void refreshDiffs();
  }, [status, selectedCommit, refreshDiffs]);

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

  const totalChanges = status.length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-4 py-3 border-b" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
        <p className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>Working changes</p>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
          {totalChanges === 0 ? "Working tree clean" : `${totalChanges} file${totalChanges === 1 ? "" : "s"} changed`}
        </p>
        <p className="text-[10px] mt-2" style={{ color: "var(--text-faint)" }}>Click a file to view diff</p>
      </div>

      <div className="shrink-0 px-3 py-2 border-b" style={{ borderColor: "var(--border)" }}>
        <input
          className="glass-input w-full text-[11px] px-2 py-1 rounded-md"
          placeholder="Filter files…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="shrink-0">
        <div className="flex items-center justify-between px-3 pt-2 pb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
            Staged ({staged.length})
          </span>
          {status.filter((f) => !f.isStaged).length > 0 && (
            <button
              onClick={handleStageAll}
              className="text-[10px] px-2 py-0.5 rounded"
              style={{ color: "var(--accent)", background: "var(--accent-bg)", border: "1px solid var(--accent-border)" }}
            >
              Stage all
            </button>
          )}
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: 140 }}>
          {staged.map((f) => {
            const s = f.status[0] ?? "untracked";
            const cfg = STATUS_CONFIG[s] ?? STATUS_CONFIG.untracked;
            return (
              <WorkingFileRow
                key={f.path}
                path={f.path}
                badge={cfg.label}
                actionTitle="Unstage"
                onAction={() => handleUnstage(f.path)}
                onClick={() => handleFileClick(f.path)}
              />
            );
          })}
        </div>
      </div>

      <div className="shrink-0 mx-3 my-1" style={{ height: 1, background: "var(--border)" }} />

      <div className={`flex flex-col min-h-0 ${selectedDiff ? "shrink-0 max-h-[32%]" : "flex-1"}`}>
        <div className="shrink-0 px-3 pt-1 pb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
            Unstaged ({unstaged.length})
          </span>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {unstaged.map((f) => {
            const s = f.status[0] ?? "untracked";
            const cfg = STATUS_CONFIG[s] ?? STATUS_CONFIG.untracked;
            return (
              <WorkingFileRow
                key={f.path}
                path={f.path}
                badge={cfg.label}
                actionTitle="Stage"
                onAction={() => handleStage(f.path)}
                onClick={() => handleFileClick(f.path)}
              />
            );
          })}
        </div>
      </div>

      <CommitDiffPane />
    </div>
  );
}

function CommitDiffPane() {
  const { selectedDiff, setSelectedDiff } = useRepoStore();
  const openCenterFileView = useUIStore((s) => s.openCenterFileView);
  if (!selectedDiff) return null;
  return (
    <div className="flex flex-col flex-1 min-h-[140px] border-t overflow-hidden" style={{ borderColor: "var(--border)" }}>
      <DiffViewer
        variant="panel"
        onCollapse={() => setSelectedDiff(null)}
        onRequestBlameFullscreen={() => openCenterFileView("blame")}
      />
    </div>
  );
}

function WorkingFileRow({
  path,
  badge,
  actionTitle,
  onAction,
  onClick,
}: {
  path: string;
  badge: string;
  actionTitle: string;
  onAction: () => void;
  onClick: () => void;
}) {
  const filename = path.split("/").pop() ?? path;
  const dir = path.includes("/") ? path.substring(0, path.lastIndexOf("/")) : "";

  return (
    <div
      className="flex items-center gap-2 px-3 py-1 hover:bg-[color:var(--bg-hover)] group cursor-pointer"
      onClick={onClick}
    >
      <IconFileStatus kind={statusToFileKind(badge === "A" ? "added" : badge === "D" ? "deleted" : badge === "R" ? "renamed" : badge === "!" ? "conflicted" : badge === "?" ? "untracked" : "modified")} />
      <div className="flex-1 min-w-0">
        <span className="text-[12px] truncate block" style={{ color: "var(--text-secondary)" }}>{filename}</span>
        {dir && <span className="text-[10px] truncate block" style={{ color: "var(--text-faint)" }}>{dir}/</span>}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onAction(); }}
        title={actionTitle}
        className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-[10px]"
        style={{ color: "var(--text-muted)" }}
      >
        {actionTitle === "Stage" ? "↑" : "↓"}
      </button>
    </div>
  );
}

export function ChangesPanel() {
  const { selectedCommit, selectedDiff } = useRepoStore();

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--bg-base)" }}>
      <MergeConflictResolver />
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {selectedCommit ? (
          <>
            <CommitHeader />
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <DiffFileList compact={!!selectedDiff} />
              <CommitDiffPane />
            </div>
          </>
        ) : (
          <WorkingTreePanel />
        )}
      </div>
      <WorkingTreeCommitForm />
    </div>
  );
}
