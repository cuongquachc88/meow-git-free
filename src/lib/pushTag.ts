import { git } from "../ipc/git";
import { ensureRemoteBeforeSync } from "./ensureRemote";
import {
  HttpsTokenRequiredError,
  getBoundToken,
  remoteUrlIsHttp,
  resolveRemoteName,
} from "./remoteSync";
import { SyncCancelledError } from "./syncRemote";

export type TagAccountLookup = (
  path: string,
) => { id: string; username: string } | null | undefined;

export async function pushTagToOrigin(
  activeRepoPath: string,
  tagName: string,
  getAccountForRepo: TagAccountLookup,
): Promise<void> {
  if (!(await ensureRemoteBeforeSync(activeRepoPath))) {
    throw new SyncCancelledError();
  }
  const remoteName = await resolveRemoteName(activeRepoPath);
  const creds = await getBoundToken(activeRepoPath, getAccountForRepo);
  const needsToken = await remoteUrlIsHttp(activeRepoPath, remoteName);
  if (needsToken && !creds) {
    throw new HttpsTokenRequiredError();
  }
  if (creds) {
    await git.pushTagWithToken(activeRepoPath, remoteName, tagName, creds.username, creds.token);
    return;
  }
  await git.pushTag(activeRepoPath, remoteName, tagName);
}

/** Create tag pointing at `targetCommitId`, then push `refs/tags/<name>` to origin. */
export async function createTagAndPushToOrigin(
  activeRepoPath: string,
  tagName: string,
  targetCommitId: string,
  message: string | undefined,
  getAccountForRepo: TagAccountLookup,
): Promise<void> {
  await git.createTag(activeRepoPath, tagName, targetCommitId, message);
  await pushTagToOrigin(activeRepoPath, tagName, getAccountForRepo);
}
