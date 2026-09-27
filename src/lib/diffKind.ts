import type { FileDiff } from "../types/git";

export function diffKind(d: FileDiff): "added" | "deleted" | "modified" {
  if (d.oldPath === null) return "added";
  if (d.newPath === null) return "deleted";
  return "modified";
}
