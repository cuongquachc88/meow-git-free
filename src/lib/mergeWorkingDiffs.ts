import type { FileDiff } from "../types/git";

export function diffFilePath(d: FileDiff): string | undefined {
  return d.newPath ?? d.oldPath ?? undefined;
}

/** Staged (HEAD↔index) plus unstaged (index↔workdir); unstaged wins on same path. */
export function mergeWorkingDiffs(staged: FileDiff[], unstaged: FileDiff[]): FileDiff[] {
  const byPath = new Map<string, FileDiff>();
  for (const d of staged) {
    const p = diffFilePath(d);
    if (p) byPath.set(p, d);
  }
  for (const d of unstaged) {
    const p = diffFilePath(d);
    if (p) byPath.set(p, d);
  }
  return [...byPath.values()].sort((a, b) =>
    (diffFilePath(a) ?? "").localeCompare(diffFilePath(b) ?? ""),
  );
}
