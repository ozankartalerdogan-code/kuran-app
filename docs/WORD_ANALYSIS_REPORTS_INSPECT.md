# Word Analysis Reports Inspect

Tarih: 2026-05-14

Bu rapor `data/word-analysis/reports` altindaki coverage ve missing-meanings kaynaklarini inspect-only olarak inceler. Runtime, UI, default source ve veri dosyalari degistirilmedi.

## Kisa Sonuc

Bu iki dosya Kanitli Analiz icindeki `weakOrMissingCorrespondences` icin gercekten ilgili kaynaklardir. Ancak `missing-meanings.json` ham haliyle dogrudan kullaniciya basilmamali. Icinde cok faydali content eksikleri de var, cok gurultulu ek/zamir/parca kayitlari da var.

En dogru kullanim:

- Coverage ratio ve "bu ayette kelime analizi tam/kismi" sinyali guvenli.
- Missing entries kullanici-facing alana yalniz filtrelenmis content candidate olarak girmeli.
- `lemma/root` olmayan kisa Arapca parcalar normal kullaniciya gosterilmemeli.

## Kapsam

### `coverage-by-ayah.json`

| Metrik | Deger |
|---|---:|
| Ayet kaydi | 6236 |
| Full coverage ayet | 489 |
| Partial coverage ayet | 5747 |
| Ortalama coverageRatio | 0.7989 |
| Median coverageRatio | 0.8169 |
| Minimum coverageRatio | 0 |
| Maximum coverageRatio | 1 |
| hasMorphology true | 6236 |

Alanlar:

- `surahId`
- `ayahNumber`
- `totalWords`
- `matchedWords`
- `coverageRatio`
- `hasMorphology`

### `missing-meanings.json`

| Metrik | Deger |
|---|---:|
| Missing kayit | 24338 |
| Etkilenen ayet | 5747 |
| Reason degeri | `matching_gap` |
| lemma dolu | 13038 |
| root dolu | 12131 |
| arabic dolu | 24338 |
| Bir ayette maksimum missing kayit | 47 |

Alanlar:

- `surahId`
- `ayahNumber`
- `wordIndex`
- `lemma`
- `root`
- `arabic`
- `reason`

## Veri Kalitesi

### Guclu Taraflar

- Tum 6236 ayet icin coverage kaydi var.
- `hasMorphology` tum ayetlerde true.
- Missing listesinde cok sayida gercek content eksigi var:
  - `خدع`
  - `شعر`
  - `مرض`
  - `فسد`
  - `سفه`
  - `ثقل`
  - `خمر`
  - `يسر`
  - `جنب`
  - `سجن`
- `2:173`, `5:90`, `49:12`, `99:7`, `101:6`, `12:100`, `4:29` gibi ayetlerde anlamli eksik alanlari yakalayabiliyor.

### Gurultu Taraflari

Top arabic missing parcalari:

- `وا۟`: 2852
- `ونَ`: 2401
- `نَا`: 1359
- `هَا`: 1047
- `وٓا۟`: 512
- `نَٰ`: 373
- `تُمْ`: 362
- `تَ`: 239

Bu parcalar cogunlukla ek, zamir, suffix veya segment matching farki gibi duruyor. Kullanici-facing weak correspondence olarak gosterilirse gurultu uretir.

## Heuristic Siniflandirma

Ham missing kayitlar uzerinde kaba siniflandirma:

| Sinif | Adet | Anlam |
|---|---:|---|
| content_candidate | 12782 | lemma/root dolu ve kullanilabilir aday olabilir |
| no_lemma_root | 10703 | sadece arabic var; cogunlukla parca/ek riski yuksek |
| short_particle_or_suffix | 597 | kisa ek/zamir/parca riski |
| short_label | 256 | kisa label; review gerekir |

Bu oran, kaynagin ham halinin kullanici-facing icin fazla gurultulu oldugunu gosterir.

## Temsilci Ayetler

- `1:5`: coverage 1.0, missing 0. Guvenli.
- `1:7`: coverage 0.9333, missing sadece `تَ`; kullaniciya gosterilmemeli.
- `2:7`: coverage 1.0, missing 0. Guvenli.
- `2:173`: coverage 0.8718, missing 5. `kan`, `et`, `domuz`, `zaruret`, `günah/ithm` alanlari content candidate. Faydalı.
- `112:1`: coverage 1.0, missing 0. Guvenli.
- `2:177`: coverage 0.875, missing 13. Hem content eksigi hem `وا۟` gibi gurultu var. Filtre gerekli.
- `5:90`: coverage 0.75, missing 8. `içki`, `kumar`, `dikili taş`, `fal okları`, `sakınma` alanlari faydali; `وا۟`, `ونَ` gurultu.
- `39:53`: coverage 0.8621, missing 4. `israf/asiri gitme`, `umut kesmeme` faydali; `وا۟` gurultu.
- `49:12`: coverage 0.8163, missing 9. `sakınma`, `günah`, `tecessüs`, `et` gibi content var; ek parcalari filtrelenmeli.
- `99:7`: coverage 0.75, missing 2. `miskal/agirlik`, `zerre` faydali.
- `101:6`: coverage 0.6667, missing 2. `ثقل` faydali; `أَمّا` muhtemelen kullanici-facing degil.
- `12:100`: coverage 0.8243, missing 13. Kissa sahnesi icin content var; zamir/ekler filtrelenmeli.
- `20:17`: coverage 1.0, missing 0. Guvenli.
- `4:29`: coverage 0.8611, missing 5. `ticaret`, `karşılıklı rıza` faydali; `وا۟` parcalari filtrelenmeli.

## Kanitli Analiz'de Guvenli Kullanim

Guvenli:

- `coverageRatio` kaynak durumu veya debug/sourceStatus icin kullanilabilir.
- `coverageRatio < 1` ise "kelime analizi kismi" gibi teknik olmayan not uretilebilir.
- Missing entries yalniz su kosullarda kullanici-facing olabilir:
  - `lemma` veya `root` dolu.
  - `arabic` tek harf/ek/zamir gibi degil.
  - `wordIndex` ve ayet icindeki kelime baglami var.
  - `reason` sadece teknik label olarak debug'da kalir, kullaniciya basılmaz.
- Weak correspondence gruplari profile gore anlam alanina cevrilebilir:
  - yiyecek/zaruret
  - emir/yasak
  - ahiret/tarti
  - kissa/sahne
  - rahmet/tovbe

## Riskli Kullanim

Riskli:

- Ham `arabic` label'i kullaniciya basmak.
- `lemma/root` bos olan kayitlari weak label olarak gostermek.
- `وا۟`, `ونَ`, `نَا`, `تَ`, `هَا` gibi segmentleri analiz sinyali yapmak.
- Her `matching_gap` kaydini gercek anlamsal eksik gibi yorumlamak.
- Coverage ratio dusuk diye ayetin analizini zayif/yanlis ilan etmek.
- Reason metnini kullanici-facing notlara tasimak.

## Sonraki Kucuk Adim

En guvenli sonraki paket:

`missing-meanings` icin source-backed filter audit yazmak.

Bu audit:

- `lemma/root` dolu content candidate kayitlari ayirsin.
- `lemma/root` bos veya kisa segmentleri bastirsin.
- Ilk 100/500/1000 ayette mevcut `weakCorrespondencesPreview` ile filtrelenmis adaylari karsilastirsin.
- `2:173`, `5:90`, `49:12`, `99:7`, `101:6`, `4:29` gibi ayetlerde kullanici-facing grup kalitesi raporlansin.

Onerilen filtre:

- visible weak candidate:
  - `lemma` veya `root` dolu
  - `arabic` uzunlugu 2'den buyuk
  - `arabic` yalniz ek/zamir listesinde degil
  - profile/category ile iliskiliyse one cikar
- suppressed weak candidate:
  - `lemma/root` bos
  - kisa suffix/particle
  - tekrar eden segment
  - sadece teknik matching gap

## Karar

Bu kaynak Kanitli Analiz icin degerli ve dogrudan ilgilidir. Ancak ham haliyle kullanici-facing degil. Once filtrelenmis weak correspondence audit yapilmali; sonra preview logic'e dar ve source-backed bir iyilestirme olarak dusunulmeli.
