"use client";

import { useEffect, useRef, useState } from "react";

function surahAudioUrl(surahId: number): string {
  return `/audio/surah/${String(surahId).padStart(3, "0")}.mp3`;
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
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(surahAudioUrl(surahId));
    audioRef.current = audio;

    function onTimeUpdate() {
      if (audio.duration > 0) {
        setProgress(audio.currentTime / audio.duration);
      }
    }
    function onEnded() {
      setPlaying(false);
      setProgress(0);
    }

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.pause();
      audio.src = "";
    };
  }, [surahId]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      setPlaying(true);
      audio.play().catch(() => setPlaying(false));
    }
  }

  if (variant === "detail") {
    return (
      <div className="flex flex-col gap-1.5">
        <button
          onClick={toggle}
          type="button"
          title={playing ? "Duraklat" : "Dinle"}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium shadow-sm transition-colors ${
            playing
              ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
              : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
          }`}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
          {playing ? "Duraklat" : "Dinle"}
        </button>
        <div className="h-1 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={toggle}
        type="button"
        title={playing ? "Duraklat" : "Oku"}
        className={`flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
          playing
            ? "border-emerald-300 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            : "border-stone-200 bg-stone-50 text-stone-500 hover:bg-white hover:text-stone-700 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700"
        }`}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <div className="h-0.5 w-7 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
        <div
          className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
    </div>
  );
}
