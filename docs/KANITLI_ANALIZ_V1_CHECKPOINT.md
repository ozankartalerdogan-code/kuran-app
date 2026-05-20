# Kanıtlı Analiz V1 Checkpoint

## 1. Genel Durum

Kanıtlı Analiz V1, ayet detay ekranında kullanıcıya gösterilen kontrollü ve veri-temelli bir ön analiz katmanıdır. Amaç, ayet hakkında serbest üretken yorum vermek değil; mevcut meal, kelime, morfoloji, karşılaştırma ve bağlam sinyallerinden türetilen deterministik bir preview sunmaktır.

Bu yapı, eski `AnalysisEngineV1` katmanından farklıdır. `AnalysisEngineV1` daha çok tema ve katılımcı sinyalleri üreten yardımcı/legacy bir katman olarak tutulur; ana analiz yüzeyi değildir.

Bu yapı, AI semantic summary hattından da farklıdır. Semantic summary daha üst düzey, provider destekli açıklama akışıdır; Kanıtlı Analiz V1 ise provider gerektirmeden çalışan, kanıtı görünür kılan deterministic preview katmanıdır.

## 2. Mimari Akış

Akış şu sırayla çalışır:

1. Ayet verisi okunur.
2. `VerseAnalysisContext` oluşturulur.
3. Context üstünden deterministic sinyaller türetilir.
4. Decision hierarchy ile uygun profil seçilir.
5. `verseAnalysisPreview` kullanıcı-facing preview alanlarını üretir.
6. Ayet detay sayfasındaki `Kanıtlı Analiz` kartı bu preview verisini gösterir.

Bu akışın amacı ham veriyi doğrudan UI'a basmak değil, aynı context formatı üzerinden kaynak bağımsız şekilde anlam ekseni, anahtar terimler, meal farkları ve dikkat isteyen karşılık alanları üretmektir.

## 3. Ana Dosyalar

### `packages/core/src/analysis/verseAnalysisContext.ts`

Ana context builder dosyasıdır. Ayet, meal, kelime, kök, lemma, morfoloji, karşılaştırma, fidelity ve bağlam verilerini tek bir `VerseAnalysisContext` yapısında toplar. Varsayılan kaynak `json`, opsiyonel kaynak `coreDb` olabilir.

### `packages/core/src/analysis/verseAnalysisDecision.ts`

Decision hierarchy katmanıdır. Toplanan sinyalleri okuyup ayetin hangi profile daha çok uyduğunu belirler ve buna göre ana anlam ekseni, meal farkı kategorileri ve weak correspondence grupları için karar mantığını taşır.

### `packages/core/src/analysis/verseAnalysisPreview.ts`

`VerseAnalysisContext` verisini kullanıcıya gösterilebilir preview alanlarına dönüştürür. `mainMeaningAxisPreview`, `keyTermsPreview`, `translationDifferencesPreview`, `weakCorrespondencesPreview`, `sourceStatus` ve supporting term ayrımı burada şekillenir.

### `packages/core/src/analysis/verseAnalysisQualitySet.ts`

Sabit kalite setini tanımlar. 28 temsilî ayet için kategori, beklenen profil, axis hint ve kısa açıklama taşır. Sistem kalitesini dar bir ayet setine bağlı kalmadan izlemeye yarar.

### `packages/core/src/analysis/coreDbVerseSource.ts`

`data/kuran_core.db` içinden ayet bazlı veri okuyan opsiyonel source katmanıdır. Bu dosya, DB'yi ana kaynak yapmadan önce merkezi veri omurgasının okunabilirliğini ve tutarlılığını test etmek için eklendi.

### `scripts/inspect-verse-analysis-context.ts`

Inspect ve kalite kontrol scriptidir. Belirli örnek ayetler için context ve preview üretir, JSON ve coreDb kaynaklarını karşılaştırır, kalite seti snapshot'larını günceller ve kalite metriklerini görünür kılar.

### `apps/web/src/app/surah/[surahId]/ayah/[ayahNumber]/page.tsx`

Ayet detay sayfasıdır. `Kanıtlı Analiz` kartı burada `Analiz` sekmesine bağlanmıştır. Aynı dosya içinde yardımcı `Tema ve Katılımcı Sinyalleri` bloğu da daha geri planda sunulur.

## 4. Veri Kaynakları

Varsayılan kaynak JSON/cache hattıdır. `VerseAnalysisContext` şu anda default olarak mevcut normalized JSON ve adapter verilerinden beslenir.

Opsiyonel olarak `coreDb` source da desteklenir. `data/kuran_core.db` proje içinde mevcuttur; ayet, meal, kelime, kök anlamı, meal karşılaştırması, fidelity sinyalleri ve bağlam notlarını merkezi ve ayrık tablolarda toplar.

`coreDb`, prototipte hedeflenen merkezi `kuran.db` mantığından ilham alan daha düzenli bir veri omurgasıdır. Ancak şu checkpoint noktasında default kaynak yapılmamıştır. Bunun kararı sonraki faza bırakılmıştır; çünkü kalan kalite konusu veri kaynağından çok decision/display katmanındadır.

## 5. Decision Profiles

### `tevhid_birlik`

Allah’ın birliği, benzersizliği, eş tutulmaması ve teklik eksenini yakalar. Sadece “Allah” kelimesine bakmaz; birlik/benzersizlik anchor’ları arar.

### `dua_kulluk`

Kulluk, ibadet, dua, yardım isteme ve ilahi yakınlık/cevap vurgusunu yakalar. Özellikle yöneliş fiilleri ve kulluk alanı bu profile ağırlık verir.

### `yol_hidayet`

Yol, hidayet, nimet, gazap ve sapma eksenini yakalar. Doğru yol talebi ve yoldan sapma uyarısı bu profile girer.

### `uyari_inkar`

İnkâr, uyarı, kalp, işitme, görme, perde, mühür ve azap sonucu etrafında dönen ayetleri yakalar. Sonuç/uyarı ekseni baskındır.

### `hukum_istisna`

Haram kılınan alanlar, yiyecek yasakları, zaruret/çaresizlik ve sınır aşmama sinyallerini yakalar. Özellikle food + necessity kombinasyonu aranır.

### `ahiret`

Ahiret hesabı, amel, mizan/tartı, iyilik-kötülük karşılığı ve akıbet eksenini yakalar. Sonuç ve karşılık dili bu profile yön verir.

### `rahmet_magfiret`

Rahmet, bağışlanma, tövbe, günah, umut ve affedilme alanını yakalar. Sadece kapanıştaki “bağışlayandır” diliyle değil, daha güçlü rahmet/mağfiret kümesiyle seçilir.

### `kissa`

Kıssa içindeki kişi, olay, sahne, konuşma ve anlatı akışını yakalar. Kişi adı tek başına yeterli değildir; olay/sahne sinyali de aranır.

### `emir_yasak`

Yasak, sakındırma, ahlaki/toplumsal davranış uyarısı, haksız kazanç, zan, gıybet, kusur arama, mallar ve benzeri normatif davranış alanlarını yakalar.

### `genel_karma`

Tek profile zorlanmaması gereken geniş ayetler için kullanılır. İman, ibadet, infak, ahit, sabır ve ahlaki sorumluluk gibi çok katmanlı alanlar birlikte geçtiğinde dengeli fallback olur.

## 6. UI Durumu

`Kanıtlı Analiz` kartı ayet detay sayfasındaki `Analiz` sekmesine eklenmiştir.

Kartta şu alanlar gösterilir:

- `mainMeaningAxisPreview`
- `keyTermsPreview`
- `translationDifferencesPreview`
- `weakCorrespondencesPreview`
- `sourceStatus`

`supportingKeyTermsPreview` normal kullanıcıya gösterilmez.

Eski `AnalysisEngineV1` katmanı artık ana analiz yüzeyi değildir. Sayfada `Tema ve Katılımcı Sinyalleri` adlı yardımcı blok olarak daha geri planda tutulur.

Debug, legacy ve ham JSON alanları normal kullanıcı görünümüne sızdırılmaz. Bu alanlar yalnız açık debug/experimental modda görünür.

## 7. Kalite Seti Durumu

Kanıtlı Analiz V1 için 28 ayetlik sabit bir quality set kurulmuştur.

Kategoriler:

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

Son metrikler:

- `expectedProfileMatchedCount: 28/28`
- `warnCount: 0`
- `axisHintFalse: 0`
- `emptyKeyTerms: 2`
- `emptyTranslationDiffs: 1`

İlk 5 kontrol ayeti sonucu:

- `1:5 -> dua_kulluk`
- `1:7 -> yol_hidayet`
- `2:7 -> uyari_inkar`
- `2:173 -> hukum_istisna`
- `112:1 -> tevhid_birlik`

## 8. Önemli Düzeltmeler

- `2:7` ve `2:173` yanlış tevhid ekseninden çıkarıldı.
- `112:4` `tevhid_birlik` oldu.
- `5:90` `emir_yasak` oldu.
- `39:53` `rahmet_magfiret` oldu.
- `49:12` `emir_yasak` oldu.
- `2:177` `genel_karma` oldu.
- `keyTerms` tarafında tekrar ve kaba terim temizliği yapıldı.
- `sourceStatus` daha kompakt hale getirildi.
- `Tema ve Katılımcı Sinyalleri` helper bloğu daha seçici hale getirildi.

## 9. Bilinen Kalan Riskler

- Quality set şu anda 28 ayetle sınırlı; daha geniş bir set ileride gerekebilir.
- `coreDb` henüz default kaynak değildir.
- AI üst açıklama katmanı bu sistemin üstüne henüz oturtulmamıştır.
- Bazı ayetlerde `keyTerms` veya `translationDifferences` dili ileride daha da doğal hale getirilebilir.
- Bu sistem tefsir yerine geçmez; kontrollü ön analiz/previews sağlar.

## 10. Test Komutları

Çalıştırılan komutlar:

```bash
node --no-warnings --loader ./scripts/ts-extension-loader.mjs scripts/inspect-verse-analysis-context.ts
npm run typecheck -w @quran-app/web
```

Sonuç:

- Inspect script geçti.
- Typecheck geçti.
- Inspect sonunda kalite metrikleri `28/28` profile match ve `0 warn` olarak korundu.

## 11. Sonraki Faz Önerileri

### Faz 2A: JSON vs coreDb consistency audit

JSON ve coreDb kaynaklarının daha geniş ayet setinde tutarlılık denetimi yapılabilir.

### Faz 2B: coreDb default karar analizi

`coreDb` omurgasının default kaynak olup olmayacağı performans, bakım ve veri kapsamı açısından değerlendirilebilir.

### Faz 2C: AI üst açıklama katmanı tasarımı

Deterministic context ve preview üstüne, sınırları iyi çizilmiş bir AI üst açıklama katmanı tasarlanabilir.

### Faz 2D: quality set’i 50-100 ayete genişletme

Mevcut 28 ayetlik set, daha geniş kategori ve edge-case kapsaması için büyütülebilir.

### Faz 2E: production build / deployment hazırlığı

Production-like build, deploy davranışı, debug görünürlüğü ve gerçek kullanıcı akışları ayrı bir fazda doğrulanabilir.
