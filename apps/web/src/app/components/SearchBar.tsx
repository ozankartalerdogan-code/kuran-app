"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SearchResponse } from "../api/search/search-types";

type DropdownState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "surah"; surahId: number; surahName: string }
  | { kind: "none" };

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [dropdown, setDropdown] = useState<DropdownState>({ kind: "idle" });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeDropdown = useCallback(() => {
    setDropdown({ kind: "idle" });
  }, []);

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
    },
    [router]
  );

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [closeDropdown]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();

    if (trimmed.length < 3) {
      setDropdown({ kind: "idle" });
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setDropdown({ kind: "loading" });

      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        const data = (await res.json()) as SearchResponse;

        if (data.type === "surah") {
          setDropdown({ kind: "surah", surahId: data.surahId, surahName: data.surahName });
        } else {
          setDropdown({ kind: "none" });
        }
      } catch {
        setDropdown({ kind: "none" });
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, navigate, closeDropdown]);

  function handleEnter() {
    const trimmed = query.trim();
    if (!trimmed) return;
    navigate(`/arama?q=${encodeURIComponent(trimmed)}`);
    setQuery("");
    closeDropdown();
  }

  return (
    <div className="relative w-full max-w-sm" ref={wrapperRef}>
      <input
        aria-label="Arama"
        autoComplete="off"
        className="w-full rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            closeDropdown();
            setQuery("");
          }
          if (e.key === "Enter") {
            handleEnter();
          }
        }}
        placeholder="Sure veya kelime ara..."
        type="search"
        value={query}
      />

      {dropdown.kind !== "idle" && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-stone-200 bg-white shadow-lg">
          {dropdown.kind === "loading" && (
            <p className="px-4 py-3 text-sm text-stone-500">Aranıyor…</p>
          )}

          {dropdown.kind === "none" && (
            <p className="px-4 py-3 text-sm text-stone-400">
              Enter&apos;a bas → kelime arama
            </p>
          )}

          {dropdown.kind === "surah" && (
            <p className="px-4 py-3 text-sm text-stone-500">
              <span className="font-medium text-stone-700">{dropdown.surahName}</span>
              {" eşleşmesi bulundu — Enter'a bas"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
