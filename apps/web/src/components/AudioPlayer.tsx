"use client";

import { useEffect, useRef, useState } from "react";

// ── CDN / Ses URL yardımcısı ──────────────────────────────────────────────────
//
// NEXT_PUBLIC_AUDIO_BASE_URL varsa CDN'den serve eder.
// Yoksa (local dev) /audio/surah/… relative path'i kullanır.
//
// CDN format : https://pub-xxx.r2.dev/surah/001.mp3
// Local format: /audio/surah/001.mp3

function surahAudioUrl(surahId: number): string {
  const id = String(surahId).padStart(3, "0");
  const base = process.env.NEXT_PUBLIC_AUDIO_BASE_URL;
  return base ? `${base}/surah/${id}.mp3` : `/audio/surah/${id}.mp3`;
}

export interface AudioPlayerProps {
  surahId: number;
  variant?: "compact" | "detail";
}

function PlayIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

export function AudioPlayer({ surahId, variant = "compact" }: AudioPlayerProps) {
  const [playing,  setPlaying]  = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setLoadError(false);
    setPlaying(false);
    setProgress(0);

    const url   = surahAudioUrl(surahId);
    const audio = new Audio(url);
    audioRef.current = audio;

    function onTimeUpdate() {
      if (audio.duration > 0) setProgress(audio.currentTime / audio.duration);
    }
    function onEnded() { setPlaying(false); setProgress(0); }
    function onError() {
      // CDN başarısızsa local path'i dene (sadece geliştirmede anlamlı)
      const localUrl = `/audio/surah/${String(surahId).padStart(3, "0")}.mp3`;
      if (audio.src !== window.location.origin + localUrl) {
        audio.src = localUrl;
        audio.load();
      } else {
        setLoadError(true);
        setPlaying(false);
      }
    }

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended",      onEnded);
    audio.addEventListener("error",      onError);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended",      onEnded);
      audio.removeEventListener("error",      onError);
      audio.pause();
      audio.src = "";
    };
  }, [surahId]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio || loadError) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      setPlaying(true);
      audio.play().catch(() => { setPlaying(false); setLoadError(true); });
    }
  }

  // ── Detail variant ──────────────────────────────────────────────────────────
  if (variant === "detail") {
    return (
      <div className="flex flex-col gap-1.5">
        <button
          onClick={toggle}
          type="button"
          disabled={loadError}
          title={loadError ? "Ses yüklenemedi" : playing ? "Duraklat" : "Dinle"}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            playing
              ? "border-navy-300 bg-navy-50 text-navy-700 hover:bg-navy-100 dark:border-navy-700 dark:bg-navy-900/30 dark:text-navy-400 dark:hover:bg-navy-900/50"
              : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
          }`}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
          {loadError ? "Ses yüklenemedi" : playing ? "Duraklat" : "Dinle"}
        </button>
        <div className="h-1 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
          <div
            className="h-full rounded-full bg-navy-500 transition-[width] duration-300"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>
    );
  }

  // ── Compact variant ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={toggle}
        type="button"
        disabled={loadError}
        title={loadError ? "Ses yüklenemedi" : playing ? "Duraklat" : "Oku"}
        className={`flex h-7 w-7 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          playing
            ? "border-navy-300 bg-navy-50 text-navy-600 hover:bg-navy-100 dark:border-navy-700 dark:bg-navy-900/30 dark:text-navy-400"
            : "border-stone-200 bg-stone-50 text-stone-500 hover:bg-white hover:text-stone-700 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700"
        }`}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <div className="h-0.5 w-7 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
        <div
          className="h-full rounded-full bg-navy-500 transition-[width] duration-300"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
    </div>
  );
}
