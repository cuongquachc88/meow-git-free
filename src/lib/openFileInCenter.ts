import { git } from "../ipc/git";
import type { CommitInfo, FileDiff } from "../types/git";
import { diffFilePath } from "./mergeWorkingDiffs";

/** Select file and show diff or blame in the main center column. */
export function openFileInCenter(
  diff: FileDiff,
  setSelectedDiff: (d: FileDiff | null) => void,
  openCenterFileView: (mode: "diff" | "blame") => void,
  mode: "diff" | "blame" = "diff",
) {
  setSelectedDiff(diff);
  openCenterFileView(mode);
}

/** Click a file path: load diff if needed, then open full-width center viewer (not the Files panel). */
export async function openFilePathInCenter(
  path: string,
  deps: {
    activeRepoPath: string | null;
    activeDiffs: FileDiff[];
    selectedCommit: CommitInfo | null;
    setSelectedDiff: (d: FileDiff | null) => void;
    openCenterFileView: (mode: "diff" | "blame") => void;
  },
): Promise<void> {
  const { activeRepoPath, activeDiffs, selectedCommit, setSelectedDiff, openCenterFileView } = deps;
  if (!activeRepoPath) return;

  let diff = activeDiffs.find((d) => diffFilePath(d) === path);
  if (!diff) {
    try {
      if (selectedCommit) {
        const list = await git.diffCommit(activeRepoPath, selectedCommit.id);
        diff = list.find((d) => diffFilePath(d) === path);
      } else {
        const [unstaged, staged] = await Promise.all([
          git.diffWorkdir(activeRepoPath, path),
          git.diffStaged(activeRepoPath, path),
        ]);
        diff = unstaged[0] ?? staged[0];
      }
    } catch {
      diff = undefined;
    }
  }

  if (diff) openFileInCenter(diff, setSelectedDiff, openCenterFileView, "diff");
}
