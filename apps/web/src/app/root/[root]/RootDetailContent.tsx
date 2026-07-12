"use client";

/**
 * Kök Detayı — mobildeki app/root/[root]/index.tsx ile aynı bilgi mimarisi:
 * başlık kartı (kök + sözlük anlamı + geçiş/sure/türev rozetleri),
 * 114 sure ısı haritası, anlamlara göre gruplanmış "Kullanım Bağlamları"
 * akordiyonları ve nadir anlamlar için "Diğer anlamlar" katlaması.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import type { RootDetail } from "../../../types/rootDetail";
import {
  groupRootMeanings,
  type MeaningEntry,
  type Verse,
} from "../../../lib/rootMeaningGroups";

// Mobildekiyle aynı kısa sure etiketleri — hücrede numara yerine isim ipucu.
const SURAH_SHORT: Record<number, string> = {
  1: "Fât", 2: "Bak", 3: "Âl", 4: "Nis", 5: "Mâi", 6: "En'", 7: "A'r", 8: "Enf", 9: "Tev", 10: "Yun",
  11: "Hûd", 12: "Yus", 13: "Ra'd", 14: "İbr", 15: "Hicr", 16: "Nah", 17: "İsr", 18: "Keh", 19: "Mer", 20: "Tâh",
  21: "Enb", 22: "Hac", 23: "Mü'", 24: "Nur", 25: "Fur", 26: "Şua", 27: "Nem", 28: "Kas", 29: "Ank", 30: "Rum",
  31: "Luk", 32: "Sec", 33: "Ahz", 34: "Seb", 35: "Fâtr", 36: "Yas", 37: "Saf", 38: "Sâd", 39: "Zum", 40: "Mü'",
  41: "Fus", 42: "Şur", 43: "Zuh", 44: "Duh", 45: "Câs", 46: "Ahk", 47: "Muh", 48: "Fet", 49: "Huc", 50: "Kâf",
  51: "Zâr", 52: "Tûr", 53: "Nec", 54: "Kam", 55: "Rah", 56: "Vâk", 57: "Had", 58: "Muc", 59: "Haş", 60: "Mum",
  61: "Saf", 62: "Cum", 63: "Mun", 64: "Teğ", 65: "Tal", 66: "Tah", 67: "Mül", 68: "Kal", 69: "Hak", 70: "Mea",
  71: "Nuh", 72: "Cin", 73: "Müz", 74: "Müd", 75: "Kıy", 76: "İns", 77: "Mür", 78: "Neb", 79: "Nâz", 80: "Abs",
  81: "Tek", 82: "İnf", 83: "Mut", 84: "İnş", 85: "Bur", 86: "Târ", 87: "A'l", 88: "Gaş", 89: "Fec", 90: "Bel",
  91: "Şem", 92: "Ley", 93: "Duh", 94: "İnş", 95: "Tîn", 96: "Ala", 97: "Kad", 98: "Bey", 99: "Zel", 100: "Âdi",
  101: "Kâr", 102: "Tek", 103: "Asr", 104: "Hüm", 105: "Fil", 106: "Kur", 107: "Mâu", 108: "Kev", 109: "Kâf", 110: "Nas",
  111: "Teb", 112: "İhl", 113: "Fel", 114: "Nas",
};

const SURAHS = Array.from({ length: 114 }, (_, i) => i + 1);

// Altın tonu (gold-500 #c2933a) alfa ile ölçeklenir — yarı saydam olduğu için
// hem krem hem gece zemininde okunur, tema değişiminde yeniden hesap gerekmez.
function heatBackground(count: number, max: number): string | undefined {
  if (count === 0) return undefined;
  const ratio = Math.min(count / Math.max(max, 1), 1);
  const alpha = 0.14 + ratio * 0.66;
  return `rgba(194, 147, 58, ${alpha.toFixed(2)})`;
}

const VERSE_CHIP_LIMIT = 80;

function MeaningGroupCard({
  meaning,
  forms,
  verses,
  isOpen,
  onToggle,
  onVerseClick,
}: {
  meaning: string;
  forms: string[];
  verses: Verse[];
  isOpen: boolean;
  onToggle: (meaning: string) => void;
  onVerseClick: (verse: Verse) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800">
      <button
        onClick={() => onToggle(meaning)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        aria-expanded={isOpen}
        aria-label={`${meaning} anlam grubu — ${verses.length} ayet`}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            {meaning}
            <span className="font-normal text-gold-600 dark:text-gold-400"> — {verses.length} ayet</span>
          </p>
          <p className="mt-0.5 truncate text-xs text-stone-400 dark:text-stone-500" dir="rtl" lang="ar">
            {forms.join(" · ")}
          </p>
        </div>
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-stone-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          strokeWidth={2}
        />
      </button>

      {isOpen && (
        <div className="flex flex-wrap gap-1.5 border-t border-stone-100 px-4 py-3 dark:border-stone-700">
          {verses.slice(0, VERSE_CHIP_LIMIT).map((verse, index) => (
            <button
              key={index}
              onClick={() => onVerseClick(verse)}
              className="rounded-lg border border-navy-200 bg-navy-50 px-2.5 py-1 text-xs font-semibold text-navy-700 transition-colors hover:border-navy-400 hover:bg-navy-100 dark:border-navy-700 dark:bg-navy-900/40 dark:text-navy-300 dark:hover:border-navy-500"
              aria-label={`${verse.surahId}. sure ${verse.ayahNumber}. ayete git`}
            >
              {verse.surahId}:{verse.ayahNumber}
            </button>
          ))}
          {verses.length > VERSE_CHIP_LIMIT && (
            <span className="self-center px-1 text-xs italic text-stone-400 dark:text-stone-500">
              +{verses.length - VERSE_CHIP_LIMIT} ayet daha
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface Props {
  root: string;
  data: RootDetail | null;
  error: string | null;
}

export default function RootDetailContent({ root: _root, data, error }: Props) {
  const router = useRouter();
  const [openMeaning, setOpenMeaning] = useState<string | null>(null);
  const [othersOpen, setOthersOpen] = useState(false);

  // Gruplama + baskın/nadir ayrımı saf modülde (rootMeaningGroups.ts) — mobil ile ortak mantık.
  const groups = useMemo(
    () => groupRootMeanings(data?.derivedWords),
    [data?.derivedWords],
  );

  if (error || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-stone-600 dark:text-stone-400">
            {error ?? "Veri bulunamadı."}
          </p>
          <button
            onClick={() => router.back()}
            className="mt-4 rounded-lg bg-navy-600 px-4 py-2 text-sm text-white hover:bg-navy-700"
          >
            Geri Dön
          </button>
        </div>
      </main>
    );
  }

  const maxCount = Math.max(...Object.values(data.distribution), 1);
  const totalOccurrences = Object.values(data.distribution).reduce((sum, count) => sum + count, 0);
  const surahCount = Object.values(data.distribution).filter((count) => count > 0).length;
  const uniqueForms = new Set(data.derivedWords.map((item) => item.word)).size;

  // Başlık daima kökün sözlük anlamı (liste kartıyla aynı kaynak). Boşsa,
  // kelime düzeyi anlamına DÜŞMÜYORUZ — aksi halde başlık listeyle çelişir.
  const displayMeaning = data.meaningTr;

  const handleToggle = (meaning: string) =>
    setOpenMeaning((previous) => (previous === meaning ? null : meaning));

  const handleVerseClick = (verse: Verse) =>
    router.push(`/surah/${verse.surahId}/ayah/${verse.ayahNumber}`);

  const renderGroup = ([meaning, group]: MeaningEntry) => (
    <MeaningGroupCard
      key={meaning}
      meaning={meaning}
      forms={group.forms}
      verses={group.verses}
      isOpen={openMeaning === meaning}
      onToggle={handleToggle}
      onVerseClick={handleVerseClick}
    />
  );

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-2xl">
        {/* ── Başlık kartı ── */}
        <div className="mb-4 rounded-xl border border-stone-200 bg-white px-4 py-6 text-center shadow-sm dark:border-stone-700 dark:bg-stone-800">
          <p className="text-4xl font-bold text-stone-900 dark:text-stone-100" dir="rtl" lang="ar">
            {data.root}
          </p>
          {displayMeaning ? (
            <>
              <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                Kök anlamı
              </p>
              <p className="mt-0.5 text-base text-stone-700 dark:text-stone-300">
                {displayMeaning}
              </p>
            </>
          ) : null}
          <div className="mt-4 flex justify-center gap-3">
            {([[totalOccurrences, "geçiş"], [surahCount, "sure"], [uniqueForms, "türev"]] as const).map(([num, label]) => (
              <div
                key={label}
                className="min-w-[72px] rounded-lg border border-gold-200 bg-gold-50 px-4 py-2 dark:border-gold-700/60 dark:bg-gold-900/25"
              >
                <p className="text-lg font-bold text-gold-800 dark:text-gold-300">
                  {num.toLocaleString("tr-TR")}
                </p>
                <p className="text-[10px] text-gold-600 dark:text-gold-400">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Isı haritası ── */}
        <section className="mb-6 rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-800">
          <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">Sure Dağılımı</h2>
          <p className="mb-3 text-xs text-stone-400 dark:text-stone-500">
            Renkli hücreye tıkla → sureye git
          </p>
          <div className="grid grid-cols-8 gap-0.5 sm:grid-cols-12">
            {SURAHS.map((surahId) => {
              const count = data.distribution[surahId] ?? 0;
              const label = SURAH_SHORT[surahId] ?? String(surahId);
              const title = `${surahId}. sure — ${count} geçiş`;
              const cellClass =
                "flex aspect-square items-center justify-center rounded text-[9px] font-medium sm:text-[10px]";

              return count > 0 ? (
                <Link
                  key={surahId}
                  href={`/surah/${surahId}`}
                  title={title}
                  aria-label={title}
                  className={`${cellClass} text-stone-800 transition-shadow hover:ring-2 hover:ring-gold-400 dark:text-stone-100`}
                  style={{ backgroundColor: heatBackground(count, maxCount) }}
                >
                  {label}
                </Link>
              ) : (
                <div
                  key={surahId}
                  title={title}
                  className={`${cellClass} bg-stone-100 text-stone-400 dark:bg-stone-700/60 dark:text-stone-500`}
                >
                  {label}
                </div>
              );
            })}
          </div>
          {/* Lejant */}
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-stone-500 dark:text-stone-400">
            <span className="inline-block h-3 w-3 rounded-sm bg-stone-100 dark:bg-stone-700/60" /> 0
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: heatBackground(1, maxCount) }} /> Düşük
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: heatBackground(maxCount, maxCount) }} /> Yüksek ({maxCount})
          </div>
        </section>

        {/* ── Kullanım bağlamları — anlamlara göre gruplanmış ── */}
        {groups.primary.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-400 dark:text-stone-500">
            Henüz türev kelime bulunamadı.
          </p>
        ) : (
          <section>
            <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              Kullanım Bağlamları ({groups.primary.length})
            </h2>
            <p className="mb-3 mt-0.5 text-xs leading-relaxed text-stone-400 dark:text-stone-500">
              Bu kökten türeyen kelimelerin ayet içindeki anlamları — kökün genel anlamından farklılaşabilir.
            </p>
            <div className="flex flex-col gap-2">
              {groups.primary.map(renderGroup)}
            </div>

            {groups.others.length > 0 && (
              <div className="mt-4 border-t border-stone-200 pt-1 dark:border-stone-700">
                <button
                  onClick={() => setOthersOpen((o) => !o)}
                  className="flex w-full items-center justify-center gap-1.5 py-2.5 text-xs font-semibold tracking-wide text-stone-400 transition-colors hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
                  aria-expanded={othersOpen}
                  aria-label={`Diğer anlamlar, ${groups.others.length} anlam`}
                >
                  Diğer anlamlar ({groups.others.length})
                  <ChevronDown
                    aria-hidden="true"
                    className={`h-3.5 w-3.5 transition-transform ${othersOpen ? "rotate-180" : ""}`}
                    strokeWidth={2}
                  />
                </button>
                {othersOpen && (
                  <div className="flex flex-col gap-2">
                    {groups.others.map(renderGroup)}
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
