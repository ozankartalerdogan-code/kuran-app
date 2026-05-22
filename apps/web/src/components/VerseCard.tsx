"use client";

import Link from "next/link";

export interface VerseCardData {
  verse_key:   string;
  surah_id:    number;
  ayah_number: number;
  meal:        string | null;
  ana_tema:    string | null;
  alt_taglar:  string[];
}

interface VerseCardProps {
  verse: VerseCardData;
  onTagClick: (tag: string) => void;
}

function formatAnaTemaBadge(code: string): string {
  // "F1_PEYGAMBER_KISSALARI" → "F1 · Peygamber Kıssaları"
  const parts = code.split("_");
  const prefix = parts.slice(0, 2).join(""); // "F1"
  const label  = parts.slice(2).join(" ").toLowerCase();
  return label ? `${prefix} · ${label}` : prefix;
}

export function VerseCard({ verse, onTagClick }: VerseCardProps) {
  const { verse_key, surah_id, ayah_number, meal, ana_tema, alt_taglar } = verse;

  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      {/* Başlık */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <Link
          href={`/surah/${surah_id}/ayah/${ayah_number}`}
          className="text-sm font-semibold text-indigo-600 hover:underline"
        >
          {verse_key}
        </Link>
        {ana_tema && (
          <button
            onClick={() => onTagClick(ana_tema)}
            className="rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100"
          >
            {formatAnaTemaBadge(ana_tema)}
          </button>
        )}
      </div>

      {/* Meal metni */}
      {meal ? (
        <p className="mb-3 text-sm leading-6 text-stone-800 line-clamp-3">{meal}</p>
      ) : (
        <p className="mb-3 text-sm italic text-stone-400">Meal verisi yok.</p>
      )}

      {/* Alt taglar */}
      {alt_taglar.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {alt_taglar.map((tag) => (
            <button
              key={tag}
              onClick={() => onTagClick(tag)}
              className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}
