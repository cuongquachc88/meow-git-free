export type ProviderKind = "github" | "gitlab" | "bitbucket" | "azure" | "gitea";
export type AuthType = "oauth" | "pat" | "ssh";

export interface Account {
  id: string;
  provider: ProviderKind;
  baseUrl: string | null;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  authType: AuthType;
}

export interface PullRequest {
  number: number;
  title: string;
  state: string;
  htmlUrl: string;
  body: string | null;
  head: { refName: string; sha: string };
  base: { refName: string; sha: string };
}
