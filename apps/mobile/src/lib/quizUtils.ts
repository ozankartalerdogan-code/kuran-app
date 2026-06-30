/**
 * quizUtils.ts — ders quiz verisinin normalleştirilmesi.
 *
 * Saf (React/RN bağımsız) mantık; ekran bileşeni ve testler bunu kullanır.
 * Quiz verisi yerel JSON'dan gelir → güvenilmez kabul edilir, doğrulanır:
 * bozuk/boş seçenekli sorular elenir (bkz. quizUtils.test.ts).
 */

export type QuizCevap = { harf: string; metin: string };

export type QuizSoru = {
  id: string;
  soru: string;
  cevaplar: QuizCevap[];
  dogru: string;
  aciklama: string;
};

type RawQuizSoru = {
  id?: unknown;
  soru?: unknown;
  dogru_cevap?: unknown;
  aciklama?: unknown;
  secenekler?: unknown;
};

export function normalizeQuizSorular(raw: unknown[]): QuizSoru[] {
  return raw
    .filter((r): r is RawQuizSoru => !!r && typeof r === "object")
    .map((r) => {
      const cevaplar: QuizCevap[] = Array.isArray(r.secenekler)
        ? r.secenekler
            .filter((s): s is string => typeof s === "string")
            .map((s) => {
              const sep = s.indexOf(") ");
              return { harf: s.charAt(0), metin: sep >= 0 ? s.slice(sep + 2) : s };
            })
        : r.secenekler && typeof r.secenekler === "object"
        ? Object.entries(r.secenekler as Record<string, unknown>).map(([harf, metin]) => ({
            harf,
            metin: String(metin),
          }))
        : [];
      return {
        id:       String(r.id ?? ""),
        soru:     String(r.soru ?? ""),
        dogru:    String(r.dogru_cevap ?? ""),
        aciklama: typeof r.aciklama === "string" ? r.aciklama : "",
        cevaplar,
      };
    })
    .filter((q) => q.id !== "" && q.soru !== "" && q.cevaplar.length > 0);
}
