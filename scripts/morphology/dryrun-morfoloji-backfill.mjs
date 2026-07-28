#!/usr/bin/env node
/**
 * SALT-OKUNUR dry-run: ham `morfoloji` tablosundan `words.lemma` / `words.root`
 * NULL hucrelerine backfill adaylarini cikarir ve dogrular.
 *
 * HICBIR YAZMA YAPMAZ. DB read-only acilir; Turso'ya dokunulmaz.
 * Ciktilar backups/ altina yazilir (aday CSV/JSON, pre-image, forward/reverse SQL).
 *
 * Kullanim: node scripts/morphology/dryrun-morfoloji-backfill.mjs
 */

import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1"), "../..");
const DB = path.join(REPO, "data", "app.db");
const OUT = path.join(REPO, "backups", "morfoloji-backfill-dryrun-" + new Date().toISOString().replace(/[:.]/g, "-"));

// ── Normalizasyon ────────────────────────────────────────────────────────────
// Arapca token karsilastirmasi icin: NFC + tatweel at + Kur'an anotasyon
// isaretlerini (waqf/secde vb.) at. Hareke KORUNUR; yalniz gorsel/anotasyon
// gurultusu temizlenir.
const QURANIC_ANNOTATION = /[ؐ-ؚۖ-ࣰۭ-ࣿ]/gu;
const norm = (v) =>
  String(v ?? "")
    .normalize("NFC")
    .replace(/ـ/gu, "")
    .replace(QURANIC_ANNOTATION, "")
    .replace(/\s+/gu, "")
    .trim();

/**
 * Harf iskeleti — mushafCompat.ts'teki `letterSkeleton` ile ayni teknik.
 * NFC + tum birlesen isaretler (Mn) ve format karakterleri (Cf) atilir; elif
 * varyantlari duz elife eslenir.
 *
 * GEREKCE: `words.arabic` canonical Tanzil imlasini, `morfoloji.arapca` ise QAC
 * imlasini tasir; ayni token iki kaynakta farkli sukun/quiescence isaretleriyle
 * yazilir (orn. U+06E1 vs U+0652). Bu fark kelimenin kimligini degistirmez.
 * Backfill yalniz SOZLUK degeri (lemma/root) tasidigi, yuzey metni tasimadigi
 * icin kimlik dogrulamasi harf iskeleti uzerinden yapilir; tam imla esitligi
 * ayrica `exact_surface` olarak kaydedilir.
 */
const skeleton = (v) =>
  String(v ?? "")
    .normalize("NFC")
    .replace(/[\p{Mn}\p{Cf}ـ]/gu, "")
    .replace(/[ٱٲٳٵ]/gu, "ا")
    .replace(/\s+/gu, "")
    .trim();

// Pipe'li bilesik degerin ilk parcasi (adapter ile ayni kural).
const firstPart = (v) => {
  if (!v) return null;
  const p = String(v).split("|")[0].trim();
  return p.length > 0 ? p : null;
};

// Buckwalter / ASCII sizintisi: Arapca alanda latin harf veya BW noktalama.
const hasAsciiLeak = (v) => /[A-Za-z]/.test(String(v)) || /[*$&<>{}\\^`~]/.test(String(v));
const isArabicOnly = (v) => /^[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]+$/u.test(String(v).replace(/\s/gu, ""));

const db = new DatabaseSync(DB, { readOnly: true });

// ── Korumali kayitlar: bilincli olarak NULL yapilmis root'lar ────────────────
const protectedRootIds = new Set();
const pnPre = path.join(REPO, "data/candidates/morphology/final-v1_8/surgical-v1_8/proper-name-root-null-pre-image.json");
if (existsSync(pnPre)) {
  const pre = JSON.parse(readFileSync(pnPre, "utf8"));
  const rows = Array.isArray(pre) ? pre : (pre.targets ?? pre.rows ?? Object.values(pre));
  for (const r of rows) {
    const id = r?.db_id ?? r?.id ?? r?.words_id;
    if (Number.isInteger(id)) protectedRootIds.add(id);
  }
}

// ── 37:130 sozlesmesi ve v1.9/v1.10 duzeltmeleri ─────────────────────────────
const contractCells = new Map(); // "verse_key|word_index|column" -> beklenen deger
for (const rel of [
  "data/candidates/morphology/surgical-v1_10/batch-a-37-130/field-change-manifest.json",
  "data/candidates/morphology/surgical-v1_10/batch-a-37-130-lemma-normalization/field-change-manifest.json",
  "data/candidates/morphology/token-realign-v1_9/field-change-manifest.json",
]) {
  const p = path.join(REPO, rel);
  if (!existsSync(p)) continue;
  const m = JSON.parse(readFileSync(p, "utf8"));
  for (const c of Array.isArray(m) ? m : Object.values(m)) {
    if (!c || !c.verse_key || !c.column) continue;
    contractCells.set(`${c.verse_key}|${c.word_index}|${c.column}`, c.after);
  }
}

// ── Kaynak veri ──────────────────────────────────────────────────────────────
const words = db
  .prepare("SELECT id, verse_key, word_index, arabic, root, lemma, pos FROM words ORDER BY id")
  .all();

const morph = new Map(); // "sure:ayet:kelime" -> segment listesi
for (const r of db
  .prepare("SELECT sure, ayet, kelime_sira, segment, arapca, tag, kok, lemma FROM morfoloji ORDER BY sure, ayet, kelime_sira, segment")
  .iterate()) {
  const k = `${r.sure}:${r.ayet}:${r.kelime_sira}`;
  const list = morph.get(k) ?? [];
  list.push(r);
  morph.set(k, list);
}

const isNull = (v) => v === null || String(v).trim() === "";

const accepted = [];
const manual = [];
const rejected = [];

for (const w of words) {
  const [surah, ayah] = w.verse_key.split(":").map(Number);
  const key = `${surah}:${ayah}:${w.word_index}`;
  const segs = morph.get(key);

  for (const column of ["lemma", "root"]) {
    const current = column === "lemma" ? w.lemma : w.root;
    if (!isNull(current)) continue; // mevcut non-NULL degere ASLA dokunulmaz

    const rec = {
      words_id: w.id,
      verse_key: w.verse_key,
      word_index: w.word_index,
      column,
      before: null,
      after: null,
      arabic_words: w.arabic,
      arabic_morfoloji: null,
      pos: w.pos,
      segments: segs ? segs.length : 0,
      reason: null,
    };

    // G1 — kesin verse_key + word_index eslesmesi
    if (!segs) {
      rec.reason = "morfoloji'de eslesen kelime pozisyonu yok";
      rejected.push(rec);
      continue;
    }

    // G2 — bilincli NULL yapilmis root'u geri ekleme
    if (column === "root" && protectedRootIds.has(w.id)) {
      rec.reason = "v1.8 proper-name/Yesrib root-NULL karari korunuyor";
      rejected.push(rec);
      continue;
    }

    // G3 — v1.9/v1.10 sozlesme hucresi ise dokunma
    const contract = contractCells.get(`${w.verse_key}|${w.word_index}|${column}`);
    if (contract !== undefined) {
      rec.reason = `v1.9/v1.10 sozlesme hucresi (beklenen: ${contract})`;
      rejected.push(rec);
      continue;
    }

    // G4 — canonical Arapca token, segment birlesimiyle eslesmeli
    const joined = segs.map((s) => s.arapca ?? "").join("");
    rec.arabic_morfoloji = joined;
    rec.exact_surface = norm(joined) === norm(w.arabic);
    if (skeleton(joined) !== skeleton(w.arabic)) {
      rec.reason = "Arapca token uyusmuyor (harf iskeleti farkli)";
      rejected.push(rec);
      continue;
    }

    // G5 — aday deger(ler)i topla; degeri hangi segmentin verdigini de kaydet
    const bearing = segs.filter((s) => firstPart(column === "lemma" ? s.lemma : s.kok) !== null);
    const raw = bearing.map((s) => firstPart(column === "lemma" ? s.lemma : s.kok));
    const distinct = [...new Set(raw.map((v) => v.normalize("NFC")))];
    rec.bearing_tags = [...new Set(bearing.map((s) => s.tag ?? ""))].join(",");

    if (distinct.length === 0) {
      rec.reason = "morfoloji'de bu alan bos";
      rejected.push(rec);
      continue;
    }

    const value = distinct[0];
    rec.after = value;

    // G6 — Buckwalter / ASCII sizintisi
    if (hasAsciiLeak(value) || !isArabicOnly(value)) {
      rec.reason = "Buckwalter/ASCII veya Arapca disi karakter";
      rejected.push(rec);
      continue;
    }

    // G7 — birden fazla farkli aday: otomatik kabul YOK
    if (distinct.length > 1) {
      rec.reason = `belirsiz: ${distinct.length} farkli aday (${distinct.join(" / ")})`;
      manual.push(rec);
      continue;
    }

    // G8 — degeri veren segment icerik segmenti olmali. Ek/clitic (P, PREF,
    // DET, CONJ...) tasiyicisiysa kelime duzeyine yazmak yaniltici olur:
    // otomatik kabul edilmez, manuel incelemeye duser.
    const CONTENT_TAG = /^(N|V|ADJ|PN|IMPN)$/;
    const contentBearing = bearing.filter((s) => CONTENT_TAG.test(String(s.tag ?? "").trim()));
    if (contentBearing.length !== 1) {
      rec.reason =
        contentBearing.length === 0
          ? `degeri yalniz ek/clitic segmenti veriyor (tag: ${rec.bearing_tags})`
          : `${contentBearing.length} icerik segmenti ayni degeri veriyor (tag: ${rec.bearing_tags})`;
      manual.push(rec);
      continue;
    }

    rec.reason = `tek icerik segmenti (tag ${contentBearing[0].tag}), tek aday, harf iskeleti birebir, sozlesme disi${rec.exact_surface ? ", imla da birebir" : ""}`;
    accepted.push(rec);
  }
}

// ── Beklenen sonrasi durum ───────────────────────────────────────────────────
const nullLemmaBefore = words.filter((w) => isNull(w.lemma)).length;
const nullRootBefore = words.filter((w) => isNull(w.root)).length;
const accLemma = accepted.filter((r) => r.column === "lemma").length;
const accRoot = accepted.filter((r) => r.column === "root").length;

// ── SQL taslaklari ───────────────────────────────────────────────────────────
const esc = (v) => "'" + String(v).replace(/'/g, "''") + "'";
const forward = [
  "-- morfoloji backfill FORWARD (guard'li) — UYGULANMADI",
  "-- Guard: yalniz hala NULL/bos olan hucreye yazar; mevcut degeri ASLA ezmez.",
  "BEGIN IMMEDIATE;",
  ...accepted.map(
    (r) =>
      `UPDATE words SET ${r.column}=${esc(r.after)} WHERE id=${r.words_id} AND (${r.column} IS NULL OR TRIM(${r.column})='');`
  ),
  "COMMIT;",
];
const reverse = [
  "-- morfoloji backfill REVERSE — yalniz bu backfill'in yazdigi degeri geri alir",
  "BEGIN IMMEDIATE;",
  ...accepted.map(
    (r) => `UPDATE words SET ${r.column}=NULL WHERE id=${r.words_id} AND ${r.column}=${esc(r.after)};`
  ),
  "COMMIT;",
];

const preImage = accepted.map((r) => ({
  words_id: r.words_id,
  verse_key: r.verse_key,
  word_index: r.word_index,
  column: r.column,
  before: null,
  after: r.after,
}));

const csv = [
  "words_id,verse_key,word_index,column,before,after,pos,segments,status,reason",
  ...[...accepted.map((r) => [r, "ACCEPTED"]), ...manual.map((r) => [r, "MANUAL"]), ...rejected.map((r) => [r, "REJECTED"])].map(
    ([r, st]) =>
      [r.words_id, r.verse_key, r.word_index, r.column, "", r.after ?? "", r.pos ?? "", r.segments, st, `"${String(r.reason).replace(/"/g, '""')}"`].join(",")
  ),
];

mkdirSync(OUT, { recursive: true });
const write = (name, body) => {
  const p = path.join(OUT, name);
  writeFileSync(p, body, "utf8");
  return { file: name, sha256: createHash("sha256").update(body).digest("hex").slice(0, 16) };
};

const artifacts = [
  write("candidates.csv", csv.join("\n") + "\n"),
  write("candidates.json", JSON.stringify({ accepted, manual, rejected }, null, 1)),
  write("pre-image.json", JSON.stringify(preImage, null, 1)),
  write("forward.sql", forward.join("\n") + "\n"),
  write("reverse.sql", reverse.join("\n") + "\n"),
];

const report = {
  mode: "DRY-RUN (salt-okunur, hicbir yazma yok)",
  db: DB,
  generatedAt: new Date().toISOString(),
  totals: {
    wordsRows: words.length,
    nullLemmaBefore,
    nullRootBefore,
    acceptedLemma: accLemma,
    acceptedRoot: accRoot,
    manualReview: manual.length,
    rejected: rejected.length,
    nullLemmaAfterExpected: nullLemmaBefore - accLemma,
    nullRootAfterExpected: nullRootBefore - accRoot,
  },
  offTargetColumns: 0,
  touchedColumns: [...new Set(accepted.map((r) => "words." + r.column))],
  protectedRootIds: protectedRootIds.size,
  contractCells: contractCells.size,
  rejectionBreakdown: Object.entries(
    rejected.reduce((acc, r) => {
      const k = String(r.reason).replace(/\(.*\)/, "(...)");
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]),
  manualBreakdown: Object.entries(
    manual.reduce((acc, r) => {
      const k = String(r.reason).replace(/\(.*\)/, "(...)");
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]),
  artifacts,
};
write("report.json", JSON.stringify(report, null, 2));

console.log(JSON.stringify(report, null, 2));
console.log("\nciktilar: " + OUT);
db.close();
