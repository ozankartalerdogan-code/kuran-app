/**
 * _build-elifba-quiz.mjs — Elifba quiz havuzunu şablonla üretir.
 * Ders başına 45 soru (çeşitli tip, akıllı çeldirici). app.db + Turso'ya yazar.
 *
 *   node scripts/_build-elifba-quiz.mjs --dry      # önizleme (yazmaz)
 *   node --env-file=apps/web/.env.local scripts/_build-elifba-quiz.mjs   # yaz + Turso sync
 */
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry");
const POOL_PER_LESSON = 45;

const db = new DatabaseSync(path.join(ROOT, "data", "app.db"));
const harfler = db.prepare(
  "SELECT harf_id, harf_adi, harf_sesi, tek_basina, basta, ortada, sonda, mahrec, kalin_ince, grup FROM elifba_harfler ORDER BY harf_id",
).all();
const byId = new Map(harfler.map((h) => [h.harf_id, h]));
const lessonLetters = {}; // lesson_id -> [harf_id]
for (const r of db.prepare("SELECT ders_id, harf_id FROM elifba_harf_ders ORDER BY ders_id, harf_id").all()) {
  (lessonLetters[r.ders_id] ??= []).push(r.harf_id);
}

const allSesler = [...new Set(harfler.map((h) => h.harf_sesi))];
const allMahrec = [...new Set(harfler.map((h) => h.mahrec))];

// ── Görsel benzerlik grupları (akıllı çeldirici) ─────────────────────────────
const SIMILAR = [
  [2, 3, 4, 25, 28], [5, 6, 7], [8, 9], [10, 11], [12, 13], [14, 15],
  [16, 17], [18, 19], [20, 21], [22, 23], [1, 29], [24, 25], [26, 27],
];
function similarIds(id) {
  const set = new Set();
  for (const g of SIMILAR) if (g.includes(id)) g.forEach((x) => x !== id && set.add(x));
  return [...set];
}

// ── Yardımcılar ───────────────────────────────────────────────────────────────
let seed = 12345;
function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
function shuffle(a) { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; }
function sample(arr, n, exclude = []) {
  const pool = shuffle(arr.filter((x) => !exclude.includes(x)));
  return pool.slice(0, n);
}
// benzer harflerden, eksikse rastgele harflerden n çeldirici (id listesi)
// pred: opsiyonel filtre (ör. sadece birleşen harfler — başta-şekli soruları için)
function distractorLetters(id, n, pred = null) {
  const ok = (x) => x !== id && (!pred || pred(byId.get(x)));
  let ids = shuffle(similarIds(id).filter(ok));
  if (ids.length < n) {
    const rest = shuffle(harfler.map((h) => h.harf_id).filter((x) => ok(x) && !ids.includes(x)));
    ids = [...ids, ...rest];
  }
  return ids.slice(0, n).map((x) => byId.get(x));
}
const isConnecting = (h) => h.grup === "birlesen";
const KI = { ince: "İnce okunur", "kalın": "Kalın okunur", "her ikisi": "Hem kalın hem ince okunabilir" };

// secenekler benzersiz olmalı + correct içinde olmalı; değilse soruyu atla (null)
function makeQ(type, h, soru, correct, distractors, ipucu, zorluk) {
  const opts = [correct, ...distractors];
  const uniq = [...new Set(opts)];
  if (uniq.length < opts.length || !uniq.includes(correct)) return null; // belirsiz/çakışan → atla
  return { _key: `${type}:${h.harf_id}`, soru_tipi: "coktan_secmeli", soru, secenekler: shuffle(uniq), dogru_cevap: correct, ipucu, zorluk };
}

// ── Soru üreticileri (bir harf → 0..1 soru) ──────────────────────────────────
const GEN = [
  (h) => makeQ("glif_ad", h, `Bu harfin Türkçe adı nedir?\n\n${h.tek_basina}`, h.harf_adi,
    distractorLetters(h.harf_id, 3).map((d) => d.harf_adi), `Bu harf "${h.harf_sesi}" sesine karşılık gelir.`, 1),
  (h) => makeQ("ad_glif", h, `'${h.harf_adi}' harfinin Arapça yazılışı hangisidir?`, h.tek_basina,
    distractorLetters(h.harf_id, 3).map((d) => d.tek_basina), `${h.harf_adi}, "${h.harf_sesi}" sesidir.`, 1),
  (h) => makeQ("glif_ses", h, `Bu harf hangi sese karşılık gelir?\n\n${h.tek_basina}`, h.harf_sesi,
    sample(allSesler, 3, [h.harf_sesi]), `Bu harfin adı "${h.harf_adi}".`, 2),
  (h) => h.grup === "birlesen"
    ? makeQ("basta", h, `'${h.harf_adi}' (${h.tek_basina}) harfinin kelime BAŞINDAKİ şekli hangisidir?`, h.basta,
        distractorLetters(h.harf_id, 3, isConnecting).map((d) => d.basta), `Başta gelen harfler sonraki harfe bağlanır.`, 2)
    : null,
  (h) => makeQ("kalin_ince", h, `'${h.harf_adi}' (${h.tek_basina}) harfi nasıl okunur?`, KI[h.kalin_ince],
    Object.values(KI).filter((v) => v !== KI[h.kalin_ince]), `Kalın harfler dolgun, ince harfler yumuşak okunur.`, 2),
  (h) => makeQ("birlesme", h, `'${h.harf_adi}' (${h.tek_basina}) harfi kendinden SONRAKİ harfle birleşir mi?`,
    h.grup === "birlesen" ? "Evet, birleşir" : "Hayır, birleşmez", [h.grup === "birlesen" ? "Hayır, birleşmez" : "Evet, birleşir"],
    `Bir harf sonraki harfe bitişik yazılabiliyorsa birleşir.`, 1),
  (h) => makeQ("ayirt", h, `Aşağıdakilerden hangisi '${h.harf_adi}' harfidir?`, h.tek_basina,
    distractorLetters(h.harf_id, 3).map((d) => d.tek_basina), `${h.harf_adi}, "${h.harf_sesi}" sesini verir.`, 2),
];

function genForLetters(ids) {
  const out = [];
  for (const id of ids) {
    const h = byId.get(id);
    for (const g of GEN) { const q = g(h); if (q) out.push(q); }
  }
  return out;
}

// ── Ders havuzları ────────────────────────────────────────────────────────────
const allIds = harfler.map((h) => h.harf_id);
const lessons = Object.keys(lessonLetters).map(Number).sort((a, b) => a - b);
const result = {}; // lesson -> [q]

for (const L of lessons) {
  const own = lessonLetters[L];
  let cands = shuffle(genForLetters(own));
  if (cands.length < POOL_PER_LESSON) {
    const others = allIds.filter((x) => !own.includes(x));
    const keys = new Set(cands.map((c) => c._key));
    for (const q of shuffle(genForLetters(others))) {
      if (cands.length >= POOL_PER_LESSON) break;
      if (!keys.has(q._key)) { cands.push(q); keys.add(q._key); }
    }
  }
  result[L] = cands.slice(0, POOL_PER_LESSON);
}

// ── Rapor ─────────────────────────────────────────────────────────────────────
console.log("=== Ders başına üretilen soru ===");
for (const L of lessons) console.log(`  Ders ${L}: ${result[L].length} soru`);
console.log("\n=== Ders 1 örnek 4 soru ===");
result[1].slice(0, 4).forEach((q) => console.log(`  [${q.soru_tipi}/${q.zorluk}] ${q.soru.replace(/\n+/g, " ")}\n     şıklar: ${q.secenekler.join(" | ")}  ✓ ${q.dogru_cevap}`));
const total = lessons.reduce((s, L) => s + result[L].length, 0);
console.log(`\nTOPLAM: ${total} soru`);

if (DRY) { console.log("\n(DRY — yazılmadı)"); process.exit(0); }

// ── app.db'ye yaz ─────────────────────────────────────────────────────────────
db.exec("DELETE FROM elifba_quiz");
const ins = db.prepare("INSERT INTO elifba_quiz (quiz_id, lesson_id, soru_tipi, soru, secenekler, dogru_cevap, ipucu, zorluk) VALUES (?,?,?,?,?,?,?,?)");
let qid = 1;
const rowsForTurso = [];
for (const L of lessons) for (const q of result[L]) {
  const sec = JSON.stringify(q.secenekler);
  ins.run(qid, L, q.soru_tipi, q.soru, sec, q.dogru_cevap, q.ipucu, q.zorluk);
  rowsForTurso.push([qid, L, q.soru_tipi, q.soru, sec, q.dogru_cevap, q.ipucu, q.zorluk]);
  qid++;
}
console.log(`\n✅ app.db: ${qid - 1} soru yazıldı.`);

// ── Turso'ya sync ─────────────────────────────────────────────────────────────
const url = process.env.TURSO_DB_URL, authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) { console.log("⚠️  TURSO env yok → Turso sync atlandı (app.db güncel)."); process.exit(0); }
const { createClient } = await import("@libsql/client");
const turso = createClient({ url, authToken });
await turso.execute("DELETE FROM elifba_quiz");
const stmts = rowsForTurso.map((r) => ({
  sql: "INSERT INTO elifba_quiz (quiz_id, lesson_id, soru_tipi, soru, secenekler, dogru_cevap, ipucu, zorluk) VALUES (?,?,?,?,?,?,?,?)",
  args: r,
}));
for (let i = 0; i < stmts.length; i += 100) await turso.batch(stmts.slice(i, i + 100), "write");
const n = Number((await turso.execute("SELECT COUNT(*) n FROM elifba_quiz")).rows[0].n);
console.log(`✅ Turso: ${n} soru senkron.`);
