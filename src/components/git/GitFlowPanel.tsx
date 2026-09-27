import { useState } from "react";
import { useRepoStore } from "../../store/repoStore";
import { git } from "../../ipc/git";

type FlowType = "feature" | "release" | "hotfix";

export function GitFlowPanel() {
  const { activeRepoPath, setActiveRepo } = useRepoStore();
  const [type, setType] = useState<FlowType>("feature");
  const [name, setName] = useState("");

  const prefixes: Record<FlowType, string> = {
    feature: "feature/",
    release: "release/",
    hotfix: "hotfix/",
  };

  const baseRefs: Record<FlowType, string> = {
    feature: "develop",
    release: "develop",
    hotfix: "main",
  };

  const handleStart = async () => {
    if (!activeRepoPath || !name.trim()) return;
    const branchName = `${prefixes[type]}${name.trim()}`;
    try {
      await git.createBranch(activeRepoPath, branchName, baseRefs[type]);
      await git.checkoutBranch(activeRepoPath, branchName);
      setName("");
      await setActiveRepo(activeRepoPath);
    } catch (e) {
      alert(`Git flow start failed: ${e}`);
    }
  };

  const handleFinish = async () => {
    if (!activeRepoPath || !name.trim()) return;
    const branchName = `${prefixes[type]}${name.trim()}`;
    const target = type === "hotfix" ? "main" : "develop";
    try {
      await git.checkoutBranch(activeRepoPath, target);
      const clean = await git.mergeBranch(activeRepoPath, branchName);
      if (!clean) {
        alert("Merge has conflicts — resolve them before finishing.");
        return;
      }
      await git.deleteBranch(activeRepoPath, branchName);
      setName("");
      await setActiveRepo(activeRepoPath);
    } catch (e) {
      alert(`Git flow finish failed: ${e}`);
    }
  };

  return (
    <div className="p-3 space-y-3 text-sm text-gray-300">
      <p className="text-xs font-semibold text-gray-500 uppercase">Git Flow</p>

      <div className="flex gap-1">
        {(["feature", "release", "hotfix"] as FlowType[]).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`flex-1 py-1 rounded text-xs capitalize ${
              type === t ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-400 hover:bg-gray-600"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <input
        className="w-full bg-gray-900 text-white rounded p-2 text-sm border border-gray-600 focus:outline-none focus:border-blue-500"
        placeholder={`${prefixes[type]}name`}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <div className="flex gap-2">
        <button
          onClick={handleStart}
          disabled={!name.trim() || !activeRepoPath}
          className="flex-1 py-1.5 rounded text-xs bg-green-700 hover:bg-green-600 disabled:opacity-40"
        >
          Start
        </button>
        <button
          onClick={handleFinish}
          disabled={!name.trim() || !activeRepoPath}
          className="flex-1 py-1.5 rounded text-xs bg-purple-700 hover:bg-purple-600 disabled:opacity-40"
        >
          Finish
        </button>
      </div>
    </div>
  );
}
