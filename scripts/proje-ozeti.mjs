/**
 * proje-ozeti.mjs
 * Proje durumunu özetleyen bilgi scripti.
 * Kullanım: node scripts/proje-ozeti.mjs
 */

import { DatabaseSync } from "node:sqlite";
import { readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT   = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DB_PATH = path.join(ROOT, "data", "app.db");

// ─── yardımcı ─────────────────────────────────────────────────────────────────

function hr(char = "─", len = 72) { return char.repeat(len); }
function pad(str, n)  { return String(str ?? "").padEnd(n); }
function lpad(str, n) { return String(str ?? "").padStart(n); }
function fmt(n)       { return Number(n).toLocaleString("tr-TR"); }
function fmtMB(bytes) { return (bytes / 1024 / 1024).toFixed(2) + " MB"; }

function section(title) {
  console.log("\n" + hr("═"));
  console.log("  " + title);
  console.log(hr("═"));
}

function truncate(val, max = 60) {
  const s = String(val ?? "").replace(/\n/g, "↵");
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

// ─── 1. DB bağlantısı ─────────────────────────────────────────────────────────

if (!existsSync(DB_PATH)) {
  console.error("DB bulunamadı:", DB_PATH);
  process.exit(1);
}

const db = new DatabaseSync(DB_PATH, { readOnly: true });
db.exec(`
  PRAGMA cache_size   = -32768;
  PRAGMA mmap_size    = 268435456;
  PRAGMA temp_store   = MEMORY;
`);

// ─── 2. DB boyutu ─────────────────────────────────────────────────────────────

section("1. VERİTABANI BOYUTU");
const { page_count } = db.prepare("PRAGMA page_count").get();
const { page_size }  = db.prepare("PRAGMA page_size").get();
const dbBytes        = page_count * page_size;
const dbStat         = await stat(DB_PATH);

console.log(`  Dosya           : ${DB_PATH}`);
console.log(`  Sayfa boyutu    : ${fmt(page_size)} B`);
console.log(`  Sayfa sayısı    : ${fmt(page_count)}`);
console.log(`  Hesaplanan boyut: ${fmtMB(dbBytes)}`);
console.log(`  Disk boyutu     : ${fmtMB(dbStat.size)}`);

// ─── 3. Tablolar ve satır sayıları ────────────────────────────────────────────

section("2. TABLOLAR VE SATIR SAYILARI");

const tables = db.prepare(`
  SELECT name FROM sqlite_master
  WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
  ORDER BY name
`).all();

console.log(`  ${pad("TABLO", 38)} ${lpad("SATIR SAYISI", 14)}`);
console.log("  " + hr("-", 54));

let grandTotal = 0;
const rowCounts = {};

for (const { name } of tables) {
  const { cnt } = db.prepare(`SELECT COUNT(*) AS cnt FROM [${name}]`).get();
  rowCounts[name] = cnt;
  grandTotal += cnt;
  console.log(`  ${pad(name, 38)} ${lpad(fmt(cnt), 14)}`);
}

console.log("  " + hr("-", 54));
console.log(`  ${pad("TOPLAM", 38)} ${lpad(fmt(grandTotal), 14)}`);

// ─── 4. İlk 3 satır örneği ────────────────────────────────────────────────────

section("3. ÖRNEK VERİ (İlk 3 satır — FTS tabloları hariç)");

const skipFts = new Set(
  tables.map(t => t.name).filter(n => n.includes("_fts") || n.includes("_config") ||
    n.includes("_data") || n.includes("_idx") || n.includes("_content") ||
    n.includes("_docsize"))
);

for (const { name } of tables) {
  if (skipFts.has(name)) continue;

  const rows = db.prepare(`SELECT * FROM [${name}] LIMIT 3`).all();
  if (!rows.length) continue;

  console.log(`\n  ┌─ ${name} (${fmt(rowCounts[name])} satır) ${"─".repeat(Math.max(0, 55 - name.length))}`);

  const cols = Object.keys(rows[0]);
  const colW  = Math.max(12, Math.floor(64 / cols.length));

  // Başlık
  console.log("  │  " + cols.map(c => pad(c, colW)).join("  "));
  console.log("  │  " + hr("-", cols.length * (colW + 2)));

  for (const row of rows) {
    const line = cols.map(c => pad(truncate(row[c], colW), colW)).join("  ");
    console.log("  │  " + line);
  }
}

// ─── 5. İndeksler ─────────────────────────────────────────────────────────────

section("4. İNDEKSLER");

const indexes = db.prepare(`
  SELECT name, tbl_name, sql
  FROM sqlite_master
  WHERE type = 'index'
  ORDER BY tbl_name, name
`).all();

console.log(`  ${pad("İNDEKS ADI", 38)} ${pad("TABLO", 22)}`);
console.log("  " + hr("-", 62));

for (const { name, tbl_name } of indexes) {
  const isUniq = (name || "").startsWith("sqlite_autoindex") ||
                 db.prepare(`SELECT sql FROM sqlite_master WHERE name=?`).get(name)?.sql?.includes("UNIQUE") ? "UNIQUE" : "";
  console.log(`  ${pad(name, 38)} ${pad(tbl_name, 22)} ${isUniq}`);
}

// ─── 6. data/ JSON dosyaları ──────────────────────────────────────────────────

section("5. data/ KLASÖRÜ — BÜYÜK JSON DOSYALARI (İlk 10)");

async function collectFiles(dir, ext = ".json", results = []) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); }
  catch { return results; }

  for (const e of entries) {
    if (e.name === "node_modules") continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await collectFiles(full, ext, results);
    else if (e.name.endsWith(ext)) {
      const s = await stat(full);
      results.push({ file: full.replace(ROOT + path.sep, ""), size: s.size });
    }
  }
  return results;
}

const jsonFiles = (await collectFiles(path.join(ROOT, "data")))
  .sort((a, b) => b.size - a.size)
  .slice(0, 10);

console.log(`  ${pad("DOSYA", 58)} ${lpad("BOYUT", 10)}`);
console.log("  " + hr("-", 70));
for (const { file, size } of jsonFiles) {
  console.log(`  ${pad(file, 58)} ${lpad(fmtMB(size), 10)}`);
}

// ─── 7. Dizin ağacı ───────────────────────────────────────────────────────────

section("6. PROJE DİZİN YAPISI (2 seviye)");

const SKIP_DIRS = new Set([
  "node_modules", ".next", ".git", ".claude",
  "dist", "build", "coverage", "__pycache__", ".turbo"
]);

async function tree(dir, prefix = "", depth = 0, maxDepth = 2) {
  if (depth > maxDepth) return;
  let entries;
  try { entries = (await readdir(dir, { withFileTypes: true })).sort((a, b) => {
    if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
    return a.name.localeCompare(b.name);
  }); } catch { return; }

  const visible = entries.filter(e => !SKIP_DIRS.has(e.name) && !e.name.startsWith("."));
  for (let i = 0; i < visible.length; i++) {
    const e    = visible[i];
    const last = i === visible.length - 1;
    const icon = e.isDirectory() ? "📁" : "📄";
    console.log(`${prefix}${last ? "└── " : "├── "}${icon} ${e.name}`);
    if (e.isDirectory()) {
      await tree(path.join(dir, e.name), prefix + (last ? "    " : "│   "), depth + 1, maxDepth);
    }
  }
}

console.log(`  📁 ${path.basename(ROOT)}/`);
await tree(ROOT, "  ", 0, 2);

// ─── Bitti ────────────────────────────────────────────────────────────────────
console.log("\n" + hr("═") + "\n  Özet tamamlandı.\n" + hr("═") + "\n");
db.close();
