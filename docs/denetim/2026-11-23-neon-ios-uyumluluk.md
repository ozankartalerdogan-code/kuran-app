# Kuran Yolu — iOS / App Store Uyumluluk Denetimi (23 Kasım 2026)

> **Kapsam:** Yalnızca statik kod/paket/yapılandırma incelemesi ve 2026 Apple/Expo doküman doğrulaması yapılmıştır (terminal/prebuild çalıştırılmadı; proje dosyaları değiştirilmedi). Derecelendirme: **kesin** (kodda/paket kaynağında doğrulandı), **muhtemel** (bilinen platform/SDK davranışı, cihazda/build'de doğrulanmalı), **emin değilim** (yerel/bulut gizli değerleri veya çalıştırılmadan görülemeyen artefaktlara bağlı).

## Özet Hüküm
Mevcut `master` (1.2.4) **iyi bir iOS temel taşıyor** (widget ve exact-alarm kodları çoğunlukla guard'lı, Android-özel menüler gizli, gizlilik/silme akışı hazır), ancak **doğrudan App Store'a gönderilirse reddedilme veya build/çalışma sorununa yol açacak 2 kesin P0 uyumluluk hatası + 1 kesin EAS önkoşulu + 2 muhtemel iOS build/çalışma riski** var. Önce P0 maddeleri düzeltilip gerçek bir iOS cihazda (TestFlight) doğrulama yapılmadan App Store'a gönderilmemeli.

---

## 1. Derlenir mi? (`expo prebuild -p ios` + EAS Build)

### Güvenli / Doğru Yapılandırılmış Kısımlar
- **Yerel Android-özel config plugin'leri iOS'ta güvenli [kesin]:**
  - `apps/mobile/plugins/with-native-clean-codegen-ordering.js:35-43` (yalnız `withAppBuildGradle`),
  - `apps/mobile/plugins/with-android-optional-features.js:11-24` (yalnız `withAndroidManifest`),
  - `apps/mobile/plugins/with-widget-strings.js:19-55` (`withAndroidManifest`, `withStringsXml`, `withDangerousMod('android')`),
  - `node_modules/react-native-android-widget/app.plugin.js:14-184` (tüm mod'lar yalnız Android; iOS podspec'i yok).
  - Hiçbiri iOS prebuild'ine dokunmaz.
- **Yerel Expo modülü `modules/exact-alarm` iOS'ta güvenli [kesin]:** `apps/mobile/modules/exact-alarm/expo-module.config.json:1-6` yalnız `"platforms": ["android"]` tanımlar; JS sarıcısı `apps/mobile/modules/exact-alarm/index.ts:12` iOS'ta `null` döner.
- **`with-ios-no-background-audio` sırası doğru [kesin]:** `apps/mobile/app.config.js:215-216`'da `expo-audio`'dan önce listelenmiş. `node_modules/@expo/config-plugins/build/plugins/withMod.js:180-204` mod'ları sondan başa (`expo-audio` → `with-ios-no-background-audio`) yürüttüğü için `audio` arka plan modu gerçekten temizlenir; `expo-background-task` (`app.config.js:207`) ise `"processing"` modunu korur.
- **`@react-native-firebase/analytics` `withoutAdIdSupport` [kesin]:** `apps/mobile/app.config.js:220` geçerli; `node_modules/@react-native-firebase/analytics/plugin/build/ios/podfile.js:10,39-44` Podfile'a `$RNFirebaseAnalyticsWithoutAdIdSupport = true` ekler.
- **2026 Xcode / iOS SDK zorunluluğu [kesin]:** 28 Nisan 2026'dan beri Apple, App Store yüklemelerinde **Xcode 26 + iOS 26 SDK** (ve 9 Eylül 2026'dan beri min. iOS 13) zorunlu tutuyor. `apps/mobile/package.json:23` Expo SDK 56 kullanıyor; EAS Build `eas.json` içinde `image` belirtilmese de SDK 56 için varsayılan olarak Xcode 26.4 imajını seçer.

### Derleme / Prebuild Riskleri
1. **`GoogleService-Info.plist` yerelde yok; EAS env zorunlu [kesin / EAS durumu: emin değilim]:**
   - `apps/mobile/app.config.js:36-37` → `process.env.GOOGLE_SERVICES_PLIST || path.resolve(__dirname, 'GoogleService-Info.plist')`.
   - `apps/mobile/GoogleService-Info.plist` çalışma dizininde mevcut değil. Hem `node_modules/@react-native-firebase/app/plugin/build/ios/googleServicesPlist.js:27-29` hem `node_modules/@react-native-firebase/auth/plugin/build/ios/urlTypes.js:79-81` dosya yoksa **prebuild'i fırlatarak durdurur**. EAS bulut ortamında `GOOGLE_SERVICES_PLIST` file-secret tanımlı değilse iOS build anında kırılır.
2. **`react-native-mmkv` v4 + `react-native-nitro-modules` + `useFrameworks: 'static'` çakışma riski [muhtemel]:**
   - `apps/mobile/package.json:48-49` (`react-native-mmkv: ^4.3.2`, `react-native-nitro-modules: ^0.36.1`) ve `apps/mobile/app.config.js:176-179` (`useFrameworks: 'static'`, `forceStaticLinking: ['RNFBApp', ...]`).
   - `node_modules/react-native-nitro-modules/NitroModules.podspec:64-71` `DEFINES_MODULE => YES` + `SWIFT_OBJC_INTEROP_MODE => objcxx` + C++20 kullanır; `use_frameworks! :linkage => :static` altında CocoaPods/Clang modül haritası ve C++ header çakışmaları sık görülür (RN 0.85 + Nitro 0.36.1 ile çözülmüş olabilir, ancak EAS iOS build'de test edilmeden garanti edilemez).
   - Üstelik **MMKV şu an çalışma zamanında hiç kullanılamıyor** (bkz. Bölüm 2.1); çalışmayan bir native kütüphane için iOS C++/Nitro derleme riski taşınıyor.
3. **`@react-native-firebase/auth` Swift `AppDelegate` yaması [muhtemel]:**
   - `apps/mobile/app.config.js:223` `@react-native-firebase/auth` plugin'ini etkinleştiriyor.
   - `node_modules/@react-native-firebase/auth/plugin/build/ios/openUrlFix.js:30-35,135-158`, `expo-router` algıladığında Swift `AppDelegate.swift` içindeki `open url:` imzasını katı bir regex (`appDelegateSwiftOpenUrlInsertionPointAfter`) ile eşleştirir. Expo SDK 56'nın ürettiği `AppDelegate.swift` biçimi bu regex'ten tek satır/boşluk saparsa prebuild `Failed to apply 'captchaOpenUrlFix'` hatasıyla durur. Uygulama yalnız anonim auth (`signInAnonymously`) kullandığından telefon/reCAPTCHA akışı yoktur; `{ ios: { captchaOpenUrlFix: false } }` ile bu kırılgan yama güvenle kapatılabilir.
4. **Monorepo `expo` sürüm uyumsuzluğu [muhtemel]:**
   - Kök `package.json:56` `"expo": "~56.0.12"`, `apps/mobile/package.json:23` `"expo": "~56.0.15"`. Hoisting farklılıklarında `expo-modules-core` / pod autolinking uyuşmazlığı doğurabilir; sürümler hizalanmalı.
5. **Sentry iOS Metro / source map bağlantısı eksik [kesin]:**
   - `apps/mobile/metro.config.js:1,8` `getSentryExpoConfig` yerine `expo/metro-config`'ten `getDefaultConfig` kullanıyor. `apps/mobile/node_modules/@sentry/react-native/plugin/build/withSentryIOS.js:32-44` Xcode'a `sentry-xcode.sh` ve dSYM upload fazlarını ekler; ancak `getSentryExpoConfig` olmadığı için JS bundle'a Debug ID basılmaz ve iOS JS stack trace sembolikleştirme bozulabilir. Ayrıca `apps/mobile/eas.json:20` (`SENTRY_DISABLE_AUTO_UPLOAD: "false"`) nedeniyle EAS'te `SENTRY_AUTH_TOKEN` eksikse Xcode Release archive adımı hata verebilir (**emin değilim** — EAS secret'larına bağlı).

---

## 2. Çalışır mı? (iOS Çalışma Zamanı Riskleri)

1. **`react-native-mmkv` v4 API kırılması — MMKV her iki platformda sessizce devre dışı [kesin]:**
   - `apps/mobile/src/lib/storage.ts:35-40`: `const { MMKV } = require("react-native-mmkv"); mmkv = new MMKV();`
   - `node_modules/react-native-mmkv/src/index.ts:2,10`: v4'te `MMKV` yalnız TypeScript tipidir; çalışma zamanı export'u `createMMKV()` fonksiyonudur.
   - `new MMKV()` her açılışta `TypeError` fırlatıp `catch` içinde yutulur → `mmkv = null` olur ve her şey AsyncStorage'a düşer. Çökme yaratmaz ama senkron tema/dil/okuma konumu okumaları (`useColors.ts:163`, `i18n/index.ts:42`, `kuran.tsx:61`) çalışmaz ve ilk açılışta karanlık modda beyaz flaş / gecikme oluşur.
2. **`Hakkında` ekranındaki e-posta bağlantısı iOS'ta her zaman hata verir [kesin]:**
   - `apps/mobile/app/hakkinda.tsx:28-34,153`: `Linking.canOpenURL("mailto:kuranyolu.iletisim@gmail.com")` çağırıyor.
   - `apps/mobile/app.config.js:43-52`'de `LSApplicationQueriesSchemes: ["mailto"]` **tanımlı değil**. iOS 9+'da `LSApplicationQueriesSchemes` beyanı olmadan `canOpenURL("mailto:...")` **her zaman `false` döner**; kullanıcı "Bağlantı açılamadı" uyarısı alır. (`apps/mobile/app/gizlilik.tsx:195` doğrudan `Linking.openURL` kullandığı için orada sorun yok.)
3. **`index.js` iOS'ta Android widget modülünü gereksiz yere yüklüyor [kesin]:**
   - `apps/mobile/index.js:10-18`: `Platform.OS === 'android'` kontrolü yok. `node_modules/react-native-android-widget/src/AndroidWidget.ts:25-30` iOS'ta throw etmek yerine `noopModule` döndürdüğü için çökmez; ancak açılışta `widget-task-handler.tsx`, `EmirAyetWidget.tsx`, `NamazWidget.tsx` ve `emirAyetleri.json` belleğe yüklenip `AppRegistry.registerHeadlessTask` kaydedilir. `Platform.OS === 'android'` guard'ı eklenmeli. (Diğer widget çağrıları `apps/mobile/src/widgets/widgetRefresh.ts:39` ile guard'lı — güvenli.)
4. **Kıble ekranında Android ayar yolu metni ve konum doğruluğu çelişkisi [kesin]:**
   - `apps/mobile/src/i18n/strings/kible.ts:7,36`: Konum izni reddedilince iOS kullanıcılarına Android yolu gösteriliyor: `"Ayarlar → Uygulama → Kuran Yolu → İzinler → Konum → İzin Ver"`.
   - `apps/mobile/app/kible.tsx:260-265`: iOS'ta `Location.watchHeadingAsync` kullanılıyor ve `trueHeading < 0` durumunda `magHeading + WMM2025 declRef` yedeği var — **doğru tasarım [kesin]**. Ancak `app.config.js:48` (`NSLocationDefaultAccuracyReduced: true`) ile `watchHeadingAsync` + `kible.tsx:383` (`Location.Accuracy.High`) davranışı fiziksel iOS cihazda doğrulanmalı (**muhtemel**). Ayrıca `kible.tsx:383` (`Accuracy.High`), gizlilik metnindeki *"hassas (GPS) konum kullanılmaz"* (`gizlilik.json:49`, `gizlilik.en.json:99`) beyanıyla çelişebilir (kullanıcı iOS ayarlarından Tam Konum açarsa).
5. **Bildirimler (izin, zamanlama, dokunma) [kesin / muhtemel]:**
   - **İyi:** `apps/mobile/src/lib/namazNotifications.ts:130,364` 7 gün = en fazla 56 (carry ile ≤62) yerel bildirim kurarak iOS'un **64 bildirim sınırının** altında kalıyor; `ensureAndroidChannel` `Platform.OS !== "android"` guard'lı (`namazNotifications.ts:182`); `exactAlarmPrompt.ts:13` iOS'ta `false` dönüyor; `Notifications.requestPermissionsAsync()` iOS'ta alert/badge/sound varsayılanlarını istiyor (`node_modules/expo-notifications/build/NotificationPermissions.js:54-60`).
   - **Dikkat 1 [kesin]:** `apps/mobile/src/lib/namazNotifications.ts:98` (`if (!Device.isDevice) return false;`) yüzünden iOS Simülatör'de bildirim izni/planlama test edilemez (gerçek iPhone gerekir).
   - **Dikkat 2 [kesin]:** `apps/mobile/app/_layout.tsx:156-159` bildirime tıklandığında `content.data.route` (`/namaz`, `/ayah/s/a`) yerine her zaman `/(tabs)`'e gidiyor (çökme değil, işlev kaybı).
   - **Dikkat 3 [kesin]:** `apps/mobile/app/_layout.tsx:94` `shouldShowAlert: true` deprecated; `expo-notifications` konsol uyarısı üretir (`shouldShowBanner` ve `shouldShowList` zaten verilmiş, `shouldShowAlert` kaldırılabilir).
6. **iOS'ta `FlatList` `removeClippedSubviews` + `inverted` Mushaf riski [muhtemel]:**
   - `apps/mobile/app/mushaf-sayfa.tsx:628-649` (`horizontal`, `inverted`, `scrollEnabled={false}`, `PanResponder` + `removeClippedSubviews`), ayrıca `apps/mobile/app/surah/[id].tsx:307` ve `apps/mobile/app/tafsir/[surahId].tsx:179`.
   - `apps/mobile/app/search.tsx:769`'da bilinçli olarak `removeClippedSubviews={Platform.OS === "android"}` yapılmışken bu 3 ekranda iOS'ta da açık; özellikle yatay `inverted` Mushaf'ta iOS'ta boş sayfa / kayıp metin kırpılması yapabilir.
7. **Çifte üst güvenli alan (`insets.top`) boşluğu [kesin]:**
   - `apps/mobile/app/elifba/index.tsx:405` ve `apps/mobile/app/search.tsx:563`, native Stack header görünürken (`app/_layout.tsx:223,230`) içerikte tekrar `paddingTop: insets.top` ekliyor. Çentikli/Dynamic Island'lı iPhone'larda üstte ~50–59pt fazladan boşluk oluşur.
8. **`BackHandler`, Ses, Paylaşım ve Haptics [kesin]:**
   - `BackHandler` (`app/onboarding.tsx:47`, `src/tour/TourOverlay.tsx:44`, `src/tour/backHandlerPolicy.ts:44-59`) iOS'ta zararsız no-op; `onboarding` ekranında `gestureEnabled: false` (`_layout.tsx:218`) iOS kaydırmayla geri dönüşü doğru engelliyor.
   - `expo-audio` (`src/lib/elifbaAudio.ts:60`): `setAudioModeAsync({ playsInSilentMode: true })` doğru; sessiz anahtar açıkken bile Elif-Ba harf sesi çalar.
   - Görsel ayet paylaşımı (`src/lib/shareImage.ts:39-41`): `file://` öneki ve `UTI: "public.png"` iOS'a uygun; `AyahShareModal.tsx` güvenli.
   - `lottie-react-native` (`ElifbaQuizView.tsx:8-16`, `dersler/[dersId].tsx:8-15`): New Architecture'da `UIManager.hasViewManagerConfig("LottieAnimationView")` `false` dönerse kutlama animasyonu sessizce atlanır (çökme yok).

---

## 3. App Store Kuralları ve Uyumluluk

| Alan | Durum | Bulgu ve Dosya:Satır | Derece |
|---|---|---|---|
| **Mikrofon izni sızıntısı (`NSMicrophoneUsageDescription`)** | **KRİTİK (P0)** | `apps/mobile/app.config.js:216` yalnız `{ recordAudioAndroid: false }` geçiyor. `node_modules/expo-audio/plugin/build/withAudio.js:8-13` + `node_modules/@expo/config-plugins/build/ios/Permissions.js:28-34`, `microphonePermission: false` verilmediği için iOS `Info.plist`'e otomatik olarak kullanılmayan ve yerelleştirilmemiş İngilizce `NSMicrophoneUsageDescription: "Allow $(PRODUCT_NAME) to access your microphone"` ekler. Gizlilik politikası (*"mikrofon erişimi istemez"*, `gizlilik.json:70`) ve Guideline **5.1.1 / 2.1** ile doğrudan çelişir. | **kesin** |
| **Privacy Manifest (`PrivacyInfo.xcprivacy`) yasaklı kod `0A2A.1`** | **KRİTİK (P0)** | `apps/mobile/app.config.js:60` → `NSPrivacyAccessedAPICategoryFileTimestamp` içinde `'0A2A.1'` tanımlı. Apple kurallarına göre **`0A2A.1` yalnızca 3. parti SDK manifest'lerinde kullanılabilir; uygulama manifest'inde kullanımı ITMS reddine yol açar**. Ayrıca uygulama Document Picker kullanmadığı için `'3B52.1'` ve kullanıcıya disk alanı göstermediği için `NSPrivacyAccessedAPICategoryDiskSpace`'deki `'85F4.1'` (`app.config.js:61`) gereksiz/hatalıdır; sırasıyla yalnız `['C617.1']` ve `['E174.1']` bırakılmalıdır. | **kesin** |
| **Konum & Hareket `Info.plist` + Yerelleştirme** | İyi (1 küçük temizlik) | `app.config.js:23-26,44-51,143-152` + `languages/tr.json:1-7`, `languages/en.json:1-7`: `Locales.js`/`locales.js` doğrulandı, `ios` alt nesnesi SDK 56'da geçerli ve `InfoPlist.strings` üretir. `NSLocationDefaultAccuracyReduced: true` ve `locationAlways*: false` iyi. Küçük not: iOS Kıble CoreMotion kullanmadığı halde `NSMotionUsageDescription` ekleniyor (`app.config.js:149,152`); `expo-sensors` kullanılmıyorsa iOS'ta `{ motionPermission: false }` değerlendirilebilir (zorunlu değil, ancak `expo-location`'da da `motionUsagePermission: false` yapılmalı). | **kesin** |
| **Arka plan modları (`UIBackgroundModes`)** | Uygun | `with-ios-no-background-audio.js` `audio`'yu temizler (Guideline 2.5.4 uyumu). `expo-background-task` (`processing` + `BGTaskSchedulerPermittedIdentifiers`) bildirim penceresini tazelemek için meşru kullanımdır. | **kesin** |
| **Şifreleme, Kimlik, Sürüm, iPad, Yön** | Uygun | `usesNonExemptEncryption: false` (`app.config.js:41`), `bundleIdentifier: 'com.kuranapp.mobile'` (`:32`), `version: '1.2.4'` (`:15`), `eas.json:4,15` (`appVersionSource: "remote"`, `autoIncrement: true`), `supportsTablet: false` + `orientation: 'portrait'` (`app.config.js:17,31`) tamamen tutarlı. | **kesin** |
| **Gizlilik & Hesap Silme (Guideline 5.1.1(v))** | Güçlü (2 küçük not) | `app/gizlilik.tsx:96-171` + `src/lib/cloudBackup.ts:219-250` uygulama içi bulut yedeği ve anonim Firebase hesabını kalıcı silme düğmesi sunuyor. Not 1: `cloudBackup.ts:239` `user.delete()` hatasını yutup başarı bildiriyor. Not 2: App Store Connect "App Privacy" formunda **Firebase Analytics** (Product Interaction, Diagnostics/Crash via Sentry), **Anonymous User ID**, **Coarse Location** (App Functionality, not linked, not tracking) ve **User Content** (favori/not bulut yedeği) beyan edilmeli. | **kesin** |
| **Android referansları & "Yakında" (Guideline 2.1 / 2.3.10)** | Korunmuş (savunma derinliği eksik) | `app/(tabs)/daha-fazla.tsx:51-58` `/widget-ekle` ve `rateApp` satırlarını iOS'ta gizliyor. Ancak `app/widget-ekle.tsx:69-75` + `src/i18n/strings/misc1.ts:41-42,88-89` içinde "Yakında / yalnız Android" metni duruyor; `src/hooks/useStoreReview.ts:71-73`'te `ios.appStoreUrl` olmadığı için `openStoreListing()` iOS'ta çağrılsa Google Play'i açar (`app.config.js`'e `ios.appStoreUrl` eklenmeli). | **kesin** |
| **Push Entitlement (`aps-environment`)** | Kontrol edilmeli | `node_modules/expo-notifications/plugin/build/withNotificationsIOS.js:9-15` yerel bildirim kullanılsa bile entitlements'a `aps-environment: 'development'` ekler. EAS production managed credentials bunu `production`'a çevirir, ancak Apple Developer portalındaki `com.kuranapp.mobile` App ID'sinde **Push Notifications** capability'nin açık olduğundan emin olunmalı. | **muhtemel** |
| **İkon / Splash / Ekran Görüntüleri** | Doğrulanmalı | `app.config.js:18,185` (`./assets/icon.png`, `./assets/splash.png`): `icon.png`'nin 1024×1024 px ve **alfa kanalsız (şeffaflıksız PNG)** olduğu statik olarak doğrulanamadı (Apple alfa kanallı uygulama ikonunu reddeder). | **emin değilim** |

---

## 4. Apple Guideline 4.2 (Minimum Functionality) Riski ve Strateji

### 4.2 Açısından Uygulama Güçlendi mi? **Evet — belirgin biçimde [kesin].**
Mevcut 1.2.4 kod tabanı bir "web sitesi sarmalayıcısı" veya "düz metin okuyucu" değildir; tamamı native React Native ekranlardan oluşan kapsamlı ve çevrimdışı çalışan bir araç setidir:
- **Çevrimdışı 604 sayfalık Tecvidli Mushaf + 30 Cüz Hatim Takibi** (`app/mushaf-sayfa.tsx`, `src/lib/offlineTr.ts`, `HatimPanel.tsx`): Medine düzeni, sağa kaydırmalı sayfa çevirme, canonical renkli tecvid, yazı boyutu, ekranı uyanık tutma, yer imi/devam kartı.
- **Derin Ayet, Kelime & Kök Analizi + 114 Sure Çevrimdışı Tefsir** (`app/ayah/[surahId]/[ayahNumber].tsx`, `app/tafsir/[surahId].tsx`, `app/root/`): Kelime kelime morfoloji, 200 kök ve 114-sure dağılım haritası, kişisel not/favori, **görsel ayet kartı üretimi ve native paylaşım** (`AyahShareModal.tsx` + `view-shot` + `expo-sharing`).
- **Etkileşimli Öğrenme + Aralıklı Tekrar (SRS) + Sesli Elif-Ba** (`app/elifba/`, `app/dersler/`): 9 aşamalı harita, harf telaffuz sesi (`expo-audio`), SRS'li quiz/dinleme/alıştırma, 16 çevrimdışı konu dersi (namaz duruş illüstrasyonları + quiz + ilerleme).
- **Native İbadet & Donanım Araçları:** CoreLocation heading + NOAA WMM2025 + haptics + VoiceOver destekli canlı **Kıble Pusulası** (`app/kible.tsx`); Diyanet + Aladhan dünya geneli **Namaz Vakitleri** + 7 günlük yerel **bildirim planlama** + iOS `BGTaskScheduler` tazeleme (`namazNotifications.ts`, `backgroundRefresh.ts`); animasyonlu **ZikirMatik / Tespih** (`ZikirMatik.tsx`); çevrimdışı 89 dua, 99 Esma, 219 hadis, siyer, 25 peygamber kıssası; tam **TR + EN** yerelleştirme; anonim bulut yedek + uygulama içi silme.

### Kalan 4.2 Zayıf Noktaları [muhtemel]
- İnceleyici İngilizce iPhone ile açtığında önceki sürümde içerik Türkçe ağırlıklı görünmüş olabilir; 1.2.4'te tam İngilizce deneyim (Pickthall meal, EN dersler/tefsir/dualar/hadisler/onboarding) çok büyük avantajdır.
- İki eksik hâlâ dikkat çekebilir: **(1) Kur'an sure/ayet tilavet sesi yok** (yalnız Elif-Ba harf sesi var), **(2) iOS ana ekran/kilit ekranı widget'ı (WidgetKit) yok** (yalnız Android'de var).

### İtiraz Sonuçlanınca Öneri
- **İtiraz kabul edilirse:** Eski sürüm yayına girer girmez, aşağıdaki P0 düzeltmelerini yapıp **1.2.5 (veya mevcut 1.2.4 + build)** olarak bu zengin sürümü güncelleyin (eski sürümle Android arasındaki uçurum kapansın).
- **İtiraz reddedilirse (yeni gönderim):**
  1. Eski sürüme itirazı uzatmak yerine P0 düzeltmeleriyle **1.2.4+ yeni binary** gönderin.
  2. **App Review Notes** bölümüne İngilizce, 60 saniyelik somut test rotası yazın: *"Fully native offline-capable app (no WebViews). Please test: (1) Quran tab → 604-page Tajweed Mushaf + Hatim tracker (works in Airplane Mode); (2) Tap any verse → Word-by-word morphology, Root map, personal Notes & PNG Verse Card Share; (3) Worship tab → Live CoreLocation Qibla compass with haptics & Tasbih counter; (4) Home → Prayer times city selector & 7-day local notifications; (5) Learn tab → Interactive Elif-Ba audio/SRS quizzes & 16 illustrated lessons."*
  3. İlk 4.2 reddinden sonra tekrar 4.2 gelirse en yüksek etkili tek native ekleme **WidgetKit (iOS Namaz Vakitleri / Günün Ayeti widget'ı)** veya **ayet/sure sesli tilavet oynatıcısı** olacaktır.

---

## 5. Öncelikli Yapılacaklar Listesi (iOS Gönderimi Öncesi)

### P0 — Gönderim Engelleyiciler (Mutlaka Düzelt)
1. **`expo-audio` mikrofon iznini iOS'ta kapat [kesin]:** `apps/mobile/app.config.js:216` → `['expo-audio', { recordAudioAndroid: false, microphonePermission: false }]`.
2. **Privacy Manifest'ten `0A2A.1` (ve gereksiz kodları) temizle [kesin]:** `apps/mobile/app.config.js:60-61` → `FileTimestamp` yalnız `['C617.1']`, `DiskSpace` yalnız `['E174.1']`.
3. **EAS iOS `GOOGLE_SERVICES_PLIST` + `SENTRY_AUTH_TOKEN` doğrulaması ve temiz EAS iOS test build'i [kesin / emin değilim]:** `app.config.js:36-37`, `eas.json:20`. İlk EAS iOS build'inde `NitroModules`/`MMKV` + `useFrameworks: 'static'` ve `@react-native-firebase/auth` Swift `AppDelegate` uyumu fiilen doğrulanmalı.
4. **`hakkinda.tsx` `mailto:` kırığını düzelt [kesin]:** `apps/mobile/app.config.js:43-52`'ye `LSApplicationQueriesSchemes: ['mailto']` ekle **veya** `apps/mobile/app/hakkinda.tsx:28-34`'te `mailto:` için `canOpenURL` kontrolünü kaldırıp doğrudan `Linking.openURL` dene (`gizlilik.tsx:195` gibi).

### P1 — Yüksek Öncelik (Kullanıcı Deneyimi & Review Riski)
5. **`react-native-mmkv` v4 çağrısını düzelt veya kaldır [kesin]:** `apps/mobile/src/lib/storage.ts:36-37`'de `new MMKV()` yerine `createMMKV()` kullan (ya da Nitro build sorun çıkarırsa paketi çıkarıp AsyncStorage ile sadeleştir).
6. **Kıble ekranı iOS metni ve `Accuracy.High` tutarlılığı [kesin]:** `apps/mobile/src/i18n/strings/kible.ts:7,36`'daki Android ayar yolunu platforma uygun/genel metin yap; `apps/mobile/app/kible.tsx:383`'te `Accuracy.High` yerine `Accuracy.Balanced` kullan (gizlilik politikasıyla tam uyum).
7. **`@react-native-firebase/auth` plugin'inde `captchaOpenUrlFix: false` [muhtemel]:** `apps/mobile/app.config.js:223` → `['@react-native-firebase/auth', { ios: { captchaOpenUrlFix: false } }]` (anonim auth için gereksiz Swift `AppDelegate` regex riskini kaldırır).
8. **`index.js` Android widget yüklemesini `Platform.OS === 'android'` ile sar [kesin]:** `apps/mobile/index.js:10-18`.
9. **Sentry iOS source map için `getSentryExpoConfig` kullan [kesin]:** `apps/mobile/metro.config.js:1,8` (`getDefaultConfig` → `getSentryExpoConfig`).
10. **Fiziksel iPhone'da (TestFlight) 4 kritik akışı test et [muhtemel]:** (a) `mushaf-sayfa.tsx` yatay `inverted` sayfa çevirme (`removeClippedSubviews` sorunu varsa `Platform.OS === "android"` yap), (b) Kıble pusulası (`NSLocationDefaultAccuracyReduced: true` altında `watchHeadingAsync`), (c) 7 günlük yerel namaz bildirimleri + arka plan tazeleme, (d) `icon.png`'nin alfa kanalsız 1024×1024 olduğu ve App Store Connect Privacy Nutrition Labels beyanının `gizlilik.en.json` ile birebir örtüştüğü.

### P2 — İyileştirme / Temizlik
11. **Çifte `insets.top` boşluğunu düzelt [kesin]:** `apps/mobile/app/elifba/index.tsx:405` ve `apps/mobile/app/search.tsx:563`'te Stack header varken `insets.top` eklenmesini kaldır.
12. **Bildirim tıklama yönlendirmesi ve deprecated uyarı [kesin]:** `apps/mobile/app/_layout.tsx:156-159`'da `response.notification.request.content.data?.route` değerini kullan; `:94`'ten `shouldShowAlert: true` alanını kaldır.
13. **iOS App Store URL + Universal Links + derin bağlantı hijyeni [kesin]:** Yayın sonrası `app.config.js`'e `ios.appStoreUrl` (ve gerekirse `ios.associatedDomains`) ekle; `daha-fazla.tsx:56-58`'deki `rateApp` düğmesini iOS'ta da aç; `app/widget-ekle.tsx:69-75`'teki "Android" / "Yakında" metnini iOS için nötrleştir; kök `package.json:56` ile `apps/mobile/package.json:23` `expo` sürümlerini hizala.
14. **Gizlilik/header cilası [kesin]:** `app/_layout.tsx`'e `gizlilik` için `headerBackTitle: t.back` ekle; `app.config.js:149,152`'de iOS'ta kullanılmayan `NSMotionUsageDescription` kararını netleştir (`expo-sensors` kullanılmıyorsa `motionPermission: false`).
