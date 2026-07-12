"use client";

import { useState } from "react";
import { Info, TriangleAlert, ChevronDown, type LucideIcon } from "lucide-react";
import { getDevotionalSourceLabel, getEvidenceLabel } from "../../lib/sourceLabels";

export type Durum = "farz" | "vacip" | "sunnet" | string;

const DURUM_CLS: Record<string, string> = {
  farz:             "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  farz_i_kifaye:    "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  vacip:            "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  sunnet:           "bg-navy-100 text-navy-700 dark:bg-navy-900/40 dark:text-navy-300",
  sunnet_musteap:   "bg-navy-100 text-navy-700 dark:bg-navy-900/40 dark:text-navy-300",
  sunnet_i_muekked: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
};

const DURUM_LABEL: Record<string, string> = {
  farz:             "FARZ",
  farz_i_kifaye:    "FARZ-I KİFAYE",
  vacip:            "VACİP",
  sunnet:           "SÜNNET",
  sunnet_musteap:   "MÜSTEHAP",
  sunnet_i_muekked: "MÜEKKED SÜNNET",
};

export function DurumBadge({ durum }: { durum?: string | null }) {
  if (!durum) return null;
  const cls = DURUM_CLS[durum];
  if (!cls) return null;
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${cls}`}>
      {DURUM_LABEL[durum] ?? durum.toUpperCase()}
    </span>
  );
}

export function DuaBlock({
  arapca, okunus, anlam, kaynak,
}: {
  arapca?: string | null; okunus?: string | null; anlam?: string | null; kaynak?: string | null;
}) {
  if (!arapca && !okunus && !anlam) return null;
  const sourceLabel = kaynak ? getDevotionalSourceLabel({ source: kaynak }) : null;
  return (
    <div className="mt-2 rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-900/60">
      {arapca && (
        <p dir="rtl" lang="ar" className="font-scheherazade mb-1.5 text-right text-xl leading-loose text-stone-900 dark:text-stone-100">
          {arapca}
        </p>
      )}
      {okunus && <p className="mb-1 text-sm italic leading-relaxed text-stone-700 dark:text-stone-300">{okunus}</p>}
      {anlam && <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">{anlam}</p>}
      {sourceLabel && <p className="mt-1.5 text-[11px] font-bold text-navy-700 dark:text-navy-400">{sourceLabel}</p>}
    </div>
  );
}

export function Note({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "warn" }) {
  const Ikon = tone === "warn" ? TriangleAlert : Info;
  return (
    <p
      className={`mt-2 flex items-start gap-2 rounded-md p-2.5 text-xs leading-relaxed ${
        tone === "warn"
          ? "border border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800/40 dark:bg-orange-950/30 dark:text-orange-300"
          : "bg-stone-100 text-stone-600 dark:bg-stone-800/60 dark:text-stone-400"
      }`}
    >
      <Ikon aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

export function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="mt-1.5 space-y-1.5">
      {items.map((m, i) => (
        <li key={i} className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">
          • {m}
        </li>
      ))}
    </ul>
  );
}

export function Section({
  ikon: Ikon, title, children, defaultOpen = false,
}: {
  ikon: LucideIcon; title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-stone-200 dark:border-stone-700/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 bg-white px-4 py-3.5 text-left transition-colors hover:bg-stone-50 dark:bg-stone-800/40 dark:hover:bg-stone-800"
      >
        <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700 dark:bg-navy-900/40 dark:text-navy-300">
          <Ikon className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <span className="flex-1 text-sm font-bold text-stone-900 dark:text-stone-50">{title}</span>
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-stone-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          strokeWidth={2}
        />
      </button>
      {open && <div className="border-t border-stone-100 bg-white px-4 py-4 dark:border-stone-800 dark:bg-stone-800/20">{children}</div>}
    </div>
  );
}

export { getEvidenceLabel };
