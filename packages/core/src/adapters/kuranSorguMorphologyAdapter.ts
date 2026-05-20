import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(currentDirectory, "../../../../data/app.db");

export interface MorphologyEntry {
  wordIndex: number;
  arabic: string | null;
  root: string | null;
  lemma: string | null;
  tag: string | null;
}

interface MorphRow {
  kelime_sira: number;
  arabic_concat: string | null;
  kok_raw: string | null;
  lemma_raw: string | null;
  tag: string | null;
}

function extractFirstPart(value: string | null | undefined): string | null {
  if (!value) return null;
  const part = value.split("|")[0]?.trim() ?? "";
  return part.length > 0 ? part : null;
}

// Bağlantıyı bir kez açıp tutuyoruz — tüm satırları preload etmiyoruz,
// sadece istek gelince o ayete ait satırları çekiyoruz.
let _db: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (_db === null) {
    _db = new DatabaseSync(dbPath, { readOnly: true });
    _db.exec(`
      PRAGMA cache_size   = -32768;
      PRAGMA mmap_size    = 268435456;
      PRAGMA temp_store   = MEMORY;
      PRAGMA busy_timeout = 5000;
    `);
  }
  return _db;
}

export function getMorphologyForAyah(surahId: number, ayahNumber: number): MorphologyEntry[] {
  try {
    const db = getDb();

    const rows = db
      .prepare(
        `SELECT
           kelime_sira,
           GROUP_CONCAT(arapca, '') AS arabic_concat,
           MIN(CASE WHEN kok != '' AND kok IS NOT NULL THEN kok ELSE NULL END) AS kok_raw,
           MIN(CASE WHEN lemma != '' AND lemma IS NOT NULL THEN lemma ELSE NULL END) AS lemma_raw,
           MIN(CASE WHEN tag != 'P' THEN tag ELSE NULL END) AS tag
         FROM morfoloji
         WHERE sure = ? AND ayet = ?
         GROUP BY kelime_sira
         ORDER BY kelime_sira`
      )
      .all(surahId, ayahNumber) as unknown as MorphRow[];

    return rows.map((row) => ({
      wordIndex: row.kelime_sira,
      arabic: row.arabic_concat ?? null,
      root: extractFirstPart(row.kok_raw),
      lemma: extractFirstPart(row.lemma_raw),
      tag: row.tag ?? null
    }));
  } catch {
    _db = null;
    return [];
  }
}
