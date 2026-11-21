import type { QuizQuestion } from "./elifbaQuizSession";

export type ExerciseKind = "mark" | "position" | "reading" | "rule";

export type ExerciseSource = {
  path: string;
  line: number;
  page?: number;
};

export type ExerciseText = {
  prompt: string;
  options: string[];
  answer: string;
  hint: string;
};

export type ExerciseReview = {
  status: "draft" | "approved";
  reviewer: string;
  date: string;
};

export type ReviewedExercise = {
  key: string;
  lessonId: number;
  kind: ExerciseKind;
  source: ExerciseSource;
  arabic: string;
  tr: ExerciseText;
  en: ExerciseText;
  review: ExerciseReview;
  quizId: number;
};

export const EXERCISE_QUIZ_ID_MIN = 100000;
export const EXERCISE_QUIZ_ID_MAX = 199999;

const EXERCISE_KINDS: readonly ExerciseKind[] = ["mark", "position", "reading", "rule"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function validateExerciseText(
  lang: "tr" | "en",
  value: unknown,
  label: string,
  errors: string[],
): void {
  if (!isRecord(value)) {
    errors.push(`${label}: ${lang.toUpperCase()} metni eksik`);
    return;
  }

  if (!isNonEmptyString(value.prompt)) {
    errors.push(`${label}: ${lang.toUpperCase()} soru metni eksik`);
  }
  if (!isNonEmptyString(value.hint)) {
    errors.push(`${label}: ${lang.toUpperCase()} ipucu eksik`);
  }

  const options = value.options;
  if (!Array.isArray(options) || options.length < 2 || options.length > 4) {
    errors.push(`${label}: ${lang.toUpperCase()} 2-4 şık içermeli`);
  } else if (!options.every(isNonEmptyString)) {
    errors.push(`${label}: ${lang.toUpperCase()} şıkları boş olamaz`);
  } else if (new Set(options).size !== options.length) {
    errors.push(`${label}: ${lang.toUpperCase()} şıkları benzersiz olmalı`);
  }

  if (!isNonEmptyString(value.answer)) {
    errors.push(`${label}: ${lang.toUpperCase()} doğru cevap eksik`);
  } else if (Array.isArray(options) && !options.includes(value.answer)) {
    errors.push(`${label}: ${lang.toUpperCase()} doğru cevap şıklarda yok`);
  }
}

export function validateExercises(
  rows: readonly ReviewedExercise[],
): { valid: ReviewedExercise[]; errors: string[] } {
  if (!Array.isArray(rows)) {
    return { valid: [], errors: ["Kök: kayıt listesi (array) bekleniyor"] };
  }

  const keyCounts = new Map<string, number>();
  const quizIdCounts = new Map<number, number>();
  for (const row of rows) {
    if (!isRecord(row)) continue;
    if (isNonEmptyString(row.key)) {
      keyCounts.set(row.key, (keyCounts.get(row.key) ?? 0) + 1);
    }
    if (typeof row.quizId === "number" && Number.isInteger(row.quizId)) {
      quizIdCounts.set(row.quizId, (quizIdCounts.get(row.quizId) ?? 0) + 1);
    }
  }

  const errors: string[] = [];
  const valid: ReviewedExercise[] = [];

  rows.forEach((row, index) => {
    if (!isRecord(row)) {
      errors.push(`#${index + 1}: kayıt nesnesi değil`);
      return;
    }

    const raw = row as unknown as Record<string, unknown>;
    const label = isNonEmptyString(raw.key) ? `#${index + 1} (${raw.key})` : `#${index + 1}`;
    const rowErrors: string[] = [];

    if (!isNonEmptyString(raw.key)) {
      rowErrors.push(`${label}: key eksik`);
    } else if ((keyCounts.get(raw.key) ?? 0) > 1) {
      rowErrors.push(`${label}: key tekrarlanıyor`);
    }

    if (!isPositiveInteger(raw.lessonId)) {
      rowErrors.push(`${label}: lessonId geçersiz`);
    }

    if (typeof raw.kind !== "string" || !EXERCISE_KINDS.includes(raw.kind as ExerciseKind)) {
      rowErrors.push(`${label}: kind geçersiz`);
    }

    const source = raw.source;
    if (!isRecord(source)) {
      rowErrors.push(`${label}: kaynak bilgisi eksik`);
    } else {
      if (!isNonEmptyString(source.path)) {
        rowErrors.push(`${label}: kaynak yolu eksik`);
      }
      if (!isPositiveInteger(source.line)) {
        rowErrors.push(`${label}: kaynak satırı geçersiz`);
      }
      if (source.page !== undefined && !isPositiveInteger(source.page)) {
        rowErrors.push(`${label}: kaynak sayfası geçersiz`);
      }
    }

    if (typeof raw.arabic !== "string") {
      rowErrors.push(`${label}: Arapça metin alanı eksik`);
    }

    const review = raw.review;
    if (!isRecord(review)) {
      rowErrors.push(`${label}: inceleme bilgisi eksik`);
    } else {
      if (review.status !== "approved") {
        rowErrors.push(`${label}: yalnız onaylı kayıtlar geçerli`);
      }
      if (!isNonEmptyString(review.reviewer)) {
        rowErrors.push(`${label}: inceleyen eksik`);
      }
      if (!isNonEmptyString(review.date)) {
        rowErrors.push(`${label}: inceleme tarihi eksik`);
      }
    }

    if (!isPositiveInteger(raw.quizId)) {
      rowErrors.push(`${label}: quizId geçersiz`);
    } else {
      if (raw.quizId < EXERCISE_QUIZ_ID_MIN || raw.quizId > EXERCISE_QUIZ_ID_MAX) {
        rowErrors.push(
          `${label}: quizId ${EXERCISE_QUIZ_ID_MIN}..${EXERCISE_QUIZ_ID_MAX} aralığında olmalı`,
        );
      }
      if ((quizIdCounts.get(raw.quizId) ?? 0) > 1) {
        rowErrors.push(`${label}: quizId tekrarlanıyor`);
      }
    }

    validateExerciseText("tr", raw.tr, label, rowErrors);
    validateExerciseText("en", raw.en, label, rowErrors);

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      return;
    }

    valid.push(row as unknown as ReviewedExercise);
  });

  return { valid, errors };
}

export function buildExerciseQuestions(
  rows: readonly ReviewedExercise[],
  lessonId: number,
  lang: "tr" | "en",
): QuizQuestion[] {
  const { valid } = validateExercises(rows);
  const textLang = lang === "en" ? "en" : "tr";

  return valid
    .filter((row) => row.lessonId === lessonId)
    .map((row) => {
      const text = row[textLang];
      return {
        quiz_id: row.quizId,
        lesson_id: row.lessonId,
        soru: row.arabic.length > 0 ? `${text.prompt}\n${row.arabic}` : text.prompt,
        exerciseArabic: row.arabic,
        secenekler: [...text.options],
        dogru_cevap: text.answer,
        ipucu: text.hint,
        zorluk: 1,
      };
    });
}
