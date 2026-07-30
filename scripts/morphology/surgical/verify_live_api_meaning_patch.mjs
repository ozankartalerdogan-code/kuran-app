import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const BATCH = "batch-bc-meaning-tr";
const OUT = path.join(REPO, "data/candidates/morphology/surgical-v1_10", BATCH);
const API = "https://kuran-app-web-ozan-s-projects8.vercel.app/api/ayah";
const payload = JSON.parse(fs.readFileSync(path.join(OUT, "decisions.json"), "utf8"));
const decisions = payload.decisions.filter((row) => row.source_batch === "batch-c-gloss");
const db = new DatabaseSync(path.join(REPO, "data/app.db"), { readOnly: true });
const lookup = db.prepare("SELECT arabic FROM words WHERE id = ?");
const groups = new Map();
for (const decision of decisions) {
  const surface = lookup.get(decision.words_id).arabic;
  const key = `${surface}·${decision.source_class}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(decision);
}
db.close();

function sampleAcrossVerses(rows) {
  const unique = [];
  const seenVerses = new Set();
  for (const row of rows) {
    if (!seenVerses.has(row.verse_key)) {
      seenVerses.add(row.verse_key);
      unique.push(row);
    }
  }
  let picked = unique.length > 3
    ? [unique[0], unique[Math.floor((unique.length - 1) / 2)], unique.at(-1)]
    : [...unique];
  for (const row of rows) {
    if (picked.length >= Math.min(3, rows.length)) break;
    if (!picked.some((item) => item.words_id === row.words_id)) picked.push(row);
  }
  return picked;
}

const selected = [...groups.entries()].flatMap(([className, rows]) =>
  sampleAcrossVerses(rows).map((row) => ({ className, classTotal: rows.length, ...row })));
const verseKeys = [...new Set(selected.map((row) => row.verse_key))];
const responses = new Map();
let cursor = 0;
async function worker() {
  while (cursor < verseKeys.length) {
    const verseKey = verseKeys[cursor++];
    const [surah, ayah] = verseKey.split(":");
    const url = `${API}?surah_id=${surah}&ayah_number=${ayah}&_meaning_patch=${Date.now()}-${cursor}`;
    let lastError = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        if (json.verseKey !== verseKey || !Array.isArray(json.words)) {
          throw new Error(`bad payload for ${verseKey}`);
        }
        responses.set(verseKey, json);
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (lastError) responses.set(verseKey, { error: String(lastError) });
  }
}
await Promise.all(Array.from({ length: Math.min(8, verseKeys.length) }, () => worker()));

const examples = selected.map((item) => {
  const response = responses.get(item.verse_key);
  const word = response?.words?.find((entry) => Number(entry.wordIndex) === item.word_index);
  return {
    class: item.className,
    classTotal: item.classTotal,
    verseKey: item.verse_key,
    wordIndex: item.word_index,
    expected: item.after,
    actual: word?.meaningTr ?? null,
    arabic: word?.arabic ?? null,
    ok: word?.meaningTr === item.after,
    error: response?.error ?? null,
  };
});
const byClass = [...groups.entries()].map(([className, rows]) => {
  const checked = examples.filter((example) => example.class === className);
  return {
    class: className,
    totalCells: rows.length,
    requiredDistinctExamples: Math.min(3, rows.length),
    checkedDistinctExamples: checked.length,
    allAvailableCheckedBecauseClassHasFewerThanThree: rows.length < 3,
    passed: checked.length === Math.min(3, rows.length) && checked.every((example) => example.ok),
    examples: checked,
  };
});
const failures = byClass.filter((group) => !group.passed);
const report = {
  ranAt: new Date().toISOString(),
  api: API,
  batch: BATCH,
  classCount: byClass.length,
  classesWithAtLeastThreeCells: byClass.filter((group) => group.totalCells >= 3).length,
  smallClassesWithAllAvailableChecked: byClass.filter((group) => group.totalCells < 3).length,
  distinctExamplesChecked: examples.length,
  distinctVersesFetched: verseKeys.length,
  failures: failures.map((group) => group.class),
  groups: byClass,
};
fs.writeFileSync(path.join(OUT, "live-api-verification.json"), JSON.stringify(report, null, 2) + "\n", "utf8");
console.log(JSON.stringify({
  classCount: report.classCount,
  classesWithAtLeastThreeCells: report.classesWithAtLeastThreeCells,
  smallClassesWithAllAvailableChecked: report.smallClassesWithAllAvailableChecked,
  distinctExamplesChecked: report.distinctExamplesChecked,
  distinctVersesFetched: report.distinctVersesFetched,
  failures: report.failures,
}, null, 2));
process.exit(failures.length ? 1 : 0);