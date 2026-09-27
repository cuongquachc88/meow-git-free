import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBoundToken, pullBranch, pushBranch } from "./remoteSync";

const pushWithToken = vi.fn();
const pullWithToken = vi.fn();
const pullBranchCmd = vi.fn();
const getToken = vi.fn();

vi.mock("../ipc/git", () => ({
  git: {
    pushWithToken: (...args: unknown[]) => pushWithToken(...args),
    pullWithToken: (...args: unknown[]) => pullWithToken(...args),
    pullBranch: (...args: unknown[]) => pullBranchCmd(...args),
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
  beforeEach(() => vi.clearAllMocks());

  it("calls pushWithToken on origin when creds provided", async () => {
    await pushBranch("/repo", "main", { username: "u", token: "t" });
    expect(pushWithToken).toHaveBeenCalledWith("/repo", "origin", "main", "u", "t");
  });

  it("throws when pushing without credentials", async () => {
    await expect(pushBranch("/repo", "main", null)).rejects.toThrow(/Bind a GitHub account/);
  });
});

describe("pullBranch", () => {
  beforeEach(() => vi.clearAllMocks());

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
