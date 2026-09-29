import { useEffect, useState } from "react";
import { useRepoStore } from "../../store/repoStore";
import { git } from "../../ipc/git";
import type { TagInfo } from "../../types/git";
import { formatDistanceToNow } from "date-fns";

export function TagsPanel() {
  const { activeRepoPath } = useRepoStore();
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    if (!activeRepoPath) return;
    try {
      setTags(await git.listTagRefs(activeRepoPath));
    } catch {
      setTags([]);
    }
  };

  useEffect(() => { load(); }, [activeRepoPath]);

  const handleCreate = async () => {
    if (!activeRepoPath || !name.trim()) return;
    try {
      await git.createTag(activeRepoPath, name.trim(), undefined, message || undefined);
      setName("");
      setMessage("");
      await load();
    } catch (e) {
      alert(`Tag failed: ${e}`);
    }
  };

  const handleDelete = async (tagName: string) => {
    if (!activeRepoPath) return;
    try {
      await git.deleteTag(activeRepoPath, tagName);
      await load();
    } catch (e) {
      alert(`Delete tag failed: ${e}`);
    }
  };

  return (
    <div className="p-3 space-y-3 text-sm text-gray-300">
      <p className="text-xs font-semibold text-gray-500 uppercase">Tags ({tags.length})</p>

      <div className="space-y-1.5">
        <input
          className="w-full bg-gray-900 text-white rounded p-1.5 text-xs border border-gray-600 focus:outline-none"
          placeholder="Tag name (e.g. v1.0.0)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="w-full bg-gray-900 text-white rounded p-1.5 text-xs border border-gray-600 focus:outline-none"
          placeholder="Annotation message (optional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button
          onClick={handleCreate}
          disabled={!name.trim() || !activeRepoPath}
          className="w-full py-1.5 rounded text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-40"
        >
          Create Tag
        </button>
      </div>

      <div className="space-y-1 max-h-60 overflow-y-auto">
        {tags.map((t) => (
          <div key={t.name} className="flex items-center bg-gray-800 rounded px-2 py-1.5 gap-2">
            <span className="text-yellow-400 text-xs">🏷</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono truncate">{t.name}</p>
              {t.taggerTime && (
                <p className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(t.taggerTime * 1000), { addSuffix: true })}
                </p>
              )}
            </div>
            <button onClick={() => handleDelete(t.name)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
