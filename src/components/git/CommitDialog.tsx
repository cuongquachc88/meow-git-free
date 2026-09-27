import { useEffect, useState } from "react";
import { useRepoStore } from "../../store/repoStore";
import { useUIStore } from "../../store/uiStore";
import { git } from "../../ipc/git";
import { openBranchName } from "../../lib/headBranch";
import { CommitMessageFields, joinCommitMessage, messageFromHeadCommit } from "./CommitMessageFields";

export function CommitDialog() {
  const { activeRepoPath, refreshLog, refreshStatus, refreshBranches, status, commits, branches } = useRepoStore();
  const { isCommitDialogOpen, closeCommitDialog } = useUIStore();
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [amend, setAmend] = useState(false);

  const headCommit = commits[0] ?? null;
  const staged = status.filter((f) => f.isStaged);
  const fullMessage = joinCommitMessage(summary, description);

  useEffect(() => {
    if (!isCommitDialogOpen) return;
    setAmend(false);
    setSummary("");
    setDescription("");
  }, [isCommitDialogOpen]);

  if (!isCommitDialogOpen) return null;

  const canSubmit = fullMessage.trim() && (amend ? !!headCommit : staged.length > 0);

  const handleCommit = async () => {
    if (!activeRepoPath || !canSubmit) return;
    try {
      await git.createCommit(activeRepoPath, fullMessage.trim(), amend);
      setSummary("");
      setDescription("");
      setAmend(false);
      closeCommitDialog();
      await Promise.all([refreshLog(), refreshStatus(), refreshBranches()]);
    } catch (e) {
      alert(`${amend ? "Amend" : "Commit"} failed: ${e}`);
    }
  };

  const branchName = openBranchName(branches) ?? "HEAD";

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-panel w-[520px] p-6">
        <div className="relative z-10">
          <h2 className="text-[15px] font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            Commit changes
          </h2>
          <p className="text-[12px] mb-4" style={{ color: "var(--text-muted)" }}>
            {amend && headCommit
              ? `Amending ${headCommit.shortId} on ${branchName}`
              : `${staged.length} file${staged.length !== 1 ? "s" : ""} staged`}
          </p>

          {staged.length > 0 && (
            <div className="mb-4 max-h-28 overflow-y-auto space-y-1">
              {staged.map((f) => (
                <div key={f.path} className="flex items-center gap-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
                  <span style={{ color: "var(--accent)" }}>+</span>
                  <span className="font-mono truncate">{f.path}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mb-3">
            <CommitMessageFields
              summary={summary}
              description={description}
              onSummaryChange={setSummary}
              onDescriptionChange={setDescription}
              onSubmit={() => void handleCommit()}
              canSubmit={!!canSubmit}
            />
          </div>

          <label className="flex items-center gap-2 mb-4 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={amend}
              onChange={(e) => {
                const next = e.target.checked;
                setAmend(next);
                if (next && headCommit) {
                  const parts = messageFromHeadCommit(headCommit.message);
                  setSummary(parts.summary);
                  setDescription(parts.description);
                } else if (!next) {
                  setSummary("");
                  setDescription("");
                }
              }}
              disabled={!headCommit}
            />
            <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
              Amend previous commit
            </span>
          </label>

          {!headCommit && (
            <p className="text-[10px] mb-3 -mt-2" style={{ color: "var(--text-faint)" }}>
              No commit on this branch yet — amend unavailable.
            </p>
          )}

          <p className="text-[10px] mb-4" style={{ color: "var(--text-faint)" }}>
            ⌘↩ to {amend ? "amend" : "commit"}
          </p>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeCommitDialog} className="glass-btn px-5 py-2 rounded-lg">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleCommit()}
              disabled={!canSubmit}
              className="glass-btn glass-btn-accent px-5 py-2 rounded-lg"
            >
              {amend ? `Amend on ${branchName}` : `Commit to ${branchName}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
