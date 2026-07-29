/**
 * mushafText.ts — mushaf metnini KFGQPC fontuyla gösterime hazırlayan SAF
 * yardımcılar. Sayfa/cüz düzeninden (mushafSayfa.ts) ayrı durur: o modül büyük
 * bir JSON import ettiği için testten doğrudan çekilemiyor; buradaki mantık
 * veriye bağımlı olmadığından test edilebilir kalmalı.
 *
 * mushafSayfa.ts bu iki fonksiyonu re-export eder — mevcut importlar bozulmaz.
 */

// Batı rakamı → Arap-Hindi rakamı (ayet sonu işaretleri için): 12 → ١٢
const ARAP_RAKAM = "٠١٢٣٤٥٦٧٨٩";
export function arapRakam(n: number): string {
  return String(n).split("").map((d) => ARAP_RAKAM[Number(d)] ?? d).join("");
}

// Vakıf işaretleri (U+06D6-06DC) ham arabic_text'te (Tanzil) SIRADAN bir
// boşluktan sonra gelir — basılı mushafta işaret, kelime arasındaki boşluğun
// üzerinde "yüzer" (kaynağın doğru/amaçlı kodlaması; işaretin kendisi asla
// değiştirilmez/silinmez). Mushaf sayfası tek uzun/justified blok olarak
// aktığında, satır kırma tam o boşluktan olursa işaret yeni satırın ilk
// karakteri olur; tabansız kalınca kesikli daire (U+25CC, .notdef) çizilir.
// NBSP (U+00A0) aynı boşluğu birebir korur (aynı genişlik, aynı uzunluk),
// yalnız satır kırma noktası OLMAZ — metin ve anlam değişmez.
const VAKIF_ONCESI_BOSLUK = / (?=[ۖ-ۜ])/g;

// Tanzil → KFGQPC işaret uyumu: KFGQPC HAFS fontu (paketteki v09 VE resmî v22
// dahil) Tanzil kodlamasındaki üç Kuran işareti için gerçek glif İÇERMEZ — o
// cmap yuvalarında satır içi "noktalı daire + siyah top" placeholder çizimi
// vardır (cihazda siyah leke olarak görülür; fontTools/HarfBuzz/PIL ile
// kanıtlandı — U+06DF glifinin advance genişliği 1442, elifin dört katı).
// KFGQPC'nin KENDİ mushaf metni aynı işaretler için şu karşılıkları kullanır
// (resmî v22 metninden aynı ayetlerde doğrulandı):
//   U+06DF yuvarlak sıfır (sessiz harf; çoğul -û eki, ~3988 yer) → U+0652 sükûn
//   U+06E3 küçük alt sin (52:37, tek yer)                        → U+06DC küçük üst sin
//   U+06EB işmam işareti (12:11, tek yer)                        → U+06EC
// Birebir 1:1 (uzunluk korunur, tecvid span'larının KOD NOKTASI indeksleri
// kaymaz) ve yalnız GÖRÜNTÜLEME anında uygulanır; veri değişmez, hiçbir işaret
// silinmez/filtrelenmez. Aynı desenin emsali: tajweed U+0672→U+0670.
const TANZIL_KFGQPC_UYUM = /[ۣ۟۫]/g;
const UYUM_TABLOSU: Record<string, string> = {
  "۟": "ْ",
  "ۣ": "ۜ",
  "۫": "۬",
};

/**
 * Mushaf metnini KFGQPC fontuyla gösterime hazırlar (uyum haritası + vakıf
 * öncesi NBSP). Çıktı uzunluğu daima girdiyle aynıdır — tecvid span'ları
 * bu sözleşmeye bağlıdır.
 */
export function mushafMetniHazirla(text: string): string {
  return text
    .replace(TANZIL_KFGQPC_UYUM, (ch) => UYUM_TABLOSU[ch] ?? ch)
    .replace(VAKIF_ONCESI_BOSLUK, " ");
}
