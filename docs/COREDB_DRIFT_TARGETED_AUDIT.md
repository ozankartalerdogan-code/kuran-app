# coreDb Drift Targeted Audit

Bu not, `json-vs-coredb-consistency-audit.sample.json` icinde anlamli ayrisma gosteren iki ayeti hedefli olarak inceler:

- `5:3`
- `12:100`

Amac, farkin nereden geldigini ayirmaktir:

- source mapping
- veri kapsami farki
- decision weighting

Bu paket inspect-only tutulmustur. Uygulama davranisi degistirilmemistir.

## 1. `5:3` Drift Nedeni

### Sonuc

- JSON: `hukum_istisna`
- coreDb: `genel_karma`

### Gozlenen farklar

JSON preview:

- axis: `haram kilinan yiyecekler, zorunluluk ve sinir asmama`
- key terms: `zorunluluk`, `domuz`, `kan`
- weak groups: `yiyecek adlari`, `zaruret/istisna ifadesi`
- translation differences: var

coreDb preview:

- axis: `iman, ibadet, infak ve ahlaki sorumluluklarin birlikte anlatimi`
- key terms: `ne / sey`, `ve olana`, `zorunluluk`, `domuz`, `Allah`
- weak groups: yalniz genel `bazi kelime-karsilik eslesmeleri`
- translation differences: bos

Context seviyesinde:

- word / root / lemma sayilari ayni
- weak correspondence listesi genel olarak ayni aileden geliyor
- asil fark, `rootMeanings` ve token havuzunun coreDb tarafinda daha genis olmasi

JSON `rootMeanings` daha dar kaliyor. coreDb tarafinda ise bu uzun ayette biriken cok sayida kok anlami preview kararina ek token tasiyor:

- `din, hesap günü, borç, yaşam biçimi`
- `barış, selam, teslimiyet, esenlik`
- `rahmet, merhamet, acımak, bağışlamak`
- `ilah olmak, kulluk`
- `tamamlamak`

### Muhtemel drift mekaniği

`verseAnalysisDecision.ts` icinde `collectDecisionSignals(...)` su alanlardan token topluyor:

- `keyTerms`
- `translationComparison.commonPhrases`
- `translationComparison.divergentPhrases`
- `themesConcepts`
- `primaryTranslation`
- `rootMeanings`
- `deterministicNotes`
- `wordByWord.meaning`
- `wordByWord.rootMeaning`

Bu nedenle coreDb tarafinda daha zengin `rootMeanings` havuzu, uzun `5:3` ayetinde yiyecek/zaruret ekseninin yanina baska alanlardan da token ekliyor. Sonuc olarak:

- `hukum_istisna` anchor'i tamamen kaybolmuyor
- ama `genel_karma`yi tetikleyebilecek genis/katmanli sinyal yogunlugu olusuyor

### Tani

`5:3` drift'i agirlikla:

- `source mapping + veri kapsami farki`
- ikinci olarak `decision weighting`

problemidir.

Bu ayette `coreDb` veri eksikliginden cok, fazla genis lexical sinyal tasiyor.

## 2. `12:100` Drift Nedeni

### Sonuc

- JSON: `kissa`
- coreDb: `emir_yasak`

### Gozlenen farklar

JSON preview:

- axis: `Yusuf kissasinda ruya, aile ve olay akisi`
- key terms: `gerceklesme`, `zindan`, `secde`, `lutuf`
- weak groups: `kisi, olay ve anlati ifadeleri`
- translation differences: `kisi, konusma ve olay sahnesi`

coreDb preview:

- axis: `emir, iyilik ve ahlaki sorumluluk`
- key terms: bos
- supporting terms: `gordu`, `ve dedi`, `cikarma`
- weak groups: `emir, yasak ve davranis uyarilari`
- translation differences: `yasak, sakindirma ve davranis uyarilari`

Context seviyesinde:

- word / root / lemma sayilari ayni
- weak listeleri genel aile olarak yakin
- ama coreDb tarafinda gorunur key term secimi kissa lehine yeterince toplanmiyor

JSON tarafinda one cikan sinyaller:

- `gerceklesme`
- `zindan`
- `secde`
- `lutuf`

coreDb tarafinda one cikan sinyaller:

- `uzerine, ustune`
- `onun icin`
- `secde etti`
- `ve dedi`
- `gordu`

### Muhtemel drift mekaniği

`hasStrongKissaAnchor(...)` su sekilde calisiyor:

- kisi adi varsa dogrudan
- veya `somut sahne + anlati konusmasi` varsa

Bu ayette coreDb tarafi `kissa` anchor'ini tamamen kaybetmiyor; ancak preview ve token setinde:

- `Yusuf`
- `gerceklesme`
- `ruya`
- `anne baba`

gibi daha kuvvetli kissa terimleri JSON kadar belirgin one cikmiyor.

Buna karsilik coreDb tarafinda su tarz tokenlar daha fazla agirlik tasiyor:

- `baba`
- `iyilik` benzeri moral/family sinyalleri
- `ve dedi`

`hasStrongEmirYasakAnchor(...)` icindeki `moralCount` / `familyCount` benzeri kurallar, bu ayette davranis/emir profiline gereksiz puan tasiyor olabilir. Ozellikle:

- `baba`
- `iyilik` benzeri moral/family sinyalleri

kissa sahnesinden gelen bir ayette `emir_yasak` lehine fazla calisiyor.

### Tani

`12:100` drift'i agirlikla:

- `decision weighting`
- ikinci olarak `source mapping`

problemidir.

Burada ana issue veri eksikligi degil; kissa sinyali ile aile/ahlak sinyalinin agirliklandirilma sekli.

## 3. Sorun Source Mapping mi, Veri Farki mi, Decision Weighting mi?

### `5:3`

Ana neden:

- `source mapping / veri kapsami farki`

Destekleyici neden:

- `decision weighting`

CoreDb tarafi daha cok `rootMeaning` ve destekleyici lexical token tasidigi icin uzun ayette fazla-genis bir semantik yuzey olusturuyor.

### `12:100`

Ana neden:

- `decision weighting`

Destekleyici neden:

- `source mapping`

CoreDb tarafinda kissa odakli gorunur terimler daha daginik, aile/ahlak tipi sinyaller ise emir_yasak kapisini gereksiz aciyor.

## 4. coreDb Default Icin Blocker Seviyesi

Blocker seviyesi: **orta**

Neden:

- 28 ayetin 26'sinda profil tutarli
- ama kalan 2 ayrisma profil ve axis seviyesinde anlamli
- bu tip drift'ler default source degisimi sonrasi kullaniciya yanlis kategori gosterebilir

Yani:

- audit ve paralel preview icin coreDb yeterince guclu
- default source karari icin henuz erken

## 5. En Kucuk Guvenli Duzeltme Onerisi

En kucuk guvenli adim:

1. `decision weighting` hedefli audit
   - ozellikle `rootMeanings` ve `wordByWord.rootMeaning` tokenlarinin profile etkisini ayri saymak

2. `emir_yasak` anchor'inda aile/ahlak sinyallerinin kissa ayetlerini fazla cekip cekmedigini izole etmek

3. `genel_karma` tetiginde uzun ayetlerde genis `rootMeaning` tokenlarinin ne kadar baskin rol oynadigini olcmek

Bu asamada onerilen sey hemen davranis degisikligi degil; once `5:3` ve `12:100` icin karar puanlarini gorunur kilan mini score-inspect aracidir.

## 6. Test Sonuclari

Gecti:

- `node --no-warnings --loader ./scripts/ts-extension-loader.mjs scripts/audit-json-vs-coredb-consistency.ts`
- `node --no-warnings --loader ./scripts/ts-extension-loader.mjs scripts/inspect-verse-analysis-context.ts`
- `npm run typecheck -w @quran-app/web`
