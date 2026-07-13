"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import {
  BookOpen, BookMarked, GraduationCap, BookmarkCheck,
  Heart, NotebookPen, Compass, Menu, X, Sprout,
  type LucideIcon,
} from "lucide-react";
import { NightModeToggle } from "./NightModeToggle";

const SearchBar = dynamic(
  () => import("./components/SearchBar").then((m) => m.SearchBar),
  {
    ssr: false,
    loading: () => (
      <div className="w-full rounded-md border border-white/15 bg-white/10 py-1.5 px-3 text-sm text-navy-300">
        Ara…
      </div>
    ),
  },
);

// Mobil açılır menü — tüm bölümler, ikonlu
const NAV_LINKS: { href: string; label: string; icon: LucideIcon; accent?: boolean }[] = [
  { href: "/surah",        label: "Tüm Sureler", icon: BookOpen },
  { href: "/mushaf-sayfa", label: "Mushaf",      icon: BookMarked },
  { href: "/ogren",        label: "Konular",     icon: GraduationCap },
  { href: "/root",         label: "Kökler",      icon: Sprout },
  { href: "/hatim",        label: "Hatim",       icon: BookmarkCheck },
  { href: "/favoriler",    label: "Favoriler",   icon: Heart },
  { href: "/notlarim",     label: "Notlarım",    icon: NotebookPen },
  { href: "/discover",     label: "Keşfet",      icon: Compass, accent: true },
];

// Masaüstünde markanın yanında görünen ana bölümler
const DESKTOP_LEFT_LINKS = [
  { href: "/surah",        label: "Sureler" },
  { href: "/mushaf-sayfa", label: "Mushaf" },
  { href: "/ogren",        label: "Konular" },
  { href: "/root",         label: "Kökler" },
];

/** Marka işareti: lacivert kutu içinde altın kitap — hero/footer ile aynı kimlik */
function BrandMark() {
  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-navy-800 to-navy-950 text-gold-300 ring-1 ring-gold-500/50 shadow-sm"
    >
      <BookOpen className="h-4 w-4" strokeWidth={2} />
    </span>
  );
}

export function NavbarMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? "";

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* ── Ana çubuk ── */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Marka / Ana Sayfa */}
        <Link
          href="/"
          aria-label="Ana sayfaya git"
          className="group flex min-h-11 shrink-0 items-center gap-2.5"
        >
          <BrandMark />
          <span className="text-[15px] font-bold tracking-tight text-white transition-colors group-hover:text-gold-200">
            Kuran <span className="text-gold-300">Yolu</span>
          </span>
        </Link>

        {/* İnce altın ayraç — marka ile linkler arasında */}
        <span aria-hidden="true" className="hidden h-5 w-px bg-white/15 lg:block" />

        {/* Masaüstü: ana bölümler */}
        <div className="hidden items-center gap-1 lg:flex">
          {DESKTOP_LEFT_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-label={`${label} sayfasına git`}
              aria-current={isActive(href) ? "page" : undefined}
              className={`relative rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                isActive(href)
                  ? "text-white after:absolute after:inset-x-2.5 after:-bottom-[13px] after:h-0.5 after:rounded-full after:bg-gold-400"
                  : "text-navy-200 hover:bg-white/5 hover:text-white"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Arama — ana sayfada hero'da büyük arama olduğu için gizlenir */}
        <div className="min-w-0 flex-1">
          {pathname === "/" ? null : <SearchBar />}
        </div>

        {/* Masaüstü: kişisel bölümler */}
        <div className="hidden shrink-0 items-center gap-1 lg:flex">
          <Link
            href="/favoriler"
            aria-label="Favoriler sayfasına git"
            aria-current={isActive("/favoriler") ? "page" : undefined}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
              isActive("/favoriler")
                ? "bg-white/10 text-white"
                : "text-navy-200 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Heart aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
            Favoriler
          </Link>
          <Link
            href="/notlarim"
            aria-label="Notlarım sayfasına git"
            aria-current={isActive("/notlarim") ? "page" : undefined}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
              isActive("/notlarim")
                ? "bg-white/10 text-white"
                : "text-navy-200 hover:bg-white/5 hover:text-white"
            }`}
          >
            <NotebookPen aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
            Notlarım
          </Link>
        </div>

        {/* Keşfet — altın CTA */}
        <Link
          href="/discover"
          aria-label="Keşfet sayfasına git"
          className="hidden min-h-11 shrink-0 items-center gap-1.5 rounded-lg bg-gold-500 px-3.5 py-1.5 text-sm font-semibold text-navy-950 shadow-sm ring-1 ring-gold-400/60 transition-colors hover:bg-gold-400 lg:flex"
        >
          <Compass aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
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
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-navy-100 transition-colors hover:bg-white/10 lg:hidden"
        >
          {open
            ? <X aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
            : <Menu aria-hidden="true" className="h-5 w-5" strokeWidth={2} />}
        </button>
      </div>

      {/* ── Mobil açılır menü ── */}
      {open && (
        <div className="mt-3 border-t border-white/10 pt-2 lg:hidden">
          {NAV_LINKS.map(({ href, label, icon: Icon, accent }) => (
            <Link
              key={href}
              href={href}
              aria-label={`${label} sayfasına git`}
              aria-current={isActive(href) ? "page" : undefined}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                accent
                  ? "mt-2 bg-gold-500 text-navy-950 hover:bg-gold-400"
                  : isActive(href)
                    ? "bg-white/10 text-gold-300"
                    : "text-navy-100 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={2} />
              {label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
