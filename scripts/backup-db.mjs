/**
 * backup-db.mjs — TURSO YEDEKLEME DİSİPLİNİ
 *
 * data/app.db tek master'dır ve Turso ile senkron tutulur (sync-diff). Bu script:
 *   1. app.db ↔ Turso farkını DOĞRULAR (0 ise snapshot canlıyı temsil eder).
 *   2. VACUUM INTO ile temiz, tarihli bir snapshot alır (FTS dahil tam SQLite dosyası).
 *   3. Eski yedekleri budar (son N tutulur).
 *
 * Kullanım:
 *   node --env-file=apps/web/.env.local scripts/backup-db.mjs
 *   node scripts/backup-db.mjs --skip-verify      (Turso doğrulamasını atla)
 *   node scripts/backup-db.mjs --keep=12          (kaç yedek tutulsun, vars. 8)
 *
 * GERİ YÜKLEME: backups/kuran_*.db dosyasını data/app.db'nin yerine koy,
 *   sonra `npm run sync:diff` ile Turso'ya geri yaz. (FTS index app.db'de mevcut.)
 */
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(dir, "..");
const LOCAL_DB = path.join(ROOT, "data", "app.db");
const BACKUP_DIR = path.join(ROOT, "backups");

const arg = (k, d) => { const f = process.argv.find((a) => a.startsWith(`--${k}=`)); return f ? f.slice(k.length + 3) : d; };
const SKIP_VERIFY = process.argv.includes("--skip-verify");
const KEEP = Number(arg("keep", "8"));

const norm = (v) => (v == null ? "" : String(v));

// ── 1. Turso ile fark doğrula ────────────────────────────────────────────────
async function verifyAgainstTurso() {
  const url = process.env.TURSO_DB_URL, authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) { console.log("⚠️  TURSO env yok → doğrulama atlandı (yine de yedek alınır)."); return; }
  const { createClient } = await import("@libsql/client");
  const turso = createClient({ url, authToken });
  const local = new DatabaseSync(LOCAL_DB, { readOnly: true });

  const lv = local.prepare("SELECT verse_key, literal_ceviri, fark_analizi FROM verses").all();
  const tv = new Map((await turso.execute("SELECT verse_key, literal_ceviri, fark_analizi FROM verses")).rows.map((r) => [r.verse_key, r]));
  let lit = 0, fark = 0;
  for (const r of lv) { const t = tv.get(r.verse_key); if (!t) continue; if (norm(r.literal_ceviri) !== norm(t.literal_ceviri)) lit++; if (norm(r.fark_analizi) !== norm(t.fark_analizi)) fark++; }

  const lw = new Map(local.prepare("SELECT id, meaning_tr, root FROM words").all().map((r) => [Number(r.id), r]));
  let m = 0, rt = 0, off = 0;
  while (true) { const res = await turso.execute({ sql: "SELECT id, meaning_tr, root FROM words ORDER BY id LIMIT 20000 OFFSET ?", args: [off] }); if (!res.rows.length) break; for (const t of res.rows) { const l = lw.get(Number(t.id)); if (!l) continue; if (norm(l.meaning_tr) !== norm(t.meaning_tr)) m++; if (norm(l.root) !== norm(t.root)) rt++; } off += 20000; }

  const total = lit + fark + m + rt;
  if (total === 0) {
    console.log("✅ app.db ↔ Turso TAM SENKRON — snapshot canlıyı birebir temsil ediyor.");
  } else {
    console.log(`⚠️  app.db ↔ Turso FARK VAR (literal=${lit}, fark=${fark}, kelime=${m}, kök=${rt}).`);
    console.log("    Yedek yine de app.db'den alınıyor. Turso'da app.db'de OLMAYAN doğrudan yazım varsa");
    console.log("    bu snapshot onu içermez. Şüpheliyse önce `npm run sync:diff:dry` ile kontrol et.");
  }
}

// ── 2. VACUUM INTO snapshot ──────────────────────────────────────────────────
function takeSnapshot() {
  if (!fs.existsSync(LOCAL_DB)) { console.error("HATA: data/app.db bulunamadı:", LOCAL_DB); process.exit(1); }
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14).replace(/(\d{8})(\d{6})/, "$1_$2");
  const out = path.join(BACKUP_DIR, `kuran_${ts}.db`);
  const sqlPath = out.replace(/\\/g, "/").replace(/'/g, "''");

  const db = new DatabaseSync(LOCAL_DB);
  db.exec(`VACUUM INTO '${sqlPath}'`);
  db.close();

  const mb = (fs.statSync(out).size / 1048576).toFixed(1);
  console.log(`📦 Yedek alındı: backups/${path.basename(out)} (${mb} MB)`);
  return out;
}

// ── 3. Eski yedekleri buda ───────────────────────────────────────────────────
function prune() {
  const files = fs.readdirSync(BACKUP_DIR).filter((f) => /^kuran_\d{8}_\d{6}\.db$/.test(f)).sort();
  const remove = files.slice(0, Math.max(0, files.length - KEEP));
  for (const f of remove) { fs.unlinkSync(path.join(BACKUP_DIR, f)); console.log(`🗑️  Eski yedek silindi: ${f}`); }
  console.log(`📚 Toplam ${files.length - remove.length} yedek tutuluyor (son ${KEEP}).`);
}

if (!SKIP_VERIFY) await verifyAgainstTurso();
takeSnapshot();
prune();
console.log("✅ Yedekleme tamam.");
