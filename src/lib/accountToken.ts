import { accounts as accountsIpc } from "../ipc/accounts";
import type { Account } from "../types/accounts";
import { useAccountStore } from "../store/accountStore";

/** In-memory only — avoids re-prompting when keychain read is slow; cleared on app quit. */
const sessionTokens = new Map<string, string>();

export function setSessionToken(accountId: string, token: string) {
  sessionTokens.set(accountId, token.trim());
}

export function clearSessionToken(accountId: string) {
  sessionTokens.delete(accountId);
}

export async function readStoredToken(
  accountId: string,
  options?: { fresh?: boolean },
): Promise<string | null> {
  if (!accountId) return null;

  if (options?.fresh) {
    clearSessionToken(accountId);
  }

  const cached = sessionTokens.get(accountId);
  if (cached) return cached;

  try {
    const token = await accountsIpc.getToken(accountId);
    const trimmed = typeof token === "string" ? token.trim() : "";
    if (trimmed.length > 0) {
      sessionTokens.set(accountId, trimmed);
      return trimmed;
    }
    useAccountStore.getState().markPatPresent(accountId, false);
    return null;
  } catch {
    useAccountStore.getState().markPatPresent(accountId, false);
    return null;
  }
}

/** Prefer bound account, else first account marked as having a PAT (no keychain probe). */
export function pickAccountIdWithToken(
  accounts: Account[],
  preferredId?: string | null,
): { accountId: string; hasToken: boolean } {
  const { patPresent } = useAccountStore.getState();
  if (preferredId && patPresent[preferredId]) {
    return { accountId: preferredId, hasToken: true };
  }
  for (const a of accounts) {
    if (patPresent[a.id]) {
      return { accountId: a.id, hasToken: true };
    }
  }
  const fallback = preferredId ?? accounts[0]?.id ?? "";
  return { accountId: fallback, hasToken: patPresent[fallback] ?? false };
}

export async function saveStoredToken(accountId: string, token: string): Promise<void> {
  const trimmed = token.trim();
  if (!trimmed) {
    throw new Error("Token is empty");
  }
  await accountsIpc.storeToken(accountId, trimmed);
  setSessionToken(accountId, trimmed);
  useAccountStore.getState().markPatPresent(accountId, true);
  const verified = await readStoredToken(accountId);
  if (!verified) {
    throw new Error(
      "Token could not be saved or read back. Restart the app after a Rust rebuild, then try again.",
    );
  }
  window.dispatchEvent(new Event("meow-token-saved"));
}
