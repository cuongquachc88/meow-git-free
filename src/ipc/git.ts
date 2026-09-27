import { invoke } from "@tauri-apps/api/core";
import type {
  BranchInfo,
  CommitInfo,
  ConflictFile,
  FileDiff,
  FileStatus,
  RemoteInfo,
  RepoInfo,
  StashEntry,
  SubmoduleInfo,
  TagInfo,
} from "../types/git";

export const git = {
  openRepo: (path: string) => invoke<RepoInfo>("open_repo", { path }),
  initRepo: (path: string, bare = false) => invoke<RepoInfo>("init_repo", { path, bare }),
  cloneRepo: (url: string, path: string) => invoke<RepoInfo>("clone_repo", { url, path }),

  getLog: (path: string, max?: number) => invoke<CommitInfo[]>("get_log", { path, max }),
  getCommit: (path: string, id: string) => invoke<CommitInfo>("get_commit", { path, id }),
  cherryPick: (path: string, id: string) => invoke<void>("cherry_pick", { path, id }),
  revertCommit: (path: string, id: string) => invoke<void>("revert_commit", { path, id }),

  listBranches: (path: string) => invoke<BranchInfo[]>("list_branches", { path }),
  createBranch: (path: string, name: string, fromRef?: string) =>
    invoke<BranchInfo>("create_branch", { path, name, fromRef }),
  checkoutBranch: (path: string, name: string) => invoke<void>("checkout_branch", { path, name }),
  deleteBranch: (path: string, name: string) => invoke<void>("delete_branch", { path, name }),
  renameBranch: (path: string, oldName: string, newName: string) =>
    invoke<void>("rename_branch", { path, oldName, newName }),

  getStatus: (path: string) => invoke<FileStatus[]>("get_status", { path }),
  stageFile: (path: string, file: string) => invoke<void>("stage_file", { path, file }),
  stageAll: (path: string) => invoke<void>("stage_all", { path }),
  unstageFile: (path: string, file: string) => invoke<void>("unstage_file", { path, file }),
  createCommit: (path: string, message: string) => invoke<string>("create_commit", { path, message }),
  saveStash: (path: string, message?: string) => invoke<string>("save_stash", { path, message }),
  listStashes: (path: string) => invoke<StashEntry[]>("list_stashes", { path }),
  popStash: (path: string, index: number) => invoke<void>("pop_stash", { path, index }),
  dropStash: (path: string, index: number) => invoke<void>("drop_stash", { path, index }),

  diffWorkdir: (path: string, file?: string) => invoke<FileDiff[]>("diff_workdir", { path, file }),
  diffStaged: (path: string, file?: string) => invoke<FileDiff[]>("diff_staged", { path, file }),
  diffCommit: (path: string, commitId: string) => invoke<FileDiff[]>("diff_commit", { path, commitId }),

  listRemotes: (path: string) => invoke<RemoteInfo[]>("list_remotes", { path }),
  addRemote: (path: string, name: string, url: string) => invoke<void>("add_remote", { path, name, url }),
  removeRemote: (path: string, name: string) => invoke<void>("remove_remote", { path, name }),
  fetchRemote: (path: string, remoteName: string) => invoke<void>("fetch_remote", { path, remoteName }),

  mergeBranch: (path: string, branchName: string) => invoke<boolean>("merge_branch", { path, branchName }),
  getConflicts: (path: string) => invoke<ConflictFile[]>("get_conflicts", { path }),
  abortMerge: (path: string) => invoke<void>("abort_merge", { path }),

  listTags: (path: string) => invoke<TagInfo[]>("list_tags", { path }),
  createTag: (path: string, name: string, targetRef?: string, message?: string) =>
    invoke<void>("create_tag", { path, name, targetRef, message }),
  deleteTag: (path: string, name: string) => invoke<void>("delete_tag", { path, name }),

  listSubmodules: (path: string) => invoke<SubmoduleInfo[]>("list_submodules", { path }),
  updateSubmodules: (path: string) => invoke<void>("update_submodules", { path }),
};
