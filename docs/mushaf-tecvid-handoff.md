# Mushaf / Tecvid Handoff

Son güncelleme: 2026-07-16 (Europe/Istanbul)

## Durum

Yerel kanonik Mushaf mimarisi ve otomatik veri doğrulamaları tamamlandı. Tanzil Uthmani 1.1 metni tecvid açık ve kapalı durumda aynı render metnidir; AlQuran.cloud verisi yalnız ayrı renk aralıklarının kaynağıdır. Başarısız veya belirsiz eşleşmeler renksiz bırakılır.

Production Turso'ya yazılmadı. AAB üretilmedi. Debug APK üretildi ve emülatöre kuruldu; ekran/piksel kontrolü ve fiziksel cihaz kontrolü tamamlanmadı. Production kapısı kapalıdır.

## Değişmez Tanzil kaynağı

- Dosya: data/vendor/tanzil/uthmani-1.1/quran-uthmani.txt
- Manifest: data/vendor/tanzil/uthmani-1.1/manifest.json
- Kaynak: Tanzil Quran Text — Uthmani 1.1, 2021-02-12
- Lisans: CC BY 3.0; Tanzil.net atfı/linki ve metni değiştirmeden dağıtma şartı
- Beklenen ve gerçek SHA-256: 7f30c647331a61100ebf24a80507dc0fcdd9f2df97f1312b5b2dfcb982a7f326
- 6.236 ayetten kaynağı yeniden oluşturan SHA-256 da aynıdır.
- Build/import kodu vendor dosyasına yazmaz; yalnız data/generated/quran alanını üretir.
- Vendor dosyası bu çalışma ağacında yeni kaynak olduğundan önceki Git blob'u yoktu. Değişmezlik kanıtı manifest SHA, gerçek dosya SHA ve reconstructed SHA üçlü eşitliğidir.

## Uygulanan mimari

1. scripts/build-quran-runtime.mjs vendor dosyasını byte kaybı olmadan okur; normalize, replace, sanitize, trim veya combining-mark sıralaması uygulamaz.
2. Ayrı generated çıktılar: verses.json, basmala-ranges.json, tajweed-spans.json, tajweed-coverage.json ve build-manifest.json.
3. Yerel verses.arabic_text, Tanzil ile byte ve code point düzeyinde eşittir.
4. Besmele hardcoded değildir; aynı kanonik ayet stringi için code-point range metadata üretilir.
5. Tecvid açık/kapalı iki modda da aynı arabic_text render edilir.
6. Tecvid açıkken ayrı tajweed_spans uygulanır; kapalıyken aynı metin siyah gösterilir.
7. arabic_tajweed kullanıcıya render edilmez ve Tanzil metnine yazılmaz.
8. Token/cluster eşleşmesi kesin değilse span üretilmez; alan uncoloredRanges içinde kaydedilir.
9. API/cache sürümü yükseltildi. Turso migration betiği backup, dry-run, ayet sayısı ve SHA kontrolleriyle hazırlandı ama çalıştırılmadı.
10. Native Android katmanı renkleri aynı string üzerine uygular; JS/Kotlin hash-readback teşhisi eklidir.

## Tecvid sayıları

| Statü | Ayet | Açıklama |
| --- | ---: | --- |
| mapped | 5.838 | En az bir güvenli span var; ayetin başka bölümleri renksiz olabilir. |
| token-count-mismatch | 259 | Token sayısı farklı; ayetin tamamı renksiz ve span sayısı sıfır. |
| no-rule-clusters | 60 | Tanınan kural cluster'ı yok; span yok. |
| unmapped-rule-clusters | 79 | Kural var ama hiçbiri güvenle taşınamadı; span yok. |

Kalan 139 ayet = 60 + 79'dur; 259 token-count mismatch ayetinden ayrıdır.

- Eşleşmeyen kelime: 11.199; 3.693 ayet.
- Belirsiz cluster: 27.731; 5.629 ayet.
- Birleşik etkilenen ayet: 6.009.
- Eşleşen token: 71.260.
- Renk span'ı: 41.544.
- Tanınan kural cluster'ı: 87.666.
- Güvenle eşlenen kural cluster'ı: 42.945.
- Esas tecvid coverage: yüzde 48,9871 = 42.945 / 87.666.
- En az bir span içeren ayet oranı: yüzde 93,6177.
- Token hizalama oranı: yüzde 86,4187.

Yüzde 93,6177 ayet oranıdır; karakter veya kural coverage değildir.

En yüksek etki sureleri:
Bakara 2: 2.925; Nisa 4: 1.665; Âl-i İmran 3: 1.638; Araf 7: 1.585; Enam 6: 1.437; Maide 5: 1.329; Tevbe 9: 1.101; Mümin 40: 1.029; Hud 11: 978; Ahzab 33: 936.

En yüksek etki sayfaları:
435: 166; 439: 165; 429: 156; 423: 149; 425: 144; 433: 143; 434: 140; 436: 137; 430: 135; 438: 129; 470: 125; 469: 124; 424: 119; 431: 118; 471: 118.

## Yanlış renklendirmeme testi

scripts/quran-runtime.test.mjs şu garantileri tüm ayetlerde doğrular:

- Span ve renksiz range sınırları kanonik string içindedir.
- Renk span'ı unmatched-token, ambiguous-cluster veya token-count-mismatch range'iyle kesişmez.
- 259 token-count mismatch ayetinde span yoktur ve tüm ayet renksizdir.
- 60 + 79 ayette span yoktur.
- Span uygulaması metin karakterlerini değiştirmez.

Sonuç: 9/9 test geçti.

## Değiştirilen dosyalar

Kanonik veri/import/test:
- .gitattributes, .gitignore ve kök package.json
- data/vendor/tanzil/uthmani-1.1/*
- data/generated/quran/*
- scripts/build-quran-runtime.mjs
- scripts/quran-runtime.test.mjs
- scripts/migrate-quran-runtime-turso.mjs
- packages/core/src/adapters/quranArabic.ts ve quranAdapter.ts
- packages/core/src/index.ts
- packages/core/src/pipeline/buildNormalizedCaches.ts
- packages/core/src/pipeline/auditNormalizedCaches.ts
- packages/core/src/pipeline/buildCoverageReport.ts
- packages/core/src/pipeline/buildFinalReadinessReport.ts
- scripts/audit-v4-canonical-optin-1000.ts
- scripts/audit-verse-analysis-global.ts
- scripts/build-core-analysis-db.py

Runtime/API/UI:
- apps/web/src/lib/dbUtils.ts
- apps/web/src/app/api/mushaf/route.ts ve ayah/route.ts
- apps/web/src/app/mushaf-sayfa/[page]/*
- apps/mobile/src/lib/api.ts, tajweed.ts, mushafCanonical.ts ve testi
- apps/mobile/src/components/TajweedText.tsx
- apps/mobile/app/mushaf-sayfa.tsx
- apps/mobile/app/ayah/[surahId]/[ayahNumber].tsx
- apps/mobile/modules/tajweed-text/index.tsx
- apps/mobile/modules/tajweed-text/android/src/main/java/expo/modules/tajweedtext/TajweedTextModule.kt
- apps/mobile/app/hakkinda.tsx ve apps/web/src/app/hakkinda/page.tsx

Android debug:
- apps/mobile/package.json
- scripts/prepare-expo-android-debug.mjs
- scripts/expo-autolinking-path-alias.mjs
- scripts/node-realpath-path-alias.cjs

Kullanıcıya ait docs/yayin-oncesi-final-denetim-raporu.md değiştirilmedi ve commitlere dahil edilmemelidir.

## Çalışan komutlar

- npm run build:quran
  - 6.236 ayet; source ve reconstructed SHA eşit.
- npm run test:quran
  - 9/9 geçti.
- npm run test:mobile
  - 129/129 ge?ti; Mushaf kanonik metin, toggle hash, span s?n?rlar? ve native readback testleri dahil.
- npm run typecheck -w @quran-app/mobile
  - Hatas?z ge?ti.
- node scripts/prepare-expo-android-debug.mjs
  - MainApplication does not exist hatası çözüldü.
  - Paket com.kuranapp.mobile.
- Android debug APK:
  - subst R: "C:/Users/jalek/OneDrive/Masaüstü/kuran_app"
  - EXPO_ANDROID_REAL_ROOT gerçek workspace yoludur.
  - EXPO_ANDROID_PATH_ALIAS_ROOT değeri R:/ olmalıdır.
  - NODE_OPTIONS değeri --require=R:/scripts/node-realpath-path-alias.cjs olmalıdır.
  - R:/apps/mobile/android altında .\gradlew.bat app:assembleDebug --no-daemon çalıştırıldı.
  - BUILD SUCCESSFUL; 737 görev; 21m14s; AAB değildir.

Debug çıktı:
- APK: apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
- Boyut: 261.266.481 byte
- SHA-256: 800ceb5e1fcbfa71dea8e45f0f1eb559ff1286db3d68c0ab4c4559866b07000d
- Medium_Phone / emulator-5554 üzerine kuruldu.
- adb shell pm path com.kuranapp.mobile başarılı.

## Bilinen sorunlar

1. Fiziksel Android cihaz bağlı değildi; yalnız emulator-5554 görüldü.
2. APK kuruldu fakat Metro açılıp sayfa 2–3 ve yoğun tecvid sayfaları son APK ile görsel incelenmedi.
3. Açık-kapalı-açık toggle, JS/native readback hash ve ekran görüntüsü cihazda yeniden kaydedilmedi.
4. Güvenli rule-cluster coverage yüzde 48,9871; geniş alanlar yanlış renkten kaçınmak için renksizdir. Ürün kabul eşiği gerekir.
5. 259 ayet tamamen renksizdir; ayrıca 79 kural taşıyan ayette güvenli span yoktur.
6. Unicode workspace yolu için debug build geçici R sürücü aliası ve koşullu preload kullanır. Env yoksa standart Expo yolu çalışır.
7. Production Turso değiştirilmedi; migration yalnız hazırlanmıştır.
8. AAB üretilmedi.
9. Gradle deprecation ve SDK XML sürüm uyarıları debug build'i engellemedi.
10. Generated apps/mobile/android dizini Git tarafından ignore edilir.

## Sıradaki kesin adımlar

1. Fiziksel cihazı USB debugging ile bağla ve adb devices -l içinde device olarak doğrula.
2. Debug APK'yı adb install -r -d ile fiziksel cihaza kur.
3. Metro'yu dev-client modunda başlat ve uygulamayı aç.
4. Bakara sayfa 2–3'te بِمَآ, سَوَآءٌ, ٱلْـَٔاخِرِ, إِلَّآ, أَلَآ, كَمَآ, ءَامَنَّا ve vakıf işaretlerini iki toggle durumunda kontrol et.
5. Yoğun/fallback sayfaları 423, 429, 435, 439 ve 470'i kontrol et; renksiz fallback yanlış harf boyamamalıdır.
6. Açık-kapalı-açık sırasında JS hash, Kotlin alınan hash/readback ve görünür metnin değişmediğini kaydet.
7. UthmanicHafs ekran görüntülerini referans Mushafla karşılaştır; shaping sapmalarını ayrı raporla.
8. Fiziksel cihaz ve coverage ürün kararı geçmeden production migration çalıştırma.
9. Onay sonrası önce backup, Turso dry-run, 6.236 ayet ve SHA kontrolü yap; ancak ayrı açık yetkiyle production yaz.
10. Production sonrası API/cache vNext smoke testlerini çalıştır; AAB ayrı yayın kapısıdır.

## Production kararı

Production migration'a hazır değil. Veri mimarisi ve güvenli renksiz fallback otomatik testlerden geçiyor; fakat fiziksel cihaz sonucu yok, görsel/toggle hash kanıtı tamamlanmadı ve yüzde 48,9871 coverage için ürün kabul kararı alınmadı. Kullanıcı ayrıca production Turso ve AAB işlemlerini açıkça yasakladı.
