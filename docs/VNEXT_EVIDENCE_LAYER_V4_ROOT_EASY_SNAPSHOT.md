# vNext Evidence Layer v4 + Root Easy Snapshot

Bu rapor runtime'a bağlanmayan Evidence Layer audit sonucudur. Bu sürümde `canonical_word_analysis_v4` ve `root_explanations_tr_v2_easy_only` yalnız opt-in evidence source olarak kullanılmıştır.

## Kapsam

- Quality set audit case: 28
- Manuel örnek audit case: 10
- Toplam audit case: 38
- Toplam benzersiz ayet: 29
- Runtime/default source değişti mi?: hayır
- UI değişti mi?: hayır
- Preview/decision davranışı değişti mi?: hayır
- v4 default source yapıldı mı?: hayır
- root easy-only runtime'a bağlandı mı?: hayır

## Özet

- Toplam evidence item: 2118
- Conflict flag sayısı: 65
- Source support 2+ item sayısı: 1299
- Single-source item sayısı: 819
- User-facing allowed true: 146
- User-facing allowed false: 1972
- Debug-only item sayısı: 1972
- v4 katkı sayısı: 1219
- root_easy_only katkı sayısı: 339

## Kind Dağılımı

- `keyTerm`: 173
- `root`: 443
- `lemma`: 629
- `rootExplanation`: 339
- `weakCorrespondence`: 40
- `coverage`: 76
- `sourceStatus`: 342
- `translationCoverage`: 38
- `limitedContext`: 38

## Internal Confidence Dağılımı

- `low`: 1972
- `medium`: 0
- `high`: 146

## En Çok Kullanılan Source ID'ler

- `canonical_word_analysis`: 1251
- `canonical_word_analysis_v4`: 1219
- `root_easy_only`: 339
- `source_status_mapper`: 304
- `verse_analysis_signals`: 173
- `coverage_by_ayah`: 76
- `missing_meaning_report`: 40
- `tafsir_summary`: 38
- `normalized_translations`: 38
- `revelation_context`: 38
- `root_explanations`: 36
- `profile_specific_weak_helper`: 26

## Conflict Türleri

- `keyTermOnlyInV4`: 30
- `keyTermMissingInV4`: 18
- `profileRelevantTermDropped`: 17

## Conflict Olan Ayetler

- `40:60`: 1
- `2:10`: 2
- `5:3`: 6
- `5:90`: 8
- `99:7`: 1
- `99:8`: 1
- `101:6`: 1
- `39:53`: 4
- `7:156`: 2
- `12:4`: 3
- `12:100`: 6
- `49:12`: 6
- `5:3`: 6
- `5:90`: 8
- `39:53`: 4
- `49:12`: 6

## Not

Bu snapshot kullanıcı-facing analiz üretmez. `internalConfidence`, `sourceSupport`, `singleSource`, `conflictFlags` ve `evidenceTrace` sadece debug/audit amacıyla üretilmiştir.

## Sonraki Küçük Adım

v4/root_easy_only kaynaklarının ürettiği conflict tiplerini gözden geçirmek; özellikle `keyTermMissingInV4`, `keyTermOnlyInV4` ve root easy-only desteklerinin gerçekten faydalı mı yoksa fazla gürültülü mü olduğunu audit etmek.

