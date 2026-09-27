import { useEffect, useRef, useState, type ReactNode } from "react";
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
  IconSpinner,
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
  type SyncOp = "fetch" | "pull" | "push";
  type SyncStatus = { kind: "busy" | "ok" | "err"; text: string } | null;
  const [syncOp, setSyncOp] = useState<SyncOp | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(null);
  const syncStatusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashSyncStatus = (status: SyncStatus) => {
    if (syncStatusTimer.current) clearTimeout(syncStatusTimer.current);
    setSyncStatus(status);
    if (status && status.kind !== "busy") {
      syncStatusTimer.current = setTimeout(() => setSyncStatus(null), 2800);
    }
  };

  useEffect(
    () => () => {
      if (syncStatusTimer.current) clearTimeout(syncStatusTimer.current);
    },
    [],
  );

  const syncBusy = syncOp !== null;

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
    if (!activeRepoPath || syncBusy) return;
    if (!(await ensureRemoteBeforeSync(activeRepoPath))) return;
    setSyncOp("fetch");
    flashSyncStatus({ kind: "busy", text: "Fetching…" });
    try {
      await runFetch();
      flashSyncStatus({ kind: "ok", text: "Fetch done" });
    } catch (e) {
      if (isNoRemoteError(e) && (await ensureRemoteBeforeSync(activeRepoPath))) {
        try {
          await runFetch();
          flashSyncStatus({ kind: "ok", text: "Fetch done" });
          return;
        } catch (retry) {
          e = retry;
        }
      }
      flashSyncStatus({ kind: "err", text: "Fetch failed" });
      alert(`Fetch failed: ${e}`);
    } finally {
      setSyncOp(null);
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
    if (!activeRepoPath || !headBranch || syncBusy) return;
    setSyncOp("pull");
    flashSyncStatus({ kind: "busy", text: "Pulling…" });
    try {
      const clean = await pullRepoBranch(
        activeRepoPath,
        headBranch.name,
        getAccountForRepo,
        toolbarAccountId || null,
      );
      await Promise.all([refreshLog(), refreshBranches(), refreshStatus()]);
      if (!clean) {
        flashSyncStatus({ kind: "err", text: "Pull — conflicts" });
        alert("Pull has conflicts — resolve in Files.");
      } else {
        flashSyncStatus({ kind: "ok", text: "Pull done" });
      }
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
        if (!clean) {
          flashSyncStatus({ kind: "err", text: "Pull — conflicts" });
          alert("Pull has conflicts — resolve in Files.");
        } else {
          flashSyncStatus({ kind: "ok", text: "Pull done" });
        }
        return;
      } catch (retry) {
        if (retry instanceof SyncCancelledError) return;
        flashSyncStatus({ kind: "err", text: "Pull failed" });
        const msg = describeSyncError(retry);
        if (msg) alert(`Pull failed: ${msg}`);
      }
    } finally {
      setSyncOp(null);
    }
  };

  const handlePush = async () => {
    if (!activeRepoPath || !headBranch || syncBusy) return;

    const runPush = async () => {
      await pushRepoBranch(
        activeRepoPath,
        headBranch.name,
        getAccountForRepo,
        toolbarAccountId || null,
      );
      await refreshBranches();
    };

    setSyncOp("push");
    flashSyncStatus({ kind: "busy", text: "Pushing…" });
    try {
      await runPush();
      flashSyncStatus({ kind: "ok", text: "Push done" });
    } catch (e) {
      if (e instanceof SyncCancelledError) return;
      if (await handleAuthSyncFailure("Push", e)) return;
      try {
        await runPush();
        flashSyncStatus({ kind: "ok", text: "Push done" });
        return;
      } catch (retryAfterPat) {
        e = retryAfterPat;
      }

      flashSyncStatus({ kind: "err", text: "Push failed" });
      const msg = describeSyncError(e);
      if (msg) alert(`Push failed: ${msg}`);
    } finally {
      setSyncOp(null);
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

  const SyncGitButton = ({
    op,
    label,
    busyLabel,
    title,
    icon,
    onClick,
  }: {
    op: SyncOp;
    label: string;
    busyLabel: string;
    title: string;
    icon: ReactNode;
    onClick: () => void;
  }) => {
    const active = syncOp === op;
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={syncBusy}
        className={`${gitBtn}${active ? " toolbar-sync-active" : ""}`}
        title={active ? busyLabel : title}
        aria-busy={active}
      >
        {active ? <IconSpinner size={14} className="toolbar-sync-spin" /> : icon}
        <span>{active ? busyLabel : label}</span>
      </button>
    );
  };

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
          {syncStatus && (
            <span
              className={`toolbar-sync-status toolbar-sync-status--${syncStatus.kind} shrink-0`}
              role="status"
              aria-live="polite"
            >
              {syncStatus.text}
            </span>
          )}
          <SyncGitButton
            op="fetch"
            label="Fetch"
            busyLabel="Fetching…"
            title="Fetch"
            icon={<IconFetch size={14} />}
            onClick={() => void handleFetch()}
          />
          <SyncGitButton
            op="pull"
            label="Pull"
            busyLabel="Pulling…"
            title="Pull current branch"
            icon={<IconPull size={14} />}
            onClick={() => void handlePull()}
          />
          <SyncGitButton
            op="push"
            label="Push"
            busyLabel="Pushing…"
            title="Push"
            icon={<IconPush size={14} />}
            onClick={() => void handlePush()}
          />
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
