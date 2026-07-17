import type { MushafPageResponse, QuranTajweedSpan } from "./api";

export type CanonicalRenderVerse = MushafPageResponse["verses"][number] & {
  renderArabic: string;
  renderTajweedSpans: QuranTajweedSpan[];
};

export type PreparedCanonicalVerse = {
  verse: CanonicalRenderVerse;
  basmalaText: string | null;
  basmalaSeparator: string;
  basmalaSpans: QuranTajweedSpan[];
};

function shiftSpans(spans: QuranTajweedSpan[], startCp: number, endCp: number): QuranTajweedSpan[] {
  return spans
    .filter((span) => span.startCp >= startCp && span.endCp <= endCp)
    .map((span) => ({ ...span, startCp: span.startCp - startCp, endCp: span.endCp - startCp }));
}

/** Split only by generated source offsets; never substitutes or normalizes text. */
export function prepareCanonicalVerseForRender(
  verse: MushafPageResponse["verses"][number],
): PreparedCanonicalVerse {
  // Prod API henüz eski şemayı (tajweedSpans/basmalaRange alanları yok) dönüyor
  // olabilir; alan yokken renksiz devam etmek doğru düşüş — undefined span
  // listesi render'da for-of/iterasyon TypeError'ı ile ekranı çökertiyordu.
  const tajweedSpans = verse.tajweedSpans ?? [];

  // v5 (schemaVersion 5): sunucu basmala önekini ZATEN ayırmıştır — arabic
  // gövdedir, tajweedSpans gövde koordinatlıdır, kanonik bütün canonicalArabic
  // alanındadır. Burada yalnız bölünmenin kanonik metni birebir yeniden
  // kurduğu doğrulanır (metin bütünlüğü garantisi), yeni bölme YAPILMAZ.
  const canonical = verse.canonicalArabic;
  if (canonical != null) {
    const body = verse.arabic ?? "";
    const range = verse.basmalaRange;
    if (!range || range.kind !== "prefix") {
      if (body !== canonical) {
        throw new Error(`Canonical/body mismatch without prefix at ${verse.surahId}:${verse.ayahNumber}`);
      }
      return {
        verse: { ...verse, renderArabic: body, renderTajweedSpans: tajweedSpans },
        basmalaText: null,
        basmalaSeparator: "",
        basmalaSpans: [],
      };
    }
    const canonicalChars = Array.from(canonical);
    if (range.startCp !== 0 || range.endCp <= 0 || range.bodyStartCp <= range.endCp || range.bodyStartCp > canonicalChars.length) {
      throw new Error(`Invalid canonical basmala range for ${verse.surahId}:${verse.ayahNumber}`);
    }
    const basmalaText = verse.basmalaText ?? canonicalChars.slice(range.startCp, range.endCp).join("");
    const basmalaSeparator = canonicalChars.slice(range.endCp, range.bodyStartCp).join("");
    if (`${basmalaText}${basmalaSeparator}${body}` !== canonical) {
      throw new Error(`Canonical basmala split changed ${verse.surahId}:${verse.ayahNumber}`);
    }
    return {
      verse: { ...verse, renderArabic: body, renderTajweedSpans: tajweedSpans },
      basmalaText,
      basmalaSeparator,
      basmalaSpans: shiftSpans(verse.canonicalTajweedSpans ?? [], range.startCp, range.endCp),
    };
  }

  // v4 ve öncesi (yerel eski dev sunucu / eski cache): arabic basmala GÖMÜLÜ
  // tam metindir, tajweedSpans bu tam metne göredir — bölme burada yapılır.
  const arabic = verse.arabic ?? "";
  const chars = Array.from(arabic);
  const range = verse.basmalaRange;
  if (!range || range.kind !== "prefix") {
    return {
      verse: { ...verse, renderArabic: arabic, renderTajweedSpans: tajweedSpans },
      basmalaText: null,
      basmalaSeparator: "",
      basmalaSpans: [],
    };
  }
  if (range.startCp !== 0 || range.endCp <= 0 || range.bodyStartCp <= range.endCp || range.bodyStartCp > chars.length) {
    throw new Error(`Invalid canonical basmala range for ${verse.surahId}:${verse.ayahNumber}`);
  }
  const basmalaText = chars.slice(range.startCp, range.endCp).join("");
  const basmalaSeparator = chars.slice(range.endCp, range.bodyStartCp).join("");
  const renderArabic = chars.slice(range.bodyStartCp).join("");
  if (`${basmalaText}${basmalaSeparator}${renderArabic}` !== arabic) {
    throw new Error(`Canonical basmala split changed ${verse.surahId}:${verse.ayahNumber}`);
  }
  return {
    verse: {
      ...verse,
      renderArabic,
      renderTajweedSpans: shiftSpans(tajweedSpans, range.bodyStartCp, chars.length),
    },
    basmalaText,
    basmalaSeparator,
    basmalaSpans: shiftSpans(tajweedSpans, range.startCp, range.endCp),
  };
}
