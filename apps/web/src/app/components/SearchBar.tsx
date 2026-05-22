"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SearchResponse } from "../api/search/search-types";

type DropdownState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "surah";  surahId: number; surahName: string }
  | { kind: "tag";    tag: string; count: number }
  | { kind: "verses"; count: number }
  | { kind: "none" };

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery]       = useState("");
  const [dropdown, setDropdown] = useState<DropdownState>({ kind: "idle" });
  const wrapperRef  = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeDropdown = useCallback(() => setDropdown({ kind: "idle" }), []);

  // Dışarı tıklayınca kapat
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [closeDropdown]);

  // Debounce + API
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setDropdown({ kind: "idle" });
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setDropdown({ kind: "loading" });
      try {
        const res  = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        if (!res.ok) { setDropdown({ kind: "none" }); return; }
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

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  function handleSelect() {
    const trimmed = query.trim();
    if (!trimmed) return;

    if (dropdown.kind === "surah") {
      router.push(`/surah/${dropdown.surahId}/ayah/1`);
    } else if (dropdown.kind === "tag") {
      router.push(`/search?tag=${encodeURIComponent(dropdown.tag)}&page=1`);
    } else {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }

    setQuery("");
    closeDropdown();
  }

  return (
    <div className="relative flex-1" ref={wrapperRef}>
      <input
        aria-label="Arama"
        autoComplete="off"
        className="w-full rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") { closeDropdown(); setQuery(""); }
          if (e.key === "Enter")  { if (debounceRef.current) clearTimeout(debounceRef.current); handleSelect(); }
        }}
        placeholder="Sure veya kelime ara..."
        type="search"
        value={query}
      />

      {dropdown.kind !== "idle" && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-stone-200 bg-white shadow-lg"
          onMouseDown={(e) => e.preventDefault()}
        >
          {dropdown.kind === "loading" && (
            <p className="px-4 py-3 text-sm text-stone-400">Aranıyor…</p>
          )}

          {dropdown.kind === "none" && (
            <p className="px-4 py-3 text-sm text-stone-400">Sonuç bulunamadı.</p>
          )}

          {dropdown.kind === "surah" && (
            <button
              onClick={handleSelect}
              className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-stone-50"
            >
              <span className="text-stone-400">📖</span>
              <span className="text-sm font-medium text-stone-800">{dropdown.surahName}</span>
              <span className="ml-auto text-xs text-stone-400">Sure →</span>
            </button>
          )}

          {dropdown.kind === "tag" && (
            <button
              onClick={handleSelect}
              className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-stone-50"
            >
              <span className="text-stone-400">🏷️</span>
              <span className="text-sm font-medium text-stone-800">{dropdown.tag.replace(/_/g, " ")}</span>
              <span className="ml-auto text-xs text-stone-400">{dropdown.count} ayet →</span>
            </button>
          )}

          {dropdown.kind === "verses" && (
            <button
              onClick={handleSelect}
              className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-stone-50"
            >
              <span className="text-stone-400">🔍</span>
              <span className="text-sm text-stone-600">
                <span className="font-medium text-stone-800">{dropdown.count}</span> ayette geçiyor
              </span>
              <span className="ml-auto text-xs text-stone-400">Sonuçları gör →</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
