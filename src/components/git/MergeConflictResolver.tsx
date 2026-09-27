import { useEffect, useState } from "react";
import { useRepoStore } from "../../store/repoStore";
import { git } from "../../ipc/git";
import type { ConflictFile } from "../../types/git";

export function MergeConflictResolver() {
  const { activeRepoPath, refreshStatus, refreshLog } = useRepoStore();
  const [conflicts, setConflicts] = useState<ConflictFile[]>([]);
  const [selected, setSelected] = useState<ConflictFile | null>(null);

  const load = async () => {
    if (!activeRepoPath) return;
    try {
      const c = await git.getConflicts(activeRepoPath);
      setConflicts(c);
      if (c.length > 0 && !selected) setSelected(c[0]);
    } catch {
      setConflicts([]);
    }
  };

  useEffect(() => { load(); }, [activeRepoPath]);

  if (conflicts.length === 0) return null;

  return (
    <div className="flex flex-col overflow-hidden" style={{ maxHeight: 160 }}>
      <div
        className="flex items-center justify-between px-3 py-1.5 shrink-0 border-b"
        style={{ background: "rgba(251,146,60,0.06)", borderColor: "rgba(251,146,60,0.15)" }}
      >
        <span className="text-[11px] font-semibold" style={{ color: "rgba(251,146,60,0.9)" }}>
          ⚠ {conflicts.length} conflict{conflicts.length > 1 ? "s" : ""}
        </span>
        <button
          onClick={() =>
            git.abortMerge(activeRepoPath!).then(() => {
              setConflicts([]);
              setSelected(null);
              refreshStatus();
              refreshLog();
            })
          }
          className="text-[10px] transition-colors"
          style={{ color: "rgba(239,68,68,0.6)" }}
          onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "rgba(239,68,68,1)")}
          onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "rgba(239,68,68,0.6)")}
        >
          Abort merge
        </button>
      </div>

      <div className="overflow-y-auto flex-1">
        {conflicts.map((c) => (
          <button
            key={c.path}
            onClick={() => setSelected(c)}
            className="w-full text-left px-3 py-1.5 text-[11px] font-mono truncate transition-colors"
            style={{
              color: selected?.path === c.path ? "rgba(251,146,60,0.9)" : "rgba(251,146,60,0.5)",
              background: selected?.path === c.path ? "rgba(251,146,60,0.07)" : "transparent",
            }}
          >
            ⚡ {c.path}
          </button>
        ))}
      </div>
    </div>
  );
}
