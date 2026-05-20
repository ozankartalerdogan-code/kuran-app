"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AyahJumpForm({
  initialSurahId,
  initialAyahNumber
}: {
  initialSurahId: number;
  initialAyahNumber: number;
}) {
  const router = useRouter();
  const [surahId, setSurahId] = useState(String(initialSurahId));
  const [ayahNumber, setAyahNumber] = useState(String(initialAyahNumber));

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const s = parseInt(surahId, 10);
    const a = parseInt(ayahNumber, 10);
    if (Number.isFinite(s) && s > 0 && Number.isFinite(a) && a > 0) {
      router.push(`/surah/${s}/ayah/${a}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <label className="text-xs text-stone-500" htmlFor="jump-surah">
        Sûre
      </label>
      <input
        id="jump-surah"
        type="number"
        min={1}
        max={114}
        value={surahId}
        onChange={(e) => setSurahId(e.target.value)}
        className="w-16 rounded border border-stone-300 px-2 py-1 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
      />
      <label className="text-xs text-stone-500" htmlFor="jump-ayah">
        Ayet
      </label>
      <input
        id="jump-ayah"
        type="number"
        min={1}
        value={ayahNumber}
        onChange={(e) => setAyahNumber(e.target.value)}
        className="w-16 rounded border border-stone-300 px-2 py-1 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
      />
      <button
        type="submit"
        className="rounded border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-800 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-400"
      >
        Git
      </button>
    </form>
  );
}
