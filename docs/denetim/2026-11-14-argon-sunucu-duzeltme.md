# Diyanet Web Sunucusu Düzeltme Raporu (2026-11-14)

## Yapılan Değişiklikler
1. **Gün Kümesi Doğrulama ve Kısmi Ay Birleştirme (`apps/web/src/lib/vakitService.ts`):**
   - Hem depodan okunan (`cached`) hem de Diyanet'ten gelen günler istenen ayın (`startYmd..endYmd`) tarih aralığına göre filtrelendi, geçersiz kayıtlar elendi ve `date` anahtarlı `Map` ile tekilleştirildi.
   - Tamlık (`complete`) hesabı ham satır sayısı (`cached.length`) yerine normalize edilmiş benzersiz geçerli gün sayısına (`days.length === expectedDays`) bağlandı.
   - Yenileme sırasında depodaki geçerli günler ile yeni gelen geçerli günler tarih bazında birleştirildi (yeni gelen aynı tarihi ezer); hem yanıt hem `putDays` yazımı bu birleşim üzerinden üretildi.
2. **Saat Dilimi Uyuşmazlığı (`tzMismatch`) Olan Şehirlerin Çıkarılması (`scripts/build-diyanet-coords.mjs`, `apps/web/src/data/diyanetCities.json`):**
   - `scripts/build-diyanet-coords.mjs` içinde `result.tzMismatch === true` olan şehirler (`status === "pass"` olsa bile) koordinatları `null` ve `matchMethod = "rejected-tz-mismatch"` yapılarak yayımlanan listeden elendi; konsola çıkarılan şehir sayısı yazdırıldı.
   - Yayımlanmış `apps/web/src/data/diyanetCities.json` verisinden, yerel `data/diyanet/coords-verify.json` dosyasındaki `tzMismatch: true` kimlikleri ağ kullanılmadan yerel betik/filtreleme yoluyla çıkarıldı.
   - **Çıkarılan şehir sayısı:** `24` (`7540` → `7516` şehir; `8729` kimlikli OCALA listeden çıkarıldı).

## Test ve Doğrulama Sonuçları
- **Birim Testleri:** `node --test apps/web/src/lib/vakitService.test.ts apps/web/src/lib/diyanetVakit.test.ts apps/web/src/lib/diyanetSearch.test.ts apps/web/src/lib/diyanetClient.test.ts` → **50/50 geçti** (4 yeni `vakitService` senaryosu dahil).
- **TypeScript:** `apps/web` içinde `tsc --noEmit` → **0 hata**.

## Risk Notu
- `tzMismatch` nedeniyle çıkarılan 24 yurt dışı şehir `/api/vakit/sehir` ve `/api/vakit/sehirler` uç noktalarında görünmez; istemciler beklenen şekilde en yakın uyumlu şehre veya Aladhan yedeğine düşer. Türkiye şehirlerinde etkilenen kayıt yoktur.
