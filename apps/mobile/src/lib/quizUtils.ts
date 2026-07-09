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
    .filter(
      (q) =>
        q.id !== "" &&
        q.soru !== "" &&
        q.cevaplar.length > 0 &&
        // Doğru cevap harfi şıklarda bulunmalı — yoksa soru hiç "doğru"
        // gösteremez, elenir.
        q.cevaplar.some((c) => c.harf === q.dogru) &&
        // Şık metinleri benzersiz olmalı — shuffleQuizOptions doğru cevabı
        // metin eşleşmesiyle taşır; tekrarlı metin yanlış şıkkı doğru yapabilir.
        new Set(q.cevaplar.map((c) => c.metin)).size === q.cevaplar.length,
    );
}

const OPT_HARFLER = ["A", "B", "C", "D", "E", "F"];

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Şıkları karıştırır ve A/B/C/D olarak yeniden harfler; doğru cevabı yeni harfe
 * taşır. Böylece doğru cevabın konumu HER seferinde rastgele olur — quiz verisi
 * doğru cevabı hep A/B'ye yığmış olsa bile quiz tahmin edilebilir/gameable olmaz.
 * (Şık metni benzersizliği normalizeQuizSorular'da filtreyle garanti edilir;
 * tekrarlı metinli sorular oraya gelmeden elenir.)
 */
export function shuffleQuizOptions(soru: QuizSoru): QuizSoru {
  const correctText = soru.cevaplar.find((c) => c.harf === soru.dogru)?.metin;
  const relettered = shuffleArr(soru.cevaplar).map((c, i) => ({
    harf: OPT_HARFLER[i] ?? c.harf,
    metin: c.metin,
  }));
  const dogru = relettered.find((c) => c.metin === correctText)?.harf ?? soru.dogru;
  return { ...soru, cevaplar: relettered, dogru };
}
