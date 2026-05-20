# vNext Evidence Layer Planı

Bu doküman Kanıtlı Analiz vNext için kaynak statü panosundan daha ileri bir hedefi tarif eder: farklı veri kaynaklarından gelen parçalı analiz verilerini tek bir merkezi Evidence Layer içinde birleştirmek.

Bu çalışma yalnızca inspect + plan + dokümantasyon amaçlıdır.

- Kod davranışı değiştirilmedi.
- Runtime/default source değiştirilmedi.
- UI değiştirilmedi.
- Kaynak veri dosyaları değiştirilmedi.
- `page.tsx`, semantic provider, AI path ve `AnalysisEngineV1` tarafına dokunulmadı.
- Yeni analiz üretme mantığı eklenmedi.

## İncelenen Dosyalar

Kod:

- `packages/core/src/analysis/verseAnalysisContext.ts`
- `packages/core/src/analysis/verseAnalysisSignals.ts`
- `packages/core/src/analysis/verseAnalysisDecision.ts`
- `packages/core/src/analysis/verseAnalysisPreview.ts`
- `packages/core/src/analysis/verseAnalysisWeakPreview.ts`
- `packages/core/src/analysis/verseAnalysisQualitySet.ts`
- `packages/core/src/analysis/coreDbVerseSource.ts`

Doküman / policy:

- `docs/VNEXT_SOURCE_AGGREGATOR_PLAN.md`
- `docs/VERSE_ANALYSIS_CONTEXT_VNEXT_PLAN.md`
- `docs/VNEXT_CONTEXT_CHECKPOINT.md`
- `docs/KANITLI_ANALIZ_DATA_SOURCE_STATUS_SUMMARY.md`
- `docs/SOURCE_POLICY_AUDIT.md`
- `docs/SOURCE_STATUS_MAPPER.md`

## Mevcut Kanıtlı Analiz Akışı

Mevcut hat şu şekilde çalışıyor:

```text
VerseAnalysisContext
  -> VerseAnalysisSignals
  -> VerseAnalysisDecision
  -> VerseAnalysisWeakPreview
  -> VerseAnalysisPreview
  -> Kanıtlı Analiz UI card
```

Mevcut sistemin güçlü tarafı:

- AI üretimi yapmadan veri-temelli preview oluşturuyor.
- Decision hierarchy 28 ayetlik quality set üzerinde stabil.
- Weak correspondence tarafında profile-specific filtre tamamlandı.
- SourceStatus mapped opt-in ve coverage debug opt-in hazır.

Mevcut sistemin sınırlı tarafı:

- Farklı kaynakların aynı veri parçasını destekleyip desteklemediği merkezi olarak tutulmuyor.
- Bir key/root/lemma farklı kaynaklarda çakışıyorsa conflict flag henüz standart değil.
- `v4`, root easy-only, coverage, weak helper, normalized translations ve coreDb sinyalleri hâlâ ayrı ayrı düşünülüyor.
- Internal confidence / source support bilgisi sistematik bir Evidence Layer objesi halinde değil.

## Source Aggregator ve Evidence Layer Farkı

### Source Aggregator Ne Yapar?

Source Aggregator kaynakları toplar ve sınıflandırır:

- Bu kaynak user-facing mi?
- Bu kaynak debug-only mi?
- Bu kaynak build input mu?
- Bu kaynak parked mı?
- Hangi dosya hangi context alanına aday?

Bu yaklaşım kaynak yönetimi için iyidir.

### Evidence Layer Ne Yapar?

Evidence Layer kaynaklardan gelen analiz parçalarını birleştirir:

- Aynı key/root/lemma birden fazla kaynakta destekleniyor mu?
- Bir terim tek kaynaklı mı?
- Kaynaklar arasında anlam/root/lemma/profile çakışması var mı?
- Hangi veri kullanıcı-facing olabilir?
- Hangi veri sadece debug/audit tarafında kalmalı?
- Hangi veri source-backed tamamlayıcı bilgi olarak kullanılabilir?

Kısaca:

```text
Source Aggregator = kaynakları toplar.
Evidence Layer = kaynaklardan gelen kanıt parçalarını tartar, birleştirir ve güvenli çıkışa hazırlar.
```

## vNext Evidence Layer Hedefi

vNext Evidence Layer şu işleri yapmalı:

- Key terms, roots, lemmas, root explanations, weak correspondence, coverage, translation/source diversity ve sınırlı context sinyallerini tek yerde toplamak.
- Aynı veri birden fazla güvenli kaynakta destekleniyorsa internal source support olarak işaretlemek.
- Kaynaklar çakışıyorsa conflict flag üretmek.
- Tek kaynaklı ama güvenli görünen bilgiyi single-source evidence olarak izlemek.
- Bir kaynakta olmayan ama başka güvenli kaynakta olan veriyi source-backed tamamlayıcı veri olarak değerlendirmek.
- Kullanıcıya teknik confidence, yüzde, puan veya kaynak karmaşası göstermemek.
- Debug/audit snapshot içinde sourceSupport, conflict, internalConfidence ve evidenceTrace göstermek.

## Önerilen Evidence Layer Mimarisi

### 1. Evidence Source

Her kanıt parçasının geldiği kaynağı temsil eder.

```ts
type EvidenceSourceId =
  | "canonical_json"
  | "canonical_v4"
  | "root_easy_only"
  | "missing_meanings_report"
  | "coverage_by_ayah"
  | "normalized_translations"
  | "meal_comparison"
  | "fidelity"
  | "coredb_revelation_context"
  | "coredb_tafsir_note"
  | "quran_morphology_csv"
  | "morphology_terms_ar";

interface EvidenceSource {
  id: EvidenceSourceId;
  policyClass: "user_facing" | "sourceStatus" | "debug_only" | "build_input" | "parked";
  riskLevel: "low" | "medium" | "high";
  allowedUse: Array<"keyTerms" | "wordByWord" | "rootMeaning" | "weak" | "coverage" | "translationDiversity" | "context" | "debug">;
}
```

### 2. Evidence Item

Bir ayet için tek bir analiz parçasını temsil eder.

```ts
interface EvidenceItem {
  id: string;
  verseKey: string;
  type:
    | "key_term"
    | "root"
    | "lemma"
    | "root_explanation"
    | "weak_correspondence"
    | "coverage"
    | "translation_diversity"
    | "context_signal";
  label: string;
  normalizedKey: string;
  value: string | number | boolean | null;
  sources: EvidenceSourceRef[];
  sourceSupport: SourceSupport;
  conflictFlags: ConflictFlag[];
  internalConfidence: InternalConfidence;
  userFacingAllowed: boolean;
  debugOnly: boolean;
  evidenceTrace: EvidenceTraceEntry[];
}
```

### 3. Source Support

Bir kanıtın kaç ve hangi kaynak tarafından desteklendiğini tutar.

```ts
interface SourceSupport {
  supportingSourceIds: string[];
  supportCount: number;
  hasPrimarySource: boolean;
  hasIndependentSupport: boolean;
  singleSource: boolean;
}
```

Örnek:

- `root=عبد` hem canonical JSON hem v4 içinde varsa support artar.
- Aynı lemma v4 ve quran_morphology.csv alignment ile desteklenirse independent support artar.
- Sadece root easy-only içinde varsa single-source olarak kalır.

### 4. Conflict Flag

Kaynaklar çakıştığında debug/audit için işaret üretir.

```ts
interface ConflictFlag {
  type:
    | "meaning_conflict"
    | "root_conflict"
    | "lemma_conflict"
    | "morphology_conflict"
    | "profile_signal_conflict"
    | "encoding_risk"
    | "scope_mismatch";
  sources: string[];
  description: string;
}
```

Kullanıcı-facing alanda conflict teknik adı gösterilmez.

### 5. Internal Confidence

Teknik güven hesabı yalnız internal kalır.

```ts
interface InternalConfidence {
  level: "high" | "medium" | "low" | "blocked";
  reasons: string[];
  score?: number;
}
```

Önemli karar:

- Kullanıcıya `%85 güvenilir`, `confidence high`, `sourceSupport=3` gibi teknik ifadeler gösterilmez.
- Bu bilgiler sadece audit/snapshot/debug için tutulur.

### 6. User-Facing Allowed Output

Evidence item kullanıcı-facing olabilir ama yalnız gate sonrası:

```ts
interface UserFacingEvidenceOutput {
  keyTermsPreview: string[];
  weakCorrespondencesPreview: string[];
  translationDifferencesPreview: string[];
  sourceStatusMutedText: string | null;
}
```

Kurallar:

- Teknik confidence yok.
- Raw source id yok.
- Conflict detail yok.
- Ham lemma/root yok.
- Particle/pronoun/formula yok.

### 7. Debug/Audit-Only Output

Audit snapshot içinde gösterilebilir:

```ts
interface EvidenceDebugOutput {
  evidenceItems: EvidenceItem[];
  blockedUserFacingItems: EvidenceItem[];
  conflictSummary: Record<string, number>;
  singleSourceItems: EvidenceItem[];
  sourceSupportSummary: Record<string, number>;
}
```

### 8. Evidence Trace

Her item için “bu bilgi nereden geldi?” izini tutar.

```ts
interface EvidenceTraceEntry {
  sourceId: string;
  fieldPath: string;
  rawValuePreview: string;
  normalizedValue: string;
  transformation:
    | "direct"
    | "normalized"
    | "filtered"
    | "grouped"
    | "suppressed"
    | "source_backed_merge";
}
```

## vNext İçinde Birleşebilecek Veri Türleri

### Key Terms

Kaynaklar:

- default/json canonical word analysis
- `canonical_word_analysis_v4`
- root easy-only destek sinyali
- profile-specific decision relevance

Kullanım:

- User-facing olabilir.
- Sadece clean content terms.
- Low-value particle/pronoun/formula terimleri bastırılır.
- Aynı term birden fazla kaynakta desteklenirse internal confidence artar.

### Roots

Kaynaklar:

- default/json canonical
- v4 canonical
- coreDb words
- quran_morphology.csv alignment candidate

Kullanım:

- Direct user-facing değil.
- KeyTerms/decision/support için internal evidence.
- Root conflict debug flag üretebilir.

### Lemmas

Kaynaklar:

- default/json canonical
- v4 canonical
- quran_morphology.csv
- coreDb words

Kullanım:

- Direct user-facing değil.
- Term grouping ve evidence support için kullanılır.

### Root Explanations

Kaynaklar:

- existing root explanations
- `root_explanations_tr_v2_easy_only`

Kullanım:

- Şimdilik user-facing sınırlı.
- Root meaning support olarak internal.
- Profile/keyTerms shift yaratmamalı.
- Orta/zor root explanations parked.

### Weak Correspondence Signals

Kaynaklar:

- missing-meanings report
- profile-specific weak helper
- limited fidelity/coreDb signals

Kullanım:

- User-facing sadece profile-specific label ile.
- Generic grup debug-only.
- Raw reason/matching gap kullanıcıya çıkmaz.

### Coverage / Source Availability

Kaynaklar:

- coverage-by-ayah
- source metadata
- normalized/source readiness reports

Kullanım:

- User-facing raw yüzde yok.
- SourceStatus muted text olabilir.
- Debug/audit içinde raw coverage tutulabilir.

### Translation / Source Diversity

Kaynaklar:

- normalized translations
- meal-comparison
- coreDb translation_comparison

Kullanım:

- Source diversity ve category-level signal güvenli.
- Phrase extraction clean-source gate olmadan user-facing değil.
- Encoding risk conflict/debug flag üretir.

### Sınırlı Context Sinyalleri

Kaynaklar:

- coreDb revelation_context
- revelation-context/surah
- context notes

Kullanım:

- Scope açıkça belirtilirse sourceStatus/context note olarak kullanılabilir.
- Ayet özel tefsir/yorum gibi gösterilmemeli.

## Kaynak / Veri Türü Tablosu

| Kaynak | Kullanılabilecek veri türü | User-facing katkı? | Debug/audit? | Support/conflict hesabı? | Risk | Neden |
| --- | --- | --- | --- | --- | --- | --- |
| `canonical_word_analysis_v4` | keyTerms, roots, lemmas, morphology, meanings | Evet, filtreli | Evet | Evet | Orta | Zengin ama keyTerms/profile drift ihtimali var. |
| default/json word analysis | keyTerms, roots, lemmas, morphology, meanings | Evet | Evet | Evet | Düşük/orta | Mevcut default stabil kaynak. |
| `root_explanations_tr_v2_easy_only` | root explanations | Sınırlı / sonra | Evet | Evet | Orta | Sadece kolay kökler güvenli; profile shift riski var. |
| profile-specific weak helper | weak correspondence groups | Evet | Evet | Evet | Düşük | Generic grupları saklıyor, user-facing label temiz. |
| `coverage-by-ayah` | coverage/source availability | Hayır, raw değil | Evet | Evet | Düşük | SourceStatus için iyi; yüzde kullanıcıya çıkmamalı. |
| sourceStatus mapper | source status language | Evet, tek satır | Evet | Dolaylı | Düşük | Teknik kaynak karmaşasını gizliyor. |
| normalized translations | translations, source diversity | Meal metni evet; phrase hayır | Evet | Evet | Orta | Encoding kalıntısı phrase riskini artırıyor. |
| coreDb `revelation_context` | limited context signal | Sınırlı kapsam notu | Evet | Evet | Orta | Scope ayet-level değilse dikkat. |
| coreDb `tafsir_note` | tafsir/context note | Hayır | Evet | Evet | Yüksek | Ayet özel analiz gibi görünme riski. |
| meal-comparison | translation diversity, raw meal text | Phrase olarak hayır | Evet | Evet | Orta/yüksek | Encoding/segmentation riski var. |
| fidelity | coverage/status, weak-ish signals | Doğrudan hayır | Evet | Evet | Orta | Beklenen semantic fidelity değil, dikkatli yorumlanmalı. |
| `quran_morphology.csv` | morphology, root/lemma alignment | Hayır, önce build/audit | Evet | Evet | Orta | Repair candidate için değerli, runtime'a direkt girmemeli. |
| `morphology-terms-ar.json` | morphology label dictionary | Dolaylı | Evet | Evet | Düşük/orta | Display/readability için build input. |

## Güvenli Merge / Conflict Kuralları

### Support Kuralları

- Aynı normalized key/root/lemma birden fazla güvenli kaynakta desteklenirse `sourceSupport.supportCount` artar.
- Default/json ve v4 aynı anlamı destekliyorsa internal confidence artabilir.
- Canonical + quran_morphology alignment aynı root/lemma veriyorsa independent support işaretlenebilir.
- Coverage-by-ayah analiz içeriği üretmez ama source availability support sağlar.

### Single-Source Kuralları

- Sadece tek kaynakta bulunan veri `singleSource: true` olur.
- Single-source veri user-facing olabilir ama yalnız düşük riskli ve clean content ise.
- Single-source root explanation doğrudan ana analiz cümlesine dönüşmez.
- Single-source context/tafsir sinyali user-facing analiz değil, en fazla kapsam notu olabilir.

### Conflict Kuralları

- Kaynaklar aynı word için farklı root önerirse `root_conflict`.
- Farklı lemma önerirse `lemma_conflict`.
- Farklı Türkçe meaning veya root explanation ana anlamı değiştiriyorsa `meaning_conflict`.
- Bir kaynak profile/keyTerm yönünü başka yöne çekiyorsa `profile_signal_conflict`.
- Meal text encoding kalıntısı içeriyorsa `encoding_risk`.
- Context/tafsir source sure-level iken ayet-level gibi kullanılıyorsa `scope_mismatch`.

Conflict olan veri:

- Kullanıcı-facing alana kesin bilgi gibi çıkmaz.
- Debug/audit snapshot içinde görünür.
- Gerekirse sourceStatus içinde çok genel ve sakin kapsam notuna indirgenir.

### Merge Kuralları

- Mevcut temiz veri overwrite edilmez.
- Daha güvenli kaynak, daha düşük güvenli kaynağı ezmez; sadece support ekler.
- Daha düşük güvenli kaynak sadece boş alanı source-backed tamamlayabilir.
- Source-backed tamamlanan veri kendi source trace bilgisini taşır.
- Preview gate ayrıca user-facing izin verir veya bastırır.

### Bastırma Kuralları

- Düşük değerli zamir/edat/formula terimleri keyTerms'e geri alınmaz.
- Ham lemma/root/transliteration kullanıcıya basılmaz.
- Meal encoding riski olan phrase gösterilmez.
- `tafsir_note` ayet özel analiz gibi kullanılmaz.
- Root easy-only sadece kolay kök açıklaması desteği olarak değerlendirilir.

## Internal Confidence Mantığı

Internal confidence kullanıcıya gösterilmeyen bir debug/audit sinyalidir.

### Artıran Durumlar

- Aynı evidence birden fazla güvenli kaynakta destekleniyor.
- Default/json ve v4 aynı key/root/lemma/meaning yönünde birleşiyor.
- Canonical morphology ve quran_morphology alignment uyumlu.
- Weak signal profile-specific gruba düşüyor.
- Source policy ilgili kaynak için user_facing veya sourceStatus izni veriyor.

### Düşüren Durumlar

- Evidence single-source ve source risk seviyesi orta/yüksek.
- Root explanation orta/zor riskli kaynaktan geliyor.
- Meaning/root/lemma conflict var.
- Meal phrase encoding riski var.
- Context source sure-level ama ayet-level gibi kullanılma riski var.
- Term particle/pronoun/formula sınıfında.

### Bloke Eden Durumlar

- Parked source.
- Encoding bozuk phrase.
- Ham tefsir note'un ayet analizi gibi kullanılması.
- Low-value term'in keyTerms'e girmesi.
- Conflict flag çözülmeden kesin user-facing ifade üretilmesi.

## User-Facing ve Debug/Audit Ayrımı

### Kullanıcı Görebilir

- Temiz `mainMeaningAxisPreview`.
- Temiz ve kısa `keyTermsPreview`.
- Profile-specific `weakCorrespondencesPreview`.
- Kısa `translationDifferencesPreview` kategori metni.
- Tek satır muted `sourceStatus`.

### Kullanıcı Görmez

- `internalConfidence`
- `sourceSupport`
- `supportCount`
- `singleSource`
- `conflictFlags`
- `evidenceTrace`
- raw source id
- raw coverage ratio
- raw missing reason
- parked/build-input kaynak adları
- technical confidence labels

### Debug/Audit Görebilir

- Evidence item listesi.
- Source support summary.
- Conflict summary.
- Single-source evidence listesi.
- Suppressed user-facing items.
- Coverage raw metrikleri.
- Encoding/source risk flags.
- Evidence trace.

## İlk Uygulanabilir Kod Adımı

Önerilen ilk kod paketi runtime entegrasyonu değil, snapshot üreten skeleton olmalı.

### Yeni Helper

Önerilen dosya:

- `packages/core/src/analysis/verseAnalysisEvidenceLayer.ts`

İlk skeleton sadece şunları yapmalı:

- Mevcut `VerseAnalysisContext` girdisini almalı.
- Context içindeki keyTerms, roots, lemmas, rootMeanings, weak candidates, coverage debug detail ve source status verilerini evidence item formatına dönüştürmeli.
- Internal confidence/sourceSupport/conflict alanlarını çok basit ve konservatif doldurmalı.
- User-facing preview üretmemeli.
- Mevcut `buildVerseAnalysisContext` veya `buildVerseAnalysisPreview` içine bağlanmamalı.

### Yeni Audit Script

Önerilen dosya:

- `scripts/audit-vnext-evidence-layer.ts`

İlk audit kapsamı:

- 28 quality set.
- 10 manuel göz test ayeti.
- JSON default source.
- İsteğe bağlı v4/coreDb karşılaştırması daha sonraya bırakılabilir.

Önerilen snapshot:

- `data/analysis-snapshots/vnext-evidence-layer.sample.json`

Snapshot alanları:

- total evidence item count
- userFacingAllowed count
- debugOnly count
- conflict count
- singleSource count
- sourceSupport distribution
- per-verse evidence summary
- suppressed/block reason summary

### Test Planı

Minimum:

```bash
node --no-warnings --loader ./scripts/ts-extension-loader.mjs scripts/audit-vnext-evidence-layer.ts
npm run typecheck -w @quran-app/web
```

Başarı kriterleri:

- Runtime/default source değişmez.
- UI değişmez.
- Quality set profile sonucuna dokunulmaz.
- Evidence snapshot debug alanları üretir ama preview davranışını değiştirmez.
- User-facing alanlara teknik confidence sızmaz.

## Kısa Karar

vNext'in asıl yönü yalnız kaynak statüsü yönetimi değil, kaynaklardan gelen parçalı analiz kanıtlarını birleştiren Evidence Layer olmalı.

Bu katman:

- Veri yokken uydurma üretmez.
- Veri varsa source-backed şekilde izlenebilir hale getirir.
- Çoklu kaynak desteğini internal confidence olarak tutar.
- Çakışmaları kullanıcıdan saklayıp audit/debug tarafında görünür yapar.
- Kullanıcıya yalnız temiz ve sakin analiz çıktısı hazırlar.

Sonraki en küçük güvenli adım `verseAnalysisEvidenceLayer.ts` skeleton + snapshot audit scriptidir; bu adım UI/default/runtime davranışı değiştirmeden Evidence Layer tasarımını gerçek veride görünür hale getirir.
