# vNext Evidence Layer Snapshot

Bu rapor runtime'a bağlanmayan ilk Evidence Layer skeleton audit sonucudur.

## Kapsam

- Quality set ayetleri: 28
- Manuel örnek ayetleri: 10
- Toplam audit case: 38
- Toplam benzersiz ayet: 29
- Runtime/default source değişti mi?: hayır
- UI değişti mi?: hayır
- Preview/decision davranışı değişti mi?: hayır

## Özet

- Toplam evidence item: 1785
- Conflict flag sayısı: 0
- Single-source item sayısı: 1580
- User-facing allowed true: 163
- User-facing allowed false: 1622
- Debug-only item sayısı: 1622

## Kind Dağılımı

- `keyTerm`: 143
- `root`: 443
- `lemma`: 629
- `rootExplanation`: 36
- `weakCorrespondence`: 40
- `coverage`: 76
- `sourceStatus`: 342
- `translationCoverage`: 38
- `limitedContext`: 38

## Internal Confidence Dağılımı

- `low`: 1622
- `medium`: 0
- `high`: 163

## En Çok Kullanılan Source ID'ler

- `canonical_word_analysis`: 1251
- `source_status_mapper`: 304
- `verse_analysis_signals`: 143
- `coverage_by_ayah`: 76
- `missing_meaning_report`: 40
- `tafsir_summary`: 38
- `normalized_translations`: 38
- `revelation_context`: 38
- `root_explanations`: 36
- `profile_specific_weak_helper`: 26

## Conflict Olan Ayetler

- Yok

## Not

Bu snapshot kullanıcı-facing analiz üretmez. `internalConfidence`, `sourceSupport`, `singleSource`, `conflictFlags` ve `evidenceTrace` sadece debug/audit amacıyla üretilmiştir.

## Sonraki Küçük Adım

Evidence item kalitesini 28+10 ayet üzerinde gözden geçirip, özellikle `keyTerm`, `weakCorrespondence` ve `rootExplanation` item'larında source support/conflict kurallarını küçük ve güvenli şekilde genişletmek.

