// "Any"/"أني": morfolojik analize sızmış sahte kök.
// "فأي": فَ (edat) + أَيّ (zamir) yanlış-segmenti; gerçek kök أيّ.
// "ياس": يأس (ümitsizlik) kökünün frekans-0 yazım varyantı → mükerrer, gizlenir.
const suppressedVisibleRoots = new Set(["Any", "أني", "فأي", "ياس"]);

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

export const suppressedVisibleRootsSql = "'Any', 'أني', 'فأي', 'ياس'";
