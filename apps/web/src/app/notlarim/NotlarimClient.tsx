"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { NotebookPen } from "lucide-react";
import { getNotes, setNotes } from "../../lib/storageUtils";

interface NoteEntry {
  verseKey: string;
  surahId: number;
  ayahNumber: number;
  surahName: string | null;
  text: string;
}

interface VerseInfo {
  verse_key: string;
  surah_id: number;
  ayah_number: number;
  surah_name: string | null;
}

export function NotlarimClient() {
  const [notes, setNotesState] = useState<NoteEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = useCallback(async (signal?: AbortSignal) => {
    const raw = getNotes();
    const keys = Object.keys(raw);
    setError(null);

    if (keys.length === 0) {
      setNotesState([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/favorites-verses?keys=${keys.join(",")}`, { signal });
      if (!response.ok) throw new Error("Notlar yüklenemedi.");
      const data = (await response.json()) as VerseInfo[];
      if (signal?.aborted) return;
      const infoMap = new Map(data.map((v) => [v.verse_key, v]));
      const entries: NoteEntry[] = keys.map((k) => {
        const info = infoMap.get(k);
        const [sid, anum] = k.split(":").map(Number);
        return {
          verseKey: k,
          surahId: info?.surah_id ?? sid,
          ayahNumber: info?.ayah_number ?? anum,
          surahName: info?.surah_name ?? null,
          text: raw[k],
        };
      });
      setNotesState(entries);
    } catch (err) {
      if (signal?.aborted || (err instanceof DOMException && err.name === "AbortError")) return;
      const fallbackEntries: NoteEntry[] = Object.keys(getNotes()).map((k) => {
        const [sid, anum] = k.split(":").map(Number);
        return { verseKey: k, surahId: sid, ayahNumber: anum, surahName: null, text: getNotes()[k] };
      });
      setNotesState(fallbackEntries);
      setError("Sure adları şu anda yüklenemedi; notlar ayet anahtarlarıyla gösteriliyor.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadNotes(controller.signal);
    return () => controller.abort();
  }, [loadNotes]);

  function deleteNote(verseKey: string) {
    if (!window.confirm("Bu notu silmek istediğinize emin misiniz?")) return;
    const raw = getNotes();
    delete raw[verseKey];
    setNotes(raw);
    setNotesState((prev) => prev.filter((n) => n.verseKey !== verseKey));
  }

  function clearAll() {
    if (!window.confirm("Tüm notları silmek istediğinize emin misiniz?")) return;
    setNotes({});
    setNotesState([]);
    setError(null);
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-stone-900 dark:text-stone-100">
              <NotebookPen aria-hidden="true" className="h-6 w-6 text-navy-600 dark:text-navy-400" strokeWidth={1.75} />
              Notlarım
            </h1>
            {!loading && notes.length > 0 && (
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                {notes.length} ayet için not kaydedildi
              </p>
            )}
          </div>
          {!loading && notes.length > 0 && (
            <button
              onClick={clearAll}
              type="button"
              className="rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-sm font-medium text-rose-600 transition-transform hover:bg-rose-50 active:scale-95 dark:border-rose-800 dark:bg-stone-900 dark:hover:bg-rose-950/30"
            >
              Tümünü Sil
            </button>
          )}
        </div>

        {error && !loading && (
          <div className="mb-4 rounded-xl border border-gold-200 bg-gold-50 px-4 py-3 text-sm text-gold-800 dark:border-gold-800/50 dark:bg-gold-900/20 dark:text-gold-300" role="status">
            {error}
          </div>
        )}

        {loading && (
          <div className="space-y-3" aria-busy="true" aria-live="polite" role="status">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800"
              />
            ))}
          </div>
        )}

        {!loading && notes.length === 0 && (
          <div className="rounded-2xl border border-stone-200 bg-white px-8 py-16 text-center shadow-card dark:border-stone-700 dark:bg-stone-800" aria-live="polite" role="status">
            <div className="mb-3 text-4xl">📝</div>
            <p className="text-lg font-bold text-stone-700 dark:text-stone-200">
              Henüz not eklemediniz
            </p>
            <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">
              Ayet detay sayfasındaki &ldquo;Kişisel Not&rdquo; alanından not ekleyebilirsiniz.
            </p>
            <Link
              href="/surah"
              className="mt-5 inline-block rounded-xl bg-gold-600 px-5 py-2 text-sm font-semibold text-white transition-transform hover:bg-gold-700 active:scale-95"
            >
              Surelere Göz At
            </Link>
          </div>
        )}

        {!loading && notes.length > 0 && (
          <div className="space-y-3">
            {notes.map((note) => (
              <article
                key={note.verseKey}
                className="rounded-2xl border border-stone-200 bg-white shadow-md dark:border-stone-700 dark:bg-stone-800"
              >
                <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-4 py-3 dark:border-stone-800">
                  <Link
                    href={`/surah/${note.surahId}/ayah/${note.ayahNumber}`}
                    className="group flex items-center gap-2 hover:underline"
                  >
                    <span className="rounded-full bg-gold-100 px-2.5 py-0.5 text-xs font-semibold text-gold-700 dark:bg-gold-900/40 dark:text-gold-400">
                      {note.verseKey}
                    </span>
                    {note.surahName ? (
                      <span className="text-sm font-medium text-stone-700 group-hover:text-stone-900 dark:text-stone-300 dark:group-hover:text-stone-100">
                        {note.surahName}, {note.ayahNumber}. Ayet
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-stone-700 group-hover:text-stone-900 dark:text-stone-300 dark:group-hover:text-stone-100">
                        {note.surahId}. Sure · {note.ayahNumber}. Ayet
                      </span>
                    )}
                    <svg className="h-3.5 w-3.5 text-stone-400 group-hover:text-stone-600 dark:text-stone-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                  <button
                    onClick={() => deleteNote(note.verseKey)}
                    type="button"
                    aria-label="Notu sil"
                    className="rounded-full p-1.5 text-stone-300 transition-all hover:bg-rose-50 hover:text-rose-500 active:scale-95 dark:text-stone-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <p className="whitespace-pre-wrap px-4 py-3 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                  {note.text}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
