import { useEffect } from "react";
import { useRepoStore } from "../store/repoStore";
import { listen } from "@tauri-apps/api/event";

export function useGitGraph() {
  const { activeRepoPath, commits, selectedCommit, selectCommit, refreshLog } = useRepoStore();

  // Listen for fs-change events emitted by the Rust watcher
  useEffect(() => {
    if (!activeRepoPath) return;
    let unlisten: (() => void) | undefined;

    listen<string[]>("repo-changed", () => {
      refreshLog();
    }).then((fn) => { unlisten = fn; });

    return () => { unlisten?.(); };
  }, [activeRepoPath]);

  return { commits, selectedCommit, selectCommit };
}
