# vNext Conflict Classification Refinement Plan

Bu rapor `data/analysis-snapshots/vnext-evidence-layer-global-audit.json` çıktısındaki conflict sınıflandırmasını inceler. Runtime, UI, default source, preview/decision logic, AI/semantic path ve kaynak veri dosyaları değiştirilmedi.

## Kısa Sonuç

Global audit başarılı çalıştı: 6236 ayet işlendi, hata yok. Ancak `needsManualReview` sayısı çok yüksek çıktı.

Ana sebep, v4 verisinin aşırı riskli olması değil; mevcut conflict classifier'ın çok dar bir `usefulPatterns/noisyPatterns` sözlüğüyle çalışması. Bu yüzden açık content terimler bile otomatik olarak `needsManualReview` sınıfına düşüyor.

Özet:

- Toplam conflict flag: 9832
- Conflict etkilenen ayet: 3604
- `needsManualReview`: 8741 conflict
- `needsManualReviewAyah`: 3545 ayet
- `likelyRiskyDrop`: 330 conflict
- `riskyDropAyah`: 155 ayet
- `likelyGoodSuppression`: 582 conflict
- `likelyUsefulV4Addition`: 179 conflict

Bu tablo bize şunu söylüyor: gerçek riskli drop adayı sınırlı; asıl sorun generic/belirsiz sınıflandırmanın fazla geniş kalması.

## Global Conflict Dağılımı

| Conflict tipi | Sayı |
|---|---:|
| `keyTermOnlyInV4` | 5530 |
| `keyTermMissingInV4` | 2191 |
| `profileRelevantTermDropped` | 2111 |

| Kalite sınıfı | Sayı |
|---|---:|
| `needsManualReview` | 8741 |
| `likelyGoodSuppression` | 582 |
| `likelyRiskyDrop` | 330 |
| `likelyUsefulV4Addition` | 179 |

## needsManualReview Neden 3545 Ayete Çıktı?

### 1. Content sözlüğü dar

Mevcut classifier sadece sınırlı bir faydalı terim listesi tanıyor. Stored örneklerde `needsManualReview` alanına düşen fakat çoğu durumda content term sayılabilecek örnekler:

- `hastalık`
- `Ateş/Cehennem`
- `İşitti`
- `Takva sahibi`
- `yardım`
- `Rızık verdi`
- `Âdem`
- `İnsanlar`
- `düşman`
- `kötülük`
- `Gök`
- `doğru söyleyen`
- `hüsrana uğrayanlar`
- `yurt, ev`

Bu terimler otomatik olarak risky değildir; bir kısmı v4 faydalı ekleme, bir kısmı profile-relevant düşüş olabilir.

### 2. keyTermOnlyInV4 fazla temkinli ele alınıyor

Stored sample conflict sayımlarında `needsManualReview` örneklerinin çoğu `keyTermOnlyInV4` üzerinden geliyor:

| needsManualReview conflict tipi | Stored örnek sayısı |
|---|---:|
| `keyTermOnlyInV4` | 348 |
| `keyTermMissingInV4` | 177 |
| `profileRelevantTermDropped` | 155 |

Bu pattern şunu gösteriyor: v4 yeni terim eklediğinde classifier o terimi tanımıyorsa doğrudan manual review'a atıyor. Halbuki `hastalık`, `azgınlık`, `alay etmek`, `kâr etmek`, `sağanak`, `gök gürültüsü` gibi terimler her zaman riskli değil; profile göre source-backed content candidate olabilir.

### 3. Genel profil çok geniş kaldığı için çok şey belirsiz görünüyor

Stored örneklerde `needsManualReview` en çok `genel_karma` profilinde birikiyor:

| Profile | Stored needsManualReview örnek sayısı |
|---|---:|
| `genel_karma` | 263 |
| `ahiret` | 110 |
| `kissa` | 105 |
| `uyari_inkar` | 97 |
| `yol_hidayet` | 31 |
| `dua_kulluk` | 25 |
| `tevhid_birlik` | 25 |
| `rahmet_magfiret` | 19 |
| `emir_yasak` | 4 |
| `hukum_istisna` | 1 |

`genel_karma` profilinde profile-specific term aileleri zayıf olduğu için classifier "bilmiyorum" demeyi tercih ediyor.

### 4. Bazı Arabic-only / deity-general terimler net sınıfa sahip değil

Örneklerde `اللَّه` sıkça `needsManualReview` olarak görünüyor. Bu, v4 default için risk değil; daha çok "Allah/Rab gibi genel terimler keyTerms recovery ile otomatik geri alınmasın" kuralının conflict sınıflandırmasında da açık karşılığının olmamasından kaynaklanıyor.

Bu tür terimler kullanıcı-facing anahtar terim olarak şişirilmemeli; conflict audit'te çoğu `genericSuppression` veya `neutralGenericTerm` gibi ayrı sınıfa alınmalı.

## En Sık Conflict Pattern'leri

Stored örneklerden görünen baskın pattern'ler:

- `keyTermOnlyInV4 + unknown content`: v4 yeni terim getiriyor ama classifier sözlüğünde yok.
- `keyTermMissingInV4 + generic term`: JSON tarafındaki düşük değerli terim v4'te kayboluyor.
- `profileRelevantTermDropped + content term`: gerçekten dikkat edilmesi gereken düşüşler burada.
- `Allah/Rab/اللَّه`: teolojik olarak önemli ama analiz değeri her ayette otomatik yüksek sayılmamalı.
- `zaman/edat/bağlaç kalıpları`: "ne zaman", "o zaman", "ile beraber", "nerede" gibi ifadeler çoğunlukla good suppression adayı.

## Gerçek Riskli Drop Adayları

Stored örneklerde en net `likelyRiskyDrop` adayları:

- `Küfretti`
- `Şeytan`
- `İman etti`
- `Elçi`
- `amel, iş`
- `tövbe etmek`
- `merhamet, rahmet`
- `nimet, nimet vermek`
- `Kıstas`
- `gazap etti`
- `Secde etti`
- `haram kıldı`

Bunlar v4'te kayboluyorsa dikkat edilmeli. Özellikle `profileRelevantTermDropped` ile birlikte geliyorsa `manualReviewNeeded` değil, daha net `likelyRiskyDrop` olarak kalmalı.

## İyi Suppression Örnekleri

Stored örneklerde v4'ün iyi temizlik yaptığı görünenler:

- `İşte o`
- `ile beraber`
- `sonra, ardından`
- `nerede, -diği yerde`
- `başka, diğer`
- `Önce`

Not: `öldürdü` stored örneklerde good suppression'a düşmüş görünüyor; bu örnek dikkatli ele alınmalı. Bazı ayetlerde content olabilir. Yeni kurallarda fiil/content kontrolü güçlendirilmeli.

## Faydalı v4 Addition Örnekleri

Stored örneklerde çok az `likelyUsefulV4Addition` yakalandı:

- `kuşatmak`
- `taşmak`

Ama `needsManualReview` örnekleri içinde de faydalı v4 addition gibi duran çok fazla terim var:

- `hastalık`
- `alay etmek`
- `şaşkın dolaşmak`
- `azgınlık`
- `satın almak`
- `kâr etmek`
- `kör`
- `sağanak`
- `gök gürültüsü`
- `aydınlatmak`

Bu, useful term listelerinin genişletilmesi gerektiğini gösteriyor.

## Önerilen Yeni Sınıflandırma Kuralları

### 1. Conflict tipi önceliği ayrılmalı

`keyTermOnlyInV4` için:

- Eğer terim content noun/verb/concept ise `likelyUsefulV4Addition`.
- Eğer terim particle/pronoun/formula/generic ise `likelyGoodSuppression` değil, `neutralV4Addition` veya `needsManualReview` düşük öncelik.
- Eğer terim düşük güvenli / source tekil / profile dışı ise `needsManualReview`.

`keyTermMissingInV4` için:

- Eğer terim generic/noisy ise `likelyGoodSuppression`.
- Eğer terim profile-relevant content ise `likelyRiskyDrop`.
- Eğer terim proper name/concept ama profile dışıysa `needsManualReview`.

`profileRelevantTermDropped` için:

- Generic terimler hariç tutulmalı.
- Content term ise doğrudan `likelyRiskyDrop`.
- Allah/Rab gibi geniş terimler "generic theological term" olarak ayrı sınıfa alınmalı.

### 2. Term family sözlüğü genişletilmeli

Yeni aileler:

- `belief_term`: iman, küfür, şirk, nifak, takva
- `afterlife_term`: ateş, cehennem, cennet, hesap, amel, karşılık, tartı
- `warning_term`: hastalık, kalp, kulak, göz, perde, mühür, azap, gazap
- `mercy_term`: rahmet, bağışlama, tövbe, merhamet, umut
- `story_term`: Âdem, Musa, Yusuf, İbrahim, Nuh, Firavun, secde, rüya
- `law_term`: haram, helal, yasak, hüküm, ticaret, mal, can
- `action_term`: işitmek, görmek, söylemek, satın almak, değiştirmek, yardım etmek, rızık vermek
- `nature_scene_term`: gök, yer, yağmur, sağanak, gök gürültüsü, ışık

### 3. Generic/noisy sözlüğü ayrıştırılmalı

Şunlar genellikle user-facing conflict riski sayılmamalı:

- işaret zamiri: `İşte o`, `bu`, `şu`
- bağlaç/zaman: `sonra`, `önce`, `ne zaman`, `o zaman`
- edat/preposition: `ile beraber`, `yanında`, `içinde`, `üzerine`
- belirsiz niceleyici: `bazı`, `çok, pek çok`
- her ayette şişebilen genel terimler: `Allah`, `Rab`

Bu terimler conflict audit'te `likelyGoodSuppression` veya ayrı bir `neutralGenericSuppression` sınıfına alınabilir.

### 4. Profile-specific relevance kullanılmalı

Örnek:

- `hastalık` + `uyari_inkar` -> useful addition
- `Ateş/Cehennem` + `ahiret` -> risky drop veya useful term
- `Secde etti` + `kissa` -> risky drop
- `tövbe etmek` + `rahmet_magfiret` -> risky drop
- `haram kıldı` + `hukum_istisna` veya `emir_yasak` -> risky drop
- `satın almak` + `yol_hidayet` bağlamında tek başına belirsiz, ama "satın almak/sapıklık" kalıbıyla useful olabilir

### 5. needsManualReview ayet sınıfı yeniden hesaplanmalı

Şu an bir ayette tek bir belirsiz conflict varsa ayet `needsManualReviewAyah` oluyor ve `manualReviewNeeded` action'a düşüyor.

Daha iyi yaklaşım:

- `needsManualReview` sayısı az ve sadece generic/v4 addition ise ayet `inspectGate` olsun.
- `likelyRiskyDrop` varsa `manualReviewNeeded` olsun.
- `profileRelevantTermDropped` + content term varsa `manualReviewNeeded` olsun.
- Sadece `keyTermOnlyInV4` content addition varsa `inspectGate` veya `noActionCandidate` olsun.

Bu değişiklik global action dağılımını daha anlamlı hale getirir.

## Sınıflandırma Katmanında Önerilen Yeni Etiketler

Mevcut dört sınıf korunabilir ama debug snapshot için alt nedenler eklenmeli:

- `likelyGoodSuppression`
- `likelyUsefulV4Addition`
- `likelyRiskyDrop`
- `needsManualReview`

Ek debug reason önerileri:

- `genericTermSuppressed`
- `profileRelevantContentDropped`
- `sourceBackedContentAdded`
- `genericTheologicalTerm`
- `particleOrFormula`
- `properNameNeedsProfileCheck`
- `contentVerbNeedsProfileCheck`
- `lowValueTemporalExpression`

Bu kullanıcı-facing değildir; sadece audit/debug içindir.

## Sonraki Küçük Kod Adımı

En güvenli adım: classifier mantığını ayrı helper'a taşımak.

Önerilen dosya:

- `packages/core/src/analysis/verseAnalysisEvidenceConflictClassifier.ts`

Bu helper:

- `classifyEvidenceConflict(item, selectedProfile)` döndürür.
- `qualityClass`, `reasonCode`, `termFamily`, `isGeneric`, `isContent`, `isProfileRelevant` alanlarını üretir.
- Global audit ve small conflict audit aynı helper'ı kullanır.
- Runtime/UI/default source davranışına bağlanmaz.

İlk test:

- `audit-vnext-evidence-conflicts.ts`
- `audit-vnext-evidence-layer-global.ts --limit=1000`
- `npm run typecheck -w @quran-app/web`

Beklenen etki:

- `needsManualReview` ciddi düşer.
- `likelyUsefulV4Addition` artar.
- `likelyGoodSuppression` daha doğru artar.
- `likelyRiskyDrop` daha net ve sınırlı kalır.
- v4 default kararı için gerçek blocker listesi görünür hale gelir.

## Önemli Not

Bu rapor v4'ü default yapmayı önermiyor. Sadece conflict classifier'ın fazla kaba olduğunu ve global audit'in daha anlamlı hale gelmesi için önce audit/debug sınıflandırmasının güçlendirilmesi gerektiğini söylüyor.
