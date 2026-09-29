import { useEffect, useMemo, useState } from "react";
import { useAccountStore } from "../../store/accountStore";
import { deleteTagFromOrigin } from "../../lib/pushTag";
import { describeSyncError } from "../../lib/syncRemote";
import { git } from "../../ipc/git";
import { useRepoStore } from "../../store/repoStore";
import { useUIStore } from "../../store/uiStore";

export function DeleteTagsDialog() {
  const { activeRepoPath, tags, refreshTags, refreshLog } = useRepoStore();
  const { isDeleteTagsDialogOpen, deleteTagsTargetCommitId, closeDeleteTagsDialog } = useUIStore();
  const getAccountForRepo = useAccountStore((s) => s.getAccountForRepo);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteLocal, setDeleteLocal] = useState(true);
  const [deleteOrigin, setDeleteOrigin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const commitTags = useMemo(() => {
    if (!deleteTagsTargetCommitId) return [];
    return tags.filter((t) => t.targetId === deleteTagsTargetCommitId);
  }, [tags, deleteTagsTargetCommitId]);

  useEffect(() => {
    if (!isDeleteTagsDialogOpen) return;
    setSelected(new Set(commitTags.map((t) => t.name)));
    setDeleteLocal(true);
    setDeleteOrigin(false);
    setError("");
  }, [isDeleteTagsDialogOpen, deleteTagsTargetCommitId, commitTags]);

  if (!isDeleteTagsDialogOpen || !activeRepoPath || !deleteTagsTargetCommitId) return null;

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleDelete = async () => {
    const names = [...selected];
    if (names.length === 0) {
      setError("Select at least one tag");
      return;
    }
    if (!deleteLocal && !deleteOrigin) {
      setError("Choose local and/or origin");
      return;
    }
    const parts: string[] = [];
    if (deleteLocal) parts.push("locally");
    if (deleteOrigin) parts.push("on origin");
    if (
      !window.confirm(`Delete ${names.length} tag(s) ${parts.join(" and ")}?`)
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      for (const name of names) {
        if (deleteOrigin) {
          await deleteTagFromOrigin(activeRepoPath, name, getAccountForRepo);
        }
        if (deleteLocal) {
          try {
            await git.deleteTag(activeRepoPath, name);
          } catch (e) {
            const msg = String(e);
            if (!deleteOrigin || !/not found|cannot locate/i.test(msg)) {
              throw e;
            }
          }
        }
      }
      await Promise.all([refreshTags(), refreshLog()]);
      closeDeleteTagsDialog();
    } catch (e) {
      setError(describeSyncError(e) ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-panel w-[440px] p-6 max-h-[80vh] flex flex-col">
        <div className="relative z-10 flex flex-col min-h-0 gap-4">
          <h2 className="text-[15px] font-semibold shrink-0" style={{ color: "var(--text-primary)" }}>
            Delete tags
          </h2>
          <div className="flex flex-col gap-2 text-[12px]" style={{ color: "var(--text-muted)" }}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={deleteLocal}
                onChange={(e) => setDeleteLocal(e.target.checked)}
                disabled={busy}
              />
              Remove locally
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={deleteOrigin}
                onChange={(e) => setDeleteOrigin(e.target.checked)}
                disabled={busy}
              />
              Remove from origin (HTTPS needs PAT)
            </label>
          </div>
          {commitTags.length === 0 ? (
            <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
              No tags on this commit.
            </p>
          ) : (
            <ul className="overflow-y-auto min-h-0 space-y-1 pr-1">
              {commitTags.map((t) => (
                <li key={t.name}>
                  <label
                    className="flex items-center gap-2.5 px-2 py-2 rounded-lg cursor-pointer"
                    style={{ background: "var(--bg-surface)" }}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(t.name)}
                      onChange={() => toggle(t.name)}
                      disabled={busy}
                    />
                    <span className="font-mono text-[12px]" style={{ color: "var(--accent)" }}>
                      {t.name}
                    </span>
                    {!t.local && t.onOrigin && (
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        origin only
                      </span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          )}
          {error && (
            <p className="text-[12px] shrink-0" style={{ color: "rgba(239,68,68,0.9)" }}>
              {error}
            </p>
          )}
          <div className="flex gap-2 justify-end pt-1 shrink-0">
            <button
              type="button"
              disabled={busy}
              className="glass-btn px-5 py-2 rounded-lg"
              onClick={closeDeleteTagsDialog}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || commitTags.length === 0}
              className="glass-btn px-5 py-2 rounded-lg"
              style={{ color: "rgba(239,68,68,0.9)" }}
              onClick={() => void handleDelete()}
            >
              Delete selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
