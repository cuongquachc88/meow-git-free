import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Account } from "../types/accounts";
import { accounts as accountsIpc } from "../ipc/accounts";

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

      bindRepoToAccount: (repoPath, accountId) =>
        set((s) => ({
          repoAccountMap: { ...s.repoAccountMap, [repoPath]: accountId },
        })),

      getAccountForRepo: (repoPath) => {
        const { accounts, repoAccountMap } = get();
        const id = repoAccountMap[repoPath];
        return accounts.find((a) => a.id === id) ?? null;
      },
    }),
    { name: "meow-git-accounts" }
  )
);
