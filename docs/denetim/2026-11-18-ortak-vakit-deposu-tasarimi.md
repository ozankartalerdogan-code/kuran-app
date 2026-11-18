# Ortak Namaz Vakti Deposu Tasarımı (Plan B)

**Tarih:** 2026-11-18  
**Kapsam:** `apps/mobile` (ana sayfa vakit kartı + bildirim planlama)  
**Dayanaklar:** [2026-11-17-astra-vakit-plani.md](../../docs/denetim/2026-11-17-astra-vakit-plani.md), [2026-11-17-bildirim-zaman-cihaz.md](../../docs/denetim/2026-11-17-bildirim-zaman-cihaz.md), [2026-11-13-diyanet-vakit-tasarimi.md](../../docs/denetim/2026-11-13-diyanet-vakit-tasarimi.md) ve mevcut mobil kaynak kodu.  
**Durum:** Mimari tasarım (kod değişikliği içermez).

---

## 1. Bugünkü Durum

### 1.1 Ana Sayfa ve Bildirim Vakitlerinin Kaynakları

| Tüketici | Giriş Noktası | Vakit Çözüm Fonksiyonları | Kullanılan Önbellek Anahtarları |
| :--- | :--- | :--- | :--- |
| **Ana sayfa** | [index.tsx:109-113](../../apps/mobile/app/(tabs)/index.tsx#L109-L113), [index.tsx:345-412](../../apps/mobile/app/(tabs)/index.tsx#L345-L412) | `useDailyContent()` ([useDailyContent.ts:114](../../apps/mobile/src/hooks/useDailyContent.ts#L114)) → `getDiyanetDays()` ([useDailyContent.ts:440](../../apps/mobile/src/hooks/useDailyContent.ts#L440)) → başarısızsa doğrudan `fetch("https://api.aladhan.com/v1/timings/...")` + `adjustHighLatitude()` ([useDailyContent.ts:476-485](../../apps/mobile/src/hooks/useDailyContent.ts#L476-L485)). Olay dinleyicisi: `onDiyanetDaysCached` ([useDailyContent.ts:535](../../apps/mobile/src/hooks/useDailyContent.ts#L535)). | `prayerTimesCache` ([storage.ts:16](../../apps/mobile/src/lib/storage.ts#L16), okuma [useDailyContent.ts:240](../../apps/mobile/src/hooks/useDailyContent.ts#L240), yazma [:155](../../apps/mobile/src/hooks/useDailyContent.ts#L155) ve [:498](../../apps/mobile/src/hooks/useDailyContent.ts#L498)); `diyanetManualCityV1`, `diyanetCityV1`, `diyanetMonthsV1` ([diyanetPrayer.ts:50-52](../../apps/mobile/src/lib/diyanetPrayer.ts#L50-L52)). |
| **Bildirim planlama** | `ensureNotificationsFresh()` ([_layout.tsx:338,345](../../apps/mobile/app/_layout.tsx#L338-L345), [backgroundRefresh.ts:42](../../apps/mobile/src/lib/backgroundRefresh.ts#L42)); `rescheduleNotifications()` ([sehir-sec.tsx:109](../../apps/mobile/app/sehir-sec.tsx#L109)); `changeNotificationPreference()` ([bildirimler.tsx:144,170](../../apps/mobile/app/bildirimler.tsx#L144-L170)) | `fetchPrayerDays()` ([namazNotifications.ts:228-318](../../apps/mobile/src/lib/namazNotifications.ts#L228-L318)) → `getDiyanetDays()` ([:251](../../apps/mobile/src/lib/namazNotifications.ts#L251)) + `notifyDiyanetDaysCached()` ([:258](../../apps/mobile/src/lib/namazNotifications.ts#L258)) → eksik günler için `fetchMonthCalendar()` (`api.aladhan.com/v1/calendar/...`, [:185-218](../../apps/mobile/src/lib/namazNotifications.ts#L185-L218)) → son çare `fetchPrayerTimes()` ([:316,321](../../apps/mobile/src/lib/namazNotifications.ts#L316-L321)). | `diyanetManualCityV1`, `diyanetCityV1`, `diyanetMonthsV1`; `lastKnownCoords` ([namazNotifications.ts:54](../../apps/mobile/src/lib/namazNotifications.ts#L54)); `namazNotifSchedDay` ([:39](../../apps/mobile/src/lib/namazNotifications.ts#L39)); `namazNotifPlanCacheV1` ([notificationRecovery.ts:5](../../apps/mobile/src/lib/notificationRecovery.ts#L5)). |
| **Diğer ekranlar** | `app/namaz.tsx` | Vakit saati çekmez; statik vakit ayetleri ve tag akordiyonları gösterir ([namaz.tsx:19-253](../../apps/mobile/app/namaz.tsx#L19-L253)). | Yok. |

Özetle: Ana sayfa ve bildirim planlayıcı aynı sunucudan veri çekse de **iki ayrı orkestrasyon, iki ayrı Aladhan yedeği (`/timings` vs `/calendar`) ve iki ayrı önbellek katmanı** kullanmaktadır. `prayerTimesCache` kayıtları kaynak (`diyanet` vs `aladhan`), saat dilimi ve sürüm bilgisi taşımaz ([useDailyContent.ts:80-85](../../apps/mobile/src/hooks/useDailyContent.ts#L80-L85)).

### 1.2 Ana Sayfanın Diyanet Yerine Aladhan'a Düşebildiği Tüm Kod Yolları

1. **[EN OLASI] Eşzamanlı `getDiyanetDays` yarışı + soğuk önbellekte ağ/zaman aşımı + olay kaçırma:**
   - *Kanıt:* [sehir-sec.tsx:108-110](../../apps/mobile/app/sehir-sec.tsx#L108-L110) (`rescheduleNotifications()` beklenmeden başlatılır ve geri dönülür) + [index.tsx:111-113](../../apps/mobile/app/(tabs)/index.tsx#L111-L113) (`useFocusEffect` ile `refreshDaily()` tetiklenir). `diyanetPrayer.ts` içinde in-flight istek birleştirme (singleflight) yoktur; iki tüketici aynı anda `/vakit/sehir` (6 sn) ve `/vakit` (8 sn) çağrısı atar ([diyanetPrayer.ts:55,57,332,519](../../apps/mobile/src/lib/diyanetPrayer.ts#L55-L522)).
   - *Yarış penceresi:* [useDailyContent.ts:448-467](../../apps/mobile/src/hooks/useDailyContent.ts#L448-L467) arasında `:453`'teki `await readDiyanetToday()` sürerken bildirim planı `notifyDiyanetDaysCached()` çağırırsa `prayerFellBackRef.current` henüz `false` olduğu için [:536](../../apps/mobile/src/hooks/useDailyContent.ts#L536) olayı yok sayar. Ayrıca `useDailyContent` mount edilmeden önce veya Aladhan isteği `prayerTimesCache`'i doldurduktan sonra oluşan ayrışmalarda ana sayfa Aladhan'da kalır.
   - *Not:* Cihaz kayıtlarında ([2026-11-17-bildirim-zaman-cihaz.md:90-108](../../docs/denetim/2026-11-17-bildirim-zaman-cihaz.md#L90-L108)) New York ilk seçiminde ana sayfanın Aladhan, planın Diyanet aldığı gözlenmiş; ancak gerçek ağ zaman çizelgesi ve HTTP/abort nedeni **doğrulanmadı** (loglanmadığı için).

2. **Diyanet sunucu/ağ hatası veya zaman aşımı (6 sn şehir + 8 sn ay):**
   - *Tetik:* Ağ kesintisi, 6000 ms şehir veya 8000 ms ay `AbortController` zaman aşımı ([diyanetPrayerDeps.ts:9-25](../../apps/mobile/src/lib/diyanetPrayerDeps.ts#L9-L25)), `status !== 200` (503/500/429) veya geçersiz JSON.
   - *Kanıt:* [diyanetPrayer.ts:336-366](../../apps/mobile/src/lib/diyanetPrayer.ts#L336-L366), [:534-536](../../apps/mobile/src/lib/diyanetPrayer.ts#L534-L536), [:493](../../apps/mobile/src/lib/diyanetPrayer.ts#L493). Boş `Map` dönünce [useDailyContent.ts:464-504](../../apps/mobile/src/hooks/useDailyContent.ts#L464-L504) Aladhan `/timings` çalıştırır.

3. **Zehirlenmiş / kaynaksız `prayerTimesCache` + şehir anahtarı (`cityKey`) uyuşmazlığı:**
   - *Tetik:* Bir kez Aladhan sonucu `prayerTimesCache`'e `cityKey` (ör. `m9560` veya `c9560`) ile yazıldığında ([useDailyContent.ts:498-503](../../apps/mobile/src/hooks/useDailyContent.ts#L498-L503)), aynı gün sonraki açılışta [:243-255](../../apps/mobile/src/hooks/useDailyContent.ts#L243-L255) kaynak ayrımı yapmadan bu Aladhan verisini ekrana basar; o turda Diyanet yine düşerse Aladhan kalıcılaşır. Ayrıca otomatik modda henüz `diyanetCityV1` yoksa `prayerCityStampPart()` `"-"` döndürür ([diyanetPrayer.ts:240](../../apps/mobile/src/lib/diyanetPrayer.ts#L240)), bu da önbellek anahtarının bildirim planıyla ayrışmasına yol açar.

4. **Kesin "şehir yok" (`404 { error: "no_city" }`) önbelleği:**
   - *Tetik:* Kullanıcının konumu en yakın Diyanet şehrine >50 km uzaksa veya sunucu saat dilimi sınırı nedeniyle `no_city` dönerse `diyanetCityV1` içine `city: null` ve 7 gün TTL (`NO_CITY_TTL_MS`) yazılır ([diyanetPrayer.ts:60,355-364](../../apps/mobile/src/lib/diyanetPrayer.ts#L355-L364)). 7 gün boyunca ağa çıkılmadan Aladhan'a düşülür.

5. **Saat dilimi / UTC farkı (`offMin`) değişimi (DST geçişi veya cihaz TZ değişimi):**
   - *Tetik:* `resolveDiyanetCity` `cached.off === offMin` şartı arar ([diyanetPrayer.ts:316](../../apps/mobile/src/lib/diyanetPrayer.ts#L316)). Cihaz TZ veya DST değiştiğinde `near` false olur; ağ yoksa `staleFallback` da kullanılmaz ([:327-328](../../apps/mobile/src/lib/diyanetPrayer.ts#L327-L328)) ve ana sayfa Aladhan'a düşer.

6. **Ana sayfa ve bildirim planının farklı koordinat çözmesi:**
   - *Tetik:* İzin yokken ana sayfa `ISTANBUL`'a düşerken ([useDailyContent.ts:384](../../apps/mobile/src/hooks/useDailyContent.ts#L384)), bildirim planı `lastKnownCoords` kullanır ([namazNotifications.ts:89](../../apps/mobile/src/lib/namazNotifications.ts#L89)). İzin varken ana sayfa `getLastKnownPositionAsync(10 dk)` + 15 sn timeout ([useDailyContent.ts:386-393](../../apps/mobile/src/hooks/useDailyContent.ts#L386-L393)), bildirim ise doğrudan 8 sn `getCurrentPositionAsync` kullanır ([namazNotifications.ts:90-93](../../apps/mobile/src/lib/namazNotifications.ts#L90-L93)).

7. **Ay önbelleği budaması (`MAX_MONTH_KEYS = 6`) veya eksik gün/vakit:**
   - *Tetik:* 6'dan fazla şehir/ay anahtarı biriktiğinde eski aylar silinir ([diyanetPrayer.ts:62,446-477](../../apps/mobile/src/lib/diyanetPrayer.ts#L446-L477)); veya `convertTimes` 6 vakitten birini çözemezse gün atlanır ([:570-571](../../apps/mobile/src/lib/diyanetPrayer.ts#L570-L571)) ve ana sayfa Aladhan'a düşer.

*(Not: [useDailyContent.ts:422-432](../../apps/mobile/src/hooks/useDailyContent.ts#L422-L432)'deki 10 sn güvenlik zamanlayıcısı Diyanet'i iptal edip Aladhan'a geçirmez; yalnızca yükleme göstergesini kapatır ve Aladhan başladıysa onu abort eder.)*

---

## 2. Hedef Tasarım: Ortak Vakit Deposu (Plan B)

### 2.1 Mimari İlke ve Modül Sınırı

Mevcut [prayerInstant.ts](../../apps/mobile/src/lib/prayerInstant.ts) (mutlak epoch dönüşümü, `instantsFromDiyanetIso`, `instantsFromWallTimes`, `formatHmInZone`, `addDaysYmd`, `notificationAtMs`, `futureCarry`) üzerine oturan **tek bir saf, DI tabanlı ortak depo** (`apps/mobile/src/lib/prayerDayRepository.ts`) kurulur.

- **Ana sayfa (`useDailyContent`)** ve **bildirim planlama (`namazNotifications`)** doğrudan ağ/Aladhan çağrısı yapmaz; ikisi de yalnız ortak depodan `PrayerDay` okur.
- Depo React/Expo bağımlılığı içermez; `node --test` ile doğrudan test edilir.

### 2.2 Depo Sözleşmesi ve Veri Modeli

```ts
export type PrayerSource = "diyanet" | "aladhan";

export type PrayerDayRecord = {
  sourceDate: string;              // "YYYY-MM-DD" (şehrin takvim günü)
  cityKey: string;                 // "m<id>" | "c<id>" | "geo:<rLat>,<rLon>"
  cityTimeZone: string;            // IANA TZ (ör. "Europe/Istanbul", "America/New_York")
  cityDisplayName?: string;        // Ekranda gösterilecek şehir adı
  source: PrayerSource;            // "diyanet" > "aladhan"
  revision: string;                // `${source}:${cityKey}:${cityTimeZone}:${hash(atMs)}`
  atMs: PrayerInstants;            // 6 vaktin ofsetsiz mutlak epoch ms değerleri
  hijri: HijriDate | null;
  fetchedAt: number;
};

export type PrayerContext = {
  cityKey: string;
  lat: number;
  lon: number;
  cityTimeZone: string;
  deviceTimeZone: string;
  offMin: number;
  nowMs: number;
};
```

**Temel API:**
- `getDayTimes(context: PrayerContext, sourceDate: string, deps): Promise<PrayerDayRecord | null>` — Tek gün (ana sayfa) için; arka planda ay penceresini de ısıtabilir.
- `ensureDays(context: PrayerContext, sourceDates: readonly string[], deps): Promise<ReadonlyMap<string, PrayerDayRecord>>` — Bildirim planlama (7 gün + önceki şehir günü `carry`) için.
- `ensureMonth(context: PrayerContext, monthYyyyMm: string, deps): Promise<void>` — Ay bazlı tekil doldurma ve singleflight kilidi.
- `subscribe(listener: (event: { cityKey: string; dates: string[]; upgradedToDiyanet: boolean }) => void): () => void` — Depodaki bir günün revizyonu değiştiğinde veya `aladhan → diyanet` yükselmesi olduğunda tüm tüketicileri (ana sayfa + bildirim) uyarır.

### 2.3 Kaynak Önceliği, Önbellek Anahtarı ve Singleflight

1. **Kaynak önceliği:** `Diyanet (taze sunucu veya geçerli ay önbelleği) > Önbellek (eski/bayat Diyanet veya aynı şehir+tz+gün kaydı) > Aladhan yedeği`.
2. **Önbellek anahtarı:** Yeni depo önbelleği (`prayerDayRepoV1`) kayıtları `${cityKey}|${cityTimeZone}|${sourceDate}` anahtarıyla indeksler.
   - `source === "diyanet"` kaydı aynı anahtar için asla `source === "aladhan"` ile ezilmez (geç gelen Aladhan yanıtı yok sayılır).
   - Eski `prayerTimesCache` (`STORAGE_KEYS.prayerCache`) kaynak/TZ/revizyon içermediğinden otoriter depo sonucu sayılmaz; yalnız ilk geçişte temizlenir veya görmezden gelinir.
3. **Singleflight:** Aynı `${cityKey}|${month}` ve aynı Aladhan `month` isteği için modül içi `inflight` haritası tutulur. Ana sayfa ve bildirim aynı anda `getDiyanetDays` / `ensureMonth` isterse tek ağ isteği çıkar; iki tüketici aynı sonucu ve aynı `revision`'ı alır.
4. **Aladhan yedeği (tek yol):** Depo içinde birleştirilir; `iso8601=true` veya şehir duvar saati + `adjustHighLatitude` → `instantsFromWallTimes(ymd, times, cityTimeZone)` ile `atMs` üretir. Türkiye'de (`Europe/Istanbul`) `adjustHighLatitude` dokunmaz ([prayerMethod.ts:110](../../apps/mobile/src/lib/prayerMethod.ts#L110)), `method=13&school=0&midnightMode=0` korunur.
5. **Yükseltme (`aladhan → diyanet`):** Ekran Aladhan'dayken bildirim veya yenileme Diyanet'i çözerse depo `diyanet` kaydını yazar, yeni `revision` üretir ve `subscribe` ile hem ana sayfayı (`useDailyContent`) hem bildirim kuyruğunu (`rescheduleNotifications` / `ensureNotificationsFresh`) tetikler. Değişmeyen revizyon olay üretmez.

### 2.4 Türkiye'de Bildirim Tetiklerinin Birebir Korunması

- `Europe/Istanbul` için `atMs + NOTIFY_AFTER_MIN * 60_000` (+2 dk) hesabı, `namaz-vakitleri` ve `gunun-ayeti` Android kanalları, `SCHEDULE_DAYS = 7` penceresi, `computeGapSlots` günlük ayet/dua saatleri ve `method=13` parametreleri **birebir aynı** kalır.
- Ana sayfa `nextPrayer` geri sayımı da `HH:MM` metin ayrıştırması yerine doğrudan `atMs` epoch dizisinden hesaplanır (Türkiye'de aynı sonucu verir; farklı TZ/gece yarısı aşımında doğru çalışır).
- `PLAN_CACHE_KEY` (`namazNotifPlanCacheV1`) **version 2**'ye yükseltilir; damga `algoritma_surumu + cityKey + deviceTimeZone + revision` taşır. `readNotificationPlan` v1 önbelleğini reddedip yeniden kurar.

---

## 3. Uygulama Adımları (Codex Görevleri)

Tüm adımlarda gizlilik kuralı geçerlidir: **Konum koordinatları loglanmaz, analitik/Sentry/hata metnine yazılmaz; sunucuya yalnız `roundCoord2` (2 ondalık) gider.**

### Görev 1: Ortak Vakit Deposu Çekirdeği ve Birim Testleri
- **Dosyalar:** `apps/mobile/src/lib/prayerDayRepository.ts` (yeni, saf modül), `apps/mobile/src/lib/prayerDayRepository.test.ts` (yeni).
- **Yapılacaklar:** `PrayerDayRecord`, `getDayTimes`, `ensureDays`, `ensureMonth`, `subscribe` arayüzlerini DI (`PrayerDayRepoDeps`) ile yaz. `cityKey|cityTimeZone|sourceDate` anahtarlı önbellek, singleflight `inflight` haritası, `diyanet > cache > aladhan` önceliği ve geç gelen Aladhan'ın Diyanet'i ezmesini engelleyen `revision` mantığını kur.
- **Birim Testleri:** Singleflight (eşzamanlı 2 çağrıda 1 ağ isteği), `aladhan → diyanet` yükseltme olayı, ters yanıt sırası (geç Aladhan Diyanet'i ezmez), farklı `cityKey` veya `cityTimeZone` önbelleğinin karışmaması, Türkiye (`Europe/Istanbul`) `atMs` değerlerinin mevcut `instantsFromDiyanetIso` ile birebir eşitliği.
- **Kabul Ölçütü:** `node --test apps/mobile/src/lib/prayerDayRepository.test.ts` tüm senaryoları geçer; React/Expo importu yoktur.

### Görev 2: Depo Adaptörleri (`diyanetPrayer` + Aladhan + Depolama)
- **Dosyalar:** `apps/mobile/src/lib/diyanetPrayer.ts`, `apps/mobile/src/lib/diyanetPrayerDeps.ts`, `apps/mobile/src/lib/prayerDayRepositoryDeps.ts` (yeni), `apps/mobile/src/lib/diyanetPrayer.test.ts`.
- **Yapılacaklar:** `diyanetPrayer.ts` içindeki `DiyanetDayOut` çıktısına `instantsFromDiyanetIso` ile doğrulanmış `atMs` ekle (`times` uyumluluk için kalabilir); `resolveDiyanetCity` içinde `offMin` değişiminde ağ yoksa eski şehir önbelleğinin tamamen silinmemesi / `cityTimeZone` uyumu kontrolünü netleştir. Aladhan tekil/aylık adaptörünü `prayerMethod.ts` + `adjustHighLatitude` + `instantsFromWallTimes` ile depoya bağla.
- **Birim Testleri:** Diyanet ham ISO → `atMs` dönüşümü, Aladhan yüksek enlem (`>44°`) vs Türkiye (`Europe/Istanbul`) muafiyeti, `roundCoord2` gizlilik sınırı doğrulaması.
- **Kabul Ölçütü:** Mevcut `diyanetPrayer.test.ts` ve `prayerMethod.test.ts` kırılmadan geçer; yeni adaptör testleri geçer.

### Görev 3: Bildirim Planlayıcı ve Kurtarma Katmanının Depoya Geçişi
- **Dosyalar:** `apps/mobile/src/lib/namazNotifications.ts`, `apps/mobile/src/lib/notificationRecovery.ts`, `apps/mobile/src/lib/notificationRecovery.test.ts`.
- **Yapılacaklar:** `fetchPrayerDays` içindeki ayrı `getDiyanetDays` + `fetchMonthCalendar` + `fetchPrayerTimes` dallarını kaldırıp `ensureDays` çağrısına geçir. `PLAN_CACHE_KEY` sürümünü `version: 2` yap; `schedStamp` içine depo `revision` (veya kaynak) bilgisini ekle. Depo `subscribe` üzerinden `upgradedToDiyanet` geldiğinde `SerialQueue` içinde planı yenile. `readNotificationPlan`'da v1'i reddet, v2'yi yalnız `atMs` üzerinden doğrula.
- **Birim Testleri:** Türkiye (İstanbul/Ankara/İzmir) 7 günlük bildirim tetik epoch'larının eski davranışla birebir aynı olduğu; v1 cache'in reddedildiği; `aladhan → diyanet` olayında planın yenilendiği; plan başarısızsa mevcut native alarmların silinmediği.
- **Kabul Ölçütü:** `notificationRecovery.test.ts` ve `prayerInstant.test.ts` geçer; Türkiye tetik zamanları 0 ms farkla korunur.

### Görev 4: Ana Sayfanın (`useDailyContent`) Depoya Geçişi ve Epoch Geri Sayımı
- **Dosyalar:** `apps/mobile/src/hooks/useDailyContent.ts`, `apps/mobile/src/lib/prayerCityEvents.ts`, `apps/mobile/app/(tabs)/index.tsx` (yalnız gerekirse küçük tip/prop uyumu).
- **Yapılacaklar:** `useDailyContent` içindeki doğrudan `fetch("https://api.aladhan.com/v1/timings/...")` ve `prayerTimesCache` okuma/yazma mantığını kaldır; `getDayTimes` + `subscribe` kullan. `prayers` görünümünü `formatHmInZone(atMs, deviceTimeZone)` üzerinden üret; `nextPrayer` geri sayımını metin yerine `atMs` epoch farkından hesapla. Konum çözümünü `namazNotifications` ile uyumlu `PrayerContext` üreticisine bağla (izin yoksa/GPS timeout'ta tutarlı fallback).
- **Birim Testleri:** `nextPrayer` geri sayım saf yardımcısı testi (gece yarısı sonrası ertesi güne geçiş, farklı TZ, Türkiye normal gün).
- **Kabul Ölçütü:** Ana sayfa ve bildirim aynı gün/şehir için daima aynı `revision` ve aynı dakika değerini gösterir; `aladhan → diyanet` geçişinde ana sayfa otomatik güncellenir; `npm run typecheck` temiz geçer.

### Görev 5: Şehir Değişimi Yarışının Kapatılması (`sehir-sec.tsx`) ve Temizlik
- **Dosyalar:** `apps/mobile/app/sehir-sec.tsx`, `apps/mobile/src/lib/prayerCityEvents.ts`.
- **Yapılacaklar:** `sehir-sec.tsx:106-110`'da şehir seçilince depo önbelleği bağlamını güncelle; `rescheduleNotifications()` ve ana sayfa odak dönüşü (`index.tsx:111-113`) aynı singleflight üzerinden geçeceği için gereksiz `onDiyanetDaysCached` geçici yamalarını sadeleştir.
- **Birim Testleri:** Şehir değişiminde eski şehir `cityKey` kaydının dönmediği depo testi.
- **Kabul Ölçütü:** Tüm mobil birim testleri (`npm run test:mobile`) ve `typecheck` hatasız geçer.

---

## 4. Riskler ve Cihazda Doğrulanacaklar Listesi

### Riskler
- **v1 → v2 plan önbelleği geçişi:** Güncelleme sonrası ilk açılışta v1 planı reddedileceği için ağ yoksa `diyanetMonthsV1` üzerinden çevrimdışı kurtarma yapılabilmelidir; aksi halde damga yazılmamalı ve sonraki açılışta tekrar denenmelidir.
- **Eşzamanlı şehir değişimi:** Kullanıcı art arda iki şehir seçerse `SerialQueue` ve `loadIdRef` eski seçimin sonucunu yeni seçimin üstüne yazmamalıdır.
- **Gece yarısı Yatsı ve `futureCarry`:** Uzak saat diliminde önceki şehir gününden taşan vakitlerin `ensureDays` penceresine (8 gün) dahil edilmesi ve geçmiş anların elenmesi bozulmamalıdır.
- **Eski `Intl` / Hermes davranışı:** `intlZoneSupported()` false dönerse cihaz yerel saatine güvenli düşüş korunmalıdır.
- **Gizlilik sızıntısı:** Hata yakalama (`catch`) veya `Sentry` raporlarına ham `lat/lon` eklenmemelidir.

### Cihazda Doğrulanacaklar Listesi (Ölçülmeden Tamam Sayılmaz)
1. **Türkiye birebir kontrolü:** İstanbul/Büyükçekmece/İzmir için güncelleme öncesi ve sonrası `dumpsys alarm` epoch'ları (+2 dk dahil) ve ana sayfa 6 vakit metinlerinin 0 ms / 0 dk farkla eşit olması.
2. **Soğuk önbellekte yeni şehir seçimi (`sehir-sec.tsx`):** İzmir, Erzurum, New York ilk seçiminde ana sayfa ve `namazNotifPlanCacheV2` kaynağının ikisinin de `diyanet` ve aynı `revision` olması; yapay ağ gecikmesi/offline sonrası online olunca `aladhan → diyanet` yükseltmesinin ekran + planı birlikte yenilemesi (**henüz cihazda doğrulanmadı**).
3. **Çapraz saat dilimi matrisi:** Cihaz `Europe/Istanbul` + Şehir `America/New_York` ve Cihaz `Europe/Berlin` + Şehir `Europe/Istanbul` için ana sayfa saatleri, geri sayım ve `dumpsys alarm` RTC epoch'larının doğrulanması.
4. **Force-stop ve çevrimdışı açılış:** Force-stop sonrası açılışta planın `namazNotifPlanCacheV2` veya `diyanetMonthsV1` üzerinden ağsız yeniden kurulması.
5. **Gerçek bildirim teslimi:** Ekran kapalıyken en az bir yakın vakit bildiriminin planlanan epoch'ta teslim edildiğinin gözlenmesi (**önceki denetimde beklenerek ölçülmedi — doğrulanmadı**).
