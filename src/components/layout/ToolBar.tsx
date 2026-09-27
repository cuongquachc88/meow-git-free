import { useEffect, useState } from "react";
import { useRepoStore } from "../../store/repoStore";
import { useUIStore, Theme } from "../../store/uiStore";
import { useAccountStore } from "../../store/accountStore";
import { accounts as accountsIpc } from "../../ipc/accounts";
import { git } from "../../ipc/git";
import { ensureRemoteBeforeSync } from "../../lib/ensureRemote";
import { isNoRemoteError, resolveRemoteName } from "../../lib/remoteSync";
import { pickAccountIdWithToken } from "../../lib/accountToken";
import { requestAccountPat } from "../../lib/requestAccountPat";
import { useAccountTokenStatus } from "../../hooks/useAccountTokenStatus";
import {
  SyncCancelledError,
  describeSyncError,
  isAuthSyncError,
  pullRepoBranch,
  pushRepoBranch,
} from "../../lib/syncRemote";
import { RepoBranchPicker } from "./RepoBranchPicker";
import { TOOLBAR_BRAND_H } from "../../constants/layout";
import { AppLogo } from "../shared/AppLogo";
import {
  IconAccount,
  IconBranchLocal,
  IconCommit,
  IconFetch,
  IconMerge,
  IconMoon,
  IconPanelFiles,
  IconPull,
  IconPush,
  IconRefresh,
  IconSun,
  IconThemeAuto,
} from "../shared/icons/GitIcons";

export function ToolBar({
  onOpenRepo,
  changesPanelVisible,
  onToggleChangesPanel,
}: {
  onOpenRepo: () => void;
  changesPanelVisible?: boolean;
  onToggleChangesPanel?: () => void;
}) {
  const { activeRepoPath, refreshLog, refreshBranches, refreshStatus, branches } = useRepoStore();
  const { openCommitDialog, openBranchDialog, openMergeDialog, toggleAccountManager, theme, setTheme } =
    useUIStore();
  const { getAccountForRepo, accounts, bindRepoToAccount } = useAccountStore();

  const headBranch = branches.find((b) => b.isHead);
  const boundAccount = activeRepoPath ? getAccountForRepo(activeRepoPath) : null;
  const [toolbarAccountId, setToolbarAccountId] = useState("");

  useEffect(() => {
    if (!activeRepoPath) {
      setToolbarAccountId("");
      return;
    }
    let cancelled = false;
    void pickAccountIdWithToken(accounts, boundAccount?.id).then(({ accountId }) => {
      if (!cancelled) setToolbarAccountId(accountId);
    });
    return () => {
      cancelled = true;
    };
  }, [activeRepoPath, boundAccount?.id, accounts]);

  const tokenStatus = useAccountTokenStatus(accounts);
  const toolbarAccount = accounts.find((a) => a.id === toolbarAccountId) ?? null;
  const toolbarHasToken = toolbarAccountId ? !!tokenStatus[toolbarAccountId] : false;

  const getToken = async (accountId: string) => {
    try { return await accountsIpc.getToken(accountId); }
    catch { return null; }
  };

  const runFetch = async () => {
    if (!activeRepoPath) return;
    const remote = await resolveRemoteName(activeRepoPath);
    if (toolbarAccount) {
      const token = await getToken(toolbarAccount.id);
      if (token) {
        await git.fetchWithToken(activeRepoPath, remote, toolbarAccount.username, token);
        await Promise.all([refreshLog(), refreshBranches()]);
        return;
      }
    }
    await git.fetchRemote(activeRepoPath, remote);
    await Promise.all([refreshLog(), refreshBranches()]);
  };

  const handleFetch = async () => {
    if (!activeRepoPath) return;
    if (!(await ensureRemoteBeforeSync(activeRepoPath))) return;
    try {
      await runFetch();
    } catch (e) {
      if (isNoRemoteError(e) && (await ensureRemoteBeforeSync(activeRepoPath))) {
        try {
          await runFetch();
          return;
        } catch (retry) {
          e = retry;
        }
      }
      alert(`Fetch failed: ${e}`);
    }
  };

  const promptPatAndSave = async (): Promise<boolean> => {
    const acct = toolbarAccount ?? boundAccount ?? accounts[0] ?? null;
    if (!acct) return false;
    const pat = await requestAccountPat(acct.id);
    if (pat) {
      setToolbarAccountId(acct.id);
      if (activeRepoPath) bindRepoToAccount(activeRepoPath, acct.id);
      return true;
    }
    return false;
  };

  const handleAuthSyncFailure = async (action: "Pull" | "Push", e: unknown): Promise<boolean> => {
    const msg = describeSyncError(e);
    if (!msg) return true;
    if (!isAuthSyncError(e)) {
      return false;
    }
    if (await promptPatAndSave()) return false;
    const open = window.confirm(`${msg}\n\nOpen Accounts to add a token?`);
    if (open) toggleAccountManager();
    return true;
  };

  const handlePull = async () => {
    if (!activeRepoPath || !headBranch) return;
    try {
      const clean = await pullRepoBranch(
        activeRepoPath,
        headBranch.name,
        getAccountForRepo,
        toolbarAccountId || null,
      );
      await Promise.all([refreshLog(), refreshBranches(), refreshStatus()]);
      if (!clean) alert("Pull has conflicts — resolve in Files.");
    } catch (e) {
      if (e instanceof SyncCancelledError) return;
      if (await handleAuthSyncFailure("Pull", e)) return;
      try {
        const clean = await pullRepoBranch(
          activeRepoPath,
          headBranch.name,
          getAccountForRepo,
          toolbarAccountId || null,
        );
        await Promise.all([refreshLog(), refreshBranches(), refreshStatus()]);
        if (!clean) alert("Pull has conflicts — resolve in Files.");
      } catch (retry) {
        if (retry instanceof SyncCancelledError) return;
        const msg = describeSyncError(retry);
        if (msg) alert(`Pull failed: ${msg}`);
      }
    }
  };

  const handlePush = async () => {
    if (!activeRepoPath || !headBranch) return;

    const runPush = async () => {
      await pushRepoBranch(
        activeRepoPath,
        headBranch.name,
        getAccountForRepo,
        toolbarAccountId || null,
      );
      await refreshBranches();
    };

    try {
      await runPush();
    } catch (e) {
      if (e instanceof SyncCancelledError) return;
      if (await handleAuthSyncFailure("Push", e)) return;
      try {
        await runPush();
        return;
      } catch (retryAfterPat) {
        e = retryAfterPat;
      }

      const msg = describeSyncError(e);
      if (msg) alert(`Push failed: ${msg}`);
    }
  };

  const handleRefresh = async () => {
    if (!activeRepoPath) return;
    await Promise.all([refreshLog(), refreshBranches(), refreshStatus()]);
  };

  const cycleTheme = () => {
    const next: Record<Theme, Theme> = { dark: "light", light: "auto", auto: "dark" };
    setTheme(next[theme]);
  };

  const ctrl = "glass-btn toolbar-control";
  const gitBtn = `${ctrl} flex items-center gap-1 shrink-0`;

  return (
    <header className="glass-toolbar relative z-50 overflow-visible min-h-11 flex items-center pl-2.5 pr-3 gap-1.5 py-1 shrink-0">
      <div
        className="flex items-center gap-2 shrink-0 min-w-0"
        style={{ height: TOOLBAR_BRAND_H }}
      >
        <button
          type="button"
          onClick={onOpenRepo}
          className="shrink-0 rounded-[7px] overflow-hidden transition-opacity hover:opacity-90"
          style={{
            width: 28,
            height: 28,
            boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
            cursor: "pointer",
          }}
          title={activeRepoPath ? "Back to welcome" : "Open repository"}
        >
          <AppLogo size={28} />
        </button>
        <RepoBranchPicker onOpenRepo={onOpenRepo} />
      </div>

      {activeRepoPath && (
        <div className="flex items-center gap-1.5 ml-2 shrink-0 min-w-0">
          {accounts.length > 0 && (
            <select
              className="glass-input toolbar-control shrink-0"
              value={toolbarAccountId}
              onChange={(e) => {
                const id = e.target.value;
                setToolbarAccountId(id);
                if (id) bindRepoToAccount(activeRepoPath, id);
              }}
              title={
                toolbarAccount && !toolbarHasToken
                  ? "No PAT in keychain — push will ask for a token"
                  : "Account for HTTPS push/pull/fetch (required when origin URL is https://)"
              }
              style={
                toolbarAccount && !toolbarHasToken
                  ? { borderColor: "rgba(251, 146, 60, 0.55)" }
                  : undefined
              }
            >
              <option value="">SSH / system</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.username} ({a.provider})
                  {tokenStatus[a.id] === false ? " · no token" : ""}
                </option>
              ))}
            </select>
          )}

          <div className="toolbar-divider mx-0.5 shrink-0" />
          {!changesPanelVisible && onToggleChangesPanel && (
            <button onClick={onToggleChangesPanel} className={gitBtn} title="Show files panel">
              <IconPanelFiles size={14} />
              <span>Files</span>
            </button>
          )}
          <button onClick={handleFetch} className={gitBtn} title="Fetch">
            <IconFetch size={14} /><span>Fetch</span>
          </button>
          <button onClick={handlePull} className={gitBtn} title="Pull current branch">
            <IconPull size={14} /><span>Pull</span>
          </button>
          <button onClick={handlePush} className={gitBtn} title="Push">
            <IconPush size={14} /><span>Push</span>
          </button>
          <div className="toolbar-divider mx-0.5 shrink-0" />
          <button onClick={() => openBranchDialog()} className={gitBtn} title="Create branch">
            <IconBranchLocal size={14} /><span>Branch</span>
          </button>
          <button onClick={() => openMergeDialog()} className={gitBtn} title="Merge branches">
            <IconMerge size={14} /><span>Merge</span>
          </button>
          <button onClick={() => openCommitDialog()} className={`${gitBtn} glass-btn-accent`} title="Commit (optional amend in dialog)">
            <IconCommit size={14} /><span>Commit</span>
          </button>
        </div>
      )}

      <div className="flex-1" />

      <button disabled={!activeRepoPath} onClick={handleRefresh} className="glass-btn w-10 h-10 flex items-center justify-center p-0" title="Refresh">
        <IconRefresh size={22} />
      </button>
      <button onClick={cycleTheme} className="glass-btn w-10 h-10 flex items-center justify-center p-0" title={`Theme: ${theme}`}>
        {theme === "dark" ? <IconMoon size={22} /> : theme === "light" ? <IconSun size={22} /> : <IconThemeAuto size={22} />}
      </button>
      <button onClick={toggleAccountManager} className="glass-btn w-10 h-10 flex items-center justify-center p-0" title="Accounts">
        <IconAccount size={22} />
      </button>
    </header>
  );
}
