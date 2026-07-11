export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dbAll } from "../../../lib/dbUtils";
import { SAYFA_SAYISI, sayfaAraligi, sayfaninCuzu, sayfaBasSuresi, ayetinSayfasi } from "../../../lib/mushafSayfaUtils";
import { MushafSayfaClient, type MushafSayfaVerse, type MushafSayfaSurah, type MushafSayfaSurahListItem } from "./MushafSayfaClient";

interface PageProps {
  params: { page: string };
}

interface VerseRow { surah_id: number; ayah_number: number; arabic_text: string | null; arabic_tajweed: string | null }
interface SurahRow { id: number; adi_turkce: string; adi_arapca: string }
interface SurahListRow { id: number; adi_turkce: string; adi_arapca: string; ayet_sayisi: number }

function parsePage(value: string): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= SAYFA_SAYISI ? n : null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const page = parsePage(params.page);
  if (!page) return { title: "Mushaf Sayfa Görünümü" };
  return {
    title: `Sayfa ${page} — Mushaf | Kuran Yolu`,
    description: `Kur'an-ı Kerim mushaf sayfa görünümü, sayfa ${page} (Cüz ${sayfaninCuzu(page)}).`,
    alternates: { canonical: `/mushaf-sayfa/${page}` },
  };
}

export default async function MushafSayfaPage({ params }: PageProps) {
  const page = parsePage(params.page);
  if (!page) redirect("/mushaf-sayfa/1");

  const { bas, son } = sayfaAraligi(page);

  const [verses, surahs, surahList] = await Promise.all([
    dbAll<VerseRow>(
      `SELECT surah_id, ayah_number, arabic_text, arabic_tajweed FROM verses
       WHERE (surah_id > ? OR (surah_id = ? AND ayah_number >= ?))
         AND (surah_id < ? OR (surah_id = ? AND ayah_number <= ?))
       ORDER BY surah_id, ayah_number`,
      bas.surahId, bas.surahId, bas.ayahNumber,
      son.surahId, son.surahId, son.ayahNumber,
    ),
    dbAll<SurahRow>(
      "SELECT id, adi_turkce, adi_arapca FROM sureler WHERE id BETWEEN ? AND ? ORDER BY id",
      bas.surahId, son.surahId,
    ),
    dbAll<SurahListRow>("SELECT id, adi_turkce, adi_arapca, ayet_sayisi FROM sureler ORDER BY id"),
  ]);

  const versesOut: MushafSayfaVerse[] = verses.map((v) => ({
    surahId: v.surah_id,
    ayahNumber: v.ayah_number,
    arabic: v.arabic_text,
    tajweed: v.arabic_tajweed,
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
