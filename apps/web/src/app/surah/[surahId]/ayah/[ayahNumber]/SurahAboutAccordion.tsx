"use client";

import { useMemo, useState } from "react";

interface SurahAboutAccordionProps {
  surahId:       number;
  revelationPlace: string | null;
  revelationOrder: number | null;
}

type TafsirMode = "original" | "simplified";

export function SurahAboutAccordion({
  surahId,
  revelationPlace,
  revelationOrder,
}: SurahAboutAccordionProps) {
  const [open, setOpen]     = useState(false);
  const [tafsir, setTafsir] = useState<string | null>(null);
  const [simplifiedTafsir, setSimplifiedTafsir] = useState<string | null>(null);
  const [availableModes, setAvailableModes] = useState<TafsirMode[]>(["original"]);
  const [mode, setMode] = useState<TafsirMode>("original");
  const [loading, setLoading] = useState(false);

  async function handleOpen() {
    const next = !open;
    setOpen(next);
    // İlk açılışta lazy fetch — 1.5MB tefsir yüklenmesini açılana kadar erteler
    if (next && tafsir === null && !loading) {
      setLoading(true);
      try {
        const res  = await fetch(`/api/tafsir/${surahId}`);
        const data = await res.json() as {
          content: string | null;
          simplifiedContent: string | null;
          availableModes: TafsirMode[];
        };
        setTafsir(data.content ?? "");
        setSimplifiedTafsir(data.simplifiedContent);
        setAvailableModes(data.availableModes?.length ? data.availableModes : ["original"]);
        setMode(data.simplifiedContent ? "simplified" : "original");
      } catch {
        setTafsir("");
      } finally {
        setLoading(false);
      }
    }
  }

  const displayedText = mode === "simplified" ? simplifiedTafsir : tafsir;

  // Çift satır sonunda paragraflara böl, ayırıcı-satırları (----, ==== vb.)
  // ele — mobil tefsir ekranıyla (tafsir/[surahId].tsx) aynı mantık.
  const paragraphs = useMemo(() => {
    if (!displayedText) return [];
    return displayedText
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0 && !/^[-_=*\s]+$/.test(p));
  }, [displayedText]);

  return (
    <div className="rounded-md border border-stone-200 bg-white shadow-sm">
      <button
        aria-expanded={open}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
        onClick={handleOpen}
        type="button"
      >
        <span className="text-sm font-semibold text-stone-900">Sure Tefsiri</span>
        <svg
          className={`h-4 w-4 shrink-0 text-stone-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-stone-100 px-5 pb-5 pt-4">
          {(revelationPlace != null || revelationOrder != null) && (
            <div className="mb-4 flex flex-wrap gap-2">
              {revelationPlace != null && (
                <span className="inline-flex items-center rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-700">
                  {revelationPlace}
                </span>
              )}
              {revelationOrder != null && (
                <span className="inline-flex items-center rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-700">
                  {revelationOrder}. nüzul sırası
                </span>
              )}
            </div>
          )}

          {loading && (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-4 animate-pulse rounded bg-stone-100" />
              ))}
            </div>
          )}

          {!loading && availableModes.length > 1 && (
            <div className="mb-3 flex overflow-hidden rounded-lg border border-stone-200 text-xs">
              <button
                className={`px-3 py-1.5 font-medium transition-colors ${
                  mode === "simplified" ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-50"
                }`}
                onClick={() => setMode("simplified")}
                type="button"
              >
                Sadeleştirilmiş
              </button>
              <button
                className={`border-l border-stone-200 px-3 py-1.5 font-medium transition-colors ${
                  mode === "original" ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-50"
                }`}
                onClick={() => setMode("original")}
                type="button"
              >
                Orijinal
              </button>
            </div>
          )}

          {!loading && paragraphs.length > 0 && (
            <div className="space-y-3.5">
              {paragraphs.map((p, i) => (
                <p key={i} className="text-sm leading-7 text-stone-700">{p}</p>
              ))}
            </div>
          )}

          {!loading && displayedText !== null && paragraphs.length === 0 && (
            <p className="text-sm text-stone-400">Tefsir metni bulunamadı.</p>
          )}

          <p className="mt-4 text-xs text-stone-400">
            {mode === "simplified"
              ? "Elmalılı Hamdi Yazır tefsirinden yapay zekâ ile günümüz Türkçesine sadeleştirilmiştir."
              : "Kaynak: Elmalılı Hamdi Yazır"}
          </p>
        </div>
      )}
    </div>
  );
}
