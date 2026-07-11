"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface SearchBarProps {
  initialValue?: string;
  placeholder?: string;
}

export function SearchBar({
  initialValue = "",
  placeholder = "Sure adı, tema kodu (F1) veya kelime ara…",
}: SearchBarProps) {
  const router  = useRouter();
  const [query, setQuery]   = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dışarıdan initialValue değişirse input'u senkronize et
  useEffect(() => { setQuery(initialValue); }, [initialValue]);

  async function navigate(q: string) {
    const trimmed = q.trim();
    if (trimmed.length < 2) return;

    setLoading(true);
    try {
      const res  = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
      if (!res.ok) return;

      // Bulgu 1: tip güvenli import ve cast
      const { type, surahId, tag } = (await res.json()) as {
        type: "surah" | "tag" | "verses" | "none";
        surahId?: number;
        tag?: string;
      };

      if (type === "surah" && surahId) {
        router.push(`/surah/${surahId}/ayah/1`);
      } else if (type === "tag" && tag) {
        router.push(`/search?tag=${encodeURIComponent(tag)}`);
      } else if (type === "verses") {
        router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      }
      // type === "none" → hiçbir şey yapma
    } catch {
      // sessizce geç
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => navigate(val), 300);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      navigate(query);
    }
  }

  return (
    <div className="relative w-full">
      <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
        {loading ? (
          <svg
            className="h-4 w-4 animate-spin text-stone-400"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        ) : (
          <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
        )}
      </div>
      <input
        type="search"
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full rounded-md border border-stone-300 bg-white py-2.5 pl-10 pr-4 text-sm text-stone-900 shadow-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:ring-stone-600"
      />
    </div>
  );
}
