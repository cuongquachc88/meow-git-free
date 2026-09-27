import { create } from "zustand";
import type { BranchInfo, CommitInfo, FileStatus, RepoInfo } from "../types/git";
import { git } from "../ipc/git";

interface RepoStore {
  repos: RepoInfo[];
  activeRepoPath: string | null;
  commits: CommitInfo[];
  branches: BranchInfo[];
  status: FileStatus[];
  selectedCommit: CommitInfo | null;
  loading: boolean;
  error: string | null;

  addRepo: (info: RepoInfo) => void;
  setActiveRepo: (path: string) => Promise<void>;
  refreshLog: () => Promise<void>;
  refreshBranches: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  selectCommit: (commit: CommitInfo | null) => void;
}

export const useRepoStore = create<RepoStore>((set, get) => ({
  repos: [],
  activeRepoPath: null,
  commits: [],
  branches: [],
  status: [],
  selectedCommit: null,
  loading: false,
  error: null,

  addRepo: (info) =>
    set((s) => ({
      repos: s.repos.find((r) => r.path === info.path) ? s.repos : [...s.repos, info],
    })),

  setActiveRepo: async (path) => {
    set({ activeRepoPath: path, loading: true, error: null });
    try {
      const [commits, branches, status] = await Promise.all([
        git.getLog(path, 500),
        git.listBranches(path),
        git.getStatus(path),
      ]);
      set({ commits, branches, status, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  refreshLog: async () => {
    const { activeRepoPath } = get();
    if (!activeRepoPath) return;
    const commits = await git.getLog(activeRepoPath, 500);
    set({ commits });
  },

  refreshBranches: async () => {
    const { activeRepoPath } = get();
    if (!activeRepoPath) return;
    const branches = await git.listBranches(activeRepoPath);
    set({ branches });
  },

  refreshStatus: async () => {
    const { activeRepoPath } = get();
    if (!activeRepoPath) return;
    const status = await git.getStatus(activeRepoPath);
    set({ status });
  },

  selectCommit: (commit) => set({ selectedCommit: commit }),
}));
