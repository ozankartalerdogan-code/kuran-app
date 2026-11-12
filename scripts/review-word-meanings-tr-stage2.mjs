// 2. aşama: review-words.json'daki şüpheli Türkçe anlamları, o anlamı taşıyan HER
// Arapça biçim için (ayetin Arapça metniyle) yeniden yargılatır. Yalnız öneri üretir.
//   node scripts/review-word-meanings-tr-stage2.mjs
// Çıktı: content/words/corrections-words.json
//   [{ar, tr, verses, verdict, dogru, en, reason}]  (verdict "fix" olanlar uygulanır)
import { DatabaseSync } from "node:sqlite";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "content", "words", "corrections-words.json");
const db = new DatabaseSync(path.join(ROOT, "data", "app.db"), { readOnly: true });
const suspects = JSON.parse(readFileSync(path.join(ROOT, "content", "words", "review-words.json"), "utf8"))
  .filter((x) => x.verdict === "fix");

const verseAr = db.prepare("SELECT arabic_text FROM verses WHERE verse_key = ?");
const forms = db.prepare(`SELECT arabic, group_concat(DISTINCT verse_key) v FROM words
  WHERE meaning_tr = ? AND (gloss_en IS NULL OR trim(gloss_en) = '') GROUP BY arabic`);

const items = [];
for (const s of suspects) {
  for (const f of forms.all(s.tr)) {
    const verses = f.v.split(",").slice(0, 3);
    items.push({
      ar: f.arabic, tr: s.tr, verses_all: f.v.split(","),
      context: verses.map((vk) => ({ verse: vk, arabic: verseAr.get(vk)?.arabic_text ?? "" })),
      hint: { tr_fixed: s.tr_fixed, en_fixed: s.en_fixed, reason: s.reason },
    });
  }
}
console.log(`${suspects.length} şüpheli anlam → ${items.length} Arapça biçim`);

const PROMPT = `You are an expert in Quranic Arabic and Turkish. Each item is ONE Arabic word form from the Quran with its current Turkish word-by-word meaning ("tr"), the verses where it occurs (Arabic text), and a first-pass correction hint (which may be wrong or may not apply to this form).
Decide for THIS form in THESE verses: is the Turkish meaning clearly wrong (wrong sense, hallucinated, confused word, wrong person/number, extra words not in the Arabic)? If it is acceptable, answer "ok" (do not fix style or nuance).
If wrong, give a corrected SHORT Turkish word-by-word meaning in the same style as the app (lowercase except proper names, comma-separated alternatives allowed) and a short English gloss.
Output ONLY a JSON array, one object per item, same order: {"i":<index>,"verdict":"ok"} or {"i":<index>,"verdict":"fix","dogru":"<Turkish>","en":"<English>","reason":"<short Turkish reason>"}.`;

function codex(input) {
  const r = spawnSync(process.platform === "win32" ? "codex.cmd" : "codex",
    ["exec", "--sandbox", "read-only", "--skip-git-repo-check", ...(process.env.CODEX_MODEL ? ["-m", process.env.CODEX_MODEL] : []), "-"],
    { input, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, windowsHide: true, shell: process.platform === "win32" });
  if (r.status !== 0) throw new Error(`codex exit ${r.status}: ${(r.stderr || "").slice(-400)}`);
  const out = r.stdout, a = out.indexOf("["), b = out.lastIndexOf("]");
  if (a < 0 || b < a) throw new Error("JSON yok");
  return JSON.parse(out.slice(a, b + 1));
}

const done = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : [];
const CH = 25;
for (let s = done.length; s < items.length; s += CH) {
  const part = items.slice(s, s + CH);
  const input = part.map((it, i) => ({ i, ar: it.ar, tr: it.tr, context: it.context, hint: it.hint }));
  let res, ok = false;
  for (let t = 1; t <= 3 && !ok; t++) {
    try {
      res = codex(`${PROMPT}\n\nINPUT:\n${JSON.stringify(input)}`);
      if (res.length !== part.length) throw new Error(`öğe ${res.length} ≠ ${part.length}`);
      ok = true;
    } catch (e) { console.warn(`  parça ${s / CH + 1} deneme ${t}: ${e.message}`); }
  }
  if (!ok) { console.error("parça başarısız; tekrar çalıştırın"); process.exit(1); }
  part.forEach((it, i) => done.push({
    ar: it.ar, tr: it.tr, verses: it.verses_all, verdict: res[i].verdict,
    ...(res[i].verdict === "fix" ? { dogru: res[i].dogru, en: res[i].en, reason: res[i].reason } : {}),
  }));
  writeFileSync(OUT, JSON.stringify(done, null, 2) + "\n");
  console.log(`  ${done.length}/${items.length}, düzeltme: ${done.filter((d) => d.verdict === "fix").length}`);
}
console.log(`✓ ${OUT}: ${done.filter((d) => d.verdict === "fix").length} düzeltme`);
