/**
 * mushafCompat.ts — /api/mushaf geriye-uyumluluk katmanı (schemaVersion 5).
 *
 * Production DB kanonik Tanzil metnine geçtiğinde, sure-açılış ayetlerinin
 * arabic_text'i basmala önekini GÖMÜLÜ taşır. Yayındaki eski kapalı-test
 * AAB'si ise basmalayı sabit bir başlık satırı olarak KENDİSİ çizer ve
 * `arabic` alanını koşulsuz ayet gövdesi sanır — önek ayrılmazsa basmala
 * ekranda iki kez görünür.
 *
 * Bu modül tek bir ayet satırını iki istemci neslinin de doğru gördüğü
 * additive yanıta çevirir:
 *   - ESKİ alanlar (arabic, tajweed, tajweedSpans): basmala önekSİZ gövde ve
 *     gövde koordinatlı span'lar — eski istemci davranışı birebir korunur.
 *   - YENİ alanlar (canonicalArabic, canonicalTajweedSpans, basmalaRange,
 *     basmalaText): basmala dahil tam kanonik metin ve kanonik koordinatlar.
 *
 * Tüm kesmeler code-point güvenlidir (Array.from); UTF-16 index asla
 * code-point offset yerine kullanılmaz. Geçersiz/aykırı basmala aralığında
 * bölme YAPILMAZ: ayet olduğu gibi (bölünmemiş) döner ve basmalaRange null
 * yayınlanır — yanlış bölünmüş Kuran metni servis etmektense eski davranışa
 * düşmek tercih edilir.
 */

export type QuranTajweedSpan = { startCp: number; endCp: number; rule: string; color: string };
export type BasmalaRange = { kind: "ayah" | "prefix"; startCp: number; endCp: number; bodyStartCp: number };

export type MushafVersePayload = {
  surahId: number;
  ayahNumber: number;
  /** ESKİ istemci sözleşmesi: basmala öneksiz ayet gövdesi. */
  arabic: string | null;
  /** ESKİ istemci sözleşmesi: AlQuran.cloud tecvid markup'ı (değişmeden geçer). */
  tajweed: string | null;
  /** ESKİ/yeni ortak: gövde (arabic) koordinatlı span'lar. */
  tajweedSpans: QuranTajweedSpan[];
  /** YENİ: basmala dahil tam kanonik Tanzil metni. */
  canonicalArabic: string | null;
  /** YENİ: kanonik metin koordinatlı span'lar (DB'deki ham satırlar). */
  canonicalTajweedSpans: QuranTajweedSpan[];
  /** YENİ: kanonik metindeki basmala aralığı (yalnız gerçekten bölünebildiyse). */
  basmalaRange: BasmalaRange | null;
  /** YENİ: kanonik metinden kesilen gerçek basmala (örn. Tîn'de şeddeli varyant). */
  basmalaText: string | null;
};

export type MushafVerseInput = {
  surahId: number;
  ayahNumber: number;
  arabicText: string | null;
  arabicTajweed: string | null;
  basmalaRange: BasmalaRange | null;
  /** Kanonik metne göre mutlak koordinatlı span'lar (DB tajweed_spans satırları). */
  spans: QuranTajweedSpan[];
};

function isValidPrefixRange(chars: string[], range: BasmalaRange): boolean {
  return (
    range.kind === "prefix" &&
    range.startCp === 0 &&
    range.endCp > 0 &&
    range.endCp < range.bodyStartCp &&
    range.bodyStartCp <= chars.length
  );
}

/**
 * Harf iskeleti: NFC + tüm combining işaretler (Mn), format karakterleri (Cf)
 * ve tatweel atılır; elif-i vasl (U+0671) düz elife eşlenir. YALNIZ doğrulama
 * karşılaştırması için kullanılır — çıktı metnine asla dokunmaz. Hareke sırası
 * ve şeddeli varyantlardan (Tîn'in بِّسْمِ'i dahil) bağımsız, deterministik
 * bir eşitlik verir; dini kural yorumu içermez.
 */
function letterSkeleton(value: string): string {
  return value
    .normalize("NFC")
    .replace(/[\p{Mn}\p{Cf}ـ]/gu, "")
    .replace(/ٱ/g, "ا");
}

// Kanonik basmalanın harf iskeleti (testle gerçek 1:1 metnine sabitlenir).
const BASMALA_SKELETON = "بسم الله الرحمن الرحيم";

type SplitResult = { basmalaText: string; body: string; range: BasmalaRange };

/**
 * Verilen prefix aralığıyla bölmeyi DENER; aralık sınır-dışıysa, kesilen önek
 * gerçekten basmala değilse (tutarsız/yanlış-konum aralık) veya birleşim
 * kanonik metni birebir kurmuyorsa null döner. Yanlış bölünmüş Kuran metni
 * hiçbir koşulda üretilmez.
 */
function trySplitWithRange(chars: string[], fullText: string, range: BasmalaRange): SplitResult | null {
  if (!isValidPrefixRange(chars, range)) return null;
  const basmalaText = chars.slice(range.startCp, range.endCp).join("");
  const separator = chars.slice(range.endCp, range.bodyStartCp).join("");
  const body = chars.slice(range.bodyStartCp).join("");
  if (letterSkeleton(basmalaText) !== BASMALA_SKELETON) return null;
  if (`${basmalaText}${separator}${body}` !== fullText) return null;
  return { basmalaText, body, range };
}

/**
 * Metadata yok/bozukken FAIL-SAFE: sure-açılış ayetinde (1 ve 9 hariç) basmala
 * öneki, builder'ın ürettiği aynı kuralla (ilk dört boşluklu kelime —
 * buildBasmalaRanges ile birebir) metinden türetilir ve iskelet doğrulamasından
 * geçerse bölünür. Migration ÖNCESİ (öneksiz) metinde iskelet eşleşmez → bölme
 * olmaz; böylece eski istemci hiçbir senaryoda çift besmele görmez.
 */
function trySplitTextually(chars: string[], fullText: string, surahId: number, ayahNumber: number): SplitResult | null {
  if (ayahNumber !== 1 || surahId === 1 || surahId === 9) return null;
  const spaces: number[] = [];
  for (let i = 0; i < chars.length && spaces.length < 4; i += 1) {
    if (chars[i] === " ") spaces.push(i);
  }
  if (spaces.length < 4) return null;
  const derived: BasmalaRange = { kind: "prefix", startCp: 0, endCp: spaces[3], bodyStartCp: spaces[3] + 1 };
  return trySplitWithRange(chars, fullText, derived);
}

/**
 * Gövde koordinatlı eski-istemci span'ları, kanonik span'lardan BAĞIMSIZ bir
 * hesapla üretir (canonicalTajweedSpans alanından türetilmez): kaynak DB
 * satırları + basmala aralığı → önek tamamen atılır, gövdeye taşan/öneke
 * değen hiçbir aralık sızdırılmaz.
 */
function bodyRelativeSpans(spans: QuranTajweedSpan[], bodyStartCp: number): QuranTajweedSpan[] {
  const out: QuranTajweedSpan[] = [];
  for (const span of spans) {
    if (span.startCp < bodyStartCp) continue; // önek içi veya önek-sınırını kesen: atla
    out.push({ ...span, startCp: span.startCp - bodyStartCp, endCp: span.endCp - bodyStartCp });
  }
  return out;
}

export function buildMushafVerse(input: MushafVerseInput): MushafVersePayload {
  const base: MushafVersePayload = {
    surahId: input.surahId,
    ayahNumber: input.ayahNumber,
    arabic: input.arabicText,
    tajweed: input.arabicTajweed,
    tajweedSpans: input.spans,
    canonicalArabic: input.arabicText,
    canonicalTajweedSpans: input.spans,
    basmalaRange: input.basmalaRange,
    basmalaText: null,
  };

  // Metin yoksa veya 1:1 (kind "ayah": basmala ayetin kendisidir, DOKUNULMAZ)
  // ise ayet olduğu gibi döner.
  if (input.arabicText === null || input.basmalaRange?.kind === "ayah") {
    return base;
  }

  const chars = Array.from(input.arabicText);

  // 1) Birincil yol: metadata'daki aralıkla böl (builder'ın ürettiği kesin
  //    offsetler). İskelet + yeniden-kurma doğrulamasından geçmeyen aralık
  //    (sınır-dışı VEYA sınır-içi ama yanlış konumlu) kullanılmaz.
  const metadataSplit = input.basmalaRange?.kind === "prefix"
    ? trySplitWithRange(chars, input.arabicText, input.basmalaRange)
    : null;
  if (input.basmalaRange?.kind === "prefix" && !metadataSplit) {
    console.error(
      `[mushafCompat] invalid/inconsistent basmala range for ${input.surahId}:${input.ayahNumber}; falling back to textual detection`,
    );
  }

  // 2) FAIL-SAFE yol: metadata yok ya da bozuksa, basmala metinden türetilir.
  //    Böylece eski istemcinin `arabic` alanı HİÇBİR senaryoda basmala
  //    taşımaz (çift besmele imkânsızlaşır); migration öncesi öneksiz metinde
  //    iskelet eşleşmediği için bölme yapılmaz (bugünkü davranış birebir).
  const split = metadataSplit ?? trySplitTextually(chars, input.arabicText, input.surahId, input.ayahNumber);
  if (!split) {
    // Bölünecek basmala yok (9:1, ayet>1, migration-öncesi metin, ya da
    // gerçekten öneksiz veri): bozuk prefix aralığı yayınlanmaz.
    return { ...base, basmalaRange: input.basmalaRange?.kind === "prefix" ? null : input.basmalaRange };
  }

  return {
    ...base,
    arabic: split.body,
    tajweedSpans: bodyRelativeSpans(input.spans, split.range.bodyStartCp),
    basmalaRange: split.range,
    basmalaText: split.basmalaText,
  };
}
