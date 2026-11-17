import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";

import { makeWritePlan } from "./elifbaQuizWritePlan.mjs";

const INSERT_SQL =
  "INSERT INTO elifba_quiz (quiz_id, lesson_id, soru_tipi, soru, secenekler, dogru_cevap, ipucu, zorluk) VALUES (?,?,?,?,?,?,?,?)";

function oldRow(id) {
  return {
    quiz_id: id,
    lesson_id: ((id - 1) % 9) + 1,
    soru_tipi: "coktan_secmeli",
    soru: `Eski soru ${id}`,
    secenekler: JSON.stringify(["A", "B", "C"]),
    dogru_cevap: "A",
    ipucu: `Eski ipucu ${id}`,
    zorluk: 1,
  };
}

function oldRows() {
  return Array.from({ length: 405 }, (_, index) => oldRow(index + 1));
}

function approvedRow(index) {
  const quizId = 100001 + index;
  return {
    quiz_id: quizId,
    lesson_id: 2 + (index % 8),
    soru_tipi: "coktan_secmeli",
    soru: `Yeni soru ${quizId}`,
    secenekler: ["بـ", "ـبـ", "ـب"],
    dogru_cevap: "ـبـ",
    ipucu: `Yeni ipucu ${quizId}`,
    zorluk: 1,
    en: {
      soru: `New question ${quizId}`,
      secenekler: ["بـ", "ـبـ", "ـب"],
      dogru_cevap: "ـبـ",
      ipucu: `New hint ${quizId}`,
    },
  };
}

function approvedRows() {
  return Array.from({ length: 16 }, (_, index) => approvedRow(index));
}

test("405 mevcut kaydı korur ve 16 onaylı kaydı ekler", () => {
  const plan = makeWritePlan(oldRows(), approvedRows());

  assert.equal(plan.errors.length, 0);
  assert.equal(plan.unchanged, 0);
  assert.equal(plan.inserts.length, 16);
  assert.deepEqual(
    plan.inserts.map((row) => row.quiz_id),
    Array.from({ length: 16 }, (_, index) => 100001 + index),
  );
  assert.ok(plan.inserts.every((row) => row.soru_tipi === "coktan_secmeli"));
  assert.ok(plan.inserts.every((row) => row.lesson_id >= 2 && row.lesson_id <= 9));
  assert.ok(plan.inserts.every((row) => JSON.parse(row.secenekler).includes(row.dogru_cevap)));
});

test("aynı plan ikinci kez uygulanınca no-op olur", () => {
  const first = makeWritePlan(oldRows(), approvedRows());
  const merged = [...oldRows(), ...first.inserts];
  const second = makeWritePlan(merged, approvedRows());

  assert.equal(second.errors.length, 0);
  assert.equal(second.inserts.length, 0);
  assert.equal(second.unchanged, 16);
});

test("aynı quiz_id farklı içerikle reddedilir", () => {
  const rows = approvedRows();
  const existing = makeWritePlan(oldRows(), rows).inserts[0];
  const plan = makeWritePlan([...oldRows(), { ...existing, soru: "Mevcut farklı soru" }], rows);

  assert.equal(plan.inserts.length, 15);
  assert.equal(plan.unchanged, 0);
  assert.ok(plan.errors.some((error) => error.includes("100001") && error.includes("çakışıyor")));
});

test("lesson_id ve quiz_id aralığı dışındaki kayıtlar reddedilir", () => {
  const rows = approvedRows();
  rows[0] = { ...rows[0], lesson_id: 10 };
  rows[1] = { ...rows[1], lesson_id: 1 };
  rows[2] = { ...rows[2], quiz_id: 99999 };
  rows[3] = { ...rows[3], quiz_id: 200000 };
  const plan = makeWritePlan(oldRows(), rows);

  assert.equal(plan.inserts.length, 12);
  assert.ok(plan.errors.some((error) => error.includes("lesson_id 2..9")));
  assert.ok(plan.errors.some((error) => error.includes("quiz_id 100000..199999")));
});

test("eksik EN metni reddedilir", () => {
  const rows = approvedRows();
  delete rows[0].en;
  rows[1].en = { ...rows[1].en, ipucu: "" };
  const plan = makeWritePlan(oldRows(), rows);

  assert.equal(plan.inserts.length, 14);
  assert.ok(plan.errors.some((error) => error.includes("100001") && error.includes("EN metni eksik")));
  assert.ok(plan.errors.some((error) => error.includes("100002") && error.includes("EN ipucu eksik")));
});

test("geçersiz şıklar reddedilir", () => {
  const rows = approvedRows();
  rows[0] = { ...rows[0], secenekler: ["ــ", "ــ", "ــ"] };
  rows[1] = { ...rows[1], secenekler: ["ا", "ب"], dogru_cevap: "ج" };
  rows[2] = { ...rows[2], secenekler: ["ا"] };
  const plan = makeWritePlan(oldRows(), rows);

  assert.equal(plan.inserts.length, 13);
  assert.ok(plan.errors.some((error) => error.includes("şıklar benzersiz olmalı")));
  assert.ok(plan.errors.some((error) => error.includes("doğru cevap şıklarda yok")));
  assert.ok(plan.errors.some((error) => error.includes("2-4 şık")));
});

test("onaylı listede tekrarlanan quiz_id reddedilir", () => {
  const rows = approvedRows();
  rows.push({ ...approvedRow(0) });
  const plan = makeWritePlan(oldRows(), rows);

  assert.equal(plan.inserts.length, 16);
  assert.ok(plan.errors.some((error) => error.includes("quiz_id tekrarlanıyor")));
});

test("transaction fixture: rollback 405 kaydı korur, commit 421 yapar", () => {
  const db = new DatabaseSync(":memory:");
  db.exec(
    "CREATE TABLE elifba_quiz (quiz_id INTEGER PRIMARY KEY, lesson_id INTEGER NOT NULL, soru_tipi TEXT NOT NULL, soru TEXT NOT NULL, secenekler TEXT NOT NULL, dogru_cevap TEXT NOT NULL, ipucu TEXT, zorluk INTEGER NOT NULL)",
  );
  db.exec(
    "CREATE TABLE elifba_dersler (id INTEGER PRIMARY KEY); INSERT INTO elifba_dersler (id) VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9)",
  );

  const insert = db.prepare(INSERT_SQL);
  for (const row of oldRows()) {
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
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM elifba_quiz").get().n, 405);

  const plan = makeWritePlan(
    db.prepare("SELECT * FROM elifba_quiz ORDER BY quiz_id").all(),
    approvedRows(),
  );
  assert.equal(plan.errors.length, 0);
  assert.equal(plan.inserts.length, 16);

  // Başarısız deneme: yaz + rollback → eski 405 aynı kalmalı.
  db.exec("BEGIN IMMEDIATE");
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
  db.exec("ROLLBACK");
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM elifba_quiz").get().n, 405);

  // Başarılı atomik yazma → 421.
  db.exec("BEGIN IMMEDIATE");
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
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM elifba_quiz").get().n, 421);

  const next = makeWritePlan(
    db.prepare("SELECT * FROM elifba_quiz ORDER BY quiz_id").all(),
    approvedRows(),
  );
  assert.equal(next.errors.length, 0);
  assert.equal(next.inserts.length, 0);
  assert.equal(next.unchanged, 16);

  db.close();
});
