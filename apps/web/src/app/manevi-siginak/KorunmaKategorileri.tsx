import { getApiDb, dbAll } from "../../lib/dbUtils";
import { KORUNMA_KATEGORILER, type KorunmaKategoriMeta } from "./korunma-data";
import { KorunmaAkordeonPanel } from "./KorunmaAkordeonPanel";

interface DbRow {
  verse_key: string;
  tag:       string;
  isim:      string | null;
  aciklama:  string | null;
}

export interface KorunmaVerse {
  verseKey: string;
  tag:      string;
  isim?:    string;
  aciklama?: string;
}

export interface KorunmaKategoriData extends KorunmaKategoriMeta {
  verses: KorunmaVerse[];
}

export async function KorunmaKategorileri() {
  const db = getApiDb();

  const dbRows = dbAll<DbRow>(
    db.prepare(
      "SELECT verse_key, tag, isim, aciklama FROM verse_tag_items WHERE tag LIKE 'korunma-%' ORDER BY verse_key"
    )
  );

  const grouped = new Map<string, KorunmaVerse[]>(
    KORUNMA_KATEGORILER.map((k) => [k.id, []])
  );

  for (const row of dbRows) {
    const bucket = grouped.get(row.tag);
    if (!bucket) continue;
    bucket.push({
      verseKey: row.verse_key,
      tag:      row.tag,
      isim:     row.isim     ?? undefined,
      aciklama: row.aciklama ?? undefined,
    });
  }

  const kategoriler: KorunmaKategoriData[] = KORUNMA_KATEGORILER.map((meta) => ({
    ...meta,
    verses: grouped.get(meta.id) ?? [],
  })).filter((k) => k.verses.length > 0);

  const totalVerses = kategoriler.reduce((sum, k) => sum + k.verses.length, 0);

  return <KorunmaAkordeonPanel kategoriler={kategoriler} totalVerses={totalVerses} />;
}
