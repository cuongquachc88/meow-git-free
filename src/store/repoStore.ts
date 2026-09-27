import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BranchInfo, CommitInfo, FileDiff, FileStatus, RepoInfo } from "../types/git";
import { git } from "../ipc/git";
import { openBranchName } from "../lib/headBranch";
import { normalizeRepoPath } from "../lib/repoPath";

import { diffFilePath, mergeWorkingDiffs } from "../lib/mergeWorkingDiffs";

const RECENT_REPO_LIMIT = 12;

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
  /** Refresh persisted recents; keep welcome (no auto-open). */
  restoreRecentRepos: () => Promise<void>;
  goToWelcome: () => void;
}

function bumpRecentRepo(repos: RepoInfo[], info: RepoInfo): RepoInfo[] {
  const path = normalizeRepoPath(info.path);
  const rest = repos.filter((r) => normalizeRepoPath(r.path) !== path);
  return [info, ...rest].slice(0, RECENT_REPO_LIMIT);
}

export const useRepoStore = create<RepoStore>()(
  persist(
    (set, get) => ({
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
      repos: bumpRecentRepo(s.repos, info),
    })),

  goToWelcome: () =>
    set({
      activeRepoPath: null,
      commits: [],
      branches: [],
      status: [],
      selectedCommit: null,
      activeDiffs: [],
      selectedDiff: null,
      error: null,
      loading: false,
    }),

  restoreRecentRepos: async () => {
    const { repos } = get();
    if (repos.length === 0) return;
    const valid: RepoInfo[] = [];
    for (const r of repos) {
      try {
        const info = await git.openRepo(r.path);
        valid.push(info);
      } catch {
        /* drop missing paths */
      }
    }
    set({
      repos: valid,
      activeRepoPath: null,
      commits: [],
      branches: [],
      status: [],
      selectedCommit: null,
      activeDiffs: [],
      selectedDiff: null,
      error: null,
      loading: false,
    });
  },

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
      const info = await git.openRepo(path);
      set((s) => ({
        commits,
        branches,
        status,
        loading: false,
        repos: bumpRecentRepo(
          withSyncedHeadBranch(s.repos, path, branches),
          { ...info, headBranch: openBranchName(branches) ?? info.headBranch },
        ),
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
    }),
    {
      name: "meow-git-repos",
      partialize: (s) => ({ repos: s.repos }),
    },
  ),
);
