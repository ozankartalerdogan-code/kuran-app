"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { VerseCard, type VerseCardData } from "../../components/VerseCard";
import { getFavorites, setFavorites } from "../../lib/storageUtils";

export function FavorilerClient() {
  const router = useRouter();
  const [verses, setVerses]   = useState<VerseCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [keys, setKeys]       = useState<string[]>([]);

  useEffect(() => {
    const stored = getFavorites();
    setKeys(stored);

    if (stored.length === 0) {
      setLoading(false);
      return;
    }

    fetch(`/api/favorites-verses?keys=${stored.join(",")}`)
      .then((r) => r.json())
      .then((data: VerseCardData[]) => {
        setVerses(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function handleTagClick(tag: string) {
    router.push(`/search?tag=${encodeURIComponent(tag)}&page=1`);
  }

  function clearAll() {
    setFavorites([]);
    setVerses([]);
    setKeys([]);
  }

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-8 dark:bg-stone-950 sm:px-6">
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
              className="rounded-md border border-rose-200 bg-white px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:bg-stone-900 dark:hover:bg-rose-950/30"
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

        {!loading && keys.length === 0 && (
          <div className="rounded-xl border border-stone-200 bg-white px-8 py-16 text-center shadow-sm dark:border-stone-700 dark:bg-stone-900">
            <div className="mb-3 text-4xl">🤍</div>
            <p className="text-lg font-medium text-stone-700 dark:text-stone-300">
              Henüz favori ayet eklemediniz
            </p>
            <p className="mt-1 text-sm text-stone-400">
              Ayet kartlarındaki kalp ikonuna tıklayarak favori ekleyebilirsiniz.
            </p>
            <Link
              href="/surah"
              className="mt-5 inline-block rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Surelere Göz At
            </Link>
          </div>
        )}

        {!loading && verses.length > 0 && (
          <div className="space-y-4">
            {verses.map((verse) => (
              <VerseCard
                key={verse.verse_key}
                verse={verse}
                onTagClick={handleTagClick}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
