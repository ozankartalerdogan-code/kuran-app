# vNext Evidence Layer Global Audit

Bu rapor vNext Evidence Layer'in tum ayetler uzerinde inspect-only global audit sonucudur. Runtime, UI, default source, decision ve preview davranisi degistirilmedi. `canonical_word_analysis_v4` ve `root_explanations_tr_v2_easy_only` yalniz opt-in evidence source olarak kullanildi.

## Kapsam

- Toplam ayet: 1000
- Islenen ayet: 1000
- Hata veren ayet: 0
- Audit modu: limit (1000)
- Runtime/default source degisti mi?: hayir
- UI degisti mi?: hayir
- v4 default yapildi mi?: hayir
- root easy-only runtime'a baglandi mi?: hayir

## Global Metrikler

- Toplam evidence item: 55292
- Conflict flag toplami: 2164
- Conflict etkilenen ayet: 605
- Single-source item: 22556
- Source support 2+ item: 32736
- User-facing allowed true: 3415
- User-facing allowed false: 51877
- Debug-only item: 51877
- v4 katkisi: 31594
- root_easy_only katkisi: 8981

## Performans

- Toplam sure: 102.9 sn
- Ortalama: 102.9 ms/ayet
- Context build toplam: 64.8 sn
- Evidence build toplam: 31.3 sn
- Classification toplam: 6.6 sn
- Context build ortalama: 64.8 ms/ayet
- Evidence build ortalama: 31.3 ms/ayet
- Classification ortalama: 6.6 ms/ayet

## Evidence Kind Dagilimi

- `keyTerm`: 5160
- `root`: 10907
- `lemma`: 16373
- `rootExplanation`: 8981
- `weakCorrespondence`: 871
- `coverage`: 2000
- `sourceStatus`: 9000
- `translationCoverage`: 1000
- `limitedContext`: 1000

## Internal Confidence Dagilimi

- `low`: 51877
- `medium`: 0
- `high`: 3415

## Conflict Tur Dagilimi

- `keyTermOnlyInV4`: 952
- `keyTermMissingInV4`: 616
- `profileRelevantTermDropped`: 596

## Conflict Quality Dagilimi

- `likelyGoodSuppression`: 0
- `likelyUsefulV4Addition`: 218
- `likelyRiskyDrop`: 378
- `genericNeutral`: 350
- `needsManualReview`: 1218

## Ayet Kalite Siniflari

- `strongEvidenceAyah`: 392
- `weakEvidenceAyah`: 608
- `emptyEvidenceAyah`: 0
- `onlyDebugEvidenceAyah`: 15
- `conflictAffectedAyah`: 605
- `onlySingleSourceEvidenceAyah`: 3
- `missingKeyTermsAyah`: 3
- `missingRootExplanationAyah`: 737
- `lowCoverageAyah`: 359
- `riskyDropAyah`: 168
- `needsManualReviewAyah`: 514

## Suggested Next Action Dagilimi

- `noAction`: 171
- `inspectGate`: 18
- `keyTermRecoveryNeeded`: 3
- `rootExplanationNeeded`: 253
- `manualReviewNeeded`: 533
- `sourceDataNeeded`: 22

## En Cok Kullanilan Source ID'ler

- `canonical_word_analysis`: 31957
- `canonical_word_analysis_v4`: 31594
- `root_easy_only`: 8981
- `source_status_mapper`: 8000
- `verse_analysis_signals`: 5160
- `coverage_by_ayah`: 2000
- `tafsir_summary`: 1000
- `normalized_translations`: 1000
- `revelation_context`: 1000
- `missing_meaning_report`: 871
- `root_explanations`: 469
- `profile_specific_weak_helper`: 27

## Ornekler

### Empty Evidence Ayetleri

- Yok

### Weak Evidence Ayetleri

- `2:1` (genel_karma): items=13, userFacing=0, conflicts=0, action=keyTermRecoveryNeeded
- `2:9` (genel_karma): items=35, userFacing=1, conflicts=3, action=rootExplanationNeeded
- `2:10` (uyari_inkar): items=44, userFacing=3, conflicts=2, action=rootExplanationNeeded
- `2:12` (genel_karma): items=25, userFacing=0, conflicts=1, action=sourceDataNeeded
- `2:14` (genel_karma): items=43, userFacing=3, conflicts=5, action=manualReviewNeeded
- `2:15` (genel_karma): items=31, userFacing=0, conflicts=5, action=manualReviewNeeded
- `2:16` (yol_hidayet): items=38, userFacing=2, conflicts=2, action=rootExplanationNeeded
- `2:17` (ahiret): items=53, userFacing=4, conflicts=3, action=manualReviewNeeded
- `2:18` (yol_hidayet): items=26, userFacing=1, conflicts=1, action=manualReviewNeeded
- `2:19` (uyari_inkar): items=59, userFacing=3, conflicts=2, action=rootExplanationNeeded
- `2:20` (uyari_inkar): items=67, userFacing=3, conflicts=6, action=manualReviewNeeded
- `2:24` (ahiret): items=46, userFacing=3, conflicts=4, action=manualReviewNeeded
- `2:25` (ahiret): items=78, userFacing=4, conflicts=3, action=manualReviewNeeded
- `2:27` (genel_karma): items=55, userFacing=3, conflicts=1, action=rootExplanationNeeded
- `2:30` (genel_karma): items=64, userFacing=4, conflicts=3, action=rootExplanationNeeded
- `2:31` (genel_karma): items=53, userFacing=3, conflicts=4, action=manualReviewNeeded
- `2:33` (genel_karma): items=53, userFacing=4, conflicts=4, action=manualReviewNeeded
- `2:34` (uyari_inkar): items=45, userFacing=3, conflicts=1, action=rootExplanationNeeded
- `2:35` (ahiret): items=59, userFacing=2, conflicts=5, action=manualReviewNeeded
- `2:36` (genel_karma): items=58, userFacing=4, conflicts=3, action=manualReviewNeeded

### Conflict Etkilenen Ayetler

- `2:9` (genel_karma): items=35, userFacing=1, conflicts=3, action=rootExplanationNeeded
- `2:10` (uyari_inkar): items=44, userFacing=3, conflicts=2, action=rootExplanationNeeded
- `2:12` (genel_karma): items=25, userFacing=0, conflicts=1, action=sourceDataNeeded
- `2:14` (genel_karma): items=43, userFacing=3, conflicts=5, action=manualReviewNeeded
- `2:15` (genel_karma): items=31, userFacing=0, conflicts=5, action=manualReviewNeeded
- `2:16` (yol_hidayet): items=38, userFacing=2, conflicts=2, action=rootExplanationNeeded
- `2:17` (ahiret): items=53, userFacing=4, conflicts=3, action=manualReviewNeeded
- `2:18` (yol_hidayet): items=26, userFacing=1, conflicts=1, action=manualReviewNeeded
- `2:19` (uyari_inkar): items=59, userFacing=3, conflicts=2, action=rootExplanationNeeded
- `2:20` (uyari_inkar): items=67, userFacing=3, conflicts=6, action=manualReviewNeeded
- `2:24` (ahiret): items=46, userFacing=3, conflicts=4, action=manualReviewNeeded
- `2:25` (ahiret): items=78, userFacing=4, conflicts=3, action=manualReviewNeeded
- `2:27` (genel_karma): items=55, userFacing=3, conflicts=1, action=rootExplanationNeeded
- `2:30` (genel_karma): items=64, userFacing=4, conflicts=3, action=rootExplanationNeeded
- `2:31` (genel_karma): items=53, userFacing=3, conflicts=4, action=manualReviewNeeded
- `2:33` (genel_karma): items=53, userFacing=4, conflicts=4, action=manualReviewNeeded
- `2:34` (uyari_inkar): items=45, userFacing=3, conflicts=1, action=rootExplanationNeeded
- `2:35` (ahiret): items=59, userFacing=2, conflicts=5, action=manualReviewNeeded
- `2:36` (genel_karma): items=58, userFacing=4, conflicts=3, action=manualReviewNeeded
- `2:37` (rahmet_magfiret): items=39, userFacing=3, conflicts=1, action=rootExplanationNeeded

### Risky Drop Ayetleri

- `2:14` (genel_karma): items=43, userFacing=3, conflicts=5, action=manualReviewNeeded
- `2:17` (ahiret): items=53, userFacing=4, conflicts=3, action=manualReviewNeeded
- `2:20` (uyari_inkar): items=67, userFacing=3, conflicts=6, action=manualReviewNeeded
- `2:24` (ahiret): items=46, userFacing=3, conflicts=4, action=manualReviewNeeded
- `2:25` (ahiret): items=78, userFacing=4, conflicts=3, action=manualReviewNeeded
- `2:31` (genel_karma): items=53, userFacing=3, conflicts=4, action=manualReviewNeeded
- `2:36` (genel_karma): items=58, userFacing=4, conflicts=3, action=manualReviewNeeded
- `2:49` (kissa): items=61, userFacing=2, conflicts=9, action=manualReviewNeeded
- `2:59` (genel_karma): items=51, userFacing=4, conflicts=3, action=manualReviewNeeded
- `2:60` (kissa): items=83, userFacing=4, conflicts=6, action=manualReviewNeeded
- `2:61` (tevhid_birlik): items=125, userFacing=4, conflicts=3, action=manualReviewNeeded
- `2:66` (genel_karma): items=41, userFacing=3, conflicts=4, action=manualReviewNeeded
- `2:68` (kissa): items=53, userFacing=4, conflicts=3, action=manualReviewNeeded
- `2:75` (uyari_inkar): items=57, userFacing=4, conflicts=3, action=manualReviewNeeded
- `2:76` (genel_karma): items=62, userFacing=3, conflicts=6, action=manualReviewNeeded
- `2:81` (ahiret): items=44, userFacing=3, conflicts=6, action=manualReviewNeeded
- `2:84` (genel_karma): items=49, userFacing=4, conflicts=3, action=manualReviewNeeded
- `2:85` (ahiret): items=116, userFacing=3, conflicts=3, action=manualReviewNeeded
- `2:90` (uyari_inkar): items=68, userFacing=2, conflicts=9, action=manualReviewNeeded
- `2:93` (uyari_inkar): items=75, userFacing=3, conflicts=3, action=manualReviewNeeded

### Missing Root Explanation Ayetleri

- `2:7` (uyari_inkar): items=42, userFacing=4, conflicts=0, action=rootExplanationNeeded
- `2:9` (genel_karma): items=35, userFacing=1, conflicts=3, action=rootExplanationNeeded
- `2:10` (uyari_inkar): items=44, userFacing=3, conflicts=2, action=rootExplanationNeeded
- `2:13` (genel_karma): items=39, userFacing=5, conflicts=0, action=rootExplanationNeeded
- `2:14` (genel_karma): items=43, userFacing=3, conflicts=5, action=manualReviewNeeded
- `2:15` (genel_karma): items=31, userFacing=0, conflicts=5, action=manualReviewNeeded
- `2:16` (yol_hidayet): items=38, userFacing=2, conflicts=2, action=rootExplanationNeeded
- `2:17` (ahiret): items=53, userFacing=4, conflicts=3, action=manualReviewNeeded
- `2:18` (yol_hidayet): items=26, userFacing=1, conflicts=1, action=manualReviewNeeded
- `2:19` (uyari_inkar): items=59, userFacing=3, conflicts=2, action=rootExplanationNeeded
- `2:20` (uyari_inkar): items=67, userFacing=3, conflicts=6, action=manualReviewNeeded
- `2:22` (tevhid_birlik): items=58, userFacing=5, conflicts=0, action=rootExplanationNeeded
- `2:23` (dua_kulluk): items=61, userFacing=4, conflicts=0, action=rootExplanationNeeded
- `2:24` (ahiret): items=46, userFacing=3, conflicts=4, action=manualReviewNeeded
- `2:25` (ahiret): items=78, userFacing=4, conflicts=3, action=manualReviewNeeded
- `2:27` (genel_karma): items=55, userFacing=3, conflicts=1, action=rootExplanationNeeded
- `2:29` (genel_karma): items=51, userFacing=5, conflicts=0, action=rootExplanationNeeded
- `2:30` (genel_karma): items=64, userFacing=4, conflicts=3, action=rootExplanationNeeded
- `2:31` (genel_karma): items=53, userFacing=3, conflicts=4, action=manualReviewNeeded
- `2:33` (genel_karma): items=53, userFacing=4, conflicts=4, action=manualReviewNeeded

## Kisa Yorum

- Bu audit kullanici-facing yeni analiz cumlesi uretmez.
- Internal confidence, source support, conflict ve trace bilgileri sadece audit/debug icindir.
- v4 ve root_easy_only kaynaklari default veya runtime kaynagi yapilmadi.

## En Kucuk Guvenli Sonraki Adim

Global sonuc uzerinden en baskin risk sinifini secip sadece opt-in evidence gate icin kucuk bir iyilestirme paketi hazirlamak. Ozellikle `riskyDropAyah`, `needsManualReviewAyah` ve `missingRootExplanationAyah` dagilimlari karar icin ana sinyaldir.
