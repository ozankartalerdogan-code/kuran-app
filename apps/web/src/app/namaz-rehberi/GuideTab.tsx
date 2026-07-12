"use client";

import { Sprout, BookMarked, Clock, Droplets, MoonStar, BookOpen, HandHeart, Moon, ClipboardList, Repeat } from "lucide-react";
import namazRehberiRaw from "../../data/namaz_rehberi.json";
import { Section, DurumBadge, DuaBlock, Note, Bullets } from "./shared";

interface Kavram { id: string; isim: string; aciklama: string; "örnek"?: string }
interface Sure { id: string; isim: string; arapca: string; okunusu: string; anlam: string }
interface NiyetOrnegi { namaz: string; niyet: string }
interface Adim {
  id?: string; sira?: number; isim: string; konum?: string; durum?: string; ne_zaman?: string;
  aciklama?: string; dua?: string | null; dua_arapca?: string | null; anlam?: string; not?: string;
  tekrar?: string; farz_notu?: string; anlam_notu?: string;
  durum_detay?: string; kuran_kaynagi?: string; sureler?: Sure[];
  niyet_ornekleri?: NiyetOrnegi[];
}
interface VakitRow { vakit: string; sunnet: string; farz: string; toplam: string }
interface ComparisonRow { ozellik: string; farz_namaz: string; sunnet_namaz: string }
interface SelamRow { sira: number; aciklama: string; dua: string; dua_arapca: string; anlam: string }
interface Ozellik { baslik: string; durum: string; aciklama: string }
interface VitirAdim { rekat: string; durum: string; aciklama: string }
interface RekatRow { rekat: string; subhaneke: string; euzu_besmele: string; fatiha: string; zamm_i_sure: string; "oturuş": string }
interface NamazRehberi {
  aciklama: string; kaynak_not: string; kapsam_notu?: string;
  temel_kavramlar: { baslik: string; aciklama: string; kavramlar: Kavram[]; teselli_notu: string };
  farz_sunnet_namaz_farki: { karsilastirma?: ComparisonRow[]; vakit_rekat_tablosu: VakitRow[]; not: string };
  namaz_oncesi: { baslik: string; adimlar: Adim[] };
  namaz_adimlari: Adim[];
  dualar: Adim[];
  selam: { isim: string; aciklama: string; adimlar: SelamRow[]; anlam_notu: string };
  vitir_namazi: { baslik: string; durum: string; rekat: string; ne_zaman: string; aciklama: string; ozellikler: Ozellik[]; adimlar: VitirAdim[]; yaygin_hata: string; not: string };
  rekat_yapisi: { baslik: string; aciklama: string; tablo: RekatRow[]; ozet_notu: string };
  yeni_baslayan_notu: { baslik: string; maddeler: string[] };
}

const R = (namazRehberiRaw as unknown as { namaz_rehberi: NamazRehberi }).namaz_rehberi;

export function GuideTab() {
  const zammSureler = R.namaz_adimlari.find((a) => a.id === "zamm_i_sure")?.sureler ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <p className="mb-4 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{R.aciklama}</p>

      {R.kapsam_notu && (
        <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 p-3 dark:border-sky-800/40 dark:bg-sky-950/30">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">Kapsam Notu</p>
          <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">{R.kapsam_notu}</p>
        </div>
      )}

      <Section ikon={Sprout} title={R.yeni_baslayan_notu.baslik} defaultOpen>
        <Bullets items={R.yeni_baslayan_notu.maddeler} />
      </Section>

      <Section ikon={BookMarked} title={R.temel_kavramlar.baslik}>
        <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">{R.temel_kavramlar.aciklama}</p>
        {R.temel_kavramlar.kavramlar.map((k) => (
          <div key={k.id} className="mt-2.5 rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-900/60">
            <p className="mb-1 text-sm font-bold text-stone-900 dark:text-stone-50">{k.isim}</p>
            <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">{k.aciklama}</p>
            {k["örnek"] && <p className="mt-1 text-[11px] text-stone-400 dark:text-stone-500">Örnek: {k["örnek"]}</p>}
          </div>
        ))}
        <p className="mt-3 rounded-lg bg-navy-50 p-3 text-xs leading-relaxed text-navy-700 dark:bg-navy-950/30 dark:text-navy-400">
          {R.temel_kavramlar.teselli_notu}
        </p>
      </Section>

      <Section ikon={Clock} title="Vakit ve Rekat Sayıları">
        {R.farz_sunnet_namaz_farki.karsilastirma?.map((row) => (
          <div key={row.ozellik} className="mt-2 rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-900/60">
            <p className="text-sm font-bold text-stone-900 dark:text-stone-50">{row.ozellik}</p>
            <p className="mt-0.5 text-xs text-stone-600 dark:text-stone-300">Farz: {row.farz_namaz}</p>
            <p className="text-xs text-stone-500 dark:text-stone-400">Sünnet: {row.sunnet_namaz}</p>
          </div>
        ))}
        <div className="mt-3 overflow-hidden rounded-lg border border-stone-200 dark:border-stone-700">
          {R.farz_sunnet_namaz_farki.vakit_rekat_tablosu.map((v) => (
            <div key={v.vakit} className="flex items-center gap-3 border-b border-stone-100 px-3 py-2.5 last:border-0 dark:border-stone-800">
              <span className="w-16 shrink-0 text-sm font-bold text-stone-900 dark:text-stone-50">{v.vakit}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-stone-600 dark:text-stone-300">{v.farz}</p>
                <p className="text-[11px] text-stone-400 dark:text-stone-500">{v.sunnet}</p>
              </div>
              <span className="shrink-0 text-xs font-bold text-navy-600 dark:text-navy-400">{v.toplam}</span>
            </div>
          ))}
        </div>
        <Note>{R.farz_sunnet_namaz_farki.not}</Note>
      </Section>

      <Section ikon={Droplets} title={R.namaz_oncesi.baslik}>
        {R.namaz_oncesi.adimlar.map((a, i) => (
          <div key={i} className="mt-3 first:mt-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-stone-900 dark:text-stone-50">{a.isim}</span>
              <DurumBadge durum={a.durum} />
            </div>
            {a.aciklama && <p className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{a.aciklama}</p>}
            {a.niyet_ornekleri && a.niyet_ornekleri.length > 0 && (
              <div className="mt-2 space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-navy-700 dark:text-navy-400">Örnek Niyetler</p>
                {a.niyet_ornekleri.map((ornek, idx) => (
                  <div key={idx} className="rounded-lg border border-stone-200 bg-stone-50 p-2.5 dark:border-stone-700 dark:bg-stone-900/60">
                    <p className="text-xs font-semibold text-stone-800 dark:text-stone-100">{ornek.namaz}</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">{ornek.niyet}</p>
                  </div>
                ))}
              </div>
            )}
            {a.not && <Note>{a.not}</Note>}
          </div>
        ))}
      </Section>

      <Section ikon={MoonStar} title="Namaz Nasıl Kılınır? (Adım Adım)">
        {R.namaz_adimlari.map((a, i) => (
          <div key={a.id ?? i} className="mt-4 first:mt-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-stone-900 dark:text-stone-50">
                {a.sira ? `${a.sira}. ` : ""}{a.isim}
              </span>
              <DurumBadge durum={a.durum} />
            </div>
            {a.konum && <p className="mt-0.5 text-xs font-semibold text-navy-700 dark:text-navy-400">{a.konum}</p>}
            {a.ne_zaman && <p className="text-[11px] text-stone-400 dark:text-stone-500">{a.ne_zaman}</p>}
            {a.aciklama && <p className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{a.aciklama}</p>}
            <DuaBlock arapca={a.dua_arapca} okunus={a.dua} anlam={a.anlam} />
            {a.tekrar && <p className="mt-1 flex items-center gap-1 text-xs text-stone-400 dark:text-stone-500"><Repeat aria-hidden="true" className="h-3 w-3" strokeWidth={2} /> {a.tekrar}</p>}
            {a.farz_notu && <Note>{a.farz_notu}</Note>}
            {a.durum_detay && <Note>{a.durum_detay}</Note>}
            {a.not && <Note>{a.not}</Note>}
            {a.anlam_notu && <Note>{a.anlam_notu}</Note>}
            {a.sureler && <p className="mt-1 text-xs font-semibold text-navy-700 dark:text-navy-400">↓ Sureler aşağıdaki &quot;Zamm-ı Sureler&quot; bölümünde</p>}
          </div>
        ))}
      </Section>

      <Section ikon={BookOpen} title={`Zamm-ı Sureler (${zammSureler.length} Kısa Sure)`}>
        <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">
          Fatiha&apos;dan sonra okunabilecek, en çok tercih edilen kısa sureler:
        </p>
        {zammSureler.map((su) => (
          <div key={su.id} className="mt-3 first:mt-0">
            <p className="text-sm font-bold text-stone-900 dark:text-stone-50">{su.isim}</p>
            <DuaBlock arapca={su.arapca} okunus={su.okunusu} anlam={su.anlam} />
          </div>
        ))}
      </Section>

      <Section ikon={HandHeart} title="Namaz Duaları">
        {R.dualar.map((d, i) => (
          <div key={d.id ?? i} className="mt-4 first:mt-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-stone-900 dark:text-stone-50">{d.isim}</span>
              <DurumBadge durum={d.durum} />
            </div>
            {d.ne_zaman && <p className="text-[11px] text-stone-400 dark:text-stone-500">{d.ne_zaman}</p>}
            <DuaBlock arapca={d.dua_arapca} okunus={d.dua} anlam={d.anlam} kaynak={d.kuran_kaynagi} />
            {d.not && <Note>{d.not}</Note>}
          </div>
        ))}
      </Section>

      <Section ikon={HandHeart} title={R.selam.isim}>
        <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">{R.selam.aciklama}</p>
        {R.selam.adimlar.map((a, i) => (
          <div key={i} className="mt-3">
            <p className="text-sm text-stone-600 dark:text-stone-300">{a.sira}. {a.aciklama}</p>
            <DuaBlock arapca={a.dua_arapca} okunus={a.dua} anlam={a.anlam} />
          </div>
        ))}
        <Note>{R.selam.anlam_notu}</Note>
      </Section>

      <Section ikon={Moon} title={R.vitir_namazi.baslik}>
        <div className="flex flex-wrap items-center gap-2">
          <DurumBadge durum={R.vitir_namazi.durum} />
          <span className="text-xs text-stone-400 dark:text-stone-500">{R.vitir_namazi.rekat}</span>
        </div>
        <p className="mt-1 text-[11px] text-stone-400 dark:text-stone-500">{R.vitir_namazi.ne_zaman}</p>
        <p className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{R.vitir_namazi.aciklama}</p>

        <p className="mb-1 mt-4 text-sm font-bold text-stone-900 dark:text-stone-50">Özellikleri</p>
        {R.vitir_namazi.ozellikler.map((o, i) => (
          <div key={i} className="mt-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-stone-800 dark:text-stone-100">{o.baslik}</span>
              <DurumBadge durum={o.durum} />
            </div>
            <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">{o.aciklama}</p>
          </div>
        ))}

        <p className="mb-1 mt-4 text-sm font-bold text-stone-900 dark:text-stone-50">Adım Adım</p>
        {R.vitir_namazi.adimlar.map((a, i) => (
          <div key={i} className="mt-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-stone-800 dark:text-stone-100">{a.rekat}</span>
              <DurumBadge durum={a.durum} />
            </div>
            <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">{a.aciklama}</p>
          </div>
        ))}

        <Note tone="warn">{R.vitir_namazi.yaygin_hata}</Note>
        <Note>{R.vitir_namazi.not}</Note>
      </Section>

      <Section ikon={ClipboardList} title={R.rekat_yapisi.baslik}>
        <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">{R.rekat_yapisi.aciklama}</p>
        {R.rekat_yapisi.tablo.map((t) => (
          <div key={t.rekat} className="mt-2.5 rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-900/60">
            <p className="mb-1 text-sm font-bold text-stone-900 dark:text-stone-50">{t.rekat}</p>
            <p className="text-xs text-stone-600 dark:text-stone-300">Sübhaneke: {t.subhaneke}</p>
            <p className="text-xs text-stone-600 dark:text-stone-300">Eûzü-Besmele: {t.euzu_besmele}</p>
            <p className="text-xs text-stone-600 dark:text-stone-300">Fatiha: {t.fatiha}</p>
            <p className="text-xs text-stone-600 dark:text-stone-300">Zamm-ı sure: {t.zamm_i_sure}</p>
            <p className="text-xs text-stone-600 dark:text-stone-300">Oturuş: {t["oturuş"]}</p>
          </div>
        ))}
        <Note>{R.rekat_yapisi.ozet_notu}</Note>
      </Section>

      <p className="mt-6 text-center text-[11px] italic text-stone-400 dark:text-stone-500">{R.kaynak_not}</p>
    </div>
  );
}
