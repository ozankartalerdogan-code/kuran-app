# vNext Context Checkpoint

Bu doküman bugünkü Kanıtlı Analiz vNext context çalışmalarının kapanış notudur.

## Tamamlanan Entegrasyonlar

### Profile-Specific Weak Preview

- `weakCorrespondencesPreview` artık generic/raw weak grupları doğrudan kullanıcıya göstermiyor.
- Sadece profile-specific anlam grupları kullanıcı-facing alana giriyor.
- `diger kelime eslesme adaylari` gibi genel/debug gruplar normal kullanıcı kartına taşınmıyor.
- Public preview type'a debug alanı eklenmedi.

### SourceStatus Mapped Opt-In

- `buildVerseAnalysisPreview(context, { sourceStatus: "mapped" })` opt-in modu hazır.
- Tek satır, teknik olmayan `sourceStatus.mutedText` üretilebiliyor.
- Debug-only, parked, build-input veya raw source adları kullanıcı-facing metne girmiyor.
- Default preview çağrısı aynı kaldı.

Örnek mapped metin:

> Kaynaklar: ayet metni, meal, kelime verisi ve karşılaştırma sinyalleri mevcut. Ayet bazlı tefsir/nüzul kapsamı sınırlı.

### Coverage-by-Ayah Debug/SourceStatus Opt-In

- `coverage-by-ayah` verisi opt-in debug/sourceStatus sinyali olarak context'e bağlandı.
- Normal çağrıda coverage detail boş kalıyor.
- Opt-in çağrıda `debugSources` içinde coverage detail hazırlanıyor.
- Raw coverage metrikleri kullanıcı-facing karta sızmıyor.

Opt-in kullanım:

```ts
await buildVerseAnalysisContext(1, 5, {
  debug: { includeCoverageReport: true }
});
```

Opt-in debug detail örneği:

```txt
coverageRatio=1.000;matchedWords=5/5;hasMorphology=true
```

## Değişmeyen Davranışlar

- Runtime/default source değiştirilmedi.
- JSON default davranışı korundu.
- `coreDb` default yapılmadı.
- UI tasarımı değiştirilmedi.
- Kanıtlı Analiz kartının yerleşimi değiştirilmedi.
- Decision/profile seçimi değiştirilmedi.
- AI / semantic / provider / prompt hattına dokunulmadı.
- `AnalysisEngineV1` logic değiştirilmedi.
- `canonical_word_analysis_v4` default yapılmadı.
- `root_explanations_tr_v2_easy_only` runtime context'e bağlanmadı.

## Test Sonuçları

### SourceStatus Opt-In Audit

Komut:

```bash
node --no-warnings --loader ./scripts/ts-extension-loader.mjs scripts/audit-source-status-context-optin.ts
```

Sonuç:

- `totalEntries`: 38
- `qualitySetEntries`: 28
- `exampleEntries`: 10
- `uniqueMutedTexts`: 1
- `coverageDebugEntries`: 38
- `coverageUserFacingLeakCount`: 0
- `technicalLeakCount`: 0
- `weakPreviewIntegrationCompleted`: true

### Verse Analysis Inspect

Komut:

```bash
node --no-warnings --loader ./scripts/ts-extension-loader.mjs scripts/inspect-verse-analysis-context.ts
```

Sonuç:

- `qualitySetSize`: 28
- `expectedProfileCount`: 28
- `expectedProfileMatchedCount`: 28
- `warnCount`: 0

### Typecheck

Komut:

```bash
npm run typecheck -w @quran-app/web
```

Sonuç:

- Başarılı.

### Default / Opt-In Smoke

Kontrol:

- Normal çağrıda coverage detail: `null`
- Opt-in çağrıda coverage detail: `coverageRatio=1.000;matchedWords=5/5;hasMorphology=true`

Bu kontrol default davranışın korunup opt-in debug bilgisinin üretildiğini doğruladı.

## Yarın / Sonraki Faza Kalan İşler

### 1. v4 Canonical Opt-In Audit

Amaç:

- `canonical_word_analysis_v4` kaynağının keyTerms ve preview hattına etkisini daha geniş ölçmek.

Önerilen kontrol:

- JSON / v3 / v4 karşılaştırması.
- İlk 1000+ ayet audit.
- `emptyKeyTerms`, visible keyTerms, noisy preview, low-confidence visible term metrikleri.
- Quality set 28/28 ve warn 0 korunmalı.

### 2. v4 KeyTerms Visibility Drift Düzeltmesi

Amaç:

- v4 daha zengin veri sağlarken kullanıcı-facing keyTerms kaybı veya gürültüsü oluşturuyorsa küçük source-backed filtre düzeltmesi yapmak.

Not:

- Default source değiştirilmeden yapılmalı.

### 3. Root Easy-Only Impact Audit

Amaç:

- `root_explanations_tr_v2_easy_only` kaynağının context/root explanation coverage etkisini ölçmek.

Önerilen kontrol:

- İlk 100 / 500 / 1000 ayet.
- Empty root explanation farkı.
- visible keyTerms değişimi.
- Gürültülü deterministic note oluşup oluşmadığı.

### 4. SourceStatus Mapped UI Göz Testi

Amaç:

- Mapped sourceStatus metninin Kanıtlı Analiz kartında tek satır muted metin olarak iyi görünüp görünmediğini kontrol etmek.

Not:

- UI'a kalıcı bağlama ayrı küçük paket olarak yapılmalı.

### 5. Geniş Global Audit

Amaç:

- vNext context opt-in katmanlarının daha geniş ayet setinde stabil kaldığını görmek.

Önerilen minimum:

- 1000 ayet audit.
- Gerekirse full 6236 ayet audit, checkpoint/resumable script ile.

## Kısa Karar

Bugünkü çalışma vNext context için güvenli bir ara eşik oluşturdu:

- Kullanıcı-facing weak preview daha kontrollü.
- SourceStatus kullanıcı diliyle üretilebiliyor.
- Coverage verisi debug/sourceStatus için hazır.
- Default davranış korunuyor.

Sonraki en mantıklı adım `canonical_word_analysis_v4` için geniş opt-in audit ve keyTerms visibility drift kontrolüdür.
