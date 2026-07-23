# Kuran Yolu Mushaf ve Tecvid Render Mimarisi

İnceleme tarihi: 2026-07-17  
İnceleme kapsamı: mobil Mushaf sayfa ekranı, ayet detay ekranı, web API, Quran runtime veri üretimi, Android Expo native view, fontlar, cache/fallback ve ilgili testler.  
Değişiklik kapsamı: Bu rapor dışında uygulama kodu, veri, native kaynak ve yapılandırma değiştirilmedi.

Bu belge mevcut çalışma ağacındaki koda dayanır. İlgili çalışma ağacında `apps/mobile/app/ayah/[surahId]/[ayahNumber].tsx`, `apps/mobile/src/lib/api.ts`, `apps/mobile/src/lib/mushafCanonical.ts` ve testi üzerinde henüz commit edilmemiş kullanıcı değişiklikleri vardır; aşağıdaki “mevcut sistem” tanımı bu değişiklikleri de içerir.

## Mimari özet

Sistem iki metin kaynağını tek metinde birleştirmez. Ekranda gösterilen Kur’an metni yalnızca değişmez Tanzil Uthmani 1.1 metnidir; AlQuran.cloud `quran-tajweed` verisi yalnız renk kurallarının canonical metin üzerindeki aralıklarını üretmek için kullanılır.

| Katman | Gerçek veri/yapı | Sorumlu kod |
| --- | --- | --- |
| Canonical Kur’an metni | `surahId|ayahNumber|arabicText`, 6.236 ayet; Tanzil Uthmani 1.1 | `data/vendor/tanzil/uthmani-1.1/quran-uthmani.txt`; `scripts/build-quran-runtime.mjs:37` `readCanonicalSource()` |
| Sayfa/cüz sınırları | 604 sayfa başlangıcı, 30 cüz başlangıcı, 114 sure ayet sayısı | `apps/mobile/src/data/mushaf_sayfalari.json:1`; API kopyası `apps/web/src/lib/mushaf_sayfalari.json:1` |
| Ham tecvid kaynağı | AlQuran.cloud köşeli-parantez markup’ı, `verses.arabic_tajweed` | `scripts/_build-tajweed.mjs:17`, `:82`, `:137` |
| Canonical tecvid çıktısı | Yarı açık Unicode code-point aralıkları: `{startCp,endCp,rule,color}` | `scripts/build-quran-runtime.mjs:271` `alignTajweedSpans()`; `data/generated/quran/tajweed-spans.json:3-9` |
| Sunucu runtime | `verses.arabic_text`, `tajweed_spans`, `quran_verse_metadata` | `scripts/build-quran-runtime.mjs:541`; `scripts/migrate-quran-runtime-turso.mjs:49-75` |
| Mobil API | `/api/v1/mushaf` ve `/api/v1/ayah`; v1 rewrite ile mevcut `/api/*` route’larına gider | `apps/mobile/src/lib/runtimeConfig.ts`; `apps/web/next.config.mjs:42-45` |
| Mobil canonical hazırlık | Besmele önekini kaynaktaki code-point offsetleriyle ayırır, span’leri gövdeye kaydırır | `apps/mobile/src/lib/mushafCanonical.ts:15-58` |
| Android renderer | Her kesintisiz metin bloğu için bir `TextView`, bir `SpannableStringBuilder` | `apps/mobile/app/mushaf-sayfa.tsx:104-166`; `TajweedTextModule.kt:42-232` |
| iOS/eski-build fallback | React Native `Text`; Arapça kelime içinde nested `Text` sınırı oluşturmaz | `apps/mobile/src/lib/tajweed.ts:200-218`; `apps/mobile/src/components/TajweedText.tsx:46-55` |

“Tek TextView” ifadesinin kesin sınırı şudur: Mushaf sayfasındaki her `Blok.tip === "metin"` için tek native view vardır. Sure başlığı/besmele araya girdiğinde `bloklariKur()` metin bloğunu kapatır; aynı sayfada birden çok sure başlangıcı varsa birden çok native `TextView` oluşabilir. Ancak tek bir metin bloğundaki bütün ayetler, tecvid renkleri ve ayet numarası rozetleri aynı string ve aynı `SpannableStringBuilder` içindedir (`apps/mobile/app/mushaf-sayfa.tsx:30-59`, `:104-166`, `:241-255`).

### Doğrulanmış sürüm ve koordinat bilgileri

- Canonical kaynak sürümü Tanzil Uthmani **1.1**; manifest 6.236 ayet ve SHA-256 `7f30c647331a61100ebf24a80507dc0fcdd9f2df97f1312b5b2dfcb982a7f326` bildirir (`data/vendor/tanzil/uthmani-1.1/manifest.json:4`, `:18-20`).
- Üretilen canonical build manifesti aynı kaynak SHA’sını ve reconstructed SHA’yı taşır; text-only SHA `32cc746d817cad9fd4366c7597bfceb177e7649233616c0a80309074b2eb99ee`’dir (`data/generated/quran/build-manifest.json:2-6`).
- Tecvid koordinat sistemi `unicode-code-point-half-open` yani `[startCp,endCp)`’dir (`data/generated/quran/tajweed-spans.json:3-5`; `basmala-ranges.json:2-3`).
- Mushaf API şeması `schemaVersion: 4`’tür (`apps/web/src/app/api/mushaf/route.ts:60-69`, `:118`; mobil tip `apps/mobile/src/lib/api.ts:245-258`).
- Mobil genel cache sürümü `v5`, Mushaf ham cache anahtarı `cache_mushaf_v5_p{page}`, URL cache-buster parametresi `v=5`’tir (`apps/mobile/src/lib/api.ts:317-318`, `:417-427`). Gerçek depolama anahtarı `vkey()` nedeniyle `v5_cache_mushaf_v5_p{page}` olur.
- Native Expo modülü Android-only ve Gradle `versionName '1.0.0'` değerindedir (`apps/mobile/modules/tajweed-text/expo-module.config.json:2-4`; `android/build.gradle:12-13`).
- Ham markup parser’ı veya canonical hizalayıcı için ayrı bir `parserVersion` sabiti/manifest alanı yoktur. Parser kimliği bugün yalnız fonksiyon/kod revizyonuyla belirlenebilir. Bu, mevcut sürümleme boşluğudur; API şeması, kaynak sürümü ve cache sürümü parser sürümü değildir.

## Uçtan uca veri akışı

### 1. Canonical Mushaf metninin alınması ve parse edilmesi

1. Kaynak `data/vendor/tanzil/uthmani-1.1/quran-uthmani.txt` dosyasıdır (`scripts/build-quran-runtime.mjs:8-10`). Manifest bu dosyayı immutable/read-only kaynak olarak işaretler (`manifest.json:20`).
2. `readCanonicalSource()` dosyayı byte olarak okur, manifest ve gerçek dosya SHA’sını sabit beklenen SHA ile karşılaştırır, CR byte’ı ve kayıp UTF-8 dönüşümünü reddeder (`scripts/build-quran-runtime.mjs:37-52`).
3. Copyright bloğundan önceki her satır ilk iki `|` üzerinden `surahId`, `ayahNumber`, `arabicText` alanlarına ayrılır. Metin trim edilmez ve normalize edilmez (`scripts/build-quran-runtime.mjs:53-68`).
4. Tam 6.236 ayet, 114 surenin beklenen ayet sırası ve kaynak byte’larının yeniden kurulabilirliği doğrulanır (`scripts/build-quran-runtime.mjs:69-79`). Build manifesti ayrıca “normalization, replacement, sanitization, trimming veya combining-mark reordering yok” politikasını kaydeder (`data/generated/quran/build-manifest.json:13`).

### 2. Besmele ayrımı

- `buildBasmalaRanges()` 1:1’i `kind:"ayah"` olarak kaydeder. Sure 2–114 arasında 9. sure hariç ilk ayetlerde Tanzil metninin ilk dört kelimesinden `kind:"prefix"` aralığı üretir; hard-coded ortak bir besmele metni enjekte etmez (`scripts/build-quran-runtime.mjs:82-103`).
- Çıktı 113 kayıt içerir: 1 ayet-besmele ve 112 önek-besmele. Koordinatlar yine code-point bazlıdır (`data/generated/quran/basmala-ranges.json:2-16`; `scripts/quran-runtime.test.mjs:85-103`).
- Mobilde `prepareCanonicalVerseForRender()` yalnız bu generated offsetlerle `basmalaText + basmalaSeparator + renderArabic` ayrımı yapar ve birleşimin özgün `arabic` stringini birebir yeniden kurduğunu kontrol eder (`apps/mobile/src/lib/mushafCanonical.ts:22-58`).
- Mushaf sayfasında önek-besmele sure başlığı içinde ayrı gösterilir; ayet gövdesi `renderArabic` ile devam eder (`apps/mobile/app/mushaf-sayfa.tsx:34-59`, `:229-239`). `basmalaSpans` hesaplanmasına rağmen ekran tarafından kullanılmaz; kaynakta önek-besmele için tecvid verisi zaten yoktur.
- Fatiha 1:1 `kind:"ayah"` olduğu için ayrı besmele başlığına ayrılmaz; ayetin tamamı normal ayet metni ve ayet numarasıyla render edilir. Tevbe 9:1 için prefix metadata üretilmez.

### 3. 604 sayfaya ve ayetlere bölünme

- Sayfa meta verisi `mushaf_sayfalari.json` içindeki `sureAyetSayilari`, `sayfaBaslangiclari`, `cuzBaslangiclari` dizileridir. JSON’un `kaynak` alanı “Tanzil quran-data.xml (cc-by)” der (`apps/mobile/src/data/mushaf_sayfalari.json:1`). İncelemede 604 sayfa, 30 cüz ve 114 sure kaydı doğrulandı; mobil ve web JSON kopyalarının SHA-256’ları eşittir.
- API `sayfaAraligi(page)` ile sayfanın başlangıcını mevcut kayıt, sonunu bir sonraki sayfa başlangıcından önceki ayet olarak belirler; sayfa 604 açıkça 114:6’da biter (`apps/web/src/app/api/mushaf/route.ts:10-43`).
- `GET()` bu ayet aralığını `verses` tablosundan sıralı okur; aynı aralık için `tajweed_spans` ve sure adlarını paralel sorgular (`apps/web/src/app/api/mushaf/route.ts:74-108`). İstemci sayfa ayetlerini tekrar hesaplamaz; hazır sayfa cevabını alır.
- Mobil `ayetinSayfasi()`, `sayfaninCuzu()` ve `sayfaBasSuresi()` aynı başlangıç dizilerinde binary search yaparak yalnız navigasyon/header bilgisi üretir (`apps/mobile/src/lib/mushafSayfa.ts:12-44`).
- `bloklariKur()` API’nin sıralı ayetlerini sure başlığı ve kesintisiz metin bloklarına ayırır (`apps/mobile/app/mushaf-sayfa.tsx:30-59`).

Sayfa meta JSON’unu `quran-data.xml`’den yeniden üreten script veya kaynak XML mevcut repoda bulunamadı. Kaynak atfı JSON ve kod yorumuyla doğrulanıyor; üretim adımı yeniden çalıştırılabilir değil. Bu konu “Emin olunamayan noktalar” bölümünde de kaydedilmiştir.

### 4. Tecvid verisinin alınması ve canonical metne hizalanması

1. Ham kaynak URL `https://api.alquran.cloud/v1/quran/quran-tajweed`’dir (`scripts/_build-tajweed.mjs:17`). `fetchAll()` sure/ayetleri `verse_key` ve markup `text` olarak toplar (`:82-92`).
2. `_build-tajweed.mjs` içindeki stack parser `[kod[` / `[kod:NN[` / kodsuz `[` / `]` yapılarını okur; en içteki aktif kuralı karaktere verir (`:42-66`). `--write` akışı ham markup’ı `verses.arabic_tajweed` alanına yazar (`:137-158`).
3. Güncel canonical builder bu ham alanı yerel `data/app.db` içinden salt okunur olarak alır (`scripts/build-quran-runtime.mjs:343-354`, `:426-431`). Dolayısıyla `_build-tajweed.mjs` veri hazırlama aracıdır; mobil runtime parser’ı değildir.
4. `parseTajweedMarkup()` markup’ı Unicode code point olarak gezer ve her visible karaktere `cpIndex` ile etkin kuralı ekler (`scripts/build-quran-runtime.mjs:105-130`).
5. `alignTajweedSpans()` canonical Tanzil ve markup kaynak metinlerini token/grapheme cluster seviyesinde eşler (`scripts/build-quran-runtime.mjs:271-340`):
   - standalone Quran annotation/vakıf tokenları yalnız eşleştirme için önceki tokena katılır (`:142-171`);
   - U+0672↔U+0670, U+066E↔U+0649 ve U+06DF↔U+0652 eşdeğerlikleri yalnız karşılaştırma anahtarı üretir, canonical metni değiştirmez (`:174-182`);
   - Tanzil’de ayrıştırılmış tatweel+hamza+seat ve kaynakta precomposed hamza olan kontrollü durumlar cluster anahtarında birleştirilir (`:200-246`);
   - token sayısı farklıysa tüm canonical ayet `token-count-mismatch` olarak renksiz kalır (`:283-286`);
   - token/cluster eşleşmezse yalnız ilgili token renksiz kalır (`:292-302`);
   - aynı cluster içinde birden çok gerçek atanmış kural varsa `ambiguous-cluster` olur ve renk üretilmez (`:310-327`);
   - ancak tek, bilinen kural varsa `{startCp,endCp,rule,color}` span’i üretilir (`:330-338`).
6. AlQuran.cloud sure başı ayetlerinde Tanzil’in önek-besmelesini içermediğinden `alignVerseTajweed()` yalnız ayet gövdesini hizalar; `[0,bodyStartCp)` açıkça `basmala-prefix-not-in-tajweed-source` olarak renksizdir (`scripts/build-quran-runtime.mjs:397-421`).
7. Belirsizlik politikası “tahmin etme, renksiz bırak”tır. Generated dosya bunu açıkça yazar (`data/generated/quran/tajweed-spans.json:4-5`; `tajweed-coverage.json:3-4`).

Mevcut generated veri 6.236 kaynak ayetin 6.160’ında en az bir span, toplam 64.173 span içerir (`data/generated/quran/tajweed-spans.json:6-9`). Güncel coverage tanımına göre 79.319/86.595 tanınan kural cluster’ı eşlenmiştir: `%91,5977`; ayet-span kapsamı `%98,7813`, token alignment `%95,9991` (`data/generated/quran/tajweed-coverage.json:5007-5014`). Bu sayılar eski `docs/mushaf-tecvid-handoff.md` içindeki bazı statik sayılarla uyuşmadığından bu raporda generated JSON ve geçen test snapshot’ı esas alınmıştır.

### 5. Runtime artifact ve veritabanı

- `writeGeneratedRuntime()` `verses.json`, `basmala-ranges.json`, `tajweed-spans.json`, `tajweed-coverage.json`, `build-manifest.json` üretir (`scripts/build-quran-runtime.mjs:498-534`). Bunlar audit/reproducibility artifact’leridir; web API doğrudan bu JSON’ları servis etmez.
- `applyLocalDatabase()` canonical metni `verses.arabic_text` alanına, metadata’yı `quran_verse_metadata`, renkleri `tajweed_spans`, hash/count değerlerini `quran_runtime_meta` tablosuna yazar ve postflight byte/code-point doğrulaması yapar (`scripts/build-quran-runtime.mjs:541-606`). Ana builder production yazımını özellikle reddeder (`:611-618`).
- Ayrı `migrate-quran-runtime-turso.mjs`, açık `--apply-production` ve doğru SHA onayı olmadan dry-run kalır, önce remote backup alır, sonra aynı tabloları Turso’ya yazar ve 6.236 ayet + reconstructed SHA postflight kontrolü yapar (`scripts/migrate-quran-runtime-turso.mjs:9-10`, `:31-60`, `:63-86`).
- API ortamda Turso credentials varsa Turso, yoksa read-only `data/app.db` kullanır (`apps/web/src/lib/dbUtils.ts:23-25`, `:39-56`, `:124-133`, `:146-194`). Bu seçim runtime ortamına bağlıdır; mobil istemci bunu belirlemez.

### 6. API’den mobile

- Varsayılan mobil API base `${WEB_BASE_URL}/api/v1`’dir (`apps/mobile/src/lib/runtimeConfig.ts`). Next rewrite `/api/v1/:path*` → `/api/:path*` yapar (`apps/web/next.config.mjs:42-45`).
- Mushaf API cevap yapısı: `{schemaVersion,page,juz,verses[],surahs[]}`; her verse `{surahId,ayahNumber,arabic,tajweedSpans,basmalaRange}` taşır (`apps/web/src/app/api/mushaf/route.ts:45-69`, `:110-135`).
- Ayet detay API’si aynı `verses.arabic_text` ve `tajweed_spans` tablosunu tek ayet için okur; besmele metadata’sını cevapta taşımaz (`apps/web/src/app/api/ayah/route.ts:49-74`, `:108-117`, `:167-183`).
- Mobil `api.mushaf.page()` ve `api.ayah.get()` bu tipleri alır (`apps/mobile/src/lib/api.ts:417-440`). Ağ istekleri 10/15/22,5 saniye timeout ve en çok iki retry uygular; 408/429/5xx yeniden denenir (`apps/mobile/src/lib/api.ts:6-7`, `:74-117`).

## Tecvid render akışı

### Aktif production yolu

Mobil Mushaf ve ayet detay ekranları `parseTajweed()` çağırmaz. Repo aramasında `parseTajweed()` kullanımının yalnız `tajweed.test.ts` içinde olduğu doğrulanmıştır. Aktif yol:

`API arabic + code-point spans`  
→ `prepareCanonicalVerseForRender()` (yalnız Mushaf sayfası)  
→ `mushafMetniHazirla()` (1:1 display uyumu)  
→ `codePointSpansToUtf16Ranges()`  
→ JS native view props  
→ Kotlin `SpannableStringBuilder` + `ForegroundColorSpan`.

### Mushaf ekranı, Android native mevcut, tecvid açık

1. `MushafSayfasi` `api.mushaf.page(page)` çağırır ve `bloklariKur()` ile hazırlar (`apps/mobile/app/mushaf-sayfa.tsx:179-187`).
2. `MetinBloguNative()` her ayette önce mevcut birleşik stringin `text.length` UTF-16 uzunluğunu base offset olarak verir; canonical code-point span’leri `codePointSpansToUtf16Ranges()` ile UTF-16’ya dönüşür (`:104-131`).
3. Ayetin canonical gövdesi eklenir, ardından ayet numarası rozeti ve her zaman accent rengindeki kendi range’i eklenir (`:119-128`).
4. Tüm blok stringi en son `mushafMetniHazirla()` ile uzunluk koruyan display eşdeğerliklerine çevrilir (`:129-131`).
5. `TajweedNativeText` `text`, `ranges`, seçili ayet için `highlightRanges`, boyut/satır yüksekliği, metin rengi, `textAlign="justify"`, touch ve debug readback callback’lerini native view’a geçirir (`:141-165`).
6. Kotlin tek spannable üzerinde tecvid ve ayet rozetlerine `ForegroundColorSpan`, seçili ayete `BackgroundColorSpan` uygular (`TajweedTextModule.kt:177-200`).

### Ayet detay ekranı, Android native mevcut, tecvid açık

1. Yol yalnız `arabicText` dolu, `tajweedSpans.length > 0` ve toggle açık olduğunda seçilir (`apps/mobile/app/ayah/[surahId]/[ayahNumber].tsx:833-843`).
2. `mushafMetniHazirla(data.arabicText)` ve API span’leri `TajweedText` bileşenine gider.
3. `TajweedText` code-point span’lerini UTF-16’ya çevirir; `suffix` olarak ` ﴿ayetNo﴾` ekler ve suffix’e altın renk range’i verir (`apps/mobile/src/components/TajweedText.tsx:25-42`).
4. Stil `textAlign:"right"` olduğu için native renderer justify değil sağ hizalıdır (`ayah detail:1342-1346`; `TajweedText.tsx:39`).
5. `selectable` native view’a açıkça verilir (`TajweedText.tsx:41`).

### Native yoksa tecvid fallback’i

- `NativeView` yalnız `Platform.OS === "android"` iken yüklenir; `requireNativeViewManager("TajweedText")` eski build/Expo Go’da throw ederse `null` kalır (`apps/mobile/modules/tajweed-text/index.tsx:28-40`). iOS her zaman bu fallback’tedir.
- `groupCanonicalTextByWord()` yalnız whitespace sınırında parça üretir; kelimeyi ilk kesişen güvenli span’in `rule` koduyla renklendirir ve bütün parçaların birleşimi canonical stringi verir (`apps/mobile/src/lib/tajweed.ts:200-218`).
- Böylece nested React Native `Text` sınırı kelime içine girmez ve Arapça joining daha az risklidir; bedeli harf/cluster hassasiyetinin kaybolup tüm kelimenin ilk span rengine boyanmasıdır.
- Native yol `span.color` alanını doğrudan kullanır. Fallback yol `span.rule` → yerel `RENK` tablosu dönüşümünü kullanır (`TajweedText.tsx:46-54`; Mushaf `AyetMetni`:78-94). Backend renkleri ile mobil `RENK` tablosu ayrışırsa platformlar farklı renk gösterebilir; bu kritik bir invarianttır.

### Eski `parseTajweed()` yolu

`apps/mobile/src/lib/tajweed.ts:107-162` içindeki stack parser şunları korur: nested markup, bozuk markup’ta çökmeden ilerleme, segmentin combining mark ile başlamamasını sağlama, U+0672→U+0670 ve U+066E→U+0649 display normalizasyonu, dagger-alif için base grapheme’i renk segmentine çekme. `segmentsToRanges()` ve `groupSegmentsByWord()` da aynı eski segment veri modelini işler (`:37-81`). Fakat mevcut Mushaf/Ayet production çağrı zincirinde bunların çağrısı yoktur. Test kapsamı güçlü olsa da bugün aktif canonical span renderer’ını doğrudan temsil etmez.

## Tecvid kapalı render akışı

| Ekran/platform | Tecvid kapalı renderer | Metin |
| --- | --- | --- |
| Mushaf, Android native modül var | Açık durumla aynı `MetinBloguNative` → aynı `TajweedNativeText`; yalnız tecvid `ranges` eklenmez. Ayet rozeti foreground range’leri ve seçili ayet background range’i kalır. | Aynı birleşik blok stringi (`mushaf-sayfa.tsx:119-131`, `:241-255`) |
| Mushaf, iOS/eski Android build | Dış React Native `Text`; `AyetMetni` plain hazırlanmış metin döndürür, ayet rozeti nested `Text` olarak eklenir | `mushafMetniHazirla(renderArabic)` (`:78-94`, `:258-275`) |
| Ayet detay, bütün platformlar | Plain React Native `<Text selectable>`; native module mevcut olsa bile kapalı durumda native renderer kullanılmaz | Hazırlanmış `arabicText` + nested altın suffix (`ayah detail:833-848`) |
| Ayet detay, span listesi boş | Toggle gösterilmez; tecvid açık tercihi olsa bile plain `Text` yolu | Aynı (`ayah detail:780-803`, `:833-848`) |

Mushaf Android native akışında aç/kapa gerçekten “renderer değişimi” değil “aynı text üzerinde tecvid foreground range’lerini ekle/çıkar” işlemidir. Ayet detayında ise açık/native ile kapalı/RN `Text` arasında renderer değişir. Bu iki ekran arasındaki önemli farktır.

`mushafCanonical.test.ts:32-44`, toggle’ın `renderArabic` ve SHA’sını değiştirmediğini, yalnız range listesini değiştirdiğini doğrular. Bu test display aşamasındaki `mushafMetniHazirla()` çıktısını veya ayet rozeti eklenmiş final stringi karşılaştırmaz.

## Android native render ayrıntıları

### JavaScript/TypeScript → native bridge → Kotlin/TextView

1. Ekran `TajweedNativeText` kullanır: Mushaf doğrudan `apps/mobile/app/mushaf-sayfa.tsx:141`; ayet detay `TajweedText` üzerinden `apps/mobile/src/components/TajweedText.tsx:34`.
2. `apps/mobile/modules/tajweed-text/index.tsx:30-40`, Expo `requireNativeViewManager("TajweedText")` ile view manager’ı bulur.
3. Expo autolinking Android modülünü `expo.modules.tajweedtext.TajweedTextModule` olarak kaydeder (`expo-module.config.json:2-5`; `apps/mobile/android/settings.gradle:32`).
4. Kotlin `ModuleDefinition` adı tam olarak `Name("TajweedText")`’tir; `View(TajweedTextView::class)` altında event ve prop bağları tanımlanır (`TajweedTextModule.kt:237-270`).
5. `text`, `ranges`, `highlightRanges`, `fontSize`, `lineHeight`, `maxFontSizeMultiplier`, `textColor`, `textAlign`, `selectable` prop’ları setter’lara gider (`:244-269`).
6. `TajweedTextView` tek Android `TextView` oluşturur ve tek child olarak `ExpoView` içine ekler (`:42-91`).

### String ve index bütünlüğü

- Kalıcı span koordinatı Unicode code point’tir; JS/React Native/Kotlin span koordinatı UTF-16 code unit’tir.
- `codePointSpansToUtf16Ranges()` `Array.from(text)` ile code-point dizisi kurar, her karakterin `.length` değerini kümülatif toplayarak code-point offset → UTF-16 offset tablosu üretir (`apps/mobile/src/lib/tajweed.ts:175-190`). Örneğin supplementary-plane karakter 2 UTF-16 birimidir; test bunu kapsar (`mushafCanonical.test.ts:62-68`).
- Çok ayetli blok base offsetleri ve ayet rozeti/suffix offsetleri JS `text.length` ile hesaplandığı için bridge’e geçen değerlerin tamamı UTF-16’dır (`mushaf-sayfa.tsx:119-128`; `TajweedText.tsx:27-31`).
- Kotlin `SpannableStringBuilder` indeksleri de UTF-16’dır. Her range `[0,len]` içine clamp edilir; boş/ters range ve parse edilemeyen renk atlanır (`TajweedTextModule.kt:183-199`, `:214-218`). Bu crash’i engeller ama upstream indeks hatasını görünmez biçimde renksiz bırakabilir.
- `SPAN_EXCLUSIVE_EXCLUSIVE` kullanılır; sonradan metin mutate edilmediğinden sınır davranışı deterministiktir (`:191`, `:198`).
- Native `textView.text.toString()` readback SHA-256’sı ve `readback == arabicText` sonucu `onTextVerified` ile JS’e gönderilir (`:200-211`). Mushaf ekranı bunu yalnız `__DEV__` logunda gösterir (`mushaf-sayfa.tsx:149-159`). Bu doğrulama native’in JS girdisini değiştirmediğini kanıtlar; JS girdisinin immutable Tanzil kaynakla aynı olduğunu tek başına kanıtlamaz, çünkü girdiye display eşlemesi ve ayet rozeti daha önce eklenmiştir.

### Arapça shaping ve harf birleşmesi

- Tam blok stringi TextView’a tek seferde verilir; renk için nested view/text node oluşturulmaz (`TajweedTextModule.kt:31-34`, `:183-200`).
- Yalnız `ForegroundColorSpan` ve seçim için `BackgroundColorSpan` kullanılır. `MetricAffectingSpan`, `TypefaceSpan`, boyut veya harf aralığı span’i yoktur (`:177-200`). Böylece renk sınırı shaper’ın metrik/font run’ını bölmez.
- Font, boyut, satır yüksekliği, RTL ve gravity ana TextView’a uygulanır (`:57-64`, `:151-170`).
- Generated hizalama span’leri grapheme cluster başlangıç/bitişlerinden üretilir (`scripts/build-quran-runtime.mjs:229-246`, `:297-337`). Ayrıca `scripts/verify-span-boundaries.mjs:24-41` `Intl.Segmenter("ar", {granularity:"grapheme"})` ile artifact’i denetleyebilen ayrı bir audit scriptidir; root package scriptine bağlı değildir ve bu incelemede çıktı yazmamak için çalıştırılmamıştır.
- Fallback’te harf seviyesinde doğruluk yerine kelimeyi bölmeme tercih edilir (`groupCanonicalTextByWord()`).

### Font metriği, ölçüm ve satır yüksekliği

- JS Mushaf: `fontSize = 23 * fontScale`, `lineHeight = 44 * fontScale` (`mushaf-sayfa.tsx:191-194`). Ayet detay: `30 * fontScale` ve `58 * fontScale` (`ayah detail:491-498`).
- Native değerleri SP kabul eder; explicit `maxFontSizeMultiplier` verilmediyse Android sistem font scale’i de uygulanır (`TajweedTextModule.kt:125-170`). Mevcut çağrılar `maxFontSizeMultiplier` geçmez. Sonuç, uygulama A-/A+ ölçeği ile sistem yazı ölçeğinin birlikte etkisidir.
- `TextViewCompat.setLineHeight()` kesin line-height uygular (`:167`; dependency `android/build.gradle:19`).
- Yoga native içerik yüksekliğini bilmediği için Kotlin exact width/unspecified height ile ölçer ve dp yüksekliği `onMeasured` ile yollar (`TajweedTextModule.kt:220-232`).
- JS wrapper yüksekliği `pencereGenişliği:fontSize:lineHeight:text` cache key’iyle tutar, ilk değeri 10’dur, maksimum 40 FIFO kayıt saklar ve text/metrik/genişlik değişiminde native view’ı `key` ile remount eder (`modules/tajweed-text/index.tsx`). Saklanan yükseklik anahtarla birlikte tutulur: anahtar değişince state taşınmaz, o anahtarın bilinen ölçüsüne düşer.

#### Ölçüm sözleşmesi (2026-07 regresyonundan sonra)

Tek satıra düşme arızası bu üç kuralın her biri ayrı ayrı ihlal edilerek çıktı; üçü birlikte korunmalıdır:

1. **Metin uygulanmadan ölçüm yapılmaz.** `applySpannableIfChanged()` bir sonraki main-looper turuna ertelendiği için ilk `onLayout` boş TextView’ı görebilir. Boş ölçüm tek satır verir ve sırası gereği doğru yüksekliğin üstüne yazılabilir. `olcVeYukseklikBildir()`, `textView.text.length != arabicText.length` iken hiç ölçmez ve hiç bildirmez.
2. **Erteleme `View.post` ile yapılmaz.** View pencereye bağlı değilse `View.post` runnable’ı view’ın kendi run queue’suna koyar ve o kuyruk yalnız attach’ta boşalır. Sayfa listesi `removeClippedSubviews` kullandığı için sayfalar koparılıp geri eklenir; runnable pratikte hiç çalışmaz, TextView boş kalır ve `spannableApplyPending` sonsuza dek `true` kalarak yeni apply planlanmasını da engeller. Main-looper `Handler` kullanılır.
3. **`setText` sonrası taze ölçüm zorlanır.** `View.measure`, spec’ler aynı ve FORCE_LAYOUT yoksa kendini kısa devre yapıp önceki (metinsiz) sonucu döndürür; bildirim guard’ı da farkı görmez. Apply sonrası `textView.requestLayout()` çağrılır ve guard sıfırlanır. Guard ayrıca view’ın kendi frame’i ölçümden belirgin ayrıştıysa deldirilir — RN native `requestLayout`’u yuttuğu için native’in başka düzeltme yolu yoktur.

#### Değerlendirilip kullanılmayan: `ExpoView.shouldUseAndroidLayout`

`expo-modules-core` bu bayrağı tam olarak “RN, native çocuğun `requestLayout`’unu işlemez” sorunu (facebook/react-native#17968) için sunar ve açıkken `requestLayout` sonrası `post { measureAndLayout() }` çağırır. Bizim senaryomuzu **çözmez**: `measureAndLayout()` view’ı mevcut genişlik/yükseklikle `EXACTLY` ölçüp aynı frame’e yerleştirir, yani içerik yüksekliğine göre büyütmez. İçerik yüksekliğinin Yoga layout’unu sürüklemesi gerektiği için `onMeasured` → `style.height` gidiş-dönüşü doğru desendir. Ek olarak her `requestLayout` başına bir `post` daha getirir. Bilinçli olarak açılmamıştır; yeniden tartışmaya açmadan önce yukarıdaki iki maddeyi doğrulayın.

### RTL, hizalama ve justify

- TextView `LAYOUT_DIRECTION_RTL`, `TEXT_DIRECTION_RTL`, `Gravity.START` kullanır; RTL’de START sağ kenardır (`TajweedTextModule.kt:57-60`).
- `textAlign="justify"` Android API 26+ üzerinde `JUSTIFICATION_MODE_INTER_WORD`; daha eski API’de setter justification uygulamaz ve sağ hizalı gravity kalır (`:94-103`).
- Mushaf native yolu justify gönderir (`mushaf-sayfa.tsx:148`); RN fallback stili `textAlign:"justify"`, `writingDirection:"rtl"`’dir (`:731-736`). Ayet detay `right` kullanır (`ayah detail:1342-1346`).

### Dokunma, seçim ve ayet vurgulama

- Native `GestureDetector`, dokunma koordinatını satıra ve `Layout.getOffsetForHorizontal()` ile UTF-16 karakter indeksine çevirir (`TajweedTextModule.kt:69-79`).
- `TextView.isClickable=true` tüm gesture event zincirini açık tutar; touch listener `false` döndürerek TextView’ın kendi davranışını engellemez (`:81-91`).
- Mushaf `araliklar` listesi ayet metninin başlangıcından ayet rozeti ve trailing boşluğun sonuna kadar UTF-16 `[start,end)` tutar; native indeks bu listeye eşlenir (`mushaf-sayfa.tsx:102-131`, `:161-165`). Rozete dokunmak da aynı ayeti seçer.
- Seçili ayet range’i `BackgroundColorSpan` olur (`mushaf-sayfa.tsx:134-145`; Kotlin `:193-199`). Tekrar aynı ayete dokunmak seçimi kaldırır; sayfa değişimi seçimi temizler; detay açma ayrı alt eylem çubuğundaki ikinci adımdır (`mushaf-sayfa.tsx:385-399`, `:632-654`).
- Mushaf native çağrısı `selectable` prop’ı geçmez; bu ekranda OS metin seçimi değil uygulama düzeyi ayet seçimi vardır. Ayet detay `TajweedText` native ve RN fallback yollarında `selectable` verir (`TajweedText.tsx:41`, `:48`); tecvid kapalı plain `Text` de selectable’dır (`ayah detail:845`).

### Zoom, gece modu ve sayfa hareketi

- Zoom pinch değil A-/A+ kontrollü ortak kalıcı `fontScale` tercihidir: min `0.85`, max `1.6`, adım `0.15`; anahtar `ayahFontScale` (`apps/mobile/src/hooks/useFontScale.ts:6-8`, `:50-62`; storage anahtarı `storage.ts:21`). Mushaf ve detay aynı store’u kullanır.
- Tecvid tercihi ortak `tajweedEnabled` anahtarında, `"0"` kapalı ve diğer/boş değer açık varsayımıyla tutulur (`storage.ts:20`; Mushaf `:323`, `:455-461`; detay `:469-486`).
- Gece modu `useColors()` ile sistem temasını veya persisted `nightMode` override’ını izler; MMKV senkron, fallback AsyncStorage asenkron okunur (`apps/mobile/src/hooks/useColors.ts:58-77`, `:90-106`). İki ekran aynı `isDark` durumuna göre metin, kağıt ve highlight renklerini seçer (`mushaf-sayfa.tsx:196-200`; ayet detay `:418-431`).
- Mushaf yatay `FlatList` `inverted + pagingEnabled` kullanır; Arapça kitap yönünde sağa kaydırma sonraki sayfaya gider (`mushaf-sayfa.tsx:613-627`). Dikey içerik sayfa içi `ScrollView`’dur.

## Font ve vakıf işareti mantığı

### Font dosyaları ve kullanım alanları

| Font | Dosya | Kullanım |
| --- | --- | --- |
| UthmanicHafs | `apps/mobile/assets/fonts/UthmanicHafs.ttf` | Expo/RN Mushaf ayeti, besmele ve ayet detay ana Kur’an metni (`_layout.tsx:201-206`; `mushaf-sayfa.tsx:729-736`; ayet detail `:1342-1346`) |
| UthmanicHafs native kopya | `apps/mobile/modules/tajweed-text/android/src/main/assets/fonts/UthmanicHafs.ttf` | Kotlin `Typeface.createFromAsset("fonts/UthmanicHafs.ttf")` (`TajweedTextModule.kt:61`) |
| Amiri Regular | `apps/mobile/assets/fonts/Amiri-Regular.ttf` | Ayet detay kelime/root Arapçası ve uygulamanın genel Arapça içerikleri; ana Mushaf ayet hattı değil (`_layout.tsx:202`; ayet detail `:1412`, `:1445`) |
| Amiri Bold | `apps/mobile/assets/fonts/Amiri-Bold.ttf` | Sure Arapça başlıkları ve sure listesi (`_layout.tsx:203`; `mushaf-sayfa.tsx:711`, `:727`; ayet detail `:1339`) |

Kodda veya assetlerde `Amiri Quran` adında ayrı bir font yoktur; gerçek kayıt adları `Amiri` ve `Amiri-Bold`’dur. UthmanicHafs’ın Expo ve native kopyaları bu incelemede aynı boyut (242.368 byte) ve aynı SHA-256 (`A0636E68E375AF9552470D67773936F54D536E6586CE2608311B2FE7F9CBEC3A`) olarak doğrulandı. Bu eşitliği koruyan otomatik test yoktur.

Kotlin asset yüklenemezse `Typeface.DEFAULT` kullanır (`TajweedTextModule.kt:60-64`). JS tarafında `Font.useFonts()` tamamlanmadan uygulama `ready` olmaz (`apps/mobile/app/_layout.tsx:201-206`, `:236`). Dolayısıyla native eksik-asset fallback’i crash’i önler ama production font bütünlüğünü garanti etmez.

### Siyah nokta/.notdef ve vakıf overlap önleme

`mushafMetniHazirla()` yalnız görüntüleme sırasında iki uzunluk-koruyan dönüşüm yapar (`apps/mobile/src/lib/mushafSayfa.ts:50-86`):

1. KFGQPC/UthmanicHafs fontunun Tanzil kodlamasındaki üç işarette gösterdiği placeholder/siyah lekeyi engellemek için birebir karakter eşlemesi:
   - U+06DF → U+0652
   - U+06E3 → U+06DC
   - U+06EB → U+06EC
   (`TANZIL_KFGQPC_UYUM`, `UYUM_TABLOSU`: `mushafSayfa.ts:74-80`).
2. U+06D6–U+06DC vakıf işaretinden hemen önceki normal U+0020 boşluğu U+00A0 NBSP yapar (`:50-60`, `:83-86`). Tanzil vakıf işaretini ayrı, boşluk sonrası combining/annotation mark olarak taşıyabildiği için satır tam o boşlukta kırılırsa işaret satır başında tabansız kalıp dotted-circle/.notdef gibi görünebilir. NBSP aynı tek karakterlik aralığı korurken o noktada line break’i engeller.

Bu dönüşümlerin her biri bir BMP karakterini bir BMP karakterine çevirir; hem code-point sayısı hem UTF-16 uzunluğu değişmez. Bu nedenle Mushaf native yolunda span/ayet range’leri önce hesaplanıp dönüşüm sonra uygulanabilir (`mushaf-sayfa.tsx:119-131`); ayet detayda dönüşüm span hesabından önce yapılsa da indeksler aynı kalır (`ayah detail:834-842`). Buraya karakter ekleyen/silen, Unicode normalize eden veya bir eşlemeyi iki karaktere çeviren küçük bir değişiklik bütün tecvid, suffix, touch ve highlight indekslerini kaydırır.

Canonical veri bu display dönüşümünden etkilenmez. Native `onTextVerified` hash’i hazırlanmış display stringini doğrular; canonical Tanzil hash’inin yerine geçmez.

## Mushaf ekranı ile ayet detay ekranı: ortak ve farklı akışlar

| Konu | Mushaf sayfası | Ayet detay |
| --- | --- | --- |
| API | `/mushaf?page=N&v=5`; sayfadaki ayetler + sure metadata + besmele range | `/ayah?surah_id=S&ayah_number=A`; tek ayet + meal/kelime/kök; besmele range yok |
| Canonical hazırlık | `prepareCanonicalVerseForRender()`; önek besmele sure başlığına ayrılır | `arabicText` doğrudan; sure başı önek besmele ayet stringinin içinde kalır |
| Tecvid açık Android | Her kesintisiz metin bloğunda tek native TextView | `TajweedText` üzerinden tek native TextView, yalnız span varsa |
| Tecvid kapalı Android | Aynı native TextView, tecvid range yok | Plain RN `Text`; renderer değişir |
| Hizalama | Justify (API 26+), RTL | Right, RTL |
| Ayet numarası | Her ayetten sonra trailing boşluklu ` ﴿N﴾ `; aynı blok stringinde | Son suffix ` ﴿N﴾`; aynı native stringde veya nested Text’te |
| Seçim/dokunma | UTF-16 touch index → ayet range → background highlight → ayrı “Detaya Git” | OS text selection; ayet-seçim background mekanizması yok |
| Font size/line height | 23/44 × ortak scale | 30/58 × ortak scale |
| Tecvid lejantı | Toggle açıkken her sayfada | Toggle açık ve span varsa |
| Native readback | `__DEV__` log callback’i bağlı | Native event üretilir ama ekran callback bağlamaz |

Ortak parçalar: aynı API span tipi, aynı `mushafMetniHazirla()`, aynı `codePointSpansToUtf16Ranges()`, aynı UthmanicHafs native view, aynı tecvid ve font-scale storage tercihleri, aynı renk lejantı.

## Fallback mekanizmaları, cache anahtarları ve platform ayrımları

### Veri/ağ fallback’leri

- `withCacheFallback()` önce geçerli 7 günlük cache’i, ağ başarılıysa yeni veriyi, ağ hata verirse aynı sürüm anahtarındaki süresi geçmiş veriyi döndürür (`apps/mobile/src/lib/api.ts:312-377`).
- Aynı gerçek cache anahtarındaki eşzamanlı istekler `inflight` map ile tek promise’i paylaşır (`:334-363`).
- Mushaf gerçek key: `v5_cache_mushaf_v5_p{page}`; ayet detay gerçek key: `v5_cache_ayah_{surah}_{ayah}` (`:317-318`, `:422-438`).
- Mushaf server CDN: `s-maxage=86400`, `stale-while-revalidate=2592000` (`apps/web/src/app/api/mushaf/route.ts:137-143`). Ayet detay: 300 saniye + 1 gün SWR (`apps/web/src/app/api/ayah/route.ts:205-211`).
- Eski schema Mushaf verse’ünde `tajweedSpans`/`basmalaRange` yoksa `prepareCanonicalVerseForRender()` `tajweedSpans ?? []` ile ayeti bölmeden ve renksiz render eder (`mushafCanonical.ts:22-38`). Ayet detay fetch sonucu da `tajweedSpans ?? []` ile normalize edilir (`ayah detail:564-571`). `schemaVersion` runtime’da doğrulanmaz; yanlış/eksik diğer alanlar için genel schema validator yoktur.
- Sure başlığı metadata’sı bulunamazsa `bloklariKur()` boş Arapça ad ve `Sure {id}` fallback’i kullanır (`mushaf-sayfa.tsx:45-53`).
- Native font asset yoksa sistem fontu; native view hiç yoksa word-level RN fallback vardır.
- Preference storage’da MMKV yüklenemezse AsyncStorage kullanılır; migration ve legacy read fallback’i vardır (`apps/mobile/src/lib/storage.ts:24-36`, `:38-70`, `:139-147`).

### Platform ayrımları

- Native TajweedText yalnız Android’dir (`expo-module.config.json:2`). iOS word-level RN fallback kullanır.
- Eski Android build/dev client native modülü içermiyorsa `requireNativeViewManager` guard’ı crash’i engeller (`modules/tajweed-text/index.tsx:28-40`).
- Android API 26 altında justify yoktur; right fallback kalır (`TajweedTextModule.kt:94-103`).
- Native renk hassasiyeti span/cluster; fallback renk hassasiyeti kelimedir.
- Ayet detay tecvid kapalı durumda Android’de dahi native değil RN Text kullanır.

## Kritik invariants: kesinlikle bozulmaması gereken kurallar

1. **Canonical metin tek otoritedir.** Render metni Tanzil `arabic_text` olmalı; tecvid markup metni hiçbir zaman ekranda gösterilmemeli veya canonical stringe kopyalanmamalıdır.
2. **Canonical byte/code-point dizisi normalize edilmemelidir.** Trim, NFC/NFD, combining mark reorder, replacement veya ortak besmele injection yasaktır. Kaynak SHA ve 6.236 sıra kontrolü korunmalıdır.
3. **Kalıcı span koordinatı daima `[startCp,endCp)` Unicode code point olmalıdır.** Native köprüye geçerken tek yerde UTF-16’ya çevrilmeli; code-point ve UTF-16 offsetleri karıştırılmamalıdır.
4. **Display dönüşümleri 1:1 uzunluk korumalıdır.** `mushafMetniHazirla()` karakter ekleyemez/silemez; aksi halde tecvid, ayet rozeti, touch ve highlight aynı anda kayar.
5. **Tek metin bloğu tek TextView/tek Spannable kalmalıdır.** Harf/cluster başına nested TextView, ayrı native child veya metric-affecting span eklenmemelidir.
6. **Renk span’i grapheme cluster’ı bölmemelidir.** Base harf ile hareke/şedde/dagger alif ayrılmamalıdır. Belirsiz cluster renksiz kalmalıdır.
7. **Tecvid toggle metni değiştiremez.** Mushaf Android’de açık/kapalı aynı stringi ve renderer’ı kullanmalı; yalnız tecvid foreground range listesi değişmelidir.
8. **Ayet rozeti offset hesabına dahil edilmelidir.** Önceki ayetin ` ﴿N﴾ ` suffix’i sonraki ayetin UTF-16 base offsetini etkiler; rozete ait accent span ve ayet touch range’i birlikte güncellenmelidir.
9. **Besmele yalnız generated offsetle ayrılmalıdır.** Sure 2–114/9 hariç prefix, 1:1 ayetin kendisi, 9:1 prefixesiz davranışı korunmalıdır. Önek-besmeleye kaynaksız tecvid rengi tahmin edilmemelidir.
10. **Vakıf/NBSP ve üç KFGQPC karakter eşlemesi korunmalıdır.** Özellikle U+06DF/U+06E3/U+06EB mapping’i veya U+06D6–U+06DC öncesi NBSP kaldırılırsa siyah placeholder/dotted-circle ve satır başı overlap regresyonu dönebilir.
11. **Native ve fallback renk tabloları eş kalmalıdır.** Native `span.color`, fallback `span.rule → RENK` kullanır. Builder `TAJWEED_RULE_COLORS` ile mobil `RENK` ayrışmamalıdır.
12. **Schema/cache bump atomik olmalıdır.** Backend `schemaVersion`, mobil tip/fallback, global `CACHE_VERSION`, Mushaf raw cache key ve URL `v=` birlikte ilerlemelidir; aksi halde eski CDN/MMKV cevabı yeni renderer’a girebilir.
13. **Invalid range’i sessizce atma güvenlik ağıdır, doğrulama değildir.** JS ve Kotlin clamp/drop davranışına güvenip builder/API doğrulamalarını gevşetmemek gerekir.
14. **İki UthmanicHafs kopyası byte-identical kalmalıdır.** RN fallback ile native renderer farklı font dosyası kullanırsa toggle/platform geçişinde shaping ve metrikler değişebilir.

### Küçük değişiklikle yeniden çıkabilecek hassas arızalar

- `Array.from()` yerine doğrudan string index kullanmak: supplementary karakterlerde code-point → UTF-16 dönüşümü bozulur.
- Ayet rozetinin boşluklarını değiştirmek fakat `araliklar`/accent range hesabını değiştirmemek: touch yanlış ayete düşer veya highlight komşu ayete taşar.
- `mushafMetniHazirla()` dönüşümünü yalnız açık/kapalı dallardan birine uygulamak: toggle sonrası metin/hash/shaping değişir.
- Native’e `TypefaceSpan`, `RelativeSizeSpan`, `StyleSpan` gibi metric span eklemek: Arabic shaping run’ları ve ölçülen yükseklik değişebilir.
- Fallback’i harf-level nested `Text` yapmak: kelime içi Arabic joining tekrar kırılabilir.
- `span.color` paletini backendde değiştirip mobil `RENK`i değiştirmemek: Android native ve iOS/eski build farklı görünür.
- Besmele splitinde JS `.length` kullanmak: generated code-point offsetleri UTF-16 sanılır ve ileride supplementary karakterde yanlış kesilir.
- Vakıf öncesi NBSP’yi normal boşluğa çevirmek: satır başında tabansız vakıf işareti/dotted circle geri döner.
- Native height cache key veya remount davranışını kaldırmak: font zoom/sayfa değişiminde kırpılma ya da zıplama oluşabilir.
- Ölçüm sözleşmesinin üç maddesinden birini geri almak (boş TextView’ı ölçmek, ertelemeyi `View.post`’a çevirmek, `setText` sonrası taze ölçümü/guard sıfırlamasını kaldırmak): sayfa tek satıra düşer ve o hâlde kilitlenir. Ayrıntı: “Ölçüm sözleşmesi”.
- JS’teki ölçülen yüksekliği anahtardan bağımsız state’te tutmak: native view remount olsa bile önceki bloğun yüksekliği yeni metne uygulanır.
- API schema değiştirilip cache anahtarları bump edilmezse eski alanları eksik cevaplar renderer’ı çökertir veya renksiz bırakır.

## Mevcut test kapsamı

Bu incelemede tanımlı scriptler değişiklik yapılmadan birer kez çalıştırıldı:

- `npm run test:mobile`: **130/130 geçti**. Script tanımı `package.json:18`.
- `npm run test:quran`: **9/9 geçti**. Script tanımı `package.json:22`.

İlk sandbox çalıştırması Node test worker spawn’ında `EPERM` verdi; aynı iki script izinli ortamda başarılı çalıştı. Bu altyapı hatası test başarısızlığı olarak değerlendirilmedi.

### `scripts/quran-runtime.test.mjs`

Dokuz test şunları korur (`:46-233`):

- immutable vendor SHA, sürüm/lisans koşulu;
- generated 6.236 ayetin kaynak byte ve code pointlerini yeniden kurması;
- yerel DB’deki 6.236 `arabic_text` satırının kaynakla birebirliği;
- 113 besmele metadata kaydı ve her split’in ayeti yeniden kurması;
- combining sequence ve Quran mark inventory’sinin değişmemesi;
- bütün generated tecvid span’lerinin bounds içinde, sıralı/non-overlap olması ve metni mutate etmemesi;
- hizalama başarısızlıklarının explicit uncolored range olması, hiçbir color span’in bunlarla overlap etmemesi, iki gerçek token-count mismatch ayetin `2:181` ve `13:37` olması, 112 önek-besmelenin renksiz kalması;
- builder’ın production write path ve kaynak dosyaya yazma yolu içermemesi;
- fresh runtime build’in deterministic olması.

Coverage testindeki beklenen güncel durumlar generated JSON ile senkron olarak `mapped:6160`, `token-count-mismatch:2`, `no-rule-clusters:63`, `unmapped-rule-clusters:11`’dir (`quran-runtime.test.mjs:142-218`; `tajweed-coverage.json:17-25`).

### `apps/mobile/src/lib/mushafCanonical.test.ts`

Altı test (`:24-82`):

- generated besmele offsetinin exact split/reconstruction’ı;
- toggle’ın metni/SHA’yı değiştirmeyip yalnız range’i değiştirmesi;
- eski schema verse’ünde eksik `tajweedSpans/basmalaRange` alanlarının renksiz ve crashsiz fallback’i;
- code-point span → UTF-16 dönüşümünde surrogate pair örneği;
- fallback kelime gruplarının exact canonical stringi yeniden birleştirmesi;
- Kotlin kaynakta TextView readback, equality ve SHA kodunun bulunduğuna dair statik kaynak kontrolü.

Son test native kodu cihazda çalıştırmaz; Kotlin dosyasındaki belirli stringleri regex ile doğrular.

### `apps/mobile/src/lib/tajweed.test.ts`

28 test (`:12-235`) eski ham markup parser/segment modelini korur:

- nested/kodsuz/bozuk bracket parser davranışı;
- bütün rule kodlarının renk haritasında bulunması ve 4 grup lejant;
- combining mark’ın segment başında kalmaması;
- 95:4, dagger alif ve U+0672/U+066E regresyonları;
- `segmentsToRanges()` metin ve baseOffset bütünlüğü;
- word fallback’in yalnız whitespace’te bölünmesi ve exact join’i.

Bu testler değerli geçmiş regresyon korumasıdır, ancak aktif API canonical span yolunda `parseTajweed()` çağrılmadığı için production renderer’ın tamamını kapsamaz.

### `apps/mobile/src/lib/hatim.test.ts`

- 30 cüzün ardışık/boşluksuz sınırlarını ve `JUZ_DATA` başlangıçlarının `mushaf_sayfalari.json` ile eşitliğini korur (`:44-71`).
- 604 sayfanın tüm başlangıçlarını veya `sayfaAraligi()` API davranışını test etmez.

### Ayrı audit scriptleri

- `scripts/verify-text-integrity.mjs` generated `verses.json` ile vendor Tanzil metnini ayet/code-point bazında karşılaştırır ve `scripts/output/text-integrity-report.json` yazar (`:51-205`).
- `scripts/verify-span-boundaries.mjs` span sınırlarını Arabic grapheme sınırlarıyla karşılaştırır ve `scripts/output/span-boundary-report.json` yazar (`:24-147`).
- Bunlar root `package.json` test scriptlerine bağlı değildir. Kullanıcının bu aşamada yalnız mimari doküman yazma sınırı nedeniyle bu audit sırasında çalıştırılmadılar; mevcut `scripts/output/` kullanıcıya ait untracked içerik olarak korundu.

## Eksik veya zayıf testler

1. `mushafMetniHazirla()` için U+06DF/U+06E3/U+06EB mapping, vakıf öncesi NBSP ve hem code-point hem UTF-16 uzunluk değişmezliği testi yok.
2. Android instrumentation/Robolectric testi yok: gerçek `SpannableStringBuilder`, span sınıfları, font asset, Arabic shaping, line-height, justify API ayrımı, touch offset ve selection çalıştırılmıyor.
3. `native TextView reports SHA...` testi runtime değil Kotlin kaynak regex testidir.
4. Ayet rozeti ekleme, sonraki ayet base offseti, rozet üzerine touch, seçili range’in doğru ayeti kapsaması ve trailing-space sınırları test edilmemiştir.
5. Bir sayfada birden çok sure/metin bloğu oluşması ve besmele/header sıralaması için component testi yok.
6. Mushaf API route’u için 1, ara ve 604. sayfa boundary; SQL sırası; schemaVersion; boş span fallback ve metadata testleri yok.
7. Ayet detay API’si ve ekranında eski schema `tajweedSpans` fallback’i için doğrudan ekran/component testi yok; yalnız setter kodu ve Mushaf helper testi vardır.
8. `mushaf_sayfalari.json` için 604 başlangıç, monotonluk, her ayetin tam bir sayfaya düşmesi ve mobil/web kopya eşitliği otomatik testte yok. Hatim testi yalnız cüz başlangıçlarını kapsar.
9. UthmanicHafs Expo/native kopyalarının byte-identical oluşu ve gerekli cmap glyph’leri test edilmiyor.
10. Native `span.color` ile fallback `RENK[rule]` eşitliğini builder renk tablosuna karşı çapraz doğrulayan test yok.
11. iOS/eski Android build word-level fallback’inin gerçek RN render/shaping testi yok.
12. Height cache’in width içermemesi, rotation sonrası düzeltme ve 40-entry eviction davranışı test edilmemiştir.
13. `schemaVersion` runtime validator’ı olmadığı için yanlış sürüm/alan tiplerine dair contract test yok.
14. Parser/hizalayıcı için formal sürüm alanı ve generated manifestte builder/parser fingerprint’i yok; aynı kaynak SHA ile farklı hizalama kodu farklı span üretebilir.
15. `verify-text-integrity` ve `verify-span-boundaries` standart `test:quran` kapısına bağlı değildir; yanlışlıkla çalıştırılmadan yayın yapılabilir.

## Güvenli geliştirme sırası

1. **Baseline’i kilitle:** vendor SHA, 6.236 ayet, generated manifest, mevcut coverage ve iki font kopyasının hash’ini kaydet; çalışma ağacındaki ilgili kullanıcı değişikliklerini ayrı değerlendir.
2. **Önce saf veri üreticisi:** tecvid hizalama/parser değişecekse yalnız `scripts/build-quran-runtime.mjs` ve hedefli unit testlerle başla. Dini kural tahmini yapma; belirsiz alanı renksiz bırak.
3. **Artifact doğrulaması:** `npm run test:quran` çalıştır; coverage değişimini, uncolored overlap’i ve grapheme boundary auditini incele. Generated sayıların neden değiştiğini ayet örnekleriyle açıklamadan ilerleme.
4. **API contract:** DB migration, `/mushaf` ve `/ayah` response alanlarını birlikte güncelle. `schemaVersion` artır; cache/CDN uyumluluğunu tasarla.
5. **Mobil cache/fallback atomik güncelleme:** `CACHE_VERSION`, Mushaf raw key, URL `v=`, TypeScript tipleri ve old-schema fallback’i aynı değişiklikte ilerlet.
6. **Saf TS indeks katmanı:** `prepareCanonicalVerseForRender`, `mushafMetniHazirla`, code-point→UTF-16, ayet rozeti/base offset ve fallback word grouping testlerini genişlet.
7. **Native renderer:** ancak veri ve JS indeks testleri yeşilken Kotlin değiştir. Tek TextView/tek spannable/no metric span kuralını koru; instrumentation testi ekle.
8. **Ekran entegrasyonu:** önce ayet detay tek ayet, sonra Mushaf çok ayet/blok; açık/kapalı, span yok, old build ve iOS fallback yollarını ayrı doğrula.
9. **Cihaz matrisi:** en az Android API <26 ve ≥26, küçük/düşük donanım cihazı, yüksek sistem font scale, gece modu, rotation, yoğun tecvid ve çok sureli sayfa üzerinde görsel/touch testi yap.
10. **Yayın öncesi:** canlı API’nin schema/cache cevabını read-only smoke ile doğrula; sonra mevcut güvenli production migration/AAB prosedürlerini ayrı açık yetkiyle uygula.

## Emin olunamayan veya bu incelemede doğrulanmayan noktalar

- Canlı Vercel API’nin ve production Turso’nun şu anda schemaVersion 4 verisini gerçekten servis edip etmediği bu incelemede sorgulanmadı. Kod hem Turso hem local DB çalıştırabilir (`dbUtils.ts`); aktif deployment durumu repodan kesinleştirilemez.
- Android emulator/fiziksel cihaz çalıştırılmadı. Native shaping, vakıf görünümü, touch offset ve justify yalnız kod + mevcut test kanıtlarıyla değerlendirildi. `docs/mushaf-tecvid-handoff.md` önceki cihaz kontrolleri bildirse de bu auditte bağımsız tekrar edilmedi ve dokümandaki bazı coverage sayıları güncel generated artifactlerle uyuşmuyor.
- `mushaf_sayfalari.json` kaynak alanı Tanzil `quran-data.xml` der; repoda XML veya yeniden üretim scripti bulunmadığı için 604-entry JSON’un kaynaktan nasıl üretildiği yeniden yürütülerek doğrulanamadı.
- Fonttaki eksik glyph/placeholder teşhisi `mushafSayfa.ts` kod yorumlarında ve uygulanan mapping’de kayıtlıdır; font cmap/HarfBuzz analizi bu incelemede yeniden çalıştırılmadı. İki UthmanicHafs dosyasının byte eşitliği ise doğrulandı.
- Ham AlQuran.cloud verisinin güncel uzaktaki içeriği yeniden indirilmedi. Rapor mevcut `data/app.db`, generated artifactler ve builder kodunu esas alır.
- Parser/hizalayıcı için formal bir sürüm olmadığı için “parser sürümü” olarak verilebilecek tek doğrulanmış kimlik mevcut dosya/fonksiyon revizyonudur.

## İncelenen dosyaların listesi

### Canonical veri ve üretim

- `data/vendor/tanzil/uthmani-1.1/quran-uthmani.txt`
- `data/vendor/tanzil/uthmani-1.1/manifest.json`
- `data/generated/quran/verses.json`
- `data/generated/quran/basmala-ranges.json`
- `data/generated/quran/tajweed-spans.json`
- `data/generated/quran/tajweed-coverage.json`
- `data/generated/quran/build-manifest.json`
- `scripts/_build-tajweed.mjs`
- `scripts/build-quran-runtime.mjs`
- `scripts/migrate-quran-runtime-turso.mjs`
- `scripts/quran-runtime.test.mjs`
- `scripts/verify-text-integrity.mjs`
- `scripts/verify-span-boundaries.mjs`

### Web API ve sayfa metadata

- `apps/web/src/app/api/mushaf/route.ts`
- `apps/web/src/app/api/ayah/route.ts`
- `apps/web/src/lib/dbUtils.ts`
- `apps/web/src/lib/mushaf_sayfalari.json`
- `apps/web/src/lib/mushafSayfaUtils.ts`
- `apps/web/src/lib/tajweed.ts`
- `apps/web/next.config.mjs`

### Mobil veri, hazırlık ve render

- `apps/mobile/src/lib/runtimeConfig.ts`
- `apps/mobile/src/lib/api.ts`
- `apps/mobile/src/data/mushaf_sayfalari.json`
- `apps/mobile/src/lib/mushafSayfa.ts`
- `apps/mobile/src/lib/mushafCanonical.ts`
- `apps/mobile/src/lib/tajweed.ts`
- `apps/mobile/src/components/TajweedText.tsx`
- `apps/mobile/app/mushaf-sayfa.tsx`
- `apps/mobile/app/ayah/[surahId]/[ayahNumber].tsx`
- `apps/mobile/src/hooks/useFontScale.ts`
- `apps/mobile/src/hooks/useColors.ts`
- `apps/mobile/src/lib/storage.ts`
- `apps/mobile/app/_layout.tsx`

### Android native modül ve fontlar

- `apps/mobile/modules/tajweed-text/index.tsx`
- `apps/mobile/modules/tajweed-text/expo-module.config.json`
- `apps/mobile/modules/tajweed-text/android/build.gradle`
- `apps/mobile/modules/tajweed-text/android/src/main/java/expo/modules/tajweedtext/TajweedTextModule.kt`
- `apps/mobile/assets/fonts/UthmanicHafs.ttf`
- `apps/mobile/modules/tajweed-text/android/src/main/assets/fonts/UthmanicHafs.ttf`
- `apps/mobile/assets/fonts/Amiri-Regular.ttf`
- `apps/mobile/assets/fonts/Amiri-Bold.ttf`
- `apps/mobile/android/settings.gradle`

### Test ve bağlam

- `apps/mobile/src/lib/mushafCanonical.test.ts`
- `apps/mobile/src/lib/tajweed.test.ts`
- `apps/mobile/src/lib/hatim.test.ts`
- `package.json`
- `apps/mobile/package.json`
- `docs/mushaf-tecvid-handoff.md` (yalnız bağlam/çapraz kontrol; güncel teknik otorite olarak kullanılmadı)

