"use client";

import { useState } from "react";
import mubarekRaw from "../../data/mubarek_gunler.json";
import { getEvidenceLabel } from "../../lib/sourceLabels";

type DayanakKey = "sahih" | "tartismali" | "zayif" | "kulturel" | "uydurma";
type IbadetDurumKey = "farz" | "vacip" | "sunnet" | "mustehap" | "tavsiye";
type GunTip = "haftalik" | "yillik" | "ramazan";

interface KuranRef {
  sure?: string;
  ayet?: string | number;
  metin?: string;
  not?: string;
}

interface Ibadet {
  isim: string;
  durum?: IbadetDurumKey;
  aciklama?: string;
  hadis_kaynagi?: string;
}

interface Gun {
  id: string;
  isim: string;
  tip?: GunTip;
  dayanak: DayanakKey;
  dayanak_aciklama?: string;
  kuran_referansi?: KuranRef | null;
  hicri_tarih?: string;
  onem?: string;
  tarihsel_bilgi?: string;
  ibadetler?: Ibadet[];
  ozel_not?: string | null;
}

interface OzetRow {
  isim: string;
  dayanak: DayanakKey;
  hicri: string;
}

interface DayanakSeviye {
  kod: DayanakKey;
  etiket?: string;
  aciklama?: string;
}

interface MubarekGunlerRoot {
  baslik?: string;
  aciklama?: string;
  kaynak_not?: string;
  genel_not?: string;
  gunler?: Gun[];
  ozet_tablo?: OzetRow[];
  dayanak_seviyeleri?: {
    aciklama?: string;
    seviyeler?: DayanakSeviye[];
  };
}

const ROOT = ((mubarekRaw as { mubarek_gunler?: MubarekGunlerRoot }).mubarek_gunler ?? {});
const GUNLER = Array.isArray(ROOT.gunler)
  ? ROOT.gunler.map((gun) => ({
      ...gun,
      ibadetler: Array.isArray(gun.ibadetler) ? gun.ibadetler : [],
      kuran_referansi: gun.kuran_referansi ?? null,
      ozel_not: gun.ozel_not ?? null,
    }))
  : [];
const OZET_TABLO = Array.isArray(ROOT.ozet_tablo) ? ROOT.ozet_tablo : [];
const DAYANAK_SEVIYELERI = Array.isArray(ROOT.dayanak_seviyeleri?.seviyeler) ? ROOT.dayanak_seviyeleri.seviyeler : [];

const DAYANAK: Record<DayanakKey, { label: string; cls: string; border: string }> = {
  sahih: { label: "Sahih", cls: "border-navy-200 bg-navy-50 text-navy-700 dark:border-navy-800/50 dark:bg-navy-950/20 dark:text-navy-300", border: "border-l-navy-300 dark:border-l-navy-700" },
  tartismali: { label: "Tartışmalı", cls: "border-gold-200 bg-gold-50 text-gold-700 dark:border-gold-800/50 dark:bg-gold-950/20 dark:text-gold-300", border: "border-l-gold-300 dark:border-l-gold-700" },
  zayif: { label: "Zayıf", cls: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800/50 dark:bg-orange-950/20 dark:text-orange-300", border: "border-l-orange-300 dark:border-l-orange-700" },
  kulturel: { label: "Kültürel", cls: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/50 dark:bg-sky-950/20 dark:text-sky-300", border: "border-l-sky-300 dark:border-l-sky-700" },
  uydurma: { label: "Uydurma", cls: "border-red-200 bg-red-50 text-red-700 dark:border-red-800/50 dark:bg-red-950/20 dark:text-red-300", border: "border-l-red-300 dark:border-l-red-700" },
};

const IBADET_DURUM: Record<IbadetDurumKey, string> = {
  farz: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  vacip: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  sunnet: "bg-navy-100 text-navy-700 dark:bg-navy-900/40 dark:text-navy-300",
  mustehap: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  tavsiye: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
};

const TIP_LABEL: Record<GunTip, string> = {
  haftalik: "Haftalık",
  yillik: "Yıllık",
  ramazan: "Ramazan",
};

function Chevron({ open }: { open: boolean }) {
  return (
    <svg className={`h-4 w-4 shrink-0 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function Badge({ dayanak }: { dayanak: DayanakKey }) {
  const badge = DAYANAK[dayanak];
  return <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${badge.cls}`}>{badge.label}</span>;
}

function IbadetCard({ ibadet }: { ibadet: Ibadet }) {
  const evidenceLabel = getEvidenceLabel(ibadet.hadis_kaynagi);

  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 dark:border-stone-700 dark:bg-stone-950/40">
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{ibadet.isim}</p>
        {ibadet.durum ? <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${IBADET_DURUM[ibadet.durum]}`}>{ibadet.durum}</span> : null}
      </div>
      {ibadet.aciklama ? <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">{ibadet.aciklama}</p> : null}
      {evidenceLabel ? <p className="mt-2 text-xs italic text-stone-400">{evidenceLabel}</p> : null}
    </div>
  );
}

function GunCard({ gun }: { gun: Gun }) {
  const [open, setOpen] = useState(false);
  const badge = DAYANAK[gun.dayanak];
  const ibadetler = gun.ibadetler ?? [];
  const kuranRef = gun.kuran_referansi;

  return (
    <div className={`overflow-hidden rounded-2xl border border-l-4 border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-900 ${badge.border}`}>
      <button
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left"
        onClick={() => setOpen((current) => !current)}
        type="button"
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-stone-900 dark:text-stone-100">{gun.isim || "İsimsiz kayıt"}</span>
          <span className="mt-2 flex flex-wrap items-center gap-2">
            <Badge dayanak={gun.dayanak} />
            {gun.tip ? <span className="text-xs text-stone-400">{TIP_LABEL[gun.tip]}</span> : null}
            {gun.hicri_tarih ? <span className="text-xs text-stone-400">{gun.hicri_tarih}</span> : null}
          </span>
        </span>
        <Chevron open={open} />
      </button>

      {open && (
        <div className="space-y-4 border-t border-stone-100 px-4 py-4 dark:border-stone-800">
          {gun.onem ? <p className="text-sm italic leading-7 text-stone-600 dark:text-stone-300">{gun.onem}</p> : null}

          {gun.dayanak_aciklama ? (
            <div className={`rounded-xl border px-3 py-3 text-sm leading-relaxed ${badge.cls}`}>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider">Dayanak</p>
              {gun.dayanak_aciklama}
            </div>
          ) : null}

          {kuranRef && (kuranRef.metin || kuranRef.not || (kuranRef.sure && kuranRef.ayet)) ? (
            <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 dark:border-stone-700 dark:bg-stone-950/40">
              {kuranRef.sure && kuranRef.ayet ? (
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-navy-700 dark:text-navy-400">
                  {kuranRef.sure} {String(kuranRef.ayet)}
                </p>
              ) : null}
              {kuranRef.metin ? <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-200">&quot;{kuranRef.metin}&quot;</p> : null}
              {kuranRef.not ? <p className="mt-2 text-xs text-stone-400">{kuranRef.not}</p> : null}
            </div>
          ) : null}

          {gun.tarihsel_bilgi ? <p className="text-sm leading-7 text-stone-600 dark:text-stone-300">{gun.tarihsel_bilgi}</p> : null}

          {ibadetler.length > 0 ? (
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-navy-700 dark:text-navy-400">İbadetler</p>
              <div className="space-y-2">
                {ibadetler.map((ibadet, index) => <IbadetCard key={index} ibadet={ibadet} />)}
              </div>
            </div>
          ) : null}

          {gun.ozel_not ? (
            <div className="rounded-lg border border-gold-200 bg-gold-50 px-3 py-2 text-xs leading-relaxed text-gold-800 dark:border-gold-800/50 dark:bg-gold-950/20 dark:text-gold-300">
              {gun.ozel_not}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function MubarekGunlerClient() {
  const baslik = ROOT.baslik ?? "Mübarek Gün ve Geceler";
  const aciklama = ROOT.aciklama ?? "";
  const genelNot = ROOT.genel_not ?? "";
  const kaynakNot = ROOT.kaynak_not ?? "";

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 border-b border-stone-200 pb-6 dark:border-stone-700">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-navy-700 dark:text-navy-400">
            {GUNLER.length} kayıt
          </p>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">{baslik}</h1>
          {aciklama ? <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{aciklama}</p> : null}
        </header>

        {OZET_TABLO.length > 0 ? (
          <section className="mb-5 rounded-2xl border border-stone-200 bg-white px-4 py-3 dark:border-stone-700 dark:bg-stone-900">
            <p className="mb-3 text-sm font-bold text-stone-900 dark:text-stone-100">Hızlı Bakış</p>
            <div className="divide-y divide-stone-100 dark:divide-stone-800">
              {OZET_TABLO.map((row, index) => (
                <div key={`${row.isim}-${index}`} className="grid grid-cols-[1fr_auto] gap-2 py-2 text-sm sm:grid-cols-[1fr_auto_auto]">
                  <span className="font-medium text-stone-800 dark:text-stone-100">{row.isim}</span>
                  <span className="text-xs text-stone-400">{row.hicri}</span>
                  <Badge dayanak={row.dayanak} />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {DAYANAK_SEVIYELERI.length > 0 ? (
          <section className="mb-5 rounded-2xl border border-stone-200 bg-white px-4 py-3 dark:border-stone-700 dark:bg-stone-900">
            <p className="mb-3 text-sm font-bold text-stone-900 dark:text-stone-100">Dayanak Seviyeleri</p>
            <div className="space-y-2">
              {DAYANAK_SEVIYELERI.map((seviye) => (
                <div key={seviye.kod} className="flex flex-wrap items-start gap-2">
                  <Badge dayanak={seviye.kod} />
                  <p className="min-w-0 flex-1 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{seviye.aciklama}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-3">
          {GUNLER.length > 0
            ? GUNLER.map((gun) => <GunCard key={gun.id} gun={gun} />)
            : <p className="text-center text-sm text-stone-400">Bu bölüm için gösterilecek kayıt bulunamadı.</p>}
        </section>

        {genelNot ? (
          <div className="mt-5 rounded-lg border border-gold-200 bg-gold-50 px-3 py-2 text-xs leading-relaxed text-gold-800 dark:border-gold-800/50 dark:bg-gold-950/20 dark:text-gold-300">
            {genelNot}
          </div>
        ) : null}

        {kaynakNot ? <p className="mt-6 text-center text-xs italic leading-relaxed text-stone-400">{kaynakNot}</p> : null}
      </div>
    </main>
  );
}
