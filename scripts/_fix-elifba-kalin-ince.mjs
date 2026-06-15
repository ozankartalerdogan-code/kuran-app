/**
 * _fix-elifba-kalin-ince.mjs — elifba_harfler kalın/ince düzeltmesi.
 * Ayn (ع) ve Vav (و) "her ikisi" → "ince".
 *  - Ayn boğaz harfi, 7 müsta'liye'den değil → daima ince (net hata).
 *  - Vav med harfi; Ye "ince" iken Vav "her ikisi" idi → tutarlılık için ince.
 * app.db + Turso günceller. Sonra quiz'i _build-elifba-quiz.mjs ile yeniden üret.
 *   node --env-file=apps/web/.env.local scripts/_fix-elifba-kalin-ince.mjs
 */
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TARGETS = ["Ayn", "Vav"];

const db = new DatabaseSync(path.join(ROOT, "data", "app.db"));
const upd = db.prepare("UPDATE elifba_harfler SET kalin_ince='ince' WHERE harf_adi=?");
for (const ad of TARGETS) upd.run(ad);
console.log("app.db güncellendi:", db.prepare("SELECT harf_adi, kalin_ince FROM elifba_harfler WHERE harf_adi IN ('Ayn','Vav','Ye')").all());

const url = process.env.TURSO_DB_URL, authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) { console.log("⚠️ TURSO env yok → Turso atlandı."); process.exit(0); }
const { createClient } = await import("@libsql/client");
const turso = createClient({ url, authToken });
for (const ad of TARGETS) await turso.execute({ sql: "UPDATE elifba_harfler SET kalin_ince='ince' WHERE harf_adi=?", args: [ad] });
const chk = (await turso.execute("SELECT harf_adi, kalin_ince FROM elifba_harfler WHERE harf_adi IN ('Ayn','Vav','Ye')")).rows;
console.log("Turso güncellendi:", JSON.stringify(chk));
