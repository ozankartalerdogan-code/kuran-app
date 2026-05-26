export interface NamazKategoriMeta {
  id: string;
  baslik: string;
  ikon: string;
}

export const NAMAZ_KATEGORILER: NamazKategoriMeta[] = [
  { id: "namaz-genel",     baslik: "Genel Namaz Emirleri", ikon: "🕌" },
  { id: "namaz-vakit",     baslik: "Namaz Vakitleri",       ikon: "🕐" },
  { id: "namaz-husu",      baslik: "Huşu",                  ikon: "🤲" },
  { id: "namaz-teheccud",  baslik: "Teheccüd Namazı",       ikon: "🌙" },
  { id: "namaz-cuma",      baslik: "Cuma Namazı",           ikon: "📿" },
  { id: "namaz-abdest",    baslik: "Abdest",                ikon: "💧" },
  { id: "namaz-korku",     baslik: "Korku Namazı",          ikon: "⚔️" },
  { id: "namaz-sefer",     baslik: "Seferi Namaz",          ikon: "🚶" },
];

// Her namaz-* etiketi kendi kategorisine 1-1 eşlenir
export const TAG_KATEGORI: Record<string, string> = {
  "namaz-genel":    "namaz-genel",
  "namaz-vakit":    "namaz-vakit",
  "namaz-husu":     "namaz-husu",
  "namaz-teheccud": "namaz-teheccud",
  "namaz-cuma":     "namaz-cuma",
  "namaz-abdest":   "namaz-abdest",
  "namaz-korku":    "namaz-korku",
  "namaz-sefer":    "namaz-sefer",
};

export const TAG_ISIM: Record<string, string> = {
  "namaz-genel":    "Genel Namaz Emirleri",
  "namaz-vakit":    "Namaz Vakitleri",
  "namaz-husu":     "Huşu",
  "namaz-teheccud": "Teheccüd Namazı",
  "namaz-cuma":     "Cuma Namazı",
  "namaz-abdest":   "Abdest",
  "namaz-korku":    "Korku Namazı",
  "namaz-sefer":    "Seferi Namaz",
};
