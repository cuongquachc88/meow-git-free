import { useRepoStore } from "../../store/repoStore";
import { git } from "../../ipc/git";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { AppLogo } from "../shared/AppLogo";
import { APP_VERSION } from "../../constants/appVersion";
import { IconBranchLocal } from "../shared/icons/GitIcons";

export function WelcomeScreen({ onOpenRepo }: { onOpenRepo: () => void }) {
  const { repos, addRepo, setActiveRepo, closeRepo } = useRepoStore();

  const handleQuickOpen = async () => {
    const selected = await openDialog({ directory: true, multiple: false, title: "Select Repository" });
    if (!selected) return;
    try {
      const info = await git.openRepo(selected as string);
      addRepo(info);
      await setActiveRepo(selected as string);
    } catch {
      onOpenRepo();
    }
  };

  const openRecent = async (path: string) => {
    try {
      const info = await git.openRepo(path);
      addRepo(info);
      await setActiveRepo(path);
    } catch {
      if (window.confirm("This folder is missing or not a Git repo. Remove it from recents?")) {
        await closeRepo(path);
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto flex items-center justify-center p-8">
      <div className="w-full" style={{ maxWidth: 520 }}>
        <div className="text-center mb-10">
          <div className="mx-auto mb-6" style={{ width: 88, height: 88 }}>
            <AppLogo
              size={88}
              style={{ filter: "drop-shadow(0 12px 28px rgba(0,0,0,0.35))" }}
            />
          </div>
          <h1 className="text-[28px] font-bold tracking-tight mb-1.5" style={{ color: "var(--text-primary)" }}>
            Meow Git
          </h1>
          <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
            Open a repository to get started
          </p>
        </div>

        <div className="flex gap-2.5 justify-center mb-8">
          <button
            type="button"
            onClick={() => void handleQuickOpen()}
            className="glass-btn glass-btn-accent px-7 py-2.5 text-[13px] rounded-xl font-medium"
          >
            Open folder…
          </button>
          <button
            type="button"
            onClick={onOpenRepo}
            className="glass-btn px-6 py-2.5 text-[13px] rounded-xl"
            style={{ color: "var(--text-secondary)" }}
          >
            Clone remote…
          </button>
        </div>

        {repos.length > 0 && (
          <div
            className="glass-panel rounded-2xl p-1 overflow-hidden"
            style={{ borderColor: "var(--border-strong)" }}
          >
            <p
              className="text-[10px] font-semibold uppercase tracking-wider px-3 pt-3 pb-2"
              style={{ color: "var(--text-muted)" }}
            >
              Recent repositories
            </p>
            <ul className="pb-1">
              {repos.map((r) => (
                <li key={r.path}>
                  <button
                    type="button"
                    onClick={() => void openRecent(r.path)}
                    className="w-full text-left px-3 py-2.5 flex items-center gap-3 rounded-xl mx-1 transition-colors hover:bg-[color:var(--bg-hover)]"
                    style={{ width: "calc(100% - 8px)" }}
                  >
                    <span
                      className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ background: "var(--bg-surface-2)", color: "var(--accent)" }}
                    >
                      <IconBranchLocal size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className="block text-[13px] font-semibold truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {r.name}
                      </span>
                      <span
                        className="block text-[11px] truncate font-mono"
                        style={{ color: "var(--text-faint)" }}
                      >
                        {r.path}
                      </span>
                    </span>
                    {r.headBranch && (
                      <span
                        className="shrink-0 text-[10px] px-2 py-0.5 rounded-full"
                        style={{
                          background: "var(--accent-bg)",
                          color: "var(--accent)",
                          border: "1px solid var(--accent-border)",
                        }}
                      >
                        {r.headBranch}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-center text-[10px] mt-8" style={{ color: "var(--text-faint)" }}>
          Meow Git v{APP_VERSION}
        </p>
      </div>
    </div>
  );
}
