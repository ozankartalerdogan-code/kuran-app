#!/usr/bin/env node
/**
 * Asama 2 — ham QAC-turevi `morfoloji` tablosunu runtime DB'den kaldirir.
 *
 * Canonical `words` morfolojisine, meal/tefsir/tecvid katmanlarina DOKUNMAZ.
 *
 * Guvenlik:
 *  - DROP oncesi tablonun TAMAMI hash'li provenance artefaktina yazilir.
 *  - Artefakt geri okunur; satir sayisi ve SHA-256 dogrulanmadan DROP yapilmaz.
 *  - Hedef disi tablolar checksum ile korunur; sapmada ROLLBACK.
 *  - Ikinci calistirma no-op.
 *
 * Kullanim:
 *   node scripts/morphology/migrate-drop-morfoloji.mjs --db <path> --dry-run
 *   node scripts/morphology/migrate-drop-morfoloji.mjs --db <path> --apply
 *   node scripts/morphology/migrate-drop-morfoloji.mjs --db <path> --reverse --artifact <path>
 */

import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";

const TABLE = "morfoloji";
const EXPECTED = { rows: 130030, words: 77433, verses: 6236, rootMeanings: 1703, translations: 6236 };

const OFF_TARGET_TABLES = [
  "words",
  "root_meanings",
  "tajweed_spans",
  "surah_tafsir",
  "translations",
  "aktif_mealler",
  "context_notes",
  "quran_verse_metadata",
  "verse_tags",
  "verse_tag_items",
];

const UNIT = String.fromCharCode(31);
const REC = String.fromCharCode(30);
const log = (...m) => console.log(...m);
const fail = (m) => {
  throw new Error("FAIL-CLOSED: " + m);
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

const scalar = (db, sql, ...a) => {
  const r = db.prepare(sql).get(...a);
  return r ? Object.values(r)[0] : null;
};

const tableNames = (db) =>
  new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name));

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
  const present = tableNames(db);
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
  h.update("verses=" + digestRows(db, "SELECT * FROM verses ORDER BY verse_key") + "\n");
  return h.digest("hex");
}

function counts(db) {
  const present = tableNames(db);
  return {
    morfoloji: present.has(TABLE) ? scalar(db, "SELECT COUNT(*) FROM " + TABLE) : null,
    words: scalar(db, "SELECT COUNT(*) FROM words"),
    verses: scalar(db, "SELECT COUNT(*) FROM verses"),
    rootMeanings: scalar(db, "SELECT COUNT(*) FROM root_meanings"),
    translations: scalar(db, "SELECT COUNT(*) FROM translations"),
    tajweedSpans: scalar(db, "SELECT COUNT(*) FROM tajweed_spans"),
  };
}

function main() {
  const args = parseArgs(process.argv);
  const dbPath = path.resolve(args.db);
  log("[drop-morfoloji] db=" + dbPath + " mode=" + args.mode);

  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA busy_timeout=10000;");

  try {
    if (args.mode === "reverse") {
      if (!args.artifact) fail("--reverse icin --artifact zorunlu");
      const art = JSON.parse(readFileSync(args.artifact, "utf8"));
      if (tableNames(db).has(TABLE)) fail(TABLE + " tablosu zaten var");
      db.exec("BEGIN IMMEDIATE");
      try {
        db.exec(art.createSql);
        const ins = db.prepare(
          "INSERT INTO " + TABLE + " (sure, ayet, kelime_sira, segment, arapca, tag, kok, lemma, features) VALUES (?,?,?,?,?,?,?,?,?)"
        );
        for (const r of art.rows)
          ins.run(r.sure, r.ayet, r.kelime_sira, r.segment, r.arapca, r.tag, r.kok, r.lemma, r.features);
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
      const n = scalar(db, "SELECT COUNT(*) FROM " + TABLE);
      log("[reverse] geri yuklenen satir: " + n);
      if (n !== art.rowCount) fail("geri yukleme " + n + " != " + art.rowCount);
      return;
    }

    if (!tableNames(db).has(TABLE)) {
      log("[no-op] " + TABLE + " tablosu zaten yok; degisiklik yapilmadi.");
      log(JSON.stringify(counts(db), null, 2));
      return;
    }

    // ── Preflight ──
    const before = counts(db);
    if (before.morfoloji !== EXPECTED.rows) fail(TABLE + " satir " + before.morfoloji);
    if (before.words !== EXPECTED.words) fail("words " + before.words);
    if (before.verses !== EXPECTED.verses) fail("verses " + before.verses);
    if (before.rootMeanings !== EXPECTED.rootMeanings) fail("root_meanings " + before.rootMeanings);
    if (before.translations !== EXPECTED.translations) fail("translations " + before.translations);

    const beforeChecksum = offTargetChecksum(db);
    log("[preflight] OK " + JSON.stringify(before));

    // ── Provenance artefakti ──
    const createSql = scalar(db, "SELECT sql FROM sqlite_master WHERE type='table' AND name=?", TABLE);
    const rows = db
      .prepare("SELECT sure, ayet, kelime_sira, segment, arapca, tag, kok, lemma, features FROM " + TABLE + " ORDER BY sure, ayet, kelime_sira, segment")
      .all();
    const payload = {
      schemaVersion: 1,
      capturedAt: new Date().toISOString(),
      db: dbPath,
      table: TABLE,
      runtimeStatus: "removed_from_runtime",
      note:
        "Ham QAC-turevi segment duzeyi morfoloji tablosu. Runtime'dan kaldirildi; canonical `words` morfolojisi tek kaynaktir. Kayit yalniz kaynak gecmisi ve olasi yeniden uretim icin saklanir.",
      createSql,
      rowCount: rows.length,
      rows,
    };
    const body = JSON.stringify(payload);
    const sha256 = createHash("sha256").update(body).digest("hex");

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    mkdirSync(path.resolve("backups"), { recursive: true });
    const artPath = path.join(path.resolve("backups"), "morfoloji-provenance-" + path.basename(dbPath, ".db") + "-" + stamp + ".json");
    writeFileSync(artPath, body, "utf8");

    // Geri okuyup dogrula — hash VE satir sayisi.
    const back = readFileSync(artPath, "utf8");
    if (createHash("sha256").update(back).digest("hex") !== sha256) fail("artefakt hash uyusmazligi");
    const parsed = JSON.parse(back);
    if (parsed.rowCount !== EXPECTED.rows) fail("artefakt satir " + parsed.rowCount);
    if (parsed.rows.length !== EXPECTED.rows) fail("artefakt rows dizisi " + parsed.rows.length);
    if (!parsed.createSql || !parsed.createSql.includes(TABLE)) fail("artefakt createSql eksik");
    log("[artefakt] " + artPath);
    log("[artefakt] sha256=" + sha256);
    log("[artefakt] satir=" + parsed.rowCount + " (geri okundu ve dogrulandi)");

    db.exec("BEGIN IMMEDIATE");
    try {
      db.exec("DROP TABLE " + TABLE);

      // ── Postflight ──
      if (tableNames(db).has(TABLE)) fail(TABLE + " hala mevcut");
      const after = counts(db);
      if (after.words !== before.words) fail("words degisti");
      if (after.verses !== before.verses) fail("verses degisti");
      if (after.rootMeanings !== before.rootMeanings) fail("root_meanings degisti");
      if (after.translations !== before.translations) fail("translations degisti");
      if (after.tajweedSpans !== before.tajweedSpans) fail("tajweed_spans degisti");
      if (offTargetChecksum(db) !== beforeChecksum) fail("hedef disi tablo degisti");
      const integrity = scalar(db, "PRAGMA integrity_check");
      if (String(integrity) !== "ok") fail("integrity_check: " + integrity);

      log("[after] " + JSON.stringify(after));
      log("[integrity_check] " + integrity);

      if (args.mode === "apply") {
        db.exec("COMMIT");
        log("[apply] COMMIT — " + EXPECTED.rows + " satirlik " + TABLE + " kaldirildi.");
        log("[rollback] node scripts/morphology/migrate-drop-morfoloji.mjs --db " + args.db + " --reverse --artifact " + artPath);
      } else {
        db.exec("ROLLBACK");
        log("[dry-run] ROLLBACK — kontroller gecti, veritabani degismedi.");
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
