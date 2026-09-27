import { accounts as accountsIpc } from "../ipc/accounts";
import { git } from "../ipc/git";

const DEFAULT_REMOTE = "origin";

export async function getBoundToken(
  activeRepoPath: string,
  getAccountForRepo: (path: string) => { id: string; username: string } | null | undefined,
): Promise<{ username: string; token: string } | null> {
  const account = getAccountForRepo(activeRepoPath);
  if (!account) return null;
  try {
    const token = await accountsIpc.getToken(account.id);
    if (!token) return null;
    return { username: account.username, token };
  } catch {
    return null;
  }
}

export async function pushBranch(
  activeRepoPath: string,
  branchName: string,
  creds: { username: string; token: string } | null,
): Promise<void> {
  if (creds) {
    await git.pushWithToken(activeRepoPath, DEFAULT_REMOTE, branchName, creds.username, creds.token);
    return;
  }
  throw new Error("Bind a GitHub account to this repo to push.");
}

export async function pullBranch(
  activeRepoPath: string,
  branchName: string,
  creds: { username: string; token: string } | null,
): Promise<boolean> {
  if (creds) {
    return git.pullWithToken(activeRepoPath, DEFAULT_REMOTE, branchName, creds.username, creds.token);
  }
  return git.pullBranch(activeRepoPath, DEFAULT_REMOTE, branchName);
}
