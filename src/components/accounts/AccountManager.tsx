import { useState } from "react";
import { useUIStore } from "../../store/uiStore";
import { useAccountStore } from "../../store/accountStore";
import type { ProviderKind } from "../../types/accounts";
import { accounts as accountsIpc } from "../../ipc/accounts";

const PROVIDERS: { value: ProviderKind; label: string }[] = [
  { value: "github", label: "GitHub" },
  { value: "gitlab", label: "GitLab" },
  { value: "bitbucket", label: "Bitbucket" },
  { value: "azure", label: "Azure DevOps" },
  { value: "gitea", label: "Gitea / Forgejo" },
];

export function AccountManager() {
  const { isAccountManagerOpen, toggleAccountManager } = useUIStore();
  const { accounts, addAccount, removeAccount } = useAccountStore();
  const [provider, setProvider] = useState<ProviderKind>("github");
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [baseUrl, setBaseUrl] = useState("");

  if (!isAccountManagerOpen) return null;

  const handleAdd = async () => {
    if (!username.trim() || !token.trim()) return;
    try {
      const account = await accountsIpc.createAccount(
        provider,
        username.trim(),
        "pat",
        baseUrl.trim() || undefined
      );
      await addAccount(account, token.trim());
      setUsername("");
      setToken("");
      setBaseUrl("");
    } catch (e) {
      alert(`Failed to add account: ${e}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-[520px] shadow-xl border border-gray-600">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-white font-semibold">Account Manager</h2>
          <button onClick={toggleAccountManager} className="text-gray-400 hover:text-white">✕</button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as ProviderKind)}
              className="w-full bg-gray-900 text-white rounded p-2 text-sm border border-gray-600"
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          {(provider === "gitlab" || provider === "gitea") && (
            <div>
              <label className="text-xs text-gray-400 block mb-1">Base URL (self-hosted)</label>
              <input
                className="w-full bg-gray-900 text-white rounded p-2 text-sm border border-gray-600"
                placeholder="https://gitlab.company.com"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Username</label>
            <input
              className="w-full bg-gray-900 text-white rounded p-2 text-sm border border-gray-600"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Personal Access Token</label>
            <input
              type="password"
              className="w-full bg-gray-900 text-white rounded p-2 text-sm border border-gray-600"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!username.trim() || !token.trim()}
            className="w-full py-2 rounded text-sm bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40"
          >
            Add Account
          </button>
        </div>

        {accounts.length > 0 && (
          <div className="border-t border-gray-700 p-4">
            <p className="text-xs text-gray-400 mb-2 uppercase">Connected Accounts</p>
            <div className="space-y-2">
              {accounts.map((a) => (
                <div key={a.id} className="flex items-center justify-between bg-gray-900 rounded p-2">
                  <div>
                    <span className="text-white text-sm">{a.username}</span>
                    <span className="text-gray-500 text-xs ml-2">({a.provider})</span>
                  </div>
                  <button
                    onClick={() => removeAccount(a.id)}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
