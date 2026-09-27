/** Canonical repo path for account binding (trailing slashes). */
export function normalizeRepoPath(repoPath: string): string {
  return repoPath.replace(/[\\/]+$/, "");
}
