# Görev: Mobil arayüzü İngilizceye çevir

Önce `apps/mobile/src/i18n/README.md` dosyasını oku ve kurallara harfiyen uy.
Örnek: `apps/mobile/app/(tabs)/_layout.tsx` ve `apps/mobile/src/i18n/strings/tabs.ts`.

## Yapılacaklar

1. Aşağıdaki dosyalardaki Türkçe **arayüz** metinlerini `src/i18n/strings/*.ts`
   dosyalarına taşı ve İngilizce karşılıklarını yaz (doğal, kısa, App Store
   kalitesinde İngilizce). Öncelik sırası:
   - Sekmeler: `app/(tabs)/index.tsx`, `kuran.tsx`, `ogren.tsx`, `ibadet.tsx`, `daha-fazla.tsx`
   - `app/onboarding.tsx`, `src/tour/AppTourProvider.tsx`, `src/components/AppSplash.tsx`
   - `app/sure-listesi.tsx`, `app/surah/[id].tsx`, `app/ayah/[surahId]/[ayahNumber].tsx`,
     `app/mushaf-sayfa.tsx`, `app/mushaf/**`, `app/root/**`, `app/tafsir/[surahId].tsx`, `app/search.tsx`
   - `app/namaz.tsx`, `app/kible.tsx`, `app/hatim.tsx`, `src/components/HatimPanel.tsx`,
     `src/components/ZikirMatik.tsx`, `app/bildirimler.tsx`, `app/widget-ekle.tsx`
   - `app/dersler/**`, `app/elifba/**`, `app/ne-ogreneyim.tsx`
   - `app/dualar.tsx`, `app/hadisler.tsx`, `app/esma.tsx`, `app/siyer.tsx`,
     `app/peygamber-kissalari.tsx`, `app/mubarek-gunler.tsx`, `app/ibadet-rehberi.tsx`,
     `app/namaz-rehberi.tsx`, `app/manevi-siginak.tsx`, `app/manevi-siginak/**`
     (bu dosyalarda yalnız başlık/buton/etiket; içerik Türkçe kalır)
   - `app/favoriler.tsx`, `app/notlar.tsx`, `app/hakkinda.tsx`, `app/gizlilik.tsx` (yalnız başlık)
   - `app/_layout.tsx` (Stack başlıkları), `src/components/ErrorBoundary.tsx`,
     `src/components/ErrorFallback.tsx`, `src/components/AyahShareModal.tsx`
   - `src/lib/namazNotifications.ts` (bildirim başlık/metinleri — `getStrings`)
   - Android widget dosyalarına (`src/widgets/**`) DOKUNMA.
2. `app/(tabs)/daha-fazla.tsx` içine **Dil / Language** satırı ekle:
   seçenekler "Sistem / System", "Türkçe", "English";
   `getLangPreference()` / `setLangPreference()` kullan (`src/i18n/index.ts`).
   Mevcut satır stiline uy.
3. `src/i18n/index.ts` dosyasının API'sini değiştirme. İngilizce meal
   (`src/lib/englishMeal.ts`, `useMealOf` / `localizedMeal`) ekranlara zaten
   bağlı; bu çağrılara ve `EN_MEAL_SOURCE` başlığına dokunma.
   `app/ayah/[surahId]/[ayahNumber].tsx` içindeki "Elmalılı H. Yazır" başlığı
   özel isimdir, çevirme.
4. Her birkaç dosyada bir ve en sonda çalıştır:
   `npm run typecheck -w @quran-app/mobile` ve `npm run test:mobile` — ikisi de geçmeli.
   En sonda `npm run provenance:sources` çalıştır (hakkinda.tsx hash'i
   manifest'te tutuluyor), ardından `npm run test:provenance` geçmeli.
5. Commit ATMA. Bitince değiştirdiğin dosyaların listesini ve atladığın/emin
   olmadığın yerleri kısa bir rapor olarak yaz.
