// content/words/corrections-words.json içindeki (verdict "fix") Türkçe kelime anlamı
// düzeltmelerini uygular. Eşleşme: arabic + eski meaning_tr + gloss_en boş + ayet listesi.
//
// Kök düzeltmeleri de (corrections-roots.json → root_meanings) aynı çalıştırmada uygulanır;
// --roots-only yalnız kökleri uygular.
//   node scripts/apply-word-corrections.mjs --local [--dry] [--roots-only]   # yerel data/app.db (önce yedek alır)
//   node --env-file=apps/web/.env.local scripts/apply-word-corrections.mjs --turso [--dry]
//
// Ayrıca --local, İngilizce sözlüğe (content/words/meanings-nogloss.tr.en.json) yeni
// Türkçe anlamların İngilizcesini ekler; ardından export + build yeniden çalıştırılmalı.
import { DatabaseSync } from "node:sqlite";
import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry");
const fixes = JSON.parse(readFileSync(path.join(ROOT, "content", "words", "corrections-words.json"), "utf8"))
  .filter((c) => c.verdict === "fix" && c.dogru?.trim() && c.dogru.trim() !== c.tr);

// Kök düzeltmeleri (content/words/corrections-roots.json). Hemzesiz yedek kayıtlar
// (Kur'an'da kelimesi yok, hemzeli kökün anlamını taşır) bilerek atlanır.
const ROOT_SKIP = new Set(["الو", "بدا", "خطا", "درا", "ذرا", "سام", "فتا"]);
const rootFixes = JSON.parse(readFileSync(path.join(ROOT, "content", "words", "corrections-roots.json"), "utf8"))
  .filter((c) => c.verdict === "fix" && c.dogru?.trim() && c.dogru.trim() !== c.tr && !ROOT_SKIP.has(c.root));

function stmt(c) {
  if (c.root) {
    const m = c.dogru.trim();
    return {
      sql: `UPDATE root_meanings SET meaning_tr = ?, short_tr = ?,
            summary_tr = CASE WHEN summary_tr IS NULL THEN NULL ELSE ? END
            WHERE root = ? AND meaning_tr = ?`,
      args: [m, m, `Bu kök genel olarak ${m} anlam alanında kullanılır; bağlama göre fiil, isim veya nitelik olarak farklı görünümler kazanabilir.`, c.root, c.tr],
    };
  }
  const ph = c.verses.map(() => "?").join(",");
  return {
    sql: `UPDATE words SET meaning_tr = ? WHERE arabic = ? AND meaning_tr = ?
          AND (gloss_en IS NULL OR trim(gloss_en) = '') AND verse_key IN (${ph})`,
    args: [c.dogru.trim(), c.ar, c.tr, ...c.verses],
  };
}
const countSql = (s) => s.sql.startsWith("UPDATE root_meanings")
  ? { sql: "SELECT count(*) n FROM root_meanings WHERE root = ? AND meaning_tr = ?", args: s.args.slice(3) }
  : { sql: s.sql.replace(/^UPDATE words SET meaning_tr = \? WHERE/, "SELECT count(*) n FROM words WHERE"), args: s.args.slice(1) };
const ONLY_ROOTS = process.argv.includes("--roots-only");
const all = ONLY_ROOTS ? rootFixes : [...fixes, ...rootFixes];

if (process.argv.includes("--local")) {
  const dbPath = path.join(ROOT, "data", "app.db");
  const bak = `${dbPath}.bak-${ONLY_ROOTS ? "root" : "word"}-corrections-2026-11-12`;
  if (!DRY && !existsSync(bak)) { copyFileSync(dbPath, bak); console.log(`yedek: ${bak}`); }
  const db = new DatabaseSync(dbPath, { readOnly: DRY });
  let total = 0;
  if (!DRY) db.exec("BEGIN");
  for (const c of all) {
    const s = stmt(c);
    if (DRY) {
      const q = countSql(s);
      total += db.prepare(q.sql).get(...q.args).n;
    } else {
      total += Number(db.prepare(s.sql).run(...s.args).changes);
    }
  }
  if (!DRY) db.exec("COMMIT");
  console.log(`yerel: ${all.length} düzeltme, ${total} satır${DRY ? " (DRY, değişiklik yok)" : " güncellendi"}`);

  if (!DRY) {
    // Kök sözlüğü kök anahtarlı: Türkçe kaynak ve İngilizce doğrudan değişir.
    const trF = path.join(ROOT, "content", "words", "root-meanings.tr.json");
    const enF = path.join(ROOT, "content", "words", "root-meanings.tr.en.json");
    const trR = JSON.parse(readFileSync(trF, "utf8")), enR = JSON.parse(readFileSync(enF, "utf8"));
    for (const c of rootFixes) { trR[c.root] = c.dogru.trim(); if (c.en?.trim()) enR[c.root] = c.en.trim(); }
    writeFileSync(trF, JSON.stringify(trR, null, 2) + "\n");
    writeFileSync(enF, JSON.stringify(enR, null, 2) + "\n");
    console.log(`kök sözlüğünde ${rootFixes.length} kök güncellendi`);
  }

  if (!DRY && !ONLY_ROOTS) {
    const f = path.join(ROOT, "content", "words", "meanings-nogloss.tr.en.json");
    const en = JSON.parse(readFileSync(f, "utf8"));
    let added = 0;
    for (const c of fixes) if (!en[c.dogru.trim()] && c.en?.trim()) { en[c.dogru.trim()] = c.en.trim(); added++; }
    writeFileSync(f, JSON.stringify(en, null, 2) + "\n");
    console.log(`İngilizce sözlüğe ${added} yeni anlam eklendi`);
  }
}

if (process.argv.includes("--turso")) {
  const { createClient } = await import("@libsql/client");
  const url = process.env.TURSO_DB_URL, authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) { console.error("TURSO bilgileri yok."); process.exit(1); }
  const turso = createClient({ url, authToken });
  if (DRY) {
    let total = 0;
    for (const c of all) {
      const r = await turso.execute(countSql(stmt(c)));
      total += Number(r.rows[0].n);
    }
    console.log(`Turso (DRY): ${all.length} düzeltme, eşleşen ${total} satır`);
  } else {
    const res = await turso.batch(all.map(stmt), "write");
    console.log(`Turso: ${res.reduce((a, r) => a + r.rowsAffected, 0)} satır güncellendi`);
  }
}
