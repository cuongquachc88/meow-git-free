import { useCallback, useRef } from "react";

const STORAGE_KEY = "meow-changes-panel-width";

export function readStoredPanelWidth(fallback = 400): number {
  try {
    const n = Number(localStorage.getItem(STORAGE_KEY));
    if (Number.isFinite(n) && n >= 240) return n;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function ResizeHandle({
  onResizeStart,
  onResize,
  onResizeEnd,
  side = "left",
}: {
  onResizeStart?: () => void;
  onResize: (totalDeltaX: number) => void;
  onResizeEnd?: () => void;
  /** Panel is on the right → drag handle on its left edge */
  side?: "left" | "right";
}) {
  const dragging = useRef(false);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      onResizeStart?.();
      const startX = e.clientX;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const onMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const dx = ev.clientX - startX;
        onResize(side === "left" ? -dx : dx);
      };

      const onUp = () => {
        dragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        onResizeEnd?.();
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [onResizeStart, onResize, onResizeEnd, side],
  );

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panel"
      onMouseDown={onMouseDown}
      className="shrink-0 h-full relative group"
      style={{ width: 6, cursor: "col-resize" }}
    >
      <div
        className="absolute inset-y-0 left-1/2 -translate-x-1/2 transition-colors"
        style={{
          width: 2,
          background: "var(--border)",
        }}
      />
      <div
        className="absolute inset-y-0 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          width: 3,
          background: "var(--accent)",
          boxShadow: "0 0 8px var(--accent-glow)",
        }}
      />
    </div>
  );
}

export function persistPanelWidth(width: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(Math.round(width)));
  } catch {
    /* ignore */
  }
}
