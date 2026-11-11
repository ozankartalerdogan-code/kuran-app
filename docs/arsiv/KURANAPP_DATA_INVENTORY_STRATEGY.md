# KuranApp Veri Envanteri ve Kullanim Stratejisi

Tarih: 2026-05-13

Bu dokuman KuranApp icindeki veri kaynaklarini, aktif kullanim durumlarini, build/enrichment kaynaklarini, raw archive alanlarini ve Kanitli Analiz'i guclendirmek icin onerilen veri stratejisini ozetler.

Bu rapor inspect-only hazirlandi. Kod davranisi, runtime source, default source, UI, decision hierarchy, preview logic veya veri dosyalari degistirilmedi.

## 1. Kisa Genel Sonuc

Veri tamamen eksik degil. Asil tablo su: projede cok veri var, ama bu verinin onemli bir kismi runtime'a dogrudan bagli degil; bir kismi build/enrichment input, bir kismi raw archive, bir kismi de henuz inspect edilmemis ham kaynak.

Kanitli Analiz icin en buyuk firsat `keyTerms` ve `wordByWord` kalitesinde. Ozellikle `data2/processed/canonical_word_analysis_v4.json` ile `meaning_tr` coverage ciddi iyilesti; fakat v4 henuz default degil. Kalan risk, verinin yoklugundan cok visible keyTerms seciminde hangi anlamlarin kullaniciya cikacagini kontrollu belirlemek.

En yuksek degerli veri firsati:

- `canonical_word_analysis_v4.json` opt-in kaynaginin daha genis audit edilmesi.
- Kalan `meaning_tr` bosluklarinda zamir/edat/kalip olmayan icerik adaylarinin ceviri ve review surecine alinmasi.
- `root_explanations_tr_enriched.json` icindeki 733 bos `short_tr/summary_tr` kaydinin kontrollu doldurulmasi.
- `coreDb` ile JSON source arasindaki farklarin daha genis ama inspect-only sekilde denetlenmesi.

## 2. Aktif Runtime Kaynaklari

### `data/normalized/arabic.json`

- Icerik: 6236 ayetin Arapca metni.
- Kayit sayisi: 6236.
- Okuyan kod: `packages/core/src/adapters/quranAdapter.ts`.
- Katki: `arabicText`, ayet varlik durumu, ayet detay sayfasi ve `VerseAnalysisContext`.
- Durum: Aktif runtime source.

### `data/normalized/translations.json`

- Icerik: 6236 ayet icin Turkce meal kaynaklari ve transliteration alanlari.
- Kayit sayisi: 6236 ayet kaydi; dosya boyutu yaklasik 59.9 MB.
- Okuyan kod: `packages/core/src/adapters/translationAdapter.ts`.
- Katki: `translations`, `primaryTranslation`, meal sayisi, translation preview ve UI meal listeleri.
- Durum: Aktif runtime source.

### `data/normalized/surah-meta.json`

- Icerik: 114 sure metadata kaydi; sure adi, ayet sayisi, vahiy tipi/sirasi gibi alanlar.
- Kayit sayisi: 114.
- Okuyan kod: `packages/core/src/adapters/quranAdapter.ts`.
- Katki: sure listesi, ayet navigasyonu, temel metadata.
- Durum: Aktif runtime source.

### `data2/processed/canonical_word_analysis.json`

- Icerik: ayet bazli canonical kelime analizi; Arapca kelime, lemma, root, pos, role, morphology, `meaning_tr`, `gloss_en`, `root_explanation_tr`, missing fields.
- Kayit sayisi: 6236 ayet, 77429 word kaydi.
- Bos `meaning_tr`: 18207.
- Bos `gloss_en`: 23511.
- Confidence dagilimi: mevcut dosyada tum kayitlar fiilen `missing` confidence olarak gorunuyor.
- Okuyan kod: `packages/core/src/analysis/verseAnalysisContext.ts`, `packages/core/src/adapters/canonicalWordAnalysisAdapter.ts`.
- Katki: `wordByWord`, `roots`, `lemmas`, `morphology`, `rootMeanings`, `keyTerms`, decision signals.
- Durum: Default JSON runtime kelime source. Bu hala default.

### `data2/processed/canonical_word_analysis_v2.json`

- Icerik: dictionary/root enrichment sonrasi opt-in canonical kaynak.
- Kayit sayisi: 6236 ayet, 77429 word kaydi.
- Bos `meaning_tr`: 18207.
- Bos `gloss_en`: 22955.
- Confidence dagilimi: `medium`: 41444, `low-enriched`: 13030, `low`: 5177, `missing`: 17778.
- Okuyan kod: `packages/core/src/analysis/verseAnalysisContext.ts` opt-in `source: "v2"`.
- Katki: runtime default degil; audit/inspect ve kaynak destekli keyTerms deneyleri.
- Durum: Opt-in source.

### `data2/processed/canonical_word_analysis_v3.json`

- Icerik: ilk 3000 ceviri adayi import sonrasi opt-in canonical kaynak.
- Kayit sayisi: 6236 ayet, 77429 word kaydi.
- Bos `meaning_tr`: 4200.
- Bos `gloss_en`: 22955.
- Confidence dagilimi: `medium`: 54005, `low-enriched`: 469, `low`: 5177, `missing`: 17778.
- Okuyan kod: `packages/core/src/analysis/verseAnalysisContext.ts` opt-in `source: "v3"`.
- Audit: 500 ayette preview error 0, emptyKeyTerms 90, visible keyTerms 1133, low-confidence visible term 0.
- Durum: Opt-in source; default degil.

### `data2/processed/canonical_word_analysis_v4.json`

- Icerik: kalan anlam adaylarindan temiz 207 satirlik ceviri batch import sonrasi opt-in canonical kaynak.
- Kayit sayisi: 6236 ayet, 77429 word kaydi.
- Bos `meaning_tr`: 3827.
- Bos `gloss_en`: 22955.
- Confidence dagilimi: `medium`: 54142, `low-enriched`: 332, `low`: 5177, `missing`: 17778.
- Okuyan kod: `packages/core/src/analysis/verseAnalysisContext.ts` opt-in `source: "v4"`.
- Audit: 500 ayette preview error 0, emptyKeyTerms 90, visible keyTerms 1134, low-confidence visible term 0.
- Katki: v3'e gore 373 word kaydinda daha fazla `meaning_tr`; ilk 500 ayette visible keyTerms toplaminda +1.
- Durum: Opt-in source; default degil.

### `data/meal-comparison/by-surah/*.json`

- Icerik: sure bazli meal karsilastirma cache'i.
- Dosya sayisi: 114.
- Toplam boyut: yaklasik 161 MB.
- Okuyan kod: `packages/core/src/adapters/external/mealComparisonAdapter.ts`.
- Katki: `translationComparison.availableTranslations`, `commonPhrases`, `divergentPhrases`, `translationDifferencesPreview`.
- Durum: Aktif runtime source.
- Not: `data/meal-comparison/by-surah/index.json` yok; adapter sure dosyalarini `001.json` formatinda okuyor.

### `data/fidelity/by-surah/index.json`

- Icerik: 6236 ayet icin fidelity/kelime-karsilik sinyalleri.
- Kayit sayisi: 6236.
- Boyut: yaklasik 161 MB.
- Okuyan kod: `packages/core/src/adapters/fidelityAdapter.ts`.
- Katki: `fidelitySignals`, `weakOrMissingCorrespondences`, `coveredTerms`, `weakCorrespondencesPreview`.
- Durum: Aktif runtime source.

### `data/word-analysis/reports/coverage-by-ayah.json`

- Icerik: ayet bazli word coverage raporu.
- Kayit sayisi: 6236.
- Okuyan kod: `packages/core/src/analysis/verseAnalysisContext.ts`.
- Katki: fidelity risk notlari, coverage/morphology eksikligi sinyalleri.
- Durum: Aktif runtime destek kaynagi.

### `data/word-analysis/reports/missing-meanings.json`

- Icerik: eksik anlam raporu.
- Kayit sayisi: 24338.
- Okuyan kod: `packages/core/src/analysis/verseAnalysisContext.ts`.
- Katki: `weakOrMissingCorrespondences` ve risk notlari.
- Durum: Aktif runtime destek kaynagi.

### `data/revelation-context/surah/index.json`

- Icerik: sure bazli vahiy/nuzul baglam notlari.
- Kayit sayisi: 114.
- Okuyan kod: `packages/core/src/adapters/revelationContextAdapter.ts`, `packages/core/src/adapters/external/diyanetNuzulAdapter.ts`.
- Katki: `contextNuzul`, `context_notes`, source status.
- Durum: Aktif runtime source, ama ayet bazli degil; sure bazli kapsam.

### `data/tafsir/ayah-ranges/index.json`

- Icerik: ayet araliklari icin tefsir cache hedefi.
- Mevcut durum: dosya fiilen bos/çok sinirli gorunuyor.
- Okuyan kod: `packages/core/src/adapters/external/diyanetTafsirAdapter.ts`.
- Katki: `tafsirNotes`, `sourceStatus`.
- Durum: Aktif runtime path, fakat kapsam sinirli. Global audit'te "Ayet bazli tefsir ozeti sinirli." gercek risk degil, coverage notice olarak ele aliniyor.

### `data/tafsir/surah/index.json`

- Icerik: sure bazli tefsir metinleri.
- Kayit sayisi: 114.
- Okuyan kod: runtime JSON adapter direkt bunu okumuyor; `scripts/build-core-analysis-db.py` coreDb context notes uretirken kullanir.
- Katki: coreDb icinde `context_notes`/`tafsir_note`.
- Durum: Runtime JSON hattinda aktif degil; coreDb build input.

### `data/kuran_core.db`

- Icerik: merkezi SQLite analiz veritabani.
- Boyut: yaklasik 208 MB.
- Tablolar: `verses`, `translations`, `words`, `root_meanings`, `translation_comparison`, `fidelity_signals`, `context_notes`, `build_meta`.
- Satir sayilari: verses 6236, translations 229085, words 77429, root_meanings 415, translation_comparison 229085, fidelity_signals 36810, context_notes 12472, build_meta 22.
- Okuyan kod: `packages/core/src/analysis/coreDbVerseSource.ts`.
- Katki: opsiyonel `source: "coreDb"` ile VerseAnalysisContext benzeri veri.
- Durum: Opt-in source; default degil.

## 3. Build / Enrichment Input Kaynaklari

### `data2/QURAN-NLP/data/quran/corpus/quran_dictionary.csv`

- Icerik: `arabic_word`, `translation`, `title`, `location`, transliteration gibi alanlar.
- Kayit sayisi: 53924.
- Su an kullanim: runtime'da dogrudan kullanilmiyor.
- Kullanan script: `scripts/enrich-meanings-from-dictionary.py`, `data2/scripts/build_canonical_word_analysis.js`.
- Gucledirdigi cikti: `canonical_word_analysis_enriched.json`, `gloss_en`, source-backed enrichment.
- Risk: Ingilizce gloss dogrudan Turkce meaning degil; keyTerms'e meaning_tr gibi basilmamali.

### `data2/QURAN-NLP/data/quran/corpus/quran_verbs.csv`

- Icerik: fiil, root, form, frequency, Ingilizce translation.
- Kayit sayisi: 1475.
- Su an kullanim: runtime'da dogrudan kullanilmiyor.
- Kullanan script: `scripts/enrich-root-meanings.py`.
- Gucledirdigi cikti: `root_explanations_tr_enriched.json`.
- Risk: Ingilizce root glosslari Turkce aciklama yerine gecmemeli; `short_tr`/`summary_tr` elle veya kontrollu ceviriyle doldurulmali.

### `data2/QURAN-NLP/data/quran/corpus/quran_lemmas.csv`

- Icerik: lemma, buckwalter, frequency, part_of_speech.
- Kayit sayisi: 3680.
- Su an kullanim: rapora gore henuz aktif enrichment hattinda sinirli/indirekt; runtime'da dogrudan kullanilmiyor.
- Gucledirebilecegi cikti: lemma frequency, proper-name detection, content-word prioritization, kalan candidate ranking.
- Risk: POS/frequency tek basina keyTerms yapmak icin yeterli degil.

### `data2/corpus-morphology.txt`

- Icerik: corpus morphology kaynagi.
- Boyut: yaklasik 6.3 MB.
- Su an kullanim: canonical build kaynaklarindan biri.
- Kullanan script: `data2/scripts/build_canonical_word_analysis.js`.
- Gucledirdigi cikti: lemma/root/role/morphology.
- Risk: encoding/normalizasyon sorunlari ve segment-level mapping farklari.

### `data2/quran-morphology/quran-morphology.txt`

- Icerik: alternatif morphology kaynagi.
- Boyut: yaklasik 6.3 MB.
- Su an kullanim: canonical build input.
- Gucledirdigi cikti: pos, role, morphology fallback.
- Risk: kaynaklar arasi root/lemma farklari; build conflict raporuyla izlenmeli.

### `data/word-analysis/quran-morphology.txt`

- Icerik: aktif morphology kaynak dosyasi.
- Boyut: yaklasik 6.3 MB.
- Su an kullanim: canonical build input ve legacy word analysis adapter tarafinda destek.
- Gucledirdigi cikti: wordByWord, morphology, role.
- Risk: segment/token hizalama farklari.

### `data/word-analysis/word-translations-tr.json`

- Icerik: Turkce kelime ve kok anlam destegi.
- Boyut: yaklasik 20 KB.
- Yapisi: `translations`, `rootMeanings`.
- Su an kullanim: canonical build ve legacy word meaning lookup.
- Gucledirdigi cikti: `meaning_tr`, `rootMeaning`, keyTerms.
- Risk: kapsam dar; manuel seed oldugu icin quality yuksek ama coverage sinirli.

### `data2/processed/meaning_overrides_tr.json`

- Icerik: yuksek etkili Turkce meaning override kayitlari.
- Kayit bilgisi: `items` listesinde 129 kayit.
- Su an kullanim: canonical build input.
- Gucledirdigi cikti: temiz Turkce display meaning.
- Risk: bu dosyadaki temiz meaning'ler ezilmemeli.

### `data2/processed/meaning_overrides_from_candidates.json`

- Icerik: ilk 3000 aday cevirisinden uretilen lemma -> Turkce meaning map.
- Kayit sayisi: 3000.
- Su an kullanim: v3 uretiminde kullanildi.
- Gucledirdigi cikti: `canonical_word_analysis_v3.json`.
- Risk: zamir/edat/kalip ifadelerden gelen ceviriler visible keyTerms'e sizmamali. Bu nedenle source-backed visible filtre eklendi.

### `data2/processed/meaning_overrides_from_translation_batch_v4.json`

- Icerik: kalan temiz 207 batch'ten uretilen lemma -> Turkce meaning map.
- Kayit sayisi: 173 benzersiz lemma.
- Su an kullanim: v4 uretiminde kullanildi.
- Gucledirdigi cikti: `canonical_word_analysis_v4.json`.
- Risk: etkisi guvenli ama ilk 500 ayette visible katkisi dusuk; daha genis audit gerekir.

### `data2/processed/root_explanations_tr.seed.json`

- Icerik: Turkce kok aciklamalari icin seed.
- Kayit sayisi: 250.
- Bos `short_tr`: 0.
- Bos `summary_tr`: 0.
- Su an kullanim: canonical build input.
- Gucledirdigi cikti: rootMeaning, decision signals, keyTerms relevance.
- Risk: dar kapsam.

### `data2/processed/root_explanations_tr_enriched.json`

- Icerik: quran_verbs ile genisletilmis kok listesi.
- Kayit sayisi: 983.
- Bos `short_tr`: 733.
- Bos `summary_tr`: 733.
- Su an kullanim: v2 rebuild input.
- Gucledirebilecegi cikti: rootMeanings, decision signals, future AI context.
- Risk: bos Turkce alanlar yuzunden sadece liste genisledi; nitelikli Turkce aciklama icin review gerekir.

### `data2/processed/meaning_candidates*.csv/json`

- Icerik: eksik `meaning_tr` adaylari, siniflandirma ve ceviri batchleri.
- Mevcut onemli dosyalar:
  - `meaning_candidates.csv`: 3000 ceviri adayi.
  - `meaning_candidates_remaining_all_classified.csv`: 765 benzersiz kalan aday siniflandirmasi.
  - `meaning_candidates_translation_batch_tr.csv`: 207 cevrilmis temiz batch.
- Su an kullanim: import/build sureci; runtime dogrudan okumaz.
- Gucledirdigi cikti: v3/v4 canonical dosyalari.
- Risk: `no` sinifindaki zamir/edat/kaliplar ceviri batchine alinmamali.

## 4. Raw Archive / Kullanilmayan Kaynaklar

### `data/quran/external/Kuran`

- Icerik: buyuk ham/dis kaynak arşivi; quran meta, riwayah data, examples, source code, test data.
- Dosya sayisi: 5414.
- Toplam boyut: yaklasik 675 MB.
- Runtime'a dogrudan girmeli mi: Hayir.
- Build/enrichment input olabilir mi: Evet, ama once source lisansi, format, ayet hizalama ve encoding audit gerekir.
- Risk: cok genis ve heterojen; dogrudan runtime'a baglamak veri drift'i ve performans riski uretir.

### `data2/quran-json`

- Icerik: quran-json paketi; Arapca, ceviriler, transliteration, chapter/verse dist dosyalari.
- Dist dosya sayisi: 7513.
- Dist toplam boyut: yaklasik 81.8 MB.
- Runtime'a dogrudan girmeli mi: Zaten canonical build input olarak kullaniliyor; dogrudan runtime'a ikinci paralel Quran source olarak baglanmamali.
- Build/enrichment input olabilir mi: Evet; ayet metni, transliteration ve multilingual comparison icin inspect edilebilir.
- Risk: normalize `data/normalized` ile drift olusabilir.

### `data2/QURAN-NLP`

- Icerik: QURAN-NLP corpus, notebooks, images, webscrapers ve kaynak notlari.
- `data` altinda 72 dosya, yaklasik 278 MB.
- Runtime'a dogrudan girmeli mi: Hayir.
- Build/enrichment input olabilir mi: Evet; dictionary, verbs, lemmas ozellikle degerli.
- Risk: Ingilizce glosslar ve ham NLP etiketleri kullaniciya oldugu gibi cikmamali.

### `data/context/raw`

- Icerik: Quran Foundation chapter-info gibi raw context kaynaklari.
- Dosya sayisi: 115.
- Toplam boyut: yaklasik 1 MB.
- Runtime'a dogrudan girmeli mi: Hayir.
- Build/enrichment input olabilir mi: Evet; normalize edilmis `data/context/normalized/surah-context.json` uzerinden kullanmak daha dogru.
- Risk: sure bazli bilgi ayet bazli analiz gibi sunulmamalı.

### `data/normalized/tafsir.json`

- Icerik: normalize tefsir metni.
- Kayit sayisi: 114.
- Runtime'a dogrudan girmeli mi: Kanitli Analiz V1 icin hayir; tefsir uretmiyoruz.
- Build/enrichment input olabilir mi: Evet; sourceStatus ve future AI context icin kapsam notu olarak.
- Risk: preview'in tefsir/yorum gibi algilanmasi.

## 5. coreDb Durumu

`data/kuran_core.db`, mevcut daginik JSON/cache kaynaklarini merkezi ve ayrik tablolarda toplamak icin uretilmis SQLite omurgasidir.

Avantajlari:

- Mealler, kelimeler, kok anlamlari, meal comparison, fidelity ve context notes tek DB icinde ayrik tablolarda duruyor.
- Ayet bazli okuma daha tutarli bir source boundary sunuyor.
- Prototip `kuran.db` mantigina daha yakin.
- JSON'a gore veri birlestirme ve audit icin daha temiz.

Neden default icin dikkatli olunmali:

- coreDb daha genis `rootMeaning` ve supporting token havuzu tasidigi icin preview karar katmaninda gürültu uretme riski var.
- 28 ayet consistency audit'te profil 28/28 eslesti, ama 6 preview risk notu ve source availability farklari var.
- Supporting term havuzu JSON'a gore daha gürültulu gorunebiliyor.
- Default degisim sadece veri source degisimi degil; decision/preview davranisini da etkileyebilir.

Gerekli auditler:

- 100-500 ayet JSON vs coreDb consistency audit.
- Profil drift, axis drift, visible keyTerms drift ve sourceStatus farklarini ayri raporlayan audit.
- CoreDb source status dilinin UI'a sizma riskinin kontrolu.
- Performans audit: DB okuma vs JSON okuma.

## 6. Kanitli Analiz'e Katki Potansiyeli

### keyTerms

En kritik veri alanidir. Ana kaynak `canonical_word_analysis*` dosyalaridir. v3/v4 ile `meaning_tr` coverage iyilesti, ama visible keyTerms secimi yine profile relevance ve low-value filtrelerinden gecmeli.

En iyi kaynaklar:

- `canonical_word_analysis_v4.json`
- `meaning_overrides_tr.json`
- `meaning_overrides_from_candidates.json`
- `meaning_overrides_from_translation_batch_v4.json`
- `root_explanations_tr.seed.json`

### wordByWord

Kelime bazli analiz icin `canonical_word_analysis.json` default, v2/v3/v4 opt-in kaynaklardir. Morphology ve role alanlari `data/word-analysis/quran-morphology.txt`, `data2/corpus-morphology.txt`, `data2/quran-morphology/quran-morphology.txt` gibi inputlardan uretilir.

### root / lemma / morphology

Bu alanlarda veri var ama kaynaklar arasi normalizasyon farklari hassas. En dogru strateji raw morphology dosyalarini runtime'a baglamak degil, canonical build hattini audit ederek guclendirmek.

### translationDifferences

Ana kaynak `data/meal-comparison/by-surah/*.json`. Mevcut sorun veri yoklugu degil; bazi ayetlerde meal farki kategorisi bos kalabiliyor. Bu alanda genel fallback uretmek yerine, phrase/category decision hiyerarsisi daha kontrollu genisletilmeli.

### weakCorrespondences

Ana kaynak `data/fidelity/by-surah/index.json` ve missing/coverage raporlari. Kullaniciya ham lemma/tek harf basilmamali; mevcut preview gruplama yaklasimi dogru.

### context / nuzul / tafsir kapsam notu

Nuzul sure bazli aktif. Tefsir ayet bazli runtime path sinirli. Bu alan Kanitli Analiz V1'de yorum uretmek icin degil, source status ve future AI context icin kullanilmali.

### future AI explanation context

AI ust katmani icin en guvenli context:

- `VerseAnalysisContext`
- `VerseAnalysisPreview`
- `selectedProfile`
- clean keyTerms
- translationDifference categories
- weakCorrespondence groups
- sourceStatus

AI'ya raw archive veya raw morphology dogrudan verilmemeli.

## 7. En Yuksek Degerli Ilk 10 Veri Isi

### 1. v4 source'u 1000 ayetlik audit ile olcmek

- Amac: v4'un visible keyTerms katkisini daha genis gormek.
- Kaynak: `canonical_word_analysis_v4.json`.
- Cikti: `verse-analysis-v4-audit-1000.json`.
- Risk: Dusuk.
- Test/audit: `audit-verse-analysis-global.ts --source=v4 --limit=1000`.
- Default: Opt-in kalmali.

### 2. v4 vs json quality drift raporu

- Amac: v4'un profil/axis/keyTerms davranisini JSON default ile karsilastirmak.
- Kaynak: v4 audit snapshot + JSON baseline.
- Cikti: markdown drift raporu.
- Risk: Dusuk.
- Test/audit: 28 quality set + 500/1000 ayet compare.
- Default: Opt-in kalmali.

### 3. Kalan 3827 bos `meaning_tr` icin icerik adaylarini yeniden ayiklamak

- Amac: zamir/edat disi gercek anlam tasiyan kalanlari bulmak.
- Kaynak: `canonical_word_analysis_v4.json`.
- Cikti: yeni classified candidate CSV.
- Risk: Dusuk.
- Test/audit: no/review/yes dagilimi ve ornek kalite kontrol.
- Default: Build/enrichment input.

### 4. `root_explanations_tr_enriched.json` icindeki 733 bos Turkce kok aciklamasini batch-review yapmak

- Amac: rootMeaning coverage'i artirmak.
- Kaynak: quran_verbs + enriched roots.
- Cikti: `root_explanations_tr_reviewed.json` gibi yeni suffix.
- Risk: Orta; root anlamlari decision'i etkileyebilir.
- Test/audit: quality set + JSON/v4 source compare.
- Default: Once opt-in.

### 5. Proper name normalization sozlugu olusturmak

- Amac: Yusuf, Musa, Harun, Medyen gibi ozel adlari tutarli gostermek.
- Kaynak: v4 translation batch, QURAN-NLP lemmas, canonical words.
- Cikti: `proper_name_overrides_tr.json`.
- Risk: Dusuk.
- Test/audit: kissa ayetleri ve keyTerms preview.
- Default: Once build input, sonra opt-in.

### 6. Meal comparison category coverage audit

- Amac: `emptyTranslationDifferences` baskin problem tipini anlamak.
- Kaynak: `data/meal-comparison/by-surah/*.json`.
- Cikti: profile bazli empty meal diff raporu.
- Risk: Dusuk.
- Test/audit: global audit riskType counts.
- Default: Davranis degistirmeden inspect.

### 7. Fidelity weak correspondence noise audit

- Amac: weakCorrespondences bos/gürültulu alanlarini profile gore ayirmak.
- Kaynak: `data/fidelity/by-surah/index.json`, missing reports.
- Cikti: weak group coverage raporu.
- Risk: Dusuk.
- Test/audit: 500/1000 ayet snapshot.
- Default: Davranis degistirmeden inspect.

### 8. coreDb sourceStatus ve supporting-term noise audit

- Amac: coreDb default karari oncesi supporting gürültusunu olcmek.
- Kaynak: `data/kuran_core.db`.
- Cikti: JSON vs coreDb preview-risk raporu.
- Risk: Dusuk/Orta.
- Test/audit: quality set + 500 ayet consistency.
- Default: Opt-in kalmali.

### 9. Tefsir/nuzul source coverage map

- Amac: sourceStatus'taki kapsam notlarini netlestirmek.
- Kaynak: `data/revelation-context`, `data/tafsir`, `data/context`.
- Cikti: ayet/sure bazli coverage haritasi.
- Risk: Dusuk.
- Test/audit: source_missing vs coverage_notice ayrimi.
- Default: Runtime davranisi degismeden rapor.

### 10. AI context contract dokumani

- Amac: future AI katmanina hangi alanlar verilecek, hangileri verilmeyecek belirlemek.
- Kaynak: `VerseAnalysisContext`, `VerseAnalysisPreview`, audit raporlari.
- Cikti: `docs/KANITLI_ANALIZ_AI_CONTEXT_CONTRACT.md`.
- Risk: Dusuk.
- Test/audit: prompt/output dry-run; uygulama davranisi degismeden.
- Default: Tasarim dokumani.

## 8. Simdilik Yapilmamasi Gerekenler

- Raw archive'i dogrudan runtime'a baglama.
- `data/quran/external/Kuran` veya tum `data2/QURAN-NLP` klasorunu runtime source yapma.
- Fallback ile keyTerms doldurma.
- Ham lemma, Buckwalter, tek harf veya edat/zamir formlarini visible keyTerms'e cikarma.
- AI yorum katmanina erken gecme.
- coreDb'yi hemen default yapma.
- `canonical_word_analysis.json` default dosyasini dogrudan ezme.
- Mevcut temiz `meaning_tr` degerlerini overwrite etme.
- Tefsir kaynaklarini Kanitli Analiz preview'i gibi sunma.
- Sadece 5-28 ayete bakarak global kalite karari verme.

## 9. Onerilen Yol Haritasi

### Faz 1: v4 opt-in kalite denetimi

- v4 icin 1000 ayet audit.
- v4 vs json visible keyTerms fark raporu.
- v4 quality set 28/28 ve warn 0 durumunun korunmasi.

### Faz 2: Kalan meaning/root coverage temizligi

- Kalan 3827 bos `meaning_tr` icinden icerik adaylari.
- `root_explanations_tr_enriched.json` 733 bos root aciklamasi icin kontrollu batch.
- Proper name sozlugu.

### Faz 3: coreDb default karar oncesi audit

- JSON vs coreDb 500/1000 ayet consistency.
- Preview-risk ve sourceStatus farklarinin ayrilmasi.
- Performans ve build tekrar edilebilirlik kontrolu.

### Faz 4: AI ust katman kontrati

- AI sadece clean context ve preview alanlarini kullanmali.
- AI yorum/tefsir degil, kanitli analiz ust anlatimi uretmeli.
- Prompt contract ve safety rules dokumante edilmeli.

## Ek: En Degerli ve En Riskli Kaynaklar

### En degerli 5 kaynak

1. `data2/processed/canonical_word_analysis_v4.json`
2. `data/normalized/translations.json`
3. `data/meal-comparison/by-surah/*.json`
4. `data/fidelity/by-surah/index.json`
5. `data2/processed/root_explanations_tr.seed.json` ve reviewed/enriched devam hattı

### En riskli 5 kaynak

1. `data/quran/external/Kuran` - cok buyuk raw archive; dogrudan runtime riski yuksek.
2. `data2/QURAN-NLP` - cok degerli ama ham Ingilizce/NLP verisi; dogrudan UI riski yuksek.
3. `data2/processed/root_explanations_tr_enriched.json` - 733 bos Turkce aciklama; decision drift riski.
4. `data/kuran_core.db` - merkezi ve guclu ama supporting-term gürültusu ve source drift riski var.
5. `data/tafsir/surah/index.json` / `data/normalized/tafsir.json` - tefsir kapsamli; preview ile tefsir/yorum cizgisi karismamali.

### Ilk yapilmasi gereken veri isi

Ilk sirada v4 opt-in kaynagini 1000 ayetlik audit ile olcmek en mantikli is. Bunun sebebi v4'un default'a yaklastirilip yaklastirilmamasina karar vermeden once kalite ve gürültu etkisinin daha genis gorulmesi gerekir.

### Hic dokunulmamasi gereken seyler

- Default `json` source karari.
- `AnalysisEngineV1` logic.
- Semantic provider/prompt.
- UI kart davranisi.
- Temiz `meaning_tr` kayitlari.
- Raw archive kaynaklarinin dogrudan runtime'a baglanmasi.
