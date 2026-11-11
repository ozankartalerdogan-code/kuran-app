# vNext Evidence Layer Global Audit

Bu rapor vNext Evidence Layer'in tum ayetler uzerinde inspect-only global audit sonucudur. Runtime, UI, default source, decision ve preview davranisi degistirilmedi. `canonical_word_analysis_v4` ve `root_explanations_tr_v2_easy_only` yalniz opt-in evidence source olarak kullanildi.

## Kapsam

- Toplam ayet: 6236
- Islenen ayet: 6236
- Hata veren ayet: 0
- Runtime/default source degisti mi?: hayir
- UI degisti mi?: hayir
- v4 default yapildi mi?: hayir
- root easy-only runtime'a baglandi mi?: hayir

## Global Metrikler

- Toplam evidence item: 258453
- Conflict flag toplami: 9832
- Conflict etkilenen ayet: 3604
- Single-source item: 120678
- Source support 2+ item: 137775
- User-facing allowed true: 16154
- User-facing allowed false: 242299
- Debug-only item: 242299
- v4 katkisi: 133303
- root_easy_only katkisi: 36120

## Evidence Kind Dagilimi

- `keyTerm`: 24609
- `root`: 44785
- `lemma`: 66860
- `rootExplanation`: 36120
- `weakCorrespondence`: 5011
- `coverage`: 12472
- `sourceStatus`: 56124
- `translationCoverage`: 6236
- `limitedContext`: 6236

## Internal Confidence Dagilimi

- `low`: 242299
- `medium`: 0
- `high`: 16154

## Conflict Tur Dagilimi

- `keyTermOnlyInV4`: 5530
- `keyTermMissingInV4`: 2191
- `profileRelevantTermDropped`: 2111

## Conflict Quality Dagilimi

- `likelyGoodSuppression`: 582
- `likelyUsefulV4Addition`: 179
- `likelyRiskyDrop`: 330
- `needsManualReview`: 8741

## Ayet Kalite Siniflari

- `strongEvidenceAyah`: 2454
- `weakEvidenceAyah`: 3782
- `emptyEvidenceAyah`: 0
- `onlyDebugEvidenceAyah`: 568
- `conflictAffectedAyah`: 3604
- `onlySingleSourceEvidenceAyah`: 20
- `missingKeyTermsAyah`: 167
- `missingRootExplanationAyah`: 4211
- `lowCoverageAyah`: 2623
- `riskyDropAyah`: 155
- `needsManualReviewAyah`: 3545

## Suggested Next Action Dagilimi

- `noAction`: 1260
- `inspectGate`: 19
- `keyTermRecoveryNeeded`: 167
- `rootExplanationNeeded`: 1057
- `manualReviewNeeded`: 3548
- `sourceDataNeeded`: 185

## En Cok Kullanilan Source ID'ler

- `canonical_word_analysis_v4`: 133303
- `canonical_word_analysis`: 132808
- `source_status_mapper`: 49888
- `root_easy_only`: 36120
- `verse_analysis_signals`: 24609
- `coverage_by_ayah`: 12472
- `tafsir_summary`: 6236
- `normalized_translations`: 6236
- `revelation_context`: 6236
- `missing_meaning_report`: 5011
- `root_explanations`: 2084
- `profile_specific_weak_helper`: 105

## Ornekler

### Empty Evidence Ayetleri

- Yok

### Weak Evidence Ayetleri

- `2:1` (genel_karma): items=13, userFacing=0, conflicts=0, action=keyTermRecoveryNeeded
- `2:9` (genel_karma): items=35, userFacing=1, conflicts=3, action=manualReviewNeeded
- `2:10` (uyari_inkar): items=44, userFacing=3, conflicts=2, action=manualReviewNeeded
- `2:12` (genel_karma): items=25, userFacing=0, conflicts=1, action=manualReviewNeeded
- `2:14` (genel_karma): items=43, userFacing=3, conflicts=5, action=manualReviewNeeded
- `2:15` (genel_karma): items=31, userFacing=0, conflicts=5, action=manualReviewNeeded
- `2:16` (yol_hidayet): items=38, userFacing=2, conflicts=2, action=manualReviewNeeded
- `2:17` (ahiret): items=53, userFacing=4, conflicts=3, action=manualReviewNeeded
- `2:18` (yol_hidayet): items=26, userFacing=1, conflicts=1, action=manualReviewNeeded
- `2:19` (uyari_inkar): items=59, userFacing=3, conflicts=2, action=manualReviewNeeded
- `2:20` (uyari_inkar): items=67, userFacing=3, conflicts=6, action=manualReviewNeeded
- `2:24` (ahiret): items=46, userFacing=3, conflicts=4, action=manualReviewNeeded
- `2:25` (ahiret): items=78, userFacing=4, conflicts=3, action=manualReviewNeeded
- `2:27` (genel_karma): items=55, userFacing=3, conflicts=1, action=manualReviewNeeded
- `2:30` (genel_karma): items=64, userFacing=4, conflicts=3, action=manualReviewNeeded
- `2:31` (genel_karma): items=53, userFacing=3, conflicts=4, action=manualReviewNeeded
- `2:33` (genel_karma): items=53, userFacing=4, conflicts=4, action=manualReviewNeeded
- `2:34` (uyari_inkar): items=45, userFacing=3, conflicts=1, action=manualReviewNeeded
- `2:35` (ahiret): items=59, userFacing=2, conflicts=5, action=manualReviewNeeded
- `2:36` (genel_karma): items=58, userFacing=4, conflicts=3, action=manualReviewNeeded

### Conflict Etkilenen Ayetler

- `2:9` (genel_karma): items=35, userFacing=1, conflicts=3, action=manualReviewNeeded
- `2:10` (uyari_inkar): items=44, userFacing=3, conflicts=2, action=manualReviewNeeded
- `2:12` (genel_karma): items=25, userFacing=0, conflicts=1, action=manualReviewNeeded
- `2:14` (genel_karma): items=43, userFacing=3, conflicts=5, action=manualReviewNeeded
- `2:15` (genel_karma): items=31, userFacing=0, conflicts=5, action=manualReviewNeeded
- `2:16` (yol_hidayet): items=38, userFacing=2, conflicts=2, action=manualReviewNeeded
- `2:17` (ahiret): items=53, userFacing=4, conflicts=3, action=manualReviewNeeded
- `2:18` (yol_hidayet): items=26, userFacing=1, conflicts=1, action=manualReviewNeeded
- `2:19` (uyari_inkar): items=59, userFacing=3, conflicts=2, action=manualReviewNeeded
- `2:20` (uyari_inkar): items=67, userFacing=3, conflicts=6, action=manualReviewNeeded
- `2:24` (ahiret): items=46, userFacing=3, conflicts=4, action=manualReviewNeeded
- `2:25` (ahiret): items=78, userFacing=4, conflicts=3, action=manualReviewNeeded
- `2:27` (genel_karma): items=55, userFacing=3, conflicts=1, action=manualReviewNeeded
- `2:30` (genel_karma): items=64, userFacing=4, conflicts=3, action=manualReviewNeeded
- `2:31` (genel_karma): items=53, userFacing=3, conflicts=4, action=manualReviewNeeded
- `2:33` (genel_karma): items=53, userFacing=4, conflicts=4, action=manualReviewNeeded
- `2:34` (uyari_inkar): items=45, userFacing=3, conflicts=1, action=manualReviewNeeded
- `2:35` (ahiret): items=59, userFacing=2, conflicts=5, action=manualReviewNeeded
- `2:36` (genel_karma): items=58, userFacing=4, conflicts=3, action=manualReviewNeeded
- `2:37` (rahmet_magfiret): items=39, userFacing=3, conflicts=1, action=manualReviewNeeded

### Risky Drop Ayetleri

- `2:14` (genel_karma): items=43, userFacing=3, conflicts=5, action=manualReviewNeeded
- `2:61` (tevhid_birlik): items=125, userFacing=4, conflicts=3, action=manualReviewNeeded
- `2:85` (ahiret): items=116, userFacing=3, conflicts=3, action=manualReviewNeeded
- `2:90` (uyari_inkar): items=68, userFacing=2, conflicts=9, action=manualReviewNeeded
- `2:108` (yol_hidayet): items=57, userFacing=4, conflicts=3, action=manualReviewNeeded
- `2:128` (rahmet_magfiret): items=51, userFacing=3, conflicts=6, action=manualReviewNeeded
- `2:167` (ahiret): items=57, userFacing=3, conflicts=6, action=manualReviewNeeded
- `2:222` (dua_kulluk): items=68, userFacing=1, conflicts=9, action=manualReviewNeeded
- `2:228` (ahiret): items=97, userFacing=4, conflicts=3, action=manualReviewNeeded
- `2:232` (ahiret): items=82, userFacing=2, conflicts=9, action=manualReviewNeeded
- `2:249` (genel_karma): items=101, userFacing=4, conflicts=3, action=manualReviewNeeded
- `2:253` (uyari_inkar): items=94, userFacing=1, conflicts=9, action=manualReviewNeeded
- `2:275` (ahiret): items=94, userFacing=4, conflicts=3, action=manualReviewNeeded
- `2:286` (rahmet_magfiret): items=90, userFacing=3, conflicts=6, action=manualReviewNeeded
- `3:13` (uyari_inkar): items=78, userFacing=3, conflicts=6, action=manualReviewNeeded
- `3:14` (yol_hidayet): items=78, userFacing=2, conflicts=9, action=manualReviewNeeded
- `3:36` (dua_kulluk): items=60, userFacing=2, conflicts=8, action=manualReviewNeeded
- `3:120` (tevhid_birlik): items=63, userFacing=3, conflicts=6, action=manualReviewNeeded
- `3:144` (ahiret): items=68, userFacing=3, conflicts=6, action=manualReviewNeeded
- `3:153` (dua_kulluk): items=65, userFacing=3, conflicts=6, action=manualReviewNeeded

### Missing Root Explanation Ayetleri

- `2:7` (uyari_inkar): items=42, userFacing=4, conflicts=0, action=rootExplanationNeeded
- `2:9` (genel_karma): items=35, userFacing=1, conflicts=3, action=manualReviewNeeded
- `2:10` (uyari_inkar): items=44, userFacing=3, conflicts=2, action=manualReviewNeeded
- `2:13` (genel_karma): items=39, userFacing=5, conflicts=0, action=rootExplanationNeeded
- `2:14` (genel_karma): items=43, userFacing=3, conflicts=5, action=manualReviewNeeded
- `2:15` (genel_karma): items=31, userFacing=0, conflicts=5, action=manualReviewNeeded
- `2:16` (yol_hidayet): items=38, userFacing=2, conflicts=2, action=manualReviewNeeded
- `2:17` (ahiret): items=53, userFacing=4, conflicts=3, action=manualReviewNeeded
- `2:18` (yol_hidayet): items=26, userFacing=1, conflicts=1, action=manualReviewNeeded
- `2:19` (uyari_inkar): items=59, userFacing=3, conflicts=2, action=manualReviewNeeded
- `2:20` (uyari_inkar): items=67, userFacing=3, conflicts=6, action=manualReviewNeeded
- `2:22` (tevhid_birlik): items=58, userFacing=5, conflicts=0, action=rootExplanationNeeded
- `2:23` (dua_kulluk): items=61, userFacing=4, conflicts=0, action=rootExplanationNeeded
- `2:24` (ahiret): items=46, userFacing=3, conflicts=4, action=manualReviewNeeded
- `2:25` (ahiret): items=78, userFacing=4, conflicts=3, action=manualReviewNeeded
- `2:27` (genel_karma): items=55, userFacing=3, conflicts=1, action=manualReviewNeeded
- `2:29` (genel_karma): items=51, userFacing=5, conflicts=0, action=rootExplanationNeeded
- `2:30` (genel_karma): items=64, userFacing=4, conflicts=3, action=manualReviewNeeded
- `2:31` (genel_karma): items=53, userFacing=3, conflicts=4, action=manualReviewNeeded
- `2:33` (genel_karma): items=53, userFacing=4, conflicts=4, action=manualReviewNeeded

## Kisa Yorum

- Bu audit kullanici-facing yeni analiz cumlesi uretmez.
- Internal confidence, source support, conflict ve trace bilgileri sadece audit/debug icindir.
- v4 ve root_easy_only kaynaklari default veya runtime kaynagi yapilmadi.

## En Kucuk Guvenli Sonraki Adim

Global sonuc uzerinden en baskin risk sinifini secip sadece opt-in evidence gate icin kucuk bir iyilestirme paketi hazirlamak. Ozellikle `riskyDropAyah`, `needsManualReviewAyah` ve `missingRootExplanationAyah` dagilimlari karar icin ana sinyaldir.
