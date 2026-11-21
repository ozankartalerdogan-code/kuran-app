/**
 * _fix-elifba-ders3-hareke.mjs — 21 Kasım 2026
 * elifba_dersler id=3 (Harekeler) alıştırmasındaki aktarım hataları: حَمَدَ→حَمِدَ, أَمَنَ→أَمِنَ, صَعَدَ→صَعِدَ.
 * Kanıt: Diyanet "Etkinliklerle Elif-Bâ" s.108 (حَمِدَ); satır fe'ile kalıbı (شَهِدَ عَمِلَ سَمِعَ / فَرِحَ طَفِقَ).
 * Önce yerel app.db (yedekle), sonra Turso (yalnız içerik yerelin eski hâliyle aynıysa).
 *   node --env-file=apps/web/.env.local scripts/_fix-elifba-ders3-hareke.mjs [--dry]
 */
import { createClient } from "@libsql/client";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DRY = process.argv.includes("--dry");
const dir = path.dirname(fileURLToPath(import.meta.url));
const ID = 3;
const PAIRS = [["حَمَدَ", "حَمِدَ"], ["أَمَنَ", "أَمِنَ"], ["صَعَدَ", "صَعِدَ"]].map(p => p.map(s => s.normalize("NFC")));
const fix = s => PAIRS.reduce((t, [a, b]) => t.replaceAll(a, b), s);

const db = new DatabaseSync(path.resolve(dir, "../data/app.db"));
const eski = db.prepare("SELECT icerik_json FROM elifba_dersler WHERE id=?").get(ID).icerik_json;
const yeni = fix(eski);
for (const [a] of PAIRS) console.log(a, "yerelde", eski.split(a).length - 1, "adet");
if (yeni === eski) console.log("Yerel zaten düzgün.");
JSON.parse(yeni);

const turso = createClient({ url: process.env.TURSO_DB_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const uzak = (await turso.execute({ sql: "SELECT icerik_json FROM elifba_dersler WHERE id=?", args: [ID] })).rows[0]?.icerik_json;
console.log("Turso:", uzak === eski ? "yerelin eski hâliyle aynı" : uzak === yeni ? "zaten düzgün" : "FARKLI (dokunulmayacak)");
if (DRY) process.exit(0);

if (yeni !== eski) {
  const yedek = path.resolve(dir, `../backups/elifba_dersler_id3_${Date.now()}.json`);
  fs.writeFileSync(yedek, JSON.stringify({ id: ID, icerik_json: eski }));
  db.prepare("UPDATE elifba_dersler SET icerik_json=? WHERE id=?").run(yeni, ID);
  console.log("Yerel güncellendi; yedek:", path.basename(yedek));
}
if (uzak === eski) {
  const r = await turso.execute({ sql: "UPDATE elifba_dersler SET icerik_json=? WHERE id=? AND icerik_json=?", args: [yeni, ID, eski] });
  console.log("Turso güncellendi:", r.rowsAffected, "satır");
}
