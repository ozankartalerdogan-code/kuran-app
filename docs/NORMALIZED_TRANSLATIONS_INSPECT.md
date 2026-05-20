# Normalized Translations Inspect

Tarih: 2026-05-14

Bu rapor `data/normalized/translations.json` kaynağını Kanıtlı Analiz açısından inceler. Runtime, UI, default source ve veri dosyaları değiştirilmedi.

## Kısa Sonuç

`data/normalized/translations.json` kapsam olarak çok güçlü bir kaynak: 114 sure / 6236 ayetin tamamını kapsıyor, 37 meal kaynağı içeriyor ve ortalama ayet başına 36.86 meal veriyor.

Ancak kullanıcı-facing metin üretimi için doğrudan güvenli değil. Dosyada yaygın `1/0` encoding kalıntıları var. Bu yüzden kaynak bugün için en güvenli şekilde:

- meal coverage
- source diversity
- primary translation
- translation count
- kategori düzeyinde meal farklılığı sinyali

amaçlarıyla kullanılmalı.

Phrase extraction, doğrudan ortak/farklı ifade üretimi veya kullanıcıya ham meal parçası gösterme şimdilik riskli.

## Dosya Yapısı

Dosya:

`data/normalized/translations.json`

Boyut:

`59,855,102 byte` yaklaşık `57.08 MiB`

Top-level yapı:

```json
[
  {
    "surahId": 1,
    "ayahNumber": 1,
    "translations": [
      {
        "source": "diyanet",
        "text": "...",
        "status": "available"
      }
    ],
    "transliteration": "...",
    "transliterationStatus": "available",
    "status": "available"
  }
]
```

Alanlar:

- `surahId`: sure numarası
- `ayahNumber`: ayet numarası
- `translations`: aynı ayet için meal kaynakları
- `translations[].source`: meal kaynağı kısa adı
- `translations[].text`: Türkçe meal metni
- `translations[].status`: kaynak durumu
- `transliteration`: Latin transliterasyon
- `transliterationStatus`: transliterasyon durumu
- `status`: ayet translation kaydı durumu

## Kapsam Metrikleri

| Metrik | Değer |
|---|---:|
| Ayet sayısı | 6236 |
| Sure sayısı | 114 |
| Toplam translation entry | 229874 |
| Available translation entry | 229085 |
| Non-available / status farklı entry | 789 |
| Boş text | 0 |
| Benzersiz source | 37 |
| Ayet başına ortalama meal | 36.86 |
| Transliteration available | 6236 |
| Encoding kalıntılı entry | 18888 |
| Encoding kalıntılı ayet | 2756 |

## Source Listesi ve Kapsam

37 source mevcut:

`diyanet`, `ates`, `bayrakli`, `bilmen`, `bulac`, `cantay`, `celik`, `edip`, `esed`, `fizilal`, `golpinarli`, `gunes`, `hayrat`, `hulusi`, `islamoglu`, `kesir`, `kulunkoglu`, `kutub`, `mihr`, `onan`, `ongut`, `ozturk`, `parliyan`, `piris`, `sadak`, `tefhim`, `turkmen`, `ugur`, `vakfi`, `varol`, `yavuz`, `yazir`, `yildirim-celal`, `yildirim-harun`, `yildirim-suat`, `yilmaz`, `yorulmaz`

Tam veya tama yakın kaynaklar:

- 31 kaynak `6236/6236` kayıtla tam görünüyor.
- `gunes`, `turkmen`, `varol`: `6235`
- `edip`: `6107`
- `yilmaz`: `5973`
- `sadak`: `5773`

## Encoding / Veri Kalitesi

Boş meal metni bulunmadı. Asıl kalite sorunu `1/0` kalıntıları.

Toplam:

- `18888` translation entry etkileniyor.
- `2756` ayette en az bir bozuk encoding tokenı var.

En sorunlu source örnekleri:

| Source | Encoding kalıntılı entry |
|---|---:|
| kesir | 938 |
| ates | 806 |
| varol | 773 |
| piris | 767 |
| golpinarli | 716 |
| edip | 703 |
| vakfi | 695 |
| gunes | 693 |
| diyanet | 674 |
| yorulmaz | 669 |

En sık görülen bozuk token örnekleri:

| Token | Sayı |
|---|---:|
| onlar1n | 637 |
| onlar1 | 522 |
| m1 | 522 |
| yard1m | 407 |
| Art1k | 359 |
| Allah1n | 327 |
| vard1r. | 286 |
| nas1l | 231 |
| Hay1r, | 212 |
| m1? | 187 |

Bu sorun özellikle phrase extraction ve kullanıcı-facing meal farkı metinlerinde risk oluşturur.

## Örnek Ayet Kontrolü

| Ayet | Meal sayısı | Not |
|---|---:|---|
| 1:1 | 36 | Birçok kaynakta `Allah'1n`, `ad1yla` kalıntısı var. |
| 1:5 | 36 | `yaln1z`, `yard1m` gibi kalıntılar var. |
| 2:7 | 37 | İlk kaynaklarda metin temiz görünüyor; genel kapsama iyi örnek. |
| 2:173 | 37 | Güçlü hüküm/istisna çeşitliliği var; kategori sinyali için değerli. |
| 5:90 | 37 | İçki/kumar/putlar/fal okları gibi kategori farkları için değerli. |
| 49:12 | 37 | Zan/gıybet/kusur arama alanında güçlü source diversity var. |
| 99:7 | 37 | Kısa ayetlerde meal farkı daha kontrollü olabilir. |
| 101:6 | 37 | Bazı kaynaklarda `tart1lar1`, `a1r`, `0_te` kalıntıları var. |
| 112:1 | 37 | Birlik vurgusu için iyi coverage; phrase üretimi yine encoding filtresi ister. |

## Runtime Kullanımı

Aktif kullanım:

- `packages/core/src/adapters/translationAdapter.ts`
  - `getAyahTranslations`
  - `getAyahTransliteration`

Dolaylı kullanım:

- `packages/core/src/adapters/quranAdapter.ts`
  - `readAyahFromLocalData` içinde ayet translations/transliteration bilgisi alınıyor.

Kanıtlı Analiz tarafında:

- `packages/core/src/analysis/verseAnalysisContext.ts`
  - `translations`
  - `primaryTranslation`

alanları bu kaynaktan besleniyor.

Meal comparison cache ise ayrıca `packages/core/src/pipeline/buildMealComparisonCaches.ts` içinde yine bu normalized translations kaynağından inşa ediliyor.

## Kanıtlı Analiz’de Güvenli Kullanım

Güvenli kullanım alanları:

- Translation count / source coverage göstergesi
- Primary translation seçimi
- Ayet için meal çeşitliliği var/yok sinyali
- Decision layer’da kategori düzeyinde meal farkı cümlesi
- Kullanıcının “bu ayette farklı meal kaynakları mevcut” bilgisini görmesi
- Future AI explanation context için ham kaynak havuzu, ama temizleme sonrası

Koşullu güvenli kullanım:

- Temiz source whitelist ile örnek meal seçimi
- Encoding filtresinden geçen kısa phrase adayları
- Aynı anlam alanını destekleyen kaynak sayısı

## Riskli Kullanım

Şimdilik riskli olanlar:

- Ham phrase extraction
- Common/divergent phrase’i doğrudan kullanıcıya göstermek
- `1/0` kalıntısı olan metinden kullanıcı-facing analiz cümlesi üretmek
- Meal kaynaklarını semantik doğruluk kanıtı gibi göstermek
- Çok uzun/parantezli/tefsirli meal metinlerini kısa analiz sinyali gibi kullanmak

Özellikle `1:1`, `1:5`, `101:6` gibi örneklerde encoding kalıntıları doğrudan kullanıcı-facing phrase kalitesini bozabilir.

## Sonraki Küçük Adım

En güvenli küçük adım:

`normalized translations encoding audit + safe cleaned view` üretmek.

Önerilen çıktı:

- `data/analysis-snapshots/normalized-translations-encoding-audit.json`
- `docs/NORMALIZED_TRANSLATIONS_ENCODING_AUDIT.md`

Amaç:

- Source bazında encoding kalıntılarını sınıflandırmak
- Güvenli fix map adaylarını çıkarmak
- Temiz source/ayet/phrase whitelist üretmek
- Runtime dosyasını overwrite etmeden, sadece audit ve opt-in temiz view hazırlamak

Default runtime veya Kanıtlı Analiz phrase extraction bu audit bitmeden değiştirilmemeli.

