// tajweed.ts — AlQuran.cloud tecvid markup ayrıştırıcı + renk tablosu.
// Mobildeki apps/mobile/src/lib/tajweed.ts ile birebir aynı (saf TS, framework'ten
// bağımsız — doğrudan port edildi).

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

const OPEN = /^\[([a-z]+)(?::\d+)?\[/;

// Arapça combining mark'lar: harekeler (U+064B–065F), dagger alif (U+0670) ve
// Kuran annotation işaretleri (U+06D6–06ED mark blokları). Hepsi BMP içinde.
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
// MARK KURALI (mobil ile birebir aynı): hiçbir segment hareke/combining-mark ile
// BAŞLAYAMAZ — baştaki mark'lar base harfinin segmentine taşınır (mark, harfinin
// rengini alır). Yoksa renk sınırı base|mark arasına düşer; shaper mark'ı tabansız
// bulunca altına U+25CC kesikli daire çizebilir (Android'de cihazda görüldü;
// tarayıcı span sınırında da aynı risk). Segment birleşimi daima korunur.
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
