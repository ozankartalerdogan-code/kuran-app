# Kanıtlı Analiz Veri Kaynakları Durum Özeti

Tarih: 2026-05-14

Bu rapor şimdiye kadar incelenen veri kaynaklarını `başarılı`, `park`, `riskli` olarak sınıflandırır ve projede hâlâ atlanmış/kullanılmamış potansiyel kaynak olup olmadığını özetler. Runtime, UI, default source ve veri dosyaları değiştirilmedi.

## Kısa Genel Karar

Kanıtlı Analiz tarafında veri gerçekten yok değil; veri çok, ama her kaynak aynı güven seviyesinde değil.

En sağlam hat şu an:

- `canonical_word_analysis_v4`
- profile/decision hierarchy
- profile-specific weak preview helper
- word-analysis reports için filtreli kullanım
- normalized translations/coreDb translation coverage için source diversity

Park edilmesi gereken ana hat:

- meal phrase extraction
- tafsir/context_notes doğrudan kullanıcı-facing gösterimi
- coreDb default kaynak kararı
- raw/archive kaynakların doğrudan runtime’a bağlanması

En büyük fırsat:

- Temizlenmiş/whitelist edilmiş meal source diversity + canonical word/root verisini birleştirerek Kanıtlı Analiz vNext context’i güçlendirmek.

En büyük risk:

- Encoding kalıntısı, sure-level tefsir metnini ayet-level gibi göstermek, fallback ile keyTerms doldurmak.

## İncelenen Kaynaklar Durum Matrisi

| Kaynak | Durum | Ne işe yarıyor? | Kullanıcı-facing olabilir mi? | Debug/sourceStatus mı? | vNext sinyal |
|---|---|---|---|---|---|
| `data2/processed/canonical_word_analysis_v4.json` | Başarılı / opt-in | Word, root, lemma, morphology, `meaning_tr`, `gloss_en` | Evet, filtreli keyTerms/wordByWord ile | Düşük confidence destek/debug kalmalı | keyTerms, wordByWord, morphology |
| `data2/processed/root_explanations_tr_v2.json` | Park | 733 boş kökün Türkçe açıklama adayı dolduruldu | Hayır, tamamı risk-gated değil | Evet | root meaning enrichment |
| `data2/processed/root_explanations_tr_v2_easy_only.json` | Kısmen başarılı / opt-in adayı | Sadece risk_level=kolay kök açıklamaları | Dikkatli, küçük opt-in audit ile | Evet | safe rootMeaning |
| `data/meal-comparison/by-surah/*.json` | Park | Meal coverage/source diversity | Phrase olarak hayır | Evet | source diversity/category signal |
| `data/fidelity/by-surah/index.json` | Park | Beklenen fidelity değil, mostly meal/source metadata | Hayır | Evet | coverage/source status |
| `data/word-analysis/reports/coverage-by-ayah.json` | Başarılı | Ayet bazlı word coverage | Kısa sourceStatus olarak evet | Evet | coverageRatio/sourceStatus |
| `data/word-analysis/reports/missing-meanings.json` | Başarılı, filtre şart | Missing meaning / weak adayları | Evet, profile-specific filtreyle | Generic grup debug kalmalı | weakCorrespondences |
| `data/normalized/translations.json` | Başarılı ama riskli text | 6236 ayet, 37 meal, primary translation | Direct phrase olarak hayır | Source coverage evet | translation count/source diversity |
| `data/kuran_core.db::translation_comparison` | Park / metadata | Normalize meal text + source metadata | Phrase olarak hayır | Evet | clean source audit sonrası meal diff |
| `data/kuran_core.db::context_notes` | Riskli/park | Sure-level revelation_context + tafsir_note | Revelation kısa not olabilir, tafsir hayır | Evet | context scope/status |

## Kaynak Bazlı Detay

### canonical_word_analysis_v4

Dosya:

`data2/processed/canonical_word_analysis_v4.json`

Durum:

Başarılı, fakat default source yapılmadı.

Ne sağlar:

- Ayet bazlı word listesi
- Arabic word
- lemma/root
- morphology
- `meaning_tr`
- `gloss_en`
- confidence/source bilgisi

Kullanım kararı:

- Kullanıcı-facing keyTerms için uygun, ama filtre şart.
- Zamir/edat/particle/formula görünür keyTerms’e girmemeli.
- Low-confidence veya source-backed ama zayıf terimler supporting/debug kalmalı.

vNext katkısı:

- `keyTermsPreview`
- `wordByWord`
- `root/lemma/morphology`
- source-backed keyTerms visibility

### root_explanations_tr_v2 / easy_only

Dosyalar:

- `data2/processed/root_explanations_tr_v2.json`
- `data2/processed/root_explanations_tr_v2_easy_only.json`

Durum:

- Full v2: park.
- easy-only: opt-in adayı.

Ne sağlar:

- Kök açıklamaları
- `short_tr`
- `summary_tr`
- risk-gated review batch kaynağı

Kullanım kararı:

- Full v2 kullanıcı-facing için erken.
- Easy-only sınırlı biçimde denenebilir.
- Orta/zor kökler kullanıcı-facing preview’a otomatik girmemeli.

vNext katkısı:

- root meaning coverage
- keyTerms destek açıklaması
- future AI context

### meal-comparison

Klasör:

`data/meal-comparison/by-surah`

Durum:

Park.

Ne sağlar:

- Ayet bazlı çoklu meal metinleri
- Meal source coverage
- source diversity

Kullanım kararı:

- Phrase extraction şimdilik yapılmayacak.
- Encoding kalıntıları nedeniyle ham phrase kullanıcıya gösterilmemeli.
- Coverage/source diversity sinyali güvenli.

vNext katkısı:

- translationDifferences category-level signal
- source diversity
- cleaned source whitelist sonrası phrase candidate

### fidelity

Klasör:

`data/fidelity/by-surah/index.json`

Durum:

Park.

Ne sağlar:

- Beklenen anlamda fidelity/weak correspondence değil.
- Daha çok meal/source metadata tarafında duruyor.

Kullanım kararı:

- Kullanıcı-facing weak sinyali için uygun ana kaynak değil.
- word-analysis reports daha güvenilir.

vNext katkısı:

- sourceStatus
- coverage/status

### word-analysis reports

Dosyalar:

- `data/word-analysis/reports/coverage-by-ayah.json`
- `data/word-analysis/reports/missing-meanings.json`

Durum:

Başarılı, filtreli kullanım şart.

Önemli metrikler:

- `coverage-by-ayah`: 6236 ayet
- `missing-meanings`: 24338 missing record
- filtre sonrası görünür aday: 12685
- profile-specific kullanıcı-facing gate ile ciddi gürültü azalıyor

Kullanım kararı:

- `coverage-by-ayah` sourceStatus için güvenli.
- `missing-meanings` ham haliyle kullanıcı-facing değil.
- Profile-specific filtered weak helper ile güvenli hale getirildi.
- Generic grup kullanıcı-facing değil, debug/sourceStatus adayı.

vNext katkısı:

- weakCorrespondencesPreview
- sourceStatus
- data quality debug

### normalized translations

Dosya:

`data/normalized/translations.json`

Durum:

Başarılı ama text-level riskli.

Metrikler:

- 6236 ayet
- 114 sure
- 37 source
- 229874 translation entry
- 0 boş text
- 18888 entry’de `1/0` encoding kalıntısı
- 2756 ayette en az bir encoding kalıntılı meal var

Kullanım kararı:

- Primary translation ve translations runtime’da aktif kullanılıyor.
- Source diversity / translation count için güvenli.
- Phrase extraction için önce encoding-clean source audit gerekir.

vNext katkısı:

- translation count
- source diversity
- cleaned phrase candidate

### coreDb context_notes / translation_comparison

Dosya:

`data/kuran_core.db`

Tablolar:

- `context_notes`
- `translation_comparison`

Durum:

Park / dikkatli.

Metrikler:

- `context_notes`: 12472 satır, 6236 ayet
- `translation_comparison`: 229085 satır, 6236 ayet, 37 source

Kullanım kararı:

- `translation_comparison` hazır analiz sinyali değil; normalized meal text + metadata.
- `context_notes.revelation_context` kısa sourceStatus/context için kullanılabilir.
- `context_notes.tafsir_note` uzun/sure-level olabilir, kullanıcı-facing karta doğrudan girmemeli.

vNext katkısı:

- coreDb source consistency
- source coverage
- context scope/status

## Başarılı / Park / Riskli Sınıflandırması

### Başarılı

- `canonical_word_analysis_v4`: keyTerms için ana aday ama default değil.
- `word-analysis reports`: filtreli weak için değerli.
- `profile-specific weak helper`: kullanıcı-facing weak alanı için başarılı.
- `coverage-by-ayah`: sourceStatus/coverage için güvenli.
- `normalized translations`: coverage/primary translations için başarılı.

### Park

- `root_explanations_tr_v2`: full kullanım beklemeli.
- `root_explanations_tr_v2_easy_only`: opt-in audit sonrası değerlendirilebilir.
- `meal-comparison`: phrase extraction park.
- `fidelity`: weak sinyali olarak park.
- `coreDb translation_comparison`: clean-source audit sonrası kullanılabilir.
- `coreDb context_notes.tafsir_note`: ayet-specific ayrım yapılana kadar park.

### Riskli

- Ham meal phrase extraction.
- Encoding kalıntılı translations/translation_comparison metni.
- Tefsir notunu kullanıcı-facing ön analiz gibi göstermek.
- Raw/archive kaynakları doğrudan runtime’a bağlamak.
- Hadith/tafsir raw kaynakları bağlam kontrolü olmadan AI context’e vermek.

## Atlanmış veya Henüz Kullanılmamış Potansiyel Kaynaklar

Taranan genel alanlar:

| Alan | Dosya sayısı | Boyut |
|---|---:|---:|
| `data` | 5705 | 1.32 GB |
| `data2/processed` | 26 | 419.84 MB |
| `data2/QURAN-NLP/data/quran` | 6 | 22.12 MB |
| `data2/QURAN-NLP/data/tafaseer` | 4 | 9.52 MB |
| `data2/QURAN-NLP/data/translation` | 9 | 16.06 MB |
| `data2/QURAN-NLP/data/names_of_Allah` | 1 | 885 KB |
| `data2/quran-morphology` | 5 | 6.35 MB |
| `data2/quran-json/data` | 22 | 18.79 MB |
| `data/context` | 119 | 1.06 MB |
| `data/source-metadata` | 8 | 72 KB |
| `data/tafsir` | 3 | 11.88 MB |
| `data/revelation-context` | 3 | 77 KB |
| `data/word-analysis` | 6 | 11.53 MB |

### Potansiyel ama Henüz Yeterince İncelenmemiş Kaynaklar

| Kaynak | Durum | Potansiyel | Öneri |
|---|---|---|---|
| `data/context/normalized/surah-context.json` | Potansiyel | 114 sure için kısa introduction/context | Inspect et; sourceStatus/context kartı için güvenli olabilir. |
| `data/source-metadata/*.json` | Potansiyel | source health, encoding, readiness, stability | Inspect et; sourceStatus kararlarında kullanılabilir. |
| `data/tafsir/surah/index.json` | Riskli potansiyel | 114 sure tafsir text | Park; ayet-specific değilse kullanıcı-facing kullanma. |
| `data/tafsir/ayah-ranges/index.json` | Düşük öncelik | Şu an boş array | Park. |
| `data/revelation-context/surah/index.json` | Potansiyel | 114 sure revelation context | Inspect et; kısa bağlam/status için değerli. |
| `data/word-analysis/extended-roots.json` | Düşük kapsam | 9 kök civarı özel açıklama | Düşük öncelik; root v2 ile kıyasla. |
| `data/word-analysis/reports/root-explanations.json` | Metadata | root explanation coverage raporu | Debug/sourceStatus için inspect edilebilir. |
| `data2/QURAN-NLP/data/quran/corpus/quran_morphology.csv` | Yüksek potansiyel | 128221 morphology segment satırı | Inspect et; canonical morphology ile consistency audit yapılabilir. |
| `data2/QURAN-NLP/data/quran/corpus/quran_lemmas_grouped.csv` | Orta potansiyel | 3359 grouped lemma | Inspect et; lemma frequency/keyTerms relevance için değerli. |
| `data2/QURAN-NLP/data/surah/surah_info.csv` | Düşük/orta | Sure metadata | Existing surah-meta ile kıyasla. |
| `data2/QURAN-NLP/data/names_of_Allah/Asma_ul_Husna.csv` | Potansiyel ama riskli | Esma/root/name meaning | Inspect et; tevhid/Allah name signals için dikkatli kullanılabilir. |
| `data2/quran-morphology/morphology-terms-ar.json` | Orta potansiyel | morphology label dictionary | Inspect et; morphology display/readability için değerli. |
| `data2/quran-json/data/editions/tr.json` | Düşük/orta | Alternatif TR edition | Encoding/source audit olmadan kullanma. |
| `data2/quran-json/data/editions/transliteration.json` | Potansiyel | Alternatif transliteration | Existing transliteration ile consistency audit. |
| `data2/QURAN-NLP/data/translation/english/*.csv` | Orta ama runtime dışı | İngilizce translation diversity | Park; AI context için ileride kullanılabilir. |
| `data2/QURAN-NLP/data/tafaseer/english/*.csv` | Riskli | İngilizce tafsir | Park; tefsir/yorum riski yüksek. |
| `data2/QURAN-NLP/data/hadith/*` | Çok riskli | Hadith corpus | Kanıtlı Analiz v1/vNext için dokunma. Ayrı ürün/faz gerekir. |
| `data/quran/external/*` | Raw/archive | Quran metadata/code archive | Doğrudan runtime’a bağlama; gerekiyorsa tek tek inspect. |

## Eksik Kalan Veri Alanları

Hâlâ zayıf veya eksik olan alanlar:

- Temiz Türkçe `meaning_tr` coverage tam değil.
- Root explanations full v2 risk-gated değil.
- Meal phrase extraction güvenli değil.
- `translation_comparison` hazır semantic diff üretmiyor.
- `context_notes.tafsir_note` ayet-specific değil.
- AI üst açıklama katmanı henüz tasarlanmadı.
- Source confidence/readiness bilgisi preview kararlarına tam bağlanmadı.
- Morphology display label’ları son kullanıcı için hâlâ teknik olabilir.

## Kanıtlı Analiz vNext İçin Önerilen Sinyal Haritası

| vNext alan | Ana kaynak | Güven seviyesi | Not |
|---|---|---|---|
| `keyTerms` | canonical_word_analysis_v4 | Orta-yüksek | Default öncesi drift/quality audit sürmeli. |
| `wordByWord` | canonical_word_analysis_v4 | Orta-yüksek | Düşük confidence filtreli. |
| `rootMeanings` | root_explanations_tr_v2_easy_only | Orta | Full v2 değil, easy-only. |
| `morphology` | canonical + quran_morphology consistency | Orta | Display label için morphology terms inspect. |
| `translationDifferences` | normalized translations / coreDb translation_comparison | Orta | Sadece category-level; phrase için clean-source audit şart. |
| `weakCorrespondences` | missing-meanings + profile-specific helper | Yüksek | Generic grup gizli/debug. |
| `sourceStatus` | source-metadata + coverage reports | Orta-yüksek | Önce source metadata inspect. |
| `context` | revelation-context/surah + surah-context | Orta | Sure-level olduğu açık belirtilmeli. |
| `tafsirNotes` | tafsir/surah or context_notes | Düşük/riskli | Kullanıcı-facing değil, AI context bile dikkatli. |

## Sıradaki En Mantıklı Inspect Sırası

1. `data/source-metadata/*.json`
   - Amaç: source readiness/encoding/stability kararlarını merkezi hale getirmek.
   - Öncelik: yüksek.

2. `data/context/normalized/surah-context.json` + `data/revelation-context/surah/index.json`
   - Amaç: kısa ve güvenli bağlam/sourceStatus sinyali.
   - Öncelik: yüksek.

3. `data2/quran-morphology/morphology-terms-ar.json`
   - Amaç: morphology display label/readability.
   - Öncelik: orta.

4. `data2/QURAN-NLP/data/quran/corpus/quran_morphology.csv`
   - Amaç: canonical morphology consistency audit.
   - Öncelik: orta.

5. `data2/QURAN-NLP/data/names_of_Allah/Asma_ul_Husna.csv`
   - Amaç: tevhid/Allah name signals için potansiyel.
   - Öncelik: düşük/orta, riskli.

## Şimdilik Yapılmaması Gerekenler

- coreDb’yi default yapmak.
- raw/archive kaynakları doğrudan runtime’a bağlamak.
- meal phrase extraction’ı encoding clean audit olmadan açmak.
- tafsir text’i Kanıtlı Analiz kartında göstermek.
- fallback ile keyTerms doldurmak.
- existing clean `meaning_tr` değerlerini ezmek.
- Hadith kaynaklarını Kanıtlı Analiz vNext’e dahil etmek.
- AI yorum katmanına data/sourceStatus ayrımı netleşmeden geçmek.

## Karar

Kanıtlı Analiz veri temeli artık yeterince geniş ve kontrollü. En doğru kısa vadeli yön, yeni veri eklemekten çok mevcut kaynakların güven sınıflarını preview kararlarına daha net bağlamak:

1. source metadata inspect
2. safe context source inspect
3. clean-source meal audit
4. v4/easy-only opt-in kararlarının dar quality audit ile sürdürülmesi

