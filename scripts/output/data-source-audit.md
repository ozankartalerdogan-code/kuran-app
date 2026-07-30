# Veri Kaynağı Bütünlüğü ve Lisans Denetimi

Denetim tarihi: 2026-07-18. Kapsam: Kur'an metni (Tanzil), morfoloji (Quranic Arabic Corpus türevi), `data/quran/external/Kuran/` vendor dökümü ve tecvid (tajweed) kaynak verisi. Yöntem: salt-okunur — `Read`, `Grep`, `Glob` ve salt-okunur `git`/`node` komutları. Hiçbir kaynak dosyası değiştirilmedi.

---

## 1. Tanzil Uthmani Metni

**KONUM**
`data/vendor/tanzil/uthmani-1.1/quran-uthmani.txt` (6266 satır, 6236 ayet + telif bloğu) ve yanındaki `data/vendor/tanzil/uthmani-1.1/manifest.json`. Bu, projede kanonik Kur'an Arapça metninin **tek** salt-okunur vendor kopyasıdır; `.gitignore` bunu açıkça beyaz listeye alır (satır 33–37: `!/data/vendor/`, `!/data/vendor/tanzil/`, ... `manifest.json`), yani `/data/*` genel ignore kuralının istisnasıdır — bilinçli olarak versiyonlanmış.

**BÜTÜNLÜK**
`git log --follow --oneline -- data/vendor/tanzil/uthmani-1.1/quran-uthmani.txt` → tek sonuç: `477d47d feat(quran): preserve canonical Tanzil text and separate tajweed spans`. Dosya eklendiğinden beri **hiç değiştirilmemiş**. `certutil -hashfile ... SHA256` ile hesaplanan gerçek hash (`7f30c647331a61100ebf24a80507dc0fcdd9f2df97f1312b5b2dfcb982a7f326`) `manifest.json`'daki `sha256` alanıyla **birebir eşleşiyor**. Ayrıca `scripts/build-quran-runtime.mjs:126-128` bu hash'i `EXPECTED_SOURCE_SHA256` sabitine karşı her çalıştırmada doğruluyor ve uyuşmazsa `throw` ediyor — yani entegrasyon zaten kendi kendini denetliyor. Tek kozmetik kusur: `manifest.json` içindeki `"title"` alanında bir en-dash yerine literal ASCII `?` (0x3f) karakteri var (satır 3); bu, metadata'da bir kopyala-yapıştır/encoding kaybı, **metnin kendisini etkilemiyor** (sha256 doğrulaması içeriğin bozulmadığını kanıtlıyor).

**TÜRETME YÖNTEMİ**
`scripts/build-quran-runtime.mjs`, `SOURCE_PATH`'i sadece `fs.readFileSync` ile okuyor (`readCanonicalSource()`, satır 122-165). Repo genelinde `grep -n "writeFile"` taraması, `SOURCE_PATH`/`SOURCE_DIR`'a yazan **hiçbir** çağrı bulmadı. Üretilen çıktılar `writeJson()` (satır 590-593) aracılığıyla yalnızca `data/generated/quran/*.json`'a yazılıyor. Ayrıca `scripts/quran-runtime.test.mjs:226-232` bunu bir regresyon testiyle garantiliyor: `assert.doesNotMatch(script, /writeFileSync\(SOURCE_PATH|copyFileSync\([^\n]*SOURCE_PATH/)`. `main()` içinde de `--production`/`--turso` bayrakları açıkça `throw` ile engelleniyor (satır 706-708) — script kasıtlı olarak yalnızca yerel/salt-okunur.

**LİSANS**
`manifest.json`: `"license": "CC BY 3.0"`, `terms`: "Tanzil.net must be clearly attributed... text must be distributed verbatim and unmodified." Dosyanın kendi telif bloğu (satır sonu) bunu teyit ediyor: "Copyright (C) 2007-2026 Tanzil Project... CHANGING IT IS NOT ALLOWED." Atıf: `THIRD_PARTY_LICENSES.md` satır 5-9'da mevcut. Uygulama içi atıf: `apps/web/src/app/hakkinda/page.tsx:61-77` ve `apps/mobile/app/hakkinda.tsx:56-131` — her ikisi de "Tanzil Quran Text — Uthmani 1.1, CC BY 3.0" ve `https://tanzil.net/` linkiyle görünür şekilde atıf yapıyor.

**RİSK: temiz** — SHA-256 ile doğrulanmış, değiştirilmemiş, tek yazma yolu yok, otomatik regresyon testi var, uygulama içi atıf mevcut. Tek not: manifest'teki kozmetik `?` karakteri (önemsiz).

---

## 2. Quranic Arabic Corpus (Morfoloji) Verisi

**KONUM**
Aynı dosyanın üç kopyası bulundu:
- `data2/quran-morphology/quran-morphology.txt` (+ `README.md`, `morphology-terms-ar.json`, `scripts/apply-changes.py`, `scripts/bw-to-ar.py`)
- `data/word-analysis/quran-morphology.txt`
- `data/quran/external/Kuran/Kuran-Rehberi-main/data/morphology/quran-morphology.txt`

`diff` ile karşılaştırıldığında üçü **byte-özdeş**. `git ls-files` bu üç yola hiçbir sonuç döndürmedi — **hiçbiri git'e commit edilmemiş**. `.gitignore` satır 27-28 (`/data/*`, `/data2/`) bunları kapsıyor ve bu üç yol için istisna tanımlı değil (`git check-ignore -v` üçünü de `.gitignore:27` veya `:28` kuralına bağladı).

**BÜTÜNLÜK**
Git geçmişi olmadığı için `git log --follow` uygulanamaz (dosyalar hiçbir zaman commit edilmemiş, yalnızca yerel diskte duruyor). `data2/quran-morphology/README.md` (satır 3-16) kendi kaynağını açıklıyor: bu, **orijinal** Quranic Arabic Corpus v0.4 verisi değil — `github.com/mustafa0x/quran-morphology` reposunun bir **fork'u**; kaynak Buckwalter çevirisi Arapçaya çevrilmiş, kökler/lemma'lar düzeltilmiş, etiketler yeniden düzenlenmiş (README'nin "Changes" bölümü ~15 madde halinde bunu listeliyor). Yani depoda duran veri, corpus.quran.com'un ham v0.4 çıktısı değil, üçüncü bir tarafın (mustafa0x) editoryal müdahale ettiği bir türev.

**TÜRETME YÖNTEMİ**
Bu üç kopyanın birbirinden nasıl üretildiği/senkronize edildiğine dair bir script bulunamadı (muhtemelen elle kopyalanmış). `packages/core/src/pipeline/buildFinalReadinessReport.ts:233-254` ve `buildNormalizedCaches.ts` bu dosyaları/word-analysis raporlarını sadece `readFile` ile okuyor; `writeFile` çağrıları yalnızca `data/normalized/`, `data/word-analysis/reports/` gibi ayrı çıktı yollarına gidiyor — kaynak dosyanın üzerine yazılmıyor.

**LİSANS**
`THIRD_PARTY_LICENSES.md` satır 18-26: "Quranic Arabic Corpus / Author: Kais Dukes / License: GNU General Public License / Quranic Arabic Corpus Terms of Use" — bu, **orijinal** projeye atıfta bulunuyor, ancak gerçekte kullanılan veri mustafa0x fork'u. Fork'un kendi dizininde (`data2/quran-morphology/`) **LICENSE dosyası yok**. Uygulama içi atıf (`apps/web/.../hakkinda/page.tsx:65-67,86-88`, `apps/mobile/app/hakkinda.tsx:134-146`) da yalnızca `corpus.quran.com`'a link veriyor, ara fork'tan (mustafa0x) hiç bahsetmiyor.

**RİSK: dikkat** — (a) üç kopya git'te hiç izlenmiyor → temiz bir klondan bu veri **kaybolur**, reprodüksiyon garantisi yok; (b) gerçek kaynak orijinal Corpus değil, isimsiz bir üçüncü-taraf fork (mustafa0x/quran-morphology) ve bu fork'un kendi lisans dosyası yok; (c) uygulama içi atıf orijinal Corpus'a işaret ediyor ama ara türevden bahsetmiyor — hukuki olarak yanlış değil (nihai kaynak Corpus'tur, GPL/Corpus Terms atıf gereksinimini karşılıyor) ama şeffaflık eksik.

---

## 3. `data/quran/external/Kuran/` Vendor Dökümü

**KONUM**
Dört ayrı üçüncü-taraf GitHub projesinin tam kopyası: `Kuran-Rehberi-main/` (backend+frontend dahil tam uygulama), `acikkuran-api-main/`, `json-main/`, `quran-meta-master/`. Aranan `ar.uthmani.json` tam olarak `data/quran/external/Kuran/Kuran-Rehberi-main/data/translations/ar.uthmani.json` yolunda bulundu — Tanzil metninin **ikinci, bağımsız bir kopyası** (Kuran-Rehberi-main projesinin kendi veri klasöründe). `git ls-files data/quran/external` boş sonuç döndürdü — bu klasör **tamamen git-ignore'lu** (`.gitignore:27 /data/*`, istisna tanımlı değil).

**BÜTÜNLÜK**
Git geçmişi yok (asla commit edilmemiş). İç tutarlılık: `Kuran-Rehberi-main/README.md` satır 27-34 kendi veri kaynaklarını (Tanzil CC-BY 3.0, Quranic Arabic Corpus GPL, fawazahmed0/quran-api, apacikkuran.com) ve satır 200-202'de kendi lisansını (MIT) açıkça belgeliyor.

**TÜRETME YÖNTEMİ**
`grep -rn "external.Kuran"` iki kullanım noktası buldu: `packages/core/src/pipeline/buildFinalReadinessReport.ts` ve `buildNormalizedCaches.ts`. İnceleme (`buildNormalizedCaches.ts:56-72`) şunu gösteriyor: pipeline, `Kuran-Rehberi-main/data/translations/*.json`'ı (Türkçe meal metinleri) ve `Kuran-Rehberi-main/data/surahs.json`'ı (sure meta) okuyor — ama **Arapça metin için** `ar.uthmani.json`'ı değil, `generatedArabicPath = ["generated", "quran", "verses.json"]` (yani Tanzil'den üretilen kanonik dosya) kullanıyor. Yani `ar.uthmani.json` kodda **hiç referans edilmiyor** — depoda duran ama pipeline'a hiç girmeyen ölü/kullanılmayan bir kopya. Tüm okuma çağrıları `readFile`; bu iki pipeline dosyasında `external/Kuran` altına yazan hiçbir `writeFile` çağrısı yok.

**LİSANS**
Dört alt-proje için lisans durumu farklı:
- `Kuran-Rehberi-main`: MIT (README, satır 200-202).
- `json-main/LICENSE`: MIT (Semar Ketir, 2015).
- `quran-meta-master/LICENSE`: MIT (Quran-Center, 2020).
- `acikkuran-api-main/LICENCE`: **Creative Commons Attribution-NonCommercial-ShareAlike 4.0** — ticari kullanım açıkça yasak. `grep -rn "acikkuran"` proje genelinde (`.ts/.tsx/.js/.mjs/.py`) **sıfır** kod referansı buldu; yani bu veri şu an hiçbir pipeline'a bağlı değil, sadece diskte duruyor.

Bu dört kaynaktan hiçbiri `THIRD_PARTY_LICENSES.md`'de veya uygulama içi "Kaynaklar" ekranlarında ayrıca listelenmiyor (sadece nihai/kanonik Tanzil ve Corpus atıfları var, ki bunlar zaten doğru çünkü gerçek üretim verisi bu ara kopyalardan gelmiyor).

**RİSK: dikkat** (`ar.uthmani.json` ve genel vendor dökümü için) / **RİSK: sorunlu** (`acikkuran-api-main` özelinde, kod tarafından kullanılmasa da). Gerekçe: (1) `ar.uthmani.json` kullanılmıyor olsa da Tanzil metninin kontrolsüz, doğrulanmamış bir ikinci kopyasını depoda tutmak — biri yanlışlıkla ona referans verirse SHA-256 doğrulaması olmayan bir kaynağa geçilebilir; (2) tüm dizin git-ignore'lu, yani `buildNormalizedCaches`/`buildFinalReadinessReport` pipeline'ları taze bir klonda **çalışmaz** (kaynak dosyalar mevcut değil) — reprodüksiyon kırık; (3) `acikkuran-api-main`'in NC (ticari-olmayan) lisansı, eğer ileride biri bu veriyi fark etmeden pipeline'a bağlarsa Kuran Yolu'nun (muhtemelen ticari/gelir amaçlı) kullanım koşullarıyla doğrudan çelişir — şu an kullanılmadığı için aktif ihlal yok, ama "sessiz mayın" riski var.

---

## 4. Tecvid (Tajweed) Kaynak Verisi

**KONUM**
Bu kaynak, diğerlerinden farklı olarak **repoda dosya olarak hiç durmuyor**. `scripts/_build-tajweed.mjs` (satır 17, 82-93), çalışma anında `https://api.alquran.cloud/v1/quran/quran-tajweed` adresinden canlı fetch yapıyor ve sonucu doğrudan `verses.arabic_tajweed` sütununa (`--local` bayrağıyla `data/app.db`, aksi halde Turso uzak DB) yazıyor. Yani "vendor kaynağı" = uzak API + yerel SQLite DB'deki bir sütun; commit edilen bir ham dosya yok.

**BÜTÜNLÜK**
Doğrulanamıyor (ağ erişimi yok, iddia edilen kaynak bir API, statik dosya değil). İç tutarlılık kontrolü: `scripts/_build-tajweed.mjs:105` betiğin kendisi ayet sayısını (`6236` bekleniyor) ve ayraç (`[code[...]`) dengesini kontrol ediyor (`dry-run` modu, DB'ye dokunmadan). `build-quran-runtime.mjs:428-440` (`readTajweedMarkup`) bu sütunu okurken sadece `arabic_tajweed IS NOT NULL AND <> ''` satırlarını alıyor, şema/varlık kontrolü yapıyor ama içerik doğrulaması (checksum vb.) **yok** — güvence tamamen `_build-tajweed.mjs`'nin fetch anındaki tek seferlik çalıştırmasına bağlı.

**TÜRETME YÖNTEMİ**
`scripts/build-quran-runtime.mjs` bu markup'ı okuyup (`alignVerseTajweed`/`alignTajweedSpans`, satır 356-509) Tanzil kanonik metniyle **token/grapheme bazında hizalıyor**; eşleşmeyen veya belirsiz kümeler renksiz (`uncoloredRanges`) bırakılıyor — kaynağın kendisi asla değiştirilmiyor, sadece kural atanıyor. Çıktı yalnızca `data/generated/quran/tajweed-spans.json` ve `tajweed-coverage.json`'a yazılıyor (`writeGeneratedRuntime`, satır 595-629). `scripts/audit-tajweed-source-diff.mjs` ve `scripts/analyze-tajweed-actionable-review.mjs` da salt-okunur karşılaştırma araçları; ikisi de sadece `scripts/output/*.json|*.md`'ye yazıyor (kod satırları: `audit-tajweed-source-diff.mjs:419-421`, `analyze-tajweed-actionable-review.mjs:491-493`). `data/tajweed-span-overrides.json` (versiyon 1, `unicode-code-point-half-open` koordinat sistemi) her override için `reason`/`similarExample` alanları zorunlu tutan, elle doğrulanmış bir ek katman; `git log` bu dosya için boş döndü çünkü şu an **git'e henüz commit edilmemiş** (bu dal üzerindeki `?? data/tajweed-span-overrides.json` durumu ile tutarlı — yeni/untracked). Üretilen `tajweed-spans.json`/`tajweed-coverage.json`/`verses.json`/`basmala-ranges.json` için `git log` her biri için 1-2 "regenerate/fix" commit'i gösteriyor (`6697ee1`, `01c869a`) — düzenli, tek-seferlik yeniden üretim, kademeli/sızıntılı bir bozulma değil.

**LİSANS**
`data/generated/quran/tajweed-spans.json` içinde `"source": "AlQuran.cloud quran-tajweed (rules only; source text is never rendered or copied into canonical text)"` notu var (kod: `build-quran-runtime.mjs:604`), ama bu sadece iç dokümantasyon. **Ne `THIRD_PARTY_LICENSES.md`'de ne de uygulama içi "Kaynaklar" ekranlarında (`apps/web/.../hakkinda`, `apps/mobile/app/hakkinda.tsx`) AlQuran.cloud'a herhangi bir atıf veya lisans notu yok** — sadece Tanzil ve Quranic Arabic Corpus listeleniyor. AlQuran.cloud'un kendi kullanım koşulları bu depoda hiçbir yerde belgelenmemiş.

**RİSK: dikkat** — türetme mimarisi son derece titiz (hizalama, çakışma kontrolü, override doğrulaması, regresyon testleri) ve kaynak metne asla dokunulmuyor; ancak (1) AlQuran.cloud kaynağı için repo içinde hiçbir lisans/terms kaydı ve uygulama içi atıf yok — bu, diğer iki kaynağa (Tanzil, Corpus) kıyasla açık bir belgeleme boşluğu; (2) kaynağın kendisi bir canlı API olduğu için versiyon/checksum sabitlenmemiş — API içeriği değişirse sessizce farklı bir "kaynak" ile yeniden üretim yapılabilir (script bunu otomatik tespit etmez, sadece ayet sayısı/ayraç dengesi kontrol edilir).

---

## Özet Tablo

| Kaynak | Konum | Bütünlük | Lisans | Risk |
|---|---|---|---|---|
| Tanzil Uthmani metni | `data/vendor/tanzil/uthmani-1.1/` (git'te izleniyor, whitelisted) | SHA-256 doğrulandı, tek commit'ten sonra hiç değişmedi; build script'i her çalıştırmada yeniden doğruluyor | CC BY 3.0; `THIRD_PARTY_LICENSES.md` + uygulama içi "Kaynaklar" ekranında atıflı | **Temiz** |
| Quranic Arabic Corpus (mustafa0x fork) | `data2/quran-morphology/`, `data/word-analysis/quran-morphology.txt`, `Kuran-Rehberi-main/data/morphology/` (3 özdeş kopya, hiçbiri git'te izlenmiyor) | Git geçmişi yok (untracked); içerik üç kopyada özdeş; gerçek kaynak orijinal Corpus değil, isimsiz bir fork | GPL/Corpus Terms (nihai kaynağa atıf var) ama fork'un kendi LICENSE'ı yok, ara kaynak uygulamada belirtilmiyor | **Dikkat** |
| `data/quran/external/Kuran/` (ar.uthmani.json + Kuran-Rehberi-main/acikkuran-api-main/json-main/quran-meta-master) | Tamamen git-ignore'lu, hiçbiri commit edilmemiş | Git geçmişi yok; `ar.uthmani.json` koda hiç referans edilmiyor (ölü kopya); pipeline yalnızca `translations/` ve `surahs.json`'ı okuyor | Kuran-Rehberi-main/json-main/quran-meta-master: MIT; **acikkuran-api-main: CC BY-NC-SA 4.0 (ticari kullanım yasak, kod tarafında kullanılmıyor)** | **Dikkat** (genel) / **Sorunlu** (acikkuran-api-main'in NC lisansı, kullanılmasa da) |
| Tecvid (tajweed) kaynağı — AlQuran.cloud API | Repoda dosya yok; canlı fetch → `verses.arabic_tajweed` (yerel/uzak DB) → `data/generated/quran/tajweed-spans.json` | Kaynak checksum'lanamıyor (API); üretim mimarisi (hizalama, override, testler) çok titiz; kaynak metin asla değiştirilmiyor | **Repo içinde hiçbir lisans/terms kaydı ve uygulama içi atıf yok** | **Dikkat** |

---

## Genel Gözlem

En kritik ve en sık dokunulan veri yolu (Tanzil → `build-quran-runtime.mjs` → `data/generated/quran/`) mükemmel şekilde korunmuş: tek okuma noktası, SHA-256 kilidi, üretim yolunun repo genelinde grep ile taranabilir "asla vendor'a yazma" garantisi ve bunu zorlayan otomatik testler var. Buna karşılık, ikincil/tarihsel kaynaklar (morfoloji fork'u, `data/quran/external/Kuran/` dökümü) hem git'in dışında (reprodüksiyon riski) hem de lisans belgelemesinin dışında (AlQuran.cloud, mustafa0x fork'u, acikkuran-api-main NC lisansı) kalmış. Hiçbirinde aktif bir "kaynağı bozma" bulgusu yok; asıl bulgular eksik atıf/belgeleme ve versiyon kontrolü dışı, izlenemeyen vendor kopyalarıdır.
