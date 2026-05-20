# vNext Evidence Layer Conflict Audit

Bu rapor `vnext-evidence-layer.v2-sources.sample.json` snapshot'indaki keyTerm conflict flag'lerini ortak conflict classifier ile siniflandirir. Runtime, UI, default source, decision ve preview davranisi degistirilmedi.

## Kapsam

- Toplam conflict: 65
- Incelenen ayet sayisi: 12
- Evidence kind: keyTerm conflict'leri
- v4 default yapildi mi?: hayir
- root easy-only runtime'a baglandi mi?: hayir

## Conflict Tur Dagilimi

- `keyTermOnlyInV4`: 30
- `keyTermMissingInV4`: 18
- `profileRelevantTermDropped`: 17

## Kalite Siniflandirmasi

- `likelyGoodSuppression`: 0
- `likelyUsefulV4Addition`: 21
- `likelyRiskyDrop`: 16
- `genericNeutral`: 19
- `needsManualReview`: 9

## Reason Code Dagilimi

- `particle_or_formula`: 19
- `source_backed_content_added`: 15
- `content_needs_profile_check`: 15
- `content_term_dropped`: 8
- `profile_relevant_content_dropped`: 8

## Term Family Dagilimi

- `particle_or_formula`: 19
- `action_term`: 11
- `unclear`: 9
- `mercy_term`: 8
- `afterlife_term`: 7
- `warning_term`: 6
- `story_term`: 5

## Conflict Yogun Ayetler

- `5:90`: 16
- `5:3`: 12
- `49:12`: 12
- `39:53`: 8
- `12:100`: 6
- `12:4`: 3
- `2:10`: 2
- `7:156`: 2
- `40:60`: 1
- `99:7`: 1
- `99:8`: 1
- `101:6`: 1

## En Riskli 10 Ornek

- `12:100` (kissa, profileRelevantTermDropped): Secde etti -> likelyRiskyDrop / profile_relevant_content_dropped
- `12:4` (kissa, profileRelevantTermDropped): Secde etti -> likelyRiskyDrop / profile_relevant_content_dropped
- `39:53` (rahmet_magfiret, profileRelevantTermDropped): çok bağışlayan -> likelyRiskyDrop / profile_relevant_content_dropped
- `39:53` (rahmet_magfiret, profileRelevantTermDropped): çok bağışlayan -> likelyRiskyDrop / profile_relevant_content_dropped
- `5:90` (emir_yasak, profileRelevantTermDropped): amel, iş -> likelyRiskyDrop / content_term_dropped
- `5:90` (emir_yasak, profileRelevantTermDropped): Şeytan -> likelyRiskyDrop / content_term_dropped
- `5:90` (emir_yasak, profileRelevantTermDropped): amel, iş -> likelyRiskyDrop / content_term_dropped
- `5:90` (emir_yasak, profileRelevantTermDropped): Şeytan -> likelyRiskyDrop / content_term_dropped
- `12:100` (kissa, keyTermMissingInV4): Secde etti -> likelyRiskyDrop / profile_relevant_content_dropped
- `12:4` (kissa, keyTermMissingInV4): Secde etti -> likelyRiskyDrop / profile_relevant_content_dropped

## En Iyi v4 Temizlik Ornekleri

- Yok

## Faydalı v4 Ekleme Ornekleri

- `101:6` (ahiret, keyTermOnlyInV4): ağırlaşmak -> likelyUsefulV4Addition / source_backed_content_added
- `12:100` (kissa, keyTermOnlyInV4): yükseltmek -> likelyUsefulV4Addition / content_needs_profile_check
- `12:100` (kissa, keyTermOnlyInV4): düştü -> likelyUsefulV4Addition / content_needs_profile_check
- `12:4` (kissa, keyTermOnlyInV4): yıldızlar -> likelyUsefulV4Addition / source_backed_content_added
- `2:10` (uyari_inkar, keyTermOnlyInV4): hastalık -> likelyUsefulV4Addition / source_backed_content_added
- `2:10` (uyari_inkar, keyTermOnlyInV4): hastalık -> likelyUsefulV4Addition / source_backed_content_added
- `39:53` (rahmet_magfiret, keyTermOnlyInV4): israf etmek -> likelyUsefulV4Addition / content_needs_profile_check
- `39:53` (rahmet_magfiret, keyTermOnlyInV4): ümitsizliğe düşmek -> likelyUsefulV4Addition / source_backed_content_added
- `39:53` (rahmet_magfiret, keyTermOnlyInV4): israf etmek -> likelyUsefulV4Addition / content_needs_profile_check
- `39:53` (rahmet_magfiret, keyTermOnlyInV4): ümitsizliğe düşmek -> likelyUsefulV4Addition / source_backed_content_added

## Generic Neutral Ornekleri

- `12:100` (kissa, profileRelevantTermDropped): İşte o -> genericNeutral / particle_or_formula
- `49:12` (emir_yasak, profileRelevantTermDropped): çok, pek çok -> genericNeutral / particle_or_formula
- `49:12` (emir_yasak, profileRelevantTermDropped): Bazı -> genericNeutral / particle_or_formula
- `49:12` (emir_yasak, profileRelevantTermDropped): çok, pek çok -> genericNeutral / particle_or_formula
- `49:12` (emir_yasak, profileRelevantTermDropped): Bazı -> genericNeutral / particle_or_formula
- `5:3` (hukum_istisna, profileRelevantTermDropped): başka, dışında -> genericNeutral / particle_or_formula
- `5:3` (hukum_istisna, profileRelevantTermDropped): İşte o -> genericNeutral / particle_or_formula
- `5:3` (hukum_istisna, profileRelevantTermDropped): başka, dışında -> genericNeutral / particle_or_formula
- `5:3` (hukum_istisna, profileRelevantTermDropped): İşte o -> genericNeutral / particle_or_formula
- `12:100` (kissa, keyTermMissingInV4): İşte o -> genericNeutral / particle_or_formula

## Manual Review Ornekleri

- `5:3` (hukum_istisna, keyTermOnlyInV4): paylaştırmak -> needsManualReview / content_needs_profile_check
- `5:3` (hukum_istisna, keyTermOnlyInV4): paylaştırmak -> needsManualReview / content_needs_profile_check
- `5:90` (emir_yasak, keyTermOnlyInV4): içki -> needsManualReview / content_needs_profile_check
- `5:90` (emir_yasak, keyTermOnlyInV4): dikili taşlar -> needsManualReview / content_needs_profile_check
- `5:90` (emir_yasak, keyTermOnlyInV4): fal okları -> needsManualReview / content_needs_profile_check
- `5:90` (emir_yasak, keyTermOnlyInV4): içki -> needsManualReview / content_needs_profile_check
- `5:90` (emir_yasak, keyTermOnlyInV4): dikili taşlar -> needsManualReview / content_needs_profile_check
- `5:90` (emir_yasak, keyTermOnlyInV4): fal okları -> needsManualReview / content_needs_profile_check
- `7:156` (rahmet_magfiret, keyTermOnlyInV4): kuşatmak -> needsManualReview / content_needs_profile_check

## Kisa Yorum

- `genericNeutral`: Allah/Rab, isaret zamiri, edat, zaman/formula gibi dogrudan risk sayilmayan generic durumlar.
- `likelyUsefulV4Addition`: v4'un yeni anlam tasiyici content term ekledigi durumlar.
- `likelyRiskyDrop`: v4'un profile bagli faydali terimi dusurmus olabilecegi durumlar.
- `needsManualReview`: ortak helper'a gore hala net siniflanamayan durumlar.

## Karar

Bu audit kullanici-facing analiz uretmez. Yeni classifier yalniz audit gurultusunu azaltmak ve v4 default kararina giden gercek risk listesini netlestirmek icindir.
