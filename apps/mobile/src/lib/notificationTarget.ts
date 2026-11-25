const HOME = "/(tabs)";

function positiveInteger(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && (value.length === 0 || /\D/.test(value))) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 1 ? number : null;
}

export function notificationTarget(data: unknown): string {
  if (data === null || typeof data !== "object" || Array.isArray(data)) return HOME;
  const payload = data as Record<string, unknown>;
  let surahId: unknown;
  let ayahNumber: unknown;

  if (payload.route !== undefined) {
    if (payload.route === "/namaz") return "/namaz";
    if (typeof payload.route !== "string") return HOME;
    const match = /^\/ayah\/(\d+)\/(\d+)$/.exec(payload.route);
    if (!match || match[0] !== payload.route) return HOME;
    [, surahId, ayahNumber] = match;
  } else {
    ({ surahId, ayahNumber } = payload);
  }

  const surah = positiveInteger(surahId);
  const ayah = positiveInteger(ayahNumber);
  return surah !== null && surah <= 114 && ayah !== null
    ? `/ayah/${surah}/${ayah}`
    : HOME;
}
