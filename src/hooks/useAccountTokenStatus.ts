import { useEffect, useState } from "react";
import type { Account } from "../types/accounts";
import { readStoredToken } from "../lib/accountToken";

/** Map account id → keychain has a non-empty PAT. */
export function useAccountTokenStatus(accounts: Account[]): Record<string, boolean> {
  const [status, setStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const next: Record<string, boolean> = {};
      for (const a of accounts) {
        next[a.id] = !!(await readStoredToken(a.id));
      }
      if (!cancelled) setStatus(next);
    };
    void load();
    const onSaved = () => void load();
    window.addEventListener("meow-token-saved", onSaved);
    return () => {
      cancelled = true;
      window.removeEventListener("meow-token-saved", onSaved);
    };
  }, [accounts]);

  return status;
}
