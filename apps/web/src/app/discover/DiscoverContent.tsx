"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Sparkles, Orbit, Moon, HandHeart, Brain, Scale,
  Star, Gem, Globe, BookOpen, Scroll, Shield, MoonStar, LayoutGrid, Sprout,
  type LucideIcon,
} from "lucide-react";
import { getGroups, getLevel1ByGroup, getThemeTitle } from "../../lib/themes";

// ── Tip tanımları ─────────────────────────────────────────────────────────────

interface ThemeCard {
  kod:      string;
  aciklama: string;
  gradient: string;
  ikon:     LucideIcon;
}

interface AkordeonTema {
  kod:   string;
  isim:  string;
  ayet?: number;
}

interface AkordeonGrup {
  kod:     string;
  baslik:  string;
  ikon:    LucideIcon;
  temalar: AkordeonTema[];
}

type ThemeCounts = Record<string, number>;

// ── Öne çıkan 6 tema kartı ────────────────────────────────────────────────────
// Başlıklar ve ayet sayıları taksonomi/API'den gelir; burada yalnız sunum seçimi var.

// Marka kimliği: gökkuşağı gradyanlar yerine lacivert-altın ailesi (premium dil)
const FEATURED_THEMES: ThemeCard[] = [
  {
    kod:      "A1_ALLAH_ULUHIYET",
    aciklama: "Allah'ın isim, sıfat ve birliği",
    gradient: "from-navy-950 to-navy-700",
    ikon:     Sparkles,
  },
  {
    kod:      "E1_KEVNI_AYETLER",
    aciklama: "Göklerin, yerin ve tabiatın varoluşundaki ilahi deliller",
    gradient: "from-navy-800 to-navy-500",
    ikon:     Orbit,
  },
  {
    kod:      "A6_AHIRET_MEAD",
    aciklama: "Ölüm, kıyamet, cennet ve cehennem",
    gradient: "from-navy-900 to-navy-600",
    ikon:     Moon,
  },
  {
    kod:      "B2_SERI_IBADETLER",
    aciklama: "Namaz, oruç, zekât, hac",
    gradient: "from-gold-800 to-gold-600",
    ikon:     HandHeart,
  },
  {
    kod:      "E2_INSANIN_MAHIYETI",
    aciklama: "İnsanın yaratılış aşamaları, nefis, ruh ve fıtrat analizleri",
    gradient: "from-navy-700 to-navy-400",
    ikon:     Brain,
  },
  {
    kod:      "D5_TOPLUMSAL_DUZEN",
    aciklama: "Adalet, şura, emanet, fitne",
    gradient: "from-gold-950 to-gold-700",
    ikon:     Scale,
  },
];

const GROUP_ICONS: Record<string, LucideIcon> = {
  A: Star,
  B: HandHeart,
  C: Gem,
  D: Scale,
  E: Globe,
  F: BookOpen,
  G: Scroll,
};

// ── Alt bileşenler ────────────────────────────────────────────────────────────

function ThemeCardGrid({
  onTagClick,
  counts,
}: {
  onTagClick: (tag: string) => void;
  counts: ThemeCounts | null;
}) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-600 dark:text-stone-400">
        Öne Çıkan Temalar
      </h2>
      <div className="stagger-children grid grid-cols-2 gap-3 sm:grid-cols-3">
        {FEATURED_THEMES.map((t) => {
          const ayet = counts?.[t.kod];
          return (
            <button
              key={t.kod}
              onClick={() => onTagClick(t.kod)}
              className={`group relative overflow-hidden rounded-xl bg-gradient-to-br ${t.gradient} p-4 text-left shadow-md ring-1 ring-white/10 transition-transform hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0`}
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20">
                <t.ikon aria-hidden="true" className="h-5 w-5 text-gold-200" strokeWidth={1.75} />
              </span>
              <p className="mt-2 text-sm font-bold leading-tight text-white">{getThemeTitle(t.kod, "tr")}</p>
              <p className="mt-1 text-xs leading-snug text-white/75 line-clamp-2">{t.aciklama}</p>
              {ayet !== undefined ? (
                <span className="mt-2.5 inline-block rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold tracking-wide text-gold-200">
                  {ayet.toLocaleString("tr-TR")} ayet
                </span>
              ) : null}
              <span className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/10" />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function AkordeonItem({
  grup,
  onTagClick,
}: {
  grup: AkordeonGrup;
  onTagClick: (tag: string) => void;
}) {
  const [acik, setAcik] = useState(false);
  const sayilarHazir = grup.temalar.every((t) => t.ayet !== undefined);
  const toplamAyet = grup.temalar.reduce((s, t) => s + (t.ayet ?? 0), 0);

  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
      <button
        onClick={() => setAcik((p) => !p)}
        aria-expanded={acik}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <grup.ikon aria-hidden="true" className="h-4 w-4 shrink-0 text-navy-600" strokeWidth={1.75} />
          <span className="text-sm font-semibold text-stone-800 truncate">{grup.baslik}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {sayilarHazir ? (
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
              {toplamAyet.toLocaleString("tr-TR")} ayet
            </span>
          ) : null}
          <svg
            className={`h-4 w-4 shrink-0 text-stone-400 transition-transform duration-200 ${acik ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {acik && (
        <div className="border-t border-stone-100 px-4 py-3">
          <div className="flex flex-col gap-1.5">
            {grup.temalar.map((t) => (
              <button
                key={t.kod}
                onClick={() => onTagClick(t.kod)}
                className="flex items-center justify-between rounded-lg border border-stone-100 bg-stone-50 px-3 py-2 text-left transition-colors hover:border-navy-200 hover:bg-navy-50"
              >
                <span className="text-xs font-medium text-stone-700 group-hover:text-navy-700">
                  {t.isim}
                </span>
                {t.ayet !== undefined ? (
                  <span className="shrink-0 rounded-full bg-white border border-stone-200 px-2 py-0.5 text-xs text-stone-500">
                    {t.ayet.toLocaleString("tr-TR")}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab tipleri ───────────────────────────────────────────────────────────────

type Tab = "temalar" | "dualar" | "namaz";

const TABS: { id: Tab; label: string; ikon: LucideIcon }[] = [
  { id: "temalar", label: "Temalar",        ikon: LayoutGrid },
  { id: "dualar",  label: "Dualar & Tesbih",ikon: HandHeart },
  { id: "namaz",   label: "Namaz",          ikon: MoonStar },
];

// ── Ana bileşen ───────────────────────────────────────────────────────────────

export function DiscoverContent({ duaBolumu, namazBolumu }: { duaBolumu?: ReactNode; namazBolumu?: ReactNode }) {
  const router = useRouter();
  const [aktifTab, setAktifTab] = useState<Tab>("temalar");
  const [counts, setCounts] = useState<ThemeCounts | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tags/counts")
      .then((res) => (res.ok ? (res.json() as Promise<{ counts?: ThemeCounts }>) : null))
      .then((data) => {
        if (!cancelled && data?.counts) setCounts(data.counts);
      })
      .catch(() => {
        // Sayılar alınamazsa kartlarda ayet sayısı gösterilmez.
      });
    return () => { cancelled = true; };
  }, []);

  const groups = useMemo<AkordeonGrup[]>(
    () =>
      getGroups().map((group) => ({
        kod: group.code,
        baslik: `${group.code} — ${group.tr}`,
        ikon: GROUP_ICONS[group.code] ?? LayoutGrid,
        temalar: getLevel1ByGroup(group.code).map((theme) => ({
          kod: theme.code,
          isim: getThemeTitle(theme.code, "tr"),
          ayet: counts?.[theme.code],
        })),
      })),
    [counts]
  );

  const handleTagClick = useCallback((tag: string) => {
    router.push(`/search?tag=${encodeURIComponent(tag)}&page=1`);
  }, [router]);

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-6">

        <header className="flex items-center gap-3">
          <Link
            href="/search"
            className="rounded-md p-1.5 text-stone-400 hover:bg-stone-200 hover:text-stone-600"
            aria-label="Geri"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Keşfet</h1>
            <p className="text-sm text-stone-500">Tema ve kavramlara göre ayet bul</p>
          </div>
        </header>

        {/* ── Tab seçici ── */}
        <div className="flex gap-1 rounded-xl bg-stone-200/80 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setAktifTab(tab.id)}
              aria-pressed={aktifTab === tab.id}
              className={`flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-semibold transition-all duration-150 ${
                aktifTab === tab.id
                  ? "bg-white shadow-sm text-stone-800"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              <tab.ikon aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
            </button>
          ))}
        </div>

        {/* ── Tab içerikleri — koşullu render, aktif olmayan unmount edilir ── */}
        {aktifTab === "temalar" && (
        <div>
          <div className="space-y-8">
            <ThemeCardGrid onTagClick={handleTagClick} counts={counts} />

            {/* Özel rehber sayfaları */}
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-600 dark:text-stone-400">
                Özel Rehberler
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  href="/manevi-siginak"
                  className="group flex items-start gap-3.5 rounded-xl border border-stone-200 bg-white px-4 py-3.5 shadow-sm transition-all hover:border-navy-200 hover:shadow-md dark:border-stone-700 dark:bg-stone-900 dark:hover:border-navy-700"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-50 dark:bg-navy-900/30">
                    <Shield aria-hidden="true" className="h-5 w-5 text-navy-700 dark:text-navy-300" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <p className="mb-0.5 text-sm font-semibold text-stone-800 group-hover:text-navy-700 dark:text-stone-100 dark:group-hover:text-navy-400">
                      Manevi Sığınak
                    </p>
                    <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                      Büyü, nazar, hased ve vesveseden korunma — Kur&apos;an rehberi
                    </p>
                  </div>
                  <svg
                    className="mt-1 h-4 w-4 shrink-0 text-stone-300 transition-colors group-hover:text-navy-400 dark:text-stone-600"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link
                  href="/manevi-siginak/ismi-azam"
                  className="group flex items-start gap-3.5 rounded-xl border border-stone-200 bg-white px-4 py-3.5 shadow-sm transition-all hover:border-gold-200 hover:shadow-md dark:border-stone-700 dark:bg-stone-900 dark:hover:border-gold-700"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-50 dark:bg-gold-900/30">
                    <Sparkles aria-hidden="true" className="h-5 w-5 text-gold-700 dark:text-gold-300" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <p className="mb-0.5 text-sm font-semibold text-stone-800 group-hover:text-gold-700 dark:text-stone-100 dark:group-hover:text-gold-400">
                      İsmi Azam ve Sekine
                    </p>
                    <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                      Sahih İsmi Azam duaları ve 19 ayetlik Sekine protokolü
                    </p>
                  </div>
                  <svg
                    className="mt-1 h-4 w-4 shrink-0 text-stone-300 transition-colors group-hover:text-gold-400 dark:text-stone-600"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link
                  href="/esma"
                  className="group flex items-start gap-3.5 rounded-xl border border-stone-200 bg-white px-4 py-3.5 shadow-sm transition-all hover:border-violet-200 hover:shadow-md dark:border-stone-700 dark:bg-stone-900 dark:hover:border-violet-700"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-900/30">
                    <Star aria-hidden="true" className="h-5 w-5 text-violet-600 dark:text-violet-300" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <p className="mb-0.5 text-sm font-semibold text-stone-800 group-hover:text-violet-700 dark:text-stone-100 dark:group-hover:text-violet-400">
                      Esmaül Hüsna
                    </p>
                    <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                      Allah&apos;ın 99 güzel ismi — anlamları ve kök analizleriyle
                    </p>
                  </div>
                  <svg
                    className="mt-1 h-4 w-4 shrink-0 text-stone-300 transition-colors group-hover:text-violet-400 dark:text-stone-600"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link
                  href="/root"
                  className="group flex items-start gap-3.5 rounded-xl border border-stone-200 bg-white px-4 py-3.5 shadow-sm transition-all hover:border-gold-200 hover:shadow-md dark:border-stone-700 dark:bg-stone-900 dark:hover:border-gold-700"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-50 dark:bg-gold-900/30">
                    <Sprout aria-hidden="true" className="h-5 w-5 text-gold-700 dark:text-gold-300" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <p className="mb-0.5 text-sm font-semibold text-stone-800 group-hover:text-gold-700 dark:text-stone-100 dark:group-hover:text-gold-400">
                      Kelime Kökleri
                    </p>
                    <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                      En sık geçen 200 Arapça kök — anlamları, sure dağılımı ve türevleri
                    </p>
                  </div>
                  <svg
                    className="mt-1 h-4 w-4 shrink-0 text-stone-300 transition-colors group-hover:text-gold-400 dark:text-stone-600"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link
                  href="/ibadet-rehberi"
                  className="group flex items-start gap-3.5 rounded-xl border border-stone-200 bg-white px-4 py-3.5 shadow-sm transition-all hover:border-navy-200 hover:shadow-md dark:border-stone-700 dark:bg-stone-900 dark:hover:border-navy-700"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-50 dark:bg-navy-900/30">
                    <BookOpen aria-hidden="true" className="h-5 w-5 text-navy-700 dark:text-navy-300" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <p className="mb-0.5 text-sm font-semibold text-stone-800 group-hover:text-navy-700 dark:text-stone-100 dark:group-hover:text-navy-400">
                      İbadet Rehberi
                    </p>
                    <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                      İslam ve İman şartları · Namaz, Oruç, Zekât, Hac, Kurban · Abdest &amp; Temizlik
                    </p>
                  </div>
                  <svg
                    className="mt-1 h-4 w-4 shrink-0 text-stone-300 transition-colors group-hover:text-navy-400 dark:text-stone-600"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-600 dark:text-stone-400">
                Tüm Temalar
              </h2>
              <div className="space-y-2">
                {groups.map((g) => (
                  <AkordeonItem key={g.kod} grup={g} onTagClick={handleTagClick} />
                ))}
              </div>
            </section>
          </div>
        </div>
        )}

        {aktifTab === "dualar" && (
          <div>{duaBolumu}</div>
        )}

        {aktifTab === "namaz" && (
          <div>{namazBolumu}</div>
        )}

      </div>
    </main>
  );
}
