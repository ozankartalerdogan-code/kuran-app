# Neon İncelemesi — iOS Hazırlık İş Planı (23 Kasım 2026)

> **Kapsam & Yöntem:** Yalnız dosya okuma ve web/Apple doküman doğrulaması yapıldı; terminal çalıştırılmadı, proje dosyaları değiştirilmedi. Derecelendirme: **kesin** (kodda/SDK dosyasında/Apple resmî belgesinde doğrulandı), **muhtemel** (bilinen platform/ITMS/derleme davranışı, gerçek build/cihazda teyit edilmeli), **emin değilim** (EAS/ASC portal durumuna veya taranamayan dosyalara bağlı).

---

## 0. Claude'un İki Doğrulama Notuna Yanıt

### A) Privacy Manifest `0A2A.1` (`apps/mobile/app.config.js:60`)
- **Kural ihlali [kesin]:** Apple'ın *"Describing use of required reason API"* resmî belgesinde `NSPrivacyAccessedAPICategoryFileTimestamp` → `0A2A.1` için açık kural şudur: *"This reason may only be declared by third-party SDKs."* Kod kaynağını da buldum: `node_modules/expo-file-system/ios/PrivacyInfo.xcprivacy:14-31` kendi SDK manifestinde `FileTimestamp: ['0A2A.1', '3B52.1']` ve `DiskSpace: ['E174.1', '85F4.1']` beyan ediyor; `app.config.js:60-61`'e bu SDK nedenleri birebir kopyalanmış. Ayrıca `node_modules/react-native/React/Resources/PrivacyInfo.xcprivacy:11,20` ve `node_modules/@react-native-async-storage/async-storage/ios/PrivacyInfo.xcprivacy:14` zaten `C617.1` ve `CA92.1` içeriyor.
- **Claude'un itirazı haklı mı? Kısmen evet:** Önceki rapordaki *"kesin ITMS reddi"* ifadesi fazla keskin. `0A2A.1`'in uygulama manifestinde yer alması Apple'ın yazılı kuralına **kesin** aykırıdır ve `ITMS-91056` (*Invalid privacy manifest*) / inceleme uyarısı riski doğurur; ancak her yüklemede otomatik reddedildiği kesinleşmiş değil → **ITMS ret riski: muhtemel**.
- **Karar:** `app.config.js:60-61`'i `FileTimestamp: ['C617.1']` ve `DiskSpace: ['E174.1']` yapmak 2 satır, Android'e 0 etkili ve sıfır riskli olduğu için Aşama 1'de temizlenmeli **[kesin]**.

### B) `hakkinda.tsx` `mailto:` ve `LSApplicationQueriesSchemes` (`apps/mobile/app/hakkinda.tsx:28-34`)
- **Doğrulama [kesin]:** Apple'ın `UIApplication.canOpenURL(_:)` resmî belgesine göre iOS 9+'dan beri `Info.plist` içinde `LSApplicationQueriesSchemes` altında beyan edilmeyen tüm şemalar (özel istisna olmaksızın `mailto` dahil) için `canOpenURL` **her zaman `false`** döner.
- **Doğrudan `Linking.openURL` farkı [kesin]:** `UIApplication.open(_:options:completionHandler:)` (`Linking.openURL`) için `LSApplicationQueriesSchemes` **gerekmez**; cihazda posta uygulaması varsa açar, yoksa Promise reddedilir ve `catch` bloğu çalışır. Dolayısıyla `hakkinda.tsx:28-32`'den `canOpenURL` kontrolünü kaldırmak (`gizlilik.tsx:195` deseni) `Info.plist` değiştirmeden sorunu kökünden çözer.

---

## 1. Karar — MMKV (Aşama 2): **Seçenek A (MMKV'yi kaldır, yalnız AsyncStorage)** [kesin]

### Seçenek B (`createMMKV()`) için veri kaybı / bozulma riski gerçek mi? **EVET — üstelik planda yazandan daha ciddi 2 kesin bug var:**
1. **Silinen anahtarın "zombi gibi dirilmesi" bug'ı (`apps/mobile/src/lib/storage.ts:149-150, 177-188`) [kesin]:**
   - `runMigration()` (`storage.ts:58-66`) taşıdığı anahtarları AsyncStorage'dan silmiyor.
   - `storage.remove(key)` ve `removeMany(keys)` (`storage.ts:177-188`) MMKV açıkken **yalnız MMKV'den siliyor, AsyncStorage'a dokunmuyor**.
   - Sonuç: Eski sürümde AsyncStorage'da bulunan bir anahtar MMKV'de silindiğinde, sonraki ilk `storage.getString(key)` çağrısı `storage.ts:149-150`'deki tembel migrasyon yedeğine düşer ve **eski değeri AsyncStorage'dan bulup MMKV'ye geri kopyalayarak diriltir!**
   - **Doğrudan kırılan akışlar:**
     - `cloudBackup.ts:255` (`storage.remove(DISABLED_KEY)`): Bulut yedeğini eski sürümde silen kullanıcı yükseltme sonrası yeniden açmak istediğinde `DISABLED_KEY="1"` AsyncStorage'dan dirilir → **bulut yedek bir daha açılamaz**.
     - `i18n/index.ts:81` (`storage.remove("uiLanguage")`): "Sistem" diline dönüldüğünde eski dil AsyncStorage'dan dirilir.
     - `namazNotifications.ts:450,460,538,557,616,634` (`storage.remove(SCHED_DAY_KEY)`): Şehir/dil/izin değişiminde damga silinir; eski damga AsyncStorage'dan dirilirse bildirimlerin yeniden planlanması atlanır.
2. **İlk yükseltme açılışında boş ekran yarışı (`storage.ts:76` + `apps/mobile/app/(tabs)/kuran.tsx:93-94`) [kesin]:**
   - `runMigration()` asenkrondur (`AsyncStorage.multiGet`). Yükseltme sonrası ilk açılışta `usingMmkv === true` olur; `kuran.tsx:93-94` (`if (usingMmkv) { applyResume(readKuranTabSync()); return; }`) asenkron okumayı tamamen atladığı için migrasyon bitmeden sekmeye girilirse son okunan sayfa, hatim ve favori sayısı geçici olarak boş görünür.
3. **Doğrudan `AsyncStorage` kullanan dosyalar [muhtemel — neredeyse kesin]:**
   - İncelenen 30+ çekirdek dosyada (`useFavorites`, `useNotes`, `useStreak`, `useDersProgress`, `useColors`, `useFontScale`, `i18n`, `namazNotifications`, `prayerContextDeps`, `diyanetPrayerDeps`, `prayerDayRepositoryDeps`, `startPreference`, `appTourStorage`, `useDailyContent`, `useStoreReview`, `exactAlarmPrompt`, `cloudBackup`, `ZikirMatik`, `HatimPanel`, `namazWidgetData`, `api`, `mushaf-sayfa`, `elifba/*`, `search`, `onboarding`, `bildirimler`) doğrudan `AsyncStorage` importu yok; hepsi `storage.ts` üzerinden gidiyor. (Not: başsız modda grep çalışmadığından Aşama 2 uygulanırken tek bir `rg "async-storage"` doğrulaması yapılmalı.)
   - **Küçük düzeltme:** Plandaki `elifbaQuizScores` örneği `STORAGE_KEYS.quizScores` (`storage.ts:13`) içinde zaten var; `STORAGE_KEYS` dışında kalan asıl anahtarlar `namazNotifEnabled`, `dailyVerseNotifEnabled`, `namazNotifSchedDay`, `uiLanguage`, `lastKnownCoords`, `diyanetManualCityV1`, `tespih_*`, `cloud_backup_disabled_v1`, `store_review_*` anahtarlarıdır. Bunlar `storage.getString` tembel migrasyonuyla okunabilir olsa da yukarıdaki `remove()` dirilme bug'ı ve `getStringSync()` yarışı Seçenek B'yi gereksiz yere tehlikeli kılar.

### Neden Seçenek A ve paket temizliği?
- **Seçim: A [kesin].** Uygulama bugüne kadar fiilen %100 AsyncStorage ile çalıştı; A'da kullanıcı verisi ve davranış sıfır değişir, iOS'taki `react-native-nitro-modules` + `useFrameworks: 'static'` C++20/ObjC++ derleme riski tamamen yok olur, Android AAB boyutu ve native CMake derleme süresi azalır.
- **Kaldırılabilecek paketler [kesin]:** `apps/mobile/package.json:48-49`'daki `react-native-mmkv` ve `react-native-nitro-modules` başka hiçbir paket tarafından kullanılmıyor (`node_modules/react-native-mmkv/package.json:79` dışında peer/dep bağımlısı yok; kök `package.json`, `apps/web/package.json`, `packages/core/package.json`'da geçmiyorlar). İkisi birlikte kaldırılabilir.
- **Temizlenecek kod yerleri [kesin]:** `src/lib/storage.ts:3,34-76,130-152,178,184-185` (sade AsyncStorage), `app/(tabs)/kuran.tsx:14,93-94` (`usingMmkv` kaldır), ayrıca `app.config.js:53,68` yorumları. (`getStringSync`/`getJSONSync` çağrı yerleri — `useColors.ts:163`, `i18n/index.ts:42`, `useFontScale.ts:15`, `useStreak.ts:47`, `kuran.tsx:61-67` — zaten async fallback'e sahip; istenirse bu sync dalları da temizlenebilir, bırakılsa bile `null` dönüp bugünkü gibi çalışır.)

---

## 2. Karar — Sıralama ve Android vc 25 Sınırı

- **Genel sıra doğru, 2 önemli iyileştirme gerekli [kesin]:**
  1. **`captchaOpenUrlFix: false` Aşama 4'ten Aşama 1'e çekilmeli** (`app.config.js:223`): EAS bulut iOS build kotasını kırılma görüp tekrar yakmak yerine baştan 1 satırla önlenmeli.
  2. **Aşama 4 (TestFlight bulut derlemesi) Apple itirazını beklememeli:** TestFlight Internal Testing App Review'a gitmez ve mevcut 4.2 itirazını etkilemez. İtiraz cevabı beklenirken ilk iOS `.ipa` derlenip test edilmeli.

| Zamanlama | Yapılacaklar | Gerekçe |
|---|---|---|
| **Şimdi (itiraz beklenirken)** | **Aşama 1** (1.1–1.5 + `kible.tsx:383` + `captchaOpenUrlFix: false` + `removeClippedSubviews` iOS kapatma), **Aşama 2-A** (MMKV+Nitro kaldırma), **Aşama 3** (3.1–3.4 + `eas.json` submit ayarları + ASC meta veri/ekran görüntüsü/EN gizlilik URL'si hazırlığı), **Aşama 4** (EAS TestFlight build + test) | Hiçbiri 4.2 itirazını etkilemez; karar çıktığı gün App Store gönderimine hazır olunur. **[kesin]** |
| **İtiraz sonuçlanınca** | **Aşama 5** (App Store'a *Submit for Review* — kabul → güncelleme, ret → yeni binary gönderimi) | Aktif itiraz varken App Store gönderimi çakışır. **[kesin]** |
| **Yayın sonrası** | **Aşama 6** (`ios.appStoreUrl`, iOS "Puanla" düğmesi, `widget-ekle` metni, `getSentryExpoConfig`, bildirim route düzeltmesi) | `appStoreUrl` uygulama canlıya çıkmadan çalışmaz; diğerleri gönderim blokeri değil. **[kesin]** |
| **Android vc 25 ile çıkması güvenli olanlar** | **Aşama 1'in tamamı** + **Aşama 2-A** (temiz prebuild + A03 yükseltme/widget testiyle) | Aşama 1 Android'e zararsız/iyileştirici; Aşama 2-A AAB boyutunu düşürür, veri yapısını değiştirmez. **[kesin]** |
| **vc 25'ten ayrı tutulmalı** | **Aşama 3.5** (`expo` monorepo sürüm eşitleme) ve **Aşama 6** (`getSentryExpoConfig`) | Lockfile/Metro değişikliği vc 25 release öncesi gereksiz risk yaratır; ayrı PR'da doğrulansın. **[muhtemel]** |

---

## 3. Karar — iPhone'suz Test Stratejisi

Tek bir araç her şeyi çözmüyor; **iki aşamalı hibrit strateji** önerilir **[kesin]**:

1. **Genel UI + Akış + Yerel Bildirim İzni + Konum → BrowserStack App Live (gerçek bulut iPhone) [kesin]:**
   - Windows'tan tarayıcıyla gerçek iPhone'a EAS `preview`/`internal` (ad-hoc) `.ipa` yüklenebilir.
   - **Doğrulayabilecekleri:** Mushaf yatay `inverted` sayfa çevirme, açık/koyu tema, TR/EN dil, çentik/Dynamic Island `insets.top`, `mailto:`, Elif-Ba ses (`expo-audio`), ayet görsel kart paylaşımı, **mock GPS konumu** ve **yerel bildirim izni/planlaması** (gerçek cihaz olduğundan `Device.isDevice === true` — `namazNotifications.ts:98` engeline takılmaz).
   - **Doğrulayamayacakları [kesin]:** Bulut cihazlar rafta sabit olduğu için **Kıble pusulası dönüşü / manyetometre** test edilemez (yalnız konum + kıble açısı hesaplaması ve çökmeme doğrulanır). Uzun süreli `BGTaskScheduler` arka plan tazelemesi de kısa oturumda ölçülemez.
2. **Kıble Pusulası + Kilit Ekranı Bildirim Teslimi → TestFlight Internal Testing ile fiziksel iPhone (tanıdık/gönüllü cihazda 15 dk) [kesin]:**
   - App Store Connect'te *Internal Testing* grubuna eklenen bir tanıdığın iPhone'una Apple incelemesi beklemeden dakikalar içinde kurulur.
   - Kıble ekranında telefonu 360° çevirerek `Location.watchHeadingAsync` + `NSLocationDefaultAccuracyReduced: true` altında yön doğruluğu, hizalama haptiği ve ekran kilitliyken 1–2 vakit/test bildiriminin gelişi yalnız gerçek elde tutulan iPhone'da kesin doğrulanır.
3. **iOS Simülatör (kiralık bulut Mac / MacinCloud vb.):**
   - `namazNotifications.ts:98` (`if (!Device.isDevice) return false`) nedeniyle bildirim, donanım olmadığı için de pusula **test edilemez** **[kesin]**. Yalnız App Store Connect için kesin piksel boyutlu (örn. 6.9" `1320×2868`) temiz ekran görüntüsü almak gerekirse faydalıdır.

---

## 4. Plan Maddelerine Karar ve Aşama 1 Kod Biçimi

### Madde Bazlı Değerlendirme
- **1.1** (`expo-audio` `microphonePermission: false`) → **Katılıyorum** **[kesin]** — `node_modules/expo-audio/plugin/build/withAudio.js:8-13` doğrulandı; iOS `NSMicrophoneUsageDescription` kalkar, Android değişmez.
- **1.2** (Kıble izin metni platforma göre ayrılması) → **Değiştir** **[kesin]** — Metni ayırmaya katılıyorum; buna **`apps/mobile/app/kible.tsx:383`** (`Location.Accuracy.High` → `Location.Accuracy.Balanced`) değişikliğini de ekle. Gizlilik politikası (`gizlilik.json:49`, `gizlilik.en.json:99`) *"hassas (GPS) konum kullanılmaz"* diyor; iOS'ta kullanıcı Tam Konum açarsa `Accuracy.High` bu beyanla çelişir (Android'de zaten `ACCESS_FINE_LOCATION` engelli).
- **1.3** (`hakkinda.tsx` `canOpenURL` kaldırma) → **Katılıyorum** **[kesin]** — Doğrudan `Linking.openURL` + `catch` (`gizlilik.tsx:195` gibi) iOS `mailto:` kırığını çözer; `LSApplicationQueriesSchemes` gerekmez.
- **1.4** (`privacyManifests` temizliği) → **Katılıyorum** **[kesin]** — `FileTimestamp: ['C617.1']`, `DiskSpace: ['E174.1']`. SDK manifestleri doğrulandı (`expo-file-system`, `react-native`, `async-storage` kendi manifestlerini taşıyor).
- **1.5** (`index.js` widget kaydını `Platform.OS === 'android'` ile sar) → **Katılıyorum** **[kesin]** — iOS açılışında gereksiz modül/JSON yüklenmesini ve headless task kaydını keser.
- **YENİ 1.6 (Ekle — Aşama 4'ten öne çek):** `app.config.js:223` → `['@react-native-firebase/auth', { ios: { captchaOpenUrlFix: false } }]` → **Değiştir (Aşama 1'e al)** **[muhtemel]** — `node_modules/@react-native-firebase/auth/plugin/build/ios/openUrlFix.js:31-38,135-146` doğrulandı; anonim auth reCAPTCHA kullanmaz, kırılgan Swift `AppDelegate` regex riskini ilk EAS build'den önce sıfırlar.
- **YENİ 1.7 (Ekle — Aşama 6'dan öne çek):** `removeClippedSubviews={Platform.OS === "android"}` (`app/mushaf-sayfa.tsx:648`, `app/surah/[id].tsx:307`, `app/tafsir/[surahId].tsx:179`) → **Değiştir (Aşama 1'e al)** **[muhtemel]** — `app/search.tsx:769`'da zaten böyle yapılmış; yatay `inverted` Mushaf'ta iOS boş-sayfa kırpılma riskini 3 satırda, Android'e 0 etkiyle önler.
- **Aşama 2 (MMKV):** **Katılıyorum (Seçenek A)** **[kesin]** — `react-native-mmkv` ve `react-native-nitro-modules` kaldırılsın, `storage.ts` ve `kuran.tsx:14,93-94` sadeleştirilsin.
- **3.1–3.4** (EAS env'leri, Apple Push capability, `icon.png`) → **Katılıyorum** **[kesin/muhtemel]** — 3.2'ye `EXPO_PUBLIC_SENTRY_DSN` kontrolü de eklenmeli.
- **3.5** (`expo` sürüm eşitleme `~56.0.12` / `~56.0.15`) → **Değiştir** **[muhtemel]** — Ayrı PR'da ve vc 25 sonrasına bırakılabilir; lockfile değişimi acil iOS blokeri değil.
- **YENİ 3.6 (Ekle):** `apps/mobile/eas.json:24-26` `submit.production.ios` içine `ascAppId` ve `appleTeamId` ekle + `eas build:version:get -p ios` kontrolü → **Ekle** **[kesin]**.
- **Aşama 4 (TestFlight build):** **Değiştir** **[kesin]** — Apple itirazı beklenmeden çalıştırılsın; iPhone yoksa BrowserStack + tanıdık iPhone TestFlight hibrit akışı uygulansın.
- **Aşama 5 (App Store gönderimi):** **Değiştir (eksikleri tamamla)** **[kesin]** — Aşağıdaki Bölüm 5 eksikleri (TR/EN ekran görüntüleri, EN gizlilik politikası & destek URL'si, 2026 yaş anketi + "Made for Kids" kapalı, sürüm numarası kararı) kontrol listesine eklensin.
- **Aşama 6 (Sonra):** **Değiştir** **[kesin]** — `removeClippedSubviews` Aşama 1'e çekilsin; yayın sonrası iOS "Puanla" düğmesi açılmadan önce `src/i18n/strings/dahaFazla.ts:28,61` ("Google Play" metni → platforma göre "App Store") ve `src/hooks/useStoreReview.ts:71-73` fallback URL'si mutlaka düzeltilsin (aksi halde Guideline 2.3.10 reddi). Ayrıca `app/_layout.tsx` içine `gizlilik` için `headerBackTitle: t.back` ve istenirse `app.config.js:149,152` `motionUsagePermission: false` / `motionPermission: false` (iOS Kıble CoreMotion kullanmıyor) eklenebilir.

### Aşama 1 — Önerilen Kısa Kod Değişiklikleri

**1.1, 1.4 ve 1.6 (`apps/mobile/app.config.js:60-61, 216, 223`):**
```js
// satır 60-61:
{ NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp', NSPrivacyAccessedAPITypeReasons: ['C617.1'] },
{ NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace', NSPrivacyAccessedAPITypeReasons: ['E174.1'] },

// satır 216:
['expo-audio', { recordAudioAndroid: false, microphonePermission: false }],

// satır 223:
['@react-native-firebase/auth', { ios: { captchaOpenUrlFix: false } }],
```

**1.2 (`apps/mobile/src/i18n/strings/kible.ts:7,36` + `apps/mobile/app/kible.tsx:316-318,383`):**
```ts
// kible.ts — tr:
permBody: "Kıble pusulası için konum iznine ihtiyaç var.\n\nAyarlar → Uygulama → Kuran Yolu → İzinler → Konum → İzin Ver",
permBodyIos: "Kıble pusulası için konum iznine ihtiyaç var.\n\nAyarlar → Kuran Yolu → Konum",
// kible.ts — en:
permBody: "The Qibla compass needs location permission.\n\nSettings → Apps → Kuran Yolu → Permissions → Location → Allow",
permBodyIos: "The Qibla compass needs location permission.\n\nSettings → Kuran Yolu → Location",

// kible.tsx:318:
Platform.OS === "ios" ? t.permBodyIos : t.permBody,

// kible.tsx:383 (gizlilik metni uyumu — Android'de zaten COARSE):
Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
```

**1.3 (`apps/mobile/app/hakkinda.tsx:24-41`):**
```ts
async function openExternalUrl(url: string) {
  const t = getStrings(hakkindaStrings);
  try {
    void Haptics.selectionAsync();
    await Linking.openURL(url);
  } catch (error) {
    if (__DEV__) console.warn("Failed to open external URL", error);
    Alert.alert(t.linkFailTitle, t.linkFailBody);
  }
}
```

**1.5 (`apps/mobile/index.js:10-18`):**
```js
import { Platform } from 'react-native';

if (Platform.OS === 'android') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerWidgetTaskHandler } = require('react-native-android-widget');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { widgetTaskHandler } = require('./src/widgets/widget-task-handler');
    registerWidgetTaskHandler(widgetTaskHandler);
  } catch {
    // no-op — widget native modülü henüz build'e girmedi
  }
}
```

**1.7 (`apps/mobile/app/mushaf-sayfa.tsx:648`, `surah/[id].tsx:307`, `tafsir/[surahId].tsx:179`):**
```tsx
removeClippedSubviews={Platform.OS === "android"}
```

---

## 5. Planda Eksik Olan App Store / iOS Gereksinimleri

| Konu | Durum & Gerekçe | Beklenen Etki | Derece |
|---|---|---|---|
| **Ekran görüntüleri (TR + EN)** | 2025/2026 ASC kuralı: en az 1 zorunlu iPhone seti (Dynamic Island 6.9" `1320×2868` veya 6.3"/6.1" `1206×2622` / `1179×2556`, alfa kanalsız PNG/JPG, 1–10 adet). `app.config.js:50` `tr`+`en` beyan ettiği için her iki dilin mağaza sayfasına kendi dilinde gerçek UI ekran görüntüleri yüklenmeli (4.2 algısını da ciddi güçlendirir). | Eksik veya İngilizce inceleyicide Türkçe görsel → 2.3 / 4.2 riski. | **kesin** |
| **iPad ekran görüntüsü** | `app.config.js:31` `supportsTablet: false` → **Gerekmiyor.** Yalnız `prebuild` sonrası `TARGETED_DEVICE_FAMILY=1` olduğu doğrulanmalı; aksi halde 13" iPad Pro (`2064×2752`) zorunlu olur ve gerilmiş iPhone görüntüsü 2.3.3'ten reddedilir. | Doğru ayarlanmış, ek iş yok. | **kesin** |
| **İngilizce Gizlilik Politikası URL'si & Destek URL'si** | `apps/web/src/app/privacy/page.tsx:6-95` yalnız **Türkçe** (`kuran-app-web-ozan-s-projects8.vercel.app/privacy`). Uygulama içi `gizlilik.en.json` İngilizce ama ASC'de İngilizce mağaza sayfası için İngilizce gizlilik URL'si (veya aynı sayfada TR/EN geçişi) ve 200 dönen gerçek bir **Destek URL'si** (iletişim e-postası + kısa yardım) zorunlu (Guideline 1.5 / 5.1.1). | Kırık/Türkçe-only URL incelemede meta veri reddine yol açabilir. | **kesin** |
| **Sign in with Apple (Guideline 4.8)** | **Gerekmiyor.** Kodda (`cloudBackup.ts:88-96`, `package.json`) yalnız Firebase Anonymous Auth var; Google/Facebook vb. 3. parti sosyal giriş yok. | Ek iş yok. | **kesin** |
| **Dışa aktarma uyumu (Export Compliance)** | `app.config.js:41` `usesNonExemptEncryption: false` zaten ayarlı (yalnız standart HTTPS/TLS). | Her build'de uyumluluk formu sormaz; ek iş yok. | **kesin** |
| **Yaş derecelendirmesi (2026 yeni sistem)** | Apple 31 Ocak 2026'da 5 kademeli anketi (**4+, 9+, 13+, 16+, 18+**) zorunlu kıldı; Eylül 2026'da **Sosyal Medya**, Kasım 2026'da (son tarih 12 Ocak 2027) **Paylaşılan Konum** ve **Dating** soruları eklendi. Uygulama UGC/sohbet/AI chatbot içermediğinden **4+** çıkar. **Kritik:** ASC'de **"Made for Kids" kesinlikle işaretlenmemeli** (Guideline 1.3 Firebase Analytics + dış linkleri engeller; `gizlilik.en.json:238` zaten 13+ diyor). | Anket eksikse gönderim bloklanır; "Made for Kids" açılırsa ret yer. | **kesin** |
| **Kur'an / Dini içerik özel kuralları** | Kur'an'a özgü ayrı yasak yok; ancak Guideline **1.1** (saygılı, nefret söylemsiz metin — mevcut içerik temiz), **2.1** ("Yakında" metni olmaması — `widget-ekle.tsx` menüden gizli ama derin linkte duruyor), **4.2** (native çevrimdışı araç vurgusu) ve **5.1.1(v)** (hesap silme — `gizlilik.tsx:139-170` hazır; yalnız `cloudBackup.ts:239`'da `user.delete()` hatası yutuluyor, log/yeniden deneme not düşülmeli) geçerli. | İnceleme notu ve hesap silme akışı kritik. | **kesin** |
| **In-App Rating (`expo-store-review`)** | `useStoreReview.ts:29-63` otomatik istemi iOS'ta aktif ve Apple'ın native `SKStoreReviewController` kotasına uyumlu. Manuel puanlama düğmesi şimdilik iOS'ta gizli (`daha-fazla.tsx:56-58`); yayın sonrası açılırken `dahaFazla.ts:28,61` ("Google Play" → "App Store") ve `useStoreReview.ts:71-73` fallback URL'si düzeltilmeli. | Yayın sonrası 2.3.10 reddini önler. | **kesin** |
| **EAS Submit ayarları (`eas.json`)** | `apps/mobile/eas.json:24-26` boş (`"submit": { "production": {} }`). `submit.production.ios` altına `ascAppId` ve `appleTeamId` eklenmeli. | `eas submit` tek komutla hatasız çalışır. | **kesin** |
| **Sürüm & Derleme numarası** | Android `1.2.4` (vc 24/25), iOS son gönderim `1.2.0` (4.2 itirazında). Yeni iOS gönderimi **`1.2.4`** (veya Android `1.2.5`'e geçtiyse `1.2.5`) olmalı — `1.2.0`'dan yüksek ve Android ile tutarlı (`hakkinda.tsx:21`). `CFBundleVersion` EAS `appVersionSource: "remote"` + `autoIncrement: true` (`eas.json:4,15`) ile Android'den bağımsız yönetilir; `eas build:version:get -p ios` ile `ITMS-90189` çakışması olmadığı doğrulanmalı. | Sürüm uyumsuzluğu ve `ITMS-90189` önlenir. | **kesin** |
| **App Store Connect "App Privacy" kapsamı** | Plana ek: `gizlilik.en.json:15-115` ile tam eşleşme için **Product Interaction** (Firebase Analytics), **Crash Data & Diagnostics** (Sentry), **User ID** (anonim Firebase UID), **Coarse Location** (namaz vakitleri), **Other User Content** (bulut yedeğindeki favori/notlar) seçilmeli; tamamı *App Functionality / Analytics*, **Not Linked to You**, **Not Used to Track You** olmalı. | Gizlilik beyanı ile binary/politika uyumsuzluğu (5.1.1) önlenir. | **kesin** |

---

## 6. Android Tarafını Bozabilecek Riskler

1. **Aşama 2-B seçilirse Android vc 24 → vc 25 yükseltmesi bozulur [kesin]:** `storage.ts:177-188` `remove()` dirilme bug'ı (bulut yedek yeniden açma, dil "Sistem"e dönme, bildirim damgası sıfırlama) ve `kuran.tsx:93-94` ilk-açılış yarışı doğrudan Android kullanıcılarını vurur → **Seçenek A ile tamamen engellenir**.
2. **Aşama 2-A'da MMKV + Nitro kaldırılırken stale Android CMake/autolinking önbelleği [kesin]:** `plugins/with-native-clean-codegen-ordering.js`'in varlığı yerel Android CMake clean hassasiyetini gösteriyor. Paketler kaldırıldıktan sonra temiz `prebuild`/build alınmazsa eski `RNMMKV`/`NitroModules` JNI referansları yerel AAB derlemesini kırabilir; ayrıca `kuran.tsx:14,93-94` `usingMmkv` referansı silinmezse TypeScript kırılır.
3. **Aşama 1.5 (`index.js:10-18`) Android widget headless kaydı [muhtemel]:** `index.js` tüm Android widget arka plan görevlerinin giriş noktasıdır ve `try/catch` hataları sessizce yutar. `Platform` importu/koşulu hatalı yazılırsa Android widget'ları sessizce donar → vc 25 öncesi A03'te widget ekleme + ↻ yenileme + vakit güncellemesi mutlaka denenmeli.
4. **Aşama 1.2 (`kible.ts`) i18n tip kırılması [kesin]:** `defineStrings` (`src/i18n/index.ts:110`) `tr` ve `en` anahtarlarının birebir eşleşmesini zorunlu kılar; `permBodyIos` her iki dile eklenmeli.
5. **Aşama 3.5 (`expo` sürüm hizalama) & Aşama 6 (`getSentryExpoConfig`) [muhtemel]:** Lockfile hoisting değişimi ve `metro.config.js:21-41`'deki özel `resolveSingleton`/`node:` çözümleyicisiyle olası çakışma Android release bundle'ını etkileyebilir → vc 25'ten ayrı dalda ve tam A03 testiyle yapılmalı.

---

## Özet Karar Tablosu

| Madde | Neon kararı | Gerekçe | Öncelik |
|---|---|---|---|
| **1.1** `expo-audio` `microphonePermission: false` (`app.config.js:216`) | **Katılıyorum** | iOS'ta kullanılmayan İngilizce mikrofon iznini kapatır; gizlilik metni (`gizlilik.json:70`) ve 5.1.1 uyumu. Android'e 0 etki. [kesin] | **P0** |
| **1.2** Kıble izin metni + `Accuracy.Balanced` (`kible.ts:7,36`, `kible.tsx:318,383`) | **Değiştir** | iOS ayar yolunu ayır + `kible.tsx:383`'ü `Accuracy.Balanced` yap (gizlilik metnindeki "GPS yok" beyanıyla iOS uyumu). [kesin] | **P0** |
| **1.3** `hakkinda.tsx` `canOpenURL` kaldırma (`hakkinda.tsx:28-34`) | **Katılıyorum** | iOS 9+'da `LSApplicationQueriesSchemes` olmadan `canOpenURL("mailto:")` kesin `false` döner; doğrudan `openURL` sorunu çözer. [kesin] | **P0** |
| **1.4** Privacy Manifest temizliği (`app.config.js:60-61`) | **Katılıyorum** | `0A2A.1` Apple belgesinde yalnız 3. parti SDK'lar için (zaten `expo-file-system` manifestinde var); `C617.1` + `E174.1` güvenli. [kesin] | **P0** |
| **1.5** `index.js` widget kaydına Android guard (`index.js:10-18`) | **Katılıyorum** | iOS açılışında gereksiz widget modülü/JSON yüklemesini önler; A03'te widget headless testi şart. [kesin] | **P1** |
| **1.6 (Yeni)** Firebase Auth `captchaOpenUrlFix: false` (`app.config.js:223`) | **Değiştir (Aşama 1'e çek)** | Anonim auth reCAPTCHA kullanmaz; Swift `AppDelegate` regex kırılma riskini ilk EAS build öncesi sıfırlar. [muhtemel] | **P1** |
| **1.7 (Yeni)** `removeClippedSubviews` iOS'ta kapat (`mushaf-sayfa.tsx:648`, `surah/[id].tsx:307`, `tafsir/[surahId].tsx:179`) | **Değiştir (Aşama 1'e çek)** | `search.tsx:769` ile tutarlı; yatay `inverted` Mushaf'ta iOS boş-sayfa riskini Android'e 0 etkiyle önler. [muhtemel] | **P1** |
| **Aşama 2** MMKV kararı (`storage.ts`, `package.json:48-49`) | **Katılıyorum — Seçenek A** | B'de `storage.remove` zombi dirilme + `kuran.tsx:93-94` yarış bug'ları var. MMKV+Nitro başka yerde kullanılmıyor; ikisi de kaldırılsın. [kesin] | **P0** |
| **3.1–3.4** EAS env'leri (`GOOGLE_SERVICES_PLIST`, `SENTRY_AUTH_TOKEN`, `EXPO_PUBLIC_SENTRY_DSN`), Push capability, `icon.png` | **Katılıyorum** | Plist olmadan prebuild kesin kırılır; `icon.png` alfa kanalı ASC yüklemesini reddeder. [kesin/emin değilim] | **P0** |
| **3.5** Kök & mobil `expo` sürüm eşitleme (`package.json:56`, `apps/mobile/package.json:23`) | **Değiştir** | Android vc 25'ten ayrı PR'da yap; acil iOS blokeri değil, lockfile dalgalanması vc 25'i etkilemesin. [muhtemel] | **P2** |
| **3.6 (Yeni)** `eas.json` iOS submit profili + buildNumber kontrolü (`eas.json:24-26`) | **Ekle** | `ascAppId` ve `appleTeamId` boş; `eas build:version:get -p ios` ile `ITMS-90189` önlenir. [kesin] | **P1** |
| **Aşama 4** İlk EAS iOS TestFlight derlemesi & iPhone'suz test | **Değiştir** | Apple itirazı beklenmeden yapılsın. Test için hibrit yol: BrowserStack App Live (UI/bildirim izni/GPS) + tanıdık iPhone TestFlight (pusula + kilit ekranı bildirimi). [kesin] | **P0** |
| **Aşama 5** App Store gönderimi & meta veri (ekran görüntüsü, EN gizlilik/destek URL'si, 2026 yaş anketi, sürüm `1.2.4`) | **Değiştir (eksikleri ekle)** | İtiraz sonucunu bekle. TR+EN iPhone ekran görüntüsü (iPad gerekmez), EN gizlilik + canlı destek URL'si, 2026 yaş anketi (4+, "Made for Kids" KAPALI), Sign in with Apple gerekmez. [kesin] | **P0** |
| **Aşama 6** `getSentryExpoConfig`, bildirim route, `appStoreUrl`, iOS "Puanla" (`dahaFazla.ts:28,61`), `widget-ekle`, `gizlilik` back başlığı | **Değiştir** | Yayın sonrası güvenli; iOS "Puanla" açılmadan "Google Play" metni ve fallback URL mutlaka platforma göre ayrılmalı (2.3.10). [kesin] | **P2** |
| **Android vc 25** Kilit ekranı widget'ı + Aşama 1 & 2-A | **Katılıyorum** | Aşama 1 + 2-A vc 25 ile güvenle çıkabilir (temiz prebuild + A03 widget/yükseltme testiyle). 3.5 ve 6 ayrı tutulsun. [kesin] | **P1** |
