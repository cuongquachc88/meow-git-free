import type { BranchInfo } from "../types/git";

export function currentLocalBranch(branches: BranchInfo[]): BranchInfo | undefined {
  return branches.find((b) => b.isHead && b.kind === "Local");
}

/** Human-readable ahead/behind for toolbar, graph, branch picker. */
export function describeBranchTracking(branch: BranchInfo | undefined): {
  refLabel: string;
  ahead: number;
  behind: number;
  summary: string;
  inSync: boolean;
} | null {
  if (!branch || branch.kind !== "Local") return null;

  const ahead = branch.ahead ?? 0;
  const behind = branch.behind ?? 0;
  const refLabel = branch.upstream ?? "origin/main";

  if (ahead === 0 && behind === 0) {
    return {
      refLabel,
      ahead: 0,
      behind: 0,
      inSync: true,
      summary: `In sync with ${refLabel}`,
    };
  }

  const parts: string[] = [];
  if (ahead > 0) parts.push(`↑${ahead} ahead`);
  if (behind > 0) parts.push(`↓${behind} behind`);

  return {
    refLabel,
    ahead,
    behind,
    inSync: false,
    summary: `${parts.join(", ")} of ${refLabel}`,
  };
}
