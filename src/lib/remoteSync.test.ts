import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBoundToken, pullBranch, pushBranch } from "./remoteSync";

const pushWithToken = vi.fn();
const pushBranchCmd = vi.fn();
const pullWithToken = vi.fn();
const pullBranchCmd = vi.fn();
const getToken = vi.fn();
const listRemotes = vi.fn();

vi.mock("../ipc/git", () => ({
  git: {
    pushWithToken: (...args: unknown[]) => pushWithToken(...args),
    pushBranch: (...args: unknown[]) => pushBranchCmd(...args),
    pullWithToken: (...args: unknown[]) => pullWithToken(...args),
    pullBranch: (...args: unknown[]) => pullBranchCmd(...args),
    listRemotes: (...args: unknown[]) => listRemotes(...args),
  },
}));

vi.mock("../store/accountStore", () => ({
  useAccountStore: {
    getState: () => ({
      accounts: [],
      bindRepoToAccount: vi.fn(),
      markPatPresent: vi.fn(),
    }),
  },
}));

vi.mock("../ipc/accounts", () => ({
  accounts: {
    getToken: (...args: unknown[]) => getToken(...args),
  },
}));

describe("getBoundToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when repo has no bound account", async () => {
    const token = await getBoundToken("/repo", () => null);
    expect(token).toBeNull();
  });

  it("returns credentials when account and token exist", async () => {
    getToken.mockResolvedValue("secret");
    const token = await getBoundToken("/repo", () => ({ id: "acc-1", username: "octo" }));
    expect(token).toEqual({ username: "octo", token: "secret", accountId: "acc-1" });
    expect(getToken).toHaveBeenCalledWith("acc-1");
  });

  it("returns null when token fetch fails or is empty", async () => {
    getToken.mockRejectedValue(new Error("keychain"));
    const fail = await getBoundToken("/repo", () => ({ id: "a", username: "u" }));
    expect(fail).toBeNull();

    getToken.mockResolvedValue("");
    const empty = await getBoundToken("/repo", () => ({ id: "a", username: "u" }));
    expect(empty).toBeNull();
  });
});

describe("pushBranch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listRemotes.mockResolvedValue([{ name: "origin", url: "https://github.com/a/b.git", pushUrl: null }]);
  });

  it("calls pushWithToken on origin when creds provided", async () => {
    await pushBranch("/repo", "main", { username: "u", token: "t" });
    expect(pushWithToken).toHaveBeenCalledWith("/repo", "origin", "main", "u", "t");
  });

  it("requires token for HTTPS origin without creds", async () => {
    await expect(pushBranch("/repo", "main", null)).rejects.toThrow(/HTTPS_REMOTE_NEEDS_TOKEN/);
    expect(pushBranchCmd).not.toHaveBeenCalled();
  });

  it("falls back to system push for SSH origin without token", async () => {
    listRemotes.mockResolvedValue([
      { name: "origin", url: "git@github.com:a/b.git", pushUrl: null },
    ]);
    pushBranchCmd.mockResolvedValue(undefined);
    await pushBranch("/repo", "main", null);
    expect(pushBranchCmd).toHaveBeenCalledWith("/repo", "origin", "main");
  });

  it("surfaces error when token push fails", async () => {
    pushWithToken.mockRejectedValue(new Error("auth failed"));
    await expect(pushBranch("/repo", "main", { username: "u", token: "t" })).rejects.toThrow(/auth failed/);
  });
});

describe("pullBranch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listRemotes.mockResolvedValue([{ name: "origin", url: "https://github.com/a/b.git", pushUrl: null }]);
  });

  it("uses token pull when creds provided", async () => {
    pullWithToken.mockResolvedValue(true);
    const clean = await pullBranch("/repo", "feature", { username: "u", token: "t" });
    expect(clean).toBe(true);
    expect(pullWithToken).toHaveBeenCalledWith("/repo", "origin", "feature", "u", "t");
  });

  it("requires token for HTTPS pull without creds", async () => {
    await expect(pullBranch("/repo", "feature", null)).rejects.toThrow(/HTTPS_REMOTE_NEEDS_TOKEN/);
  });
});
