# VerseAnalysisContext vNext Entegrasyon Planı

Bu doküman Kanıtlı Analiz için başarılı veri kaynaklarının `VerseAnalysisContext` içine hangi sırayla ve hangi güvenlik sınırlarıyla alınacağını takip eder.

Bu checkpoint itibarıyla:

- Runtime/default source değişmedi.
- UI tasarımı değişmedi.
- `coreDb` default yapılmadı.
- AI / semantic / provider hattına dokunulmadı.
- `AnalysisEngineV1` logic değiştirilmedi.
- vNext adımları opt-in, audit ve snapshot odaklı ilerliyor.

## Kısa Durum

Bugünkü duruma göre üç düşük riskli katman tamamlandı:

- Profile-specific weak preview entegrasyonu tamamlandı.
- SourceStatus mapped opt-in entegrasyonu tamamlandı.
- `coverage-by-ayah` debug/sourceStatus opt-in entegrasyonu tamamlandı.

Henüz sonraki fazda bırakılanlar:

- `canonical_word_analysis_v4` runtime/default source yapılmadı.
- `root_explanations_tr_v2_easy_only` runtime context'e bağlanmadı.
- v4 ve root easy-only kaynakları için opt-in audit / impact ölçümü sonrası karar verilecek.

Ana karar hâlâ aynı: default JSON davranışı korunmalı; yeni veri kaynakları önce opt-in, audit ve snapshot ile doğrulanmalı.

## Kaynak -> Context Alanı Planı

| Kaynak | Context alanı | User-facing preview etkisi | Debug/sourceStatus etkisi | Güncel karar |
| --- | --- | --- | --- | --- |
| `canonical_word_analysis_v4` | `wordByWord`, `roots`, `lemmas`, `morphology`, `rootMeanings`, `keyTerms` | Evet, ama yalnız opt-in ve confidence/filter gate ile | Source version, suppressed terms, audit metrikleri | Sonraki faz |
| `coverage-by-ayah` | `debugSources`, coverage debug detail | Hayır; raw coverage kullanıcıya gösterilmez | `coverageRatio`, `matchedWords`, `totalWords`, `hasMorphology` opt-in debug detail | Tamamlandı, opt-in |
| filtered/profile-specific missing meanings weak helper | `fidelitySignals.weakOrMissingCorrespondences`, preview weak grupları | Evet; sadece profile-specific gruplar | Generic/debug gruplar kullanıcıya kapalı | Tamamlandı |
| source-policy/sourceStatus mapper | preview `sourceStatus.mutedText` | Evet; tek satır muted metin | Teknik kaynak sınıfları kullanıcıya sızmaz | Tamamlandı, opt-in |
| `root_explanations_tr_v2_easy_only` | `rootMeanings`, `wordByWord.rootMeaning`, ileride source/risk alanı | Şimdilik sınırlı veya yok | Easy-only root coverage audit | Sonraki faz |

## Tamamlanan Adımlar

### 1. Profile-Specific Weak Preview

Durum: tamamlandı.

Kapsam:

- `verseAnalysisWeakPreview.ts` helper hattı preview içine bağlandı.
- `diger kelime eslesme adaylari` gibi generic gruplar normal kullanıcı-facing `weakCorrespondencesPreview` içine girmiyor.
- Sadece profile-specific anlam grupları yumuşatılmış kullanıcı diliyle gösteriliyor.
- Public `VerseAnalysisPreview` type'ına debug alanı eklenmedi.

Beklenen davranış:

- Faydalı weak sinyaller görünür kalır.
- Generic / teknik / raw missing reason bilgisi UI'a sızmaz.

### 2. SourceStatus Mapped Opt-In

Durum: tamamlandı.

Kapsam:

- `buildVerseAnalysisPreview(context, { sourceStatus: "mapped" })` opt-in modu eklendi.
- Default `buildVerseAnalysisPreview(context)` davranışı değişmedi.
- `sourceStatus.mutedText` tek satır, kullanıcı dostu kaynak durumu üretir.
- Debug / parked / build input kaynak adları kullanıcı-facing alana girmez.

Üretilen örnek metin:

> Kaynaklar: ayet metni, meal, kelime verisi ve karşılaştırma sinyalleri mevcut. Ayet bazlı tefsir/nüzul kapsamı sınırlı.

Doğrulama:

- 28 quality set + 10 örnek ayette opt-in snapshot üretildi.
- Teknik/debug sızıntısı görülmedi.

### 3. Coverage-by-Ayah Debug/SourceStatus Opt-In

Durum: tamamlandı.

Kapsam:

- `coverage-by-ayah` verisi normal kullanıcı-facing analiz metnine bağlanmadı.
- `buildVerseAnalysisContext(..., { debug: { includeCoverageReport: true } })` opt-in modu ile `debugSources` içinde coverage detail hazırlanıyor.
- Normal çağrılarda coverage detail boş kalıyor.
- SourceStatus mapped opt-in ile çakışmıyor.

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

Güvenlik kararı:

- `coverageRatio`, `matchedWords`, `hasMorphology` raw metrikleri kullanıcı-facing karta basılmayacak.
- Bu bilgi yalnız debug/sourceStatus audit için kalacak.

## Hâlâ Opt-In / Sonraki Fazda Kalanlar

### 1. `canonical_word_analysis_v4`

Durum: sonraki faz.

Neden bekliyor?

- v4 daha zengin `meaning_tr` coverage sağlıyor.
- Ancak bazı ayetlerde keyTerms görünürlüğü ve filtre davranışı JSON/v3 hattından ayrışabiliyor.
- Default'a alınmadan önce daha geniş audit ve drift kontrolü gerekli.

Önerilen sonraki iş:

- v4 opt-in source ile 1000+ ayet audit.
- JSON / v3 / v4 karşılaştırması.
- Empty keyTerms, visible keyTerms, low-confidence visible term ve noisy preview metrikleri.
- Quality set 28/28 ve warn 0 korunmalı.

### 2. `root_explanations_tr_v2_easy_only`

Durum: sonraki faz.

Neden bekliyor?

- Easy-only kök açıklamaları daha güvenli alt küme.
- Ama root açıklamaları kullanıcı tarafından yorum/tefsir gibi algılanabilir.
- Önce context/debug etkisi ölçülmeli; keyTerms veya deterministicNotes içine doğrudan şişirme yapılmamalı.

Önerilen sonraki iş:

- Easy-only root kaynağını yalnız audit içinde kullanmak.
- İlk 100 / 500 / 1000 ayette empty root explanation farkını ölçmek.
- visible keyTerms değişimi olmamalı veya minimal olmalı.
- Gürültülü deterministic note oluşmadığı doğrulanmalı.

### 3. Source Policy / SourceStatus Mapper Runtime Kararı

Durum: opt-in tamamlandı, UI/runtime kararı sonraki faz.

Neden bekliyor?

- Mapper güvenli görünüyor ama henüz UI tasarımına kalıcı olarak bağlanmadı.
- Kartta tek satır muted metin olarak iyi çalışıyor; yine de production-like göz testi faydalı.

Önerilen sonraki iş:

- Mevcut Kanıtlı Analiz kartında mapped status kullanımına geçilecekse ayrı küçük UI paketi yapılmalı.
- Boş/tekrar eden sourceStatus hissi tekrar kontrol edilmeli.

## Değişmesi Muhtemel Dosyalar

| Dosya | Olası değişim |
| --- | --- |
| `packages/core/src/analysis/verseAnalysisContext.ts` | Opt-in source/debug mapping, v4/root easy-only bağlama |
| `packages/core/src/analysis/verseAnalysisPreview.ts` | SourceStatus mapped kullanımını kalıcılaştırma veya küçük polish |
| `packages/core/src/analysis/verseAnalysisWeakPreview.ts` | Label/gate polish, gerekirse yeni gruplar |
| `packages/core/src/analysis/verseAnalysisSignals.ts` | v4 keyTerms confidence/relevance gate |
| `scripts/inspect-verse-analysis-context.ts` | Opt-in karşılaştırma snapshotları |
| `scripts/audit-verse-analysis-global.ts` | Source parametreli audit ve metrik karşılaştırma |

## En Küçük Güvenli Entegrasyon Sırası

1. SourceStatus mapped opt-in entegrasyonu: tamamlandı.
2. Profile-specific weak preview entegrasyonu: tamamlandı.
3. Coverage-by-ayah debug/sourceStatus opt-in entegrasyonu: tamamlandı.
4. v4 canonical wider opt-in audit: sonraki güvenli adım.
5. Root explanations easy-only opt-in context audit: v4 audit sonrası veya paralel küçük audit.
6. Production-like UI göz testi: mapped sourceStatus ve weak preview görünümü için.

## Test / Audit Planı

Her entegrasyon paketi için minimum:

```bash
node --no-warnings --loader ./scripts/ts-extension-loader.mjs scripts/inspect-verse-analysis-context.ts
npm run typecheck -w @quran-app/web
```

SourceStatus opt-in için:

```bash
node --no-warnings --loader ./scripts/ts-extension-loader.mjs scripts/audit-source-status-context-optin.ts
```

Weak preview için:

```bash
node --no-warnings --loader ./scripts/ts-extension-loader.mjs scripts/audit-profile-specific-weak-preview-target-set.ts
```

Geniş source audit için:

```bash
node --no-warnings --loader ./scripts/ts-extension-loader.mjs scripts/audit-verse-analysis-global.ts --limit=1000
```

Başarı kriterleri:

- Preview error: 0
- Quality set profile: 28/28
- Warn: 0
- Low-confidence visible term: 0
- Generic weak user-facing: 0
- SourceStatus teknik metadata göstermemeli
- Coverage raw metrikleri kullanıcı-facing karta sızmamalı
- Default source değişmemeli

## User-Facing / Debug Ayrımı

User-facing olabilir:

- `mainMeaningAxisPreview`
- temiz `keyTermsPreview`
- profile-specific `weakCorrespondencesPreview`
- kısa `sourceStatus.mutedText`

Debug/sourceStatus kalmalı:

- coverage raw sayıları
- source policy class
- fidelity raw reasons
- generic weak groups
- suppressed terms
- root risk level
- source file paths
- corrupted/missing row counts

Parked kalmalı:

- full root v2 orta/zor kökleri
- raw missing-meanings entries
- raw meal-comparison phrase extraction
- tafsir/nüzul ayet bazlı doğrulanmamış alanlar
- coreDb default geçişi

## Bugünkü Sonuç

Bugün vNext planının en düşük riskli üç temel taşı tamamlandı:

- Weak preview artık daha kontrollü ve profile-specific.
- SourceStatus artık opt-in olarak tek satır kullanıcı dili üretebiliyor.
- Coverage-by-ayah artık opt-in debug/sourceStatus sinyali olarak hazırlanabiliyor.

Buna rağmen uygulamanın ana davranışı korunuyor:

- Runtime/default source değişmedi.
- UI tasarımı değişmedi.
- `coreDb` default yapılmadı.
- v4 canonical ve root easy-only kaynakları sonraki fazda opt-in audit ile değerlendirilecek.

## Sonraki Güvenli Adımlar

1. v4 canonical için 1000+ ayet opt-in audit ve JSON/v3/v4 karşılaştırması.
2. v4 keyTerms visibility drift varsa yalnız source-backed filtreyi düzeltmek.
3. root easy-only için opt-in impact audit yapmak.
4. SourceStatus mapped metnini production-like UI göz testinde kontrol etmek.
5. Ancak bu kontrollerden sonra herhangi bir kaynağı default davranışa taşımayı değerlendirmek.
