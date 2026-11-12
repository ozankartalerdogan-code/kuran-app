// Ayet detayındaki Türkçe "literal çeviri"yi (verses.literal_ceviri) İngilizceye
// çevirir. Kaynak yerel data/app.db'den SALT-OKUNUR okunur; canlı sunucuya dokunmaz.
// Çeviri: agy CLI (print mode), sure sure; kaldığı yerden devam eder.
//
//   AGY_MODEL="Gemini 3.8 Flash (Medium)" node scripts/translate-literal-en.mjs          # tüm sureler
//   AGY_MODEL=... node scripts/translate-literal-en.mjs 112 113 114                      # yalnız bunlar
//
// Çıktı: apps/mobile/src/data/literalEn/NNN.json — { "<ayet>": "<İngilizce>" }.
// Henüz çevrilmemiş sureler için "{}" yer tutucu yazılır (Metro her require yolunun
// var olmasını ister); dolu dosya "bitti" sayılır ve atlanır.
// Ayrıca Türkçe kaynak content/ayah-literal/literal.tr.json olarak saklanır.
import { DatabaseSync } from "node:sqlite";
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "apps", "mobile", "src", "data", "literalEn");
const SRC_FILE = path.join(ROOT, "content", "ayah-literal", "literal.tr.json");
const CHUNK_CHARS = 6000; // Windows komut satırı sınırı (~32K) altında kalsın.
const MAX_TRIES = 3;
const MODEL = process.env.AGY_MODEL || "";
const AGY_BIN = process.env.AGY_BIN || (process.platform === "win32" ? "agy.exe" : "agy");

const PROMPT = `You are translating a Turkish literal (word-faithful) translation of Quran verses into English.

Rules:
- Produce a literal, word-faithful English rendering of the TURKISH text you are given. Do not paraphrase, do not add, omit, explain or interpret. Do not replace it with any published English translation.
- Keep parenthetical additions and explanations from the source, translated: "Hayy'dır (diridir)" -> "He is al-Hayy (the Ever-Living)".
- Divine names and Arabic terms that the Turkish keeps transliterated: use common English transliteration (al-Hayy, al-Qayyum, Kursi, al-Aliyy, al-Azim, Rabb, salah, zakat). Use "Allah". Prophets: Moses, Abraham, Jesus, Noah, Joseph, Mary etc.
- Pronouns referring to Allah may be capitalized as in the source (He, Him, His).
- Keep Arabic script, if any, exactly as is.
- Input is a JSON array of verse texts. Output ONLY a JSON array of strings with EXACTLY the same number of elements in the same order. No commentary, no code fences.`;

// ── Kaynak ──────────────────────────────────────────────────────────────────
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(path.dirname(SRC_FILE), { recursive: true });
const db = new DatabaseSync(path.join(ROOT, "data", "app.db"), { readOnly: true });
const rows = db.prepare(`SELECT verse_key, surah_id, ayah_number, literal_ceviri AS t FROM verses
  WHERE literal_ceviri IS NOT NULL AND trim(literal_ceviri) <> '' ORDER BY surah_id, ayah_number`).all();
const bySurah = new Map();
for (const r of rows) {
  if (!bySurah.has(r.surah_id)) bySurah.set(r.surah_id, []);
  bySurah.get(r.surah_id).push({ verseKey: r.verse_key, text: r.t.trim() });
}
writeFileSync(SRC_FILE, JSON.stringify([...bySurah].map(([surahId, verses]) => ({ surahId, verses })), null, 2) + "\n");

const fileOf = (s) => path.join(OUT_DIR, `${String(s).padStart(3, "0")}.json`);
for (let s = 1; s <= 114; s++) if (!existsSync(fileOf(s))) writeFileSync(fileOf(s), "{}\n");
const isDone = (s) => Object.keys(JSON.parse(readFileSync(fileOf(s), "utf8"))).length > 0;

// ── Çeviri ──────────────────────────────────────────────────────────────────
function callAgy(texts) {
  const args = ["--disable-slash-commands", "--output-format", "text"];
  if (MODEL) args.push("--model", MODEL);
  args.push("-p", `${PROMPT}\n\nINPUT (${texts.length} verses):\n${JSON.stringify(texts)}`);
  const r = spawnSync(AGY_BIN, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  if (r.status !== 0) throw new Error(`agy exit ${r.status}: ${(r.stderr || "").slice(0, 500)}`);
  const out = r.stdout.trim();
  const a = out.indexOf("["), b = out.lastIndexOf("]");
  if (a < 0 || b < a) throw new Error(`JSON dizi yok: ${out.slice(0, 300)}`);
  return JSON.parse(out.slice(a, b + 1));
}

const TR = /[çğışöüÇĞİŞÖÜ]/;
function validate(src, dst) {
  if (!Array.isArray(dst) || dst.length !== src.length) throw new Error(`ayet sayısı ${dst?.length} ≠ ${src.length}`);
  dst.forEach((d, i) => {
    if (typeof d !== "string" || !d.trim()) throw new Error(`boş #${i}`);
    const words = d.split(/\s+/).filter(Boolean);
    if (words.length >= 6 && words.filter((w) => TR.test(w)).length / words.length > 0.15) throw new Error(`#${i} Türkçe kalmış görünüyor`);
    if (src[i].length > 40) {
      const ratio = d.length / src[i].length;
      if (ratio < 0.5 || ratio > 2.2) throw new Error(`#${i} uzunluk oranı şüpheli (${ratio.toFixed(2)})`);
    }
  });
}
function chunks(verses) {
  const out = []; let cur = [], n = 0;
  for (const v of verses) {
    if (cur.length && n + v.text.length > CHUNK_CHARS) { out.push(cur); cur = []; n = 0; }
    cur.push(v); n += v.text.length;
  }
  if (cur.length) out.push(cur);
  return out;
}

const only = process.argv.slice(2).map(Number).filter(Boolean);
const todo = [...bySurah.keys()].filter((s) => !isDone(s) && (!only.length || only.includes(s)));
console.log(`${todo.length} sure çevrilecek${MODEL ? ` (model: ${MODEL})` : ""}.`);

for (const s of todo) {
  const t0 = Date.now();
  const result = {};
  try {
    for (const [ci, part] of chunks(bySurah.get(s)).entries()) {
      const src = part.map((v) => v.text);
      let ok = false, lastErr;
      for (let t = 1; t <= MAX_TRIES && !ok; t++) {
        try {
          const res = callAgy(src);
          validate(src, res);
          part.forEach((v, i) => { result[v.verseKey] = res[i].trim(); });
          ok = true;
        } catch (e) { lastErr = e; console.warn(`  sure ${s} parça ${ci + 1} deneme ${t}/${MAX_TRIES}: ${e.message}`); }
      }
      if (!ok) throw lastErr;
    }
  } catch (e) {
    console.error(`✗ sure ${s} atlandı: ${e.message}`);
    continue;
  }
  // Atomik yazım (Windows dosya kilidine karşı tekrar dener).
  writeFileSync(`${fileOf(s)}.tmp`, JSON.stringify(result) + "\n");
  for (let t = 0; ; t++) {
    try { renameSync(`${fileOf(s)}.tmp`, fileOf(s)); break; } catch (e) { if (t >= 20) throw e; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500); }
  }
  console.log(`✓ sure ${s}: ${Object.keys(result).length} ayet, ${((Date.now() - t0) / 1000).toFixed(0)} sn`);
}
const missing = [...bySurah.keys()].filter((s) => !isDone(s));
console.log(missing.length ? `Eksik sureler (${missing.length}): ${missing.join(", ")} — script'i tekrar çalıştırın.` : "Tüm sureler tamam.");
