"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { parseDirectAyahQuery } from "../../lib/ayahRefs";
import { getRecentSearches, setRecentSearches } from "../../lib/storageUtils";
import type { SearchResponse } from "../api/search/search-types";

type DropdownState =
  | { kind: "idle" }
  | { kind: "recent" }
  | { kind: "loading" }
  | { kind: "surah"; surahId: number; surahName: string }
  | { kind: "tag"; tag: string; count: number }
  | { kind: "verses"; count: number }
  | { kind: "none" };

type SearchBarProps = {
  initialValue?: string;
  placeholder?: string;
};

const MAX_RECENT = 5;

function nextRecentSearches(query: string, current: string[]) {
  return [query, ...current.filter((item) => item !== query)].slice(0, MAX_RECENT);
}

export function SearchBar({ initialValue = "", placeholder = "Sure veya kelime ara..." }: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialValue);
  const [dropdown, setDropdown] = useState<DropdownState>({ kind: "idle" });
  const [recent, setRecent] = useState<string[]>([]);
  const [focused, setFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeDropdown = useCallback(() => setDropdown({ kind: "idle" }), []);

  const saveTextSearch = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setRecent((current) => {
      const next = nextRecentSearches(trimmed, current);
      setRecentSearches(next);
      return next;
    });
  }, []);

  const showRecent = useCallback((items = recent) => {
    setDropdown(items.length > 0 ? { kind: "recent" } : { kind: "idle" });
  }, [recent]);

  const navigateToAyah = useCallback((surahId: number, ayahNumber: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    router.push(`/surah/${surahId}/ayah/${ayahNumber}`);
    setQuery("");
    closeDropdown();
  }, [closeDropdown, router]);

  const runTextSearch = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    const directRef = parseDirectAyahQuery(trimmed);
    if (directRef) {
      navigateToAyah(directRef.surahId, directRef.ayahNumber);
      return;
    }

    saveTextSearch(trimmed);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    setQuery("");
    closeDropdown();
  }, [closeDropdown, navigateToAyah, router, saveTextSearch]);

  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const stored = getRecentSearches().filter((item) => typeof item === "string" && item.trim().length > 0).slice(0, MAX_RECENT);
    setRecent(stored);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false);
        closeDropdown();
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [closeDropdown]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();

    if (trimmed.length === 0) {
      if (focused) showRecent();
      else setDropdown({ kind: "idle" });
      return;
    }

    if (trimmed.length < 2) {
      setDropdown({ kind: "idle" });
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const directRef = parseDirectAyahQuery(trimmed);
      if (directRef) {
        navigateToAyah(directRef.surahId, directRef.ayahNumber);
        return;
      }

      setDropdown({ kind: "loading" });
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        if (!res.ok) {
          setDropdown({ kind: "none" });
          return;
        }
        const data = (await res.json()) as SearchResponse;

        if (data.type === "surah") {
          setDropdown({ kind: "surah", surahId: data.surahId, surahName: data.surahName });
        } else if (data.type === "tag") {
          setDropdown({ kind: "tag", tag: data.tag, count: data.count });
        } else if (data.type === "verses") {
          setDropdown({ kind: "verses", count: data.total });
        } else {
          setDropdown({ kind: "none" });
        }
      } catch {
        setDropdown({ kind: "none" });
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [focused, navigateToAyah, query, showRecent]);

  function handleSelect() {
    const trimmed = query.trim();
    if (!trimmed) return;

    const directRef = parseDirectAyahQuery(trimmed);
    if (directRef) {
      navigateToAyah(directRef.surahId, directRef.ayahNumber);
    } else if (dropdown.kind === "surah") {
      router.push(`/surah/${dropdown.surahId}/ayah/1`);
      setQuery("");
      closeDropdown();
    } else if (dropdown.kind === "tag") {
      router.push(`/search?tag=${encodeURIComponent(dropdown.tag)}&page=1`);
      setQuery("");
      closeDropdown();
    } else {
      runTextSearch(trimmed);
    }
  }

  function clearRecentSearches() {
    setRecent([]);
    setRecentSearches([]);
    closeDropdown();
  }

  function removeRecentSearch(value: string) {
    setRecent((current) => {
      const next = current.filter((item) => item !== value);
      setRecentSearches(next);
      if (next.length === 0) closeDropdown();
      return next;
    });
  }

  return (
    <div className="relative flex-1" ref={wrapperRef}>
      <input
        aria-label="Arama"
        autoComplete="off"
        className="w-full rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder-stone-500 dark:focus:ring-stone-600"
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          setFocused(true);
          if (query.trim().length === 0) showRecent();
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setFocused(false);
            closeDropdown();
            setQuery("");
          }
          if (e.key === "Enter") {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            handleSelect();
          }
        }}
        placeholder={placeholder}
        type="search"
        value={query}
      />

      {dropdown.kind !== "idle" && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-stone-200 bg-white shadow-lg dark:border-stone-700 dark:bg-stone-900"
          onMouseDown={(e) => e.preventDefault()}
        >
          {dropdown.kind === "recent" && (
            <div>
              <div className="flex items-center justify-between border-b border-stone-100 px-4 py-2 dark:border-stone-800">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">Son Aramalar</span>
                <button
                  className="text-xs font-semibold text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                  onClick={clearRecentSearches}
                  type="button"
                >
                  Temizle
                </button>
              </div>
              {recent.map((item) => (
                <button
                  key={item}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-stone-50 dark:hover:bg-stone-800"
                  onClick={() => runTextSearch(item)}
                  type="button"
                >
                  <span className="text-stone-400 dark:text-stone-500">↺</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-stone-700 dark:text-stone-200">{item}</span>
                  <span
                    aria-label={`${item} aramasını sil`}
                    className="rounded px-2 py-1 text-sm text-stone-400 hover:bg-stone-100 hover:text-red-500 dark:hover:bg-stone-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRecentSearch(item);
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    ×
                  </span>
                </button>
              ))}
            </div>
          )}

          {dropdown.kind === "loading" && (
            <p className="px-4 py-3 text-sm text-stone-400 dark:text-stone-500">Aranıyor...</p>
          )}

          {dropdown.kind === "none" && (
            <p className="px-4 py-3 text-sm text-stone-400 dark:text-stone-500">Sonuç bulunamadı.</p>
          )}

          {dropdown.kind === "surah" && (
            <button
              onClick={handleSelect}
              className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-stone-50 dark:hover:bg-stone-800"
              type="button"
            >
              <span className="text-stone-400 dark:text-stone-500">📖</span>
              <span className="text-sm font-medium text-stone-800 dark:text-stone-100">{dropdown.surahName}</span>
              <span className="ml-auto text-xs text-stone-400 dark:text-stone-500">Sure →</span>
            </button>
          )}

          {dropdown.kind === "tag" && (
            <button
              onClick={handleSelect}
              className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-stone-50 dark:hover:bg-stone-800"
              type="button"
            >
              <span className="text-stone-400 dark:text-stone-500">#</span>
              <span className="text-sm font-medium text-stone-800 dark:text-stone-100">{dropdown.tag.replace(/_/g, " ")}</span>
              <span className="ml-auto text-xs text-stone-400 dark:text-stone-500">{dropdown.count} ayet →</span>
            </button>
          )}

          {dropdown.kind === "verses" && (
            <button
              onClick={handleSelect}
              className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-stone-50 dark:hover:bg-stone-800"
              type="button"
            >
              <span className="text-stone-400 dark:text-stone-500">⌕</span>
              <span className="text-sm text-stone-600 dark:text-stone-300">
                <span className="font-medium text-stone-800 dark:text-stone-100">{dropdown.count}</span> ayette geçiyor
              </span>
              <span className="ml-auto text-xs text-stone-400 dark:text-stone-500">Sonuçları gör →</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
