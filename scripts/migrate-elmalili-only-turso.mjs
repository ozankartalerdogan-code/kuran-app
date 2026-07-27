#!/usr/bin/env node
/**
 * Turso (production) meal katmanini yalniz Elmalili H. Yazir mealine indirger.
 *
 * data/app.db master'dir; bu script ayni mantiksal migration'i uzak veritabaninda
 * uygular. sync-diff-to-turso.mjs yalniz birkac sutunu tasidigi icin bu is onunla
 * yapilamaz.
 *
 * Guvenlik:
 *  - Once tam pre-image JSON yedegi alinir (reverse icin tek kaynak).
 *  - Yapisal degisiklikler tek `batch` (atomik transaction) icinde calisir ve
 *    `primary_translation` guncellemesi silmelerden ONCE gelir.
 *  - Postflight sapmasinda otomatik reverse onerilir; --reverse ile geri alinir.
 *  - Uygulama icin --apply-production VE --confirm-local-verified gerekir.
 *
 * Kullanim:
 *   node --env-file=apps/web/.env.local scripts/migrate-elmalili-only-turso.mjs --dry-run
 *   node --env-file=apps/web/.env.local scripts/migrate-elmalili-only-turso.mjs --apply-production --confirm-local-verified
 *   node --env-file=apps/web/.env.local scripts/migrate-elmalili-only-turso.mjs --reverse --preimage <path>
 */

import { createClient } from "@libsql/client";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";

const KEEP_SOURCE = "yazir";
const REMOVED_SOURCES = ["bulac", "diyanet", "ozturk", "vakfi"];
const EXPECTED = {
  verses: 6236,
  words: 77433,
  rootMeanings: 1703,
  translationsBefore: 31180,
  translationsAfter: 6236,
  deletedTranslations: 24944,
};

const APPLY = process.argv.includes("--apply-production");
const REVERSE = process.argv.includes("--reverse");
const CONFIRMED = process.argv.includes("--confirm-local-verified");
const preimageArg = process.argv.find((a) => a.startsWith("--preimage="))
  ? process.argv.find((a) => a.startsWith("--preimage=")).split("=")[1]
  : process.argv[process.argv.indexOf("--preimage") + 1];

const log = (...m) => console.log(...m);
const fail = (msg) => {
  throw new Error(`FAIL-CLOSED: ${msg}`);
};

function client() {
  const url = process.env.TURSO_DB_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) fail("TURSO_DB_URL / TURSO_AUTH_TOKEN yok");
  return createClient({ url: url.replace(/^libsql:\/\//, "https://"), authToken });
}

const rows = async (db, sql, args = []) => (await db.execute({ sql, args })).rows;
const num = async (db, sql, args = []) => Number((await rows(db, sql, args))[0]?.n ?? -1);

async function snapshot(db) {
  return {
    translations: await num(db, "SELECT COUNT(*) n FROM translations"),
    verses: await num(db, "SELECT COUNT(*) n FROM verses"),
    words: await num(db, "SELECT COUNT(*) n FROM words"),
    rootMeanings: await num(db, "SELECT COUNT(*) n FROM root_meanings"),
    aktifMealler: await num(db, "SELECT COUNT(*) n FROM aktif_mealler"),
    fts: await num(db, "SELECT COUNT(*) n FROM ayet_fts"),
    fidelityComparisons: await num(db, "SELECT COUNT(*) n FROM fidelity_comparisons").catch(
      () => null
    ),
    sources: await rows(
      db,
      "SELECT source, COUNT(*) n FROM translations GROUP BY source ORDER BY source"
    ),
  };
}

async function isAlreadyMigrated(db) {
  const nonYazir = await num(db, "SELECT COUNT(*) n FROM translations WHERE source <> ?", [
    KEEP_SOURCE,
  ]);
  const nonActive = await num(db, "SELECT COUNT(*) n FROM aktif_mealler WHERE source <> ?", [
    KEEP_SOURCE,
  ]);
  const primaryBad = await num(
    db,
    `SELECT COUNT(*) n FROM verses v
     LEFT JOIN translations t ON t.verse_key = v.verse_key AND t.source = ?
     WHERE v.primary_translation IS NOT t.text`,
    [KEEP_SOURCE]
  );
  const ftsBad = await num(
    db,
    `SELECT COUNT(*) n FROM ayet_fts f
     LEFT JOIN translations t ON t.verse_key = f.verse_key AND t.source = ?
     WHERE f.meal IS NOT t.text`,
    [KEEP_SOURCE]
  );
  return nonYazir === 0 && nonActive === 0 && primaryBad === 0 && ftsBad === 0;
}

async function preflight(db) {
  const s = await snapshot(db);
  if (s.verses !== EXPECTED.verses) fail(`verses ${s.verses} != ${EXPECTED.verses}`);
  if (s.words !== EXPECTED.words) fail(`words ${s.words} != ${EXPECTED.words}`);
  if (s.rootMeanings !== EXPECTED.rootMeanings)
    fail(`root_meanings ${s.rootMeanings} != ${EXPECTED.rootMeanings}`);

  const yazir = await num(
    db,
    `SELECT COUNT(DISTINCT verse_key) n FROM translations
     WHERE source = ? AND text IS NOT NULL AND TRIM(text) <> ''`,
    [KEEP_SOURCE]
  );
  if (yazir !== EXPECTED.verses)
    fail(`Elmalili kapsami ${yazir}/${EXPECTED.verses} - eksik meal ile silme yapilamaz`);

  const orphan = await num(
    db,
    `SELECT COUNT(*) n FROM verses v
     WHERE NOT EXISTS (
       SELECT 1 FROM translations t WHERE t.verse_key = v.verse_key AND t.source = ?
       AND t.text IS NOT NULL AND TRIM(t.text) <> ''
     )`,
    [KEEP_SOURCE]
  );
  if (orphan !== 0) fail(`${orphan} ayette Elmalili meali yok`);
  return s;
}

async function capturePreimage(db) {
  log("[preimage] uzak veritabani okunuyor...");
  return {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    target: "turso",
    keepSource: KEEP_SOURCE,
    removedSources: REMOVED_SOURCES,
    translations: await rows(
      db,
      "SELECT id, verse_key, source, text FROM translations WHERE source <> ? ORDER BY id",
      [KEEP_SOURCE]
    ),
    aktifMealler: await rows(
      db,
      "SELECT source, display_name, aktif, sira FROM aktif_mealler ORDER BY source"
    ),
    versesPrimary: await rows(
      db,
      "SELECT verse_key, primary_translation FROM verses ORDER BY verse_key"
    ),
    ftsMeal: await rows(db, "SELECT verse_key, meal FROM ayet_fts ORDER BY verse_key"),
    fidelityComparisons: await rows(
      db,
      `SELECT id, verse_key, surah_id, ayah_number, source_name, text, source_url, status, ayah_status
       FROM fidelity_comparisons WHERE source_name <> ? ORDER BY id`,
      [KEEP_SOURCE]
    ).catch(() => []),
  };
}

async function postflight(db, before) {
  const after = await snapshot(db);
  if (after.translations !== EXPECTED.translationsAfter)
    fail(`translations ${after.translations} != ${EXPECTED.translationsAfter}`);

  const deleted = before.translations - after.translations;
  if (
    before.translations === EXPECTED.translationsBefore &&
    deleted !== EXPECTED.deletedTranslations
  )
    fail(`silinen satir ${deleted} != ${EXPECTED.deletedTranslations}`);

  for (const s of REMOVED_SOURCES) {
    if ((await num(db, "SELECT COUNT(*) n FROM translations WHERE source = ?", [s])) !== 0)
      fail(`${s} translations tablosunda kaldi`);
    if ((await num(db, "SELECT COUNT(*) n FROM aktif_mealler WHERE source = ?", [s])) !== 0)
      fail(`${s} aktif_mealler tablosunda kaldi`);
  }

  if (after.aktifMealler !== 1) fail(`aktif_mealler ${after.aktifMealler} != 1`);

  const primaryOk = await num(
    db,
    `SELECT COUNT(*) n FROM verses v
     JOIN translations t ON t.verse_key = v.verse_key AND t.source = ?
     WHERE v.primary_translation IS t.text`,
    [KEEP_SOURCE]
  );
  if (primaryOk !== EXPECTED.verses)
    fail(`primary_translation ${primaryOk}/${EXPECTED.verses} Elmalili degil`);

  const ftsOk = await num(
    db,
    `SELECT COUNT(*) n FROM ayet_fts f
     JOIN translations t ON t.verse_key = f.verse_key AND t.source = ?
     WHERE f.meal IS t.text`,
    [KEEP_SOURCE]
  );
  if (ftsOk !== EXPECTED.verses) fail(`ayet_fts.meal ${ftsOk}/${EXPECTED.verses} Elmalili degil`);

  if (after.verses !== before.verses) fail("verses sayisi degisti");
  if (after.words !== before.words) fail("words sayisi degisti");
  if (after.rootMeanings !== before.rootMeanings) fail("root_meanings sayisi degisti");

  return { after, deleted };
}

async function runReverse(db, preimagePath) {
  const pre = JSON.parse(readFileSync(preimagePath, "utf8"));
  log(`[reverse] ${pre.translations.length} meal satiri geri yukleniyor...`);
  const CH = 200;

  await db.batch(
    [{ sql: "DELETE FROM translations WHERE source <> ?", args: [KEEP_SOURCE] }],
    "write"
  );
  for (let i = 0; i < pre.translations.length; i += CH) {
    await db.batch(
      pre.translations.slice(i, i + CH).map((r) => ({
        sql: "INSERT INTO translations (id, verse_key, source, text) VALUES (?, ?, ?, ?)",
        args: [r.id, r.verse_key, r.source, r.text],
      })),
      "write"
    );
  }

  await db.batch(
    [
      { sql: "DELETE FROM aktif_mealler", args: [] },
      ...pre.aktifMealler.map((r) => ({
        sql: "INSERT INTO aktif_mealler (source, display_name, aktif, sira) VALUES (?, ?, ?, ?)",
        args: [r.source, r.display_name, r.aktif, r.sira],
      })),
    ],
    "write"
  );

  for (let i = 0; i < pre.versesPrimary.length; i += CH) {
    await db.batch(
      pre.versesPrimary.slice(i, i + CH).map((r) => ({
        sql: "UPDATE verses SET primary_translation = ? WHERE verse_key = ?",
        args: [r.primary_translation, r.verse_key],
      })),
      "write"
    );
  }

  for (let i = 0; i < pre.ftsMeal.length; i += CH) {
    await db.batch(
      pre.ftsMeal.slice(i, i + CH).map((r) => ({
        sql: "UPDATE ayet_fts SET meal = ? WHERE verse_key = ?",
        args: [r.meal, r.verse_key],
      })),
      "write"
    );
  }

  if (pre.fidelityComparisons.length > 0) {
    await db.batch(
      [{ sql: "DELETE FROM fidelity_comparisons WHERE source_name <> ?", args: [KEEP_SOURCE] }],
      "write"
    );
    for (let i = 0; i < pre.fidelityComparisons.length; i += CH) {
      await db.batch(
        pre.fidelityComparisons.slice(i, i + CH).map((r) => ({
          sql: `INSERT INTO fidelity_comparisons
                (id, verse_key, surah_id, ayah_number, source_name, text, source_url, status, ayah_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            r.id,
            r.verse_key,
            r.surah_id,
            r.ayah_number,
            r.source_name,
            r.text,
            r.source_url,
            r.status,
            r.ayah_status,
          ],
        })),
        "write"
      );
    }
  }

  log(`[reverse] tamamlandi: translations=${await num(db, "SELECT COUNT(*) n FROM translations")}`);
}

async function main() {
  const db = client();

  if (REVERSE) {
    if (!preimageArg) fail("--reverse icin --preimage zorunlu");
    await runReverse(db, preimageArg);
    return;
  }

  if (await isAlreadyMigrated(db)) {
    log("[no-op] Turso'da migration zaten uygulanmis.");
    log(JSON.stringify(await snapshot(db), null, 2));
    return;
  }

  const before = await preflight(db);
  log(`[preflight] OK translations=${before.translations}`);

  const pre = await capturePreimage(db);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  mkdirSync(path.resolve("backups"), { recursive: true });
  const preimagePath = path.join(path.resolve("backups"), `turso-elmalili-preimage-${stamp}.json`);
  writeFileSync(preimagePath, JSON.stringify(pre), "utf8");
  log(`[preimage] ${preimagePath} (${pre.translations.length} meal satiri)`);

  if (!APPLY) {
    log("[dry-run] Uzak veritabani DEGISTIRILMEDI. Uygulamak icin:");
    log("  --apply-production --confirm-local-verified");
    return;
  }
  if (!CONFIRMED)
    fail("Production yazimi reddedildi: --confirm-local-verified bayragi gerekli");

  // Yapisal migration: tek atomik batch. primary_translation silmelerden ONCE.
  log("[apply] atomik batch calisiyor...");
  await db.batch(
    [
      {
        sql: `UPDATE verses SET primary_translation = (
                SELECT t.text FROM translations t
                WHERE t.verse_key = verses.verse_key AND t.source = ?)`,
        args: [KEEP_SOURCE],
      },
      {
        sql: `UPDATE ayet_fts SET meal = (
                SELECT t.text FROM translations t
                WHERE t.verse_key = ayet_fts.verse_key AND t.source = ?)`,
        args: [KEEP_SOURCE],
      },
      { sql: "DELETE FROM aktif_mealler WHERE source <> ?", args: [KEEP_SOURCE] },
      {
        sql: "UPDATE aktif_mealler SET aktif = 1, sira = 1 WHERE source = ?",
        args: [KEEP_SOURCE],
      },
      { sql: "DELETE FROM fidelity_comparisons WHERE source_name <> ?", args: [KEEP_SOURCE] },
      { sql: "DELETE FROM translations WHERE source <> ?", args: [KEEP_SOURCE] },
    ],
    "write"
  );

  const result = await postflight(db, before);
  log(`[after] ${JSON.stringify(result.after, null, 2)}`);
  log(`[deleted] ${result.deleted} satir`);
  log("[apply] Turso migration tamamlandi ve dogrulandi.");
  log(`[rollback] node --env-file=apps/web/.env.local scripts/migrate-elmalili-only-turso.mjs --reverse --preimage ${preimagePath}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
