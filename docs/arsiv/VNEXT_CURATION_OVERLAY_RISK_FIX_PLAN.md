# vNext Curation Overlay Risk Fix Plan

Bu plan full overlay risk audit sonucundaki `overlayTooAggressive` ve `needsManualReview` kayitlarini `verseKey + suppressedTerm` bazinda gruplar. Kod, runtime, UI, classifier ve CSV degistirilmedi.

## Ozet

- Toplam risk conflict: 68
- Odak conflict: 52
- Disarida birakilan overlayCorrectSuppression: 16
- Etkilenen ayet: 33
- Grup sayisi: 37
- `needs_human_review`: 25
- `remove_from_suppressed`: 10
- `move_to_profileBoundTerms`: 2

## Approved Pilot Icin Gereken Duzeltme Listesi

| Ayet | Suppressed term | Oneri | Evidence terms |
|---|---|---|---|
| 10:2 | doğru söylemek | `needs_human_review` | doğru söylemek |
| 10:2 | İnsanlar | `remove_from_suppressed` | İnsanlar; insanlardan birine vahyedilmesi; insanları uyarmak |
| 10:24 | ayırmak, fasıl | `needs_human_review` | ayırmak, fasıl |
| 10:92 | gün | `move_to_profileBoundTerms` | insanların çoğunun ayetlerden habersizliği |
| 10:92 | İnsanlar | `remove_from_suppressed` | İnsanlar |
| 11:7 | Gök | `needs_human_review` | göklerin ve yerin altı günde yaratılması |
| 11:7 | daha güzel | `needs_human_review` | hanginizin daha güzel amel yapacağını deneme |
| 12:46 | insanlar | `remove_from_suppressed` | insanlar; yorumun insanlara ulaştırılması |
| 16:25 | gün | `needs_human_review` | kıyamet günü günah yükünü taşıma; saptırılanların günahından pay |
| 16:27 | gün | `needs_human_review` | kıyamet günü rezil edilme |
| 17:35 | Hayır | `needs_human_review` | bunun daha hayırlı ve sonuç bakımından daha güzel oluşu |
| 18:46 | Hayır | `needs_human_review` | kalıcı salih amellerin sevap bakımından daha hayırlı oluşu |
| 20:134 | Önce | `needs_human_review` | azapla helak edilmeden önce elçi gönderilseydi deme ihtimali; aşağılanma ve rezil olmadan önce hidayet talebi iddiası |
| 22:25 | İnsanlar | `needs_human_review` | İnsanlar |
| 22:65 | Gök | `needs_human_review` | Gök |
| 24:19 | Dünya | `remove_from_suppressed` | Dünya; dünya ve ahirette acı azap |
| 24:2 | birlemek, tek | `needs_human_review` | birlemek, tek |
| 28:61 | Dünya | `remove_from_suppressed` | Dünya; güzel vaade kavuşan kişi ile dünya geçimliği verilen kişinin karşılaştırılması; dünya faydasının geçiciliği |
| 30:36 | İnsanlar | `remove_from_suppressed` | İnsanlar; insanlara rahmet tattırılınca sevinmeleri |
| 30:9 | Önce | `needs_human_review` | önceki kavimlerin akıbetine bakma |
| 39:68 | Gök | `remove_from_suppressed` | Gök; göklerde ve yerde olanların Allah’ın diledikleri hariç bayılıp/ölmesi |
| 48:18 | altında | `move_to_profileBoundTerms` | ağaç altında biat eden müminlerden Allah’ın razı olması |
| 49:12 | Bazı | `needs_human_review` | bazı zannın günah oluşu |
| 57:16 | önce | `needs_human_review` | önce kitap verilenler gibi olmama |
| 58:5 | Önce | `needs_human_review` | önceki karşı gelenlerin alçaltılması |
| 59:24 | Gök | `remove_from_suppressed` | Gök; göklerde ve yerde olanların tesbihi |
| 59:24 | güzel | `needs_human_review` | en güzel isimlerin Allah’a ait olması |
| 65:1 | düşman | `needs_human_review` | düşman |
| 7:129 | Önce | `needs_human_review` | Musa’dan önce ve sonra eziyet görme |
| 7:54 | gün | `needs_human_review` | göklerin ve yerin altı günde yaratılması; geceyle gündüzün örtülmesi/takibi; güneş, ay ve yıldızların emre boyun eğmesi |
| 8:54 | Önce | `needs_human_review` | Firavun ailesi ve öncekilerin durumu |
| 9:111 | mal, servet | `needs_human_review` | mal, servet |
| 9:118 | üç | `needs_human_review` | savaştan geri bırakılan üç kişinin durumu |
| 9:122 | ayırmak | `needs_human_review` | ayırmak |
| 9:39 | şey | `needs_human_review` | Allah’ın her şeye kadir olması |
| 9:55 | Dünya | `remove_from_suppressed` | Dünya; dünya hayatında bunlarla azap edilmesi |
| 9:85 | Dünya | `remove_from_suppressed` | Dünya; Allah’ın bunlarla dünyada azap etmesi |

## Karar

- Approved pilot icin once `remove_from_suppressed` ve `move_to_profileBoundTerms` onerileri uygulanmali.
- `needs_human_review` kalanlar ya manuel netlestirilmeli ya da pilot kapsamindan disarida birakilmali.
