export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import Link from "next/link";
import {dbGet } from "../lib/dbUtils";
import { HomeNamazWidget, type PrayerTimes } from "./HomeNamazWidget";
import { SearchBar } from "./components/SearchBar";
import { StreakDisplay } from "./StreakDisplay";
import { MoodTagButton } from "../components/MoodTagButton";
import {
  Compass, BookOpen, MoonStar, Shield, Sprout, Navigation,
  BookMarked, GraduationCap, Sparkles, HandHeart, Zap,
  type LucideIcon,
} from "lucide-react";


export const metadata: Metadata = {
  title: "Kuran Yolu — Kur'an'ı Okuyun, Anlayın, Keşfedin",
  description:
    "Günlük ayet, Türkçe meal, kelime analizi, kök açıklamaları, dua kategorileri ve namaz vakitleri.",
  alternates: { canonical: "/" },
  openGraph: {
    title:       "Kuran Yolu",
    description: "Günlük ayet, meal, kelime analizi ve dua kategorileri.",
    url:         "/",
    // Sayfa düzeyi openGraph layout'takini tamamen ezer — görseli burada da belirt
    images:      [{ url: "/og-default.png", width: 1200, height: 630 }],
  },
};

// Arama motorlarına site kimliği + site içi arama eylemi (Google sitelinks searchbox)
function WebsiteJsonLd() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://kuran-app-web-ozan-s-projects8.vercel.app";
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Kuran Yolu",
    url: base,
    inLanguage: "tr",
    description:
      "Kur'an-ı Kerim: Türkçe meal, kelime analizi, kök açıklamaları, dua kategorileri ve namaz vakitleri.",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${base}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

interface DailyVerse {
  surah_id: number;
  ayah_number: number;
  arabic_text: string;
  reading_tr: string | null;
  primary_translation: string | null;
  surah_name: string | null;
}

interface DailyDua {
  verse_key: string;
  tag: string;
  arabic_text: string | null;
  reading_tr: string | null;
  meal: string | null;
  surah_id: number;
  ayah_number: number;
  surah_name: string | null;
}

function getDailyOffset(total: number): number {
  const now = new Date();
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  return seed % total;
}

function getHijriDate(): string {
  try {
    const fmt = new Intl.DateTimeFormat("tr-TR-u-ca-islamic", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Europe/Istanbul",
    });
    return fmt.format(new Date());
  } catch {
    return "";
  }
}

function getGregorianDate(): string {
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Europe/Istanbul",
    }).format(new Date());
  } catch {
    return "";
  }
}

// İstanbul vakitleri sunucuda — ilk boyama iskeletsiz gelsin. Vakitler günde bir
// değişir; fetch 1 saat cache'lenir (force-dynamic sayfada da açık revalidate geçerli).
async function getIstanbulPrayerTimes(): Promise<PrayerTimes | null> {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Istanbul",
      day: "2-digit", month: "2-digit", year: "numeric",
    }).format(new Date()).split("/"); // GG/AA/YYYY
    const dateStr = `${parts[0]}-${parts[1]}-${parts[2]}`;
    const res = await fetch(
      `https://api.aladhan.com/v1/timings/${dateStr}?latitude=41.0082&longitude=28.9784&method=13`,
      { next: { revalidate: 3600 }, signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const t = (await res.json())?.data?.timings;
    if (!t?.Fajr) return null;
    const clean = (s: string) => String(s ?? "").slice(0, 5); // "05:32 (+03)" → "05:32"
    return {
      Fajr: clean(t.Fajr), Sunrise: clean(t.Sunrise), Dhuhr: clean(t.Dhuhr),
      Asr: clean(t.Asr), Maghrib: clean(t.Maghrib), Isha: clean(t.Isha),
    };
  } catch {
    return null; // widget istemcide kendisi çeker
  }
}

// "dua-tevekkul" → "Tevekkul" | "dua-anne-baba" → "Anne Baba"
function formatDuaTag(tag: string): string {
  return tag
    .replace(/^dua-/, "")
    .split("-")
    .map((w) => w.charAt(0).toLocaleUpperCase("tr-TR") + w.slice(1))
    .join(" ");
}


// Profesyonel kart dili: beyaz kart + renkli ikon rozeti (tint).
// Emoji yerine tutarlı çizgi ikonlar (lucide) — premium lacivert-altın kimlik.
const NAV_CARDS: {
  href: string; icon: LucideIcon; title: string; desc: string; tint: string;
}[] = [
  {
    href: "/discover",
    icon: Compass,
    title: "Keşfet",
    desc: "Dua kategorileri, temalar ve etiketler",
    tint: "bg-navy-50 dark:bg-navy-900/40",
  },
  {
    href: "/ibadet-rehberi",
    icon: BookOpen,
    title: "İbadet Rehberi",
    desc: "İnanç, namaz, oruç, zekât, abdest",
    tint: "bg-navy-50 dark:bg-navy-900/40",
  },
  {
    href: "/namaz",
    icon: MoonStar,
    title: "Namaz",
    desc: "Namaz sureleri ve duaları",
    tint: "bg-navy-50 dark:bg-navy-900/40",
  },
  {
    href: "/manevi-siginak",
    icon: Shield,
    title: "Manevi Sığınak",
    desc: "Zor anlarda dua ve ayetler",
    tint: "bg-navy-50 dark:bg-navy-900/40",
  },
  {
    href: "/root",
    icon: Sprout,
    title: "Kelime Kökü",
    desc: "Arapça kökleri keşfet",
    tint: "bg-navy-50 dark:bg-navy-900/40",
  },
  {
    href: "/kible",
    icon: Navigation,
    title: "Kıble",
    desc: "Kabe'nin yönünü bul",
    tint: "bg-navy-50 dark:bg-navy-900/40",
  },
  {
    href: "/hatim",
    icon: BookMarked,
    title: "Hatim",
    desc: "30 cüz okuma takibi",
    tint: "bg-navy-50 dark:bg-navy-900/40",
  },
  {
    href: "/ogren",
    icon: GraduationCap,
    title: "Konular",
    desc: "Elifba, dersler, Esmaül Hüsna, dualar",
    tint: "bg-navy-50 dark:bg-navy-900/40",
  },
];

export default async function HomePage() {

  // ── Günün Ayeti ─────────────────────────────────────────────────────
  // literal_ceviri alanını kullan — her satır tek ayete karşılık gelir
  // arabic_text + reading_tr + literal_ceviri hepsi aynı verses satırından → her zaman tutarlı
  const totalRow = await dbGet<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM verses
     WHERE arabic_text IS NOT NULL AND reading_tr IS NOT NULL AND literal_ceviri IS NOT NULL`
  ).catch(() => undefined);
  const total = totalRow?.cnt ?? 4000;
  const offset = getDailyOffset(total);

  const dailyVerse = await dbGet<DailyVerse>(
    `SELECT v.surah_id, v.ayah_number, v.arabic_text, v.reading_tr,
            v.literal_ceviri AS primary_translation,
            s.adi_turkce AS surah_name
     FROM verses v
     JOIN sureler s ON s.id = v.surah_id
     WHERE v.arabic_text IS NOT NULL AND v.reading_tr IS NOT NULL AND v.literal_ceviri IS NOT NULL
     LIMIT 1 OFFSET ?`,
    offset
  ).catch(() => undefined);

  // ── Günün Duası ──────────────────────────────────────────────────────
  // verse_tag_items'daki dua-* etiketli ayetlerden tarih-bazlı seed ile seç.
  // Herkes aynı gün aynı duayı görsün.
  // İçerik güvencesi: dua-tesbih/dua-zikir etiketleri zikir HAKKINDAKİ ayetleri de
  // içeriyordu (örn. 62:9 cuma emri) — bunlar dışlanır ve ayetin gerçekten bir
  // yakarış içermesi istenir (Rabbenâ / vokatif Rabbi / Allahumme / eûzü / hasbünâ).
  const DUA_VOCATIVE_COND = `(
       v.arabic_text LIKE '%رَبَّن%'    OR v.arabic_text LIKE '%رَّبَّن%'
    OR v.arabic_text LIKE '%اللَّهُمَّ%' OR v.arabic_text LIKE '%أَعُوذُ%'
    OR v.arabic_text LIKE '%رَبِّ %'    OR v.arabic_text LIKE '%رَّبِّ %'
    OR v.arabic_text LIKE '%حَسْبُنَا%'  OR v.arabic_text LIKE '%حَسْبِيَ%'
    OR v.arabic_text LIKE '%غُفْرَانَكَ%'
  )`;
  const duaTotalRow = await dbGet<{ cnt: number }>(`
      SELECT COUNT(DISTINCT vti.verse_key) AS cnt
      FROM verse_tag_items vti
      JOIN verses v ON v.verse_key = vti.verse_key
      WHERE vti.tag LIKE 'dua-%'
        AND vti.tag NOT IN ('dua-tesbih','dua-zikir')
        AND v.arabic_text IS NOT NULL
        AND v.reading_tr IS NOT NULL
        AND v.literal_ceviri IS NOT NULL
        AND ${DUA_VOCATIVE_COND}
    `);
  const duaTotal  = duaTotalRow?.cnt ?? 81;
  const duaOffset = getDailyOffset(duaTotal);

  const dailyDua = await dbGet<DailyDua>(`
      SELECT
        vti.verse_key,
        MIN(vti.tag)       AS tag,
        v.arabic_text,
        v.reading_tr,
        v.literal_ceviri   AS meal,
        v.surah_id,
        v.ayah_number,
        s.adi_turkce       AS surah_name
      FROM verse_tag_items vti
      JOIN   verses       v ON v.verse_key  = vti.verse_key
      LEFT JOIN sureler   s ON s.id         = v.surah_id
      WHERE vti.tag LIKE 'dua-%'
        AND vti.tag NOT IN ('dua-tesbih','dua-zikir')
        AND v.arabic_text IS NOT NULL
        AND v.reading_tr IS NOT NULL
        AND v.literal_ceviri IS NOT NULL
        AND ${DUA_VOCATIVE_COND}
      GROUP BY vti.verse_key
      ORDER BY vti.verse_key
      LIMIT 1 OFFSET ?
    `, duaOffset);

  const hijriDate     = getHijriDate();
  const gregorianDate = getGregorianDate();
  const istanbulTimes = await getIstanbulPrayerTimes();

  return (
    <main className="min-h-screen">
      <WebsiteJsonLd />
      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-navy-900 via-navy-950 to-navy-950 px-4 py-16 sm:py-24">
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}
        />
        {/* Altın ışıma — abartısız tek vurgu */}
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-gold-400/10 blur-3xl" />
        <div className="relative mx-auto max-w-2xl text-center">
          {hijriDate && (
            <p className="mb-4 text-sm font-medium tracking-wide text-gold-300/90">
              {gregorianDate && (
                <>
                  <span className="text-navy-200/90">{gregorianDate}</span>
                  <span aria-hidden="true" className="mx-2 text-gold-500/60">·</span>
                </>
              )}
              {hijriDate}
            </p>
          )}
          <h1
            dir="rtl"
            lang="ar"
            className="mb-4 font-arabic text-3xl font-bold leading-relaxed tracking-tight text-white sm:text-4xl"
          >
            ٱقْرَأْ بِٱسْمِ رَبِّكَ ٱلَّذِى خَلَقَ
          </h1>
          <p className="mb-1 font-display text-lg italic text-navy-100">
            “Yaratan Rabbinin adıyla oku!”
          </p>
          <p className="mb-3 text-sm text-navy-300">
            Alak suresi, 1. ayet
          </p>
          {/* İnce altın ayraç */}
          <div aria-hidden="true" className="mx-auto mb-8 flex items-center justify-center gap-2">
            <span className="h-px w-10 bg-gold-500/40" />
            <span className="h-1.5 w-1.5 rotate-45 bg-gold-400/70" />
            <span className="h-px w-10 bg-gold-500/40" />
          </div>

          {/* Search */}
          <div className="mx-auto max-w-lg">
            <div className="rounded-2xl bg-white/10 p-1.5 shadow-lg backdrop-blur-sm ring-1 ring-white/25 transition focus-within:bg-white/15 focus-within:ring-white/50">
              <SearchBar />
            </div>
            <p className="mt-2.5 text-xs text-navy-300/80">
              Sure adı, ayet numarası veya Türkçe kelime arayın
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">

        {/* ── GÜNLÜK AYET ── */}
        {dailyVerse && (
          <section className="rounded-2xl border border-gold-200 bg-gold-50 p-6 shadow-card dark:border-gold-800/40 dark:bg-gold-950/30">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gold-800 dark:text-gold-300">
                <Sparkles aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
                Günün Ayeti
              </h2>
              <span className="text-xs text-gold-600/70 dark:text-gold-400/60">
                {dailyVerse.surah_name} · {dailyVerse.surah_id}:{dailyVerse.ayah_number}
              </span>
            </div>
            <p
              className="mb-2 text-right font-arabic text-2xl leading-loose text-stone-800 dark:text-stone-100"
              dir="rtl"
              lang="ar"
            >
              {dailyVerse.arabic_text}
            </p>
            {dailyVerse.reading_tr && (
              <p className="mb-1.5 text-sm leading-relaxed text-gold-900/80 dark:text-gold-200/80">
                {dailyVerse.reading_tr}
              </p>
            )}
            {dailyVerse.primary_translation && (
              <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">
                {dailyVerse.primary_translation}
              </p>
            )}
            <div className="mt-3 text-right">
              <Link
                className="text-xs font-medium text-gold-700 hover:text-gold-900 dark:text-gold-400 dark:hover:text-gold-200"
                href={`/surah/${dailyVerse.surah_id}/ayah/${dailyVerse.ayah_number}`}
              >
                Ayet sayfasına git →
              </Link>
            </div>
          </section>
        )}

        {/* ── RUH HALİ ETİKETLERİ ── */}
        <div className="-mx-4 sm:mx-0">
          <div className="flex gap-2 overflow-x-auto px-4 pb-2 [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
            {([
              { etiket: "Huzur arıyorum",     ikon: "leaf",       tag: "rahmet",         renk: "border-navy-200 bg-navy-50 text-navy-700 hover:bg-navy-100 dark:border-navy-800/50 dark:bg-navy-950/40 dark:text-navy-300 dark:hover:bg-navy-900/50" },
              { etiket: "Stres altındayım",   ikon: "cloudrain",  tag: "sabır",          renk: "border-gold-200 bg-gold-50 text-gold-700 hover:bg-gold-100 dark:border-gold-800/50 dark:bg-gold-950/40 dark:text-gold-300 dark:hover:bg-gold-900/50" },
              { etiket: "Tövbe etmek",        ikon: "sunrise",    tag: "tövbe",          renk: "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-800/50 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-900/50" },
              { etiket: "Geçim sıkıntısı",    ikon: "wheat",      tag: "rızık",          renk: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-800/50 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50" },
              { etiket: "Üzüntülüyüm",        ikon: "heartcrack", tag: "tevekkül",       renk: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50" },
              { etiket: "Şükretmek",          ikon: "heart",      tag: "şükür",          renk: "border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-800/50 dark:bg-yellow-950/40 dark:text-yellow-300 dark:hover:bg-yellow-900/50" },
              { etiket: "Haksızlığa uğradım", ikon: "scale",      tag: "adalet",         renk: "border-navy-200 bg-navy-50 text-navy-700 hover:bg-navy-100 dark:border-navy-800/50 dark:bg-navy-950/40 dark:text-navy-300 dark:hover:bg-navy-900/50" },
              { etiket: "Aile meselesi",      ikon: "users",      tag: "D1_AILE_HUKUKU", kind: "ana", renk: "border-navy-200 bg-navy-50 text-navy-700 hover:bg-navy-100 dark:border-navy-800/50 dark:bg-navy-950/40 dark:text-navy-300 dark:hover:bg-navy-900/50" },
              { etiket: "İlham almak",        ikon: "lightbulb",  tag: "hidayet",        renk: "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:border-orange-800/50 dark:bg-orange-950/40 dark:text-orange-300 dark:hover:bg-orange-900/50" },
              { etiket: "Ölümü düşünmek",     ikon: "hourglass",  tag: "ecel",           renk: "border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-700/60" },
            ] as const).map((item) => (
              <MoodTagButton key={item.tag} {...item} />
            ))}
          </div>
        </div>

        {/* ── STREAK ── */}
        <StreakDisplay />

        {/* ── NAVİGASYON KARTLARI ── */}
        <section>
          <div className="stagger-children grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {NAV_CARDS.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-navy-300 hover:shadow-card active:translate-y-0 dark:border-stone-700 dark:bg-stone-900 dark:hover:border-navy-700"
              >
                <div
                  aria-hidden="true"
                  className={`mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl ${card.tint}`}
                >
                  <card.icon className="h-5 w-5 text-navy-700 dark:text-navy-300" strokeWidth={1.75} />
                </div>
                <div className="text-sm font-semibold leading-tight text-stone-900 group-hover:text-navy-800 dark:text-stone-100 dark:group-hover:text-navy-300 sm:text-base">
                  {card.title}
                </div>
                <div className="mt-1 text-[11px] leading-snug text-stone-500 dark:text-stone-400 sm:text-xs">
                  {card.desc}
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── GÜNÜN DUASI ── */}
        {dailyDua && (
          <section className="rounded-2xl border border-navy-200 bg-navy-50 p-6 shadow-card dark:border-navy-800/40 dark:bg-navy-900/20">
            {/* Başlık */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-navy-800 dark:text-navy-300">
                  <HandHeart aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
                  Günün Duası
                </h2>
                <span className="rounded-full bg-navy-100 px-2 py-0.5 text-xs font-medium text-navy-700 dark:bg-navy-900/60 dark:text-navy-400">
                  {formatDuaTag(dailyDua.tag)}
                </span>
              </div>
              <span className="text-xs text-navy-600/70 dark:text-navy-400/60">
                {dailyDua.surah_name ?? "—"} · {dailyDua.surah_id}:{dailyDua.ayah_number}
              </span>
            </div>

            {/* Arapça metin */}
            {dailyDua.arabic_text && (
              <p
                className="mb-3 text-right text-2xl leading-loose text-stone-800 dark:text-stone-100"
                dir="rtl"
                lang="ar"
              >
                {dailyDua.arabic_text}
              </p>
            )}

            {/* Okunuş */}
            {dailyDua.reading_tr && (
              <p className="mb-1.5 text-sm leading-relaxed text-navy-900/80 dark:text-navy-200/80">
                {dailyDua.reading_tr}
              </p>
            )}

            {/* Meal */}
            {dailyDua.meal && (
              <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">
                {dailyDua.meal}
              </p>
            )}

            {/* Ayet linki */}
            <div className="mt-3 text-right">
              <Link
                href={`/surah/${dailyDua.surah_id}/ayah/${dailyDua.ayah_number}`}
                className="text-xs font-medium text-navy-700 hover:text-navy-900 dark:text-navy-400 dark:hover:text-navy-200"
              >
                Ayete git →
              </Link>
            </div>
          </section>
        )}

        {/* ── NAMAZ VAKİTLERİ ── */}
        <HomeNamazWidget initialTimes={istanbulTimes} />


        {/* ── HIZLI ERİŞİM ── */}
        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-card dark:border-stone-700 dark:bg-stone-900">
          <h2 className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-stone-700 dark:text-stone-200">
            <Zap aria-hidden="true" className="h-4 w-4 text-gold-600 dark:text-gold-400" strokeWidth={2} />
            Hızlı Erişim
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { href: "/surah/1/ayah/1",  label: "Fatiha",   num: "1" },
              { href: "/surah/2/ayah/1",  label: "Bakara",   num: "2" },
              { href: "/surah/36/ayah/1", label: "Yasin",    num: "36" },
              { href: "/surah/67/ayah/1", label: "Mülk",     num: "67" },
              { href: "/surah/18/ayah/1", label: "Kehf",     num: "18" },
              { href: "/surah/55/ayah/1", label: "Rahman",   num: "55" },
              { href: "/surah/112/ayah/1",label: "İhlas",    num: "112" },
              { href: "/surah/114/ayah/1",label: "Nas",      num: "114" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 rounded-xl border border-stone-100 bg-stone-50 px-3 py-2 text-sm transition-all hover:border-navy-200 hover:bg-navy-50 active:scale-95 dark:border-stone-700 dark:bg-stone-800 dark:hover:border-navy-700 dark:hover:bg-navy-950/30"
              >
                <span className="text-xs font-semibold text-stone-400 dark:text-stone-500">{item.num}</span>
                <span className="font-medium text-stone-700 dark:text-stone-300">{item.label}</span>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}
