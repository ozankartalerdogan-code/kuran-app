import { dbAll, dbGet } from "./dbUtils";
import { isSuppressedVisibleRoot, suppressedVisibleRootsSql } from "./rootVisibility";
import type { RootDetail } from "../types/rootDetail";

/**
 * Kök detayını DB'den okur — hem /api/root/[root] hem de /root/[root] SSR
 * sayfası bunu kullanır; iki yüzey aynı veriyi görsün diye tek kaynak.
 * Kök bulunamazsa (veya görünürlükten gizlenmişse) null döner.
 */
export async function getRootDetailFromDb(root: string): Promise<RootDetail | null> {
  if (isSuppressedVisibleRoot(root)) return null;

  // Kök birden çok kaynaktan gelebilir (tekrarlı satır); anlamı öncelikli
  // kaynaktan (zengin seed) seç ve tek satıra indir — liste ile tutarlı olsun.
  const rootInfo = await dbGet<{ root: string; meaning_tr: string }>(
    `SELECT root,
            COALESCE(
              MAX(CASE WHEN source = 'root_explanations_seed' THEN meaning_tr END),
              MAX(meaning_tr)
            ) AS meaning_tr
     FROM root_meanings
     WHERE root = ?
       AND root NOT IN (${suppressedVisibleRootsSql})
     GROUP BY root`,
    root
  );

  if (!rootInfo) return null;

  const distRows = await dbAll<{ surah_id: number; count: number }>(`
    SELECT CAST(SUBSTR(verse_key, 1, INSTR(verse_key, ':') - 1) AS INTEGER) AS surah_id,
           COUNT(*) AS count
    FROM   words
    WHERE  root = ?
    GROUP  BY surah_id`, root);

  const distribution: Record<number, number> = {};
  for (let i = 1; i <= 114; i++) distribution[i] = 0;
  for (const row of distRows) distribution[row.surah_id] = row.count;

  const derivedRows = await dbAll<{
    arabic:     string;
    meaning_tr: string | null;
    verse_key:  string;
  }>(`
    SELECT DISTINCT arabic, meaning_tr, verse_key
    FROM   words
    WHERE  root = ?
    ORDER  BY arabic, verse_key
    LIMIT  2000`, root);  // en yaygın kök (قول) ~1722 → 2000 tümünü kapsar, ısı haritasıyla tutarlı

  const derivedWords = derivedRows.map((row) => {
    const [s, a] = (row.verse_key ?? "1:1").split(":").map(Number);
    return { word: row.arabic, meaning: row.meaning_tr ?? "", surahId: s, ayahNumber: a };
  });

  return {
    root: rootInfo.root,
    meaningTr: rootInfo.meaning_tr,
    distribution,
    derivedWords,
  };
}
