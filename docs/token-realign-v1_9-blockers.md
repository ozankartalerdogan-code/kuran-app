# token-realign-v1_9 — üç blocker'ın salt-okunur kapanışı

**Migration uygulanmadı.** `data/app.db` 77.429 satırla dokunulmadan duruyor,
Turso'ya hiç bağlanılmadı. Tüm SQL denemeleri `%TEMP%` altındaki atılabilir
kopyalarda yapıldı.

Yeni/güncellenen dosyalar:

| Dosya | Rol |
| --- | --- |
| `scripts/morphology/adjudicate-token-realign-v1_9-meanings.py` | 54 `meaning_tr` hücresinin verdict üreteci |
| `scripts/morphology/plan-token-realign-v1_9.py` | verdict'leri geri besleyen 2. geçiş |
| `apps/web/src/lib/tokenRealignV19NullSafety.test.ts` | 5 INSERT satırı için NULL güvenlik testi (10 test) |
| `data/candidates/morphology/token-realign-v1_9/meaning-adjudication.json` | 54/54 karar + kanıt |

---

## Blocker 1 — Fâtiha 1:1 ve resmî corpus invariantı

### Kural nerede

`scripts/morphology/camel-poc/build-token-map.py:305`

```python
opening_start = 0 if verse.ayah == 1 and verse.surah != 9 and 0 in windows else None
```

Kural şu: **her surenin 1. ayeti (9. sure hariç) besmele ile başlıyorsa ilk 4
token analiz dışı bırakılır.** Bu, 2..114. surelerde doğrudur — orada besmele
ayetin *önekidir*. Fâtiha'da ise besmele **ayetin kendisidir**, dolayısıyla kural
tüm ayeti yutar.

Kod bu durumu zaten tanıyor ama ayırt etmiyor: satır 312 sadece etiketi
değiştiriyor (`opening_fatiha` vs `opening_embedded`), davranışı değil.

### Ölçüm

| | |
| --- | ---: |
| `opening_basmala_excluded` span | 452 = 113 × 4 |
| bunlardan `opening_embedded` (2..114, 9 hariç) | 448 |
| bunlardan `opening_fatiha` | **4** |
| dışlamanın **tüm ayeti** yuttuğu ayet sayısı | **1** — yalnız `1:1` |

### Üretim ve kaynak veri ne diyor

| Kaynak | 1:1 | 2:1 |
| --- | --- | --- |
| `verses.arabic_text` | yalnız besmele | besmele + `الٓمٓ` |
| `quran_verse_metadata.basmala_kind` | **`ayah`** (`body_start_cp`=39=`end`) | `prefix` (`body_start_cp`=40) |
| `data/generated/quran/basmala-ranges.json` | `kind: "ayah"` | `kind: "prefix"` |
| production `words` | **4 satır, hepsi tam analizli** | 1 satır (`الٓمٓ`) |

Yani runtime, metadata ve production DB'nin üçü de 1:1'i sayılan bir ayet olarak
görüyor; sapan tek bileşen token map. 1:1'in dört satırı da küratörlü
(`بِسۡمِ` root سمو / `meaning_override`, diğerleri `canonical_word_analysis`),
`meaning_tr` ve `gloss_en` dolu. Üretim doğru tarafta.

### Bağımsız ikinci kanıt

`scripts/morphology/export-qac-tanzil-teacher.py:466` bu sapmayı zaten yazılı
olarak telafi ediyor:

> "77429 QAC words carry a lemma, **-4 excluded 1:1 basmala words, +4 rows added
> by the split contract**"

O "+4" tam olarak `QAC_1_TO_TANZIL_2` sınıfı: QAC'ın tek kelime saydığı,
Tanzil'in iki token olarak kestiği 4 yer — `2:181`, `8:6`, `13:37` (üçü de
`بَعْدَ`+`مَا`) ve `37:130` (`إِلْ`+`يَاسِينَ`). Yani teacher'ın 77.429'u da
`77.429 (QAC) − 4 (1:1) + 4 (split)` şeklinde tesadüfen aynı sayıya oturuyor.

Bu, dry-run'ın §2.2'de veriden bağımsız olarak bulduğu "birleşmiş analiz
hücresi" teşhisini **birebir doğruluyor**: planlayıcı bu dosyayı hiç okumadan
aynı 3 ayeti ve aynı kırılma noktalarını buldu.

### Resmî invariant

```
corpus_analysis_tokens
    = token map "arabic_word" span sayısı          77.429
    + Fâtiha 1:1'in besmele-ayet kelimeleri        +    4
    = 77.433
```

**Doğru toplam 77.433'tür.** 77.429 değil.

Validator bu invariantı sabit sayı olarak değil, **türetilmiş** olarak tutmalı;
o zaman token map'i yeniden üretmeden de geçerli olur.

### Tesadüfi denge — kesin doğrulama

Token map ile production arasında sayı farkı olan **tam 7 ayet** var:

| ayet | production | token map | delta | sebep |
| --- | ---: | ---: | ---: | --- |
| `1:1` | 4 | 0 | **+4** | besmele-ayet yanlışlıkla dışlanmış |
| `2:72` | 11 | 10 | +1 | yüzey fazladan bölünmüş |
| `15:7` | 7 | 8 | −1 | son analiz kesilmiş |
| `27:20` | 11 | 12 | −1 | son analiz kesilmiş |
| `36:22` | 7 | 8 | −1 | son analiz kesilmiş |
| `37:164` | 5 | 6 | −1 | son analiz kesilmiş |
| `41:47` | 27 | 28 | −1 | son analiz kesilmiş |

Pozitif toplam **+5**, negatif toplam **−5**, net **0** → 77.429 = 77.429.
Ayet grubu düzeyinde: dokuz hedef ayet net **−4**, `1:1` net **+4**. Doğrulandı;
mevcut eşitlik anlamlı değil, iki bağımsız hatanın birbirini örtmesi.

Migration sonrası: dokuz ayet düzelir (+4), `1:1` olduğu gibi kalır → **77.433**.
Bu, yukarıdaki resmî invariantla **birebir eşleşir**.

### Gereken map/validator düzeltmesi (uygulanmadı)

| Dosya:satır | Şu an | Olması gereken |
| --- | --- | --- |
| `camel-poc/build-token-map.py:305` | `verse.surah != 9` | `verse.surah not in (1, 9)` |
| `camel-poc/build-token-map.py:25` | `EXPECTED_BASMALA_WORDS = 452` | `448` |
| `camel-poc/build-token-map.py:26` | `EXPECTED_ANALYSIS_WORDS = 77_429` | `77_433` |
| `camel-poc/build-token-map.py:370` | `"excluded_openings": 113` | `112` |
| `camel-poc/build-token-map.py:312` | `opening_fatiha` dalı | erişilemez olur, kaldırılmalı |
| `camel-poc/validate-token-map.py:23,24` | `452`, `77_429` | `448`, `77_433` |
| `camel-poc/validate-token-map.py:169` | `Expected 113 opening basmalas` | `112` |
| `camel-poc/test-token-map.py:100,101` | `452`, `77_429` | `448`, `77_433` |
| `build-hc1-token-map-v1_8.py:42` | `77_429` | `77_433` |
| `build-orthographic-token-map-v1.py:44` | `77_429` | `77_433` |
| `export-qac-tanzil-teacher.py:438,441,442,449` | `77429`, 6236 sapması | `77433`, sapma notu düşer |

**Bu düzeltme bu migration'a bağlanmamalıdır.** `frozen-hc1-production-v1_8-manifest.json`
token map'in sha256'sını (`6d9e2975…`) ve `hc1_dump.analysis_words = 77429`
değerini pinliyor; map'i yeniden üretmek v1.7/v1.8 freeze zincirini kırar ve
selector'ün yeniden çalıştırılıp yeniden dondurulmasını gerektirir.

Migration'ın buna ihtiyacı yok: token map dokuz hedef ayetin hepsinde **doğru**.
Yanlış olan yalnızca kapı olarak kullanılan sabitti. Kapı artık türetilmiş
invarianta (77.433) bakıyor.

### Kapsam dışı bulgu — 37:130

`37:130` dokuz ayetin dışında ama **aynı kusur sınıfında**: `إِلْ`+`يَاسِينَ` tek
analiz hücresinde birleşmiş, kuyrukta NULL analizli satır duruyor
(`id=58040`, `wi=4`, `يَاسِينَ`, root/lemma/pos/morphology hepsi NULL).

Satır **sayısı** doğru (4 = 4), bu yüzden token invariantını bozmuyor ve bu
migration'ı bloke etmiyor. Ama anchoring marjı 0 (`breakpoint=3` ile identity
eşit skorlu), yani kendi başına ayrı bir adjudication gerektirir. Ayrı iş
kalemi olarak kaydedilmeli.

---

## Blocker 2 — 54 `meaning_tr` hücresi: 54/54 karar

Üretici: `scripts/morphology/adjudicate-token-realign-v1_9-meanings.py`
Tablo: `data/candidates/morphology/token-realign-v1_9/meaning-adjudication.json`
(her kayıtta mevcut yüzey, mevcut anlam, hedef token, teacher lemma/root,
`gloss_en`, kök anlamı, corpus tanıklıkları, verdict ve kanıt cümlesi).

### Yol boyunca bulunan iki sistematik corpus kusuru

Corpus frekansını tek kanıt saymak **güvenli değil**:

- Şart edatı `إِن`, sağlıklı corpus'un **253 satırının 252'sinde**
  "şüphesiz, gerçekten" ile glosslanmış — yani `إِنَّ` okuması. Satırların kendi
  `morphology` değeri `1:P:COND|LEM:إِن` diyor. Doğru gloss ("eğer") yalnız 1 kez.
- Olumsuzlayan `وَمَا`, **507 satırın 507'sinde** "ve olana" ile glosslanmış.

Her ikisi de yüzey ve lemma anahtarlarını rahatça geçiyor ve her ikisi de yanlış.
Bu yüzden `REPLACE` için **farklı soy hattından** üçüncü bir doğrulayıcı şart
koşuldu: `gloss_en`. İngilizce gloss ayrı bir hatta yazıldığı için aynı hatayı
tekrarlamıyor.

### Karar kuralları

**MOVE_EXISTING_MEANING** — ayet içinde zaten var olan bir anlamın bu tokene ait
olduğu kanıtlı:
(i) bir satır hem hedef yüzeyi hem de teacher lemmasıyla eşleşen analizi taşıyor
(yüzey ve analiz aynı tokeni gösteriyor); ya da
(ii) hedef hücredeki mevcut değer, tokenin kendi `gloss_en`'i ile corpus'ta
eşleştirilmiş — yerinde doğrulanmış, sıfır pozisyon hareket ediyor.

**REPLACE_WITH_VERIFIED_MEANING** — dördü birden:
(a) tam yüzey ≥5 kez tanıklı; (b) teacher lemması aynı anlamla ≥3 kez tanıklı;
(c) `gloss_en` de aynı anlamı gösteriyor; (d) **mevcut değerin yanlış olduğuna
dair pozitif kanıt** var — ya bu slotun yüzeyi değişiyor, ya da mevcut değer
satırın hatalı analiz lemmasıyla birlikte gelmiş ve hedef lemma için hiç tanıklı
değil.

**SET_NULL_FAIL_CLOSED** — diğer her şey.

### Dağılım

| Verdict | Adet |
| --- | ---: |
| `MOVE_EXISTING_MEANING` | **15** |
| `REPLACE_WITH_VERIFIED_MEANING` | **4** |
| `SET_NULL_FAIL_CLOSED` | **35** |
| **Toplam** | **54** |

- Saklanan değeri **değiştiren** hücre: 35
- **Dokunulmadan** kalan hücre: 19 (15 MOVE + 4 zaten NULL)

### Dört `REPLACE` kararının tamamı

| Ayet:idx | Yüzey | Mevcut | Önerilen | `gloss_en` | Yanlışlık kanıtı |
| --- | --- | --- | --- | --- | --- |
| 2:72:9 | `كُنتُمۡ` | `ne / şey` | `idiniz` | `you were` | yüzey değişiyor (mevcut değer `مَّا`'ya ait) |
| 2:181:9 | `ٱلَّذِينَ` | `değiştirmek` | `kimseler` | `those who` | yanlış lemma `بَدَّلَ` ile gelmiş |
| 2:181:12 | `ٱللَّهَ` | `işitir` | `Allah` | `Allah` | yanlış lemma `سَمِيع` ile gelmiş |
| 27:20:9 | `أَمۡ` | `idi` | `yoksa, veya` | `or` | yüzey değişiyor (mevcut değer `كَانَ`'ya ait) |

Kural bilerek muhafazakâr: `13:37:10 جَآءَكَ` için corpus üç anahtarda da "gelir"
diyor, ama mevcut `sana geldi` daha isabetli ve yanlış olduğuna dair kanıt yok →
yerinde bırakıldı. `41:47:26 مِنَّا` için corpus "benden" diyor (1P'de yanlış) →
`SET_NULL_FAIL_CLOSED`.

### İki geçişli sabit nokta

Verdict'ler plana geri besleniyor (`plan-token-realign-v1_9.py` varsa
`meaning-adjudication.json`'ı okuyor). Planlayıcı → adjudicator → planlayıcı
döngüsü **sabit noktaya oturuyor**: 3. çalıştırmada dosya sha256'sı 2. ile
birebir aynı (`132aecfb08f86b5d`).

---

## Blocker 3 — Beş INSERT satırı

Hiçbirinin **before**'u yok (satır mevcut değil). **After**:

| # | Ayet:idx | `arabic` | `root` | `lemma` | `pos` | `morphology` | `meaning_tr` | `gloss_en` | `confidence` | `source` | `role` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 15:7:8 | `ٱلصَّـٰدِقِينَ` | `صدق` | `صادِق` | NULL | NULL | NULL | NULL | `low` | `qac_tanzil_teacher` | NULL |
| 2 | 27:20:12 | `ٱلۡغَآئِبِينَ` | `غيب` | `غائِب` | NULL | NULL | NULL | NULL | `low` | `qac_tanzil_teacher` | NULL |
| 3 | 36:22:8 | `تُرۡجَعُونَ` | `رجع` | `رَجَعَ` | NULL | NULL | NULL | NULL | `low` | `qac_tanzil_teacher` | NULL |
| 4 | 37:164:6 | `مَّعۡلُومٞ` | `علم` | `مَعْلُوم` | NULL | NULL | **`bilinen`** | NULL | `low` | `qac_tanzil_teacher` | NULL |
| 5 | 41:47:28 | `شَهِيدٖ` | `شهد` | `شَهِيد` | NULL | NULL | NULL | NULL | `low` | `qac_tanzil_teacher` | NULL |

**Kanıtlı alanlar:** `arabic` (canonical sınırdan yeniden kesim, ayet birleşimi
değişmiyor), `root` + `lemma` (QAC/Tanzil teacher), `confidence`+`source`
(taşıyıcı etiket), ve 37:164'te `meaning_tr` (tam yüzey için corpus tanıklı).

**NULL bırakılanlar ve neden:** `pos`, `morphology`, `gloss_en` — teacher
production'ın legacy segment lehçesini (`1:N:ROOT:…|LEM:…|MS|INDEF|NOM`)
üretmiyor; `role` — corpus `(pos, morphology)` çifti için tanıklık edemiyor
(`pos` NULL olduğundan anahtar yok); 4 satırda `meaning_tr` —
`SET_NULL_FAIL_CLOSED`.

### NULL güvenlik testi

`apps/web/src/lib/tokenRealignV19NullSafety.test.ts` — 10/10 geçiyor.
`npm test` bütünü: **45/45 geçiyor**.

| Test | Sonuç |
| --- | --- |
| 5 satır ayetin sonunda, tam bir kez | ✅ |
| `arabic`/`root`/`lemma` dolu, yüzey hiç boş değil | ✅ |
| `pos`/`morphology`/`gloss_en`/`role` **SQL NULL** (string `"null"` değil) | ✅ |
| Dokuz ayetin hiçbir hücresinde `null`/`undefined`/`NaN`/`[object Object]` yok | ✅ |
| **Web** `MorphBadge`: NULL `pos` → `—`; `translatePosTr(null\|undefined\|"")` → `—` | ✅ |
| **Mobil**: `w.pos` falsy → "Tür" satırı hiç render edilmiyor; `formatMorphologyTr(null)` → `""` → "Morfoloji" satırı render edilmiyor | ✅ |
| `meaning_tr` NULL → `meaning: null`, uydurma anlam nesnesi yok | ✅ |
| Eklenen satır bir önceki kelimenin analizini **kopyalamıyor** | ✅ |
| Dokuz ayette `word_index` dense 1..N → API sırası sabit | ✅ |
| Web'in `GROUP BY word_index` sorgusu token başına tek satır, yüzey hiç boş değil | ✅ |

Kod düzeyinde kaynak: `packages/core/src/adapters/canonicalWordAnalysisAdapter.ts:122`
(`posToRole` NULL `pos`'ta `null` döner), `morphologyLabels.ts:177` (boş → `—`),
`page.tsx:427` (`if (!morphology) return <span>—</span>`),
`[ayahNumber].tsx:937,953` (koşullu render).

**Kullanıcıya `null`, bozuk badge veya komşudan ödünç analiz gösterilmiyor.**

---

## Güncellenmiş kesin sayılar

| Ölçüm | Değer |
| --- | ---: |
| Etkilenen ayet / RESOLVED / UNRESOLVED | 9 / **9** / **0** |
| Etkilenen mevcut satır → hedef satır | **114 → 118** |
| Eklenecek satır | **5** |
| Silinecek satır | **1** (`id=1149`) |
| Değişecek hücre | **280** |
| En az bir hücresi değişen satır | **71** |
| Corpus satır (önce → sonra) | 77.429 → **77.433** |
| **Resmî corpus invariantı** | **77.433** ✅ eşleşiyor |
| Hedef dışı ayet no-op kapısı | 6.226 / 6.226 ✅ |
| Hedef dışı dokunulan hücre | **0** (sha256 parmak izi birebir) |
| `meaning_tr` kararı | 15 MOVE / 4 REPLACE / 35 NULL = **54/54** |
| Birleşmiş hücre bölme hatası | **0** |
| Açıkça gösterilen artık/mükerrer analiz | **3** |

Hücre dağılımı: `meaning_tr` 45, `arabic` 37, `morphology` 34, `gloss_en` 32,
`lemma` 30, `pos` 29, `role` 27, `source` 17, `confidence` 16, `root` 13.

Sandbox doğrulaması (`dry-run-verification.json`): `foreign_key_check` boş,
`integrity_check` = `ok`, `word_index` boşluk/duplicate 0, canonical
tokenizasyon farkı 0, `root`/`lemma`'da ASCII 0, `reverse.sql` sonrası `words`
tablosu byte-birebir geri dönüyor.

---

## Karar: **READY**

Üç blocker da kapandı:

1. Resmî invariant **77.433** olarak kanıtlandı; migration sonrası değer buna
   birebir oturuyor. 77.429'luk mevcut eşitliğin tesadüf olduğu (+5/−5)
   sayısal olarak gösterildi. Token map/validator düzeltmesi belgelendi ve
   freeze zincirini kırdığı için **ayrı iş kalemine** ayrıldı — bu migration
   ona bağımlı değil.
2. 54/54 `meaning_tr` kararı verildi, iki geçişli sabit noktaya oturdu, SQL
   kararlı değerleri taşıyor. Hiçbir corpus anlamı körlemesine taşınmadı;
   kanıtlanmayan 35 hücre NULL.
3. Beş INSERT satırının alan durumu tam listelendi; NULL `pos`/`morphology`/
   `gloss_en` web, mobil ve API'de güvenli — 10 hedefli test + 45/45 tam suite.

### Uygulamadan önce yapılacaklar

1. `PREIMAGE_BACKUP_PLAN.md` §1–2: local `.backup` + Turso pre-image, ve ikisinin
   `id` bazında karşılaştırılması (ayrışma varsa **başlatma**).
2. Uygulama sonrası kapı: `SELECT COUNT(*) FROM words` = **77.433**.

### Bu migration'ın kapsamı dışında kalan, kaydedilmesi gereken işler

- Token map `opening_fatiha` düzeltmesi + v1.7/v1.8 yeniden dondurma.
- `37:130` — dokuz ayetle aynı kusur sınıfı, ayrı adjudication gerekiyor.
- Corpus geneli iki gloss kusuru: şart `إِن` (252/253 satır `إِنَّ` okumasıyla),
  olumsuzlayan `وَمَا` (507/507 satır "ve olana").
