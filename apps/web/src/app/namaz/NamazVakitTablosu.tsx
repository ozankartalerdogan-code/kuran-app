import Link from "next/link";
import { getApiDb, dbAll } from "../../lib/dbUtils";

// ── Tipler ────────────────────────────────────────────────────────────────────

interface DbRow {
  verse_key: string;
  tag:       string;
  isim:      string | null;
  aciklama:  string | null;
}

interface VerseData {
  verseKey: string;
  sureAdi:  string;
  isim:     string | null;
  aciklama: string | null;
}

// ── Statik tablolar ───────────────────────────────────────────────────────────

const SURE_ADI: Record<number, string> = {
  2: "Bakara",   4: "Nisa",    11: "Hud",      17: "İsra",
  20: "Taha",   24: "Nur",    25: "Furkan",    30: "Rum",
  39: "Zümer",  40: "Mümin",  50: "Kaf",       51: "Zariyat",
  52: "Tur",    73: "Müzzemmil", 76: "İnsan",  78: "Nebe",
};

// namaz-vakit ayetlerini 5 vakite ata (her verse_key tek vakitte)
const VAKIT_KEYS: Record<string, string[]> = {
  sabah:    ["17:78", "20:130", "52:48", "11:114"],
  ogle:     ["30:17"],
  ikindi:   ["2:238", "50:39"],
  aksam:    ["40:55", "76:25"],
  yatsi:    ["4:103", "24:58", "78:9"],
};

interface VakitMeta {
  id:   string;
  ikon: string;
  ad:   string;
  renk: { sol: string; bant: string; badge: string };
}

const VAKIT_META: VakitMeta[] = [
  {
    id: "sabah", ikon: "🌅", ad: "Sabah",
    renk: { sol: "bg-sky-50 dark:bg-sky-900/20", bant: "border-l-sky-400", badge: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300" },
  },
  {
    id: "ogle", ikon: "☀️", ad: "Öğle",
    renk: { sol: "bg-amber-50 dark:bg-amber-900/20", bant: "border-l-amber-400", badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  },
  {
    id: "ikindi", ikon: "🌤️", ad: "İkindi",
    renk: { sol: "bg-orange-50 dark:bg-orange-900/20", bant: "border-l-orange-500", badge: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300" },
  },
  {
    id: "aksam", ikon: "🌆", ad: "Akşam",
    renk: { sol: "bg-rose-50 dark:bg-rose-900/20", bant: "border-l-rose-500", badge: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300" },
  },
  {
    id: "yatsi", ikon: "🌙", ad: "Yatsı",
    renk: { sol: "bg-indigo-50 dark:bg-indigo-900/20", bant: "border-l-indigo-500", badge: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300" },
  },
  {
    id: "teheccud", ikon: "🌌", ad: "Teheccüd",
    renk: { sol: "bg-violet-50 dark:bg-violet-900/20", bant: "border-l-violet-600", badge: "bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-300" },
  },
];

// ── Yardımcı ──────────────────────────────────────────────────────────────────

function getSureAdi(verseKey: string): string {
  const n = Number(verseKey.split(":")[0]);
  return SURE_ADI[n] ?? `Sure ${n}`;
}

function verseHref(verseKey: string): string {
  const [s, a] = verseKey.split(":");
  return `/surah/${s}/ayah/${a?.split("-")[0]}`;
}

// ── Verse satırı ──────────────────────────────────────────────────────────────

function VerseEntry({ verse }: { verse: VerseData }) {
  return (
    <Link
      href={verseHref(verse.verseKey)}
      className="group flex items-start gap-2.5 rounded-lg border border-transparent px-2.5 py-2 transition-all hover:border-stone-200 hover:bg-white hover:shadow-sm dark:hover:border-stone-600 dark:hover:bg-stone-800"
    >
      <span className="mt-0.5 shrink-0 rounded-md bg-stone-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-stone-500 dark:bg-stone-700 dark:text-stone-400">
        {verse.verseKey}
      </span>
      <div className="min-w-0">
        <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
          {verse.sureAdi}
          {verse.isim ? " · " : ""}
        </span>
        {verse.isim && (
          <span className="text-[11px] font-semibold text-stone-700 dark:text-stone-200">
            {verse.isim}
          </span>
        )}
        {verse.aciklama && (
          <p className="mt-0.5 text-[11px] leading-relaxed text-stone-400 line-clamp-1 dark:text-stone-500">
            {verse.aciklama}
          </p>
        )}
      </div>
      <svg
        className="mt-1 h-3 w-3 shrink-0 text-stone-300 transition-colors group-hover:text-stone-500 dark:text-stone-600 dark:group-hover:text-stone-400"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

// ── Tablo satırı ─────────────────────────────────────────────────────────────

function VakitRow({ meta, verses }: { meta: VakitMeta; verses: VerseData[] }) {
  if (verses.length === 0) return null;

  return (
    <div className={`flex gap-0 border-b border-stone-100 last:border-0 dark:border-stone-700/50`}>
      {/* Sol — vakit adı */}
      <div
        className={`flex w-28 shrink-0 flex-col items-start justify-start gap-1 border-l-4 ${meta.renk.bant} ${meta.renk.sol} px-3 py-3`}
      >
        <span className="text-xl leading-none">{meta.ikon}</span>
        <span
          className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${meta.renk.badge}`}
        >
          {meta.ad}
        </span>
        <span className="text-[10px] text-stone-400 dark:text-stone-500">
          {verses.length} ayet
        </span>
      </div>

      {/* Sağ — ayetler */}
      <div className="flex flex-1 flex-col gap-0.5 py-2 pr-2">
        {verses.map((v) => (
          <VerseEntry key={v.verseKey} verse={v} />
        ))}
      </div>
    </div>
  );
}

// ── Server bileşeni ───────────────────────────────────────────────────────────

export async function NamazVakitTablosu() {
  const db = getApiDb();

  const rows = dbAll<DbRow>(
    db.prepare(
      "SELECT verse_key, tag, isim, aciklama FROM verse_tag_items WHERE tag IN ('namaz-vakit','namaz-teheccud') ORDER BY verse_key"
    )
  );

  // verse_key → DB verisi
  const dbMap = new Map(rows.map((r) => [r.verse_key, r]));

  function toVerseData(vk: string): VerseData {
    const row = dbMap.get(vk);
    return {
      verseKey: vk,
      sureAdi:  getSureAdi(vk),
      isim:     row?.isim     ?? null,
      aciklama: row?.aciklama ?? null,
    };
  }

  // Teheccüd: DB'den gelen namaz-teheccud ayetleri (verse_key sırasıyla)
  const teheccudVerses = rows
    .filter((r) => r.tag === "namaz-teheccud")
    .map((r) => toVerseData(r.verse_key));

  // Her vakitin ayet listesini oluştur
  const vakitVerses: Record<string, VerseData[]> = {
    sabah:    VAKIT_KEYS.sabah.map(toVerseData),
    ogle:     VAKIT_KEYS.ogle.map(toVerseData),
    ikindi:   VAKIT_KEYS.ikindi.map(toVerseData),
    aksam:    VAKIT_KEYS.aksam.map(toVerseData),
    yatsi:    VAKIT_KEYS.yatsi.map(toVerseData),
    teheccud: teheccudVerses,
  };

  return (
    <div className="mb-10 overflow-hidden rounded-2xl border border-stone-200 bg-stone-50/60 shadow-sm dark:border-stone-700/60 dark:bg-stone-900/60">
      {/* Başlık */}
      <div className="border-b border-stone-200 bg-white px-4 py-3 dark:border-stone-700/60 dark:bg-stone-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base leading-none">🕐</span>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
              Namaz Vakitleri & Teheccüd
            </h2>
          </div>
          <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">
            {rows.length} ayet
          </span>
        </div>
      </div>

      {/* Tablo gövdesi */}
      <div>
        {VAKIT_META.map((meta) => (
          <VakitRow
            key={meta.id}
            meta={meta}
            verses={vakitVerses[meta.id] ?? []}
          />
        ))}
      </div>
    </div>
  );
}
