export interface KorunmaKategoriMeta {
  id:      string;
  ikon:    string;
  baslik:  string;
  aciklama: string;
}

export const KORUNMA_KATEGORILER: KorunmaKategoriMeta[] = [
  {
    id:      "korunma-genel",
    ikon:    "🛡️",
    baslik:  "Genel Korunma Kalkanı",
    aciklama: "Günlük korunma rutini — sabah/akşam okunan temel ayetler",
  },
  {
    id:      "korunma-sihir",
    ikon:    "✨",
    baslik:  "Büyü ve Sihir",
    aciklama: "Sihrin hakikati ve bozulması — Musa'nın sihirbazları yenmesi",
  },
  {
    id:      "korunma-nazar",
    ikon:    "👁️",
    baslik:  "Nazar — Göz Değmesi",
    aciklama: "Kötü bakışlardan ve hasetçi gözden korunma",
  },
  {
    id:      "korunma-hased",
    ikon:    "💚",
    baslik:  "Hased — Kıskançlık Şerri",
    aciklama: "Haset edenlerin ve vesvese veren şeytanın şerrinden sığınma",
  },
  {
    id:      "korunma-siginma",
    ikon:    "🤲",
    baslik:  "Şeytan Vesvesesi",
    aciklama: "Şeytanın vesveseleri ve yanımda bulunmasından Allah'a sığınma",
  },
  {
    id:      "korunma-sifa",
    ikon:    "💊",
    baslik:  "Şifa — Kur'an ile İyileşme",
    aciklama: "Zararı yalnız Allah giderir; Kur'an müminler için şifa ve rahmettir",
  },
];

export const TAG_KATEGORI: Record<string, string> = Object.fromEntries(
  KORUNMA_KATEGORILER.map((k) => [k.id, k.id])
);

export const KATEGORI_META: Record<string, KorunmaKategoriMeta> = Object.fromEntries(
  KORUNMA_KATEGORILER.map((k) => [k.id, k])
);
