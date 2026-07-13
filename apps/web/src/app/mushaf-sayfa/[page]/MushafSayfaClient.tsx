"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Bookmark, BookmarkCheck, ListChecks, Palette, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RENK, parseTajweed, TAJWEED_LEGEND } from "../../../lib/tajweed";
import { SAYFA_SAYISI, arapRakam, ayetinSayfasi } from "../../../lib/mushafSayfaUtils";
import { getMushafBookmark, setMushafBookmark, parseMushafBookmark } from "../../../lib/mushafBookmark";
import { loadHatimStore, saveHatimStore, getCurrentHatim, toggleHatimJuz, newHatim, type HatimStore } from "../../../lib/hatimStore";
import { JUZ_DATA } from "../../hatim/juzData";

export interface MushafSayfaVerse { surahId: number; ayahNumber: number; arabic: string | null; tajweed: string | null }
export interface MushafSayfaSurah { id: number; name: string; arabicName: string }
export interface MushafSayfaSurahListItem { id: number; name: string; arabicName: string; verseCount: number; page: number }

interface Props {
  page: number;
  juz: number;
  startSurahId: number;
  verses: MushafSayfaVerse[];
  surahs: MushafSayfaSurah[];
  surahList: MushafSayfaSurahListItem[];
}

const BESMELE = "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ";
const FONT_SCALE_MIN = 0.85;
const FONT_SCALE_MAX = 1.6;
const FONT_SCALE_STEP = 0.15;
const TAJWEED_KEY = "mushafTajweed";
const FONT_SCALE_KEY = "mushafFontScale";
const LAST_PAGE_KEY = "mushafSayfaLastPage";

type Blok =
  | { tip: "sure"; surahId: number; arabicName: string; name: string; besmele: boolean }
  | { tip: "metin"; ayetler: MushafSayfaVerse[] };

function bloklariKur(verses: MushafSayfaVerse[], surahs: MushafSayfaSurah[]): Blok[] {
  const adMap = new Map(surahs.map((s) => [s.id, s]));
  const bloklar: Blok[] = [];
  let metin: MushafSayfaVerse[] = [];
  const metniKapat = () => {
    if (metin.length > 0) { bloklar.push({ tip: "metin", ayetler: metin }); metin = []; }
  };
  for (const v of verses) {
    if (v.ayahNumber === 1) {
      metniKapat();
      const meta = adMap.get(v.surahId);
      bloklar.push({
        tip: "sure",
        surahId: v.surahId,
        arabicName: meta?.arabicName ?? "",
        name: meta?.name ?? `Sure ${v.surahId}`,
        // Fatiha'nın 1. ayeti zaten besmele; Tevbe besmelesiz başlar.
        besmele: v.surahId !== 1 && v.surahId !== 9,
      });
    }
    metin.push(v);
  }
  metniKapat();
  return bloklar;
}

type Secili = { surahId: number; ayahNumber: number } | null;

function ayniAyet(a: Secili, s: number, n: number): boolean {
  return a !== null && a.surahId === s && a.ayahNumber === n;
}

function AyetMetni({ ayet, tajweed }: { ayet: MushafSayfaVerse; tajweed: boolean }) {
  if (tajweed && ayet.tajweed) {
    return (
      <>
        {parseTajweed(ayet.tajweed).map((s, i) =>
          s.code && RENK[s.code]
            ? <span key={i} style={{ color: RENK[s.code] }}>{s.t}</span>
            : <span key={i}>{s.t}</span>,
        )}
      </>
    );
  }
  return <>{ayet.arabic ?? ""}</>;
}

export function MushafSayfaClient({ page, juz, startSurahId, verses, surahs, surahList }: Props) {
  const router = useRouter();
  const [tajweed, setTajweed] = useState(true);
  const [fontScale, setFontScale] = useState(1);
  const [selected, setSelected] = useState<Secili>(null);
  const [jumpOpen, setJumpOpen] = useState(false);
  const [jumpVal, setJumpVal] = useState("");
  const [bookmark, setBookmark] = useState<string | null>(null);
  const [bookmarkSaved, setBookmarkSaved] = useState(false);
  const [hatimOpen, setHatimOpen] = useState(false);
  const [hatimStore, setHatimStore] = useState<HatimStore>({ hatims: [], currentId: null });

  // localStorage hidrasyonu — SSR ile ilk render'ı eşleştirmek için mount SONRASI uygulanır.
  useEffect(() => {
    try {
      const t = localStorage.getItem(TAJWEED_KEY);
      if (t !== null) setTajweed(t !== "0");
      const f = Number(localStorage.getItem(FONT_SCALE_KEY));
      if (f >= FONT_SCALE_MIN && f <= FONT_SCALE_MAX) setFontScale(f);
    } catch { /* SSR/gizli mod */ }
    setBookmark(getMushafBookmark());
    setHatimStore(loadHatimStore());
  }, []);

  // Kaldığı sayfa — /mushaf-sayfa kök rotasından devam edebilmek için.
  useEffect(() => {
    try { localStorage.setItem(LAST_PAGE_KEY, String(page)); } catch { /* yoksay */ }
    setSelected(null);
  }, [page]);

  const toggleTajweed = useCallback(() => {
    setTajweed((prev) => {
      const next = !prev;
      try { localStorage.setItem(TAJWEED_KEY, next ? "1" : "0"); } catch { /* yoksay */ }
      return next;
    });
  }, []);

  const changeFontScale = useCallback((delta: number) => {
    setFontScale((prev) => {
      const next = Math.round(Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, prev + delta)) * 100) / 100;
      try { localStorage.setItem(FONT_SCALE_KEY, String(next)); } catch { /* yoksay */ }
      return next;
    });
  }, []);

  const bloklar = useMemo(() => bloklariKur(verses, surahs), [verses, surahs]);
  const surahName = surahList.find((s) => s.id === startSurahId)?.name ?? "";

  const goToPage = useCallback((target: number) => {
    const clamped = Math.min(SAYFA_SAYISI, Math.max(1, Math.trunc(target)));
    router.push(`/mushaf-sayfa/${clamped}`);
  }, [router]);

  const handleAyetSec = useCallback((surahId: number, ayahNumber: number) => {
    setSelected((prev) =>
      prev && prev.surahId === surahId && prev.ayahNumber === ayahNumber ? null : { surahId, ayahNumber },
    );
  }, []);

  const handleJump = useCallback(() => {
    const n = Number(jumpVal);
    if (Number.isInteger(n) && n >= 1 && n <= SAYFA_SAYISI) goToPage(n);
    setJumpOpen(false);
    setJumpVal("");
  }, [jumpVal, goToPage]);

  const sureyeGit = useCallback((sId: number) => {
    const target = surahList.find((s) => s.id === sId)?.page;
    if (target) goToPage(target);
    setJumpOpen(false);
  }, [surahList, goToPage]);

  // Yer imi: seçili ayet varsa onu, yoksa sayfanın ilk ayetini işaretler —
  // /mushaf/[surahId]/[ayahNumber] (JuzTracker) ile AYNI localStorage anahtarını
  // paylaşır, iki görünüm arası "kaldığım yer" tutarlı kalır.
  const parsedBookmark = useMemo(() => parseMushafBookmark(bookmark), [bookmark]);
  const bookmarkOnThisPage = parsedBookmark
    ? verses.some((v) => v.surahId === parsedBookmark.surahId && v.ayahNumber === parsedBookmark.ayahNumber)
    : false;

  const markBookmarkHere = useCallback(() => {
    const target = selected ?? (verses[0] ? { surahId: verses[0].surahId, ayahNumber: verses[0].ayahNumber } : null);
    if (!target) return;
    setMushafBookmark(target.surahId, target.ayahNumber);
    setBookmark(`${target.surahId}:${target.ayahNumber}`);
    setBookmarkSaved(true);
    setTimeout(() => setBookmarkSaved(false), 2000);
  }, [selected, verses]);

  const goToBookmarkPage = useCallback(() => {
    if (!parsedBookmark) return;
    goToPage(ayetinSayfasi(parsedBookmark.surahId, parsedBookmark.ayahNumber));
  }, [parsedBookmark, goToPage]);

  // Hatim — /hatim ile AYNI localStorage anahtarını (hatimStore.ts) paylaşır.
  const currentHatim = getCurrentHatim(hatimStore);
  const currentJuzRead = currentHatim?.readJuz.includes(juz) ?? false;

  const startHatim = useCallback(() => {
    const h = newHatim();
    setHatimStore((prev) => {
      const next = { hatims: [h, ...prev.hatims], currentId: h.id };
      saveHatimStore(next);
      return next;
    });
  }, []);

  const toggleCurrentJuzRead = useCallback(() => {
    if (!currentHatim) return;
    setHatimStore((prev) => {
      const next = toggleHatimJuz(prev, juz);
      saveHatimStore(next);
      return next;
    });
  }, [currentHatim, juz]);

  // Klavye ile sayfa çevirme — sağ ok: sonraki (mobildeki "sağa kaydır → sonraki
  // sayfa" jestiyle aynı yön), sol ok: önceki. Bir input'a odaklanmışken devre dışı.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight") goToPage(page + 1);
      else if (e.key === "ArrowLeft") goToPage(page - 1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [page, goToPage]);

  const selectedSurahName = selected ? surahList.find((s) => s.id === selected.surahId)?.name ?? `Sure ${selected.surahId}` : "";

  const arabicStyle = { fontSize: `${1.35 * fontScale}rem`, lineHeight: 2.1 * fontScale };
  const besmeleStyle = { fontSize: `${1.15 * fontScale}rem`, lineHeight: 2 * fontScale };

  return (
    <div className="min-h-screen pb-24">
      <h1 className="sr-only">Mushaf — Sayfa {page}</h1>
      {/* Üst bar */}
      <div className="sticky top-[69px] z-20 border-b border-stone-200 bg-white/95 backdrop-blur dark:border-stone-800 dark:bg-stone-900/95">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2">
          <Link
            href="/mushaf"
            className="shrink-0 rounded-full p-2 text-navy-700 hover:bg-stone-100 dark:text-navy-400 dark:hover:bg-stone-800"
            aria-label="Tek ayet görünümüne dön"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <button
            type="button"
            onClick={() => setJumpOpen((v) => !v)}
            className="min-w-0 flex-1 text-center"
            aria-expanded={jumpOpen}
            aria-label="Sayfaya veya sureye git"
          >
            <p className="truncate text-sm font-bold text-stone-900 dark:text-stone-50">{surahName}</p>
            <span className="mt-0.5 inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[11px] text-stone-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400">
              Cüz {juz} · Sayfa {page}/{SAYFA_SAYISI} ▾
            </span>
          </button>
          {parsedBookmark && !bookmarkOnThisPage && (
            <button
              type="button"
              onClick={goToBookmarkPage}
              className="hidden shrink-0 items-center gap-1 rounded-full border border-gold-300 bg-gold-50 px-2.5 py-1 text-[11px] font-semibold text-gold-700 hover:bg-gold-100 dark:border-gold-700 dark:bg-gold-950/30 dark:text-gold-400 sm:flex"
            >
              <Bookmark aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} /> Kaldığım Yer
            </button>
          )}
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={markBookmarkHere}
              title={bookmarkSaved ? "Kaydedildi!" : "Buraya işaretle"}
              aria-label="Kaldığım yer olarak işaretle"
              className={`rounded-full border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                bookmarkSaved || bookmarkOnThisPage
                  ? "border-gold-300 bg-gold-50 text-gold-700 dark:border-gold-700 dark:bg-gold-950/30 dark:text-gold-400"
                  : "border-stone-200 text-stone-400 dark:border-stone-700 dark:text-stone-500"
              }`}
            >
              {bookmarkSaved || bookmarkOnThisPage
                ? <BookmarkCheck aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
                : <Bookmark aria-hidden="true" className="h-4 w-4" strokeWidth={2} />}
            </button>
            <button
              type="button"
              onClick={() => setHatimOpen((v) => !v)}
              aria-expanded={hatimOpen}
              aria-label="Hatim takibini aç"
              className={`rounded-full border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                hatimOpen
                  ? "border-navy-300 bg-navy-50 text-navy-700 dark:border-navy-700 dark:bg-navy-950/40 dark:text-navy-400"
                  : "border-stone-200 text-stone-400 dark:border-stone-700 dark:text-stone-500"
              }`}
            >
              <ListChecks aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={toggleTajweed}
              aria-pressed={tajweed}
              aria-label={tajweed ? "Tecvid renklerini kapat" : "Tecvid renklerini aç"}
              className={`rounded-full border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                tajweed
                  ? "border-navy-300 bg-navy-50 text-navy-700 dark:border-navy-700 dark:bg-navy-950/40 dark:text-navy-400"
                  : "border-stone-200 text-stone-400 dark:border-stone-700 dark:text-stone-500"
              }`}
            >
              <Palette aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => changeFontScale(-FONT_SCALE_STEP)}
              disabled={fontScale <= FONT_SCALE_MIN}
              className="rounded-full border border-stone-200 px-2 py-1.5 text-xs font-bold text-stone-600 disabled:opacity-30 dark:border-stone-700 dark:text-stone-300"
              aria-label="Yazıyı küçült"
            >
              A−
            </button>
            <button
              type="button"
              onClick={() => changeFontScale(FONT_SCALE_STEP)}
              disabled={fontScale >= FONT_SCALE_MAX}
              className="rounded-full border border-stone-200 px-2 py-1.5 text-xs font-bold text-stone-600 disabled:opacity-30 dark:border-stone-700 dark:text-stone-300"
              aria-label="Yazıyı büyüt"
            >
              A+
            </button>
          </div>
        </div>

        {/* Sayfaya / sureye git paneli */}
        {jumpOpen && (
          <div className="border-t border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
            <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2.5">
              <label className="text-xs font-medium text-stone-500 dark:text-stone-400" htmlFor="mushaf-jump-input">
                Sayfa (1–{SAYFA_SAYISI}):
              </label>
              <input
                id="mushaf-jump-input"
                type="number"
                min={1}
                max={SAYFA_SAYISI}
                value={jumpVal}
                onChange={(e) => setJumpVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleJump(); }}
                className="w-20 rounded-lg border border-stone-300 bg-stone-50 px-2 py-1 text-center text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
              />
              <button
                type="button"
                onClick={handleJump}
                className="rounded-lg bg-navy-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-navy-700"
              >
                Git
              </button>
            </div>
            <div className="mx-auto max-h-64 max-w-3xl overflow-y-auto border-t border-stone-100 dark:border-stone-800">
              {surahList.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => sureyeGit(s.id)}
                  className={`flex w-full items-center gap-3 border-b border-stone-100 px-4 py-2 text-left last:border-0 hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-800 ${
                    s.id === startSurahId ? "bg-navy-50 dark:bg-navy-950/20" : ""
                  }`}
                >
                  <span className="w-7 shrink-0 text-center text-[11px] font-bold text-stone-400 dark:text-stone-500">{s.id}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-stone-800 dark:text-stone-100">{s.name}</span>
                    <span className="block text-[11px] text-stone-400 dark:text-stone-500">{s.verseCount} ayet · Sayfa {s.page}</span>
                  </span>
                  <span dir="rtl" lang="ar" className="shrink-0 font-scheherazade text-base text-stone-600 dark:text-stone-300">{s.arabicName}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Hatim paneli */}
        {hatimOpen && (
          <div className="border-t border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
            {!currentHatim ? (
              <div className="mx-auto max-w-3xl px-4 py-4 text-center">
                <p className="mb-2 text-xs text-stone-500 dark:text-stone-400">Aktif hatim yok.</p>
                <button
                  type="button"
                  onClick={startHatim}
                  className="rounded-lg bg-navy-600 px-4 py-2 text-xs font-bold text-white hover:bg-navy-700"
                >
                  Yeni Hatim Başlat
                </button>
              </div>
            ) : (
              <>
                <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2.5">
                  <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">
                    Hatim İlerlemesi: {currentHatim.readJuz.length}/30
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleCurrentJuzRead}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                        currentJuzRead
                          ? "border-navy-300 bg-navy-50 text-navy-700 dark:border-navy-700 dark:bg-navy-950/30 dark:text-navy-400"
                          : "border-stone-300 text-stone-600 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-300"
                      }`}
                    >
                      {currentJuzRead ? `✓ ${juz}. Cüz Okundu` : `${juz}. Cüzü Okudum`}
                    </button>
                    <Link href="/hatim" className="text-xs font-semibold text-navy-700 hover:underline dark:text-navy-400">
                      Tümünü Gör →
                    </Link>
                  </div>
                </div>
                <div className="mx-auto grid max-h-56 max-w-3xl grid-cols-5 gap-1.5 overflow-y-auto border-t border-stone-100 px-4 py-3 dark:border-stone-800 sm:grid-cols-10">
                  {JUZ_DATA.map((j) => {
                    const done = currentHatim.readJuz.includes(j.juz);
                    return (
                      <button
                        key={j.juz}
                        type="button"
                        onClick={() => { goToPage(ayetinSayfasi(j.startSurah, j.startAyah)); setHatimOpen(false); }}
                        title={`${j.juz}. Cüz — Sayfa ${ayetinSayfasi(j.startSurah, j.startAyah)}`}
                        className={`flex h-9 items-center justify-center rounded-lg border text-xs font-bold transition-colors ${
                          done
                            ? "border-navy-300 bg-navy-50 text-navy-700 dark:border-navy-700 dark:bg-navy-950/30 dark:text-navy-400"
                            : j.juz === juz
                              ? "border-gold-300 bg-gold-50 text-gold-700 dark:border-gold-700 dark:bg-gold-950/30 dark:text-gold-400"
                              : "border-stone-200 text-stone-500 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400"
                        }`}
                      >
                        {done ? "✓" : j.juz}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Sayfa içeriği */}
      <main className="mx-auto max-w-3xl px-3 py-4">
        {/* Mushaf sayfası: parşömen zemin + klasik çift altın çerçeve */}
        <div className="rounded-2xl border border-gold-300/60 bg-[#fdfbf4] px-3 py-4 shadow-card dark:border-gold-800/40 dark:bg-stone-900 sm:px-5 sm:py-5">
          <div className="rounded-xl border border-gold-300/40 px-3 py-4 dark:border-gold-800/30 sm:px-5 sm:py-5">
          {bloklar.map((blok, i) =>
            blok.tip === "sure" ? (
              <div key={`s${blok.surahId}`} className="mb-4 rounded-lg border border-gold-300/70 bg-gradient-to-b from-gold-100/70 to-gold-50/20 py-3 text-center dark:border-gold-700/50 dark:from-gold-950/30 dark:to-transparent">
                <p dir="rtl" lang="ar" className="font-scheherazade text-2xl leading-relaxed text-navy-950 dark:text-stone-50">{blok.arabicName}</p>
                <p className="mt-0.5 text-xs font-bold tracking-wide text-gold-700 dark:text-gold-400">{blok.surahId}. {blok.name} Suresi</p>
                {blok.besmele && (
                  <p dir="rtl" lang="ar" className="font-scheherazade mt-2 text-stone-900 dark:text-stone-50" style={besmeleStyle}>
                    {BESMELE}
                  </p>
                )}
              </div>
            ) : (
              <p
                key={`m${i}`}
                dir="rtl"
                lang="ar"
                className="font-scheherazade mb-2 text-justify text-navy-950 dark:text-stone-50"
                style={arabicStyle}
              >
                {blok.ayetler.map((a) => {
                  const isSecili = ayniAyet(selected, a.surahId, a.ayahNumber);
                  return (
                    <span
                      key={`${a.surahId}:${a.ayahNumber}`}
                      onClick={() => handleAyetSec(a.surahId, a.ayahNumber)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleAyetSec(a.surahId, a.ayahNumber);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`${a.surahId}:${a.ayahNumber} ayetini seç`}
                      className={`cursor-pointer rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy-500 ${isSecili ? "bg-gold-200/70 dark:bg-gold-500/30" : ""}`}
                    >
                      <AyetMetni ayet={a} tajweed={tajweed} />
                      <span className="text-gold-600 dark:text-gold-500"> ﴿{arapRakam(a.ayahNumber)}﴾ </span>
                    </span>
                  );
                })}
              </p>
            ),
          )}

          {tajweed && (
            <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5 border-t border-stone-100 pt-3 dark:border-stone-800">
              {TAJWEED_LEGEND.map((l) => (
                <span key={l.ad} className="flex items-center gap-1.5 text-[11px] text-stone-400 dark:text-stone-500">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: l.renk }} />
                  {l.ad}
                </span>
              ))}
            </div>
          )}

          <p className="mt-4 text-center text-xs font-medium text-gold-700/80 dark:text-gold-500/70">— {arapRakam(page)} · {page} —</p>
          </div>
        </div>

        {/* Sayfa navigasyonu */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            className="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-navy-800 shadow-sm transition-colors hover:border-navy-300 hover:bg-navy-50 disabled:opacity-40 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
          >
            ← Önceki Sayfa
          </button>
          <button
            type="button"
            onClick={() => goToPage(page + 1)}
            disabled={page >= SAYFA_SAYISI}
            className="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-navy-800 shadow-sm transition-colors hover:border-navy-300 hover:bg-navy-50 disabled:opacity-40 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
          >
            Sonraki Sayfa →
          </button>
        </div>
      </main>

      {/* Seçili ayet eylem çubuğu */}
      {selected && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] dark:border-stone-700 dark:bg-stone-900">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-stone-800 dark:text-stone-100">
              {selectedSurahName} · {selected.surahId}:{selected.ayahNumber}
            </span>
            <Link
              href={`/surah/${selected.surahId}/ayah/${selected.ayahNumber}`}
              className="shrink-0 rounded-lg bg-navy-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-navy-700"
            >
              Detaya Git ›
            </Link>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="shrink-0 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              aria-label="Seçimi kaldır"
            >
              <X aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
