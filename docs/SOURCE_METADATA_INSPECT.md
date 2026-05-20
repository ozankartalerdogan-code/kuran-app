# Source Metadata Inspect

Bu rapor `data/source-metadata/*.json` dosyalarının Kanıtlı Analiz için merkezi kaynak güveni, kullanım sınıfı ve default-readiness açısından ne kadar kullanılabilir olduğunu özetler.

## Kısa Sonuç

- `data/source-metadata` altında 8 metadata dosyası var.
- Metadata dosyaları runtime karar katmanına doğrudan bağlı görünmüyor; daha çok build/audit çıktısı ve kaynak readiness bilgisi olarak duruyor.
- En değerli dosya `final-readiness-report.json`: alan bazlı `status`, `coverageRatio`, `safeForUi` ve genel karar bilgisi içeriyor.
- `confidence`, `usageClass`, `sourceType`, `dataType`, `license`, `safeForUi`, `fidelityPolicy`, `cleanRowCount`, `corruptedRowCount`, `missingRowCount` gibi alanlar merkezi kaynak güven sınıflandırması için kullanılabilir.
- Bu metadata kullanıcıya ham şekilde gösterilmemeli; Kanıtlı Analiz vNext için `sourceStatus`, `debug/source audit`, source policy ve default-readiness kararlarında kullanılmalı.
- Bazı metadata eski veya geniş kapsamlı: örneğin `final-readiness-report.json` bazı alanları `safeForUi: true` işaretliyor, fakat sonraki meal/phrase auditlerinde encoding ve phrase extraction riskleri görüldü. Bu yüzden metadata tek başına default kararı için yeterli değil.

## Metadata Dosyaları

| Dosya | Rol | Ana içerik | Kanıtlı Analiz için kullanım |
| --- | --- | --- | --- |
| `coverage-report.json` | Global coverage özeti | Tefsir/context/meal/fidelity kapsam sayıları | Coverage ve sourceStatus için güvenli |
| `encoding-audit.json` | Encoding kalite audit’i | 65 issue, `arabic_latin_mix`, `mojibake` | Debug/source risk sinyali için güvenli |
| `external-sources.json` | Harici kaynak kayıtları | Resmi/referans/meal site kaynakları | Source trust ve lisans görünümü için yararlı |
| `final-readiness-report.json` | Merkezi readiness özeti | Alan bazlı readiness, safeForUi, coverage, decision | vNext source policy için ana aday |
| `github-sources.json` | GitHub kaynak değerlendirmesi | accepted/rejected, license, usageClass, reason | Debug/source vetting için yararlı |
| `meal-source-stability.json` | Meal kaynak stabilitesi | Clean/corrupted/missing row sayıları | Meal kaynak whitelist/policy için yararlı |
| `normalized-report.json` | Normalize cache özeti | 6236 ayet, 37 meal, encodingFixCount | Normalized kaynak coverage için güvenli |
| `surah-level.json` | Sure düzeyi metadata | 114 sure context metadata kaydı | Sure düzeyi context/debug için yararlı |

## Sayısal Özet

- Metadata dosyası: 8
- `coverage-report.json`:
  - `surahTafsirCount`: 114
  - `surahContextCount`: 114
  - `ayahRangeTafsirCount`: 0
  - `mealComparisonAyahCount`: 6236
  - `fidelityReadyAyahCount`: 5861
  - `matchingGapCount`: 375
  - `parserGapCount`: 0
  - `sourceUnavailableCount`: 0
- `normalized-report.json`:
  - `arabicAyahCount`: 6236
  - `translationAyahCount`: 6236
  - `translationSourceCount`: 37
  - `tafsirRangeCount`: 114
  - `encodingFixCount`: 25966
  - `transliterationStatus`: `available`
  - `ayahLevelNuzulStatus`: `missing`
- `encoding-audit.json`:
  - `filesScanned`: 4
  - `issueCount`: 65
  - `arabic_latin_mix`: 10
  - `mojibake`: 55
- `surah-level.json`:
  - kayıt: 114
  - `sourceType`: `github`
  - `dataType`: `context`
  - `usageClass`: `github_verified`
  - `confidence`: `medium`

## Listelenen Kaynaklar

### External Sources

| Kaynak | Tür | Veri tipi | Usage class | Confidence | Not |
| --- | --- | --- | --- | --- | --- |
| Diyanet Kur'an Portalı / Kur'an Yolu | official | context | primary | high | 1. sure örnek context kaydı |
| Diyanet Kur'an Portalı / Diyanet İşleri Başkanlığı Meali | official | meal_comparison | primary | high | 1:1 örnek meal kaydı |
| TDV İslam Ansiklopedisi | reference | nuzul | secondary | high | Genel referans metadata |
| Açık Kuran | meal_site | meal_comparison | helper | medium | CC BY-NC-SA 4.0 |

### GitHub Sources

| Kaynak | Durum | Usage class | Lisans | Karar |
| --- | --- | --- | --- | --- |
| `ziegfiroyt/acikkuran-api` | accepted | github_verified | CC BY-NC-SA 4.0 | Belgeli ve kullanılabilir kaynak |
| `quran-center/quran-meta` | rejected | helper | Repository license present | Metadata odaklı, analiz içeriği sağlamıyor |
| `Kuran-Rehberi-main` | rejected | helper | yok | Lisans/kaynak doğrulama yetersiz |

### Meal Stability Sources

| Source | Raw | Clean | Corrupted | Missing | Fidelity policy |
| --- | ---: | ---: | ---: | ---: | --- |
| sadak | 5773 | 5721 | 52 | 463 | clean_rows_only |
| hayrat | 6236 | 6236 | 0 | 0 | clean_rows_only |
| yilmaz | 6006 | 5781 | 225 | 230 | clean_rows_only |
| ugur | 6236 | 6236 | 0 | 0 | clean_rows_only |
| vakfi | 6236 | 6236 | 0 | 0 | clean_rows_only |
| yildirim-harun | 6236 | 6214 | 22 | 0 | clean_rows_only |

## Mevcut Alanlar

Metadata dosyalarında merkezi policy için kullanılabilecek alanlar:

- `confidence`
- `usageClass`
- `sourceType`
- `dataType`
- `license`
- `status`
- `coverageRatio`
- `safeForUi`
- `fidelityPolicy`
- `expectedAyahCount`
- `rawRowCount`
- `cleanRowCount`
- `corruptedRowCount`
- `missingRowCount`
- `fidelityEligibleRowCount`
- `issueType`
- `requiresManualReview`
- `autoFixed`
- `uiMissingSemantics`

## Default-Readiness İçin Kullanılabilirlik

Bu metadata default-readiness kararında kullanılabilir ama tek başına yeterli değildir.

Güvenli kullanım:

- Bir kaynağın kapsamını ölçmek.
- Bir kaynağın user-facing/debug/park sınıfını belirlemek.
- Meal kaynağı whitelist’i veya clean-row policy üretmek.
- `sourceStatus` metnini teknik olmayan şekilde desteklemek.
- Eksik kaynakları “bilinen kapsam notu” olarak ayırmak.

Riskli kullanım:

- `safeForUi: true` değerini doğrudan “kullanıcıya tam metin gösterilebilir” anlamında yorumlamak.
- `tafsir` ve `revelation_context` için ayet bazlı doğruluk varsaymak.
- Encoding audit’i tek nihai temizlik kapısı saymak.
- Meal phrase extraction’ı bu metadata’ya bakarak yeniden açmak.
- Source confidence’ı tefsir/yorum doğruluğu gibi kullanmak.

## User-Facing / Debug-Only / Park Sınıflandırması

### User-Facing Adayı

Ham metadata değil, sadeleştirilmiş özet olarak kullanılabilir:

- `arabic_text`: ready, coverage 1
- `translations`: ready, coverage 1
- `word_analysis`: ready, coverage 1
- `transliteration`: ready, coverage 1
- `fidelity`: partially ready, coverage 0.9399
- Meal source availability ve diversity: sadece kısa kaynak durumu

Örnek kullanıcı dili:

> Kaynaklar: meal, kelime verisi ve karşılaştırma sinyalleri mevcut.

### Debug-Only

Normal kullanıcıya açılmamalı:

- Encoding issue listeleri
- Corrupted/missing row detayları
- GitHub accepted/rejected reason detayları
- Raw `usageClass`, `confidence`, `safeForUi` JSON değerleri
- `fidelityPolicy`
- `uiMissingSemantics`

### Park / Dikkatli Kullanım

Şimdilik doğrudan kullanıcı-facing ana sinyal yapılmamalı:

- `tafsir`: coverage 1 görünse de ayet bazlı değil, sure/range düzeyi sınırlı.
- `revelation_context`: coverage 1 görünse de `ayahLevelNuzulStatus: missing`.
- Meal phrase extraction: önceki auditlerde encoding/phrase kalıntısı riski nedeniyle durduruldu.
- Rejected GitHub kaynakları: yalnızca kaynak envanteri/debug için tutulmalı.

## Kanıtlı Analiz vNext Context İçin Önerilen Kullanım

vNext için metadata doğrudan preview metni üretmek yerine merkezi source policy katmanı olarak kullanılmalı.

Önerilen soyut yapı:

```ts
type SourceUsageClass =
  | "user_facing"
  | "debug_only"
  | "parked"
  | "build_input";

type SourceTrustProfile = {
  sourceId: string;
  dataType: string;
  coverage: number | null;
  confidence: "high" | "medium" | "low" | "unknown";
  usageClass: SourceUsageClass;
  userFacingAllowed: boolean;
  defaultReady: boolean;
  knownRisks: string[];
};
```

Bu yapı şu alanları besleyebilir:

- `availableSources`
- `missingSources`
- `sourceStatus`
- debug/source audit snapshot
- coreDb default-readiness audit
- meal source whitelist
- phrase extraction gate
- fidelity/weak correspondence güven filtresi

## En Güvenli Sonraki Küçük Adım

`data/source-metadata` dosyalarından tek bir source policy snapshot üretmek:

- Girdi: `final-readiness-report.json`, `coverage-report.json`, `meal-source-stability.json`, `encoding-audit.json`, `external-sources.json`, `github-sources.json`
- Çıktı önerisi: `data/analysis-snapshots/source-policy-audit.sample.json`
- Docs önerisi: `docs/SOURCE_POLICY_MATRIX.md`
- Davranış: runtime/default/UI değişmeyecek, sadece classification snapshot üretilecek.

Öncelik sırası:

1. Metadata’daki `safeForUi` kararlarını son auditlerle reconcile et.
2. Source’ları `user_facing`, `debug_only`, `parked`, `build_input` olarak sınıflandır.
3. Meal source stability ile encoding audit’i birleştirip phrase extraction için net “blocked/allowed” policy üret.
4. `sourceStatus` için teknik olmayan kısa mesaj şablonları belirle.
5. Ancak bundan sonra vNext context içine source policy adaptörü ekle.

## Dürüst Risk Notu

Bu metadata klasörü ciddi bir fırsat: kaynak güvenini merkezi hale getirebilir. Ama şu anda “karar verici sistem” değil, “karar destek sistemi” gibi kullanılmalı. Özellikle `safeForUi` alanları geçmiş build anındaki genel readiness’i gösteriyor; sonradan yapılan phrase/encoding/weak correspondence auditleri daha ince riskleri ortaya çıkardı. Bu yüzden vNext’te en doğru kullanım, kullanıcıya ham metadata göstermek değil, kontrollü source policy ve kısa sourceStatus üretmek.
