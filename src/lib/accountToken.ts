import { accounts as accountsIpc } from "../ipc/accounts";
import type { Account } from "../types/accounts";

/** In-memory only — avoids re-prompting when keychain read is slow; cleared on app quit. */
const sessionTokens = new Map<string, string>();

export function setSessionToken(accountId: string, token: string) {
  sessionTokens.set(accountId, token.trim());
}

export function clearSessionToken(accountId: string) {
  sessionTokens.delete(accountId);
}

export async function readStoredToken(accountId: string): Promise<string | null> {
  if (!accountId) return null;

  const cached = sessionTokens.get(accountId);
  if (cached) return cached;

  try {
    const token = await accountsIpc.getToken(accountId);
    const trimmed = typeof token === "string" ? token.trim() : "";
    if (trimmed.length > 0) {
      sessionTokens.set(accountId, trimmed);
      return trimmed;
    }
    return null;
  } catch {
    return null;
  }
}

/** Prefer bound account, else first account that has a keychain token. */
export async function pickAccountIdWithToken(
  accounts: Account[],
  preferredId?: string | null,
): Promise<{ accountId: string; hasToken: boolean }> {
  if (preferredId) {
    const has = !!(await readStoredToken(preferredId));
    if (has) return { accountId: preferredId, hasToken: true };
  }
  for (const a of accounts) {
    if (await readStoredToken(a.id)) {
      return { accountId: a.id, hasToken: true };
    }
  }
  const fallback = preferredId ?? accounts[0]?.id ?? "";
  return { accountId: fallback, hasToken: false };
}

export async function saveStoredToken(accountId: string, token: string): Promise<void> {
  const trimmed = token.trim();
  if (!trimmed) {
    throw new Error("Token is empty");
  }
  await accountsIpc.storeToken(accountId, trimmed);
  setSessionToken(accountId, trimmed);
  const verified = await readStoredToken(accountId);
  if (!verified) {
    throw new Error(
      "Token could not be saved or read back. Restart the app after a Rust rebuild, then try again.",
    );
  }
  window.dispatchEvent(new Event("meow-token-saved"));
}
