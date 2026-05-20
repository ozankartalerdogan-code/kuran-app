# vNext Curation Overlay Risk Conflicts All

Bu rapor, curation overlay audit'te riskli gorunen cakismalari ayri siniflandirir. UI, default source, runtime, classifier ve kaynak veri degistirilmedi.

## Ozet

- Toplam riskli cakisma: 45
- Etkilenen ayet: 40
- overlayCorrectSuppression: 16
- overlayTooAggressive: 0
- needsManualReview: 29
- Full audit onerisi: hayir

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
| 7:54 | uyari_inkar | gün | göklerin ve yerin altı günde yaratılması | keyTermMissingInV4 | needsManualReview | needsManualReview |
| 7:54 | uyari_inkar | gün | geceyle gündüzün örtülmesi/takibi | keyTermMissingInV4 | needsManualReview | needsManualReview |
| 7:54 | uyari_inkar | gün | güneş, ay ve yıldızların emre boyun eğmesi | keyTermMissingInV4 | needsManualReview | needsManualReview |
| 7:129 | kissa | Önce | Musa’dan önce ve sonra eziyet görme | keyTermMissingInV4 | genericNeutral | needsManualReview |
| 8:19 | tevhid_birlik | Açtı | Açtı | keyTermMissingInV4 | likelyRiskyDrop | overlayCorrectSuppression |
| 8:54 | kissa | Önce | Firavun ailesi ve öncekilerin durumu | keyTermMissingInV4 | genericNeutral | needsManualReview |
| 9:6 | uyari_inkar | İman etti | İman etti | keyTermMissingInV4 | likelyRiskyDrop | overlayCorrectSuppression |
| 9:39 | uyari_inkar | şey | Allah’ın her şeye kadir olması | keyTermMissingInV4 | genericNeutral | needsManualReview |
| 9:94 | genel_karma | amel, iş | amel, iş | keyTermMissingInV4 | likelyRiskyDrop | overlayCorrectSuppression |
| 9:111 | emir_yasak | mal, servet | mal, servet | keyTermMissingInV4 | likelyRiskyDrop | needsManualReview |
| 9:118 | rahmet_magfiret | üç | savaştan geri bırakılan üç kişinin durumu | keyTermOnlyInV4 | needsManualReview | needsManualReview |
| 9:122 | ahiret | ayırmak | ayırmak | keyTermMissingInV4 | likelyRiskyDrop | needsManualReview |
| 10:2 | uyari_inkar | doğru söylemek | doğru söylemek | keyTermMissingInV4 | likelyRiskyDrop | needsManualReview |
| 10:24 | tevhid_birlik | ayırmak, fasıl | ayırmak, fasıl | keyTermMissingInV4 | likelyRiskyDrop | needsManualReview |
| 11:7 | ahiret | Gök | göklerin ve yerin altı günde yaratılması | keyTermMissingInV4 | needsManualReview | needsManualReview |
| 11:7 | ahiret | daha güzel | hanginizin daha güzel amel yapacağını deneme | keyTermMissingInV4 | needsManualReview | needsManualReview |
| 16:25 | yol_hidayet | gün | kıyamet günü günah yükünü taşıma | keyTermMissingInV4 | needsManualReview | needsManualReview |
| 16:25 | yol_hidayet | gün | saptırılanların günahından pay | keyTermMissingInV4 | needsManualReview | needsManualReview |
| 16:27 | kissa | gün | kıyamet günü rezil edilme | keyTermMissingInV4 | needsManualReview | needsManualReview |
| 17:35 | ahiret | Hayır | bunun daha hayırlı ve sonuç bakımından daha güzel oluşu | keyTermMissingInV4 | needsManualReview | needsManualReview |
| 18:46 | genel_karma | Hayır | kalıcı salih amellerin sevap bakımından daha hayırlı oluşu | keyTermMissingInV4 | needsManualReview | needsManualReview |
| 20:134 | genel_karma | Önce | azapla helak edilmeden önce elçi gönderilseydi deme ihtimali | keyTermMissingInV4 | genericNeutral | needsManualReview |
| 20:134 | genel_karma | Önce | aşağılanma ve rezil olmadan önce hidayet talebi iddiası | keyTermMissingInV4 | genericNeutral | needsManualReview |
| 22:25 | uyari_inkar | İnsanlar | İnsanlar | keyTermMissingInV4 | likelyRiskyDrop | needsManualReview |
| 22:65 | genel_karma | Gök | Gök | keyTermMissingInV4 | likelyRiskyDrop | needsManualReview |
| 24:2 | tevhid_birlik | birlemek, tek | birlemek, tek | keyTermMissingInV4 | likelyRiskyDrop | needsManualReview |
| 29:38 | yol_hidayet | amel, iş | amel, iş | keyTermMissingInV4 | likelyRiskyDrop | overlayCorrectSuppression |
| 30:9 | genel_karma | Önce | önceki kavimlerin akıbetine bakma | keyTermMissingInV4 | genericNeutral | needsManualReview |
| 41:5 | uyari_inkar | amel, iş | amel, iş | keyTermMissingInV4 | likelyRiskyDrop | overlayCorrectSuppression |
| 47:35 | dua_kulluk | amel, iş | amel, iş | keyTermMissingInV4 | likelyRiskyDrop | overlayCorrectSuppression |
| 49:12 | emir_yasak | Bazı | bazı zannın günah oluşu | keyTermMissingInV4 | genericNeutral | needsManualReview |
| 52:21 | tevhid_birlik | amel, iş | amel, iş | keyTermMissingInV4 | likelyRiskyDrop | overlayCorrectSuppression |
| 57:16 | uyari_inkar | önce | önce kitap verilenler gibi olmama | keyTermMissingInV4 | genericNeutral | needsManualReview |
| 58:5 | uyari_inkar | Önce | önceki karşı gelenlerin alçaltılması | keyTermMissingInV4 | genericNeutral | needsManualReview |
| 58:11 | genel_karma | amel, iş | amel, iş | keyTermMissingInV4 | likelyRiskyDrop | overlayCorrectSuppression |
| 59:24 | genel_karma | güzel | en güzel isimlerin Allah’a ait olması | keyTermMissingInV4 | needsManualReview | needsManualReview |
| 65:1 | genel_karma | düşman | düşman | keyTermMissingInV4 | likelyRiskyDrop | needsManualReview |
| 76:2 | uyari_inkar | İşitti | İşitti | keyTermMissingInV4 | likelyRiskyDrop | overlayCorrectSuppression |

## Karar

- Full audit'e gecmeden once overlayTooAggressive ve needsManualReview kayitlari incelenmeli.
