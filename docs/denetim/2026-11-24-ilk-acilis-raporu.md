# Görev I1 — iOS ilk açılış denetimi

Tarih: 24 Kasım 2026. Depo: `C:\Projects\kuran_app`, dal: `release/vc25`.

Denetim kaynak kodu ve otomatik testlerle yapıldı. iPhone/iPad üzerinde süre ölçümü, iOS simülatörü, TestFlight veya Apple incelemesi çalıştırılmadı. Aşağıdaki süreler çalışan JavaScript zamanlayıcılarının bütçeleridir; fiziksel cihaz performansı garantisi değildir. Dal değiştirilmedi, bu görev kapsamında commit oluşturulmadı; native dizinlere, `app.config.js`, `plugins/**` ve `src/widgets/**` dosyalarına yazılmadı.

## İlk açılış akışı

1. `apps/mobile/index.js`, Expo Router'ı başlatır. Android widget kaydı `Platform.OS === 'android'` koşulu ve `try/catch` içindedir; iOS'ta çalışmaz.
2. `app/_layout.tsx`, native splash'i kaldırır; paket içindeki görselle `AppSplash` yaklaşık 600 ms görünür. Amiri, Amiri-Bold ve UthmanicHafs yerel TTF dosyalarından yüklenir. AsyncStorage üzerinden onboarding/önceki kullanıcı durumu okunur. Bu karar ağ gerektirmez. Font yüklemesi hata verirse artık açılış engellenmez.
3. İlk kurulumda Stack başlangıç rotası artık doğrudan `onboarding` olur. Önceden `(tabs)` başlangıç rotası kurulup `NavigationGate` efektinden onboarding'e yönleniyordu; ana sayfanın kısa süre mount olması ve erken istek başlatması mümkündü. Bildirim/derin bağlantı hedeflerini saklayan mevcut `NavigationGate` korunur.
4. `onboarding.tsx`: ilk adım başlangıç tercihi, ikinci adım isteğe bağlı bildirim/konum kurulumu. İngilizce sistemde arayüz İngilizcedir (`src/i18n/index.ts`, `expo-localization`); Türkçe/English seçimi de vardır. Tercih kartları yereldir. Bildirimler ertelenirse içerik için ağ beklenmez. Etkinleştirilirse OS izinleri, konum, vakit takvimi ve günlük bildirim içerikleri hazırlanır. Hazırlık 12 saniyeyi aşarsa açıklama ve mevcut “Continue/Devam” düğmesi açılır; izin verilmiş hazırlık arka planda devam eder. Bu bütçe etkinleştirme çağrısından başlar; OS izin penceresi ayrıca kullanıcı etkileşimi gerektirir.
5. Onboarding tamamlanınca yerel bayrak yazılır, `/(tabs)` / `index.tsx` açılır. Kaydedilmiş başlangıç tercihi otomatik yönlendirme yerine ana sayfada eylem kartı sunar; rehber teklifi isteğe bağlıdır.
6. Ana sayfa `useDailyContent` ile günlük içerik önbelleğini ve namaz şehrini okur. `/daily?date=YYYY-MM-DD` istenir. En geç 4 saniyede mevcut eski cache veya gömülü ayet/dua gösterilir. Günlük yedek: tarihe göre Fecr'den bir ayet ve Bakara 2:201 duası. İngilizce görünümde `useMealOf` gömülü Pickthall mealini seçer.
7. Vakitler için kayıtlı şehir veya izin zaten varsa son/GPS konumu kullanılır; izin yoksa mevcut İstanbul varsayılanı korunur. Şehir çözümü `/vakit/sehir?lat=…&lon=…&off=…` (6 sn), aylık Diyanet verisi `/vakit?cityId=…&month=…` (8 sn) üzerinden gelir. Gerekirse `api.aladhan.com/v1/calendar/YYYY/M?...` (8 sn) yedeği denenir. Aylık/şehir önbellekleri yeniden kullanılır. Ana sayfanın 12 saniyelik yükleme bütçesi artık konum beklemesinden **önce** başlar; veri gelmezse hata ve “Try again/Tekrar dene” gösterilir. Geç gelen geçerli veri kartı güncelleyebilir.
8. `(tabs)/_layout.tsx` sekmeleri kurar. `kuran.tsx` ilk açıldığında `/surahs` ister; bu istek menüyü engellemez ve 4 saniyelik gömülü yedeğe sahiptir. `ogren.tsx` ve `ibadet.tsx` ana menüleri yereldir, menü oluşturmak için API istemez.

`src/lib/api.ts` göreli yollarının tabanı `API_BASE_URL`'dir; ortam değişkeni yoksa `https://kuran-app-web-ozan-s-projects8.vercel.app/api/v1` kullanılır. API yanıtları sürümlü AsyncStorage cache'ine alınır. Gömülü içerik olan yollarda 4 saniyelik yarış ve tek ağ denemesi vardır; geç gelen başarılı yanıt cache'e yazılır. Diğer API çağrılarında hızlı geçici hatalar için en fazla üç deneme korunur, **denemeler ve beklemeler birlikte 12 saniye** ile sınırlıdır. Büyük `Retry-After` süresi ekranı bloke etmez. Fetch abort'u dikkate almasa bile Promise zaman aşımı görünür sonucu sonlandırır.

Açılışta ayrıca `initCloudBackup` Firebase anonim oturum/Firestore geri yüklemesini arka planda başlatır; hazır olmasını ekran beklemez. Sentry/analytics, yapılandırma ve olaylara göre telemetri gönderebilir. Bildirim yenileme ve arka plan görevi kaydı da ekranın hazır olma koşuluna bağlı değildir. Temiz kurulumda bildirim tercihleri yokken `ensureNotificationsFresh` onboarding sırasında kendiliğinden izin sormaz. Bildirim etkinleştirilirse günlük plan `/daily?date=…` çağrılarını farklı günler için de yapabilir. Bunlar zorunlu içerik paketi indirmesi değildir.

## Ek kaynak indirme bulguları

**İlk açılış veya ana sekme mount'unda zorunlu, onaysız >~5 MB veritabanı/ses/font/içerik paketi indirmesi saptanmadı. İndirme onayı akışı eklenmedi.** Canlı HTTP aktarımı ölçülmedi; aşağıdaki kesin boyutlar depodaki dosya boyutlarıdır, sıkıştırılmış ağ/AAB/IPA boyutu değildir.

| Kaynak | Boyut / kapsam | Ne zaman, nereden? | Onay / değerlendirme |
| --- | --- | --- | --- |
| Üç font | 440.772 + 368.616 + 242.368 = 1.051.756 bayt | Uygulamaya gömülü `assets/fonts` | Ek ağ indirmesi yok. |
| TR meal/okunuş/literal, sureler ve mushaf yedeği | `src/data/offlineTr` JSON'ları 4.834.450 bayt; 114 sure, 6.236 ayet, 604 sayfa | Paket içindeki statik `require` yükleyicileri; gerektiğinde bellekte açılır | Ağ indirmesi yok; tembel yükleme uzaktan indirme değildir. |
| Arapça metin | 1.363.621 bayt | Gömülü `quran_arabic.json` | Ağ indirmesi yok. |
| EN Pickthall | 841.206 bayt | Gömülü `meal_en_pickthall.json`, İngilizce görünümde | Ağ indirmesi yok. |
| Ders kartları/quizler | `Dersler` JSON'ları 1.274.977 bayt, TR/EN | Gömülü registry üzerinden | Ağ indirmesi yok. |
| Elif-Ba katalog/harf/quiz | API JSON yanıtları; canlı aktarım boyutu ölçülmedi | `/elifba/dersler`, `/elifba/dersler/:id/harfler`, `/elifba/quiz/:id` | Ayrı indirme onayı/boyut bildirimi yok; toplu büyük kaynak indirmesi kodu yok. EN sözlüğü gömülü, tam ders verisinin yerini tutmuyor. |
| Elif-Ba harf sesi | Depodaki 29 MP3 toplam 293.568 bayt; dosya başına 9.408–13.440 bayt | `AUDIO_BASE_URL/audio/elifba/harf_NN.mp3`; ses düğmesinde veya dinleme sorusu açılınca otomatik oynatma | Ayrı indirme onayı/boyut bildirimi yok. Tam set ~0,294 MB; açılışta toplu indirilmiyor. CDN'nin gerçek baytları doğrulanmadı. Ses başlamazsa mevcut 3 sn hata/görsel soru yedeği var. |
| Vakitler, günlük içerik, sure/ayet/mushaf | İstenen gün/ay/sure/ayet/sayfa JSON'u; aktarım boyutu ölçülmedi | Cache yoksa ilgili API | Tam Kur'an/veritabanı indirme adımı yok. |

## Ekran ekran ağ hatası davranışı

“Sonra” sütunu ilk kurulumda cache bulunmadığı durumu da kapsar. Mevcut cache varsa önce o kullanılır; ağ hatasında süresi geçmiş uygun cache de kullanılabilir.

| Ekran / istek | Önce: hata veya 15 sn yanıtsız ağ | Sonra |
| --- | --- | --- |
| Açılış / yerel font | Font hata verse bile `fontsLoaded` false kaldığından splash'te takılabilirdi. | Font hatası da hazır olma koşulunu geçirir; sistem fontuyla içerik açılabilir. |
| Onboarding / bildirim hazırlığı | Konum, takvim ve bildirim içeriği tamamlanana kadar düğmeler meşgul; ardışık ağ beklemeleri uzayabilirdi. | 12 sn sonra açıklama ve devam; yetkilendirilmiş kurulum arka planda sürer. “Şimdi değil” akışı korunur. |
| Ana sayfa günlük ayet/dua `/daily` | 10 + 15 + 22,5 sn ve tekrar araları (~48,7 sn); hata sonrası ilave ayet/ruh hali istekleri. Yükleme koruması GPS sonrasında kuruluyordu. | 4 sn içinde gömülü TR/EN okunabilir metin. Metin yine yoksa mevcut açık hata ve tekrar deneme. |
| Ana sayfa namaz vakitleri | Konum 15 sn bekleyebilir, 10 sn UI koruması sonrasında başlardı; hata metninde doğrudan tekrar düğmesi yoktu. | Başlangıçtan 12 sn sonra spinner biter, hata + tekrar düğmesi; geç gelen takvim gösterilebilir. Yanlış/uydurma vakit üretilmez. |
| Kur'an sekmesi `/surahs` | Menü anında, sure adları için 4 sn yedek zaten var. | Korundu; cüz, hatim ve okuma kısayolları ağı beklemez. |
| Öğren sekmesi | Yerel menü; ağ bağımlılığı yok. | Korundu. |
| İbadet sekmesi | Yerel menü; ağ bağımlılığı yok. | Korundu. |
| Sure listesi `/surahs` | 4 sn içinde gömülü 114 sure; yedek de yoksa mevcut hata/tekrar. | Korundu. |
| Bir sure `/verses?surah_id=…` | 4 sn içinde gömülü meal/okunuş/literal; Arapça metin ayrıca gömülü. | Korundu; EN görünümü Pickthall kullanır. |
| Mushaf `/mushaf?page=…&v=4` | 4 sn içinde gömülü sayfa/tecvid yedeği; hata/tekrar bileşenleri mevcut. | Korundu. |
| Ayet ayrıntısı `/ayah?surah_id=…&ayah_number=…` | ~48,7 sn'ye kadar spinner; sonra hata/tekrar; gömülü temel metne düşmüyordu. | 4 sn içinde gömülü Arapça, meal, okunuş, literal ve önceki/sonraki ayet. Favori/not gibi yerel etkileşimler kullanılabilir. API'ye özgü sözcük/kök/fark analizi uydurulmaz; mevcut veri yok mesajları kullanılır. |
| Dersler / ders kartları / quizler | Gömülü TR/EN registry; ağ hatası etkilemez. | Korundu; öğrenme kartları ve quiz etkileşimleri çevrimdışı. |
| Elif-Ba katalog ve ders | API üç denemesi üzerine React Query iki tekrar daha yapabiliyordu; 15 sn'de spinner hâlâ görünürdü. Cache yoksa sonunda mevcut hata/tekrar. | API toplam bütçesi 12 sn; katalog sorgularında ikinci tekrar katmanı kaldırıldı. Mevcut açık hata + “Try again/Tekrar dene”; boş katalog için de mevcut mesaj/tekrar. |
| Elif-Ba harfler/quiz/tekrar | İlk kurulumda API bağımlı; cache yoksa uzun bekleme, ardından mevcut hata/tekrar. | API en geç 12 sn'de sonuçlanır; eski cache veya mevcut hata/tekrar. Gömülü EN sözlüğü tam harf/quiz verisi gibi kullanılmaz. |
| Kıble | API gerekmez; konum yoksa 15 + 25 sn GPS denemeleri, sonra uyarı ve geri dönüş; izin çağrısı hatası yakalanmıyordu. | İzin yanıtından sonra 12 sn bütçe; hata açıklaması + tekrar. Eski konum varsa pusula hemen açılır, arka planda yenilenir. Geç konum sonuçlarının yeni denemeyi ezmesi engellenir. İzin reddinde mevcut iOS Ayarlar yönlendirmesi korunur. |
| Şehir seçimi `/vakit/sehirler?q=…` | 6 sn istek sınırı, açık arama hatası ve yeniden deneme; şehir seçimi yerel kaydedilir. | Korundu; ana sayfa vakit hatası da artık doğrudan tekrar sunar. |
| Kök listesi `/roots` | Menüden açılır; ~48,7 sn bekleme ardından mevcut hata/tekrar. | En geç 12 sn; gömülü tam kök listesi yoksa cache veya mevcut hata/tekrar. |
| Namaz rehberi / ilgili ayet açılır bölümleri `/tags/filter` | Yerel rehber görünür; ayet bölümü açılınca uzun spinner, sonra mevcut hata/tekrar. | Yerel rehber korunur; API bölümü en geç 12 sn'de cache veya mevcut hata/tekrar verir. |
| Dualar, ibadet rehberi, kıssalar, siyer, hadisler, mübarek günler, tespih | Yerel JSON/hesap/cihaz verisi; ana içerik API'yi beklemez. | Korundu. |

## Yapılan değişiklikler ve gerekçeleri

Yollar depo köküne göredir; satırlar bu görevdeki son kaynak durumuna aittir.

| Dosya:satır | Değişiklik / neden |
| --- | --- |
| `apps/mobile/app/_layout.tsx:208` | İlk kurulumda başlangıç rotası onboarding; ana sayfanın erken mount olmasını önler. |
| `apps/mobile/app/_layout.tsx:262`, `:300` | Font hatasını hazır olma koşuluna dahil eder; splash kilidi engellenir. |
| `apps/mobile/app/onboarding.tsx:70` | 12 sn hazırlık bütçesi ve yavaş kurulum sonucu; içerik erişimini ağ planlamasından ayırır. |
| `apps/mobile/src/lib/api.ts:80` | Tüm tekrar/beklemelerde ortak 12 sn bütçe, gerçek Promise timeout'u ve uzun Retry-After koruması. |
| `apps/mobile/src/lib/api.ts:484`, `:587` | Ayet ve günlük içerikte mevcut 4 sn gömülü yedek mekanizmasını kullanır. |
| `apps/mobile/src/lib/offlineTr.ts:30`, `:50` | Mevcut gömülü veriden temel ayet ve günlük kart yanıtını oluşturur; yeni içerik indirmez. |
| `apps/mobile/src/hooks/useDailyContent.ts:194` | Yükleme zamanlayıcısını konum çözümünün önüne alır. |
| `apps/mobile/app/(tabs)/index.tsx:333`, `:373`, `:460` | Veri olmayan günlük/vakit kartlarına ortak UI Button ile tekrar deneme ekler. |
| `apps/mobile/app/elifba/index.tsx:270`, `apps/mobile/app/elifba/[dersId].tsx:646` | API istemcisi üstündeki ek React Query tekrarlarını kapatır. |
| `apps/mobile/app/kible.tsx:121`, `:128`, `:312`, `:454` | Konum bütçesi, izin hatası yakalama, geç sonuç koruması ve ortak Callout/Button hata görünümü. |
| `apps/mobile/src/i18n/strings/home.ts:5`, `:42` | TR/EN tekrar deneme metni. |
| `apps/mobile/src/i18n/strings/kible.ts:5`, `:36` | TR/EN tekrar deneme ve doğru bekleme süresi açıklaması. |
| `apps/mobile/src/i18n/strings/onboarding.ts:4`, `:17` | TR/EN arka planda süren hazırlık açıklaması. |
| `apps/mobile/src/lib/api.test.ts:34`, `:60`, `:108`, `:124` | Ayet/günlük yedeği, beş gömülü yolda 4 sn sınırı/geç cache yazımı, abort'u yok sayan fetch ve 429 regresyonları. |
| `apps/mobile/src/lib/offlineTr.test.ts:46` | Metin eşleşmesi, ayet sınırlarında gezinme ve eksik analiz alanlarının dürüst gösterimi. |

Yeni bağımlılık, tasarım sistemi, renk veya normal içerik yerleşimi eklenmedi. Ortak ağ bütçeleri Android'e de uygulanır; mevcut başarılı istek, cache, yerel içerik ve Android'e özgü bildirim/widget korumaları korunmuştur. Android cihaz testi yapılmadığından cihazdaki davranış ayrıca doğrulanmalıdır.

## iOS'a özgü denetim

- `modules/exact-alarm/index.ts:13`: `requireOptionalNativeModule('ExactAlarm')` yalnız Android'de çağrılır. iOS'ta `native = null`; ayar açma/tick çağrıları güvenli no-op, `canScheduleExactAlarms()` null. `needsExactAlarmPermission()` bu durumda false döndürür; iOS'a exact-alarm penceresi açılmaz. Ek koruma gerekmedi.
- `apps/mobile/index.js` ve `src/widgets/widgetRefresh.ts`: Android native widget yükleme/kaydı platform koşullu. Widget dosyaları yalnız okundu; değiştirilmedi. Widget içe aktarımlarının tamamının gerçek iOS paketinde değerlendirilmesi cihaz/simülatör kontrolü gerektirir.
- `src/lib/namazNotifications.ts`: Android bildirim kanalı kurulumunun platform koruması var. Expo Notifications'ın izin/planlama akışı iOS'u da destekleyen mevcut yoldan devam eder.
- `src/lib/backgroundRefresh.ts`: Expo TaskManager/BackgroundTask optional yüklenir, kayıt hataları yakalanır. iOS arka plan zamanlaması OS kararına bağlıdır; ilk ekranın açılma koşulu değildir.
- Firebase ve Sentry yükleme korumaları mevcut. Native Firebase yapılandırması, iPad sensör varlığı ve gerçek iOS bildirim izinleri bu kaynak/test çalışmasıyla kanıtlanmış değildir.
- Kesin açılış kilidi riski olarak bulunan font hata koşulu düzeltildi. Kıble'deki mevcut iOS'a özel Ayarlar metni korundu; sensör verisi gelmemesi için mevcut uyarı yolu korunur.

## Yapılmayanlar ve öneriler

- Derleme, prebuild, Gradle, EAS, simülatör veya fiziksel cihaz çalıştırılmadı. İngilizce iPhone **ve iPad** üzerinde temiz kurulum + uçak modu + yavaş ağ ile ilk 60 saniyeyi ekran kaydıyla doğrulayın: onboarding'i erteleme/etkinleştirme, dört sekme, sure/ayet, yerel quiz, Kıble izni ve vakit hatası/tekrar.
- App Review açıklamasında çevrimdışı mushaf/meal, etkileşimli ders/quiz, not/favori, hatim, tespih ve Kıble için somut gezinme adımlarını gösterin. Guideline 4.2 kabulü hakkında bu kod denetimi garanti vermez.
- Elif-Ba'nın tam katalog/harf/quiz verisi ilk kurulumda gömülü değil; hızlı ve açık hata artık var. Ayrı görevde sürümlü, doğrulanmış TR/EN başlangıç derslerini gömmek düşünülebilir. Bu görevde veri üretimi veya geniş içerik refactor'ı yapılmadı.
- Ayet yedeği sözcük/kök ve fark analizini içermez. Gerekirse ayrı görevde bu alanlar için doğrulanmış çevrimdışı kapsam ve manuel yenileme tasarlanmalı.
- Zorunlu büyük indirme bulunmadığından boyut/onay akışı kurulmadı. İleride ses paketi/veritabanı gibi büyük ek indirme eklenirse gerçek aktarım boyutu ve indirme öncesi onay ayrıca ele alınmalı.
- Konum izni yokken namaz kartındaki İstanbul varsayılanı mevcut davranıştır; gerçek kullanıcı konumu olduğu varsayılmamalıdır. Şehir değiştirme kısayolu korunur. Gizlilik, native izin metinleri ve yapılandırma başka görev kapsamındadır.
- AsyncStorage'ın hiç sonuçlanmaması veya native font yükleyicisinin hata da döndürmeden kilitlenmesi için genel bir watchdog eklenmedi; bu çalışma ağ hatası yolları ve bildirilen font hatasını kapsar.

## Doğrulama

- `npm run typecheck -w @quran-app/mobile`: **GEÇTİ**, `tsc --noEmit`, exit code 0.
- `npm run test:mobile`: varsayılan alt süreç izolasyonu bu ortamda **`spawn EPERM`** ile engellendi. Aynı npm komutu, yalnız çalıştırma ortamında `NODE_OPTIONS=--test-isolation=none` verilerek çalıştırıldı; package.json veya test kapsamı değiştirilmedi.
- Süreç içi tam çalıştırma: **567 test geçti, 0 başarısız, 0 iptal, 0 atlandı**, exit code 0. Bir ara çalıştırmada eşzamanlı widget işinin `./widgetTheme` mock'u nedeniyle 6 hata görüldü; ilgili dosyalara müdahale edilmedi, son tam çalıştırmada bu hatalar yoktu.
- Regresyonlar: beş gömülü endpoint'te ağ hatası/4 sn yedeği, API'nin önceliği, eski cache önceliği, geç başarılı yanıtın cache'e yazılması, abort'u dikkate almayan fetch'in 12 sn sınırı, uzun 429 beklemesi, ayet gezinme sınırları. Mevcut tüm mobil testleri de çalıştırıldı.
- `git diff --check`: geçti. Bu görevde dal değiştirme, commit veya build yok.

GOREV_I1_BITTI
