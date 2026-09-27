import type { CSSProperties, ReactNode } from "react";

/** Unified stroke icons — git graph / ref semantics (24×24). */
export type GitIconProps = {
  size?: number;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
};

const DEFAULT_STROKE = 1.5;

function Svg({
  size = 16,
  className,
  style,
  strokeWidth = DEFAULT_STROKE,
  children,
}: GitIconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function IconSpinner(props: GitIconProps) {
  const { size = 14, className, style } = props;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={style}
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Download refs from remote into local repo. */
export function IconFetch(props: GitIconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3v9" />
      <path d="M8.5 8.5L12 12l3.5-3.5" />
      <path d="M5 14a7 7 0 0014 0" />
      <rect x="4" y="17" width="16" height="4" rx="1" />
    </Svg>
  );
}

/** Integrate remote commits (fetch + merge). */
export function IconPull(props: GitIconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="7" r="2.5" />
      <path d="M12 9.5v5.5" />
      <path d="M8.5 12.5L12 16l3.5-3.5" />
      <path d="M6 19h12" />
      <circle cx="12" cy="19" r="2" />
    </Svg>
  );
}

/** Publish local commits to remote. */
export function IconPush(props: GitIconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="17" r="2.5" />
      <path d="M12 14.5V9" />
      <path d="M8.5 12.5L12 9l3.5 3.5" />
      <path d="M6 5h12" />
      <circle cx="12" cy="5" r="2" />
    </Svg>
  );
}

/** Local branch tip on history lane. */
export function IconBranchLocal(props: GitIconProps) {
  return (
    <Svg {...props}>
      <path d="M7 4v14" />
      <circle cx="7" cy="18" r="2.5" />
      <circle cx="17" cy="8" r="2.5" />
      <path d="M7 10.5c3.5-1 7-1 10 0" />
    </Svg>
  );
}

/** Remote-tracking branch. */
export function IconBranchRemote(props: GitIconProps) {
  return (
    <Svg {...props}>
      <path d="M7 5v13" />
      <circle cx="7" cy="18" r="2.5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M7 11c4-1.5 7.5-1 10 0" />
      <path d="M17 6.5a3.5 3.5 0 010 5" />
    </Svg>
  );
}

/** Merge two histories. */
export function IconMerge(props: GitIconProps) {
  return (
    <Svg {...props}>
      <circle cx="7" cy="7" r="2.5" />
      <circle cx="17" cy="17" r="2.5" />
      <path d="M7 9.5v4a3.5 3.5 0 003.5 3.5H14" />
      <path d="M14 12h4a2.5 2.5 0 012.5 2.5V17" />
    </Svg>
  );
}

/** Commit node on graph. */
export function IconCommit(props: GitIconProps) {
  return (
    <Svg {...props}>
      <path d="M4 12h5" />
      <path d="M15 12h5" />
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconTag(props: GitIconProps) {
  return (
    <Svg {...props}>
      <path d="M5 5h6.5L20 13.5 13.5 20 5 11.5V5z" />
      <circle cx="9" cy="9" r="1.25" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconStash(props: GitIconProps) {
  return (
    <Svg {...props}>
      <path d="M5 9h14v10a2 2 0 01-2 2H7a2 2 0 01-2-2V9z" />
      <path d="M8 9V7a4 4 0 018 0v2" />
      <path d="M12 13v3" />
      <path d="M10 15h4" />
    </Svg>
  );
}

export function IconRepo(props: GitIconProps) {
  return (
    <Svg {...props}>
      <path d="M4 8h16v11H4z" />
      <path d="M4 8l2.5-4h11L20 8" />
      <path d="M9 12h6" />
      <path d="M12 12v4" />
    </Svg>
  );
}

export function IconRemote(props: GitIconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16" />
      <ellipse cx="12" cy="12" rx="3.5" ry="8" />
    </Svg>
  );
}

export function IconCreateBranch(props: GitIconProps) {
  return (
    <Svg {...props}>
      <path d="M6 4v14" />
      <circle cx="6" cy="18" r="2.5" />
      <path d="M6 8h7a3 3 0 013 3v1" />
      <path d="M16 12h3" />
      <path d="M18.5 10.5v3" />
    </Svg>
  );
}

export function IconCherryPick(props: GitIconProps) {
  return (
    <Svg {...props}>
      <circle cx="8" cy="8" r="2.5" />
      <circle cx="16" cy="16" r="2.5" />
      <path d="M10 9.5l4 4" />
      <path d="M15 9l2-2" />
      <path d="M17 7v3h-3" />
    </Svg>
  );
}

export function IconRevert(props: GitIconProps) {
  return (
    <Svg {...props}>
      <path d="M7 10h9a3.5 3.5 0 010 7H8" />
      <path d="M7 10L4 13l3 3" />
    </Svg>
  );
}

export function IconReset(props: GitIconProps) {
  return (
    <Svg {...props}>
      <path d="M12 8V5" />
      <path d="M8 8H5" />
      <path d="M12 20a7 7 0 110-14" />
      <circle cx="12" cy="12" r="2.25" />
    </Svg>
  );
}

export function IconRebase(props: GitIconProps) {
  return (
    <Svg {...props}>
      <path d="M6 18V6" />
      <circle cx="6" cy="4" r="2" />
      <circle cx="18" cy="14" r="2" />
      <path d="M6 8c4 0 7.5 2 12 6" />
      <path d="M15 11l3 2-3 2" />
    </Svg>
  );
}

export type FileChangeKind = "added" | "modified" | "deleted" | "renamed" | "untracked" | "conflicted";

export function IconFileStatus({ kind, size = 14 }: { kind: FileChangeKind; size?: number }) {
  const palette: Record<FileChangeKind, { color: string; bg: string }> = {
    added: { color: "#34d399", bg: "rgba(52,211,153,0.14)" },
    modified: { color: "#fbbf24", bg: "rgba(251,191,36,0.14)" },
    deleted: { color: "#f87171", bg: "rgba(248,113,113,0.14)" },
    renamed: { color: "#c084fc", bg: "rgba(192,132,252,0.14)" },
    untracked: { color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
    conflicted: { color: "#fb923c", bg: "rgba(251,146,60,0.16)" },
  };
  const { color, bg } = palette[kind];

  return (
    <span
      className="shrink-0 w-5 h-5 flex items-center justify-center rounded-[5px]"
      style={{ background: bg, color }}
    >
      <FileStatusGlyph kind={kind} size={size} />
    </span>
  );
}

function FileStatusGlyph({ kind, size }: { kind: FileChangeKind; size: number }) {
  const sw = 1.85;
  switch (kind) {
    case "added":
      return (
        <Svg size={size} strokeWidth={sw}>
          <path d="M7 4h6l4 4v11H7z" />
          <path d="M13 4v4h4" />
          <path d="M10 13h6M13 10v6" />
        </Svg>
      );
    case "deleted":
      return (
        <Svg size={size} strokeWidth={sw}>
          <path d="M7 4h6l4 4v11H7z" />
          <path d="M13 4v4h4" />
          <path d="M10 14h6" />
        </Svg>
      );
    case "renamed":
      return (
        <Svg size={size} strokeWidth={sw}>
          <path d="M5 8h4l2 2v7H5z" />
          <path d="M13 8h6v9h-6" />
          <path d="M10.5 12h3M12 10.5v3" />
        </Svg>
      );
    case "conflicted":
      return (
        <Svg size={size} strokeWidth={sw}>
          <path d="M7 4h6l4 4v11H7z" />
          <path d="M13 4v4h4" />
          <path d="M10 12h6M13 9v6" />
        </Svg>
      );
    case "untracked":
      return (
        <Svg size={size} strokeWidth={sw}>
          <path d="M7 4h6l4 4v11H7z" />
          <path d="M13 4v4h4" />
          <path d="M12 11v6M9.5 14h5" />
        </Svg>
      );
    default:
      return (
        <Svg size={size} strokeWidth={sw}>
          <path d="M7 4h6l4 4v11H7z" />
          <path d="M13 4v4h4" />
          <path d="M11 13l2-2 2 2M13 15v-4" />
        </Svg>
      );
  }
}

export function IconDiff(props: GitIconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="5" width="7" height="14" rx="1" />
      <rect x="13" y="5" width="7" height="14" rx="1" />
      <path d="M6.5 9h2M15.5 9h3M6.5 12h2.5M15.5 12h2M6.5 15h3M15.5 15h2" />
    </Svg>
  );
}

export function IconBlame(props: GitIconProps) {
  return (
    <Svg {...props}>
      <circle cx="8" cy="8" r="2.25" />
      <path d="M4.5 18v-1a3.5 3.5 0 013.5-3.5H8" />
      <path d="M14 6h6M14 10h5M14 14h6M14 18h4" />
    </Svg>
  );
}

export function IconRefresh(props: GitIconProps) {
  return (
    <Svg {...props}>
      <path d="M20 12a8 8 0 10-2.8 6.1" />
      <path d="M20 12V8M20 12h-4" />
    </Svg>
  );
}

export function IconSearch(props: GitIconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="5.5" />
      <path d="M20 20l-4.2-4.2" />
    </Svg>
  );
}

export function IconChevronRight(props: GitIconProps & { open?: boolean }) {
  const { open, style, ...rest } = props;
  return (
    <Svg {...rest} style={{ ...style, transform: open ? "rotate(90deg)" : undefined, transition: "transform 0.15s" }}>
      <path d="M9 6l6 6-6 6" />
    </Svg>
  );
}

export function IconChevronLeft(props: GitIconProps) {
  return (
    <Svg {...props}>
      <path d="M15 6l-6 6 6 6" />
    </Svg>
  );
}

export function IconCheck(props: GitIconProps) {
  return (
    <Svg {...props} strokeWidth={2.1}>
      <path d="M5 12l4 4 10-10" />
    </Svg>
  );
}

export function IconMore(props: GitIconProps) {
  return (
    <Svg {...props} strokeWidth={0}>
      <circle cx="6" cy="12" r="1.6" fill="currentColor" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <circle cx="18" cy="12" r="1.6" fill="currentColor" />
    </Svg>
  );
}

/** Current HEAD / checked-out branch. */
export function IconHeadBranch(props: GitIconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="11" r="2.5" />
      <path d="M12 13.5V19" />
      <path d="M8.5 19h7" />
      <path d="M12 5v3.5" />
      <path d="M9 6.5l3-2.5 3 2.5" />
    </Svg>
  );
}

export function IconAccount(props: GitIconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 19v-0.5a4.5 4.5 0 019 0V19" />
    </Svg>
  );
}

export function IconSun(props: GitIconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2.5v2M12 19.5v2M4.5 4.5l1.4 1.4M18.1 18.1l1.4 1.4M2.5 12h2M19.5 12h2M4.5 19.5l1.4-1.4M18.1 5.9l1.4-1.4" />
    </Svg>
  );
}

export function IconMoon(props: GitIconProps) {
  return (
    <Svg {...props}>
      <path d="M20 14.2A8.2 8.2 0 1111.8 4 6.2 6.2 0 0020 14.2z" />
    </Svg>
  );
}

export function IconThemeAuto(props: GitIconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="7.5" />
      <path d="M12 4.5v15" />
      <path d="M12 4.5a7.5 7.5 0 000 15" fill="currentColor" stroke="none" opacity="0.22" />
    </Svg>
  );
}

export function IconExpand(props: GitIconProps) {
  return (
    <Svg {...props}>
      <path d="M8 4H4v4M16 4h4v4M20 16v4h-4M4 16v4h4" />
    </Svg>
  );
}

export function IconPanelFiles(props: GitIconProps) {
  return (
    <Svg {...props}>
      <path d="M5 5h8l3 3v12H5z" />
      <path d="M13 5v3h3" />
      <path d="M8 13h8M8 16h5" />
    </Svg>
  );
}
