import { useEffect, useMemo, useState } from "react";
import { useRepoStore } from "../../store/repoStore";
import { useAccountStore } from "../../store/accountStore";
import { useUIStore } from "../../store/uiStore";
import { accounts as accountsIpc } from "../../ipc/accounts";
import { git } from "../../ipc/git";
import { buildOriginUrl } from "../../lib/remoteUrl";
import { finishRemoteSetup } from "../../lib/ensureRemote";
import { pickAccountIdWithToken, readStoredToken, saveStoredToken } from "../../lib/accountToken";
import type { Account } from "../../types/accounts";

const HOST_CREATE_PROVIDERS = new Set<Account["provider"]>(["github", "gitlab"]);

export function RemoteSetupDialog() {
  const { activeRepoPath } = useRepoStore();
  const { accounts, getAccountForRepo, bindRepoToAccount } = useAccountStore();
  const { isRemoteSetupOpen, remoteSetupDefaultRepoName, remoteSetupReason, toggleAccountManager } =
    useUIStore();

  const bound = activeRepoPath ? getAccountForRepo(activeRepoPath) : null;
  const [accountId, setAccountId] = useState("");
  const [repoName, setRepoName] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [tokenInKeychain, setTokenInKeychain] = useState<boolean | null>(null);
  const [patInput, setPatInput] = useState("");
  const [showPat, setShowPat] = useState(false);
  const [changeToken, setChangeToken] = useState(false);
  const [tokenChecking, setTokenChecking] = useState(false);

  const account = useMemo(
    () => accounts.find((a) => a.id === accountId) ?? null,
    [accounts, accountId],
  );

  const needsCustomUrl = account?.provider === "azure";
  const canCreateOnHost = account != null && HOST_CREATE_PROVIDERS.has(account.provider);

  const previewUrl = useMemo(() => {
    if (needsCustomUrl) return customUrl.trim();
    if (!account || !repoName.trim()) return "";
    try {
      return buildOriginUrl(account, repoName);
    } catch {
      return "";
    }
  }, [account, repoName, needsCustomUrl, customUrl]);

  useEffect(() => {
    if (!isRemoteSetupOpen) return;
    setRepoName(remoteSetupDefaultRepoName);
    setCustomUrl("");
    setVisibility("private");
    setPatInput("");
    setShowPat(false);
    setChangeToken(false);

    if (accounts.length === 0) {
      setAccountId("");
      setTokenInKeychain(null);
      return;
    }

    const { accountId: id, hasToken } = pickAccountIdWithToken(accounts, bound?.id);
    setAccountId(id);
    setTokenInKeychain(hasToken);
    setTokenChecking(false);
  }, [isRemoteSetupOpen, remoteSetupDefaultRepoName, bound?.id, accounts]);

  useEffect(() => {
    if (!isRemoteSetupOpen || !accountId) return;
    let cancelled = false;
    setTokenChecking(true);
    void readStoredToken(accountId).then((t) => {
      if (cancelled) return;
      setTokenInKeychain(!!t);
      setTokenChecking(false);
      if (t) {
        setChangeToken(false);
        setPatInput("");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [accountId, isRemoteSetupOpen]);

  if (!isRemoteSetupOpen || !activeRepoPath) return null;

  const handleCancel = () => finishRemoteSetup(false);

  const resolveToken = async (acct: Account): Promise<string | null> => {
    const stored = await readStoredToken(acct.id);
    if (stored) return stored;
    const pasted = patInput.trim();
    if (!pasted) return null;
    await saveStoredToken(acct.id, pasted);
    setTokenInKeychain(true);
    setPatInput("");
    return pasted;
  };

  const finalizeOrigin = async (url: string, acct: Account) => {
    let normalized = url;
    if (!/^https?:\/\/.+\.git$/i.test(normalized) && !/^git@.+:.+\.git$/i.test(normalized)) {
      if (!normalized.endsWith(".git")) normalized = `${normalized.replace(/\/+$/, "")}.git`;
    }
    await git.upsertRemote(activeRepoPath, "origin", normalized);
    bindRepoToAccount(activeRepoPath, acct.id);
    finishRemoteSetup(true);
  };

  const handleAddOriginOnly = async () => {
    if (!account || !previewUrl) return;
    setBusy(true);
    try {
      await finalizeOrigin(previewUrl, account);
    } catch (e) {
      alert(`Could not add remote: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async () => {
    if (!account) {
      alert("Add a Git account first (Accounts in the toolbar).");
      return;
    }
    if (!needsCustomUrl && !repoName.trim()) {
      alert("Enter a repository name.");
      return;
    }

    setBusy(true);
    try {
      let url = previewUrl;

      if (!needsCustomUrl && canCreateOnHost) {
        const token = await resolveToken(account);
        if (!token) {
          setTokenInKeychain(false);
          return;
        }
        try {
          url = await accountsIpc.createHostRepository(
            account.provider,
            token,
            repoName.trim(),
            account.baseUrl,
            visibility === "private",
          );
        } catch (e) {
          const msg = String(e);
          if (/already exists|name already|422|409/i.test(msg)) {
            url = buildOriginUrl(account, repoName);
          } else {
            throw e;
          }
        }
      } else if (!url) {
        alert(needsCustomUrl ? "Enter the clone URL for your Azure repo." : "Enter a repository name.");
        return;
      }

      await finalizeOrigin(url, account);
    } catch (e) {
      alert(`Could not set up remote: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  const showPatField =
    canCreateOnHost && !tokenChecking && (tokenInKeychain === false || changeToken);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[500]">
      <div className="glass-panel w-[440px] p-6 max-h-[90vh] overflow-y-auto">
        <div className="relative z-10">
          <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            {remoteSetupReason === "repo_not_found"
              ? "Create repository on GitHub?"
              : "No remote — create one?"}
          </h2>
          <p className="text-[12px] mb-4" style={{ color: "var(--text-muted)" }}>
            {remoteSetupReason === "repo_not_found" ? (
              <>
                <span className="font-mono">origin</span> points to a repo that does not exist yet (404).
                Meow Git can create it on GitHub/GitLab using your saved keychain token, update{" "}
                <span className="font-mono">origin</span>, then you can push again.
              </>
            ) : (
              <>
                This folder has no <span className="font-mono">origin</span>. Meow Git can create the repo on
                GitHub/GitLab (when supported), add the remote, then push.
              </>
            )}
          </p>

          {accounts.length === 0 ? (
            <div className="space-y-3">
              <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                No accounts yet — add one to build the remote URL.
              </p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={handleCancel} className="glass-btn px-4 py-2 rounded-lg">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleCancel();
                    toggleAccountManager();
                  }}
                  className="glass-btn glass-btn-accent px-4 py-2 rounded-lg"
                >
                  Open Accounts
                </button>
              </div>
            </div>
          ) : (
            <>
              <label className="block text-[11px] uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>
                Account
              </label>
              <select
                className="glass-input w-full mb-1 text-[13px]"
                value={accountId}
                onChange={(e) => {
                  setAccountId(e.target.value);
                  setPatInput("");
                  setChangeToken(false);
                }}
              >
                {accounts.map((a: Account) => (
                  <option key={a.id} value={a.id}>
                    {a.username} ({a.provider})
                  </option>
                ))}
              </select>
              {canCreateOnHost && tokenChecking && (
                <p className="text-[10px] mb-3" style={{ color: "var(--text-faint)" }}>
                  Checking token…
                </p>
              )}
              {canCreateOnHost && !tokenChecking && tokenInKeychain === true && (
                <div className="flex items-center justify-between gap-2 mb-3">
                  <p className="text-[10px]" style={{ color: "var(--accent)" }}>
                    Token ready for this account.
                  </p>
                  <button
                    type="button"
                    className="text-[10px] shrink-0 underline-offset-2 hover:underline"
                    style={{ color: "var(--text-muted)" }}
                    onClick={() => setChangeToken(true)}
                  >
                    Change token
                  </button>
                </div>
              )}

              {!needsCustomUrl && (
                <>
                  <label className="block text-[11px] uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>
                    Repository name
                  </label>
                  <input
                    className="glass-input w-full mb-3 text-[13px]"
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value)}
                    placeholder="my-project"
                    autoFocus
                  />
                  {canCreateOnHost && (
                    <>
                      <label
                        className="block text-[11px] uppercase tracking-wide mb-1.5"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Visibility
                      </label>
                      <div className="flex gap-2 mb-3">
                        {(["public", "private"] as const).map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setVisibility(v)}
                            className="flex-1 glass-btn py-2 rounded-lg text-[12px] capitalize"
                            style={
                              visibility === v
                                ? {
                                    background: "var(--accent-bg)",
                                    borderColor: "var(--accent-border)",
                                    color: "var(--accent)",
                                  }
                                : undefined
                            }
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {showPatField && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                          Personal access token
                        </label>
                        <button
                          type="button"
                          className="text-[10px]"
                          style={{ color: "var(--accent)" }}
                          onClick={() => toggleAccountManager()}
                        >
                          Accounts…
                        </button>
                      </div>
                      <p className="text-[10px] mb-1.5 leading-relaxed" style={{ color: "var(--text-faint)" }}>
                        This account has no token in keychain yet. Paste a PAT to save it, or pick another account
                        above.
                      </p>
                      <div className="relative">
                        <input
                          type={showPat ? "text" : "password"}
                          className="glass-input w-full text-[13px] pr-12"
                          value={patInput}
                          onChange={(e) => setPatInput(e.target.value)}
                          placeholder="ghp_…"
                          autoComplete="off"
                        />
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px]"
                          style={{ color: "var(--text-muted)" }}
                          onClick={() => setShowPat((v) => !v)}
                        >
                          {showPat ? "Hide" : "Show"}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {needsCustomUrl && (
                <>
                  <label className="block text-[11px] uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>
                    Clone URL
                  </label>
                  <input
                    className="glass-input w-full mb-3 text-[13px] font-mono text-[12px]"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://dev.azure.com/org/project/_git/repo"
                    autoFocus
                  />
                </>
              )}

              {previewUrl && !needsCustomUrl && (
                <p className="text-[11px] mb-4 font-mono break-all" style={{ color: "var(--text-muted)" }}>
                  {previewUrl}
                </p>
              )}

              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" onClick={handleCancel} disabled={busy} className="glass-btn px-4 py-2 rounded-lg">
                  Cancel
                </button>
                {previewUrl && canCreateOnHost && (
                  <button
                    type="button"
                    onClick={() => void handleAddOriginOnly()}
                    disabled={busy}
                    className="glass-btn px-4 py-2 rounded-lg text-[12px]"
                    title="Skip API create if the repo already exists on GitHub"
                  >
                    Add origin only
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleCreate()}
                  disabled={busy || !previewUrl}
                  className="glass-btn glass-btn-accent px-4 py-2 rounded-lg"
                >
                  {busy ? "Creating…" : "Create & add origin"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
