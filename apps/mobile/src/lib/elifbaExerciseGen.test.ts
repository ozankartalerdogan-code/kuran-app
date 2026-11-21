import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EXERCISE_QUIZ_ID_MAX,
  EXERCISE_QUIZ_ID_MIN,
  buildExerciseQuestions,
  validateExercises,
  type ExerciseText,
  type ReviewedExercise,
} from "./elifbaExerciseGen.ts";
import {
  parseElifbaSrs,
  type ElifbaSrsMap,
} from "./elifbaProgress.ts";
import {
  countLessonWrong,
  indexLessonQuestions,
  selectWrongReview,
} from "./elifbaReview.ts";

function text(overrides: Partial<ExerciseText> = {}): ExerciseText {
  return {
    prompt: "Soru?",
    options: ["A", "B", "C"],
    answer: "A",
    hint: "İpucu",
    ...overrides,
  };
}

function make(overrides: Partial<ReviewedExercise> = {}): ReviewedExercise {
  return {
    key: "p7-d2-1",
    lessonId: 2,
    kind: "position",
    source: { path: "data/test.json", line: 1 },
    arabic: "ب",
    tr: text(),
    en: text({ prompt: "Question?", hint: "Hint" }),
    review: { status: "approved", reviewer: "jalek", date: "2026-11-17" },
    quizId: 100001,
    ...overrides,
  };
}

test("validateExercises: taslak, eksik inceleyen ve eksik tarih reddedilir", () => {
  const draft = validateExercises([make({ review: { status: "draft", reviewer: "jalek", date: "2026-11-17" } })]);
  assert.equal(draft.valid.length, 0);
  assert.ok(draft.errors.some((error) => error.includes("onaylı")));

  const noReviewer = validateExercises([
    make({ review: { status: "approved", reviewer: "  ", date: "2026-11-17" } }),
  ]);
  assert.equal(noReviewer.valid.length, 0);
  assert.ok(noReviewer.errors.some((error) => error.includes("inceleyen")));

  const noDate = validateExercises([
    make({ review: { status: "approved", reviewer: "jalek", date: "" } }),
  ]);
  assert.equal(noDate.valid.length, 0);
  assert.ok(noDate.errors.some((error) => error.includes("tarihi")));
});

test("validateExercises: eksik EN metni reddedilir", () => {
  const { valid, errors } = validateExercises([
    make({ en: undefined as unknown as ExerciseText }),
  ]);
  assert.equal(valid.length, 0);
  assert.ok(errors.some((error) => error.includes("EN")));
});

test("validateExercises: tekrarlanan key ve quizId reddedilir", () => {
  const duplicateKey = validateExercises([
    make({ key: "aynı", quizId: 100001 }),
    make({ key: "aynı", quizId: 100002 }),
  ]);
  assert.equal(duplicateKey.valid.length, 0);
  assert.ok(duplicateKey.errors.some((error) => error.includes("key tekrarlanıyor")));

  const duplicateId = validateExercises([
    make({ key: "a", quizId: 100005 }),
    make({ key: "b", quizId: 100005 }),
  ]);
  assert.equal(duplicateId.valid.length, 0);
  assert.ok(duplicateId.errors.some((error) => error.includes("quizId tekrarlanıyor")));
});

test("validateExercises: kalıcı quizId aralığı dışı reddedilir", () => {
  const low = validateExercises([make({ quizId: EXERCISE_QUIZ_ID_MIN - 1 })]);
  assert.equal(low.valid.length, 0);
  assert.ok(low.errors.some((error) => error.includes("aralığında")));

  const high = validateExercises([make({ quizId: EXERCISE_QUIZ_ID_MAX + 1 })]);
  assert.equal(high.valid.length, 0);
  assert.ok(high.errors.some((error) => error.includes("aralığında")));
});

test("validateExercises: şık çakışması, eksik doğru cevap ve şık sayısı reddedilir", () => {
  const duplicateOptions = validateExercises([
    make({ tr: text({ options: ["A", "A", "B"], answer: "A" }) }),
  ]);
  assert.equal(duplicateOptions.valid.length, 0);
  assert.ok(duplicateOptions.errors.some((error) => error.includes("benzersiz")));

  const missingAnswer = validateExercises([
    make({ tr: text({ options: ["A", "B"], answer: "C" }) }),
  ]);
  assert.equal(missingAnswer.valid.length, 0);
  assert.ok(missingAnswer.errors.some((error) => error.includes("şıklarda yok")));

  const tooFew = validateExercises([make({ tr: text({ options: ["A"], answer: "A" }) })]);
  assert.equal(tooFew.valid.length, 0);

  const tooMany = validateExercises([
    make({ tr: text({ options: ["A", "B", "C", "D", "E"], answer: "A" }) }),
  ]);
  assert.equal(tooMany.valid.length, 0);
});

test("buildExerciseQuestions: ders filtresi uygular", () => {
  const rows = [
    make({ key: "d2", lessonId: 2, quizId: 100001, arabic: "ب" }),
    make({ key: "d3", lessonId: 3, quizId: 100002, arabic: "ت" }),
  ];

  assert.deepEqual(
    buildExerciseQuestions(rows, 2, "tr").map((question) => question.quiz_id),
    [100001],
  );
  assert.deepEqual(
    buildExerciseQuestions(rows, 3, "tr").map((question) => question.quiz_id),
    [100002],
  );
  assert.deepEqual(buildExerciseQuestions(rows, 1, "tr"), []);
});

test("buildExerciseQuestions: kimlikler sıradan bağımsızdır", () => {
  const first = make({ key: "a", quizId: 100010 });
  const second = make({ key: "b", quizId: 100005, arabic: "ت" });

  assert.deepEqual(
    buildExerciseQuestions([first, second], 2, "tr").map((question) => question.quiz_id),
    [100010, 100005],
  );
  assert.deepEqual(
    buildExerciseQuestions([second, first], 2, "tr").map((question) => question.quiz_id),
    [100005, 100010],
  );
});

test("buildExerciseQuestions: Unicode ve onaylı kaynak metnini aynen korur", () => {
  const arabic = "رَزَقَ";
  const options = ["Üstün (fetha)", "Esre (kesra)", "Ötre (damme)"];
  const [question] = buildExerciseQuestions(
    [
      make({
        arabic,
        tr: text({ options, answer: "Üstün (fetha)", prompt: "Harekenin adı nedir?" }),
      }),
    ],
    2,
    "tr",
  );

  assert.ok(question.soru.includes(arabic));
  assert.equal(question.soru, `Harekenin adı nedir?\n${arabic}`);
  assert.deepEqual(question.secenekler, options);
  assert.equal(question.dogru_cevap, "Üstün (fetha)");
  assert.equal(question.ipucu, "İpucu");
});

test("buildExerciseQuestions: iki dilde aynı doğru öğeyi işaret eder", () => {
  const row = make({
    tr: text({ options: ["Bir", "İki", "Üç"], answer: "İki" }),
    en: text({
      prompt: "Which one?",
      hint: "Hint",
      options: ["One", "Two", "Three"],
      answer: "Two",
    }),
  });

  const [trQuestion] = buildExerciseQuestions([row], 2, "tr");
  const [enQuestion] = buildExerciseQuestions([row], 2, "en");

  assert.equal(
    trQuestion.secenekler.indexOf(trQuestion.dogru_cevap),
    enQuestion.secenekler.indexOf(enQuestion.dogru_cevap),
  );
});

test("validateExercises ve buildExerciseQuestions: boş banka", () => {
  const result = validateExercises([]);
  assert.deepEqual(result, { valid: [], errors: [] });
  assert.deepEqual(buildExerciseQuestions([], 2, "tr"), []);
});

test("buildExerciseQuestions: boş Arapça geçerlidir ve yalnız soru metni gösterilir", () => {
  const [question] = buildExerciseQuestions(
    [make({ arabic: "", tr: text({ prompt: "Kural nedir?" }) })],
    2,
    "tr",
  );

  assert.equal(question.soru, "Kural nedir?");
  assert.equal(question.exerciseArabic, "");
});

test("buildExerciseQuestions preserves the Arabic audio source in both languages", () => {
  const row = make({ arabic: "رَزَقَ" });
  for (const lang of ["tr", "en"] as const) {
    assert.equal(buildExerciseQuestions([row], row.lessonId, lang)[0].exerciseArabic, row.arabic);
  }
});

test("buildExerciseQuestions: yalnız onaylı kayıtları kullanır", () => {
  const approved = make({ key: "ok", quizId: 100001 });
  const draft = make({
    key: "taslak",
    quizId: 100002,
    review: { status: "draft", reviewer: "jalek", date: "2026-11-17" },
  });

  assert.deepEqual(
    buildExerciseQuestions([approved, draft], 2, "tr").map((question) => question.quiz_id),
    [100001],
  );
});

test("parseElifbaSrs: exercise:<sayı> anahtarını kabul eder", () => {
  const parsed = parseElifbaSrs({
    "exercise:100001": { box: 1, wrong: 1, lastTs: 5 },
  });

  assert.deepEqual(parsed, {
    "exercise:100001": { box: 1, wrong: 1, lastTs: 5 },
  });
});

test("Paket 2 sayaçları exercise anahtarlarını saymaz", () => {
  const catalog = indexLessonQuestions([[{ quiz_id: 100001, lesson_id: 2 }]]);
  const srs: ElifbaSrsMap = {
    "exercise:100001": { box: 1, wrong: 1, lastTs: 1 },
  };

  assert.equal(countLessonWrong(srs, catalog, 2), 0);
  assert.deepEqual(
    selectWrongReview([{ quiz_id: 100001, lesson_id: 2 }], srs, 15, () => 0),
    [],
  );
});
