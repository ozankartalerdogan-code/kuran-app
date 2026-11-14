# Mobil Düzeltme Denetimi (2026-11-14)

- **Madde 1 (Günlük vakit önbelleğine `cityKey` — `useDailyContent.ts`):** **DÜZELTİLDİ**
  - `PrayerCache.cityKey`, okuma/yazma (`prayerCityStampPart`) ve `isCurrent()` yarış kontrolleri doğruydu; Otomatik modda önbellek davranışı korunuyor.
  - **Düzeltilen kusur:** `if (manualCity !== null && !prayerCacheUsed)` koşulu yalnızca elle şehir seçiliyken eski vakitleri temizliyordu; kullanıcı elle seçilmiş bir şehirden **Otomatik** moda döndüğünde (`manualCity === null`) ve ağ yokken/geciktiğinde önbellek uyuşmadığı halde eski elle şehrin adı ve vakitleri ekranda kalıyordu. Koşul `!prayerCacheUsed && isCurrent()` olarak genelleştirildi ve Otomatik moda dönüşte `prayerCityState` varsayılana (`ISTANBUL.city`) sıfırlandı.
- **Madde 2 (Şehir etiketi rengi — `app/(tabs)/index.tsx`):** **TAMAM**
  - `countdownCity` metnine geri sayım metniyle aynı tema rengi (`c.isDark ? "#c7d2fe" : "#3730a3"`) doğru uygulanmış.
- **Madde 3 (`titleCaseTr` Türkçe I + `isTurkeyCountry` — `diyanetPrayer.ts`, `sehir-sec.tsx`, `useDailyContent.ts`):** **DÜZELTİLDİ**
  - `titleCaseTr(upper, turkish?)` ve `isTurkeyCountry` mantığı ile çağıran noktalar (`useDailyContent.ts`, `sehir-sec.tsx`) doğru; yabancı adlarda (`NORDRHEIN-WESTFALEN` → `Nordrhein-Westfalen`) sezgisel davranış korunmuş.
  - **Düzeltilen eksik:** `diyanetPrayer.test.ts` içine `"TÜRKİYE" → "Türkiye"` (`turkish=true`) birim testi eklendi.
- **Madde 4 (Bildirim ayarları elle şehir — `app/bildirimler.tsx`):** **TAMAM**
  - `getUserLocation()` başında `getManualCity(diyanetDeps())` kontrolüyle izin/GPS atlanıp `{ lat: manual.lat, lng: manual.lon, isFallback: false }` döndürülüyor.
- **Kurallar ve Görev Dışı Değişiklik Kontrolü:** **TAMAM**
  - Görev dışı değiştirilmiş izlenen dosya yok (`diyanetPrayer.ts` yalnız `import type` içeriyor, `import.meta`/`createRequire` yok, i18n ve log kurallarına uyulmuş).
- **Test ve Tip Kontrolü:** **TAMAM**
  - `node --test` (4 test dosyası): **60/60 geçti (0 hata)**.
  - `npx tsc --noEmit` (`apps/mobile`): **0 hata**.
  - `npx eslint` (değişen 5 dosya): **0 hata**.
