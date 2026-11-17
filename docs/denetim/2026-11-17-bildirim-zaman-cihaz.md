# Bulgu 1.3 — Bildirim zamanlaması cihaz testi ve ana sayfa kaynak araştırması

17 Kasım 2026. Samsung A03 / SM-A035F, Android 13 (API 33), adb `R96T80012SY`, paket `com.kuranapp.mobile`. Mevcut Metro 8082 ve USB reverse kullanıldı. Kod değiştirilmedi; build/install ve commit yapılmadı.

## Sonuçlar

| Madde | Sonuç | Kanıt / sınır |
|---|---|---|
| 1a Başlangıç planını ve alarmlarını koruma | GEÇTİ | Metro sunucusu seçilmeden c9-initial-* alındı. |
| 1b Yeniden açılışta eski damgadan t2'ye otomatik geçiş | KALDI — doğrulanamadı | Başlangıç damgası zaten t2 içeriyordu. Yeniden açılışta aynı damga vardı. Bu, zamanlama hatası kanıtı değildir. |
| 1c Türkiye epoch, sayı, başlık/metin türü ve günlük ayet eşitliği | GEÇTİ | Başlangıç, yeniden açılış ve sonradan gerçekten yeniden üretilen Büyükçekmece planı karşılaştırıldı: 38 namaz +12 ayet; fark yok. |
| 1d Büyükçekmece ana sayfa / plan eşitliği | GEÇTİ | Altı vakit eşit; tetikler +2 dakika. |
| 2 Cihaz İstanbul, şehir New York | GEÇTİ | 40/40 namaz isteği ham ISO +120000 ms, doğru gün, Android alarmı mevcut. |
| 3 Cihaz Berlin, şehir İstanbul | GEÇTİ | 38/38 namaz isteği ham ISO +120000 ms, Android alarmı mevcut. |
| 4 İzmir olayını tekrar üretip kesin nedenini belirleme | KALDI — kesin neden doğrulanamadı | İzmir iki tur, Erzurum ve Ankara Diyanet verdi. Aynı kaynak ayrışması New York ilk seçiminde görüldü; olası neden aşağıda. |
| Geri yükleme | GEÇTİ | Başlangıç ayarları ve şehir JSON dizesi birebir eşit, Büyükçekmece planı kurulu. |

## Kanıtlar ve doğrulama kapsamı

Kanıt kökü: `C:/Users/jalek/AppData/Local/Temp/claude/2851084b8bf36871/f02e84e1-974f-4f4b-994b-0f34414926da/scratchpad`.

Her `c9-<aşama>-storage.json`, Python subprocess ile ikili alınan `run-as com.kuranapp.mobile cat databases/RKStorage` SQLite kopyasından okunmuştur. Aynı aşamanın `-alarm.txt` dosyası dumpsys alarm, `.png` dosyası Python subprocess ile ikili yazılan `adb exec-out screencap -p`, `-logcat.txt` dosyası ReactNativeJS çıktısıdır.

`c9-validation.json`, 10 görüntü için tüm namaz isteklerinin ISO+120000 ms hesabını, başlığın doğru vakte ait olmasını, beklenen gelecek vakit kümesinin eksiksizliğini ve tüm isteklerin Android alarm epoch/tekrar sayılarını denetler. ISO/başlık uyuşmazlığı, eksik/fazla/geçmiş namaz tetiği ve eksik Android alarmı yok. dumpsys route/başlık göstermediğinden route plan önbelleğinden, Android kurulumu epoch çoklu kümesinden eşleştirildi. Gerçek bildirim teslimi beklenerek ölçülmedi.

## 1. Türkiye birebir

Başlangıç ayarları `c9-restore.json` ve `c9-initial-storage.json` içinde saklandı: auto_time_zone=1, Europe/Istanbul, cihaz dili tr-TR, uygulama dili tr. Şehir kaydı:

```json
{"id":9537,"name":"BÜYÜKÇEKMECE","state":"İSTANBUL","country":"TÜRKİYE","tz":"Europe/Istanbul","lat":41.0452,"lon":28.5957}
```

Force-stop + MainActivity açılışından sonra dev client ekranında http://localhost:8082 seçildi. Yükleme sonrası `c9-turkey-loaded-*` alındı. Başlangıç ve yeniden açılış damgası aynı: `2026-11-17|tr|Europe/Istanbul|exact|t2|m9537`. t2 son bileşen değil, şehir bileşeninden önceki sürüm bileşenidir. Başlangıç zaten t2 olduğu için eski sürümden otomatik geçiş kanıtlanamadı.

Yeniden açılışta 50 isteğin tüm JSON içeriği aynı kaldı: mevcut plan yeniden kullanıldı. Diğer şehirlerden Büyükçekmece'ye dönünce yeni kodun mutlak epoch `at` alanlarını da taşıyan günlerle plan gerçekten yeniden üretildi (`c9-restored-storage.json`). Başlangıç ↔ bu plan karşılaştırmasında 38 namazın route/epoch/başlık ve rastgele ayet ekinden önceki metni aynı; 12 günlük ayet isteğinin **tüm içeriği** aynı. 17 Kasım geçmiş imsak/güneş/öğle/ikindi hariç, bugünün akşam/yatsısı ve 18–23 Kasım altı vakit mevcut.

Farklılık listesi: **boş**. `c9-turkey-comparison.json`: removed=[], added=[], dailyExact=true. Başlangıç ve son Android alarm epoch çoklu kümeleri de 50/50 eşit.

| Tarih / vakit | Vakit (İstanbul) | Tetik (İstanbul) | Epoch (ms) |
|---|---|---|---:|
| 17.11 Akşam | 17:53 | 17.11 17:55 | 1794927300000 |
| 17.11 Yatsı | 19:16 | 17.11 19:18 | 1794932280000 |
| 18.11 İmsak | 06:21 | 18.11 06:23 | 1794972180000 |
| 18.11 Güneş | 07:49 | 18.11 07:51 | 1794977460000 |

Bugünün ana sayfa vakitleri **06:20 / 07:48 / 12:56 / 15:29 / 17:53 / 19:16**; planın altı vaktiyle aynı. Kanıt: c9-turkey-loaded.png, c9-restored.png ve ilgili storage/alarm dosyaları.

## 2. Cihaz İstanbul, şehir New York

Şehir ekranında New York arandı; `New York, Abd` sonucu seçildi: id8903, America/New_York, 40.7143,-74.006. Cihaz İstanbul'da kaldı. Damga `2026-11-17|tr|Europe/Istanbul|exact|t2|m8903`.

40 namaz +13 günlük ayet =53 istek ve53 Android alarmı. New York'un bugünkü imsak/güneşi geçmiş; bugünkü öğle/ikindi/akşam/yatsı ve sonraki altı günün altı vakti tam. Her satırda tetik = ham ISO epoch +120000:

| Ham Diyanet ISO | Epoch (ms) | Tetik UTC | Cihaz duvar saati |
|---|---:|---|---|
| 2026-11-17T11:46:00-05:00 | 1794934080000 | 17.11 16:48 | 17.11 19:48 |
| 2026-11-17T14:20:00-05:00 | 1794943320000 | 17.11 19:22 | 17.11 22:22 |
| 2026-11-17T16:44:00-05:00 | 1794951960000 | 17.11 21:46 | 18.11 00:46 |
| 2026-11-17T18:01:00-05:00 | 1794956580000 | 17.11 23:03 | 18.11 02:03 |
| 2026-11-18T05:11:00-05:00 | 1794996780000 | 18.11 10:13 | 18.11 13:13 |

17 Kasım akşamının gerçek Diyanet değeri **16:44 EST**; yaklaşık 16:3x varsayımı yerine ham kayıt esas alındı. İstanbul tetiği **18 Kasım 00:46**, yatsı **18 Kasım 02:03**. Son günün akşam/yatsısı da İstanbul'da 24 Kasım'a taşınıyor. Hiçbir namaz geçmişe veya yanlış güne düşmüyor. Kanıt: c9-newyork-storage.json içindeki diyanetMonthsV1/namazNotifPlanCacheV1, c9-newyork-alarm.txt, c9-validation.json.

## 3. Cihaz Berlin, şehir İstanbul

`settings put global auto_time_zone 0` ardından `cmd alarm set-timezone Europe/Berlin` başarılı; getprop ile doğrulandı. Cihazın cmd alarm help çıktısı komutu destekliyor. service call alarm kullanılmadı. Türkiye'deki İstanbul (id9541) seçildi. Force-stop + açılış ve dev client üzerinden Metro seçimi tekrarlandı. Damga `2026-11-17|tr|Europe/Berlin|exact|t2|m9541`.

38 namaz +12 günlük ayet =50 istek ve50 Android alarmı. Tüm namazlar ham İstanbul ISO +2 dakika:

| Ham Diyanet ISO | Epoch (ms) | Tetik UTC | Cihaz duvar saati |
|---|---:|---|---|
| 2026-11-17T17:51:00+03:00 | 1794927180000 | 17.11 14:53 | 17.11 15:53 |
| 2026-11-17T19:15:00+03:00 | 1794932220000 | 17.11 16:17 | 17.11 17:17 |
| 2026-11-18T06:19:00+03:00 | 1794972060000 | 18.11 03:21 | 18.11 04:21 |
| 2026-11-18T07:48:00+03:00 | 1794977400000 | 18.11 04:50 | 18.11 05:50 |

Yeniden açılış sonrası ana sayfa **04:18 / 05:47 / 10:54 / 13:28 / 15:51 / 17:15** gösterdi: İstanbul vakitlerinden iki saat erken Berlin duvar saati. İstek doğrultusunda hata sayılmadı. Dilim değişiminden hemen sonraki canlı oturumda eski duvar saatleri kaldı; değerlendirilen kanıt yeniden açılış sonrasıdır. Kanıt: c9-berlin-loaded.png, ilgili storage/alarm dosyaları.

## 4. Ana sayfa Aladhan araştırması

Cihaz Europe/Istanbul yapılıp uygulama yeniden açıldı. Şehirler UI üzerinden seçildi; tabloda yükleme sonrası prayerTimesCache var:

| Seçim | cityKey | Ana sayfa kaynağı | Akşam / yatsı | Plan kaynağı |
|---|---|---|---|---|
| İzmir 1 | m9560 | Diyanet | 18:05 / 19:24 | Diyanet |
| Erzurum 1 | m9451 | Diyanet | 17:05 / 18:26 | Diyanet |
| Ankara 1 | m9206 | Diyanet | 17:39 / 19:00 | Diyanet |
| İzmir 2 | m9560 | Diyanet | 18:05 / 19:24 | Diyanet |
| New York ilk seçim | m8903 | **Aladhan** | 00:43 / 02:06 | **Diyanet: 00:44 / 02:01** |
| New York ikinci seçim | m8903 | Diyanet | 00:44 / 02:01 | Diyanet |

Kanıt: c9-izmir-1-*, c9-erzurum-1-*, c9-ankara-1-*, c9-izmir-2-*, c9-newyork-*, c9-newyork-warm-*. Erzurum ilk ~14 saniye örnekleri c9-erzurum-sample-*.json içinde.

Kaynak yalnız cityKey üzerinden sınıflandırılmadı: **Aladhan cache'inde de cityKey var.** New York ilk kaydında Sunset/Imsak/Midnight/Firstthird/Lastthird var; ikinci kayıtta altı Diyanet alanı ve ham ISO'nun cihaz saatleriyle birebir eşitlik var. İlk New York seçimi öncesi ay kaydı yoktu; sonrası complete=true, 30 günlük kayıt mevcut. İkinci seçim bunu kullanabiliyor. Erzurum yeni ay kaydıyla ilk seçimde başarılı olduğundan soğuk önbellek tek başına deterministik hata nedeni değil.

**Kanıtla desteklenen olası neden:** ana sayfanın Diyanet denemesi o turda boş sonuç alırken bağımsız bildirim denemesi başarılı olmuş olabilir. Ay önbelleği dolduktan sonraki New York ana sayfasının Diyanet'e dönmesi bununla uyumlu. Timeout mu, HTTP/JSON/veri başarısızlığı mı olduğu ölçülmedi; kesin kök neden iddia edilmiyor.

Yalnız okunan kod dayanakları:

- `apps/mobile/app/sehir-sec.tsx:106–110`: şehir yazılır, değişiklik işaretlenir, rescheduleNotifications beklenmeden başlatılır, geri dönülür. `apps/mobile/app/(tabs)/index.tsx:111–113` odak dönüşünde ayrı refreshDaily başlatır. İki Diyanet denemesi örtüşebilir.
- `apps/mobile/src/hooks/useDailyContent.ts:411–444`: ana sayfa önce Diyanet'i bekler; bugünü çözerse onu yazar. `:445–473`: boş sonuçta Aladhan başlatılır ve aynı cityKey ile cache'e yazılır.
- `apps/mobile/src/lib/diyanetPrayer.ts:506–535`: çağrı kendi ay önbelleği görüntüsünü okur; uygun kayıt yoksa ayrı 8000 ms aylık istek yapar. Başarısızlıkta fetched null kalabilir. `:556–571`: ay/gün veya altı vaktin biri çözülemezse gün dönmez. `apps/mobile/src/lib/diyanetPrayerDeps.ts:9–24` timeout abort'unu uygular.
- `apps/mobile/src/lib/namazNotifications.ts:236–269`: bildirim Diyanet'i ayrıca çağırır; başarılı günün ham ISO anlarını kullanır. Bildirim başarısı ana sayfanın önceki başarısız denemesini geriye dönük değiştirmez.
- `apps/mobile/src/hooks/useDailyContent.ts:396–406`: 10 saniyelik güvenlik zamanlayıcısı Diyanet'i iptal edip doğrudan Aladhan'a geçirmez; yükleme göstergesini kapatır. Aladhan zaten başladıysa onu abort edebilir. Bu zamanlayıcıyı kök neden diye göstermek desteklenmiyor.
- `apps/mobile/src/hooks/useDailyContent.ts:219–229`: aynı gün/şehir cache'i ilk anda gösterilir; sonra Diyanet yine denenir. Aladhan cache'i ilk görünümü açıklayabilir; Diyanet başarısı üstüne yazar.

ReactNativeJS logcat alındı; çağrıların HTTP/abort nedenini ayırt eden kayıt bulunmadı. Salt okunur Metro inspector ağ gözlemi HTTP401 ile reddedildi (c9-network.jsonl); ağ trafiği kaydedilemedi. Kod enstrümantasyonu eklenmedi. **İki eşzamanlı çağrı koddan mümkün; gerçek istek zaman çizelgesi ve timeout nedeni ölçülmüş değil.** İzmir'in önceki olayının aynısı bu oturumda tekrar üretilemedi.

## Geri yükleme ve dosya bütünlüğü

c9-restoration-verified.json başlangıç ve son eşitliğini doğrular:

| Alan | Başlangıç | Son | Sonuç |
|---|---|---|---|
| auto_time_zone | 1 | 1 | GEÇTİ |
| persist.sys.timezone | Europe/Istanbul | Europe/Istanbul | GEÇTİ |
| Cihaz dili | tr-TR | tr-TR | GEÇTİ |
| uiLanguage | tr | tr | GEÇTİ |
| diyanetManualCityV1 | Büyükçekmece id9537, yukarıdaki JSON | Aynı JSON dizesi, karakter karakter | GEÇTİ |

Son ana sayfa Büyükçekmece; damga `2026-11-17|tr|Europe/Istanbul|exact|t2|m9537`, 50 alarm kurulu. Testte indirilen ay önbellekleri kaldı; istenen saat dilimi/otomatik dilim/şehir/dil aynen geri yüklendi ve Büyükçekmece planı yeniden kuruldu.

Başlangıç git diff, c9-start-git.diff olarak saklandı; son tracked diff bununla byte düzeyinde aynı. Mevcut test değişikliklerine ve yeni prayerInstant dosyalarına dokunulmadı. Depoya yalnız bu rapor eklendi; commit yapılmadı. Rapor Python ile UTF-8 BOM'suz yazıldı, yeniden okunarak Türkçe karakterler doğrulandı.
