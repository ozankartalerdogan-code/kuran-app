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
    .filter((item): item is RawQuizSoru => !!item && typeof item === "object")
    .map((item) => {
      const cevaplar: QuizCevap[] = Array.isArray(item.secenekler)
        ? item.secenekler
            .filter((secenek): secenek is string => typeof secenek === "string")
            .map((secenek) => {
              const sep = secenek.indexOf(") ");
              return { harf: secenek.charAt(0), metin: sep >= 0 ? secenek.slice(sep + 2) : secenek };
            })
        : item.secenekler && typeof item.secenekler === "object"
          ? Object.entries(item.secenekler as Record<string, unknown>).map(([harf, metin]) => ({ harf, metin: String(metin) }))
          : [];

      return {
        id: String(item.id ?? ""),
        soru: String(item.soru ?? ""),
        dogru: String(item.dogru_cevap ?? ""),
        aciklama: typeof item.aciklama === "string" ? item.aciklama : "",
        cevaplar,
      };
    })
    .filter((soru) =>
      soru.id !== "" &&
      soru.soru !== "" &&
      soru.cevaplar.length > 0 &&
      soru.cevaplar.some((cevap) => cevap.harf === soru.dogru) &&
      new Set(soru.cevaplar.map((cevap) => cevap.metin)).size === soru.cevaplar.length,
    );
}

const OPT_HARFLER = ["A", "B", "C", "D", "E", "F"];

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function shuffleQuizOptions(soru: QuizSoru): QuizSoru {
  const correctText = soru.cevaplar.find((cevap) => cevap.harf === soru.dogru)?.metin;
  const relettered = shuffle(soru.cevaplar).map((cevap, index) => ({
    harf: OPT_HARFLER[index] ?? cevap.harf,
    metin: cevap.metin,
  }));
  const dogru = relettered.find((cevap) => cevap.metin === correctText)?.harf ?? soru.dogru;
  return { ...soru, cevaplar: relettered, dogru };
}