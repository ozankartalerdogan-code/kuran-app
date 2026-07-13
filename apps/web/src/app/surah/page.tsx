export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { dbAll } from "../../lib/dbUtils";
import { NUZUL } from "../../data/nuzul";
import { SurahListClient, type SurahItem } from "./SurahListClient";
import { PageHeader } from "../../components/PageHeader";

export const metadata: Metadata = {
  title: "Sureler",
  description:
    "Kur'an-ı Kerim'in 114 suresi — mushaf ve nüzul sırasıyla, ayet sayıları ve Mekki/Medeni bilgisiyle.",
  alternates: { canonical: "/surah" },
};

interface SurahRow {
  id: number;
  adi_turkce: string;
  adi_arapca: string;
  translit: string;
  tur: string;
  ayet_sayisi: number;
}

export default async function SurahListPage() {
  const rows = await dbAll<SurahRow>(
    "SELECT id, adi_turkce, adi_arapca, translit, tur, ayet_sayisi FROM sureler ORDER BY id"
  );

  const items: SurahItem[] = rows.map((s) => ({
    id:                s.id,
    name:              s.adi_turkce ?? null,
    arabicName:        s.adi_arapca ?? null,
    verseCount:        s.ayet_sayisi ?? null,
    revelationOrder:   NUZUL[s.id] ?? null,
    revelationPlace:   s.tur === "medinan" ? "Medine" : "Mekke",
    shortIntroduction: null,
  }));

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          icon={BookOpen}
          title="Sureler"
          description="114 sure — Mushaf veya nüzul (vahiy geliş) sırasına göre."
        />
        <SurahListClient surahs={items} />
      </div>
    </main>
  );
}
