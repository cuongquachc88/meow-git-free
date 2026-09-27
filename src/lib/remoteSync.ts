import { accounts as accountsIpc } from "../ipc/accounts";
import { git } from "../ipc/git";
import { normalizeRepoPath } from "./repoPath";
import { useAccountStore } from "../store/accountStore";

const PREFERRED_REMOTE = "origin";

/** Prefer `origin`, else first remote; clear error if none. */
export async function resolveRemoteName(activeRepoPath: string): Promise<string> {
  const remotes = await git.listRemotes(activeRepoPath);
  if (remotes.length === 0) {
    throw new Error("NO_REMOTE");
  }
  const origin = remotes.find((r) => r.name === PREFERRED_REMOTE);
  return origin?.name ?? remotes[0]!.name;
}

export async function getBoundToken(
  activeRepoPath: string,
  getAccountForRepo: (path: string) => { id: string; username: string } | null | undefined,
): Promise<{ username: string; token: string } | null> {
  const repoPath = normalizeRepoPath(activeRepoPath);
  let account = getAccountForRepo(repoPath) ?? getAccountForRepo(activeRepoPath);

  const tryAccount = async (a: { id: string; username: string }) => {
    try {
      const token = await accountsIpc.getToken(a.id);
      if (!token) return null;
      return { username: a.username, token };
    } catch {
      return null;
    }
  };

  if (account) {
    return tryAccount(account);
  }

  const { accounts, bindRepoToAccount } = useAccountStore.getState();
  for (const a of accounts) {
    const creds = await tryAccount(a);
    if (creds) {
      bindRepoToAccount(repoPath, a.id);
      return creds;
    }
  }
  return null;
}

function wrapPushError(detail: string, hadToken: boolean): Error {
  if (detail === "NO_REMOTE" || /remote.*does not exist|NotFound.*remote/i.test(detail)) {
    return new Error("NO_REMOTE");
  }
  if (hadToken) {
    return new Error(`Push failed: ${detail}`);
  }
  return new Error(
    `Push failed (no usable account token). Add an account in Accounts, or use an SSH remote. ${detail}`,
  );
}

export async function pushBranch(
  activeRepoPath: string,
  branchName: string,
  creds: { username: string; token: string } | null,
): Promise<void> {
  const remoteName = await resolveRemoteName(activeRepoPath);
  try {
    if (creds) {
      await git.pushWithToken(activeRepoPath, remoteName, branchName, creds.username, creds.token);
      return;
    }
    await git.pushBranch(activeRepoPath, remoteName, branchName);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw wrapPushError(detail, !!creds);
  }
}

export async function pullBranch(
  activeRepoPath: string,
  branchName: string,
  creds: { username: string; token: string } | null,
): Promise<boolean> {
  const remoteName = await resolveRemoteName(activeRepoPath);
  if (creds) {
    return git.pullWithToken(activeRepoPath, remoteName, branchName, creds.username, creds.token);
  }
  return git.pullBranch(activeRepoPath, remoteName, branchName);
}
