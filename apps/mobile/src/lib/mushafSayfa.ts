import sayfaData from "../data/mushaf_sayfalari.json";

// Standart 604 sayfalık Medine mushafı düzeni — sayfa/cüz sınırları Tanzil
// quran-data.xml (cc-by) kaynaklı; web API'deki /api/mushaf ucu aynı verinin
// kopyasını kullanır (iki taraf ayrışmasın diye üretilmiş tek JSON'dan).

export const SAYFA_SAYISI = 604;

const sayfalar = sayfaData.sayfaBaslangiclari as [number, number][];
const cuzler = sayfaData.cuzBaslangiclari as [number, number][];

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

// Tanzil -> KFGQPC isaret uyumu: KFGQPC HAFS fontu (paketteki v09 VE resmi
// v22 dahil) Tanzil kodlamasindaki uc Kuran isareti icin gercek glif ICERMEZ -
// o cmap yuvalarinda satir ici "noktali daire + siyah top" placeholder cizimi
// vardir (cihazda siyah leke olarak gorulur; fontTools/HarfBuzz/PIL ile
// kanitlandi). KFGQPC'nin KENDI mushaf metni ayni isaretler icin su
// karsiliklari kullanir (resmi v22 metninden ayni ayetlerde dogrulandi):
//   U+06DF yuvarlak sifir (sessiz harf; cogul -uu eki, ~3988 yer) -> U+0652 sukun
//   U+06E3 kucuk alt sin (52:37, tek yer)                         -> U+06DC kucuk ust sin
//   U+06EB ismam isareti (12:11, tek yer)                         -> U+06EC
// Birebir 1:1 (uzunluk korunur, aralik/indeks hesaplari kaymaz) ve yalniz
// GORUNTULEME aninda uygulanir; veri degismez, hicbir isaret silinmez/
// filtrelenmez. Ayni desenin emsali: tajweed.ts U+0672->U+0670 normalizasyonu.
const TANZIL_KFGQPC_UYUM = /[\u06DF\u06E3\u06EB]/g;
const UYUM_TABLOSU: Record<string, string> = {
  "\u06DF": "\u0652",
  "\u06E3": "\u06DC",
  "\u06EB": "\u06EC",
};

// Mushaf metnini KFGQPC fontuyla gosterime hazirlar (uyum haritasi + vakif
// oncesi NBSP). Cikti uzunlugu daima girdiyle aynidir.
export function mushafMetniHazirla(text: string): string {
  return text
    .replace(TANZIL_KFGQPC_UYUM, (ch) => UYUM_TABLOSU[ch] ?? ch)
    .replace(VAKIF_ONCESI_BOSLUK, "\u00A0");
}
