import { useEffect, useState } from "react";
import { git } from "../../ipc/git";

interface Props {
  repoPath: string;
  filePath: string;
  onResolved: () => void;
  onClose: () => void;
}

interface MergeContent {
  ours: string;
  ancestor: string;
  theirs: string;
}

type Pane = "ours" | "ancestor" | "theirs" | "result";

export function MergeEditor({ repoPath, filePath, onResolved, onClose }: Props) {
  const [content, setContent] = useState<MergeContent | null>(null);
  const [result, setResult] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePane, setActivePane] = useState<Pane>("ours");

  useEffect(() => {
    const load = async () => {
      try {
        const [ours, ancestor, theirs] = await Promise.all([
          git.readBlobAt(repoPath, filePath, ":2").catch(() => ""),
          git.readBlobAt(repoPath, filePath, ":1").catch(() => ""),
          git.readBlobAt(repoPath, filePath, ":3").catch(() => ""),
        ]);
        setContent({ ours, ancestor, theirs });
        // Start result from ours as default
        setResult(ours.split("\n"));
      } catch {
        setContent({ ours: "", ancestor: "", theirs: "" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [repoPath, filePath]);

  const oursLines = (content?.ours ?? "").split("\n");
  const ancestorLines = (content?.ancestor ?? "").split("\n");
  const theirsLines = (content?.theirs ?? "").split("\n");

  const PANES: { id: Pane; label: string; desc: string }[] = [
    { id: "ours", label: "Ours (HEAD)", desc: "Current branch" },
    { id: "ancestor", label: "Base", desc: "Common ancestor" },
    { id: "theirs", label: "Theirs", desc: "Incoming branch" },
    { id: "result", label: "Result", desc: "Edit final content" },
  ];

  const getLines = (pane: Pane) => {
    if (pane === "ours") return oursLines;
    if (pane === "ancestor") return ancestorLines;
    if (pane === "theirs") return theirsLines;
    return result;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
        <div className="glass-panel p-8" style={{ color: "var(--text-muted)" }}>Loading conflict…</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 shrink-0 border-b"
        style={{ background: "var(--glass-toolbar)", borderColor: "var(--border)" }}
      >
        <div className="w-3 h-3 rounded-full" style={{ background: "rgba(251,146,60,0.8)" }} />
        <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
          Merge Conflict
        </span>
        <span className="font-mono text-[12px]" style={{ color: "var(--accent)" }}>
          {filePath}
        </span>
        <div className="flex-1" />
        <button onClick={onClose} className="glass-btn px-3 py-1 text-[12px]">Close</button>
      </div>

      {/* Pane tabs */}
      <div className="flex gap-1 px-4 py-2 shrink-0" style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-surface)" }}>
        {PANES.map((p) => (
          <button
            key={p.id}
            onClick={() => setActivePane(p.id)}
            className="px-4 py-1.5 rounded-lg text-[12px] transition-all"
            style={
              activePane === p.id
                ? { background: "var(--accent-bg)", color: "var(--accent)", border: "1px solid var(--accent-border)" }
                : { color: "var(--text-muted)", border: "1px solid transparent" }
            }
          >
            {p.label}
            <span className="ml-1.5 text-[10px]" style={{ opacity: 0.5 }}>{p.desc}</span>
          </button>
        ))}

        <div className="flex-1" />

        <button
          onClick={() => setResult(oursLines)}
          className="glass-btn px-3 py-1 text-[11px]"
          title="Use all ours"
        >
          ← All Ours
        </button>
        <button
          onClick={() => setResult(theirsLines)}
          className="glass-btn px-3 py-1 text-[11px]"
          title="Use all theirs"
        >
          All Theirs →
        </button>
      </div>

      {/* 3-pane side-by-side when no active pane selected, or single pane */}
      <div className="flex-1 overflow-hidden flex">
        {activePane === "result" ? (
          <ResultPane lines={result} onChange={setResult} />
        ) : (
          <ReadonlyPane lines={getLines(activePane)} pane={activePane} />
        )}
      </div>

      {/* Footer */}
      <div
        className="flex items-center gap-2 px-4 py-2 shrink-0 border-t"
        style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
      >
        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          Edit the Result pane, then click Mark Resolved to accept.
        </span>
        <div className="flex-1" />
        <button onClick={onClose} className="glass-btn px-4 py-1.5 text-[12px]">Cancel</button>
        <button
          onClick={onResolved}
          className="glass-btn glass-btn-accent px-4 py-1.5 text-[12px]"
        >
          Mark Resolved
        </button>
      </div>
    </div>
  );
}

function ReadonlyPane({ lines, pane }: { lines: string[]; pane: Pane }) {
  const colors: Record<Pane, string> = {
    ours: "rgba(129,140,248,0.15)",
    ancestor: "var(--bg-surface)",
    theirs: "rgba(52,211,153,0.1)",
    result: "transparent",
  };
  return (
    <div className="flex-1 overflow-auto font-mono text-[12px]" style={{ background: colors[pane] }}>
      <table className="w-full border-collapse">
        <tbody>
          {lines.map((line, i) => (
            <tr key={i} className="hover:bg-white/[0.02]">
              <td className="w-12 text-right px-3 py-px select-none border-r tabular-nums"
                style={{ color: "var(--text-faint)", borderColor: "var(--border)" }}>
                {i + 1}
              </td>
              <td className="px-4 py-px whitespace-pre" style={{ color: "var(--text-secondary)" }}>
                {line}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResultPane({ lines, onChange }: { lines: string[]; onChange: (l: string[]) => void }) {
  return (
    <div className="flex-1 overflow-auto">
      <textarea
        className="w-full h-full font-mono text-[12px] resize-none outline-none p-4"
        style={{
          background: "transparent",
          color: "var(--text-primary)",
          lineHeight: 1.6,
          minHeight: "100%",
        }}
        value={lines.join("\n")}
        onChange={(e) => onChange(e.target.value.split("\n"))}
        spellCheck={false}
      />
    </div>
  );
}
