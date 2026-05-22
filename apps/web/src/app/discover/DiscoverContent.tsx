"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

// ── Tip tanımları ─────────────────────────────────────────────────────────────

interface ThemeCard {
  kod:      string;
  baslik:   string;
  aciklama: string;
  gradient: string;
  ikon:     string;
}

interface MoodTag {
  etiket: string;
  tag:    string;   // /api/tags/filter?tag= değeri
  renk:   string;
}

interface AkordeonTema {
  kod:   string;
  isim:  string;
  ayet:  number;
}

interface AkordeonGrup {
  baslik:  string;
  ikon:    string;
  temalar: AkordeonTema[];
}

// ── Öne çıkan 6 tema kartı ────────────────────────────────────────────────────

const FEATURED_THEMES: ThemeCard[] = [
  {
    kod:      "E1_KEVNI_AYETLER",
    baslik:   "Evren ve Yaratılış",
    aciklama: "Göklerin, yerin ve tabiatın varoluşundaki ilahi deliller",
    gradient: "from-amber-400 to-orange-500",
    ikon:     "🌌",
  },
  {
    kod:      "A1_ALLAH_ULUHIYET",
    baslik:   "Allah & Uluhiyet",
    aciklama: "Allah'ın isim, sıfat ve birliği",
    gradient: "from-indigo-500 to-purple-600",
    ikon:     "✨",
  },
  {
    kod:      "A6_AHIRET_MEAD",
    baslik:   "Ahiret & Ötesi",
    aciklama: "Ölüm, kıyamet, cennet ve cehennem",
    gradient: "from-slate-500 to-blue-700",
    ikon:     "🌙",
  },
  {
    kod:      "B2_SERI_IBADETLER",
    baslik:   "İbadetler",
    aciklama: "Namaz, oruç, zekât, hac",
    gradient: "from-emerald-400 to-teal-600",
    ikon:     "🤲",
  },
  // Kural 1: E1 mükerreri → E2_INSANIN_MAHIYETI
  {
    kod:      "E2_INSANIN_MAHIYETI",
    baslik:   "İnsan ve Mahiyeti",
    aciklama: "İnsanın yaratılış aşamaları, nefis, ruh ve fıtrat analizleri",
    gradient: "from-sky-400 to-cyan-600",
    ikon:     "🧠",
  },
  {
    kod:      "D5_TOPLUMSAL_DUZEN",
    baslik:   "Toplum & Adalet",
    aciklama: "Adalet, şura, emanet, fitne",
    gradient: "from-rose-400 to-pink-600",
    ikon:     "⚖️",
  },
];

// ── Ruh hali etiketleri ───────────────────────────────────────────────────────
// Kural 2: Her mood → DB'deki gerçek tag
// Kural 4: Her duygu için ayrı pastel renk

const MOOD_TAGS: MoodTag[] = [
  {
    etiket: "😌 Huzur arıyorum",
    tag:    "zikir",          // B3_KALBI_IBADETLER → zikir & rahmet
    renk:   "bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100",
  },
  {
    etiket: "😰 Stres altındayım",
    tag:    "sabır",          // C1_BIREYSEL_ERDEMLER → sabır & tevekkül
    renk:   "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100",
  },
  {
    etiket: "🙏 Tövbe etmek",
    tag:    "tövbe",          // B3_KALBI_IBADETLER → tövbe & bağışlama
    renk:   "bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100",
  },
  {
    etiket: "💔 Geçim sıkıntısı",
    tag:    "rızık",          // D4_IKTISADI_HAYAT → rızık & infak
    renk:   "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100",
  },
  {
    etiket: "😔 Üzüntülüyüm",
    tag:    "tevekkül",       // C1_BIREYSEL_ERDEMLER → sabır & tevekkül
    renk:   "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100",
  },
  {
    etiket: "🤍 Şükretmek",
    tag:    "şükür",
    renk:   "bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100",
  },
  {
    etiket: "⚖️ Haksızlığa uğradım",
    tag:    "adalet",
    renk:   "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100",
  },
  {
    etiket: "👨‍👩‍👧 Aile meselesi",
    tag:    "D1_AILE_HUKUKU",
    renk:   "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100",
  },
  {
    etiket: "🌟 İlham almak",
    tag:    "hidayet",
    renk:   "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100",
  },
  {
    etiket: "💀 Ölümü düşünmek",
    tag:    "kıyamet",        // A6_AHIRET_MEAD → ölüm & kıyamet
    renk:   "bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200",
  },
];

// ── Akordeon — tüm temalar + ayet sayıları ────────────────────────────────────
// Kural 3: Ayet sayıları eklendi, A1 de dahil edildi

const AKORDEON_GRUPLARI: AkordeonGrup[] = [
  {
    baslik: "A — İnanç Esasları",
    ikon:   "🌟",
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
    ikon:   "🤲",
    temalar: [
      { kod: "B1_TAHARET_TEMIZLIK", isim: "Taharet & Temizlik",                       ayet: 7   },
      { kod: "B2_SERI_IBADETLER",   isim: "Şer'i İbadetler (Namaz, Oruç...)",         ayet: 123 },
      { kod: "B3_KALBI_IBADETLER",  isim: "Kalbi İbadetler (Dua, Tövbe...)",          ayet: 192 },
    ],
  },
  {
    baslik: "C — Ahlak & Değerler",
    ikon:   "💎",
    temalar: [
      { kod: "C1_BIREYSEL_ERDEMLER",   isim: "Bireysel Erdemler",                     ayet: 204 },
      { kod: "C2_BIREYSEL_REZILETLER", isim: "Bireysel Reziletler",                   ayet: 398 },
      { kod: "C3_ILETISIM_SOZ_AHLAKI", isim: "İletişim & Söz Ahlakı",                ayet: 46  },
      { kod: "C4_ILIM_AKIL_TEFEKKUR",  isim: "İlim, Akıl & Tefekkür",                ayet: 53  },
    ],
  },
  {
    baslik: "D — Hukuk & Toplum",
    ikon:   "⚖️",
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
    ikon:   "🌍",
    temalar: [
      { kod: "E1_KEVNI_AYETLER",     isim: "Evren ve Kevni Ayetler",                  ayet: 320 },
      { kod: "E2_INSANIN_MAHIYETI",  isim: "İnsanın Mahiyeti",                        ayet: 103 },
      { kod: "E3_TARIH_SUNNETULLAH", isim: "Tarih & Sünnetullah",                     ayet: 148 },
    ],
  },
  {
    baslik: "F — Kıssalar & Tarih",
    ikon:   "📖",
    temalar: [
      { kod: "F1_PEYGAMBER_KISSALARI", isim: "Peygamber Kıssaları",                   ayet: 802 },
      { kod: "F2_HELAK_KAVIMLER",      isim: "Helak Kavimler",                        ayet: 151 },
      { kod: "F3_SIYER_SAHABE",        isim: "Siyer & Sahabe",                        ayet: 29  },
    ],
  },
  {
    baslik: "G — Kur'an & Dinlerarası",
    ikon:   "📜",
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {FEATURED_THEMES.map((t) => (
          <button
            key={t.kod}
            onClick={() => onTagClick(t.kod)}
            className={`group relative overflow-hidden rounded-xl bg-gradient-to-br ${t.gradient} p-4 text-left shadow-md transition-transform hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0`}
          >
            <span className="text-2xl">{t.ikon}</span>
            <p className="mt-2 text-sm font-bold leading-tight text-white">{t.baslik}</p>
            <p className="mt-1 text-xs leading-snug text-white/75 line-clamp-2">{t.aciklama}</p>
            <span className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/10" />
          </button>
        ))}
      </div>
    </section>
  );
}

function MoodTagsRow({ onTagClick }: { onTagClick: (tag: string) => void }) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-400">
        Ruh Haline Göre
      </h2>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {MOOD_TAGS.map((m) => (
          <button
            key={m.etiket}
            onClick={() => onTagClick(m.tag)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${m.renk}`}
          >
            {m.etiket}
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
          <span className="shrink-0 text-base">{grup.ikon}</span>
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
                className="flex items-center justify-between rounded-lg border border-stone-100 bg-stone-50 px-3 py-2 text-left transition-colors hover:border-indigo-200 hover:bg-indigo-50"
              >
                <span className="text-xs font-medium text-stone-700 group-hover:text-indigo-700">
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

// ── Ana bileşen ───────────────────────────────────────────────────────────────

export function DiscoverContent() {
  const router = useRouter();

  // Bulgu 2: useCallback ile stabil referans — akordeon re-render önlenir
  const handleTagClick = useCallback((tag: string) => {
    router.push(`/search?tag=${encodeURIComponent(tag)}&page=1`);
  }, [router]);

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-8">

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

        <ThemeCardGrid onTagClick={handleTagClick} />
        <MoodTagsRow   onTagClick={handleTagClick} />

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
    </main>
  );
}
