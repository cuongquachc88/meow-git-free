import type { Account } from "../types/accounts";
import { normalizeRepoPath } from "./repoPath";

export function defaultRepoNameFromPath(repoPath: string): string {
  const normalized = normalizeRepoPath(repoPath);
  const parts = normalized.split(/[/\\]/).filter(Boolean);
  return parts[parts.length - 1] ?? "my-repo";
}

export function buildOriginUrl(
  account: Pick<Account, "provider" | "username" | "baseUrl">,
  repoName: string,
): string {
  const repo = repoName.trim().replace(/\.git$/i, "");
  if (!repo) {
    throw new Error("Repository name is required");
  }
  if (!/^[A-Za-z0-9._-]+$/.test(repo)) {
    throw new Error("Use letters, numbers, dots, hyphens, or underscores in the repo name");
  }

  switch (account.provider) {
    case "github":
      return `https://github.com/${account.username}/${repo}.git`;
    case "bitbucket":
      return `https://bitbucket.org/${account.username}/${repo}.git`;
    case "gitlab": {
      const base = (account.baseUrl ?? "https://gitlab.com").replace(/\/+$/, "");
      return `${base}/${account.username}/${repo}.git`;
    }
    case "gitea": {
      if (!account.baseUrl) {
        throw new Error("Gitea account needs an instance URL in Accounts");
      }
      const base = account.baseUrl.replace(/\/+$/, "");
      return `${base}/${account.username}/${repo}.git`;
    }
    case "azure":
      throw new Error("Enter the full Azure DevOps clone URL below");
    default:
      throw new Error(`Unsupported provider: ${account.provider}`);
  }
}
