import { useEffect, useState, type ReactNode } from "react";
import { showSyncToast } from "../../lib/syncToast";
import { useRepoStore } from "../../store/repoStore";
import { useUIStore, Theme } from "../../store/uiStore";
import { useAccountStore } from "../../store/accountStore";
import { clearSessionToken, readStoredToken } from "../../lib/accountToken";
import { clearPatAutoDismissed, clearPatAutoShown } from "../../lib/requestAccountPat";
import { git } from "../../ipc/git";
import { ensureRemoteBeforeSync } from "../../lib/ensureRemote";
import { isNoRemoteError, resolveRemoteName } from "../../lib/remoteSync";
import { pickAccountIdWithToken } from "../../lib/accountToken";
import { requestAccountPatForAuth } from "../../lib/requestAccountPat";
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
import { AnimatedDots } from "../shared/AnimatedDots";
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
  const { activeRepoPath, refreshAfterRemoteSync, refreshLog, refreshBranches, refreshStatus, branches } =
    useRepoStore();
  const { openCommitDialog, openBranchDialog, openMergeDialog, toggleAccountManager, theme, setTheme } =
    useUIStore();
  const { getAccountForRepo, accounts, bindRepoToAccount } = useAccountStore();

  const headBranch = branches.find((b) => b.isHead);
  const boundAccount = activeRepoPath ? getAccountForRepo(activeRepoPath) : null;
  const [toolbarAccountId, setToolbarAccountId] = useState("");
  type SyncOp = "fetch" | "pull" | "push";
  const [syncOp, setSyncOp] = useState<SyncOp | null>(null);
  const syncBusy = syncOp !== null;

  useEffect(() => {
    if (!activeRepoPath) {
      setToolbarAccountId("");
      return;
    }
    const { accountId } = pickAccountIdWithToken(accounts, boundAccount?.id);
    setToolbarAccountId(accountId);
  }, [activeRepoPath, boundAccount?.id, accounts]);

  const tokenStatus = useAccountTokenStatus(accounts);
  const toolbarAccount = accounts.find((a) => a.id === toolbarAccountId) ?? null;
  const toolbarHasToken = toolbarAccountId ? !!tokenStatus[toolbarAccountId] : false;

  const runFetch = async () => {
    if (!activeRepoPath) return;
    const remote = await resolveRemoteName(activeRepoPath);
    if (toolbarAccount) {
      const token = await readStoredToken(toolbarAccount.id);
      if (token) {
        await git.fetchWithToken(activeRepoPath, remote, toolbarAccount.username, token);
        await refreshAfterRemoteSync();
        return;
      }
    }
    await git.fetchRemote(activeRepoPath, remote);
    await refreshAfterRemoteSync();
  };

  const handleFetch = async () => {
    if (!activeRepoPath || syncBusy) return;
    if (!(await ensureRemoteBeforeSync(activeRepoPath))) return;
    setSyncOp("fetch");
    showSyncToast("Fetching…", "busy");
    try {
      await runFetch();
      showSyncToast("Fetch complete", "ok");
    } catch (e) {
      if (isNoRemoteError(e) && (await ensureRemoteBeforeSync(activeRepoPath))) {
        try {
          await runFetch();
          showSyncToast("Fetch complete", "ok");
          return;
        } catch (retry) {
          e = retry;
        }
      }
      showSyncToast("Fetch failed", "err");
      alert(`Fetch failed: ${e}`);
    } finally {
      setSyncOp(null);
    }
  };

  const promptPatAndSave = async (options?: { reprompt?: boolean }): Promise<boolean> => {
    const acct = toolbarAccount ?? boundAccount ?? accounts[0] ?? null;
    if (!acct) return false;
    if (options?.reprompt) {
      clearSessionToken(acct.id);
      clearPatAutoDismissed(acct.id);
      clearPatAutoShown(acct.id);
    }
    const pat = await requestAccountPatForAuth(acct.id, options);
    if (pat) {
      setToolbarAccountId(acct.id);
      if (activeRepoPath) bindRepoToAccount(activeRepoPath, acct.id);
      return true;
    }
    return false;
  };

  const handleAuthSyncFailure = async (_action: "Pull" | "Push", e: unknown): Promise<boolean> => {
    const raw = e instanceof Error ? e.message : String(e);
    const stalePat = /\b403\b|status code: 403|authentication replays|HTTP authentication failed/i.test(raw);
    const msg = describeSyncError(e);
    if (!msg) return true;
    if (!isAuthSyncError(e) && !stalePat) {
      return false;
    }
    const acct = toolbarAccount ?? boundAccount ?? accounts[0] ?? null;
    if (acct && (await readStoredToken(acct.id)) && !stalePat) {
      return false;
    }
    if (stalePat && acct) {
      if (await promptPatAndSave({ reprompt: true })) return false;
      showSyncToast("GitHub rejected the saved PAT — paste a new one with repo scope in Accounts", "err");
      return true;
    }
    const hadPatFlag = acct ? !!useAccountStore.getState().patPresent[acct.id] : false;
    if (await promptPatAndSave()) return false;
    showSyncToast(
      hadPatFlag
        ? "PAT missing in Keychain for this app (dev vs release). Re-save in Accounts."
        : "Add a PAT in Accounts — it stays in Keychain",
      "err",
    );
    return true;
  };

  const handlePull = async () => {
    if (!activeRepoPath || !headBranch || syncBusy) return;
    setSyncOp("pull");
    showSyncToast("Pulling…", "busy");
    try {
      const clean = await pullRepoBranch(
        activeRepoPath,
        headBranch.name,
        getAccountForRepo,
        toolbarAccountId || null,
      );
      await refreshAfterRemoteSync();
      if (!clean) {
        showSyncToast("Pull — conflicts", "err");
        alert("Pull has conflicts — resolve in Files.");
      } else {
        showSyncToast("Pull complete", "ok");
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
        await refreshAfterRemoteSync();
        if (!clean) {
          showSyncToast("Pull — conflicts", "err");
          alert("Pull has conflicts — resolve in Files.");
        } else {
          showSyncToast("Pull complete", "ok");
        }
        return;
      } catch (retry) {
        if (retry instanceof SyncCancelledError) return;
        showSyncToast("Pull failed", "err");
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
      await refreshAfterRemoteSync();
    };

    setSyncOp("push");
    showSyncToast("Pushing…", "busy");
    try {
      await runPush();
      showSyncToast("Push complete", "ok");
    } catch (e) {
      if (e instanceof SyncCancelledError) return;
      if (await handleAuthSyncFailure("Push", e)) return;
      try {
        await runPush();
        showSyncToast("Push complete", "ok");
        return;
      } catch (retryAfterPat) {
        e = retryAfterPat;
      }

      showSyncToast("Push failed", "err");
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
        {icon}
        <span className="inline-flex items-baseline">
          {active ? busyLabel : label}
          {active && <AnimatedDots />}
        </span>
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
          <SyncGitButton
            op="fetch"
            label="Fetch"
            busyLabel="Fetching"
            title="Fetch"
            icon={<IconFetch size={14} />}
            onClick={() => void handleFetch()}
          />
          <SyncGitButton
            op="pull"
            label="Pull"
            busyLabel="Pulling"
            title="Pull current branch"
            icon={<IconPull size={14} />}
            onClick={() => void handlePull()}
          />
          <SyncGitButton
            op="push"
            label="Push"
            busyLabel="Pushing"
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
