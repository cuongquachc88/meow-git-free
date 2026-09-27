import { git } from "../ipc/git";
import { defaultRepoNameFromPath } from "./remoteUrl";
import { useUIStore } from "../store/uiStore";

export async function repoHasRemote(activeRepoPath: string): Promise<boolean> {
  const remotes = await git.listRemotes(activeRepoPath);
  return remotes.length > 0;
}

/** Open setup dialog when missing remote; returns whether origin exists after. */
export async function ensureRemoteBeforeSync(activeRepoPath: string): Promise<boolean> {
  if (await repoHasRemote(activeRepoPath)) {
    return true;
  }
  const defaultRepoName = defaultRepoNameFromPath(activeRepoPath);
  return requestRemoteSetup(defaultRepoName, "no_remote");
}

export function requestRemoteSetup(
  defaultRepoName: string,
  reason: "no_remote" | "repo_not_found" = "no_remote",
): Promise<boolean> {
  return new Promise((resolve) => {
    useUIStore.setState({
      isRemoteSetupOpen: true,
      remoteSetupDefaultRepoName: defaultRepoName,
      remoteSetupReason: reason,
      remoteSetupResolve: resolve,
    });
  });
}

export function finishRemoteSetup(success: boolean): void {
  const { remoteSetupResolve } = useUIStore.getState();
  useUIStore.setState({
    isRemoteSetupOpen: false,
    remoteSetupDefaultRepoName: "",
    remoteSetupReason: null,
    remoteSetupResolve: null,
  });
  remoteSetupResolve?.(success);
}
