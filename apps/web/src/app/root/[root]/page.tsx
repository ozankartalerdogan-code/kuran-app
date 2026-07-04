export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { isSuppressedVisibleRoot, suppressedVisibleRootsSql } from "../../../lib/rootVisibility";
import type { RootDetail } from "../../../types/rootDetail";
import RootDetailContent from "./RootDetailContent";

interface Props {
  params: { root: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const root = decodeURIComponent(params.root);
  return {
    title: `KÃ¶k: ${root} â€” Kuran Yolu`,
    description: `${root} kÃ¶k anlamÄ± ve sure daÄŸÄ±lÄ±mÄ±`,
  };
}

export default async function RootDetailPage({ params }: Props) {
  const root = decodeURIComponent(params.root);

  let data: RootDetail | null = null;
  let error: string | null = null;

  try {
    if (isSuppressedVisibleRoot(root)) {
      error = "KÃ¶k bulunamadÄ±.";
    } else {
      const {dbAll, dbGet } = await import("../../../lib/dbUtils");

      interface RootMeta { meaning_tr: string }
      interface SurahCount { surah_no: number; count: number }
      interface DerivRow { lemma: string; meaning_tr: string | null; verse_key: string }

      const meta = await dbGet<RootMeta>(
        `SELECT meaning_tr FROM root_meanings
         WHERE root = ?
           AND root NOT IN (${suppressedVisibleRootsSql})`,
        root
      );
      if (!meta) { error = "KÃ¶k bulunamadÄ±."; }
      else {
        const dist = await dbAll<SurahCount>("SELECT CAST(SUBSTR(verse_key,1,INSTR(verse_key,':')-1) AS INT) AS surah_no, COUNT(*) AS count FROM words WHERE root=? GROUP BY surah_no ORDER BY surah_no", root);
        // distribution: surahId â†’ count
        const distribution: Record<number, number> = {};
        for (const r of dist) distribution[r.surah_no] = r.count;

        const derivs = await dbAll<DerivRow>("SELECT DISTINCT w.lemma, w.meaning_tr, w.verse_key FROM words w WHERE w.root=? ORDER BY w.lemma, w.verse_key LIMIT 120", root);
        // Parse verse_key â†’ surahId:ayahNumber
        const derivedWords = derivs.map(d => {
          const [s, a] = d.verse_key.split(":").map(Number);
          return { word: d.lemma, meaning: d.meaning_tr ?? "", surahId: s, ayahNumber: a };
        });

        data = { root, meaningTr: meta.meaning_tr, distribution, derivedWords } satisfies RootDetail;
      }
    }
  } catch (e) {
    error = "Veri yÃ¼klenirken bir hata oluÅŸtu.";
    console.error("[root detail]", e);
  }

  return <RootDetailContent root={root} data={data} error={error} />;
}
