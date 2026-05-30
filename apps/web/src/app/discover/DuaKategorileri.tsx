import {dbAll } from "../../lib/dbUtils";
import {
  AYET_ACIKLAMA,
  DUA_KATEGORILER,
  TAG_ISIM,
  TAG_KATEGORI,
  type DuaKategoriMeta,
} from "./dua-data";
import { DuaAkordeonPanel } from "./DuaAkordeonPanel";

// ── Tipler ────────────────────────────────────────────────────────────────────

interface DbRow {
  verse_key: string;
  tag: string;
  isim:     string | null;
  aciklama: string | null;
}

export interface DuaVerse {
  verseKey: string;
  tag: string;
  isim?: string;
  aciklama?: string;
}

export interface DuaKategoriData extends DuaKategoriMeta {
  verses: DuaVerse[];
}

function parseVerseKey(raw: string): { surahId: number; ayahNumber: number } | null {
  const clean = raw.split(",")[0]?.trim() ?? "";
  const parts = clean.split(":");
  if (parts.length !== 2) return null;
  const surahId = Number(parts[0]);
  const rawAyah = parts[1]?.split("-")[0] ?? "";
  const ayahNumber = Number(rawAyah);
  if (!Number.isFinite(surahId) || !Number.isFinite(ayahNumber)) return null;
  if (surahId <= 0 || ayahNumber <= 0) return null;
  return { surahId, ayahNumber };
}

function buildGrouped(rows: Array<{ verseKey: string; tag: string; isim?: string; aciklama?: string }>) {
  const grouped = new Map<string, DuaVerse[]>(
    DUA_KATEGORILER.map((k) => [k.id, []])
  );

  for (const row of rows) {
    const verseKey = row.verseKey ?? "";
    const tag = row.tag ?? "";
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

export async function DuaKategorileri() {

  const dbRows = await dbAll<DbRow>("SELECT verse_key, tag, isim, aciklama FROM verse_tag_items WHERE tag LIKE 'dua-%' ORDER BY verse_key");

  let grouped: Map<string, DuaVerse[]>;

  if (dbRows.length > 0) {
    // DB'de veri var — DB'yi kullan (isim/aciklama önce DB'den, yoksa statik fallback)
    grouped = buildGrouped(
      dbRows.map((r) => {
        const tag = r.tag ?? "";
        const staticBilgi = AYET_ACIKLAMA[`${r.verse_key ?? ""}::${tag}`];
        return {
          verseKey: r.verse_key ?? "",
          tag,
          isim:     r.isim     ?? staticBilgi?.isim     ?? TAG_ISIM[tag],
          aciklama: r.aciklama ?? staticBilgi?.aciklama,
        };
      })
    );
  } else {
    // DB henüz boş — statik haritadan göster
    const staticRows = Object.entries(AYET_ACIKLAMA).map(([key, bilgi]) => {
      const sep = key.indexOf("::");
      const verseKey = sep === -1 ? "" : key.slice(0, sep);
      const tag = sep === -1 ? "" : key.slice(sep + 2);
      return { verseKey, tag, isim: bilgi.isim ?? TAG_ISIM[tag], aciklama: bilgi.aciklama };
    });
    grouped = buildGrouped(staticRows);
  }

  const kategoriler: DuaKategoriData[] = DUA_KATEGORILER.map((meta) => ({
    ...meta,
    verses: grouped.get(meta.id) ?? [],
  })).filter((k) => k.verses.length > 0);

  const totalVerses = kategoriler.reduce((sum, k) => sum + k.verses.length, 0);

  return <DuaAkordeonPanel kategoriler={kategoriler} totalVerses={totalVerses} />;
}
