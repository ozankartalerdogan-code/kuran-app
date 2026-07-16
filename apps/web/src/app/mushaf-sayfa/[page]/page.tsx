export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dbAll } from "../../../lib/dbUtils";
import { SAYFA_SAYISI, sayfaAraligi, sayfaninCuzu, sayfaBasSuresi, ayetinSayfasi } from "../../../lib/mushafSayfaUtils";
import { MushafSayfaClient, type MushafSayfaVerse, type MushafSayfaSurah, type MushafSayfaSurahListItem } from "./MushafSayfaClient";

interface PageProps {
  params: Promise<{ page: string }>;
}

interface VerseRow {
  verse_key: string;
  surah_id: number;
  ayah_number: number;
  arabic_text: string | null;
  basmala_kind: "ayah" | "prefix" | null;
  basmala_start_cp: number | null;
  basmala_end_cp: number | null;
  body_start_cp: number | null;
}
interface SpanRow { verse_key: string; start_cp: number; end_cp: number; rule: string; color: string }
interface SurahRow { id: number; adi_turkce: string; adi_arapca: string }
interface SurahListRow { id: number; adi_turkce: string; adi_arapca: string; ayet_sayisi: number }

function parsePage(value: string): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= SAYFA_SAYISI ? n : null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { page: rawPage } = await params;
  const page = parsePage(rawPage);
  if (!page) return { title: "Mushaf Sayfa Görünümü" };
  return {
    title: `Sayfa ${page} — Mushaf`,
    description: `Kur'an-ı Kerim mushaf sayfa görünümü, sayfa ${page} (Cüz ${sayfaninCuzu(page)}).`,
    alternates: { canonical: `/mushaf-sayfa/${page}` },
  };
}

export default async function MushafSayfaPage({ params }: PageProps) {
  const { page: rawPage } = await params;
  const page = parsePage(rawPage);
  if (!page) redirect("/mushaf-sayfa/1");

  const { bas, son } = sayfaAraligi(page);
  const rangeArgs = [bas.surahId, bas.surahId, bas.ayahNumber, son.surahId, son.surahId, son.ayahNumber];

  const [verses, spans, surahs, surahList] = await Promise.all([
    dbAll<VerseRow>(
      `SELECT v.verse_key, v.surah_id, v.ayah_number, v.arabic_text,
              m.basmala_kind, m.basmala_start_cp, m.basmala_end_cp, m.body_start_cp
       FROM verses v
       LEFT JOIN quran_verse_metadata m ON m.verse_key = v.verse_key
       WHERE (v.surah_id > ? OR (v.surah_id = ? AND v.ayah_number >= ?))
         AND (v.surah_id < ? OR (v.surah_id = ? AND v.ayah_number <= ?))
       ORDER BY v.surah_id, v.ayah_number`,
      ...rangeArgs,
    ),
    dbAll<SpanRow>(
      `SELECT t.verse_key, t.start_cp, t.end_cp, t.rule, t.color
       FROM tajweed_spans t JOIN verses v ON v.verse_key = t.verse_key
       WHERE (v.surah_id > ? OR (v.surah_id = ? AND v.ayah_number >= ?))
         AND (v.surah_id < ? OR (v.surah_id = ? AND v.ayah_number <= ?))
       ORDER BY v.surah_id, v.ayah_number, t.start_cp`,
      ...rangeArgs,
    ),
    dbAll<SurahRow>(
      "SELECT id, adi_turkce, adi_arapca FROM sureler WHERE id BETWEEN ? AND ? ORDER BY id",
      bas.surahId, son.surahId,
    ),
    dbAll<SurahListRow>("SELECT id, adi_turkce, adi_arapca, ayet_sayisi FROM sureler ORDER BY id"),
  ]);
  const spansByVerse = new Map<string, { startCp: number; endCp: number; rule: string; color: string }[]>();
  for (const span of spans) {
    const list = spansByVerse.get(span.verse_key) ?? [];
    list.push({ startCp: span.start_cp, endCp: span.end_cp, rule: span.rule, color: span.color });
    spansByVerse.set(span.verse_key, list);
  }

  const versesOut: MushafSayfaVerse[] = verses.map((verse) => ({
    surahId: verse.surah_id,
    ayahNumber: verse.ayah_number,
    arabic: verse.arabic_text,
    tajweedSpans: spansByVerse.get(verse.verse_key) ?? [],
    basmalaRange: verse.basmala_kind === null ? null : {
      kind: verse.basmala_kind,
      startCp: verse.basmala_start_cp ?? 0,
      endCp: verse.basmala_end_cp ?? 0,
      bodyStartCp: verse.body_start_cp ?? 0,
    },
  }));
  const surahsOut: MushafSayfaSurah[] = surahs.map((s) => ({
    id: s.id,
    name: s.adi_turkce,
    arabicName: s.adi_arapca,
  }));
  const surahListOut: MushafSayfaSurahListItem[] = surahList.map((s) => ({
    id: s.id,
    name: s.adi_turkce,
    arabicName: s.adi_arapca,
    verseCount: s.ayet_sayisi,
    page: ayetinSayfasi(s.id, 1),
  }));

  return (
    <MushafSayfaClient
      page={page}
      juz={sayfaninCuzu(page)}
      startSurahId={sayfaBasSuresi(page)}
      verses={versesOut}
      surahs={surahsOut}
      surahList={surahListOut}
    />
  );
}
