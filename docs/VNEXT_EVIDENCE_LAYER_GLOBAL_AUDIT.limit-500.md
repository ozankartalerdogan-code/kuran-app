# vNext Evidence Layer Global Audit

Bu rapor vNext Evidence Layer'in tum ayetler uzerinde inspect-only global audit sonucudur. Runtime, UI, default source, decision ve preview davranisi degistirilmedi. `canonical_word_analysis_v4` ve `root_explanations_tr_v2_easy_only` yalniz opt-in evidence source olarak kullanildi.

## Kapsam

- Toplam ayet: 500
- Islenen ayet: 500
- Hata veren ayet: 0
- Audit modu: limit (500)
- Runtime/default source degisti mi?: hayir
- UI degisti mi?: hayir
- v4 default yapildi mi?: hayir
- root easy-only runtime'a baglandi mi?: hayir

## Global Metrikler

- Toplam evidence item: 27168
- Conflict flag toplami: 1059
- Conflict etkilenen ayet: 294
- Single-source item: 11150
- Source support 2+ item: 16018
- User-facing allowed true: 1703
- User-facing allowed false: 25465
- Debug-only item: 25465
- v4 katkisi: 15452
- root_easy_only katkisi: 4386

## Performans

- Toplam sure: 27.0 sn
- Ortalama: 54.1 ms/ayet
- Context build toplam: 20.6 sn
- Evidence build toplam: 5.7 sn
- Classification toplam: 0.7 sn
- Context build ortalama: 41.1 ms/ayet
- Evidence build ortalama: 11.3 ms/ayet
- Classification ortalama: 1.4 ms/ayet

## Evidence Kind Dagilimi

- `keyTerm`: 2564
- `root`: 5334
- `lemma`: 7964
- `rootExplanation`: 4386
- `weakCorrespondence`: 420
- `coverage`: 1000
- `sourceStatus`: 4500
- `translationCoverage`: 500
- `limitedContext`: 500

## Internal Confidence Dagilimi

- `low`: 25465
- `medium`: 0
- `high`: 1703

## Conflict Tur Dagilimi

- `keyTermOnlyInV4`: 467
- `keyTermMissingInV4`: 301
- `profileRelevantTermDropped`: 291

## Conflict Quality Dagilimi

- `likelyGoodSuppression`: 64
- `likelyUsefulV4Addition`: 10
- `likelyRiskyDrop`: 50
- `needsManualReview`: 935

## Ayet Kalite Siniflari

- `strongEvidenceAyah`: 204
- `weakEvidenceAyah`: 296
- `emptyEvidenceAyah`: 0
- `onlyDebugEvidenceAyah`: 10
- `conflictAffectedAyah`: 294
- `onlySingleSourceEvidenceAyah`: 2
- `missingKeyTermsAyah`: 2
- `missingRootExplanationAyah`: 356
- `lowCoverageAyah`: 171
- `riskyDropAyah`: 24
- `needsManualReviewAyah`: 291

## Suggested Next Action Dagilimi

- `noAction`: 99
- `inspectGate`: 3
- `keyTermRecoveryNeeded`: 2
- `rootExplanationNeeded`: 99
- `manualReviewNeeded`: 291
- `sourceDataNeeded`: 6

## En Cok Kullanilan Source ID'ler

- `canonical_word_analysis`: 15639
- `canonical_word_analysis_v4`: 15452
- `root_easy_only`: 4386
- `source_status_mapper`: 4000
- `verse_analysis_signals`: 2564
- `coverage_by_ayah`: 1000
- `tafsir_summary`: 500
- `normalized_translations`: 500
- `revelation_context`: 500
- `missing_meaning_report`: 420
- `root_explanations`: 244
- `profile_specific_weak_helper`: 10

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
