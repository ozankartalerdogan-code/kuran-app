// Embed the exact local web API responses, without network access or DB writes.
// node scripts/build-mobile-offline-tr.mjs [--db PATH] [--check] [--write-golden]
// --check validates on-disk bytes and all decoded responses without rewriting data.
// --write-golden explicitly refreshes the fixed local-route test fixtures.
// Compact verses: [meal, reading, literal]; ayah numbers and surah derive from order.
// Compact mushaf: [spans, basmalaRange, rawTajweed, optionalArabicOverride].
// IDs derive from page boundaries; rule/color pairs are stored once in rules.json.
// DB override: MOBILE_OFFLINE_TR_DB; otherwise data/app.db, then main repo.
// Requires Node with node:sqlite and the existing TypeScript dependency.
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import ts from "typescript";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "apps/mobile/src/data/offlineTr");
const LIMIT = 6_000_000;
const args = process.argv.slice(2);
const dbArg = args.indexOf("--db");
if (dbArg >= 0 && (!args[dbArg + 1] || args[dbArg + 1].startsWith("--"))) {
  throw new Error("--db requires a database path");
}
const override = dbArg >= 0 ? args[dbArg + 1] : process.env.MOBILE_OFFLINE_TR_DB;
const localDb = path.join(ROOT, "data/app.db");
const dbPath = override ? path.resolve(override)
  : existsSync(localDb) ? localDb : "C:/Projects/kuran_app/data/app.db";

// Execute the actual route handlers and their actual cleanMeal/mushafCompat
// helpers. Only Next's response wrapper and dbUtils are replaced. In particular,
// dbUtils itself is never loaded: it can create indexes or connect to Turso.
function moduleLoader(db, files = new Map()) {
  const modules = new Map();
  const dbUtils = path.join(ROOT, "apps/web/src/lib/dbUtils.ts");
  function load(filename) {
    if (filename === dbUtils) return {
      dbAll: async (sql, ...params) => db.prepare(sql).all(...params),
      dbGet: async (sql, ...params) => db.prepare(sql).get(...params),
    };
    if (modules.has(filename)) return modules.get(filename).exports;
    const source = files.get(path.relative(OUT, filename).split(path.sep).join("/")) ?? readFileSync(filename, "utf8");
    if (filename.endsWith(".json")) return JSON.parse(source);
    const mod = { exports: {} };
    modules.set(filename, mod);
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
      fileName: filename,
    }).outputText;
    const localRequire = (id) => {
      if (id === "next/server") return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      if (!id.startsWith(".")) throw new Error(`Unexpected route dependency: ${id}`);
      const resolved = path.resolve(path.dirname(filename), id);
      return load(path.extname(resolved) ? resolved : existsSync(`${resolved}.ts`) ? `${resolved}.ts` : path.join(resolved, "index.ts"));
    };
    new Function("require", "exports", "module", compiled)(localRequire, mod.exports, mod);
    return mod.exports;
  }
  return load;
}

async function response(handler, query = "") {
  const result = await handler({ nextUrl: new URL(`http://offline.invalid/api?${query}`) });
  if (!result.ok) throw new Error(`Local API failed (${result.status}): ${await result.text()}`);
  return result.json();
}

const db = new DatabaseSync(dbPath, { readOnly: true });
try {
  db.exec("BEGIN"); // One consistent read-only snapshot for all 719 responses.
  const load = moduleLoader(db);
  const routes = Object.fromEntries(["surahs", "verses", "mushaf"].map(name => [name, load(path.join(ROOT, `apps/web/src/app/api/${name}/route.ts`)).GET]));
  const { decodeVerses, decodeMushafPage } = load(path.join(ROOT, "apps/mobile/src/lib/offlineTrCodec.ts"));
  const arabic = JSON.parse(readFileSync(path.join(ROOT, "apps/mobile/src/data/quran_arabic.json"), "utf8"));
  const dbVerses = db.prepare("SELECT verse_key, surah_id, ayah_number, arabic_text, arabic_tajweed FROM verses ORDER BY surah_id, ayah_number").all();
  assert.equal(dbVerses.length, 6236);
  const arabicDifferences = dbVerses.filter(v => v.arabic_text !== arabic[v.surah_id - 1][v.ayah_number - 1]).map(v => v.verse_key);
  const rules = [];
  const ruleIndex = (rule, color) => {
    let i = rules.findIndex(r => r[0] === rule && r[1] === color);
    if (i < 0) { i = rules.length; rules.push([rule, color]); }
    return i;
  };
  const inputs = new Map(dbVerses.map(v => [v.verse_key, { ...v, spans: [], range: null }]));
  for (const m of db.prepare("SELECT * FROM quran_verse_metadata").all()) {
    inputs.get(m.verse_key).range = [m.basmala_kind, m.basmala_start_cp, m.basmala_end_cp, m.body_start_cp];
  }
  for (const t of db.prepare("SELECT * FROM tajweed_spans ORDER BY start_cp").all()) {
    inputs.get(t.verse_key).spans.push([t.start_cp, t.end_cp, ruleIndex(t.rule, t.color)]);
  }
  const files = new Map();
  const addJson = (name, body) => files.set(name, JSON.stringify(body));
  const surahs = await response(routes.surahs);
  assert.equal(surahs.length, 114);
  addJson("surahs.json", surahs);
  let verseCount = 0;
  for (let id = 1; id <= 114; id++) {
    const body = await response(routes.verses, `surah_id=${id}`);
    assert.equal(body.surah.id, id);
    assert.equal(body.verses.length, surahs[id - 1].verseCount);
    verseCount += body.verses.length;
    const compact = body.verses.map((v, i) => {
      assert.equal(v.ayahNumber, i + 1);
      return [v.meal, v.reading, v.literal];
    });
    assert.deepStrictEqual(decodeVerses(surahs[id - 1], compact), body);
    addJson(`verses/${String(id).padStart(3, "0")}.json`, compact);
  }
  assert.equal(verseCount, 6236);

  const mobilePages = JSON.parse(readFileSync(path.join(ROOT, "apps/mobile/src/data/mushaf_sayfalari.json"), "utf8"));
  const webPages = JSON.parse(readFileSync(path.join(ROOT, "apps/web/src/lib/mushaf_sayfalari.json"), "utf8"));
  assert.deepEqual(mobilePages, webPages, "Mobile/web page and juz boundaries must agree");
  const compare = ([s1, a1], [s2, a2]) => s1 - s2 || a1 - a2;
  const juzFor = (verse) => mobilePages.cuzBaslangiclari.filter((start) => compare(start, verse) <= 0).length;
  const chunks = Array.from({ length: 30 }, () => ({}));
  const pageJuz = [];
  const crossingPages = {};
  let pageVerses = 0;
  let coloredVerses = 0;
  for (let page = 1; page <= 604; page++) {
    const body = await response(routes.mushaf, `page=${page}&v=4`);
    const juz = juzFor(mobilePages.sayfaBaslangiclari[page - 1]);
    assert.equal(body.juz, juz);
    assert.equal(body.schemaVersion, 5);
    assert.ok(body.verses.length > 0);
    const last = body.verses.at(-1);
    const endingJuz = juzFor([last.surahId, last.ayahNumber]);
    if (endingJuz !== juz) crossingPages[page] = { storedJuz: juz, endingJuz };
    pageJuz.push(juz);
    const compact = body.verses.map(v => {
      const input = inputs.get(`${v.surahId}:${v.ayahNumber}`);
      const row = [input.spans, input.range, input.arabic_tajweed];
      if (input.arabic_text !== arabic[v.surahId - 1][v.ayahNumber - 1]) row.push(input.arabic_text);
      return row;
    });
    assert.deepStrictEqual(decodeMushafPage(page, juz, mobilePages.sayfaBaslangiclari[page - 1], compact, surahs, arabic, rules), body);
    chunks[juz - 1][page] = compact;
    pageVerses += body.verses.length;
    coloredVerses += body.verses.filter((v) => v.tajweedSpans.length > 0).length;
  }
  assert.equal(pageVerses, 6236);
  assert.ok(coloredVerses > 0, "DB must contain colored tajweed spans");
  chunks.forEach((chunk, i) => addJson(`mushaf/juz${String(i + 1).padStart(2, "0")}.json`, chunk));

  addJson("rules.json", rules);
  const index = [
    "// Generated by scripts/build-mobile-offline-tr.mjs. Do not edit.",
    'import type { SurahListItem } from "../../lib/api";',
    'import type { CompactVerses, CompactPages } from "../../lib/offlineTrCodec";',
    'export const loadSurahs = (): SurahListItem[] => require("./surahs.json");',
    "export const verseLoaders: Record<number, () => CompactVerses> = {",
    ...surahs.map(({ id }) => `  ${id}: () => require("./verses/${String(id).padStart(3, "0")}.json"),`),
    "};",
    "export const juzLoaders: Record<number, () => CompactPages> = {",
    ...chunks.map((_, i) => `  ${i + 1}: () => require("./mushaf/juz${String(i + 1).padStart(2, "0")}.json"),`),
    "};",
    `export const pageJuz: readonly number[] = ${JSON.stringify(pageJuz)};`,
    `export const crossingPages = ${JSON.stringify(crossingPages)};`,
    "",
  ].join("\n");
  files.set("index.ts", index);
  const sizes = (prefix) => {
    const values = [...files].filter(([name]) => name.startsWith(prefix)).map(([, content]) => Buffer.byteLength(content));
    const bytes = values.reduce((a, b) => a + b, 0);
    return { files: values.length, bytes, averageBytes: Math.round(bytes / values.length) };
  };
  const totalBytes = sizes("").bytes;
  if (args.includes("--check")) {
    for (const [name, content] of files) assert.equal(readFileSync(path.join(OUT, name), "utf8"), content, `Deterministic artifact: ${name}`);
  }
  console.log(JSON.stringify({
    surahs: sizes("surahs.json"), verses: sizes("verses/"), mushaf: sizes("mushaf/"),
    index: sizes("index.ts"), totalBytes, limitBytes: LIMIT, verseCount, pageVerses,
    coloredVerses, crossingPages, rules: sizes("rules.json"),
    equality: { pages: 604, surahs: 114 },
    arabicComparison: { compared: dbVerses.length, equal: dbVerses.length - arabicDifferences.length, differences: arabicDifferences },
  }, null, 2));
  if (totalBytes > LIMIT) console.warn("Target exceeded; retaining the best lossless output.");
  if (!args.includes("--check")) {
    for (const [name, content] of files) {
      const target = path.join(OUT, name);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(`${target}.tmp`, content);
      renameSync(`${target}.tmp`, target);
    }
  }
  // Exercise the actual mobile entry points against every actual route response.
  // --check checks committed/on-disk artifacts rather than only the encoder.
  const offline = moduleLoader(db, args.includes("--check") ? new Map() : files)(path.join(ROOT, "apps/mobile/src/lib/offlineTr.ts"));
  assert.deepStrictEqual(offline.offlineSurahs(), surahs);
  for (let id = 1; id <= 114; id++) assert.deepStrictEqual(offline.offlineVerses(id), await response(routes.verses, `surah_id=${id}`), `surah ${id}`);
  for (let page = 1; page <= 604; page++) assert.deepStrictEqual(offline.offlineMushafPage(page), await response(routes.mushaf, `page=${page}&v=4`), `page ${page}`);
  if (args.includes("--write-golden")) {
    const golden = { pages: {}, surahs: {} };
    for (const page of [1, 187, 604]) golden.pages[page] = await response(routes.mushaf, `page=${page}&v=4`);
    for (const id of [1, 114]) golden.surahs[id] = await response(routes.verses, `surah_id=${id}`);
    const target = path.join(ROOT, "apps/mobile/src/lib/__fixtures__/offlineTr.golden.json");
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(`${target}.tmp`, JSON.stringify(golden));
    renameSync(`${target}.tmp`, target);
  }
  console.log("deepStrictEqual PASS: 604/604 pages, 114/114 surahs, surah list; actual mobile decoder vs actual routes");
  console.log(`Arabic exact comparison: ${6236 - arabicDifferences.length}/6236 identical; ${arabicDifferences.length} overrides stored`);
  console.log(`OK: ${files.size} files ${args.includes("--check") ? "checked" : "written"}`);

} finally {
  db.close();
}
