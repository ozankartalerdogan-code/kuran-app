// 2. aşama: review-roots.json'daki şüpheli kök anlamlarını, kökün KUR'AN'DA GEÇTİĞİ
// kelime biçimleri ve ayetlerle birlikte yeniden yargılatır. Yalnız öneri üretir.
//   node scripts/review-root-meanings-tr-stage2.mjs
// Çıktı: content/words/corrections-roots.json  [{root, tr, verdict, dogru, en, reason}]
import { DatabaseSync } from "node:sqlite";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "content", "words", "corrections-roots.json");
const db = new DatabaseSync(path.join(ROOT, "data", "app.db"), { readOnly: true });
const suspects = JSON.parse(readFileSync(path.join(ROOT, "content", "words", "review-roots.json"), "utf8"))
  .filter((x) => x.verdict === "fix");

const occ = db.prepare(`SELECT verse_key, MIN(arabic) a, MIN(meaning_tr) m, MIN(gloss_en) g FROM words
  WHERE root = ? GROUP BY verse_key, word_index LIMIT 4`);
const verseAr = db.prepare("SELECT arabic_text FROM verses WHERE verse_key = ?");

const items = suspects.map((s) => ({
  root: s.ar[0], tr: s.tr,
  occurrences: occ.all(s.ar[0]).map((o) => ({
    verse: o.verse_key, word: o.a, word_meaning_tr: o.m, word_gloss_en: o.g || null,
    verse_arabic: (verseAr.get(o.verse_key)?.arabic_text ?? "").slice(0, 400),
  })),
  hint: { tr_fixed: s.tr_fixed, en_fixed: s.en_fixed, reason: s.reason },
}));

const PROMPT = `You are an expert in Quranic Arabic lexicography and Turkish. Each item is an Arabic root as used in this Quran app, its current short Turkish root meaning ("tr"), real occurrences of the root in the Quran (word, verse, the word's own meaning), and a first-pass correction hint that MAY BE WRONG.
Judge the Turkish root meaning against how the root is actually used in these Quranic occurrences (e.g. root بول occurs as بَال "state, condition, heart" in the Quran — then "hâl, durum" is correct even if the root also means urine elsewhere).
Answer "ok" if the current Turkish meaning is acceptable for the Quranic usage (do not fix style or minor nuance). Answer "fix" only if it is clearly wrong (confused with another root, hallucinated, unrelated, contains a non-word).
If fix: give a corrected SHORT Turkish root meaning (comma/semicolon separated senses, "-mek" verbs, like the app style) and a short English dictionary-style meaning ("to ...").
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
const CH = 20;
for (let s = done.length; s < items.length; s += CH) {
  const part = items.slice(s, s + CH);
  const input = part.map((it, i) => ({ i, root: it.root, tr: it.tr, occurrences: it.occurrences, hint: it.hint }));
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
    root: it.root, tr: it.tr, verdict: res[i].verdict,
    ...(res[i].verdict === "fix" ? { dogru: res[i].dogru, en: res[i].en, reason: res[i].reason } : {}),
  }));
  writeFileSync(OUT, JSON.stringify(done, null, 2) + "\n");
  console.log(`  ${done.length}/${items.length}, düzeltme: ${done.filter((d) => d.verdict === "fix").length}`);
}
console.log(`✓ ${OUT}: ${done.filter((d) => d.verdict === "fix").length} düzeltme`);
