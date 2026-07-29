#!/usr/bin/env node
/**
 * gate-fark-analizi.mjs — fark_analizi metinleri için deterministik kalite kapısı.
 *
 * API çağrısı YOK, para harcamaz. Üretilen her metni dört kontrolden geçirir:
 *
 *   K1 MEAL_ALINTISI  — "mealde '...'" biçiminde meale atfedilen alıntı, o ayetin
 *                       Elmalılı metninde birebir geçmeli. Eski metinlerin %93,6'sı
 *                       burada kalıyor; çünkü Diyanet mealinden alıntı yapıyorlar.
 *   K2 UYDURMA_ARAPCA — metinde geçen Arapça kelime, ayetin Arapça metninde olmalı
 *                       (prompt kuralı 1).
 *   K3 SURE_ATFI      — sure adı / "9:5" / "5. ayet" gibi atıf olmamalı (prompt kuralı 3).
 *   K4 BICIM          — gerçek analizde footer bulunmalı, metin boş/aşırı kısa olmamalı.
 *
 * Kullanım:
 *   node scripts/gate-fark-analizi.mjs                 # DB'deki mevcut metinleri denetler
 *   node scripts/gate-fark-analizi.mjs --json=out.json # başarısız verse_key listesi yazar
 *                                                      # (regenerate --keys= ile kullanılır)
 *   node scripts/gate-fark-analizi.mjs --limit=100 --verbose
 */

import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(dir, "../data/app.db");

export const FOOTER = "ℹ️ AI tarafından üretilmiştir. Kesin bilgi için güvenilir tefsirlere başvurunuz.";
export const AYNI_TEXT = "Meal ile literal çeviri arasında anlam farkı yoktur, sadece üslup farkı vardır.";

/** Türkçe metni karşılaştırma için sadeleştirir. */
export function normTr(s) {
  return (s ?? "")
    .toLocaleLowerCase("tr")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Arapça metinden hareke, tatvil ve yazım varyantlarını düşürür. */
export function normAr(s) {
  return (s ?? "")
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭ]/g, "")
    .replace(/ـ/g, "")
    .replace(/[آأإٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Ünsüz iskeleti. Mushaf (Uthmani) imlâsı ile standart imlâ arasındaki sistematik
 * farkı aşmak için gerekli: mushafta hançer elif (U+0670) ve küçük ye (U+06E6)
 * kullanılan yerde standart imlâ tam harf (elif / ye) yazar. Harekeler atılınca
 * mushaf biçimi "خلدون", standart biçim "خالدون" olur ve eşleşme kaçar.
 * Zayıf harfler iki taraftan da düşürülerek karşılaştırılır.
 * Bedeli: iskelet daha az ayırt edicidir; bu yüzden 3 harften kısa iskeletler
 * denetim dışı bırakılır.
 */
export function arSkeleton(s) {
  return normAr(s).replace(/[اوي]/g, "");
}

const QUOTE_CHARS = "'‘’\"“”";
/** "meal..." kelimesinden sonra gelen ilk tırnaklı ifadeyi yakalar. */
const MEAL_QUOTE_RE = new RegExp(
  `me[aâ]l\\w*[^${QUOTE_CHARS}.]{0,40}[${QUOTE_CHARS}]([^${QUOTE_CHARS}]{6,80})[${QUOTE_CHARS}]`,
  "gi"
);
const LATIN_PHRASE_RE = /^[A-Za-zÇĞİÖŞÜçğıöşü ,'’-]+$/;
const ARABIC_WORD_RE = /[ء-ي][ء-ٰٟۖ-ۭ]*/g;
const SURAH_REF_RE = /\b(s[uû]res[iy]|s[uû]resinde|\d+\s*:\s*\d+|\d+\.\s*ayet)/i;

/**
 * "meal" ile tırnak arasında bu kelimeler geçiyorsa alıntı mealin ifadesine değil,
 * ayete / Arapçaya / literale atfediliyor demektir. Örn: "Meal, ayette geçen
 * 'la ted'u' fiilini..." — bu bir transkripsiyon, meal alıntısı değil.
 */
const REDIRECT_RE = /(ayet|arap[çc]a|k[öo]k|literal|lafz|orijinal|as[ıi]l|transkripsiyon)/i;

/** K1: meale atfedilen alıntılar Elmalılı metninde geçiyor mu? */
export function checkMealQuote(analiz, mealText) {
  const meal = normTr(mealText);
  const bad = [];
  for (const m of (analiz ?? "").matchAll(MEAL_QUOTE_RE)) {
    const q = m[1].trim();
    if (!LATIN_PHRASE_RE.test(q)) continue;      // Arapça alıntı K2'nin işi
    if (q.split(/\s+/).length < 2) continue;      // tek kelime çok gürültülü
    // m[0] tüm eşleşme; tırnaktan önceki kısımda atıf yönü değişmiş mi?
    const gap = m[0].slice(0, m[0].indexOf(q) - 1);
    if (REDIRECT_RE.test(gap)) continue;
    if (!quoteInMeal(q, meal)) bad.push(q);
  }
  return bad;
}

/**
 * Alıntı mealde geçiyor mu? Birebir eşleşme yetmiyor: model kelimeyi sözlük
 * biçiminde aktarabiliyor ("saygı duymak" ← meal "saygı duyacaklar"). Bu bir
 * yanlış meal alıntısı değil, çekim farkı. Bu yüzden her kelimenin ilk 3 harfi
 * mealde bir kelime başında aranır. Kaldırılmış mealden yapılan gerçek alıntılar
 * yine yakalanır: "bizi doğru yola eriştir" → "eri" Elmalılı metninde yok.
 */
function quoteInMeal(q, mealNorm) {
  const n = normTr(q);
  if (!n) return true;
  if (mealNorm.includes(n)) return true;
  const mealWords = mealNorm.split(" ");
  return n.split(" ").every((w) => {
    const stem = w.slice(0, 3);
    return stem.length < 3 ? mealWords.includes(w) : mealWords.some((mw) => mw.startsWith(stem));
  });
}

/**
 * K5: model "farklı" deyip metninde farkın anlamsal olmadığını itiraf etmiş mi?
 * Prompt'un 4. ve 5. kuralı üslup/arkaizm farkını "aynı" saymayı emrediyor;
 * bu kalıp o kuralın ihlalidir ve gösterilen metni kendi içinde çelişkili yapar.
 */
const SELF_CONTRADICT_RE =
  /(anlam(ı|da)? (farkı )?değil|anlam farkı (yok|bulunma)|sadece (gramer|üslup|vurgu|biçim)|anlamı (aynı|değişmemekte)|anlamda bir fark (yok|bulunma))/i;

export function checkSelfContradiction(analiz, ayni) {
  if (ayni) return null;
  const m = (analiz ?? "").match(SELF_CONTRADICT_RE);
  return m ? m[0] : null;
}

/**
 * K2: metinde geçen Arapça kelimeler ayetin Arapça metninde var mı?
 * Kökler de meşru sayılır — prompt kök listesini modele veriyor, dolayısıyla
 * "فجر kökünden gelir" demesi uydurma değildir.
 */
export function checkFabricatedArabic(analiz, arabicText, roots = []) {
  const ayet = arSkeleton(arabicText);
  const rootSet = new Set(roots.map((r) => arSkeleton(r).replace(/\s/g, "")).filter(Boolean));
  const bad = [];
  for (const w of (analiz ?? "").match(ARABIC_WORD_RE) ?? []) {
    const n = arSkeleton(w).replace(/\s/g, "");
    if (n.length < 3) continue;                   // iskelet çok kısaysa ayırt edici değil
    if (ayet.replace(/\s/g, "").includes(n)) continue;
    if (rootSet.has(n)) continue;
    if ([...rootSet].some((r) => r.includes(n) || n.includes(r))) continue;
    bad.push(w);
  }
  return [...new Set(bad)];
}

/** K3: sure adı veya ayet numarası atfı var mı? */
export function checkSurahRef(analiz) {
  const m = (analiz ?? "").match(SURAH_REF_RE);
  return m ? m[0] : null;
}

/** K4: biçim — footer ve uzunluk. */
export function checkShape(text) {
  const t = (text ?? "").trim();
  if (!t) return "boş";
  if (t === AYNI_TEXT) return null;               // kalıp metin: footer beklenmez
  if (!t.includes(FOOTER)) return "footer yok";
  const body = t.replace(FOOTER, "").trim();
  if (body.length < 60) return `gövde çok kısa (${body.length})`;
  return null;
}

/** Tek ayeti denetler; sorun yoksa boş dizi döner. */
export function gateVerse({ text, mealText, arabicText, roots = [] }) {
  const issues = [];
  const t = (text ?? "").trim();
  const shape = checkShape(t);
  if (shape) issues.push({ code: "K4_BICIM", detail: shape });
  if (t === AYNI_TEXT || !t) return issues;

  const body = t.replace(FOOTER, "").trim();
  const quotes = checkMealQuote(body, mealText);
  if (quotes.length) issues.push({ code: "K1_MEAL_ALINTISI", detail: quotes.join(" | ") });
  const arabic = checkFabricatedArabic(body, arabicText, roots);
  if (arabic.length) issues.push({ code: "K2_UYDURMA_ARAPCA", detail: arabic.join(" ") });
  const ref = checkSurahRef(body);
  if (ref) issues.push({ code: "K3_SURE_ATFI", detail: ref });
  const contra = checkSelfContradiction(body, false);
  if (contra) issues.push({ code: "K5_KENDIYLE_CELISKI", detail: contra });
  return issues;
}

function main() {
  const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=").slice(1).join("=");
  const LIMIT = arg("limit") ? Number(arg("limit")) : undefined;
  const JSON_OUT = arg("json");
  const VERBOSE = process.argv.includes("--verbose");

  const RESULTS = arg("results");

  const db = new DatabaseSync(DB_PATH, { readOnly: true });
  let rows = db.prepare(`
    SELECT v.verse_key, v.fark_analizi AS text, v.arabic_text AS arabicText, t.text AS mealText
    FROM   verses v
    LEFT   JOIN translations t ON t.verse_key = v.verse_key AND t.source = 'yazir'
    ORDER  BY v.surah_id, v.ayah_number
  `).all();

  // --results= verilirse DB'deki metin yerine üretim çıktısı denetlenir (pilot için).
  if (RESULTS) {
    const produced = new Map(
      JSON.parse(fs.readFileSync(path.resolve(RESULTS), "utf-8")).map((r) => [
        r.verse_key,
        r.ayni || !r.analiz ? AYNI_TEXT : `${r.analiz}\n\n${FOOTER}`,
      ])
    );
    rows = rows.filter((r) => produced.has(r.verse_key)).map((r) => ({ ...r, text: produced.get(r.verse_key) }));
    console.log(`Kaynak: ${path.basename(RESULTS)} (${rows.length} ayet)`);
  }
  if (LIMIT) rows = rows.slice(0, LIMIT);

  const rootSel = db.prepare("SELECT DISTINCT root FROM words WHERE verse_key = ? AND root IS NOT NULL");

  const counts = {};
  const failed = [];
  let ayni = 0;
  for (const r of rows) {
    if ((r.text ?? "").trim() === AYNI_TEXT) ayni++;
    const roots = rootSel.all(r.verse_key).map((x) => x.root);
    const issues = gateVerse({ ...r, roots });
    if (!issues.length) continue;
    failed.push(r.verse_key);
    for (const i of issues) counts[i.code] = (counts[i.code] ?? 0) + 1;
    if (VERBOSE) console.log(`${r.verse_key}  ${issues.map((i) => `${i.code}: ${i.detail}`).join("  |  ")}`);
  }
  db.close();

  const pass = rows.length - failed.length;
  console.log(`\nDenetlenen: ${rows.length} | geçen: ${pass} (%${((100 * pass) / rows.length).toFixed(1)}) | kalan: ${failed.length}`);
  console.log(`Kalıp (AYNI) metin: ${ayni}`);
  for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(18)} ${v}`);

  if (JSON_OUT) {
    fs.writeFileSync(path.resolve(JSON_OUT), JSON.stringify(failed, null, 2), "utf-8");
    console.log(`\nBaşarısız verse_key listesi: ${JSON_OUT}`);
  }
  process.exitCode = failed.length ? 1 : 0;
}

// Windows'ta da doğru çalışması için karşılaştırma pathToFileURL üzerinden yapılır.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
