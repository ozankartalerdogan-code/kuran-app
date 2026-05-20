# CoreDb Context Notes + Translation Comparison Inspect

Tarih: 2026-05-14

Bu rapor `data/kuran_core.db` içindeki `context_notes` ve `translation_comparison` tablolarını inceler. Runtime, UI, default source ve DB değiştirilmedi.

## Kısa Sonuç

`translation_comparison` tablosu güçlü bir meal/source havuzu sağlıyor; ancak gerçek anlamda hazır analiz sinyali değil. İçerik temelde normalize edilmiş meal metinleri ve source metadata.

`context_notes` tablosu her ayet için iki satır içeriyor ama notlar çoğunlukla sure-level bağlam/not kopyası gibi duruyor. Özellikle `tafsir_note` kayıtları ayet-özel kısa tefsir değil; uzun Elmalılı sure girişi/tefsir parçası olabiliyor. Bu yüzden Kanıtlı Analiz kullanıcı kartına doğrudan basılması riskli.

Güvenli kullanım:

- `translation_comparison`: coverage, source diversity, meal source count, kategori düzeyinde meal farklılığı sinyali.
- `context_notes`: nüzul/sure bağlamı için kısa kapsam notu.

Riskli kullanım:

- `translation_comparison.normalized_text` içinden doğrudan phrase extraction.
- `context_notes.tafsir_note` metnini ayet-özel açıklama gibi göstermek.
- Ham `normalized_text` veya `tafsir_note` kullanıcıya doğrudan basmak.

## DB Genel Bilgi

Dosya:

`data/kuran_core.db`

Boyut:

`207,802,368 byte` yaklaşık `198.18 MiB`

Tablolar:

- `build_meta`
- `verses`
- `translations`
- `words`
- `root_meanings`
- `translation_comparison`
- `fidelity_signals`
- `context_notes`
- `sqlite_sequence`

Indexler:

- `idx_context_notes_verse_key`
- `idx_fidelity_signals_verse_key`
- `idx_translation_comparison_verse_key`
- `idx_translations_verse_key`
- `idx_words_root`
- `idx_words_verse_key`

## `context_notes` Tablosu

Şema:

| Alan | Tip |
|---|---|
| id | INTEGER PRIMARY KEY |
| verse_key | TEXT |
| scope | TEXT |
| type | TEXT |
| source | TEXT |
| text | TEXT |

Sayılar:

| Metrik | Değer |
|---|---:|
| Satır sayısı | 12472 |
| Kapsanan ayet | 6236 |
| Boş text | 0 |
| Distinct source | 2 |
| Distinct type | 2 |
| Distinct scope | 1 |

Dağılım:

| scope | type | source | count |
|---|---|---|---:|
| surah | revelation_context | data/normalized/surah-meta.json | 6236 |
| surah | tafsir_note | elmalili | 6236 |

Yorum:

- Her ayette tam iki context note var.
- `revelation_context` satırı kısa ve teknik olarak güvenli: örnek `Vahiy türü: medeni. Nüzul sırası: 87.`
- `tafsir_note` satırı çoğu örnekte ayet-özel kısa not değil; sure-level veya uzun tefsir girişi gibi duruyor.
- `scope` değerinin tamamı `surah`; yani tablo ayet bazlı kayıt taşısa da içerik ayet-özel olmayabilir.

## `translation_comparison` Tablosu

Şema:

| Alan | Tip |
|---|---|
| id | INTEGER PRIMARY KEY |
| verse_key | TEXT |
| source | TEXT |
| normalized_text | TEXT |
| raw_json | TEXT |

Sayılar:

| Metrik | Değer |
|---|---:|
| Satır sayısı | 229085 |
| Kapsanan ayet | 6236 |
| Distinct source | 37 |
| Boş normalized_text | 0 |
| Boş raw_json | 0 |

Kaynak kapsamı:

- Birçok source tam `6236` ayet kapsıyor.
- En düşük görünen kaynaklar:
  - `edip`: 5980
  - `yilmaz`: 5748
  - `sadak`: 5721

`raw_json` içeriği:

```json
{"status":"available","sourceUrl":"data/normalized/translations.json"}
```

Yorum:

- `raw_json` analiz detayı değil; kaynak/status metadata.
- `normalized_text` küçük harfe indirilmiş meal metni.
- Bu tablo hazır `commonPhrases`, `divergentPhrases` veya semantic diff üretmiyor.

## Encoding / Veri Kalitesi

`translation_comparison.normalized_text` içinde normalized translations ile aynı `1/0` encoding kalıntısı riski devam ediyor.

Tespit:

| Metrik | Değer |
|---|---:|
| Encoding kalıntılı entry | 18888 |
| Encoding kalıntılı ayet | 2756 |

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
| gunes | 694 |
| diyanet | 674 |
| yorulmaz | 669 |

En sık bozuk token örnekleri:

| Token | Sayı |
|---|---:|
| onlar1n | 809 |
| onlar1 | 663 |
| m1 | 522 |
| art1k | 502 |
| yard1m | 411 |
| allah1n | 353 |
| vard1r. | 286 |
| nas1l | 243 |
| hay1r, | 235 |
| m1? | 187 |

## Örnek Ayet Kontrolü

| Ayet | context_notes | translation_comparison | Not |
|---|---:|---:|---|
| 2:173 | 2 | 37 | Meal source çeşitliliği güçlü; context tafsir note ayet-özel değil gibi. |
| 5:90 | 2 | 37 | İçki/kumar/put/fal okları için kategori sinyali çıkarılabilir. |
| 49:12 | 2 | 37 | Zan/gıybet/kusur arama alanında meal çeşitliliği güçlü. |
| 99:7 | 2 | 37 | Kısa ayet; meal farkı daha kontrollü olabilir. |
| 101:6 | 2 | 37 | Bazı kaynaklarda `tart1lar1`, `a1r`, `0_te` kalıntıları var. |
| 4:29 | 2 | 37 | Mallar/ticaret/can dokunulmazlığı kategorileri için değerli. |
| 12:100 | 2 | 36 | Kıssa sahnesi için zengin meal metni var; phrase extraction yine temizlik ister. |
| 39:53 | 2 | 37 | Rahmet/bağışlanma/tövbe kaynak çeşitliliği güçlü. |

## Gerçek Analiz Sinyali Var mı?

### `context_notes`

Kısmen.

- `revelation_context`: güvenli, kısa, kaynaklı bağlam sinyali.
- `tafsir_note`: doğrudan kullanıcı-facing analiz sinyali değil. Uzun, sure-level ve tefsirsel olabilir.

Karar:

- `revelation_context` sourceStatus/context kapsamı için kullanılabilir.
- `tafsir_note` normal Kanıtlı Analiz kartına doğrudan girmemeli.
- AI üst katmanda bile önce ayet-specific/surah-specific ayrımı yapılmalı.

### `translation_comparison`

Hazır analiz sinyali değil.

Asıl içerik:

- source
- normalized meal text
- raw_json metadata

Karar:

- Source diversity ve coverage için güvenli.
- Kategori düzeyinde meal farkı sinyali için güvenli.
- Phrase-level kullanıcı-facing fark üretimi için temizlik/audit şart.

## Kanıtlı Analiz’de Güvenli Kullanım

Güvenli:

- `translation_comparison` satır sayısından meal/source coverage.
- Source diversity: kaç meal var?
- Profile bazlı kategori cümlesi için “meal karşılaştırması mevcut” sinyali.
- Temiz kaynak whitelist sonrası kısa örnek phrase adayı.
- `context_notes.revelation_context` ile kısa bağlam durumu.

Koşullu:

- `context_notes.tafsir_note` sadece debug veya future AI context olarak tutulabilir.
- Kullanıcıya gösterilecekse önce ayet-specific olup olmadığı doğrulanmalı.

## Riskli Kullanım

Riskli:

- `tafsir_note` metnini doğrudan Kanıtlı Analiz kartında göstermek.
- `translation_comparison.normalized_text` ile ham phrase extraction yapmak.
- Encoding kalıntısı içeren source’lardan kullanıcı-facing ifade çıkarmak.
- `raw_json` alanını analiz detayı sanmak.
- Sure-level context’i ayet-level açıklama gibi sunmak.

## Sonraki Küçük Adım

En güvenli küçük adım:

`coreDb translation_comparison clean-source audit` üretmek.

Amaç:

- Encoding kalıntısı az/hiç olmayan source’ları belirlemek.
- Ayet başına temiz source coverage sayısını çıkarmak.
- Phrase extraction için kullanılabilecek güvenli source whitelist önermek.
- `context_notes.tafsir_note` için ayet-specific mi / surah-level mi ayrım audit’i yapmak.

Önerilen çıktılar:

- `data/analysis-snapshots/coredb-translation-comparison-clean-source-audit.json`
- `docs/COREDB_TRANSLATION_COMPARISON_CLEAN_SOURCE_AUDIT.md`

Default source, runtime ve UI bu audit bitmeden değiştirilmemeli.

