/**
 * tajweed.ts — AlQuran.cloud tecvid markup ayrıştırıcı + renk tablosu (SAF).
 *
 * Component'ten (components/TajweedText.tsx) ayrıldı ki iç-içe köşeli-parantez
 * stack mantığı test edilebilsin. TajweedText bu modülü kullanır ve
 * TAJWEED_LEGEND'i geriye re-export eder (mevcut importları bozmadan).
 */

export type TajweedSegment = { code: string | null; t: string };

// AlQuran.cloud tecvid kodu → renk. 4 grup: med (kırmızı), ğunne/ihfâ/idgâm (yeşil),
// kalkale (mavi), sessiz/idgâm-bilâ-ğunne (gri). Kurallar otorite kaynaktan; biz renkleriz.
export const RENK: Record<string, string> = {
  n: "#e11d48", p: "#e11d48", o: "#dc2626", m: "#b91c1c",   // med (uzatma)
  g: "#16a34a", f: "#16a34a", i: "#16a34a", a: "#16a34a",   // ğunne / ihfâ
  c: "#16a34a", u: "#16a34a", w: "#16a34a", b: "#16a34a",   // idgâm-ğunneli / iklâb / mim
  q: "#2563eb",                                              // kalkale
  h: "#9ca3af", s: "#9ca3af", l: "#9ca3af", d: "#9ca3af",   // sessiz
};

// Lejant (Mushaf'ta renk açıklaması)
export const TAJWEED_LEGEND: { renk: string; ad: string }[] = [
  { renk: "#e11d48", ad: "Med (uzatma)" },
  { renk: "#16a34a", ad: "Ğunne / İhfâ / İdgâm" },
  { renk: "#2563eb", ad: "Kalkale" },
  { renk: "#9ca3af", ad: "Sessiz harf" },
];

export type TajweedRange = { start: number; end: number; color: string };

/**
 * Segmentlerden düz metin + UTF-16 renk aralıkları — native tek-Spannable
 * renderer (modules/tajweed-text) için. Metin segment birleşimiyle birebir
 * aynıdır (karakter eklenmez/çıkarılmaz); yalnız RENK'te karşılığı olan kodlar
 * aralık üretir. baseOffset, birden çok ayeti tek metinde birleştirirken kullanılır.
 */
export function segmentsToRanges(
  segs: TajweedSegment[],
  baseOffset = 0,
): { text: string; ranges: TajweedRange[] } {
  let text = "";
  const ranges: TajweedRange[] = [];
  for (const s of segs) {
    if (s.code && RENK[s.code]) {
      ranges.push({
        start: baseOffset + text.length,
        end: baseOffset + text.length + s.t.length,
        color: RENK[s.code],
      });
    }
    text += s.t;
  }
  return { text, ranges };
}

/**
 * Kelime-bazlı gruplama (JS fallback): Android'de kelime İÇİNE denk gelen her
 * nested-Text sınırı Arapça harf bitişmesini (shaping) kırar — cihazda A/B ile
 * kanıtlandı. Bu fonksiyon segmentleri yalnız GERÇEK boşluklarda böler; kelime
 * rengi, kelimedeki ilk kodlu karakterin rengidir (ayrıntı kaybı bilinçli ödün).
 * Birleşim korunur: çıktı t'lerinin join'i girdi t'lerinin join'ine eşittir.
 */
export function groupSegmentsByWord(segs: TajweedSegment[]): TajweedSegment[] {
  const out: TajweedSegment[] = [];
  let cur = "";
  let curCode: string | null = null;
  const flush = () => {
    if (cur) {
      out.push({ code: curCode, t: cur });
      cur = "";
      curCode = null;
    }
  };
  for (const s of segs) {
    for (const ch of s.t) {
      if (curCode === null && s.code !== null) curCode = s.code;
      cur += ch;
      if (ch === " ") flush();
    }
  }
  flush();
  return out;
}

const OPEN = /^\[([a-z]+)(?::\d+)?\[/;

// Arapça combining mark'lar: harekeler (U+064B–065F), dagger alif (U+0670) ve
// Kuran annotation işaretleri (U+06D6–06ED mark blokları). Hepsi BMP içinde —
const ARAPCA_MARK = /[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/;

// Kaynak (AlQuran.cloud tajweed edition) iki egzotik karakter kullanır; ikisi de
// UthmanicHafs fontunda YOK ve .notdef dairesi olarak görünür. Tanzil (arabic_text)
// karşılıklarına normalize edilir — 1:1, uzunluk korunur:
//   U+0672 (elif+dalgalı hamza; med elifi olarak kullanılmış) → U+0670 dagger alif
//   U+066E (noktasız be; elif-i maksure olarak kullanılmış)   → U+0649
const RE_U0672 = new RegExp(String.fromCharCode(0x0672), "g");
const RE_U066E = new RegExp(String.fromCharCode(0x066E), "g");
const DAGGER_ALIF = 0x0670;
// Stack-tabanlı parser — iç içe (nested) + kodsuz [..] destekli; en içteki kural
// geçerli. Bozuk/kapanmamış markup'ta çökmeden en iyi çabayı gösterir.
//
// MARK KURALI: hiçbir segment hareke/combining-mark ile BAŞLAYAMAZ — baştaki
// mark'lar base harfinin segmentine taşınır (mark, harfinin rengini alır).
// Yoksa renk sınırı base|mark arasına düşer; Android renk run'ını orada bölünce
// mark tabansız kalır ve shaper altına U+25CC kesikli daire çizer (cihazda
// ٱلصَّلَوٰةَ'nin dagger alif'inde görüldü). Segment birleşimi daima korunur.
export function parseTajweed(text: string): TajweedSegment[] {
  text = text
    .replace(RE_U0672, String.fromCharCode(DAGGER_ALIF))
    .replace(RE_U066E, String.fromCharCode(0x0649));
  const raw: TajweedSegment[] = [];
  const stack: (string | null)[] = [];
  let i = 0;
  while (i < text.length) {
    const om = OPEN.exec(text.slice(i));
    if (om) { stack.push(om[1]); i += om[0].length; continue; }
    if (text[i] === "[") { stack.push(null); i++; continue; }            // kodsuz grup (şeffaf)
    if (text[i] === "]") { if (stack.length) stack.pop(); i++; continue; }
    let code: string | null = null;
    for (let k = stack.length - 1; k >= 0; k--) if (stack[k] !== null) { code = stack[k]; break; }
    raw.push({ code, t: text[i] });
    i++;
  }
  const segs: TajweedSegment[] = [];
  for (const ch of raw) {
    const last = segs[segs.length - 1];
    if (last && last.code === ch.code) last.t += ch.t;
    else segs.push({ code: ch.code, t: ch.t });
  }
  // Mark kuralı: segment başındaki mark'ları önceki segmentin sonuna taşı.
  // ÖZEL DURUM — dagger alif KODLU segment başındaysa (med elifi: [n[ٰ]):
  // mark'ı taşımak med rengini yok ederdi; tersine, base grapheme'i (son base
  // + ardındaki mark'lar) öncekinden BU segmente çekilir → وٰ/ذَٰ bütünü med
  // rengini alır (basılı tecvidli mushaf görünümü).
  for (let k = 1; k < segs.length; k++) {
    const s = segs[k];
    if (s.code !== null && s.t.charCodeAt(0) === DAGGER_ALIF) {
      const prev = segs[k - 1];
      let b = prev.t.length;
      while (b > 0 && ARAPCA_MARK.test(prev.t[b - 1])) b--;
      if (b > 0) {
        b--;
        s.t = prev.t.slice(b) + s.t;
        prev.t = prev.t.slice(0, b);
        continue;
      }
    }
    let m = 0;
    while (m < s.t.length && ARAPCA_MARK.test(s.t[m])) m++;
    if (m > 0) {
      segs[k - 1].t += s.t.slice(0, m);
      s.t = s.t.slice(m);
    }
  }
  // Boşalan segmentleri at (yalnız-mark segmentler tamamen erir) ve
  // bitişik aynı kodluları yeniden birleştir.
  const out: TajweedSegment[] = [];
  for (const s of segs) {
    if (!s.t) continue;
    const last = out[out.length - 1];
    if (last && last.code === s.code) last.t += s.t;
    else out.push(s);
  }
  return out;
}

export type QuranCodePointSpan = {
  startCp: number;
  endCp: number;
  rule: string;
  color: string;
};

/** Convert generated half-open code-point ranges to Android/RN UTF-16 ranges. */
export function codePointSpansToUtf16Ranges(
  text: string,
  spans: readonly QuranCodePointSpan[] | null | undefined,
  baseOffset = 0,
): TajweedRange[] {
  const chars = Array.from(text);
  const utf16Offsets = [0];
  for (const char of chars) utf16Offsets.push(utf16Offsets[utf16Offsets.length - 1] + char.length);
  const ranges: TajweedRange[] = [];
  for (const span of spans ?? []) {
    if (span.startCp < 0 || span.endCp <= span.startCp || span.endCp > chars.length) continue;
    ranges.push({
      start: baseOffset + utf16Offsets[span.startCp],
      end: baseOffset + utf16Offsets[span.endCp],
      color: span.color,
    });
  }
  return ranges;
}

/**
 * Old-build/iOS fallback: keep each Arabic word in one nested Text run so
 * shaping is not split. The first safe generated span in that word supplies
 * its color; the joined output remains the canonical string byte-for-byte.
 */
export function groupCanonicalTextByWord(
  text: string,
  spans: readonly QuranCodePointSpan[] | null | undefined,
): TajweedSegment[] {
  const chars = Array.from(text);
  const out: TajweedSegment[] = [];
  let start = 0;
  const flush = (end: number) => {
    if (end <= start) return;
    const span = spans?.find((candidate) => candidate.startCp < end && candidate.endCp > start);
    out.push({ code: span?.rule ?? null, t: chars.slice(start, end).join("") });
    start = end;
  };
  for (let index = 0; index < chars.length; index += 1) {
    if (/\s/u.test(chars[index])) flush(index + 1);
  }
  flush(chars.length);
  return out;
}
