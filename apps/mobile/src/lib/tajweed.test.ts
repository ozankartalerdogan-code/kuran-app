/**
 * tajweed.test.ts — AlQuran.cloud tecvid markup parser testleri.
 * Çalıştır: npm run test:mobile
 *
 * Format: kodlu grup "[kod[ ... ]" (açılışta çift köşeli), kodsuz şeffaf grup
 * "[ ... ]". İç içe olabilir; en içteki kod geçerli. Bozuk markup çökmemeli.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { codePointSpansToUtf16Ranges, parseTajweed, RENK, TAJWEED_LEGEND, segmentsToRanges, groupSegmentsByWord } from "./tajweed.ts";
test("eksik tecvid span listesi boş renk aralığına düşer", () => {
  assert.deepEqual(codePointSpansToUtf16Ranges("بِسْمِ", undefined), []);
  assert.deepEqual(codePointSpansToUtf16Ranges("بِسْمِ", null), []);
});

test("markup yok: tek segment, kod null, metin aynen", () => {
  assert.deepEqual(parseTajweed("abc"), [{ code: null, t: "abc" }]);
});

test("basit kodlu grup: [n[XY] → kod n", () => {
  assert.deepEqual(parseTajweed("[n[XY]"), [{ code: "n", t: "XY" }]);
});

test("metin kodlu grubu sarar: a[n[X]b", () => {
  assert.deepEqual(parseTajweed("a[n[X]b"), [
    { code: null, t: "a" },
    { code: "n", t: "X" },
    { code: null, t: "b" },
  ]);
});

test("iç içe: en içteki kod geçerli, dışa dönünce eski kod sürer", () => {
  // [n[ A [q[ B ] C ]  → A:n, B:q, C:n
  assert.deepEqual(parseTajweed("[n[A[q[B]C]"), [
    { code: "n", t: "A" },
    { code: "q", t: "B" },
    { code: "n", t: "C" },
  ]);
});

test("kodsuz grup [..] şeffaf: içerik kod almaz", () => {
  assert.deepEqual(parseTajweed("[X]"), [{ code: null, t: "X" }]);
});

test(":sayı ekli açılış da kabul edilir: [n:2[X]", () => {
  assert.deepEqual(parseTajweed("[n:2[X]"), [{ code: "n", t: "X" }]);
});

test("bitişik aynı kodlu gruplar birleşir: [n[A][n[B] → tek 'n' segmenti 'AB'", () => {
  assert.deepEqual(parseTajweed("[n[A][n[B]"), [{ code: "n", t: "AB" }]);
});

test("bozuk: kapanmamış grup çökmez, kalan metin son kodla gelir", () => {
  assert.deepEqual(parseTajweed("[n[X"), [{ code: "n", t: "X" }]);
});

test("bozuk: fazladan kapanış ']' yok sayılır", () => {
  assert.deepEqual(parseTajweed("X]"), [{ code: null, t: "X" }]);
});

test("boş metin → boş dizi", () => {
  assert.deepEqual(parseTajweed(""), []);
});

test("gerçekçi çok-kurallı dize doğru bölünür", () => {
  // "بِ[n[سْمِ] ٱ[q[للَّهِ]" → bi(null) · سْمِ(n) · " ٱ"(null) · للَّهِ(q)
  const segs = parseTajweed("بِ[n[سْمِ] ٱ[q[للَّهِ]");
  assert.deepEqual(segs.map((s) => s.code), [null, "n", null, "q"]);
  // metin kaybı olmamalı (markup soyulunca orijinal harfler kalır)
  const flat = segs.map((s) => s.t).join("");
  assert.equal(flat, "بِسْمِ ٱللَّهِ");
});

test("her parser kodu RENK tablosunda karşılık bulur (sarkık kod yok)", () => {
  // Parser'ın ürettiği tüm kod harfleri renklenebilmeli.
  for (const code of ["n", "p", "o", "m", "g", "f", "i", "a", "c", "u", "w", "b", "q", "h", "s", "l", "d"]) {
    assert.ok(RENK[code], `RENK['${code}'] tanımlı olmalı`);
  }
});

test("lejant 4 tecvid grubunu kapsar", () => {
  assert.equal(TAJWEED_LEGEND.length, 4);
  const renkler = TAJWEED_LEGEND.map((l) => l.renk);
  assert.ok(renkler.includes("#e11d48")); // med
  assert.ok(renkler.includes("#16a34a")); // ğunne
  assert.ok(renkler.includes("#2563eb")); // kalkale
  assert.ok(renkler.includes("#9ca3af")); // sessiz
});

// ── Mark kuralı: segment hareke ile başlayamaz ───────────────────────────────
// (Android, renk sınırı base|mark arasına düşünce mark'ı tabansız shape edip
//  U+25CC kesikli daire çizer — ٱلصَّلَوٰةَ dagger alif vakası, cihazda görüldü)

test("mark kuralı: kodlu grup hareke ile başlarsa hareke önceki segmente taşınır", () => {
  // "و[o[ِةَ]" benzeri: kesre (U+0650) base'i و'ya yapışır
  // (dagger alif İSTİSNA: o vakada base med aralığına çekilir — ayrı test)
  const segs = parseTajweed("و[o[ِةَ]");
  assert.deepEqual(segs, [
    { code: null, t: "وِ" },
    { code: "o", t: "ةَ" },
  ]);
});

test("mark kuralı: yalnız-hareke segment tamamen erir (95:4 fetha vakası)", () => {
  // "[f[نس]َ[n[X]" → kodsuz kalan fetha, f segmentine yapışır; boş segment silinir
  const segs = parseTajweed("[f[نس]َ[n[X]");
  assert.deepEqual(segs, [
    { code: "f", t: "نسَ" },
    { code: "n", t: "X" },
  ]);
});

test("mark kuralı: birleşim daima korunur (95:4 gerçek markup, hiçbir segment mark'la başlamaz)", () => {
  const markup =
    "لَقَ[q:2389[دْ] خَلَ[q:5159[قْ]نَا [h:7228[ٱ]لْإِ[f:5969[نس]َ[n[ـٰ]نَ ف[o[ِىٓ] أَحْسَنِ تَ[q:14556[قْ]و[p[ِي]مٍ";
  const segs = parseTajweed(markup);
  const MARK = /^[ً-ٰٟۖ-ۜ۟-۪ۤۧۨ-ۭ]/;
  for (const s of segs) {
    assert.ok(!MARK.test(s.t), `mark ile başlayan segment: ${JSON.stringify(s.t)}`);
  }
  assert.equal(
    segs.map((s) => s.t).join(""),
    "لَقَدْ خَلَقْنَا ٱلْإِنسَـٰنَ فِىٓ أَحْسَنِ تَقْوِيمٍ",
  );
});

test("mark kuralı: rakam ve normal harf mark sayılmaz (aralık taşması yok)", () => {
  // Arap rakamı (٥ U+0665) ve harf (ب U+0628) segment başında kalabilmeli
  const segs = parseTajweed("A[n[٥B]");
  assert.deepEqual(segs, [
    { code: null, t: "A" },
    { code: "n", t: "٥B" },
  ]);
});

// ── Egzotik karakter normalizasyonu + dagger alif base-çekme ─────────────────
// Kaynak U+0672/U+066E kullanıyor; UthmanicHafs'ta yoklar (.notdef dairesi).

const U0672 = String.fromCharCode(0x0672); // kaynaktaki med elifi (elif+dalgalı hamza)
const DAGGER = String.fromCharCode(0x0670); // Tanzil dagger alif
const U066E = String.fromCharCode(0x066e); // kaynaktaki noktasız be
const ALIF_MAKSURE = String.fromCharCode(0x0649);

test("normalize: U+0672 → dagger alif, U+066E → elif-i maksure", () => {
  const segs = parseTajweed(`[n[${U066E}${U0672}]`);
  assert.deepEqual(segs, [{ code: "n", t: `${ALIF_MAKSURE}${DAGGER}` }]);
});

test("dagger alif kodlu segment başındaysa base grapheme'i med aralığına çekilir (ذَٰلِكَ)", () => {
  // "ذَ[n[ٲ]لِكَ" → base+fetha n segmentine çekilir: [n "ذَٰ"], [null "لِكَ"]
  const segs = parseTajweed(`ذَ[n[${U0672}]لِكَ`);
  assert.deepEqual(segs, [
    { code: "n", t: `ذَ${DAGGER}` },
    { code: null, t: "لِكَ" },
  ]);
});

test("dagger alif base-çekme: önceki tek-harf segment tamamen erir (ٱلصَّلَوٰةَ vakası)", () => {
  // "لَ[s[و][n[ٲ]ةَ" → و (s) med'e çekilir, s segmenti silinir
  const segs = parseTajweed(`لَ[s[و][n[${U0672}]ةَ`);
  assert.deepEqual(segs, [
    { code: null, t: "لَ" },
    { code: "n", t: `و${DAGGER}` },
    { code: null, t: "ةَ" },
  ]);
});

test("kodSUZ dagger alif başlangıçlı segment genel kurala düşer (öncekine taşınır)", () => {
  const segs = parseTajweed(`[q[AB]${DAGGER}C`);
  assert.deepEqual(segs, [
    { code: "q", t: `AB${DAGGER}` },
    { code: null, t: "C" },
  ]);
});

// ── segmentsToRanges (native tek-Spannable renderer girdisi) ─────────────────

test("segmentsToRanges: metin birleşimi aynen korunur, aralıklar doğru", () => {
  const segs = parseTajweed("بِ[n[سْمِ] ٱ[q[للَّهِ]");
  const { text, ranges } = segmentsToRanges(segs);
  assert.equal(text, "بِسْمِ ٱللَّهِ");
  // "بِ"(2) + "سْمِ"(4, n) + " ٱ"(2) + "للَّهِ"(6, q)
  assert.deepEqual(ranges, [
    { start: 2, end: 6, color: RENK.n },
    { start: 8, end: 14, color: RENK.q },
  ]);
});

test("segmentsToRanges: baseOffset aralıkları kaydırır (çok-ayet birleştirme)", () => {
  const segs = parseTajweed("[q[AB]");
  const { ranges } = segmentsToRanges(segs, 100);
  assert.deepEqual(ranges, [{ start: 100, end: 102, color: RENK.q }]);
});

test("segmentsToRanges: RENK'te olmayan kod aralık üretmez, metin yine tam", () => {
  const segs = [{ code: "zz", t: "AB" }, { code: null, t: "C" }];
  const { text, ranges } = segmentsToRanges(segs);
  assert.equal(text, "ABC");
  assert.deepEqual(ranges, []);
});

// ── groupSegmentsByWord (eski build / iOS fallback) ──────────────────────────

test("groupSegmentsByWord: birleşim korunur, yalnız boşlukta bölünür", () => {
  const segs = parseTajweed("بِ[n[سْمِ] ٱ[q[للَّهِ]");
  const kelimeler = groupSegmentsByWord(segs);
  assert.equal(kelimeler.map((s) => s.t).join(""), "بِسْمِ ٱللَّهِ");
  // 2 kelime: "بِسْمِ " (boşluk dahil) + "ٱللَّهِ"
  assert.equal(kelimeler.length, 2);
  for (const k of kelimeler) {
    // kelime içinde bölünme YOK: her parça ya boşlukla biter ya son parçadır
    assert.ok(k.t.endsWith(" ") || k === kelimeler[kelimeler.length - 1]);
  }
});

test("groupSegmentsByWord: kelime rengi ilk kodlu karakterden gelir", () => {
  // "بِ" kodsuz başlar ama kelimenin devamı n kodlu → kelime n rengini alır
  const kelimeler = groupSegmentsByWord(parseTajweed("بِ[n[سْمِ] ٱ[q[للَّهِ]"));
  assert.deepEqual(kelimeler.map((k) => k.code), ["n", "q"]);
});

test("groupSegmentsByWord: hiç kodsuz kelime null kalır", () => {
  const kelimeler = groupSegmentsByWord(parseTajweed("AB [n[CD]"));
  assert.deepEqual(kelimeler.map((k) => k.code), [null, "n"]);
});

test("groupSegmentsByWord: 95:4 gerçek verisinde yalnız-hareke segmenti kalmaz", () => {
  // Statik analizde nested-Text bozulmasını üreten gerçek markup (Tîn 4).
  const markup =
    "لَقَ[q:2389[دْ] خَلَ[q:5159[قْ]نَا [h:7228[ٱ]لْإِ[f:5969[نس]َ[n[ـٰ]نَ ف[o[ِىٓ] أَحْسَنِ تَ[q:14556[قْ]و[p[ِي]مٍ";
  const duz = parseTajweed(markup).map((s) => s.t).join("");
  const kelimeler = groupSegmentsByWord(parseTajweed(markup));
  assert.equal(kelimeler.map((s) => s.t).join(""), duz);
  assert.equal(kelimeler.length, 6); // 6 kelime
  // hiçbir parça yalnız combining mark'tan oluşmamalı
  for (const k of kelimeler) {
    assert.ok(!/^[ً-ٰ]+$/.test(k.t), `yalnız-hareke parça: ${JSON.stringify(k.t)}`);
  }
});
