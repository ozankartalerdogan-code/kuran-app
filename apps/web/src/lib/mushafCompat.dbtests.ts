/**
 * mushafCompat.dbtests.ts — /api/mushaf v5 geriye-uyumluluk katmanı testleri.
 * Çalıştır: npm test  (mushafCompat.test.ts kapısı üzerinden; DB yoksa atlanır)
 *
 * Post-migration DB durumu, canonical `data/app.db` üzerinden birebir simüle
 * edilir: route'un okuduğu verses + quran_verse_metadata + tajweed_spans
 * tabloları salt-okunur okunur. Testler iki istemci neslinin de basmalayı
 * TAM BİR KEZ gördüğünü, span'ların grapheme sınırlarına saygılı kaldığını ve
 * eski istemcinin yeni yanıtı parse ederken kırılmadığını kanıtlar.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { buildMushafVerse, type MushafVersePayload, type BasmalaRange, type QuranTajweedSpan } from "./mushafCompat.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

// Kanonik kaynak = /api/mushaf route'unun okuduğu üç tablonun ta kendisi
// (verses + quran_verse_metadata + tajweed_spans). Bu testin eski girdileri
// (data/generated/quran/*.json) hiçbir zaman bu dalın geçmişine girmemiş bir
// üretim hattının ara dosyalarıydı; runtime'ın tek doğruluk kaynağı DB olduğu
// için sözleşme doğrudan onun üzerinden doğrulanır. Bağlantı salt-okunur açılır
// ve satırlar sorgu sırasına göre deterministik okunur.
const db = new DatabaseSync(path.join(ROOT, "data", "app.db"), { readOnly: true });

interface VerseRow { verse_key: string; surah_id: number; ayah_number: number; arabic_text: string }
interface MetadataRow {
  verse_key: string;
  basmala_kind: "ayah" | "prefix";
  basmala_start_cp: number;
  basmala_end_cp: number;
  body_start_cp: number;
}
interface SpanRow { verse_key: string; start_cp: number; end_cp: number; rule: string; color: string }

const verses: { verseKey: string; surahId: number; ayahNumber: number; arabicText: string }[] = (
  db.prepare(
    `SELECT verse_key, surah_id, ayah_number, arabic_text
     FROM verses
     ORDER BY surah_id, ayah_number`,
  ).all() as unknown as VerseRow[]
).map((v) => ({
  verseKey: v.verse_key,
  surahId: v.surah_id,
  ayahNumber: v.ayah_number,
  arabicText: v.arabic_text,
}));

const rangeByKey = new Map(
  (
    db.prepare(
      `SELECT m.verse_key, m.basmala_kind, m.basmala_start_cp, m.basmala_end_cp, m.body_start_cp
       FROM quran_verse_metadata m
       JOIN verses v ON v.verse_key = m.verse_key
       ORDER BY v.surah_id, v.ayah_number`,
    ).all() as unknown as MetadataRow[]
  ).map((m): [string, BasmalaRange & { verseKey: string }] => [
    m.verse_key,
    {
      verseKey: m.verse_key,
      kind: m.basmala_kind,
      startCp: m.basmala_start_cp,
      endCp: m.basmala_end_cp,
      bodyStartCp: m.body_start_cp,
    },
  ]),
);

const spansByKey = new Map<string, QuranTajweedSpan[]>();
for (const s of db.prepare(
  `SELECT t.verse_key, t.start_cp, t.end_cp, t.rule, t.color
   FROM tajweed_spans t
   JOIN verses v ON v.verse_key = t.verse_key
   ORDER BY v.surah_id, v.ayah_number, t.start_cp`,
).all() as unknown as SpanRow[]) {
  const list = spansByKey.get(s.verse_key) ?? [];
  list.push({ startCp: s.start_cp, endCp: s.end_cp, rule: s.rule, color: s.color });
  spansByKey.set(s.verse_key, list);
}

db.close();

/** Post-migration DB satırından v5 payload üret. */
function payloadFor(verseKey: string): MushafVersePayload {
  const verse = verses.find((v) => v.verseKey === verseKey);
  assert.ok(verse, `verse ${verseKey} missing in canonical data`);
  const r = rangeByKey.get(verseKey);
  return buildMushafVerse({
    surahId: verse.surahId,
    ayahNumber: verse.ayahNumber,
    arabicText: verse.arabicText,
    arabicTajweed: `[markup:${verseKey}]`, // içerik önemsiz; alanın geçtiği kanıtlanır
    basmalaRange: r ? { kind: r.kind, startCp: r.startCp, endCp: r.endCp, bodyStartCp: r.bodyStartCp } : null,
    spans: spansByKey.get(verseKey) ?? [],
  });
}

const PREFIX_KEYS = [...rangeByKey.values()].filter((r) => r.kind === "prefix").map((r) => r.verseKey);

// Yayındaki AAB'nin (54ca74a) sabit besmele satırı ve blok koşulu — birebir kopya.
const OLD_CLIENT_BESMELE = "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ";
const oldClientShowsBesmele = (surahId: number) => surahId !== 1 && surahId !== 9;

// Basmala başlangıç kalıpları GERÇEK verilerden türetilir (elle yazılmış
// literal, Tanzil'in şedde-önce hareke sırasını kaçırabilir): kanonik 1:1'in
// ilk iki kelimesi (düz), 95:1 önekinin ilk iki kelimesi (şeddeli varyant) ve
// eski istemcinin sabit BESMELE'sinin ilk iki kelimesi.
const firstTwoWords = (s: string) => s.split(" ").slice(0, 2).join(" ");
const BASMALA_NEEDLES = [...new Set([
  firstTwoWords(verses.find((v) => v.verseKey === "1:1")!.arabicText),
  firstTwoWords(Array.from(rangeByKey.get("95:1")!.bodyStartCp ? verses.find((v) => v.verseKey === "95:1")!.arabicText : "").join("")),
  firstTwoWords("بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ"),
])].filter(Boolean);

function countBasmala(text: string): number {
  let count = 0;
  for (const needle of BASMALA_NEEDLES) {
    for (let i = text.indexOf(needle); i !== -1; i = text.indexOf(needle, i + 1)) count += 1;
  }
  return count;
}

test("112 sure açılışı: ESKİ istemci render'ında besmele TAM BİR KEZ görünür", () => {
  assert.equal(PREFIX_KEYS.length, 112);
  for (const key of PREFIX_KEYS) {
    const p = payloadFor(key);
    // Eski istemci: sabit besmele satırı + arabic alanı olduğu gibi.
    const rendered = (oldClientShowsBesmele(p.surahId) ? OLD_CLIENT_BESMELE + "\n" : "") + (p.arabic ?? "");
    assert.equal(countBasmala(rendered), 1, `${key}: eski istemci besmeleyi tam 1 kez görmeli`);
    assert.ok(!(p.arabic ?? "").startsWith("بِسْمِ") && !(p.arabic ?? "").startsWith("بِّسْمِ"),
      `${key}: arabic (gövde) basmala ile başlamamalı`);
  }
});

test("112 sure açılışı: YENİ istemci render'ında besmele TAM BİR KEZ görünür ve kanonik metin birebir yeniden kurulur", () => {
  for (const key of PREFIX_KEYS) {
    const p = payloadFor(key);
    assert.ok(p.basmalaText, `${key}: basmalaText üretilmeli`);
    assert.ok(p.canonicalArabic, `${key}: canonicalArabic üretilmeli`);
    const chars = Array.from(p.canonicalArabic!);
    const sep = chars.slice(p.basmalaRange!.endCp, p.basmalaRange!.bodyStartCp).join("");
    // Yeni istemci: başlıkta basmalaText (1 kez) + gövde; birleşim = kanonik.
    assert.equal(`${p.basmalaText}${sep}${p.arabic}`, p.canonicalArabic,
      `${key}: basmala + ayraç + gövde kanonik metni birebir kurmalı`);
    const rendered = p.basmalaText + "\n" + p.arabic;
    assert.equal(countBasmala(rendered), 1, `${key}: yeni istemci besmeleyi tam 1 kez görmeli`);
  }
});

test("regresyon 1:1 — Fatiha'nın ilk ayeti (basmala ayetin kendisi) bölünmez", () => {
  const p = payloadFor("1:1");
  assert.equal(p.arabic, p.canonicalArabic);
  assert.equal(p.basmalaRange?.kind, "ayah");
  assert.equal(p.basmalaText, null);
  assert.deepEqual(p.tajweedSpans, p.canonicalTajweedSpans);
});

test("regresyon 2:1 — gövde yalnız hurûf-u mukattaa kalır", () => {
  const p = payloadFor("2:1");
  assert.equal(p.arabic, "الٓمٓ");
  assert.ok(p.canonicalArabic!.startsWith("بِسْمِ"));
  assert.equal(p.basmalaRange?.kind, "prefix");
});

test("regresyon 9:1 — Tevbe'de basmalaRange üretilmez, metin dokunulmaz", () => {
  const p = payloadFor("9:1");
  assert.equal(p.basmalaRange, null);
  assert.equal(p.basmalaText, null);
  assert.equal(p.arabic, p.canonicalArabic);
  assert.equal(countBasmala(p.arabic ?? ""), 0);
});

test("regresyon 95:1 — Tîn'in şeddeli basmala varyantı kanonikten korunur", () => {
  const p = payloadFor("95:1");
  assert.ok(p.basmalaText!.startsWith("بِّ") || Array.from(p.basmalaText!).slice(0, 3).some((c) => c.codePointAt(0) === 0x0651),
    "basmalaText şedde taşımalı (sabit BESMELE'den farklı)");
  assert.notEqual(p.basmalaText, OLD_CLIENT_BESMELE);
  assert.ok(!(p.arabic ?? "").includes("بِّسْمِ"));
});

test("tajweedSpans (gövde) ve canonicalTajweedSpans (kanonik) grapheme cluster sınırlarını ihlal etmez", () => {
  const segmenter = new Intl.Segmenter("ar", { granularity: "grapheme" });
  const boundariesOf = (text: string) => {
    const set = new Set([0]);
    let cp = 0;
    for (const { segment } of segmenter.segment(text)) {
      cp += Array.from(segment).length;
      set.add(cp);
    }
    return set;
  };
  let checkedSpans = 0;
  for (const verse of verses) {
    const p = payloadFor(verse.verseKey);
    for (const [text, spans, label] of [
      [p.arabic ?? "", p.tajweedSpans, "body"],
      [p.canonicalArabic ?? "", p.canonicalTajweedSpans, "canonical"],
    ] as const) {
      const boundaries = boundariesOf(text);
      for (const span of spans) {
        checkedSpans += 1;
        assert.ok(boundaries.has(span.startCp), `${verse.verseKey} ${label} span start ${span.startCp} grapheme sınırında değil`);
        assert.ok(boundaries.has(span.endCp), `${verse.verseKey} ${label} span end ${span.endCp} grapheme sınırında değil`);
      }
    }
  }
  assert.ok(checkedSpans > 100000, `iki span seti birlikte kontrol edilmeli (checked=${checkedSpans})`);
});

test("gövde span'ları gövde metniyle sınırlı ve önekten sızıntısız", () => {
  for (const key of PREFIX_KEYS) {
    const p = payloadFor(key);
    const bodyLen = Array.from(p.arabic ?? "").length;
    for (const span of p.tajweedSpans) {
      assert.ok(span.startCp >= 0 && span.endCp <= bodyLen, `${key}: gövde span'ı sınır aşıyor`);
    }
    // Önek kanonikte HİÇ renklendirilmez (generation garantisi) — kanonik
    // span'ların hiçbiri önek bölgesine düşmemeli.
    for (const span of p.canonicalTajweedSpans) {
      assert.ok(span.startCp >= p.basmalaRange!.bodyStartCp, `${key}: kanonik span önek bölgesinde`);
    }
  }
});

test("ESKİ istemci parse simülasyonu: v5 yanıtı bilinmeyen alanlarla sorunsuz işlenir (crash yok)", () => {
  // Eski istemci (54ca74a api.ts): res.json() as T — hiçbir şema doğrulaması
  // yok, fazladan alanlar sessizce yok sayılır. Simülasyon: JSON gidiş-dönüşü
  // + eski bloklariKur'un birebir kopyasının yeni payload üstünde çalışması.
  const page3Keys = ["2:1", "2:2", "2:3"];
  const parsed = JSON.parse(JSON.stringify({
    page: 1, juz: 1,
    verses: page3Keys.map(payloadFor),
    surahs: [{ id: 2, name: "Bakara", arabicName: "البقرة" }],
  }));

  type OldVerse = { surahId: number; ayahNumber: number; arabic: string | null; tajweed: string | null };
  type OldBlok =
    | { tip: "sure"; surahId: number; besmele: boolean }
    | { tip: "metin"; ayetler: OldVerse[] };
  const bloklar: OldBlok[] = [];
  let metin: OldVerse[] = [];
  const metniKapat = () => {
    if (metin.length > 0) { bloklar.push({ tip: "metin", ayetler: metin }); metin = []; }
  };
  for (const v of parsed.verses as OldVerse[]) {
    if (v.ayahNumber === 1) {
      metniKapat();
      bloklar.push({ tip: "sure", surahId: v.surahId, besmele: v.surahId !== 1 && v.surahId !== 9 });
    }
    metin.push(v);
  }
  metniKapat();

  assert.equal(bloklar.length, 2);
  assert.deepEqual(bloklar[0], { tip: "sure", surahId: 2, besmele: true });
  const metinBlok = bloklar[1] as Extract<OldBlok, { tip: "metin" }>;
  assert.equal(metinBlok.ayetler.length, 3);
  for (const v of metinBlok.ayetler) {
    assert.equal(typeof v.arabic, "string");
    assert.equal(typeof v.tajweed, "string"); // eski tecvid markup alanı korunuyor
  }
  assert.equal(metinBlok.ayetler[0].arabic, "الٓمٓ");
});

// ─── FAIL-SAFE SENARYOLARI ───────────────────────────────────────────────────
// Eski istemci hiçbir DB/metadata durumunda çift besmele GÖRMEMELİ. Üç durum:

test("fail-safe (a): migration ÖNCESİ DB (öneksiz metin + metadata yok) → bugünkü davranış birebir aynı", () => {
  // Deploy-önce-migration sırası güvenli olmalı: tablolar yokken route boş
  // metadata/span verir; ayet olduğu gibi geçer. Metinsel fallback da devreye
  // GİRMEZ çünkü öneksiz metinde basmala iskeleti eşleşmez.
  const p = buildMushafVerse({
    surahId: 2, ayahNumber: 1,
    arabicText: "الٓمٓ", // bugünkü prod: basmala öneksiz gövde
    arabicTajweed: "الٓمٓ",
    basmalaRange: null,
    spans: [],
  });
  assert.equal(p.arabic, "الٓمٓ");
  assert.equal(p.canonicalArabic, "الٓمٓ");
  assert.deepEqual(p.tajweedSpans, []);
  assert.equal(p.basmalaRange, null);
  assert.equal(p.basmalaText, null);
  const rendered = OLD_CLIENT_BESMELE + "\n" + p.arabic;
  assert.equal(countBasmala(rendered), 1, "eski istemci: sabit besmele + gövde = tam 1");
});

test("fail-safe (b): migration SONRASI DB + GEÇERLİ basmalaRange → eski istemcide besmele TAM 1 KEZ", () => {
  // 112'lik tam tarama yukarıdaki testte; burada senaryo adıyla sabitlenir.
  const p = payloadFor("2:1");
  assert.equal(p.arabic, "الٓمٓ");
  const rendered = OLD_CLIENT_BESMELE + "\n" + p.arabic;
  assert.equal(countBasmala(rendered), 1);
});

test("fail-safe (c1): migration SONRASI DB + basmalaRange NULL (metadata satırı/tablosu yok) → arabic yine besmelesiz, eski istemcide TAM 1 KEZ", () => {
  const canonical = verses.find((v) => v.verseKey === "2:1")!.arabicText;
  const p = buildMushafVerse({
    surahId: 2, ayahNumber: 1,
    arabicText: canonical, // basmala GÖMÜLÜ (migration sonrası)
    arabicTajweed: null,
    basmalaRange: null,    // metadata kayıp
    spans: [],
  });
  assert.equal(p.arabic, "الٓمٓ", "metinsel fallback öneki ayırmalı");
  assert.ok(!(p.arabic ?? "").startsWith("بِسْمِ"));
  assert.equal(p.basmalaRange?.kind, "prefix", "türetilen aralık yeni istemci için yayınlanır");
  assert.ok(p.basmalaText!.length > 0);
  const rendered = OLD_CLIENT_BESMELE + "\n" + p.arabic;
  assert.equal(countBasmala(rendered), 1, "çift besmele OLMAMALI");
});

test("fail-safe (c2): migration SONRASI DB + SINIR-DIŞI bozuk aralık → arabic yine besmelesiz, TAM 1 KEZ", () => {
  const canonical = verses.find((v) => v.verseKey === "2:1")!.arabicText;
  const p = buildMushafVerse({
    surahId: 2, ayahNumber: 1,
    arabicText: canonical,
    arabicTajweed: null,
    basmalaRange: { kind: "prefix", startCp: 0, endCp: 5000, bodyStartCp: 5001 }, // metin dışı
    spans: [],
  });
  assert.equal(p.arabic, "الٓمٓ", "bozuk aralıkta canonical arabic'e DÜŞMEMELİ — metinsel fallback ayırır");
  const rendered = OLD_CLIENT_BESMELE + "\n" + p.arabic;
  assert.equal(countBasmala(rendered), 1, "çift besmele OLMAMALI");
});

test("fail-safe (c3): migration SONRASI DB + sınır-İÇİ ama TUTARSIZ aralık (yanlış konum) → iskelet doğrulaması reddeder, metinsel fallback ayırır, TAM 1 KEZ", () => {
  const canonical = verses.find((v) => v.verseKey === "2:1")!.arabicText;
  const p = buildMushafVerse({
    surahId: 2, ayahNumber: 1,
    arabicText: canonical,
    arabicTajweed: null,
    // Sınırlar geçerli ama basmalayı ORTASINDAN kesiyor — kesilen önek
    // basmala iskeletiyle eşleşmez, aralık reddedilmeli.
    basmalaRange: { kind: "prefix", startCp: 0, endCp: 10, bodyStartCp: 11 },
    spans: [],
  });
  assert.equal(p.arabic, "الٓمٓ", "tutarsız aralık asla yarım basmala bırakmamalı");
  const rendered = OLD_CLIENT_BESMELE + "\n" + p.arabic;
  assert.equal(countBasmala(rendered), 1);
});

test("fail-safe (c4): 9:1'e yanlışlıkla prefix aralığı sızarsa metin bölünmez ve besmele 0 kez kalır", () => {
  const tevbe = verses.find((v) => v.verseKey === "9:1")!.arabicText; // basmala YOK
  const p = buildMushafVerse({
    surahId: 9, ayahNumber: 1,
    arabicText: tevbe,
    arabicTajweed: null,
    basmalaRange: { kind: "prefix", startCp: 0, endCp: 10, bodyStartCp: 11 }, // veri hatası
    spans: [],
  });
  assert.equal(p.arabic, tevbe, "Tevbe metnine dokunulmaz");
  assert.equal(p.basmalaRange, null, "bozuk aralık yayınlanmaz");
  // Eski istemci sure 9 için sabit besmele de basmaz → toplam 0.
  assert.equal(countBasmala(p.arabic ?? ""), 0);
});

test("BASMALA_SKELETON sabiti gerçek kanonik basmalaya ve 95:1 şeddeli varyanta iskelet düzeyinde eşittir", () => {
  // İskelet fonksiyonunun kopyası (modül dışına açılmıyor): NFC + Mn/Cf/tatweel
  // at + elif-i vasl → elif. Sabit, gerçek verilerle burada sabitlenir.
  const skel = (s: string) => s.normalize("NFC").replace(/[\p{Mn}\p{Cf}ـ]/gu, "").replace(/ٱ/g, "ا");
  assert.equal(skel(verses.find((v) => v.verseKey === "1:1")!.arabicText), "بسم الله الرحمن الرحيم");
  assert.equal(skel(payloadFor("95:1").basmalaText!), "بسم الله الرحمن الرحيم");
});

test("tajweed (legacy markup) alanı: yayındaki 54ca74a AAB'si AyetMetni→parseTajweed ile tüketiyor — alan bu yüzden korunuyor", () => {
  // Alan yeni istemcide KULLANILMAZ (span tabanlı render'a geçildi); yalnız
  // yayındaki eski kapalı-test istemcisi için sözleşmede tutulur. Eski istemci
  // güncel AAB'ye tamamen geçince alan v6'da kaldırılabilir.
  const p = payloadFor("2:2");
  assert.equal(typeof p.tajweed, "string");
});
