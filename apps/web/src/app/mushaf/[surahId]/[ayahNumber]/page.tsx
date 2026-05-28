import { getAyah, getSurahs } from "@quran-app/core";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AudioPlayer } from "../../../../components/AudioPlayer";
import { MushafSurahSelect } from "./MushafSurahSelect";
import type { SurahOption } from "./MushafSurahSelect";
import { JuzTracker } from "./JuzTracker";

interface PageProps {
  params: {
    surahId: string;
    ayahNumber: string;
  };
}

function parsePositiveInteger(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const surahId = parsePositiveInteger(params.surahId);
  if (!surahId) return { title: "Mushaf" };
  const surahs = await getSurahs();
  const surah = surahs.find((s) => s.id === surahId);
  return {
    title: surah ? `${surah.turkishName.text ?? "Sure"} — Mushaf` : "Mushaf",
  };
}

function NavButton({
  href,
  children,
  disabled = false,
}: {
  href: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const base =
    "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium shadow-sm transition-colors";
  if (disabled) {
    return (
      <span
        className={`${base} border-stone-200 bg-stone-100 text-stone-400 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-600`}
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className={`${base} border-stone-300 bg-white text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700`}
    >
      {children}
    </Link>
  );
}

export default async function MushafPage({ params }: PageProps) {
  const surahId = parsePositiveInteger(params.surahId);
  const ayahNumber = parsePositiveInteger(params.ayahNumber);

  if (!surahId || !ayahNumber) redirect("/mushaf/1/1");

  const [surahs, ayah] = await Promise.all([
    getSurahs(),
    getAyah(surahId, ayahNumber),
  ]);

  const currentSurah = surahs.find((s) => s.id === surahId) ?? null;

  if (!currentSurah || !currentSurah.verseCount || ayahNumber > currentSurah.verseCount) {
    redirect("/mushaf/1/1");
  }

  const verseCount = currentSurah.verseCount as number;
  const prevSurah = surahs.find((s) => s.id === surahId - 1) ?? null;
  const nextSurah = surahs.find((s) => s.id === surahId + 1) ?? null;

  // Önceki/sonraki ayet — sure sınırlarında geçiş
  const prevAyahHref =
    ayahNumber > 1
      ? `/mushaf/${surahId}/${ayahNumber - 1}`
      : prevSurah?.verseCount
        ? `/mushaf/${surahId - 1}/${prevSurah.verseCount}`
        : null;

  const nextAyahHref =
    ayahNumber < verseCount
      ? `/mushaf/${surahId}/${ayahNumber + 1}`
      : nextSurah
        ? `/mushaf/${surahId + 1}/1`
        : null;

  const surahOptions: SurahOption[] = surahs.map((s) => ({
    id: s.id,
    name: s.turkishName.text ?? null,
  }));

  return (
    <main className="flex min-h-screen flex-col items-center bg-amber-50 px-4 py-6 dark:bg-stone-900 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl">

        {/* ── Üst navigasyon ── */}
        <nav className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <NavButton href={`/mushaf/${surahId - 1}/1`} disabled={surahId <= 1}>
              ← Sure
            </NavButton>

            <MushafSurahSelect surahs={surahOptions} currentSurahId={surahId} />

            <NavButton href={`/mushaf/${surahId + 1}/1`} disabled={surahId >= 114}>
              Sure →
            </NavButton>
          </div>

          <AudioPlayer surahId={surahId} variant="detail" />
        </nav>

        {/* ── Sure başlığı ── */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-stone-800 dark:text-stone-100">
            {currentSurah.turkishName.text ?? "—"}
          </h1>
          {currentSurah.arabicName ? (
            <p
              className="mt-1 text-xl text-stone-500 dark:text-stone-400"
              dir="rtl"
              lang="ar"
            >
              {currentSurah.arabicName}
            </p>
          ) : null}
          <p className="mt-2 text-sm text-stone-400 dark:text-stone-500">
            {ayahNumber}. ayet &nbsp;/&nbsp; {verseCount} ayet
          </p>
        </div>

        {/* ── Cüz takip ── */}
        <JuzTracker surahId={surahId} ayahNumber={ayahNumber} />

        {/* ── Ayet metni kartı ── */}
        <div className="mb-8 rounded-2xl bg-white px-6 py-10 shadow-sm dark:bg-stone-800 sm:px-12 sm:py-14">
          {ayah.arabicText ? (
            <p
              className="text-center text-5xl leading-[2.2] text-stone-950 dark:text-stone-50 sm:text-6xl sm:leading-[2.3]"
              dir="rtl"
              lang="ar"
            >
              {ayah.arabicText}
            </p>
          ) : (
            <p className="text-center text-stone-400 dark:text-stone-500">
              Arapça metin bulunamadı.
            </p>
          )}

          {/* Ayet numarası rozeti */}
          <div className="mt-8 flex justify-center">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 text-sm font-medium text-stone-400 dark:border-stone-600 dark:text-stone-500">
              {ayahNumber}
            </span>
          </div>
        </div>

        {/* ── Ayet navigasyonu ── */}
        <nav
          className="flex items-center justify-between gap-3"
          aria-label="Ayet gezinme"
        >
          <NavButton href={prevAyahHref ?? ""} disabled={!prevAyahHref}>
            ← Önceki
          </NavButton>

          <span className="text-sm tabular-nums text-stone-400 dark:text-stone-500">
            {surahId}:{ayahNumber}
          </span>

          <NavButton href={nextAyahHref ?? ""} disabled={!nextAyahHref}>
            Sonraki →
          </NavButton>
        </nav>

        {/* ── Detay sayfası bağlantısı ── */}
        <div className="mt-8 text-center">
          <Link
            href={`/surah/${surahId}/ayah/${ayahNumber}`}
            className="text-sm text-stone-400 underline-offset-2 transition-colors hover:text-stone-600 hover:underline dark:text-stone-500 dark:hover:text-stone-300"
          >
            Meal ve kelime analizine git →
          </Link>
        </div>
      </div>
    </main>
  );
}
