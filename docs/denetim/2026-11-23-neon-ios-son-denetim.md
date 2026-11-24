# Neon Son Denetim — `feat/ios-hazirlik` Dalı (23 Kasım 2026)

> **Yöntem:** Yalnız statik dosya/diff incelemesi yapıldı (terminal/komut çalıştırılmadı, proje dosyaları değiştirilmedi). Derecelendirme: **kesin** (kodda doğrulandı), **muhtemel** (bilinen platform/derleme/çalışma davranışı), **emin değilim** (statik olarak tam taranamayan veya cihazda/bulutta doğrulama gerektiren durum).

## Özet Hüküm

`feat/ios-hazirlik` dalı iOS derleme hazırlığı açısından **temiz ve sağlam**; Aşama 1 + Aşama 2 hedefleri doğru uygulanmış ve Android vc 25 açısından kırıcı regresyon yok. Ancak **master birleştirmesinden önce düzeltilmesi gereken 1 kesin web başlık (`<title>`) hatası**, **1 kesin metin-kod tutarsızlığı (`/support` bulut yedek ifadesi)** ve **1 kesin ama dar pencereli UI/storage yarış koşulu (`mushaf-sayfa.tsx` tecvid toggle)** bulundu.

---

## 1. Hata Avı (`diff.patch` + Güncel Kod)

### (a) Senkron okumaların kaldırılması — ilk açılış davranışı eskisiyle aynı mı?
- **Sonuç: Evet, davranış eskisiyle birebir aynı (hatta Mushaf'ta 1 eski bug düzeltildi) [kesin].**
- `master`'da `react-native-mmkv` v4 `new MMKV()` çağrısı her açılışta `TypeError` verip yakalandığı için `mmkv = null` ve `usingMmkv = false` idi; dolayısıyla `getStringSync` / `getJSONSync` **eskiden de her zaman `null` dönüyordu**.
  - **Tema (`apps/mobile/src/hooks/useColors.ts:157-170`):** Eskiden `getJSONSync` → `null` → async `getJSON` çalışıyordu; şimdi doğrudan async `getJSON`. (Not: `useColors()` `apps/mobile/app/_layout.tsx:199,355-360` gereği 600 ms'lik `AppSplash` bittikten sonra çağrıldığı için tema okuması o anda başlar; bu mevcut davranış, diff kaynaklı regresyon değil.)
  - **Dil (`apps/mobile/src/i18n/index.ts:41-61`):** Eskiden `readPref()` → `"system"` + modül yüklenirken `languageReady` promise'i çalışıyordu; şimdi birebir aynı.
  - **Yazı boyutu (`apps/mobile/src/hooks/useFontScale.ts:14-36`):** Eskiden `Number(null)` → `1` + async `ensureLoaded()`; şimdi birebir aynı.
  - **Seri (`apps/mobile/src/hooks/useStreak.ts:45-66`):** Eskiden `getJSONSync` → `null` → `{ data: DEFAULT, loaded: false }`; şimdi birebir aynı.
  - **Kuran sekmesi (`apps/mobile/app/(tabs)/kuran.tsx:60-66, 86-110`):** Eskiden `usingMmkv === false` → başlangıç `{ page: null, hatim: null, favCount: 0 }` + `useFocusEffect` içinde `Promise.all`; şimdi birebir aynı.
  - **Sure/Ayet ekranları (`apps/mobile/app/surah/[id].tsx:181-192`, `apps/mobile/app/ayah/[surahId]/[ayahNumber].tsx:423-433`):** Eskiden `null !== "0"` (`true`) + mevcut async `useEffect`; şimdi `useState(true)` + aynı `useEffect`.
  - **Mushaf (`apps/mobile/app/mushaf-sayfa.tsx:251-258`):** Eskiden async `useEffect` hiç olmadığı için kapalı tecvid tercihi Mushaf açıldığında kayboluyordu; yeni `useEffect` bu eski hatayı düzeltti.

### (b) `useStreak` `record` parametresi kaldırıldı mı, çağıranlar bozuldu mu?
- **Sonuç: Hayır, bozulma yok [kesin].**
- `apps/mobile/src/hooks/useStreak.ts:57-58`'deki dış imza `useStreak(options?: { record?: boolean })` ve `compute` içindeki `if (!record)` mantığı (`:79, :124`) **aynen duruyor**.
- `record` parametresi yalnızca dosya-içi özel yardımcı `readInitialStreak()`'ten (`useStreak.ts:45`) kaldırıldı.
- Doğrulanan çağıranlar: `apps/mobile/app/(tabs)/index.tsx:104` (`useStreak({ record: false })`), `apps/mobile/app/ayah/[surahId]/[ayahNumber].tsx:394` (`useStreak()`), `apps/mobile/app/mushaf-sayfa.tsx:232` (`useStreak()`). Hepsi sağlam.

### (c) `index.js` `Platform` importu Android headless widget görevini etkiler mi?
- **Sonuç: Etkilemez [kesin — cihazda son teyit: muhtemel].**
- `apps/mobile/index.js:3-22`: `import 'expo-router/entry'` sonrası `import { Platform } from 'react-native'` çalışır. Android'de `Platform.OS` modül değerlendirme anında senkron `'android'` sabitidir (native köprü beklemez; `apps/mobile/src/widgets/widgetRefresh.ts:10,39` aynı deseni zaten kullanıyor).
- `react-native-android-widget` ve `./src/widgets/widget-task-handler` hâlâ `try/catch` içinde tembel `require()` ile yükleniyor; build-gated koruma bozulmadı.
- Yine de `try/catch` hatayı sessizce yuttuğu için plandaki 1.5 maddesi (A03'te widget ekle + ↻ + vakit güncellemesi) vc 25 öncesi tamamlanmalı.

### (d) `mushaf-sayfa.tsx`'teki yeni `useEffect` ile toggle yarışı sorun mu?
- **Bulgu — Gerçek yarış koşulu (dar pencere) [kesin]:** `apps/mobile/app/mushaf-sayfa.tsx:251-258, 457-464, 528-537`.
- **Senaryo:** Üst bar ve tecvid düğmesi `initialPage` yüklenmeden ilk karede tıklanabilir (`mushaf-sayfa.tsx:499-559`). Depoda `"1"` kayıtlıyken kullanıcı ekranı açar açmaz (async `storage.getString(STORAGE_KEYS.tajweed)` henüz dönmeden — örn. düşük donanımlı A03'te `mushafPage`/`mushafBookmark` okumalarıyla aynı anda) tecvid düğmesine basarsa:
  1. `handleTajweedToggle` state'i `false` yapar ve depoya `"0"` yazar.
  2. Hemen ardından açılışta başlayan `getString` eski `"1"` değeriyle döner ve `setTajweed(true)` çağırarak **UI'ı tekrar açık hale çevirir**; depoda `"0"`, ekranda `true` kalır.
- **Not:** Aynı yarış önceden beri `apps/mobile/app/ayah/[surahId]/[ayahNumber].tsx:427-441` ve `apps/mobile/app/surah/[id].tsx:186-200`'de de var (`notesHydratedKeyRef` / `prefGeneration` koruması bu üçüne konmamış). Bir `tajweedTouchedRef = useRef(false)` ile 3 satırda tamamen kapatılır.

### (e) Web sayfaları (`/privacy`, `/privacy/en`, `/support`, `sitemap.ts`)

1. **`<title>` çift marka eki — GERÇEK HATA [kesin]:**
   - `apps/web/src/app/layout.tsx:26-29`: `title: { default: "...", template: "%s — Kuran Yolu" }` tanımlı.
   - `apps/web/src/app/privacy/page.tsx:5`: `title: "Gizlilik Politikası — Kuran Yolu"` → Next.js bunu şablona koyup **`Gizlilik Politikası — Kuran Yolu — Kuran Yolu`** üretir.
   - `apps/web/src/app/privacy/en/page.tsx:5`: **`Privacy Policy — Kuran Yolu — Kuran Yolu`**.
   - `apps/web/src/app/support/page.tsx:5`: **`Destek / Support — Kuran Yolu — Kuran Yolu`**.
   - Karşılaştırma: `apps/web/src/app/hakkinda/page.tsx:7` şablonu bildiği için yalnız `title: "Kaynaklar ve Lisanslar"` yazar.
   - **Çözüm:** Üç sayfada da sondaki `" — Kuran Yolu"` kaldırılmalı (veya `{ absolute: "..." }` kullanılmalı).

2. **`/support` SSS "İsteğe bağlı bulut yedeği" iddiası kodla çelişiyor [kesin]:**
   - `apps/web/src/app/support/page.tsx:23,43`: *"İsteğe bağlı bulut yedeği..."* / *"Optional cloud backup..."* yazıyor.
   - Gerçek kod (`apps/mobile/src/lib/cloudBackup.ts:182-199`, `apps/mobile/app/_layout.tsx:327`): Bulut yedekleme ilk açılışta **varsayılan olarak açık** çalışır (opt-in değil, opt-out); kullanıcı ancak Gizlilik → 7. bölümden silerek kapatabilir.
   - `privacy/page.tsx:41` ve `privacy/en/page.tsx:41` bunu doğru anlatıyor. `/support`'ta da *"İsteğe bağlı"* yerine *"Bulut yedeği ... (uygulama içinden dilediğiniz an kapatılıp silinebilir)"* / *"Cloud backup ... (can be turned off and deleted in the app at any time)"* yazılmalı.

3. **Sorunsuz / tutarlı bulunan web kontrolleri:**
   - **Gizlilik TR ↔ EN eşleşmesi [kesin]:** `apps/web/src/app/privacy/page.tsx` ve `apps/web/src/app/privacy/en/page.tsx` 9 bölüm, tarih (14 Kasım 2026), 8 üçüncü taraf servis ve tüm dış URL'ler, `#hesap-silme` / `#account-deletion` çapaları ve uygulama içi `apps/mobile/src/data/content/gizlilik.en.json:264,338` arayüz adlarıyla (`More → Privacy Policy → 7. Account and Data Deletion → Delete my cloud backup`) birebir örtüşüyor.
   - **Diğer `/support` SSS iddiaları [kesin]:** Silme adımları (`gizlilik.tsx:139-169`, `dahaFazla.ts:5,25,38,58`), Diyanet Awqat Salah (`apps/web/src/lib/diyanetClient.ts:28`) + Aladhan yedeği (`apps/mobile/src/lib/diyanetPrayer.ts:292-367`), gömülü çevrimdışı Mushaf metni (`apps/mobile/src/lib/api.ts:452-458`, `apps/mobile/src/lib/offlineTr.ts:16-26`) kodla tamamen tutarlı.
   - **`alternates` & `lang` [kesin]:** `alternates: { languages: { tr: "/privacy", en: "/privacy/en" } }` `layout.tsx:33` (`metadataBase`) ile doğru çözülür. `<html lang="tr">` altında `/privacy/en` için `<main lang="en">` ve `/support` için `<section lang="tr">` / `<section lang="en">` semantik olarak doğru (navbar/footer Türkçe kaldığı için). Küçük not: `privacy/en` ve `support` sayfalarında `alternates.canonical` ve İngilizce `openGraph` alanları yok (`layout.tsx:34-46`'daki Türkçe OG'yi miras alır) — engelleyici değil.
   - **Next 15 uyumu & CSP/Middleware [kesin]:** Saf Server Component, statik `metadata`, Next 15.5.29 uyumlu. `apps/web/src/middleware.ts:139` yalnız `/api/:path*` eşler; `apps/web/next.config.mjs:50-65` CSP'si statik sayfa ve dış `<a href>` bağlantılarıyla çakışmaz. (Ufak hijyen: `privacy/page.tsx:60-67` ve `privacy/en/page.tsx:60-67` `target="_blank"` linklerine `hakkinda/page.tsx:53` gibi `rel="noopener noreferrer"` eklenebilir.)

---

## 2. iOS "Derlemeye Hazır" Kontrolü — Eksik Kalanlar

### İzin metinlerinin İngilizce yerelleştirmesi (`InfoPlist.strings` / `locales`)
- **Zaten kurulu ve çalışır durumda [kesin]:** `apps/mobile/app.config.js:23-26` (`locales: { tr: './languages/tr.json', en: './languages/en.json' }`), `:50-51` (`CFBundleLocalizations: ['tr', 'en']`, `CFBundleAllowMixedLocalizations: true`) ve `apps/mobile/languages/en.json:1-7` mevcut.
- `node_modules/@expo/config-plugins/build/ios/Locales.js:54-120` + `utils/locales.js:33-75` doğrulandı: `expo prebuild` bu dosyalardan `en.lproj/InfoPlist.strings` ve `tr.lproj/InfoPlist.strings` üretip Xcode projesine ekler; iki JSON'da `.strings` sözdizimini bozacak çift tırnak (`"`) yok.
- Dolayısıyla Apple İngilizce iPhone'da incelediğinde **İngilizce izin metinleri görünür**, Türkçe metin görünmez.
- **2 küçük iyileştirme (engelleyici değil):**
  1. `app.config.js:5-8, 44, 148, 151, 154`: Ham `Info.plist` değerleri Türkçe. `tr`/`en` dışındaki dillerde fallback veya doğrudan `Info.plist` denetimi için ham değerleri İngilizce yapıp `tr.lproj` ile Türkçeleştirmek daha temiz bir standarttır **[kesin]**.
  2. `app.config.js:151,154`: `apps/mobile/app/kible.tsx:260-265` iOS'ta CoreLocation (`watchHeadingAsync`) kullanır, `expo-sensors` yalnız Android kolundadır (`:266-280`). Yani `NSMotionUsageDescription` iOS'ta fiilen istenmiyor; istenirse `expo-location`'da `motionUsagePermission: false`, `expo-sensors`'ta `motionPermission: false` (`node_modules/expo-sensors/plugin/build/withSensors.js:7-12` destekliyor) yapılarak tamamen kaldırılabilir **[kesin]**.

### Kaldırılan paketlerin (`react-native-mmkv`, `react-native-nitro-modules`) artıkları
- **Canlı bağımlılık / config artığı: Yok [kesin].** `apps/mobile/package.json`, kök `package.json`, `package-lock.json`, `app.config.js`, `metro.config.js`, `babel.config.js`, `tsconfig.json`, `eas.json`, `storage.ts`, `api.ts`, `cloudBackup.ts`, `shareImage.ts`, `EmirAyetWidget.tsx` ve `i18n/index.test.ts` temiz. (Terminal/grep yasak olduğundan incelenmeyen dosyalarda tek tük eski yorum satırı kalıp kalmadığı konusunda **emin değilim**; ancak `tsc` + `test:mobile 550/550` canlı kod referansı kalmadığını kanıtlıyor.)
- **Küçük ölü kod / isim artıkları (hata değil, kozmetik) [kesin]:**
  - `apps/mobile/app/(tabs)/kuran.tsx:60-66`: `readKuranTabSync()` her zaman `{ page: null, hatim: null, favCount: 0 }` döndürür.
  - `apps/mobile/src/hooks/useStreak.ts:45-47, 59-64`: `readInitialStreak()` / `initialRef` artık sabit `{ data: DEFAULT, loaded: false }`.
  - `apps/mobile/src/i18n/index.ts:50`: `languageState.preference === "system"` koşulu artık her zaman `true`.
  - `apps/mobile/src/i18n/strings/hakkinda.ts:6,24`: `linkFailBody` artık kullanılmıyor (`hakkinda.tsx:33` yalnız `linkFailRetry` kullanıyor).

### Kod/config'te derleme veya gönderim öncesi hâlâ bekleyenler (kullanıcı/ASC işleri hariç)
- **İlk iOS derlemesini engelleyen kod/config hatası: YOK [kesin].**
- **Plan kapsamında ertelenmiş / iOS derlemesi öncesi dikkat edilecek maddeler:**
  1. `apps/mobile/eas.json:24-26`: `submit.production.ios` (`ascAppId`, `appleTeamId`) henüz boş (planda 3.5 — `eas submit` öncesi). **[kesin]**
  2. Kök `package.json:56` (`"expo": "~56.0.12"`) ↔ `apps/mobile/package.json:23` (`"expo": "~56.0.15"`): Monorepo hoisting uyuşmazlığı riski (planda 3.6 — vc 25'ten ayrı, iOS derlemesi öncesi hizalanmalı). **[muhtemel]**
  3. `apps/mobile/metro.config.js:1,8`: `getDefaultConfig` yerine `getSentryExpoConfig` yok (planda Aşama 6 — derlemeyi engellemez, ama iOS JS crash stack trace'leri sembolikleştirilemeyebilir). **[muhtemel]**
  4. `apps/mobile/app/elifba/index.tsx:405` ve `apps/mobile/app/search.tsx:563`: Stack header görünürken çifte `insets.top` üst boşluğu (planda Aşama 6 — çentikli iPhone'da görsel boşluk). **[kesin]**
  5. `apps/mobile/app/_layout.tsx:94` (`shouldShowAlert: true` deprecated) ve `:156-159` (bildirime dokununca her zaman `/(tabs)`'e gitme); `apps/mobile/app/gizlilik.tsx:213` için `_layout.tsx`'te `headerBackTitle` eksikliği — gönderim blokeri değil. **[kesin]**

---

## 3. Android Riski (`vc 25` ile `master`'a girerse)

- **Kod kaynaklı kırıcı Android regresyonu: YOK [kesin].**
  - `app.config.js` değişiklikleri (`privacyManifests`, `microphonePermission: false`, `captchaOpenUrlFix: false`) yalnız iOS'u etkiler.
  - `removeClippedSubviews={Platform.OS === "android"}` (`mushaf-sayfa.tsx:655`, `surah/[id].tsx:306`, `tafsir/[surahId].tsx:180`, `root/[root]/index.tsx:349`) Android'de `true` kalır.
  - `kible.tsx:318` Android'de eski `t.permBody` metnini korur; `:383` (`Accuracy.Balanced`) Android'de zaten `ACCESS_FINE_LOCATION` engelli (`app.config.js:101`) olduğu için davranış değiştirmez.
  - `hakkinda.tsx:24-35`: Doğrudan `Linking.openURL` Android 11+'da `<queries>` eksikliği yüzünden `canOpenURL`'nin yanlış `false` dönmesini de önler. Tek küçük fark: e-posta uygulaması olmayan cihazda `t.linkFailBody` yerine `t.linkFailRetry` ("Lütfen daha sonra tekrar dene.") gösterilir (`hakkinda.tsx:33`).
  - MMKV+Nitro kaldırma: vc 24 zaten %100 AsyncStorage kullandığı için yükseltmede kullanıcı verisi kaybı yok.
- **vc 25 derleme ve doğrulama aşamasında dikkat edilecek 2 nokta:**
  1. **Yerel Gradle/CMake temizliği [kesin]:** `react-native-mmkv` ve `react-native-nitro-modules` kaldırıldığı için vc 25 yerel production AAB öncesi `android/app/.cxx` silinip temiz prebuild/derleme alınmalı (aksi halde eski CMake/JNI artıkları derlemeyi düşürür).
  2. **Widget headless cihaz testi [muhtemel]:** `apps/mobile/index.js:12-22` değişikliği planda henüz cihazda test edilmemiş (1.5); vc 25 yayınlanmadan A03'te widget ekle + ↻ yenile + vakit güncellemesi mutlaka denenmeli.

---

## Özet Bulgular Tablosu

| Bulgu | Derece | Öneri | Öncelik |
|---|---|---|---|
| Web `/privacy`, `/privacy/en`, `/support` `<title>` çift marka eki (`— Kuran Yolu — Kuran Yolu`) — `apps/web/src/app/layout.tsx:28`, `privacy/page.tsx:5`, `privacy/en/page.tsx:5`, `support/page.tsx:5` | kesin | Üç sayfada `title` sonundan `" — Kuran Yolu"` kaldır (`hakkinda/page.tsx:7` gibi) | **şimdi** |
| Web `/support` "İsteğe bağlı / Optional bulut yedeği" ifadesi kodla çelişiyor (`cloudBackup.ts:182-199` varsayılan açık) — `apps/web/src/app/support/page.tsx:23,43` | kesin | "Otomatik bulut yedeği (uygulama içinden kapatılıp silinebilir)" / EN karşılığıyla hizala | **şimdi** |
| `mushaf-sayfa.tsx` tecvid yükleme `useEffect` ile erken toggle yarışı (UI ve AsyncStorage ayrışabilir; aynı desen `ayah/[surahId]/[ayahNumber].tsx:427-441` ve `surah/[id].tsx:186-200`'de de var) — `apps/mobile/app/mushaf-sayfa.tsx:251-258, 457-464` | kesin | `touchedRef` ile kullanıcı dokunduktan sonra geç dönen `getString` sonucunu yoksay | **vc 25 öncesi** (veya **şimdi**) |
| `index.js` `Platform.OS === 'android'` widget kaydı henüz cihazda denenmedi — `apps/mobile/index.js:4,12-22` | muhtemel | A03'te widget ekleme + ↻ + vakit güncellemesi testi yap; vc 25 öncesi `android/app/.cxx` temizleyerek AAB al | **vc 25 öncesi** |
| `hakkinda.tsx` e-posta/link hatasında `linkFailBody` yerine `linkFailRetry` ("tekrar dene") gösteriyor; `linkFailBody` kullanılmıyor — `apps/mobile/app/hakkinda.tsx:33`, `src/i18n/strings/hakkinda.ts:6,24` | kesin | Hata uyarısında `t.linkFailBody` kullan (veya `linkFailBody`'yi temizle) | **sonra** |
| Monorepo `expo` sürüm farkı (`~56.0.12` ↔ `~56.0.15`) — `package.json:56`, `apps/mobile/package.json:23` | muhtemel | vc 25'ten ayrı dalda iki paketi aynı `expo` sürümüne eşitle | **iOS derlemesi öncesi** |
| `eas.json` `submit.production.ios` boş (`ascAppId`, `appleTeamId`) — `apps/mobile/eas.json:24-26` | kesin | ASC oturumu açılınca ekle | **iOS derlemesi öncesi** |
| Ham `Info.plist` izin metinleri Türkçe (`en.lproj` İngilizceyi çözüyor ama fallback Türkçe) ve kullanılmayan `NSMotionUsageDescription` — `apps/mobile/app.config.js:5-8, 44, 148-154` | kesin | İsteğe bağlı: ham `Info.plist` metinlerini EN yap + `motionUsagePermission: false` / `motionPermission: false` ile `NSMotionUsageDescription` temizle | **iOS derlemesi öncesi** (isteğe bağlı) |
| Sentry iOS Debug ID (`getSentryExpoConfig`), çifte `insets.top` (`elifba/index.tsx:405`, `search.tsx:563`), bildirim route/deprecated `shouldShowAlert`, web OG/`canonical`/`rel="noopener noreferrer"` ve küçük ölü kodlar (`readKuranTabSync`, `readInitialStreak`, `index.ts:50`) | kesin / muhtemel | Aşama 6 / ayrı temizlik PR'larında ele al | **sonra** |
