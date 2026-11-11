# SourceStatus Context Opt-in Audit

Bu rapor `source-status-mapper.sample.json` çıktısının Kanıtlı Analiz context yanında opt-in olarak nasıl görüneceğini değerlendirir.

Snapshot:

- `data/analysis-snapshots/source-status-context-optin.sample.json`

Bu çalışma:

- Runtime değiştirmedi.
- UI değiştirmedi.
- Default source değiştirmedi.
- Mevcut preview logic değiştirmedi.
- Sadece audit/snapshot üretti.

## Kapsam

- Quality set: 28 ayet
- Ek örnek set: 10 ayet
- Toplam: 38 ayet

Ek örnek ayetler:

- `6:145`
- `2:219`
- `5:2`
- `6:141`
- `2:282`
- `2:259`
- `2:233`
- `5:110`
- `2:61`
- `4:102`

## Özet Sonuç

- Toplam entry: 38
- Quality set entry: 28
- Örnek set entry: 10
- Oluşan benzersiz kart metni: 1
- Teknik metadata sızıntısı: 0
- Fazla teknik görünen metin: 0
- Profile-specific weak preview entegrasyonu: tamamlandı olarak işaretlendi

## Oluşan SourceStatus Cümlesi

38/38 ayette aynı kompakt metin oluştu:

> Kaynaklar: ayet metni, meal, kelime verisi ve karşılaştırma sinyalleri mevcut. Ayet bazlı tefsir/nüzul kapsamı sınırlı.

Bu metin kullanıcı dilinde sade görünüyor. `confidence`, `usageClass`, `safeForUi`, `coverageRatio`, `debug_only`, `build_input`, `parked` gibi teknik ifadeler içermiyor.

## Görünür Status Parçaları

Mapper’ın context üzerinden ürettiği görünür parçalar:

- Ayet metni mevcut.
- Meal verileri mevcut.
- Kelime ve morfoloji verileri mevcut.
- Karşılaştırma sinyalleri kısmen mevcut.
- Kelime anlamları kısmen mevcut.

Bu parçalar kartta tek tek liste olarak gösterilirse tekrar hissi oluşabilir. En iyi kullanım tek satır kompakt sourceStatus gibi duruyor.

## Debug / Parked Kaynak Davranışı

Kullanıcıya sızmayan teknik/debug kaynaklar:

- `debugOnlyMappings`: 11
- `hiddenWithLimitationMappings`: 6

Parked kaynaklar kaynak adıyla gösterilmedi. Sadece yumuşatılmış kapsam notuna indirildi:

- Ayet bazlı tefsir özeti sınırlı.

Snapshot’ta ayetlerin çoğunda nüzul/context mevcut göründüğü için ayrıca “nüzul bağlamı sınırlı” parçası tekil hidden text listesine girmedi. Ancak kart cümlesinde genel ve güvenli biçimde `tefsir/nüzul kapsamı sınırlı` ifadesi kullanıldı.

## Teknik Sızıntı Kontrolü

Kontrol edilen teknik terimler:

- `confidence`
- `usageClass`
- `safeForUi`
- `coverageRatio`
- `debug_only`
- `build_input`
- `parked`
- `sourceId`
- `fidelityPolicy`
- `corruptedRowCount`
- `missingRowCount`

Sonuç:

- Teknik sızıntı: 0
- Replacement/bozuk karakter kontrolü: temiz
- `??` karakter bozulması: yok

## Profile-Specific Weak Preview Durumu

Plan açısından işaret:

- `verseAnalysisPreview.ts`, `buildProfileSpecificWeakPreview` helper’ını kullanıyor.
- Generic weak gruplar normal user-facing weak preview’a taşınmıyor.
- Public preview type’a debug alanı eklenmiş görünmüyor.

Bu nedenle vNext planındaki “Profile-specific weak preview stabil entegrasyonu” adımı davranış olarak tamamlanmış kabul edilebilir. Bundan sonra gerekirse yalnız label/göz testi polish yapılmalı.

## vNext Entegrasyonuna Hazır mı?

Evet, sourceStatus mapper vNext entegrasyonuna hazır görünüyor; ama şu koşulla:

- Kartta tek satır muted metin olarak kullanılmalı.
- Her kaynak parçası ayrı chip/list olarak gösterilmemeli.
- Debug-only ve parked kaynak adları normal kullanıcıya açılmamalı.
- SourceStatus metni her ayette çok tekrar ediyorsa collapsible veya küçük muted footer gibi sunulmalı.

Önerilen UI metni:

> Kaynaklar: ayet metni, meal, kelime verisi ve karşılaştırma sinyalleri mevcut. Ayet bazlı tefsir/nüzul kapsamı sınırlı.

## Sonraki Küçük Adım

En güvenli sonraki adım:

1. Bu sourceStatus mapping’i `VerseAnalysisPreview.sourceStatus` içine opt-in helper olarak bağlamak.
2. UI’a hemen bağlamadan önce `inspect-verse-analysis-context.ts` snapshotında mevcut sourceStatus ile mapper sourceStatus’ı yan yana göstermek.
3. Eğer tekrar/boilerplate hissi düşükse Kanıtlı Analiz kartında muted tek satır olarak kullanmak.
