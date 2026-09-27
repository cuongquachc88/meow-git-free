import { useState } from "react";
import { useRepoStore } from "../../store/repoStore";
import { useUIStore } from "../../store/uiStore";
import { git } from "../../ipc/git";

export function CommitDialog() {
  const { activeRepoPath, refreshLog, refreshStatus, status } = useRepoStore();
  const { isCommitDialogOpen, closeCommitDialog } = useUIStore();
  const [message, setMessage] = useState("");

  if (!isCommitDialogOpen) return null;

  const staged = status.filter((f) => f.isStaged);

  const handleCommit = async () => {
    if (!activeRepoPath || !message.trim()) return;
    try {
      await git.createCommit(activeRepoPath, message.trim());
      setMessage("");
      closeCommitDialog();
      await Promise.all([refreshLog(), refreshStatus()]);
    } catch (e) {
      alert(`Commit failed: ${e}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-[500px] p-5 shadow-xl border border-gray-600">
        <h2 className="text-white font-semibold mb-3">Commit Changes</h2>
        <p className="text-sm text-gray-400 mb-3">{staged.length} file(s) staged</p>
        <textarea
          className="w-full bg-gray-900 text-white rounded p-2 text-sm font-mono resize-none border border-gray-600 focus:outline-none focus:border-blue-500"
          rows={4}
          placeholder="Commit message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          autoFocus
        />
        <div className="flex justify-end gap-2 mt-3">
          <button
            onClick={closeCommitDialog}
            className="px-4 py-1.5 rounded text-sm text-gray-300 hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleCommit}
            disabled={!message.trim() || staged.length === 0}
            className="px-4 py-1.5 rounded text-sm bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40"
          >
            Commit
          </button>
        </div>
      </div>
    </div>
  );
}
