# Yurt dışı GPS namaz vakti cihaz testi — 18.11.2026

## Sonuç

**Genel sonuç: BLOCKED; Berlin, Londra ve Mekke için cihazda GPS doğrulaması tamamlanamadı.** Şehirleri denenmiş veya vakitleri karşılaştırılmış saymak doğru değildir. Otomatik moda geçiş, mevcut şehirde bildirim planının güncellenmesi ve başlangıç seçiminin geri yüklenmesi **PASS**. Kodun saf şehir çözümleyicisiyle yapılan yerel çalıştırma, cihaz saat dilimi İstanbul kaldığında Berlin/Londra'nın Diyanet şehir eşleşmesinden elendiğini doğruladı (P1).

Fake GPS aramasına ulaşmak için açılan menüde odak `mCurrentFocus=Window{5a75192 u0 PopupWindow:da2d06f}` oldu. Paket adı bulunmadığından sonraki dokunma güvenlik kontrolünde durduruldu. Launcher üzerinden yeniden açma ve yalnız izinli iki uygulama arasında geçiş, kalıcı popup odağını gideremedi. Menüdeki **Search** satırına dokunulmadı; şehir girilmedi; **Start/Play'e hiç basılmadı**. Mock konum izninin seçilmediğine ilişkin bir hata görülmedi; bu iznin durumu doğrulanamadı. Engeli mock izin hatası olarak yorumlamıyoruz.

## Ortam ve yöntem

- Repo: `C:\Projects\kuran_app`, `master`, HEAD `1bde783c`; başlangıç çalışma ağacı temizdi. Kod değiştirilmedi, commit atılmadı.
- Cihaz: Samsung A03 / SM-A035F, 720×1600; ADB `R96T80012SY`; paket `com.kuranapp.mobile`, Expo dev client.
- Mevcut Metro 8082 kullanıldı; yeni Metro başlatılmadı. Launcher `monkey` ile açıldı; development-client deep link veya JS reload kullanılmadı.
- Her dokunma, BACK, metin girişi ve ekran görüntüsü öncesinde `dumpsys window` içindeki `mCurrentFocus` kontrol edildi. İzinli paket adı olmayan popup odağında ekran işlemi yapılmadı. Uygulamalar dışında ekran açılmadı; sistem ayarı, izin, saat dilimi değiştirilmedi. Force-stop, temizleme, kaldırma veya test bildirimi yapılmadı.
- UI ağacı `uiautomator dump` ile okundu; PNG'ler `adb exec-out screencap -p` çıktısının baytları değiştirilmeden kaydedildi. ADB çağrılarında 25 saniyelik süre sınırı vardı; asılı ADB komutu gözlenmedi.
- RKStorage, `run-as ... cat databases/RKStorage` ile yalnız okunarak Windows TEMP altında başlangıç, otomatik mod ve son durum kopyalarına alındı; `catalystLocalStorage` SQLite tablosu karşılaştırıldı. Veritabanı rapor dizinine veya repoya konmadı.
- Raporda gerçek GPS koordinatı bulunmaz. Aşağıdaki koordinatlar yalnız test şehirlerinin kamuya açık merkez koordinatlarıdır.
- Bitiş kontrolü: cihaz saati `2026-11-18T18:47:22+0300`. Başlangıçta ve sonda `persist.sys.timezone=Europe/Istanbul`.

## Koddan doğrulanan davranış

1. **Elle şehir → otomatik:** Ana Sayfa → Namaz Vakitleri kartındaki şehir adı → Namaz Vakti Şehri → “Otomatik — konumumu kullan”. `app/sehir-sec.tsx:61` seçimi `null` kaydeder; `:75` şehir değişimini yayınlar ve bildirimleri yeniden planlar. Anahtar `diyanetManualCityV1`.
2. **Konum:** `src/lib/prayerContextDeps.ts:61` içindeki `getHomeLocation`, elle seçim yoksa önce en fazla 10 dakikalık son konumu, ardından canlı konumu kullanır. Sessiz bildirim konumu ayrı çağrıdan gelir; başarısızlıkta kaydedilmiş konum/İstanbul yedeği vardır. Bu testte sahte konum üretilmediğinden yurt dışına geçiş olmadı.
3. **Kaynak:** `prayerDayRepository.ts:197` önce Diyanet ayını, eksik günler için Aladhan ayını dener. Yurt dışı olması tek başına Aladhan seçimi demek değildir. `diyanetPrayer.ts:333` çözüm isteğine cihazın UTC farkını `off` olarak ekler. Sunucu `/vakit/sehir` en fazla 50 km ve verilmişse aynı UTC farkı koşuluyla şehir seçer.
4. **Aladhan:** `prayerDayRepositoryAdapters.ts:61`, `prayerMethod.ts` yöntemini ve context saat dilimini kullanır. İstanbul dilimi `method=13`; diğer dilimler `method=99`, imsak 18°, yatsı bölgeye göre 16°/17°, temkinler ve uygun yüksek enlem düzeltmesidir. Berlin/Londra için doğru şehir dilimi çözüldüğünde yatsı 16°, Mekke için 17° olur. Model yaklaşık olduğundan ≤5 dakika fark hata sayılmaz; 44–60° için bazı günlerde yaklaşık 8–10 dakika sapma mümkün. Bu testte sayısal fark ölçülemedi.
5. **Ana kart:** `useDailyContent.ts:301–318` şehir takvim gününü ve altı vakti ortak depodan alır; vakitler record'un `cityTimeZone` diliminde biçimlenir. Diyanet kaydı varsa şehir etiketi Diyanet adıdır; aksi halde ters coğrafi kodlamanın şehir/ilçe/bölge adı kullanılabilir. `homePrayer.ts:5` geri sayımı gelecekteki en erken mutlak ana göre hesaplar; Güneş ve ertesi günün gerçek İmsak vakti de dahildir. Kartta saat dilimi etiketi yoktur (`app/(tabs)/index.tsx:357–410`).
6. **İbadet:** `app/(tabs)/ibadet.tsx` şehir, altı vakit veya geri sayım göstermiyor; rehberler, Kıble ve Tespih bağlantıları var. Cihaz ekranında da doğrulandı.
7. **Kıble:** `app/kible.tsx:41` büyük çember yönünü hesaplar. `:316–430` izin/son konum/canlı konum akışını kullanır; elle namaz şehrine bağlı değildir. Yurt dışı yön değerleri bu çalışmada ölçülmedi; gerçek konumun yönünü test şehri değeri olarak kaydetmemek için Kıble açılmadı.
8. **Bildirim:** `namazNotifications.ts:128–166` aynı ortak depodan yedi günü alır; cache içindeki `times` cihaz saatinde, `at` mutlak zamanlardır. Bu nedenle farklı saat dilimlerinde kart ile cache `HH:mm` alanlarını doğrudan karşılaştırmak yanlış olur; `at` karşılaştırılmalıdır. Namaz tetikleyicisi vakitten iki dakika sonradır (`:172`, `:311`).

Dosya yolları yukarıda aksi belirtilmedikçe `apps/mobile/` altındadır; `src/lib/` modül adları kısaltılmıştır.

## Başlangıç ve geri yükleme

| Alan | Başlangıç | Son durum | Sonuç |
|---|---|---|---|
| Seçim | Elle Büyükçekmece, İstanbul, Türkiye; ID 9537; Europe/Istanbul | Aynı elle seçim; başlangıç/son `diyanetManualCityV1` ham JSON eşit | PASS |
| Ana kart vakitleri | 06:21 / 07:49 / 12:56 / 15:29 / 17:52 / 19:16 | Aynı altı vakit | PASS |
| Sonraki vakit | Yatsı; ilk UI okumasında 36 dk | Son PNG'de Yatsı'ya 30 dk | PASS; geçen süreyle uyumlu |
| `namazNotifEnabled` | `1` | `1` | PASS |
| `dailyVerseNotifEnabled` | `1` | `1` | PASS |
| Cihaz saat dilimi | Europe/Istanbul | Europe/Istanbul | PASS |
| Uygulamanın son ekranı | Ana Sayfa | Ana Sayfa; odak `com.kuranapp.mobile` | PASS |
| Fake GPS | Play kullanılmadı | Play kullanılmadı; iki servis kontrolünde `(nothing)` | Etkin sahte konum servisi gözlenmedi |

Geri yükleme uygulamanın kendi UI'ında `Buyukcekmece` araması → “Büyükçekmece, İstanbul, Türkiye şehrini seç” sonucu üzerinden yapıldı. Depoya elle yazılmadı. Fake GPS'nin popup odağı nedeniyle kendi Stop düğmesine basılamadı; hiç başlatılmamış olması ve servis bulunmaması doğrulandı. Fake GPS force-stop edilmedi.

## Şehir bazında cihaz sonuçları — 18.11.2026

**— = ölçülmedi; sıfır fark veya başarılı test anlamına gelmez.** Hiçbir sahte şehir etkinleştirilmedi. Her üç satır da aynı GPS engeline bağlıdır; bu şehirlerde hata/offline banner görülmediği sonucu da çıkarılamaz.

| Hedef şehir | Cihazda gösterilen şehir | İmsak | Güneş | Öğle | İkindi | Akşam | Yatsı | Referans (aynı altı vakit sırası) | Fark (dk) | PASS/FAIL/BLOCKED |
|---|---|---|---|---|---|---|---|---|---|---|
| Berlin, Almanya | — | — | — | — | — | — | — | Alınamadı | — | BLOCKED |
| Londra, Birleşik Krallık | — | — | — | — | — | — | — | Alınamadı | — | BLOCKED |
| Mekke, Suudi Arabistan | — | — | — | — | — | — | — | Alınamadı | — | BLOCKED |

Şehir başına geri sayım, sonraki vakit, Kıble açısı, hata banner'ı ve ekran görüntüsü **BLOCKED**. Üç şehir için >5 dakika fark değerlendirmesi yapılamadı.

## Saat dilimi ve yerel çözümleyici kanıtı

Canlı GPS yerine geçtiği iddia edilmeyen, dosya yazmayan bir Node çalıştırmasıyla repodaki gerçek `decodeCities`, `findNearestCity`, `tzOffsetMin` ve `aladhanMethodQuery` fonksiyonları kullanıldı. Tarih `2026-11-18T12:00:00Z`, cihaz UTC farkı `180`, yarıçap 50 km. Şehir merkezleri Berlin `(52.52,13.41)`, Londra `(51.51,-0.13)`, Mekke `(21.42,39.83)`.

| Şehir | `off=180` koşuluyla | UTC farkı koşulu olmadan | Mevcut context zincirinden çıkarılan sonuç |
|---|---|---|---|
| Berlin | `null` | BERLIN, 11002, Europe/Berlin | Geo kimlik + Europe/Istanbul yedeği; Aladhan method=13 |
| Londra | `null` | LONDRA, 14096, Europe/London | Geo kimlik + Europe/Istanbul yedeği; Aladhan method=13 |
| Mekke | MEKKE, 16309, Asia/Riyadh | Aynı şehir | Diyanet öncelikli; gerekirse Aladhan method=99, yatsı 17° |

Berlin ve Londra sonuçları **yerel çözümleyicide yeniden üretildi**; canlı API ve cihazdaki yurt dışı ekranında doğrulanmadı. Context zincirine ilişkin son sütun koddan çıkarımdır. Bu koşulda Berlin/Londra vakitlerinin şehir yerel saati yerine İstanbul saatinde istenip gösterilmesi ve yurt dışı yöntemi yerine Türkiye yönteminin seçilmesi beklenir. Mekke ile İstanbul o tarihte aynı UTC farkında olduğundan orada bu hata tetiklenmez. Kartta saat dilimi yazmadığı için farklı ülke adı altında hangi saatin gösterildiği kullanıcıya açık değildir. Cihaz üzerindeki anlaşılabilirlik ve sayısal etki halen BLOCKED.

## Canlı referans denemeleri

Base URL, `apps/mobile/.env.local` içindeki `EXPO_PUBLIC_API_URL` ve `src/lib/runtimeConfig.ts` ile doğrulandı: `https://kuran-app-web-ozan-s-projects8.vercel.app/api/v1`. Route kaynakları `apps/web/src/app/api/vakit/route.ts` ve `vakit/sehir/route.ts`. Şehir ID'leri repodaki `diyanetCities.json` verisinden alındı; Kanada'daki LONDON ile İngiltere'deki LONDRA karıştırılmadı.

Toplam **6 GET denemesi**, her birinde `User-Agent: okhttp/4.12.0`, `Accept: application/json`, 18 saniye ağ zaman aşımı kullanıldı; tekrar yapılmadı:

1. Diyanet Berlin: `/vakit?cityId=11002&month=2026-11`
2. Diyanet Londra: `/vakit?cityId=14096&month=2026-11`
3. Diyanet Mekke: `/vakit?cityId=16309&month=2026-11`
4. Berlin çözümü: `/vakit/sehir?lat=52.52&lon=13.41&off=180`
5. Aladhan Berlin, cihaz dilimi/Türkiye yöntemi: `https://api.aladhan.com/v1/timings/18-11-2026?latitude=52.52&longitude=13.405&method=13&school=0&midnightMode=0&timezonestring=Europe%2FIstanbul`
6. Aladhan Berlin, şehir dilimi/yurt dışı yöntemi: aynı timings endpoint'i; `method=99&methodSettings=18,null,16&tune=0,0,-7,5,4,7,7,0,0&school=0&midnightMode=0&timezonestring=Europe%2FBerlin`.

Altı deneme de HTTP yanıtı alınmadan şu bağlantı hatasıyla bitti: **`<urlopen error [WinError 10061] Hedef makine etkin olarak reddettiğinden bağlantı kurulamadı>`**. Bu, test ortamından bağlantı kurulamamasıdır; canlı servislerin kapalı olduğunu kanıtlamaz. Başlangıç RKStorage içinde de bu üç şehrin 18.11.2026 referans günü yoktu. Aladhan timings istekleri yöntem karşılaştırması içindi; uygulamanın ay endpoint'inin canlı doğrulaması yapılmadı.

## Bildirim planı kontrolü

| Aşama | `namazNotifSchedDay` | İlk gün kaynak/revision | İlk gün altı vakit |
|---|---|---|---|
| Başlangıç | `2026-11-18\|tr\|Europe/Istanbul\|exact\|t2\|m9537\|repo2:diyanet:8e5fdd6f` | `diyanet:m9537:Europe/Istanbul:7a078ff4` | 06:21 / 07:49 / 12:56 / 15:29 / 17:52 / 19:16 |
| Otomatik | `2026-11-18\|tr\|Europe/Istanbul\|exact\|t2\|c9537\|repo2:diyanet:e1f077a5` | `diyanet:c9537:Europe/Istanbul:7a078ff4` | Aynı |
| Son | Başlangıç damgasıyla aynı | Başlangıç revision'ıyla aynı | Aynı |

`namazNotifPlanCacheV2` sürümü 2; son durumda 7 gün ve 49 request var. Son cache `stamp` alanı `namazNotifSchedDay` ile eşit. İlk günün altı `at` değeri başlangıç/otomatik/son durumda eşit ve karttaki saatlerle uyumlu. Son ilk namaz request'i `2026-11-18T16:18:00.000Z` = 19:18 İstanbul: karttaki 19:16 Yatsı +2 dakika. Bu gözlem **mevcut Büyükçekmece ve elle/otomatik mod geçişi için PASS**; yurt dışı şehirlerine takip testi BLOCKED. Cache incelemesi bildirimin fiilen teslim edildiğini veya tüm OS alarmlarının varlığını kanıtlamaz; test bildirimi tetiklenmedi.

## Bulgular ve somut düzeltme önerileri — uygulanmadı

### P1 — Cihaz UTC farkı, yabancı GPS şehrini eliyor; yöntem ve saat dilimi de değişiyor

**Kanıt düzeyi:** gerçek repo fonksiyonlarıyla yerel yeniden üretim + kod incelemesi; cihaz/canlı API doğrulaması BLOCKED.

Muhtemel zincir: `apps/mobile/src/lib/prayerContextDeps.ts:81–87` → `apps/mobile/src/lib/diyanetPrayer.ts:333` → `apps/web/src/app/api/vakit/sehir/route.ts:60` → `apps/web/src/lib/diyanetVakit.ts:133–135`. Berlin/Londra, UTC+3 cihaz filtresini karşılamadığı için `null`; context şehir dilimi yerine cihaz dilimine düşüyor. `apps/mobile/src/lib/prayerMethod.ts:22` bu dilimde Türkiye yöntemini seçiyor; `prayerDayRepositoryAdapters.ts:61` aynı dilimi Aladhan'a iletiyor.

**Öneri:** GPS şehir aramasında cihaz UTC farkını zorunlu filtre yapmayın; en yakın coğrafi şehri ve onun IANA dilimini çözün. Şehir bulunamazsa koordinattan güvenilir saat dilimi çözümü kullanın; yöntem seçimini cihaz dilimine bağlamayın. Berlin/Londra + Europe/Istanbul cihazıyla şehir ID, `cityTimeZone`, yöntem, mutlak an ve bildirim planını birlikte doğrulayın. Kartta gösterilen saat dilimini de görünür kılın. Bu çalışmada hiçbir sayısal farkın ölçüldüğü iddia edilmez.

### P2 — Kaynak açıklamaları mevcut yedek kaynak davranışını doğru anlatmıyor

**Kanıt düzeyi:** cihaz UI + kod + mevcut planın `source=diyanet` kaydı.

`apps/mobile/src/i18n/strings/sehirSec.ts:9,14` vakitleri koşulsuz Diyanet olarak tanımlıyor; depo Aladhan'a düşebiliyor. Buna karşılık `apps/mobile/src/i18n/strings/personal.ts:77` bildirim konumunu yalnız Aladhan'a gönderiliyormuş gibi anlatıyor; mevcut Diyanet akışında uygulamanın kendi `/vakit/sehir` sunucusuna da yuvarlanmış konum gönderiliyor. Ekran görüntüleri 02/04 ve `prayerDayRepository.ts:204–207` bu tutarsızlığı destekliyor.

**Öneri:** genel açıklamayı “Diyanet; veri bulunamazsa yaklaşık hesap” şeklinde düzeltin; aktif günün kaynak ve saat dilimini gösterin. Bildirim açıklamasında kendi şehir çözümleme endpoint'ini ve koşullu Aladhan kullanımını gerçek veri akışına uygun anlatın. Sunucuda saklama davranışı bu testte denetlenmedi.

## BLOCKED kalanlar

- Fake GPS arama popup'ı paket adı içermeyen odağa geçtiği için şehir arama, Play ve dolayısıyla üç şehirde GPS testi yapılamadı. Güvenlik kuralı gereği popup ekran görüntüsü de alınmadı.
- Mock uygulama seçimi doğrulanmadı; “mock location not allowed” mesajı görülmedi; Android Developer options açılmadı.
- Canlı referanslar bağlantı hatası nedeniyle alınamadı; altı vakit farkları ve >5 dakika bayrakları hesaplanamadı.
- Üç şehirde kartın şehir adı/vakit/geri sayım/Kıble/hata banner'ı ve bildirim planı takip davranışı doğrulanamadı.
- Devam için Fake GPS'nin şehir aramasına, belirtilen paket adı odak koşulunu ihlal etmeden erişilebilmesi gerekiyor. İzin eksikliği ancak uygulamanın mesajı görülürse ayrıca değerlendirilmeli.

## Ekran görüntüleri

Dosyalar: `docs/denetim/yurtdisi-gps-2026-11-18/` (720×1600 PNG).

| Dosya | İçerik |
|---|---|
| [01-baslangic-ana-sayfa.png](yurtdisi-gps-2026-11-18/01-baslangic-ana-sayfa.png) | Başlangıç şehri, altı vakit ve geri sayım |
| [02-sehir-secimi.png](yurtdisi-gps-2026-11-18/02-sehir-secimi.png) | Otomatik konum seçeneği ve şehir arama |
| [04-baslangic-bildirimler.png](yurtdisi-gps-2026-11-18/04-baslangic-bildirimler.png) | Bildirim ayarları ve kaynak açıklaması |
| [05-otomatik-ana-sayfa.png](yurtdisi-gps-2026-11-18/05-otomatik-ana-sayfa.png) | Otomatik moda geçişten sonra mevcut şehir kartı |
| [06-otomatik-secili.png](yurtdisi-gps-2026-11-18/06-otomatik-secili.png) | Otomatik seçeneğinin seçili işareti |
| [07-geri-yukleme-sehir-sonucu.png](yurtdisi-gps-2026-11-18/07-geri-yukleme-sehir-sonucu.png) | Başlangıç şehrinin doğru arama sonucu |
| [08-ibadet.png](yurtdisi-gps-2026-11-18/08-ibadet.png) | İbadet sekmesinin gerçek içeriği; vakit kartı yok |
| [09-son-ana-sayfa.png](yurtdisi-gps-2026-11-18/09-son-ana-sayfa.png) | Geri yüklenmiş Büyükçekmece, aynı altı vakit, Yatsı'ya 30 dk |

Berlin/Londra/Mekke ekran görüntüsü yoktur; sahte şehir etkinleştirilemedi.

## Ek — Claude'un elle yaptığı GPS testi (18.11.2026, 18:57–19:08)

Fake GPS koordinat girişiyle (Search → Coordinates) çalıştırıldı; cihaz saat dilimi Europe/Istanbul bırakıldı (sistem ayarına dokunulmadı). Referans: canlı `/api/v1/vakit?cityId=…&month=2026-11` (Diyanet).

| Şehir | Uygulama (İstanbul saati) | Diyanet (İstanbul saatine çevrilmiş) | Sonuç |
|---|---|---|---|
| Mekke (21.4225, 39.8262) | 05:16 06:26 12:11 15:20 17:45 18:51; etiket "Mekke"; hicri 9 | aynı; hicri 9 | PASS — birebir; bildirim planı `c16309`, kaynak diyanet |
| Berlin (52.52, 13.405) | 07:32 09:26 13:56 15:53 18:16 20:03; etiket "Berlin"; hicri **8** | 07:32 09:26 13:57 15:52 18:17 19:58; hicri 9 | Vakitler ≤5 dk (yatsı +5) — kabul; Diyanet eşleşmesi yok (off filtresi, beklenen) |

Bulgular:
- **P3 — Aladhan yedeğinde hicri tarih 1 gün geride** (Berlin: 8 vs Diyanet 9). Aladhan hicri eşlemesi `prayerDayRepositoryAdapters.ts` içinde; Diyanet ile aynı gün için tutarsız.
- **P3 — Konum değişince ön plana dönüşte yenilenmiyor:** Berlin→Mekke sonrası uygulama öne alındığında kart Berlin'de kaldı; JS reload sonrası Mekke'ye geçti. `getHomeLocation` son konumu (≤10 dk) kullanıyor; AppState foreground'da yeniden bağlam kurulmuyor olabilir.
- Londra ve Berlin+Berlin saat dilimi senaryosu kullanıcı kararıyla atlandı (gerçek yolcuda saat dilimi otomatik değişir).

Geri yükleme: Fake GPS kendi stop düğmesiyle durduruldu (force-stop yok). Şehir UI'dan Büyükçekmece (9537) seçildi; `namazNotifSchedDay` = başlangıçla aynı (`m9537|repo2:diyanet:8e5fdd6f`), kart vakitleri başlangıçla aynı.
