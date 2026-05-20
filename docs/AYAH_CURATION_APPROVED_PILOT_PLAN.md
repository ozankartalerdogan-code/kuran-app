# Ayah Curation Approved Pilot Plan

Bu plan v3 curation overlay dosyasini runtime/UI/default davranisina baglamadan iki havuza ayirir: human-review pool ve ilk 100 approved audit-guidance pilot adayi.

## Ciktilar

- Manual review pool: `data/curation/ayah_curation_overlay_manual_review_pool.csv`
- Approved pilot 100: `data/curation/ayah_curation_overlay_approved_pilot_100.csv`

## Sayilar

- totalOverlayRows: 400
- manualReviewConflictCount: 29
- manualReviewPoolRows: 24
- riskAffectedRowsExcludedFromPilot: 40
- safeRowsAvailable: 360
- approvedPilotRows: 100

## Approved Pilot Profile Dagilimi

- `genel_karma`: 11
- `uyari_inkar`: 11
- `ahiret`: 10
- `kissa`: 10
- `dua_kulluk`: 10
- `yol_hidayet`: 10
- `tevhid_birlik`: 10
- `rahmet_magfiret`: 10
- `emir_yasak`: 10
- `hukum_istisna`: 8

## Manual Review Pool Profile Dagilimi

- `emir_yasak`: 2
- `uyari_inkar`: 6
- `genel_karma`: 6
- `tevhid_birlik`: 2
- `kissa`: 3
- `yol_hidayet`: 1
- `ahiret`: 3
- `rahmet_magfiret`: 1

## Riskli Satirlar Neden Disarida?

- `needsManualReview` conflict tasiyan ayetlerde suppressed term, required/profile-bound concept ile anlamli bicimde cakismis olabilir.
- Bu satirlar approved pilot icinde audit-guidance olarak bile otomatik kullanilmamali.
- Pilot disi kalan diger riskli ayetler overlayCorrectSuppression olsa bile ilk 100 pilotun temiz kalmasi icin ayrildi.

## Approved Pilot Nasil Test Edilmeli?

- Pilot satirlari user-facing karar degil, audit-guidance olarak okunmali.
- `reviewStatus=approved_candidate` sadece bu pilot CSV icinde gecerlidir; ana overlay runtime davranisini degistirmez.
- Ilk test: approved pilot 100 icin audit-only overlay impact calistir.
- Kontrol: overlayTooAggressive=0, needsManualReview=0, source/default/UI degismemis olmali.
- Sonra ancak small opt-in guidance helper planlanmali.
