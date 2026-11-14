# Şehir seçimi + bildirim damgası — Codex (astra) denetimi, 2026-11-14

Aralık: 30415c36^..a506bdad. Claude henüz bulguları tek tek doğrulamadı (kota).


7. **Orta — Ekran okuyucu aynı adlı şehirleri ayıramıyor.**  
   **Konum:** [sehir-sec.tsx:200](C:/Projects/kuran_app/apps/mobile/app/sehir-sec.tsx:200).  
   **Senaryo:** Veride Colorado, Ohio ve Massachusetts için Springfield bulunuyor. Açık `accessibilityLabel` yalnız şehir adını içerdiğinden görsel alt açıklamadaki eyalet/ülke ayrımı erişilebilir etikette kayboluyor.  
   **Düzeltme:** Etikete eyalet ve ülkeyi de ekleyin.

8. **Düşük — Türkçe şehir adlarının harf dönüşümü hatalı.**  
   **Konum:** [diyanetPrayer.ts:150](C:/Projects/kuran_app/apps/mobile/src/lib/diyanetPrayer.ts:150).  
   **Senaryo:** Gerçek veriyle `AYDIN → Aydin`, `ISPARTA → İsparta` üretildi. Türkçe karakter içermeyen sözcükleri yabancı kabul eden kestirim yanlış.  
   **Düzeltme:** Harf dönüşümünü ülke/dil bilgisine göre yapın.

**Genel değerlendirme:** Şehir seçimi, önbellek ve bildirim planı aynı şehir bağlamını uçtan uca korumuyor; yüksek önem düzeyindeki bulgular giderilmeli. İncelenen arama yolunda konum/sorgu loglaması bulmadım; altyapı erişim logları doğrulanmadı. Yeni arayüz metinlerinin TR/EN karşılıkları mevcut. `diyanetPrayer.ts` değer importu içermiyor; `import.meta`/`createRequire` yalnız açıklama yorumunda geçiyor. Testler `spawn EPERM` nedeniyle çalıştırılamadı; cihaz üzerinde görsel doğrulama yapılmadı.
