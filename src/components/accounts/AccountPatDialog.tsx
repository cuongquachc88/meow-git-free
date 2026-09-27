import { useEffect, useState } from "react";
import { useAccountStore } from "../../store/accountStore";
import { useUIStore } from "../../store/uiStore";
import { saveStoredToken } from "../../lib/accountToken";
import { cancelAccountPat, completeAccountPat } from "../../lib/requestAccountPat";

export function AccountPatDialog() {
  const patPromptAccountId = useUIStore((s) => s.patPromptAccountId);
  const accounts = useAccountStore((s) => s.accounts);
  const account = accounts.find((a) => a.id === patPromptAccountId) ?? null;

  const [pat, setPat] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!patPromptAccountId) return;
    setPat("");
    setShow(false);
    setError("");
  }, [patPromptAccountId]);

  if (!patPromptAccountId || !account) return null;

  const handleCancel = () => {
    cancelAccountPat();
  };

  const handleSave = async () => {
    const trimmed = pat.trim();
    if (!trimmed) {
      setError("Paste a personal access token.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await saveStoredToken(account.id, trimmed);
      completeAccountPat(trimmed);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[60]"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
    >
      <div className="glass-panel w-[440px] p-6 space-y-4">
        <h2 className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
          Personal access token required
        </h2>
        <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Account <strong style={{ color: "var(--text-primary)" }}>{account.username}</strong> (
          {account.provider}) is selected, but no token is stored in the keychain. HTTPS push/pull
          needs a PAT with <strong>repo</strong> scope. Tokens are saved in the macOS Keychain or
          Windows Credential Manager and persist across app restarts.
        </p>
        <div>
          <label className="section-header px-0 py-0 mb-1.5 block">Token</label>
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              className="glass-input pr-10"
              placeholder="ghp_…"
              value={pat}
              onChange={(e) => setPat(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleSave()}
              autoFocus
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px]"
              style={{ color: "var(--text-muted)" }}
            >
              {show ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        {error && (
          <p className="text-[12px]" style={{ color: "rgba(239,68,68,0.9)" }}>
            {error}
          </p>
        )}
        <div className="flex gap-2 justify-end pt-1">
          <button type="button" className="glass-btn px-4 py-2 rounded-lg text-[13px]" onClick={handleCancel}>
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            className="glass-btn glass-btn-accent px-4 py-2 rounded-lg text-[13px]"
            onClick={() => void handleSave()}
          >
            {busy ? "Saving…" : "Save & continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
