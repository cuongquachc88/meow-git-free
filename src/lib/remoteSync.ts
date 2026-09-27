import { readStoredToken } from "./accountToken";
import { git } from "../ipc/git";
import { normalizeRepoPath } from "./repoPath";
import { useAccountStore } from "../store/accountStore";

const PREFERRED_REMOTE = "origin";

export function isNoRemoteError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return msg === "NO_REMOTE" || /NO_REMOTE/i.test(msg);
}

export function isRemoteNotFoundError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /\b404\b|unexpected http status code: 404/i.test(msg);
}

/** Prefer `origin`, else first remote; clear error if none. */
export async function resolveRemoteName(activeRepoPath: string): Promise<string> {
  const remotes = await git.listRemotes(activeRepoPath);
  if (remotes.length === 0) {
    throw new Error("NO_REMOTE");
  }
  const origin = remotes.find((r) => r.name === PREFERRED_REMOTE);
  return origin?.name ?? remotes[0]!.name;
}

export async function remoteUrlIsHttp(activeRepoPath: string, remoteName: string): Promise<boolean> {
  const remotes = await git.listRemotes(activeRepoPath);
  const remote = remotes.find((r) => r.name === remoteName);
  const url = remote?.url ?? remote?.pushUrl ?? "";
  return /^https?:\/\//i.test(url);
}

export class HttpsTokenRequiredError extends Error {
  constructor() {
    super("HTTPS_REMOTE_NEEDS_TOKEN");
    this.name = "HttpsTokenRequiredError";
  }
}

export async function getBoundToken(
  activeRepoPath: string,
  getAccountForRepo: (path: string) => { id: string; username: string } | null | undefined,
  toolbarAccountId?: string | null,
): Promise<{ username: string; token: string } | null> {
  const repoPath = normalizeRepoPath(activeRepoPath);
  const { accounts, bindRepoToAccount } = useAccountStore.getState();

  const tryAccount = async (a: { id: string; username: string }) => {
    const token = await readStoredToken(a.id);
    if (!token) return null;
    return { username: a.username, token };
  };

  const pick = async (a: { id: string; username: string } | null | undefined) => {
    if (!a) return null;
    const creds = await tryAccount(a);
    if (creds) bindRepoToAccount(repoPath, a.id);
    return creds;
  };

  if (toolbarAccountId) {
    const fromToolbar = accounts.find((a) => a.id === toolbarAccountId);
    const creds = await pick(fromToolbar);
    if (creds) return creds;
  }

  let account = getAccountForRepo(repoPath) ?? getAccountForRepo(activeRepoPath);
  const boundCreds = await pick(account);
  if (boundCreds) return boundCreds;

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
  if (
    detail === "NO_REMOTE" ||
    /remote.*does not exist|Could not find remote|NotFound.*remote/i.test(detail)
  ) {
    return new Error("NO_REMOTE");
  }
  if (/authentication required|no callback set|Auth \(-16\)/i.test(detail)) {
    return new Error("HTTPS_REMOTE_NEEDS_TOKEN");
  }
  if (hadToken) {
    return new Error(detail);
  }
  return new Error("HTTPS_REMOTE_NEEDS_TOKEN");
}

export async function pushBranch(
  activeRepoPath: string,
  branchName: string,
  creds: { username: string; token: string } | null,
): Promise<void> {
  const remoteName = await resolveRemoteName(activeRepoPath);
  const needsToken = await remoteUrlIsHttp(activeRepoPath, remoteName);
  if (needsToken && !creds) {
    throw new HttpsTokenRequiredError();
  }
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
  const needsToken = await remoteUrlIsHttp(activeRepoPath, remoteName);
  if (needsToken && !creds) {
    throw new HttpsTokenRequiredError();
  }
  if (creds) {
    return git.pullWithToken(activeRepoPath, remoteName, branchName, creds.username, creds.token);
  }
  return git.pullBranch(activeRepoPath, remoteName, branchName);
}
