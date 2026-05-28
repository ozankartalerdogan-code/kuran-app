"use client";

import { useState } from "react";

export interface SurahBar {
  surahNo: number;
  surahName: string;
  count: number;
}

interface Props {
  surahBars: SurahBar[];
}

function heatStyle(count: number, max: number): React.CSSProperties {
  if (count === 0) return { backgroundColor: "#e7e5e4", color: "#a8a29e" };
  const r = count / max;
  if (r <= 0.05) return { backgroundColor: "#d1fae5", color: "#065f46" };
  if (r <= 0.15) return { backgroundColor: "#6ee7b7", color: "#064e3b" };
  if (r <= 0.35) return { backgroundColor: "#34d399", color: "#1a1a1a" };
  if (r <= 0.65) return { backgroundColor: "#10b981", color: "#fff" };
  if (r <= 0.85) return { backgroundColor: "#059669", color: "#fff" };
  return { backgroundColor: "#065f46", color: "#fff" };
}

const BAR_W = 12; // px per bar (including 1px gap)
const CHART_H = 160;
const LABEL_H = 56; // space for 45° labels below bars

export function RootDistribution({ surahBars }: Props) {
  const [view, setView] = useState<"heatmap" | "chart">("heatmap");
  const max = Math.max(...surahBars.map((b) => b.count), 1);

  return (
    <section className="rounded-md border border-stone-200 bg-white p-5 shadow-sm">
      {/* Toggle */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-stone-950">Sure Dağılımı</h2>
        <div className="flex overflow-hidden rounded-md border border-stone-200">
          {(["heatmap", "chart"] as const).map((v) => (
            <button
              key={v}
              className={`border-l border-stone-200 px-3 py-1.5 text-sm font-medium transition-colors first:border-l-0 ${
                view === v
                  ? "bg-stone-900 text-white"
                  : "bg-white text-stone-700 hover:bg-stone-50"
              }`}
              onClick={() => setView(v)}
              type="button"
            >
              {v === "heatmap" ? "Isı Haritası" : "Grafik"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Isı haritası ── */}
      {view === "heatmap" && (
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}
        >
          {surahBars.map((bar) => (
            <div
              key={bar.surahNo}
              className="flex flex-col items-center justify-center rounded px-0.5 py-1 text-center"
              style={{ ...heatStyle(bar.count, max), minHeight: 44 }}
              title={`${bar.surahNo}. ${bar.surahName}: ${bar.count} ayet`}
            >
              <span className="text-[9px] font-bold leading-none">{bar.surahNo}</span>
              <span className="mt-0.5 w-full truncate text-center leading-none" style={{ fontSize: 7 }}>
                {bar.surahName.length > 7 ? bar.surahName.slice(0, 6) + "…" : bar.surahName}
              </span>
              {bar.count > 0 && (
                <span className="mt-0.5 font-semibold leading-none opacity-80" style={{ fontSize: 7 }}>
                  {bar.count}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Bar chart ── */}
      {view === "chart" && (
        <div className="overflow-x-auto">
          {/* Tek scroll container — bars + labels aynı anda kayar */}
          <div style={{ minWidth: 114 * BAR_W, width: 114 * BAR_W }}>

            {/* Barlar */}
            <div
              className="flex items-end"
              style={{ height: CHART_H, gap: 1 }}
            >
              {surahBars.map((bar) => {
                const barH =
                  bar.count > 0
                    ? Math.max(3, (bar.count / max) * CHART_H)
                    : 0;
                return (
                  <div
                    key={bar.surahNo}
                    className="shrink-0 rounded-t"
                    style={{
                      width: BAR_W - 1,
                      height: barH,
                      backgroundColor: bar.count > 0 ? "#10b981" : "transparent",
                    }}
                    title={`${bar.surahNo}. ${bar.surahName}: ${bar.count} ayet`}
                  />
                );
              })}
            </div>

            {/* X ekseni — 45° etiketler, her 10. sure + 1. + 114. */}
            <div className="relative" style={{ height: LABEL_H }}>
              {surahBars
                .filter(
                  (b) =>
                    b.surahNo === 1 ||
                    b.surahNo % 10 === 0 ||
                    b.surahNo === 114
                )
                .map((bar) => {
                  const label = `${bar.surahNo}-${
                    bar.surahName.length > 8
                      ? bar.surahName.slice(0, 7) + "…"
                      : bar.surahName
                  }`;
                  return (
                    <span
                      key={bar.surahNo}
                      style={{
                        position: "absolute",
                        top: 6,
                        left: (bar.surahNo - 1) * BAR_W + (BAR_W - 1) / 2,
                        transformOrigin: "top left",
                        transform: "rotate(45deg)",
                        fontSize: 9,
                        color: "#78716c",
                        whiteSpace: "nowrap",
                        lineHeight: 1,
                        fontFamily: "inherit",
                      }}
                    >
                      {label}
                    </span>
                  );
                })}
            </div>
          </div>

          <p className="mt-1 text-xs text-stone-400">
            Kaydırın · Y: ayet sayısı (maks {max}) · Her 10. sure etiketli
          </p>
        </div>
      )}

      {/* Renk lejandı */}
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-stone-500">
        {[
          { bg: "#e7e5e4", label: "Geçmiyor" },
          { bg: "#6ee7b7", label: "Az" },
          { bg: "#10b981", label: "Orta" },
          { bg: "#065f46", label: "Çok" },
        ].map(({ bg, label }) => (
          <span key={label} className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: bg }} />
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}
