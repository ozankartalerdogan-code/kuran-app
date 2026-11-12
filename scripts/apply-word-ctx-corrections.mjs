// content/words/review-words-ctx.json (scripts/review-word-meanings-ctx.mjs çıktısı) içindeki
// bağlamsal Türkçe kelime anlamı düzeltmelerini uygular + bozuk "i̇" (i + U+0307) temizliği.
//
// Eşleşme üçlüsü: arabic + eski meaning_tr + gloss_en (yalnız İngilizce karşılığı olan satırlar;
// bunların İngilizcesi konum bazlı gloss'tan geldiği için EN modu etkilenmez).
// Elle kontrol sonrası kararlar: content/words/review-words-ctx.overrides.json
//   { "<ar>\t<tr>\t<en>": "yeni anlam" | null }   (null = öneriyi reddet)
//
//   node scripts/apply-word-ctx-corrections.mjs --local [--dry]     # data/app.db (önce yedek alır)
//   node --env-file=apps/web/.env.local scripts/apply-word-ctx-corrections.mjs --turso [--dry]
import { DatabaseSync } from "node:sqlite";
import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry");
const W = path.join(ROOT, "content", "words");
const DOT_I = "i̇";
const clean = (s) => s.replace(/i̇/g, "i").trim();

const review = JSON.parse(readFileSync(path.join(W, "review-words-ctx.json"), "utf8"));
const ovF = path.join(W, "review-words-ctx.overrides.json");
const overrides = existsSync(ovF) ? JSON.parse(readFileSync(ovF, "utf8")) : {};
const key = (r) => `${r.ar}\t${r.tr}\t${r.en}`;

const fixes = [];
for (const r of review) {
  const k = key(r);
  let m = Object.prototype.hasOwnProperty.call(overrides, k) ? overrides[k] : r.verdict === "fix" ? r.tr_fixed : undefined;
  if (m == null) continue;
  m = clean(m);
  if (!m || m === clean(r.tr)) continue;
  fixes.push({ ar: r.ar, tr: r.tr, en: r.en, m });
}

const stmts = [
  ...fixes.map((f) => ({
    sql: `UPDATE words SET meaning_tr = ? WHERE arabic = ? AND coalesce(meaning_tr, '') = ? AND trim(gloss_en) = ?`,
    args: [f.m, f.ar, f.tr, f.en],
  })),
  // Kalan bozuk "i̇" (düzeltilmeyen satırlar ve köklerde).
  { sql: `UPDATE words SET meaning_tr = replace(meaning_tr, ?, 'i') WHERE instr(meaning_tr, ?) > 0`, args: [DOT_I, DOT_I] },
  ...["meaning_tr", "short_tr", "summary_tr"].map((c) => ({
    sql: `UPDATE root_meanings SET ${c} = replace(${c}, ?, 'i') WHERE instr(${c}, ?) > 0`, args: [DOT_I, DOT_I],
  })),
];
const countOf = (s) => ({ sql: s.sql.replace(/^UPDATE (\w+) SET .*? WHERE/s, "SELECT count(*) n FROM $1 WHERE"), args: s.sql.includes("replace(") ? s.args.slice(1) : s.args.slice(1) });

console.log(`öneri: ${review.filter((r) => r.verdict === "fix").length}, uygulanacak düzeltme: ${fixes.length}, override: ${Object.keys(overrides).length}`);

if (process.argv.includes("--local")) {
  const dbPath = path.join(ROOT, "data", "app.db");
  const bak = `${dbPath}.bak-word-ctx-corrections-2026-11-12`;
  if (!DRY && !existsSync(bak)) { copyFileSync(dbPath, bak); console.log(`yedek: ${bak}`); }
  const db = new DatabaseSync(dbPath, { readOnly: DRY });
  let total = 0;
  if (!DRY) db.exec("BEGIN");
  for (const s of stmts) {
    total += DRY ? db.prepare(countOf(s).sql).get(...countOf(s).args).n : Number(db.prepare(s.sql).run(...s.args).changes);
  }
  if (!DRY) db.exec("COMMIT");
  console.log(`yerel: ${total} satır${DRY ? " eşleşti (DRY)" : " güncellendi"}`);

  if (!DRY) {
    // EN sözlüğü Türkçe anlam anahtarlı: temizlenmiş "i" anahtarlarını kaynak çiftlerine de ekle
    // (eski anahtar, henüz güncellenmemiş sunucu verisi için kalır). Sonra: build-word-meanings-en.
    for (const base of ["meanings-nogloss", "meanings-root"]) {
      const trF = path.join(W, `${base}.tr.json`), enF = path.join(W, `${base}.tr.en.json`);
      const tr = JSON.parse(readFileSync(trF, "utf8")), en = JSON.parse(readFileSync(enF, "utf8"));
      let added = 0;
      for (const k of Object.keys(tr)) {
        const c = clean(k);
        if (k.includes(DOT_I) && !(c in tr) && en[k]) { tr[c] = clean(tr[k]); en[c] = en[k]; added++; }
      }
      writeFileSync(trF, JSON.stringify(tr, null, 2) + "\n");
      writeFileSync(enF, JSON.stringify(en, null, 2) + "\n");
      console.log(`${base}: ${added} temiz anahtar eklendi`);
    }
    console.log("Sıradaki: node scripts/build-word-meanings-en.mjs");
  }
}

if (process.argv.includes("--turso")) {
  const { createClient } = await import("@libsql/client");
  const url = process.env.TURSO_DB_URL, authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) { console.error("TURSO bilgileri yok."); process.exit(1); }
  const turso = createClient({ url, authToken });
  let total = 0;
  const B = 400;
  for (let i = 0; i < stmts.length; i += B) {
    const part = stmts.slice(i, i + B);
    if (DRY) {
      const res = await turso.batch(part.map(countOf), "read");
      total += res.reduce((a, r) => a + Number(r.rows[0].n), 0);
    } else {
      const res = await turso.batch(part, "write");
      total += res.reduce((a, r) => a + r.rowsAffected, 0);
    }
    process.stdout.write(`\r  ${Math.min(i + B, stmts.length)}/${stmts.length}`);
  }
  console.log(`\nTurso: ${total} satır${DRY ? " eşleşti (DRY)" : " güncellendi"}`);
}
