import { useRepoStore } from "../../store/repoStore";

type CIState = "success" | "failure" | "pending" | "unknown";

const STATE_ICON: Record<CIState, string> = {
  success: "✓",
  failure: "✗",
  pending: "◌",
  unknown: "?",
};

const STATE_COLOR: Record<CIState, string> = {
  success: "text-green-400",
  failure: "text-red-400",
  pending: "text-yellow-400",
  unknown: "text-gray-500",
};

interface CIRun {
  name: string;
  state: CIState;
  url?: string;
}

export function CIStatus({ runs = [] }: { runs?: CIRun[] }) {
  const { selectedCommit } = useRepoStore();

  if (!selectedCommit || runs.length === 0) return null;

  return (
    <div className="flex items-center gap-1 px-2">
      {runs.map((run) => (
        <span
          key={run.name}
          title={run.name}
          className={`text-xs font-mono ${STATE_COLOR[run.state]}`}
        >
          {STATE_ICON[run.state]}
        </span>
      ))}
    </div>
  );
}
