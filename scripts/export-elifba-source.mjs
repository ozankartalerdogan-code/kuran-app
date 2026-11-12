// Elif-Ba Türkçe metnini yerel data/app.db'den (SALT-OKUNUR) çıkarır; İngilizce
// uyarlamanın kaynağıdır. Canlı sunucuya/Turso'ya dokunmaz.
//
//   node scripts/export-elifba-source.mjs
//
// Çıktı: content/elifba/source.tr.json
//   dersler: [{id, baslik}]            (seviye anahtar olarak kalır, çevrilmez)
//   harfler: [{harf_id, harf_adi, harf_sesi, mahrec}]   (kalin_ince/grup anahtar)
//   quiz:    [{quiz_id, soru, secenekler, dogru_cevap, ipucu}]
//   strings: quiz metinlerindeki tekrarsız cümleler (tek seferde çevrilir;
//            böylece dogru_cevap ile şık birebir aynı kalır)
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const db = new DatabaseSync(path.join(ROOT, "data", "app.db"), { readOnly: true });

const dersler = db.prepare("SELECT id, baslik FROM elifba_dersler ORDER BY id").all().map((r) => ({ ...r }));
const harfler = db
  .prepare("SELECT harf_id, harf_adi, harf_sesi, mahrec FROM elifba_harfler ORDER BY harf_id")
  .all()
  .map((r) => ({ ...r }));
const quiz = db
  .prepare("SELECT quiz_id, soru, secenekler, dogru_cevap, ipucu FROM elifba_quiz ORDER BY quiz_id")
  .all()
  .map((r) => {
    let secenekler = [];
    try { secenekler = JSON.parse(r.secenekler); } catch { secenekler = []; }
    return { quiz_id: r.quiz_id, soru: r.soru, secenekler, dogru_cevap: r.dogru_cevap, ipucu: r.ipucu };
  });

const set = new Set();
for (const q of quiz) {
  set.add(q.soru);
  q.secenekler.forEach((s) => set.add(s));
  set.add(q.dogru_cevap);
  if (q.ipucu) set.add(q.ipucu);
}
const strings = [...set].sort((a, b) => a.localeCompare(b, "tr"));

const out = path.join(ROOT, "content", "elifba", "source.tr.json");
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ dersler, harfler, quiz, strings }, null, 2) + "\n");
console.log(`${out}: ${dersler.length} ders, ${harfler.length} harf, ${quiz.length} soru, ${strings.length} tekrarsız metin`);
