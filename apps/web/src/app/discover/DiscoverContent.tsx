"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import {
  Sparkles, Orbit, Moon, HandHeart, Brain, Scale,
  Star, Gem, Globe, BookOpen, Scroll, Shield, MoonStar, LayoutGrid,
  type LucideIcon,
} from "lucide-react";

// ── Tip tanımları ─────────────────────────────────────────────────────────────

interface ThemeCard {
  kod:      string;
  baslik:   string;
  aciklama: string;
  gradient: string;
  ikon:     LucideIcon;
  ayet:     number;
}

interface AkordeonTema {
  kod:   string;
  isim:  string;
  ayet:  number;
}

interface AkordeonGrup {
  baslik:  string;
  ikon:    LucideIcon;
  temalar: AkordeonTema[];
}

// ── Öne çıkan 6 tema kartı ────────────────────────────────────────────────────

// Marka kimliği: gökkuşağı gradyanlar yerine lacivert-altın ailesi (premium dil)
const FEATURED_THEMES: ThemeCard[] = [
  {
    kod:      "A1_ALLAH_ULUHIYET",
    baslik:   "Allah & Uluhiyet",
    aciklama: "Allah'ın isim, sıfat ve birliği",
    gradient: "from-navy-950 to-navy-700",
    ikon:     Sparkles,
    ayet:     619,
  },
  {
    kod:      "E1_KEVNI_AYETLER",
    baslik:   "Evren ve Yaratılış",
    aciklama: "Göklerin, yerin ve tabiatın varoluşundaki ilahi deliller",
    gradient: "from-navy-800 to-navy-500",
    ikon:     Orbit,
    ayet:     320,
  },
  {
    kod:      "A6_AHIRET_MEAD",
    baslik:   "Ahiret & Ötesi",
    aciklama: "Ölüm, kıyamet, cennet ve cehennem",
    gradient: "from-navy-900 to-navy-600",
    ikon:     Moon,
    ayet:     1393,
  },
  {
    kod:      "B2_SERI_IBADETLER",
    baslik:   "İbadetler",
    aciklama: "Namaz, oruç, zekât, hac",
    gradient: "from-gold-800 to-gold-600",
    ikon:     HandHeart,
    ayet:     123,
  },
  // Kural 1: E1 mükerreri → E2_INSANIN_MAHIYETI
  {
    kod:      "E2_INSANIN_MAHIYETI",
    baslik:   "İnsan ve Mahiyeti",
    aciklama: "İnsanın yaratılış aşamaları, nefis, ruh ve fıtrat analizleri",
    gradient: "from-navy-700 to-navy-400",
    ikon:     Brain,
    ayet:     103,
  },
  {
    kod:      "D5_TOPLUMSAL_DUZEN",
    baslik:   "Toplum & Adalet",
    aciklama: "Adalet, şura, emanet, fitne",
    gradient: "from-gold-950 to-gold-700",
    ikon:     Scale,
    ayet:     182,
  },
];

// ── Akordeon — tüm temalar + ayet sayıları ────────────────────────────────────
// Kural 3: Ayet sayıları eklendi, A1 de dahil edildi

const AKORDEON_GRUPLARI: AkordeonGrup[] = [
  {
    baslik: "A — İnanç Esasları",
    ikon:   Star,
    temalar: [
      { kod: "A1_ALLAH_ULUHIYET",        isim: "Allah & Uluhiyet",                    ayet: 619  },
      { kod: "A2_VAHIY_KITAPLAR",        isim: "Vahiy & Kitaplar",                    ayet: 332  },
      { kod: "A3_NUBUVVET_PEYGAMBERLIK", isim: "Peygamberlik",                        ayet: 286  },
      { kod: "A4_MELEKLER_GAYB_ALEMI",   isim: "Melekler & Gayb",                     ayet: 163  },
      { kod: "A5_KADER_ILAHI_TAKDIR",    isim: "Kader ve İrade",                      ayet: 137  },
      { kod: "A6_AHIRET_MEAD",           isim: "Ahiret Hayatı",                       ayet: 1393 },
    ],
  },
  {
    baslik: "B — İbadet",
    ikon:   HandHeart,
    temalar: [
      { kod: "B1_TAHARET_TEMIZLIK", isim: "Taharet & Temizlik",                       ayet: 7   },
      { kod: "B2_SERI_IBADETLER",   isim: "Şer'i İbadetler (Namaz, Oruç...)",         ayet: 123 },
      { kod: "B3_KALBI_IBADETLER",  isim: "Kalbi İbadetler (Dua, Tövbe...)",          ayet: 192 },
    ],
  },
  {
    baslik: "C — Ahlak & Değerler",
    ikon:   Gem,
    temalar: [
      { kod: "C1_BIREYSEL_ERDEMLER",   isim: "Bireysel Erdemler",                     ayet: 204 },
      { kod: "C2_BIREYSEL_REZILETLER", isim: "Bireysel Reziletler",                   ayet: 398 },
      { kod: "C3_ILETISIM_SOZ_AHLAKI", isim: "İletişim & Söz Ahlakı",                ayet: 46  },
      { kod: "C4_ILIM_AKIL_TEFEKKUR",  isim: "İlim, Akıl & Tefekkür",                ayet: 53  },
    ],
  },
  {
    baslik: "D — Hukuk & Toplum",
    ikon:   Scale,
    temalar: [
      { kod: "D1_AILE_HUKUKU",       isim: "Aile Hukuku",                             ayet: 98  },
      { kod: "D2_CINSEL_AHLAK",      isim: "Cinsel Ahlak",                            ayet: 29  },
      { kod: "D3_CEZA_HUKUKU_HUDUD", isim: "Ceza Hukuku & Hudud",                    ayet: 37  },
      { kod: "D4_IKTISADI_HAYAT",    isim: "İktisadi Hayat",                          ayet: 116 },
      { kod: "D5_TOPLUMSAL_DUZEN",   isim: "Toplumsal Düzen",                         ayet: 182 },
      { kod: "D6_HELAL_HARAM",       isim: "Helal & Haramlar",                        ayet: 46  },
    ],
  },
  {
    baslik: "E — Kâinat & İnsan",
    ikon:   Globe,
    temalar: [
      { kod: "E1_KEVNI_AYETLER",     isim: "Evren ve Kevni Ayetler",                  ayet: 320 },
      { kod: "E2_INSANIN_MAHIYETI",  isim: "İnsanın Mahiyeti",                        ayet: 103 },
      { kod: "E3_TARIH_SUNNETULLAH", isim: "Tarih & Sünnetullah",                     ayet: 148 },
    ],
  },
  {
    baslik: "F — Kıssalar & Tarih",
    ikon:   BookOpen,
    temalar: [
      { kod: "F1_PEYGAMBER_KISSALARI", isim: "Peygamber Kıssaları",                   ayet: 802 },
      { kod: "F2_HELAK_KAVIMLER",      isim: "Helak Kavimler",                        ayet: 151 },
      { kod: "F3_SIYER_SAHABE",        isim: "Siyer & Sahabe",                        ayet: 29  },
    ],
  },
  {
    baslik: "G — Kur'an & Dinlerarası",
    ikon:   Scroll,
    temalar: [
      { kod: "G1_KURAN_HAKKINDA",     isim: "Kur'an Hakkında",                        ayet: 39  },
      { kod: "G2_DINLER_MENSUPLARI",  isim: "Dinlerin Mensupları",                    ayet: 140 },
      { kod: "G3_MESELLER_TEMSILLER", isim: "Meseller & Temsiller",                   ayet: 43  },
    ],
  },
];

// ── Alt bileşenler ────────────────────────────────────────────────────────────

function ThemeCardGrid({ onTagClick }: { onTagClick: (tag: string) => void }) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-400">
        Öne Çıkan Temalar
      </h2>
      <div className="stagger-children grid grid-cols-2 gap-3 sm:grid-cols-3">
        {FEATURED_THEMES.map((t) => (
          <button
            key={t.kod}
            onClick={() => onTagClick(t.kod)}
            className={`group relative overflow-hidden rounded-xl bg-gradient-to-br ${t.gradient} p-4 text-left shadow-md ring-1 ring-white/10 transition-transform hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0`}
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20">
              <t.ikon aria-hidden="true" className="h-5 w-5 text-gold-200" strokeWidth={1.75} />
            </span>
            <p className="mt-2 text-sm font-bold leading-tight text-white">{t.baslik}</p>
            <p className="mt-1 text-xs leading-snug text-white/75 line-clamp-2">{t.aciklama}</p>
            <span className="mt-2.5 inline-block rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-gold-200">
              {t.ayet.toLocaleString("tr-TR")} ayet
            </span>
            <span className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/10" />
          </button>
        ))}
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
  const toplamAyet = grup.temalar.reduce((s, t) => s + t.ayet, 0);

  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
      <button
        onClick={() => setAcik((p) => !p)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <grup.ikon aria-hidden="true" className="h-4 w-4 shrink-0 text-navy-600" strokeWidth={1.75} />
          <span className="text-sm font-semibold text-stone-800 truncate">{grup.baslik}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
            {toplamAyet.toLocaleString("tr-TR")} ayet
          </span>
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
                <span className="shrink-0 rounded-full bg-white border border-stone-200 px-2 py-0.5 text-xs text-stone-500">
                  {t.ayet.toLocaleString("tr-TR")}
                </span>
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
            <ThemeCardGrid onTagClick={handleTagClick} />

            {/* Özel rehber sayfaları */}
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-400">
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
                    <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
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
                    <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
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
                    <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
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
                    <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
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
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-400">
                Tüm Temalar
              </h2>
              <div className="space-y-2">
                {AKORDEON_GRUPLARI.map((g) => (
                  <AkordeonItem key={g.baslik} grup={g} onTagClick={handleTagClick} />
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
