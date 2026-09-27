import { useRepoStore } from "../../store/repoStore";
import { git } from "../../ipc/git";

export function FilesPanel() {
  const { activeRepoPath, status, refreshStatus } = useRepoStore();

  const staged = status.filter((f) => f.isStaged);
  const unstaged = status.filter((f) => !f.isStaged);

  const handleStage = async (file: string) => {
    if (!activeRepoPath) return;
    await git.stageFile(activeRepoPath, file);
    await refreshStatus();
  };

  const handleUnstage = async (file: string) => {
    if (!activeRepoPath) return;
    await git.unstageFile(activeRepoPath, file);
    await refreshStatus();
  };

  const handleStageAll = async () => {
    if (!activeRepoPath) return;
    await git.stageAll(activeRepoPath);
    await refreshStatus();
  };

  const statusIcon = (s: string[]) => {
    if (s.includes("added")) return <span className="text-git-add">A</span>;
    if (s.includes("deleted")) return <span className="text-red-500">D</span>;
    if (s.includes("modified")) return <span className="text-git-modify">M</span>;
    if (s.includes("renamed")) return <span className="text-git-rename">R</span>;
    if (s.includes("conflicted")) return <span className="text-git-conflict">!</span>;
    if (s.includes("untracked")) return <span className="text-gray-500">?</span>;
    return null;
  };

  return (
    <div className="flex flex-col h-full text-sm text-gray-300 bg-gray-900">
      <div className="p-2 border-b border-gray-700 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase">Staged ({staged.length})</span>
        <button
          onClick={handleStageAll}
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          Stage All
        </button>
      </div>
      <div className="overflow-y-auto flex-1 max-h-48">
        {staged.map((f) => (
          <div key={f.path} className="flex items-center px-3 py-1 hover:bg-gray-800 gap-2">
            {statusIcon(f.status)}
            <span className="flex-1 truncate text-xs">{f.path}</span>
            <button onClick={() => handleUnstage(f.path)} className="text-gray-500 hover:text-white text-xs">−</button>
          </div>
        ))}
      </div>

      <div className="p-2 border-b border-t border-gray-700">
        <span className="text-xs font-semibold text-gray-500 uppercase">Unstaged ({unstaged.length})</span>
      </div>
      <div className="overflow-y-auto flex-1">
        {unstaged.map((f) => (
          <div key={f.path} className="flex items-center px-3 py-1 hover:bg-gray-800 gap-2">
            {statusIcon(f.status)}
            <span className="flex-1 truncate text-xs">{f.path}</span>
            <button onClick={() => handleStage(f.path)} className="text-gray-500 hover:text-white text-xs">+</button>
          </div>
        ))}
      </div>
    </div>
  );
}
