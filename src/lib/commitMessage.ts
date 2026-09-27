/** Split full Git message into subject (first line) and body (rest). */
export function splitCommitMessage(full: string): { summary: string; description: string } {
  const normalized = full.replace(/\r\n/g, "\n").trimEnd();
  const nl = normalized.indexOf("\n");
  if (nl === -1) {
    return { summary: normalized.trim(), description: "" };
  }
  const summary = normalized.slice(0, nl).trim();
  const description = normalized.slice(nl + 1).replace(/^\n+/, "").trimEnd();
  return { summary, description };
}

export function joinCommitMessage(summary: string, description: string): string {
  const s = summary.trim();
  const d = description.trim();
  if (!s) return "";
  if (!d) return s;
  return `${s}\n\n${d}`;
}
