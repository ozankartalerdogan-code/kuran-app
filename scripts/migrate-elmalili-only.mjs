#!/usr/bin/env node
/**
 * Production meal katmanini yalniz Elmalili H. Yazir (`yazir`) mealine indirger.
 *
 * Kaldirilan kaynaklar: bulac, diyanet, ozturk, vakfi (+ fidelity_comparisons
 * icindeki diger karsilastirma kaynaklari).
 *
 * Guvenlik kurallari:
 *  - `verses.primary_translation` Elmalili'ya gecirilmeden hicbir meal silinmez.
 *  - Arapca metin, tefsir, kelime anlami, morfoloji ve tecvid alanlarina dokunulmaz;
 *    bu alanlar migration oncesi/sonrasi checksum ile dogrulanir.
 *  - Tum adimlar tek transaction icindedir; sapmada ROLLBACK yapilir.
 *  - Silinen satirlarin pre-image'i JSON olarak yedeklenir (reverse icin).
 *  - Ikinci calistirma no-op'tur.
 *
 * Kullanim:
 *   node scripts/migrate-elmalili-only.mjs --db data/app.db --dry-run
 *   node scripts/migrate-elmalili-only.mjs --db data/app.db --apply
 *   node scripts/migrate-elmalili-only.mjs --db data/app.db --reverse --preimage <path>
 */

import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
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

// Bu tablo/sutunlar migration'in hedefi DISINDADIR; degisirlerse fail-closed.
const OFF_TARGET_TABLES = [
  "words",
  "root_meanings",
  "tajweed_spans",
  "surah_tafsir",
  "context_notes",
  "verse_tags",
  "verse_tag_items",
  "sureler",
  "quran_verse_metadata",
];
const OFF_TARGET_VERSE_COLUMNS = [
  "arabic_text",
  "arabic_tajweed",
  "literal_ceviri",
  "reading_tr",
  "ham_anlam_ozeti",
  "fark_analizi",
  "temalar",
];

const UNIT_SEP = String.fromCharCode(31);
const RECORD_SEP = String.fromCharCode(30);

function parseArgs(argv) {
  const args = { db: "data/app.db", mode: "dry-run", preimage: null };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--db") args.db = argv[++i];
    else if (a === "--apply") args.mode = "apply";
    else if (a === "--dry-run") args.mode = "dry-run";
    else if (a === "--reverse") args.mode = "reverse";
    else if (a === "--preimage") args.preimage = argv[++i];
    else throw new Error(`Bilinmeyen arguman: ${a}`);
  }
  return args;
}

const log = (...m) => console.log(...m);
const fail = (msg) => {
  throw new Error(`FAIL-CLOSED: ${msg}`);
};

function tableNames(db) {
  return new Set(
    db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name)
  );
}

function scalar(db, sql, ...args) {
  const row = db.prepare(sql).get(...args);
  return row ? Object.values(row)[0] : null;
}

/**
 * Satirlari JS tarafinda akitarak ozetler. Dev group_concat stringi uretmez,
 * SQLITE_MAX_LENGTH sinirina takilmaz, deterministiktir.
 */
function digestRows(db, sql) {
  const rowHash = createHash("sha256");
  let count = 0;
  for (const row of db.prepare(sql).iterate()) {
    for (const value of Object.values(row)) {
      rowHash.update(value === null ? " null" : String(value));
      rowHash.update(UNIT_SEP);
    }
    rowHash.update(RECORD_SEP);
    count += 1;
  }
  return `${count}:${rowHash.digest("hex")}`;
}

/** Hedef disi veriyi tek bir checksum'a indirger. */
function offTargetChecksum(db) {
  const present = tableNames(db);
  const hash = createHash("sha256");

  for (const table of OFF_TARGET_TABLES) {
    if (!present.has(table)) continue;
    const cols = db
      .prepare(`PRAGMA table_info(${table})`)
      .all()
      .map((c) => `"${c.name}"`)
      .sort();
    const list = cols.join(", ");
    hash.update(`${table}=${digestRows(db, `SELECT ${list} FROM ${table} ORDER BY ${list}`)}\n`);
  }

  const verseCols = OFF_TARGET_VERSE_COLUMNS.map((c) => `"${c}"`).join(", ");
  hash.update(
    `verses=${digestRows(db, `SELECT verse_key, ${verseCols} FROM verses ORDER BY verse_key`)}\n`
  );

  return hash.digest("hex");
}

function snapshotCounts(db) {
  const present = tableNames(db);
  return {
    translations: scalar(db, "SELECT COUNT(*) FROM translations"),
    verses: scalar(db, "SELECT COUNT(*) FROM verses"),
    words: scalar(db, "SELECT COUNT(*) FROM words"),
    rootMeanings: scalar(db, "SELECT COUNT(*) FROM root_meanings"),
    aktifMealler: scalar(db, "SELECT COUNT(*) FROM aktif_mealler"),
    fts: scalar(db, "SELECT COUNT(*) FROM ayet_fts"),
    fidelityComparisons: present.has("fidelity_comparisons")
      ? scalar(db, "SELECT COUNT(*) FROM fidelity_comparisons")
      : null,
    sources: db
      .prepare("SELECT source, COUNT(*) n FROM translations GROUP BY source ORDER BY source")
      .all(),
  };
}

/** Migration zaten uygulanmis mi? */
function isAlreadyMigrated(db) {
  const nonYazir = scalar(db, "SELECT COUNT(*) FROM translations WHERE source <> ?", KEEP_SOURCE);
  const nonYazirActive = scalar(
    db,
    "SELECT COUNT(*) FROM aktif_mealler WHERE source <> ?",
    KEEP_SOURCE
  );
  const primaryMismatch = scalar(
    db,
    `SELECT COUNT(*) FROM verses v
     LEFT JOIN translations t ON t.verse_key = v.verse_key AND t.source = ?
     WHERE v.primary_translation IS NOT t.text`,
    KEEP_SOURCE
  );
  const ftsMismatch = scalar(
    db,
    `SELECT COUNT(*) FROM ayet_fts f
     LEFT JOIN translations t ON t.verse_key = f.verse_key AND t.source = ?
     WHERE f.meal IS NOT t.text`,
    KEEP_SOURCE
  );
  return nonYazir === 0 && nonYazirActive === 0 && primaryMismatch === 0 && ftsMismatch === 0;
}

function preflight(db) {
  const present = tableNames(db);
  for (const t of [
    "translations",
    "aktif_mealler",
    "verses",
    "ayet_fts",
    "words",
    "root_meanings",
  ]) {
    if (!present.has(t)) fail(`zorunlu tablo eksik: ${t}`);
  }

  const counts = snapshotCounts(db);
  if (counts.verses !== EXPECTED.verses) fail(`verses ${counts.verses} != ${EXPECTED.verses}`);
  if (counts.words !== EXPECTED.words) fail(`words ${counts.words} != ${EXPECTED.words}`);
  if (counts.rootMeanings !== EXPECTED.rootMeanings)
    fail(`root_meanings ${counts.rootMeanings} != ${EXPECTED.rootMeanings}`);

  // Elmalili kapsami tam ve bosluksuz olmali.
  const yazirVerses = scalar(
    db,
    `SELECT COUNT(DISTINCT verse_key) FROM translations
     WHERE source = ? AND text IS NOT NULL AND TRIM(text) <> ''`,
    KEEP_SOURCE
  );
  if (yazirVerses !== EXPECTED.verses)
    fail(`Elmalili kapsami ${yazirVerses}/${EXPECTED.verses} - eksik meal ile silme yapilamaz`);

  const orphan = scalar(
    db,
    `SELECT COUNT(*) FROM verses v
     WHERE NOT EXISTS (
       SELECT 1 FROM translations t
       WHERE t.verse_key = v.verse_key AND t.source = ?
         AND t.text IS NOT NULL AND TRIM(t.text) <> ''
     )`,
    KEEP_SOURCE
  );
  if (orphan !== 0) fail(`${orphan} ayette Elmalili meali yok`);

  const dupes = scalar(
    db,
    `SELECT COUNT(*) FROM (
       SELECT verse_key FROM translations WHERE source = ?
       GROUP BY verse_key HAVING COUNT(*) > 1)`,
    KEEP_SOURCE
  );
  if (dupes !== 0) fail(`${dupes} ayette birden fazla Elmalili satiri var`);

  return counts;
}

function capturePreimage(db, dbPath) {
  const present = tableNames(db);
  return {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    db: path.resolve(dbPath),
    keepSource: KEEP_SOURCE,
    removedSources: REMOVED_SOURCES,
    translations: db
      .prepare("SELECT id, verse_key, source, text FROM translations WHERE source <> ? ORDER BY id")
      .all(KEEP_SOURCE),
    aktifMealler: db
      .prepare("SELECT source, display_name, aktif, sira FROM aktif_mealler ORDER BY source")
      .all(),
    versesPrimary: db
      .prepare("SELECT verse_key, primary_translation FROM verses ORDER BY verse_key")
      .all(),
    ftsMeal: db.prepare("SELECT verse_key, meal FROM ayet_fts ORDER BY verse_key").all(),
    fidelityComparisons: present.has("fidelity_comparisons")
      ? db
          .prepare(
            `SELECT id, verse_key, surah_id, ayah_number, source_name, text, source_url,
                    status, ayah_status
             FROM fidelity_comparisons WHERE source_name <> ? ORDER BY id`
          )
          .all(KEEP_SOURCE)
      : [],
    fidelitySignals: present.has("fidelity_signals")
      ? db
          .prepare(
            "SELECT id, raw_json FROM fidelity_signals WHERE signal_type = 'fidelity_status' ORDER BY id"
          )
          .all()
      : [],
  };
}

function runForward(db) {
  const present = tableNames(db);
  const stats = {};

  // 1) ONCE primary_translation Elmalili'ya gecirilir.
  stats.primaryUpdated = scalar(
    db,
    `SELECT COUNT(*) FROM verses v
     JOIN translations t ON t.verse_key = v.verse_key AND t.source = ?
     WHERE v.primary_translation IS NOT t.text`,
    KEEP_SOURCE
  );
  db.prepare(
    `UPDATE verses SET primary_translation = (
       SELECT t.text FROM translations t
       WHERE t.verse_key = verses.verse_key AND t.source = ?
     )`
  ).run(KEEP_SOURCE);

  const primaryOk = scalar(
    db,
    `SELECT COUNT(*) FROM verses v
     JOIN translations t ON t.verse_key = v.verse_key AND t.source = ?
     WHERE v.primary_translation IS t.text`,
    KEEP_SOURCE
  );
  if (primaryOk !== EXPECTED.verses)
    fail(`primary_translation ${primaryOk}/${EXPECTED.verses} Elmalili - silmeye gecilmiyor`);

  // 2) FTS meal sutunu Elmalili'ya cekilir (literal/tags dokunulmaz).
  const ftsRows = db
    .prepare(
      `SELECT f.verse_key AS vk, t.text AS txt FROM ayet_fts f
       JOIN translations t ON t.verse_key = f.verse_key AND t.source = ?
       WHERE f.meal IS NOT t.text`
    )
    .all(KEEP_SOURCE);
  stats.ftsUpdated = ftsRows.length;
  const ftsUpdate = db.prepare("UPDATE ayet_fts SET meal = ? WHERE verse_key = ?");
  for (const r of ftsRows) ftsUpdate.run(r.txt, r.vk);

  // 3) aktif_mealler yalniz Elmalili.
  stats.aktifMeallerDeleted = scalar(
    db,
    "SELECT COUNT(*) FROM aktif_mealler WHERE source <> ?",
    KEEP_SOURCE
  );
  db.prepare("DELETE FROM aktif_mealler WHERE source <> ?").run(KEEP_SOURCE);
  db.prepare("UPDATE aktif_mealler SET aktif = 1, sira = 1 WHERE source = ?").run(KEEP_SOURCE);

  // 4) Karsilastirma katmani runtime'dan cikarilir.
  if (present.has("fidelity_comparisons")) {
    stats.fidelityComparisonsDeleted = scalar(
      db,
      "SELECT COUNT(*) FROM fidelity_comparisons WHERE source_name <> ?",
      KEEP_SOURCE
    );
    db.prepare("DELETE FROM fidelity_comparisons WHERE source_name <> ?").run(KEEP_SOURCE);
  }

  // 5) fidelity_signals icindeki kaynak listesi provenance olarak isaretlenir.
  //    Kayit SILINMEZ; yalniz runtime'dan cikarildigi not edilir.
  if (present.has("fidelity_signals")) {
    const rows = db
      .prepare("SELECT id, raw_json FROM fidelity_signals WHERE signal_type = 'fidelity_status'")
      .all();
    const upd = db.prepare("UPDATE fidelity_signals SET raw_json = ? WHERE id = ?");
    let touched = 0;
    for (const row of rows) {
      let parsed;
      try {
        parsed = JSON.parse(row.raw_json);
      } catch {
        continue;
      }
      if (!Array.isArray(parsed.sources)) continue;
      const kept = [];
      const removed = [];
      for (const s of parsed.sources) {
        if (s && s.sourceName === KEEP_SOURCE) {
          kept.push({ ...s, usageClass: "primary", confidence: "high" });
        } else if (s) {
          removed.push({ ...s, status: "removed_from_runtime" });
        }
      }
      if (removed.length === 0) continue;
      upd.run(
        JSON.stringify({
          ...parsed,
          status: "removed_from_runtime",
          sources: kept,
          removedFromRuntimeSources: removed,
          comparisonCount: kept.length,
        }),
        row.id
      );
      touched += 1;
    }
    stats.fidelitySignalsMarked = touched;
  }

  // 6) EN SON diger mealler silinir.
  stats.translationsDeleted = scalar(
    db,
    "SELECT COUNT(*) FROM translations WHERE source <> ?",
    KEEP_SOURCE
  );
  db.prepare("DELETE FROM translations WHERE source <> ?").run(KEEP_SOURCE);

  return stats;
}

function postflight(db, before, beforeChecksum) {
  const after = snapshotCounts(db);

  if (after.translations !== EXPECTED.translationsAfter)
    fail(`translations ${after.translations} != ${EXPECTED.translationsAfter}`);

  const deleted = before.translations - after.translations;
  if (
    before.translations === EXPECTED.translationsBefore &&
    deleted !== EXPECTED.deletedTranslations
  ) {
    fail(`silinen satir ${deleted} != ${EXPECTED.deletedTranslations}`);
  }

  const badSource = scalar(db, "SELECT COUNT(*) FROM translations WHERE source <> ?", KEEP_SOURCE);
  if (badSource !== 0) fail(`${badSource} satir hala Elmalili disi kaynakta`);

  for (const s of REMOVED_SOURCES) {
    if (scalar(db, "SELECT COUNT(*) FROM translations WHERE source = ?", s) !== 0)
      fail(`${s} translations tablosunda kaldi`);
    if (scalar(db, "SELECT COUNT(*) FROM aktif_mealler WHERE source = ?", s) !== 0)
      fail(`${s} aktif_mealler tablosunda kaldi`);
  }

  if (after.aktifMealler !== 1) fail(`aktif_mealler ${after.aktifMealler} != 1`);
  const activeRow = db.prepare("SELECT source, aktif FROM aktif_mealler").get();
  if (activeRow.source !== KEEP_SOURCE || Number(activeRow.aktif) !== 1)
    fail(`aktif meal beklenmedik: ${JSON.stringify(activeRow)}`);

  const primaryOk = scalar(
    db,
    `SELECT COUNT(*) FROM verses v
     JOIN translations t ON t.verse_key = v.verse_key AND t.source = ?
     WHERE v.primary_translation IS t.text`,
    KEEP_SOURCE
  );
  if (primaryOk !== EXPECTED.verses)
    fail(`primary_translation ${primaryOk}/${EXPECTED.verses} Elmalili degil`);

  const ftsOk = scalar(
    db,
    `SELECT COUNT(*) FROM ayet_fts f
     JOIN translations t ON t.verse_key = f.verse_key AND t.source = ?
     WHERE f.meal IS t.text`,
    KEEP_SOURCE
  );
  if (ftsOk !== EXPECTED.verses) fail(`ayet_fts.meal ${ftsOk}/${EXPECTED.verses} Elmalili degil`);

  if (after.verses !== before.verses) fail("verses sayisi degisti");
  if (after.words !== before.words) fail("words sayisi degisti");
  if (after.rootMeanings !== before.rootMeanings) fail("root_meanings sayisi degisti");

  const afterChecksum = offTargetChecksum(db);
  if (afterChecksum !== beforeChecksum)
    fail(`hedef disi alan degisti (checksum ${beforeChecksum} -> ${afterChecksum})`);

  return { after, deleted };
}

function runReverse(db, preimagePath) {
  const pre = JSON.parse(readFileSync(preimagePath, "utf8"));
  const present = tableNames(db);

  db.prepare("DELETE FROM translations WHERE source <> ?").run(KEEP_SOURCE);
  const insT = db.prepare(
    "INSERT INTO translations (id, verse_key, source, text) VALUES (?, ?, ?, ?)"
  );
  for (const r of pre.translations) insT.run(r.id, r.verse_key, r.source, r.text);

  db.prepare("DELETE FROM aktif_mealler").run();
  const insA = db.prepare(
    "INSERT INTO aktif_mealler (source, display_name, aktif, sira) VALUES (?, ?, ?, ?)"
  );
  for (const r of pre.aktifMealler) insA.run(r.source, r.display_name, r.aktif, r.sira);

  const updV = db.prepare("UPDATE verses SET primary_translation = ? WHERE verse_key = ?");
  for (const r of pre.versesPrimary) updV.run(r.primary_translation, r.verse_key);

  const updF = db.prepare("UPDATE ayet_fts SET meal = ? WHERE verse_key = ?");
  for (const r of pre.ftsMeal) updF.run(r.meal, r.verse_key);

  if (present.has("fidelity_comparisons") && pre.fidelityComparisons.length > 0) {
    db.prepare("DELETE FROM fidelity_comparisons WHERE source_name <> ?").run(KEEP_SOURCE);
    const insF = db.prepare(
      `INSERT INTO fidelity_comparisons
       (id, verse_key, surah_id, ayah_number, source_name, text, source_url, status, ayah_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const r of pre.fidelityComparisons)
      insF.run(
        r.id,
        r.verse_key,
        r.surah_id,
        r.ayah_number,
        r.source_name,
        r.text,
        r.source_url,
        r.status,
        r.ayah_status
      );
  }

  if (present.has("fidelity_signals")) {
    const updS = db.prepare("UPDATE fidelity_signals SET raw_json = ? WHERE id = ?");
    for (const r of pre.fidelitySignals) updS.run(r.raw_json, r.id);
  }

  return {
    translations: scalar(db, "SELECT COUNT(*) FROM translations"),
    aktifMealler: scalar(db, "SELECT COUNT(*) FROM aktif_mealler"),
  };
}

function main() {
  const args = parseArgs(process.argv);
  const dbPath = path.resolve(args.db);
  log(`[migrate-elmalili-only] db=${dbPath} mode=${args.mode}`);

  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA busy_timeout=10000;");

  try {
    if (args.mode === "reverse") {
      if (!args.preimage) fail("--reverse icin --preimage zorunlu");
      db.exec("BEGIN IMMEDIATE");
      try {
        const res = runReverse(db, args.preimage);
        db.exec("COMMIT");
        log(`[reverse] geri yuklendi: ${JSON.stringify(res)}`);
      } catch (err) {
        db.exec("ROLLBACK");
        throw err;
      }
      return;
    }

    if (isAlreadyMigrated(db)) {
      log("[no-op] Migration zaten uygulanmis; degisiklik yapilmadi.");
      log(JSON.stringify(snapshotCounts(db), null, 2));
      return;
    }

    const before = preflight(db);
    const beforeChecksum = offTargetChecksum(db);
    log(`[preflight] OK translations=${before.translations} checksum=${beforeChecksum.slice(0, 16)}`);

    // Pre-image her zaman (dry-run dahil) yazilir; reverse icin tek kaynaktir.
    const preimage = capturePreimage(db, dbPath);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const preimageDir = path.resolve("backups");
    mkdirSync(preimageDir, { recursive: true });
    const preimagePath = path.join(
      preimageDir,
      `elmalili-preimage-${path.basename(dbPath, ".db")}-${stamp}.json`
    );
    writeFileSync(preimagePath, JSON.stringify(preimage), "utf8");
    log(`[preimage] ${preimagePath} (${preimage.translations.length} meal satiri)`);

    db.exec("BEGIN IMMEDIATE");
    try {
      const stats = runForward(db);
      const result = postflight(db, before, beforeChecksum);

      log(`[stats] ${JSON.stringify(stats, null, 2)}`);
      log(`[after] ${JSON.stringify(result.after, null, 2)}`);
      log(`[deleted] ${result.deleted} satir`);

      if (args.mode === "apply") {
        db.exec("COMMIT");
        log("[apply] COMMIT - migration uygulandi.");
      } else {
        db.exec("ROLLBACK");
        log("[dry-run] ROLLBACK - tum kontroller gecti, veritabani degismedi.");
      }
    } catch (err) {
      db.exec("ROLLBACK");
      log(`[rollback] ${err.message}`);
      throw err;
    }
  } finally {
    db.close();
  }
}

main();
