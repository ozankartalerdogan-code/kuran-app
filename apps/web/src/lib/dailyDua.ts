/**
 * Günün Duası havuzu — web ana sayfası ve /api/daily (mobil + bildirim) AYNI listeden
 * seçer. Kaynak: tema etiketlerinde dua/peygamber-duası olan 284 ayet → her biri
 * "bugün kendi duası olarak okunabilen, tek başına anlaşılan yakarış mı" diye tek
 * tek değerlendirildi; kıssa parçaları, beddua, ahiret sahneleri ve dua HAKKINDAKİ
 * ayetler çıkarıldı (2026-11-20, 77 ayet). Eski etiket filtresi (dua-% + Arapça
 * yakarış kalıbı) yeni taksonomide yalnız 7 ayete düşmüştü (biri 2:67 kıssası).
 */
import pool from "../data/dailyDuaPool.json";
import { getDailyPoolIndex } from "./dailyDate";

export const DAILY_DUA_POOL: readonly string[] = pool;

export function dailyDuaKey(day?: { y: number; m: number; d: number } | null): string | null {
  if (DAILY_DUA_POOL.length === 0) return null;
  return DAILY_DUA_POOL[getDailyPoolIndex(DAILY_DUA_POOL.length, day)] ?? null;
}
