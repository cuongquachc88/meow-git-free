import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Account } from "../types/accounts";
import { accounts as accountsIpc } from "../ipc/accounts";
import { clearSessionToken, setSessionToken } from "../lib/accountToken";
import { normalizeRepoPath } from "../lib/repoPath";

interface AccountStore {
  accounts: Account[];
  repoAccountMap: Record<string, string>;
  /** Set when PAT was saved in keychain — avoids keychain reads on every app launch. */
  patPresent: Record<string, boolean>;

  addAccount: (account: Account, token: string) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
  bindRepoToAccount: (repoPath: string, accountId: string) => void;
  getAccountForRepo: (repoPath: string) => Account | null;
  markPatPresent: (accountId: string, present: boolean) => void;
}

export const useAccountStore = create<AccountStore>()(
  persist(
    (set, get) => ({
      accounts: [],
      repoAccountMap: {},
      patPresent: {},

      addAccount: async (account, token) => {
        const trimmed = token.trim();
        await accountsIpc.storeToken(account.id, trimmed);
        setSessionToken(account.id, trimmed);
        set((s) => ({
          accounts: [...s.accounts, account],
          patPresent: { ...s.patPresent, [account.id]: true },
        }));
      },

      removeAccount: async (id) => {
        await accountsIpc.deleteToken(id);
        clearSessionToken(id);
        set((s) => {
          const { [id]: _removed, ...patPresent } = s.patPresent;
          return {
            accounts: s.accounts.filter((a) => a.id !== id),
            repoAccountMap: Object.fromEntries(
              Object.entries(s.repoAccountMap).filter(([, v]) => v !== id),
            ),
            patPresent,
          };
        });
      },

      markPatPresent: (accountId, present) =>
        set((s) => ({
          patPresent: present
            ? { ...s.patPresent, [accountId]: true }
            : Object.fromEntries(Object.entries(s.patPresent).filter(([k]) => k !== accountId)),
        })),

      bindRepoToAccount: (repoPath, accountId) => {
        const key = normalizeRepoPath(repoPath);
        set((s) => ({
          repoAccountMap: { ...s.repoAccountMap, [key]: accountId },
        }));
      },

      getAccountForRepo: (repoPath) => {
        const { accounts, repoAccountMap } = get();
        const key = normalizeRepoPath(repoPath);
        const id = repoAccountMap[key] ?? repoAccountMap[repoPath];
        return accounts.find((a) => a.id === id) ?? null;
      },
    }),
    {
      name: "meow-git-accounts",
      /** Never persist PATs — tokens live only in OS keychain via Rust. */
      partialize: (s) => ({
        accounts: s.accounts,
        repoAccountMap: s.repoAccountMap,
        patPresent: s.patPresent,
      }),
    },
  ),
);
