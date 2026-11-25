# Neon Denetimi N3 — N2 Bulgularının Düzeltme Doğrulaması (`be3b5829`)

Tarih: 24 Kasım 2026  
Depo: `C:\Projects\kuran_app` · Dal: `release/vc25` · Commit: `be3b5829`  
Kapsam: Salt statik kod denetimi (hiçbir kaynak dosya düzenlenmedi, hiçbir kabuk komutu çalıştırılmadı; önceki rapor: `docs/denetim/2026-11-24-neon-ilk-acilis-denetimi.md`, düzeltme raporu: `I2-rapor.md`).

---

## Bulgular Tablosu (Yeni / Açık Kalanlar)

Yeni **KRİTİK**, **YÜKSEK** veya **ORTA** bulgu yok. Yalnız kapsam dışı bırakılan önceki bir izleme maddesi ve bir küçük gözlem not edilmiştir:

| Önem | Dosya:Satır | Sorun | Senaryo | Öneri |
| --- | --- | --- | --- | --- |
| **DÜŞÜK** | `apps/mobile/src/hooks/useStoreReview.ts:67-71` | `openStoreListing()` iOS'ta `StoreReview?.storeUrl()` boş dönse bile `REVIEW_RATED_KEY = 'true'` değerini önceden yazıyor. | `iosAppStoreUrl` tanımlı olmayan bir iOS build'inde kullanıcı manuel değerlendirme düğmesine basarsa mağaza açılmaz, ancak `REVIEW_RATED_KEY` `'true'` olduğu için otomatik puan istemi de kalıcı olarak kapanır. (Eski davranışta Google Play'e düşülüyordu; regresyon değil.) | `Platform.OS === 'ios'` dalında `if (!url) return;` kontrolünü `storage.setString(REVIEW_RATED_KEY, 'true')` öncesine al. |
| **BİLGİ** *(N2 kapsam dışı)* | `apps/mobile/app/_layout.tsx:208` | N2'deki `initialRouteName="onboarding"` cihaz doğrulaması I2 kapsamında bilinçli olarak değiştirilmedi (`_layout.tsx` kapsam dışı). | Temiz kurulumda başlangıç URL'si `/` ise `(tabs)/index` anlık mount olup `/onboarding`'e yönlenebilir. | Gerçek iOS cihaz/simülatörde temiz kurulumda gözlemle. |

---

## Kapanan N2 Bulguları Listesi

1. **[KAPANDI · YÜKSEK] Görsel paylaşım puan isteme tetiği ölü kod + iOS iptal notu** — `apps/mobile/src/tour/AppTourProvider.tsx:140-161`, `apps/mobile/src/hooks/storeReviewPolicy.ts:5-7`, `apps/mobile/src/hooks/storeReviewPolicy.test.ts:5-20`, `apps/mobile/src/components/AyahShareModal.tsx:56-57`.
2. **[KAPANDI · YÜKSEK] Onboarding 12 sn `slow` zamanlayıcısının OS izin penceresini beklemesi** — `apps/mobile/src/lib/namazNotifications.ts:77-99,555-596`, `apps/mobile/app/onboarding.tsx:74-86`, `apps/mobile/src/lib/namazNotifications.firstRun.test.ts:1-109`.
3. **[KAPANDI · ORTA] Kıble hata ekranı başlık, yatay boşluk ve Ayarlar düğmesi** — `apps/mobile/app/kible.tsx:457-470,607`.
4. **[KAPANDI · DÜŞÜK] Kıble `Promise.race` zamanlayıcı temizliği** — `apps/mobile/app/kible.tsx:352-362,376,392,402`.
5. **[KAPANDI · DÜŞÜK] `offlineAyah` ve `offlineDaily` `try/catch` koruması** — `apps/mobile/src/lib/offlineTr.ts:30-63`.
6. **[KAPANDI · DÜŞÜK] Ana sayfa "Try again" düğmelerinde dikey boşluk** — `apps/mobile/app/(tabs)/index.tsx:333,460,570`.
7. **[KAPANDI · DÜŞÜK] `openStoreListing()` iOS'ta Google Play fallback'ine düşmemesi** — `apps/mobile/src/hooks/useStoreReview.ts:68-72`.

---

## Kontrol 1 — Paylaşım → Modal Kapanışı → `notifyReviewCompletion` Adım Adım İzleme

1. Kullanıcı `AyahDetailScreen` (`/ayah/1/1`) ekranındayken `AppTourProvider:140` içinde `reviewBlocked = reviewSubscriptionBlocked({ isActive: false, foreground: true, pathname: "/ayah/1/1" })` → `false`. `subscribeReviewCompletion` dinleyicisi `storeReviewPolicy.ts` içindeki `listeners` kümesine abone olur.
2. Kullanıcı "Paylaş"a basınca `setShareOpen(true)` → `AyahDetailScreen:648` `beginOverlay()` çağırır → `AppTourProvider`'da `busy = true` olur.
3. `busy` değişimi yalnızca `hintBlocked`'ı etkiler; `reviewBlocked` ve abonelik `useEffect`'inin bağımlılıkları (`[state, onboarded, offered, reviewBlocked, pathname]`) değişmediği için **dinleyici abonelikten düşmez**.
4. Görsel paylaşım tamamlanınca (`ok === true`) `AyahShareModal:58-61` aynı React batch'i içinde `setSharing(false)`, `onShared?.()` (`setShareMoment(n => n + 1)`) ve `onClose()` (`setShareOpen(false)`) çağırır.
5. Commit fazında `AyahDetailScreen:648` cleanup'ı `beginOverlay()` kilidini bırakır (`isOverlayBusy() === false`) ve `AyahDetailScreen:398` `notifyReviewCompletion()` çağırır. **Dinleyici o anda aboneliğini koruduğu için** 3 sn'lik (`REVIEW_WAIT_MS`) zamanlayıcı kurulur ve dönüşündeki `cancel` işlevi `AyahDetailScreen`'in effect cleanup'ına bağlanır.
6. 3 sn sonra kullanıcı hâlâ ayet ekranında, ön planda, örtü/ipucu/rehber kapalıysa `eligible()` `true` döner; `reviewAttempted.current` oturumda tek deneme garantisiyle `maybeAskReview(eligible)` çağrılır. Kullanıcı ekrandan ayrılırsa hem `AyahDetailScreen` cleanup'ı hem `AppTourProvider` `pathname` bağımlılığı zamanlayıcıyı iptal eder.
7. iOS `expo-sharing` iptal davranışı `AyahShareModal.tsx:56-57` yorumuyla açıkça belgelenmiştir.

---

## Kontrol 2 — Örtüden Bağımsız Abonelik ve Apple 5.6.1 Değerlendirmesi

- **Senaryo**: Bir örtü (`beginOverlay()`) açıkken `notifyReviewCompletion()` tetiklenirse 3 sn'lik zamanlayıcı başlar.
  - 3 sn sonunda örtü **hâlâ açıksa**: `eligible()` (`AppTourProvider.tsx:148-149`) içindeki `!isOverlayBusy()` `false` döner; istem yapılmaz ve sonradan kuyruğa alınmaz.
  - 3 sn içinde örtü **kapanmışsa** ve kullanıcı hâlâ ilgili tamamlama ekranında sakin durumdaysa: istem tetiklenir.
- **Değerlendirme**: Kabul edilebilir ve **Apple App Store Review Guidelines 5.6.1** açısından sorun yoktur. Yalnız resmi `StoreReview.requestReview()` API'si kullanılır, özel ön-istem yoktur, istem anında hiçbir örtü/ipucu/rehber açık değildir (`!isOverlayBusy() && !isContextualHintOpen() && !activeRef.current && AppState.currentState === "active"`), ekrandan çıkınca iptal olur ve `opens >= 3`, 3 gün aralık (`REVIEW_INTERVAL_MS`), oturum başına tek deneme (`reviewAttempted.current`) ve Apple'ın kendi yıllık kotası korunur.

---

## Kontrol 3 — Onboarding `onPermissionsResolved` ve `startSlowTimer` Analizi

- **Her yolda tam bir kez çağrı**: `enablePrayerNotificationsFirstRunInner` (`namazNotifications.ts:558-592`) içindeki `resolved` koruması ve `finally` bloğu sayesinde:
  1. Bildirim izni reddi (`!granted` veya `!Device.isDevice`): satır 566'da çağrılır; `finally` no-op.
  2. Bildirim izni veya yerel depo/damga API hatası: `finally` satır 591'de çağrılır.
  3. Manuel şehir tanımlı (`manual !== null`): `getLocationRequesting:80` çağırır; `finally` no-op.
  4. Konum izni yanıtı (`granted`, `denied` veya hata): `getLocationRequesting:86` `.finally(onPermissionsResolved)` ile 8 sn'lik GPS yarışından **önce** çağırır; dış `finally` no-op.
  *(Not: `fullSchedStamp()` satır 578'de `getLocationRequesting` öncesinde çağrılır; ancak tamamen yerel depodan okuma yaptığı için ağ/GPS bekletmez ve hata atarsa `finally` yine callback'i çalıştırır.)*
- **`startSlowTimer` atanmadan çağrılma ihtimali**: Yoktur. ECMAScript standardına göre `new Promise(executor)` içindeki `executor` **senkron** yürütülür; `onboarding.tsx:77-79` satırındaki `startSlowTimer` ataması `enablePrayerNotificationsFirstRun(...)` çağrılmadan önce kesinlikle tamamlanmıştır.
- **Onboarding sonsuza kadar meşgul kalır mı?**: Hayır. `enablePrayerNotificationsFirstRun` herhangi bir nedenle sonlanırsa (resolve veya `.catch(() => "error")`) `Promise.race` doğrudan biter ve `clearTimeout(timer)` çalışır. Temiz kurulumda `notificationQueue` önünde bloklayan bir iş yoktur (`ensureNotificationsFreshInner` onboarding tamamlanmamışken 3 depo okumasıyla anında döner). Sistem izin penceresi açıkken beklenmesi ise zaten istenen davranıştır.

---

## Kontrol 4 — Regresyon ve Android Uyumluluğu

- Değişen 10 dosyanın tamamında Android/iOS ortak yolları incelendi; **yeni regresyon saptanmadı**.
- `AppTourProvider` / `storeReviewPolicy` değişikliği Android görsel paylaşımındaki aynı ölü tetik sorununu da giderir.
- `enablePrayerNotificationsFirstRun(opts?)` geriye dönük uyumludur (`ensureNotificationsFreshInner:621` parametresiz çağrıyı korur); Android çalışma zamanı bildirim/konum izin pencereleri de artık 12 sn sayacından yemez.
- `useStoreReview.ts` Android mağaza bağlantısı yolu (`play.google.com` → `market://`) olduğu gibi korunmuştur.
- `kible.tsx`, `offlineTr.ts` ve `(tabs)/index.tsx` değişiklikleri platform-bağımsızdır ve React kanca kurallarına tam uyumludur.

---

## Genel Karar

**ONAY** — N2 raporundaki tüm aksiyon alınabilir bulgular (2 YÜKSEK, 1 ORTA Kıble, 4 DÜŞÜK) eksiksiz ve regresyonsuz biçimde kapatılmıştır. Kod düzeyi engelleyici bulgu yoktur; `release/vc25` dalı iOS/Android cihaz doğrulamasına ve yayın hazırlığına uygundur.

NEON_N3_BITTI
