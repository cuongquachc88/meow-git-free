import { useEffect, useMemo, useState } from "react";
import { useRepoStore } from "../../store/repoStore";
import { useAccountStore } from "../../store/accountStore";
import { useUIStore } from "../../store/uiStore";
import { git } from "../../ipc/git";
import { buildOriginUrl } from "../../lib/remoteUrl";
import { finishRemoteSetup } from "../../lib/ensureRemote";
import type { Account } from "../../types/accounts";

export function RemoteSetupDialog() {
  const { activeRepoPath } = useRepoStore();
  const { accounts, getAccountForRepo, bindRepoToAccount } = useAccountStore();
  const { isRemoteSetupOpen, remoteSetupDefaultRepoName, toggleAccountManager } = useUIStore();

  const bound = activeRepoPath ? getAccountForRepo(activeRepoPath) : null;
  const [accountId, setAccountId] = useState("");
  const [repoName, setRepoName] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const account = useMemo(
    () => accounts.find((a) => a.id === accountId) ?? null,
    [accounts, accountId],
  );

  const needsCustomUrl = account?.provider === "azure";

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
    setAccountId(bound?.id ?? accounts[0]?.id ?? "");
  }, [isRemoteSetupOpen, remoteSetupDefaultRepoName, bound?.id, accounts]);

  if (!isRemoteSetupOpen || !activeRepoPath) return null;

  const handleCancel = () => finishRemoteSetup(false);

  const handleCreate = async () => {
    if (!account) {
      alert("Add a Git account first (Accounts in the toolbar).");
      return;
    }
    let url = previewUrl;
    if (!url) {
      alert(needsCustomUrl ? "Enter the clone URL for your Azure repo." : "Enter a repository name.");
      return;
    }
    if (!/^https?:\/\/.+\.git$/i.test(url) && !/^git@.+:.+\.git$/i.test(url)) {
      if (!url.endsWith(".git")) url = `${url.replace(/\/+$/, "")}.git`;
    }

    setBusy(true);
    try {
      await git.addRemote(activeRepoPath, "origin", url);
      bindRepoToAccount(activeRepoPath, account.id);
      finishRemoteSetup(true);
    } catch (e) {
      alert(`Could not add remote: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]">
      <div className="glass-panel w-[440px] p-6">
        <div className="relative z-10">
          <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            New remote
          </h2>
          <p className="text-[12px] mb-4" style={{ color: "var(--text-muted)" }}>
            Add <span className="font-mono">origin</span> for this folder. Create the empty repository on
            your host first if it does not exist yet.
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
                className="glass-input w-full mb-3 text-[13px]"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                {accounts.map((a: Account) => (
                  <option key={a.id} value={a.id}>
                    {a.username} ({a.provider})
                  </option>
                ))}
              </select>

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

              <div className="flex justify-end gap-2">
                <button type="button" onClick={handleCancel} disabled={busy} className="glass-btn px-4 py-2 rounded-lg">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={busy || !previewUrl}
                  className="glass-btn glass-btn-accent px-4 py-2 rounded-lg"
                >
                  {busy ? "Adding…" : "Add origin"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
