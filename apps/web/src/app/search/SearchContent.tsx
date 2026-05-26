"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Pagination } from "../../components/Pagination";
import { SearchBar } from "../../components/SearchBar";
import { VerseCard, type VerseCardData } from "../../components/VerseCard";
import type { TagFilterResponse, TagFilterErrorResponse } from "../api/tags/filter/route";
import type { SearchResponse } from "../api/search/search-types";

// ── Tipler ────────────────────────────────────────────────────────────────────

interface SearchVerseResult {
  verse_key: string;
  meal:      string | null;
}

type PageState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status:  "tag_results";
      tag:     string;
      tagType: "ana_tema" | "alt_tag";
      results: VerseCardData[];
      total:   number;
      page:    number;
      pages:   number;
    }
  | {
      status:         "verse_results";
      q:              string;
      results:        SearchVerseResult[];
      total:          number;
      pages:          number;
      page:           number;
      suggestedSurah: { id: number; name: string } | null;
    }
  | { status: "no_results" };

// ── Yardımcılar ───────────────────────────────────────────────────────────────

const NAMAZ_ISIMLER: Record<string, string> = {
  genel: "Genel", vakit: "Vakit", husu: "Huşu", teheccud: "Teheccüd",
  cuma: "Cuma", abdest: "Abdest", korku: "Korku Namazı", sefer: "Sefer",
};
const KORUNMA_ISIMLER: Record<string, string> = {
  genel: "Genel Korunma", sihir: "Büyü / Sihir", nazar: "Nazar",
  hased: "Hased", siginma: "Sığınma", sifa: "Şifa",
};
const ISMIAZAM_ISIMLER: Record<string, string> = {
  ayet: "İsmi Azam Ayetleri", sekine: "Sekine Duası",
};

function tagLabel(tag: string, tagType: "ana_tema" | "alt_tag"): string {
  if (tag.startsWith("namaz-")) {
    const sub = tag.slice(6);
    return `Namaz · ${NAMAZ_ISIMLER[sub] ?? sub}`;
  }
  if (tag.startsWith("korunma-")) {
    const sub = tag.slice(8);
    return `Korunma · ${KORUNMA_ISIMLER[sub] ?? sub}`;
  }
  if (tag.startsWith("ismiazam-")) {
    const sub = tag.slice(9);
    return `İsmi Azam · ${ISMIAZAM_ISIMLER[sub] ?? sub}`;
  }
  if (tagType === "alt_tag") return `"${tag}"`;
  const parts = tag.replace(/_%$/, "").split("_");
  if (parts.length >= 2) {
    const prefix = parts.slice(0, 2).join("");
    const rest   = parts.slice(2).join(" ");
    return rest ? `${prefix} · ${rest}` : prefix;
  }
  return tag;
}

// Bulgu 3: NaN-safe verse_key ayrıştırma
function parseVerseKey(verseKey: string): { surahId: number; ayahNumber: number } | null {
  const parts = verseKey.split(":");
  if (parts.length !== 2) return null;
  const surahId    = Number(parts[0]);
  const ayahNumber = Number(parts[1]);
  if (!Number.isFinite(surahId) || !Number.isFinite(ayahNumber)) return null;
  return { surahId, ayahNumber };
}

// ── Bileşen ───────────────────────────────────────────────────────────────────

export function SearchContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const tagParam  = searchParams?.get("tag")  ?? "";
  const qParam    = searchParams?.get("q")    ?? "";
  const rawPage   = parseInt(searchParams?.get("page") ?? "1", 10);
  const pageParam = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;

  const [state, setState] = useState<PageState>({ status: "idle" });

  // Bulgu 1: tip güvenli fetch + res.ok kontrolü
  const fetchTagResults = useCallback(async (tag: string, page: number) => {
    setState({ status: "loading" });
    try {
      const res = await fetch(`/api/tags/filter?tag=${encodeURIComponent(tag)}&page=${page}`);

      if (!res.ok) {
        setState({ status: "error", message: `Sunucu hatası (${res.status})` });
        return;
      }

      const data = (await res.json()) as TagFilterResponse | TagFilterErrorResponse;

      if (data.type !== "tag_results") {
        setState({ status: "no_results" });
        return;
      }

      if (data.results.length === 0) {
        setState({ status: "no_results" });
        return;
      }

      setState({
        status:  "tag_results",
        tag:     data.tag,
        tagType: data.tagType,
        results: data.results,
        total:   data.total,
        page:    data.page,
        pages:   data.pages,
      });
    } catch {
      setState({ status: "error", message: "Veriler yüklenirken hata oluştu." });
    }
  }, []);

  const fetchVerseResults = useCallback(async (q: string) => {
    setState({ status: "loading" });
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);

      if (!res.ok) {
        setState({ status: "error", message: `Sunucu hatası (${res.status})` });
        return;
      }

      // Bulgu 1: tip güvenli cast
      const data = (await res.json()) as SearchResponse;

      if (data.type === "verses") {
        setState({
          status:         "verse_results",
          q,
          results:        data.results,
          total:          data.total,
          pages:          1,
          page:           1,
          suggestedSurah: data.suggestedSurah ?? null,
        });
      } else if (data.type === "surah") {
        router.push(`/surah/${data.surahId}/ayah/1`);
      } else {
        setState({ status: "no_results" });
      }
    } catch {
      setState({ status: "error", message: "Arama sırasında hata oluştu." });
    }
  }, [router]);

  useEffect(() => {
    if (tagParam) {
      fetchTagResults(tagParam, pageParam);
    } else if (qParam) {
      fetchVerseResults(qParam);
    } else {
      setState({ status: "idle" });
    }
  }, [tagParam, qParam, pageParam, fetchTagResults, fetchVerseResults]);

  // Bulgu 2: useCallback ile stabil referans
  const handleTagClick = useCallback((tag: string) => {
    router.push(`/search?tag=${encodeURIComponent(tag)}&page=1`);
  }, [router]);

  const handleTagPageChange = useCallback((page: number) => {
    if (!tagParam) return;
    router.push(`/search?tag=${encodeURIComponent(tagParam)}&page=${page}`);
  }, [router, tagParam]);


  return (
    <main className="min-h-screen bg-stone-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">

        <header>
          <h1 className="text-2xl font-semibold text-stone-900">Ayet Ara</h1>
          <p className="mt-1 text-sm text-stone-500">
            Sure adı, tema kodu (A1, F1) veya kelime ile arama yapın.
          </p>
        </header>

        {/* Arama + Keşfet yan yana */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <SearchBar
              initialValue={qParam || tagParam}
              placeholder="Sure adı, tema kodu (F1) veya kelime ara…"
            />
          </div>
          <Link
            href="/discover"
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="3" />
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
            Keşfet
          </Link>
        </div>

        {/* Aktif tag filtresi */}
        {state.status === "tag_results" && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-stone-600">Filtre:</span>
            <span className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
              {tagLabel(state.tag, state.tagType)}
            </span>
            <span className="text-sm text-stone-500">— {state.total} ayet</span>
            <button
              onClick={() => router.push("/search")}
              className="ml-auto text-xs text-stone-400 underline hover:text-stone-600"
            >
              Filtreyi kaldır
            </button>
          </div>
        )}

        {/* Durumlar */}
        {state.status === "idle" && (
          <div className="space-y-6">
            {/* Özel koleksiyonlar */}
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-400">
                Özel Koleksiyonlar
              </h2>
              <div className="grid gap-2.5 sm:grid-cols-3">
                {[
                  { href: "/namaz",                      ikon: "🕌", baslik: "Namaz Ayetleri",        aciklama: "Vakit, huşu, teheccüd" },
                  { href: "/manevi-siginak",              ikon: "🛡️", baslik: "Manevi Sığınak",         aciklama: "Büyü, nazar, hased, şifa" },
                  { href: "/manevi-siginak/ismi-azam",    ikon: "✨", baslik: "İsmi Azam ve Sekine",   aciklama: "Sahih dualar ve protokol" },
                ].map((k) => (
                  <Link
                    key={k.href}
                    href={k.href}
                    className="group flex items-start gap-3 rounded-xl border border-stone-200 bg-white px-3.5 py-3 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-50 text-lg leading-none">
                      {k.ikon}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-stone-800 group-hover:text-indigo-700">
                        {k.baslik}
                      </p>
                      <p className="text-[11px] text-stone-400">{k.aciklama}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* Namaz tag filtreleri */}
            <section>
              <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-stone-400">
                Namaz Etiketleri
              </h2>
              <div className="flex flex-wrap gap-2">
                {[
                  { tag: "namaz-genel",    label: "Genel",          renk: "emerald" },
                  { tag: "namaz-vakit",    label: "Vakit",          renk: "teal" },
                  { tag: "namaz-husu",     label: "Huşu",           renk: "indigo" },
                  { tag: "namaz-teheccud", label: "Teheccüd",       renk: "violet" },
                  { tag: "namaz-cuma",     label: "Cuma",           renk: "amber" },
                  { tag: "namaz-abdest",   label: "Abdest",         renk: "sky" },
                  { tag: "namaz-korku",    label: "Korku Namazı",   renk: "rose" },
                  { tag: "namaz-sefer",    label: "Sefer Namazı",   renk: "orange" },
                ].map(({ tag, label }) => (
                  <button
                    key={tag}
                    onClick={() => router.push(`/search?tag=${encodeURIComponent(tag)}&page=1`)}
                    className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 transition-colors hover:bg-teal-100"
                  >
                    🕌 {label}
                  </button>
                ))}
              </div>
            </section>

            {/* Korunma tag filtreleri */}
            <section>
              <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-stone-400">
                Korunma Etiketleri
              </h2>
              <div className="flex flex-wrap gap-2">
                {[
                  { tag: "korunma-genel",   label: "Genel Korunma" },
                  { tag: "korunma-sihir",   label: "Büyü / Sihir" },
                  { tag: "korunma-nazar",   label: "Nazar" },
                  { tag: "korunma-hased",   label: "Hased" },
                  { tag: "korunma-siginma", label: "Sığınma" },
                  { tag: "korunma-sifa",    label: "Şifa" },
                ].map(({ tag, label }) => (
                  <button
                    key={tag}
                    onClick={() => router.push(`/search?tag=${encodeURIComponent(tag)}&page=1`)}
                    className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100"
                  >
                    🛡️ {label}
                  </button>
                ))}
              </div>
            </section>

            {/* İsmi Azam tag filtreleri */}
            <section>
              <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-stone-400">
                İsmi Azam Etiketleri
              </h2>
              <div className="flex flex-wrap gap-2">
                {[
                  { tag: "ismiazam-ayet",   label: "İsmi Azam Ayetleri" },
                  { tag: "ismiazam-sekine", label: "Sekine Duası" },
                ].map(({ tag, label }) => (
                  <button
                    key={tag}
                    onClick={() => router.push(`/search?tag=${encodeURIComponent(tag)}&page=1`)}
                    className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
                  >
                    ✨ {label}
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Bulgu 5: loading sırasında önceki sonuçlar hafifçe soluklaşır (flash yok) */}
        {state.status === "loading" && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-lg bg-stone-200" />
            ))}
          </div>
        )}

        {state.status === "error" && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {state.message}
          </div>
        )}

        {state.status === "no_results" && (
          <div className="rounded-lg border border-dashed border-stone-300 bg-white p-10 text-center">
            <p className="text-stone-500">Sonuç bulunamadı.</p>
          </div>
        )}

        {/* Tag sonuçları + sayfalama */}
        {state.status === "tag_results" && (
          <>
            <div className="space-y-3">
              {state.results.map((verse) => (
                <VerseCard key={verse.verse_key} verse={verse} onTagClick={handleTagClick} />
              ))}
            </div>
            <Pagination
              currentPage={state.page}
              totalPages={state.pages}
              onPageChange={handleTagPageChange}
            />
          </>
        )}

        {/* Verse sonuçları + sayfalama (Bulgu 4) */}
        {state.status === "verse_results" && (
          <>
            {state.suggestedSurah && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5">
                <span className="text-sm text-amber-700">Bunu mu demek istediniz?</span>
                <Link
                  href={`/surah/${state.suggestedSurah.id}/ayah/1`}
                  className="rounded-md border border-amber-300 bg-white px-3 py-1 text-sm font-semibold text-amber-800 hover:bg-amber-100"
                >
                  {state.suggestedSurah.name} Suresi →
                </Link>
              </div>
            )}
            <p className="text-sm text-stone-500">
              &ldquo;{state.q}&rdquo; için {state.total} sonuç
              {state.total > 30 && " — en alakalı 30 gösteriliyor"}
            </p>
            <div className="space-y-3">
              {state.results.map((r) => {
                // Bulgu 3: NaN-safe ayrıştırma
                const parsed = parseVerseKey(r.verse_key);
                if (!parsed) return null;
                return (
                  <VerseCard
                    key={r.verse_key}
                    verse={{
                      verse_key:   r.verse_key,
                      surah_id:    parsed.surahId,
                      ayah_number: parsed.ayahNumber,
                      meal:        r.meal,
                      ana_tema:    null,
                      alt_taglar:  [],
                    }}
                    onTagClick={handleTagClick}
                  />
                );
              })}
            </div>
          </>
        )}

      </div>
    </main>
  );
}
