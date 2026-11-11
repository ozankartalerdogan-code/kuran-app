// Ders/quiz JSON dosyalarındaki Türkçe metinleri İngilizceye çevirir; yapı,
// kimlikler, doğru cevap harfleri ve enum alanları aynen korunur. Çeviri agy CLI
// ile yalnız metin-al/metin-ver (print mode) yapılır.
//
//   node scripts/translate-json-en.mjs apps/mobile/src/data/Dersler/*.json
//   AGY_MODEL="Gemini 3.8 Flash (Medium)" node scripts/translate-json-en.mjs <dosyalar>
//   TRANSLATOR=codex [CODEX_MODEL=gpt-6.1-terra] node scripts/translate-json-en.mjs <dosyalar>   # codex exec, salt-okunur sandbox
//
// Çıktı: her dosyanın yanına <ad>.en.json. Var olan çıktı atlanır (devam eder).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const MODEL = process.env.AGY_MODEL || "";
const TRANSLATOR = process.env.TRANSLATOR || "agy";
const AGY_BIN = process.env.AGY_BIN || (process.platform === "win32" ? "agy.exe" : "agy");
const CHUNK_CHARS = 6000;
const MAX_TRIES = 3;

// Çevrilmeyen alanlar: kimlik, enum, kod, URL, hadis koleksiyon kodları.
const SKIP_KEYS = new Set([
  "id", "ders_id", "quiz_id", "quiz_havuzu_id", "konu", "dogru_cevap", "zorluk", "tip",
  "lessonId", "difficulty", "sourceId", "type", "url", "classification", "gorsel",
  "schemaVersion", "moduleId", "language", "suggestedCardFields", "slugField", "status",
  "level", "recommendedDisplayOrder", "sourceJoinKey", "quizId", "questionType",
  "collection", "reference", "grade", "ayahRange", "ikon",
  // Kodda anahtar/eşleme olarak kullanılanlar (rozet, renk, gruplama, filtre):
  "durum", "dayanak", "renk", "kod", "group", "tags", "etiketler", "ilgili_dosyalar",
  "ilgili_dersler", "topic_id", "period_id", "kissasi_detayli_peygamberler",
  "kissasi_kisa_peygamberler", "quran_refs", "kuran_referanslari", "kuran_referanslari_ozet",
  "sunnah_url", "icon", "version", "versiyon", "olusturulma", "dil",
  // Arapça ve okunuş (transliterasyon) — aynen kalır:
  "arapca", "okunus", "okunusu", "dua", "dua_1", "dua_2", "dua_arapca", "dua_1_arapca",
  "dua_2_arapca", "selam", "tesbih", "teravih_arasi_tesbih",
  // Esmaül Hüsna / İsm-i Azam: sıra, isim okunuşu, Arapça kök, transkripsiyon, puan, kategori anahtarı.
  "sira", "isim", "kok", "transkripsiyon", "guvenilirlik", "kategori",
]);
// Okunuş + anlam karışık alanlar: okunuş Türkçe harf taşıdığından "Türkçe kalmış"
// kontrolü bu alanlarda uygulanmaz (anlam kısmı yine çevrilir).
const MIXED_TRANSLIT_KEYS = new Set(["secde_duasi", "tovbe_duasi", "hacet_duasi"]);

const PROMPT = `You are translating Islamic educational content (lessons and quiz questions from a Turkish learning app) into clear, natural English.

Rules:
- Translate faithfully; do not add, omit or change facts, rulings, numbers or references.
- Keep Arabic script exactly as is. Keep Turkish-style transliterations of Arabic phrases (e.g. «et-Tahûru şatrul îmân») unchanged, and translate only the Turkish explanation around them.
- Use standard English Islamic terms: wudu (ablution), ghusl, tayammum, salah (prayer), sawm (fasting), zakat, Hajj, Umrah, Qurbani (sacrifice), tajweed, iman, the Prophet ﷺ only if the source has an honorific, Companions, Sunnah, hadith. Hadith sources: Bukhari, Muslim, Tirmidhi, Abu Dawud, Nasa'i, Ibn Majah. Surah names in common English transliteration (al-Baqarah, ash-Shams).
- Quiz options start with a letter prefix like "A) ". Keep the exact same prefix letter and format.
- Input is a JSON array of strings. Output ONLY a JSON array of strings with EXACTLY the same number of elements, in the same order. No commentary, no code fences.${process.env.PROMPT_EXTRA ? `\n\nAdditional instructions for this file:\n${process.env.PROMPT_EXTRA}` : ""}`;

function callCodex(input) {
  // Salt-okunur sandbox: codex yalnız metin üretir, dosya yazamaz/komut değiştiremez.
  const r = spawnSync(process.platform === "win32" ? "codex.cmd" : "codex",
    ["exec", "--sandbox", "read-only", "--skip-git-repo-check", ...(process.env.CODEX_MODEL ? ["-m", process.env.CODEX_MODEL] : []), "-"],
    { input, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, windowsHide: true, shell: process.platform === "win32" });
  if (r.status !== 0) throw new Error(`codex exit ${r.status}: ${(r.stderr || "").slice(-500)}`);
  return r.stdout;
}

function callAgy(strings) {
  if (TRANSLATOR === "codex") {
    const out = callCodex(`${PROMPT}

INPUT (${strings.length} strings):
${JSON.stringify(strings)}`).trim();
    const s = out.indexOf("["), e = out.lastIndexOf("]");
    if (s < 0 || e < s) throw new Error(`JSON dizi yok: ${out.slice(0, 300)}`);
    return JSON.parse(out.slice(s, e + 1));
  }
  const args = ["--disable-slash-commands", "--output-format", "text"];
  if (MODEL) args.push("--model", MODEL);
  args.push("-p", `${PROMPT}\n\nINPUT (${strings.length} strings):\n${JSON.stringify(strings)}`);
  const r = spawnSync(AGY_BIN, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  if (r.status !== 0) throw new Error(`agy exit ${r.status}: ${(r.stderr || "").slice(0, 500)}`);
  const out = r.stdout.trim();
  const s = out.indexOf("["), e = out.lastIndexOf("]");
  if (s < 0 || e < s) throw new Error(`JSON dizi yok: ${out.slice(0, 300)}`);
  return JSON.parse(out.slice(s, e + 1));
}

const TR = /[çğışöüÇĞİŞÖÜ]/;
const PREFIX = /^([A-E])\)\s/;
function validate(src, dst, loose = []) {
  if (!Array.isArray(dst) || dst.length !== src.length) throw new Error(`öğe sayısı ${dst?.length} ≠ ${src.length}`);
  dst.forEach((d, i) => {
    if (typeof d !== "string" || !d.trim()) throw new Error(`boş öğe #${i}`);
    const pre = PREFIX.exec(src[i]);
    if (pre && !d.startsWith(`${pre[1]}) `)) throw new Error(`#${i} şık harfi bozuldu: ${d.slice(0, 20)}`);
    const words = d.split(/\s+/).filter(Boolean);
    if (!loose[i] && words.length >= 8 && words.filter((w) => TR.test(w)).length / words.length > 0.25) {
      throw new Error(`#${i} Türkçe kalmış görünüyor`);
    }
    if (src[i].length > 40) {
      const ratio = d.length / src[i].length;
      if (ratio < 0.4 || ratio > 2.5) throw new Error(`#${i} uzunluk oranı şüpheli (${ratio.toFixed(2)})`);
    }
  });
}

function collect(node, key, refs) {
  if (Array.isArray(node)) {
    node.forEach((v, i) => {
      if (typeof v === "string") { if (!SKIP_KEYS.has(key)) refs.push({ obj: node, k: i }); }
      else collect(v, key, refs);
    });
  } else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === "string") { if (!SKIP_KEYS.has(k) && /[A-Za-zçğışöüÇĞİŞÖÜ]/.test(v)) refs.push({ obj: node, k }); }
      else collect(v, k, refs);
    }
  }
}

function batches(refs) {
  const out = []; let cur = [], n = 0;
  for (const r of refs) {
    const len = r.obj[r.k].length;
    if (cur.length && n + len > CHUNK_CHARS) { out.push(cur); cur = []; n = 0; }
    cur.push(r); n += len;
  }
  if (cur.length) out.push(cur);
  return out;
}

const files = process.argv.slice(2).filter((f) => f.endsWith(".json") && !f.endsWith(".en.json"));
if (!files.length) { console.error("Dosya verin."); process.exit(1); }
let failed = 0;

for (const file of files) {
  const outFile = file.replace(/\.json$/, ".en.json");
  if (existsSync(outFile)) { console.log(`- ${file}: zaten var, atlandı`); continue; }
  const data = JSON.parse(readFileSync(file, "utf8"));
  const refs = [];
  collect(data, "", refs);
  const parts = batches(refs);
  const t0 = Date.now();
  try {
    parts.forEach((batch, bi) => {
      const src = batch.map((r) => r.obj[r.k]);
      let lastErr;
      for (let t = 1; t <= MAX_TRIES; t++) {
        try {
          const res = callAgy(src);
          validate(src, res, batch.map((r) => MIXED_TRANSLIT_KEYS.has(r.k)));
          batch.forEach((r, i) => { r.obj[r.k] = res[i].trim(); });
          return;
        } catch (e) {
          lastErr = e;
          console.warn(`  ${file} parça ${bi + 1}/${parts.length} deneme ${t}/${MAX_TRIES}: ${e.message}`);
        }
      }
      throw lastErr;
    });
  } catch (e) {
    failed++;
    console.error(`✗ ${file}: ${e.message}`);
    continue;
  }
  if (data && typeof data === "object" && "language" in data) data.language = "en";
  writeFileSync(outFile, JSON.stringify(data, null, 2) + "\n");
  console.log(`✓ ${file}: ${refs.length} metin, ${((Date.now() - t0) / 1000).toFixed(0)} sn`);
}
console.log(failed ? `${failed} dosya başarısız — script'i tekrar çalıştırın.` : "Tamam.");
