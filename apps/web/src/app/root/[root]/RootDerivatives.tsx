"use client";

import { useState } from "react";
import Link from "next/link";
import { translatePos } from "../../../lib/morphologyLabels";

export interface DerivativeGroup {
  lemma: string;
  meaning_tr: string;
  pos: string;
  verseKeys: string[];
}

interface Props {
  groups: DerivativeGroup[];
}

function parseVerseKey(key: string): { surahId: string; ayahNumber: string } {
  const idx = key.indexOf(":");
  return { surahId: key.slice(0, idx), ayahNumber: key.slice(idx + 1) };
}

function AccordionItem({
  group,
  forceOpen,
}: {
  group: DerivativeGroup;
  forceOpen: boolean;
}) {
  const [open, setOpen] = useState(false);
  const isOpen = forceOpen || open;

  return (
    <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
      <button
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-stone-50"
        onClick={() => setOpen((p) => !p)}
        type="button"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-xl text-stone-950" dir="rtl" lang="ar">
            {group.lemma}
          </span>
          <span className="min-w-0 text-sm text-stone-700">
            {group.meaning_tr}
            {group.pos ? (
              <span className="ml-1.5 inline-flex flex-col rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-500">
                <span>
                  {group.pos}
                  <span className="hidden sm:inline text-stone-400">
                    {" "}({translatePos(group.pos)})
                  </span>
                </span>
                <span className="sm:hidden text-[10px] leading-tight text-stone-400">
                  {translatePos(group.pos)}
                </span>
              </span>
            ) : null}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            {group.verseKeys.length} ayet
          </span>
          <svg
            className={`h-4 w-4 text-stone-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      <div
        className={`grid transition-all duration-200 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-wrap gap-1.5 border-t border-stone-100 px-4 py-3">
            {group.verseKeys.map((key) => {
              const { surahId, ayahNumber } = parseVerseKey(key);
              return (
                <Link
                  key={key}
                  className="rounded border border-stone-200 bg-stone-50 px-2 py-1 text-xs text-stone-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                  href={`/surah/${surahId}/ayah/${ayahNumber}`}
                >
                  {surahId}:{ayahNumber}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function RootDerivatives({ groups }: Props) {
  const [expandAll, setExpandAll] = useState(false);

  if (groups.length === 0) {
    return (
      <section className="rounded-md border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-stone-500">Türev kelime verisi yok.</p>
      </section>
    );
  }

  return (
    <section className="rounded-md border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-stone-950">
          Türev Kelimeler
          <span className="ml-2 text-sm font-normal text-stone-500">({groups.length} form)</span>
        </h2>
        <button
          className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
          onClick={() => setExpandAll((p) => !p)}
          type="button"
        >
          {expandAll ? "Tümünü Daralt" : "Tümünü Genişlet"}
        </button>
      </div>

      <div className="space-y-2">
        {groups.map((group) => (
          <AccordionItem
            key={`${group.lemma}||${group.meaning_tr}||${group.pos}`}
            forceOpen={expandAll}
            group={group}
          />
        ))}
      </div>
    </section>
  );
}
