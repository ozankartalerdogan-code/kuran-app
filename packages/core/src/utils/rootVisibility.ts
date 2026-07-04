const suppressedVisibleRoots = new Set(["Any", "أني", "فأي", "ياس", "كيف"]);

export function isSuppressedVisibleRoot(root: string | null | undefined): boolean {
  const normalized = root?.trim() ?? "";
  return normalized.length > 0 && suppressedVisibleRoots.has(normalized);
}

export function normalizeVisibleRoot(root: string | null | undefined): string | null {
  const normalized = root?.trim() ?? "";
  if (!normalized || isSuppressedVisibleRoot(normalized)) {
    return null;
  }
  return normalized;
}
