# Morphology / Canonical Alignment Audit

Bu rapor `quran_morphology.csv` ile `canonical_word_analysis_v4.json` arasındaki küçük lokasyon farklarını ve güvenli repair adaylarını inceler.

Snapshot:

- `data/analysis-snapshots/morphology-canonical-alignment-audit.sample.json`

İncelenen dosyalar:

- `data2/QURAN-NLP/data/quran/corpus/quran_morphology.csv`
- `data2/processed/canonical_word_analysis_v4.json`

Runtime, UI ve default source değiştirilmedi. Canonical dosya overwrite edilmedi.

## Kısa Sonuç

- Morphology CSV word lokasyonu: 77429
- Canonical v4 word lokasyonu: 77429
- Ortak lokasyon: 77424
- CSV-only lokasyon: 5
- Canonical-only lokasyon: 5
- Exact same-location güvenli field repair adayı: 0
- Riskli / kullanıcı-facing olmayan missing-field kayıtları: 27088

Önemli yorum: Bu farklar basit “root/lemma boş, CSV’den doldur” problemi değil. 10 lokasyonluk fark, belirli ayetlerde word-count veya token alignment farkı gibi görünüyor. Bu yüzden doğrudan field repair yapmak güvenli değil; suffix’li alignment repair candidate üretmeden önce ayet bazlı hizalama yapılmalı.

## Lokasyon Farkları

### CSV-only Lokasyonlar

Bu lokasyonlar CSV’de var, canonical v4’te aynı word index ile yok.

| Word key | CSV segment özeti | Muhtemel durum |
| --- | --- | --- |
| `15:7:8` | `DET + N`, root `Sdq`, lemma `SaAdiq` | Canonical 15:7’de son içerik kelimesi eksik görünüyor. |
| `27:20:12` | `DET + N`, root `gyb`, lemma `gaA^}ibiyn` | Canonical 27:20’de son içerik kelimesi eksik görünüyor. |
| `36:22:8` | `V + PRON`, root `rjE`, lemma `rajaEa` | Canonical 36:22’de son fiil/pronoun birleşimi eksik görünüyor. |
| `37:164:6` | `N`, root `Elm`, lemma `m~aEoluwm` | Canonical 37:164’te son içerik kelimesi eksik görünüyor. |
| `41:47:28` | `N`, root `$hd`, lemma `$ahiyd` | Canonical 41:47’de son içerik kelimesi eksik görünüyor. |

### Canonical-only Lokasyonlar

Bu lokasyonlar canonical v4’te var, CSV’de aynı word index ile yok.

| Word key | Canonical word | Durum |
| --- | --- | --- |
| `2:72:11` | `تَكۡتُمُونَ` | root/lemma/pos/morphology boş; gloss `you conceal`. |
| `2:181:14` | `عَلِيمٞ` | root/lemma/pos/morphology boş; meaning `bilen, alim`. |
| `8:6:12` | `يَنظُرُونَ` | root/lemma/pos/morphology boş; gloss `looking`. |
| `13:37:20` | `وَاقٖ` | root/lemma/pos/morphology boş; gloss `defender`. |
| `37:130:4` | `يَاسِينَ` | root/lemma/pos/morphology/gloss boş. |

## Ayet Bazlı Word Count Farkı

| Ayet | Canonical word count | Morphology word count | Delta |
| --- | ---: | ---: | ---: |
| `15:7` | 7 | 8 | -1 |
| `27:20` | 11 | 12 | -1 |
| `36:22` | 7 | 8 | -1 |
| `37:164` | 5 | 6 | -1 |
| `41:47` | 27 | 28 | -1 |
| `2:72` | 11 | 10 | +1 |
| `2:181` | 14 | 13 | +1 |
| `8:6` | 12 | 11 | +1 |
| `13:37` | 20 | 19 | +1 |
| `37:130` | 4 | 3 | +1 |

Bu tablo, farkların tekil field boşluğundan ziyade token alignment problemi olduğunu gösteriyor.

## Güvenli Repair Adayı Var mı?

Exact same-location kuralıyla güvenli repair adayı yok:

- `safeRepairCandidateCount`: 0

Neden:

- Canonical’da root/lemma/morphology boş görünen kayıtların büyük kısmı particle/pronoun/function segmentleri.
- Content segmentlerde canonical zaten root/lemma/morphology taşıyor.
- Canonical-only 5 kayıt için aynı word index’te CSV segmenti yok; bu yüzden direkt field repair yapılamaz.
- CSV-only 5 kayıt içerik taşıyor ama canonical’da aynı word index yok; bu field repair değil, alignment/word insertion veya verse-level reindex problemi.

## Missing Field Görünen Ama Repair Edilmemesi Gerekenler

Canonical’da root/lemma/pos/morphology eksik görünen çok kayıt var, fakat çoğu doğal olarak köksüz/işlevsel parçalar:

- Particle
- Pronoun
- Preposition + pronoun
- Relative/condition particles
- Negation/conjunction

Risk sayımları:

- `only particle/pronoun/function segments`: 18397
- `no content segment`: 20458
- `no missing repairable field`: 27088
- `multiple lemma candidates`: 476

Bu kayıtlar kullanıcı-facing keyTerms veya weak correspondence repair adayı sayılmamalı.

## Riskli Örnekler

Şunlar repair adayı gibi görünmemeli:

- `إِيَّاكَ`: pronoun, content segment değil.
- `وَإِيَّاكَ`: conjunction + pronoun.
- `عَلَيۡهِمۡ`: preposition + pronoun.
- `وَلَا`: conjunction + negation.
- `فِيهِۛ`: preposition + pronoun.
- `مِن`: preposition.

Bunları root/lemma ile zorla doldurmak keyTerms gürültüsünü artırır.

## Hangi Alanlar Repair Edilebilir?

Exact-location repair açısından:

- `root`: 0 güvenli aday
- `lemma`: 0 güvenli aday
- `pos`: 0 güvenli aday
- `morphology`: 0 güvenli aday

Alignment repair açısından potansiyel:

- CSV-only 5 içerik lokasyonu canonical’a ayet bazlı alignment ile geri kazandırılabilir.
- Canonical-only 5 kayıt ayet bazlı tokenization farkı nedeniyle re-evaluate edilebilir.

Bu ikinci seçenek field-level değil, verse-level repair candidate gerektirir.

## Suffix’li Repair Candidate Üretmeye Değer mi?

Evet, ama kapsam adı doğru olmalı:

Önerilen güvenli çıktı:

- `data/analysis-snapshots/morphology-alignment-repair-candidates.sample.json`

Bu çıktı canonical’ı değiştirmemeli. Sadece şu bilgileri taşımalı:

- Etkilenen 10 ayet/lokasyon.
- Canonical word listesi.
- Morphology word listesi.
- Olası missing/extra token açıklaması.
- User-facing repair önerisi yoksa `requiresManualReview: true`.

Neden manuel review gerekli:

- Bazı ayetlerde canonical kelimeler bir pozisyon kaymış gibi görünüyor.
- Bazı canonical-only kayıtlar ayetin sonuna eklenmiş empty morphology kayıtları gibi duruyor.
- CSV-only kayıtlar ise gerçek içerik kelimesi olabilir.
- Otomatik merge, yanlış ayet tokenization’ı üretme riski taşır.

## Kanıtlı Analiz İçin Karar

Bu audit sonucunda morfoloji kaynağını runtime’a bağlamak veya canonical v4’ü otomatik patchlemek doğru değil.

Güvenli karar:

- `quran_morphology.csv` build-input ve validation kaynağı olarak kalsın.
- Particle/pronoun segmentleri user-facing repair adayı olmasın.
- 5+5 alignment farkı için küçük, manuel review’lu suffix snapshot üretilebilir.
- Canonical v4 overwrite edilmemeli.

## Sonraki Küçük Adım

En güvenli sonraki paket:

1. `morphology-alignment-repair-candidates.sample.json` üret.
2. 10 ayeti ayet bazlı yan yana göster.
3. Her ayette canonical/morphology token listelerini karşılaştır.
4. `autoRepairAllowed: false`, `requiresManualReview: true` varsayılanı kullan.
5. Manuel karar sonrası ancak suffix’li `canonical_word_analysis_v5_candidate.json` gibi bir aday üret.
