#!/usr/bin/env node
/**
 * Asama 1 — dogrulanmis 4 `words.root` hucresini guard'li doldurur.
 *
 * Yalniz bu 4 hucre; lemma'ya ve mevcut non-NULL degerlere DOKUNMAZ.
 * Guard: her UPDATE `AND (root IS NULL OR TRIM(root)='')` ile korunur, yani
 * calisma aninda dolu bulunan hucre asla ezilmez.
 *
 * Kullanim:
 *   node scripts/morphology/migrate-root-backfill-4.mjs --db <path> --dry-run
 *   node scripts/morphology/migrate-root-backfill-4.mjs --db <path> --apply
 *   node scripts/morphology/migrate-root-backfill-4.mjs --db <path> --reverse
 */

import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import path from "node:path";

const TARGETS = [
  { id: 1147, verseKey: "2:72", wordIndex: 9, root: "كون", lemma: "كانَ" },
  { id: 33539, verseKey: "15:7", wordIndex: 4, root: "ملك", lemma: "مَلَك" },
  { id: 33541, verseKey: "15:7", wordIndex: 6, root: "كون", lemma: "كانَ" },
  { id: 48685, verseKey: "27:20", wordIndex: 10, root: "كون", lemma: "كانَ" },
];

const EXPECTED = {
  words: 77433,
  verses: 6236,
  rootMeanings: 1703,
  nullRootBefore: 26918,
  nullRootAfter: 26914,
  nullLemma: 2668,
};

const UNIT = String.fromCharCode(31);
const REC = String.fromCharCode(30);
const log = (...m) => console.log(...m);
const fail = (m) => {
  throw new Error("FAIL-CLOSED: " + m);
};

const args = { db: "data/app.db", mode: "dry-run" };
for (let i = 2; i < process.argv.length; i += 1) {
  const v = process.argv[i];
  if (v === "--db") args.db = process.argv[++i];
  else if (v === "--apply") args.mode = "apply";
  else if (v === "--dry-run") args.mode = "dry-run";
  else if (v === "--reverse") args.mode = "reverse";
  else throw new Error("Bilinmeyen arguman: " + v);
}

const scalar = (db, sql, ...a) => {
  const r = db.prepare(sql).get(...a);
  return r ? Object.values(r)[0] : null;
};

const nullRoot = (db) => scalar(db, "SELECT COUNT(*) FROM words WHERE root IS NULL OR TRIM(root)=''");
const nullLemma = (db) => scalar(db, "SELECT COUNT(*) FROM words WHERE lemma IS NULL OR TRIM(lemma)=''");

/** words tablosunun root/lemma DISINDAKI her seyinin ozeti. */
function offTargetDigest(db) {
  const h = createHash("sha256");
  let n = 0;
  for (const row of db
    .prepare(
      "SELECT id, verse_key, word_index, segment_index, arabic, pos, morphology, meaning_tr, gloss_en, confidence, source, role FROM words ORDER BY id"
    )
    .iterate()) {
    for (const v of Object.values(row)) {
      h.update(v === null ? "NULL" : String(v));
      h.update(UNIT);
    }
    h.update(REC);
    n += 1;
  }
  return n + ":" + h.digest("hex");
}

/** Hedef 4 satir DISINDAKI tum root/lemma degerlerinin ozeti. */
function otherRootLemmaDigest(db) {
  const ids = new Set(TARGETS.map((t) => t.id));
  const h = createHash("sha256");
  let n = 0;
  for (const row of db.prepare("SELECT id, root, lemma FROM words ORDER BY id").iterate()) {
    if (ids.has(row.id)) continue;
    h.update(String(row.id));
    h.update(row.root === null ? "NULL" : String(row.root));
    h.update(UNIT);
    h.update(row.lemma === null ? "NULL" : String(row.lemma));
    h.update(REC);
    n += 1;
  }
  return n + ":" + h.digest("hex");
}

function main() {
    const db = new DatabaseSync(path.resolve(args.db));
    db.exec("PRAGMA busy_timeout=10000;");

    try {
      log("[root-backfill-4] db=" + path.resolve(args.db) + " mode=" + args.mode);

    if (args.mode === "reverse") {
      db.exec("BEGIN IMMEDIATE");
      try {
        let n = 0;
        for (const t of TARGETS) {
          const r = db.prepare("UPDATE words SET root=NULL WHERE id=? AND root=?").run(t.id, t.root);
          n += r.changes;
        }
        db.exec("COMMIT");
        log("[reverse] NULL'a dondurulen: " + n + " | NULL root=" + nullRoot(db) + " NULL lemma=" + nullLemma(db));
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
      return;
    }

    // ── Idempotency: hepsi zaten dolu ve beklenen degerdeyse no-op ──
    const already = TARGETS.filter((t) => {
      const w = db.prepare("SELECT root FROM words WHERE id=?").get(t.id);
      return w && String(w.root ?? "").trim() === t.root;
    }).length;
    if (already === TARGETS.length) {
      log("[no-op] 4 hucre zaten beklenen degerde; degisiklik yapilmadi.");
      log("  NULL root=" + nullRoot(db) + " NULL lemma=" + nullLemma(db));
      return;
    }
    if (already !== 0) fail(`kismi durum: ${already}/4 hucre dolu — elle inceleme gerekir`);

    // ── Preflight ──
    if (scalar(db, "SELECT COUNT(*) FROM words") !== EXPECTED.words) fail("words sayisi");
    if (scalar(db, "SELECT COUNT(*) FROM verses") !== EXPECTED.verses) fail("verses sayisi");
    if (scalar(db, "SELECT COUNT(*) FROM root_meanings") !== EXPECTED.rootMeanings) fail("root_meanings sayisi");
    const nrBefore = nullRoot(db);
    const nlBefore = nullLemma(db);
    if (nrBefore !== EXPECTED.nullRootBefore) fail(`NULL root ${nrBefore} != ${EXPECTED.nullRootBefore}`);
    if (nlBefore !== EXPECTED.nullLemma) fail(`NULL lemma ${nlBefore} != ${EXPECTED.nullLemma}`);

    for (const t of TARGETS) {
      const w = db.prepare("SELECT verse_key, word_index, root, lemma FROM words WHERE id=?").get(t.id);
      if (!w) fail(`id=${t.id} yok`);
      if (w.verse_key !== t.verseKey || w.word_index !== t.wordIndex)
        fail(`id=${t.id} konum uyusmuyor (${w.verse_key} w${w.word_index})`);
      if (!(w.root === null || String(w.root).trim() === "")) fail(`id=${t.id} root NULL degil: ${w.root}`);
      if (String(w.lemma ?? "").trim() !== t.lemma) fail(`id=${t.id} lemma beklenenden farkli: ${w.lemma}`);
      if (/[A-Za-z]/.test(t.root)) fail(`id=${t.id} root ASCII iceriyor`);
    }

    const offBefore = offTargetDigest(db);
    const otherBefore = otherRootLemmaDigest(db);
    log("[preflight] OK  NULL root=" + nrBefore + " NULL lemma=" + nlBefore);

    db.exec("BEGIN IMMEDIATE");
    try {
      let changed = 0;
      for (const t of TARGETS) {
        const r = db
          .prepare("UPDATE words SET root=? WHERE id=? AND (root IS NULL OR TRIM(root)='')")
          .run(t.root, t.id);
        changed += r.changes;
      }
      if (changed !== TARGETS.length) fail(`guard'li UPDATE ${changed}/4 satir etkiledi`);

      // ── Postflight ──
      const nrAfter = nullRoot(db);
      const nlAfter = nullLemma(db);
      if (nrAfter !== EXPECTED.nullRootAfter) fail(`NULL root ${nrAfter} != ${EXPECTED.nullRootAfter}`);
      if (nlAfter !== EXPECTED.nullLemma) fail(`NULL lemma ${nlAfter} degisti`);
      if (scalar(db, "SELECT COUNT(*) FROM words") !== EXPECTED.words) fail("words sayisi degisti");
      if (offTargetDigest(db) !== offBefore) fail("words'un root/lemma disi alanlari degisti");
      if (otherRootLemmaDigest(db) !== otherBefore) fail("hedef disi root/lemma degeri degisti");
      const integrity = scalar(db, "PRAGMA integrity_check");
      if (String(integrity) !== "ok") fail("integrity_check: " + integrity);

      log(`[stats] guncellenen: ${changed} | NULL root ${nrBefore} -> ${nrAfter} | NULL lemma ${nlAfter} (degismedi)`);
      log("[integrity_check] " + integrity);
      log("[hedef disi] words diger alanlar: DEGISMEDI | diger root/lemma: DEGISMEDI");

      if (args.mode === "apply") {
        db.exec("COMMIT");
        log("[apply] COMMIT");
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
