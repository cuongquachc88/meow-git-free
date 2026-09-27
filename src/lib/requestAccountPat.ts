import { useUIStore } from "../store/uiStore";

type PatWaiter = { accountId: string; resolve: (token: string | null) => void };

let waiter: PatWaiter | null = null;

/** Show in-app PAT dialog; resolves with trimmed token or null if cancelled. */
export function requestAccountPat(accountId: string): Promise<string | null> {
  if (waiter) {
    waiter.resolve(null);
    waiter = null;
  }
  return new Promise((resolve) => {
    waiter = { accountId, resolve };
    useUIStore.getState().openPatPrompt(accountId);
  });
}

export function completeAccountPat(token: string | null) {
  waiter?.resolve(token?.trim() ? token.trim() : null);
  waiter = null;
  useUIStore.getState().closePatPrompt();
}

export function cancelAccountPat() {
  completeAccountPat(null);
}
