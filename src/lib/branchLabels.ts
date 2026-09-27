export type BranchLabel = { name: string; isHead: boolean; isRemote: boolean };

export function formatBranchLabel(name: string, isRemote: boolean): string {
  if (isRemote) {
    const slash = name.indexOf("/");
    return slash >= 0 ? name.slice(slash + 1) : name;
  }
  return name;
}

/** Drop HEAD local label and remote refs that mirror a local branch. */
export function dedupeBranchLabels(labels: BranchLabel[]): BranchLabel[] {
  const localNames = new Set(labels.filter((l) => !l.isRemote).map((l) => l.name));

  const filtered = labels.filter((lbl) => {
    if (lbl.isHead && !lbl.isRemote) return false;
    if (lbl.isRemote) {
      const withoutRemote = formatBranchLabel(lbl.name, true);
      if (localNames.has(withoutRemote)) return false;
    }
    return true;
  });

  const seen = new Set<string>();
  const out: BranchLabel[] = [];
  for (const lbl of filtered) {
    const key = formatBranchLabel(lbl.name, lbl.isRemote);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(lbl);
  }
  return out;
}
