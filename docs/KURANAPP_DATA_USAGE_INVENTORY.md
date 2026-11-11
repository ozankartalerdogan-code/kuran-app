# KuranApp Data Usage Inventory

Bu rapor `data/` ve `data2/` altındaki veri kaynaklarını uygulama alanlarına göre sınıflandırır ve veri keşif fazını kapatır.

Bu çalışma inspect-only yapıldı:

- Runtime değiştirilmedi.
- UI değiştirilmedi.
- Default source değiştirilmedi.
- Veri dosyaları overwrite edilmedi.
- Sadece dokümantasyon üretildi.

## Kısa Karar

Veri keşif fazı pratik olarak kapatılabilir. `data/` ve `data2/` altında tamamen fark edilmemiş kritik bir Kanıtlı Analiz runtime kaynağı görünmüyor. Kalan büyük bloklar çoğunlukla raw archive, build input veya parked kaynak niteliğinde.

Bir daha geniş tarama yapmamak için karar notu:

- Yeni bir veri kaynağı runtime’a bağlanmadan önce yalnız hedefli inspect yapılacak.
- Raw/archive klasörleri doğrudan runtime’a bağlanmayacak.
- Default source değişikliği yalnız audit + opt-in karşılaştırma sonrası yapılacak.
- Kanıtlı Analiz için öncelik artık “daha çok veri bulmak” değil, mevcut veriyi policy/gate ile güvenli kullanmak.

## Genel Dosya Taraması

- Toplam `data/` + `data2/` dosyası: 13373
- JSON dosyası: 8063
- MP3 dosyası: 4663
- CSV dosyası: 80
- TypeScript dosyası: 147
- Büyük raw/archive blokları:
  - `data/quran/external`: 5414 dosya, yaklaşık 644 MB
  - `data2/QURAN-NLP/data/hadith`: 50 CSV, yaklaşık 211 MB
  - `data2/quran-json/dist`: 7513 JSON, yaklaşık 78 MB

## Kullanım Sınıfları

| Sınıf | Anlamı |
| --- | --- |
| `user-facing` | Normal kullanıcıya doğrudan veya kontrollü sadeleştirilmiş biçimde gösterilebilir. |
| `debug-only` | Audit, geliştirici kontrolü veya sourceStatus/debug için kullanılmalı. |
| `build-input` | Build/enrichment/normalization için değerli ama runtime’a ham bağlanmamalı. |
| `parked` | Şimdilik bekletilmeli; kapsam/lisans/semantik risk veya öncelik düşüklüğü var. |

## 1. Kanıtlı Analiz

| Kaynak | Ne işe yarar? | Kullanım yeri | Sınıf | Risk | Öncelik |
| --- | --- | --- | --- | --- | --- |
| `data2/processed/canonical_word_analysis.json` | Default canonical kelime analizi | Mevcut JSON source, `VerseAnalysisContext` | user-facing kontrollü | meaning coverage eski | yüksek |
| `data2/processed/canonical_word_analysis_v2.json` | Dictionary/root enrichment sonrası opt-in canonical | Audit/opt-in source | build-input | default değil | orta |
| `data2/processed/canonical_word_analysis_v3.json` | İlk çeviri batch sonrası opt-in canonical | Audit/opt-in source | build-input | default değil | orta |
| `data2/processed/canonical_word_analysis_v4.json` | Daha temiz meaning_tr coverage | v4 opt-in audit | build-input | bazı ayetlerde v4 keyTerms drift | yüksek |
| `data/fidelity/by-surah/index.json` | Kelime-karşılık/fidelity sinyalleri | weak/fidelity preview | user-facing filtreli | ham gösterilirse teknik/gürültülü | yüksek |
| `data/word-analysis/reports/coverage-by-ayah.json` | Ayet bazlı coverage | context/debug/fidelity destek | debug-only | kullanıcıya ham gösterilmemeli | orta |
| `data/word-analysis/reports/missing-meanings.json` | Eksik anlam raporu | filtreli weak preview adayı | debug-only/build-input | no_lemma_root ve particle gürültüsü | orta |
| `data/analysis-snapshots/*.json` | Audit/preview snapshotları | kalite kontrol | debug-only | runtime source olmamalı | orta |
| `data/kuran_core.db` | Merkezi SQLite analiz DB | optional coreDb source | build-input | default için dikkatli audit gerekir | orta |

Karar:

- Kanıtlı Analiz V1 için mevcut default JSON source korunmalı.
- v4 default için erken; önce keyTerms drift ve opt-in 1000+ audit bulguları çözülmeli.
- Fidelity ve missing-meanings yalnız profile-specific/gated şekilde user-facing olmalı.

## 2. Kelime Analizi Ekranı

| Kaynak | Ne işe yarar? | Kullanım yeri | Sınıf | Risk | Öncelik |
| --- | --- | --- | --- | --- | --- |
| `data2/processed/canonical_word_analysis*.json` | Word-by-word, root, lemma, morphology, meaning | Kelime analizi, Kanıtlı Analiz | user-facing kontrollü | low confidence terms | yüksek |
| `data/word-analysis/word-translations-tr.json` | Türkçe kelime/kök karşılıkları | canonical build/enrichment | build-input | anlamlar literal kalabilir | yüksek |
| `data2/processed/meaning_overrides_tr.json` | Manuel Türkçe meaning override | canonical build | build-input | mevcut değerler ezilmemeli | yüksek |
| `data2/processed/meaning_overrides_from_candidates.json` | GPT/manual review sonrası batch | v3 build input | build-input | review dışı doğrudan merge edilmemeli | orta |
| `data2/processed/meaning_overrides_from_translation_batch_v4.json` | v4 meaning batch | v4 build input | build-input | default değil | orta |
| `data2/processed/meaning_candidates*.csv/json` | Çeviri/review adayları | enrichment workflow | debug-only/build-input | runtime’a girmemeli | orta |

Karar:

- Kelime Analizi ekranı için en değerli hat v4 ama opt-in kalmalı.
- Mevcut dolu `meaning_tr` değerleri asla otomatik ezilmemeli.

## 3. Kökler Ekranı

| Kaynak | Ne işe yarar? | Kullanım yeri | Sınıf | Risk | Öncelik |
| --- | --- | --- | --- | --- | --- |
| `data2/processed/root_explanations_tr.seed.json` | Seed Türkçe kök açıklamaları | root explanation base | user-facing kontrollü | coverage düşük | yüksek |
| `data2/processed/root_explanations_tr_enriched.json` | Verb corpus ile genişletilmiş root listesi | enrichment base | build-input | short_tr/summary_tr boş çok | yüksek |
| `data2/processed/root_explanations_tr_v2.json` | 733 kök review sonrası v2 | opt-in root source | build-input | orta/zor risk seviyeleri | orta |
| `data2/processed/root_explanations_tr_v2_easy_only.json` | sadece kolay kökler | güvenli opt-in adayı | build-input | etki sınırlı | orta |
| `data2/processed/root_explanations_review_batch_733_FINAL.csv` | manuel review CSV | root enrichment evidence | debug-only/build-input | runtime değil | orta |
| `data/word-analysis/extended-roots.json` | ek root bilgisi | root screen adayı | build-input | inspect gerekir | düşük |
| `data/word-analysis/reports/root-explanations.json` | root report | audit | debug-only | çok küçük kapsam | düşük |
| `data2/QURAN-NLP/data/quran/corpus/quran_verbs.csv` | root/verb/frequency/translation | root enrichment | build-input | İngilizce/literal | yüksek |
| `data2/QURAN-NLP/data/quran/corpus/quran_lemmas.csv` | lemma/frequency/POS | root/lemma frequency | build-input | meaning değil | orta |

Karar:

- Kökler ekranı için en güvenli sonraki yol: `v2_easy_only` opt-in impact audit sonrası controlled merge planı.
- `root_explanations_tr_v2.json` tamamı doğrudan user-facing yapılmamalı.

## 4. Meal / Diğer Mealler Ekranı

| Kaynak | Ne işe yarar? | Kullanım yeri | Sınıf | Risk | Öncelik |
| --- | --- | --- | --- | --- | --- |
| `data/normalized/translations.json` | 6236 ayet, çoklu meal kaynakları | Meal ekranı, primary translation | user-facing | bazı source-level kalite farkları | yüksek |
| `data/meal-comparison/by-surah/*.json` | 114 sure meal comparison cache | source diversity/category-level signal | build-input/debug-only | phrase extraction encoding/segmentation riski | orta |
| `data/meal-comparison/fatiha-1-1.json` | örnek/small cache | debug/sample | debug-only | runtime ana kaynak değil | düşük |
| `data/translations/quran_meal.txt` | düz text meal | archive/build input | parked/build-input | format/metadata sınırlı | düşük |
| `data2/quran-json/data/editions/tr.json` | quran-json Türkçe edition | archive/build input | parked/build-input | existing normalized daha güçlü | düşük |
| `data2/QURAN-NLP/data/translation/english/*.csv` | İngilizce çeviri corpus | comparison/AI future context adayı | parked | Türkçe Kanıtlı Analiz için doğrudan değil | düşük |

Karar:

- Meal ekranında `normalized/translations.json` ana kaynak kalmalı.
- `meal-comparison` phrase extraction için parked; sadece coverage/source diversity/category-level sinyal olarak saklanmalı.

## 5. Okunuş / Transliteration

| Kaynak | Ne işe yarar? | Kullanım yeri | Sınıf | Risk | Öncelik |
| --- | --- | --- | --- | --- | --- |
| `data/quran/transliteration.json` | ayet düzeyi transliteration | Okunuş ekranı | user-facing | standardizasyon kontrolü | yüksek |
| `data2/quran-json/data/editions/transliteration.json` | alternatif transliteration | archive/build input | build-input | default’a bağlanmamalı | düşük |
| `data2/quran-json/dist/verses/*` | quran-json dağıtım verileri | archive | parked | çok dosyalı raw source | düşük |

Karar:

- Okunuş için mevcut normalized/transliteration hattı yeterli.
- Alternatif transliteration kaynakları ancak karşılaştırmalı inspect gerekirse açılmalı.

## 6. Morfoloji / Sarf-Nahiv Yardımcı Verileri

| Kaynak | Ne işe yarar? | Kullanım yeri | Sınıf | Risk | Öncelik |
| --- | --- | --- | --- | --- | --- |
| `data2/QURAN-NLP/data/quran/corpus/quran_morphology.csv` | 128219 segment, 77429 word lokasyonu | canonical validation/build input | build-input | ham Buckwalter/segment bilgisi user-facing değil | yüksek |
| `data2/quran-morphology/quran-morphology.txt` | morphology raw text | build input | build-input | parser/alignment gerekir | orta |
| `data/word-analysis/quran-morphology.txt` | word-analysis morphology source | canonical source/build | build-input | raw gösterilmemeli | yüksek |
| `data2/quran-morphology/morphology-terms-ar.json` | Arapça gramer terim sözlüğü | debug/build | debug-only | Türkçe değil | düşük |
| `data/analysis-snapshots/morphology-canonical-alignment-audit.sample.json` | canonical/morphology alignment audit | debug | debug-only | repair değil, karar desteği | orta |

Karar:

- Morfoloji kaynakları eksik değil; canonical v4 büyük kısmını taşıyor.
- Sıradaki güvenli iş: 10 alignment farkı için manual-review repair candidates.

## 7. Kaynak Güven / Kapsam Bilgisi

| Kaynak | Ne işe yarar? | Kullanım yeri | Sınıf | Risk | Öncelik |
| --- | --- | --- | --- | --- | --- |
| `data/source-metadata/*.json` | source confidence, coverage, readiness | source policy | debug-only/build-input | ham metadata user-facing değil | yüksek |
| `data/analysis-snapshots/source-policy-audit.sample.json` | merkezi source policy snapshot | vNext source policy | debug-only | runtime’a bağlı değil | yüksek |
| `data/analysis-snapshots/source-status-mapper.sample.json` | teknik olmayan sourceStatus mapping | vNext sourceStatus | debug-only/build-input | bağlanmadan audit edilmeli | orta |
| `docs/SOURCE_*` raporları | policy karar dokümanı | geliştirici referansı | debug-only | davranış değil | yüksek |

Karar:

- Source policy artık veri keşif kararlarını kapatmak için yeterli.
- vNext’te sourceStatus mapper önce snapshot/opt-in olarak denenmeli.

## 8. Tefsir Ekranı / Tefsir Referansı

| Kaynak | Ne işe yarar? | Kullanım yeri | Sınıf | Risk | Öncelik |
| --- | --- | --- | --- | --- | --- |
| `data/normalized/tafsir.json` | normalized tafsir cache | tefsir/reference | user-facing dikkatli | ayet bazlılık sınırlı olabilir | orta |
| `data/tafsir/surah/index.json` | sure bazlı tafsir/context | tefsir screen/source status | user-facing dikkatli | ayet analizi gibi gösterilmemeli | orta |
| `data/tafsir/ayah-ranges/index.json` | ayet range tafsir index | tafsir range | parked | şu an boş/çok sınırlı | düşük |
| `data/tafsir/diyanet-kuran-yolu-fatiha.json` | örnek Fatiha tefsir | sample/reference | parked | kapsam küçük | düşük |
| `data2/QURAN-NLP/data/tafaseer/english/*.csv` | İngilizce tefsir corpus | future AI/reference inspect | parked | mezhep/kaynak/lisans/çeviri riski | düşük |

Karar:

- Tefsir, Kanıtlı Analiz metnine karıştırılmamalı.
- Tefsir ekranı ayrı kalmalı; Kanıtlı Analiz’de yalnız “kapsam sınırlı” sourceStatus olabilir.

## 9. Nüzul / Sure-Ayet Bağlamı

| Kaynak | Ne işe yarar? | Kullanım yeri | Sınıf | Risk | Öncelik |
| --- | --- | --- | --- | --- | --- |
| `data/revelation-context/surah/index.json` | sure düzeyi nüzul/context | context source | user-facing dikkatli | ayet bazlı değil | orta |
| `data/revelation-context/diyanet-kuran-yolu-fatiha.json` | örnek Fatiha context | sample | parked | kapsam küçük | düşük |
| `data/revelation-context/tdv-methodology.json` | TDV methodology metadata | source/reference | debug-only | içerik değil metodoloji | düşük |
| `data/context/normalized/surah-context.json` | normalized sure context | context screen/source | build-input | ayet bazlı değil | orta |
| `data/context/raw/quran-foundation/chapter-info/*.json` | raw chapter info | build/archive | parked | doğrudan user-facing değil | düşük |

Karar:

- Nüzul/context Kanıtlı Analiz’de yorum gibi kullanılmamalı.
- Sure/ayet bağlamı ayrı kaynak notu veya ayrı ekran olabilir.

## 10. Esmâü’l-Hüsnâ / Allah’ın İsimleri

| Kaynak | Ne işe yarar? | Kullanım yeri | Sınıf | Risk | Öncelik |
| --- | --- | --- | --- | --- | --- |
| `data2/QURAN-NLP/data/names_of_Allah/Asma_ul_Husna.csv` | Allah’ın isimleri dataset’i | Esmâü’l-Hüsnâ ekranı adayı | parked/build-input | henüz inspect edilmedi; dil/kaynak/lisans kontrolü gerekir | orta |

Karar:

- Bu kaynak Kanıtlı Analiz’e doğrudan bağlanmamalı.
- Ayrı bir Esmâü’l-Hüsnâ ekranı veya future reference data olarak inspect edilebilir.

## 11. AI Guardrail / Referans

| Kaynak | Ne işe yarar? | Kullanım yeri | Sınıf | Risk | Öncelik |
| --- | --- | --- | --- | --- | --- |
| `docs/arsiv/KANITLI_ANALIZ_V1_CHECKPOINT.md` | V1 davranış sınırları | AI/system guardrail referansı | debug-only | doküman güncel tutulmalı | yüksek |
| `docs/arsiv/KURANAPP_DATA_INVENTORY_STRATEGY.md` | veri stratejisi | AI/context planning | debug-only | eski bulgular yeni raporlarla reconcile edilmeli | orta |
| `docs/*AUDIT*.md` | audit karar geçmişi | AI/reference | debug-only | runtime truth değil | orta |
| `data/analysis-snapshots/*.json` | audit samples | AI eval/reference | debug-only | kullanıcı-facing değil | orta |

Karar:

- AI üst açıklama katmanına geçilirse bu docs ve snapshots guardrail context olarak kullanılabilir.
- AI katmanı veri üretmemeli; mevcut deterministic context üstünde açıklama yapmalı.

## 12. Debug / Audit / Build Input

| Kaynak | Ne işe yarar? | Kullanım yeri | Sınıf | Risk | Öncelik |
| --- | --- | --- | --- | --- | --- |
| `data/analysis-audit/*.json` | AnalysisEngineV1 audit | legacy/debug | debug-only | V1 ana analiz değil | düşük |
| `data/analysis-snapshots/*.json` | context/preview/audit snapshots | QA | debug-only | runtime değil | yüksek |
| `data2/processed/reports/*.json` | canonical build reports | build/debug | debug-only | ham kullanıcıya gösterilmemeli | orta |
| `data2/scripts/*` | data build scripts | build pipeline | build-input | çalıştırmadan önce hedef çıktı kontrolü | orta |
| `scripts/*audit*`, `scripts/*inspect*` | audit/inspect utilities | QA | debug-only | davranış değiştirmez | yüksek |

Karar:

- Debug/audit çıktıları keşif fazını kapatmak için yeterli.
- Yeni veri işi açılırsa önce inspect script, sonra suffix output, sonra opt-in audit kuralı korunmalı.

## 13. Raw Archive / Parked Kaynaklar

| Kaynak | Ne işe yarar? | Kullanım yeri | Sınıf | Risk | Öncelik |
| --- | --- | --- | --- | --- | --- |
| `data/quran/external` | Açık Kuran/json/audio/raw repo arşivi | archive/reference | parked | devasa, lisans/kapsam/format karışık | düşük |
| `data2/quran-json/dist` | 7513 verse/chapter JSON | archive/build input | parked | mevcut normalized daha temiz | düşük |
| `data2/quran-json/data` | quran-json editions/chapters | archive/build input | parked | runtime’a doğrudan bağlanmamalı | düşük |
| `data2/QURAN-NLP/data/hadith` | büyük hadis corpus | future separate module | parked | Kanıtlı Analiz için scope dışı, mezhep/kaynak/lisans riski | düşük |
| `data2/QURAN-NLP/data/translation/english` | İngilizce çeviri corpus | future comparison/AI reference | parked | Türkçe user-facing değil | düşük |
| `data2/QURAN-NLP/data/tafaseer/english` | İngilizce tefsir corpus | future reference inspect | parked | tefsir/yorum riski | düşük |
| `data2/QURAN-NLP/images`, notebooks, webscrapers | kaynak repo yan dosyaları | archive | parked | uygulama verisi değil | düşük |

Karar:

- Bu klasörler tekrar genel taramaya konu edilmemeli.
- Ancak net bir ürün ihtiyacı doğarsa hedefli inspect yapılmalı.

## 14. Unclassified / Needs Inspect

Kritik, doğrudan Kanıtlı Analiz’i güçlendirecek kategorize edilmemiş kaynak görünmüyor.

Needs inspect olarak işaretlenen ama düşük/orta öncelikli kaynaklar:

| Kaynak | Neden needs inspect? | Öneri |
| --- | --- | --- |
| `data2/QURAN-NLP/data/names_of_Allah/Asma_ul_Husna.csv` | Esmâü’l-Hüsnâ ekranı için potansiyel; henüz içerik/lisans kalite raporu yok | ayrı inspect paketi |
| `data/word-analysis/extended-roots.json` | küçük ama kök ekranına katkı olabilir | root screen öncesi inspect |
| `data2/QURAN-NLP/data/surah/surah_info.csv` | sure metadata alternatifi | mevcut surah-meta yeterli; düşük öncelik inspect |
| `data2/QURAN-NLP/data/quran/quran.csv` | raw Quran corpus | mevcut normalized Arabic yeterli; park |
| `data2/QURAN-NLP/data/tafaseer/english/*.csv` | tefsir referansı olabilir | AI/reference fazı öncesi kaynak/lisans inspect |
| `data2/QURAN-NLP/data/hadith/*` | ayrı hadis modülü potansiyeli | Kanıtlı Analiz scope dışı; park |

## Öncelik Özeti

### Yüksek Öncelik

- v4 canonical opt-in drift ve default-readiness kararını netleştirmek.
- Profile-specific weak preview entegrasyonunu göz testleriyle doğrulamak.
- SourceStatus mapper’ı opt-in preview snapshot üzerinde denemek.
- Morfoloji alignment 10 lokasyon için manual-review candidate üretmek.

### Orta Öncelik

- `root_explanations_tr_v2_easy_only` için daha geniş audit.
- Esmâü’l-Hüsnâ kaynağını ayrı inspect etmek.
- `extended-roots.json` küçük kök ekranı katkısını ölçmek.
- coreDb default için daha geniş consistency audit.

### Düşük Öncelik / Park

- Hadith corpus.
- İngilizce tafsir corpus.
- quran-json dist raw archive.
- data/quran/external raw repo dump.
- Meal phrase extraction.

## Kapanış Kararı

Veri keşif fazı kapanabilir.

Bundan sonra çalışma modeli:

1. Yeni kaynak arama yok.
2. Mevcut kaynak için hedefli inspect var.
3. Suffix output üretmeden ana veri dosyası değişmez.
4. Runtime/default değişmeden önce opt-in audit gerekir.
5. User-facing metne yalnız policy/gate geçmiş veri girer.

En doğru sonraki teknik adım:

- `source-status-mapper.sample.json` veya v4 canonical için opt-in preview snapshot entegrasyonunu küçük, geri alınabilir bir paket olarak denemek.

En doğru veri adımı:

- Morfoloji alignment için 10 ayetlik manual-review repair candidate snapshot üretmek.
