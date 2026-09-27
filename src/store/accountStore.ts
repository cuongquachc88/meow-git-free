import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Account } from "../types/accounts";
import { accounts as accountsIpc } from "../ipc/accounts";
import { normalizeRepoPath } from "../lib/repoPath";

interface AccountStore {
  accounts: Account[];
  repoAccountMap: Record<string, string>;

  addAccount: (account: Account, token: string) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
  bindRepoToAccount: (repoPath: string, accountId: string) => void;
  getAccountForRepo: (repoPath: string) => Account | null;
}

export const useAccountStore = create<AccountStore>()(
  persist(
    (set, get) => ({
      accounts: [],
      repoAccountMap: {},

      addAccount: async (account, token) => {
        await accountsIpc.storeToken(account.id, token);
        set((s) => ({ accounts: [...s.accounts, account] }));
      },

      removeAccount: async (id) => {
        await accountsIpc.deleteToken(id);
        set((s) => ({
          accounts: s.accounts.filter((a) => a.id !== id),
          repoAccountMap: Object.fromEntries(
            Object.entries(s.repoAccountMap).filter(([, v]) => v !== id)
          ),
        }));
      },

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
      }),
    },
  ),
);
