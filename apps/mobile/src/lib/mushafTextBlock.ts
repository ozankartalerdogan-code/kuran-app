import type { CanonicalRenderVerse } from "./mushafCanonical";
import { arapRakam, mushafMetniHazirla } from "./mushafText.ts";
import { codePointSpansToUtf16Ranges, type TajweedRange } from "./tajweed.ts";

export type AyetAralik = {
  surahId: number;
  ayahNumber: number;
  start: number;
  end: number;
};

export type SeciliAyetKimligi = { surahId: number; ayahNumber: number } | null;

/** Build the exact UTF-16-indexed string/ranges sent to the native TextView. */
export function mushafMetinBloguHazirla(
  ayetler: CanonicalRenderVerse[],
  tajweed: boolean,
  accent: string,
): { text: string; ranges: TajweedRange[]; araliklar: AyetAralik[] } {
  let text = "";
  const ranges: TajweedRange[] = [];
  const araliklar: AyetAralik[] = [];

  for (const ayet of ayetler) {
    const start = text.length;
    if (tajweed) {
      ranges.push(...codePointSpansToUtf16Ranges(
        ayet.renderArabic,
        ayet.renderTajweedSpans,
        text.length,
      ));
    }
    text += ayet.renderArabic;
    const num = ` \uFD3F${arapRakam(ayet.ayahNumber)}\uFD3E `;
    ranges.push({ start: text.length, end: text.length + num.length, color: accent });
    text += num;
    araliklar.push({
      surahId: ayet.surahId,
      ayahNumber: ayet.ayahNumber,
      start,
      end: text.length,
    });
  }

  return { text: mushafMetniHazirla(text), ranges, araliklar };
}

export function seciliAyetVurguAraliklari(
  araliklar: AyetAralik[],
  secili: SeciliAyetKimligi,
  color: string,
): TajweedRange[] {
  if (!secili) return [];
  const aralik = araliklar.find(
    (aday) => aday.surahId === secili.surahId && aday.ayahNumber === secili.ayahNumber,
  );
  return aralik ? [{ start: aralik.start, end: aralik.end, color }] : [];
}

export function utf16IndeksindekiAyetiBul(
  araliklar: AyetAralik[],
  index: number,
): AyetAralik | undefined {
  return araliklar.find((aralik) => index >= aralik.start && index < aralik.end);
}
