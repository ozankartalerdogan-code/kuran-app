// Yeni ders eklemek için SADECE bu dosyayı güncelle.
// DERS_DATA, QUIZ_MAP, BASLIKLAR, DERSLER_META ve KATEGORILER buradan türetilir.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Kayit = { id: string; ikon: string; sure: number; kategori: string; ders: any; quiz: any };

// eslint-disable-next-line @typescript-eslint/no-require-imports
const KAYITLAR: Kayit[] = [
  { id: "namaz",         ikon: "🕌", sure: 15, kategori: "ibadet",  ders: require("./namaz_dersi.json"),              quiz: require("./namaz_quiz.json") },
  { id: "namaz-dualar",  ikon: "📿", sure: 10, kategori: "ibadet",  ders: require("./namaz_dualar_dersi.json"),        quiz: require("./namaz_dualar_quiz.json") },
  { id: "oruc",          ikon: "🌙", sure:  8, kategori: "ibadet",  ders: require("./oruc_dersi.json"),                quiz: require("./oruc_quiz.json") },
  { id: "hac-umre",      ikon: "🕋", sure:  9, kategori: "ibadet",  ders: require("./hac_umre_dersi.json"),            quiz: require("./hac_umre_quiz.json") },
  { id: "iman-esaslari", ikon: "📖", sure: 10, kategori: "akaid",   ders: require("./iman_esaslari_dersi.json"),       quiz: require("./iman_esaslari_quiz.json") },
  { id: "peygamberler",  ikon: "⭐", sure: 14, kategori: "siyer",   ders: require("./peygamber_kissalari_dersi.json"), quiz: require("./peygamber_kissalari_quiz.json") },
  { id: "siyer",         ikon: "🌿", sure: 10, kategori: "siyer",   ders: require("./siyer_dersi.json"),               quiz: require("./siyer_quiz.json") },
  { id: "tecvid",        ikon: "📜", sure: 12, kategori: "kuran",   ders: require("./tecvid_dersi.json"),              quiz: require("./tecvid_quiz.json") },
  { id: "abdest-gusul",  ikon: "💧", sure: 10, kategori: "ibadet",  ders: require("./abdest_dersi.json"),              quiz: require("./abdest_quiz.json") },
  { id: "ezan-kamet",    ikon: "🔊", sure:  7, kategori: "ibadet",  ders: require("./ezan_kamet_dersi.json"),          quiz: require("./ezan_kamet_quiz.json") },
  { id: "zekat",         ikon: "🤲", sure:  7, kategori: "ibadet",  ders: require("./zekat_dersi.json"),               quiz: require("./zekat_quiz.json") },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DERS_DATA: Record<string, any>    = Object.fromEntries(KAYITLAR.map(k => [k.id, k.ders]));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const QUIZ_MAP: Record<string, any>     = Object.fromEntries(KAYITLAR.map(k => [k.id, k.quiz]));
export const BASLIKLAR: Record<string, string> = Object.fromEntries(KAYITLAR.map(k => [k.id, (k.ders.baslik as string) ?? k.id]));

export const DERSLER_META = KAYITLAR.map(k => ({
  id:         k.id,
  baslik:     (k.ders.baslik as string) ?? k.id,
  ikon:       k.ikon,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  kartSayisi: ((k.ders.kartlar as any[]) ?? []).length,
  sure:       k.sure,
}));

export const KATEGORILER: { label: string; ids: string[] }[] = [
  { label: "Temel İbadetler", ids: ["abdest-gusul", "namaz", "namaz-dualar", "ezan-kamet", "oruc", "zekat", "hac-umre"] },
  { label: "İman & Akaid",    ids: ["iman-esaslari"] },
  { label: "Tarih & Siyer",   ids: ["peygamberler", "siyer"] },
  { label: "Kur'an & Tecvid", ids: ["tecvid"] },
];
