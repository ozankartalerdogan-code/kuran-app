/**
 * dersler_data.test.ts — elle yazılan ders/quiz JSON'larının yapısal doğrulaması.
 * Çalıştır: npm run test:mobile
 *
 * ~680KB el yazması veri: id çakışması, geçersiz doğru cevap, bozuk şık formatı,
 * tekrarlı şık metni (shuffleQuizOptions bunu varsayar), kopuk {{link:...}} anahtarı
 * ve GORSEL_MAP'te olmayan görsel gibi hatalar sessizce kullanıcıya sızmasın diye
 * her dosya burada taranır. Yeni ders/quiz eklendiğinde otomatik kapsanır.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { INTERNAL_LINKS } from "../../lib/internalLinks.ts";
import { normalizeQuizSorular } from "../../lib/quizUtils.ts";

const DIR = dirname(fileURLToPath(import.meta.url));

// app/dersler/[dersId].tsx içindeki GORSEL_MAP anahtarları — oraya görsel
// eklenince/bunlardan silinince bu liste de güncellenmeli (require() içerdiği
// için ekran modülü node testinde import edilemiyor).
const GORSEL_KEYS = new Set([
  "namaz_tekbir", "namaz_kiyam", "namaz_ruku", "namaz_kavme",
  "namaz_secde", "namaz_celse", "namaz_tesehhud", "namaz_selam",
]);

const LINK_TOKEN_RE = /\{\{link:([a-z0-9-]+)\|[^}|]+\}\}/g;
const ZORLUKLAR = new Set(["kolay", "orta", "zor"]);

type Json = Record<string, unknown>;
const files = readdirSync(DIR).filter((f) => f.endsWith(".json"));
const load = (f: string): Json => JSON.parse(readFileSync(join(DIR, f), "utf8"));

test("dersler klasöründe JSON dosyaları var", () => {
  assert.ok(files.length >= 30, `beklenmedik dosya sayısı: ${files.length}`);
});

for (const f of files) {
  const j = load(f);

  if (Array.isArray(j.kartlar)) {
    // ── Ders (kart) dosyası ──
    test(`${f}: kartlar geçerli`, () => {
      const kartlar = j.kartlar as Json[];
      assert.ok(kartlar.length > 0, "en az 1 kart olmalı");
      const ids = new Set<string>();
      for (const k of kartlar) {
        const tag = `kart ${String(k.id)}`;
        assert.equal(typeof k.id, "string", `${tag}: id string olmalı`);
        assert.ok(!ids.has(k.id as string), `${tag}: tekrarlanan id`);
        ids.add(k.id as string);
        assert.ok(typeof k.baslik === "string" && k.baslik, `${tag}: baslik eksik`);
        assert.ok(typeof k.icerik === "string" && k.icerik, `${tag}: icerik eksik`);
        assert.ok(typeof k.vurgu === "string" && k.vurgu, `${tag}: vurgu eksik`);
        assert.ok(k.tip === "metin" || k.tip === "gorsel", `${tag}: bilinmeyen tip "${String(k.tip)}"`);
        if (k.tip === "gorsel") {
          assert.ok(GORSEL_KEYS.has(k.gorsel as string), `${tag}: gorsel "${String(k.gorsel)}" GORSEL_MAP'te yok`);
        }
        // {{link:KEY|metin}} token'ları çözülebilir olmalı — bilinmeyen KEY düz
        // metin olarak render edilir (crash yok) ama içerik hatasıdır.
        for (const m of (k.icerik as string).matchAll(LINK_TOKEN_RE)) {
          assert.ok(m[1] in INTERNAL_LINKS, `${tag}: tanımsız link anahtarı "${m[1]}"`);
        }
        // Kapanmamış / bozuk token: "{{link:" geçip düzgün token'a oturmayan metin
        const rawTokens = ((k.icerik as string).match(/\{\{link:/g) ?? []).length;
        const okTokens = [...(k.icerik as string).matchAll(LINK_TOKEN_RE)].length;
        assert.equal(rawTokens, okTokens, `${tag}: bozuk {{link:...}} tokenı`);
      }
    });
  } else if (Array.isArray(j.sorular)) {
    // ── Quiz dosyası (yerleşik format) ──
    test(`${f}: sorular geçerli`, () => {
      const sorular = j.sorular as Json[];
      if (typeof j.toplam_soru === "number") {
        assert.equal(j.toplam_soru, sorular.length, "toplam_soru gerçek sayıyla uyuşmalı");
      }
      const ids = new Set<string>();
      const metinler = new Set<string>();
      for (const s of sorular) {
        const tag = `soru ${String(s.id)}`;
        assert.ok(typeof s.id === "string" && s.id, `${tag}: id eksik`);
        assert.ok(!ids.has(s.id as string), `${tag}: tekrarlanan id`);
        ids.add(s.id as string);
        assert.ok(typeof s.soru === "string" && s.soru, `${tag}: soru metni eksik`);
        const key = (s.soru as string).trim().toLowerCase();
        assert.ok(!metinler.has(key), `${tag}: aynı soru metni tekrarı`);
        metinler.add(key);
        const secenekler = s.secenekler as unknown[];
        assert.ok(Array.isArray(secenekler) && secenekler.length >= 2, `${tag}: en az 2 şık olmalı`);
        const harfler: string[] = [];
        const optMetin = new Set<string>();
        for (const o of secenekler) {
          assert.equal(typeof o, "string", `${tag}: şık string olmalı`);
          assert.match(o as string, /^[A-F]\) /, `${tag}: şık formatı "X) metin" olmalı: "${String(o).slice(0, 30)}"`);
          harfler.push((o as string).charAt(0));
          const metin = (o as string).slice(3).trim();
          // shuffleQuizOptions doğru cevabı METİN eşleşmesiyle taşır — tekrar yasak.
          assert.ok(!optMetin.has(metin), `${tag}: tekrarlanan şık metni "${metin}"`);
          optMetin.add(metin);
        }
        assert.equal(new Set(harfler).size, harfler.length, `${tag}: tekrarlanan şık harfi`);
        assert.ok(harfler.includes(s.dogru_cevap as string), `${tag}: dogru_cevap "${String(s.dogru_cevap)}" şıklarda yok`);
        assert.ok(typeof s.aciklama === "string" && s.aciklama, `${tag}: aciklama eksik`);
        if (s.zorluk !== undefined) assert.ok(ZORLUKLAR.has(s.zorluk as string), `${tag}: zorluk "${String(s.zorluk)}"`);
      }
      // Ekranın kullandığı normalizasyon hiçbir soruyu elememeli — elerse veri bozuktur.
      assert.equal(normalizeQuizSorular(sorular).length, sorular.length, "normalizeQuizSorular soru eledi");
    });
  } else if (Array.isArray(j.questions)) {
    // ── Quiz dosyası (modül formatı — nefsini-tani) ──
    test(`${f}: questions geçerli`, () => {
      const questions = j.questions as Json[];
      const ids = new Set<string>();
      for (const q of questions) {
        const tag = `question ${String(q.id)}`;
        assert.ok(typeof q.id === "string" && q.id, `${tag}: id eksik`);
        assert.ok(!ids.has(q.id as string), `${tag}: tekrarlanan id`);
        ids.add(q.id as string);
        assert.ok(typeof q.question === "string" && q.question, `${tag}: soru metni eksik`);
        const options = q.options as unknown[];
        assert.ok(Array.isArray(options) && options.length >= 2, `${tag}: en az 2 şık olmalı`);
        assert.equal(new Set(options).size, options.length, `${tag}: tekrarlanan şık`);
        const idx = q.correctOptionIndex;
        assert.ok(typeof idx === "number" && idx >= 0 && idx < options.length, `${tag}: correctOptionIndex geçersiz: ${String(idx)}`);
        assert.ok(typeof q.explanation === "string" && q.explanation, `${tag}: explanation eksik`);
      }
    });
  } else if (Array.isArray(j.lessons)) {
    // ── Ders modülü (nefsini-tani) ──
    test(`${f}: lessons geçerli`, () => {
      const lessons = j.lessons as Json[];
      assert.ok(lessons.length > 0, "en az 1 lesson olmalı");
      const ids = new Set<string>();
      for (const l of lessons) {
        const tag = `lesson ${String(l.id)}`;
        assert.ok(typeof l.id === "string" && l.id, `${tag}: id eksik`);
        assert.ok(!ids.has(l.id as string), `${tag}: tekrarlanan id`);
        ids.add(l.id as string);
        assert.ok(typeof l.title === "string" && l.title, `${tag}: title eksik`);
        assert.ok(typeof l.estimatedMinutes === "number" && l.estimatedMinutes > 0, `${tag}: estimatedMinutes eksik (registry süreyi bundan türetir)`);
      }
    });
  } else {
    test(`${f}: tanınan bir şemaya uymalı`, () => {
      assert.fail(`${f}: kartlar/sorular/questions/lessons alanlarından biri yok`);
    });
  }
}
