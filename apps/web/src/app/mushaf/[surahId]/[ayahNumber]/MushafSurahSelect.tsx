"use client";

import { useRouter } from "next/navigation";

export interface SurahOption {
  id: number;
  name: string | null;
}

interface Props {
  surahs: SurahOption[];
  currentSurahId: number;
}

export function MushafSurahSelect({ surahs, currentSurahId }: Props) {
  const router = useRouter();

  return (
    <select
      value={currentSurahId}
      onChange={(e) => router.push(`/mushaf/${e.target.value}/1`)}
      className="min-w-0 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
    >
      {surahs.map((s) => (
        <option key={s.id} value={s.id}>
          {s.id}. {s.name ?? "—"}
        </option>
      ))}
    </select>
  );
}
