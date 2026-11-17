/**
 * elifbaQuizWritePlan.mjs — Elif-Ba onaylı soruları için saf yazma planı.
 *
 * Mevcut `elifba_quiz` satırları ASLA silinmez, güncellenmez veya yeniden
 * numaralandırılmaz. Plan yalnız yeni `quiz_id` INSERT'leri üretir.
 *
 * Beklenen onaylı satır biçimi (Paket 7 çıktısı):
 * {
 *   quiz_id, lesson_id, soru_tipi: "coktan_secmeli",
 *   soru, secenekler: string[], dogru_cevap, ipucu, zorluk,
 *   en: { soru, secenekler: string[], dogru_cevap, ipucu }
 * }
 */

export const EXERCISE_QUIZ_ID_MIN = 100000;
export const EXERCISE_QUIZ_ID_MAX = 199999;
export const LESSON_ID_MIN = 2;
export const LESSON_ID_MAX = 9;
export const QUIZ_TYPE = "coktan_secmeli";

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isInteger(value) {
  return typeof value === "number" && Number.isInteger(value);
}

export function parseOptions(value) {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : null;
  } catch {
    return null;
  }
}

function validateOptions(label, options, answer, errors) {
  if (!Array.isArray(options) || options.length < 2 || options.length > 4) {
    errors.push(`${label}: 2-4 şık içermeli`);
    return;
  }
  if (!options.every(isNonEmptyString)) {
    errors.push(`${label}: şıklar boş olamaz`);
    return;
  }
  if (new Set(options).size !== options.length) {
    errors.push(`${label}: şıklar benzersiz olmalı`);
  }
  if (!isNonEmptyString(answer)) {
    errors.push(`${label}: doğru cevap eksik`);
  } else if (!options.includes(answer)) {
    errors.push(`${label}: doğru cevap şıklarda yok`);
  }
}

function validateTextBlock(lang, block, label, errors) {
  if (!isRecord(block)) {
    errors.push(`${label}: ${lang} metni eksik`);
    return;
  }
  if (!isNonEmptyString(block.soru)) {
    errors.push(`${label}: ${lang} soru metni eksik`);
  }
  if (!isNonEmptyString(block.ipucu)) {
    errors.push(`${label}: ${lang} ipucu eksik`);
  }
  validateOptions(`${label}: ${lang}`, block.secenekler, block.dogru_cevap, errors);
}

function validateApprovedRow(row, label, errors) {
  if (!isInteger(row.quiz_id)) {
    errors.push(`${label}: quiz_id geçersiz`);
  } else if (row.quiz_id < EXERCISE_QUIZ_ID_MIN || row.quiz_id > EXERCISE_QUIZ_ID_MAX) {
    errors.push(
      `${label}: quiz_id ${EXERCISE_QUIZ_ID_MIN}..${EXERCISE_QUIZ_ID_MAX} aralığında olmalı`,
    );
  }

  if (!isInteger(row.lesson_id)) {
    errors.push(`${label}: lesson_id geçersiz`);
  } else if (row.lesson_id < LESSON_ID_MIN || row.lesson_id > LESSON_ID_MAX) {
    errors.push(`${label}: lesson_id ${LESSON_ID_MIN}..${LESSON_ID_MAX} aralığında olmalı`);
  }

  if (row.soru_tipi !== QUIZ_TYPE) {
    errors.push(`${label}: soru_tipi "${QUIZ_TYPE}" olmalı`);
  }

  if (!isNonEmptyString(row.soru)) {
    errors.push(`${label}: soru metni eksik`);
  }
  if (!isNonEmptyString(row.ipucu)) {
    errors.push(`${label}: ipucu eksik`);
  }
  if (!isInteger(row.zorluk) || row.zorluk < 1) {
    errors.push(`${label}: zorluk geçersiz`);
  }
  validateOptions(label, row.secenekler, row.dogru_cevap, errors);
  validateTextBlock("EN", row.en, label, errors);
}

function sameContent(existing, row) {
  const existingOptions = parseOptions(existing.secenekler);
  if (!existingOptions || existingOptions.length !== row.secenekler.length) return false;
  return (
    existing.lesson_id === row.lesson_id &&
    existing.soru_tipi === row.soru_tipi &&
    existing.soru === row.soru &&
    existingOptions.every((value, index) => value === row.secenekler[index]) &&
    existing.dogru_cevap === row.dogru_cevap &&
    (existing.ipucu ?? null) === (row.ipucu ?? null) &&
    existing.zorluk === row.zorluk
  );
}

function toDbRow(row) {
  return {
    quiz_id: row.quiz_id,
    lesson_id: row.lesson_id,
    soru_tipi: row.soru_tipi,
    soru: row.soru,
    secenekler: JSON.stringify(row.secenekler),
    dogru_cevap: row.dogru_cevap,
    ipucu: row.ipucu,
    zorluk: row.zorluk,
  };
}

export function makeWritePlan(existingRows, approvedRows) {
  const errors = [];
  const inserts = [];
  let unchanged = 0;

  if (!Array.isArray(existingRows)) {
    errors.push("existingRows: kayıt listesi (array) bekleniyor");
  }
  if (!Array.isArray(approvedRows)) {
    errors.push("approvedRows: kayıt listesi (array) bekleniyor");
    return { inserts, unchanged, errors };
  }

  const existingById = new Map();
  for (const [index, row] of (Array.isArray(existingRows) ? existingRows : []).entries()) {
    if (!isRecord(row) || !isInteger(row.quiz_id)) {
      errors.push(`mevcut #${index + 1}: quiz_id geçersiz`);
      continue;
    }
    if (existingById.has(row.quiz_id)) {
      errors.push(`mevcut #${index + 1}: quiz_id ${row.quiz_id} tekrarlanıyor`);
      continue;
    }
    existingById.set(row.quiz_id, row);
  }

  const approvedIds = new Set();
  for (const [index, row] of approvedRows.entries()) {
    const label = isRecord(row) && isInteger(row.quiz_id) ? `onaylı ${row.quiz_id}` : `onaylı #${index + 1}`;
    if (!isRecord(row)) {
      errors.push(`${label}: kayıt nesnesi değil`);
      continue;
    }

    const rowErrors = [];
    validateApprovedRow(row, label, rowErrors);
    if (approvedIds.has(row.quiz_id)) {
      rowErrors.push(`${label}: quiz_id tekrarlanıyor`);
    }
    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      continue;
    }
    approvedIds.add(row.quiz_id);

    const existing = existingById.get(row.quiz_id);
    if (existing) {
      if (sameContent(existing, row)) {
        unchanged += 1;
      } else {
        errors.push(`onaylı ${row.quiz_id}: mevcut kayıtla içerik çakışıyor`);
      }
      continue;
    }

    inserts.push(toDbRow(row));
  }

  inserts.sort((a, b) => a.quiz_id - b.quiz_id);
  return { inserts, unchanged, errors };
}
