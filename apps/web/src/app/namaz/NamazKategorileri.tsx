import {dbAll } from "../../lib/dbUtils";
import {
  NAMAZ_KATEGORILER,
  TAG_ISIM,
  TAG_KATEGORI,
  type NamazKategoriMeta,
} from "./namaz-data";
import { NamazAkordeonPanel } from "./NamazAkordeonPanel";

// ── Tipler ────────────────────────────────────────────────────────────────────

interface DbRow {
  verse_key: string;
  tag:       string;
  isim:      string | null;
  aciklama:  string | null;
}

export interface NamazVerse {
  verseKey: string;
  tag:      string;
  isim?:    string;
  aciklama?: string;
}

export interface NamazKategoriData extends NamazKategoriMeta {
  verses: NamazVerse[];
}

function parseVerseKey(raw: string): { surahId: number; ayahNumber: number } | null {
  const clean = raw.split(",")[0]?.trim() ?? "";
  const parts = clean.split(":");
  if (parts.length !== 2) return null;
  const surahId    = Number(parts[0]);
  const rawAyah    = parts[1]?.split("-")[0] ?? "";
  const ayahNumber = Number(rawAyah);
  if (!Number.isFinite(surahId) || !Number.isFinite(ayahNumber)) return null;
  if (surahId <= 0 || ayahNumber <= 0) return null;
  return { surahId, ayahNumber };
}

function buildGrouped(rows: Array<{ verseKey: string; tag: string; isim?: string; aciklama?: string }>) {
  const grouped = new Map<string, NamazVerse[]>(
    NAMAZ_KATEGORILER.map((k) => [k.id, []])
  );

  for (const row of rows) {
    const verseKey = row.verseKey ?? "";
    const tag      = row.tag      ?? "";
    if (!verseKey || !tag) continue;
    if (parseVerseKey(verseKey) === null) continue;
    const kategoriId = TAG_KATEGORI[tag];
    if (!kategoriId) continue;
    const bucket = grouped.get(kategoriId);
    if (!bucket) continue;
    bucket.push({ verseKey, tag, isim: row.isim, aciklama: row.aciklama });
  }

  return grouped;
}

// ── Sunucu bileşeni ───────────────────────────────────────────────────────────

export async function NamazKategorileri() {

  const dbRows = await dbAll<DbRow>("SELECT verse_key, tag, isim, aciklama FROM verse_tag_items WHERE tag LIKE 'namaz-%' ORDER BY verse_key");

  const grouped = buildGrouped(
    dbRows.map((r) => ({
      verseKey: r.verse_key ?? "",
      tag:      r.tag       ?? "",
      isim:     r.isim      ?? TAG_ISIM[r.tag ?? ""],
      aciklama: r.aciklama  ?? undefined,
    }))
  );

  const kategoriler: NamazKategoriData[] = NAMAZ_KATEGORILER.map((meta) => ({
    ...meta,
    verses: grouped.get(meta.id) ?? [],
  })).filter((k) => k.verses.length > 0);

  const totalVerses = kategoriler.reduce((sum, k) => sum + k.verses.length, 0);

  return <NamazAkordeonPanel kategoriler={kategoriler} totalVerses={totalVerses} />;
}
