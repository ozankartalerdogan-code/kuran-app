import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildRuntimeData, readCanonicalSource, sourceRowsToBytes } from "./build-quran-runtime.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXPECTED_SHA = "7f30c647331a61100ebf24a80507dc0fcdd9f2df97f1312b5b2dfcb982a7f326";
const APPLY = process.argv.includes("--apply-production");
const DRY_RUN = process.argv.includes("--dry-run") || !APPLY;
const confirmation = process.argv.find((arg) => arg.startsWith("--confirm-sha="))?.slice("--confirm-sha=".length);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function requireEnvironment() {
  const url = process.env.TURSO_DB_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) throw new Error("TURSO_DB_URL/TURSO_AUTH_TOKEN are required.");
  return { url, authToken };
}

async function readRemoteRows(client) {
  const result = await client.execute("SELECT verse_key, surah_id, ayah_number, arabic_text FROM verses ORDER BY surah_id, ayah_number");
  return result.rows.map((row) => ({
    verseKey: String(row.verse_key),
    surahId: Number(row.surah_id),
    ayahNumber: Number(row.ayah_number),
    arabicText: row.arabic_text == null ? "" : String(row.arabic_text),
  }));
}

async function backupRemoteQuran(client) {
  const [verses, spans, metadata, meta] = await Promise.all([
    client.execute("SELECT * FROM verses ORDER BY surah_id, ayah_number"),
    client.execute("SELECT * FROM tajweed_spans ORDER BY verse_key, start_cp").catch(() => ({ rows: [] })),
    client.execute("SELECT * FROM quran_verse_metadata ORDER BY verse_key").catch(() => ({ rows: [] })),
    client.execute("SELECT * FROM quran_runtime_meta ORDER BY key").catch(() => ({ rows: [] })),
  ]);
  const output = path.join(ROOT, "backups", `turso-quran-before-uthmani-1.1-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify({ createdAt: new Date().toISOString(), verses: verses.rows, tajweedSpans: spans.rows, quranVerseMetadata: metadata.rows, quranRuntimeMeta: meta.rows }, null, 2), "utf8");
  return output;
}

async function main() {
  if (APPLY && confirmation !== EXPECTED_SHA) {
    throw new Error(`Production write refused. Pass --confirm-sha=${EXPECTED_SHA} after reviewing a successful dry-run.`);
  }
  const source = readCanonicalSource();
  const runtime = buildRuntimeData();
  if (source.sourceSha256 !== EXPECTED_SHA || runtime.source.verses.length !== 6236) throw new Error("Canonical source preflight failed.");

  const { createClient } = await import("@libsql/client");
  const client = createClient(requireEnvironment());
  const before = await readRemoteRows(client);
  const canonicalByKey = new Map(runtime.source.verses.map((verse) => [verse.verseKey, verse.arabicText]));
  const different = before.filter((row) => canonicalByKey.get(row.verseKey) !== row.arabicText).length;
  console.log(JSON.stringify({ mode: DRY_RUN ? "dry-run" : "apply-production", remoteVerseCount: before.length, differentAyahs: different, expectedSourceSha256: EXPECTED_SHA }, null, 2));
  if (DRY_RUN) return;

  const backupPath = await backupRemoteQuran(client);
  console.log(`Backup written before production mutation: ${backupPath}`);
  await client.batch([
    { sql: "CREATE TABLE IF NOT EXISTS quran_verse_metadata (verse_key TEXT PRIMARY KEY, basmala_kind TEXT, basmala_start_cp INTEGER, basmala_end_cp INTEGER, body_start_cp INTEGER)", args: [] },
    { sql: "CREATE TABLE IF NOT EXISTS tajweed_spans (id INTEGER PRIMARY KEY, verse_key TEXT NOT NULL, start_cp INTEGER NOT NULL, end_cp INTEGER NOT NULL, rule TEXT NOT NULL, color TEXT NOT NULL, confidence TEXT NOT NULL DEFAULT 'exact-nfd-grapheme')", args: [] },
    { sql: "CREATE INDEX IF NOT EXISTS idx_tajweed_spans_verse ON tajweed_spans(verse_key, start_cp)", args: [] },
    { sql: "CREATE TABLE IF NOT EXISTS quran_runtime_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)", args: [] },
    { sql: "DELETE FROM quran_verse_metadata", args: [] },
    { sql: "DELETE FROM tajweed_spans", args: [] },
    { sql: "DELETE FROM quran_runtime_meta", args: [] },
  ], "write");

  const statements = [];
  for (const verse of runtime.source.verses) statements.push({ sql: "UPDATE verses SET arabic_text = ? WHERE verse_key = ?", args: [verse.arabicText, verse.verseKey] });
  for (const range of runtime.basmalaRanges) statements.push({ sql: "INSERT INTO quran_verse_metadata (verse_key, basmala_kind, basmala_start_cp, basmala_end_cp, body_start_cp) VALUES (?, ?, ?, ?, ?)", args: [range.verseKey, range.kind, range.startCp, range.endCp, range.bodyStartCp] });
  for (const verse of runtime.tajweedVerses) for (const span of verse.spans) statements.push({ sql: "INSERT INTO tajweed_spans (verse_key, start_cp, end_cp, rule, color) VALUES (?, ?, ?, ?, ?)", args: [verse.verseKey, span.startCp, span.endCp, span.rule, span.color] });
  statements.push({ sql: "INSERT INTO quran_runtime_meta (key, value) VALUES ('source_sha256', ?)", args: [EXPECTED_SHA] });
  statements.push({ sql: "INSERT INTO quran_runtime_meta (key, value) VALUES ('verse_count', '6236')", args: [] });
  for (let offset = 0; offset < statements.length; offset += 200) await client.batch(statements.slice(offset, offset + 200), "write");

  const after = await readRemoteRows(client);
  const differentAfter = after.filter((row) => canonicalByKey.get(row.verseKey) !== row.arabicText).length;
  const reconstructedSha = sha256(sourceRowsToBytes(after, source.sourceSuffix));
  if (after.length !== 6236 || differentAfter !== 0 || reconstructedSha !== EXPECTED_SHA) {
    throw new Error(`Production postflight failed: count=${after.length} differences=${differentAfter} sha=${reconstructedSha}. Restore ${backupPath}.`);
  }
  console.log(JSON.stringify({ applied: true, verseCount: after.length, differentAfter, reconstructedSha, backupPath }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
