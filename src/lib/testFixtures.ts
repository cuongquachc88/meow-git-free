import type { BranchInfo, CommitInfo, FileDiff } from "../types/git";

export function commit(id: string, parentIds: string[] = [], summary = "msg"): CommitInfo {
  return {
    id,
    shortId: id.slice(0, 7),
    message: summary,
    summary,
    authorName: "author",
    authorEmail: "a@example.com",
    authorTime: 1_700_000_000,
    committerName: "author",
    committerEmail: "a@example.com",
    committerTime: 1_700_000_000,
    parentIds,
  };
}

export function branch(partial: Partial<BranchInfo> & Pick<BranchInfo, "name">): BranchInfo {
  return {
    isHead: false,
    kind: "Local",
    upstream: null,
    tipId: null,
    ahead: null,
    behind: null,
    ...partial,
  };
}

export function fileDiff(partial: Partial<FileDiff> = {}): FileDiff {
  return {
    oldPath: "src/a.ts",
    newPath: "src/a.ts",
    hunks: [],
    isBinary: false,
    ...partial,
  };
}
