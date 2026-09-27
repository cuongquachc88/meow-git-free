import { useEffect, useState } from "react";

/** Cycles . .. ... after button label while a sync action runs. */
export function AnimatedDots() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setCount((c) => (c + 1) % 4), 380);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="toolbar-sync-dots" aria-hidden>
      {".".repeat(count)}
    </span>
  );
}
