import type { KeyboardEvent } from "react";
import { joinCommitMessage, splitCommitMessage } from "../../lib/commitMessage";

export function CommitMessageFields({
  summary,
  description,
  onSummaryChange,
  onDescriptionChange,
  onSubmit,
  canSubmit,
  summaryPlaceholder = "Summary (required)",
  descriptionPlaceholder = "Description (optional)",
  compact,
}: {
  summary: string;
  description: string;
  onSummaryChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onSubmit?: () => void;
  canSubmit?: boolean;
  summaryPlaceholder?: string;
  descriptionPlaceholder?: string;
  /** Smaller typography for sidebar panel */
  compact?: boolean;
}) {
  const textSize = compact ? "text-[12px]" : "text-[13px]";
  const descRows = compact ? 2 : 3;

  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSubmit) {
      e.preventDefault();
      onSubmit?.();
    }
  };

  return (
    <div className="space-y-1.5">
      <input
        type="text"
        className={`glass-input w-full ${textSize} py-1.5 px-2.5`}
        placeholder={summaryPlaceholder}
        value={summary}
        onChange={(e) => onSummaryChange(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <textarea
        className={`glass-input w-full resize-none ${textSize} leading-snug py-1.5 px-2.5`}
        rows={descRows}
        placeholder={descriptionPlaceholder}
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}

export function messageFromHeadCommit(headMessage: string): { summary: string; description: string } {
  return splitCommitMessage(headMessage.trimEnd());
}

export { joinCommitMessage, splitCommitMessage };
