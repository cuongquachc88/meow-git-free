import { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { useRepoStore } from "../../store/repoStore";
import { git } from "../../ipc/git";
import type { FileDiff } from "../../types/git";

export function DiffViewer() {
  const { activeRepoPath, selectedCommit } = useRepoStore();
  const [diffs, setDiffs] = useState<FileDiff[]>([]);
  const [selected, setSelected] = useState<FileDiff | null>(null);

  useEffect(() => {
    if (!activeRepoPath) return;
    const load = async () => {
      try {
        const result = selectedCommit
          ? await git.diffCommit(activeRepoPath, selectedCommit.id)
          : await git.diffWorkdir(activeRepoPath);
        setDiffs(result);
        setSelected(result[0] ?? null);
      } catch {
        setDiffs([]);
      }
    };
    load();
  }, [activeRepoPath, selectedCommit]);

  const diffText = selected
    ? selected.hunks
        .flatMap((h) => [h.header, ...h.lines.map((l) => l.origin + l.content)])
        .join("")
    : "";

  return (
    <div className="flex flex-col h-full bg-gray-950">
      <div className="flex border-b border-gray-700 overflow-x-auto">
        {diffs.map((d) => {
          const name = d.newPath ?? d.oldPath ?? "?";
          return (
            <button
              key={name}
              onClick={() => setSelected(d)}
              className={`px-3 py-1.5 text-xs shrink-0 border-r border-gray-700 hover:bg-gray-800 ${
                selected === d ? "bg-gray-800 text-white" : "text-gray-400"
              }`}
            >
              {name.split("/").pop()}
            </button>
          );
        })}
      </div>
      <div className="flex-1">
        <Editor
          height="100%"
          language="diff"
          value={diffText}
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "off",
            fontSize: 12,
            fontFamily: "JetBrains Mono, Fira Code, monospace",
          }}
        />
      </div>
    </div>
  );
}
