import type { Metadata } from "next";
import Link from "next/link";
import { getApiDb, dbGet } from "../lib/dbUtils";
import { HomeNamazWidget } from "./HomeNamazWidget";
import { SearchBar } from "./components/SearchBar";
import { StreakDisplay } from "./StreakDisplay";
import { MoodTagButton } from "../components/MoodTagButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kuran Analiz — Kur'an'ı Okuyun, Anlayın, Keşfedin",
  description:
    "Günlük ayet, Türkçe meal, kelime analizi, kök açıklamaları, dua kategorileri ve namaz vakitleri.",
  openGraph: {
    title:       "Kuran Analiz",
    description: "Günlük ayet, meal, kelime analizi ve dua kategorileri.",
    url:         "/",
  },
};

interface DailyVerse {
  surah_id: number;
  ayah_number: number;
  arabic_text: string;
  primary_translation: string | null;
  surah_name: string | null;
}

interface DailyDua {
  verse_key: string;
  tag: string;
  arabic_text: string | null;
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
    });
    return fmt.format(new Date());
  } catch {
    return "";
  }
}

type DayTheme =
  | { type: "cuma"; title: string; desc: string; href: string }
  | { type: "oruc"; title: string; desc: string; href: string }
  | { type: "genel"; title: string; desc: string; href: string };

// "dua-tevekkul" → "Tevekkul" | "dua-anne-baba" → "Anne Baba"
function formatDuaTag(tag: string): string {
  return tag
    .replace(/^dua-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getDayTheme(): DayTheme {
  const day = new Date().getDay(); // 0=Pazar, 1=Pzt, ..., 5=Cuma
  if (day === 5) {
    return {
      type: "cuma",
      title: "Cuma Mübarek Olsun",
      desc: "Bugün Cuma. Kehf Suresi'ni okumak sünnet.",
      href: "/surah/18/ayah/1",
    };
  }
  if (day === 1 || day === 4) {
    return {
      type: "oruc",
      title: "Pazartesi / Perşembe Orucu",
      desc: "Bu günlerde nafile oruç tutmak sünnettendir.",
      href: "/search?q=oruç",
    };
  }
  return {
    type: "genel",
    title: "Günün Ayeti",
    desc: "Her gün bir ayet ile ruhunu dinlendir.",
    href: "/surah/1/ayah/1",
  };
}

const NAV_CARDS = [
  {
    href: "/discover",
    icon: "🔍",
    title: "Keşfet",
    desc: "Dua kategorileri, temalar ve etiketler",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    href: "/ibadet-rehberi",
    icon: "📿",
    title: "İbadet Rehberi",
    desc: "İnanç, namaz, oruç, zekât, abdest",
    gradient: "from-sky-500 to-blue-600",
  },
  {
    href: "/namaz",
    icon: "🕌",
    title: "Namaz",
    desc: "Namaz sureleri ve duaları",
    gradient: "from-indigo-500 to-violet-600",
  },
  {
    href: "/manevi-siginak",
    icon: "🤲",
    title: "Manevi Sığınak",
    desc: "Zor anlarda dua ve ayetler",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    href: "/root",
    icon: "🌿",
    title: "Kelime Kökü",
    desc: "Arapça kökleri keşfet",
    gradient: "from-amber-500 to-orange-600",
  },
];

export default async function HomePage() {
  const db = getApiDb();

  // ── Günün Ayeti ─────────────────────────────────────────────────────
  const totalRow = dbGet<{ cnt: number }>(
    db.prepare("SELECT COUNT(*) AS cnt FROM verses")
  );
  const total = totalRow?.cnt ?? 6236;
  const offset = getDailyOffset(total);

  const dailyVerse = dbGet<DailyVerse>(
    db.prepare(`
      SELECT v.surah_id, v.ayah_number, v.arabic_text, v.primary_translation,
             s.adi_turkce AS surah_name
      FROM verses v
      LEFT JOIN sureler s ON s.id = v.surah_id
      LIMIT 1 OFFSET ${offset}
    `)
  );

  // ── Günün Duası ──────────────────────────────────────────────────────
  // verse_tag_items'daki dua-* etiketli ayetlerden tarih-bazlı seed ile seç.
  // Herkes aynı gün aynı duayı görsün; çeviri olarak yazir kaynağı kullanılır.
  const duaTotalRow = dbGet<{ cnt: number }>(
    db.prepare(
      "SELECT COUNT(DISTINCT verse_key) AS cnt FROM verse_tag_items WHERE tag LIKE 'dua-%'"
    )
  );
  const duaTotal  = duaTotalRow?.cnt ?? 255;
  const duaOffset = getDailyOffset(duaTotal);

  const dailyDua = dbGet<DailyDua>(
    db.prepare(`
      SELECT
        vti.verse_key,
        MIN(vti.tag)       AS tag,
        v.arabic_text,
        t.text             AS meal,
        v.surah_id,
        v.ayah_number,
        s.adi_turkce       AS surah_name
      FROM verse_tag_items vti
      JOIN   verses       v ON v.verse_key  = vti.verse_key
      LEFT JOIN sureler   s ON s.id         = v.surah_id
      LEFT JOIN translations t
             ON t.verse_key = vti.verse_key AND t.source = 'yazir'
      WHERE vti.tag LIKE 'dua-%'
      GROUP BY vti.verse_key
      ORDER BY vti.verse_key
      LIMIT 1 OFFSET ?
    `),
    duaOffset
  );

  const hijriDate = getHijriDate();
  const dayTheme = getDayTheme();

  return (
    <main className="min-h-screen bg-stone-50 dark:bg-stone-950">
      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-700 to-stone-900 px-4 py-16 sm:py-24">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}
        />
        <div className="relative mx-auto max-w-2xl text-center">
          {hijriDate && (
            <p className="mb-3 text-sm font-medium text-emerald-200/80">{hijriDate}</p>
          )}
          <h1 className="mb-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Kuran Analiz
          </h1>
          <p className="mb-8 text-lg text-emerald-100/80">
            Kur&apos;an-ı Kerim&apos;i okuyun, anlayın, keşfedin
          </p>

          {/* Search */}
          <div className="mx-auto max-w-lg">
            <div className="flex items-center overflow-hidden rounded-xl bg-white/10 p-1 backdrop-blur-sm ring-1 ring-white/20 focus-within:ring-white/40">
              <div className="flex-1 px-2">
                <SearchBar />
              </div>
            </div>
            <p className="mt-2 text-xs text-emerald-200/60">
              Sure adı, ayet numarası veya Türkçe kelime arayın
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">

        {/* ── GÜNLÜK AYET ── */}
        {dailyVerse && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-md dark:border-amber-800/40 dark:bg-amber-950/30">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                ✨ Günün Ayeti
              </h2>
              <span className="text-xs text-amber-600/70 dark:text-amber-400/60">
                {dailyVerse.surah_name} · {dailyVerse.surah_id}:{dailyVerse.ayah_number}
              </span>
            </div>
            <p
              className="mb-3 text-right font-arabic text-2xl leading-loose text-stone-800 dark:text-stone-100"
              dir="rtl"
              lang="ar"
            >
              {dailyVerse.arabic_text}
            </p>
            {dailyVerse.primary_translation && (
              <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                {dailyVerse.primary_translation}
              </p>
            )}
            <div className="mt-3 text-right">
              <Link
                className="text-xs font-medium text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200"
                href={`/surah/${dailyVerse.surah_id}/ayah/${dailyVerse.ayah_number}`}
              >
                Ayet sayfasına git →
              </Link>
            </div>
          </section>
        )}

        {/* ── RUH HALİ ETİKETLERİ ── */}
        <div className="-mx-4 sm:mx-0">
          <div className="flex gap-2 overflow-x-auto px-4 pb-1 sm:flex-wrap sm:overflow-visible sm:px-0">
            {([
              { etiket: "😌 Huzur arıyorum",     tag: "zikir",          renk: "border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 dark:border-teal-800/50 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-900/50" },
              { etiket: "😰 Stres altındayım",   tag: "sabır",          renk: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50" },
              { etiket: "🙏 Tövbe etmek",        tag: "tövbe",          renk: "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-800/50 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-900/50" },
              { etiket: "💔 Geçim sıkıntısı",    tag: "rızık",          renk: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-800/50 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50" },
              { etiket: "😔 Üzüntülüyüm",        tag: "tevekkül",       renk: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50" },
              { etiket: "🤍 Şükretmek",          tag: "şükür",          renk: "border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-800/50 dark:bg-yellow-950/40 dark:text-yellow-300 dark:hover:bg-yellow-900/50" },
              { etiket: "⚖️ Haksızlığa uğradım", tag: "adalet",         renk: "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800/50 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50" },
              { etiket: "👨‍👩‍👧 Aile meselesi",     tag: "D1_AILE_HUKUKU", renk: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50" },
              { etiket: "🌟 İlham almak",         tag: "hidayet",        renk: "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:border-orange-800/50 dark:bg-orange-950/40 dark:text-orange-300 dark:hover:bg-orange-900/50" },
              { etiket: "💀 Ölümü düşünmek",      tag: "kıyamet",        renk: "border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-700/60" },
            ] as const).map(({ etiket, tag, renk }) => (
              <MoodTagButton key={tag} etiket={etiket} tag={tag} renk={renk} />
            ))}
          </div>
        </div>

        {/* ── STREAK ── */}
        <StreakDisplay />

        {/* ── NAVİGASYON KARTLARI ── */}
        <section>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
            {NAV_CARDS.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.gradient} p-4 text-white shadow-md transition-all duration-150 hover:scale-105 hover:shadow-lg active:scale-95`}
              >
                <div className="mb-2 text-2xl">{card.icon}</div>
                <div className="font-semibold leading-tight">{card.title}</div>
                <div className="mt-1 text-xs leading-snug text-white/75">{card.desc}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── GÜNÜN DUASI ── */}
        {dailyDua && (
          <section className="rounded-2xl border border-teal-200 bg-teal-50 p-6 shadow-md dark:border-teal-800/40 dark:bg-teal-900/20">
            {/* Başlık */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-teal-800 dark:text-teal-300">
                  🤲 Günün Duası
                </h2>
                <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-900/60 dark:text-teal-400">
                  {formatDuaTag(dailyDua.tag)}
                </span>
              </div>
              <span className="text-xs text-teal-600/70 dark:text-teal-400/60">
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

            {/* Meal */}
            {dailyDua.meal && (
              <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                {dailyDua.meal}
              </p>
            )}

            {/* Ayet linki */}
            <div className="mt-3 text-right">
              <Link
                href={`/surah/${dailyDua.surah_id}/ayah/${dailyDua.ayah_number}`}
                className="text-xs font-medium text-teal-700 hover:text-teal-900 dark:text-teal-400 dark:hover:text-teal-200"
              >
                Ayete git →
              </Link>
            </div>
          </section>
        )}

        {/* ── NAMAZ VAKİTLERİ ── */}
        <HomeNamazWidget />

        {/* ── HAFTANIN GÜNÜ KARTI ── */}
        <section
          className={`rounded-2xl border p-6 shadow-md ${
            dayTheme.type === "cuma"
              ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800/40 dark:bg-emerald-950/30"
              : dayTheme.type === "oruc"
              ? "border-sky-200 bg-sky-50 dark:border-sky-800/40 dark:bg-sky-950/30"
              : "border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900"
          }`}
        >
          <div className="flex items-start gap-4">
            <span className="text-3xl">
              {dayTheme.type === "cuma" ? "🌙" : dayTheme.type === "oruc" ? "🌿" : "📖"}
            </span>
            <div className="flex-1">
              <h2
                className={`font-semibold ${
                  dayTheme.type === "cuma"
                    ? "text-emerald-800 dark:text-emerald-300"
                    : dayTheme.type === "oruc"
                    ? "text-sky-800 dark:text-sky-300"
                    : "text-stone-800 dark:text-stone-200"
                }`}
              >
                {dayTheme.title}
              </h2>
              <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{dayTheme.desc}</p>
              <Link
                className={`mt-2 inline-block text-xs font-medium ${
                  dayTheme.type === "cuma"
                    ? "text-emerald-700 hover:text-emerald-900 dark:text-emerald-400"
                    : dayTheme.type === "oruc"
                    ? "text-sky-700 hover:text-sky-900 dark:text-sky-400"
                    : "text-stone-600 hover:text-stone-900 dark:text-stone-400"
                }`}
                href={dayTheme.href}
              >
                Keşfet →
              </Link>
            </div>
          </div>
        </section>

        {/* ── HIZLI ERİŞİM ── */}
        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-md dark:border-stone-700 dark:bg-stone-900">
          <h2 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-200">
            📚 Hızlı Erişim
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
                className="flex items-center gap-2 rounded-xl border border-stone-100 bg-stone-50 px-3 py-2 text-sm transition-all hover:border-emerald-200 hover:bg-emerald-50 active:scale-95 dark:border-stone-700 dark:bg-stone-800 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30"
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
