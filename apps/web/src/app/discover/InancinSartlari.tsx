import Link from "next/link";
import { SART_GRUPLARI } from "../../data/inancin-sartlari";
import type { Sart, SartGrubu } from "../../data/inancin-sartlari";

// ── Renk haritaları ───────────────────────────────────────────────────────────

const RENK = {
  yesil: {
    header:   "border-emerald-200 bg-emerald-50 dark:border-emerald-800/40 dark:bg-emerald-950/30",
    badge:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    icon:     "bg-emerald-100 dark:bg-emerald-900/40",
    ayetLink: "text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-200",
    ayetBg:   "border-emerald-100 bg-emerald-50/60 hover:border-emerald-200 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:hover:border-emerald-700",
    divider:  "border-emerald-100 dark:border-emerald-900/40",
    title:    "text-emerald-900 dark:text-emerald-100",
  },
  mavi: {
    header:   "border-sky-200 bg-sky-50 dark:border-sky-800/40 dark:bg-sky-950/30",
    badge:    "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    icon:     "bg-sky-100 dark:bg-sky-900/40",
    ayetLink: "text-sky-700 hover:text-sky-900 dark:text-sky-400 dark:hover:text-sky-200",
    ayetBg:   "border-sky-100 bg-sky-50/60 hover:border-sky-200 dark:border-sky-900/50 dark:bg-sky-950/20 dark:hover:border-sky-700",
    divider:  "border-sky-100 dark:border-sky-900/40",
    title:    "text-sky-900 dark:text-sky-100",
  },
} as const;

// ── Tek bir şart kartı (Server Component — akordeon davranışı yok, hepsi açık) ─

function SartKarti({ sart, renk }: { sart: Sart; renk: keyof typeof RENK }) {
  const r = RENK[renk];
  return (
    <div className={`overflow-hidden rounded-xl border ${r.header}`}>
      {/* Başlık */}
      <div className="flex items-center gap-3 px-4 py-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg ${r.icon}`}>
          {sart.ikon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className={`text-sm font-bold ${r.title}`}>{sart.baslik}</h3>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${r.badge}`}>
          {sart.referansAyetler.length} ayet
        </span>
      </div>

      {/* Açıklama */}
      <div className={`border-t px-4 py-3 ${r.divider}`}>
        <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">
          {sart.aciklama}
        </p>
      </div>

      {/* Referans ayetler */}
      <div className={`border-t px-4 py-3 ${r.divider}`}>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
          İlgili Ayetler
        </p>
        <div className="flex flex-col gap-1.5">
          {sart.referansAyetler.map((a) => (
            <Link
              key={a.ayetKey}
              href={`/surah/${a.sureId}/ayah/${a.ayetNo}`}
              className={`group flex items-start gap-2.5 rounded-lg border px-3 py-2 transition-colors ${r.ayetBg}`}
            >
              <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${r.badge} border-current/20`}>
                {a.sureAdi} {a.ayetNo}
              </span>
              <span className="min-w-0 flex-1 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
                {a.kisaMetin}
              </span>
              <svg
                className={`mt-0.5 h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 ${r.ayetLink}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Grup bölümü ───────────────────────────────────────────────────────────────

function GrupBolumu({ grup }: { grup: SartGrubu }) {
  const r = RENK[grup.renk];
  return (
    <section>
      {/* Grup başlığı */}
      <div className="mb-3 flex items-center gap-2">
        <div className={`h-1 w-6 rounded-full ${grup.renk === "yesil" ? "bg-emerald-500" : "bg-sky-500"}`} />
        <div>
          <h2 className="text-sm font-bold text-stone-800 dark:text-stone-100">{grup.baslik}</h2>
          <p className="text-xs text-stone-400">{grup.altBaslik}</p>
        </div>
        <span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${r.badge}`}>
          {grup.sartlar.length} şart
        </span>
      </div>

      {/* Şart kartları */}
      <div className="space-y-3">
        {grup.sartlar.map((sart) => (
          <SartKarti key={sart.id} sart={sart} renk={grup.renk} />
        ))}
      </div>
    </section>
  );
}

// ── Ana bileşen (Server Component) ───────────────────────────────────────────

export function InancinSartlari() {
  return (
    <div className="space-y-8">
      {SART_GRUPLARI.map((grup) => (
        <GrupBolumu key={grup.id} grup={grup} />
      ))}
    </div>
  );
}
