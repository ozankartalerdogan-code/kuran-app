"use client";

import Link from "next/link";
import { FavoriteButton } from "./FavoriteButton";

export interface VerseCardData {
  verse_key:    string;
  surah_id:     number;
  ayah_number:  number;
  surah_name?:  string | null;
  arabic_text?: string | null;
  reading_tr?:  string | null;
  meal:         string | null;
  ana_tema:     string | null;
  alt_taglar:   string[];
}

interface VerseCardProps {
  verse: VerseCardData;
  onTagClick: (tag: string) => void;
  onBeforeUnfavorite?: (verseKey: string) => boolean;
  onFavoriteToggle?: (isFavorite: boolean, verseKey: string) => void;
}

function formatAnaTemaBadge(code: string): string {
  // "F1_PEYGAMBER_KISSALARI" → "F1 · Peygamber Kıssaları"
  const parts  = code.split("_");
  const prefix = parts[0];
  const label  = parts.slice(1).join(" ").toLocaleLowerCase("tr-TR");
  return label ? `${prefix} · ${label}` : prefix;
}

export function VerseCard({ verse, onTagClick, onBeforeUnfavorite, onFavoriteToggle }: VerseCardProps) {
  const { verse_key, surah_id, ayah_number, surah_name, arabic_text, reading_tr, meal, ana_tema, alt_taglar } = verse;

  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-stone-700 dark:bg-stone-800">
      {/* Başlık */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <Link
          href={`/surah/${surah_id}/ayah/${ayah_number}`}
          className="group flex flex-col hover:underline"
        >
          {surah_name ? (
            <>
              <span className="text-sm font-semibold text-navy-600 group-hover:text-navy-700 dark:text-navy-400 dark:group-hover:text-navy-300">
                {surah_name}, {ayah_number}. Ayet
              </span>
              <span className="text-xs text-stone-400 dark:text-stone-500">{verse_key}</span>
            </>
          ) : (
            <span className="text-sm font-semibold text-navy-600 dark:text-navy-400">{verse_key}</span>
          )}
        </Link>
        <div className="flex shrink-0 items-center gap-1.5">
          {ana_tema && (
            <button
              onClick={() => onTagClick(ana_tema)}
              className="rounded-md border border-navy-200 bg-navy-50 px-2.5 py-1 text-xs font-medium text-navy-700 transition-colors hover:bg-navy-100 dark:border-navy-800 dark:bg-navy-900/30 dark:text-navy-300 dark:hover:bg-navy-900/50"
            >
              {formatAnaTemaBadge(ana_tema)}
            </button>
          )}
          <FavoriteButton verseKey={verse_key} size="sm" onBeforeUnfavorite={onBeforeUnfavorite} onToggle={onFavoriteToggle} />
        </div>
      </div>

      {/* Arapça metin */}
      {arabic_text && (
        <p
          className="mb-2 text-right text-xl leading-loose text-stone-900 dark:text-stone-100"
          dir="rtl"
          lang="ar"
        >
          {arabic_text}
        </p>
      )}

      {/* Okunuş — meal'den büyük */}
      {reading_tr && (
        <p className="mb-1.5 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
          {reading_tr}
        </p>
      )}

      {/* Meal — en küçük */}
      {meal ? (
        <p className="mb-3 text-xs leading-5 text-stone-500 line-clamp-3 dark:text-stone-400">{meal}</p>
      ) : (
        <p className="mb-3 text-xs italic text-stone-400 dark:text-stone-500">Meal verisi yok.</p>
      )}

      {/* Alt taglar */}
      {alt_taglar.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {alt_taglar.map((tag) => (
            <button
              key={tag}
              onClick={() => onTagClick(tag)}
              className="rounded-full border border-navy-200 bg-navy-50 px-2.5 py-1 text-xs font-medium text-navy-700 transition-colors hover:bg-navy-100 dark:border-navy-800 dark:bg-navy-900/30 dark:text-navy-300 dark:hover:bg-navy-900/50"
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}
