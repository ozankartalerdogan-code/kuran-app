# Fidelity Source Inspect

Tarih: 2026-05-14

Bu rapor `data/fidelity` klasorunu inspect-only olarak inceler. Runtime, UI, default source ve veri dosyalari degistirilmedi.

## Kisa Sonuc

`data/fidelity/by-surah/index.json` kapsami guclu, fakat su haliyle bekledigimiz anlamda ayrintili "kelime fidelity / weak correspondence" deposu degil. Yapi, `meal-comparison` kaynagina cok benziyor: ayet bazinda coklu meal `comparisons` ve source metadata tasiyor.

JSON source hattinda kullaniciya gorunen `weakOrMissingCorrespondences` sinyali esas olarak `data/word-analysis/reports` kaynaklarindan geliyor. `data/fidelity` ise mevcut adapter uzerinden daha cok `source`, `level`, `status`, `comparisons` ve `sources` bilgisi sagliyor.

## Kapsam

| Metrik | Deger |
|---|---:|
| JSON dosyasi | 1 |
| Ana dosya | `data/fidelity/by-surah/index.json` |
| Dosya boyutu | ~161 MB |
| Ayet kaydi | 6236 |
| Toplam comparison entry | 229085 |
| Unique source | 37 |
| Status `available` | 5861 |
| Status `insufficient_data` | 375 |
| Minimum comparison count | 31 |
| Maximum comparison count | 37 |
| Ortalama comparison count | 36.74 |

## Dosya Yapisi

Ayet kaydi alanlari:

- `surahId`
- `ayahNumber`
- `status`
- `missingReason`
- `comparisons`
- `sources`

Comparison entry alanlari:

- `sourceName`
- `text`
- `sourceUrl`
- `status`

Source metadata alanlari:

- `sourceName`
- `sourceType`
- `surahId`
- `ayahStart`
- `ayahEnd`
- `retrievedAt`
- `originalUrl`
- `confidence`
- `dataType`
- `usageClass`
- `license`

## Ornek Ayetler

Kontrol edilen temsilci ayetler:

- `1:5`: available, 36 comparisons
- `1:7`: available, 36 comparisons
- `2:7`: available, 37 comparisons
- `2:173`: available, 37 comparisons
- `112:1`: available, 37 comparisons
- `2:177`: available, 37 comparisons
- `5:90`: available, 37 comparisons
- `39:53`: available, 37 comparisons
- `49:12`: available, 37 comparisons
- `99:7`: available, 37 comparisons
- `101:6`: available, 37 comparisons
- `12:100`: available, 36 comparisons
- `20:17`: available, 37 comparisons
- `4:29`: available, 37 comparisons

Bu orneklerde fidelity kaynagi, ayet bazinda meal coverage/source diversity icin faydali gorunuyor. Ancak kelime bazli weak/missing correspondence verisi bu dosyada bulunmuyor.

## Veri Boslugu ve Format Sorunlari

- Malformed JSON tespit edilmedi.
- Toplam 6236 ayet kaydi var.
- 375 ayette `status: insufficient_data` var.
- Her ayette en az 31 comparison entry var; tamamen bos ayet yok.
- `level` gibi dogrudan record alanlari yok; adapter `status === available` ise `medium` level turetiyor.
- Comparison text alanlari meal-comparison ile ayni kaynaktan geldigi icin encoding kalintisi riski aynen gecerlidir.

## Kanitli Analiz'de Guvenli Kullanim

Guvenli kullanim alanlari:

- Fidelity/source metadata mevcut mu?
- Ayette kac meal/source comparison var?
- Source confidence dagilimi nasil?
- Source diversity sinyali:
  - official
  - github
  - primary
  - github_verified
- Analysis card sourceStatus icin teknik olmayan kaynak kapsami:
  - "Meal karsilastirma kaynaklari mevcut."
  - "Birden fazla meal kaynagi karsilastirmaya dahil."
- Decision layer icin yalniz cok genel sinyal:
  - comparison count
  - status available / insufficient_data
  - source confidence count

## Riskli Kullanim

Riskli kullanim alanlari:

- Bu dosyadan kelime bazli weak correspondence uretmek.
- `comparisons.text` alanindan ham phrase extraction yapmak.
- Encoding kalintili meal textlerini kullaniciya basmak.
- Source confidence alanini dini/tefsiri guvenilirlik gibi yorumlamak.
- `status: available` degerini "ayet analizi kesin dogru" anlaminda kullanmak.
- `fidelity` adindan dolayi bu dosyayi kelime-meal eslesme dogrulugu olarak yorumlamak.

## Mevcut Kodda Durum

- `packages/core/src/adapters/fidelityAdapter.ts` bu dosyayi okuyor.
- Adapter sonucunda `source`, `level`, `notes`, `comparisons`, `sources`, `status` donuyor.
- `packages/core/src/analysis/verseAnalysisContext.ts` JSON source hattinda `coverageRatio` ve `weakOrMissingCorrespondences` icin `data/word-analysis/reports` kaynaklarini kullaniyor.
- Bu nedenle Kanitli Analiz'deki weak/missing sinyali icin asil incelenmesi gereken kaynak `data/word-analysis/reports` klasorudur.

## Sonraki Kucuk Adim

Fidelity klasoru icin yeni runtime kullanimi eklemek yerine siradaki en guvenli adim:

- `data/word-analysis/reports/coverage-by-ayah.json`
- `data/word-analysis/reports/missing-meanings.json`

kaynaklarini inspect etmek.

Bu rapor su sorulara cevap vermeli:

- `weakOrMissingCorrespondences` kac ayette dolu?
- Eksikler hangi root/lemma/word alanlarinda yogunlasiyor?
- v4 ve root v2/easy-only enrichment sonrasi hangi eksikler gercek risk olarak kaliyor?
- Kullaniciya gosterilen "Dikkat isteyen karsilik alanlari" ne kadar temiz?

## Karar

`data/fidelity` su an Kanitli Analiz icin degerli ama sinirli bir kaynak:

- Coverage/source diversity icin saklansin.
- Kelime bazli fidelity sinyali olarak genisletilmesin.
- Phrase extraction icin kullanilmasin.
- Weak/missing correspondence iyilestirmesi icin `word-analysis reports` fazina gecilsin.
