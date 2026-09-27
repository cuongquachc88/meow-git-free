import { useState } from "react";
import { useRepoStore } from "../../store/repoStore";
import { useUIStore } from "../../store/uiStore";
import { git } from "../../ipc/git";

export function Sidebar() {
  const { activeRepoPath, branches, setActiveRepo, addRepo } = useRepoStore();
  const { toggleAccountManager } = useUIStore();

  const localBranches = branches.filter((b) => b.kind === "Local");
  const remoteBranches = branches.filter((b) => b.kind === "Remote");

  const handleOpenRepo = async () => {
    // Tauri file dialog would go here; using placeholder for now
    const path = prompt("Enter repo path:");
    if (!path) return;
    try {
      const info = await git.openRepo(path);
      addRepo(info);
      await setActiveRepo(path);
    } catch (e) {
      alert(`Failed to open repo: ${e}`);
    }
  };

  const handleCheckout = async (name: string) => {
    if (!activeRepoPath) return;
    try {
      await git.checkoutBranch(activeRepoPath, name);
      await setActiveRepo(activeRepoPath);
    } catch (e) {
      alert(`Checkout failed: ${e}`);
    }
  };

  return (
    <aside className="flex flex-col w-60 bg-gray-900 border-r border-gray-700 text-sm text-gray-300 select-none h-full overflow-y-auto">
      <div className="p-3 border-b border-gray-700 flex items-center justify-between">
        <span className="font-bold text-white text-base">Meow Git</span>
        <button
          onClick={toggleAccountManager}
          className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-gray-700"
          title="Account Manager"
        >
          ⚙
        </button>
      </div>

      <div className="p-2 border-b border-gray-700">
        <button
          onClick={handleOpenRepo}
          className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-700 text-blue-400"
        >
          + Open Repository
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <SidebarSection title="LOCAL BRANCHES">
          {localBranches.map((b) => (
            <button
              key={b.name}
              onClick={() => handleCheckout(b.name)}
              className={`w-full text-left px-4 py-1 hover:bg-gray-700 rounded truncate ${
                b.isHead ? "text-white font-semibold" : "text-gray-400"
              }`}
            >
              {b.isHead ? "⎇ " : "  "}
              {b.name}
            </button>
          ))}
        </SidebarSection>

        <SidebarSection title="REMOTE BRANCHES">
          {remoteBranches.map((b) => (
            <div key={b.name} className="px-4 py-1 text-gray-500 truncate text-xs">
              {b.name}
            </div>
          ))}
        </SidebarSection>
      </div>
    </aside>
  );
}

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-300 uppercase tracking-wider flex items-center gap-1"
      >
        <span>{open ? "▾" : "▸"}</span>
        {title}
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}
