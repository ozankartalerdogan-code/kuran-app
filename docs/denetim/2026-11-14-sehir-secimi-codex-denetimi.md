# Şehir seçimi + bildirim damgası — Codex (astra) denetimi, 2026-11-14

Aralık: 30415c36^..a506bdad. Claude henüz bulguları tek tek doğrulamadı (kota).

`30415c36^..a506bdad` aralığını denetledim. Dosya değiştirmedim.

1. **Yüksek — Bildirim ayarlarından açıldığında yedek vakitler yanlış şehirden geliyor.**  
   **Konum:** [namazNotifications.ts:565](C:/Projects/kuran_app/apps/mobile/src/lib/namazNotifications.ts:565), [bildirimler.tsx:27](C:/Projects/kuran_app/apps/mobile/app/bildirimler.tsx:27).  
   **Senaryo:** Elle Berlin seçiliyken İstanbul’daki kullanıcı bildirimleri ayarlardan açıyor. `location()` hâlâ GPS/İstanbul koordinatı döndürüyor. Diyanet’in eksik günleri Aladhan’dan bu koordinatlarla tamamlanıyor; plan Berlin damgasıyla kaydediliyor. Ayrıca gereksiz konum izni isteniyor.  
   **Düzeltme:** Bu akışta da önce elle seçilen şehrin koordinatlarını kullanın; Diyanet ve yedek sağlayıcıya aynı şehir bağlamını geçirin.

2. **Yüksek — Yeni şehir adı altında eski şehrin vakitleri gösterilebiliyor.**  
   **Konum:** [useDailyContent.ts:204](C:/Projects/kuran_app/apps/mobile/src/hooks/useDailyContent.ts:204), [useDailyContent.ts:325](C:/Projects/kuran_app/apps/mobile/src/hooks/useDailyContent.ts:325).  
   **Senaryo:** İstanbul vakitleri önbellekteyken Ankara seçiliyor. Önbellek yalnız tarihle doğrulanıyor; etiket hemen Ankara oluyor. Ağ başarısızsa İstanbul vakitleri ve geri sayımı Ankara adı altında kalıyor.  
   **Düzeltme:** Önbelleğe şehir kimliği ekleyin; şehir değiştiğinde uyumsuz vakitleri ve geri sayımı temizleyin.

3. **Yüksek — Uzak saat dilimindeki şehirlerde bildirim tarihi kayabiliyor.**  
   **Konum:** [diyanetPrayer.ts:287](C:/Projects/kuran_app/apps/mobile/src/lib/diyanetPrayer.ts:287), [diyanetPrayer.ts:105](C:/Projects/kuran_app/apps/mobile/src/lib/diyanetPrayer.ts:105), [namazNotifications.ts:365](C:/Projects/kuran_app/apps/mobile/src/lib/namazNotifications.ts:365).  
   **Senaryo:** İstanbul cihazında New York seçiliyor. New York’taki bir akşam vakti İstanbul’da ertesi güne düşebilir. ISO dönüşümü yalnız `HH:mm` tuttuğundan tarih kayboluyor; bildirim bu saatle kaynak günün cihaz tarihine kuruluyor, bir gün erken çalabiliyor veya geçmiş sayılarak atlanıyor.  
   **Düzeltme:** Bildirimler için tam ISO zamanını/epoch değerini koruyun; gün sınırlarını seçilen şehrin saat dilimiyle çözün.

4. **Orta — Yarış durumunda eski plan yeni şehir damgası alabiliyor.**  
   **Konum:** [namazNotifications.ts:532](C:/Projects/kuran_app/apps/mobile/src/lib/namazNotifications.ts:532), [namazNotifications.ts:646](C:/Projects/kuran_app/apps/mobile/src/lib/namazNotifications.ts:646), [sehir-sec.tsx:103](C:/Projects/kuran_app/apps/mobile/app/sehir-sec.tsx:103).  
   **Senaryo:** A şehri planlanırken kullanıcı B’yi seçiyor. Şehir kaydı bildirim kuyruğu dışında değişiyor; A’nın planı tamamlandığında damga yeniden okunup B oluyor. Kuyruktaki yeniden planlama normalde düzeltir; ancak arada süreç kapanırsa sonraki açılış A planını B’ye ait sanarak geri yükleyebilir.  
   **Düzeltme:** Şehir seçimini ve planlamayı aynı sıra/sürüm kontrolüne bağlayın; damgayı planın üretildiği şehirden oluşturun.

5. **Orta — Şehir kaydetme hatası başarı gibi işleniyor.**  
   **Konum:** [diyanetPrayer.ts:187](C:/Projects/kuran_app/apps/mobile/src/lib/diyanetPrayer.ts:187).  
   **Senaryo:** Depolama yazımı başarısız olduğunda `safeWrite` hatayı yutuyor; ekran kapanıp yenileme başlatılıyor fakat eski şehir kullanılıyor. Bunu hata fırlatan DI depolamasıyla doğruladım.  
   **Düzeltme:** Kullanıcı tercihi yazımında hatayı çağırana iletin; kayıt başarısızsa ekranda çevrilmiş hata gösterin.

6. **Orta — Ana sayfadaki şehir etiketi koyu tema rengini kaybetmiş.**  
   **Konum:** [index.tsx:368](C:/Projects/kuran_app/apps/mobile/app/(tabs)/index.tsx:368).  
   **Senaryo:** Metin, renk taşıyan üst `Text` içinden çıkarılmış; `countdownCity` yalnız kalınlık tanımlıyor. Koyu temada uygun metin rengi garanti edilmiyor.  
   **Düzeltme:** Şehir metnine açık/koyu temaya uygun rengi doğrudan uygulayın.

7. **Orta — Ekran okuyucu aynı adlı şehirleri ayıramıyor.**  
   **Konum:** [sehir-sec.tsx:200](C:/Projects/kuran_app/apps/mobile/app/sehir-sec.tsx:200).  
   **Senaryo:** Veride Colorado, Ohio ve Massachusetts için Springfield bulunuyor. Açık `accessibilityLabel` yalnız şehir adını içerdiğinden görsel alt açıklamadaki eyalet/ülke ayrımı erişilebilir etikette kayboluyor.  
   **Düzeltme:** Etikete eyalet ve ülkeyi de ekleyin.

8. **Düşük — Türkçe şehir adlarının harf dönüşümü hatalı.**  
   **Konum:** [diyanetPrayer.ts:150](C:/Projects/kuran_app/apps/mobile/src/lib/diyanetPrayer.ts:150).  
   **Senaryo:** Gerçek veriyle `AYDIN → Aydin`, `ISPARTA → İsparta` üretildi. Türkçe karakter içermeyen sözcükleri yabancı kabul eden kestirim yanlış.  
   **Düzeltme:** Harf dönüşümünü ülke/dil bilgisine göre yapın.

**Genel değerlendirme:** Şehir seçimi, önbellek ve bildirim planı aynı şehir bağlamını uçtan uca korumuyor; yüksek önem düzeyindeki bulgular giderilmeli. İncelenen arama yolunda konum/sorgu loglaması bulmadım; altyapı erişim logları doğrulanmadı. Yeni arayüz metinlerinin TR/EN karşılıkları mevcut. `diyanetPrayer.ts` değer importu içermiyor; `import.meta`/`createRequire` yalnız açıklama yorumunda geçiyor. Testler `spawn EPERM` nedeniyle çalıştırılamadı; cihaz üzerinde görsel doğrulama yapılmadı.
