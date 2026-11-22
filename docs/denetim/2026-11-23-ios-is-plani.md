# iOS Hazırlık İş Planı (23 Kasım 2026)

Kaynak: Neon iOS uyumluluk raporu (`2026-11-23-neon-ios-uyumluluk.md`), bulgular Claude tarafından kodda doğrulandı.
Durum: Android 1.2.4 (vc 24) Play incelemesinde. iOS'ta Apple 4.2 itirazı (11 Kasım) cevap bekliyor; 1.2.1 ve sonrası iOS'a gönderilmedi.
Kural: Her aşama ayrı dalda, küçük commit'lerle; master'a birleştirme ve App Store gönderimi kullanıcı onayıyla.

---

## Aşama 1 — Kesin düzeltmeler (kod, ~1 saat, Android'e etkisi yok ya da zararsız)

| # | İş | Dosya | Doğrulama |
|---|----|-------|-----------|
| 1.1 | iOS mikrofon iznini kapat: `['expo-audio', { recordAudioAndroid: false, microphonePermission: false }]` | `apps/mobile/app.config.js:216` | `npx expo config --type introspect` çıktısında `NSMicrophoneUsageDescription` olmamalı |
| 1.2 | Kıble izin metnini platforma göre ayır (iOS: "Ayarlar → Kuran Yolu → Konum") — TR + EN | `src/i18n/strings/kible.ts:7,36`, `app/kible.tsx` | Typecheck + Android'de metin değişmemeli |
| 1.3 | "Hakkında" e-posta: `canOpenURL` yerine doğrudan `openURL` + hata yakalama (gizlilik.tsx'teki gibi) | `app/hakkinda.tsx:26-36` | Android'de e-posta uygulaması açılıyor mu |
| 1.4 | Gizlilik bildiriminden gereksiz nedenleri temizle: FileTimestamp → `['C617.1']`, DiskSpace → `['E174.1']` (önce kullanılan SDK'ların kendi manifestlerine bak) | `app.config.js:60-61` | introspect çıktısı |
| 1.5 | `index.js` widget kaydını `Platform.OS === 'android'` ile sar | `apps/mobile/index.js:10-18` | Android'de widget güncellemesi çalışıyor mu (A03) |

## Aşama 2 — Depolama (MMKV) kararı (dikkatli, ayrı dal)

Sorun: `storage.ts` `new MMKV()` çağırıyor; react-native-mmkv 4.3.2'de bu çalışmıyor (`createMMKV()` gerekli). Hata yutuluyor → MMKV hiçbir zaman açılmamış, tüm veri AsyncStorage'da. Çökme yok, veri kaybı yok.

Seçenekler:
- **A (önerilen, düşük risk):** MMKV'yi kaldır; storage.ts'yi yalnız AsyncStorage'a sadeleştir. Davranış bugünkünün aynısı olur, iOS'taki Nitro/static framework derleme riski de ortadan kalkar.
- **B:** `createMMKV()` ile düzelt. RİSK: Migrasyon yalnız `STORAGE_KEYS` anahtarlarını taşıyor; doğrudan AsyncStorage'a yazılan başka anahtarlar varsa (ör. `elifbaQuizScores`, `namazNotifEnabled`) okuma MMKV'ye geçince kaybolmuş gibi görünebilir. Seçilirse önce tüm anahtar listesi çıkarılmalı ve güncelleme testi (eski sürümden yükseltme) A03'te yapılmalı.

Karar: kullanıcı (öneri A).

## Aşama 3 — EAS iOS ön kontrol (kullanıcı penceresinde, etkileşimli)

| # | İş | Not |
|---|----|-----|
| 3.1 | EAS'te `GOOGLE_SERVICES_PLIST` (file) ortam değişkeni var mı? `npx eas env:list --environment production` | Yoksa Firebase panelinden plist indirilip EAS'e yüklenir (kullanıcı) |
| 3.2 | `SENTRY_AUTH_TOKEN` EAS'te var mı? (eas.json'da otomatik yükleme açık) | Yoksa iOS derlemesi arşiv adımında düşebilir |
| 3.3 | Apple Developer: `com.kuranapp.mobile` App ID'de Push Notifications yeteneği açık mı | expo-notifications `aps-environment` ekliyor |
| 3.4 | `assets/icon.png` 1024×1024 ve saydamlıksız mı | Claude yerelde kontrol edebilir |
| 3.5 | Kök ve mobil `package.json` expo sürümlerini eşitle (~56.0.12 / ~56.0.15) | Lockfile değişir → ayrı commit |

## Aşama 4 — İlk iOS test derlemesi (EAS bulut, TestFlight)

- `eas build -p ios --profile production` (kullanıcı onayıyla; bulut derleme kotası kullanır).
- Neon'un "muhtemel" iki riski burada görülür: Nitro modülleri + `useFrameworks: 'static'` (Aşama 2-A seçilirse ortadan kalkar) ve Firebase Auth'un AppDelegate yaması. Düşerse çözüm: `['@react-native-firebase/auth', { ios: { captchaOpenUrlFix: false } }]` (uygulama yalnız anonim giriş kullanıyor).
- TestFlight'ta gerçek iPhone'da kontrol: Mushaf sayfa çevirme, Kıble pusulası, namaz bildirimleri, açık/koyu tema, İngilizce dil, e-posta bağlantısı.
- iPhone yoksa: kullanıcıyla nasıl test edileceğine karar verilecek.

## Aşama 5 — App Store gönderimi (Apple itirazı sonuçlanınca)

- App Store Connect "App Privacy" beyanı: Firebase Analytics, Sentry (çökme), anonim kullanıcı kimliği, yaklaşık konum, bulut yedeği (favori/not) — gizlilik metniyle birebir.
- Yaş derecelendirmesi yeni sosyal medya soruları (ertelenen listede).
- İnceleme notu (İngilizce): 60 saniyelik test rotası (çevrimdışı Mushaf + Hatim, ayet → kelime/kök analizi + paylaşım kartı, Kıble + Tespih, namaz vakitleri + bildirim, Elif-Ba + dersler).
- İtiraz kabul → bu sürümle güncelleme; ret → bu sürümle yeni gönderim. Tekrar 4.2 gelirse en etkili ek: iOS widget'ı (WidgetKit) ya da tilavet sesi.

## Aşama 6 — Sonra (iOS'u engellemeyen iyileştirmeler)

- Bildirime dokununca ilgili ekrana gitme (`_layout.tsx:156-159`), eski `shouldShowAlert` alanını kaldır.
- Sentry Metro ayarı (`getSentryExpoConfig`) — iOS hata izlerinin okunması için.
- Elif-Ba ve Arama ekranlarında çentikli iPhone'larda üstte fazla boşluk (`insets.top`) — TestFlight'ta görülürse.
- Mushaf / Sure / Tefsir listelerinde `removeClippedSubviews` iOS'ta kapatılsın (TestFlight'ta sorun görülürse).
- Yayın sonrası `ios.appStoreUrl`, iOS'ta "Uygulamayı puanla" düğmesi; widget ekranındaki "yalnız Android" metni.

---

## Android tarafı (aynı dönemde, vc 25)

- Widget'lar kilit ekranında: `widgetCategory="home_screen|keyguard"` (config plugin'den üret), A03/A35'te dene.
- Aşama 1 ve 2'deki değişiklikler Android'e de girer → vc 25 derlemesinden önce A03'te açık/koyu tema görsel kontrolü.

## Sıra ve sahipler

1. Aşama 1 → Claude (onaysız dal + commit), A03 kontrolü.
2. Aşama 2 → karar kullanıcıda, uygulama Claude.
3. Aşama 3 → 3.1–3.3 kullanıcı penceresinde / Apple portalında, 3.4–3.5 Claude.
4. Aşama 4 → bulut derleme kullanıcı onayıyla.
5. Aşama 5 → Apple itirazı sonucuna bağlı.
