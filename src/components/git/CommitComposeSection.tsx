import type { CommitInfo } from "../../types/git";
import { IconCommit } from "../shared/icons/GitIcons";
import { CommitMessageFields } from "./CommitMessageFields";

export function AmendToggle({
  active,
  disabled,
  headCommit,
  branchName,
  onToggle,
}: {
  active: boolean;
  disabled?: boolean;
  headCommit: CommitInfo | null;
  branchName: string;
  onToggle: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      disabled={disabled}
      onClick={() => !disabled && onToggle(!active)}
      className={`amend-switch w-full text-left ${active ? "amend-switch--on" : ""} ${disabled ? "opacity-45 cursor-not-allowed" : ""}`}
    >
      <span className="amend-switch__track" aria-hidden>
        <span className="amend-switch__knob" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[11px] font-semibold tracking-wide uppercase" style={{ color: "var(--text-secondary)" }}>
          Amend previous commit
        </span>
        <span className="block text-[10px] truncate mt-0.5 font-mono tabular-nums" style={{ color: "var(--text-faint)" }}>
          {disabled
            ? "No commit on this branch yet"
            : active && headCommit
              ? `${headCommit.shortId} · ${branchName}`
              : headCommit
                ? `Last: ${headCommit.shortId} on ${branchName}`
                : "—"}
        </span>
      </span>
    </button>
  );
}

export function CommitComposeSection({
  summary,
  description,
  onSummaryChange,
  onDescriptionChange,
  amend,
  onAmendChange,
  headCommit,
  branchName,
  stagedCount,
  canSubmit,
  busy,
  onSubmit,
  compact,
}: {
  summary: string;
  description: string;
  onSummaryChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  amend: boolean;
  onAmendChange: (next: boolean) => void;
  headCommit: CommitInfo | null;
  branchName: string;
  stagedCount: number;
  canSubmit: boolean;
  busy: boolean;
  onSubmit: () => void;
  compact?: boolean;
}) {
  return (
    <div className={`commit-compose ${compact ? "commit-compose--compact" : ""}`}>
      <div className="commit-compose__header">
        <IconCommit size={compact ? 14 : 16} style={{ color: "var(--accent)" }} />
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--text-muted)" }}>
          {amend ? "Amend commit" : "Create commit"}
        </span>
      </div>

      <CommitMessageFields
        compact={compact}
        summary={summary}
        description={description}
        onSummaryChange={onSummaryChange}
        onDescriptionChange={onDescriptionChange}
        onSubmit={onSubmit}
        canSubmit={canSubmit && !busy}
        summaryPlaceholder="Summary — first line shown on graph"
        descriptionPlaceholder="Extended description (optional)"
      />

      <AmendToggle
        active={amend}
        disabled={!headCommit}
        headCommit={headCommit}
        branchName={branchName}
        onToggle={onAmendChange}
      />

      <div className="commit-compose__actions">
        <p className="text-[10px] min-w-0 truncate" style={{ color: "var(--text-faint)" }}>
          {amend
            ? headCommit
              ? `Rewriting ${headCommit.shortId} · ⌘↩ to amend`
              : "Nothing to amend"
            : `${stagedCount} staged · ⌘↩ to commit`}
        </p>
        <button
          type="button"
          disabled={!canSubmit || busy}
          onClick={onSubmit}
          className={`glass-btn shrink-0 px-4 py-1.5 text-[11px] rounded-lg font-semibold tracking-wide ${amend ? "glass-btn-accent" : "glass-btn-accent"}`}
        >
          {busy ? "…" : amend ? "Amend" : "Commit"}
        </button>
      </div>
    </div>
  );
}
