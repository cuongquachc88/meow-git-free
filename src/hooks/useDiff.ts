import { useEffect, useState } from "react";
import { useRepoStore } from "../store/repoStore";
import { git } from "../ipc/git";
import type { FileDiff } from "../types/git";

export function useDiff(file?: string) {
  const { activeRepoPath, selectedCommit } = useRepoStore();
  const [diffs, setDiffs] = useState<FileDiff[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeRepoPath) return;
    setLoading(true);
    const load = selectedCommit
      ? git.diffCommit(activeRepoPath, selectedCommit.id)
      : git.diffWorkdir(activeRepoPath, file);

    load.then(setDiffs).catch(() => setDiffs([])).finally(() => setLoading(false));
  }, [activeRepoPath, selectedCommit, file]);

  return { diffs, loading };
}
