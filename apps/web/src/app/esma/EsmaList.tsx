"use client";

import { useMemo, useState } from "react";
import { ESMA_UL_HUSNA } from "../../data/esmaul-husna";

// Türkçe duyarsız arama normalizasyonu (büyük/küçük + kesme/tire yok say)
function norm(s: string): string {
  return s.toLocaleLowerCase("tr-TR").replace(/['ʼʹ’`´-]/g, "");
}

export function EsmaList() {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const nq = norm(q.trim());
    if (!nq) return ESMA_UL_HUSNA;
    return ESMA_UL_HUSNA.filter(
      (e) =>
        norm(e.isim).includes(nq) ||
        norm(e.anlam).includes(nq) ||
        norm(e.kokAnlam).includes(nq) ||
        String(e.sira) === nq,
    );
  }, [q]);

  return (
    <>
      <div className="mb-5">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="İsim, anlam veya kök ara… (ör. rahman, merhamet, koruyan)"
          className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:ring-amber-900/40"
        />
        {q.trim() !== "" && (
          <p className="mt-2 text-[12px] text-stone-500 dark:text-stone-400">
            {filtered.length} isim bulundu
          </p>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500 dark:border-stone-700 dark:bg-stone-800/40 dark:text-stone-400">
          Eşleşen isim bulunamadı.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((e) => (
            <li
              key={e.sira}
              className="flex flex-col rounded-xl border border-stone-200 bg-white px-4 py-3.5 dark:border-stone-700/60 dark:bg-stone-800/40"
            >
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                  {e.sira}
                </span>
                <span className="font-scheherazade text-2xl leading-none text-stone-800 dark:text-stone-100" dir="rtl">
                  {e.arapca}
                </span>
              </div>
              <p className="text-sm font-bold text-stone-900 dark:text-stone-50">{e.isim}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-stone-600 dark:text-stone-400">{e.anlam}</p>

              {/* Kök */}
              <div className="mt-2 flex items-center gap-2 border-t border-stone-100 pt-2 dark:border-stone-700/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">Kök</span>
                <span className="font-scheherazade text-base leading-none text-amber-700 dark:text-amber-500" dir="rtl">
                  {e.kok}
                </span>
                <span className="text-[12px] leading-snug text-stone-500 dark:text-stone-400">{e.kokAnlam}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
