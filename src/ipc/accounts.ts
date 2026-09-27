import { invoke } from "@tauri-apps/api/core";
import type { Account } from "../types/accounts";

const tokenArgs = (accountId: string) => ({ accountId, account_id: accountId });

export const accounts = {
  storeToken: (accountId: string, token: string) =>
    invoke<void>("store_account_token", { ...tokenArgs(accountId), token }),
  getToken: (accountId: string) => invoke<string>("get_account_token", tokenArgs(accountId)),
  deleteToken: (accountId: string) =>
    invoke<void>("delete_account_token", tokenArgs(accountId)),
  createAccount: (
    provider: string,
    username: string,
    authType: string,
    baseUrl?: string
  ) => invoke<Account>("create_account", { provider, username, authType, baseUrl }),
  createHostRepository: (
    provider: string,
    token: string,
    repoName: string,
    baseUrl: string | null | undefined,
    privateRepo: boolean,
  ) =>
    invoke<string>("create_host_repository", {
      provider,
      token,
      repoName,
      baseUrl: baseUrl ?? null,
      privateRepo,
    }),
};
