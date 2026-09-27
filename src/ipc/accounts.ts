import { invoke } from "@tauri-apps/api/core";
import type { Account } from "../types/accounts";

export const accounts = {
  storeToken: (accountId: string, token: string) =>
    invoke<void>("store_account_token", { accountId, token }),
  getToken: (accountId: string) => invoke<string>("get_account_token", { accountId }),
  deleteToken: (accountId: string) => invoke<void>("delete_account_token", { accountId }),
  createAccount: (
    provider: string,
    username: string,
    authType: string,
    baseUrl?: string
  ) => invoke<Account>("create_account", { provider, username, authType, baseUrl }),
};
