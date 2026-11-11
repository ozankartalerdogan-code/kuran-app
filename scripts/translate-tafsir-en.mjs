// Sadeleştirilmiş Elmalılı tefsirini (content/tafsir/simplified-surah.json)
// İngilizceye çevirir. Çeviri modeli agy CLI'dır ve yalnız metin-al/metin-ver
// (print mode) çalışır; dosya sistemi araçları kullanılmaz.
//
//   node scripts/translate-tafsir-en.mjs                 # tüm sureler (kaldığı yerden)
//   node scripts/translate-tafsir-en.mjs 112 113 114     # yalnız belirtilen sureler
//   AGY_MODEL=<model> node scripts/translate-tafsir-en.mjs
//
// Çıktı: content/tafsir/simplified-surah.en.json (her sure bitince yazılır).
// Doğrulama: paragraf sayısı birebir aynı, boş paragraf yok, Türkçe karakter
// oranı düşük; aksi halde parça yeniden denenir.
import { readFileSync, writeFileSync, existsSync, renameSync } from "node:fs";
import { spawnSync } from "node:child_process";

const SRC = "content/tafsir/simplified-surah.json";
const OUT = "content/tafsir/simplified-surah.en.json";
// Windows komut satırı sınırı ~32K karakter: prompt + JSON-kaçışlı metin altında kalsın.
const CHUNK_CHARS = 7000;
const MAX_TRIES = 3;
const MODEL = process.env.AGY_MODEL || "";
const AGY_BIN = process.env.AGY_BIN || (process.platform === "win32" ? "agy.exe" : "agy");

const PROMPT = `You are translating a Turkish Quran commentary (a simplified modern-Turkish rendering of Elmalılı Hamdi Yazır's tafsir "Hak Dini Kur'an Dili") into clear, natural English for general readers.

Rules:
- Translate faithfully. Do not add, omit, summarize, soften or interpret. Keep the author's meaning and tone.
- Keep Arabic script exactly as is. Keep quoted Quranic phrases in their transliteration and add nothing.
- Use standard English Islamic terminology: Allah, the Prophet (peace be upon him) only where the source has an honorific, surah, ayah/verse, hadith, Sunnah, scholars, Companions, Kufan/Basran scholars, etc. Transliterate technical terms on first use where helpful, e.g. "disjointed letters (huruf al-muqatta'at)".
- Names: Musa -> Moses (Musa) on first mention only if natural; otherwise keep consistent common English forms (Abraham, Moses, Jesus, Mary, Noah, Joseph...).
- Input is a JSON array of paragraphs. Output ONLY a JSON array of strings with EXACTLY the same number of elements, same order, one English paragraph per input paragraph. No commentary, no code fences.`;

function callAgy(paragraphs) {
  const input = `${PROMPT}\n\nINPUT (${paragraphs.length} paragraphs):\n${JSON.stringify(paragraphs)}`;
  const args = ["--disable-slash-commands", "--output-format", "text"];
  if (MODEL) args.push("--model", MODEL);
  args.push("-p", input);
  // shell yok: argümanlar kaçışsız birleştirilmesin; agy.exe doğrudan çağrılır.
  const r = spawnSync(AGY_BIN, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  if (r.status !== 0) throw new Error(`agy exit ${r.status}: ${(r.stderr || "").slice(0, 500)}`);
  const out = r.stdout.trim();
  const start = out.indexOf("["), end = out.lastIndexOf("]");
  if (start < 0 || end < start) throw new Error(`JSON dizi yok: ${out.slice(0, 300)}`);
  return JSON.parse(out.slice(start, end + 1));
}

const TR_CHARS = /[çğışöüÇĞİŞÖÜ]/;
function validate(src, dst) {
  if (!Array.isArray(dst) || dst.length !== src.length) throw new Error(`paragraf sayısı ${dst?.length} ≠ ${src.length}`);
  dst.forEach((p, i) => {
    if (typeof p !== "string" || !p.trim()) throw new Error(`boş paragraf #${i}`);
    // Kelime bazlı: özel isimler/terimler (Elmalılı, İhlâs…) tek tük Türkçe harf
    // taşıyabilir; kelimelerin %15'inden fazlası Türkçe harfliyse çevrilmemiştir.
    const words = p.split(/\s+/).filter(Boolean);
    const trWords = words.filter((w) => TR_CHARS.test(w)).length;
    if (words.length >= 8 && trWords / words.length > 0.15) throw new Error(`#${i} Türkçe kalmış görünüyor`);
    const ratio = p.length / src[i].length;
    if (ratio < 0.5 || ratio > 2.2) throw new Error(`#${i} uzunluk oranı şüpheli (${ratio.toFixed(2)})`);
  });
}

function chunks(paragraphs) {
  const out = [];
  let cur = [], n = 0;
  for (const p of paragraphs) {
    if (cur.length && n + p.length > CHUNK_CHARS) { out.push(cur); cur = []; n = 0; }
    cur.push(p); n += p.length;
  }
  if (cur.length) out.push(cur);
  return out;
}

function translateChunk(chunk, label) {
  let lastErr;
  for (let t = 1; t <= MAX_TRIES; t++) {
    try {
      const res = callAgy(chunk);
      validate(chunk, res);
      return res.map((s) => s.trim());
    } catch (e) {
      lastErr = e;
      console.warn(`  ${label} deneme ${t}/${MAX_TRIES}: ${e.message}`);
    }
  }
  throw lastErr;
}

const source = JSON.parse(readFileSync(SRC, "utf8"));
const done = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : [];
const doneIds = new Set(done.map((e) => e.surahId));
const only = process.argv.slice(2).map(Number).filter(Boolean);

const todo = source.filter((e) => e.status === "available" && !doneIds.has(e.surahId) && (!only.length || only.includes(e.surahId)));
console.log(`${todo.length} sure çevrilecek${MODEL ? ` (model: ${MODEL})` : ""}.`);

for (const entry of todo) {
  const t0 = Date.now();
  const parts = chunks(entry.paragraphs.map((p) => p.trim()));
  const translated = [];
  try {
    parts.forEach((c, i) => translated.push(...translateChunk(c, `sure ${entry.surahId} parça ${i + 1}/${parts.length}`)));
  } catch (e) {
    console.error(`✗ sure ${entry.surahId} atlandı: ${e.message}`);
    continue;
  }
  done.push({
    surahId: entry.surahId,
    source: "elmalili-simplified-en",
    sourceTr: entry.source,
    status: "available",
    generatedAt: new Date().toISOString(),
    model: `agy${MODEL ? `:${MODEL}` : ""}`,
    paragraphs: translated,
  });
  done.sort((a, b) => a.surahId - b.surahId);
  // Atomik yazım: önce geçici dosya, sonra yerine taşı (okuyucuyla çakışmasın).
  writeFileSync(`${OUT}.tmp`, JSON.stringify(done, null, 2) + "\n");
  for (let t = 0; ; t++) {
    try { renameSync(`${OUT}.tmp`, OUT); break; } catch (e) { if (t >= 20) throw e; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500); }
  }
  console.log(`✓ sure ${entry.surahId}: ${translated.length} paragraf, ${((Date.now() - t0) / 1000).toFixed(0)} sn`);
}

const missing = source.filter((e) => e.status === "available" && !done.some((d) => d.surahId === e.surahId)).map((e) => e.surahId);
console.log(missing.length ? `Eksik sureler: ${missing.join(", ")} — script'i tekrar çalıştırın.` : "Tüm sureler tamam.");
