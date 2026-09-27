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
    expect(token).toEqual({ username: "octo", token: "secret" });
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

  it("falls back to system push without token creds", async () => {
    pushBranchCmd.mockResolvedValue(undefined);
    await pushBranch("/repo", "main", null);
    expect(pushBranchCmd).toHaveBeenCalledWith("/repo", "origin", "main");
  });

  it("uses first remote when origin is missing", async () => {
    listRemotes.mockResolvedValue([{ name: "github", url: "https://github.com/a/b.git", pushUrl: null }]);
    pushBranchCmd.mockResolvedValue(undefined);
    await pushBranch("/repo", "main", null);
    expect(pushBranchCmd).toHaveBeenCalledWith("/repo", "github", "main");
  });

  it("surfaces error when system push fails", async () => {
    pushBranchCmd.mockRejectedValue(new Error("auth failed"));
    await expect(pushBranch("/repo", "main", null)).rejects.toThrow(/no usable account token/);
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

  it("falls back to local pull without creds", async () => {
    pullBranchCmd.mockResolvedValue(false);
    const clean = await pullBranch("/repo", "feature", null);
    expect(clean).toBe(false);
    expect(pullBranchCmd).toHaveBeenCalledWith("/repo", "origin", "feature");
  });
});
