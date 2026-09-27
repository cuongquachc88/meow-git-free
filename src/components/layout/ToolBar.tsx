import { useRepoStore } from "../../store/repoStore";
import { useUIStore } from "../../store/uiStore";
import { git } from "../../ipc/git";

export function ToolBar() {
  const { activeRepoPath, refreshLog, refreshBranches, refreshStatus } = useRepoStore();
  const { openCommitDialog, openBranchDialog } = useUIStore();

  const handleFetch = async () => {
    if (!activeRepoPath) return;
    try {
      await git.fetchRemote(activeRepoPath, "origin");
      await refreshLog();
    } catch (e) {
      alert(`Fetch failed: ${e}`);
    }
  };

  const handleRefresh = async () => {
    if (!activeRepoPath) return;
    await Promise.all([refreshLog(), refreshBranches(), refreshStatus()]);
  };

  return (
    <header className="h-10 bg-gray-800 border-b border-gray-700 flex items-center px-3 gap-2 text-sm text-gray-300">
      <button
        disabled={!activeRepoPath}
        onClick={handleFetch}
        className="px-3 py-1 rounded hover:bg-gray-700 disabled:opacity-40"
        title="Fetch"
      >
        ↓ Fetch
      </button>
      <button
        disabled={!activeRepoPath}
        onClick={openBranchDialog}
        className="px-3 py-1 rounded hover:bg-gray-700 disabled:opacity-40"
        title="New Branch"
      >
        ⎇ Branch
      </button>
      <button
        disabled={!activeRepoPath}
        onClick={openCommitDialog}
        className="px-3 py-1 rounded hover:bg-gray-700 disabled:opacity-40"
        title="Commit"
      >
        ✓ Commit
      </button>
      <div className="flex-1" />
      <button
        disabled={!activeRepoPath}
        onClick={handleRefresh}
        className="px-2 py-1 rounded hover:bg-gray-700 disabled:opacity-40"
        title="Refresh"
      >
        ⟳
      </button>
    </header>
  );
}
