import { accounts as accountsIpc } from "../ipc/accounts";
import type { Account } from "../types/accounts";

export async function readStoredToken(accountId: string): Promise<string | null> {
  if (!accountId) return null;
  try {
    const token = await accountsIpc.getToken(accountId);
    const trimmed = typeof token === "string" ? token.trim() : "";
    return trimmed.length > 0 ? trimmed : null;
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
  const verified = await readStoredToken(accountId);
  if (!verified) {
    throw new Error(
      "Token could not be saved or read back. Restart the app after a Rust rebuild, then try again.",
    );
  }
  window.dispatchEvent(new Event("meow-token-saved"));
}
