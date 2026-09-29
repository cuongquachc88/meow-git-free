import { useState } from "react";
import { useAccountStore } from "../../store/accountStore";
import { deleteTagFromOrigin } from "../../lib/pushTag";
import { describeSyncError } from "../../lib/syncRemote";
import { validateTagName } from "../../lib/tagName";
import { useRepoStore } from "../../store/repoStore";
import { useUIStore } from "../../store/uiStore";

/** Delete a tag on origin by name (e.g. not fetched locally). */
export function DeleteRemoteTagDialog() {
  const { activeRepoPath, refreshTags, refreshLog } = useRepoStore();
  const { isDeleteRemoteTagDialogOpen, closeDeleteRemoteTagDialog } = useUIStore();
  const getAccountForRepo = useAccountStore((s) => s.getAccountForRepo);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!isDeleteRemoteTagDialogOpen || !activeRepoPath) return null;

  const handleDelete = async () => {
    const trimmed = name.trim();
    const invalid = validateTagName(trimmed);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (
      !window.confirm(
        `Delete tag "${trimmed}" on origin? This does not remove a local tag unless you delete it separately.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await deleteTagFromOrigin(activeRepoPath, trimmed, getAccountForRepo);
      await Promise.all([refreshTags(), refreshLog()]);
      setName("");
      closeDeleteRemoteTagDialog();
    } catch (e) {
      setError(describeSyncError(e) ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-panel w-[420px] p-6">
        <div className="relative z-10 flex flex-col gap-4">
          <h2 className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
            Delete tag on origin
          </h2>
          <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            For tags that exist only on the remote (or before Fetch). HTTPS needs a saved PAT.
          </p>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            placeholder="e.g. v1.0.0"
            disabled={busy}
            className="glass-input w-full px-3 py-2 rounded-lg text-[13px] font-mono"
            autoFocus
          />
          {error && (
            <p className="text-[12px]" style={{ color: "rgba(239,68,68,0.9)" }}>
              {error}
            </p>
          )}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              disabled={busy}
              className="glass-btn px-5 py-2 rounded-lg"
              onClick={() => {
                setName("");
                setError("");
                closeDeleteRemoteTagDialog();
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || !name.trim()}
              className="glass-btn px-5 py-2 rounded-lg"
              style={{ color: "rgba(239,68,68,0.9)" }}
              onClick={() => void handleDelete()}
            >
              Delete on origin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
