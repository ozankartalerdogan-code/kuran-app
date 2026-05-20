# Profile-Specific Weak Preview Integration Plan

Tarih: 2026-05-14

Bu doküman profile-specific filtered weak preview kuralının en küçük güvenli entegrasyon planını açıklar. Kod, runtime, UI, default source ve mevcut preview logic değiştirilmedi.

## Mevcut Durum

`weakCorrespondencesPreview` bugün iki aşamada üretiliyor:

1. `packages/core/src/analysis/verseAnalysisContext.ts`
   - `fidelitySignals.weakOrMissingCorrespondences` alanını context içine koyuyor.
   - JSON source tarafında `data/word-analysis/reports/missing-meanings.json` kayıtları doğrudan bu alana giriyor.
   - CoreDb source tarafında `fidelity_signals` içindeki `missing_meaning` sinyalleri bu alana map ediliyor.

2. `packages/core/src/analysis/verseAnalysisPreview.ts`
   - `buildVerseAnalysisPreview(context)` içinde:
   - `selectedProfile = selectVerseAnalysisProfile(context)`
   - `weakCorrespondencesPreview = buildWeakCorrespondenceGroups(selectedProfile, context.fidelitySignals.weakOrMissingCorrespondences.length > 0)`

3. `packages/core/src/analysis/verseAnalysisDecision.ts`
   - `buildWeakCorrespondenceGroups(profile, hasWeakCorrespondences)` yalnızca profile ve weak var/yok bilgisine bakıyor.
   - Missing kayıtlarının lemma/root/arabic içeriğine bakmıyor.
   - Bu yüzden mevcut preview bazen weak alanını fazla genel veya fazla geniş gösterebiliyor.

## Entegrasyon Hedefi

Amaç, mevcut weak davranışını daha source-backed ve daha temiz hale getirmek:

- Ham `matching_gap`, tek harf, zamir/edat parçaları kullanıcıya görünmesin.
- `diger kelime eslesme adaylari` normal kullanıcı-facing weak alanına girmesin.
- Sadece profile-specific grup eşleşirse kullanıcı-facing weak metni üretilsin.
- Generic kalanlar debug/sourceStatus için izlenebilir kalsın.
- Default source ve analysis/decision profile seçimi değişmesin.

## Değişecek Dosya Adayları

### 1. `packages/core/src/analysis/verseAnalysisWeakPreview.ts`

Yeni küçük helper için önerilen dosya.

Önerilen public API:

```ts
export interface ProfileSpecificWeakPreviewResult {
  userFacingPreview: string[];
  userFacingGroups: Array<{
    key: string;
    label: string;
    count: number;
  }>;
  debugOnlyGroups: Array<{
    key: string;
    label: string;
    count: number;
  }>;
  suppressedCount: number;
}

export function buildProfileSpecificWeakPreview(input: {
  profile: VerseAnalysisProfile;
  weakOrMissingCorrespondences: VerseAnalysisContext["fidelitySignals"]["weakOrMissingCorrespondences"];
}): ProfileSpecificWeakPreviewResult
```

Bu helper:

- Missing kayıtlarını filtreler.
- Profile-specific gruplara ayırır.
- Generic grubu user-facing listeden çıkarır.
- Label map uygular.
- Ham lemma/root/arabic kullanıcı-facing metne basmaz.

### 2. `packages/core/src/analysis/verseAnalysisPreview.ts`

Minimal entegrasyon noktası burası.

Bugünkü satır:

```ts
const weakCorrespondencesPreview = buildWeakCorrespondenceGroups(
  selectedProfile,
  context.fidelitySignals.weakOrMissingCorrespondences.length > 0
);
```

Önerilen değişim:

```ts
const weakPreview = buildProfileSpecificWeakPreview({
  profile: selectedProfile,
  weakOrMissingCorrespondences: context.fidelitySignals.weakOrMissingCorrespondences
});

const weakCorrespondencesPreview = weakPreview.userFacingPreview;
```

İlk entegrasyonda eski `buildWeakCorrespondenceGroups` silinmemeli. Gerekirse fallback/dev comparison için tutulabilir.

### 3. `packages/core/src/analysis/verseAnalysisContext.ts`

İlk entegrasyon için değiştirilmemesi tercih edilir.

Ancak debug/sourceStatus tarafında generic grubu izlenebilir yapmak istenirse daha sonra `signalDebug` veya `debugSources` şemasına küçük bir internal alan eklenebilir. İlk paket için buna gerek yok; preview helper kendi içinde debug sonuç döndürüp sadece snapshot/audit kullanabilir.

### 4. `scripts/inspect-verse-analysis-context.ts`

Entegrasyon sonrası snapshot doğrulaması için güncellenebilir.

Gösterilecek ek alanlar:

- `weakCorrespondencesPreview`
- `profileSpecificWeakGroups`
- `genericDebugWeakGroups`
- `suppressedWeakCandidateCount`

Bu script runtime davranışı değil, doğrulama/audit yüzeyi olduğu için güvenli değişim alanı.

## Label Map Nerede Durmalı?

En temiz yer yeni helper dosyası:

`packages/core/src/analysis/verseAnalysisWeakPreview.ts`

Neden:

- Label map decision hierarchy değildir.
- UI component içine konursa analiz davranışı UI'a dağılır.
- `verseAnalysisDecision.ts` içine konursa profile seçimiyle presentation label birbirine karışır.
- Preview katmanında ama ayrı helper dosyasında durursa source-backed weak görünürlük kuralı izole kalır.

Önerilen map:

| Group key | Kullanıcı-facing label |
|---|---|
| yiyecek ve yasakli maddeler | Yiyecek ve yasak kapsamındaki ifadeler |
| zaruret, istisna ve sorumluluk | Zaruret ve istisna ifadeleri |
| ahlaki yasak ve davranis uyarilari | Davranış uyarıları |
| amel, olcu ve ahiret sonucu | Amel, ölçü ve sonuç ifadeleri |
| rahmet, tovbe ve umut | Rahmet ve bağışlanma ifadeleri |
| kissa sahnesi ve olay unsurlari | Kıssa sahnesiyle ilgili ifadeler |
| yol, hidayet ve sapma | Yol ve hidayet ifadeleri |
| kulluk, dua ve yardim | Kulluk ve dua ifadeleri |
| diger kelime eslesme adaylari | Kullanıcı-facing gösterilmez |

## Generic Grup Nasıl Debug/SourceStatus'ta Tutulmalı?

İlk entegrasyonda öneri:

- `diger kelime eslesme adaylari` `weakCorrespondencesPreview` içine girmesin.
- Helper sonucu içinde `debugOnlyGroups` olarak dönsün.
- `buildVerseAnalysisPreview` ilk aşamada bunu public preview interface'e eklemesin.
- Audit/inspect scriptleri helper sonucunu okuyup snapshot'a yazsın.

Daha sonra gerekiyorsa:

- `sourceStatus.missing` içine normal kullanıcıya teknik olmayan bir not eklenebilir:
  - `Ek kelime eşleşme adayları teknik kontrolde tutuldu.`
- Ama bu not varsayılan UI'da boilerplate/gürültü yapabilir. İlk entegrasyonda sourceStatus'a eklememek daha güvenli.

## En Küçük Güvenli Entegrasyon Adımları

1. Yeni helper ekle:
   - `packages/core/src/analysis/verseAnalysisWeakPreview.ts`
   - Mevcut audit scriptlerindeki filtre/grup mantığı buraya taşınır.

2. Helper için küçük unit/smoke audit kullan:
   - Quality set 28 ayet
   - UI göz test ayetleri
   - İlk 1000 ayet audit

3. `verseAnalysisPreview.ts` içinde sadece weak preview üretimini helper'a bağla.
   - Profile seçimi, main axis, keyTerms, translationDifferences değişmesin.

4. `weakCorrespondencesPreview` kullanıcı-facing çıktıda yalnız `userFacingPreview` alsın.
   - Generic grup gizli kalsın.
   - Ham label, lemma, root, reason basılmasın.

5. `inspect-verse-analysis-context.ts` snapshot'ında debug alanlarını göster.
   - UI normal kullanıcıya göstermesin.

6. UI göz testi yap.
   - 38 hedef ayet
   - Özellikle: `49:12`, `5:90`, `2:173`, `5:3`, `12:100`, `2:177`, `5:110`, `2:61`, `4:102`

## Riskler

- Faydalı content kaybı: Generic gruba düşen bazı ayetlerde mevcut weak preview gizlenecek. Hedef sette `existingWeakHiddenBySpecificCount: 21`.
- Aşırı daralma: Profile-specific weak yalnız 12/38 hedef ayette görünüyor. Bu bilinçli temizlik ama bazı kullanıcılar daha az uyarı görebilir.
- Label semantiği: `yiyecek ve yasak kapsamındaki ifadeler` gibi label'lar bazı karma ayetlerde hâlâ geniş kalabilir.
- Source farkı: JSON/default ve coreDb/v4 kaynaklarında weak aday havuzu farklı olabilir. İlk entegrasyon default JSON ile sınırlı doğrulanmalı.
- Interface genişletme riski: `VerseAnalysisPreview` public type'ına debug alanı eklemek UI tarafında gereksiz yüzey açabilir. İlk etapta eklenmemeli.

## Test Planı

### Audit / Snapshot

1. Hedef set audit:

```bash
node --no-warnings --loader ./scripts/ts-extension-loader.mjs scripts/audit-profile-specific-weak-preview-target-set.ts
```

Beklenen:

- Profile-specific weak görünen ayetler makul kalmalı.
- Generic-only ayetler kullanıcı-facing listede görünmemeli.

2. Inspect snapshot:

```bash
node --no-warnings --loader ./scripts/ts-extension-loader.mjs scripts/inspect-verse-analysis-context.ts
```

Beklenen:

- Quality set profilleri bozulmamalı.
- `weakCorrespondencesPreview` ham/teknik label basmamalı.

3. Global/focused audit:

```bash
node --no-warnings --loader ./scripts/ts-extension-loader.mjs scripts/audit-filtered-weak-preview-profile-specific.ts
```

Beklenen:

- Generic grup debug/sourceStatus adayı olarak kalmalı.
- User-facing weak aday sayısı kontrollü olmalı.

### Typecheck

```bash
npm run typecheck -w @quran-app/web
```

### UI Göz Testi

Kontrol ayetleri:

`1:5`, `1:7`, `2:7`, `2:173`, `5:3`, `5:90`, `12:100`, `49:12`, `4:29`, `99:7`, `101:6`, `112:1`, `112:4`

Beklenen:

- Weak alanı boşsa kart kirlenmemeli.
- Weak alanı doluysa kısa ve label-based görünmeli.
- Generic/debug grubu normal kullanıcıya görünmemeli.

## Karar

En güvenli entegrasyon, yeni `verseAnalysisWeakPreview.ts` helper'ı ile başlamaktır. Bu helper önce audit/snapshot tarafında doğrulanmalı, sonra `verseAnalysisPreview.ts` içinde sadece `weakCorrespondencesPreview` üretimine bağlanmalıdır. Decision hierarchy, source default, UI component ve AnalysisEngineV1 değişmemelidir.

