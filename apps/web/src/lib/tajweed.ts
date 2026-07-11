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

// Stack-tabanlı parser — iç içe (nested) + kodsuz [..] destekli; en içteki kural
// geçerli. Bozuk/kapanmamış markup'ta çökmeden en iyi çabayı gösterir.
export function parseTajweed(text: string): TajweedSegment[] {
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
  return segs;
}
