export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import type { RootDetail } from "../../../types/rootDetail";
import RootDetailContent from "./RootDetailContent";

interface Props {
  params: { root: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const root = decodeURIComponent(params.root);
  return {
    title: `Kök: ${root} — Kuran Yolu`,
    description: `${root} kök anlamı ve sure dağılımı`,
  };
}

export default async function RootDetailPage({ params }: Props) {
  const root = decodeURIComponent(params.root);

  let data: RootDetail | null = null;
  let error: string | null = null;

  try {
    const {dbAll, dbGet } = await import("../../../lib/dbUtils");

    interface RootMeta { meaning_tr: string }
    interface SurahCount { surah_no: number; count: number }
    interface DerivRow { lemma: string; meaning_tr: string | null; verse_key: string }

    const meta = await dbGet<RootMeta>("SELECT meaning_tr FROM root_meanings WHERE root = ?", root);
    if (!meta) { error = "Kök bulunamadı."; }
    else {
      const dist = await dbAll<SurahCount>("SELECT CAST(SUBSTR(verse_key,1,INSTR(verse_key,':')-1) AS INT) AS surah_no, COUNT(*) AS count FROM words WHERE root=? GROUP BY surah_no ORDER BY surah_no", root);
      // distribution: surahId → count
      const distribution: Record<number, number> = {};
      for (const r of dist) distribution[r.surah_no] = r.count;

      const derivs = await dbAll<DerivRow>("SELECT DISTINCT w.lemma, w.meaning_tr, w.verse_key FROM words w WHERE w.root=? ORDER BY w.lemma, w.verse_key LIMIT 120", root);
      // Parse verse_key → surahId:ayahNumber
      const derivedWords = derivs.map(d => {
        const [s, a] = d.verse_key.split(":").map(Number);
        return { word: d.lemma, meaning: d.meaning_tr ?? "", surahId: s, ayahNumber: a };
      });

      data = { root, meaningTr: meta.meaning_tr, distribution, derivedWords } satisfies RootDetail;
    }
  } catch (e) {
    error = "Veri yüklenirken bir hata oluştu.";
    console.error("[root detail]", e);
  }

  return <RootDetailContent root={root} data={data} error={error} />;
}
