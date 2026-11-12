/** /api/daily için tarih tohumlu seçim yardımcıları (route dosyası yalnız HTTP export edebilir). */

// ?date=YYYY-MM-DD (isteğe bağlı): mobil uygulama 7 günlük "Günün Ayeti/Duası" bildirimlerini
// önceden planlayabilsin diye. Verilmezse sunucunun bugünü (eski davranış).
export function parseDailyDate(raw: string | null): { y: number; m: number; d: number } | null {
  const mt = raw?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!mt) return null;
  const y = Number(mt[1]), m = Number(mt[2]), d = Number(mt[3]);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return { y, m, d };
}

export function getDailyOffset(total: number, day?: { y: number; m: number; d: number } | null): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  const now  = new Date();
  const { y, m, d } = day ?? { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
  const seed = y * 10000 + m * 100 + d;
  return seed % total;
}
