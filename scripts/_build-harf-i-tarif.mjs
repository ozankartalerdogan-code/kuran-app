/**
 * _build-harf-i-tarif.mjs
 * data/semsiye_kameriye_dersi.json → tipli TS ders modülü (web + mobil tek kaynaktan).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const j = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "semsiye_kameriye_dersi.json"), "utf-8"));
const d = j.ders;
const lesson = {
  id: d.id, baslik: d.baslik, seviye: d.seviye, sure: d.sure,
  on_kosul: d.on_kosul, aciklama: d.aciklama, bolumler: d.bolumler,
};

const TYPES = `// OTOMATİK ÜRETİLDİ — scripts/_build-harf-i-tarif.mjs (kaynak: data/semsiye_kameriye_dersi.json)
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
`;

const ts = `${TYPES}\nexport const HARF_I_TARIF_DERSI: HarfTarifDers = ${JSON.stringify(lesson, null, 2)};\n`;

const targets = [
  path.join(ROOT, "apps", "web", "src", "data", "harf-i-tarif-dersi.ts"),

];
for (const t of targets) {
  fs.writeFileSync(t, ts, "utf-8");
  console.log(`✅ yazildi: ${path.relative(ROOT, t)} (${lesson.bolumler.length} bölüm)`);
}

// Mobil: ders verisi JSON (harfITarifDersi.ts yalnız tip + localizedData sarmalayıcısı; elle bakımlı).
const mobileJson = path.join(ROOT, "apps", "mobile", "src", "data", "content", "harf_i_tarif.json");
fs.writeFileSync(mobileJson, JSON.stringify(lesson, null, 2) + "\n", "utf-8");
console.log(`✅ yazildi: ${path.relative(ROOT, mobileJson)} (EN karşılığı harf_i_tarif.en.json elle/çeviriyle güncellenir)`);
