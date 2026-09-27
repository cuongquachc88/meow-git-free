import { useEffect, useState } from "react";
import { useAccountStore } from "../../store/accountStore";
import { useRepoStore } from "../../store/repoStore";
import type { PullRequest } from "../../types/accounts";

export function PRPanel() {
  const { activeRepoPath } = useRepoStore();
  const { getAccountForRepo } = useAccountStore();
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [_loading, _setLoading] = useState(false);

  // PR loading requires knowing the owner/repo from the remote URL
  // This is a placeholder — actual implementation calls provider API via Tauri
  useEffect(() => {
    setPrs([]);
  }, [activeRepoPath]);

  const account = activeRepoPath ? getAccountForRepo(activeRepoPath) : null;

  return (
    <div className="p-3 space-y-2 text-sm text-gray-300">
      <p className="text-xs font-semibold text-gray-500 uppercase">Pull Requests</p>

      {!account && (
        <p className="text-xs text-gray-600 text-center py-4">
          Connect an account to see pull requests
        </p>
      )}

      {prs.length === 0 && account && (
        <p className="text-xs text-gray-600 text-center py-4">No open pull requests</p>
      )}

      {prs.map((pr) => (
        <div key={pr.number} className="bg-gray-800 rounded px-3 py-2">
          <div className="flex items-start gap-2">
            <span className="text-green-400 text-xs mt-0.5">●</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{pr.title}</p>
              <p className="text-xs text-gray-500">
                #{pr.number} · {pr.head.refName} → {pr.base.refName}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
