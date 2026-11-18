**İki sorun bağımsız.** Bulgu 1.3 tarih bilgisinin kaybedilmesinden; İzmir’deki bir dakikalık fark ise ana ekranın Aladhan, bildirim planının Diyanet verisi kullanmasından kaynaklanıyor. Dosya değiştirmedim, test/build veya cihaz komutu çalıştırmadım.

**1. Kök neden ve kanıt**

**Bulgu 1.3:** [diyanetPrayer.ts:106](C:/Projects/kuran_app/apps/mobile/src/lib/diyanetPrayer.ts:106) ISO zamanını cihazın yerel saatine çevirip yalnız `HH:MM` döndürüyor. Kaynak tarih korunarak bu saat [namazNotifications.ts:241](C:/Projects/kuran_app/apps/mobile/src/lib/namazNotifications.ts:241) üzerinden plana taşınıyor; [332](C:/Projects/kuran_app/apps/mobile/src/lib/namazNotifications.ts:332)’de `setHours` ile kaynak gününe yapıştırılıyor.

Hatanın koşulu **TZ adlarının farklı olması değil, dönüştürülen vaktin cihaz takviminde başka güne düşmesi**. DST geçişlerinde kayma her zaman tam 24 saat olmayabilir.

| Sayısal örnek — vakitler sentetik | Doğru tetik, +2 dk dahil | Mevcut davranış |
|---|---|---|
| Cihaz İstanbul; New York vakti `2026-11-17T18:00:00-05:00` | İstanbul **18 Kasım 02:02** | **17 Kasım 02:02**; geçmiş sayılıp atlanabilir |
| Cihaz Berlin; İstanbul vakti `2026-11-17T06:00:00+03:00` | Berlin **17 Kasım 04:02** | Doğru; gün sınırı aşılmadı |
| Cihaz Berlin; İstanbul kaynak saati `2026-11-17T00:30:00+03:00` | Berlin **16 Kasım 22:32** | **17 Kasım 22:32** |

Ayrıca istenen günler cihaz tarihinden üretiliyor ([namazNotifications.ts:204](C:/Projects/kuran_app/apps/mobile/src/lib/namazNotifications.ts:204)); yalnız tetikleyiciyi düzeltmek, gün sınırında eksik kaynak günü sorununu çözmez.

`c596f6fe`, ay tamlığını ve yayımlanan şehir listesindeki TZ uyuşmazlıklarını düzeltiyor. Mobildeki ISO → `HH:MM` → yanlış tarih dönüşümünü değiştirmiyor.

**Bir dakikalık fark kesinleşti:** Denetim belgesinin bağlı olduğu [cihaz kaydı:116](C:/Users/jalek/AppData/Local/Temp/claude/2851084b8bf36871/f02e84e1-974f-4f4b-994b-0f34414926da/scratchpad/c8-izmir-storage.json:116) içinde:

- `diyanetMonthsV1["9560:2026-11"]`: ikindi **15:41**, akşam **18:05**.
- `namazNotifPlanCacheV1.days[0]`: aynı değerler.
- `prayerTimesCache`: **15:42 / 18:04**, ayrıca Aladhan yanıtına özgü `Sunset`, `Imsak`, `Firstthird`, `Lastthird` alanları.

Ana ekran Diyanet başarısızsa bağımsız Aladhan `/timings` isteği yapıyor ve yanıtı saklıyor ([useDailyContent.ts:411](C:/Projects/kuran_app/apps/mobile/src/hooks/useDailyContent.ts:411), [455](C:/Projects/kuran_app/apps/mobile/src/hooks/useDailyContent.ts:455), [468](C:/Projects/kuran_app/apps/mobile/src/hooks/useDailyContent.ts:468)). Plan ise Diyanet’i yeniden çözebiliyor. İki tüketicinin aynı gün için ortak, sürümlenmiş bir sonucu yok.

**Kanıt sınırı:** Ana ekranın o anda Diyanet’i neden çözemediği kayıtlı değil; ağ hatası/zaman aşımı ve çağrı sırası varsayım olur. Kaynak ayrışması ise kayıtla doğrulanıyor.

Yuvarlama nedeni değil: Diyanet dönüşümü saat/dakika okuyor; Türkiye’de `adjustHighLatitude` değişiklik yapmıyor ([prayerMethod.ts:110](C:/Projects/kuran_app/apps/mobile/src/lib/prayerMethod.ts:110)). **+2 dk yalnız alarm ofseti** ([namazNotifications.ts:284](C:/Projects/kuran_app/apps/mobile/src/lib/namazNotifications.ts:284)); mevcut İzmir ikindi alarmının 15:43 olması bununla tutarlı.

**2. Tasarım seçenekleri**

| Seçenek | Artı / eksi ve risk | Değişen dosyalar |
|---|---|---|
| **A. Yalnız Diyanet epoch’unu plana taşı** | En dar değişiklik. Bir dakikalık ayrışma, Aladhan tarih kaybı ve gün penceresi açık kalır. Toplam görev için yetersiz. | `diyanetPrayer.ts`, `namazNotifications.ts`, `notificationRecovery.ts`, testleri |
| **B. Ortak günlük sonuç + mutlak zamanlar — önerim** | Ekran ve plan aynı kaynak sonucunu kullanır; zaman hesabı test edilebilir. Önbellek ve eşzamanlılık değişikliği nedeniyle orta risk. | A + `useDailyContent.ts`; yeni `prayerSchedule.ts`, `prayerDayRepository.ts` ve testleri |
| **C. Ekranı tamamen seçilen şehrin saatine geçir** | Şehir takvimi daha anlaşılır olur. Geri sayım, gün başlığı ve bildirim metinleri dahil daha geniş ürün değişikliği; bu düzeltme için yüksek risk. | B + namaz/ana ekran bileşenleri ve çeviriler |

**Ürün kararları; aşağıdaki planın varsayımları:**

- Bildirim **seçilen şehirdeki vaktin gerçek anında +2 dk** gelsin. Cihaz/şehir saati seçimi yalnız gösterimi değiştirir; örneğin New York 18:00, İstanbul cihazında ertesi gün 02:00’dır. Varsayım: mevcut cihaz saatinde gösterim korunur.
- Aynı günün Aladhan sonucu sonradan Diyanet’e yükseltilirse ekran ve plan birlikte yenilensin. Daha doğru kaynağa geçiş dakikayı değiştirebilir.
- **“Türkiye birebir aynı” sınırı:** Aynı kaynak ve aynı veri için vakitler, ofsetler, kanallar ve tetik epoch’ları birebir korunur. Hatalı kaynak ayrışmasını giderirken ekrandaki 15:42’nin 15:41 olması kaçınılmazdır; iki eski değeri aynı anda korumak mümkün değil.
- Geçersiz/çelişkili zaman verisi için tahmini alarm kurmak yerine ilgili günü reddetme önerilir.

**3. Tek commit için uygulama sözleşmesi**

Tüm yollar `C:\Projects\kuran_app` altındadır. Aşağıdaki imzalar uygulama planıdır; kod yazılmadı.

**Saf zaman modülü:** `apps/mobile/src/lib/prayerSchedule.ts`

```ts
type PrayerKey = "Fajr" | "Sunrise" | "Dhuhr" | "Asr" | "Maghrib" | "Isha";

type PrayerDay = {
  sourceDate: string;                 // YYYY-MM-DD, şehir takvim günü
  cityKey: string;
  cityTimeZone: string;
  source: "diyanet" | "aladhan";
  revision: string;                   // kaynak + altı epoch'tan deterministik
  atMs: Record<PrayerKey, number>;    // ofsetsiz vakit anları
};

parsePrayerIso(iso: string): number | null;
dateInZone(atMs: number, timeZone: string): string;
addCalendarDays(date: string, days: number): string;
formatPrayerHm(atMs: number, timeZone: string): string;
notificationAtMs(atMs: number, offsetMin: number, nowMs: number): number | null;
```

Sözleşmeler:

- ISO girdisi açık `Z`/UTC ofseti taşımalı; cihaz TZ’si kullanılmamalı.
- `notificationAtMs = atMs + offsetMin * 60_000`; sonuç `<= nowMs` ise `null`.
- Takvim günü artırma, epoch’a 24 saat ekleme değildir.
- Ekran `HH:MM`’yi epoch’tan üretir; bildirim hiçbir zaman bu metinden geri üretilmez.
- `nowMs` bir planlama turunda bir kez alınır.

**Veri adaptörleri ve ortak sonuç:**  
`apps/mobile/src/lib/diyanetPrayer.ts`, yeni `apps/mobile/src/lib/prayerDayRepository.ts`

```ts
resolvePrayerDays(
  context: {
    cityKey: string;
    lat: number;
    lon: number;
    cityTimeZone: string;
    deviceTimeZone: string;
    nowMs: number;
  },
  sourceDates: readonly string[],
  deps: PrayerDayRepositoryDeps
): Promise<ReadonlyMap<string, PrayerDay>>;

subscribePrayerDaysChanged(listener: () => void): () => void;
```

`PrayerDayRepositoryDeps`: enjekte edilen Diyanet okuma, Aladhan okuma, depolama okuma/yazma işlevleri; React/Expo bağımlılığı yok.

- `getDiyanetDays` mevcut imzasını korusun; çıktısına doğrulanmış `atMs` eklensin. Mevcut `times` alanı uyumluluk için kalsın.
- Diyanet önceliği korunsun. Aynı şehir/tarih için eşzamanlı istekler birleştirilsin; geç gelen Aladhan sonucu Diyanet’i ezmesin.
- Ana ekran ve plan aynı günlük kaydı kullansın. Kaynak yükselmesi yeni `revision` üretsin; abonelik ekranı ve mevcut seri bildirim kuyruğunu yenilesin. Değişmeyen kayıt olay üretmesin.
- Ana ekranın eski `prayerTimesCache` kaydı, kaynak/TZ/sürüm içermediğinden yeni otoriter sonuç olarak kabul edilmesin.
- Aladhan için `iso8601=true` kullanılsın; resmi API bu biçimi destekliyor. Şehir TZ’si yöntem ve hesaplama için, cihaz TZ’si gösterim için kullanılsın. Türkiye sorgusunun yöntem/tune değerleri korunmalı. [Aladhan API](https://aladhan.com/prayer-times-api)
- Yüksek enlem düzeltmesine ISO metni doğrudan verilmesin. Şehir saatindeki değerler üzerinden mevcut formül uygulansın; düzeltilen Fajr/Isha yeniden tarihli ana dönüştürülsün. Gün taşması kaybedilmesin.

**Gece yarısı ayrıntısı:** Web şu anda bütün vakitlere kaynak gününü ekliyor ([diyanetVakit.ts:232](C:/Projects/kuran_app/apps/web/src/lib/diyanetVakit.ts:232)). Dolayısıyla yalnız `Date.parse` yeterli değil. Aynı kaynak güne yazılmış, akşamdan önce görünen yatsı ertesi şehir gününe normalize edilmeli; zaten ertesi gün tarihli ISO ikinci kez artırılmamalı. Diğer sıra bozuklukları reddedilmeli. DST’de yerel saat belirsizse açık kaynak ofseti esas alınmalı; çözülemeyen veri sessizce tahmin edilmemeli.

**Tüketiciler:**  
`apps/mobile/src/lib/namazNotifications.ts` ve `apps/mobile/src/hooks/useDailyContent.ts`

- Şehir, koordinatlar, TZ ve başlangıç damgasını tur başında sabitle.
- Şehirde bugün başlayarak yedi kaynak günü al; önceki günün gece yarısını aşmış gelecekteki yatsısı için bir ek kaynak günü oku. Ek günün geçmiş olayları elenir.
- Namaz DATE tetikleri yalnız `atMs` üzerinden kurulsun.
- Ana ekran geri sayımı metin/dakika farkından değil sonraki epoch’tan hesaplansın.
- Günlük ayet/dua mevcut yedi günlük davranışını korusun; ek önceki gün bunlara uygulanmasın.
- Önbellek doğrulamasındaki mevcut `7 gün / 56 istek` sınırları bu modele uyarlansın: en fazla sekiz kaynak gün, toplam en fazla 64 istek; sınır aşımı sessiz kırpılmasın. Normal Türkiye akışının istek sayısı değişmemeli.

**Dokunulmayacaklar:** `apps/web/**`, şehir listesi, `prayerMethod.ts` hesap katsayıları, bildirim izinleri/kanalları, +2 dk, dil/metinler, signing, bağımlılıklar. Mevcut günlük ayet/dua zamanlama algoritması bu commit’te yeniden tasarlanmayacak.

**4. Birim ve regresyon testleri**

Yeni `prayerSchedule.test.ts`, `prayerDayRepository.test.ts`; mevcut `diyanetPrayer.test.ts`, `notificationRecovery.test.ts` genişletilsin.

- Yukarıdaki üç sayısal örnek; ay/yıl sınırı ve UTC± tarih taşmaları.
- Aynı ISO girdisi `UTC`, `Europe/Istanbul`, `Europe/Berlin`, `America/New_York` altında aynı epoch’u vermeli. Saf testlere TZ parametresi enjekte edilmeli; eski yerel-Date testleri ayrı Node süreçlerinde `TZ` sabitlenerek çalışmalı.
- Türkiye: İstanbul, Ankara, İzmir; yedi gün boyunca eski/yeni **altı vakit epoch’u, +2 dk tetikleri ve istek sayısı eşit**. Diyanet ve Aladhan ayrı fixture’larla.
- İzmir kayıt fixture’ı: Aladhan `15:42/18:04` → Diyanet `15:41/18:05`; iki tüketici aynı revizyona geçmeli. Ters yanıt sırası Diyanet’i geriye düşürmemeli.
- Berlin **29 Mart / 25 Ekim 2026**, New York **8 Mart / 1 Kasım 2026**. Atlanan ve iki kez oluşan yerel saatler; açık ofsetli ISO’lar ayrı anları korumalı.
- `23:59 +2 → ertesi gün 00:01`; ertesi gün `00:20` yatsı; cihazda önceki güne düşen imsak; önceki kaynak gününün hâlâ gelecekteki yatsısı.
- Geçersiz ISO, eksik vakit, kısmi ay, ağ kesintisi, farklı şehir/TZ önbelleği, geçmiş tetikler, çift olay.
- Plan kurulurken şehir değişmesi, native schedule hatası, cache yazma hatası ve eski sürümden geçiş.

Doğrulama: hedefli `node --test` dosyaları, mevcut `prayerMethod.test.ts`, ardından mobil `typecheck`. Uzun komutlar skill’in bölüm 7 düzeniyle bir kez çalıştırılmalı.

**5. A03 cihaz testi**

Komutlar **test planıdır**; bu turda uygulanmadı.

1. Başlangıç değerlerini kaydet: `auto_time_zone`, `persist.sys.timezone`, uygulama sürümü, şehir, exact-alarm izni ve bildirim tercihleri.
2. İzmir/Türkiye temel karşılaştırmasını yap. Kaynak gününü, revizyonu, altı vakti, Expo isteklerini ve gerçek AlarmManager kayıtlarını karşılaştır.
3. TZ değiştirmek için önce destek kontrolü:

```text
adb shell settings get global auto_time_zone
adb shell getprop persist.sys.timezone
adb shell cmd alarm help
adb shell settings put global auto_time_zone 0
adb shell cmd alarm set-timezone Europe/Berlin
adb shell getprop persist.sys.timezone
adb shell date
```

`cmd alarm set-timezone`, AOSP’nin servis komutudur. `service call alarm <işlem-no> s16 Europe/Berlin` ancak A03’ün Android sürümündeki işlem numarası doğrulandıktan sonra kullanılmalı; sabit numara tahmin edilmemeli. `setprop persist.sys.timezone` tek başına servis değişiminin kanıtı sayılmamalı; yetki yoksa cihaz Ayarlar ekranı kullanılmalı. [AOSP AlarmManagerService](https://android.googlesource.com/platform/frameworks/base/+/e9b892178da13d38a0f15f4d7a8318751af9ea85/services/core/java/com/android/server/AlarmManagerService.java)

4. Matris: İstanbul cihaz/New York şehir; Berlin cihaz/İstanbul şehir; aynı TZ kontrolü. Uygulamayı yeniden açarak plan yenilemesini doğrula.
5. `adb shell dumpsys alarm` içinde `com.kuranapp.mobile` kayıtlarını incele. RTC epoch’unu beklenen `atMs +120000` ile karşılaştır; yalnız ekranda yazan saat veya Expo deposu yeterli değil. `whenElapsed` varsa dump’ın wall-clock/elapsed tabanlarıyla dönüştür.
6. En az bir yakın alarmın ekran kapalıyken teslimini gözle. Planlanan zaman ile Android’in teslim gecikmesini ayrı kaydet. Force-stop ardından yeniden açma ve çevrimdışı açılışı da dene.
7. **Geri alma:** kaydedilen özgün TZ’yi aynı servis yoluyla geri yükle; `auto_time_zone` değerini eski değerine getir; şehir/tercihleri geri al; uygulamayı açıp Türkiye planını tekrar doğrula. DST tarihlerini fiziksel cihaz saatini değiştirmeden fixture testleriyle kapsa.

**6. Kurulu planlar ve geri dönüş**

Mevcut cache sürümü `1`; kurtarma doğrulaması da yanlış `setHours(...,+2)` hesabını tekrarlıyor ([notificationRecovery.ts:89](C:/Projects/kuran_app/apps/mobile/src/lib/notificationRecovery.ts:89)). Yalnız üreticiyi düzeltmek yeterli değil.

- `PLAN_CACHE_KEY` aynı kalabilir; içerik **version 2**, damga **zamanlama algoritması sürümü + veri revizyonu** taşımalı.
- `readNotificationPlan` v1’i normal kurtarmada reddetmeli; v2’de beklenen tetikleri doğrudan epoch’lardan doğrulamalı.
- Yeni plan tamamen hazırlanıp doğrulanmadan mevcut native alarmlar iptal edilmemeli. Başarıdan sonra cache ve damga yazılmalı.
- Rollback yalnız uyumlu şehir/TZ/algoritmaya sahip doğrulanmış plana yapılmalı; eski yabancı-şehir v1 planı körlemesine yeniden kurulmamalı.
- Güncelleme kurulması tek başına planı yenilemez. İlk uygulama açılışı/çalışabilen yenileme görevi gerekir; mevcut açılış ve ön plana dönüş çağrıları [app/_layout.tsx:338](C:/Projects/kuran_app/apps/mobile/app/_layout.tsx:338)’de mevcut.
- Çevrimdışı geçişte ham Diyanet ay cache’i yeni epoch planını üretebilir. Veri yetmezse başarı damgası yazılmamalı; sonraki yenileme yeniden denemeli.
- Eski uygulamaya dönüşte v2 cache reddedileceğinden yeniden veri çözümü gerekir. **Çevrimdışı downgrade ile kesintisiz kurtarma garanti değildir.**

En önemli kabul ölçütü: **aynı şehir/gün/revizyon için ekranda gösterilen vakit ile planın ofsetsiz vakti aynı an olmalı; Türkiye’nin mevcut doğru tetikleri değişmemeli.**