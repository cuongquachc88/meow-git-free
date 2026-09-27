import { useState } from "react";
import { useUIStore } from "../../store/uiStore";
import { useAccountStore } from "../../store/accountStore";
import type { ProviderKind } from "../../types/accounts";
import { accounts as accountsIpc } from "../../ipc/accounts";
import { openUrl } from "@tauri-apps/plugin-opener";

const PROVIDERS: {
  value: ProviderKind;
  label: string;
  color: string;
  tokenUrl: string;
  tokenScopes: string;
  placeholder: string;
  logo: React.ReactNode;
}[] = [
  {
    value: "github",
    label: "GitHub",
    color: "#818cf8",
    tokenUrl: "https://github.com/settings/tokens/new?scopes=repo,read:org,read:user&description=Meow+Git",
    tokenScopes: "repo, read:org, read:user",
    placeholder: "ghp_xxxxxxxxxxxxxxxxxxxx",
    logo: <GitHubLogo />,
  },
  {
    value: "gitlab",
    label: "GitLab",
    color: "#fb923c",
    tokenUrl: "https://gitlab.com/-/user_settings/personal_access_tokens",
    tokenScopes: "api, read_user",
    placeholder: "glpat-xxxxxxxxxxxxxxxxxxxx",
    logo: <GitLabLogo />,
  },
  {
    value: "bitbucket",
    label: "Bitbucket",
    color: "#38bdf8",
    tokenUrl: "https://bitbucket.org/account/settings/app-passwords/new",
    tokenScopes: "Repositories: Read/Write",
    placeholder: "App password",
    logo: <BitbucketLogo />,
  },
  {
    value: "azure",
    label: "Azure DevOps",
    color: "#60a5fa",
    tokenUrl: "https://dev.azure.com/_usersSettings/tokens",
    tokenScopes: "Code: Read/Write",
    placeholder: "Personal Access Token",
    logo: <AzureLogo />,
  },
  {
    value: "gitea",
    label: "Gitea / Forgejo",
    color: "#86efac",
    tokenUrl: "",
    tokenScopes: "repository, user",
    placeholder: "Access token",
    logo: <GiteaLogo />,
  },
];

const PROVIDER_BG: Record<ProviderKind, string> = {
  github:    "rgba(99,102,241,0.12)",
  gitlab:    "rgba(251,146,60,0.10)",
  bitbucket: "rgba(56,189,248,0.10)",
  azure:     "rgba(96,165,250,0.10)",
  gitea:     "rgba(134,239,172,0.10)",
};

export function AccountManager() {
  const { isAccountManagerOpen, toggleAccountManager } = useUIStore();
  const { accounts, addAccount, removeAccount } = useAccountStore();
  const [provider, setProvider] = useState<ProviderKind>("github");
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [showToken, setShowToken] = useState(false);

  if (!isAccountManagerOpen) return null;

  const selectedProvider = PROVIDERS.find((p) => p.value === provider)!;
  const needsBaseUrl = provider === "gitlab" || provider === "gitea" || provider === "azure";

  const handleAdd = async () => {
    if (!username.trim() || !token.trim()) return;
    setAdding(true);
    setError("");
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
      setShowToken(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setAdding(false);
    }
  };

  const openTokenPage = () => {
    const url = needsBaseUrl && baseUrl.trim()
      ? `${baseUrl.trim().replace(/\/$/, "")}/-/user_settings/personal_access_tokens`
      : selectedProvider.tokenUrl;
    if (url) openUrl(url).catch(() => {});
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}>
      <div className="glass-panel w-[520px] max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="relative z-10 px-6 pt-5 pb-4 border-b flex items-center justify-between"
          style={{ borderColor: "var(--border)" }}>
          <div>
            <h2 className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
              Account Manager
            </h2>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
              Add multiple accounts per provider — each gets its own token
            </p>
          </div>
          <button onClick={toggleAccountManager} className="glass-btn w-7 h-7 p-0 rounded-lg text-[12px]">
            ✕
          </button>
        </div>

        <div className="relative z-10 p-6 space-y-5">
          {/* Provider selector */}
          <div>
            <label className="section-header px-0 py-0 mb-2 block">Provider</label>
            <div className="flex gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => { setProvider(p.value); setError(""); }}
                  className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl border transition-all text-[10px] font-medium"
                  style={
                    provider === p.value
                      ? { background: PROVIDER_BG[p.value], borderColor: p.color + "55", color: p.color }
                      : { background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-muted)" }
                  }
                >
                  {p.logo}
                  <span>{p.label.split(" ")[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Self-hosted URL (GitLab/Gitea/Azure) */}
          {needsBaseUrl && (
            <div>
              <label className="section-header px-0 py-0 mb-1.5 block">
                {provider === "azure" ? "Organization URL" : "Instance URL"}
              </label>
              <input
                className="glass-input"
                placeholder={
                  provider === "azure"
                    ? "https://dev.azure.com/yourorg"
                    : `https://${provider}.yourcompany.com`
                }
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </div>
          )}

          {/* Username + Token */}
          <div className="space-y-3">
            <div>
              <label className="section-header px-0 py-0 mb-1.5 block">Username</label>
              <input
                className="glass-input"
                placeholder="your-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="section-header px-0 py-0">Personal Access Token</label>
                <button
                  onClick={openTokenPage}
                  className="text-[11px] flex items-center gap-1 transition-colors"
                  style={{ color: selectedProvider.color }}
                  onMouseEnter={(e) => ((e.target as HTMLElement).style.opacity = "0.8")}
                  onMouseLeave={(e) => ((e.target as HTMLElement).style.opacity = "1")}
                >
                  Get token ↗
                </button>
              </div>
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  className="glass-input pr-10"
                  placeholder={selectedProvider.placeholder}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  autoComplete="off"
                />
                <button
                  onClick={() => setShowToken((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] transition-opacity"
                  style={{ color: "var(--text-muted)" }}
                >
                  {showToken ? "Hide" : "Show"}
                </button>
              </div>
              <p className="text-[10px] mt-1" style={{ color: "var(--text-faint)" }}>
                Required scopes: <span style={{ color: "var(--text-muted)" }}>{selectedProvider.tokenScopes}</span>
                {" · "} Stored securely in OS keychain
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-lg px-3 py-2 text-[12px]"
              style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "rgba(239,68,68,0.85)" }}>
              {error}
            </div>
          )}

          <button
            onClick={handleAdd}
            disabled={!username.trim() || !token.trim() || adding}
            className="glass-btn glass-btn-accent w-full py-2.5 rounded-xl text-[13px] font-medium"
          >
            {adding ? "Connecting…" : `Connect ${selectedProvider.label} Account`}
          </button>
        </div>

        {/* Connected accounts */}
        {accounts.length > 0 && (
          <div className="relative z-10 px-6 pb-5">
            <div className="border-t pt-4" style={{ borderColor: "var(--border)" }}>
              <p className="section-header px-0 py-0 mb-3">
                Connected accounts ({accounts.length})
              </p>
              <div className="space-y-2">
                {accounts.map((a) => {
                  const prov = PROVIDERS.find((p) => p.value === a.provider);
                  return (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 border"
                      style={{
                        background: PROVIDER_BG[a.provider],
                        borderColor: (prov?.color ?? "#818cf8") + "30",
                      }}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: (prov?.color ?? "#818cf8") + "20" }}>
                        {prov?.logo}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate" style={{ color: "var(--text-primary)" }}>
                          {a.username}
                        </p>
                        <p className="text-[10px] capitalize" style={{ color: "var(--text-muted)" }}>
                          {a.provider}{a.baseUrl ? ` · ${a.baseUrl}` : ""}
                        </p>
                      </div>
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: prov?.color, boxShadow: `0 0 6px ${prov?.color}` }}
                        title="Connected"
                      />
                      <button
                        onClick={() => removeAccount(a.id)}
                        className="text-[11px] transition-colors shrink-0 ml-1"
                        style={{ color: "var(--text-faint)" }}
                        onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "rgba(239,68,68,0.8)")}
                        onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "var(--text-faint)")}
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Provider SVG logos ───────────────────────────────────────────────────────

function GitHubLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
  );
}

function GitLabLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 01-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 014.82 2a.43.43 0 01.58 0 .42.42 0 01.11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0118.6 2a.43.43 0 01.58 0 .42.42 0 01.11.18l2.44 7.51L23 13.45a.84.84 0 01-.35.94z"/>
    </svg>
  );
}

function BitbucketLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M.778 1.213a.768.768 0 00-.768.892l3.263 19.81c.084.5.515.868 1.022.873H19.95a.772.772 0 00.77-.646l3.27-20.03a.768.768 0 00-.768-.891zM14.52 15.53H9.522L8.17 8.466h7.561z"/>
    </svg>
  );
}

function AzureLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M0 18.432l3.05-2.88 7.23-6.66-2.1-2.52L13.68 2l8.32.036-8.304 10.8 6.24 5.58H0z"/>
    </svg>
  );
}

function GiteaLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.9 7.7l-3.75-3.75a1.06 1.06 0 00-1.5 0L2.39 12.18a1.06 1.06 0 000 1.5l3.75 3.75a1.06 1.06 0 001.5 0l1.44-1.44-1.5-1.5-1.44 1.44-3.75-3.75 8.25-8.25 3.75 3.75-1.19 1.19 1.5 1.5z"/>
      <path d="M21.61 10.32l-3.75-3.75a1.06 1.06 0 00-1.5 0l-8.25 8.25a1.06 1.06 0 000 1.5l3.75 3.75a1.06 1.06 0 001.5 0l8.25-8.25a1.06 1.06 0 000-1.5zm-9.75 9.75l-3.75-3.75 8.25-8.25 3.75 3.75z"/>
    </svg>
  );
}
