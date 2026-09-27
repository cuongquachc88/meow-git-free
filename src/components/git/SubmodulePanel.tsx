import { useEffect, useState } from "react";
import { useRepoStore } from "../../store/repoStore";
import { git } from "../../ipc/git";
import type { SubmoduleInfo } from "../../types/git";

export function SubmodulePanel() {
  const { activeRepoPath } = useRepoStore();
  const [submodules, setSubmodules] = useState<SubmoduleInfo[]>([]);

  useEffect(() => {
    if (!activeRepoPath) return;
    git.listSubmodules(activeRepoPath).then(setSubmodules).catch(() => setSubmodules([]));
  }, [activeRepoPath]);

  const handleUpdate = async () => {
    if (!activeRepoPath) return;
    try {
      await git.updateSubmodules(activeRepoPath);
      const list = await git.listSubmodules(activeRepoPath);
      setSubmodules(list);
    } catch (e) {
      alert(`Update submodules failed: ${e}`);
    }
  };

  if (submodules.length === 0) return null;

  return (
    <div className="p-3 space-y-2 text-sm text-gray-300">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase">Submodules ({submodules.length})</p>
        <button onClick={handleUpdate} className="text-xs text-blue-400 hover:text-blue-300">Update All</button>
      </div>
      {submodules.map((s) => (
        <div key={s.name} className="bg-gray-800 rounded px-2 py-1.5">
          <p className="text-xs font-mono">{s.path}</p>
          {s.url && <p className="text-xs text-gray-500 truncate">{s.url}</p>}
        </div>
      ))}
    </div>
  );
}
