/**
 * tajweed.ts — AlQuran.cloud tecvid markup ayrıştırıcı + renk tablosu (SAF).
 *
 * Component'ten (components/TajweedText.tsx) ayrıldı ki iç-içe köşeli-parantez
 * stack mantığı test edilebilsin. TajweedText bu modülü kullanır ve
 * TAJWEED_LEGEND'i geriye re-export eder (mevcut importları bozmadan).
 */


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

// ── Span tabanlı tecvid (tercih edilen yol) ──────────────────────────────────
// Sunucu canonical Tanzil metnini (`arabic`) ve renkleri KOD NOKTASI
// koordinatlarıyla (`tajweedSpans`) ayrı ayrı gönderir. Markup metnini basmak
// yerine bunu kullanmak üç sorunu birden çözer:
//   1. Markup metni canonical metinden farklı (6236 ayetin 4280'inde; örn. 2:2
//      canonical U+0670 hançer elif, markup U+0672 tam harf) — tecvid açıkken
//      farklı bir Kur'an metni gösteriliyordu. Tanzil lisansı metnin
//      değiştirilmeden dağıtılmasını şart koşar.
//   2. Markup grupları harf ile harekesinin arasından bölünebiliyor; ayrı
//      <Text>'e düşen işaret Android'de noktalı daire olarak çiziliyordu
//      (kırmızı/yeşil benek). Span sınırları burada küme başına hizalanır —
//      sunucu verisi bunu garanti ETMİYOR (ör. 2:54 `إِنَّهُۥ`: `هُ` düz metinde
//      kalıp `ۥ` tek başına renkli span'a düşüyordu).
//   3. Ayet başına ~68 segment yerine ~5 span → çok daha az Android span'ı.

export type TajweedSpan = { startCp: number; endCp: number; rule: string; color: string };

/**
 * Taşıyıcı harfine bağlanan, tek başına çizilemeyen kod noktaları.
 *
 * `\p{Mn}` harekeleri, medd (U+0653), hançer elif (U+0670), sıfır (U+06DF) ve
 * vakf işaretlerini kapsar; küçük vav/ye (U+06E5/U+06E6) Unicode'da `Lm`
 * olduğu için `\p{Mn}`'e girmez ama davranışı aynıdır — asıl gördüğümüz vaka
 * da odur, bu yüzden açıkça eklenir.
 */
const BIRLESEN = /[\p{Mn}ۥۦ]/u;

/** Renklendirilecek parça. `color` null ise düz metin. */
export type TajweedPart = { color: string | null; t: string };

/**
 * Canonical metni span'lara göre renkli parçalara böler.
 *
 * `startCp`/`endCp` KOD NOKTASI indeksleridir (UTF-16 değil) — Arapça'da
 * yüzeysel `slice` yanlış keser, bu yüzden `Array.from` ile çalışılır.
 * Bozuk/çakışan span'lar sessizce atlanır: renksiz göstermek, metni yanlış
 * kesmeye yeğdir.
 */
export function tajweedPartsFromSpans(
  text: string,
  spans: readonly TajweedSpan[],
): TajweedPart[] {
  const cps = Array.from(text);
  const parts: TajweedPart[] = [];
  const ekle = (color: string | null, t: string) => {
    if (!t) return;
    const last = parts[parts.length - 1];
    if (last && last.color === color) last.t += t;
    else parts.push({ color, t });
  };

  const sirali = [...spans]
    .filter((s) => Number.isInteger(s.startCp) && Number.isInteger(s.endCp))
    .sort((a, b) => a.startCp - b.startCp);

  let imlec = 0;
  for (const [idx, s] of sirali.entries()) {
    let bas = Math.max(s.startCp, 0);
    let son = Math.min(s.endCp, cps.length);
    if (son <= bas) continue;        // boş/ters aralık
    if (bas < imlec) continue;       // çakışan span: ilki kazanır

    // Küme sonunu da tamamla: harfin ardından gelen işaretler span dışında
    // kalırsa bu kez düz parçanın başında sahipsiz kalırlar. Sonraki span'ın
    // alanına taşma — taşarsak o span çakışma sayılıp rengini kaybederdi.
    const sonrakiBas = sirali[idx + 1] ? Math.max(sirali[idx + 1].startCp, 0) : cps.length;
    const tavan = Math.min(cps.length, sonrakiBas);
    while (son < tavan && BIRLESEN.test(cps[son])) son += 1;

    // Küme başına hizala. Span birleşen bir işaretle başlıyorsa o işaret
    // taşıyıcısından ayrı bir <Text>'e düşer ve Android onu noktalı daireyle
    // (U+25CC) çizer. Önce taşıyıcı harfi span'a almayı dene: tecvid açısından
    // da doğrusu budur (med işareti taşıyıcısıyla birlikte renklenir).
    while (bas > imlec && BIRLESEN.test(cps[bas])) bas -= 1;

    if (BIRLESEN.test(cps[bas])) {
      // Geriye alınamadı: hemen önünde başka bir span bitiyor. İşaretleri o
      // parçanın rengiyle ekle — aynı <Text>'te taşıyıcısına kavuşurlar.
      // Rengi kuralınkinden sapar, ama sahipsiz işaret çizmeye yeğdir.
      let ileri = bas;
      while (ileri < son && BIRLESEN.test(cps[ileri])) ileri += 1;
      ekle(parts[parts.length - 1]?.color ?? null, cps.slice(bas, ileri).join(""));
      bas = ileri;
      imlec = ileri;
      if (son <= bas) continue;      // span tümüyle işaretlerden ibaretti
    }

    ekle(null, cps.slice(imlec, bas).join(""));
    ekle(s.color || RENK[s.rule] || null, cps.slice(bas, son).join(""));
    imlec = son;
  }
  ekle(null, cps.slice(imlec).join(""));
  return parts;
}

// NOT: AlQuran markup parser'ı (parseTajweed) kaldırıldı. Markup metni canonical
// Tanzil metninden farklıydı ve grup sınırları harf/hareke arasından geçtiği için
// ekranda sahipsiz işaret üretiyordu. Render artık yalnız canonical metin +
// tajweedSpans ile çalışır; `arabicTajweed` alanı API'de geriye-uyumluluk için
// duruyor ama hiçbir ekranda basılmıyor.
