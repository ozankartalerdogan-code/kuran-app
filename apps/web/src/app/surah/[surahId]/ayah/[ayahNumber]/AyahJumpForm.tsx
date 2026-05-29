"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Surah } from "@quran-app/types";

export interface AyahJumpFormProps {
  initialSurahId: number;
  initialAyahNumber: number;
  surahs: Surah[];
}

export function AyahJumpForm({
  initialSurahId,
  initialAyahNumber,
  surahs,
}: AyahJumpFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedSurahId, setSelectedSurahId] = useState(initialSurahId);
  const [selectedAyah, setSelectedAyah]       = useState(initialAyahNumber);

  const currentSurah = useMemo(
    () => surahs.find((s) => s.id === selectedSurahId) ?? null,
    [surahs, selectedSurahId]
  );

  const verseCount = currentSurah?.verseCount ?? 1;

  const handleSurahChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newId = parseInt(e.target.value, 10);
      if (!Number.isFinite(newId) || newId < 1 || newId > 114) return;

      const newSurah = surahs.find((s) => s.id === newId);
      const newMax   = newSurah?.verseCount ?? 1;
      const clamped  = Math.min(selectedAyah, newMax);

      setSelectedSurahId(newId);
      setSelectedAyah(clamped);
      router.prefetch(`/surah/${newId}/ayah/${clamped}`);
    },
    [surahs, selectedAyah, router]
  );

  const handleAyahChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newAyah = parseInt(e.target.value, 10);
      if (!Number.isFinite(newAyah)) return;
      setSelectedAyah(newAyah);
      router.prefetch(`/surah/${selectedSurahId}/ayah/${newAyah}`);
    },
    [selectedSurahId, router]
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const clampedAyah = Math.max(1, Math.min(selectedAyah, verseCount));
    if (selectedSurahId >= 1 && selectedSurahId <= 114) {
      startTransition(() => {
        router.push(`/surah/${selectedSurahId}/ayah/${clampedAyah}`);
      });
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2"
    >
      <div className="flex items-center gap-2">
        <label className="w-10 shrink-0 text-xs text-stone-500" htmlFor="jump-surah">
          Sûre
        </label>
        <input
          id="jump-surah"
          type="number"
          min={1}
          max={114}
          value={selectedSurahId}
          onChange={handleSurahChange}
          placeholder="Sure no"
          className="min-h-[44px] w-24 rounded border border-stone-300 px-2 py-1 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400 sm:min-h-0"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="w-10 shrink-0 text-xs text-stone-500" htmlFor="jump-ayah">
          Ayet
        </label>
        <input
          id="jump-ayah"
          type="number"
          min={1}
          max={286}
          value={selectedAyah}
          onChange={handleAyahChange}
          placeholder="Ayet no"
          className="min-h-[44px] w-24 rounded border border-stone-300 px-2 py-1 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400 sm:min-h-0"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="min-h-[44px] w-full rounded border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-800 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-400 disabled:opacity-50 sm:min-h-0 sm:w-auto"
      >
        {isPending ? "…" : "Git"}
      </button>
    </form>
  );
}
