import { useEffect, useMemo, useState } from "react";
import { useAccountStore } from "../../store/accountStore";
import { pushTagToOrigin } from "../../lib/pushTag";
import { describeSyncError } from "../../lib/syncRemote";
import { showSyncToast } from "../../lib/syncToast";
import { useRepoStore } from "../../store/repoStore";
import { useUIStore } from "../../store/uiStore";

export function PushTagsDialog() {
  const { activeRepoPath, tags, refreshTags } = useRepoStore();
  const { isPushTagsDialogOpen, pushTagsTargetCommitId, closePushTagsDialog } = useUIStore();
  const getAccountForRepo = useAccountStore((s) => s.getAccountForRepo);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const commitTags = useMemo(() => {
    if (!pushTagsTargetCommitId) return [];
    return tags.filter((t) => t.targetId === pushTagsTargetCommitId && t.local);
  }, [tags, pushTagsTargetCommitId]);

  useEffect(() => {
    if (!isPushTagsDialogOpen) return;
    setSelected(new Set(commitTags.map((t) => t.name)));
    setError("");
  }, [isPushTagsDialogOpen, pushTagsTargetCommitId, commitTags]);

  if (!isPushTagsDialogOpen || !activeRepoPath || !pushTagsTargetCommitId) return null;

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handlePush = async () => {
    const names = [...selected];
    if (names.length === 0) {
      setError("Select at least one tag");
      return;
    }
    setBusy(true);
    setError("");
    showSyncToast(`Pushing ${names.length} tag(s)…`, "busy");
    try {
      for (const tagName of names) {
        await pushTagToOrigin(activeRepoPath, tagName, getAccountForRepo);
      }
      await refreshTags();
      showSyncToast("Tags pushed to origin", "ok");
      closePushTagsDialog();
    } catch (e) {
      const msg = describeSyncError(e);
      showSyncToast("Push tag failed", "err");
      setError(msg ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-panel w-[440px] p-6 max-h-[80vh] flex flex-col">
        <div className="relative z-10 flex flex-col min-h-0 gap-4">
          <h2 className="text-[15px] font-semibold shrink-0" style={{ color: "var(--text-primary)" }}>
            Push tags to origin
          </h2>
          {commitTags.length === 0 ? (
            <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
              No local tags on this commit.
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
                    {t.message && (
                      <span className="text-[11px] truncate flex-1" style={{ color: "var(--text-muted)" }}>
                        {t.message.split("\n")[0]}
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
              onClick={closePushTagsDialog}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || commitTags.length === 0}
              className="glass-btn glass-btn-accent px-5 py-2 rounded-lg"
              onClick={() => void handlePush()}
            >
              Push selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
