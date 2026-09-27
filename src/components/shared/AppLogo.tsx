import { useId, type CSSProperties } from "react";

/** App mark: git graph lanes on dark tile (toolbar, welcome, favicon source). */
export function AppLogo({
  size = 28,
  className,
  style,
  variant = "tile",
}: {
  size?: number;
  className?: string;
  style?: CSSProperties;
  /** tile: rounded app icon; mark: graph only (transparent bg) */
  variant?: "tile" | "mark";
}) {
  const uid = useId().replace(/:/g, "");
  const tileGlow = `mgTileGlow-${uid}`;
  const lane = `mgLane-${uid}`;
  const tile = variant === "tile";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden
    >
      {tile && (
        <>
          <rect width="32" height="32" rx="7" fill="#0c1018" />
          <rect
            width="32"
            height="32"
            rx="7"
            fill={`url(#${tileGlow})`}
            opacity={0.9}
          />
        </>
      )}
      <defs>
        <linearGradient id={tileGlow} x1="8" y1="4" x2="26" y2="28">
          <stop offset="0%" stopColor="#1e293b" stopOpacity="0" />
          <stop offset="100%" stopColor="#334155" stopOpacity="0.45" />
        </linearGradient>
        <linearGradient id={lane} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
      </defs>

      {/* Main lane */}
      <path
        d="M11 6v17"
        stroke={`url(#${lane})`}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="11" cy="8" r="2.25" fill="#0c1018" stroke="#94a3b8" strokeWidth="1.75" />
      <circle cx="11" cy="15" r="2.25" fill="#0c1018" stroke="#64748b" strokeWidth="1.75" />
      <circle cx="11" cy="22" r="2.75" fill="#22c55e" stroke="#4ade80" strokeWidth="1.5" />

      {/* Branch lane */}
      <path
        d="M11 15h5.5a3.5 3.5 0 013.5 3.5V22"
        stroke="#6366f1"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="20" cy="22" r="2.25" fill="#0c1018" stroke="#818cf8" strokeWidth="1.75" />

      {/* Merge lane */}
      <path
        d="M20 22h-4.5a2.5 2.5 0 01-2.5-2.5V15"
        stroke="#f59e0b"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity={0.85}
      />

      {/* Meow — tiny ears + whisker (git lane style) */}
      {tile && (
        <g opacity={0.92}>
          <path d="M22.5 6.2L24 3.4L25.5 6.2Z" fill="#334155" stroke="#64748b" strokeWidth="0.6" strokeLinejoin="round" />
          <path d="M25.8 6.2L27.2 3.4L28.6 6.2Z" fill="#334155" stroke="#64748b" strokeWidth="0.6" strokeLinejoin="round" />
          <circle cx="26.5" cy="7.1" r="0.55" fill="#f472b6" opacity={0.85} />
          <path d="M24.2 7.6h-2.2M24.5 8.4h-1.6" stroke="#818cf8" strokeWidth="0.55" strokeLinecap="round" opacity={0.55} />
        </g>
      )}
    </svg>
  );
}
