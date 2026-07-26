/**
 * verify-token-realign-v1_9-live-api.mjs — pull all nine verses through the
 * live production mobile API and check what a real client actually receives.
 *
 * Network-read-only: issues GETs, writes one report file, touches no database.
 *
 *   node scripts/morphology/verify-token-realign-v1_9-live-api.mjs
 */
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(REPO, "data/candidates/morphology/token-realign-v1_9");
const BASE = process.env.EXPO_PUBLIC_API_URL
  ?? "https://kuran-app-web-ozan-s-projects8.vercel.app/api/v1";

const TARGETS = [
  ["2:72", 2, 72], ["2:181", 2, 181], ["8:6", 8, 6], ["13:37", 13, 37],
  ["15:7", 15, 7], ["27:20", 27, 20], ["36:22", 36, 22], ["37:164", 37, 164],
  ["41:47", 41, 47],
];
const FORBIDDEN = new Set(["null", "undefined", "none", "nan", "[object object]"]);

const failures = [];
const check = (name, ok, detail) => {
  if (!ok) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) console.log(` FAIL  ${name}  (${detail ?? ""})`);
};

const local = new DatabaseSync(path.join(REPO, "data/app.db"), { readOnly: true });
const samples = {};

for (const [verseKey, surahId, ayahNumber] of TARGETS) {
  const res = await fetch(`${BASE}/ayah?surah_id=${surahId}&ayah_number=${ayahNumber}`,
    { headers: { "cache-control": "no-cache" } });
  check(`${verseKey}: HTTP 200`, res.status === 200, `${res.status}`);
  if (res.status !== 200) continue;
  const body = await res.json();

  const words = body.words ?? body.wordAnalyses ?? body.wordAnalysis ?? [];
  const dbRows = local.prepare(
    `SELECT word_index, arabic, root, lemma, pos, morphology, meaning_tr, gloss_en
       FROM words WHERE verse_key = ? ORDER BY word_index`
  ).all(verseKey);

  check(`${verseKey}: API word count equals DB (${dbRows.length})`,
    words.length === dbRows.length, `api=${words.length} db=${dbRows.length}`);

  // order must follow word_index, dense from 1
  const indexes = words.map((w) => w.wordIndex ?? w.word_index ?? w.position);
  check(`${verseKey}: API order is word_index 1..N`,
    JSON.stringify(indexes) === JSON.stringify(indexes.map((_, i) => i + 1)),
    JSON.stringify(indexes));

  // each token carries its OWN analysis
  for (let i = 0; i < Math.min(words.length, dbRows.length); i++) {
    const w = words[i], row = dbRows[i];
    check(`${verseKey}[${i + 1}]: arabic matches DB`,
      (w.arabic ?? null) === row.arabic, `api=${w.arabic} db=${row.arabic}`);
    const apiRoot = w.root ?? null;
    const apiLemma = w.lemma ?? null;
    if (row.lemma !== null) {
      check(`${verseKey}[${i + 1}]: lemma matches DB`, apiLemma === row.lemma,
        `api=${apiLemma} db=${row.lemma}`);
    }
    if (row.root !== null) {
      check(`${verseKey}[${i + 1}]: root matches DB`, apiRoot === row.root,
        `api=${apiRoot} db=${row.root}`);
    }
    const apiMeaning = w.meaningTr ?? w.meaning?.text ?? w.meaning ?? null;
    if (row.meaning_tr !== null && typeof apiMeaning === "string") {
      check(`${verseKey}[${i + 1}]: meaning matches DB`, apiMeaning === row.meaning_tr,
        `api=${apiMeaning} db=${row.meaning_tr}`);
    }
    if (row.meaning_tr === null) {
      check(`${verseKey}[${i + 1}]: NULL meaning is absent, not the word "null"`,
        apiMeaning === null || apiMeaning === undefined || apiMeaning === "",
        JSON.stringify(apiMeaning));
    }
  }

  // no placeholder text anywhere in the payload a user could see
  const flat = JSON.stringify(body);
  for (const bad of ['"null"', '"undefined"', '"NaN"', '"[object Object]"']) {
    check(`${verseKey}: payload has no ${bad} string value`, !flat.includes(`:${bad}`), bad);
  }

  const withNullPos = words.filter((w) => !(w.pos ?? w.morphology));
  samples[verseKey] = {
    httpStatus: res.status,
    apiWordCount: words.length,
    dbWordCount: dbRows.length,
    lastWord: words.at(-1) ?? null,
    wordsWithNullPosOrMorphology: withNullPos.length,
  };
}

local.close();

fs.writeFileSync(path.join(OUT, "live-api-verification.json"), JSON.stringify({
  ranAt: new Date().toISOString(), base: BASE, samples, failures,
}, null, 2), "utf8");

console.log(JSON.stringify(samples, null, 2));
console.log(`\nLIVE API: ${failures.length ? "FAIL" : "PASS"} (${failures.length} failures)`);
process.exit(failures.length ? 1 : 0);
