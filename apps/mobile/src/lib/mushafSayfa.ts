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
