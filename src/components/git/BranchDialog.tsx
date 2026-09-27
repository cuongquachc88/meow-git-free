import { useState } from "react";
import { useRepoStore } from "../../store/repoStore";
import { useUIStore } from "../../store/uiStore";
import { git } from "../../ipc/git";

export function BranchDialog() {
  const { activeRepoPath, setActiveRepo } = useRepoStore();
  const { isBranchDialogOpen, closeBranchDialog } = useUIStore();
  const [name, setName] = useState("");

  if (!isBranchDialogOpen) return null;

  const handleCreate = async () => {
    if (!activeRepoPath || !name.trim()) return;
    try {
      await git.createBranch(activeRepoPath, name.trim());
      await git.checkoutBranch(activeRepoPath, name.trim());
      closeBranchDialog();
      setName("");
      await setActiveRepo(activeRepoPath);
    } catch (e) {
      alert(`Failed to create branch: ${e}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-[400px] p-5 shadow-xl border border-gray-600">
        <h2 className="text-white font-semibold mb-4">Create Branch</h2>
        <input
          autoFocus
          className="w-full bg-gray-900 text-white rounded p-2 text-sm border border-gray-600 focus:outline-none focus:border-blue-500"
          placeholder="Branch name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={closeBranchDialog} className="px-4 py-1.5 rounded text-sm text-gray-300 hover:bg-gray-700">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="px-4 py-1.5 rounded text-sm bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40"
          >
            Create & Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
