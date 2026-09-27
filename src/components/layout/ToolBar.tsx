import { useRepoStore } from "../../store/repoStore";
import { useUIStore, Theme } from "../../store/uiStore";
import { useAccountStore } from "../../store/accountStore";
import { accounts as accountsIpc } from "../../ipc/accounts";
import { git } from "../../ipc/git";
import { RepoBranchPicker } from "./RepoBranchPicker";
import { TOOLBAR_BRAND_H } from "../../constants/layout";
import appIconUrl from "../../assets/app-icon.png";
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

  // GitHub accounts for the account switcher
  const githubAccounts = accounts.filter((a) => a.provider === "github");
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
      if (boundAccount) {
        const token = await getToken(boundAccount.id);
        if (token) {
          await git.pushWithToken(activeRepoPath, "origin", headBranch.name, boundAccount.username, token);
          await refreshBranches();
          return;
        }
      }
      alert("No account bound. Add an account and bind it to this repo via the Accounts button.");
    } catch (e) {
      alert(`Push failed: ${e}`);
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
          <img src={appIconUrl} alt="" className="w-full h-full object-cover" draggable={false} />
        </button>
        <RepoBranchPicker onOpenRepo={onOpenRepo} />
      </div>

      {!changesPanelVisible && onToggleChangesPanel && activeRepoPath && (
        <button
          onClick={onToggleChangesPanel}
          className="glass-btn text-[11px] px-2.5 py-1 shrink-0"
          title="Show files and diff"
        >
          Files &amp; diff
        </button>
      )}

      {/* Account switcher */}
      {activeRepoPath && githubAccounts.length > 0 && (
        <select
          className="glass-input py-0.5 text-[10px] rounded-lg"
          style={{ width: 100, height: 22, paddingTop: 1, paddingBottom: 1 }}
          value={boundAccount?.id ?? ""}
          onChange={(e) => { if (activeRepoPath && e.target.value) bindRepoToAccount(activeRepoPath, e.target.value); }}
          title="Account for push/pull/fetch"
        >
          <option value="">— account —</option>
          {githubAccounts.map((a) => <option key={a.id} value={a.id}>{a.username}</option>)}
        </select>
      )}

      {activeRepoPath && (
        <>
          <div className="w-px h-4 mx-0.5" style={{ background: "var(--border)" }} />
          <button onClick={handleFetch} className="glass-btn flex items-center gap-1 px-3 py-1 text-[12px]" title="Fetch">
            <IconFetch size={14} /><span>Fetch</span>
          </button>
          <button onClick={handleFetch} className="glass-btn flex items-center gap-1 px-3 py-1 text-[12px]" title="Pull">
            <IconPull size={14} /><span>Pull</span>
          </button>
          <button onClick={handlePush} className="glass-btn flex items-center gap-1 px-3 py-1 text-[12px]" title="Push">
            <IconPush size={14} /><span>Push</span>
          </button>
          <div className="w-px h-4 mx-0.5" style={{ background: "var(--border)" }} />
          <button onClick={() => openBranchDialog()} className="glass-btn flex items-center gap-1 px-3 py-1 text-[12px]" title="Create branch">
            <IconBranchLocal size={14} /><span>Branch</span>
          </button>
          <button onClick={() => openMergeDialog()} className="glass-btn flex items-center gap-1 px-3 py-1 text-[12px]" title="Merge branches">
            <IconMerge size={14} /><span>Merge</span>
          </button>
          <button onClick={() => openCommitDialog()} className="glass-btn glass-btn-accent flex items-center gap-1 px-3 py-1 text-[12px]" title="Commit (optional amend in dialog)">
            <IconCommit size={14} /><span>Commit</span>
          </button>
        </>
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
