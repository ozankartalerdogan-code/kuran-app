import sayfaData from "./mushaf_sayfalari.json";

// Standart 604 sayfalık Medine mushafı düzeni — sayfa/cüz sınırları Tanzil
// quran-data.xml (cc-by) kaynaklı; mobil taraftaki src/lib/mushafSayfa.ts ile
// aynı JSON'un (mushaf_sayfalari.json) kopyasını kullanır.

export const SAYFA_SAYISI = 604;

const sayfalar = sayfaData.sayfaBaslangiclari as [number, number][];
const cuzler = sayfaData.cuzBaslangiclari as [number, number][];
const ayetSayilari = sayfaData.sureAyetSayilari as number[];

function karsilastir(s1: number, a1: number, s2: number, a2: number): number {
  return s1 !== s2 ? s1 - s2 : a1 - a2;
}

// Verilen ayeti içeren son "başlangıç ≤ ayet" girdisinin dizini (binary search).
function sonBaslangicIndeksi(liste: [number, number][], surahId: number, ayahNumber: number): number {
  let lo = 0, hi = liste.length - 1, ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [s, a] = liste[mid];
    if (karsilastir(s, a, surahId, ayahNumber) <= 0) { ans = mid; lo = mid + 1; }
    else hi = mid - 1;
  }
  return ans;
}

// Bir ayetin bulunduğu mushaf sayfası (1-604).
export function ayetinSayfasi(surahId: number, ayahNumber: number): number {
  return sonBaslangicIndeksi(sayfalar, surahId, ayahNumber) + 1;
}

// Sayfanın (ilk ayetine göre) cüzü (1-30).
export function sayfaninCuzu(page: number): number {
  const p = Math.min(SAYFA_SAYISI, Math.max(1, page));
  const [s, a] = sayfalar[p - 1];
  return sonBaslangicIndeksi(cuzler, s, a) + 1;
}

// Sayfanın başladığı surenin id'si (başlık göstergesi için).
export function sayfaBasSuresi(page: number): number {
  const p = Math.min(SAYFA_SAYISI, Math.max(1, page));
  return sayfalar[p - 1][0];
}

// Sayfanın kapsadığı ayet aralığı: [başlangıç, bir sonraki sayfanın başlangıcından
// bir önceki ayet]; son sayfa Nâs 114:6'da biter. (/api/mushaf route'undaki
// sayfaAraligi ile aynı mantık — DB sorgu aralığı için gerekli.)
export function sayfaAraligi(page: number) {
  const p = Math.min(SAYFA_SAYISI, Math.max(1, page));
  const [s1, a1] = sayfalar[p - 1];
  if (p === SAYFA_SAYISI) {
    return { bas: { surahId: s1, ayahNumber: a1 }, son: { surahId: 114, ayahNumber: ayetSayilari[113] } };
  }
  const [s2, a2] = sayfalar[p];
  const son = a2 > 1
    ? { surahId: s2, ayahNumber: a2 - 1 }
    : { surahId: s2 - 1, ayahNumber: ayetSayilari[s2 - 2] };
  return { bas: { surahId: s1, ayahNumber: a1 }, son };
}

// Batı rakamı → Arap-Hindi rakamı (ayet sonu işaretleri için): 12 → ١٢
const ARAP_RAKAM = "٠١٢٣٤٥٦٧٨٩";
export function arapRakam(n: number): string {
  return String(n).split("").map((d) => ARAP_RAKAM[Number(d)] ?? d).join("");
}

// Vakif isaretleri (U+06D6-06DC) ham arabic_text'te (Tanzil) SIRADAN bir
// bosluktan sonra gelir - basili mushafta isaret, kelime arasindaki bosluk
// uzerinde "yuzer" (kaynagin dogru/amacli kodlamasi; isaretin kendisi asla
// degistirilmez/silinmez). Mushaf sayfasi tek uzun/justified blok olarak
// aktiginda, satir kirma tam o bosluktan olursa isaret yeni satirin ilk
// karakteri olur; tabansiz kalinca kesikli daire (U+25CC, .notdef) cizilir.
// NBSP (U+00A0) ayni boslugu birebir korur (ayni genislik, ayni uzunluk),
// yalniz satir kirma noktasi OLMAZ - metin ve anlam degismez.
const VAKIF_ONCESI_BOSLUK = /\u0020(?=[\u06D6-\u06DC])/g;
export function vakifBosluguSabitle(text: string): string {
  return text.replace(VAKIF_ONCESI_BOSLUK, "\u00A0");
}
