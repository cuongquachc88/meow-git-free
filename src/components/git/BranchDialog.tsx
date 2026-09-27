import { useEffect, useMemo, useState } from "react";
import { useRepoStore } from "../../store/repoStore";
import { useUIStore } from "../../store/uiStore";
import { git } from "../../ipc/git";

export function BranchDialog() {
  const { activeRepoPath, setActiveRepo, branches } = useRepoStore();
  const { isBranchDialogOpen, branchDialogFromRef, closeBranchDialog } = useUIStore();
  const [name, setName] = useState("");
  const [fromRef, setFromRef] = useState("");
  const [checkoutAfter, setCheckoutAfter] = useState(true);
  const [busy, setBusy] = useState(false);

  const localBranches = useMemo(
    () => branches.filter((b) => b.kind === "Local"),
    [branches],
  );
  const headBranch = localBranches.find((b) => b.isHead)?.name ?? "HEAD";

  useEffect(() => {
    if (!isBranchDialogOpen) return;
    setName("");
    setFromRef(branchDialogFromRef ?? headBranch);
    setCheckoutAfter(true);
  }, [isBranchDialogOpen, headBranch, branchDialogFromRef]);

  if (!isBranchDialogOpen) return null;

  const handleCreate = async () => {
    if (!activeRepoPath || !name.trim()) return;
    setBusy(true);
    try {
      await git.createBranch(activeRepoPath, name.trim(), fromRef || undefined);
      if (checkoutAfter) {
        await git.checkoutBranch(activeRepoPath, name.trim());
      }
      closeBranchDialog();
      setName("");
      await setActiveRepo(activeRepoPath);
    } catch (e) {
      alert(`Failed: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-panel w-[440px] p-6">
        <div className="relative z-10">
          <h2 className="text-[15px] font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            Create branch
          </h2>
          <p className="text-[12px] mb-4" style={{ color: "var(--text-muted)" }}>
            New branch from a commit or existing branch tip.
          </p>

          <label className="block mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
              Branch name
            </span>
            <input
              autoFocus
              className="glass-input mt-1 w-full"
              placeholder="feature/my-change"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !busy && handleCreate()}
            />
          </label>

          <label className="block mb-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
              Create from
            </span>
            <select
              className="glass-input mt-1 w-full text-[13px]"
              value={fromRef}
              onChange={(e) => setFromRef(e.target.value)}
            >
              {localBranches.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name}
                  {b.isHead ? " (HEAD)" : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 mb-5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={checkoutAfter}
              onChange={(e) => setCheckoutAfter(e.target.checked)}
              className="rounded"
            />
            <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
              Checkout new branch after create
            </span>
          </label>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeBranchDialog} disabled={busy} className="glass-btn px-5 py-2 rounded-lg">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={!name.trim() || busy}
              className="glass-btn glass-btn-accent px-5 py-2 rounded-lg"
            >
              {busy ? "Creating…" : checkoutAfter ? "Create & checkout" : "Create branch"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
