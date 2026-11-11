// Saf yardımcılar (React/RN bağımlılığı yok → node --test ile test edilir).
export type MealTable = readonly (readonly string[])[];

export function parseVerseKey(key: string | null | undefined): [number, number] | null {
  if (!key) return null;
  const m = /^(\d{1,3}):(\d{1,3})$/.exec(key.trim());
  return m ? [Number(m[1]), Number(m[2])] : null;
}

export function lookupMeal(table: MealTable, surah: number, ayah: number): string | null {
  return table[surah - 1]?.[ayah - 1] ?? null;
}

/**
 * Cihaz üstü metin araması: büyük/küçük harf duyarsız, tüm kelimeler eşleşmeli (AND).
 * Sonuç: "sure:ayet" anahtarları (mushaf sırasıyla), en fazla `limit` adet.
 */
export function searchMealTable(table: MealTable, query: string, limit = 50): string[] {
  const words = query.toLowerCase().split(/[^\p{L}\p{N}']+/u).filter(Boolean);
  if (words.length === 0 || limit <= 0) return [];
  const out: string[] = [];
  for (let s = 0; s < table.length; s++) {
    const row = table[s];
    for (let a = 0; a < row.length; a++) {
      const text = row[a].toLowerCase();
      if (words.every((w) => text.includes(w))) {
        out.push(`${s + 1}:${a + 1}`);
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}
