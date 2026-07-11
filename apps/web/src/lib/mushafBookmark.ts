// "Kaldığım yer" — mushaf tek-ayet görünümü (JuzTracker) ve mushaf sayfa
// görünümü TEK bu anahtarı/biçimi paylaşır ki iki taraftaki yer imi ayrışmasın.

const STORAGE_KEY = "mushaf_bookmark";

export function getMushafBookmark(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

export function setMushafBookmark(surahId: number, ayahNumber: number): void {
  try { localStorage.setItem(STORAGE_KEY, `${surahId}:${ayahNumber}`); } catch { /* localStorage kullanılamıyor */ }
}

export function parseMushafBookmark(raw: string | null): { surahId: number; ayahNumber: number } | null {
  if (!raw) return null;
  const parts = raw.split(":");
  if (parts.length !== 2) return null;
  const surahId = Number(parts[0]);
  const ayahNumber = Number(parts[1]);
  return Number.isInteger(surahId) && surahId >= 1 && Number.isInteger(ayahNumber) && ayahNumber >= 1
    ? { surahId, ayahNumber }
    : null;
}
