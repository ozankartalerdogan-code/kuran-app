"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TriangleAlert, Heart } from "lucide-react";
import { VerseCard, type VerseCardData } from "../../components/VerseCard";
import { getFavorites, setFavorites } from "../../lib/storageUtils";

export function FavorilerClient() {
  const router = useRouter();
  const [verses, setVerses] = useState<VerseCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadFavorites = useCallback(async (signal?: AbortSignal) => {
    const stored = getFavorites();
    setKeys(stored);
    setError(null);

    if (stored.length === 0) {
      setVerses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/favorites-verses?keys=${stored.join(",")}`, { signal });
      if (!response.ok) throw new Error("Favoriler yüklenemedi.");
      const data = (await response.json()) as VerseCardData[];
      if (signal?.aborted) return;
      setVerses(data);
    } catch (err) {
      if (signal?.aborted || (err instanceof DOMException && err.name === "AbortError")) return;
      setError("Favori ayetler şu anda yüklenemiyor. Lütfen tekrar deneyin.");
      setVerses([]);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadFavorites(controller.signal);
    return () => controller.abort();
  }, [loadFavorites]);

  function handleTagClick(tag: string) {
    router.push(`/search?tag=${encodeURIComponent(tag)}&page=1`);
  }

  function confirmRemoveFavorite() {
    return window.confirm("Bu ayeti favorilerden kaldırmak istediğinize emin misiniz?");
  }

  function handleFavoriteToggle(isFavorite: boolean, verseKey: string) {
    if (isFavorite) return;
    setKeys((prev) => prev.filter((key) => key !== verseKey));
    setVerses((prev) => prev.filter((verse) => verse.verse_key !== verseKey));
  }

  function clearAll() {
    if (!window.confirm("Tüm favori ayetleri kaldırmak istediğinize emin misiniz?")) return;
    setFavorites([]);
    setVerses([]);
    setKeys([]);
    setError(null);
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
              Favori Ayetler
            </h1>
            {!loading && keys.length > 0 && (
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                {keys.length} ayet kaydedildi
              </p>
            )}
          </div>
          {!loading && keys.length > 0 && (
            <button
              onClick={clearAll}
              type="button"
              className="rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-sm font-medium text-rose-600 transition-transform hover:bg-rose-50 active:scale-95 dark:border-rose-800 dark:bg-stone-900 dark:hover:bg-rose-950/30"
            >
              Tümünü Temizle
            </button>
          )}
        </div>

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-lg border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800"
              />
            ))}
          </div>
        )}

        {!loading && error && keys.length > 0 && (
          <div className="rounded-2xl border border-gold-200 bg-white px-8 py-12 text-center shadow-md dark:border-gold-800 dark:bg-stone-800">
            <div className="mb-3 flex justify-center">
              <TriangleAlert aria-hidden="true" className="h-10 w-10 text-gold-500" strokeWidth={1.5} />
            </div>
            <p className="text-lg font-bold text-stone-700 dark:text-stone-200">
              Favoriler yüklenemedi
            </p>
            <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">
              {error}
            </p>
            <button
              onClick={() => loadFavorites()}
              type="button"
              className="mt-5 inline-block rounded-xl bg-navy-600 px-5 py-2 text-sm font-semibold text-white transition-transform hover:bg-navy-700 active:scale-95"
            >
              Tekrar Dene
            </button>
          </div>
        )}

        {!loading && !error && keys.length === 0 && (
          <div className="rounded-2xl border border-stone-200 bg-white px-8 py-16 text-center shadow-md dark:border-stone-700 dark:bg-stone-800">
            <div className="mb-3 flex justify-center">
              <Heart aria-hidden="true" className="h-10 w-10 text-stone-300 dark:text-stone-600" strokeWidth={1.5} />
            </div>
            <p className="text-lg font-bold text-stone-700 dark:text-stone-200">
              Henüz favori ayet eklemediniz
            </p>
            <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">
              Ayet kartlarındaki kalp ikonuna tıklayarak favori ekleyebilirsiniz.
            </p>
            <Link
              href="/surah"
              className="mt-5 inline-block rounded-xl bg-navy-600 px-5 py-2 text-sm font-semibold text-white transition-transform hover:bg-navy-700 active:scale-95"
            >
              Surelere Göz At
            </Link>
          </div>
        )}

        {!loading && !error && keys.length > 0 && verses.length === 0 && (
          <div className="rounded-2xl border border-stone-200 bg-white px-8 py-12 text-center shadow-md dark:border-stone-700 dark:bg-stone-800">
            <div className="mb-3 flex justify-center">
              <Heart aria-hidden="true" className="h-10 w-10 text-stone-300 dark:text-stone-600" strokeWidth={1.5} />
            </div>
            <p className="text-lg font-bold text-stone-700 dark:text-stone-200">
              Favoriler bulundu ama içerik listesi oluşturulamadı
            </p>
            <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">
              Kayıtlı ayet anahtarları duruyor, ancak ilgili ayet verileri şu anda getirilemedi.
            </p>
            <button
              onClick={() => loadFavorites()}
              type="button"
              className="mt-5 inline-block rounded-xl bg-navy-600 px-5 py-2 text-sm font-semibold text-white transition-transform hover:bg-navy-700 active:scale-95"
            >
              Tekrar Dene
            </button>
          </div>
        )}

        {!loading && !error && verses.length > 0 && (
          <div className="space-y-4">
            {verses.map((verse) => (
              <VerseCard
                key={verse.verse_key}
                verse={verse}
                onTagClick={handleTagClick}
                onBeforeUnfavorite={confirmRemoveFavorite}
                onFavoriteToggle={handleFavoriteToggle}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
