import { useEffect, useState } from "react";
import { useRepoStore } from "../../store/repoStore";
import { git } from "../../ipc/git";
import type { ConflictFile } from "../../types/git";

export function MergeConflictResolver() {
  const { activeRepoPath, refreshStatus, refreshLog } = useRepoStore();
  const [conflicts, setConflicts] = useState<ConflictFile[]>([]);

  const load = async () => {
    if (!activeRepoPath) return;
    try {
      setConflicts(await git.getConflicts(activeRepoPath));
    } catch {
      setConflicts([]);
    }
  };

  useEffect(() => { load(); }, [activeRepoPath]);

  const handleAbort = async () => {
    if (!activeRepoPath) return;
    try {
      await git.abortMerge(activeRepoPath);
      await Promise.all([load(), refreshStatus(), refreshLog()]);
    } catch (e) {
      alert(`Abort merge failed: ${e}`);
    }
  };

  if (conflicts.length === 0) return null;

  return (
    <div className="border border-git-conflict rounded-lg m-3 p-3 bg-orange-950/30">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-orange-400 uppercase">
          ⚠ Merge Conflicts ({conflicts.length})
        </p>
        <button
          onClick={handleAbort}
          className="text-xs text-red-400 hover:text-red-300 border border-red-800 rounded px-2 py-0.5"
        >
          Abort Merge
        </button>
      </div>
      <div className="space-y-1">
        {conflicts.map((c) => (
          <div key={c.path} className="flex items-center gap-2 text-xs bg-gray-900 rounded px-2 py-1">
            <span className="text-orange-400">!</span>
            <span className="font-mono text-gray-300 truncate">{c.path}</span>
            <span className="text-gray-500 ml-auto">Open in editor to resolve</span>
          </div>
        ))}
      </div>
    </div>
  );
}
