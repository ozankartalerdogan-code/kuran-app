# vNext Source Aggregator Planı

Bu doküman Kanıtlı Analiz vNext için güvenli analiz veri kaynaklarını ileride tek bir merkezi kanal üzerinden yönetme planıdır. Bu çalışma yalnızca inspect ve mimari plan amaçlıdır.

Bu plan kapsamında:

- Kod davranışı değiştirilmedi.
- Runtime/default source değiştirilmedi.
- UI değiştirilmedi.
- `page.tsx`, semantic provider, AI path ve `AnalysisEngineV1` tarafına dokunulmadı.
- Yeni runtime entegrasyonu yapılmadı.

## İncelenen Dosyalar

Kod:

- `packages/core/src/analysis/verseAnalysisContext.ts`
- `packages/core/src/analysis/verseAnalysisSignals.ts`
- `packages/core/src/analysis/verseAnalysisDecision.ts`
- `packages/core/src/analysis/verseAnalysisPreview.ts`
- `packages/core/src/analysis/verseAnalysisWeakPreview.ts`
- `packages/core/src/analysis/coreDbVerseSource.ts`

Doküman / policy:

- `docs/VERSE_ANALYSIS_CONTEXT_VNEXT_PLAN.md`
- `docs/VNEXT_CONTEXT_CHECKPOINT.md`
- `docs/SOURCE_POLICY_AUDIT.md`
- `docs/SOURCE_STATUS_MAPPER.md`
- `docs/KANITLI_ANALIZ_DATA_SOURCE_STATUS_SUMMARY.md`

## Mevcut Veri Akışı Özeti

Bugünkü Kanıtlı Analiz hattı kabaca şu şekilde çalışıyor:

```text
raw/processed data
  -> verseAnalysisContext.ts
  -> verseAnalysisSignals.ts
  -> verseAnalysisDecision.ts
  -> verseAnalysisWeakPreview.ts
  -> verseAnalysisPreview.ts
  -> Kanıtlı Analiz UI card
```

### `verseAnalysisContext.ts`

Şu an merkezi context builder rolünde:

- Ayet metni ve mealleri `quranAdapter` üzerinden alıyor.
- Canonical word analysis kaynaklarını `json`, `v2`, `v3`, `v4` opt-in source seçimiyle okuyabiliyor.
- `coreDb` opt-in source olarak okunabiliyor.
- `coverage-by-ayah` ve `missing-meanings` raporlarını yüklüyor.
- Meal comparison, fidelity, revelation context, tafsir summary ve `AnalysisEngineV1` themes sinyallerini context'e ekliyor.
- `availableSources`, `missingSources`, `debugSources` üretiyor.
- `debug.includeCoverageReport` opt-in ise coverage detail yalnız debug tarafında hazırlanıyor.

### `verseAnalysisSignals.ts`

Deterministic signal layer:

- `keyTerms`
- `coveredTerms`
- `commonPhrases`
- `divergentPhrases`
- `deterministicNotes`
- suppressed low-confidence / low-usefulness / noisy phrase debug sinyalleri

Bu katman kullanıcıya doğrudan tefsir üretmiyor; mevcut context verisini temizleyip sinyal haline getiriyor.

### `verseAnalysisDecision.ts`

Decision hierarchy:

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

Profil seçimi mevcut context sinyallerinden yapılıyor. Kaynak güven/policy katmanı burada henüz merkezi değil; source kalitesi dolaylı olarak context verisi üzerinden etkiliyor.

### `verseAnalysisWeakPreview.ts`

Profile-specific weak preview helper:

- Ham weak/missing kayıtlarını profile-specific gruplara ayırıyor.
- Generic `diger kelime eslesme adaylari` grubunu normal user-facing preview'a sokmuyor.
- User-facing label'ları yumuşatıyor.
- Debug-only gruplar internal kalıyor.

### `verseAnalysisPreview.ts`

Kullanıcı-facing preview layer:

- `mainMeaningAxisPreview`
- `keyTermsPreview`
- `supportingKeyTermsPreview`
- `translationDifferencesPreview`
- `weakCorrespondencesPreview`
- `evidenceNotesPreview`
- `sourceStatus`

`sourceStatus: "mapped"` opt-in ile tek satır teknik olmayan muted metin üretebiliyor. Default preview davranışı hâlâ korunuyor.

### `coreDbVerseSource.ts`

Opsiyonel SQLite source:

- `verses`
- `translations`
- `words`
- `root_meanings`
- `translation_comparison`
- `fidelity_signals`
- `context_notes`

coreDb tutarlı bir merkezi veri fikri veriyor ama default değil. Daha önce drift yaşandığı için default geçiş hâlâ ayrı karar gerektiriyor.

## Neden Merkezi vNext Kanalı Gerekli?

Şu an veri kaynakları teknik olarak çalışıyor ama kararlar dağınık:

- Canonical source seçimi context içinde.
- Source policy ayrı snapshot/doc tarafında.
- Weak helper preview tarafında.
- Coverage debug opt-in context içinde.
- SourceStatus mapper preview içinde.
- Root easy-only ve v4 henüz ayrı audit/source olarak duruyor.
- coreDb sinyalleri ayrı adaptörde.

Bu da üç risk doğuruyor:

- Bir kaynak user-facing olmamalıyken yanlışlıkla preview'a girebilir.
- Aynı kaynak farklı scriptlerde farklı policy ile yorumlanabilir.
- v4/root/coreDb gibi güçlü kaynaklar default'a erken alınırsa profile/keyTerms drift oluşabilir.

Bu yüzden vNext için hedef tek bir merkezi kanal olmalı:

```text
Source Registry
  -> Source Aggregator
  -> Source Policy
  -> VerseAnalysisContext vNext
  -> Signals / Decision / Preview
```

## Önerilen vNext Tek Kanal Mimarisi

### 1. Source Registry

Amaç:

Tüm kaynakları tek yerde tanımlamak.

Önerilen dosya:

- `packages/core/src/analysis/sourceRegistry.ts`

Her kayıt şunları içermeli:

```ts
interface AnalysisSourceRegistryEntry {
  id: string;
  path?: string;
  sourceType: "runtime" | "processed" | "report" | "db" | "metadata" | "raw";
  defaultMode: "enabled" | "opt_in" | "parked";
  policyClass: "user_facing" | "sourceStatus" | "debug_only" | "build_input" | "parked";
  confidence: "high" | "medium" | "low" | "unknown";
  riskLevel: "low" | "medium" | "high";
  allowedContextFields: string[];
  blockedUserFacingFields: string[];
}
```

Bu registry dosya okumamalı; sadece kaynak kimliği ve policy metadata tutmalı.

### 2. Source Aggregator

Amaç:

Bir ayet için kullanılacak tüm güvenli source paketini üretmek.

Önerilen dosya:

- `packages/core/src/analysis/verseAnalysisSourceAggregator.ts`

Önerilen çıktı:

```ts
interface AggregatedVerseSources {
  verseKey: string;
  textSources: {
    arabicText: string | null;
    primaryTranslation: Translation | null;
    translations: Translation[];
  };
  wordSources: {
    words: VerseAnalysisWordEntry[];
    roots: string[];
    lemmas: string[];
    morphology: string[];
  };
  comparisonSources: {
    translationCount: number;
    cleanSourceCount: number;
    categorySignals: string[];
  };
  weakSources: {
    rawCandidates: WeakCandidate[];
    profileSpecificCandidates: WeakCandidate[];
    genericDebugCandidates: WeakCandidate[];
  };
  contextSources: {
    revelationContext: RevelationContext | null;
    tafsirNotes: string[];
    scopeWarnings: string[];
  };
  coverageSources: {
    coverageRatio: number | null;
    matchedWords: number | null;
    totalWords: number | null;
    hasMorphology: boolean | null;
  };
  sourcePolicy: VerseSourcePolicySnapshot;
}
```

Aggregator'ın görevi analiz üretmek değil, kaynakları güvenli ve sınıflandırılmış paket halinde context builder'a vermek olmalı.

### 3. Source Policy

Amaç:

Kaynakların user-facing, sourceStatus, debug_only, build_input veya parked olarak nasıl kullanılacağını tek merkezde belirlemek.

Önerilen dosya:

- `packages/core/src/analysis/verseAnalysisSourcePolicy.ts`

Policy kararları `data/source-metadata/*.json`, `source-policy-audit.sample.json` ve audit sonuçlarından türemeli.

Önerilen sınıflar:

- `user_facing`: Temizlenmiş ve doğrudan preview'a kontrollü girebilir.
- `sourceStatus`: Kullanıcıya sadece kısa kapsam/kaynak durumu olarak yansır.
- `debug_only`: Normal kullanıcıya görünmez; audit ve developer context.
- `build_input`: Runtime preview'a direkt girmez; processed output üretmek için kullanılır.
- `parked`: Şimdilik context'e girmez veya sadece dokümante edilir.

### 4. VerseAnalysisContext vNext

Amaç:

Mevcut `VerseAnalysisContext` alanlarını bozmadan yeni kaynak politikalarını taşıyabilecek bir iç model oluşturmak.

Mevcut public context alanları korunmalı. Yeni alanlar önce internal/opt-in olabilir:

```ts
interface VerseAnalysisContextVNextDebug {
  sourcePolicy: Array<{
    sourceId: string;
    policyClass: string;
    decision: string;
    reason: string;
  }>;
  coverage?: {
    coverageRatio: number | null;
    matchedWords: number | null;
    totalWords: number | null;
    hasMorphology: boolean | null;
  };
  parkedSources: string[];
  buildInputSources: string[];
}
```

Public preview'a debug alanı eklenmemeli. Debug sadece snapshot/audit ve development tooling tarafında kalmalı.

### 5. Preview Gate

Amaç:

Aggregator'dan gelen veriyi kullanıcı-facing preview'a geçirmeden önce son güvenlik kapısı.

Kurallar:

- `keyTermsPreview` sadece clean content terms.
- `weakCorrespondencesPreview` sadece profile-specific groups.
- `sourceStatus.mutedText` tek satır ve teknik olmayan metin.
- `translationDifferencesPreview` phrase üretmeden önce encoding/source cleanliness gate.
- `contextNuzul` ve `tafsirNotes` doğrudan ayet özel yorum gibi sunulmamalı.

## Kaynak Statü Tablosu

| Kaynak | vNext statüsü | Context alanı | User-facing? | Debug/sourceStatus? | Not |
| --- | --- | --- | --- | --- | --- |
| `canonical_word_analysis_v4` | `opt_in`, sonraki faz | `wordByWord`, `roots`, `lemmas`, `morphology`, `rootMeanings`, `keyTerms` | Evet, filtreli | Evet | Daha zengin ama keyTerms/profile drift audit gerektirir. |
| `root_explanations_tr_v2_easy_only` | `opt_in`, sonraki faz | `rootMeanings`, `wordByWord.rootMeaning` | Şimdilik sınırlı | Evet | Sadece risk_level=kolay; keyTerms'i şişirmemeli. |
| `coverage-by-ayah` | tamamlandı, opt-in debug | `debugSources`, coverage debug detail | Hayır | Evet | Raw `coverageRatio` karta sızmamalı. |
| profile-specific weak helper | tamamlandı | `weakCorrespondencesPreview` | Evet | Generic grup debug | Generic weak gruplar gizli kalmalı. |
| sourceStatus mapper | tamamlandı, opt-in | `sourceStatus.mutedText` | Evet, tek satır | Teknik detay debug | Parked/build_input adları görünmemeli. |
| normalized translations | aktif ama gate şart | `translations`, `primaryTranslation`, source diversity | Meal metni evet; phrase hayır | Evet | Encoding kalıntısı olan phrase çıkarımı yapılmamalı. |
| coreDb `revelation_context` | opt-in / sourceStatus adayı | `contextNuzul`, context scope | Sınırlı kapsam notu | Evet | Sure-level ise ayet özel gibi sunulmamalı. |
| coreDb `tafsir_note` | parked | `tafsirNotes` veya debug | Hayır | Evet | Ayet özel analiz gibi görünme riski yüksek. |
| meal-comparison | parked / source diversity | `translationComparison.availableTranslations`, category-level signal | Phrase olarak hayır | Evet | Encoding ve segmentation temizlenmeden phrase yok. |
| fidelity | debug/sourceStatus | `fidelitySignals`, `riskNotes` | Doğrudan hayır | Evet | Beklenen semantic fidelity değil; zayıf sinyal kaynağı olarak dikkatli. |
| `quran_morphology.csv` | build_input / audit adayı | morphology repair candidate | Hayır | Evet | Canonical alignment/repair için değerli. |
| `morphology-terms-ar.json` | build_input / display dictionary | morphology label mapping | Dolaylı | Evet | Sarf/nahiv label okunurluğu için kullanılabilir. |

## Güvenli Merge / Fallback Kuralları

Soru: Bir kaynakta olmayan veri diğer güvenli kaynakta varsa tamamlanabilir mi?

Cevap: Evet, ama fallback değil, source-backed merge olarak yapılmalı.

### Genel Kurallar

1. Kaynak kimliği korunmalı.
   - Her tamamlanan alanın `sourceId` veya `meaningSource` benzeri izlenebilir izi olmalı.

2. Mevcut temiz veri ezilmemeli.
   - `meaning_tr`, `rootMeaning`, morphology gibi alanlarda mevcut yüksek güvenli veri korunmalı.

3. Daha düşük güvenli kaynak sadece boş alanı doldurmalı.
   - Örnek: v4 veya easy-only root sadece boş `rootMeaning` için kullanılabilir.

4. User-facing görünürlük ayrı gate'ten geçmeli.
   - Bir alan context'te dolu olabilir ama preview'da görünmeyebilir.

5. Particle/pronoun/formula terimleri keyTerms'e geri getirilmemeli.
   - Kaynaklı olsa bile düşük değerli terimler supporting/debug kalmalı.

6. Tefsir/nüzul text'i sourceStatus veya kapsam notu olabilir; ana analiz cümlesi gibi sunulmamalı.

7. Meal phrase extraction için encoding/source whitelist şart.
   - Clean source listesi olmadan phrase veya divergent phrase üretme.

8. coreDb ve JSON source karışacaksa precedence açık olmalı.
   - Örnek precedence:
     1. JSON default canonical clean data
     2. v4 opt-in clean high/medium meaning
     3. easy-only root explanation
     4. coverage/debug reports
     5. coreDb context/source coverage

### Alan Bazlı Merge Önerisi

| Alan | Merge kuralı |
| --- | --- |
| `meaning_tr` | Mevcut dolu değer asla ezilmez; v4 sadece opt-in ve boş alan için. |
| `gloss_en` | User-facing değil; debug/support için tamamlanabilir. |
| `rootMeaning` | Easy-only root source boş alanı doldurabilir; orta/zor root parked. |
| `morphology` | Canonical boşsa quran_morphology alignment repair candidate olabilir; doğrudan runtime değil. |
| `translationDifferences` | Phrase değil, önce category-level source diversity; clean phrase sonra. |
| `weakCorrespondences` | Missing-meanings ham değil; profile-specific helper sonrası user-facing. |
| `sourceStatus` | Policy mapper üzerinden tek satır; raw source id yok. |
| `contextNuzul` | Scope açıkça belirtilmeli; ayet-level değilse kapsam notu. |
| `tafsirNotes` | Parked/debug; AI/context fazına kadar user-facing değil. |

## Büyük Riskler

### Uydurma / Fallback Analiz Üretme Riski

En büyük ilke: veri yoksa analiz uydurulmamalı.

Yanlış yaklaşım:

- KeyTerms boş diye genel profile göre kelime icat etmek.
- Meal farkı yokken hazır kategori basmak.
- Tefsir/context metninden ayete özel hüküm çıkarmak.

Güvenli yaklaşım:

- Boş kalabilir.
- SourceStatus kısa kapsam notu verebilir.
- Debug'da eksik kaynak işaretlenebilir.

### Düşük Değerli Terimleri Geri Getirme Riski

v4 ve enrichment kaynakları daha çok alan doldurur ama şu terimler görünür keyTerms'e dönmemeli:

- zamirler
- edatlar
- harf/particle segmentleri
- “şüphesiz”, “içinde”, “ancak”, “sadece” gibi düşük analiz değerli kalıplar
- ham lemma / transliteration / encoding kokan değerler

Bu kaynaklar context'te kalabilir ama preview gate tarafından bastırılmalı.

### Root Açıklamalarının Profile/KeyTerms Shift Yapması

Root explanations güçlü sinyal gibi davranırsa profil seçimini bozabilir.

Risk örneği:

- Geniş root meaning havuzu bazı ayetlerde yanlış profile ağırlık verebilir.
- Root açıklaması keyTerms'i şişirip ayetin ana eksenini dağıtabilir.

Güvenli kural:

- Easy-only root meaning önce debug/context destek alanı.
- Decision scoring'e doğrudan ağır ağırlık verilmemeli.
- KeyTerms'e doğrudan root summary basılmamalı.

### Meal Encoding Bozukluklarının Kullanıcıya Sızması

Normalized translations ve meal-comparison içinde encoding kalıntıları biliniyor.

Risk:

- `yard1m`, `allaht1r`, bozuk phrase, kırık Türkçe karakterler.

Güvenli kural:

- Phrase extraction parked.
- Clean source whitelist olmadan phrase user-facing yok.
- Meal source diversity/category-level signal güvenli olabilir.

### Tafsir Note'un Ayet Özel Analiz Gibi Görünmesi

coreDb `context_notes.tafsir_note` ve sure-level tafsir kaynakları değerli olabilir ama kullanıcıya ayet özel Kanıtlı Analiz gibi sunulması riskli.

Güvenli kural:

- Tefsir notu parked/debug.
- SourceStatus içinde “ayet bazlı tefsir/nüzul kapsamı sınırlı” gibi not yeterli.
- AI üst açıklama fazında bile scope/source açıkça korunmalı.

## Önerilen Dosya Yapısı

İleride uygulanabilir dar dosya yapısı:

```text
packages/core/src/analysis/
  sourceRegistry.ts
  verseAnalysisSourcePolicy.ts
  verseAnalysisSourceAggregator.ts
  verseAnalysisContext.ts
  verseAnalysisSignals.ts
  verseAnalysisDecision.ts
  verseAnalysisPreview.ts
  verseAnalysisWeakPreview.ts
```

Script tarafı:

```text
scripts/
  audit-vnext-source-aggregator.ts
  inspect-vnext-source-policy.ts
  audit-vnext-context-impact.ts
```

Snapshot tarafı:

```text
data/analysis-snapshots/
  vnext-source-aggregator.sample.json
  vnext-context-impact-1000.sample.json
```

## En Küçük Uygulanabilir Sonraki Adım

En güvenli küçük adım runtime entegrasyonu değil, önce aggregator snapshot üretmektir.

Önerilen paket:

1. `verseAnalysisSourceAggregator.ts` ekle.
2. Sadece 28 quality set + 10 örnek ayette aggregator output snapshot üret.
3. Mevcut `buildVerseAnalysisContext` bunu kullanmasın.
4. Snapshot'ta şu alanlar olsun:
   - hangi kaynaklar user_facing
   - hangi kaynaklar sourceStatus
   - hangi kaynaklar debug_only
   - hangi kaynaklar build_input
   - hangi kaynaklar parked
   - verse-level available/missing/limited coverage
5. Sonra bu snapshot ile mevcut context output karşılaştırılsın.

Bu adım düşük risklidir çünkü:

- Runtime değişmez.
- UI değişmez.
- Default source değişmez.
- Sadece merkezi kanalın nasıl görüneceği ölçülür.

## Karar

vNext için doğru yön, her source'u ayrı ayrı preview'a bağlamak değil; önce source registry ve aggregator üzerinden tek bir karar kanalına almak.

Bu mimari şu avantajları sağlar:

- Kaynak güvenliği tek yerde yönetilir.
- User-facing / debug-only / parked ayrımı standartlaşır.
- v4, root easy-only, coverage, weak preview, normalized translations ve coreDb sinyalleri aynı policy kapısından geçer.
- Yeni auditler dağınık source seçimi yerine vNext aggregator output üzerinden yapılır.
- Default davranış korunurken vNext güvenli şekilde olgunlaştırılır.
