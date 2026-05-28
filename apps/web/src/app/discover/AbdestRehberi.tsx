"use client";

import { useState } from "react";
import Link from "next/link";
import { ABDEST_BOLUMLER } from "../../data/abdest-teyemmum";
import type { AbdestBolumu, AbdestMaddesi } from "../../data/abdest-teyemmum";

// ── Renk haritası ─────────────────────────────────────────────────────────────

const RENK = {
  yesil: {
    accent:    "bg-emerald-500",
    header:    "border-emerald-200 bg-emerald-50 dark:border-emerald-800/40 dark:bg-emerald-950/30",
    headerHov: "hover:bg-emerald-100 dark:hover:bg-emerald-900/40",
    badge:     "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    icon:      "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
    farzBg:    "bg-emerald-50 dark:bg-emerald-950/20",
    farzBorder:"border-emerald-200 dark:border-emerald-800/40",
    sunBg:     "bg-white dark:bg-stone-900",
    sunBorder: "border-stone-200 dark:border-stone-700",
    ayetLink:  "border-emerald-100 bg-emerald-50/60 hover:border-emerald-200 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:hover:border-emerald-700",
    ayetText:  "text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-200",
    divider:   "border-emerald-100 dark:border-emerald-900/40",
    chevron:   "text-emerald-500",
    labelFarz: "text-emerald-700 dark:text-emerald-300",
    miktarBg:  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  mavi: {
    accent:    "bg-sky-500",
    header:    "border-sky-200 bg-sky-50 dark:border-sky-800/40 dark:bg-sky-950/30",
    headerHov: "hover:bg-sky-100 dark:hover:bg-sky-900/40",
    badge:     "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    icon:      "bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400",
    farzBg:    "bg-sky-50 dark:bg-sky-950/20",
    farzBorder:"border-sky-200 dark:border-sky-800/40",
    sunBg:     "bg-white dark:bg-stone-900",
    sunBorder: "border-stone-200 dark:border-stone-700",
    ayetLink:  "border-sky-100 bg-sky-50/60 hover:border-sky-200 dark:border-sky-900/50 dark:bg-sky-950/20 dark:hover:border-sky-700",
    ayetText:  "text-sky-700 hover:text-sky-900 dark:text-sky-400 dark:hover:text-sky-200",
    divider:   "border-sky-100 dark:border-sky-900/40",
    chevron:   "text-sky-500",
    labelFarz: "text-sky-700 dark:text-sky-300",
    miktarBg:  "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  },
  amber: {
    accent:    "bg-amber-500",
    header:    "border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/30",
    headerHov: "hover:bg-amber-100 dark:hover:bg-amber-900/40",
    badge:     "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    icon:      "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
    farzBg:    "bg-amber-50 dark:bg-amber-950/20",
    farzBorder:"border-amber-200 dark:border-amber-800/40",
    sunBg:     "bg-white dark:bg-stone-900",
    sunBorder: "border-stone-200 dark:border-stone-700",
    ayetLink:  "border-amber-100 bg-amber-50/60 hover:border-amber-200 dark:border-amber-900/50 dark:bg-amber-950/20 dark:hover:border-amber-700",
    ayetText:  "text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200",
    divider:   "border-amber-100 dark:border-amber-900/40",
    chevron:   "text-amber-500",
    labelFarz: "text-amber-700 dark:text-amber-300",
    miktarBg:  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
} as const;

// ── Tek bir bölüm (akordeon) ──────────────────────────────────────────────────

function AbdestAkordeon({ bolum }: { bolum: AbdestBolumu }) {
  const [acik, setAcik] = useState(false);
  const r = RENK[bolum.renk];

  return (
    <div className={`overflow-hidden rounded-xl border ${r.header}`}>
      {/* Başlık — tıklanabilir */}
      <button
        onClick={() => setAcik((p) => !p)}
        className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors ${r.headerHov}`}
        aria-expanded={acik}
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg ${r.icon}`}>
          {bolum.ikon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-stone-800 dark:text-stone-100">{bolum.baslik}</p>
          <p className="text-[11px] text-stone-400">{bolum.altBaslik}</p>
        </div>
        <svg
          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${r.chevron} ${acik ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {acik && (
        <div className={`border-t space-y-5 px-4 py-4 ${r.divider}`}>

          {/* Açıklama */}
          <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">
            {bolum.aciklama}
          </p>

          {/* Farzlar tablosu */}
          <div>
            <p className={`mb-2 text-[11px] font-bold uppercase tracking-wider ${r.labelFarz}`}>
              Farzlar ({bolum.farzlar.length})
            </p>
            <div className={`overflow-hidden rounded-lg border ${r.farzBorder} ${r.farzBg}`}>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-stone-200/60 dark:border-stone-700/60">
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                      Organ
                    </th>
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                      Kez
                    </th>
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                      Açıklama
                    </th>
                  </tr>
                </thead>
                <tbody className="px-3">
                  {bolum.farzlar.map((m) => (
                    <tr
                      key={m.organ}
                      className="border-b border-stone-200/40 last:border-0 dark:border-stone-700/40"
                    >
                      <td className="px-3 py-2 align-top">
                        <span className="text-xs font-semibold text-stone-700 dark:text-stone-200 whitespace-nowrap">
                          {m.organ}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top whitespace-nowrap">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${r.miktarBg}`}>
                          {m.miktar === "—" ? "—" : `${m.miktar}×`}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                          {m.aciklama}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sünnetler tablosu */}
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Sünnetler ({bolum.sunnetler.length})
            </p>
            <div className={`overflow-hidden rounded-lg border ${r.sunBorder} ${r.sunBg}`}>
              <table className="w-full">
                <tbody>
                  {bolum.sunnetler.map((m) => (
                    <tr
                      key={m.organ}
                      className="border-b border-stone-100 last:border-0 dark:border-stone-800"
                    >
                      <td className="px-3 py-2 align-top">
                        <span className="text-xs font-semibold text-stone-700 dark:text-stone-200 whitespace-nowrap">
                          {m.organ}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top whitespace-nowrap">
                        <span className="inline-block rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-bold text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                          {m.miktar === "—" ? "—" : `${m.miktar}×`}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                          {m.aciklama}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Referans ayetler */}
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Kur&apos;an Referansları
            </p>
            <div className="flex flex-col gap-2">
              {bolum.referansAyetler.map((a) => (
                <Link
                  key={`${a.sureId}:${a.ayetNo}`}
                  href={`/surah/${a.sureId}/ayah/${a.ayetNo}`}
                  className={`group flex items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors ${r.ayetLink}`}
                >
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${r.badge}`}>
                    {a.sureAdi} {a.ayetNo}
                  </span>
                  <span className="min-w-0 flex-1 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
                    {a.kisaMetin}
                  </span>
                  <svg
                    className={`mt-0.5 h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 ${r.ayetText}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

// ── Ana bileşen ───────────────────────────────────────────────────────────────

export function AbdestRehberi() {
  return (
    <div className="space-y-3">
      <div className="mb-1 flex items-center gap-2">
        <div className="h-1 w-6 rounded-full bg-cyan-500" />
        <div>
          <h2 className="text-sm font-bold text-stone-800 dark:text-stone-100">
            Abdest ve Teyemmüm Rehberi
          </h2>
          <p className="text-xs text-stone-400">Farzlar, sünnetler ve Kur&apos;an kaynakları</p>
        </div>
      </div>
      {ABDEST_BOLUMLER.map((b) => (
        <AbdestAkordeon key={b.id} bolum={b} />
      ))}
    </div>
  );
}
