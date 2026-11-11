# Source Status Mapper

Bu rapor `data/analysis-snapshots/source-policy-audit.sample.json` üzerinden üretilen teknik olmayan sourceStatus mapper snapshot sonucunu özetler.

Snapshot:

- `data/analysis-snapshots/source-status-mapper.sample.json`

## Kısa Sonuç

- Toplam mapping: 27
- Kartta görünür mapping: 10
- Parked olduğu için gizlenip sadece kapsam notuna indirilen mapping: 6
- Debug-only kalan mapping: 11
- Benzersiz görünür kullanıcı cümlesi: 8
- Benzersiz kapsam sınırlılığı cümlesi: 5

Bu çalışma runtime, UI veya default source davranışını değiştirmez. Sadece Kanıtlı Analiz vNext için source policy kararlarının kullanıcı diline nasıl çevrilebileceğini snapshot olarak gösterir.

## Kullanıcıya Gösterilecek Kaynak Durumları

Kartta gösterilebilir sade cümleler:

- Ayet metni mevcut.
- Okunuş/transliterasyon verisi mevcut.
- Meal verileri mevcut.
- Kelime ve morfoloji verileri mevcut.
- Kelime anlamları kısmen mevcut.
- Karşılaştırma sinyalleri kısmen mevcut.
- Temiz meal kaynağı mevcut.
- Resmi meal kaynağı mevcut.

Bu cümleler doğrudan ham `sourceId`, `confidence`, `usageClass` veya `safeForUi` değerlerini göstermez. Ama arka planda bu alanlardan türetilir.

## Kanıtlı Analiz Kartı İçin Örnek Metinler

Kompakt örnek:

> Kaynaklar: ayet metni, meal, kelime verisi ve karşılaştırma sinyalleri mevcut.

Kapsam notlu örnek:

> Kaynaklar: ayet metni, meal, kelime verisi ve karşılaştırma sinyalleri mevcut. Ayet bazlı tefsir/nüzul kapsamı sınırlı.

Kelime odaklı örnek:

> Kaynaklar: kelime ve morfoloji verileri mevcut; bazı kelime anlamları kapsam dışı kalabilir.

Meal/karşılaştırma odaklı örnek:

> Kaynaklar: meal verileri ve karşılaştırma sinyalleri mevcut; phrase düzeyi çıkarımlar ayrıca filtrelenir.

## Debug İçinde Kalacak Teknik Detaylar

Normal kullanıcıya gösterilmemesi gereken teknik detaylar:

- `confidence`
- `usageClass`
- `safeForUi`
- `coverageRatio`
- `fidelityPolicy`
- `cleanRowCount`
- `corruptedRowCount`
- `missingRowCount`
- `issueCount`
- `status=accepted/rejected`
- GitHub kaynak karar gerekçeleri
- Encoding issue listeleri
- Coverage report sayıları
- Final readiness decision objesi

Bu detaylar `debugSources`, audit snapshot veya geliştirici raporlarında kalmalı.

## Parked Kaynaklar Nasıl Gizlenecek?

Parked kaynaklar kartta kaynak adıyla gösterilmez. Yani normal kullanıcı şunları ham şekilde görmez:

- `root_explanations`
- `tafsir`
- `revelation_context`
- `TDV İslam Ansiklopedisi`
- rejected GitHub kaynakları

Bunlar yerine gerekirse yumuşatılmış kapsam notu gösterilir:

- Kök açıklamaları kapsamı sınırlı.
- Ayet bazlı tefsir özeti sınırlı.
- Ayet bazlı nüzul bağlamı sınırlı.
- Nüzul/context kaynakları ayet bazında doğrulanmadan gösterilmez.
- Bazı kaynaklar ek doğrulama gerektirdiği için kullanıcıya gösterilmez.

Kullanıcı-facing öneri: bu parked notlarının hepsi aynı anda gösterilmemeli. Kartta en fazla bir kısa kapsam cümlesi kullanılmalı.

## Build Input Kaynaklar

Build input kaynaklar kullanıcıya doğrudan gösterilmez:

- `meal:sadak`
- `meal:yilmaz`
- `meal:yildirim-harun`
- `external:Diyanet Kur'an Portalı / Kur'an Yolu`
- `external:Açık Kuran`
- `github:ziegfiroyt/acikkuran-api`

Mapper bunları şu debug metniyle sınıflandırır:

> Arka plan veri hazırlama kaynağı; kullanıcıya doğrudan gösterilmez.

Bu kaynaklar değerli olabilir, ama normalize/enrichment/build sonrası kontrollü kaynaklara dönüşmelidir.

## Debug-Only Kaynaklar

Debug-only kaynaklar:

- `metadata:coverage-report`
- `metadata:normalized-report`
- `metadata:encoding-audit`
- `metadata:surah-level-context`
- `metadata:final-readiness-report`

Mapper bunları şu teknik sınıfta tutar:

> Teknik audit kaynağı; kullanıcıya gösterilmez.

Bu kaynaklar Kanıtlı Analiz kartında değil; audit, source policy ve geliştirici kontrolünde kullanılmalı.

## Kanıtlı Analiz vNext Kullanımı

Önerilen entegrasyon davranışı:

1. `source-policy-audit.sample.json` merkezi policy input olarak kalır.
2. `source-status-mapper.sample.json` bu policy’nin kullanıcı diline dönüşümünü gösterir.
3. Kanıtlı Analiz kartında sadece `cardExamples.compact` veya `withLimitations` benzeri kısa metin gösterilir.
4. `debugOnlyNotes` normal kullanıcıya açılmaz.
5. `parked` kaynaklar kaynak adıyla görünmez; yalnızca genel kapsam sınırlılığına indirgenir.
6. Build input kaynaklar kartta görünmez.

Önerilen UI davranışı:

- Eğer ayette meal + word analysis + translation comparison mevcutsa:
  - `Kaynaklar: ayet metni, meal, kelime verisi ve karşılaştırma sinyalleri mevcut.`
- Eğer parked kapsam notu varsa:
  - ikinci cümle olarak `Ayet bazlı tefsir/nüzul kapsamı sınırlı.`
- Eğer kart zaten kalabalıksa:
  - sadece kompakt tek satır sourceStatus göster.

## Risk Notu

Bu mapper sourceStatus dilini sadeleştirir, ama analiz kalitesini tek başına artırmaz. Ayrıca `phrase extraction`, `tafsir`, `nüzul` ve `root_explanations` gibi kaynakları user-facing yapmaz. Bu doğru: mapper’ın görevi veri eklemek değil, mevcut kaynak durumunu kullanıcıyı yormadan anlatmaktır.

## Sonraki Küçük Adım

En güvenli sonraki adım:

1. Bu mapper çıktısını 28 ayet quality set ve 1000 ayet audit snapshot üzerinde örnekle.
2. Her ayette tek satır sourceStatus yeterli mi kontrol et.
3. Kartta fazla tekrar yapıyorsa sourceStatus sadece muted tek satır olarak kullanılmalı.
4. Runtime entegrasyonu yapılacaksa önce opt-in preview snapshot üret, UI’a doğrudan bağlama.
