"use client";

import ozelNamazlarRaw from "../../data/ozel_namazlar.json";
import {
  Bird, PartyPopper, MoonStar, Sunrise, HelpCircle, Moon, Landmark, CircleOff,
  CloudRain, HandHeart, Droplets, Table,
  type LucideIcon,
} from "lucide-react";
import { Section, DurumBadge, DuaBlock, Note, Bullets, getEvidenceLabel } from "./shared";

// ozel_namazlar.json içeriği bilinçli olarak polimorfik (her namaz tipi farklı alan
// seti kullanır) — mobildeki gevşek tipleme aynen korunur, katı şema zorlanmaz.
interface KuranRef { sure?: string; ayet?: number | string; metin?: string }
interface Cesit { isim?: string; hicri_tarih?: string; aciklama?: string; tekbir_notu?: string }
interface IstihareSonucu { aciklama?: string; maddeler?: string[] }
interface DuaObject {
  baslik?: string; dua_arapca?: string; dua?: string; anlam?: string;
  kaynagi?: string; dua_kaynagi?: string; kaynak?: string; not?: string;
}
type DuaLike = string | DuaObject;
interface Step {
  isim?: string; aciklama?: string; detay?: string;
  dua?: string; dua_arapca?: string; anlam?: string;
  dua_1?: string; dua_1_arapca?: string; dua_2?: string; dua_2_arapca?: string;
  tesbih?: string; selam?: string; bilmeyenler_icin?: string; not?: string;
}
interface KilinicObj {
  aciklama?: string; "1_rekat"?: string[]; "2_rekat"?: string[];
  adimlar?: string[]; tavsiye_edilen_sureler?: string; not?: string;
}
type KilinicData = string | Array<string | Step> | KilinicObj;
type NiyetData = string | { [k: string]: string | undefined };
interface OzelNamaz {
  id: string; isim: string;
  durum?: string; rekat?: string; durum_aciklama?: string;
  ne_zaman_kilinir?: string; ne_zaman_yapilir?: string; vakit?: string; sebep?: string;
  mezhep_gorusleri?: string; kuran_referansi?: KuranRef;
  cesitleri?: Cesit[]; on_sartlar?: string[];
  niyet?: NiyetData; kilinic?: KilinicData;
  kilinic_hanafi?: string; kilinic_safii_hanbeli?: string; tavsiye_edilen_sureler?: string;
  teheccud_duasi?: DuaLike; istihare_duasi?: DuaLike; hacet_duasi?: DuaLike; anlam?: string;
  tovbe_duasi?: DuaLike; secde_duasi?: DuaLike; dua?: DuaLike;
  teravih_arasi_tesbih?: DuaLike; cenaze_duasi_kisa?: DuaLike;
  istihare_sonucu?: IstihareSonucu; tovbe_sartlari?: string[];
  fazileti?: string | string[]; ozel_notlar?: string[]; hadis_kaynagi?: string;
}

const O = (ozelNamazlarRaw as unknown as {
  ozel_namazlar: {
    aciklama: string;
    hizli_bakis_tablosu: Record<string, string>[];
    namazlar: OzelNamaz[];
    kaynak_not: string;
  };
}).ozel_namazlar;

const OZEL_IKON: Record<string, LucideIcon> = {
  cenaze_namazi: Bird, bayram_namazi: PartyPopper, teheccud_namazi: MoonStar, kusluk_namazi: Sunrise,
  istihare_namazi: HelpCircle, teravih_namazi: Moon, tahiyyetul_mescid: Landmark, kusuf_husuf: CircleOff,
  istiska_namazi: CloudRain, sukur_secdesi: HandHeart, tovbe_namazi: Droplets, hacet_namazi: HandHeart,
};

const NIYET_LABEL: Record<string, string> = {
  erkek_cenaze: "Erkek cenaze", kadin_cenaze: "Kadın cenaze",
  ramazan: "Ramazan Bayramı", kurban: "Kurban Bayramı",
};

function Niyet({ niyet }: { niyet?: NiyetData }) {
  if (!niyet) return null;
  if (typeof niyet === "string") {
    return (
      <p className="mt-2 rounded-lg border border-stone-200 bg-stone-50 p-2.5 text-sm italic text-stone-700 dark:border-stone-700 dark:bg-stone-900/60 dark:text-stone-300">
        &ldquo;{niyet}&rdquo;
      </p>
    );
  }
  return (
    <>
      {Object.entries(niyet).filter(([k]) => k !== "not").map(([k, v]) => (
        <div key={k} className="mt-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-navy-700 dark:text-navy-400">{NIYET_LABEL[k] ?? k}</p>
          <p className="mt-0.5 rounded-lg border border-stone-200 bg-stone-50 p-2.5 text-sm italic text-stone-700 dark:border-stone-700 dark:bg-stone-900/60 dark:text-stone-300">
            &ldquo;{String(v)}&rdquo;
          </p>
        </div>
      ))}
      {niyet.not && <Note>{niyet.not}</Note>}
    </>
  );
}

function StepBlock({ step }: { step: Step }) {
  return (
    <div className="mt-3">
      {step.isim && <p className="text-sm font-bold text-stone-900 dark:text-stone-50">{step.isim}</p>}
      {step.aciklama && <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">{step.aciklama}</p>}
      {step.detay && <p className="text-xs text-stone-400 dark:text-stone-500">{step.detay}</p>}
      <DuaBlock arapca={step.dua_arapca} okunus={typeof step.dua === "string" ? step.dua : undefined} anlam={step.anlam} />
      {step.dua_1 && <DuaBlock arapca={step.dua_1_arapca} okunus={step.dua_1} />}
      {step.dua_2 && <DuaBlock arapca={step.dua_2_arapca} okunus={step.dua_2} />}
      {step.tesbih && <p className="mt-1 text-sm italic text-stone-700 dark:text-stone-300">{step.tesbih}</p>}
      {step.selam && <p className="mt-1 text-sm italic text-stone-700 dark:text-stone-300">{step.selam}</p>}
      {step.bilmeyenler_icin && <Note>{step.bilmeyenler_icin}</Note>}
      {step.not && <Note>{step.not}</Note>}
    </div>
  );
}

function KilinicObjectView({ obj }: { obj: KilinicObj }) {
  return (
    <>
      {obj.aciklama && <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">{obj.aciklama}</p>}
      {Array.isArray(obj["1_rekat"]) && (
        <div className="mt-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-navy-700 dark:text-navy-400">1. Rekat</p>
          <Bullets items={obj["1_rekat"]} />
        </div>
      )}
      {Array.isArray(obj["2_rekat"]) && (
        <div className="mt-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-navy-700 dark:text-navy-400">2. Rekat</p>
          <Bullets items={obj["2_rekat"]} />
        </div>
      )}
      {Array.isArray(obj.adimlar) && <Bullets items={obj.adimlar} />}
      {obj.tavsiye_edilen_sureler && <Note>{obj.tavsiye_edilen_sureler}</Note>}
      {obj.not && <Note>{obj.not}</Note>}
    </>
  );
}

function Kilinic({ data }: { data?: KilinicData }) {
  if (!data) return null;
  if (typeof data === "string") return <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">{data}</p>;
  if (Array.isArray(data)) {
    if (data.every((x): x is string => typeof x === "string")) return <Bullets items={data} />;
    return (
      <>
        {data.map((it, i) =>
          typeof it === "string"
            ? <p key={i} className="mt-1.5 text-sm leading-relaxed text-stone-600 dark:text-stone-300">• {it}</p>
            : <StepBlock key={i} step={it} />
        )}
      </>
    );
  }
  return <KilinicObjectView obj={data} />;
}

function DuaObjView({ obj, anlamFallback }: { obj?: DuaLike; anlamFallback?: string }) {
  if (!obj) return null;
  if (typeof obj === "string") return <DuaBlock okunus={obj} anlam={anlamFallback} />;
  return (
    <>
      {obj.baslik && <p className="text-sm font-bold text-stone-900 dark:text-stone-50">{obj.baslik}</p>}
      <DuaBlock arapca={obj.dua_arapca} okunus={obj.dua} anlam={obj.anlam ?? anlamFallback} kaynak={obj.kaynagi ?? obj.dua_kaynagi ?? obj.kaynak} />
      {obj.not && <Note>{obj.not}</Note>}
    </>
  );
}

function Fazilet({ data }: { data: string | string[] }) {
  const arr = Array.isArray(data) ? data : [data];
  return (
    <>
      {arr.map((f, i) => (
        <p key={i} className="mt-2 rounded-lg bg-navy-50 p-2.5 text-xs leading-relaxed text-navy-700 dark:bg-navy-950/30 dark:text-navy-400">
          {f}
        </p>
      ))}
    </>
  );
}

function OzelNamazCard({ n }: { n: OzelNamaz }) {
  const neZaman = n.ne_zaman_kilinir ?? n.ne_zaman_yapilir;
  return (
    <Section ikon={OZEL_IKON[n.id] ?? MoonStar} title={n.isim}>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <DurumBadge durum={n.durum} />
        {n.rekat && <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">{n.rekat}</span>}
      </div>
      {n.durum_aciklama && <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">{n.durum_aciklama}</p>}

      {neZaman && (
        <>
          <p className="mb-0.5 mt-2.5 text-[11px] font-bold uppercase tracking-wide text-navy-700 dark:text-navy-400">Ne Zaman?</p>
          <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">{neZaman}</p>
        </>
      )}
      {n.vakit && <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">Vakit: {n.vakit}</p>}
      {n.sebep && (
        <>
          <p className="mb-0.5 mt-2.5 text-[11px] font-bold uppercase tracking-wide text-navy-700 dark:text-navy-400">Sebep</p>
          <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">{n.sebep}</p>
        </>
      )}

      {n.mezhep_gorusleri && (
        <p className="mt-2 rounded-md border border-navy-200 bg-navy-50 p-2.5 text-xs leading-relaxed text-navy-800 dark:border-navy-800/40 dark:bg-navy-950/30 dark:text-navy-300">
          {n.mezhep_gorusleri}
        </p>
      )}

      {n.kuran_referansi && (
        <div className="mt-2.5 rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-900/60">
          <p className="text-[11px] font-bold uppercase tracking-wide text-navy-700 dark:text-navy-400">{n.kuran_referansi.sure} {n.kuran_referansi.ayet}</p>
          <p className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{n.kuran_referansi.metin}</p>
        </div>
      )}

      {Array.isArray(n.cesitleri) && (
        <div className="mt-3">
          <p className="mb-1 text-sm font-bold text-stone-900 dark:text-stone-50">Çeşitleri</p>
          {n.cesitleri.map((ce, i) => (
            <div key={i} className="mt-2 rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-900/60">
              <p className="text-sm font-bold text-stone-900 dark:text-stone-50">{ce.isim}</p>
              {ce.hicri_tarih && <p className="text-xs text-stone-400 dark:text-stone-500">{ce.hicri_tarih}</p>}
              {ce.aciklama && <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">{ce.aciklama}</p>}
              {ce.tekbir_notu && <Note>{ce.tekbir_notu}</Note>}
            </div>
          ))}
        </div>
      )}

      {Array.isArray(n.on_sartlar) && (
        <>
          <p className="mb-1 mt-3 text-sm font-bold text-stone-900 dark:text-stone-50">Ön Şartlar</p>
          <Bullets items={n.on_sartlar} />
        </>
      )}

      {n.niyet && (
        <>
          <p className="mb-1 mt-3 text-sm font-bold text-stone-900 dark:text-stone-50">Niyet</p>
          <Niyet niyet={n.niyet} />
        </>
      )}

      {(n.kilinic || n.kilinic_hanafi || n.kilinic_safii_hanbeli) && (
        <p className="mb-1 mt-3 text-sm font-bold text-stone-900 dark:text-stone-50">Nasıl Kılınır?</p>
      )}
      {n.kilinic && <Kilinic data={n.kilinic} />}
      {n.kilinic_hanafi && (
        <>
          <p className="mt-1.5 text-[11px] font-bold uppercase tracking-wide text-navy-700 dark:text-navy-400">Hanefî</p>
          <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">{n.kilinic_hanafi}</p>
        </>
      )}
      {n.kilinic_safii_hanbeli && (
        <>
          <p className="mt-1.5 text-[11px] font-bold uppercase tracking-wide text-navy-700 dark:text-navy-400">Şâfiî / Hanbelî</p>
          <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">{n.kilinic_safii_hanbeli}</p>
        </>
      )}
      {n.tavsiye_edilen_sureler && <Note>{n.tavsiye_edilen_sureler}</Note>}

      {n.teheccud_duasi && (<><p className="mb-1 mt-3 text-sm font-bold text-stone-900 dark:text-stone-50">Teheccüd Duası</p><DuaObjView obj={n.teheccud_duasi} /></>)}
      {n.istihare_duasi && (<><p className="mb-1 mt-3 text-sm font-bold text-stone-900 dark:text-stone-50">İstihare Duası</p><DuaObjView obj={n.istihare_duasi} /></>)}
      {n.hacet_duasi && (<><p className="mb-1 mt-3 text-sm font-bold text-stone-900 dark:text-stone-50">Hacet Duası</p><DuaObjView obj={n.hacet_duasi} anlamFallback={n.anlam} /></>)}
      {n.tovbe_duasi && (<><p className="mb-1 mt-3 text-sm font-bold text-stone-900 dark:text-stone-50">Tövbe Duası</p><DuaObjView obj={n.tovbe_duasi} /></>)}
      {n.secde_duasi && (<><p className="mb-1 mt-3 text-sm font-bold text-stone-900 dark:text-stone-50">Secde Duası</p><DuaObjView obj={n.secde_duasi} /></>)}
      {typeof n.dua === "string" && (<><p className="mb-1 mt-3 text-sm font-bold text-stone-900 dark:text-stone-50">Dua</p><DuaObjView obj={n.dua} /></>)}
      {n.teravih_arasi_tesbih && (<><p className="mb-1 mt-3 text-sm font-bold text-stone-900 dark:text-stone-50">Teravih Arası Tesbih</p><DuaObjView obj={n.teravih_arasi_tesbih} /></>)}
      {n.cenaze_duasi_kisa && <DuaObjView obj={n.cenaze_duasi_kisa} />}

      {n.istihare_sonucu && (
        <div className="mt-3">
          <p className="text-sm font-bold text-stone-900 dark:text-stone-50">{n.istihare_sonucu.aciklama}</p>
          <Bullets items={n.istihare_sonucu.maddeler ?? []} />
        </div>
      )}

      {Array.isArray(n.tovbe_sartlari) && (
        <>
          <p className="mb-1 mt-3 text-sm font-bold text-stone-900 dark:text-stone-50">Tövbe Şartları</p>
          <Bullets items={n.tovbe_sartlari} />
        </>
      )}

      {n.fazileti && (<><p className="mb-1 mt-3 text-sm font-bold text-stone-900 dark:text-stone-50">Fazileti</p><Fazilet data={n.fazileti} /></>)}

      {Array.isArray(n.ozel_notlar) && (
        <>
          <p className="mb-1 mt-3 text-sm font-bold text-stone-900 dark:text-stone-50">Özel Notlar</p>
          <Bullets items={n.ozel_notlar} />
        </>
      )}

      {n.hadis_kaynagi && (
        <p className="mt-3 text-[11px] font-bold text-navy-700 dark:text-navy-400">{getEvidenceLabel(n.hadis_kaynagi)}</p>
      )}
    </Section>
  );
}

export function OzelNamazlarTab() {
  return (
    <div className="mx-auto max-w-3xl">
      <p className="mb-4 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{O.aciklama}</p>

      <Section ikon={Table} title="Hızlı Bakış" defaultOpen>
        <div className="space-y-2">
          {O.hizli_bakis_tablosu.map((row, i) => (
            <div key={i} className="rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-900/60">
              <p className="text-sm font-bold text-stone-900 dark:text-stone-50">{row.isim}</p>
              <p className="text-xs text-stone-600 dark:text-stone-300">{row.durum}</p>
              <p className="text-[11px] text-stone-400 dark:text-stone-500">{row.rekat} · {row.vakit}</p>
            </div>
          ))}
        </div>
      </Section>

      {O.namazlar.map((n) => <OzelNamazCard key={n.id} n={n} />)}

      <p className="mt-6 text-center text-[11px] italic text-stone-400 dark:text-stone-500">{O.kaynak_not}</p>
    </div>
  );
}
