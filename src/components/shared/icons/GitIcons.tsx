import type { CSSProperties, ReactNode } from "react";

export type GitIconProps = {
  size?: number;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
};

function Svg({
  size = 16,
  className,
  style,
  strokeWidth = 1.75,
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

/** Download remote refs (cloud → repo). */
export function IconFetch(props: GitIconProps) {
  return (
    <Svg {...props}>
      <path d="M6 8a6 6 0 0111.4 2.5" />
      <path d="M18 10v2h-2" />
      <path d="M6 8v2h2" />
      <path d="M12 12v7" />
      <path d="M8 19h8" />
      <rect x="5" y="19" width="14" height="3" rx="1" />
    </Svg>
  );
}

/** Integrate remote into current branch. */
export function IconPull(props: GitIconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3v10" />
      <path d="M8 9l4 4 4-4" />
      <circle cx="12" cy="17" r="3" />
      <path d="M12 14v1" />
      <path d="M19 6a7 7 0 00-13 0" />
    </Svg>
  );
}

/** Publish commits to remote. */
export function IconPush(props: GitIconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="7" r="3" />
      <path d="M12 10v7" />
      <path d="M8 13l4-4 4 4" />
      <path d="M19 17a7 7 0 01-14 0" />
    </Svg>
  );
}

/** Local branch (tip + fork). */
export function IconBranchLocal(props: GitIconProps) {
  return (
    <Svg {...props}>
      <path d="M6 3v15" />
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <path d="M6 8.5c0 0 4.5-1 12 0" />
    </Svg>
  );
}

/** Remote-tracking branch. */
export function IconBranchRemote(props: GitIconProps) {
  return (
    <Svg {...props}>
      <path d="M6 4v14" />
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="17" cy="7" r="2.5" />
      <path d="M6 9c0 0 5-1.5 11 0" />
      <path d="M17 4.5a4.5 4.5 0 010 5" />
    </Svg>
  );
}

/** Merge two lines of history. */
export function IconMerge(props: GitIconProps) {
  return (
    <Svg {...props}>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M6 8.5v5a4.5 4.5 0 004.5 4.5H15" />
      <path d="M15 12h3a3 3 0 013 3v3" />
    </Svg>
  );
}

/** Commit node on history line. */
export function IconCommit(props: GitIconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3.25" />
      <path d="M3 12h5.5" />
      <path d="M15.5 12H21" />
    </Svg>
  );
}

/** Lightweight tag. */
export function IconTag(props: GitIconProps) {
  return (
    <Svg {...props}>
      <path d="M4 4h7l9 9-7 7-9-9V4z" />
      <circle cx="8.5" cy="8.5" r="1.25" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Stashed changes. */
export function IconStash(props: GitIconProps) {
  return (
    <Svg {...props}>
      <path d="M5 8h14v11a2 2 0 01-2 2H7a2 2 0 01-2-2V8z" />
      <path d="M8 8V6a4 4 0 018 0v2" />
      <path d="M12 12v4" />
      <path d="M10 14h4" />
    </Svg>
  );
}

/** Repository / working tree root. */
export function IconRepo(props: GitIconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16v12H4z" />
      <path d="M4 7l2-4h12l2 4" />
      <path d="M9 12h6" />
      <path d="M12 12v5" />
    </Svg>
  );
}

/** Remote server. */
export function IconRemote(props: GitIconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 010 18" />
      <path d="M12 3a14 14 0 000 18" />
    </Svg>
  );
}

export function IconCreateBranch(props: GitIconProps) {
  return (
    <Svg {...props}>
      <path d="M6 4v14" />
      <circle cx="6" cy="18" r="2.5" />
      <path d="M6 8h8" />
      <path d="M14 8v0a3 3 0 013 3v0" />
      <path d="M17 11h3" />
      <path d="M19 9v4" />
    </Svg>
  );
}

export function IconCherryPick(props: GitIconProps) {
  return (
    <Svg {...props}>
      <circle cx="7" cy="7" r="2.5" />
      <circle cx="17" cy="17" r="2.5" />
      <path d="M9 8.5l6 6" />
      <path d="M14 9l3-3" />
      <path d="M17 6v3h-3" />
    </Svg>
  );
}

export function IconRevert(props: GitIconProps) {
  return (
    <Svg {...props}>
      <path d="M6 8h10a4 4 0 010 8H9" />
      <path d="M6 8l-3 3 3 3" />
    </Svg>
  );
}

export function IconReset(props: GitIconProps) {
  return (
    <Svg {...props}>
      <path d="M12 8V4" />
      <path d="M8 8H4" />
      <path d="M12 20a8 8 0 110-16" />
      <circle cx="12" cy="12" r="2.5" />
    </Svg>
  );
}

export function IconRebase(props: GitIconProps) {
  return (
    <Svg {...props}>
      <path d="M6 18V6" />
      <circle cx="6" cy="4" r="2" />
      <circle cx="18" cy="14" r="2" />
      <path d="M6 8c4 0 8 2 12 6" />
      <path d="M15 12l3 2-3 2" />
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
      className="shrink-0 w-5 h-5 flex items-center justify-center rounded-md"
      style={{ background: bg, color }}
    >
      <FileStatusGlyph kind={kind} size={size} />
    </span>
  );
}

function FileStatusGlyph({ kind, size }: { kind: FileChangeKind; size: number }) {
  switch (kind) {
    case "added":
      return (
        <Svg size={size} strokeWidth={2}>
          <path d="M8 4h6l4 4v11H8z" />
          <path d="M14 4v4h4" />
          <path d="M11 13h6" />
          <path d="M14 11v4" />
        </Svg>
      );
    case "deleted":
      return (
        <Svg size={size} strokeWidth={2}>
          <path d="M8 4h6l4 4v11H8z" />
          <path d="M14 4v4h4" />
          <path d="M11 14h6" />
        </Svg>
      );
    case "renamed":
      return (
        <Svg size={size} strokeWidth={2}>
          <path d="M5 8h5l2 2v7H5z" />
          <path d="M14 8h5v9h-5" />
          <path d="M11 12h2" />
          <path d="M12 11v2" />
        </Svg>
      );
    case "conflicted":
      return (
        <Svg size={size} strokeWidth={2}>
          <path d="M8 4h6l4 4v11H8z" />
          <path d="M14 4v4h4" />
          <path d="M11 12h6" />
          <path d="M14 9v6" />
        </Svg>
      );
    case "untracked":
      return (
        <Svg size={size} strokeWidth={2}>
          <path d="M8 4h6l4 4v11H8z" />
          <path d="M14 4v4h4" />
          <path d="M12 11v6" />
          <path d="M9.5 14h5" />
        </Svg>
      );
    default:
      return (
        <Svg size={size} strokeWidth={2}>
          <path d="M8 4h6l4 4v11H8z" />
          <path d="M14 4v4h4" />
          <path d="M11 13l2-2 2 2" />
          <path d="M13 15v-4" />
        </Svg>
      );
  }
}

export function IconDiff(props: GitIconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="5" width="7" height="14" rx="1" />
      <rect x="13" y="5" width="7" height="14" rx="1" />
      <path d="M7 9h1" />
      <path d="M16 9h3" />
      <path d="M7 12h2" />
      <path d="M16 12h2" />
      <path d="M7 15h3" />
      <path d="M16 15h1" />
    </Svg>
  );
}

export function IconBlame(props: GitIconProps) {
  return (
    <Svg {...props}>
      <circle cx="8" cy="8" r="2.5" />
      <path d="M4 19v-1a4 4 0 014-4h0" />
      <path d="M14 6h6" />
      <path d="M14 10h5" />
      <path d="M14 14h6" />
      <path d="M14 18h4" />
    </Svg>
  );
}

export function IconRefresh(props: GitIconProps) {
  return (
    <Svg {...props}>
      <path d="M20 12a8 8 0 10-2.9 6.2" />
      <path d="M20 12v-4" />
      <path d="M20 12h-4" />
    </Svg>
  );
}

export function IconSearch(props: GitIconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4-4" />
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
    <Svg {...props} strokeWidth={2.25}>
      <path d="M5 12l4 4 10-10" />
    </Svg>
  );
}

export function IconMore(props: GitIconProps) {
  return (
    <Svg {...props} strokeWidth={0}>
      <circle cx="6" cy="12" r="1.75" fill="currentColor" />
      <circle cx="12" cy="12" r="1.75" fill="currentColor" />
      <circle cx="18" cy="12" r="1.75" fill="currentColor" />
    </Svg>
  );
}

export function IconHeadBranch(props: GitIconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 14.5V20" />
      <path d="M8 20h8" />
      <path d="M12 3v5.5" />
      <path d="M8.5 6.5l3-3.5 3 3.5" />
    </Svg>
  );
}

export function IconAccount(props: GitIconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20v-1a5 5 0 0110 0v1" />
    </Svg>
  );
}

export function IconSun(props: GitIconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Svg>
  );
}

export function IconMoon(props: GitIconProps) {
  return (
    <Svg {...props}>
      <path d="M20 14.5A8.5 8.5 0 1111.5 4 6.5 6.5 0 0020 14.5z" />
    </Svg>
  );
}

export function IconThemeAuto(props: GitIconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4v16" />
      <path d="M12 4a8 8 0 010 16" fill="currentColor" stroke="none" opacity="0.25" />
    </Svg>
  );
}

export function IconExpand(props: GitIconProps) {
  return (
    <Svg {...props}>
      <path d="M8 4H4v4" />
      <path d="M16 4h4v4" />
      <path d="M20 16v4h-4" />
      <path d="M4 16v4h4" />
    </Svg>
  );
}

export function IconPanelFiles(props: GitIconProps) {
  return (
    <Svg {...props}>
      <path d="M5 5h8l3 3v12H5z" />
      <path d="M13 5v3h3" />
      <path d="M8 13h8" />
      <path d="M8 16h5" />
    </Svg>
  );
}
