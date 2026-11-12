// Elif-Ba ders içeriğinin İngilizce katmanı. Sunucu Türkçe içerik döner; burada
// Türkçe metne göre anahtarlanmış gömülü sözlük (elifba.en.json) üstüne bindirilir.
// Sözlük yalnız İngilizce arayüzde tembel yüklenir; yüklenemezse Türkçe kalır.
import type { Lang } from "../i18n";
import type { ElifbaDers, ElifbaHarf, ElifbaQuizSoru } from "./api";

export type ElifbaEnDict = {
  dersBaslik?: Record<string, string>;
  harfler?: Record<string, { harf_adi?: string; harf_sesi?: string; mahrec?: string }>;
  strings?: Record<string, string>;
};

let cached: ElifbaEnDict | undefined;

function loadDict(): ElifbaEnDict {
  if (cached === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const raw = require("../data/elifba.en.json") as ElifbaEnDict | null;
      cached = raw && typeof raw === "object" ? raw : {};
    } catch {
      cached = {};
    }
  }
  return cached;
}

const has = (o: Record<string, string> | undefined, k: string): o is Record<string, string> =>
  !!o && Object.prototype.hasOwnProperty.call(o, k) && typeof o[k] === "string" && o[k].length > 0;

export function localizeDersWith(dict: ElifbaEnDict, list: ElifbaDers[]): ElifbaDers[] {
  const m = dict.dersBaslik;
  return list.map((d) => (has(m, d.baslik) ? { ...d, baslik: m[d.baslik] } : d));
}

export function localizeHarflerWith(dict: ElifbaEnDict, list: ElifbaHarf[]): ElifbaHarf[] {
  const m = dict.harfler;
  return list.map((h) => {
    const e = m && Object.prototype.hasOwnProperty.call(m, h.harf_adi) ? m[h.harf_adi] : undefined;
    if (!e) return h;
    return {
      ...h,
      harf_adi: e.harf_adi || h.harf_adi,
      harf_sesi: e.harf_sesi || h.harf_sesi,
      mahrec: e.mahrec || h.mahrec,
    };
  });
}

// Tümü-ya-hiç: soru, tüm seçenekler, doğru cevap ve (varsa) ipucu çevrilebiliyorsa
// çevrilmiş kopya; aksi halde soru Türkçe kalır (bir soruda dil karışmaz).
export function localizeQuizWith(dict: ElifbaEnDict, list: ElifbaQuizSoru[]): ElifbaQuizSoru[] {
  const m = dict.strings;
  return list.map((q) => {
    if (!m || !Array.isArray(q.secenekler)) return q;
    const ok =
      has(m, q.soru) &&
      has(m, q.dogru_cevap) &&
      q.secenekler.every((s) => has(m, s)) &&
      (q.ipucu == null || q.ipucu === "" || has(m, q.ipucu));
    if (!ok) return q;
    return {
      ...q,
      soru: m[q.soru],
      secenekler: q.secenekler.map((s) => m[s]),
      dogru_cevap: m[q.dogru_cevap],
      ipucu: q.ipucu ? m[q.ipucu] : q.ipucu,
    };
  });
}

export function localizeDersler(list: ElifbaDers[], lang: Lang): ElifbaDers[] {
  return lang === "en" ? localizeDersWith(loadDict(), list) : list;
}

export function localizeHarfler(list: ElifbaHarf[], lang: Lang): ElifbaHarf[] {
  return lang === "en" ? localizeHarflerWith(loadDict(), list) : list;
}

export function localizeQuiz(list: ElifbaQuizSoru[], lang: Lang): ElifbaQuizSoru[] {
  return lang === "en" ? localizeQuizWith(loadDict(), list) : list;
}
