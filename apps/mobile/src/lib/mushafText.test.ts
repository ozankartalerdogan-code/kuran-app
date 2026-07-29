/**
 * mushafSayfa.test.ts — KFGQPC işaret uyum haritası testleri.
 * Çalıştır: npm run test:mobile
 *
 * Bu eşleme 4985506'da eklenmiş, c766b2c'de ("restore omitted render helpers")
 * gövdesi silinip var olmayan bir mushafText modülüne re-export edilmişti;
 * çağrı da düştüğü için mushafta siyah noktalı daireler geri gelmişti.
 * Testler hem eşlemeyi hem de tecvid span'larının bağlı olduğu UZUNLUK
 * KORUNUMU sözleşmesini bağlar.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mushafMetniHazirla } from "./mushafText.ts";

test("KFGQPC glifi olmayan üç işaret kendi karşılığına eşlenir", () => {
  // Fontun bu üç cmap yuvasında gerçek glif yok; yerlerinde satır içi
  // "noktalı daire + siyah top" placeholder çizimi var.
  assert.equal(mushafMetniHazirla("۟"), "ْ", "yuvarlak sıfır → sükûn");
  assert.equal(mushafMetniHazirla("ۣ"), "ۜ", "küçük alt sin → küçük üst sin");
  assert.equal(mushafMetniHazirla("۫"), "۬", "işmam işareti");
});

test("çıktı uzunluğu girdiyle daima aynı (tecvid span indeksleri kaymaz)", () => {
  // Span'lar KOD NOKTASI koordinatlı; eşleme 1:1 olmazsa tüm renkler kayar.
  const ornekler = [
    "فَتُوبُوٓا۟ إِلَىٰ بَارِئِكُمْ",           // U+06DF (çoğul -û eki)
    "وَلَعَنَهُمُ ٱللَّهُ ۖ وَلَهُمْ",            // vakıf işareti + boşluk
    "إِنَّهُۥ هُوَ ٱلتَّوَّابُ ٱلرَّحِيمُ",        // U+06E5
    "يَـٰقَوْمِ إِنَّكُمْ ظَلَمْتُمْ",
  ];
  for (const metin of ornekler) {
    const hazir = mushafMetniHazirla(metin);
    assert.equal(
      Array.from(hazir).length,
      Array.from(metin).length,
      `kod noktası sayısı değişmemeli: "${metin}"`,
    );
    assert.equal(hazir.length, metin.length, "UTF-16 uzunluğu da değişmemeli");
  }
});

test("vakıf işareti öncesi boşluk NBSP olur (satır kırılıp tabansız kalmasın)", () => {
  // U+06D6-06DC ham Tanzil metninde sıradan boşluktan sonra gelir; satır tam
  // orada kırılırsa işaret yeni satırın ilk karakteri olur ve .notdef çizilir.
  const hazir = mushafMetniHazirla("عَلَيْكُمْ ۚ إِنَّهُۥ");
  assert.ok(hazir.includes(" ۚ"), "işaretten önceki boşluk NBSP olmalı");
  assert.ok(!hazir.includes(" ۚ"), "sıradan boşluk kalmamalı");
});

test("eşlenmeyen karakterlere ve normal boşluğa dokunulmaz", () => {
  const metin = "وَعَدَ ٱللَّهُ ٱلْمُنَٰفِقِينَ";   // eşlenecek işaret yok
  assert.equal(mushafMetniHazirla(metin), metin, "metin aynen kalmalı");
});

test("hiçbir işaret silinmez — yalnız yerine kondu", () => {
  const metin = "فَتُوبُوٓا۟";
  const hazir = mushafMetniHazirla(metin);
  assert.ok(!hazir.includes("۟"), "kaynak işaret kalmamalı");
  assert.ok(hazir.includes("ْ"), "karşılığı yerine geçmeli");
  // Harf iskeleti (işaretler atılınca kalan) değişmemeli: hat aynı.
  const iskelet = (s: string) => s.replace(/[\p{Mn}]/gu, "");
  assert.equal(iskelet(hazir), iskelet(metin), "harfler değişmemeli");
});
