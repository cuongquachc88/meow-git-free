import { git } from "../ipc/git";
import { ensureRemoteBeforeSync } from "./ensureRemote";
import {
  HttpsTokenRequiredError,
  getBoundToken,
  remoteUrlIsHttp,
  resolveRemoteName,
} from "./remoteSync";
import { SyncCancelledError } from "./syncRemote";
import { pickAccountIdWithToken, readStoredToken } from "./accountToken";
import { requestAccountPatForAuth } from "./requestAccountPat";
import { useAccountStore } from "../store/accountStore";

export type TagAccountLookup = (
  path: string,
) => { id: string; username: string } | null | undefined;

async function credsForTagOp(
  activeRepoPath: string,
  getAccountForRepo: TagAccountLookup,
): Promise<{ username: string; token: string } | null> {
  let creds = await getBoundToken(activeRepoPath, getAccountForRepo);
  if (creds) return creds;

  const { accounts } = useAccountStore.getState();
  const bound = getAccountForRepo(activeRepoPath);
  const { accountId } = pickAccountIdWithToken(accounts, bound?.id);
  if (!accountId) return null;

  if (!(await readStoredToken(accountId))) {
    await requestAccountPatForAuth(accountId);
    creds = await getBoundToken(activeRepoPath, getAccountForRepo, accountId, { fresh: true });
  }
  return creds;
}

export async function pushTagToOrigin(
  activeRepoPath: string,
  tagName: string,
  getAccountForRepo: TagAccountLookup,
): Promise<void> {
  if (!(await ensureRemoteBeforeSync(activeRepoPath))) {
    throw new SyncCancelledError();
  }
  const remoteName = await resolveRemoteName(activeRepoPath);
  const needsToken = await remoteUrlIsHttp(activeRepoPath, remoteName);
  const creds = needsToken ? await credsForTagOp(activeRepoPath, getAccountForRepo) : null;
  if (needsToken && !creds) {
    throw new HttpsTokenRequiredError();
  }
  if (creds) {
    await git.pushTagWithToken(activeRepoPath, remoteName, tagName, creds.username, creds.token);
    return;
  }
  await git.pushTag(activeRepoPath, remoteName, tagName);
}

export async function deleteTagFromOrigin(
  activeRepoPath: string,
  tagName: string,
  getAccountForRepo: TagAccountLookup,
): Promise<void> {
  if (!(await ensureRemoteBeforeSync(activeRepoPath))) {
    throw new SyncCancelledError();
  }
  const remoteName = await resolveRemoteName(activeRepoPath);
  const needsToken = await remoteUrlIsHttp(activeRepoPath, remoteName);
  const creds = needsToken ? await credsForTagOp(activeRepoPath, getAccountForRepo) : null;
  if (needsToken && !creds) {
    throw new HttpsTokenRequiredError();
  }
  if (creds) {
    await git.deleteRemoteTagWithToken(
      activeRepoPath,
      remoteName,
      tagName,
      creds.username,
      creds.token,
    );
    try {
      await git.fetchWithToken(activeRepoPath, remoteName, creds.username, creds.token);
    } catch {
      /* best-effort */
    }
  } else {
    await git.deleteRemoteTag(activeRepoPath, remoteName, tagName);
    try {
      await git.fetchRemote(activeRepoPath, remoteName);
    } catch {
      /* best-effort */
    }
  }
}
