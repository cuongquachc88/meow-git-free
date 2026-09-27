import { useEffect } from "react";
import { useUIStore } from "../../store/uiStore";
import { IconSpinner } from "./icons/GitIcons";

export function SyncToast() {
  const toast = useUIStore((s) => s.syncToast);
  const setSyncToast = useUIStore((s) => s.setSyncToast);

  useEffect(() => {
    if (!toast || toast.kind === "busy") return;
    const t = setTimeout(() => setSyncToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast, setSyncToast]);

  if (!toast) return null;

  const border =
    toast.kind === "ok"
      ? "rgba(34,197,94,0.45)"
      : toast.kind === "err"
        ? "rgba(239,68,68,0.45)"
        : "var(--accent-border)";

  return (
    <div
      className="sync-toast-host fixed z-[600] flex justify-center pointer-events-none"
      style={{ left: 0, right: 0, bottom: 20 }}
      role="status"
      aria-live="polite"
    >
      <div
        className="sync-toast glass-panel pointer-events-auto overflow-hidden min-w-[220px] max-w-[min(420px,92vw)]"
        style={{
          borderColor: border,
          boxShadow: "var(--shadow-drop)",
        }}
      >
        <div className="flex items-center gap-2.5 px-4 py-2.5">
          {toast.kind === "busy" ? (
            <IconSpinner size={18} className="toolbar-sync-spin shrink-0" style={{ color: "var(--accent)" }} />
          ) : (
            <span className="text-[15px] shrink-0 leading-none" aria-hidden>
              {toast.kind === "ok" ? "✓" : "✕"}
            </span>
          )}
          <p
            className="text-[13px] font-medium truncate"
            style={{
              color:
                toast.kind === "ok"
                  ? "rgba(34,197,94,0.95)"
                  : toast.kind === "err"
                    ? "rgba(239,68,68,0.95)"
                    : "var(--text-primary)",
            }}
          >
            {toast.message}
          </p>
        </div>
        {toast.kind === "busy" && <div className="sync-toast-progress" aria-hidden />}
      </div>
    </div>
  );
}
