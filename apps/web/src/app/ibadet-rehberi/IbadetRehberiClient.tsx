"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ISLAM_SARTLARI, IMAN_SARTLARI,
  NAMAZ_VAKİTLERİ, NAMAZ_MADDELERİ,
  ORUC_MADDELERİ, ORUC_AYETLERİ,
  ZEKAT_NISAP, ZEKAT_SINIFLARı, ZEKAT_AYETLERİ,
  HAC_ADAMLARı, HAC_AYETLERİ,
  KURBAN_MADDELERİ, KURBAN_AYETLERİ,
  ABDEST_BOLUMLER,
} from "../../data/ibadet-rehberi";
import type { AyetRef, Madde, InancSarti, AbdestBolumu, HacAdimi } from "../../data/ibadet-rehberi";

// ── Tip rozetleri ─────────────────────────────────────────────────────────────

const TIP_RENK: Record<string, string> = {
  farz:      "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  vacip:     "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  sunnet:    "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  mustahap:  "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  info:      "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
};

const TIP_ETİKET: Record<string, string> = {
  farz:     "Farz",
  vacip:    "Vacip",
  sunnet:   "Sünnet",
  mustahap: "Müstahap",
  info:     "Bilgi",
};

// ── Abdest renk haritası ──────────────────────────────────────────────────────

const ABDEST_RENK = {
  yesil: { header: "border-emerald-200 bg-emerald-50 dark:border-emerald-800/40 dark:bg-emerald-950/30", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", farzBg: "bg-emerald-50 dark:bg-emerald-950/20", farzBorder: "border-emerald-200 dark:border-emerald-800/40", ayetBg: "border-emerald-100 bg-emerald-50/60 hover:border-emerald-200 dark:border-emerald-900/50 dark:bg-emerald-950/20", ayetTxt: "text-emerald-700 dark:text-emerald-400", divider: "border-emerald-100 dark:border-emerald-900/40", chevron: "text-emerald-500" },
  mavi:  { header: "border-sky-200 bg-sky-50 dark:border-sky-800/40 dark:bg-sky-950/30", badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300", farzBg: "bg-sky-50 dark:bg-sky-950/20", farzBorder: "border-sky-200 dark:border-sky-800/40", ayetBg: "border-sky-100 bg-sky-50/60 hover:border-sky-200 dark:border-sky-900/50 dark:bg-sky-950/20", ayetTxt: "text-sky-700 dark:text-sky-400", divider: "border-sky-100 dark:border-sky-900/40", chevron: "text-sky-500" },
  amber: { header: "border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/30", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", farzBg: "bg-amber-50 dark:bg-amber-950/20", farzBorder: "border-amber-200 dark:border-amber-800/40", ayetBg: "border-amber-100 bg-amber-50/60 hover:border-amber-200 dark:border-amber-900/50 dark:bg-amber-950/20", ayetTxt: "text-amber-700 dark:text-amber-400", divider: "border-amber-100 dark:border-amber-900/40", chevron: "text-amber-500" },
} as const;

// ── Ortak: Ayet linki listesi ──────────────────────────────────────────────────

function AyetListesi({ ayetler, badgeCls, bgCls, txtCls }: { ayetler: AyetRef[]; badgeCls: string; bgCls: string; txtCls: string }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">Kur&apos;an Referansları</p>
      <div className="flex flex-col gap-1.5">
        {ayetler.map((a) => (
          <Link
            key={`${a.sureId}:${a.ayetNo}`}
            href={`/surah/${a.sureId}/ayah/${a.ayetNo}`}
            className={`group flex items-start gap-2.5 rounded-lg border px-3 py-2 transition-colors ${bgCls}`}
          >
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${badgeCls}`}>
              {a.sureAdi} {a.ayetNo}
            </span>
            <span className="min-w-0 flex-1 text-xs leading-relaxed text-stone-600 dark:text-stone-400">{a.kisaMetin}</span>
            <svg className={`mt-0.5 h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 ${txtCls}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Ortak: Madde listesi (farz/sünnet rozetli) ────────────────────────────────

function MaddeListesi({ maddeler }: { maddeler: Madde[] }) {
  return (
    <div className="flex flex-col gap-2">
      {maddeler.map((m, i) => (
        <div key={i} className="flex items-start gap-2.5 rounded-lg border border-stone-100 bg-white px-3 py-2.5 dark:border-stone-800 dark:bg-stone-900">
          <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${TIP_RENK[m.tip] ?? TIP_RENK.info}`}>
            {TIP_ETİKET[m.tip] ?? m.tip}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">{m.metin}</p>
            {m.detay && <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">{m.detay}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Ortak: Akordeon wrapper ───────────────────────────────────────────────────

function Akordeon({ baslik, altBaslik, ikon, headerCls, chevronCls, defaultAcik = false, children }: {
  baslik: string; altBaslik?: string; ikon: string;
  headerCls: string; chevronCls: string;
  defaultAcik?: boolean; children: React.ReactNode;
}) {
  const [acik, setAcik] = useState(defaultAcik);
  return (
    <div className={`overflow-hidden rounded-xl border ${headerCls}`}>
      <button
        onClick={() => setAcik((p) => !p)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:brightness-95"
        aria-expanded={acik}
      >
        <span className="text-xl">{ikon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-stone-800 dark:text-stone-100">{baslik}</p>
          {altBaslik && <p className="text-[11px] text-stone-400">{altBaslik}</p>}
        </div>
        <svg className={`h-4 w-4 shrink-0 transition-transform duration-200 ${chevronCls} ${acik ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {acik && <div className="border-t border-stone-200/60 px-4 py-4 dark:border-stone-700/60 space-y-4">{children}</div>}
    </div>
  );
}

// ── Tab 1: İnanç Esasları ─────────────────────────────────────────────────────

function InancKarti({ sart, renk }: { sart: InancSarti; renk: "yesil" | "mavi" }) {
  const isYesil = renk === "yesil";
  const headerCls = isYesil
    ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800/40 dark:bg-emerald-950/30"
    : "border-sky-200 bg-sky-50 dark:border-sky-800/40 dark:bg-sky-950/30";
  const badgeCls = isYesil
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
    : "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300";
  const ayetBg = isYesil
    ? "border-emerald-100 bg-emerald-50/60 hover:border-emerald-200 dark:border-emerald-900/50 dark:bg-emerald-950/20"
    : "border-sky-100 bg-sky-50/60 hover:border-sky-200 dark:border-sky-900/50 dark:bg-sky-950/20";
  const ayetTxt = isYesil ? "text-emerald-700 dark:text-emerald-400" : "text-sky-700 dark:text-sky-400";
  const chevronCls = isYesil ? "text-emerald-500" : "text-sky-500";

  return (
    <Akordeon baslik={sart.baslik} altBaslik={`${sart.ayetler.length} referans ayet`} ikon={sart.ikon} headerCls={headerCls} chevronCls={chevronCls}>
      <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">{sart.aciklama}</p>
      <AyetListesi ayetler={sart.ayetler} badgeCls={badgeCls} bgCls={ayetBg} txtCls={ayetTxt} />
    </Akordeon>
  );
}

function InancTabu() {
  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex items-center gap-2">
          <div className="h-1 w-6 rounded-full bg-emerald-500" />
          <div>
            <h2 className="text-sm font-bold text-stone-800 dark:text-stone-100">İslam&apos;ın 5 Şartı</h2>
            <p className="text-xs text-stone-400">Dinin pratik temelleri</p>
          </div>
        </div>
        <div className="space-y-2">
          {ISLAM_SARTLARI.map((s) => <InancKarti key={s.id} sart={s} renk="yesil" />)}
        </div>
      </section>
      <section>
        <div className="mb-3 flex items-center gap-2">
          <div className="h-1 w-6 rounded-full bg-sky-500" />
          <div>
            <h2 className="text-sm font-bold text-stone-800 dark:text-stone-100">İman&apos;ın 6 Şartı</h2>
            <p className="text-xs text-stone-400">Dinin itikadî temelleri</p>
          </div>
        </div>
        <div className="space-y-2">
          {IMAN_SARTLARI.map((s) => <InancKarti key={s.id} sart={s} renk="mavi" />)}
        </div>
      </section>
    </div>
  );
}

// ── Tab 2: İbadetler ──────────────────────────────────────────────────────────

function NamazTablosu() {
  const farzToplam = NAMAZ_VAKİTLERİ.reduce((s, v) => s + v.farz, 0);
  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
        Hanefi mezhebine göre günlük toplam <strong className="text-stone-700 dark:text-stone-200">{NAMAZ_VAKİTLERİ.reduce((s, v) => s + v.toplam, 0)} rekat</strong>, bunun <strong className="text-stone-700 dark:text-stone-200">{farzToplam} rekatı farz</strong>tır.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-stone-200 dark:border-stone-700">
              <th className="py-2 pr-3 text-left text-[10px] font-semibold uppercase tracking-wider text-stone-400">Vakit</th>
              <th className="py-2 px-2 text-center text-[10px] font-semibold uppercase tracking-wider text-stone-400">İlk Sünnet</th>
              <th className="py-2 px-2 text-center text-[10px] font-semibold uppercase tracking-wider text-rose-500">Farz</th>
              <th className="py-2 px-2 text-center text-[10px] font-semibold uppercase tracking-wider text-stone-400">Son Sünnet</th>
              <th className="py-2 px-2 text-center text-[10px] font-semibold uppercase tracking-wider text-orange-500">Vitir</th>
              <th className="py-2 pl-2 text-center text-[10px] font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300">Toplam</th>
            </tr>
          </thead>
          <tbody>
            {NAMAZ_VAKİTLERİ.map((v) => (
              <tr key={v.vakit} className="border-b border-stone-100 last:border-0 dark:border-stone-800">
                <td className="py-2.5 pr-3">
                  <span className="flex items-center gap-1.5 font-semibold text-stone-700 dark:text-stone-200">
                    <span>{v.ikon}</span>{v.vakit}
                  </span>
                </td>
                <td className="py-2.5 px-2 text-center text-stone-500">{v.ilkSunnet > 0 ? v.ilkSunnet : "—"}</td>
                <td className="py-2.5 px-2 text-center">
                  <span className="font-bold text-rose-600 dark:text-rose-400">{v.farz}</span>
                </td>
                <td className="py-2.5 px-2 text-center text-stone-500">{v.sonSunnet > 0 ? v.sonSunnet : "—"}</td>
                <td className="py-2.5 px-2 text-center text-orange-600 dark:text-orange-400">{v.vitir > 0 ? v.vitir : "—"}</td>
                <td className="py-2.5 pl-2 text-center">
                  <span className="font-bold text-stone-800 dark:text-stone-100">{v.toplam}</span>
                  {v.not && <span className="ml-1 text-[10px] text-stone-400">{v.not}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-stone-400">Namazın Farz ve Sünnetleri</p>
        <MaddeListesi maddeler={NAMAZ_MADDELERİ} />
      </div>
    </div>
  );
}

function IbadetlerTabu() {
  return (
    <div className="space-y-2">
      <Akordeon baslik="Namaz (Salât)" altBaslik="5 vakit · rekat tablosu · farz/sünnet" ikon="🕌"
        headerCls="border-emerald-200 bg-emerald-50 dark:border-emerald-800/40 dark:bg-emerald-950/30"
        chevronCls="text-emerald-500">
        <NamazTablosu />
        <AyetListesi
          ayetler={[
            { sureId: 4, sureAdi: "Nisâ", ayetNo: 103, kisaMetin: "Namaz müminlere belirlenmiş vakitlerde farz kılınmıştır." },
            { sureId: 29, sureAdi: "Ankebût", ayetNo: 45, kisaMetin: "Namaz, hayâsızlıktan ve kötülükten alıkoyar." },
          ]}
          badgeCls="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
          bgCls="border-emerald-100 bg-emerald-50/60 hover:border-emerald-200 dark:border-emerald-900/50 dark:bg-emerald-950/20"
          txtCls="text-emerald-700 dark:text-emerald-400"
        />
      </Akordeon>

      <Akordeon baslik="Oruç (Savm)" altBaslik="Ramazan · farz/sünnet · kefaret" ikon="🌙"
        headerCls="border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/30"
        chevronCls="text-amber-500">
        <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
          Ramazan ayında şafaktan güneş batımına kadar yiyecek, içecek ve kötü davranışlardan kaçınmaktır.
        </p>
        <MaddeListesi maddeler={ORUC_MADDELERİ} />
        <AyetListesi ayetler={ORUC_AYETLERİ}
          badgeCls="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
          bgCls="border-amber-100 bg-amber-50/60 hover:border-amber-200 dark:border-amber-900/50 dark:bg-amber-950/20"
          txtCls="text-amber-700 dark:text-amber-400"
        />
      </Akordeon>

      <Akordeon baslik="Zekât" altBaslik="Nisap · %2,5 · 8 sınıf" ikon="💛"
        headerCls="border-yellow-200 bg-yellow-50 dark:border-yellow-800/40 dark:bg-yellow-950/30"
        chevronCls="text-yellow-500">
        <div className="space-y-4">
          <div className="rounded-xl border border-yellow-200 bg-yellow-50/60 p-3 dark:border-yellow-800/40 dark:bg-yellow-950/20">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400">Nisap ve Oran</p>
            <div className="flex flex-col gap-1.5">
              {[
                { etiket: "Altın Nisabı",  deger: ZEKAT_NISAP.altin.miktar,  aciklama: ZEKAT_NISAP.altin.aciklama },
                { etiket: "Gümüş Nisabı", deger: ZEKAT_NISAP.gumus.miktar,  aciklama: ZEKAT_NISAP.gumus.aciklama },
                { etiket: "Oran",          deger: ZEKAT_NISAP.oran.deger,   aciklama: ZEKAT_NISAP.oran.aciklama },
              ].map((r) => (
                <div key={r.etiket} className="flex items-start gap-2">
                  <span className="shrink-0 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-bold text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">{r.etiket}</span>
                  <span className="text-xs text-stone-600 dark:text-stone-400"><strong>{r.deger}</strong> — {r.aciklama}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">8 Zekât Sınıfı (Tevbe 9:60)</p>
            <div className="overflow-hidden rounded-lg border border-stone-200 dark:border-stone-700">
              {ZEKAT_SINIFLARı.map((s, i) => (
                <div key={s.no} className={`flex items-start gap-2.5 px-3 py-2 ${i > 0 ? "border-t border-stone-100 dark:border-stone-800" : ""}`}>
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-[10px] font-bold text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">{s.no}</span>
                  <div>
                    <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">{s.sinif}</p>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">{s.aciklama}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <AyetListesi ayetler={ZEKAT_AYETLERİ}
            badgeCls="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
            bgCls="border-yellow-100 bg-yellow-50/60 hover:border-yellow-200 dark:border-yellow-900/50 dark:bg-yellow-950/20"
            txtCls="text-yellow-700 dark:text-yellow-400"
          />
        </div>
      </Akordeon>

      <Akordeon baslik="Hac" altBaslik="Farz · vacip · sünnet adımlar" ikon="🕋"
        headerCls="border-stone-300 bg-stone-50 dark:border-stone-600 dark:bg-stone-800/50"
        chevronCls="text-stone-500">
        <div className="space-y-4">
          <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">Gücü yeten her Müslümana ömründe bir kez farzdır. Menasik sırası aşağıdadır (Hac türleri: İfrad, Kıran, Temettü).</p>
          <div className="flex flex-col gap-2">
            {HAC_ADAMLARı.map((a: HacAdimi) => (
              <div key={a.no} className="flex items-start gap-2.5 rounded-lg border border-stone-100 bg-white px-3 py-2.5 dark:border-stone-800 dark:bg-stone-900">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-100 text-[10px] font-bold text-stone-600 dark:bg-stone-800 dark:text-stone-300">{a.no}</span>
                <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${TIP_RENK[a.tip] ?? TIP_RENK.info}`}>{TIP_ETİKET[a.tip]}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">{a.baslik}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">{a.aciklama}</p>
                </div>
              </div>
            ))}
          </div>
          <AyetListesi ayetler={HAC_AYETLERİ}
            badgeCls="bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
            bgCls="border-stone-200 bg-stone-50/60 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-800/20"
            txtCls="text-stone-600 dark:text-stone-400"
          />
        </div>
      </Akordeon>

      <Akordeon baslik="Kurban" altBaslik="Hüküm · hayvan şartları · pay" ikon="🐑"
        headerCls="border-rose-200 bg-rose-50 dark:border-rose-800/40 dark:bg-rose-950/30"
        chevronCls="text-rose-500">
        <MaddeListesi maddeler={KURBAN_MADDELERİ} />
        <AyetListesi ayetler={KURBAN_AYETLERİ}
          badgeCls="bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
          bgCls="border-rose-100 bg-rose-50/60 hover:border-rose-200 dark:border-rose-900/50 dark:bg-rose-950/20"
          txtCls="text-rose-700 dark:text-rose-400"
        />
      </Akordeon>
    </div>
  );
}

// ── Tab 3: Abdest & Temizlik ──────────────────────────────────────────────────

function AbdestTablosu({ satirlar, miktarBg }: { satirlar: { organ: string; miktar: number | "—"; aciklama: string }[]; miktarBg: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 dark:border-stone-700">
      <table className="w-full">
        <thead>
          <tr className="border-b border-stone-200/60 dark:border-stone-700/60">
            <th className="px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone-400">Organ</th>
            <th className="px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone-400">Kez</th>
            <th className="px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone-400">Açıklama</th>
          </tr>
        </thead>
        <tbody>
          {satirlar.map((r) => (
            <tr key={r.organ} className="border-b border-stone-100 last:border-0 dark:border-stone-800">
              <td className="px-3 py-2 align-top text-xs font-semibold text-stone-700 dark:text-stone-200 whitespace-nowrap">{r.organ}</td>
              <td className="px-3 py-2 align-top whitespace-nowrap">
                <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${miktarBg}`}>
                  {r.miktar === "—" ? "—" : `${r.miktar}×`}
                </span>
              </td>
              <td className="px-3 py-2 align-top text-xs leading-relaxed text-stone-500 dark:text-stone-400">{r.aciklama}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AbdestAkordeonItem({ bolum }: { bolum: AbdestBolumu }) {
  const r = ABDEST_RENK[bolum.renk];
  return (
    <Akordeon baslik={bolum.baslik} altBaslik={bolum.altBaslik} ikon={bolum.ikon} headerCls={r.header} chevronCls={r.chevron}>
      <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">{bolum.aciklama}</p>
      <div>
        <p className={`mb-2 text-[11px] font-bold uppercase tracking-wider ${r.ayetTxt}`}>Farzlar ({bolum.farzlar.length})</p>
        <AbdestTablosu satirlar={bolum.farzlar} miktarBg={r.badge} />
      </div>
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-stone-400">Sünnetler ({bolum.sunnetler.length})</p>
        <AbdestTablosu satirlar={bolum.sunnetler} miktarBg="bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400" />
      </div>
      <AyetListesi ayetler={bolum.ayetler} badgeCls={r.badge} bgCls={r.ayetBg} txtCls={r.ayetTxt} />
    </Akordeon>
  );
}

function AbdestTabu() {
  return (
    <div className="space-y-2">
      {ABDEST_BOLUMLER.map((b) => <AbdestAkordeonItem key={b.id} bolum={b} />)}
    </div>
  );
}

// ── Ana bileşen ───────────────────────────────────────────────────────────────

type Tab = "inanc" | "ibadetler" | "abdest";

const TABS: { id: Tab; baslik: string; ikon: string }[] = [
  { id: "inanc",    baslik: "İnanç Esasları", ikon: "📿" },
  { id: "ibadetler",baslik: "İbadetler",      ikon: "🕌" },
  { id: "abdest",   baslik: "Abdest",         ikon: "💧" },
];

export function IbadetRehberiClient() {
  const [aktif, setAktif] = useState<Tab>("inanc");

  return (
    <div>
      {/* Yapışkan sekme çubuğu */}
      <div className="sticky top-0 z-10 bg-stone-100 pb-2 pt-1 dark:bg-stone-950">
        <div className="flex gap-1 rounded-xl bg-stone-200/80 p-1 dark:bg-stone-800/80">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setAktif(t.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all duration-150 ${
                aktif === t.id
                  ? "bg-white shadow-sm text-stone-800 dark:bg-stone-700 dark:text-stone-100"
                  : "text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
              }`}
            >
              <span>{t.ikon}</span>
              <span className="hidden sm:inline">{t.baslik}</span>
              <span className="sm:hidden">{t.baslik.split(" ")[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab içerikleri */}
      <div className="mt-4">
        {aktif === "inanc"     && <InancTabu />}
        {aktif === "ibadetler" && <IbadetlerTabu />}
        {aktif === "abdest"    && <AbdestTabu />}
      </div>
    </div>
  );
}
