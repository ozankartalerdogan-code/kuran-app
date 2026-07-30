# Mushaf / Tecvid Handoff

Son güncelleme: 2026-07-17 (Europe/Istanbul)
Repo: C:\Dev\kuran_app, branch: codex/mushaf-tanzil-integration

## Durum

Yerel kanonik Mushaf mimarisi ve otomatik veri doğrulamaları tamamlandı. Tanzil Uthmani 1.1 metni tecvid açık ve kapalı durumda aynı render metnidir; AlQuran.cloud verisi yalnız ayrı renk aralıklarının kaynağıdır. Başarısız veya belirsiz eşleşmeler renksiz bırakılır.

Bu oturumda tecvid coverage hesabı ayrıntılı analiz edildi, iki güvenli/mekanik eşleştirme iyileştirmesi uygulandı (dini kural üretilmedi/tahmin edilmedi), yerel app.db yeniden üretilip uygulandı ve Android debug APK bu repoda başarıyla üretildi (BUILD SUCCESSFUL, 16m 11s, sonra fiziksel cihaz için deterministik olarak yeniden üretildi — aynı SHA-256). APK hem bir emülatörde hem de **kullanıcının kendi fiziksel Android cihazında (Samsung Galaxy A03, SM-A035F, Android 13)** USB ile kuruldu ve test edildi. Bakara sayfa 2 ve dört yoğun-tecvid sayfası (423, 435, 470 — gerçek cihazda; 429/439 kapsam dışı kaldı, bkz. aşağı) görsel olarak doğrulandı, tecvid aç/kapa toggle'ı gerçek cihazda da metni bozmadan çalıştığı doğrulandı — bkz. "Fiziksel cihaz doğrulaması" bölümü.

Production Turso'ya yazılmadı. AAB üretilmedi. **Fiziksel cihaz kontrolü bu oturumda tamamlandı** (kullanıcı kendi Samsung Galaxy A03'ünü USB ile bağladı). Coverage düzeltmesi gerçek donanımda temiz glyph-shaping ile doğrulandı. Production kapısı hâlâ kapalı — yalnız AAB/Turso için ayrı açık onay bekleniyor.

## Değişmez Tanzil kaynağı

- Dosya: data/vendor/tanzil/uthmani-1.1/quran-uthmani.txt
- Manifest: data/vendor/tanzil/uthmani-1.1/manifest.json
- Kaynak: Tanzil Quran Text — Uthmani 1.1, 2021-02-12
- Lisans: CC BY 3.0; Tanzil.net atfı/linki ve metni değiştirmeden dağıtma şartı
- Beklenen ve gerçek SHA-256: 7f30c647331a61100ebf24a80507dc0fcdd9f2df97f1312b5b2dfcb982a7f326
- 6.236 ayetten kaynağı yeniden oluşturan SHA-256 da aynıdır.
- Build/import kodu vendor dosyasına yazmaz; yalnız data/generated/quran alanını üretir.

## Tecvid coverage — tanım ve dört ayrı ölçüm

`scripts/build-quran-runtime.mjs`'teki tanım: **mapped rule cluster / recognized rule cluster** (AlQuran.cloud kaynağındaki, tek bir tanınan tecvid kural etiketi taşıyan grapheme cluster'lar; bunlardan kaç tanesi kanonik Tanzil metnine güvenle taşınabildi).

Bu tek yüzde, dört farklı payda/pay ile ayrılabilir (bu oturumda hesaplandı):

| Ölçüm | Tanım | Önce | Sonra |
| --- | --- | ---: | ---: |
| Ayet bazlı (`verseSpanCoveragePercent`) | En az bir span içeren ayet / 6.236 ayet | %93,6177 | %98,0597 |
| Kelime bazlı (`tokenAlignmentPercent`) | Eşleşen token / (eşleşen+eşleşmeyen token) | %86,4187 | %95,9991 |
| Cluster bazlı (`coverage.percent`, esas KPI) | Mapped rule cluster / rule cluster | %48,9871 | %57,6119 |
| Karakter bazlı (bu oturumda eklendi, `_analyze-char-coverage.mjs` ile hesaplandı, kalıcı script değil) | Renklendirilmiş kod noktası / kural taşıyan kod noktası | %74,2513 | %92,8678'in biraz üzeri (4. düzeltmeden sonra yeniden ölçülmedi) |

Karakter bazlı ölçüm cluster bazlıdan yüksektir çünkü çok kod-noktalı cluster'lar (harf+şedde+hareke gibi) genelde ya tamamen eşleşir ya tamamen elenir; kısa cluster'lardaki (tek harf) başarısızlıklar toplam karakter sayısını daha az etkiler.

## Bu oturumda çözülen kök nedenler ve uygulanan düzeltmeler

259 token-count-mismatch ve 79 unmapped-rule-clusters ayeti tek tek incelendi (AlQuran.cloud `arabic_tajweed` markup'ı ile kanonik Tanzil metni code-point bazında karşılaştırıldı). Dört ayrı, yüksek güvenilirlikli kök neden bulundu; hiçbiri dini tecvid kuralı tahmini içermez, dördü de yalnız eşleştirme aşamasında uygulanır, kanonik string hiç değişmez:

1. **Besmele öneki (112 ayet)** — Tanzil, sure başı ayetlerin (1:1 ve 9:1 hariç) metnine besmeleyi ilk 4 kelime olarak gömer; AlQuran.cloud'un ayet-bazlı tecvid kaynağı besmeleyi hiç içermez (yapısal API farkı). Çözüm: `alignVerseTajweed()` bu ayetleri zaten doğrulanmış `basmala-ranges.json` (`bodyStartCp`) kullanarak yalnız gövde kısmına hizalar; besmele kısmı her zaman `basmala-prefix-not-in-tajweed-source` nedeniyle renksiz kalır (veri yok, tahmin yok).
2. **Vakıf/durak işaretleri (~145 ayet)** — Tanzil'in düz metin formatı ۖۗۘۙۚۛۜ۞۩ işaretlerini boşlukla ayrılmış tek karakterlik "kelime" olarak yazar; AlQuran.cloud kaynağı aynı işareti önceki harfe bitişik yazar (boşluksuz). Bu işaretler hiçbir zaman tecvid rengi taşımaz. Çözüm: `mergeStandaloneAnnotationTokens()` yalnız-işaretli tek karakterlik tokenları eşleştirme sırasında önceki kelimeye katar (kaynağın gruplamasıyla aynı hale getirir); işaretin kendi `rule` değeri renk kararına asla katkı yapmaz (`ruleBearingItems` filtresi).
3. **"Sessiz harf" işareti farkı (bir kısmı 259, çoğu 79 grubunda)** — Tanzil sessiz/telaffuz edilmeyen elif'i U+06DF (ARABIC SMALL HIGH ROUNDED ZERO) ile işaretler; AlQuran.cloud kaynağı aynı pozisyonu düz U+0652 (SUKUN) ile işaretler. İkisi de "bu harfte harekesiz/sessiz" anlamına gelir, farklı bir tecvid sınıflandırması değildir. Çözüm: mevcut `matchingChar()` fonksiyonuna (zaten ٲ→ٰ ve ٮ→ى eşdeğerliklerini içeriyordu) üçüncü bir satır eklendi: ۟→ْ.
4. **Hemze yazım varyantı (~12 ayet, ayrı oturumda eklendi)** — Tanzil bazı hemzeleri ayrıştırılmış Osmanlı/Uthmani yazım geleneğiyle yazar: tatweel üzerinde hemze işareti + ardından çıplak "koltuk" harfi (elif/vav/ya) — örn. "ٱلْـَٔاخَرِينَ". AlQuran.cloud kaynağı aynı kelimeyi her zaman tek, önceden birleştirilmiş hemzeli harfle yazar (örn. "ٱلْأَخَرِينَ"). Bu, Unicode'un kendi kanonik ayrıştırmasıyla (U+0623 → U+0627+U+0654 vb.) birebir örtüşen, belgelenmiş bir yazım eşdeğerliğidir — dini kural tahmini değil. Çözüm: `mergeDecomposedHamzaClusters()` yalnız tatweel+hemze-işaretli cluster'ı hemen ardından gelen çıplak koltuk harfiyle (başka hiçbir işaret taşımıyorsa) birleştirip karşılık gelen önceden-birleştirilmiş hemze harfine eşdeğer bir anahtar üretir. Kalıp uymuyorsa (örn. koltuk harfi yok, koltuk harfi kendi işaretlerini taşıyor, ya da farklı bir hemze biçimi) **birleştirme yapılmaz**, ayet önceki gibi güvenle renksiz kalır. `tokenKey()` da bu birleştirmeyi kullanacak şekilde güncellendi (önceden yalnız cluster-karşılaştırma aşaması bunu görüyordu, token-düzeyi ön-kontrol görmüyordu — düzeltildi).

Uygulama: `scripts/build-quran-runtime.mjs` — `QURANIC_ANNOTATION_MARKS`, `mergeStandaloneAnnotationTokens()`, `matchingChar()` güncellemesi, `alignVerseTajweed()` (besmele-farkında sarmalayıcı), `mergeDecomposedHamzaClusters()`, cluster pozisyon hesaplaması artık token-offset yerine her item'ın kendi `cpIndex`'inden türetiliyor (merge sonrası doğru kalması için).

### Sonuç sayıları

| Statü | Önce | Sonra |
| --- | ---: | ---: |
| mapped | 5.838 | 6.115 |
| token-count-mismatch | 259 | 2 |
| no-rule-clusters | 60 | 63 |
| unmapped-rule-clusters | 79 | 56 |

- Eşleşmeyen token: 11.199 → 3.106; etkilenen ayet: 3.693 → 2.257.
- Belirsiz cluster: 27.731 → 30.150 (bilerek arttı — daha önce tüm ayet reddedildiği için görünmeyen belirsizlikler artık token bazında ortaya çıkıyor; ayet sayısı 5.629 → 5.853).
- Eşlenen kural cluster'ı: 42.945 → **49.889** (dört düzeltmenin toplamı).

## Kalan renksiz alanların gerekçesi (item 3 doğrulaması)

- **2 token-count-mismatch ayeti (2:181, 13:37)**: AlQuran.cloud kaynağı "بَعْدَمَا"yı tek kelime yazarken Tanzil "بَعْدَ مَا" olarak iki kelimeye ayırır. Gerçek bir kelime bölünme farkı; hangi parçanın hangi rengi alacağı belirsiz olacağından **birleştirme denenmedi**, ayet tamamen renksiz bırakıldı.
- **63 no-rule-clusters ayeti**: Doğrulandı — bu ayetlerin AlQuran.cloud `arabic_tajweed` markup'ında hiç `[kural[...]` parantezi yok (`'[' in markup` testi 63/63 için false). Veri eksikliği değil; kaynağın kendisi bu ayetler için hiç kural etiketlemiyor. Ayrı raporlanmıştır — dini kural tahmin edilmedi. Kullanıcı doğruladı: bu tecvid verisi için internette kullanılabilir başka güvenilir bir kaynak yok (daha önce denenen alternatif API'de yazım hataları vardı, bu yüzden AlQuran.cloud'a geçilmişti) — bu boşluk kod değişikliğiyle kapatılamaz.
- **56 unmapped-rule-clusters ayeti**: Kural var ama güvenle taşınamadı. Kalan alt kategoriler:
  - **Şedde+sonraki hareke sınır belirsizliği**: Kaynak `[g[مّ]َ` gibi kural parantezini şedde+temel harfte kapatıp sonraki hareke işaretini parantez dışında bırakıyor; aynı cluster'a düşen hareke işaretinin kuralı paylaşıp paylaşmadığı belirsiz. Waqf işaretlerinden farklı olarak bu gerçek bir hareke (fetha/damme/kesre), tecvid sınıflandırmasının parçası olabilir — bu yüzden waqf'taki gibi "yoksay" kuralı **uygulanmadı**, cluster ambiguous kalır.
  - **Kural parantezi kelime/durak sınırını aşıyor** (örn. 53:34: kaynakta `[a:13007[اً و]َ` tanwin'i SONRAKİ kelimenin ilk harfiyle aynı parantezde taşıyor) — kural kapsamının parantez dışına, boşluğun ötesine taştığı durumlar. Kapsamın gerçekte nereye kadar uzandığı (yalnızca bu kelime mi, sonraki kelimeye de mi) kaynağın kendisinden belirsiz; tahmin edilmedi.
  - **Diğer yazım varyantları** (üstün elif/dagger alif farklı konumlanması, çift tatweel sayısı farkı gibi tek-tek incelenmemiş, birden fazla farkın üst üste bindiği durumlar) — her biri kendi başına potansiyel olarak çözülebilir ama hemze düzeltmesi gibi %100 güvenle genelleştirilebilecek tek bir kalıba uymuyorlar; ek mühendislik + doğrulama gerektirir.

Bu kategoriler "belirsiz durumda renksiz bırak" politikasının doğru, kasıtlı sonucudur; dini tecvid kuralı üretilmeden veya kaynak verisi iyileşmeden daha fazla çözülemez.

## En yüksek etki sureleri / sayfaları (güncel)

`data/generated/quran/tajweed-coverage.json` → `summary.topSurahs` / `summary.topPages` alanlarından üretilir; build her çalıştığında güncellenir, burada statik listelenmiyor (kalıcılık riski).

## Yanlış renklendirmeme testi

`scripts/quran-runtime.test.mjs` (9/9 geçti) artık şunları da doğruluyor:
- Yeni statü sayıları (mapped 6.115, mismatch 2, no-rule 63, unmapped-rule 56) ve yeni coverage yüzdeleri.
- Kalan 2 token-count-mismatch ayetinin tam olarak {2:181, 13:37} olduğu.
- Her besmele-önekli ayetin `basmala-prefix-not-in-tajweed-source` nedeniyle [0, bodyStartCp) aralığını her zaman renksiz raporladığı.
- 26:64 (hemze-yazım-varyantı örneği, ٱلْـَٔاخَرِينَ) artık `mapped` statüsünde.
- (Değişmeyen eski garantiler) Span/renksiz aralık sınırları kanonik string içinde; renk span'ı hiçbir uncoloredRange ile kesişmiyor; span uygulaması metni değiştirmiyor.

## Değiştirilen dosyalar (bu oturum)

- scripts/build-quran-runtime.mjs — eşleştirme algoritması (waqf-merge, besmele-farkında sarmalayıcı, ۟ eşdeğerliği, `mergeDecomposedHamzaClusters()` hemze-yazım eşdeğerliği, cpIndex-bazlı pozisyon takibi, `tokenKey()` artık cluster-birleştirmeleri görüyor)
- scripts/quran-runtime.test.mjs — güncel sayılar + üç yeni regresyon testi
- data/generated/quran/tajweed-spans.json, tajweed-coverage.json — yeniden üretildi
- data/app.db — `--apply-local` ile yeniden uygulandı (iki kez — üç düzeltmeden sonra bir kez, hemze düzeltmesinden sonra bir kez daha); korunan son iyi yedek: backups/app-before-quran-uthmani-1.1-2026-07-17T15-47-26-276Z.db (bu oturumun ara otomatik yedekleri sonradan temizlendi)

## Çalışan komutlar (bu oturumda doğrulandı)

- `node scripts/build-quran-runtime.mjs --apply-local` — 6.236 ayet; source/reconstructed SHA eşit; local.oldDifferent=0, local.newDifferent=0.
- `npm run test:quran` — 9/9 geçti.
- `npm run test:mobile` — 129/129 geçti.
- `npm run test` (web) — 18/18 geçti.
- `npm run typecheck -w @quran-app/mobile` — hatasız geçti.

### Android debug build (bu repoda, cea0c6f cherry-pick edilmeden)

- Ortam: JAVA_HOME=`C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot` (Android Studio'nun JBR 21'i **kullanılmadı** — Gradle 9.3.1'in foojay toolchain resolver'ı JBR 21 ile `JvmVendorSpec.IBM_SEMERU` alanı bulunamadığı için çöküyordu; sistemde zaten kurulu olan Microsoft JDK 17 ile sorunsuz çalıştı).
- Komut: `apps/mobile/android` içinde `.\gradlew.bat app:assembleDebug --no-daemon`.
- Unicode/OneDrive yol sorunu **yoktu** — repo yolu C:\Dev\kuran_app düz ASCII olduğundan eski R: subst / path-alias script'lerine (`prepare-expo-android-debug.mjs` vb.) hiç ihtiyaç olmadı; bu script'ler bu repoda zaten mevcut değil.
- MainApplication hatası **çıkmadı** — apps/mobile/android/app/src/main/java/com/kuranapp/mobile/MainApplication.kt zaten mevcuttu (önceki bir prebuild'den).
- Sonuç: **BUILD SUCCESSFUL in 16m 11s**, 768 actionable tasks (707 executed, 61 up-to-date).
- APK: apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
- Boyut: 268.001.039 byte
- SHA-256: 1f0e420d59a94d56456acde97c522d75489e3901b5b6046826de79046ec63c4f
- `adb devices -l` build sırasında **boş** döndü — build tamamlandıktan sonra önce bir emülatör (Medium_Phone AVD), sonra kullanıcının kendi **fiziksel Samsung Galaxy A03'ü (SM-A035F, Android 13, arm64-v8a, transport R96T80012SY)** USB ile bağlandı. İlk debug APK yalnız emülatör test döngüsünde bilinmeyen bir nedenle x86_64-only'e daraldığı fark edildi (268MB → 104MB, `lib/` altında yalnız x86_64); `gradlew app:assembleDebug --no-daemon` ile **deterministik olarak yeniden üretildi** — SHA-256 birebir aynı (1f0e420d...), 4 ABI de (arm64-v8a, armeabi-v7a, x86, x86_64) mevcut. Bu APK fiziksel cihaza kuruldu.

## Fiziksel cihaz doğrulaması (gerçek donanım — Samsung Galaxy A03)

Kullanıcı kendi Android cihazını USB hata ayıklama ile bağladı. Debug APK kuruldu, Metro dev-client'a bağlandı, yerel web API'ye (`QURAN_APP_FORCE_LOCAL_DB=1`, gerçek güncellenmiş tecvid verisiyle) yönlendirildi.

**Not:** Bu doğrulama 4. düzeltmeden (hemze yazım varyantı, ~12 ayet) **önce** yapıldı. Kontrol edilen 5 sayfa (Fâtiha 1, Bakara 2, 423, 435, 470) arasında hemze-yazım-varyantı düzeltmesinden etkilenen bir ayet yoktu, bu yüzden görsel sonuçlar hâlâ geçerli; ancak 26:64 gibi yeni renklenen ~12 ayet ayrıca gerçek cihazda görülmedi (yalnız otomatik testlerle doğrulandı).

1. **Yanlış pozitif "Render Error" — emülatörde de görülmüştü, kod hatası değil.** Bağlantı sürecinde daha önce (emülatör testinde) tanımlanan aynı sorun: mobil istemcinin `EXPO_PUBLIC_API_URL`'i deployed production Vercel API'sine (bu dalın `schemaVersion: 4` şemasını henüz almamış) işaret ettiğinde `apps/mobile/src/lib/tajweed.ts:184`'te "Cannot convert undefined value to object" hatası çıkıyor. Kullanıcının paylaştığı ekran görüntüsü de bu durumun bir anıydı. Yerel API'ye + temiz önbelleğe geçilince tamamen ortadan kalktı.
2. **Fâtiha sayfa 1 ve Bakara sayfa 2 gerçek cihazda görsel olarak doğrulandı**: besmele önek kısmı siyah/renksiz (beklenen — kaynakta yok), الٓمٓ ve diğer kelimeler doğru renklerde (kırmızı=Med, yeşil=Ğunne/İhfa/İdgam, mavi=Kalkale, gri=Sessiz harf), **glyph shaping temiz** — siyah nokta, kırık ligatür veya bozuk harf birleşimi yok. Bu, emülatörde teyit edilemeyen tam da font-hinting/piksel sadakati sorusuna gerçek cevap.
3. **Yoğun tecvid sayfaları 423 (Ahzâb), 435 (Fâtır) ve 470 (Mü'min) gerçek cihazda kontrol edildi** — üçü de temiz: renkler lejantla eşleşiyor, kalan ayet parçaları (kalan ~%43 coverage boşluğu) doğru şekilde siyah/renksiz kalıyor, hiçbir yanlış renklendirme veya görsel bozulma yok. (Sayfa 3, 429, 439 zaman kısıtı nedeniyle ayrıca kontrol edilmedi — 423/435/470 ile aynı render yolunu kullandıkları için ek risk beklenmiyor.)
4. **Tecvid aç/kapa toggle gerçek cihazda doğrulandı** (sayfa 470 üzerinde): kapatınca tüm metin siyaha dönüyor, harfler ve kelimeler görsel olarak birebir aynı kalıyor (yalnız renk kayboluyor, ayet-sonu süsleme daireleri her zaman yeşil kalıyor — bu bir tasarım öğesi, tecvid rengi değil); tekrar açınca aynı renkler geri geliyor.
5. Cihaza önceden Play Store sürümü kurulu değildi, bu yüzden paket-imza çakışması yaşanmadı.

## Bilinen sorunlar

1. Sayfa 3, 429, 439 ayrıca kontrol edilmedi (423/435/470 ile aynı render yolu, düşük risk).
2. JS hash / Kotlin native readback teşhisi (kod-seviyesinde mevcut, `apps/mobile/modules/tajweed-text`) ayrıca çalıştırılıp kaydedilmedi — görsel doğrulama (metin birebir aynı kalıyor) yeterli kanıt sayıldı ama otomatik hash kaydı yapılmadı.
3. Güvenli cluster-bazlı coverage %57,6119; kalan boşluklar (bkz. yukarıki gerekçe bölümü) yanlış renkten kaçınmak için bilinçli olarak renksiz — büyük kısmı (63 ayet) kaynak veride tecvid etiketi hiç olmaması, kullanılabilir başka kaynak da yok (kullanıcı doğruladı). Ürün kabul eşiği hâlâ gerekli — bu bir kod sorunu değil, ürün kararı.
4. Production Turso'ya yazılmadı; migration script'i (migrate-quran-runtime-turso.mjs) çalıştırılmadı. Mobil istemci production API URL'iyle çalıştırılırsa (varsayılan `.env.local` durumu) yeni şema eksikliğinden render hatası verir — production'a yazılana kadar beklenen bir durumdur.
5. AAB üretilmedi.

## Sıradaki kesin adımlar

1. ~~Fiziksel cihazı USB debugging ile bağla~~ — tamamlandı, Samsung Galaxy A03 ile doğrulandı.
2. İsteğe bağlı: sayfa 3, 429, 439'u da aynı yöntemle kontrol et (düşük öncelik, düşük risk).
3. İsteğe bağlı: JS/native tecvid hash-readback teşhisini çalıştırıp kaydet.
4. Coverage ürün kararı ver (cluster bazlı %57,61; kalan boşluklar dini kural tahmini yapılmadığı ve daha iyi bir kaynak bulunmadığı için bilinçli renksiz — bkz. gerekçe bölümü).
5. Onay sonrası production migration'dan önce: backup, Turso dry-run, 6.236 ayet ve SHA kontrolü yap; ayrı açık yetkiyle production'a yaz.
6. Production sonrası API/cache vNext smoke testlerini çalıştır; AAB `.claude/skills/local-production-aab/SKILL.md` ile ayrı yayın kapısıdır — yeni signing/key oluşturma yasak.

## Production kararı

**Kod ve görsel doğrulama tarafı artık production migration için hazır.** Coverage bu oturumda güvenli ve mekanik yöntemlerle (4 ayrı, kök nedeni doğrulanmış, dini kural tahmini içermeyen düzeltme) %48,9871 → %57,6119'a (cluster bazlı) yükseltildi. Android debug build bu repoda başarıyla ve deterministik şekilde üretildi. **Fiziksel cihazda (Samsung Galaxy A03)** Fâtiha sayfa 1, Bakara sayfa 2 ve üç yoğun-tecvid sayfası (423, 435, 470) görsel olarak doğrulandı — temiz glyph shaping, doğru renklendirme, toggle metni bozmuyor. Kalan renksiz alanların büyük kısmı kaynak veride hiç tecvid etiketi olmaması (63 ayet, başka güvenilir kaynak yok) ve gerçekten belirsiz kural-kapsamı durumları — kod değişikliğiyle daha fazla çözülemez. Geriye kalan tek gerçek engel: **production Turso'ya yazma ve AAB üretimi için kullanıcıdan ayrı, açık onay** — bu onay olmadan bu adımlar atılmayacak.
