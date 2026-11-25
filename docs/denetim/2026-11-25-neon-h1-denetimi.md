# Neon N6 — H1 Düzeltmeleri Kısa Denetimi

- **Tarih:** 2026-11-25
- **Dal:** `release/vc25` (`C:\Projects\kuran_app`)
- **Kapsam:** N5 bulguları için yapılan H1 düzeltmeleri (commit `2fb71a97`, `8d70b209`) — salt denetim (kaynak düzenleme ve kabuk komutu yok).

---

## Kontrol Tablosu

| # | Konu | Durum | İnceleme Bulgusu (Kaynak Kanıtı) |
|---|---|---|---|
| 1 | `PrivacyInfo.xcprivacy` plist geçerliliği ve `@bacons/apple-targets` bağlama davranışı | **GEÇTİ** | `apps/mobile/targets/namaz-widget/PrivacyInfo.xcprivacy` XML/Apple PropertyList 1.0 şemasına tam uyumlu (`NSPrivacyTracking`, `NSPrivacyTrackingDomains`, `NSPrivacyCollectedDataTypes`, `NSPrivacyAccessedAPITypes` eksiksiz ve doğru tipte). `@bacons/apple-targets@5.0.0` (`build/with-xcode-changes.js:343-370`) hedef klasörünü Xcode 16 `PBXFileSystemSynchronizedRootGroup` olarak bağlar ve yalnız `Info.plist` ile `expo-target.config.js` dosyalarını `membershipExceptions` ile dışlar. Xcode 16+ bu senkron gruptaki `.xcprivacy` dosyasını derleme kaynağı olarak değil, otomatik **Copy Bundle Resources** kaynağı olarak `.appex` köküne kopyalar (`with-xcode-changes.js:312-313` Resources build phase'i de oluşturur). Ek yama gerekmez. |
| 2 | `1C8F.1` nedeni ve `CA92.1` ile birlikte kullanımı | **GEÇTİ** | `1C8F.1` Apple'ın App Group paylaşımlı `UserDefaults` için tanımladığı resmi nedendir; hem ana uygulama (`ExtensionStorage("group.com.kuranapp.mobile")`) hem widget uzantısı (`UserDefaults(suiteName: "group.com.kuranapp.mobile")`) için doğrudur. Ana uygulamada `app.config.js:68` içindeki `['CA92.1', '1C8F.1']` birlikteliği sorun yaratmaz; `NSPrivacyAccessedAPITypeReasons` çoklu neden destekleyen bir dizidir (standart uygulama içi `UserDefaults` / AsyncStorage için `CA92.1`, App Group için `1C8F.1`). Widget uzantısı yalnız `['1C8F.1']` beyan ederek gereksiz neden eklememiştir. |
| 3 | `appStoreUrl` ve `version: '1.2.5'` değişikliğinin iOS derlemesine ve widget `.appex` sürümüne etkisi | **GEÇTİ** | `ios.appStoreUrl` (`app.config.js:33`, `id6816732808` — `eas.json:27` `ascAppId` ile tutarlı) native Xcode derlemesini etkilemez, yalnız `StoreReview.storeUrl()` tarafından çalışma zamanında okunur. `version: '1.2.5'` (`app.config.js:15`) için widget tarafında `targets/namaz-widget/expo-target.config.js` özel sürüm/Info.plist override'ı tanımlamaz; `configuration-list.js:548,587` `GENERATE_INFOPLIST_FILE: "YES"` ayarlar ve `with-xcode-changes.js:157-168,472` üzerindeki `syncMarketingVersions()` tüm native target'ların (ana uygulama + `NamazWidget`) `MARKETING_VERSION` değerini `config.version` (`1.2.5`) ile eşitler. Böylece widget `.appex` de `CFBundleShortVersionString = 1.2.5` alır; sürüm uyuşmazlığı oluşmaz. |
| 4 | `touched` bayrağı ve `.catch` değişikliklerinin davranışa etkisi | **GEÇTİ** | **Davranış bozulması yok.** `useColors.ts:150,165,189` ve `useFontScale.ts:16,30,53` içinde `touched` yalnız kullanıcı tercihi değiştirdiğinde (`toggleTheme`, `changeFontScale`) `true` olur; normal açılışta kayıtlı değerler aynen yüklenir, erken kullanıcı etkileşiminde ise geç dönen AsyncStorage okuması yeni seçimi ezmez. `_layout.tsx:320` (`trackAppOpen().catch(() => {})`) ve `AppTourProvider.tsx:154` (`maybeAskReview(eligible).finally(() => { reviewBusy.current = false; }).catch(() => {})`) normal akışı değiştirmez; `.finally()` her durumda kilidi bırakır, ardından `.catch()` reddi yutarak unhandled promise rejection'ı önler. |

---

## Karar

**ONAYLANDI (HAZIR).**

4 kontrol noktasının tamamı temiz ve ek düzeltme gerektirmiyor. İlk EAS iOS arşivinde rutin doğrulama olarak `NamazWidget.appex/PrivacyInfo.xcprivacy` dosyasının paket içinde bulunduğu ve `CFBundleShortVersionString`'in `1.2.5` olduğu görülerek gönderime geçilebilir.
