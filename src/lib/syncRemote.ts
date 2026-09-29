import { defaultRepoNameFromPath } from "./remoteUrl";
import { ensureRemoteBeforeSync, repoHasRemote, requestRemoteSetup } from "./ensureRemote";
import { clearSessionToken } from "./accountToken";
import {
  HttpsTokenRequiredError,
  getBoundToken,
  isNoRemoteError,
  isRemoteNotFoundError,
  pullBranch,
  pushBranch,
} from "./remoteSync";

export type SyncAccountLookup = (
  path: string,
) => { id: string; username: string } | null | undefined;

async function credsForRepo(
  activeRepoPath: string,
  getAccountForRepo: SyncAccountLookup,
  toolbarAccountId?: string | null,
  fresh?: boolean,
) {
  return getBoundToken(activeRepoPath, getAccountForRepo, toolbarAccountId, fresh ? { fresh: true } : undefined);
}

function isStalePatHttpError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /\b403\b|status code: 403|authentication replays|HTTP authentication failed/i.test(msg);
}

export class SyncCancelledError extends Error {
  constructor() {
    super("SYNC_CANCELLED");
    this.name = "SyncCancelledError";
  }
}

async function withRemoteSetup<T>(repoPath: string, run: () => Promise<T>): Promise<T> {
  if (!(await ensureRemoteBeforeSync(repoPath))) {
    throw new SyncCancelledError();
  }
  try {
    return await run();
  } catch (e) {
    if (isNoRemoteError(e) && (await ensureRemoteBeforeSync(repoPath)) && (await repoHasRemote(repoPath))) {
      return run();
    }
    throw e;
  }
}

export async function pushRepoBranch(
  activeRepoPath: string,
  branchName: string,
  getAccountForRepo: SyncAccountLookup,
  toolbarAccountId?: string | null,
): Promise<void> {
  const doPush = async (fresh?: boolean) => {
    const creds = await credsForRepo(activeRepoPath, getAccountForRepo, toolbarAccountId, fresh);
    await pushBranch(activeRepoPath, branchName, creds);
  };

  if (!(await ensureRemoteBeforeSync(activeRepoPath))) {
    throw new SyncCancelledError();
  }

  try {
    await doPush();
  } catch (e) {
    if (isStalePatHttpError(e)) {
      const creds = await credsForRepo(activeRepoPath, getAccountForRepo, toolbarAccountId);
      if (creds?.accountId) clearSessionToken(creds.accountId);
      try {
        await doPush(true);
        return;
      } catch (retry) {
        throw retry;
      }
    }
    if (isNoRemoteError(e) && (await ensureRemoteBeforeSync(activeRepoPath)) && (await repoHasRemote(activeRepoPath))) {
      await doPush();
      return;
    }
    if (isRemoteNotFoundError(e)) {
      const ok = await requestRemoteSetup(defaultRepoNameFromPath(activeRepoPath), "repo_not_found");
      if (!ok) throw e;
      await doPush();
      return;
    }
    throw e;
  }
}

export async function pullRepoBranch(
  activeRepoPath: string,
  branchName: string,
  getAccountForRepo: SyncAccountLookup,
  toolbarAccountId?: string | null,
): Promise<boolean> {
  return withRemoteSetup(activeRepoPath, async () => {
    const creds = await credsForRepo(activeRepoPath, getAccountForRepo, toolbarAccountId);
    return pullBranch(activeRepoPath, branchName, creds);
  });
}

const HTTPS_TOKEN_MSG =
  "Origin uses HTTPS and this account has no PAT in the keychain. Choosing the account in the toolbar is not enough — save a personal access token (repo scope) when prompted, or use Accounts → Add token.";

export function describeSyncError(e: unknown): string | null {
  if (e instanceof SyncCancelledError) return null;
  if (e instanceof HttpsTokenRequiredError) return HTTPS_TOKEN_MSG;
  const msg = e instanceof Error ? e.message : String(e);
  if (isNoRemoteError(e)) {
    return "No remote is configured. Use Push again to create a repository and add origin.";
  }
  if (/HTTPS_REMOTE_NEEDS_TOKEN|no usable account token|authentication required|no callback set/i.test(msg)) {
    return HTTPS_TOKEN_MSG;
  }
  if (/\b403\b|status code: 403/i.test(msg)) {
    return "GitHub returned 403 (forbidden). The PAT may be expired, revoked, or missing repo write scope — or Meow Git used a stale cached token. Open Accounts, paste a new classic PAT with repo scope, then push again. Dev and release builds use separate Keychain entries.";
  }
  if (/too many redirects|authentication replays|HTTP authentication failed/i.test(msg)) {
    return "GitHub rejected HTTPS auth. Use a new PAT with repo scope (revoke old tokens if one was leaked), confirm origin is https://github.com/you/repo.git with no user:pass in the URL, then push again.";
  }
  if (/PUSH_NOT_ACCEPTED|rejected:/i.test(msg)) {
    return "Push was not accepted by the remote (wrong account/PAT, branch protection, or no permission). Check toolbar account, PAT repo scope, and GitHub — nothing was pushed.";
  }
  if (/PULL_NOT_COMPLETE/i.test(msg)) {
    return "Pull did not update your branch to match the remote. Check account/PAT, current branch vs origin, then try Fetch then Pull again.";
  }
  if (isRemoteNotFoundError(e)) {
    return "GitHub returned 404 — repository not created yet at origin. Meow Git can create it on GitHub (Create & add origin in the dialog).";
  }
  if (/credentials|Bind|account/i.test(msg)) {
    return msg.replace(/^Push failed:\s*/i, "");
  }
  return msg.replace(/^Push failed:\s*Push failed:\s*/i, "Push failed: ");
}

export { isRemoteNotFoundError } from "./remoteSync";

export function isAuthSyncError(e: unknown): boolean {
  if (e instanceof HttpsTokenRequiredError) return true;
  const msg = e instanceof Error ? e.message : String(e);
  return /HTTPS_REMOTE_NEEDS_TOKEN|credentials|Bind|account|no usable account token|authentication required|Auth \(-16\)|\b403\b|status code: 403|HTTP authentication failed/i.test(
    msg,
  );
}
