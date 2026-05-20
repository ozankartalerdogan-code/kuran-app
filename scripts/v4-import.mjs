import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const csvPath = path.join(root, "scripts", "v4-updates.csv");
const dbPath  = path.join(root, "data", "app.db");

console.log("CSV okunuyor...");
const lines = readFileSync(csvPath, "utf8").split("\n").filter(Boolean);
console.log(`Satir sayisi: ${lines.length.toLocaleString()}`);

const rows = lines.map(line => {
  const i1 = line.indexOf(",");
  const i2 = line.indexOf(",", i1 + 1);
  return [line.slice(0, i1), line.slice(i1 + 1, i2), parseInt(line.slice(i2 + 1), 10)];
});

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA journal_mode=WAL");
db.exec("PRAGMA synchronous=NORMAL");

const before = db.prepare("SELECT COUNT(*) as c FROM words WHERE meaning_tr IS NULL OR trim(meaning_tr)=''").get().c;
console.log(`Oncesi bos: ${before.toLocaleString()}`);

const stmt = db.prepare(
  "UPDATE words SET meaning_tr=? WHERE verse_key=? AND word_index=? AND (meaning_tr IS NULL OR trim(meaning_tr)='')"
);

db.exec("BEGIN");
let updated = 0;
for (const [meaning, vk, wi] of rows) {
  stmt.run(meaning, vk, wi);
  updated++;
}
db.exec("COMMIT");

const after = db.prepare("SELECT COUNT(*) as c FROM words WHERE meaning_tr IS NULL OR trim(meaning_tr)=''").get().c;
const filled = db.prepare("SELECT COUNT(*) as c FROM words WHERE meaning_tr IS NOT NULL AND trim(meaning_tr)!=''").get().c;
db.close();

console.log(`\nGuncellenen: ${(before - after).toLocaleString()}`);
console.log(`Bos sonrasi: ${after.toLocaleString()}`);
console.log(`Dolu toplam: ${filled.toLocaleString()}`);
