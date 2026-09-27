import { git } from "../ipc/git";
import { defaultRepoNameFromPath } from "./remoteUrl";
import { useUIStore } from "../store/uiStore";

export async function repoHasRemote(activeRepoPath: string): Promise<boolean> {
  const remotes = await git.listRemotes(activeRepoPath);
  return remotes.length > 0;
}

/** Confirm + dialog to add `origin`; returns whether a remote is ready. */
export async function ensureRemoteBeforeSync(activeRepoPath: string): Promise<boolean> {
  if (await repoHasRemote(activeRepoPath)) {
    return true;
  }

  const create = window.confirm(
    "This repository has no remote.\n\nCreate a new origin remote on your Git host?",
  );
  if (!create) {
    return false;
  }

  const defaultRepoName = defaultRepoNameFromPath(activeRepoPath);
  return requestRemoteSetup(defaultRepoName);
}

export function requestRemoteSetup(defaultRepoName: string): Promise<boolean> {
  return new Promise((resolve) => {
    useUIStore.setState({
      isRemoteSetupOpen: true,
      remoteSetupDefaultRepoName: defaultRepoName,
      remoteSetupResolve: resolve,
    });
  });
}

export function finishRemoteSetup(success: boolean): void {
  const { remoteSetupResolve } = useUIStore.getState();
  useUIStore.setState({
    isRemoteSetupOpen: false,
    remoteSetupDefaultRepoName: "",
    remoteSetupResolve: null,
  });
  remoteSetupResolve?.(success);
}
