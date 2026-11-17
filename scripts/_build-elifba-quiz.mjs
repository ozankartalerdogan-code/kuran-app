/**
 * _build-elifba-quiz.mjs — Onaylı Elif-Ba sorularını DB'ye güvenli aktarır.
 *
 * Varsayılan çalışma salt okunur plandır:
 *   node scripts/_build-elifba-quiz.mjs --dry --target local
 *
 * Yazma yalnız açık onayla ve tek hedefte yapılır:
 *   node scripts/_build-elifba-quiz.mjs --apply --target local
 *   node --env-file=apps/web/.env.local scripts/_build-elifba-quiz.mjs --apply --target turso
 *
 * Mevcut 1..405 kayıtları silinmez, güncellenmez veya yeniden numaralandırılmaz.
 * Yalnız plan içindeki yeni quiz_id'ler tek transaction/batch ile eklenir.
 */
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeWritePlan, QUIZ_TYPE } from "./lib/elifbaQuizWritePlan.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DB_PATH = path.join(ROOT, "data", "app.db");
const REVIEWED_PATH = path.join(ROOT, "content", "elifba", "exercises.reviewed.json");
const EN_DICT_PATH = path.join(ROOT, "apps", "mobile", "src", "data", "elifba.en.json");
const TARGETS = new Set(["local", "turso"]);
const COLUMNS = "quiz_id, lesson_id, soru_tipi, soru, secenekler, dogru_cevap, ipucu, zorluk";
const INSERT_SQL = `INSERT INTO elifba_quiz (${COLUMNS}) VALUES (?,?,?,?,?,?,?,?)`;

function fail(message) {
  console.error(`Hata: ${message}`);
  process.exit(2);
}

function parseArgs(argv) {
  let apply = false;
  let dry = false;
  let target;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--apply") apply = true;
    else if (arg === "--dry") dry = true;
    else if (arg === "--target") {
      target = argv[i + 1];
      i += 1;
    } else if (arg.startsWith("--target=")) {
      target = arg.slice("--target=".length);
    } else {
      fail(`bilinmeyen argüman: ${arg}`);
    }
  }

  if (apply && dry) fail("--apply ve --dry birlikte kullanılamaz");
  if (!target) fail("--target local|turso zorunlu");
  if (!TARGETS.has(target)) fail(`geçersiz hedef: ${target}`);

  return { apply, target };
}

// Paket 7 onaylı metnini DB satırına çevirir. `buildExerciseQuestions`
// (apps/mobile/src/lib/elifbaExerciseGen.ts) ile aynı biçim: Arapça varsa
// soru metninin sonuna "\n" + Arapça eklenir.
function buildSoru(prompt, arabic) {
  return arabic.length > 0 ? `${prompt}\n${arabic}` : prompt;
}

function loadApprovedRows() {
  const exercises = JSON.parse(fs.readFileSync(REVIEWED_PATH, "utf8"));
  if (!Array.isArray(exercises)) fail("exercises.reviewed.json bir dizi olmalı");

  return exercises.map((row) => ({
    quiz_id: row.quizId,
    lesson_id: row.lessonId,
    soru_tipi: QUIZ_TYPE,
    soru: buildSoru(row.tr.prompt, row.arabic),
    secenekler: [...row.tr.options],
    dogru_cevap: row.tr.answer,
    ipucu: row.tr.hint,
    zorluk: 1,
    en: {
      soru: buildSoru(row.en.prompt, row.arabic),
      secenekler: [...row.en.options],
      dogru_cevap: row.en.answer,
      ipucu: row.en.hint,
    },
  }));
}

function readLocalRows(db) {
  return db.prepare(`SELECT ${COLUMNS} FROM elifba_quiz ORDER BY quiz_id`).all();
}

async function createTursoClient() {
  const url = process.env.TURSO_DB_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) fail("Turso hedefi için TURSO_DB_URL ve TURSO_AUTH_TOKEN gerekli");
  const { createClient } = await import("@libsql/client");
  return createClient({ url, authToken });
}

async function readTursoRows(turso) {
  const result = await turso.execute(`SELECT ${COLUMNS} FROM elifba_quiz ORDER BY quiz_id`);
  return result.rows;
}

function loadEnDictionary() {
  try {
    const parsed = JSON.parse(fs.readFileSync(EN_DICT_PATH, "utf8"));
    return parsed && typeof parsed === "object" ? parsed.strings ?? {} : {};
  } catch {
    return {};
  }
}

function reportEnCoverage(approvedRows) {
  const dictionary = loadEnDictionary();
  const missing = [];
  let covered = 0;

  for (const row of approvedRows) {
    const keys = [
      ...new Set([row.soru, ...row.secenekler, row.dogru_cevap, row.ipucu]),
    ].filter((key) => typeof key === "string" && key.length > 0);
    const absent = keys.filter(
      (key) => !Object.prototype.hasOwnProperty.call(dictionary, key) || !dictionary[key],
    );
    if (absent.length === 0) covered += 1;
    else missing.push({ quiz_id: row.quiz_id, missing: absent.length });
  }

  return { total: approvedRows.length, covered, missing };
}

function printPlan(plan, existingRows, approvedRows) {
  const coverage = reportEnCoverage(approvedRows);
  const projectedByLesson = new Map();
  for (const row of existingRows) {
    projectedByLesson.set(row.lesson_id, (projectedByLesson.get(row.lesson_id) ?? 0) + 1);
  }
  for (const row of plan.inserts) {
    projectedByLesson.set(row.lesson_id, (projectedByLesson.get(row.lesson_id) ?? 0) + 1);
  }

  console.log("=== Elif-Ba quiz yazma planı (salt okunur) ===");
  console.log(`Mevcut kayıt: ${existingRows.length}`);
  console.log(`Eklenecek yeni kayıt: ${plan.inserts.length}`);
  console.log(`Değişmeyen (no-op): ${plan.unchanged}`);
  console.log(`Çakışma/hata: ${plan.errors.length}`);
  console.log(`Beklenen yeni toplam: ${existingRows.length + plan.inserts.length}`);
  console.log(
    `Ders dağılımı (mevcut → yeni): ${[...projectedByLesson.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([lesson, total]) => `D${lesson}: ${total}`)
      .join(", ")}`,
  );

  if (plan.inserts.length > 0) {
    console.log("\nEklenecek ID'ler:");
    console.log(`  ${plan.inserts.map((row) => `${row.quiz_id}→D${row.lesson_id}`).join(", ")}`);
  }

  console.log("\nEN sözlük kapsamı (yeni sorular):");
  console.log(
    `  Tam kapsanan: ${coverage.covered}/${coverage.total}; eksik: ${coverage.missing.length}`,
  );
  if (coverage.missing.length > 0) {
    console.log(
      `  Eksik ID'ler: ${coverage.missing.map((item) => `${item.quiz_id}(${item.missing})`).join(", ")}`,
    );
  }

  if (plan.errors.length > 0) {
    console.log("\nHatalar:");
    for (const error of plan.errors) console.log(`  - ${error}`);
  }
}

function fingerprint(row) {
  return JSON.stringify([
    row.lesson_id,
    row.soru_tipi,
    row.soru,
    row.secenekler,
    row.dogru_cevap,
    row.ipucu ?? null,
    row.zorluk,
  ]);
}

function verifyPostflight(beforeRows, afterRows, plan) {
  const problems = [];
  const afterById = new Map(afterRows.map((row) => [Number(row.quiz_id), row]));

  if (afterRows.length !== beforeRows.length + plan.inserts.length) {
    problems.push(
      `kayıt sayısı beklenen ${beforeRows.length + plan.inserts.length}, bulunan ${afterRows.length}`,
    );
  }

  for (const row of beforeRows) {
    const after = afterById.get(Number(row.quiz_id));
    if (!after || fingerprint(after) !== fingerprint(row)) {
      problems.push(`mevcut ${row.quiz_id} içeriği değişti`);
    }
  }

  for (const inserted of plan.inserts) {
    const after = afterById.get(inserted.quiz_id);
    if (!after) {
      problems.push(`yeni ${inserted.quiz_id} yazılmadı`);
      continue;
    }
    const options = JSON.parse(inserted.secenekler);
    if (!options.includes(inserted.dogru_cevap)) {
      problems.push(`yeni ${inserted.quiz_id} doğru cevabı şıklarda değil`);
    }
  }

  return problems;
}

async function applyLocal(approvedRows) {
  const db = new DatabaseSync(DB_PATH);
  let transactionOpen = false;
  try {
    db.exec("BEGIN IMMEDIATE");
    transactionOpen = true;
    const beforeRows = readLocalRows(db);
    const plan = makeWritePlan(beforeRows, approvedRows);

    if (plan.errors.length > 0) {
      db.exec("ROLLBACK");
      transactionOpen = false;
      printPlan(plan, beforeRows, approvedRows);
      fail("plan hatalı; hiçbir satır yazılmadı");
    }
    if (plan.inserts.length === 0) {
      db.exec("ROLLBACK");
      transactionOpen = false;
      console.log(`Yazılacak yeni kayıt yok (no-op ${plan.unchanged}).`);
      return;
    }

    const insert = db.prepare(INSERT_SQL);
    for (const row of plan.inserts) {
      insert.run(
        row.quiz_id,
        row.lesson_id,
        row.soru_tipi,
        row.soru,
        row.secenekler,
        row.dogru_cevap,
        row.ipucu,
        row.zorluk,
      );
    }
    db.exec("COMMIT");
    transactionOpen = false;

    const afterRows = readLocalRows(db);
    const problems = verifyPostflight(beforeRows, afterRows, plan);
    if (problems.length > 0) fail(`yazma sonrası doğrulama başarısız: ${problems.join("; ")}`);

    console.log(`✅ local: ${plan.inserts.length} soru eklendi, toplam ${afterRows.length}.`);
  } catch (error) {
    if (transactionOpen) {
      try {
        db.exec("ROLLBACK");
      } catch {
        // rollback hatası asıl hatayı gölgelemesin
      }
    }
    throw error;
  } finally {
    db.close();
  }
}

async function applyTurso(approvedRows) {
  const turso = await createTursoClient();
  const beforeRows = await readTursoRows(turso);
  const plan = makeWritePlan(beforeRows, approvedRows);

  if (plan.errors.length > 0) {
    printPlan(plan, beforeRows, approvedRows);
    fail("plan hatalı; hiçbir satır yazılmadı");
  }
  if (plan.inserts.length === 0) {
    console.log(`Yazılacak yeni kayıt yok (no-op ${plan.unchanged}).`);
    return;
  }

  const statements = plan.inserts.map((row) => ({
    sql: INSERT_SQL,
    args: [
      row.quiz_id,
      row.lesson_id,
      row.soru_tipi,
      row.soru,
      row.secenekler,
      row.dogru_cevap,
      row.ipucu,
      row.zorluk,
    ],
  }));
  await turso.batch(statements, "write");

  const afterRows = await readTursoRows(turso);
  const problems = verifyPostflight(beforeRows, afterRows, plan);
  if (problems.length > 0) fail(`yazma sonrası doğrulama başarısız: ${problems.join("; ")}`);

  console.log(`✅ turso: ${plan.inserts.length} soru eklendi, toplam ${afterRows.length}.`);
}

async function main() {
  const { apply, target } = parseArgs(process.argv.slice(2));
  const approvedRows = loadApprovedRows();

  if (apply) {
    if (target === "local") await applyLocal(approvedRows);
    else await applyTurso(approvedRows);
    return;
  }

  if (target === "local") {
    const db = new DatabaseSync(DB_PATH, { readOnly: true });
    try {
      if (!db.isOpen) fail("app.db salt okunur açılamadı");
      const existingRows = readLocalRows(db);
      const plan = makeWritePlan(existingRows, approvedRows);
      printPlan(plan, existingRows, approvedRows);
      if (plan.errors.length > 0) process.exitCode = 1;
    } finally {
      db.close();
    }
    return;
  }

  const turso = await createTursoClient();
  const existingRows = await readTursoRows(turso);
  const plan = makeWritePlan(existingRows, approvedRows);
  printPlan(plan, existingRows, approvedRows);
  if (plan.errors.length > 0) process.exitCode = 1;
}

await main();
