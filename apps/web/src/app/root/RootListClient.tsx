"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { RootItem } from "../../types/root";

type SortKey = "alphabetical" | "frequency" | "meaning";

interface Props {
  roots: RootItem[];
}

export default function RootListClient({ roots }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("frequency");

  const normalizedSearch = search.toLocaleLowerCase("tr-TR").trim();

  const processed = useMemo(() => {
    let list = [...roots];

    if (normalizedSearch) {
      list = list.filter(
        (r) =>
          r.root.includes(search.trim()) ||
          r.meaning_tr.toLocaleLowerCase("tr-TR").includes(normalizedSearch)
      );
    }

    list.sort((a, b) => {
      switch (sortKey) {
        case "alphabetical":
          return a.root.localeCompare(b.root, "ar");
        case "frequency":
          return b.frequency - a.frequency;
        case "meaning":
          return a.meaning_tr.localeCompare(b.meaning_tr, "tr");
        default:
          return 0;
      }
    });

    return list;
  }, [roots, normalizedSearch, sortKey, search]);

  return (
    <div className="mx-auto max-w-2xl">
      {/* Arama */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Kök veya anlam ara..."
          className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 shadow-sm transition-colors focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 night-mode:border-stone-600 night-mode:bg-stone-800 night-mode:text-stone-200 night-mode:placeholder-stone-500"
        />
      </div>

      {/* Sıralama butonları */}
      <div className="mb-5 flex flex-wrap gap-2">
        {(
          [
            { key: "alphabetical", label: "Alfabetik (Arapça)" },
            { key: "frequency", label: "Frekans" },
            { key: "meaning", label: "Anlam (Türkçe)" },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSortKey(key)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              sortKey === key
                ? "bg-emerald-600 text-white shadow-sm night-mode:bg-emerald-500"
                : "bg-stone-200 text-stone-700 hover:bg-stone-300 night-mode:bg-stone-700 night-mode:text-stone-300 night-mode:hover:bg-stone-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Kart listesi */}
      <div className="flex flex-col gap-2">
        {processed.length === 0 ? (
          <p className="py-10 text-center text-sm text-stone-400 night-mode:text-stone-500">
            Sonuç bulunamadı
          </p>
        ) : (
          processed.map((r) => (
            <button
              key={r.root}
              onClick={() => router.push(`/root/${encodeURIComponent(r.root)}`)}
              className="flex w-full items-center justify-between rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50 night-mode:border-stone-700 night-mode:bg-stone-800 night-mode:hover:border-emerald-600 night-mode:hover:bg-stone-700/80"
            >
              <div className="flex min-w-0 flex-1 flex-col items-start text-left">
                <span className="text-sm text-stone-600 night-mode:text-stone-400">
                  {r.meaning_tr}
                </span>
              </div>

              <span
                className="mx-3 flex-1 text-center text-lg font-semibold text-stone-900 night-mode:text-stone-100"
                dir="rtl"
                lang="ar"
              >
                {r.root}
              </span>

              <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-500 night-mode:bg-stone-700 night-mode:text-stone-400">
                {r.frequency}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}