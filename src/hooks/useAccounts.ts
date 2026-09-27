import { useAccountStore } from "../store/accountStore";
import { accounts as accountsIpc } from "../ipc/accounts";
import type { ProviderKind } from "../types/accounts";

export function useAccounts() {
  const store = useAccountStore();

  const addPatAccount = async (
    provider: ProviderKind,
    username: string,
    token: string,
    baseUrl?: string
  ) => {
    const account = await accountsIpc.createAccount(provider, username, "pat", baseUrl);
    await store.addAccount(account, token);
    return account;
  };

  return { ...store, addPatAccount };
}
