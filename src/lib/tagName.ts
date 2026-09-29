export function validateTagName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Tag name is required";
  if (
    trimmed.includes("..") ||
    trimmed.includes(" ") ||
    trimmed.startsWith("-") ||
    /[~^:?*[\\]/.test(trimmed)
  ) {
    return "Invalid tag name";
  }
  return null;
}
