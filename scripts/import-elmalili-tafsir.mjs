import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH  = path.resolve(dir, '../data/app.db');
const MD_DIR   = path.resolve(dir, '../data/tafsir/elmalili');
const SOURCE   = 'elmalili';

const db = new DatabaseSync(DB_PATH);

// 1. Tablo oluştur
db.exec(`
  CREATE TABLE IF NOT EXISTS surah_tafsir (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    surah_id  INTEGER NOT NULL,
    source    TEXT    NOT NULL,
    content   TEXT    NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS uix_surah_tafsir
    ON surah_tafsir (surah_id, source);
`);

// 2. Prepared statement
const stmt = db.prepare(
  'INSERT OR IGNORE INTO surah_tafsir (surah_id, source, content) VALUES (?, ?, ?)'
);

// 3. 1.md – 114.md oku ve ekle
let inserted = 0;
let skipped  = 0;

for (let i = 1; i <= 114; i++) {
  const filePath = path.join(MD_DIR, `${i}.md`);
  let content;
  try {
    content = await readFile(filePath, 'utf8');
  } catch {
    console.warn(`[UYARI] Dosya bulunamadı: ${filePath}`);
    skipped++;
    continue;
  }

  const result = stmt.run(i, SOURCE, content.trim());
  if (result.changes > 0) {
    inserted++;
  } else {
    skipped++;
  }
}

// 4. Doğrulama
const { cnt } = db.prepare('SELECT COUNT(*) AS cnt FROM surah_tafsir').get();

db.close();

console.log('=== SONUÇ ===');
console.log('Eklenen kayıt  :', inserted);
console.log('Atlanan kayıt  :', skipped);
console.log('Toplam tablo   :', cnt);
