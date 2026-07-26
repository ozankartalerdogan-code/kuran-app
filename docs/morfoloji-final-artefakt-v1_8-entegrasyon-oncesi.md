# Final morfoloji artefaktı v1.8 — entegrasyon öncesi karşılaştırma raporu

Dondurulmuş v1.8 hattından (`frozen-hc1-production-v1_8-manifest.json`,
`status: ACCEPTED_PRODUCTION`) türetilen nihai bağımsız artefakt, bu artefaktın
production `data/app.db.words` morfolojisiyle token-token karşılaştırması ve
determinizm kanıtı.

**Bu turda yeni kural, yeni aday, yeni sözlük girdisi ve yeni seçim üretilmedi.**
Artefakt saf bir projeksiyondur: dondurulmuş seçim + dondurulmuş token map, tek
deterministik çıktıda birleştirilir. `data/app.db`ye yazılmadı.

## 1. Final artefakt

| çıktı | sha256 |
| --- | --- |
| `data/candidates/morphology/final-v1_8/final-morphology-v1_8.jsonl` | `190438be8d0f997e75ec2b0d71680aa903494106a703fcd67d3897a0ff33b3f9` |
| `data/candidates/morphology/final-v1_8/final-morphology-v1_8.sqlite` | `7c08ed883703b5573a2bfea51cdebaa3a3adabe1eaecadf0392eef6fce37dc62` |
| `data/candidates/morphology/final-v1_8/summary.json` | `806d6050c1546b3b00140708d2282536f1d6651ee12abe5055ccc7eac5fea0c5` |
| `data/candidates/morphology/final-v1_8/checksums.json` | `a11f1ecf5fa34b62244ffa99b4f9c21780bb2907e57c0b7a9205a215d01a4922` |

77.429 Tanzil tokenı, `(sure, ayet, word_index)` sırasında, kayıt başına:
canonical Arabic · root (+ noktasız anahtar) · lemma (+ normalize anahtar) ·
POS · features (`asp/cas/gen/mod/num/per/stt/vox`) · analyzer diac ·
confidence · verdict · resolution · risk_class · unresolved_reason ·
selection_rule · rule_chain · source · selected_fingerprint · aday sayısı.

Girdiler çalışmadan önce freeze manifestine karşı sha256 doğrulanır; tek bir
bayt oynasa script hiçbir şey yazmadan durur (fail-closed).

### Girdi pinleri

| girdi | sha256 | durum |
| --- | --- | --- |
| `selector-v1_8/selection.jsonl` | `ab777b7931c6af916eb3bd26287a28e3b55d9301f30d7da7d73dee5d294bb561` | eşleşti |
| `hc1-ext-v1_8/token-map-hc1-ext-v1_8.jsonl` | `6d9e2975208726e1c54d714b19f37df269cb11fd025e838ab0542614e152c516` | eşleşti |

Canonical yüzey iki kaynaktan da okunup token-token karşılaştırıldı:
77.429/77.429 birebir aynı (uyuşmazlık olsaydı hard failure).

## 2. Final sayılar

| verdict | token |
| --- | --- |
| CORRECT | 30.729 |
| INCORRECT | 3.064 |
| AMBIGUOUS | 34.467 |
| RECALL_GAP | 9.169 |
| **toplam** | **77.429** |

### Kritik ayrım: RECALL_GAP seçimden **önce** atanır

Dondurulmuş selector `RECALL_GAP`i, aday havuzunda teacher okumasının hiç
bulunmadığı durum olarak, seçime bakmadan atar. Dolayısıyla RECALL_GAP olup yine
de seçim taşıyan tokenlerde seçilen aday **tanım gereği teacher okuması
değildir** ve hiçbir şeye karşı doğrulanmamıştır. Bu, CORRECT bir satırla aynı
kefeye konamaz; artefakta `risk_class` alanı bu yüzden eklendi:

| risk_class | token | anlamı |
| --- | --- | --- |
| VERIFIED_CORRECT | 30.729 | seçim var, teacher ile uyumlu |
| KNOWN_INCORRECT | 3.064 | seçim var, teacher ile çelişiyor |
| UNJUDGED_SELECTION_RECALL_GAP | **4.368** | seçim var, doğru olamayacağı biliniyor |
| NO_SELECTION_AMBIGUOUS | 34.467 | seçim yok, cascade kararsız |
| NO_SELECTION_RECALL_GAP | 4.801 | seçim yok, havuzda aday yok |

Runtime'ın gerçekten değer taşıdığı token sayısı **38.161** (RESOLVED);
bunların yalnız **%80,5'i** (30.729) doğrulanmıştır.

### Doluluk oranları

| alan | dolu | korpusun %'si | çözülmüş tokenlerin %'si |
| --- | --- | --- | --- |
| lemma | 38.161 | 49,3 | 100,0 |
| POS | 38.161 | 49,3 | 100,0 |
| features | 38.161 | 49,3 | 100,0 |
| root | 30.970 | 40,0 | 81,2 |

Root, `NTWS`/`FOREIGN`/`NOAN` gibi radikal taşımayan işaretçiler null sayılarak
ölçülmüştür.

Karşılaştırma için legacy doluluk: root %64,9 · lemma %95,7 · POS %99,9.
**Yeni hat her alanda legacy'den belirgin biçimde daha boştur.**

## 3. Legacy `data/app.db.words` ile token-token karşılaştırma

Çıktılar: `final-v1_8/legacy-comparison.jsonl` (satır başına tam kayıt) ve
`legacy-comparison-report.json`.

### 3a. Önce hizalama denetimi

Konumsal join yalnız iki taraf ayeti aynı şekilde tokenize ettiğinde geçerlidir.
6.236 ayetin **6.229'u** iskelet düzeyinde birebir hizalı. Ayrışan 7 ayet ve
sebepleri:

| ayet | final | legacy | sebep |
| --- | --- | --- | --- |
| 1:1 | 0 | 4 | Fatiha besmelesi: Tanzil hariç tutuyor, legacy taşıyor |
| 2:72 | 10 | 11 | legacy `فَٱدَّـٰرَ` + `ٰٔتُمۡ` diye **bozuk bölmüş** |
| 15:7 | 8 | 7 | mushaf bitişik yazımı `لَّوۡمَا` |
| 27:20 | 12 | 11 | mushaf bitişik yazımı `مَالِيَ` |
| 36:22 | 8 | 7 | mushaf bitişik yazımı `وَمَالِيَ` |
| 37:164 | 6 | 5 | mushaf bitişik yazımı `وَمَامِنَّآ` |
| 41:47 | 28 | 27 | mushaf bitişik yazımı `مَامِنَّا` |

Farklar birbirini götürdüğü için iki taraf da 77.429 satır; **ham sayı eşitliği
hizalamanın doğru olduğu anlamına gelmiyor.** Ayrışma noktasından itibaren
42 token `ALIGNMENT_UNSAFE` işaretlendi ve alan karşılaştırmasının dışında
bırakıldı — yanlış kelimeyle karşılaştırılmadı.

### 3b. Sınıf dağılımı

| sınıf | token | bunların VERIFIED_CORRECT olanı |
| --- | --- | --- |
| IDENTICAL (aynı) | 25.365 | 25.365 |
| LEGACY_RICHER_NEW_EMPTY (legacy dolu, yeni boş) | **39.245** | 0 |
| LEMMA_DIFF | 6.817 | 2.013 |
| MORPHOLOGY_DIFF | 2.052 | 2.050 |
| POS_DIFF | 1.888 | **0** |
| NEW_RICHER (yeni daha dolu) | 1.287 | 1.286 |
| ROOT_DIFF | 603 | **0** |
| LEGACY_RICHER_FIELD (alan düzeyi) | 129 | **0** |
| ALIGNMENT_UNSAFE | 42 | — |
| BOTH_EMPTY | 1 | — |

Ontoloji köprüsü yalnız mevcut dondurulmuş haritalarla kuruldu: root noktasız
+ elif katlamalı, lemma harekesiz + elif katlamalı, POS için legacy bileşik
etiketi (`P+N`) teacher exporter'ın kullandığı kuralla baş segmente indirgenip
CAMeL ince etiketi kaba sınıf **kümesine** eşlendi. Kümesi birden büyük CAMeL
etiketleri (706 token) ne eşleşme ne çatışma sayıldı, `UNDECIDABLE` raporlandı.
Morfolojide yalnız iki kodlamanın da gerçekten taşıdığı üç özellik (hâl, cinsiyet,
sayı) karşılaştırıldı; gerisi tahmin edilmedi, `NOT_COMPARABLE` işaretlendi.

### 3c. Olduğu gibi geçirilirse etki

| | token |
| --- | --- |
| değeri değişecek | 12.647 |
| legacy değeri **silinecek** (yeni boş) | **39.245** |
| değişmeyecek | 25.537 |

Yani artefakt olduğu gibi yazılırsa **korpusun %50,7'sinde mevcut production
morfolojisi boşaltılır.**

## 4. Production'a geçirilmemesi gereken şüpheli farklar

**Bunların hiçbiri promote edilmemeli:**

1. **POS_DIFF — 1.888 token, VERIFIED_CORRECT olanı 0.** Her POS farkı, yeni
   hattın yanlış bildiği (1.697 KNOWN_INCORRECT) veya hiç doğrulanmamış
   (191 UNJUDGED) bir token üzerinde. Tek bir POS değişikliği bile doğrulanmış
   değil.
2. **ROOT_DIFF — 603 token, VERIFIED_CORRECT olanı 0.** 597'si UNJUDGED, 6'sı
   KNOWN_INCORRECT.
3. **LEMMA_DIFF'in doğrulanmamış kısmı — 4.804 token** (3.500 UNJUDGED +
   1.304 KNOWN_INCORRECT).
4. **LEGACY_RICHER_FIELD — 129 token**, tamamı doğrulanmamış; legacy'nin dolu
   alanı yeni hatta boş.
5. **LEGACY_RICHER_NEW_EMPTY — 39.245 token.** Buradaki risk fark değil, veri
   kaybı: yeni hat hiçbir şey söylemiyor.
6. **NEW_ROOT_ON_FUNCTION_WORD — 337 token.** Yeni hattın legacy'de boş olan
   root'u doldurduğu vakaların yarısı, QAC ontolojisinin bilerek köksüz bıraktığı
   fonksiyon kelimeleri (`ثُمَّ` → `ث.م.م`, `مَع` → `م.ع.ي`). Bunlar boşluk
   doldurma değil, ontoloji değiştirme.
7. **ALIGNMENT_UNSAFE — 42 token.** Hizalama çözülmeden hiçbiri yazılmamalı.
8. **MORPHOLOGY_DIFF — 2.052 token.** Root+lemma+POS uyuşurken hâl/cinsiyet/sayı
   ayrışıyor (1.106 hâl, 643 cinsiyet, 188 sayı, 115 karma). Bu CAMeL ile QAC
   arasındaki kodlama farkı; doğrulanmış olması bu üç özelliğin doğrulandığı
   anlamına gelmiyor — verdict yalnız root/lemma/POS üzerinden ölçülüyor.

### Görece güvenli tek küme

| kalem | token |
| --- | --- |
| IDENTICAL (no-op, yazmaya gerek yok) | 25.365 |
| NEW_LEMMA_ONLY, VERIFIED_CORRECT | 616 |
| NEW_ROOT_ON_CONTENT_WORD, VERIFIED_CORRECT | 333 |

Yani bu turda gerçekten kazanılan yeni bilgi **949 token** düzeyinde.

## 5. Legacy tarafında bulunan veri bozuklukları

Bunlar legacy'nin kendi kusurları; raporlanıyor, bu turda düzeltilmiyor.

| bulgu | token |
| --- | --- |
| `lemma` sütununda **çevrilmemiş Buckwalter** (`<in~`, `EalaY\``, `min`, `fiY`, `<ilaY\``, `Ean`, …13 değer) | **3.323** |
| `lemma` baş kelime yerine **öntakı harfi** (`وَلَوْ` → lemma `و`) | **5.995** |
| `root` sütununda Buckwalter (`Awl`) | 45 |
| tokenizasyon ayrışması | 37 |
| `morphology` boş | 4 |
| `pos` boş | 4 |
| legacy satırı hiç yok (Tanzil'de var) | 5 |

Bu iki bulgu, "doğrulanmış lemma farkı" tablosunu tümüyle açıklıyor:
VERIFIED_CORRECT olan 2.013 LEMMA_DIFF'in **1.096'sı** legacy'nin öntakı-lemma
konvansiyonundan, **903'ü** legacy'deki Buckwalter sızıntısından geliyor.
Geriye kalan **gerçek sözlüksel anlaşmazlık yalnız 14 token.**

`U+FFFD` bozulması bu tabloda **0** — daha önceki onarım turu tuttu.

## 6. QAC/teacher'ın final runtime girdisi olmadığının doğrulaması

Manifest iddiası tekrarlanmadı, yapısal olarak denetlendi.

1. **Artefakt üreticisi teacher'ı hiç açmıyor.** `build-final-morphology-artifact-v1_8.py`
   `open`'ı sarmalıyor; `qac-tanzil-teacher.jsonl`, ham QAC dump'ı veya `data/app.db`
   açılmaya çalışılsa süreç hata verip duruyor. Çalışma sonunda açılan dosya
   kümesi ayrıca kontrol ediliyor.
2. **Seçim fonksiyonu teacher argümanı almıyor.** Dondurulmuş
   `select-camel-candidate-v1_5.py` içinde seçimi yapan çağrı
   `V.select(surface, pool, prev_pool, next_pool)`; teacher parametre listesinde
   yok. `confidence` de teacher'dan değil, kural başına sabit tablodan
   (`V.CONFIDENCE[rule]`) geliyor.
3. **Teacher, seçim yapıldıktan _sonra_ okunuyor.** `answers[key]` hesabı
   `chosen` belirlendikten sonra çalışır ve yalnız verdict etiketini üretir.
4. **Tek teacher teması olan `if key in teacher` filtresi ölçülerek no-op
   olduğu gösterildi:** dump'ın analiz token kümesi = teacher kümesi = final
   kümesi = 77.429, üçü de birebir aynı. Filtre tek token elemiyor.

Sonuç: **verdict/risk_class evaluation etiketidir, runtime değeri değildir.**
Artefaktın canonical/root/lemma/POS/features/confidence alanları teacher'dan
bağımsız üretilmiştir.

Ayrı ve önemli bir tespit: **legacy production tablosunun kendisi QAC türevidir.**
Ölçüm: legacy ↔ teacher root uyumu 50.230/50.232 (%99,996), POS uyumu
77.358/77.383 (%99,97), lemma uyumu 67.155/74.076 (%90,7). Yani "verdict CORRECT"
pratikte "legacy'nin kaynağıyla uyumlu" demektir; verdict CORRECT olmayan bir
farkı promote etmek QAC'tan uzaklaşmak anlamına gelir.

## 7. Sıfırdan yeniden üretilebilirlik kanıtı

`verify-final-artifact-determinism-v1_8.py`: A çalışmasının çıktıları kenara
alınır, builder **ayrı bir process'te boş dizine** yeniden çalıştırılır, her
dosya bayt bayt karşılaştırılır.

```
byte_identical: true
mismatched: []
final-morphology-v1_8.jsonl    identical
final-morphology-v1_8.sqlite   identical
summary.json                   identical
checksums.json                 identical
```

Kanıt `final-v1_8/determinism.json` içinde kalıcı.

Üst hattın determinizmi zaten donduruldu ve bu turda yeniden doğrulandı:
freeze manifestindeki **12 artefaktın 12'si** ve token map sha256'sı, runB
temizliğinden **sonra** yeniden hesaplanıp eşleşti.

### Çalıştırma

```
py -3.12 scripts/morphology/build-final-morphology-artifact-v1_8.py
py -3.12 scripts/morphology/verify-final-artifact-determinism-v1_8.py
py -3.12 scripts/morphology/compare-final-v1_8-vs-legacy.py
```

## 8. RunB duplicate temizliği

Silmeden önce üç koşul doğrulandı:

1. **Freeze manifestleri bu ham dosyaları referans etmiyor.** Gitignore'lanan
   `data/` dahil depo genelinde `runB` geçen 4 dosya var:

   | dosya | referansın niteliği |
   | --- | --- |
   | `verify-hc1-determinism-v1_8.py` | bu dizinleri zaten *üreten* script |
   | `check-determinism.mjs` | ilgisiz yerel değişken adı (`runA`/`runB`) |
   | `verify-fark.ts` | `runBoiler` — yanlış eşleşme |
   | `hc1-ext-v1_8/determinism-v1_8.json` | **pinli artefakt**, aşağıya bakınız |

   Sonuncusu dikkat gerektiriyor: freeze manifestinde pinli olan determinizm
   artefaktı runB yollarını *içeriyor*. Ancak referans yalnız `runs.B` bloğundaki
   üç yol dizesinden ibaret; hiçbir checksum, kapı veya doğrulama bu dosyaların
   varlığına bağlı değil (`shard_sha256`, `artifacts` ve `byte_identical` alanları
   değerleri satır içi taşıyor). Silme sonrası dosyanın kendi sha256'sı
   (`d1bb812b…`) freeze pini ile hâlâ eşleşiyor — doğrulandı. Net etki:
   pinli artefakt artık var olmayan yolları *adlandırıyor*, ama hiçbir kanıt
   zinciri kopmuyor.

   Hiçbir manifest, doküman veya runtime yolu runB içeriğine bağlı değil.
2. **Determinizm kanıtı kalıcı artefaktta.** `hc1-ext-v1_8/determinism-v1_8.json`
   — freeze manifestinde `d1bb812b…` ile pinli — 114 shard'ın, token map'in,
   `selection.jsonl`in ve `checksums.json`un sha256'sını `identical: true` ile
   satır satır taşıyor. Kanıt ham dizinlerden bağımsız.
3. **Silinenlerin gerçekten birebir kopya olduğu ölçüldü.** Silmeden önce
   runB'deki 114 shard + token map + selection yeniden hash'lendi: 116/116
   dondurulmuş değerle eşleşti.

Silinen (yalnız duplicate runB dizinleri):

| dizin | dosya | boyut |
| --- | --- | --- |
| `camel-morph-msa-v1.0/full-analysis-hc1-ext-v1_8-runB` | 115 | 314,5 MiB |
| `hc1-ext-v1_8-runB` | 2 | 193,8 MiB |
| `selector-v1_8-runB` | 5 | 67,6 MiB |
| **toplam** | **122** | **575,8 MiB** (603.815.012 bayt) |

Dondurulmuş ana dump ve manifestlere dokunulmadı; temizlik sonrası 12/12
artefakt yeniden doğrulandı (bkz. §7).

## 9. Sonuç

`data/app.db` bu turda **açılmadı bile denecek kadar az dokunuldu**: yalnız
`mode=ro` ile okundu, sha256 `f00a3864…`, mtime 2026-07-22 değişmedi, WAL 0 bayt.

Artefakt entegrasyona hazır **değil**. Engelleyen tek kalem hata değil, kapsam:
yeni hat legacy'nin doldurduğu 39.245 tokende sessiz, ve doğrulanmamış 12.647
farkın büyük kısmı QAC türevi legacy veriyi doğrulanmamış bir okumayla
değiştirecek. Bu turda net kazanç 949 token.

Bir sonraki turun kararı bir kural turu değil, bir **birleştirme politikası**
turudur: hangi risk_class'ların legacy'yi ezmeye yetkili olduğu, ve legacy'nin
Buckwalter (3.323) + öntakı-lemma (5.995) kusurlarının ayrı bir onarım turu olarak
mı ele alınacağı.
