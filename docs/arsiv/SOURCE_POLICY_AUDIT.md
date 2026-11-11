# Source Policy Audit

Bu rapor `data/source-metadata/*.json` dosyalarından üretilen merkezi source policy snapshot sonucunu özetler.

Snapshot:

- `data/analysis-snapshots/source-policy-audit.sample.json`

## Kısa Sonuç

- Toplam policy entry: 27
- `user_facing`: 10
- `debug_only`: 5
- `parked`: 6
- `build_input`: 6
- Kullanıcıya kontrollü şekilde katkı verebilecek kaynak: 10
- Sıkı anlamda default-ready görünen kaynak: 8
- Kararı belirsiz/orta güvenli kaynak: 11
- Default-readiness için uygun olmayan kaynak: 19

Bu snapshot runtime, UI veya default source davranışını değiştirmez. Sadece vNext için merkezi kaynak güven sınıflandırması üretir.

## Policy Sınıfları

| Sınıf | Anlamı |
| --- | --- |
| `user_facing` | Kullanıcıya ham metadata olarak değil, kontrollü preview/sourceStatus olarak gösterilebilir. |
| `debug_only` | Audit, hata ayıklama ve policy karar desteği için kullanılmalı; normal kullanıcıya ham gösterilmemeli. |
| `parked` | Kapsam, lisans, semantik doğrulama veya ayet bazlılık eksikliği nedeniyle şimdilik default/user-facing olmamalı. |
| `build_input` | Normalize, enrichment veya build girdisi olarak değerli; runtime preview için doğrudan kaynak olmamalı. |

## Kaynak Sınıflandırması

### User-Facing

| Source | Karar dayanağı | Default-ready | Not |
| --- | --- | --- | --- |
| `readiness:arabic_text` | `status=ready`, `coverageRatio=1`, `safeForUi=true` | evet | Ayet metni güvenli temel kaynak. |
| `readiness:transliteration` | `status=ready`, `coverageRatio=1`, `safeForUi=true` | evet | Teknik olmayan görünümde kullanılabilir. |
| `readiness:translations` | `status=ready`, `coverageRatio=1`, `safeForUi=true` | evet | Meal metinleri için temel kaynak. |
| `readiness:word_analysis` | `status=ready`, `coverageRatio=1`, `safeForUi=true` | evet | Kelime/morfoloji bağlamı için temel kaynak. |
| `readiness:word_meanings` | `status=partially_ready`, `coverageRatio=0.8125` | hayır | Kullanılabilir ama coverage eksikliği var. |
| `readiness:fidelity` | `status=partially_ready`, `coverageRatio=0.9399` | hayır | Filtreli weak/fidelity sinyali olarak kullanılabilir. |
| `meal:hayrat` | 6236 clean row, 0 corrupted, 0 missing | evet | Phrase extraction yine ayrı gate ister. |
| `meal:ugur` | 6236 clean row, 0 corrupted, 0 missing | evet | Phrase extraction yine ayrı gate ister. |
| `meal:vakfi` | 6236 clean row, 0 corrupted, 0 missing | evet | Phrase extraction yine ayrı gate ister. |
| `external:Diyanet Kur'an Portalı / Diyanet İşleri Başkanlığı Meali` | official, primary, high confidence, meal comparison | evet | Kaynak/status düzeyinde güvenli. |

### Build Input

| Source | Karar dayanağı | Not |
| --- | --- | --- |
| `meal:sadak` | 5721 clean, 52 corrupted, 463 missing | Clean rows build input; doğrudan full user-facing değil. |
| `meal:yilmaz` | 5781 clean, 225 corrupted, 230 missing | Clean rows build input; doğrudan full user-facing değil. |
| `meal:yildirim-harun` | 6214 clean, 22 corrupted | Clean rows build input; phrase için riskli. |
| `external:Diyanet Kur'an Portalı / Kur'an Yolu` | official, context, high confidence | Context build input; ayet bazlı preview’a doğrudan basılmamalı. |
| `external:Açık Kuran` | helper, medium confidence, CC BY-NC-SA 4.0 | Build/enrichment girdisi; primary gibi davranmamalı. |
| `github:ziegfiroyt/acikkuran-api` | accepted, github_verified, CC BY-NC-SA 4.0 | Normalize/build sonrası kullanılmalı; ham source user-facing değil. |

### Parked

| Source | Karar dayanağı | Neden default-ready değil? |
| --- | --- | --- |
| `readiness:root_explanations` | `coverageRatio=0.0462` | Metadata coverage çok düşük; v2/easy-only ayrı audit gerektiriyor. |
| `readiness:tafsir` | `partially_ready`, sure/range düzeyi | Ayet bazlı tefsir gibi gösterilmemeli. |
| `readiness:revelation_context` | `partially_ready`, `ayahLevelNuzulStatus=missing` | Ayet bazlı nüzul doğrulanmadan kullanıcı-facing olmamalı. |
| `external:TDV İslam Ansiklopedisi` | nüzul/reference, high confidence | Ayet bazlı kapsam doğrulanmalı. |
| `github:quran-center/quran-meta` | rejected | Metadata odaklı; analiz içeriği sağlamıyor. |
| `github:Kuran-Rehberi-main` | rejected | Lisans/kaynak doğrulama yetersiz. |

### Debug-Only

| Source | Karar dayanağı | Kullanım |
| --- | --- | --- |
| `metadata:coverage-report` | coverage sayıları | available/missing source audit. |
| `metadata:normalized-report` | normalized cache kapsamı | coverage/sourceStatus policy input. |
| `metadata:encoding-audit` | 65 encoding issue | phrase/meal text gating ve debug risk sinyali. |
| `metadata:surah-level-context` | 114 sure düzeyi context metadata | SourceStatus/kapsam notu; ayet analizi değil. |
| `metadata:final-readiness-report` | merkezi readiness kararı | Source policy matrix için ana karar destek dosyası. |

## Karar Dayanakları

Sınıflandırma şu metadata alanlarına dayandı:

- `status`
- `coverageRatio`
- `safeForUi`
- `confidence`
- `usageClass`
- `sourceType`
- `dataType`
- `license`
- `cleanRowCount`
- `corruptedRowCount`
- `missingRowCount`
- `fidelityPolicy`
- `status=accepted/rejected`
- `issueCount`
- `ayahLevelNuzulStatus`

Özellikle `safeForUi` tek başına kesin karar sayılmadı. Daha önceki auditlerde meal phrase, encoding ve weak correspondence riskleri görüldüğü için `safeForUi=true` sadece bir pozitif sinyal olarak ele alındı.

## Belirsiz Kaynaklar

Kararı orta güvenle verilen veya ek audit isteyen kaynaklar:

- `readiness:word_meanings`
- `readiness:root_explanations`
- `readiness:tafsir`
- `readiness:revelation_context`
- `readiness:fidelity`
- `meal:sadak`
- `meal:yilmaz`
- `meal:yildirim-harun`
- `external:Açık Kuran`
- `github:ziegfiroyt/acikkuran-api`
- `metadata:surah-level-context`

Bu kaynakların ortak durumu: veri değerli ama doğrudan default/user-facing kullanım için ek gate veya kapsam kontrolü gerekiyor.

## Default-Readiness İçin Uygun Olmayanlar

Default-ready olmayan kaynak sayısı: 19.

Başlıca nedenler:

- Partial coverage.
- Corrupted/missing meal row.
- Helper/build input olması.
- Ayet bazlı kapsamın doğrulanmamış olması.
- Rejected source olması.
- Metadata/debug raporu olması.
- Phrase extraction için encoding/segmentation risklerinin devam etmesi.

Default için uygun olmayan kritik kaynak aileleri:

- Tefsir ve nüzul context.
- Root explanations genel v2 dışı eski coverage.
- Rejected GitHub kaynakları.
- Corrupted/missing meal source’lar.
- Encoding audit ve coverage raporları.

## Kanıtlı Analiz vNext Context Kullanımı

vNext’te bu snapshot doğrudan analiz metni üretmemeli. Bunun yerine merkezi bir source trust/policy objesi üretmeli.

Önerilen kullanım:

- `availableSources`: sadece user-facing veya kontrollü build input kaynaklardan türet.
- `missingSources`: gerçek eksik ile bilinen kapsam notunu ayır.
- `sourceStatus`: teknik olmayan kısa metin üret.
- `debugSources`: debug-only ve parked kaynakların karar gerekçesini sakla.
- `translationDifferences`: meal source stability ve encoding gate geçmeden phrase üretme.
- `weakCorrespondences`: fidelity/word-analysis sinyallerini profile-specific filtre ile kullan.
- `contextNuzul` ve `tafsirNotes`: parked kalmalı veya sadece kapsam notu olarak görünmeli.

Örnek kullanıcı-facing sourceStatus:

> Kaynaklar: meal, kelime verisi ve karşılaştırma sinyalleri mevcut. Ayet bazlı tefsir/nüzul kapsamı sınırlı.

Örnek debug-only kayıt:

```json
{
  "sourceId": "metadata:encoding-audit",
  "policyClass": "debug_only",
  "reason": "65 encoding issue; phrase extraction için gate olarak kullanılmalı"
}
```

## Sonraki Küçük Adım

En güvenli sonraki adım:

1. `source-policy-audit.sample.json` içindeki policy entry’leri için küçük bir `sourceStatus` mapper tasarla.
2. Mapper sadece teknik olmayan kısa cümle üretsin.
3. Runtime’a bağlamadan önce 28 ayet quality set + 1000 ayet audit üzerinde sourceStatus çıktısını snapshot olarak karşılaştır.
4. Tefsir/nüzul ve phrase extraction yine parked kalsın.
5. Default source veya UI davranışı ancak bu snapshot temiz çıkarsa ayrıca ele alınsın.

## Karar

Bu policy snapshot Kanıtlı Analiz vNext için kullanılabilir bir zemin oluşturuyor. Ama bugünkü haliyle default davranışı değiştirmek için değil, sourceStatus ve debug/source policy kararlarını standardize etmek için kullanılmalı.
