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
  const [selectedAyah, setSelectedAyah] = useState(initialAyahNumber);
  // Ayah dropdown'ı odaklanana kadar <option> elemanları DOM'a basılmaz
  const [ayahFocused, setAyahFocused] = useState(false);

  // 114 sure seçeneği — surahs referansı değişmediği sürece hiç yeniden hesaplanmaz
  const surahOptions = useMemo(
    () =>
      surahs.map((s) => (
        <option key={s.id} value={s.id}>
          {s.id}. {s.turkishName.text ?? "—"}
        </option>
      )),
    [surahs]
  );

  const currentSurah = useMemo(
    () => surahs.find((s) => s.id === selectedSurahId) ?? null,
    [surahs, selectedSurahId]
  );

  const verseCount = currentSurah?.verseCount ?? 1;

  // Ayet seçenekleri yalnızca dropdown açıldığında (onFocus) üretilir
  const ayahOptions = useMemo(() => {
    if (!ayahFocused) return null;
    return Array.from({ length: verseCount }, (_, i) => (
      <option key={i + 1} value={i + 1}>
        {i + 1}
      </option>
    ));
  }, [ayahFocused, verseCount]);

  const handleSurahChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newId = parseInt(e.target.value, 10);
      if (!Number.isFinite(newId) || newId < 1) return;

      const newSurah = surahs.find((s) => s.id === newId);
      const newMax = newSurah?.verseCount ?? 1;
      const clamped = Math.min(selectedAyah, newMax);

      setSelectedSurahId(newId);
      setSelectedAyah(clamped);
      // Seçim yapıldığı anda prefetch — "Git" butonuna basmadan önce sayfa hazır
      router.prefetch(`/surah/${newId}/ayah/${clamped}`);
    },
    [surahs, selectedAyah, router]
  );

  const handleAyahChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newAyah = parseInt(e.target.value, 10);
      if (!Number.isFinite(newAyah) || newAyah < 1) return;

      setSelectedAyah(newAyah);
      router.prefetch(`/surah/${selectedSurahId}/ayah/${newAyah}`);
    },
    [selectedSurahId, router]
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (selectedSurahId > 0 && selectedAyah > 0) {
      // useTransition: geçiş sırasında mevcut sayfa etkileşimde kalır
      startTransition(() => {
        router.push(`/surah/${selectedSurahId}/ayah/${selectedAyah}`);
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <label className="text-xs text-stone-500" htmlFor="jump-surah">
        Sûre
      </label>
      <select
        id="jump-surah"
        value={selectedSurahId}
        onChange={handleSurahChange}
        className="rounded border border-stone-300 px-2 py-1 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
      >
        {surahOptions}
      </select>

      <label className="text-xs text-stone-500" htmlFor="jump-ayah">
        Ayet
      </label>
      <select
        id="jump-ayah"
        value={selectedAyah}
        onChange={handleAyahChange}
        onFocus={() => setAyahFocused(true)}
        onBlur={() => setAyahFocused(false)}
        className="w-20 rounded border border-stone-300 px-2 py-1 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
      >
        {/* Odak yoksa yalnızca aktif değer; odakta tüm liste */}
        {ayahFocused ? ayahOptions : <option value={selectedAyah}>{selectedAyah}</option>}
      </select>

      <button
        type="submit"
        disabled={isPending}
        className="rounded border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-800 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-400 disabled:opacity-50"
      >
        {isPending ? "…" : "Git"}
      </button>
    </form>
  );
}
