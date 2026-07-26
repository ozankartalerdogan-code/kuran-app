# token-realign-v1_9 — dokuz ayet için yapısal dry-run

**Durum: yalnız tasarım ve dry-run. `data/app.db` ve Turso'ya hiçbir yazma yapılmadı.**
Production sqlite dosyası boyunca `mode=ro` ile açıldı; Turso'ya hiç bağlanılmadı.
Forward/reverse SQL yalnız taslak olarak üretildi ve **atılabilir bir kopya**
üzerinde denendi (`%TEMP%` altında, çalışma sonunda silindi).

Üretici: `scripts/morphology/plan-token-realign-v1_9.py`
Doğrulayıcı: `scripts/morphology/verify-token-realign-v1_9-sandbox.py`
Çıktılar: `data/candidates/morphology/token-realign-v1_9/`

---

## 1. Şema ve bağımlılık denetimi

### `words.id` kim tarafından kullanılıyor?

| Kullanım | Bulgu |
| --- | --- |
| Foreign key | **Yok.** `PRAGMA foreign_key_list` tüm tablolarda tarandı; `words.id`'ye referans veren tek bir FK yok. Yalnız `elifba_*` tablolarında birbirine FK var. |
| Başka tabloda `word_id` sütunu | **Yok.** `word` içeren tek sütun `words.word_index` ve `fidelity_signals.word_index`; ikincisi `(verse_key, word_index)` ile bağlanır, `id` ile değil. |
| Web/mobil API | `words.id` **hiçbir response'ta yok**. `getAyahDetailFromDb.ts`, `canonicalWordAnalysisAdapter.ts`, `verseAnalysisContext.ts` `ORDER BY word_index`; `coreDbVerseSource.ts` `ORDER BY word_index, segment_index, id` — `id` yalnız stabil tie-breaker. |
| Mobil kelime hedefleme | `ayahWordTarget.ts` derin linki `wordIndex` üzerinden çözer, `id` görmez. |
| **Turso senkronu** | **Kritik.** `scripts/backup-db.mjs`, `scripts/morphology/sync-additive-v1_8-to-turso.mjs`, `apply-aad-homograph-fix-v1_8.mjs`, `apply-*-v1_8.mjs` hepsi local ↔ Turso satırlarını **`WHERE id = ?`** ile eşler. |

### Sonuç

`words.id` uygulama için opak, ama **local sqlite ile Turso arasındaki tek ortak
anahtar**. Bu yüzden:

- **ID yeniden numaralandırma yapılmıyor.** Mevcut 77.429 satırın hiçbirinin
  `id`'si değişmiyor.
- Silinen tek satır (`id=1149`) yerine kaydırma yapılmıyor; boşluk bırakılıyor.
- 5 yeni satır **explicit id** ile (`77430..77434`) ekleniyor; böylece local ve
  Turso id uzayı ve `sqlite_sequence` sayacı ayrışmıyor.
- Ayet-bazlı stabil kimlik zaten mevcut: `(verse_key, word_index)`. Migration bu
  çifti dense ve 1'den başlayan hale getiriyor, `id`'yi ise hiç kıpırdatmıyor.

### `word_index` semantiği

`(verse_key, word_index)` uygulamanın gerçek kelime kimliğidir. Migration sonrası
6.236 ayetin tamamında `word_index` 1..N dense, boşluk/duplicate yok
(doğrulandı). API sıralaması `word_index` olduğundan **response sırası değişmiyor**.

---

## 2. Kök neden — iki bağımsız eksen

Ayrıntılı inceleme, tek bir "61 token kayması" değil, **iki ayrı bozulma** olduğunu
gösteriyor.

### 2.1 `words.arabic` Tanzil metni değil

Bu, migration tasarımını belirleyen en önemli bulgu.

`verses.arabic_text` ile frozen token map'in `canonical_text` alanı **codepoint
düzeyinde birebir** (Tanzil Uthmani). Ama `words.arabic` **başka bir Uthmani
dizgisi** kullanıyor:

| Fark | Tanzil (canonical) | production `words.arabic` | Adet |
| --- | --- | --- | ---: |
| sükun | U+0652 | U+06E1 | 37.144 |
| hançer elif öncesi tatweel | U+0640 + U+0670 | tatweel yok | 5.175 |
| tenvin şekilleri | U+064B/064C/064D | U+065E/0657/… | ~6.900 |
| elif maksura | U+0649 | U+064A | 3.691 |
| hemze taşıyıcı | `ئ`, `ؤ` | `ي`+U+0655, `و`+U+0655 | 15 ayet |

**Hizası tamamen doğru olan ayetlerde bile 44.891 token bu şekilde farklı.**

Dolayısıyla *"Arabic yüzey yalnız canonical Tanzil'den gelmeli"* kuralı, kelimesi
kelimesine uygulanırsa 44.891 tokenın codepoint'i değişir ve *"hedef dokuz ayet
dışındaki 77 bin+ tokenın hiçbir hücresi değişmemeli"* kuralıyla doğrudan çelişir.

**Uygulanan yorum:** canonical Tanzil **token sınırlarının** tek kaynağıdır,
codepointlerin değil. Her onarılmış yüzey, production'ın hâlihazırda tuttuğu
baytların yeniden kesilmesidir. Ayetin birleştirilmiş metni hiç değişmez —
dokuz ayetin hepsinde `''.join(after) == ''.join(before)` doğrulandı.

Bu yorumun kanıtı: aynı yeniden-kesme algoritması **hedef dışı 6.226 ayette
uygulandığında 0 değişiklik** üretiyor. Yani algoritma production'ın kendi
sınır konvansiyonunu (duraklama işareti önceki kelimeye, `۞` sonraki kelimeye
yapışır) birebir yeniden üretiyor.

### 2.2 Analiz ekseni ayrı bozulmuş

`root/lemma/pos/morphology` yükü ile yüzey birbirinden bağımsız kaymış:

- **A grubu — yüzey bozuk, analiz sırası sağlam** (6 ayet: 2:72, 15:7, 27:20,
  36:22, 37:164, 41:47). Bir canonical token yanlış bölünmüş ya da iki token
  birleştirilmiş; analiz listesi canonical sırayı korumuş ama sona ya NULL
  eklenmiş (2:72) ya da son analiz kesilip atılmış (diğer 5).
- **B grubu — yüzey sağlam, analiz hücresi birleşmiş** (3 ayet: 2:181, 8:6,
  13:37). Üçünde de aynı desen: `بَعْدَ` + `مَا` tek bir legacy analiz hücresine
  birleştirilmiş (`1:N:T|ROOT:بعد|LEM:بَعْد | 2:…|LEM:ما`), bu noktadan sonra tüm
  analizler +1 kaymış ve ayetin son satırında **mükerrer artık analiz** kalmış.

Her iki eksenin kararı da QAC/Tanzil teacher'ına (`qac-tanzil-teacher.jsonl`,
canonical indeksli, 77.429 kayıt) karşı puanlanarak doğrulandı; rakip hipotezler
(±1 kayma, her olası kırılma noktası) ayrı ayrı skorlandı.

---

## 3. Kesin sayılar

"Yaklaşık 61" yerine ölçülen değerler:

| Ölçüm | Değer |
| --- | ---: |
| Etkilenen ayet | **9** |
| `RESOLVED` ayet | **9** |
| `UNRESOLVED` ayet | **0** |
| Etkilenen mevcut satır | **114** |
| Hedef satır | **118** |
| Eklenecek satır | **5** |
| Silinecek satır | **1** |
| Değişecek hücre | **268** |
| En az bir hücresi değişen satır | **71** |
| Corpus satır (önce → sonra) | **77.429 → 77.433** |
| Frozen token map analiz kelimesi | **77.429** |
| Hedef dışı ayet (no-op kapısı) | **6.226 / 6.226 geçti** |
| Hedef dışı dokunulan hücre | **0** |
| meaning_tr insan onayı bekleyen hücre | **54** |
| Açıkça gösterilen artık/mükerrer analiz | **3** |

Hücre değişimi sütun dağılımı:

| sütun | adet |
| --- | ---: |
| meaning_tr | 33 |
| arabic | 37 |
| morphology | 34 |
| gloss_en | 32 |
| lemma | 30 |
| pos | 29 |
| role | 27 |
| source | 17 |
| confidence | 16 |
| root | 13 |

### Corpus toplamı hakkında bir uyarı

`77.429 → 77.433` **frozen token map ile eşleşmiyor gibi görünüyor, ama aslında
düzeltiyor.** Mevcut durumda iki hata birbirini örtüyordu:

- Frozen token map `1:1` besmelesini `opening_basmala_excluded` ile analiz
  kelimesi saymıyor (0 kelime); production'da ise `1:1` için **4 satır** var.
- Dokuz hedef ayette net **−4** satır eksik.

`+4 − 4 = 0` olduğu için toplam tesadüfen 77.429'da tutuyordu. Migration sonrası
dokuz ayet düzelince toplam 77.433 olur ve fark tamamen `1:1`'in 4 satırından
gelir. Bu **ayrı bir karardır** (besmele analiz kelimesi sayılacak mı) ve bu
migration'ın kapsamı dışında bırakıldı; `integrity-report.json` içinde
`verses_not_in_frozen_token_map: ["1:1"]` olarak açıkça raporlanıyor.

---

## 4. Ayet bazlı özet

| Ayet | mevcut | canonical | Δ | kaymanın başladığı indeks | etkilenen token | neden | işlemler |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2:72 | 11 | 10 | −1 | yüzey 4 | 8 | `فَٱدَّٰرَْٰٔتُمْ` iki satıra bölünmüş; kuyruğa NULL analiz eklenmiş | 3 KEEP, 7 REWRITE_SURFACE, 1 DELETE_ROW |
| 2:181 | 14 | 14 | 0 | analiz 4 | 12 | `بَعْدَ`+`مَا` tek hücrede; sonrası +1 kaymış, son satır mükerrer | 2 KEEP, 2 SPLIT_ANALYSIS, 10 MOVE_ANALYSIS |
| 8:6 | 12 | 12 | 0 | analiz 5 | 9 | aynı `بَعْدَ`+`مَا` birleşmesi | 3 KEEP, 2 SPLIT_ANALYSIS, 7 MOVE_ANALYSIS |
| 13:37 | 20 | 20 | 0 | analiz 9 | 13 | aynı `بَعْدَ`+`مَا` birleşmesi | 7 KEEP, 2 SPLIT_ANALYSIS, 11 MOVE_ANALYSIS |
| 15:7 | 7 | 8 | +1 | yüzey 1 | 8 | `لَّوْ`+`مَا` tek yüzeyde; son analiz (`ٱلصَّٰدِقِينَ`) kesilmiş | 7 REWRITE_SURFACE, 1 INSERT_ROW |
| 27:20 | 11 | 12 | +1 | yüzey 4 | 9 | `مَا`+`لِىَ` tek yüzeyde; son analiz (`ٱلْغَآئِبِينَ`) kesilmiş | 3 KEEP, 8 REWRITE_SURFACE, 1 INSERT_ROW |
| 36:22 | 7 | 8 | +1 | yüzey 1 | 8 | `وَمَا`+`لِىَ` tek yüzeyde; son analiz (`تُرْجَعُونَ`) kesilmiş | 7 REWRITE_SURFACE, 1 INSERT_ROW |
| 37:164 | 5 | 6 | +1 | yüzey 1 | 6 | `وَمَا`+`مِنَّآ` tek yüzeyde; son analiz (`مَّعْلُومٌ`) kesilmiş | 5 REWRITE_SURFACE, 1 INSERT_ROW |
| 41:47 | 27 | 28 | +1 | yüzey 25 | 4 | `مَا`+`مِنَّا` tek yüzeyde; son analiz (`شَهِيدٍ`) kesilmiş | 24 KEEP, 3 REWRITE_SURFACE, 1 INSERT_ROW |

Düzeltme sonrası tam token dizileri `verse-plan.json` →
`target_token_sequence` / `target_surface_sequence` alanlarında; her mevcut satır
için satır satır karar `row-mapping.jsonl` içinde.

---

## 5. Veri taşıma politikası — nasıl uygulandı

| Kural | Uygulama |
| --- | --- |
| Arabic yüzey yalnız canonical'dan | Sınırlar canonical Tanzil'den; codepointler production dizgisinden. Ayet birleşimi bit düzeyinde korunuyor. |
| Komşudan körlemesine kaydırma yok | Her yükün hangi canonical tokene ait olduğu teacher skoruyla belirlendi; rakip hipotezler skorlandı ve fark raporlandı (`anchoring`). |
| Teacher/alignment doğrulaması | 9 ayetin 118 canonical tokeninin tamamı teacher'da mevcut; birleşmiş hücrenin her yarısı ayrıca teacher root/lemma ile sınandı (0 red). |
| Kanıtlanmayan alan NULL | `morphology`/`pos`/`gloss_en` teacher'ın legacy formatını konuşmadığı için INSERT satırlarında NULL bırakıldı; yalnız `root`/`lemma` teacher'dan dolduruldu (`source='qac_tanzil_teacher'`, `confidence='low'`). |
| meaning_tr doğru tokene taşınır | Yalnız sağlıklı corpus'un o **tam yüzey** için zaten tanıklık ettiği değer taşınır (9 hücre). Kanıtlanamayan 26 hücre NULL'a çekilip kuyruğa alındı; corpus önerisi `suggestion` alanında saklandı ama **yazılmadı**. |
| confidence/source/role birlikte taşınır | Evet — `ANALYSIS_COLUMNS` tek blok olarak taşınıyor. Bölünen hücrenin yarısında `role` yalnız corpus'un aynı `(pos, morphology)` çifti için tanıklık ettiği değerle dolduruluyor. |
| Artık/mükerrer analiz gösterilir | 3 kayıt: `2:72` id=1149 (fazla satır, siliniyor), `2:181` id=3301 ve `8:6` id=22624 (mükerrer kuyruk analizi, üzerine yazılıyor). Hepsinin atılan yükü `verse-plan.json` → `discarded_analyses` içinde tam olarak duruyor. |

### Neden meaning_tr'de bu kadar NULL var

Production'da `meaning_tr` hizası tutarlı değil: 13:37'de tamamen yüzeye, 2:72'de
analize, 15:7'de karışık bağlı. Bu yüzden tek bir kural güvenli değil. Corpus
çoğunluğunu yazmak denendi ve reddedildi — mevcut corpus hatalarını taşıyordu
(ör. `مِنَّا` için "benden") ve alakasız kozmetik değişiklikler üretiyordu
(`veli, dost` → `dost, veli`). Politika gereği tahmin üretilmedi.

---

## 6. Global kapılar — dry-run sonuçları

Atılabilir kopya üzerinde `forward.sql` uygulandıktan sonra ölçüldü
(`dry-run-verification.json`):

| Kapı | Sonuç |
| --- | --- |
| Her ayetin token dizisi canonical ile sınır sınır aynı | ✅ 0 uyumsuzluk |
| Corpus toplam token | 77.433 (bkz. §3 `1:1` notu) |
| 6.236 ayette word_index boşluk/duplicate/sıra bozukluğu | ✅ 0 |
| Hedef dışı 77.315 satırın hiçbir hücresi değişmedi | ✅ sha256 parmak izi birebir aynı |
| v1.8 / proper-name / meaning / Buckwalter düzeltmeleri korundu | ✅ hedef dışı satırlar hiç dokunulmadı; hedef içinde `meaning_override` ve `proper_name_lexicon` kaynaklı yükler taşındı, ezilmedi |
| `root`/`lemma` alanlarında ASCII | ✅ 0 (`GLOB '*[A-Za-z]*'` ile tarandı; v1.8'in `NTWS`/`ص.د.ق` biçimleri **kullanılmadı**) |
| `PRAGMA foreign_key_check` | ✅ boş |
| `PRAGMA integrity_check` | ✅ `ok` |
| Mobil/web API response sırası | ✅ `word_index` dense 1..N; `words.id` yeniden numaralandırılmadı |
| `reverse.sql` geri döndürüyor mu | ✅ `words` tablosu byte düzeyinde uygulama öncesi haline dönüyor |

---

## 7. Üretilen artefaktlar

`data/candidates/morphology/token-realign-v1_9/`

| Dosya | İçerik |
| --- | --- |
| `verse-plan.json` | Kesin sayılar, ayet bazlı plan, anchoring kanıtı, meaning_tr inceleme kuyruğu, atılan analizler, no-op kapısı sonucu |
| `before-after.jsonl` | Ayet bazlı tam before/after satır listeleri |
| `row-mapping.jsonl` | Her canonical token için: eski `words.id`, eski `word_index`, eski yüzey, hedef yüzey, analizin gerçek sahibi, teacher/v1.8 karşılaştırması, işlem, kanıt |
| `field-change-manifest.json` | Hücre düzeyinde 268 değişiklik (`words_id`, sütun, before, after, işlem) |
| `forward.sql` | Guard'lı ileri migration taslağı (77 ifade) — **uygulanmadı** |
| `reverse.sql` | Pre-image'dan üretilmiş geri alma taslağı — **uygulanmadı** |
| `preimage.json` | Değişecek/silinecek her satırın uygulama öncesi tam hali |
| `PREIMAGE_BACKUP_PLAN.md` | Local + Turso yedek, uygulama sırası, kapılar, geri alma |
| `integrity-report.json` | Plan üzerinden simüle edilmiş corpus bütünlüğü |
| `dry-run-verification.json` | Atılabilir kopya üzerinde gerçek uygulama + geri alma sonuçları |

`forward.sql` özellikleri:

- Her `UPDATE`/`DELETE` `id + verse_key + word_index + uygulama öncesi arabic`
  ile guard'lı → ikinci çalıştırma no-op, kaymış satır sessizce ezilmez.
- `INSERT`'ler explicit id kullanır → local ve Turso id-özdeş kalır.
- Tek transaction (`BEGIN IMMEDIATE` … `COMMIT`).

---

## 8. Uygulama öncesi karar bekleyen konular

1. **`1:1` besmelesi.** Frozen token map onu analiz kelimesi saymıyor,
   production'da 4 satır var. Bu migration'ın kapsamı dışında bırakıldı; corpus
   toplamının 77.433 olmasının tek sebebi bu. Ayrı bir karar gerekiyor.
2. **54 `meaning_tr` hücresi** insan onayı bekliyor (26'sı NULL'a çekiliyor,
   27'si dokunulmadan bırakılıp işaretleniyor, 1'i silinen satırla gidiyor).
   Her biri için corpus önerisi ve reddedilen adaylar `verse-plan.json` →
   `meaning_tr_review` içinde hazır.
3. **INSERT edilen 5 satırın `morphology`/`pos`/`gloss_en` alanları NULL.**
   Teacher legacy segment formatını üretemiyor. Bunların doldurulması ayrı ve
   kanıtlı bir adım olmalı.
