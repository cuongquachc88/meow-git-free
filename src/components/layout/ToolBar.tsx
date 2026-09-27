import { useRepoStore } from "../../store/repoStore";
import { useUIStore, Theme } from "../../store/uiStore";
import { useAccountStore } from "../../store/accountStore";
import { accounts as accountsIpc } from "../../ipc/accounts";
import { git } from "../../ipc/git";
import { getBoundToken, pushBranch } from "../../lib/remoteSync";
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

  const getToken = async (accountId: string) => {
    try { return await accountsIpc.getToken(accountId); }
    catch { return null; }
  };

  const handleFetch = async () => {
    if (!activeRepoPath) return;
    try {
      if (boundAccount) {
        const token = await getToken(boundAccount.id);
        if (token) {
          await git.fetchWithToken(activeRepoPath, "origin", boundAccount.username, token);
          await Promise.all([refreshLog(), refreshBranches()]);
          return;
        }
      }
      await git.fetchRemote(activeRepoPath, "origin");
      await Promise.all([refreshLog(), refreshBranches()]);
    } catch (e) {
      alert(`Fetch failed: ${e}`);
    }
  };

  const handlePush = async () => {
    if (!activeRepoPath || !headBranch) return;
    try {
      const creds = await getBoundToken(activeRepoPath, getAccountForRepo);
      await pushBranch(activeRepoPath, headBranch.name, creds);
      await refreshBranches();
    } catch (e) {
      const msg = String(e);
      if (/credentials|Bind|account/i.test(msg)) {
        const open = window.confirm(
          `${msg}\n\nOpen Accounts to add a token or pick an account for this repo?`,
        );
        if (open) toggleAccountManager();
      } else {
        alert(`Push failed: ${msg}`);
      }
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
          onClick={!activeRepoPath ? onOpenRepo : undefined}
          className="shrink-0 rounded-[7px] overflow-hidden transition-opacity hover:opacity-90"
          style={{
            width: 28,
            height: 28,
            boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
            cursor: activeRepoPath ? "default" : "pointer",
          }}
          title={activeRepoPath ? "Meow Git" : "Open repository"}
        >
          <AppLogo size={28} />
        </button>
        <RepoBranchPicker onOpenRepo={onOpenRepo} />
      </div>

      {activeRepoPath && (
        <div className="flex items-center gap-1.5 ml-2 shrink-0 min-w-0">
          {!changesPanelVisible && onToggleChangesPanel && (
            <button onClick={onToggleChangesPanel} className={ctrl} title="Show files and diff">
              Files
            </button>
          )}

          {accounts.length > 0 && (
            <select
              className="glass-input toolbar-control shrink-0"
              value={boundAccount?.id ?? ""}
              onChange={(e) => {
                if (e.target.value) bindRepoToAccount(activeRepoPath, e.target.value);
              }}
              title="Account for HTTPS push/pull (optional if using SSH)"
            >
              <option value="">SSH / system</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.username} ({a.provider})
                </option>
              ))}
            </select>
          )}

          <div className="toolbar-divider mx-0.5 shrink-0" />
          <button onClick={handleFetch} className={gitBtn} title="Fetch">
            <IconFetch size={14} /><span>Fetch</span>
          </button>
          <button onClick={handleFetch} className={gitBtn} title="Pull">
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
