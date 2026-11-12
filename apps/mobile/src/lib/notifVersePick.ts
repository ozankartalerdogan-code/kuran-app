/**
 * notifVersePick.ts — 7 günlük namaz bildirimlerine ayet dağıtımı (saf, import yok).
 *
 * Eskiden her vakit için TEK ayet çekilip 7 günün hepsinde kullanılıyordu: uygulama
 * açılmadıkça örn. Öğle bildirimi her gün aynı metinle geliyordu. Şimdi küçük bir
 * havuz çekilir ve gün × vakit başına sırayla dağıtılır: aynı gün içinde vakitler
 * farklı, aynı vakit art arda günlerde farklı.
 */

export type PickVerse = { verse_key: string };

/** verse_key'e göre tekrarları atar (sıra korunur). */
export function dedupeVerses<T extends PickVerse>(list: (T | null | undefined)[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const v of list) {
    if (!v || seen.has(v.verse_key)) continue;
    seen.add(v.verse_key);
    out.push(v);
  }
  return out;
}

/**
 * dayIndex: 0..6 (bugünden itibaren), slot: o günkü vakit sırası (0..n-1), perDay: günlük slot sayısı.
 * Havuz boşsa null.
 */
export function pickFromPool<T>(pool: T[], dayIndex: number, slot: number, perDay: number): T | null {
  if (pool.length === 0) return null;
  // Havuz boyu günlük slot sayısını bölüyorsa (ör. 5 ayet, 5 vakit) her gün aynı dizilime
  // düşmesin diye güne göre bir adım kaydır.
  const shift = perDay % pool.length === 0 ? dayIndex : 0;
  return pool[(dayIndex * perDay + slot + shift) % pool.length];
}
