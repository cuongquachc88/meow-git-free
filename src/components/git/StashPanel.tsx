import { useEffect, useState } from "react";
import { useRepoStore } from "../../store/repoStore";
import { git } from "../../ipc/git";
import type { StashEntry } from "../../types/git";

export function StashPanel() {
  const { activeRepoPath, refreshStatus, refreshLog } = useRepoStore();
  const [stashes, setStashes] = useState<StashEntry[]>([]);
  const [message, setMessage] = useState("");

  const load = async () => {
    if (!activeRepoPath) return;
    try {
      const list = await git.listStashes(activeRepoPath);
      setStashes(list);
    } catch {
      setStashes([]);
    }
  };

  useEffect(() => { load(); }, [activeRepoPath]);

  const handleSave = async () => {
    if (!activeRepoPath) return;
    try {
      await git.saveStash(activeRepoPath, message || undefined);
      setMessage("");
      await Promise.all([load(), refreshStatus()]);
    } catch (e) {
      alert(`Stash failed: ${e}`);
    }
  };

  const handlePop = async (index: number) => {
    if (!activeRepoPath) return;
    try {
      await git.popStash(activeRepoPath, index);
      await Promise.all([load(), refreshStatus(), refreshLog()]);
    } catch (e) {
      alert(`Pop stash failed: ${e}`);
    }
  };

  const handleDrop = async (index: number) => {
    if (!activeRepoPath) return;
    try {
      await git.dropStash(activeRepoPath, index);
      await load();
    } catch (e) {
      alert(`Drop stash failed: ${e}`);
    }
  };

  return (
    <div className="p-3 space-y-3 text-sm text-gray-300">
      <p className="text-xs font-semibold text-gray-500 uppercase">Stashes ({stashes.length})</p>

      <div className="flex gap-2">
        <input
          className="flex-1 bg-gray-900 text-white rounded p-1.5 text-xs border border-gray-600 focus:outline-none"
          placeholder="Stash message (optional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button
          onClick={handleSave}
          disabled={!activeRepoPath}
          className="px-3 py-1 rounded text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-40"
        >
          Save
        </button>
      </div>

      <div className="space-y-1">
        {stashes.map((s) => (
          <div key={s.index} className="flex items-center bg-gray-800 rounded px-2 py-1.5 gap-2">
            <span className="text-gray-500 text-xs w-5">#{s.index}</span>
            <span className="flex-1 truncate text-xs">{s.message}</span>
            <button onClick={() => handlePop(s.index)} className="text-green-400 hover:text-green-300 text-xs">Pop</button>
            <button onClick={() => handleDrop(s.index)} className="text-red-400 hover:text-red-300 text-xs">Drop</button>
          </div>
        ))}
        {stashes.length === 0 && (
          <p className="text-xs text-gray-600 text-center py-2">No stashes</p>
        )}
      </div>
    </div>
  );
}
