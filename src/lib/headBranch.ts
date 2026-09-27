import type { BranchInfo } from "../types/git";

/** Local branch currently checked out (HEAD). */
export function openBranchName(branches: BranchInfo[]): string | null {
  const local = branches.find((b) => b.isHead && b.kind === "Local");
  if (local) return local.name;
  const anyHead = branches.find((b) => b.isHead);
  return anyHead?.name ?? null;
}
