// Tipler — veri content/harf_i_tarif.json içinde (scripts/_build-harf-i-tarif.mjs JSON üretir).
export type HarfTarifTip = "bilgi" | "kural" | "liste" | "ornekler" | "baglam" | "quiz" | "ozet";

export interface HarfTarifHarf { arapca: string; ad: string; okunusu: string; ornek_esma: string | null }
export interface HarfTarifOrnek { isim: string; arapca: string; anlam: string; harf: string; tip: "semsiye" | "kameriye"; aciklama: string }
export interface HarfTarifSoru { id: string; soru: string; harf: string; dogru_cevap: string; tip: "semsiye" | "kameriye"; aciklama: string }

export interface HarfTarifBolum {
  id: string;
  tip: HarfTarifTip;
  baslik: string;
  icerik?: string;
  alt_baslik?: string;
  hafiza_ipucu?: string;
  gorsel_aciklama?: string;
  not?: string;
  gorsel_ipucu?: string;
  ornek?: { dogru: string; yanlis: string; aciklama: string };
  harfler?: HarfTarifHarf[];
  ornekler?: HarfTarifOrnek[];
  sorular?: HarfTarifSoru[];
  maddeler?: string[];
}

export interface HarfTarifDers {
  id: string; baslik: string; seviye: string; sure: string;
  on_kosul: string; aciklama: string; bolumler: HarfTarifBolum[];
}

import trJson from "./content/harf_i_tarif.json";
import { localizedData } from "../i18n/localizedData";

// Ders içeriği content/harf_i_tarif.json (TR) / harf_i_tarif.en.json (EN) dosyalarında.
export const HARF_I_TARIF_DERSI: HarfTarifDers = trJson as HarfTarifDers;

export const harfITarifDersi = localizedData<HarfTarifDers>(
  HARF_I_TARIF_DERSI,
  () => require("./content/harf_i_tarif.en.json"),
);
