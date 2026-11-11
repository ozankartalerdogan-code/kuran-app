# vNext Curation Overlay Risk Conflicts Limit 1000

Bu rapor, curation overlay audit'te riskli gorunen cakismalari ayri siniflandirir. UI, default source, runtime, classifier ve kaynak veri degistirilmedi.

## Ozet

- Toplam riskli cakisma: 7
- Etkilenen ayet: 7
- overlayCorrectSuppression: 7
- overlayTooAggressive: 0
- needsManualReview: 0
- Full audit onerisi: evet

## Duzeltilmesi Gereken Overlay Satirlari

- Yok.

## Tum Risk Kayitlari

| Ayet | Profile | Suppressed | Evidence | Conflict | Classifier | Sinif |
|---|---|---|---|---|---|---|
| 3:120 | tevhid_birlik | amel, iş | amel, iş | keyTermMissingInV4 | likelyRiskyDrop | overlayCorrectSuppression |
| 4:46 | genel_karma | İman etti | İman etti | keyTermMissingInV4 | likelyRiskyDrop | overlayCorrectSuppression |
| 5:42 | uyari_inkar | İşitti | İşitti | keyTermMissingInV4 | likelyRiskyDrop | overlayCorrectSuppression |
| 5:52 | uyari_inkar | Açtı | Açtı | keyTermMissingInV4 | likelyRiskyDrop | overlayCorrectSuppression |
| 5:71 | rahmet_magfiret | amel, iş | amel, iş | keyTermMissingInV4 | likelyRiskyDrop | overlayCorrectSuppression |
| 5:90 | emir_yasak | amel, iş | amel, iş | keyTermMissingInV4 | likelyRiskyDrop | overlayCorrectSuppression |
| 6:60 | ahiret | amel, iş | amel, iş | keyTermMissingInV4 | likelyRiskyDrop | overlayCorrectSuppression |

## Karar

- Riskli kayitlarin tamami overlayCorrectSuppression gorunuyor; full audit'e gecmek guvenli olabilir.
