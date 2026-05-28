"use client";

import { useEffect, useState } from "react";
import { getFavorites, setFavorites } from "../lib/storageUtils";

export function FavoriteButton({
  verseKey,
  size = "md",
}: {
  verseKey: string;
  size?: "sm" | "md" | "lg";
}) {
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    setIsFav(getFavorites().includes(verseKey));
  }, [verseKey]);

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const current = getFavorites();
    const next = current.includes(verseKey)
      ? current.filter((v) => v !== verseKey)
      : [...current, verseKey];
    setFavorites(next);
    setIsFav(next.includes(verseKey));
  }

  const iconSize = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5";
  const padding  = size === "sm" ? "p-1"     : size === "lg" ? "p-2"   : "p-1.5";

  return (
    <button
      onClick={toggle}
      type="button"
      title={isFav ? "Favorilerden çıkar" : "Favorilere ekle"}
      aria-label={isFav ? "Favorilerden çıkar" : "Favorilere ekle"}
      className={`rounded-full transition-colors ${padding} ${
        isFav
          ? "text-rose-500 hover:text-rose-600"
          : "text-stone-400 hover:text-rose-500 dark:text-stone-500 dark:hover:text-rose-400"
      }`}
    >
      <svg
        className={iconSize}
        fill={isFav ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    </button>
  );
}
