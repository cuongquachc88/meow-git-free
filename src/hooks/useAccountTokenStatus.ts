import { useMemo } from "react";
import type { Account } from "../types/accounts";
import { useAccountStore } from "../store/accountStore";

/** PAT presence from persisted flags — no keychain access on app launch. */
export function useAccountTokenStatus(accounts: Account[]): Record<string, boolean> {
  const patPresent = useAccountStore((s) => s.patPresent);

  return useMemo(() => {
    const next: Record<string, boolean> = {};
    for (const a of accounts) {
      next[a.id] = !!patPresent[a.id];
    }
    return next;
  }, [accounts, patPresent]);
}
