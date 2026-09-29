import { useEffect, useState } from "react";
import { git } from "../../ipc/git";
import { validateTagName } from "../../lib/tagName";
import { useRepoStore } from "../../store/repoStore";
import { useUIStore } from "../../store/uiStore";

export function CreateTagDialog() {
  const { activeRepoPath, refreshTags } = useRepoStore();
  const { isCreateTagDialogOpen, createTagTarget, closeCreateTagDialog } = useUIStore();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isCreateTagDialogOpen) return;
    setName("");
    setMessage("");
    setError("");
  }, [isCreateTagDialogOpen, createTagTarget?.commitId]);

  if (!isCreateTagDialogOpen || !createTagTarget || !activeRepoPath) return null;

  const handleCreate = async () => {
    const validation = validateTagName(name);
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const trimmedMessage = message.trim();
      await git.createTag(
        activeRepoPath,
        name.trim(),
        createTagTarget.commitId,
        trimmedMessage || undefined,
      );
      await refreshTags();
      closeCreateTagDialog();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-panel w-[440px] p-6">
        <div className="relative z-10 space-y-4">
          <h2 className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
            Create tag
          </h2>
          <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            On commit{" "}
            <span className="font-mono" style={{ color: "var(--accent)" }}>
              {createTagTarget.shortId}
            </span>
            {createTagTarget.summary ? ` — ${createTagTarget.summary}` : ""}
          </p>
          <div>
            <label className="section-header px-0 py-0 mb-1.5 block">Tag name</label>
            <input
              className="glass-input w-full"
              placeholder="v1.0.0"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleCreate()}
              autoFocus
            />
          </div>
          <div>
            <label className="section-header px-0 py-0 mb-1.5 block">
              Annotated message (optional)
            </label>
            <textarea
              className="glass-input w-full min-h-[72px] resize-y text-[13px]"
              placeholder="Leave empty for a lightweight tag"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          {error && (
            <p className="text-[12px]" style={{ color: "rgba(239,68,68,0.9)" }}>
              {error}
            </p>
          )}
          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              disabled={busy}
              className="glass-btn px-5 py-2 rounded-lg"
              onClick={closeCreateTagDialog}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              className="glass-btn glass-btn-accent px-5 py-2 rounded-lg"
              onClick={() => void handleCreate()}
            >
              Create tag
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
