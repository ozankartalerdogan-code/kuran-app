# 1.2.1 son üç düzeltme — Samsung A03 cihaz testi

17 Kasım 2026, yaklaşık 17:19–17:33 (İstanbul). Samsung A03 / SM-A035F, Android 13, adb `R96T80012SY`, paket `com.kuranapp.mobile`. Mevcut Metro 8082, USB reverse, force-stop + MainActivity ve dev client’ta `http://localhost:8082` seçimi kullanıldı. Kod değiştirilmedi; build/install ve commit yapılmadı.

| Madde | Sonuç | Kısa kanıt |
|---|---|---|
| 1 Türkiye birebir | **GEÇTİ** | Gerçekten yeniden üretilen Büyükçekmece planında 38 namaz isteği; geçmiş tetikler dışlanarak `c9-restored-storage.json` ile epoch çoklu kümeleri aynı, eksik/fazla yok. `carry` hiçbir günde yok; Türkiye açılışında ve yeniden üretiminde yeni ay anahtarı yok. Ana sayfanın altı vakti = plan. `c10-turkey-validation.json`, `c10-turkey-regenerated-*`, `c10-restored-*`. |
| 2 Önceki şehir gününden carry | **GEÇTİ** | Kiritimati’de 18 Kasım, New York’ta 17 Kasım. `days[0].carry` içinde öğle/ikindi/akşam/yatsı var. 46 namaz +13 ayet =59 istek ≤62; 59 Android alarmı. ISO +120000 ms, başlık ve alarm eşleşmeleri doğru; yinelenen namaz anı yok. `c10-carry-validation.json`, `c10-carry-*`. |
| 3 Ana sayfanın Aladhan’dan kendini düzeltmesi | **KALDI — tetiklenemedi** | Önbellekte olmayan Hakkari, Ardahan ve Kilis denendi; Sunset/Firstthird alanları hiçbir geçerli örnekte görülmedi. Bu nedenle Aladhan → Diyanet otomatik dönüşü doğrudan doğrulanamadı; hata saptandığı anlamına gelmez. |
| 3a Üç ilde son ana sayfa = plan | **GEÇTİ** | Her denemenin son ekranında altı vakit planla aynı. `c10-home-validation.json`, `c10-{hakkari,ardahan,kilis}-samples.json`, ilgili storage ve PNG dosyaları. |
| 4 Harf-i Tarif normal giriş | **GEÇTİ** | Öğren → Dersler → Elif-Ba → Harf-i Tarif; test başlatılmadan “Son tamamlanan test: 20/25” göründü, hata metni yok. SQLite `elifbaQuizScores[1000]` aynı sonucu içeriyor. `c10-harf-entry.png`, `c10-harf-entry-ui.xml`, `c10-harf-entry-storage.json`. |
| 4a Harf-i Tarif okuma hatası | **KALDI — denenmedi** | Gerçek okuma hatası zorlanamadı; hata enjeksiyonu yapılmadı. |

Kanıt kökü: `C:/Users/jalek/AppData/Local/Temp/claude/2851084b8bf36871/f02e84e1-974f-4f4b-994b-0f34414926da/scratchpad`. Tablodaki `c10-*` adları bu köke göredir. Önceki raporun yöntemi kullanıldı: RKStorage, Python subprocess ile ikili `adb exec-out run-as com.kuranapp.mobile cat databases/RKStorage` kopyasından SQLite olarak okundu; alarmlar `dumpsys alarm`, ekranlar Python ile ikili `screencap -p` alınarak kaydedildi. Dilim `cmd alarm set-timezone` ile değiştirildi. Gerçek bildirim teslimi beklenmedi; başlık plan içeriğinden, Android kurulumu epoch çoklu kümesinden doğrulandı.

## Türkiye

İlk açılış mevcut planı kullanmış olabilir; esas karşılaştırma diğer şehirlerden Büyükçekmece’ye dönüşte yeniden üretilen planla yapıldı. Önceki planın gelecekteki 38 namaz tetiği aynı; added=[], removed=[]. Son durumda 38 namaz +12 ayet =50 istek ve 50 alarm, eksik alarm yok. Ana sayfa ve plan: **06:20 / 07:48 / 12:56 / 15:29 / 17:53 / 19:16**.

İlk Türkiye yüklemesi öncesi/sonrası ay anahtarları eşit. Yeniden üretim için Kilis sonrası ile Büyükçekmece sonrası anahtarlar karşılaştırıldı: yeni anahtar yok. Diğer şehir denemelerinde indirilen aylar bu karşılaştırmadan önce zaten mevcuttu.

## Carry ayrıntısı

`c10-carry-storage.json` damgası `2026-11-18|tr|Pacific/Kiritimati|exact|t2|m8903`. Aşağıdaki kaynakların tümü New York’un 17 Kasım gününe ait; her tetik plan ve Android alarmında tam bir kez var.

| Vakit | Ham Diyanet ISO | +2 dakika tetik epoch (ms) | Plan / alarm adedi | Başlık |
|---|---|---:|---|---|
| Öğle | 2026-11-17T11:46:00-05:00 | 1794934080000 | 1 / 1 | 🕌 Öğle Vakti Girdi |
| İkindi | 2026-11-17T14:20:00-05:00 | 1794943320000 | 1 / 1 | 🕌 İkindi Vakti Girdi |
| Akşam | 2026-11-17T16:44:00-05:00 | 1794951960000 | 1 / 1 | 🕌 Akşam Vakti Girdi |
| Yatsı | 2026-11-17T18:01:00-05:00 | 1794956580000 | 1 / 1 | 🕌 Yatsı Vakti Girdi |

46 namaz isteğinin tamamında ham ISO +2 dakika ve doğru vakit başlığı doğrulandı. Eksik alarm, ISO uyuşmazlığı, başlık uyuşmazlığı ve yinelenen namaz epoch listeleri boş.

## Ana sayfa örneklemesi

Üç ilin ay anahtarı başlangıç `diyanetMonthsV1` içinde yoktu: Hakkari 9507, Ardahan 9238, Kilis 9629. Yaklaşık 1,2 saniye aralıkla yaklaşık 19 saniye boyunca SQLite örnekleri alındı; son ekranlar görsel olarak da kontrol edildi.

| İl | Son ana sayfa / plan (imsak → yatsı) | Gözlem |
|---|---|---|
| Hakkari | 05:16 / 06:40 / 11:55 / 14:37 / 17:00 / 18:19 | Diyanet, son eşitlik GEÇTİ. İlk kopya eşzamanlı yazım sırasında bozuk okundu; örnekleme yeniden başlatıldığından ilk geçiş anı kaçtı. |
| Ardahan | 05:23 / 06:52 / 11:59 / 14:33 / 16:56 / 18:20 | Aladhan gözlenmedi; son eşitlik GEÇTİ. 2,70 ve 3,92 saniyede ana sayfa yeni ilde, plan damgası önceki ildeydi; 5,17 saniyede eşitlendi. Bir SQLite örneği okunamadı. |
| Kilis | 05:42 / 07:04 / 12:21 / 15:05 / 17:29 / 18:46 | Aladhan gözlenmedi; son eşitlik GEÇTİ. 2,70 ve 3,92 saniyede yeni ana sayfa / önceki il planı görüldü; 5,16 saniyede eşitlendi. |

Bu geçici farklar kaynak ayrışması değil, plan yeniden üretiminin henüz tamamlanmamasıyla birlikte gözlendi. Aladhan’dan düzeltme davranışı hakkında başarı iddia edilmiyor; **tetiklenemedi**.

## Dosya ve geri yükleme doğrulaması

Başlangıç tracked `git diff --binary`, `c10-start-git.diff` olarak saklandı; rapor yazımı öncesi ve sonrası byte düzeyinde aynı. Mevcut kod değişikliklerine dokunulmadı. Depoya yalnız bu rapor eklendi; kanıtlar scratchpad içinde. Commit yapılmadı. Rapor Python ile UTF-8 BOM’suz yazıldı; yeniden okunarak Türkçe karakterler doğrulandı.

Başta `c10-restore.json` ve `c10-initial-storage.json` kaydedildi; sonda `c10-restoration-verified.json` başlangıç/son eşitliğini doğruladı:

| Alan | Başlangıç = son | Sonuç |
|---|---|---|
| auto_time_zone | 1 | GEÇTİ |
| persist.sys.timezone | Europe/Istanbul | GEÇTİ |
| Cihaz dili | tr-TR | GEÇTİ |
| uiLanguage | tr | GEÇTİ |
| diyanetManualCityV1 | Büyükçekmece id9537; aşağıdaki JSON dizesi birebir aynı | GEÇTİ |

```json
{"id":9537,"name":"BÜYÜKÇEKMECE","state":"İSTANBUL","country":"TÜRKİYE","tz":"Europe/Istanbul","lat":41.0452,"lon":28.5957}
```

**Geri yükleme GEÇTİ:** cihaz başlangıç ayarlarında, uygulama Büyükçekmece ana sayfasında ve 50 alarm kurulu bırakıldı (`c10-restored.png`). Denemelerde indirilen Diyanet ay önbellekleri kaldı.
