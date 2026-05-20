# KuranApp Proje Raporu

Bu dokuman, projenin mevcut durumunu, veri dosyalarini, Kanitli Analiz V1 hattini, coreDb calismasini, UI entegrasyonunu ve bundan sonra yapilmasi gerekenleri tek yerde toplamak icin hazirlandi.

Tarih: 2026-05-13

## 1. Kisa Ozet

KuranApp su anda Next.js web uygulamasi, ortak core paketleri, normalize edilmis Kur'an verileri, kelime/morfoloji verileri ve Kanitli Analiz V1 isimli deterministic analiz-preview hatti etrafinda ilerliyor.

Bugunku ana durum:

- Web uygulamasi `apps/web` altinda.
- Ana domain ve veri isleme kodu `packages/core` altinda.
- Varsayilan analiz kaynagi halen JSON/cache hattidir.
- `data/kuran_core.db` merkezi SQLite veri kaynagi olarak olusturuldu ama default yapilmadi.
- Kanitli Analiz karti ayet detay sayfasinda Analiz sekmesine baglandi.
- Eski `AnalysisEngineV1` ana analiz yuzeyi olmaktan cikarildi, yardimci tema/katilimci sinyali seviyesine indirildi.
- 28 ayetlik kalite setinde profil secimi `28/28` basarili.
- Global audit altyapisi var; su an son hizli kosu 100 ayetliktir.
- Source-backed keyTerms visibility duzeltmesiyle ilk 100 ayette empty keyTerms sayisi `26 -> 13` dustu.

## 2. Proje Iskeleti

Kok dizin:

```text
kuran_app/
  apps/
    web/
    mobile/
  packages/
    core/
    types/
    ui/
  data/
  data2/
  scripts/
  docs/
  package.json
  tsconfig.base.json
```

### 2.1 `apps/web`

Next.js web uygulamasidir.

Onemli dosya:

- `apps/web/src/app/surah/[surahId]/ayah/[ayahNumber]/page.tsx`

Bu dosya ayet detay sayfasidir. Ayet metni, mealler, analiz sekmesi, Kanitli Analiz karti ve yardimci Tema ve Katilimci Sinyalleri burada render edilir.

Web paket komutlari:

```bash
npm run dev -w @quran-app/web
npm run typecheck -w @quran-app/web
npm run build -w @quran-app/web
```

### 2.2 `packages/core`

Projenin ana domain paketidir. Quran adapterlari, analiz motorlari, semantic safe summary, Kanitli Analiz context/decision/preview hatti burada.

Ana export dosyasi:

- `packages/core/src/index.ts`

Buradan su ana fonksiyonlar disari veriliyor:

- `getSurahs`
- `getAyah`
- `getSurahContext`
- `getAyahDetail`
- `buildVerseAnalysisContext`
- `buildVerseAnalysisPreview`
- `getAyahAnalysisEngine`
- semantic quality/selection helperlari
- adapter kaynak bilgileri

### 2.3 `packages/types`

Ortak type tanimlarini tasir.

Onemli dosyalar:

- `packages/types/src/quran.ts`
- `packages/types/src/analysis.ts`
- `packages/types/src/index.ts`

### 2.4 `packages/ui`

Su an minimal UI paketidir. Buyuk UI sistemi burada degil; asil sayfa sunumu `apps/web` icinde.

### 2.5 `scripts`

Veri build, inspect, audit ve smoke araclari burada.

En onemli scriptler:

- `scripts/inspect-verse-analysis-context.ts`
- `scripts/audit-verse-analysis-global.ts`
- `scripts/audit-json-vs-coredb-consistency.ts`
- `scripts/build-core-analysis-db.py`
- `scripts/inspect-core-analysis-db.py`
- `scripts/compare-core-db-context.py`

## 3. Veri Klasorleri

### 3.1 `data/normalized`

Uygulamanin default JSON kaynaginin ana kisimlarindan biridir.

Onemli dosyalar:

- `data/normalized/arabic.json`
- `data/normalized/translations.json`
- `data/normalized/surah-meta.json`
- `data/normalized/tafsir.json`

Rolleri:

- `arabic.json`: 6236 ayetin Arapca metin temel kaynagi.
- `translations.json`: meal kaynaklarini normalized formatta tutar.
- `surah-meta.json`: sure metadata bilgileri.
- `tafsir.json`: normalize tefsir verisi; Kanitli Analiz V1 tarafinda su an dogrudan ana aciklama kaynagi degil.

### 3.2 `data2/processed`

Kelime/morfoloji/meaning hattinin en kritik islenmis veri alanidir.

Onemli dosyalar:

- `data2/processed/canonical_word_analysis.json`
- `data2/processed/meaning_overrides_tr.json`
- `data2/processed/root_explanations_tr.seed.json`
- `data2/processed/word_analysis.json`
- `data2/processed/word_analysis_report.json`

Rolleri:

- `canonical_word_analysis.json`: Kanitli Analiz icin ana kelime kaynagidir. Her kelime icin Arapca, lemma, root, role, morphology, `meaning_tr`, `root_explanation_tr`, `gloss_en`, missing field bilgileri tasir.
- `meaning_overrides_tr.json`: Turkce anlam duzeltmeleri/override kaynagidir.
- `root_explanations_tr.seed.json`: kok anlamlari icin Turkce seed veri kaynagidir.
- `word_analysis.json` ve `word_analysis_report.json`: onceki/yardimci word analysis build ciktilari.

### 3.3 `data/word-analysis`

Kelime analizi ve coverage raporlarini tutar.

Onemli dosyalar:

- `data/word-analysis/quran-morphology.txt`
- `data/word-analysis/word-translations-tr.json`
- `data/word-analysis/extended-roots.json`
- `data/word-analysis/reports/coverage-by-ayah.json`
- `data/word-analysis/reports/missing-meanings.json`
- `data/word-analysis/reports/root-explanations.json`

Rolleri:

- `quran-morphology.txt`: morfoloji kaynak dosyasi.
- `word-translations-tr.json`: kelime/kok Turkce anlam destegi.
- `coverage-by-ayah.json`: ayet bazli kelime coverage durumu.
- `missing-meanings.json`: eksik anlam raporu; weak/missing correspondence ve fidelity sinyallerinde kullaniliyor.

### 3.4 `data/meal-comparison`

Meal karsilastirma cache alanidir.

Onemli dosyalar:

- `data/meal-comparison/by-surah/*.json`
- `data/meal-comparison/index` benzeri ozet kaynaklar

Kanitli Analiz icinde:

- `translationComparison.availableTranslations`
- `commonPhrases`
- `divergentPhrases`
- `translationDifferencesPreview`

alanlarina veri verir.

### 3.5 `data/fidelity`

Meal/kelime karsilik kontrolu ve fidelity sinyallerini tutar.

Onemli dosya:

- `data/fidelity/by-surah/index.json`

Kanitli Analiz icinde:

- `fidelitySignals`
- `weakOrMissingCorrespondences`
- `weakCorrespondencesPreview`

alanlarina kaynak olur.

### 3.6 `data/revelation-context`

Sure/ayet baglam notlari icin kullanilir.

Onemli dosya:

- `data/revelation-context/surah/index.json`

Kanitli Analiz context icinde:

- `contextNuzul`
- `context_notes`

tarafina katki verir.

### 3.7 `data/tafsir`

Tefsir cache/kaynak alanidir.

Onemli dosyalar:

- `data/tafsir/surah/index.json`
- `data/tafsir/ayah-ranges/*`

Su an Kanitli Analiz V1 tefsir uretmez. Tefsir ozetinin ayet bazinda sinirli oldugu bilgi olarak `sourceStatus.missing` tarafinda gorunebilir. Global audit tarafinda bu artik gercek risk degil, `coverageNotice` olarak sayilir.

### 3.8 `data/analysis-snapshots`

Inspect ve audit ciktilarinin tutuldugu yerdir.

Onemli dosyalar:

- `verse-analysis-context.sample.json`
- `verse-analysis-preview.sample.json`
- `verse-analysis-context.coredb.sample.json`
- `verse-analysis-preview.coredb.sample.json`
- `verse-analysis-quality-set.sample.json`
- `json-vs-coredb-consistency-audit.sample.json`
- `core-db-context-comparison.sample.json`
- `verse-analysis-global-audit.sample.json`
- `verse-analysis-global-audit.checkpoint.json`

Dikkat:

- Son global audit snapshot'i 100 ayetlik hizli kosudan gelmektedir.
- Daha once tum 6236 ayet icin uzun bir audit kosusu yapildi; fakat son test snapshot'i 100 ayetlik kosuyla guncellendi.

## 4. Merkezi SQLite DB: `data/kuran_core.db`

`data/kuran_core.db`, JSON/cache dosyalarindaki veriyi daha duzenli merkezi bir omurgada toplamak icin olusturuldu.

Boyut:

- Yaklasik 198 MB

DB build scripti:

- `scripts/build-core-analysis-db.py`

DB inspect scripti:

- `scripts/inspect-core-analysis-db.py`

Son DB satir sayilari:

```text
verses: 6236
translations: 229085
words: 77429
root_meanings: 415
translation_comparison: 229085
fidelity_signals: 36810
context_notes: 12472
```

### 4.1 DB Tablolari

#### `verses`

Alanlar:

- `verse_key`
- `surah_id`
- `ayah_number`
- `arabic_text`
- `primary_translation`

Amaç:

- Her ayetin ana kaydi.

#### `translations`

Alanlar:

- `verse_key`
- `source`
- `text`

Amaç:

- Her ayet icin tum meal kaynaklarini satir satir tutmak.

#### `words`

Alanlar:

- `verse_key`
- `word_index`
- `segment_index`
- `arabic`
- `root`
- `lemma`
- `pos`
- `morphology`
- `meaning_tr`
- `gloss_en`
- `confidence`
- `source`

Amaç:

- Kelime bazli analiz verisini merkezi sekilde tutmak.

#### `root_meanings`

Alanlar:

- `root`
- `meaning_tr`
- `source`

Amaç:

- Kok anlamlarini ayri tabloda tutmak.

#### `translation_comparison`

Alanlar:

- `verse_key`
- `source`
- `normalized_text`
- `raw_json`

Amaç:

- Meal karsilastirma kayitlarini ayri tutmak.

#### `fidelity_signals`

Alanlar:

- `verse_key`
- `word_index`
- `root`
- `lemma`
- `signal_type`
- `label_tr`
- `confidence`
- `note`
- `raw_json`

Amaç:

- Weak/missing correspondence ve fidelity sinyallerini tutmak.

#### `context_notes`

Alanlar:

- `verse_key`
- `scope`
- `type`
- `source`
- `text`

Amaç:

- Baglam, nuzul, tefsir/kapsam notu gibi ek notlari tutmak.

#### `build_meta`

Amaç:

- DB build sirasinda hangi kaynaklarin mevcut/partial/eksik oldugunu kaydetmek.

### 4.2 coreDb Neden Default Degil?

coreDb guclu ve temiz bir merkezi kaynak ama henuz default yapilmadi.

Sebep:

- 28 ayetlik JSON vs coreDb auditinde profil secimi 26/28 ayni.
- `5:3` ve `12:100` ayetlerinde anlamli drift goruldu.
- Drift nedeni veri eksiginden cok mapping/weighting farki.
- coreDb side-by-side audit ve POC icin uygun, ama default icin erken.

## 5. Kanitli Analiz V1 Mimarisi

Ana akis:

```text
Veri kaynaklari
  -> VerseAnalysisContext
  -> verseAnalysisSignals
  -> verseAnalysisDecision
  -> verseAnalysisPreview
  -> Kanitli Analiz UI card
```

### 5.1 `verseAnalysisContext.ts`

Dosya:

- `packages/core/src/analysis/verseAnalysisContext.ts`

Gorevi:

- Ayet verisini, mealleri, kelime analizini, kok/lemma/morfoloji bilgisini, fidelity sinyallerini, meal karsilastirmasini, baglam notlarini ve debug source durumlarini tek context yapisinda toplar.

Default:

- `source: "json"`

Opsiyonel:

- `source: "coreDb"`

Urettigi ana alanlar:

- `verseKey`
- `surahId`
- `ayahNumber`
- `arabicText`
- `primaryTranslation`
- `translations`
- `wordByWord`
- `roots`
- `lemmas`
- `morphology`
- `rootMeanings`
- `translationComparison`
- `fidelitySignals`
- `keyTerms`
- `deterministicNotes`
- `signalDebug`
- `contextNuzul`
- `tafsirNotes`
- `themesConcepts`
- `availableSources`
- `missingSources`
- `debugSources`

### 5.2 `verseAnalysisSignals.ts`

Dosya:

- `packages/core/src/analysis/verseAnalysisSignals.ts`

Gorevi:

- Context icindeki kelime ve meal verisinden deterministic sinyaller uretir.

Urettigi alanlar:

- `keyTerms`
- `commonPhrases`
- `divergentPhrases`
- `coveredTerms`
- `deterministicNotes`
- `suppressedLowConfidenceTerms`
- `suppressedLowUsefulnessTerms`
- `recoveredCoreTerms`
- `suppressedNoisyPhrases`

Onemli davranis:

- Ham transliteration/encoding kalintilarini bastirir.
- Dusuk guvenli terimleri kullanici-facing listelerden saklar.
- Kisa ayetlerde minimum core term recovery yapar.
- Phrase cleanup yapar.

### 5.3 `verseAnalysisDecision.ts`

Dosya:

- `packages/core/src/analysis/verseAnalysisDecision.ts`

Gorevi:

- Ayetin profilini secer.
- Profil bazli ana anlam ekseni uretir.
- Meal farki kategorilerini uretir.
- Weak correspondence gruplarini uretir.
- Key term profil skoru verir.

Mevcut profiller:

- `tevhid_birlik`
- `dua_kulluk`
- `yol_hidayet`
- `uyari_inkar`
- `hukum_istisna`
- `ahiret`
- `rahmet_magfiret`
- `kissa`
- `emir_yasak`
- `genel_karma`

Profil secimi ayet numarasina hardcode degildir. Token, root, lemma, meaning, rootMeaning, theme ve meal sinyallerinden calisir.

### 5.4 `verseAnalysisPreview.ts`

Dosya:

- `packages/core/src/analysis/verseAnalysisPreview.ts`

Gorevi:

- Context + decision sonucunu kullanici-facing preview alanlarina donusturur.

Urettigi alanlar:

- `verseKey`
- `title`
- `selectedProfile`
- `mainMeaningAxisPreview`
- `keyTermsPreview`
- `supportingKeyTermsPreview`
- `translationDifferencesPreview`
- `weakCorrespondencesPreview`
- `commonPhrasesPreview`
- `evidenceNotesPreview`
- `sourceStatus`

Son onemli degisiklik:

- `keyTermsPreview` artik fallback anlamdan ziyade source-backed `wordByWord.meaning` ve `context.keyTerms` uzerinden aday seciyor.
- Profile relevance artik sadece filtre gibi degil, siralama/guclendirme etkisi olarak kullaniliyor.
- Turkce `i/ı` normalizasyonu iyilestirildi.

### 5.5 `verseAnalysisQualitySet.ts`

Dosya:

- `packages/core/src/analysis/verseAnalysisQualitySet.ts`

Gorevi:

- Sabit kalite setini tanimlar.

Kalite seti:

- 28 ayet
- 10 profil/kategori ailesi
- Her kayitta `verseKey`, kategori, beklenen profil, axis hint ve kisa not var.

Son durum:

- `expectedProfileMatchedCount: 28/28`
- `warnCount: 0`

## 6. UI Entegrasyonu

Dosya:

- `apps/web/src/app/surah/[surahId]/ayah/[ayahNumber]/page.tsx`

### 6.1 Kanitli Analiz Karti

Sayfada `buildVerseAnalysisContext(...)` cagrilir, sonra `buildVerseAnalysisPreview(...)` ile preview uretilir.

Karta basilan alanlar:

- Ana anlam ekseni: `mainMeaningAxisPreview`
- Anahtar terimler: `keyTermsPreview`
- Mealler arasi farklar: `translationDifferencesPreview`
- Dikkat isteyen karsilik alanlari: `weakCorrespondencesPreview`
- Kaynak durumu: `sourceStatus`

Normal kullaniciya gosterilmeyen:

- `supportingKeyTermsPreview`
- raw/debug JSON
- legacy engine teknik adlari

### 6.2 AnalysisEngineV1 Durumu

`AnalysisEngineV1` silinmedi.

Yeni rolu:

- Ana analiz motoru degil.
- `Tema ve Katilimci Sinyalleri` adinda yardimci sinyal blogu.
- Normal kullaniciya teknik/legacy dil gostermemesi hedeflendi.

## 7. Yapilan Isler

### 7.1 VerseAnalysisContext POC

Ilk olarak 5 test ayeti icin context builder kuruldu:

- `1:5`
- `1:7`
- `2:7`
- `2:173`
- `112:1`

Bu builder mevcut verileri topladi, uydurma veri uretmedi.

### 7.2 Snapshot Altyapisi

`scripts/inspect-verse-analysis-context.ts` eklendi/guncellendi.

Uretilen snapshotlar:

- `verse-analysis-context.sample.json`
- `verse-analysis-preview.sample.json`
- `verse-analysis-context.coredb.sample.json`
- `verse-analysis-preview.coredb.sample.json`
- `verse-analysis-quality-set.sample.json`

### 7.3 Deterministic Signal Layer

`verseAnalysisSignals.ts` eklendi.

Amac:

- AI olmadan veri-temelli sinyal uretmek.
- Key terms, phrase, weak/fidelity ve deterministic notes uretmek.

### 7.4 Signal Cleanup

Yapilan temizlikler:

- Buckwalter/transliteration kalintilari bastirildi.
- Dusuk guvenli terimler debug'a alindi.
- Semantic usefulness filtresi eklendi.
- Minimum visible core term recovery eklendi.
- Phrase normalization ve segmentation cleanup yapildi.

### 7.5 User-facing Preview

`verseAnalysisPreview.ts` eklendi.

Amac:

- Context verisini kullaniciya gosterilebilir on analiz formatina cevirmek.

Alanlar:

- main axis
- key terms
- translation differences
- weak correspondences
- evidence notes
- source status

### 7.6 Decision Hierarchy

`verseAnalysisDecision.ts` guclendirildi.

Onemli duzeltmeler:

- `2:7` ve `2:173` yanlis tevhid ekseninden cikarildi.
- `112:4` tevhid oldu.
- `5:90` emir/yasak oldu.
- `39:53` rahmet/magfiret oldu.
- `49:12` emir/yasak oldu.
- `2:177` genel/karma oldu.
- Ahiret, kissa, emir/yasak, genel/karma axis wording iyilestirildi.

### 7.7 UI Karti

Kanitli Analiz karti ayet detay sayfasina eklendi.

Sonra UI polish yapildi:

- sourceStatus sadeledi.
- helper blok daha secici oldu.
- normal kullaniciya debug/legacy/raw JSON gostermeme hedeflendi.

### 7.8 coreDb

`scripts/build-core-analysis-db.py` ile `data/kuran_core.db` olusturuldu.

Sonra:

- `coreDbVerseSource.ts` eklendi.
- JSON vs coreDb comparison yapildi.
- coreDb drift targeted audit dokumani yazildi.

### 7.9 Global Audit

`scripts/audit-verse-analysis-global.ts` eklendi.

Ozellikler:

- Tum ayetler icin preview audit edebilir.
- `--limit=100` destekler.
- Her 100 ayette progress log yazar.
- Her 250 ayette checkpoint yazar.
- Hata veren ayette durmaz, `preview_error` kaydeder.
- Bilinen kapsam notlarini `coverageNotice` olarak ayirir.

Son hizli 100 ayet kosusu:

- total: 100
- previewError: 0
- emptyAxis: 0
- emptyKeyTerms: 13
- emptyTranslationDifferences: 32
- emptyWeakCorrespondences: 8
- sourceMissing: 0
- coverageNotice: 100

## 8. Veri Nasil Isleniyor?

### 8.1 Default JSON source akisi

```text
data/normalized/arabic.json
data/normalized/translations.json
data2/processed/canonical_word_analysis.json
data/meal-comparison/by-surah/*.json
data/fidelity/by-surah/index.json
data/word-analysis/reports/*.json
data/revelation-context/surah/index.json
data/tafsir/surah/index.json
  -> verseAnalysisContext.ts
  -> verseAnalysisSignals.ts
  -> verseAnalysisDecision.ts
  -> verseAnalysisPreview.ts
  -> page.tsx Kanitli Analiz card
```

### 8.2 coreDb source akisi

```text
data/kuran_core.db
  -> coreDbVerseSource.ts
  -> verseAnalysisContext.ts source: "coreDb"
  -> same signals/decision/preview
```

### 8.3 Neden iki source var?

JSON source:

- Default.
- Mevcut uygulama davranisini koruyor.
- Daha stabil kabul ediliyor.

coreDb source:

- Merkezi ve daha duzenli.
- Audit/POC icin guclu.
- Default olmak icin drift sorunlari cozulmeli.

## 9. Son Kalite Durumu

### 9.1 Quality set

28 ayetlik kalite setinde:

- Profil sonucu: `28/28`
- Warn: `0`

Bu iyi bir checkpoint.

### 9.2 Global audit

Tam 6236 ayet global audit daha once calisti ama uzun surdu. Son snapshot 100 ayetlik hizli kosu ile guncellendi.

Son hizli kosuya gore:

- En baskin gercek problem: `empty_translation_differences`
- `source_missing` artik gercek risk degil; bilinen tefsir kapsam notlari `coverageNotice`
- `emptyKeyTerms` source-backed duzeltmeden sonra belirgin azaldi.

### 9.3 Source-backed keyTerms sonucu

Ilk 100 ayette:

- Once: empty keyTerms 26
- Sonra: empty keyTerms 13

Ornek iyilesmeler:

- `1:5`: Yardim isteriz, kul
- `2:3`: Namaz, rizik, iman, infak
- `2:6`: Uyardi, Kufretti, iman
- `2:17`: Ates/Cehennem
- `4:29`: mal/servet, Nefis, Batil

Bilinen sinir:

- `2:173` gibi ayetlerde kan/et/domuz/zaruret gibi terimler JSON word meaning tarafinda temiz `meaning_tr` olarak eksik oldugu icin fallback kullanilmadan gosterilmiyor.

## 10. Bilinen Sorunlar

### 10.1 `meaning_tr` coverage eksikleri

Bazı ayetlerde veri var ama kullanici-facing keyTerms icin yeterince temiz Turkce meaning yok.

Ornek:

- `2:173` icinde kan, et, domuz, zaruret kelimeleri ayet verisinde var; ancak bazi kelimelerde `meaning_tr` eksik veya zayif oldugu icin fallback kullanmadan preview'a girmiyor.

Dogru cozum:

- Fallback eklemek degil.
- `meaning_overrides_tr` veya canonical word analysis build hattinda source-backed meaning enrichment yapmak.

### 10.2 `translationDifferencesPreview` bosluklari

Global auditte `empty_translation_differences` baskin problem olarak gorunuyor.

Sebep:

- `genel_karma` icin bilincli olarak generic meal farki kategorisi uretmiyoruz.
- Bazi ayetlerde meal farki sinyali zayif veya kategoriye cevrilemiyor.

Risk:

- UI'da bu bolum bos kalabilir, ama bu uydurma kategori uretmekten daha guvenli.

### 10.3 coreDb drift

coreDb default degil.

Bilinen drift ayetleri:

- `5:3`: JSON hukum_istisna, coreDb genel_karma
- `12:100`: JSON kissa, coreDb emir_yasak

Sorun:

- coreDb tarafinda rootMeaning/token havuzu daha genis.
- Decision weighting bazi ayetlerde farkli profile kayabiliyor.

### 10.4 Global audit performansi

Tam 6236 ayet audit uzun suruyor.

Gozlem:

- 100 ayetlik kosu yaklasik 2 dakika civari.
- Tam kosu 1.5-2 saat bandina cikabilir.

Mevcut destek:

- progress log
- checkpoint yazimi
- hata toleransi

Eksik:

- Gercek `--resume` destegi henuz yok.

### 10.5 Encoding bozulmalari

Bazi eski docs/snapshot ciktilarinda Turkce karakterler mojibake olarak gorunuyor.

Risk:

- Okunabilirlik dusuyor.

Oneri:

- Yeni teknik dokumanlarda ASCII Turkce kullanmak.
- UI kullanici metninde normal Turkce karakter korunabilir.

## 11. Test ve Kontrol Komutlari

### 11.1 Web typecheck

```bash
npm run typecheck -w @quran-app/web
```

### 11.2 Kanitli Analiz inspect

```bash
node --no-warnings --loader ./scripts/ts-extension-loader.mjs scripts/inspect-verse-analysis-context.ts
```

### 11.3 Global audit hizli kosu

```bash
node --no-warnings --loader ./scripts/ts-extension-loader.mjs scripts/audit-verse-analysis-global.ts --limit=100
```

### 11.4 Global audit full kosu

```bash
node --no-warnings --loader ./scripts/ts-extension-loader.mjs scripts/audit-verse-analysis-global.ts
```

Not: Full kosu uzun surebilir.

### 11.5 coreDb inspect

```bash
python scripts/inspect-core-analysis-db.py
```

### 11.6 JSON vs coreDb audit

```bash
node --no-warnings --loader ./scripts/ts-extension-loader.mjs scripts/audit-json-vs-coredb-consistency.ts
```

## 12. Bundan Sonra En Dogru Is Sirasi

### Faz 1: Source-backed meaning enrichment

Hedef:

- `meaning_tr` eksiklerini fallback olmadan iyilestirmek.

Yapilacak:

- `missing-meanings.json` ve canonical word analysis uzerinden en sik eksik meaning ailelerini cikar.
- `meaning_overrides_tr.json` icin kaynakli, denetlenebilir eklemeler yap.
- `2:173` gibi ayetlerde kan/et/domuz/zaruret alanini fallback olmadan gorunur hale getir.

### Faz 2: Global audit full rerun

Hedef:

- Source-backed keyTerms fix sonrasi tum 6236 ayette gercek metrikleri almak.

Yapilacak:

- Full global audit calistir.
- Empty keyTerms, empty translation differences, profile distribution ve riskli ayetleri yeniden oku.

### Faz 3: Global audit resume desteği

Hedef:

- Uzun audit kesilirse kaldigi yerden devam edebilsin.

Yapilacak:

- Checkpoint dosyasini resume icin yeterli metadata ile genislet.
- `--resume` parametresi ekle.

### Faz 4: coreDb decision score inspect

Hedef:

- `5:3` ve `12:100` driftlerini sayisal karar puanlariyla izole etmek.

Yapilacak:

- Source bazli token/score breakdown ureten mini inspect scripti yaz.
- rootMeaning etkisini ayri say.

### Faz 5: UI production-like goz testi

Hedef:

- Kanitli Analiz kartini gercek kullanici akisinda kontrol etmek.

Kontrol:

- Mobile/desktop layout
- Bos bolum davranisi
- Debug/legacy sizintisi
- KeyTerms okunurlugu
- SourceStatus sadeligi

### Faz 6: AI ust katman tasarimi

Hedef:

- Deterministic context ustune AI aciklama katmani eklemek.

Onemli sinir:

- AI, Kanitli Analiz context disina serbest cikmamali.
- Tefsir gibi davranmamali.
- Kaynakli preview'i aciklayan ust katman olmali.

## 13. En Kritik Kararlar

### 13.1 JSON default kalmali mi?

Evet, simdilik kalmali.

Sebep:

- UI su an JSON source ile stabil.
- coreDb guclu ama 2 anlamli drift biliniyor.

### 13.2 coreDb cop mu?

Hayir. Tam tersine cok degerli.

Ama rolü su an:

- audit
- consistency check
- ileride default aday
- merkezi veri omurgasi

### 13.3 Fallback kullanilmali mi?

Kullanici-facing keyTerms icin hayir.

Dogru strateji:

- Boslugu fallback ile doldurma.
- Kaynakli meaning enrichment yap.

### 13.4 Kanitli Analiz tefsir mi?

Hayir.

Bu sistem:

- ayet mealleri
- kelime verileri
- morfoloji
- meal karsilastirmasi
- fidelity sinyalleri
- baglam notlari

uzerinden kontrollu on analiz uretir.

## 14. Kisa Teknik Borc Listesi

- `audit-verse-analysis-global.ts` icin gercek `--resume`.
- Source-backed meaning enrichment.
- Full 6236 audit'in yeni keyTerms fix sonrasi tekrari.
- coreDb score/drift inspect.
- Encoding temizligi.
- Quality set'i 50-100 ayete genisletme.
- Production build ve browser smoke.

## 15. Son Durum Degerlendirmesi

Proje artik deneysel parcalardan cikip bir V1 iskeletine oturdu.

Guclu yanlar:

- Context -> signal -> decision -> preview -> UI zinciri net.
- AI'siz deterministic analiz katmani calisiyor.
- Quality set 28/28.
- coreDb merkezi veri adayi hazir.
- UI karti kullanilabilir durumda.

Zayif yanlar:

- Word meaning coverage bazi ayetlerde yetersiz.
- Translation difference kategorileri bazi ayetlerde bos.
- Global audit full kosusu uzun ve resume eksik.
- coreDb default icin driftler cozulmeli.

En mantikli sonraki adim:

1. Source-backed meaning enrichment.
2. Sonra full global audit.
3. Sonra rapora gore nokta atisi preview/keyTerms polish.

## 16. Veri Envanteri ve Kullanim Durumu

Bu bolum, `data` ve `data2` altindaki ana kaynak ailelerini "kullaniliyor mu, kac kayit/dosya var, hangi hatta giriyor" sorularina gore siniflandirir.

Notlar:

- "Runtime aktif" demek uygulama veya Kanitli Analiz default JSON hatti tarafindan dogrudan okunuyor demektir.
- "Opsiyonel aktif" demek kod destekliyor ama default kaynak degil demektir.
- "Build input" demek islenmis dosyalari uretmek icin kullanilan ham/ara kaynak demektir.
- "Snapshot/audit" demek uygulama davranisini beslemeyen rapor/test ciktilari demektir.
- "Raw archive" demek projede duran ama su an runtime tarafindan dogrudan okunmayan buyuk dis kaynak arsivi demektir.

### 16.1 Ozet Tablo

| Kaynak ailesi | Dosya sayisi | Boyut | Kayit/adet | Durum | Nerede kullaniliyor |
| --- | ---: | ---: | --- | --- | --- |
| `data/normalized` | 4 | 70.26 MB | ayet: 6236, sure meta: 114, tafsir sure: 114 | Runtime aktif | Quran/translation adapterlari, JSON source |
| `data2/processed` | 5 ana dosya | 111.86 MB | canonical ayet key: 6236, meaning override: 129, root seed: 250 | Runtime aktif + build output | canonical word analysis, keyTerms, root/lemma/morphology |
| `data/word-analysis` | 6 | 11 MB | coverage: 6236, missing meaning: 24338 | Runtime aktif | fidelity/weak correspondence ve coverage raporlari |
| `data/meal-comparison` | 115 | 153.71 MB | by-surah: 114 dosya | Runtime aktif | translationComparison ve meal farklari |
| `data/fidelity` | 1 | 153.75 MB | ayet: 6236 | Runtime aktif | fidelitySignals ve weak/missing alanlari |
| `data/revelation-context` | 3 | 0.07 MB | surah index: 114 | Runtime aktif/partial | contextNuzul ve baglam notlari |
| `data/tafsir` | 3 | 11.33 MB | surah index: 114 | Partial/kapsam notu | tafsirNotes/kapsam bilgisi; tefsir uretilmiyor |
| `data/kuran_core.db` | 1 | 198 MB civari | verses: 6236, words: 77429, translations: 229085 | Opsiyonel aktif | coreDb source POC, audit, consistency check |
| `data/context` | 119 | 1.01 MB | normalized surah context: 114 | Yardimci context kaynagi | surah context pipeline/adapters |
| `data/analysis-snapshots` | 9 | 0.51 MB | quality set: 28, global audit son kosu: 100 | Snapshot/audit | inspect ve audit ciktilari |
| `data/analysis-audit` | 4 | 8.41 MB | AnalysisEngineV1 audit raporlari | Snapshot/audit | legacy engine audit kayitlari |
| `data/quran/external` | 5414 | 643.99 MB | coklu dis repo/veri arsivi | Raw archive | su an runtime dogrudan kullanmiyor |
| `data2/quran-json` | 7542 | 95.98 MB | Quran JSON/audio/raw parcalar | Raw/build input adayi | su an runtime dogrudan kullanmiyor |
| `data2/quran-morphology` | 5 | 6.06 MB | morfoloji kaynaklari | Build input | canonical/word analysis hattinin kaynak ailesi |
| `data2/QURAN-NLP` | 88 | 270.16 MB | NLP/morfoloji raw kaynaklari | Raw/build input | su an runtime dogrudan kullanmiyor |
| `data2/scripts` | 3 | 0.04 MB | build scriptleri | Build tooling | word/canonical analysis build |

### 16.2 Runtime Aktif Ana Kaynaklar

#### `data/normalized/arabic.json`

- Kayit sayisi: 6236
- Rol: Ayet Arapca metni ve ayet seed kaynagi.
- Kullanim: `VerseAnalysisContext`, audit scriptleri ve Quran adapter hattinda ayet listesi/seed olarak kullanilir.
- Durum: Aktif.

#### `data/normalized/translations.json`

- Kayit sayisi: 6236 ayet kaydi.
- Rol: Ayet bazli meal kaynaklari.
- Kullanim: primary translation, translations listesi, meal gorunumu ve context builder.
- Durum: Aktif.

#### `data/normalized/surah-meta.json`

- Kayit sayisi: 114.
- Rol: Sure metadata.
- Kullanim: sure listesi/sayfa context.
- Durum: Aktif.

#### `data2/processed/canonical_word_analysis.json`

- Kayit sayisi: 6236 ayet key.
- Rol: Kelime bazli ana analiz kaynagi.
- Icerik: `arabic`, `root`, `lemma`, `pos`, `role`, `morphology`, `meaning_tr`, `root_explanation_tr`, `gloss_en`, `missing_fields`.
- Kullanim: `verseAnalysisContext.ts` -> `wordByWord`, `roots`, `lemmas`, `morphology`, `rootMeanings`.
- Durum: Cok kritik aktif kaynak.

#### `data2/processed/meaning_overrides_tr.json`

- Kayit sayisi: 129 item.
- Rol: Turkce meaning duzeltmeleri.
- Kullanim: canonical word analysis build/enrichment hattinda kaynak.
- Durum: Build/enrichment icin kritik; runtime tarafinda dolayli etkili.

#### `data2/processed/root_explanations_tr.seed.json`

- Kayit sayisi: 250.
- Rol: Kok anlamlari seed kaynagi.
- Kullanim: root meaning enrichment ve coreDb build.
- Durum: Build input / enrichment kaynagi.

#### `data/word-analysis/reports/coverage-by-ayah.json`

- Kayit sayisi: 6236.
- Rol: Ayet bazli kelime/anlam coverage durumu.
- Kullanim: fidelity/risk note ve debug source durumu.
- Durum: Aktif.

#### `data/word-analysis/reports/missing-meanings.json`

- Kayit sayisi: 24338.
- Rol: Eksik meaning raporu.
- Kullanim: weak/missing correspondence ve source-backed meaning enrichment icin en onemli aday kaynak.
- Durum: Aktif rapor + gelecek duzeltmeler icin kritik.

#### `data/meal-comparison/by-surah/*.json`

- Dosya sayisi: 114.
- Rol: Sure bazli meal karsilastirma cache.
- Kullanim: `translationComparison.availableTranslations`, phrase sinyalleri, `translationDifferencesPreview`.
- Durum: Aktif.

#### `data/fidelity/by-surah/index.json`

- Kayit sayisi: 6236.
- Rol: Fidelity/kelime-karsilik kontrol sinyalleri.
- Kullanim: `fidelitySignals`, weak/missing gruplari, sourceStatus.
- Durum: Aktif.

#### `data/revelation-context/surah/index.json`

- Kayit sayisi: 114.
- Rol: Sure bazli baglam/nuzul kaynak notlari.
- Kullanim: `contextNuzul`, `context_notes`.
- Durum: Aktif/yardimci.

#### `data/tafsir/surah/index.json`

- Kayit sayisi: 114.
- Rol: Sure bazli tefsir kaynagi.
- Kullanim: Kanitli Analiz V1 tefsir uretmez; sadece kapsam/kaynak durumu icin sinirli sekilde dikkate alinir.
- Durum: Partial. Global audit tarafinda "Ayet bazli tefsir ozeti sinirli" artik risk degil, `coverageNotice`.

### 16.3 Opsiyonel Aktif Kaynak: `data/kuran_core.db`

`data/kuran_core.db` merkezi SQLite kaynagidir.

Satir sayilari:

| Tablo | Satir |
| --- | ---: |
| `verses` | 6236 |
| `translations` | 229085 |
| `words` | 77429 |
| `root_meanings` | 415 |
| `translation_comparison` | 229085 |
| `fidelity_signals` | 36810 |
| `context_notes` | 12472 |

Kullanim:

- `packages/core/src/analysis/coreDbVerseSource.ts`
- `packages/core/src/analysis/verseAnalysisContext.ts` icinde `source: "coreDb"` opsiyonu
- `scripts/inspect-core-analysis-db.py`
- `scripts/compare-core-db-context.py`
- `scripts/audit-json-vs-coredb-consistency.ts`

Durum:

- Uygulamada default degil.
- Audit ve side-by-side compare icin kullaniliyor.
- Default yapilmadan once driftler cozulmeli.

### 16.4 Snapshot ve Audit Verileri

#### `data/analysis-snapshots`

Dosya sayisi: 9.

Onemli dosyalar:

- `verse-analysis-context.sample.json`
- `verse-analysis-preview.sample.json`
- `verse-analysis-context.coredb.sample.json`
- `verse-analysis-preview.coredb.sample.json`
- `verse-analysis-quality-set.sample.json`
- `json-vs-coredb-consistency-audit.sample.json`
- `core-db-context-comparison.sample.json`
- `verse-analysis-global-audit.sample.json`
- `verse-analysis-global-audit.checkpoint.json`

Durum:

- Runtime kaynagi degil.
- Inspect/audit sonucudur.
- UI ve analiz davranisini dogrudan beslemez.

#### `data/analysis-audit`

Dosya sayisi: 4.

Rol:

- AnalysisEngineV1 icin eski audit raporlari.

Durum:

- Runtime kaynagi degil.
- Tarihsel audit kaydi.

### 16.5 Raw Archive / Dogrudan Kullanilmayan Buyuk Kaynaklar

#### `data/quran/external`

- Dosya sayisi: 5414.
- Boyut: 643.99 MB.
- Icerik: dis repo ve kaynak arsivleri, audio/json/meta/tafseer gibi cok sayida ham kaynak.
- Kod referansi: mevcut aktif `packages/core/src` ve `scripts` hattinda dogrudan runtime referansi yok.
- Durum: Raw archive. Silinmemeli ama runtime dependency gibi dusunulmemeli.

#### `data2/quran-json`

- Dosya sayisi: 7542.
- Boyut: 95.98 MB.
- Icerik: Quran JSON/audio/raw parcalar.
- Kod referansi: mevcut Kanitli Analiz runtime hattinda dogrudan referans yok.
- Durum: Raw/build input adayi.

#### `data2/quran-morphology`

- Dosya sayisi: 5.
- Boyut: 6.06 MB.
- Rol: Morfoloji raw/build input ailesi.
- Durum: Dogrudan runtime degil; islenmis `canonical_word_analysis` tarafina kaynak ailesi.

#### `data2/QURAN-NLP`

- Dosya sayisi: 88.
- Boyut: 270.16 MB.
- Rol: NLP/morfoloji raw kaynak arsivi.
- Kod referansi: mevcut Kanitli Analiz runtime hattinda dogrudan referans yok.
- Durum: Raw/build input adayi.

### 16.6 Kod Referansina Gore Kullanim Siniflari

Aktif runtime / core tarafinda dogrudan referanslananlar:

- `data2/processed`
- `data/word-analysis`
- `data/meal-comparison`
- `data/fidelity`
- `data/revelation-context`
- `data/kuran_core.db` opsiyonel olarak

Adapter/pipeline veya build tarafinda referanslananlar:

- `data/normalized`
- `data2/processed`
- `data2/scripts`
- `data/kuran_core.db`

Audit/snapshot tarafinda referanslananlar:

- `data/analysis-snapshots`
- `data/analysis-audit`

Ham arsiv olarak duran ve mevcut runtime tarafindan dogrudan okunmayanlar:

- `data/quran/external`
- `data2/quran-json`
- `data2/QURAN-NLP`
- `data2/quran-morphology` dogrudan runtime degil, build input ailesi

### 16.7 Kullaniliyor / Kullanilmiyor Karari

Guvenli siniflandirma:

| Sinif | Kaynaklar |
| --- | --- |
| Aktif kullaniliyor | `data/normalized`, `data2/processed/canonical_word_analysis.json`, `data/word-analysis/reports`, `data/meal-comparison`, `data/fidelity`, `data/revelation-context` |
| Partial/kapsam notu | `data/tafsir` |
| Opsiyonel aktif | `data/kuran_core.db` |
| Build/enrichment input | `data2/processed/meaning_overrides_tr.json`, `data2/processed/root_explanations_tr.seed.json`, `data/word-analysis/word-translations-tr.json`, `data2/quran-morphology`, `data2/scripts` |
| Audit/snapshot | `data/analysis-snapshots`, `data/analysis-audit` |
| Raw archive / su an dogrudan kullanilmiyor | `data/quran/external`, `data2/quran-json`, `data2/QURAN-NLP` |

### 16.8 Envanterden Cikan En Onemli Sonuc

Veri eksikligi genel anlamda yok; tam tersine veri cok fazla.

Asil problem:

- Hangi raw verinin runtime'a girecegi secilmeli.
- `meaning_tr` coverage source-backed sekilde iyilestirilmeli.
- Raw archive kaynaklari dogrudan UI/preview'a karistirilmamali.
- coreDb default olmadan once JSON ile driftleri cozulmeli.

Bu nedenle sonraki en dogru veri isi:

1. `missing-meanings.json` icindeki 24338 kaydi profile/kelime ailesine gore grupla.
2. En yuksek etkili meaning eksiklerini `meaning_overrides_tr.json` veya canonical build hattina kaynakli sekilde ekle.
3. Sonra full global audit calistir.
