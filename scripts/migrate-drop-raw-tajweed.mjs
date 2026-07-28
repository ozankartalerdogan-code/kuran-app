#!/usr/bin/env node
/**
 * Ham AlQuran.cloud tecvid markup'ini (verses.arabic_tajweed) runtime DB'den kaldirir.
 * Uretilmis canonical tajweed_spans sistemine DOKUNMAZ.
 *
 * Guvenlik:
 *  - Silmeden ONCE ham alan, hash'li provenance artefaktina disari yazilir.
 *  - Artefakt geri okunup dogrulanmadan DROP COLUMN yapilmaz.
 *  - tajweed_spans, canonical arabic_text, meal, tefsir, kelime anlami ve
 *    morfoloji alanlari checksum ile korunur; sapmada ROLLBACK.
 *  - Ikinci calistirma no-op.
 *
 * Kullanim:
 *   node scripts/migrate-drop-raw-tajweed.mjs --db <path> --dry-run
 *   node scripts/migrate-drop-raw-tajweed.mjs --db <path> --apply
 *   node scripts/migrate-drop-raw-tajweed.mjs --db <path> --reverse --artifact <path>
 */

import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";

const COLUMN = "arabic_tajweed";
const EXPECTED = {
  verses: 6236,
  words: 77433,
  rootMeanings: 1703,
  tajweedSpans: 64196,
  overrideSpans: 23,
  overrideVerses: 14,
};

const OFF_TARGET_TABLES = [
  "words",
  "root_meanings",
  "tajweed_spans",
  "surah_tafsir",
  "translations",
  "aktif_mealler",
  "context_notes",
  "quran_verse_metadata",
];
const OFF_TARGET_VERSE_COLUMNS = [
  "arabic_text",
  "primary_translation",
  "literal_ceviri",
  "reading_tr",
  "ham_anlam_ozeti",
  "fark_analizi",
  "temalar",
];

const UNIT = String.fromCharCode(31);
const REC = String.fromCharCode(30);

const log = (...m) => console.log(...m);
const fail = (msg) => {
  throw new Error("FAIL-CLOSED: " + msg);
};

function parseArgs(argv) {
  const a = { db: "data/app.db", mode: "dry-run", artifact: null };
  for (let i = 2; i < argv.length; i += 1) {
    const v = argv[i];
    if (v === "--db") a.db = argv[++i];
    else if (v === "--apply") a.mode = "apply";
    else if (v === "--dry-run") a.mode = "dry-run";
    else if (v === "--reverse") a.mode = "reverse";
    else if (v === "--artifact") a.artifact = argv[++i];
    else throw new Error("Bilinmeyen arguman: " + v);
  }
  return a;
}

const scalar = (db, sql, ...args) => {
  const row = db.prepare(sql).get(...args);
  return row ? Object.values(row)[0] : null;
};

function hasColumn(db, table, column) {
  return db
    .prepare("PRAGMA table_info(" + table + ")")
    .all()
    .some((c) => c.name === column);
}

function digestRows(db, sql) {
  const h = createHash("sha256");
  let n = 0;
  for (const row of db.prepare(sql).iterate()) {
    for (const v of Object.values(row)) {
      h.update(v === null ? "NULL" : String(v));
      h.update(UNIT);
    }
    h.update(REC);
    n += 1;
  }
  return n + ":" + h.digest("hex");
}

function offTargetChecksum(db) {
  const present = new Set(
    db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name)
  );
  const h = createHash("sha256");
  for (const t of OFF_TARGET_TABLES) {
    if (!present.has(t)) continue;
    const cols = db
      .prepare("PRAGMA table_info(" + t + ")")
      .all()
      .map((c) => '"' + c.name + '"')
      .sort();
    const list = cols.join(", ");
    h.update(t + "=" + digestRows(db, "SELECT " + list + " FROM " + t + " ORDER BY " + list) + "\n");
  }
  const vc = OFF_TARGET_VERSE_COLUMNS.map((c) => '"' + c + '"').join(", ");
  h.update(
    "verses=" + digestRows(db, "SELECT verse_key, " + vc + " FROM verses ORDER BY verse_key") + "\n"
  );
  return h.digest("hex");
}

function counts(db) {
  return {
    verses: scalar(db, "SELECT COUNT(*) FROM verses"),
    words: scalar(db, "SELECT COUNT(*) FROM words"),
    rootMeanings: scalar(db, "SELECT COUNT(*) FROM root_meanings"),
    tajweedSpans: scalar(db, "SELECT COUNT(*) FROM tajweed_spans"),
    spanVerses: scalar(db, "SELECT COUNT(DISTINCT verse_key) FROM tajweed_spans"),
    rawFilled: hasColumn(db, "verses", COLUMN)
      ? scalar(db, "SELECT COUNT(*) FROM verses WHERE " + COLUMN + " IS NOT NULL AND TRIM(" + COLUMN + ") <> ''")
      : null,
  };
}

function overrideCheck(db, overridesPath) {
  const raw = JSON.parse(readFileSync(overridesPath, "utf8"));
  const verses = new Set();
  let present = 0;
  for (const o of raw.overrides) {
    const key = o.surahId + ":" + o.ayahNumber;
    verses.add(key);
    const n = scalar(
      db,
      "SELECT COUNT(*) FROM tajweed_spans WHERE verse_key=? AND start_cp=? AND end_cp=? AND rule=? AND color=?",
      key,
      o.startCp,
      o.endCp,
      o.rule,
      o.color
    );
    if (n > 0) present += 1;
  }
  return { spans: raw.overrides.length, verses: verses.size, present };
}

function preflight(db, overridesPath) {
  const c = counts(db);
  if (c.verses !== EXPECTED.verses) fail("verses " + c.verses);
  if (c.words !== EXPECTED.words) fail("words " + c.words);
  if (c.rootMeanings !== EXPECTED.rootMeanings) fail("root_meanings " + c.rootMeanings);
  if (c.tajweedSpans !== EXPECTED.tajweedSpans) fail("tajweed_spans " + c.tajweedSpans);

  const ov = overrideCheck(db, overridesPath);
  if (ov.spans !== EXPECTED.overrideSpans) fail("override span " + ov.spans);
  if (ov.verses !== EXPECTED.overrideVerses) fail("override ayet " + ov.verses);
  if (ov.present !== EXPECTED.overrideSpans)
    fail("override span DB'de eksik: " + ov.present + "/" + ov.spans);

  return { counts: c, overrides: ov };
}

function exportArtifact(db, dbPath) {
  const rows = db
    .prepare("SELECT verse_key, " + COLUMN + " AS raw FROM verses ORDER BY verse_key")
    .all();
  const payload = {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    db: path.resolve(dbPath),
    column: "verses." + COLUMN,
    note:
      "AlQuran.cloud ham tecvid markup'i. Runtime DB'den kaldirildi; yalniz build/audit girdisi ve provenance kaniti olarak saklanir.",
    rowCount: rows.length,
    rows,
  };
  const body = JSON.stringify(payload);
  return { payload, body, sha256: createHash("sha256").update(body).digest("hex") };
}

function postflight(db, before, beforeChecksum) {
  if (hasColumn(db, "verses", COLUMN)) fail(COLUMN + " sutunu hala mevcut");

  const c = counts(db);
  if (c.verses !== before.counts.verses) fail("verses degisti");
  if (c.words !== before.counts.words) fail("words degisti");
  if (c.rootMeanings !== before.counts.rootMeanings) fail("root_meanings degisti");
  if (c.tajweedSpans !== before.counts.tajweedSpans) fail("tajweed_spans degisti");
  if (c.spanVerses !== before.counts.spanVerses) fail("span ayet sayisi degisti");

  const after = offTargetChecksum(db);
  if (after !== beforeChecksum) fail("hedef disi alan degisti");

  const integrity = scalar(db, "PRAGMA integrity_check");
  if (String(integrity) !== "ok") fail("integrity_check: " + integrity);

  return { counts: c, integrity };
}

function main() {
  const args = parseArgs(process.argv);
  const dbPath = path.resolve(args.db);
  const overridesPath = path.resolve("data/tajweed-span-overrides.json");
  log("[drop-raw-tajweed] db=" + dbPath + " mode=" + args.mode);

  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA busy_timeout=10000;");

  try {
    if (args.mode === "reverse") {
      if (!args.artifact) fail("--reverse icin --artifact zorunlu");
      const art = JSON.parse(readFileSync(args.artifact, "utf8"));
      if (hasColumn(db, "verses", COLUMN)) {
        log("[reverse] sutun zaten var; yalniz degerler yazilacak");
      } else {
        db.exec("ALTER TABLE verses ADD COLUMN " + COLUMN + " TEXT");
      }
      const upd = db.prepare("UPDATE verses SET " + COLUMN + " = ? WHERE verse_key = ?");
      let n = 0;
      db.exec("BEGIN IMMEDIATE");
      try {
        for (const r of art.rows) {
          upd.run(r.raw, r.verse_key);
          n += 1;
        }
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
      log("[reverse] geri yuklenen satir: " + n);
      return;
    }

    if (!hasColumn(db, "verses", COLUMN)) {
      log("[no-op] " + COLUMN + " sutunu zaten yok; degisiklik yapilmadi.");
      log(JSON.stringify(counts(db), null, 2));
      return;
    }

    const before = preflight(db, overridesPath);
    const beforeChecksum = offTargetChecksum(db);
    log("[preflight] OK " + JSON.stringify(before.counts));
    log("[preflight] override " + before.overrides.present + "/" + before.overrides.spans + " span, " + before.overrides.verses + " ayet");

    const art = exportArtifact(db, dbPath);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    mkdirSync(path.resolve("backups"), { recursive: true });
    const artPath = path.join(
      path.resolve("backups"),
      "raw-tajweed-provenance-" + path.basename(dbPath, ".db") + "-" + stamp + ".json"
    );
    writeFileSync(artPath, art.body, "utf8");

    const verify = readFileSync(artPath, "utf8");
    const verifySha = createHash("sha256").update(verify).digest("hex");
    if (verifySha !== art.sha256) fail("artefakt geri okuma hash uyusmazligi");
    const parsed = JSON.parse(verify);
    if (parsed.rowCount !== EXPECTED.verses) fail("artefakt satir sayisi " + parsed.rowCount);
    const nonEmpty = parsed.rows.filter((r) => r.raw !== null && String(r.raw).trim() !== "").length;
    log("[artefakt] " + artPath);
    log("[artefakt] sha256=" + art.sha256);
    log("[artefakt] satir=" + parsed.rowCount + " dolu=" + nonEmpty);

    db.exec("BEGIN IMMEDIATE");
    try {
      db.exec("ALTER TABLE verses DROP COLUMN " + COLUMN);
      const result = postflight(db, before, beforeChecksum);
      log("[after] " + JSON.stringify(result.counts));
      log("[integrity_check] " + result.integrity);

      if (args.mode === "apply") {
        db.exec("COMMIT");
        log("[apply] COMMIT - ham tecvid alani kaldirildi.");
        log("[rollback] node scripts/migrate-drop-raw-tajweed.mjs --db " + args.db + " --reverse --artifact " + artPath);
      } else {
        db.exec("ROLLBACK");
        log("[dry-run] ROLLBACK - tum kontroller gecti, veritabani degismedi.");
      }
    } catch (e) {
      db.exec("ROLLBACK");
      log("[rollback] " + e.message);
      throw e;
    }
  } finally {
    db.close();
  }
}

main();
