import { getApiDb, dbAll } from "../../lib/dbUtils";
import type { VerseCardData } from "../../components/VerseCard";

interface DbRow {
  verse_key:   string;
  surah_id:    number;
  ayah_number: number;
  surah_name:  string | null;
  meal:        string | null;
  ana_tema:    string | null;
  alt_taglar:  string | null;
  tag:         string;
}

export function fetchVerses(tag: string): VerseCardData[] {
  const db = getApiDb();
  const rows = dbAll<DbRow>(
    db.prepare(`
      SELECT
        vti.verse_key, v.surah_id, v.ayah_number,
        s.adi_turkce AS surah_name,
        v.primary_translation AS meal,
        vt.ana_tema, vt.alt_taglar,
        vti.tag
      FROM verse_tag_items vti
      JOIN verses v ON v.verse_key = vti.verse_key
      JOIN sureler s ON s.id = v.surah_id
      LEFT JOIN verse_tags vt ON vt.verse_key = vti.verse_key
      WHERE vti.tag = ?
      ORDER BY v.surah_id, v.ayah_number
    `)
  , tag);
  return rows.map((r) => ({
    verse_key:   r.verse_key,
    surah_id:    r.surah_id,
    ayah_number: r.ayah_number,
    surah_name:  r.surah_name,
    meal:        r.meal,
    ana_tema:    r.ana_tema,
    alt_taglar:  r.alt_taglar
      ? (() => { try { return JSON.parse(r.alt_taglar as string); } catch { return []; } })()
      : [],
  }));
}
