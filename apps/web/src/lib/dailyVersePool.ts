/**
 * Günün Ayeti havuzu — ana ekranda TEK BAŞINA okununca anlaşılır ayetler.
 * Kaynak: tema etiketleri (öğüt/iman/ahlak/tefekkür/rahmet ana temaları; kıssa,
 * kavim, ahkâm ve polemik etiketleri hariç) → bağlama işaret eden başlangıçlar
 * ("Ve", "Onlar", "Dedi"...) ve yemin parçaları elendi → kalanlar tek tek
 * "tek başına anlamlı mı" diye değerlendirildi (2026-11-20, 612 adaydan 387).
 */
import pool from "../data/dailyVersePool.json";
import { getDailyPoolIndex } from "./dailyDate";

export const DAILY_VERSE_POOL: readonly string[] = pool;

export function dailyVerseKey(day?: { y: number; m: number; d: number } | null): string | null {
  if (DAILY_VERSE_POOL.length === 0) return null;
  return DAILY_VERSE_POOL[getDailyPoolIndex(DAILY_VERSE_POOL.length, day)] ?? null;
}
