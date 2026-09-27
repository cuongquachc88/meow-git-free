import { useMemo, useState } from "react";
import { useRepoStore } from "../../store/repoStore";
import { useUIStore } from "../../store/uiStore";
import { git } from "../../ipc/git";
import { TOOLBAR_BRAND_H } from "../../constants/layout";
import { openBranchName } from "../../lib/headBranch";

function BreadcrumbDropdown({
  label,
  value,
  children,
  align = "left",
}: {
  label: string;
  value: string;
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex flex-col justify-center min-w-0" style={{ height: TOOLBAR_BRAND_H }}>
      <span
        className="block text-[9px] font-medium uppercase tracking-[0.06em] leading-none"
        style={{ color: "var(--text-faint)" }}
      >
        {label}
      </span>
      <button
        type="button"
        disabled={!value || value === "—"}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-0.5 max-w-[min(180px,28vw)] text-left rounded-md -mx-0.5 transition-colors hover:bg-[color:var(--bg-hover)] leading-tight"
      >
        <span className="text-[13px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
          {value}
        </span>
        <CaretIcon />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[200]" onClick={() => setOpen(false)} />
          <div
            className="absolute top-full mt-1 z-[201] py-1 rounded-lg glass-dropdown-menu w-[220px] max-w-[min(260px,calc(100vw-24px))] max-h-64 overflow-y-auto"
            style={{
              [align === "right" ? "right" : "left"]: 0,
            }}
            onClick={() => setOpen(false)}
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({
  active,
  onClick,
  children,
  sub,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-3 py-1.5 text-[12px] flex items-center gap-2 transition-colors"
      style={{
        color: active ? "var(--accent)" : "var(--text-secondary)",
        background: active ? "var(--accent-bg)" : undefined,
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover)";
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.background = "";
      }}
    >
      <span className="truncate flex-1">{children}</span>
      {sub}
    </button>
  );
}

export function RepoBranchPicker({ onOpenRepo }: { onOpenRepo: () => void }) {
  const { repos, activeRepoPath, setActiveRepo, closeRepo, branches } = useRepoStore();
  const { openBranchDialog, openMergeDialog } = useUIStore();
  const activeRepo = repos.find((r) => r.path === activeRepoPath);
  const localBranches = useMemo(() => branches.filter((b) => b.kind === "Local"), [branches]);
  const remoteBranches = useMemo(() => branches.filter((b) => b.kind === "Remote"), [branches]);
  const headName = openBranchName(branches);

  const checkout = async (name: string) => {
    if (!activeRepoPath) return;
    try {
      await git.checkoutBranch(activeRepoPath, name);
      await setActiveRepo(activeRepoPath);
    } catch (e) {
      alert(`Checkout failed: ${e}`);
    }
  };

  if (!activeRepoPath) {
    return (
      <div className="flex items-center shrink-0 min-w-0" style={{ height: TOOLBAR_BRAND_H }}>
        {repos.length > 0 ? (
          <>
            <BreadcrumbDropdown label="repository" value="Select repository…">
              {repos.map((r) => (
                <MenuItem key={r.path} onClick={() => void setActiveRepo(r.path)}>
                  {r.name}
                </MenuItem>
              ))}
              <div className="my-1 mx-2" style={{ height: 1, background: "var(--border)" }} />
              <MenuItem onClick={onOpenRepo}>Open repository…</MenuItem>
            </BreadcrumbDropdown>
          </>
        ) : (
          <div
            className="relative flex flex-col justify-center min-w-0"
            style={{ height: TOOLBAR_BRAND_H }}
          >
            <span
              className="block text-[9px] font-medium uppercase tracking-[0.06em] leading-none"
              style={{ color: "var(--text-faint)" }}
            >
              repository
            </span>
            <button
              type="button"
              onClick={onOpenRepo}
              className="flex items-center gap-0.5 text-left rounded-md -mx-0.5 transition-colors hover:bg-[color:var(--bg-hover)] leading-tight"
            >
              <span className="text-[13px] font-semibold" style={{ color: "var(--accent)" }}>
                Open repository…
              </span>
              <CaretIcon />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0 min-w-0" style={{ height: TOOLBAR_BRAND_H }}>
      <BreadcrumbDropdown label="repository" value={activeRepo?.name ?? "—"}>
        {repos.map((r) => (
          <MenuItem
            key={r.path}
            active={r.path === activeRepoPath}
            onClick={() => void setActiveRepo(r.path)}
          >
            {r.name}
          </MenuItem>
        ))}
        <div className="my-1 mx-2" style={{ height: 1, background: "var(--border)" }} />
        <MenuItem onClick={onOpenRepo}>Open repository…</MenuItem>
        {activeRepoPath && (
          <MenuItem
            onClick={() => {
              const name = activeRepo?.name ?? "this repository";
              if (window.confirm(`Close "${name}" in Meow Git?\n(Files on disk are not deleted.)`)) {
                void closeRepo(activeRepoPath);
              }
            }}
          >
            Close repository
          </MenuItem>
        )}
      </BreadcrumbDropdown>

      <span className="text-[12px] font-light select-none leading-none px-0.5" style={{ color: "var(--text-faint)" }}>
        ›
      </span>

      <BreadcrumbDropdown
        label="branch"
        value={headName ?? "—"}
        align="left"
      >
        {localBranches.length === 0 ? (
          <p className="px-3 py-2 text-[11px]" style={{ color: "var(--text-faint)" }}>
            No branches
          </p>
        ) : (
          <>
            {localBranches.map((b) => (
              <MenuItem
                key={b.name}
                active={b.isHead}
                onClick={() => void checkout(b.name)}
                sub={
                  (b.ahead ?? 0) > 0 || (b.behind ?? 0) > 0 ? (
                    <span className="text-[9px] font-mono shrink-0" style={{ color: "var(--text-faint)" }}>
                      {(b.ahead ?? 0) > 0 && `↑${b.ahead}`}
                      {(b.behind ?? 0) > 0 && ` ↓${b.behind}`}
                    </span>
                  ) : undefined
                }
              >
                {b.name}
              </MenuItem>
            ))}
            {remoteBranches.length > 0 && (
              <>
                <div className="my-1 mx-2" style={{ height: 1, background: "var(--border)" }} />
                <p className="px-3 py-1 text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
                  Remote
                </p>
                {remoteBranches.map((b) => (
                  <MenuItem key={b.name} onClick={() => void checkout(b.name)}>
                    {b.name}
                  </MenuItem>
                ))}
              </>
            )}
            <div className="my-1 mx-2" style={{ height: 1, background: "var(--border)" }} />
            <MenuItem onClick={openBranchDialog}>Create branch…</MenuItem>
            <MenuItem onClick={openMergeDialog}>Merge branches…</MenuItem>
          </>
        )}
      </BreadcrumbDropdown>
    </div>
  );
}

const CaretIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 opacity-60">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
