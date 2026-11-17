Salt okunur inceleme tamamlandı; dosya değiştirmedim. **133 hedefli test geçti.** İki hata ve bir koşullu Intl riski buldum. Üretim paketi üzerinde cihaz testi yapmadım.

1. **Yüksek — SRS “tekrar dene” işlemi yeni cevabı silebiliyor.**  
   [dersId].tsx:238–280 — [kod](/C:/Projects/kuran_app/apps/mobile/app/elifba/[dersId].tsx:238). Aynı desen `tekrar.tsx:124–165`, alıştırma ve dinleme modlarında da var.

   **Senaryo:** A cevabının yazılması başarısız → kullanıcı B sorusunu cevaplar → B kaydı sürerken hata kutusundaki “tekrar dene”ye basar → kuyruk önce A+B’yi, ardından eski A’yı yazar. B kaybolur; hata göstergesi kapanır.

   **Kanıt:**
   ```ts
   await storage.setJSON(STORAGE_KEYS.elifbaSrs, snapshot);
   // retryWrite:
   const snapshot = failedSnapshotRef.current;
   if (snapshot) persistSrs(snapshot);
   ```
   Gerçek callback’leri bellek içinde, geciktirilmiş depolamayla çalıştırdım: beklenen `{q1:1,q2:1}`, sonuç `{q1:1}`.

   **En küçük düzeltme:** Retry eski başarısız snapshot’ı değil güncel `srsRef.current` değerini kuyruğa alsın; eski sürümlerin daha yeni kayıtların ardından yazılmasını engelleyin.

2. **Yüksek — Olası: Intl uyumsuzluğu bildirim planını sessizce bozuyor.**  
   [prayerInstant.ts:32](/C:/Projects/kuran_app/apps/mobile/src/lib/prayerInstant.ts:32), [namazNotifications.ts:207](/C:/Projects/kuran_app/apps/mobile/src/lib/namazNotifications.ts:207).

   **Senaryo:** Diyanet kullanılamıyor, Aladhan takvimi geliyor; çalışma ortamında `formatToParts` eksik veya seçenekler uygulanmıyor.

   **Kanıt:**
   ```ts
   formatter.formatToParts(new Date(secondMs));
   // Eşleşmeyen adaylar da kabul ediliyor:
   return candidates.length > 0 ? Math.max(...candidates) : null;
   ```
   Bellek içi uyumsuzluk enjeksiyonunda `2026-11-17 18:00 Europe/Istanbul`:
   - Normal: `17 Kasım 15:00Z`.
   - `hourCycle` yok sayılırsa: **18 Kasım 03:00Z**.
   - `timeZone` yok sayılırsa: **17 Kasım 18:00Z**.
   - `formatToParts` eksikse: exception; takvim çağrısı `null` olur. Diyanet de boşsa yedi günlük plan **tek günlük yedeğe** düşer ve başarılı damgası yazılabilir.

   **En küçük düzeltme:** API varlığı ve dönüşüm doğruluğunu sınayın; destek yoksa aynı şehir/cihaz diliminde yedi günlük yerel dönüşümü koruyun. Geçersiz dönüşümü başarılı plan saymayın.

   **Sınır:** Bunlar üretim Hermes’inde gözlenmiş sonuçlar değil, koşullu reproduksiyonlar. [Hermes belgesi](https://github.com/meta/hermes/blob/static_h/doc/IntlAPIs.md) platform/sürüm davranış farklarını doğruluyor; paketinizdeki desteği tek başına kanıtlamıyor.

3. **Orta — Diyanet önbellek olayı erken gelirse otomatik düzeltme kaçıyor.**  
   [useDailyContent.ts:459](/C:/Projects/kuran_app/apps/mobile/src/hooks/useDailyContent.ts:459), [aynı dosya:528](/C:/Projects/kuran_app/apps/mobile/src/hooks/useDailyContent.ts:528).

   **Senaryo:** Ana sayfanın Diyanet isteği beklerken bildirim isteği başarılı olur ve olayı yayınlar → bayrak henüz `false`, olay atılır → ana sayfanın isteği başarısız olur, Aladhan gösterilir. Diyanet önbellekte hazır olsa da sonraki yenilemeye kadar uygulanmaz.

   **Kanıt:**
   ```ts
   if (!prayerFellBackRef.current || !isMountedRef.current) return;
   ```
   Bayrak ancak ilk Diyanet isteği bittikten sonra açılıyor.

   **En küçük düzeltme:** Önbellek olayının sürümünü saklayıp fallback’e geçerken kontrol edin; arada olay geldiyse bir kez yeniden okuyun.

Diğer alanlar, incelenen değişiklikler açısından **temiz**:

- Bildirim kuyruğu, `|t2` geçişi, çift plan ve iOS sınırı: yeni somut hata bulunmadı; üst sınır 62. Türkiye Diyanet yolu mevcut cihaz raporlarıyla uyumlu.
- Şehir kaydetme; SRS okuma hatasında yazmayı durdurma; eski veri biçimleri ve Harf-i Tarif birleştirmesi: ek bulgu yok.
- Web API: ek alan geriye uyumlu; SQL ve önbellek başlıklarında bulgu yok.
- Betikler: açık `--apply` ve hedef gerekiyor; varsayılan yol salt okunur.
- Boş veri, çevrimdışı akışlar ve deep link/`dismissTo`: ek somut çökme bulgusu yok.

**Yayına engel:** SRS retry veri kaybı (**1**). Intl riski (**2**), üretim paketinde ilgili dönüşümler doğrulanamazsa veya başarısızsa yayına engel.
---
**Claude notu:** Üç bulgu kodda doğrulandı ve düzeltildi (aynı commit). Bulgu 2 için A03 Hermes ölçümü: `intlZoneSupported()` = true, NY ve Berlin DST dönüşümleri beklenenle eşit, `hourCycle` h23.
