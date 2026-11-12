// Türkçe kelime/kök anlamlarında AÇIK hataları (uydurma, yanlış kelime) Codex ile
// tarar. Yalnız öneri üretir; veritabanına yazmaz.
//   node scripts/review-word-meanings-tr.mjs words|roots
// Çıktı: content/words/review-<words|roots>.json  [{tr, ar, verses, verdict, tr_fixed, en_fixed, reason}]
import { DatabaseSync } from "node:sqlite";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const kind = process.argv[2];
if (!["words", "roots"].includes(kind)) { console.error("words|roots"); process.exit(1); }
const OUT = path.join(ROOT, "content", "words", `review-${kind}.json`);
const db = new DatabaseSync(path.join(ROOT, "data", "app.db"), { readOnly: true });

let items;
if (kind === "words") {
  // gloss_en'i olmayan kelimeler (İngilizcesi Türkçeden çevrildi): Türkçe anlam başına örnek Arapça + ayet.
  const rows = db.prepare(`SELECT verse_key, word_index, MIN(arabic) a, MIN(meaning_tr) m, MIN(gloss_en) g
    FROM words GROUP BY verse_key, word_index`).all().filter((r) => !r.g?.trim() && r.m?.trim());
  const map = new Map();
  for (const r of rows) {
    const k = r.m.trim();
    if (!map.has(k)) map.set(k, { tr: k, ar: new Set(), verses: [] });
    const e = map.get(k);
    if (e.ar.size < 4) e.ar.add(r.a);
    if (e.verses.length < 3) e.verses.push(r.verse_key);
  }
  items = [...map.values()].map((e) => ({ tr: e.tr, ar: [...e.ar], verses: e.verses }));
} else {
  items = db.prepare(`SELECT root, MIN(meaning_tr) m FROM root_meanings
    WHERE meaning_tr IS NOT NULL AND meaning_tr <> '' GROUP BY root ORDER BY root`).all()
    .map((r) => ({ tr: r.m.trim(), ar: [r.root], verses: [] }));
}

const PROMPT = `You are an expert in Quranic Arabic and Turkish. Below are ${kind === "words" ? "Turkish word-by-word meanings of Quranic Arabic words (with sample Arabic forms and verse keys)" : "Turkish meanings of Quranic Arabic triliteral roots"}.
Find ONLY clear errors: a meaning that is wrong for the Arabic, invented/hallucinated (e.g. a non-existent thing like "balık ağacı" for يقطين which is a gourd plant), or a confused word. Do NOT flag style, brevity, word order, missing nuances or acceptable alternative meanings. When unsure, answer "ok".
For each input item output an object {"i": <index>, "verdict": "ok"} or {"i": <index>, "verdict": "fix", "tr_fixed": "<corrected short Turkish meaning in the same style>", "en_fixed": "<short English gloss>", "reason": "<short reason in Turkish>"}.
Output ONLY a JSON array with one object per input item, same order. No commentary.`;

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
const CH = 80;
for (let s = done.length; s < items.length; s += CH) {
  const part = items.slice(s, s + CH);
  const input = part.map((it, i) => ({ i, tr: it.tr, ar: it.ar, verses: it.verses }));
  let res, ok = false;
  for (let t = 1; t <= 3 && !ok; t++) {
    try {
      res = codex(`${PROMPT}\n\nINPUT:\n${JSON.stringify(input)}`);
      if (res.length !== part.length) throw new Error(`öğe ${res.length} ≠ ${part.length}`);
      ok = true;
    } catch (e) { console.warn(`  parça ${s / CH + 1} deneme ${t}: ${e.message}`); }
  }
  if (!ok) { console.error("parça başarısız; tekrar çalıştırın"); process.exit(1); }
  part.forEach((it, i) => done.push({ ...it, ...res[i], i: undefined }));
  writeFileSync(OUT, JSON.stringify(done, null, 2) + "\n");
  console.log(`  ${done.length}/${items.length}, şüpheli: ${done.filter((d) => d.verdict === "fix").length}`);
}
console.log(`✓ ${OUT}: ${done.filter((d) => d.verdict === "fix").length} düzeltme önerisi`);
