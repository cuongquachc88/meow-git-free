import { useEffect, useMemo, useState } from "react";
import { useRepoStore } from "../../store/repoStore";
import { useUIStore } from "../../store/uiStore";
import { git } from "../../ipc/git";

export function MergeDialog() {
  const { activeRepoPath, setActiveRepo, branches, refreshStatus, refreshLog } = useRepoStore();
  const { isMergeDialogOpen, mergeDialogSource, closeMergeDialog } = useUIStore();
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);

  const localBranches = useMemo(
    () => branches.filter((b) => b.kind === "Local"),
    [branches],
  );

  const headBranch = localBranches.find((b) => b.isHead)?.name ?? "";

  useEffect(() => {
    if (!isMergeDialogOpen) return;
    const other = localBranches.find((b) => !b.isHead);
    setTarget(headBranch);
    setSource(mergeDialogSource ?? other?.name ?? localBranches[0]?.name ?? "");
  }, [isMergeDialogOpen, headBranch, localBranches, mergeDialogSource]);

  if (!isMergeDialogOpen) return null;

  const canMerge =
    activeRepoPath &&
    source &&
    target &&
    source !== target &&
    localBranches.some((b) => b.name === source) &&
    localBranches.some((b) => b.name === target);

  const handleMerge = async () => {
    if (!activeRepoPath || !canMerge) return;
    setBusy(true);
    try {
      if (target !== headBranch) {
        await git.checkoutBranch(activeRepoPath, target);
      }
      const clean = await git.mergeBranch(activeRepoPath, source);
      await setActiveRepo(activeRepoPath);
      await Promise.all([refreshLog(), refreshStatus()]);
      closeMergeDialog();
      if (!clean) {
        alert("Merge stopped: resolve conflicts in the panel, then commit.");
      }
    } catch (e) {
      alert(`Merge failed: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-panel w-[440px] p-6">
        <div className="relative z-10">
          <h2 className="text-[15px] font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            Merge branches
          </h2>
          <p className="text-[12px] mb-4" style={{ color: "var(--text-muted)" }}>
            Changes from the source branch are merged into the target branch.
          </p>

          <label className="block mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
              Source (merge from)
            </span>
            <select
              className="glass-input mt-1 w-full text-[13px]"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              {localBranches.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name}
                  {b.isHead ? " (current)" : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="block mb-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
              Target (merge into)
            </span>
            <select
              className="glass-input mt-1 w-full text-[13px]"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              {localBranches.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name}
                  {b.isHead ? " (current)" : ""}
                </option>
              ))}
            </select>
          </label>

          {source && target && source === target && (
            <p className="text-[11px] mb-3" style={{ color: "rgba(251,146,60,0.9)" }}>
              Choose two different branches.
            </p>
          )}

          {source && target && source !== target && (
            <p className="text-[11px] mb-4 font-mono" style={{ color: "var(--text-secondary)" }}>
              {source} → {target}
              {target !== headBranch ? " (will checkout target first)" : ""}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeMergeDialog}
              disabled={busy}
              className="glass-btn px-5 py-2 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleMerge()}
              disabled={!canMerge || busy}
              className="glass-btn glass-btn-accent px-5 py-2 rounded-lg"
            >
              {busy ? "Merging…" : "Merge"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
