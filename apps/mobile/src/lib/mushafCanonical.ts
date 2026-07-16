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
  const arabic = verse.arabic ?? "";
  const chars = Array.from(arabic);
  const range = verse.basmalaRange;
  if (!range || range.kind !== "prefix") {
    return {
      verse: { ...verse, renderArabic: arabic, renderTajweedSpans: verse.tajweedSpans },
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
      renderTajweedSpans: shiftSpans(verse.tajweedSpans, range.bodyStartCp, chars.length),
    },
    basmalaText,
    basmalaSeparator,
    basmalaSpans: shiftSpans(verse.tajweedSpans, range.startCp, range.endCp),
  };
}
