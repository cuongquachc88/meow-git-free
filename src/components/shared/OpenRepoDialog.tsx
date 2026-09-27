import { useState } from "react";
import { useRepoStore } from "../../store/repoStore";
import { git } from "../../ipc/git";
import { open as openDialog } from "@tauri-apps/plugin-dialog";

interface Props {
  onClose: () => void;
}

export function OpenRepoDialog({ onClose }: Props) {
  const { addRepo, setActiveRepo } = useRepoStore();
  const [path, setPath] = useState("");
  const [url, setUrl] = useState("");
  const [clonePath, setClonePath] = useState("");
  const [tab, setTab] = useState<"open" | "clone">("open");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleBrowse = async () => {
    const selected = await openDialog({ directory: true, multiple: false, title: "Select Repository Folder" });
    if (selected) setPath(selected as string);
  };

  const handleOpen = async () => {
    if (!path.trim()) return;
    setLoading(true);
    setError("");
    try {
      const info = await git.openRepo(path.trim());
      addRepo(info);
      await setActiveRepo(path.trim());
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleClone = async () => {
    if (!url.trim() || !clonePath.trim()) return;
    setLoading(true);
    setError("");
    try {
      const info = await git.cloneRepo(url.trim(), clonePath.trim());
      addRepo(info);
      await setActiveRepo(clonePath.trim());
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-panel w-[480px]">
        <div className="relative z-10 px-6 pt-5 pb-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-white/90">Open Repository</h2>
          <button onClick={onClose} className="glass-btn w-7 h-7 flex items-center justify-center p-0 rounded-lg text-white/40">✕</button>
        </div>

        {/* Tabs */}
        <div className="relative z-10 flex gap-1 px-6 pt-4">
          {(["open", "clone"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(""); }}
              className={`px-4 py-1.5 rounded-lg text-[12px] capitalize transition-all ${
                tab === t
                  ? "glass-btn glass-btn-accent"
                  : "glass-btn text-white/40"
              }`}
            >
              {t === "open" ? "Open Local" : "Clone Remote"}
            </button>
          ))}
        </div>

        <div className="relative z-10 p-6 space-y-3">
          {tab === "open" ? (
            <>
              <div>
                <label className="section-header py-0 px-0 mb-1.5 block">Repository Path</label>
                <div className="flex gap-2">
                  <input
                    autoFocus
                    className="glass-input flex-1"
                    placeholder="/Users/you/projects/my-repo"
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleOpen()}
                  />
                  <button onClick={handleBrowse} className="glass-btn px-3 py-2 rounded-lg text-[12px] shrink-0">
                    Browse…
                  </button>
                </div>
                <p className="text-[10px] text-white/25 mt-1">Select a folder containing a git repository</p>
              </div>

              {/* Quick access: recent dirs */}
              <div className="space-y-1">
                {[
                  "~/Projects",
                  "~/Desktop",
                  "~/Documents",
                ].map((dir) => (
                  <button
                    key={dir}
                    onClick={() => setPath(dir.replace("~", (window as any).__HOME__ ?? ""))}
                    className="w-full text-left text-[11px] text-white/25 hover:text-white/50 px-1 py-0.5 rounded transition-colors"
                  >
                    {dir}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="section-header py-0 px-0 mb-1.5 block">Remote URL</label>
                <input
                  autoFocus
                  className="glass-input"
                  placeholder="https://github.com/user/repo.git"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
              <div>
                <label className="section-header py-0 px-0 mb-1.5 block">Clone Into</label>
                <input
                  className="glass-input"
                  placeholder="/Users/you/projects/repo"
                  value={clonePath}
                  onChange={(e) => setClonePath(e.target.value)}
                />
              </div>
            </>
          )}

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-[12px] text-red-400">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="glass-btn px-5 py-2 rounded-lg">Cancel</button>
            <button
              onClick={tab === "open" ? handleOpen : handleClone}
              disabled={loading || (tab === "open" ? !path.trim() : !url.trim() || !clonePath.trim())}
              className="glass-btn glass-btn-accent px-5 py-2 rounded-lg"
            >
              {loading ? "Loading…" : tab === "open" ? "Open" : "Clone"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
