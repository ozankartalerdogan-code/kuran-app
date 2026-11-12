// İngilizce karşılığı (gloss_en) olan kelimelerin Türkçe anlamını BAĞLAMA göre denetler.
// Sorun: meaning_tr çoğu yerde sözlük/lemma anlamı ("ٱهۡدِنَا" → "hidayet etti"), oysa
// gloss_en o kelime biçiminin bağlamsal karşılığı ("Guide us"). Codex her (Arapça, Türkçe,
// İngilizce) üçlüsünü örnek ayetle karşılaştırır; zaman/kişi/anlam hatalıysa düzeltir.
// Yalnız öneri üretir; veritabanına yazmaz (uygulama: scripts/apply-word-corrections.mjs --ctx).
//   node scripts/review-word-meanings-ctx.mjs          # kaldığı yerden devam eder
// Çıktı: content/words/review-words-ctx.json  [{ar, tr, en, pos, verses, verdict, tr_fixed?, reason?}]
import { DatabaseSync } from "node:sqlite";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = process.env.OUT_FILE || path.join(ROOT, "content", "words", "review-words-ctx.json");
const db = new DatabaseSync(path.join(ROOT, "data", "app.db"), { readOnly: true });

// Bozuk "i̇" (i + U+0307, toLocaleLowerCase artığı) ayrıca mekanik düzeltilir; Codex'e temiz göster.
const clean = (s) => (s ?? "").replace(/i̇/g, "i").trim();

const rows = db.prepare(`SELECT verse_key, word_index, arabic, meaning_tr, gloss_en, pos FROM words
  WHERE gloss_en IS NOT NULL AND trim(gloss_en) <> '' ORDER BY id`).all();
const map = new Map();
for (const r of rows) {
  const k = `${r.arabic}\u0000${r.meaning_tr ?? ""}\u0000${r.gloss_en}`;
  if (!map.has(k)) map.set(k, { ar: r.arabic, tr: r.meaning_tr ?? "", en: r.gloss_en.trim(), pos: r.pos, verses: [] });
  const e = map.get(k);
  if (e.verses.length < 2 && !e.verses.includes(r.verse_key)) e.verses.push(r.verse_key);
}
const items = [...map.values()];

// Örnek ayetin Türkçe meali (Codex'e bağlam).
const mealStmt = db.prepare("SELECT primary_translation t FROM verses WHERE verse_key = ?");
const meal = (vk) => mealStmt.get(vk)?.t?.slice(0, 300) || undefined;

const PROMPT = `You are an expert in Quranic Arabic and Turkish. Each item is one Quranic Arabic word form as it appears in a verse, with:
 "ar" Arabic word, "pos" part of speech, "en" its CORRECT contextual English gloss, "tr" the current Turkish word meaning shown to users, "v" a sample verse key, optionally "meal" a Turkish translation of that verse.
The Turkish meaning must express the SAME thing as the English gloss for THIS form: same tense (past/present/imperative), same person and number (we/he/they/you), same voice (passive), and include attached particles/pronouns the English includes ("and", "so", "them", "his"...). Many current Turkish values are bare dictionary meanings (e.g. "hidayet etti" for ٱهۡدِنَا "Guide us", "İman etti" for يُؤۡمِنُونَ "believe", "geldi, getirdi" for ءَاتَيۡنَٰهُ "We gave him", "güzel" for ٱلۡمُحۡسِنِينَ "the good-doers") — these are errors.
Rules:
- verdict "ok" if the Turkish already conveys the English gloss for this form (synonyms, word order, brevity, minor style differences and an extra acceptable alternative are OK).
- verdict "fix" otherwise, with "tr_fixed": a short natural Turkish word-by-word meaning (typically 1-4 words, lowercase except proper names like Allah, Musa; no explanations, no parentheses unless the English has them), faithful to the English gloss and the verse.
- Translate ONLY this word form; never add meaning carried by other words of the verse (فَزَادَهُمُ "so has increased them" → "böylece onlara artırdı", not "...hastalığını artırdı").
- Conditional/temporal particles keep their suffix style: إِذَا "when" → "-dığında", وَإِذَا "And when" → "ve -dığında".
- Keep Islamic terms Turkish readers know (Allah, iman, namaz, zekât, ayet, rab).
- "reason": very short Turkish reason (only for fix).
Output ONLY a JSON array with one object per input item, same order: {"i":<index>,"verdict":"ok"} or {"i":<index>,"verdict":"fix","tr_fixed":"...","reason":"..."}. No commentary.`;

function codex(input) {
  return new Promise((resolve, reject) => {
    const p = spawn(process.platform === "win32" ? "codex.cmd" : "codex",
      ["exec", "--sandbox", "read-only", "--skip-git-repo-check", ...(process.env.CODEX_MODEL ? ["-m", process.env.CODEX_MODEL] : []), "-"],
      { windowsHide: true, shell: process.platform === "win32" });
    let out = "", err = "";
    p.stdout.setEncoding("utf8").on("data", (d) => { out += d; });
    p.stderr.setEncoding("utf8").on("data", (d) => { err += d; });
    p.on("error", reject);
    p.on("close", (code) => {
      if (code !== 0) return reject(new Error(`codex exit ${code}: ${err.slice(-400)}`));
      const a = out.indexOf("["), b = out.lastIndexOf("]");
      if (a < 0 || b < a) return reject(new Error("JSON yok"));
      try { resolve(JSON.parse(out.slice(a, b + 1))); } catch (e) { reject(e); }
    });
    p.stdin.end(input, "utf8");
  });
}

// REVIEWER=agy: Codex yerine agy CLI (AGY_MODEL ile model). Girdi -p argümanıyla gider;
// Windows komut satırı ~32K karakterle sınırlı olduğundan CHUNK=50 kullanın.
function agy(input) {
  return new Promise((resolve, reject) => {
    const args = ["--disable-slash-commands", "--output-format", "text"];
    if (process.env.AGY_MODEL) args.push("--model", process.env.AGY_MODEL);
    args.push("-p", input);
    const p = spawn(process.env.AGY_BIN || (process.platform === "win32" ? "agy.exe" : "agy"), args, { windowsHide: true });
    let out = "", err = "";
    p.stdout.setEncoding("utf8").on("data", (d) => { out += d; });
    p.stderr.setEncoding("utf8").on("data", (d) => { err += d; });
    p.on("error", reject);
    p.on("close", (code) => {
      if (code !== 0) return reject(new Error(`agy exit ${code}: ${err.slice(-400)}`));
      const a = out.indexOf("["), b = out.lastIndexOf("]");
      if (a < 0 || b < a) return reject(new Error(`JSON yok: ${out.slice(0, 200)}`));
      try { resolve(JSON.parse(out.slice(a, b + 1))); } catch (e) { reject(e); }
    });
  });
}
const REVIEWER = process.env.REVIEWER === "agy" ? agy : codex;

// Çıktı: parça sırasına göre düz dizi; tamamlanan parçalar CHUNK büyüklüğünde (son parça hariç)
// art arda saklanır. Paralel parçalar bitince sıraları korunarak yazılır.
const CH = Number(process.env.CHUNK || 100);
const PAR = Number(process.env.PAR || 4);
const LIMIT = Math.min(items.length, Number(process.env.LIMIT || items.length));
const done = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : [];
if (done.length % CH !== 0 && done.length < LIMIT) throw new Error(`Çıktı parça sınırında değil: ${done.length}`);
const results = new Map(); // parça başlangıcı → sonuçlar
let next = done.length, failed = false;
const flush = () => {
  while (results.has(done.length)) { const r = results.get(done.length); results.delete(done.length); done.push(...r); }
  writeFileSync(OUT, JSON.stringify(done, null, 1) + "\n");
};

async function runChunk(s) {
  const part = items.slice(s, s + CH);
  const input = part.map((it, i) => ({ i, ar: it.ar, pos: it.pos, en: it.en, tr: clean(it.tr), v: it.verses[0], meal: meal(it.verses[0]) }));
  for (let t = 1; t <= 3; t++) {
    try {
      const res = await REVIEWER(`${PROMPT}\n\nINPUT:\n${JSON.stringify(input)}`);
      if (res.length !== part.length) throw new Error(`öğe ${res.length} ≠ ${part.length}`);
      res.forEach((x, i) => {
        if (x.i !== i) throw new Error(`sıra bozuk: ${x.i} ≠ ${i}`);
        if (x.verdict === "fix" && !String(x.tr_fixed ?? "").trim()) throw new Error(`boş tr_fixed: ${i}`);
      });
      const by = REVIEWER === agy ? `agy${process.env.AGY_MODEL ? `:${process.env.AGY_MODEL}` : ""}` : "codex";
      return part.map((it, i) => res[i].verdict === "fix"
        ? { ...it, verdict: "fix", tr_fixed: String(res[i].tr_fixed).trim(), reason: res[i].reason, by }
        : { ...it, verdict: "ok", by });
    } catch (e) { console.warn(`  parça @${s} deneme ${t}: ${e.message}`); }
  }
  throw new Error(`parça @${s} başarısız`);
}

async function worker() {
  while (!failed && next < LIMIT) {
    const s = next; next += CH;
    try { results.set(s, await runChunk(s)); flush(); }
    catch (e) { failed = true; console.error(e.message); }
    console.log(`  ${done.length}/${items.length}, düzeltme: ${done.filter((d) => d.verdict === "fix").length}`);
  }
}

console.log(`toplam üçlü: ${items.length}, tamamlanan: ${done.length}, paralel: ${PAR}`);
await Promise.all(Array.from({ length: PAR }, worker));
flush();
if (failed) { console.error("Bir parça başarısız; tekrar çalıştırın (kaldığı yerden devam eder)."); process.exit(1); }
console.log(`✓ ${OUT}: ${done.filter((d) => d.verdict === "fix").length} düzeltme önerisi`);
