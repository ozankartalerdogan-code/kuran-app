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
      className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2"
    >
      <div className="min-w-0">
        <label className="sr-only" htmlFor="jump-surah">
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
          className="min-h-[44px] w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-navy-400"
        />
      </div>

      <div className="min-w-0">
        <label className="sr-only" htmlFor="jump-ayah">
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
          className="min-h-[44px] w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-navy-400"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="min-h-[44px] rounded-lg bg-navy-600 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-400 disabled:opacity-50"
      >
        {isPending ? "…" : "Git"}
      </button>
    </form>
  );
}
