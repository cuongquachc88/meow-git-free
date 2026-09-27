export interface RepoInfo {
  path: string;
  name: string;
  headBranch: string | null;
  isBare: boolean;
  state: string;
}

export interface CommitInfo {
  id: string;
  shortId: string;
  message: string;
  summary: string;
  authorName: string;
  authorEmail: string;
  authorTime: number;
  committerName: string;
  committerEmail: string;
  committerTime: number;
  parentIds: string[];
}

export interface BranchInfo {
  name: string;
  isHead: boolean;
  kind: "Local" | "Remote";
  upstream: string | null;
  tipId: string | null;
  ahead: number | null;
  behind: number | null;
}

export interface FileStatus {
  path: string;
  status: string[];
  isStaged: boolean;
}

export interface DiffLine {
  origin: string;
  content: string;
  oldLineno: number | null;
  newLineno: number | null;
}

export interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

export interface FileDiff {
  oldPath: string | null;
  newPath: string | null;
  hunks: DiffHunk[];
  isBinary: boolean;
}

export interface RemoteInfo {
  name: string;
  url: string;
  pushUrl: string | null;
}

export interface TagInfo {
  name: string;
  targetId: string;
  message: string | null;
  taggerName: string | null;
  taggerTime: number | null;
}

export interface SubmoduleInfo {
  name: string;
  path: string;
  url: string | null;
  headId: string | null;
}

export interface ConflictFile {
  path: string;
  ancestor: string | null;
  ours: string | null;
  theirs: string | null;
}

export interface StashEntry {
  index: number;
  message: string;
  id: string;
}

export interface BlameLine {
  lineNo: number;
  commitId: string;
  shortId: string;
  author: string;
  authorEmail: string;
  timestamp: number;
  summary: string;
  content: string;
}
