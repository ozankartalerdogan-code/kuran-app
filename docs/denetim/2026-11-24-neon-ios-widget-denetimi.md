# Neon Denetimi N4 — iOS Namaz Widget'ı (commit `30f387b4`)

- **Tarih:** 2026-11-24
- **Dal:** `release/vc25`
- **Kapsam:** Salt okunur derleyici-gözü denetimi (`apps/mobile/targets/namaz-widget/`, `apps/mobile/src/widgets/iosWidget.ts`, `namazWidgetData.ts`, `widgetRefresh.ts`, `app.config.js`, `@bacons/apple-targets` 5.0.0)
- **Genel Karar:** **DERLEMEYE HAZIR (1 YÜKSEK davranış bug'ı ile)** — Swift 5.9/6 + iOS 17 SDK'da **derleme hatası tespit edilmedi**; `@bacons/apple-targets` şeması, veri sözleşmesi, Android hesap eşitliği ve kilit ekranı görünümleri doğru. Ancak ilk EAS build'inden önce `useColors.ts:189`'daki tek satırlık iOS tema tazeleme engelinin kaldırılması önerilir (aksi hâlde iOS'ta uygulama içi tema değişikliği widget'a anında yansımaz).

---

## 1. Bulgu Tablosu

| # | Önem | Dosya:Satır | Sorun | Somut Senaryo / Risk | Öneri |
|---|---|---|---|---|---|
| 1 | **YÜKSEK** | `apps/mobile/src/hooks/useColors.ts:189` | `toggleTheme()` içinde `if (Platform.OS !== "android") return;` koruyucusu kalmış. | iOS kullanıcısı uygulama içinden açık/koyu temayı değiştirdiğinde `nightMode` kaydedilir ama `refreshPrayerWidgetsNow()` hiç çağrılmaz. Widget, kullanıcı uygulamayı arka plana atıp tekrar açana veya şehir/dil değiştirene kadar eski temada kalır. | Koruyucuyu `if (Platform.OS !== "android" && Platform.OS !== "ios") return;` yap veya kaldır (`refreshWidgetNow()` iOS'ta `AndroidWidgetModule == null` nedeniyle zaten no-op). |
| 2 | **ORTA** | `apps/mobile/app.config.js:183-186` & `apps/mobile/targets/namaz-widget/expo-target.config.js:6` | `eas.json` `"appVersionSource": "remote"` kullanırken `app.config.js`'te `ios.buildNumber` yok; `@bacons/apple-targets` (`with-widget.js:254`) widget hedefinin `CURRENT_PROJECT_VERSION` değerini `1` olarak başlatır. Ayrıca ana app varsayılan deployment target'ı (Expo SDK 56: iOS 15.1/16.0) widget'ın `17.0` hedefinden düşük. | (a) EAS Build'in `autoIncrement: true` adımı uzantının `CFBundleVersion` değerini ana hedefle eşitlemezse App Store Connect `ITMS-90473 (CFBundleVersion Mismatch)` ile reddedebilir. (b) Ana app < uzantı `MinimumOSVersion` Apple tarafından desteklenir (iOS 15/16'da widget gizlenir), ancak Xcode derleme uyarısı üretir. | İlk EAS iOS build logunda hem ana uygulamanın hem `NamazWidget.appex`'in aynı `CFBundleVersion` ve `CFBundleShortVersionString` ile paketlendiğini doğrula. |
| 3 | **ORTA** | `apps/mobile/src/lib/backgroundRefresh.ts:38-47` | Arka plan görevi (`namaz-bildirim-tazeleme`) yalnız `ensureNotificationsFresh` çalıştırır; önbelleğe yeni gün eklenmediyse `refreshPrayerWidgetsNow()` tetiklenmez. | Kullanıcı uygulamayı 16 gün boyunca hiç açmazsa ve arka plan görevi yalnız mevcut önbellekle bildirim yenilerse (yeni ay indirmezse), App Group'taki 16 günlük pencere ileri kaydırılmaz; 16. gün sonunda widget boş duruma düşer. | `backgroundRefresh.ts` görevinde `ensureNotificationsFresh` sonrasında `refreshPrayerWidgetsNow()` çağrısı ekle. |
| 4 | **DÜŞÜK** | `apps/mobile/targets/namaz-widget/NamazPayload.swift:371` | `String(format: "%d:%02d", hours, rest)` — 64-bit iOS'ta Swift `Int` 64-bittir (`%ld`), `%d` 32-bit `CInt` bekler. | Derlenir ve küçük pozitif sayılarda (`0..23`, `0..59`) doğru çıktı verir; ancak biçim belirleyici tip uyumsuzluğu barındırır. | `"%ld:%02ld"` veya saf Swift `"\(hours):\(rest < 10 ? "0" : "")\(rest)"` kullan. |
| 5 | **DÜŞÜK** | `apps/mobile/targets/namaz-widget/NamazViews.swift:280-282` | `pastColor: .primary.opacity(0.55)`, `trackColor: .primary.opacity(0.22)` örtük zincir sözdizimi. | Parametre tipi somut `Color` olduğu için Swift 5.4+ (SE-0287) ile hatasız derlenir (`Color.primary` → `Color.opacity`), fakat `ShapeStyle.primary` ile okur yanılgısı yaratabilir. | İsteğe bağlı: `Color.primary.opacity(0.55)` şeklinde açık yaz. |
| 6 | **DÜŞÜK** | `apps/mobile/targets/namaz-widget/NamazViews.swift:210-213, 349-354` | Ana ekran widget'larında iOS 18 Tinted (`widgetRenderingMode == .accented`) modu için `.widgetAccentable()` yok. | iOS 18 Tinted ana ekran modunda `MediumNamazView`'daki `palette.soft` kutusu ile `palette.onSoft` metni arasındaki kontrast azalabilir; ilerleme çubuğu vurgusu soluklaşabilir. (Kilit ekranı aileleri `.primary`/`.secondary` kullandığı için etkilenmez.) | İsteğe bağlı sonraki turda `.widgetAccentable()` ve/veya `@Environment(\.widgetRenderingMode)` uyumu ekle. |
| 7 | **DÜŞÜK** | `apps/mobile/targets/namaz-widget/expo-target.config.js:4,7` & `NamazPayload.swift:31` & `app/(tabs)/daha-fazla.tsx:51` | (a) `frameworks: ["SwiftUI", "WidgetKit"]` gereksiz tekrar (`target.js:7` zaten ekliyor). (b) `displayName` yok (`CFBundleDisplayName = "NamazWidget"`). (c) `focusHeading` JSON'da üretilip çözülüyor ama `NamazViews.swift`'te kullanılmıyor. (d) `/widget-ekle` ekranı iOS'ta gizli (`widget-ekle.tsx` hâlâ "iOS yakında" diyor). | Derleme veya App Review riski yok (`/widget-ekle`'nin iOS'ta gizli olması 2.1/2.3 açısından koruyucu). | Yayın sonrası `widget-ekle.tsx` iOS yönergeleriyle güncellenip iOS menüsünde açılabilir. |

---

## 2. Kontrol Başlıklarına Göre Ayrıntılı İnceleme

### 2.1 Swift 5.9/6 + iOS 17 SDK Derlenebilirlik
- **Derleme modu:** `@bacons/apple-targets/build/configuration-list.js:567,605` widget hedefi için `SWIFT_VERSION = "5.0"` üretir (Swift 6 katı eşzamanlılık modu açık değil). Yine de tüm veri modelleri (`PrayerKey`, `NamazPrayerItem`, `NamazDayRecord`, `NamazWidgetPayload`, `PrayerSegmentState`, `PrayerSegment`, `PrayerCell`, `ComputedPrayerState`, `NamazViewState`) açıkça `Sendable` uyumlu; `NamazTimelineEntry` ve `NamazPalette` tüm depolanmış alanları `Sendable` olan dahili `struct`'lar olduğu için Swift 6 modunda da örtük `Sendable` uyumludur.
- **`@ViewBuilder` + `switch` + `@unknown default`:** `NamazViews.swift:68-77` (`.containerBackground(for: .widget)`) ve `81-98` (`content(...)`) tüm iOS `WidgetFamily` durumlarını (`systemSmall`, `systemMedium`, `systemLarge`, `systemExtraLarge`, `accessoryInline`, `accessoryRectangular`, `accessoryCircular`) kapsıyor ve dayanıklı (resilient) SDK enum'u için `@unknown default:` içeriyor. `accessoryCorner` watchOS'a özgü olduğu için doğru biçimde hariç tutulmuş.
- **Result builder içinde `let`:** `NamazWidgetEntryView.body` (`NamazViews.swift:61-62`) ve `AccessoryCircularNamazView.body` (`NamazViews.swift:301`) içindeki `let` bildirimleri Swift 5.4+ `@ViewBuilder` kurallarına tam uyumlu.
- **`ForEach` + `Identifiable`:** `PrayerSegment` (`id: Int`) ve `PrayerCell` (`id: PrayerKey`, `Hashable`) geçerli `Identifiable` türleri.
- **Force unwrap / çökme riski:** Tüm Swift dosyalarında sıfır `!` (force unwrap) var. `URL(string: "kuranyolu://")` `URL?` olarak doğrudan `.widgetURL(_:)`'e veriliyor.
- **API uygunluğu:** `.containerBackground(for: .widget)` (iOS 17+), `.tracking()` (iOS 16+), `AccessoryWidgetBackground()` (iOS 16+), `.monospacedDigit()` (iOS 15+), `.foregroundStyle()` (iOS 15+) — hepsi `deploymentTarget: "17.0"` altında geçerli.
- **Tek `@main`:** Yalnız `NamazWidget.swift:84` (`KuranYoluWidgets: WidgetBundle`).

### 2.2 `@bacons/apple-targets` Yapılandırması
- **`expo-target.config.js` ↔ `build/config.d.ts` & `build/with-widget.js`:**
  - `type: "widget"`, `name: "NamazWidget"`, `bundleIdentifier: ".namazwidget"` → `com.kuranapp.mobile.namazwidget` (`with-widget.js:217-218`).
  - `deploymentTarget: "17.0"` → `IPHONEOS_DEPLOYMENT_TARGET = "17.0"`.
  - `colors.$widgetBackground: { light, dark }` ve `$accent: "#047857"` → `config.d.ts:2-5` (`DynamicColor`) ve `with-widget.js:350-351` ile birebir uyumlu (README satır 78'deki eski `{ color, darkColor }` örneğine değil, gerçek koda göre doğru yazılmış).
  - `entitlements["com.apple.security.application-groups"]`: `app.config.js:36` ile aynı (`["group.com.kuranapp.mobile"]`). Plugin `ios/.targets/NamazWidget/generated.entitlements` üretir ve `REGISTER_APP_GROUPS = YES` yazar (`with-xcode-changes.js:147`).
- **`appleTeamId`:** `app.config.js:34` ve `eas.json:28` içinde `'B58BQR745Y'` **zaten tanımlı**. `config-plugin.js:16` bunu okuyup tüm hedeflere `DEVELOPMENT_TEAM` olarak yazar; eksiklik yok.
- **EAS imzalama & App Group:** `with-eas-credentials.js:27-58` `extra.eas.build.experimental.ios.appExtensions` dizisine `NamazWidget` hedefini, `com.kuranapp.mobile.namazwidget` bundle ID'sini ve App Group entitlement'ını ekler; EAS Build otomatik App ID, App Group eşlemesi ve provisioning profile üretir.
- **Info.plist & PrivacyInfo:** Plugin `NSExtensionPointIdentifier = com.apple.widgetkit-extension` içeren `Info.plist` üretir (`with-widget.js:189`). Ana uygulamanın `PrivacyInfo.xcprivacy` beyanı `NSPrivacyAccessedAPICategoryUserDefaults` (`CA92.1`) içerir (`app.config.js:66`), birinci parti uzantıları da kapsar.

### 2.3 Veri Sözleşmesi (`IosWidgetPayload` ↔ `NamazWidgetPayload`)
- Tüm 13 üst alan ve iç içe `days[].prayers[]` alanları ad ve tip olarak birebir eşleşiyor.
- `theme: "light" | "dark" | null` ↔ `String?` doğru çözülüyor.
- `atMs` (epoch ms tam sayısı, ~`1.79e12`) ↔ `Double` (2^53 ≈ `9e15`'e kadar kayıpsız).
- `prayerDayRepository.ts:85-88, 128, 153` `validInstants` ile her kaydın 6 `PRAYER_KEYS` anahtarının sonlu `number` olduğunu hem `hydrate()` hem `put()` sırasında garanti ediyor; `JSON.stringify`'ın `undefined` düşürüp Swift çözümünü bozma riski gerçek veri akışında yok. Bozuk veri gelirse `loadFromSharedDefaults()` `nil` dönüp güvenli boş duruma düşer.
- `ExtensionStorage.set(key, JSON.stringify(payload))` → `ExtensionStorage.js:42-44` `setString` → `ExtensionStorageModule.swift:58-61` `UserDefaults(suiteName:)?.set(value, forKey:)` → `NamazPayload.swift:52` `defaults.string(forKey:)` yolu birebir tutarlı.

### 2.4 Android Hesabı ile Birebir Eşitlik
- `nextPrayer`: `homePrayer.ts:27-37` ↔ `NamazPayload.swift:274-298` — tüm günler içinde `atMs > nowMs` olan en küçük `atMs`. Birebir.
- İmsak öncesi (`nextIndex == 0`): `namazWidgetData.ts:54-56` ↔ `NamazPayload.swift:310-315` — önceki takvim gününün (`previousYmd`, UTC Gregoryen) `Isha` `atMs`'inden kesir hesabı; yoksa `0.0`. Gece yarısını aşan Yatsı dahil birebir.
- Gece yarısı geçişi: Yatsı sonrası `display = yarın`, `heading` ise `ymdString(from: now, timeZoneIdentifier: payload.tz)` ile bugünün hicri tarihini gösterir; 00:00'da hicri tarih temizce ertesi güne döner.
- Farklı saat dilimi (yurt dışı): `atMs` mutlak UTC ms, `time` JS tarafında `record.cityTimeZone` ile biçimlenmiş, `todayYmd` `TimeZone(identifier: payload.tz)` ile hesaplanıyor. Birebir.
- `formatRemaining`, `formatRemainingLabel`, `formatCountdown`, `cells` (`isNext`, `isPast`), `segments` (`past`/`current`/`future`): Android `namazWidgetData.ts` ile birebir aynı.

### 2.5 Zaman Çizelgesi, Bellek ve Bayat Veri
- 180 dakikalık giriş (3 saat), `.atEnd` politikası → günde ~8 yenileme (WidgetKit'in günlük ~40–70 yenileme bütçesi içinde çok rahat).
- `NamazWidgetPayload` Swift'te CoW (`Array`/`Dictionary`/`String`) paylaştığı için 180 giriş bellek bütçesini (30 MB) zorlamaz.
- 16 günden az veri (ör. ay sonu yalnız o ayın önbelleği): mevcut günler bitince `nextPrayer` `nil` döner, widget `emptyText` gösterir ve `.atEnd` sonrası bir kez `.never` politikasına geçip durur (sonsuz yenileme döngüsü yok).
- Bayat/yanlış vakit riski yok: `atMs > nowMs` filtresi geçmiş tarihli veriyi asla "sıradaki" olarak göstermez.

### 2.6 JS Tarafı ve Android İzolasyonu
- `writeIosWidgetPayload` ilk satırda `if (Platform.OS !== "ios") return;` ile çıkar; Android'de `@bacons/apple-targets` hiç `require` edilmez.
- Native modül yoksa (`expo.modules.ExtensionStorage === undefined`) paket sessiz no-op nesne döner (`ExtensionStorage.js:7-16`), `require` throw ederse `try/catch` yutar.
- `widgetRefresh.ts:16` üst düzey `iosWidget` import'u yalnız saf modülleri çeker, Android'i etkilemez.
- Çağıran izi: açılış (`_layout.tsx:345`), ön plana dönüş (`_layout.tsx:349`), şehir seçimi (`sehir-sec.tsx:77`), dil değişimi (`daha-fazla.tsx:129`), yeni vakit verisi (`prayerDayRepositoryDeps.ts:52`) hepsi iOS widget'ını tazeliyor; **yalnız tema değişimi (`useColors.ts:189`) Android koruyucusuna takılıyor (Bulgu #1)**.

### 2.7 Apple İncelemesi (2.1 / 4.2)
- Kilit ekranı aileleri (`accessoryInline`, `accessoryRectangular`, `accessoryCircular`) özel hex renk kullanmıyor, `.primary`/`.secondary` ve `AccessoryWidgetBackground()` ile vibrant/accented modda okunur.
- Tüm 5 ailede `.accessibilityElement(children: .ignore)` + `.accessibilityLabel(...)` tanımlı.
- `.widgetURL(URL(string: "kuranyolu://"))` `app.config.js:14` şemasıyla uyumlu, force unwrap yok.
- `placeholder` ve `getSnapshot(isPreview: true)` günün her saatinde tutarlı örnek veri (`İstanbul`, `İkindi 15:22`, `1 sa 12 dk`, `14 Cemaziyelahir`) üretiyor.
- Galeri adı/açıklaması TR/EN yerelleştirilmiş.

---

## 3. Doğru Bulunan Kritik Noktalar

1. **Sıfır force unwrap & tam `switch` kapsaması:** Tüm Swift dosyalarında `!` yok; tüm `WidgetFamily` ve `PrayerSegmentState` dalları eksiksiz.
2. **iOS 17 `.containerBackground(for: .widget)`:** Kilit ekranı ailelerine `Color.clear`, ana ekran ailelerine `palette.bg` verilerek iOS 17 sarı uyarı şeridi önlenmiş.
3. **Zaman dilimi bağımsızlığı & gece yarısı / İmsak öncesi kesir hesabı:** Android `namazWidgetData.ts` ile satır satır eşdeğer.
4. **Önizleme (`sample(now:)`) tasarımı:** `Asr`'ı `now + 72 dk + 5 sn` olarak sabitleyip günün hangi saatinde açılırsa açılsın tutarlı galeri önizlemesi üretmesi çok temiz.
5. **Android izolasyonu:** `@bacons/apple-targets` yalnız iOS'ta ve lazy `require` + `try/catch` ile yükleniyor; Android widget yolu hiç değiştirilmemiş.

---

## 4. Genel Karar

- **Derlemeye hazır mı?** **Evet** — Swift 5.9/6 + iOS 17 SDK derleme hatası veya `@bacons/apple-targets` yapılandırma kırığı yok.
- **EAS build öncesi tek önerilen düzeltme:** `apps/mobile/src/hooks/useColors.ts:189`'daki `if (Platform.OS !== "android") return;` koruyucusunu kaldırıp iOS'ta tema değişiminin widget'ı anında tazelemesini sağlamak (Bulgu #1).

NEON_N4_BITTI
