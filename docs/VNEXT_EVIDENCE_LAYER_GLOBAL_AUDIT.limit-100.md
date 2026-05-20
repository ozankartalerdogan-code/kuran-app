# vNext Evidence Layer Global Audit

Bu rapor vNext Evidence Layer'in tum ayetler uzerinde inspect-only global audit sonucudur. Runtime, UI, default source, decision ve preview davranisi degistirilmedi. `canonical_word_analysis_v4` ve `root_explanations_tr_v2_easy_only` yalniz opt-in evidence source olarak kullanildi.

## Kapsam

- Toplam ayet: 100
- Islenen ayet: 100
- Hata veren ayet: 0
- Audit modu: limit (100)
- Runtime/default source degisti mi?: hayir
- UI degisti mi?: hayir
- v4 default yapildi mi?: hayir
- root easy-only runtime'a baglandi mi?: hayir

## Global Metrikler

- Toplam evidence item: 4745
- Conflict flag toplami: 172
- Conflict etkilenen ayet: 55
- Single-source item: 2049
- Source support 2+ item: 2696
- User-facing allowed true: 321
- User-facing allowed false: 4424
- Debug-only item: 4424
- v4 katkisi: 2609
- root_easy_only katkisi: 709

## Performans

- Toplam sure: 27.1 sn
- Ortalama: 270.9 ms/ayet
- Context build toplam: 25.6 sn
- Evidence build toplam: 1.2 sn
- Classification toplam: 0.1 sn
- Context build ortalama: 255.9 ms/ayet
- Evidence build ortalama: 12.4 ms/ayet
- Classification ortalama: 1.5 ms/ayet

## Evidence Kind Dagilimi

- `keyTerm`: 464
- `root`: 883
- `lemma`: 1317
- `rootExplanation`: 709
- `weakCorrespondence`: 72
- `coverage`: 200
- `sourceStatus`: 900
- `translationCoverage`: 100
- `limitedContext`: 100

## Internal Confidence Dagilimi

- `low`: 4424
- `medium`: 0
- `high`: 321

## Conflict Tur Dagilimi

- `keyTermOnlyInV4`: 85
- `keyTermMissingInV4`: 45
- `profileRelevantTermDropped`: 42

## Conflict Quality Dagilimi

- `likelyGoodSuppression`: 10
- `likelyUsefulV4Addition`: 1
- `likelyRiskyDrop`: 8
- `needsManualReview`: 153

## Ayet Kalite Siniflari

- `strongEvidenceAyah`: 44
- `weakEvidenceAyah`: 56
- `emptyEvidenceAyah`: 0
- `onlyDebugEvidenceAyah`: 4
- `conflictAffectedAyah`: 55
- `onlySingleSourceEvidenceAyah`: 1
- `missingKeyTermsAyah`: 1
- `missingRootExplanationAyah`: 66
- `lowCoverageAyah`: 46
- `riskyDropAyah`: 4
- `needsManualReviewAyah`: 55

## Suggested Next Action Dagilimi

- `noAction`: 26
- `inspectGate`: 0
- `keyTermRecoveryNeeded`: 1
- `rootExplanationNeeded`: 16
- `manualReviewNeeded`: 55
- `sourceDataNeeded`: 2

## En Cok Kullanilan Source ID'ler

- `canonical_word_analysis`: 2619
- `canonical_word_analysis_v4`: 2609
- `source_status_mapper`: 800
- `root_easy_only`: 709
- `verse_analysis_signals`: 464
- `coverage_by_ayah`: 200
- `tafsir_summary`: 100
- `normalized_translations`: 100
- `revelation_context`: 100
- `missing_meaning_report`: 72
- `root_explanations`: 40
- `profile_specific_weak_helper`: 1

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
