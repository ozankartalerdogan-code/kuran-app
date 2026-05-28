"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import type { MoodRandomResponse } from "../app/api/mood/random/route";

interface Props {
  etiket: string;
  tag:    string;
  renk:   string;
}

const HISTORY_MAX = 5;
const STORAGE_KEY = (tag: string) => `mood_history_${tag}`;

function loadHistory(tag: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY(tag)) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function saveHistory(tag: string, keys: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY(tag), JSON.stringify(keys.slice(-HISTORY_MAX)));
  } catch {
    // storage full — ignore
  }
}

export function MoodTagButton({ etiket, tag, renk }: Props) {
  const [verse, setVerse]     = useState<MoodRandomResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [open, setOpen]       = useState(false);
  const historyRef            = useRef<string[]>([]);
  const dialogRef             = useRef<HTMLDivElement>(null);

  const fetchVerse = useCallback(async () => {
    setLoading(true);
    setError(null);
    const exclude = historyRef.current.join(",");
    try {
      const res  = await fetch(`/api/mood/random?tag=${encodeURIComponent(tag)}&exclude=${encodeURIComponent(exclude)}`);
      const data = await res.json() as MoodRandomResponse | { error: string };
      if ("error" in data) {
        setError(data.error);
      } else {
        setVerse(data);
        historyRef.current = [...historyRef.current, data.verse_key].slice(-HISTORY_MAX);
        saveHistory(tag, historyRef.current);
      }
    } catch {
      setError("Bağlantı hatası, tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }, [tag]);

  const handleOpen = useCallback(() => {
    historyRef.current = loadHistory(tag);
    setOpen(true);
    setVerse(null);
    setError(null);
    void fetchVerse();
  }, [tag, fetchVerse]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setVerse(null);
    setError(null);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, handleClose]);

  // Close on backdrop click
  const handleBackdrop = useCallback((e: React.MouseEvent) => {
    if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
      handleClose();
    }
  }, [handleClose]);

  return (
    <>
      <button
        onClick={handleOpen}
        className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors active:scale-95 ${renk}`}
      >
        {etiket}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={handleBackdrop}
          aria-modal="true"
          role="dialog"
        >
          <div
            ref={dialogRef}
            className="w-full max-w-md rounded-2xl border border-stone-200 bg-white shadow-2xl dark:border-stone-700 dark:bg-stone-900"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3 dark:border-stone-800">
              <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">
                {etiket}
              </span>
              <button
                onClick={handleClose}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                aria-label="Kapat"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-5">
              {loading && (
                <div className="flex flex-col items-center gap-3 py-6 text-stone-400">
                  <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span className="text-sm">Ayet getiriliyor…</span>
                </div>
              )}

              {error && !loading && (
                <p className="py-4 text-center text-sm text-red-500">{error}</p>
              )}

              {verse && !loading && (
                <div className="space-y-4">
                  {/* Arabic */}
                  <p
                    className="text-right font-arabic text-2xl leading-loose text-stone-800 dark:text-stone-100"
                    dir="rtl"
                    lang="ar"
                  >
                    {verse.arabic_text ?? "—"}
                  </p>

                  {/* Meal */}
                  {verse.meal && (
                    <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                      {verse.meal}
                    </p>
                  )}

                  {/* Meta + link */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-stone-400">
                      {verse.surah_name} · {verse.surah_id}:{verse.ayah_number}
                    </span>
                    <Link
                      href={`/surah/${verse.surah_id}/ayah/${verse.ayah_number}`}
                      onClick={handleClose}
                      className="text-xs font-medium text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-200"
                    >
                      Ayete git →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-stone-100 px-5 py-3 dark:border-stone-800">
              <button
                onClick={() => void fetchVerse()}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582M20 20v-5h-.581M5.635 15A9 9 0 1018.364 9" />
                </svg>
                Başka getir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
