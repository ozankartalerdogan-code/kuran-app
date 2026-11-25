# iOS Hazırlık İş Planı (23 Kasım 2026, Neon incelemesiyle güncel)

Kaynaklar: Neon iOS uyumluluk raporu (`2026-11-23-neon-ios-uyumluluk.md`) ve Neon plan incelemesi (`2026-11-23-neon-ios-plan-incelemesi.md`). Bulgular Claude tarafından kodda doğrulandı.
Durum: Android 1.2.4 (vc 24) Play incelemesinde. iOS'ta Apple 4.2 itirazı (11 Kasım) cevap bekliyor; 1.2.1 ve sonrası iOS'a gönderilmedi.
Kural: Her aşama ayrı dalda, küçük commit'lerle; master'a birleştirme, bulut derleme ve App Store gönderimi kullanıcı onayıyla.

**Sıra değişikliği (Neon):** TestFlight iç testi App Review'a gitmez ve itirazı etkilemez → Aşama 1–4 itiraz beklenirken yapılır; yalnız Aşama 5 (incelemeye gönderme) itiraz sonucunu bekler.

## İlerleme (23 Kasım, dal feat/ios-hazirlik)

- [x] Aşama 1 — e8b2f1f9 (introspect: mikrofon yok, privacy nedenleri doğru; test:mobile 550/550)
- [x] Aşama 2 — 496f002b (MMKV + Nitro kaldırıldı; Mushaf tecvid tercihi yüklenmiyordu, düzeltildi). A03'te temiz debug derleme üstüne kurulum: 25 kullanıcı anahtarı birebir aynı, seri/şehir/sayfa/hatim/favori yerinde, tecvid kapalı tercihi korunuyor. Not: paket kaldırınca `android/app/.cxx` silinmeli (yoksa `clean` CMake'te düşer).
- [x] 3.1/3.2 — EAS production'da GOOGLE_SERVICES_PLIST, SENTRY_AUTH_TOKEN, EXPO_PUBLIC_SENTRY_DSN var. 3.4 ikon 1024², alfa yok. iOS uzak derleme no 4 → sıradaki 5.
- [ ] 3.3 Push yeteneği, 3.5 ascAppId/appleTeamId — kullanıcı (App Store Connect oturumu gerekli).
- [x] Aşama 5 hazırlık — /privacy/en ve /support (ed465856, canlıya master birleştirmesiyle); İngilizce inceleme notu docs/store/listing.en.md.
- [ ] Aşama 4 — EAS iOS bulut derlemesi: kullanıcı onayı bekliyor.
- [ ] Widget kaydı cihaz testi (1.5) — vc 25 kilit ekranı widget testiyle.

---

## Aşama 1 — Kesin düzeltmeler (kod; Android vc 25 ile birlikte çıkabilir)

| # | İş | Dosya | Doğrulama |
|---|----|-------|-----------|
| 1.1 | iOS mikrofon iznini kapat: `['expo-audio', { recordAudioAndroid: false, microphonePermission: false }]` | `apps/mobile/app.config.js:216` | `npx expo config --type introspect` çıktısında `NSMicrophoneUsageDescription` yok |
| 1.2 | Kıble izin metni: `permBodyIos` (TR "Ayarlar → Kuran Yolu → Konum", EN "Settings → Kuran Yolu → Location"), iOS'ta onu göster. 3. konum denemesi `Accuracy.High` → `Balanced` (gizlilik metni "hassas konum yok" diyor) | `src/i18n/strings/kible.ts:7,36`, `app/kible.tsx:318,383` | Typecheck (tr/en anahtarları eşleşmeli) + Android'de metin aynı |
| 1.3 | "Hakkında" e-posta: `canOpenURL` kaldır, doğrudan `openURL` + `catch` içinde uyarı (gizlilik.tsx deseni). Apple belgesi: kayıtsız şemada `canOpenURL` hep `false` | `app/hakkinda.tsx:24-41` | Android'de e-posta uygulaması açılıyor |
| 1.4 | Gizlilik bildirimi: FileTimestamp → `['C617.1']`, DiskSpace → `['E174.1']` (`0A2A.1`/`85F4.1` yalnız SDK'lara ait; expo-file-system kendi manifestinde zaten beyan ediyor) | `app.config.js:60-61` | introspect çıktısı |
| 1.5 | `index.js` widget kaydını `Platform.OS === 'android'` ile sar | `apps/mobile/index.js:10-18` | A03: widget ekle + ↻ + vakit güncellemesi |
| 1.6 | Firebase Auth: `['@react-native-firebase/auth', { ios: { captchaOpenUrlFix: false } }]` (yalnız anonim giriş; AppDelegate yaması riski ilk derlemeden önce kalkar) | `app.config.js:223` | introspect / prebuild |
| 1.7 | `removeClippedSubviews={Platform.OS === "android"}` (search.tsx'teki gibi) | `mushaf-sayfa.tsx:648`, `surah/[id].tsx:307`, `tafsir/[surahId].tsx:179`, `root/[root]/index.tsx:349` | Android'de davranış aynı |

## Aşama 2 — MMKV'yi kaldır (KARAR: Seçenek A — Claude + Neon)

- Bugün MMKV hiç açılmıyor (`new MMKV()` v4'te yok); her şey zaten AsyncStorage'da → kaldırmak davranışı değiştirmez.
- B (düzeltmek) neden riskli (Neon, kodda görüldü): `remove()` yalnız MMKV'den siliyor, AsyncStorage'daki eski kopya sonraki okumada geri "diriliyor" (bulut yedeği kapatma bayrağı, dil seçimi, bildirim damgası); ilk açılışta Kuran sekmesi migrasyon bitmeden boş görünebilir.
- Yapılacak: `react-native-mmkv` + `react-native-nitro-modules` paketlerini kaldır (başka kullanan yok, doğrulandı); `src/lib/storage.ts` sadeleştir; `app/(tabs)/kuran.tsx` içindeki `usingMmkv` dalını kaldır; `*Sync` okuma yardımcıları `null` dönecek şekilde bırakılabilir ya da temizlenir.
- Kazanç: iOS'ta Nitro + `useFrameworks: 'static'` derleme riski kalkar, Android AAB küçülür.
- Dikkat: Kaldırınca temiz prebuild + temiz Gradle derlemesi (eski CMake/JNI artığı kalmasın); A03'te vc 24 → yeni sürüm yükseltme testi (favori, not, hatim, dil, tema korunuyor mu).

## Aşama 3 — EAS / Apple ön kontrol

| # | İş | Sahip |
|---|----|-------|
| 3.1 | EAS'te `GOOGLE_SERVICES_PLIST` (file) var mı — `npx eas env:list --environment production`; yoksa Firebase'den plist indirilip yüklenir | Kullanıcı penceresi |
| 3.2 | `SENTRY_AUTH_TOKEN` ve `EXPO_PUBLIC_SENTRY_DSN` EAS'te var mı | Kullanıcı penceresi |
| 3.3 | Apple Developer: `com.kuranapp.mobile` App ID'de Push Notifications açık mı | Chrome / Claude |
| 3.4 | `assets/icon.png` 1024×1024, saydamlıksız | Claude |
| 3.5 | `eas.json` → `submit.production.ios` içine `ascAppId` + `appleTeamId`; `eas build:version:get -p ios` ile derleme numarası çakışması yok | Claude + kullanıcı |
| 3.6 | Kök ve mobil `expo` sürüm eşitleme (~56.0.12 / ~56.0.15) → **vc 25'ten ayrı dal, sonra** | Claude |

## Aşama 4 — İlk iOS derlemesi + iPhone'suz test (itirazı beklemeden)

- `eas build -p ios --profile production` → TestFlight iç test (kullanıcı onayıyla; bulut kotası).
- Test yolu (fiziksel iPhone yok varsayımıyla):
  1. **BrowserStack App Live** (gerçek bulut iPhone, tarayıcıdan): arayüz, açık/koyu tema, TR/EN, çentik boşlukları, Mushaf sayfa çevirme, e-posta bağlantısı, sahte konumla namaz vakti, bildirim izni. Pusula dönüşü burada test EDİLEMEZ.
  2. **Tanıdık bir iPhone'a TestFlight** (~15 dk): Kıble pusulasını çevirme, kilit ekranında bildirim gelişi.
  3. Simülatör yalnız mağaza ekran görüntüsü için (bildirim/pusula çalışmaz).

## Aşama 5 — App Store gönderimi (itiraz sonuçlanınca)

- **Sürüm:** iOS'ta da Android'deki sürüm (1.2.4, vc 25 çıktıysa 1.2.5); derleme numarası EAS uzak sayaçtan.
- **Ekran görüntüleri:** TR ve EN mağaza sayfası için ayrı, gerçek arayüz (iPhone 6.9" 1320×2868 veya 6.3"). iPad gerekmez (`supportsTablet: false`; prebuild sonrası `TARGETED_DEVICE_FAMILY=1` doğrula).
- **URL'ler:** Web gizlilik sayfası (`apps/web/src/app/privacy`) yalnız Türkçe → İngilizce sürüm (veya TR/EN geçişi) eklenmeli; çalışan bir Destek URL'si (iletişim + kısa yardım) gerekli.
- **App Privacy beyanı:** Ürün etkileşimi (Firebase Analytics), çökme/tanılama (Sentry), kullanıcı kimliği (anonim UID), yaklaşık konum, diğer kullanıcı içeriği (bulut yedeği favori/not) — hepsi "Sana bağlı değil", "İzleme yok".
- **Yaş derecelendirmesi:** 2026 anketi (sosyal medya, paylaşılan konum soruları dahil) → 4+; "Made for Kids" İŞARETLENMEZ.
- Gerekmeyenler: Sign in with Apple (yalnız anonim giriş), şifreleme beyanı (`usesNonExemptEncryption: false` hazır).
- **İnceleme notu (İngilizce):** 60 saniyelik test rotası (çevrimdışı Mushaf + Hatim, ayet → kelime/kök analizi + paylaşım kartı, Kıble + Tespih, namaz vakitleri + bildirim, Elif-Ba + dersler).
- İtiraz kabul → bu sürümle güncelleme; ret → bu sürümle yeni gönderim. Tekrar 4.2 gelirse en etkili ek: iOS widget'ı (WidgetKit) ya da tilavet sesi.

## Aşama 6 — Yayın sonrası / iOS'u engellemeyenler

- iOS'ta "Uygulamayı puanla" açılmadan önce: `dahaFazla.ts:28,61` "Google Play" metni platforma göre, `useStoreReview.ts:71-73` App Store bağlantısı; `ios.appStoreUrl`.
- Bildirime dokununca ilgili ekrana gitme (`_layout.tsx:156-159`), eski `shouldShowAlert` alanı.
- Sentry Metro ayarı (`getSentryExpoConfig`) — ayrı dal, tam Android testiyle.
- Elif-Ba / Arama ekranında çentikli iPhone'da üst boşluk (`insets.top`) — BrowserStack'te görülürse.
- Widget ekranındaki "yalnız Android" metni; hesap silmede `user.delete()` hatası yutulmasın (log).

---

## Android tarafı (vc 25)

- Aşama 1 + Aşama 2 vc 25'e girer (temiz derleme + A03 yükseltme ve widget testi, açık/koyu tema görsel kontrol).
- Widget'lar kilit ekranında: `widgetCategory="home_screen|keyguard"` (config plugin'den üret), A03/A35'te dene.
- 3.6 (expo sürüm eşitleme) ve Sentry Metro ayarı vc 25'e GİRMEZ.

## Sıra ve sahipler

1. Aşama 1 → Claude (dal + commit), A03 kontrolü.
2. Aşama 2 → Claude, A03 yükseltme testi.
3. Aşama 3 → 3.1–3.2 kullanıcı penceresi, 3.3 Chrome, 3.4–3.5 Claude.
4. Aşama 4 → bulut derleme kullanıcı onayıyla; BrowserStack hesabı/tanıdık iPhone kullanıcıda.
5. Aşama 5 → Apple itirazı sonucuna bağlı.
