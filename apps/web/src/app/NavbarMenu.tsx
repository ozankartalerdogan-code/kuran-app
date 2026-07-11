"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { NightModeToggle } from "./NightModeToggle";

const SearchBar = dynamic(
  () => import("./components/SearchBar").then((m) => m.SearchBar),
  {
    ssr: false,
    loading: () => (
      <div className="w-full rounded-lg border border-stone-200 bg-stone-50 py-2.5 px-4 text-sm text-stone-400">
        Ara…
      </div>
    ),
  },
);

const NAV_LINKS = [
  { href: "/surah",      label: "Tüm Sureler" },
  { href: "/mushaf-sayfa", label: "Mushaf" },
  { href: "/ogren",      label: "Konular" },
  { href: "/hatim",      label: "Hatim" },
  {
    href: "/favoriler",
    label: "Favoriler",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
  {
    href: "/notlarim",
    label: "Notlarım",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  { href: "/discover",   label: "Keşfet",     accent: true },
];

export function NavbarMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* ── Ana çubuk ── */}
      <div className="flex items-center gap-3">
        {/* Marka / Ana Sayfa */}
        <Link
          href="/"
          aria-label="Ana sayfaya git"
          className="shrink-0 text-sm font-semibold text-stone-800 hover:text-emerald-700 dark:text-stone-200 dark:hover:text-emerald-400"
        >
          <span aria-hidden="true">📖</span> Kuran Yolu
        </Link>

        {/* Masaüstü: ek linkler */}
        <Link
          href="/surah"
          aria-label="Sureler sayfasına git"
          className="hidden shrink-0 text-sm font-medium text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 sm:block"
        >
          Sureler
        </Link>
        <Link
          href="/mushaf-sayfa"
          aria-label="Mushaf sayfasına git"
          className="hidden shrink-0 text-sm font-medium text-stone-600 hover:text-amber-700 dark:text-stone-400 dark:hover:text-amber-400 sm:block"
        >
          Mushaf
        </Link>
        <Link
          href="/ogren"
          aria-label="Konular sayfasına git"
          className="hidden shrink-0 text-sm font-medium text-stone-600 hover:text-emerald-600 dark:text-stone-400 dark:hover:text-emerald-400 sm:block"
        >
          Konular
        </Link>

        {/* Arama barı */}
        <div className="flex-1">
          <SearchBar />
        </div>

        {/* Masaüstü: sağ linkler */}
        <Link
          href="/favoriler"
          aria-label="Favoriler sayfasına git"
          className="hidden shrink-0 items-center gap-1 text-sm font-medium text-stone-600 hover:text-rose-500 dark:text-stone-400 dark:hover:text-rose-400 sm:flex"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          Favoriler
        </Link>
        <Link
          href="/notlarim"
          aria-label="Notlarım sayfasına git"
          className="hidden shrink-0 items-center gap-1 text-sm font-medium text-stone-600 hover:text-amber-600 dark:text-stone-400 dark:hover:text-amber-400 sm:flex"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Notlarım
        </Link>
        <Link
          href="/discover"
          aria-label="Keşfet sayfasına git"
          className="hidden shrink-0 items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 sm:flex"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
          Keşfet
        </Link>

        {/* Gece modu toggle — her ekran boyutunda görünür */}
        <NightModeToggle />

        {/* Mobil: hamburger */}
        <button
          onClick={() => setOpen((p) => !p)}
          type="button"
          aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
          aria-expanded={open}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800 sm:hidden"
        >
          {open ? (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* ── Mobil açılır menü ── */}
      {open && (
        <div className="mt-2 border-t border-stone-100 pt-2 dark:border-stone-800 sm:hidden">
          {NAV_LINKS.map(({ href, label, icon, accent }) => (
            <Link
              key={href}
              href={href}
              aria-label={`${label} sayfasına git`}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                accent
                  ? "mt-1 bg-indigo-600 text-white hover:bg-indigo-700"
                  : "text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
              }`}
            >
              {icon ?? null}
              {label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
