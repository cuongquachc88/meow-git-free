import { create } from "zustand";
import type { BranchInfo, CommitInfo, FileDiff, FileStatus, RepoInfo } from "../types/git";
import { git } from "../ipc/git";
import { openBranchName } from "../lib/headBranch";

import { diffFilePath, mergeWorkingDiffs } from "../lib/mergeWorkingDiffs";

function withSyncedHeadBranch(repos: RepoInfo[], activeRepoPath: string | null, branches: BranchInfo[]) {
  if (!activeRepoPath) return repos;
  const head = openBranchName(branches);
  if (!head) return repos;
  return repos.map((r) => (r.path === activeRepoPath ? { ...r, headBranch: head } : r));
}

interface RepoStore {
  repos: RepoInfo[];
  activeRepoPath: string | null;
  commits: CommitInfo[];
  branches: BranchInfo[];
  status: FileStatus[];
  selectedCommit: CommitInfo | null;
  activeDiffs: FileDiff[];
  selectedDiff: FileDiff | null;
  loading: boolean;
  error: string | null;

  addRepo: (info: RepoInfo) => void;
  closeRepo: (path: string) => Promise<void>;
  setActiveRepo: (path: string) => Promise<void>;
  refreshLog: () => Promise<void>;
  refreshBranches: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  selectCommit: (commit: CommitInfo | null) => void;
  refreshDiffs: () => Promise<void>;
  setActiveDiffs: (diffs: FileDiff[], selected?: FileDiff | null) => void;
  setSelectedDiff: (diff: FileDiff | null) => void;
}

export const useRepoStore = create<RepoStore>((set, get) => ({
  repos: [],
  activeRepoPath: null,
  commits: [],
  branches: [],
  status: [],
  selectedCommit: null,
  activeDiffs: [],
  selectedDiff: null,
  loading: false,
  error: null,

  addRepo: (info) =>
    set((s) => ({
      repos: s.repos.find((r) => r.path === info.path) ? s.repos : [...s.repos, info],
    })),

  closeRepo: async (path) => {
    const remaining = get().repos.filter((r) => r.path !== path);
    const wasActive = get().activeRepoPath === path;
    set({
      repos: remaining,
      ...(wasActive
        ? {
            activeRepoPath: null,
            commits: [],
            branches: [],
            status: [],
            selectedCommit: null,
            activeDiffs: [],
            selectedDiff: null,
            error: null,
          }
        : {}),
    });
    if (wasActive && remaining[0]) {
      await get().setActiveRepo(remaining[0].path);
    }
  },

  setActiveRepo: async (path) => {
    set({ activeRepoPath: path, loading: true, error: null });
    try {
      const [commits, branches, status] = await Promise.all([
        git.getLog(path, 500),
        git.listBranches(path),
        git.getStatus(path),
      ]);
      set((s) => ({
        commits,
        branches,
        status,
        loading: false,
        repos: withSyncedHeadBranch(s.repos, path, branches),
      }));
      await get().refreshDiffs();
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
    set((s) => ({
      branches,
      repos: withSyncedHeadBranch(s.repos, activeRepoPath, branches),
    }));
  },

  refreshStatus: async () => {
    const { activeRepoPath } = get();
    if (!activeRepoPath) return;
    const status = await git.getStatus(activeRepoPath);
    set({ status });
  },

  selectCommit: (commit) => {
    set({ selectedCommit: commit, activeDiffs: [], selectedDiff: null });
    void get().refreshDiffs();
  },

  refreshDiffs: async () => {
    const { activeRepoPath, selectedCommit, selectedDiff } = get();
    if (!activeRepoPath) return;
    try {
      const result = selectedCommit
        ? await git.diffCommit(activeRepoPath, selectedCommit.id)
        : mergeWorkingDiffs(
            await git.diffStaged(activeRepoPath),
            await git.diffWorkdir(activeRepoPath),
          );
      const prevPath = selectedDiff ? diffFilePath(selectedDiff) : undefined;
      const nextSelected =
        prevPath != null
          ? (result.find((d) => diffFilePath(d) === prevPath) ?? null)
          : null;
      set({ activeDiffs: result, selectedDiff: nextSelected });
    } catch {
      set({ activeDiffs: [], selectedDiff: null });
    }
  },

  setActiveDiffs: (diffs, selected) =>
    set({ activeDiffs: diffs, selectedDiff: selected !== undefined ? selected : null }),

  setSelectedDiff: (diff) => set({ selectedDiff: diff }),
}));
