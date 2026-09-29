import { readStoredToken } from "./accountToken";
import { useUIStore } from "../store/uiStore";

type PatWaiter = { accountId: string; resolve: (token: string | null) => void };

let waiter: PatWaiter | null = null;

/** User cancelled auto prompt — do not pop dialog again this session (use Accounts → Add token). */
const patAutoDismissed = new Set<string>();

/** Already showed auto prompt once for this account this session. */
const patAutoShown = new Set<string>();

export function markPatAutoDismissed(accountId: string) {
  patAutoDismissed.add(accountId);
}

export function clearPatAutoDismissed(accountId: string) {
  patAutoDismissed.delete(accountId);
}

export function clearPatAutoShown(accountId: string) {
  patAutoShown.delete(accountId);
}

/** Show in-app PAT dialog; resolves with trimmed token or null if cancelled. */
export function requestAccountPat(accountId: string, options?: { force?: boolean }): Promise<string | null> {
  if (waiter) {
    waiter.resolve(null);
    waiter = null;
  }
  return new Promise((resolve) => {
    waiter = { accountId, resolve };
    useUIStore.getState().openPatPrompt(accountId);
    if (options?.force) {
      clearPatAutoDismissed(accountId);
    }
  });
}

/**
 * For push/pull auth: prompt at most once per account per session unless user opens Accounts manually.
 */
/** @param reprompt When true, show dialog even if keychain already has a token (e.g. after 403). */
export async function requestAccountPatForAuth(
  accountId: string,
  options?: { reprompt?: boolean },
): Promise<string | null> {
  if (!options?.reprompt && (await readStoredToken(accountId))) return null;
  if (!options?.reprompt && (patAutoDismissed.has(accountId) || patAutoShown.has(accountId))) {
    return null;
  }
  if (!options?.reprompt) patAutoShown.add(accountId);
  return requestAccountPat(accountId, { force: true });
}

export function completeAccountPat(token: string | null) {
  if (token?.trim()) {
    clearPatAutoDismissed(waiter?.accountId ?? "");
  }
  waiter?.resolve(token?.trim() ? token.trim() : null);
  waiter = null;
  useUIStore.getState().closePatPrompt();
}

export function cancelAccountPat() {
  if (waiter?.accountId) {
    markPatAutoDismissed(waiter.accountId);
  }
  completeAccountPat(null);
}
