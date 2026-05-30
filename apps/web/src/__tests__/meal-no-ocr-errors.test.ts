/**
 * meal-no-ocr-errors.test.ts
 *
 * Amac: DB'deki meal metinlerinde OCR kaynaklı bozuk karakter
 *       kalıntısı olmadığını doğrulamak.
 *
 * fix_db_data.py ile 719 ayet düzeltildi. Bu test, düzeltmenin
 * ayakta kaldığını teyit eder.
 */

import { DatabaseSync } from "node:sqlite";
import path from "path";

// ── DB bağlantısı (dbUtils.ts ile aynı mantık) ────────────────────────────────

const DB_PATH = process.env.DATA_PATH
  ? path.join(process.env.DATA_PATH, "app.db")
  : path.resolve(process.cwd(), "..", "..", "data", "app.db");

interface VerseRow {
  surah_id: number;
  ayah_number: number;
  primary_translation: string | null;
}

// ── OCR bozuk karakter kalıpları ──────────────────────────────────────────────

/**
 * Her kalıp: [aranan karakter, açıklama, orijinal doğru karakter]
 * Örn: "1" rakamı `ı` yerine, "_" alt çizgi `ş` yerine geçmiş.
 */
const OCR_PATTERNS: { char: string; label: string; correctChar: string }[] = [
  { char: "_", label: "alt çizgi (ş yerine)", correctChar: "ş" },
  { char: "0", label: "sıfır (İ yerine)",    correctChar: "İ" },
  { char: "6", label: "altı (ö yerine)",     correctChar: "ö" },
  { char: "1", label: "bir (ı yerine)",      correctChar: "ı" },
];

// ── Yardımcı ──────────────────────────────────────────────────────────────────

function loadAllVerses(): VerseRow[] {
  const db = new DatabaseSync(DB_PATH, { readOnly: true });
  db.exec(`
    PRAGMA cache_size   = -32768;
    PRAGMA mmap_size    = 268435456;
    PRAGMA temp_store   = MEMORY;
    PRAGMA busy_timeout = 5000;
  `);

  const stmt = db.prepare(
    "SELECT surah_id, ayah_number, primary_translation FROM verses ORDER BY surah_id, ayah_number",
  );
  const raw = stmt.all() as unknown as VerseRow[];
  const rows: VerseRow[] = raw.map((r: VerseRow) => ({
    surah_id: r.surah_id,
    ayah_number: r.ayah_number,
    primary_translation: r.primary_translation,
  }));

  db.close();
  return rows;
}

/**
 * Verilen metinde OCR karakterlerinden herhangi biri var mı?
 * Varsa hangi karakter ve konumda olduğunu döner.
 */
function findOcrErrors(text: string): { char: string; label: string; correctChar: string }[] {
  const hits: { char: string; label: string; correctChar: string }[] = [];
  for (const pattern of OCR_PATTERNS) {
    if (text.includes(pattern.char)) {
      hits.push(pattern);
    }
  }
  return hits;
}

// ── Test ──────────────────────────────────────────────────────────────────────

describe("Meal metinlerinde OCR bozuk karakter kontrolü", () => {
  let verses: VerseRow[];

  beforeAll(() => {
    verses = loadAllVerses();
  });

  test("tüm surelerde meal metni mevcut olmalı", () => {
    // Her sure için en az 1 meal kaydı olmalı
    const surahIds = new Set(verses.map((v) => v.surah_id));
    expect(surahIds.size).toBe(114);
  });

  test("meal metinleri null olmamalı", () => {
    const nullVerses = verses.filter((v) => v.primary_translation === null);
    if (nullVerses.length > 0) {
      const list = nullVerses
        .slice(0, 20)
        .map((v) => `${v.surah_id}:${v.ayah_number}`)
        .join(", ");
      throw new Error(
        `${nullVerses.length} ayette meal (primary_translation) NULL. ` +
          `İlk bulunanlar: ${list}` +
          (nullVerses.length > 20 ? ` ... (ve ${nullVerses.length - 20} tane daha)` : ""),
      );
    }
  });

  test("meal metinlerinde OCR bozuk karakter bulunmamalı", () => {
    const errors: {
      surahId: number;
      ayahNumber: number;
      mealSnippet: string;
      chars: string[];
    }[] = [];

    for (const v of verses) {
      if (v.primary_translation === null) continue;

      const hits = findOcrErrors(v.primary_translation);
      if (hits.length > 0) {
        // Bağlam için meal'in 80 karakterlik bir parçasını al
        const snippet =
          v.primary_translation.length > 80
            ? v.primary_translation.substring(0, 80) + "..."
            : v.primary_translation;

        errors.push({
          surahId: v.surah_id,
          ayahNumber: v.ayah_number,
          mealSnippet: snippet,
          chars: hits.map((h) => `${h.char} (${h.label})`),
        });
      }
    }

    if (errors.length > 0) {
      const details = errors
        .map(
          (e) =>
            `  ${e.surahId}:${e.ayahNumber} → "${e.mealSnippet}"\n` +
            `    Bozuk karakter(ler): ${e.chars.join(", ")}`,
        )
        .join("\n");

      throw new Error(
        `${errors.length} ayette OCR bozuk karakter bulundu:\n${details}\n\n` +
          `Toplam ${errors.length} hatalı ayet. fix_db_data.py yeniden çalıştırılmalı.`,
      );
    }
  });

  test("Sure 1 (Fatiha) özel kontrolü", () => {
    const fatiha = verses.filter((v) => v.surah_id === 1);
    expect(fatiha.length).toBe(7);

    for (const v of fatiha) {
      expect(v.primary_translation).toBeTruthy();
      const hits = findOcrErrors(v.primary_translation!);
      if (hits.length > 0) {
        throw new Error(
          `Fatiha ${v.ayah_number}. ayette bozuk karakter: ${hits.map((h) => h.label).join(", ")}\n` +
            `  Meal: "${v.primary_translation}"`,
        );
      }
    }
  });
});