# Morphology Source Inspect

Bu rapor morfoloji kaynaklarının mevcut `canonical_word_analysis_v4.json` üzerine ek katkı sağlayıp sağlamadığını değerlendirir.

İncelenen kaynaklar:

- `data2/quran-morphology/morphology-terms-ar.json`
- `data2/QURAN-NLP/data/quran/corpus/quran_morphology.csv`
- `data2/processed/canonical_word_analysis_v4.json`

Runtime, UI ve default source davranışı değiştirilmedi. Veri dosyaları overwrite edilmedi.

## Kısa Sonuç

- `quran_morphology.csv` çok güçlü ve tam kapsamlı bir segment-level morfoloji kaynağıdır.
- CSV 6236 ayetin tamamını, 77429 kelime lokasyonunu ve 128219 segmenti kapsıyor.
- `canonical_word_analysis_v4.json` da 6236 ayet ve 77429 kelime içeriyor.
- Canonical v4, CSV’deki ana morfoloji bilgisinin büyük bölümünü zaten içeriyor: root, lemma, POS, verb form, case/mood, pronoun suffix gibi bilgiler canonical `morphology` string’ine taşınmış.
- Bu nedenle kaynak doğrudan user-facing yeni analiz metni üretmekten çok, build-input / validation / repair audit için daha değerli.
- `morphology-terms-ar.json` morfolojik etiket açıklamaları içeriyor, fakat Türkçe değil; Kanıtlı Analiz için doğrudan user-facing kullanılmamalı.

## Dosya Yapısı

### `quran_morphology.csv`

Alanlar:

- boş index kolonu
- `LOCATION`
- `FORM`
- `TAG`
- `FEATURES`

Örnek:

```csv
LOCATION,FORM,TAG,FEATURES
(1:5:2:1),naEobudu,V,STEM|POS:V|IMPF|LEM:Eabada|ROOT:Ebd|1P
```

`LOCATION` formatı:

- `(surah:ayah:word:segment)`
- Örnek: `(2:173:4:2)` = 2. sure, 173. ayet, 4. kelime, 2. segment

### `morphology-terms-ar.json`

Üst seviye alanlar:

- `types`
- `particles`
- `attached_particles`
- `noun_forms`
- `noun_grammar`
- `attrs`
- `verb_forms_tri`
- `verb_forms_quad`
- `verb_tenses`
- `verb_grammar`
- `pronoun_attrs`
- `labels`
- `FAM`
- `other`

Bu dosya Arapça gramer terimleri için açıklama sözlüğü gibi duruyor. Türkçe açıklama sağlamadığı için kullanıcı-facing yerine build/debug sözlüğü olarak değerlendirilmeli.

## Kapsam Sayıları

### `quran_morphology.csv`

- Satır: 128219
- Malformed satır: 0
- Ayet kapsamı: 6236
- Unique kelime lokasyonu: 77429
- Unique segment lokasyonu: 128219
- `LEM` içeren segment: 74608
- `ROOT` içeren segment: 49968
- `PREFIX` segment: 28670
- `SUFFIX` segment: 21634
- `PRON` feature: 21384

En sık `TAG` değerleri:

| TAG | Sayı |
| --- | ---: |
| `N` | 25136 |
| `PRON` | 24685 |
| `V` | 19356 |
| `P` | 13006 |
| `CONJ` | 9450 |
| `DET` | 8377 |
| `PN` | 3911 |
| `REL` | 3575 |
| `REM` | 2925 |
| `NEG` | 2688 |
| `ACC` | 2283 |
| `ADJ` | 1961 |

En sık feature anahtarları:

| Feature | Sayı |
| --- | ---: |
| `STEM` | 77915 |
| `POS` | 77915 |
| `LEM` | 74608 |
| `ROOT` | 49968 |
| `PREFIX` | 28670 |
| `SUFFIX` | 21634 |
| `PRON` | 21384 |
| `M` | 13195 |
| `GEN` | 12629 |
| `ACC` | 10331 |
| `PERF` | 9150 |
| `NOM` | 8954 |
| `IMPF` | 8330 |
| `3MS` | 7786 |

### `canonical_word_analysis_v4.json`

- Ayet: 6236
- Word kaydı: 77429
- `morphology` dolu word: 77424
- `pos` dolu word: 77424
- `root` dolu word: büyük çoğunlukta mevcut, ancak köksüz particle/pronoun kayıtları doğal olarak boş.
- `lemma` dolu word: büyük çoğunlukta mevcut, ancak bazı unmatched kayıtlar boş.

## Canonical v4 ile Örtüşme

Lokasyon bazlı karşılaştırma:

- Morphology CSV unique word lokasyonu: 77429
- Canonical v4 indexed word lokasyonu: 77429
- Eşleşen word lokasyonu: 77424
- CSV’de olup canonical index’te görünmeyen: 5
- Canonical’da olup CSV index’te görünmeyen: 5

Bu 5 fark, büyük ihtimalle tokenization/word-index hizalama farkından kaynaklanıyor. Genel kapsam çok yüksek: yaklaşık tüm kelimeler eşleşiyor.

CSV’de olup canonical index’te görünmeyen örnekler:

- `15:7:8`
- `27:20:12`
- `36:22:8`
- `37:164:6`
- `41:47:28`

Canonical’da olup CSV index’te görünmeyen örnekler:

- `2:72:11`
- `2:181:14`
- `8:6:12`
- `13:37:20`
- `37:130:4`

Bu canonical kayıtların bazılarında lemma/root/pos/morphology boş kalmış durumda. Bu yüzden morfoloji CSV’si küçük bir repair audit için değerli olabilir; fakat doğrudan merge edilmemeli, önce location alignment kontrolü yapılmalı.

## Örnek Ayet Bulguları

### 1:5

CSV:

- `naEobudu`: `V`, `IMPF`, `LEM:Eabada`, `ROOT:Ebd`, `1P`
- `nasotaEiynu`: `V`, `IMPF`, form `(X)`, `ROOT:Ewn`, `1P`

Canonical v4:

- `نَعۡبُدُ`: `V`, `ROOT:عبد`, `LEM:عَبَدَ`, `1P`, `MOOD:IND`
- `نَسۡتَعِينُ`: `V`, `VF:10`, `ROOT:عون`, `LEM:اسْتَعِينُ`, `1P`, `MOOD:IND`

Sonuç: canonical v4 zaten kullanıcıya daha uygun Arabic root/lemma formatına dönüştürmüş.

### 2:173

CSV güçlü segment bilgisi veriyor:

- `Har~ama`: verb, form `(II)`, `ROOT:Hrm`
- `mayotapa`: noun, `ROOT:mwt`, feminine singular accusative
- `d~ama`: noun, `ROOT:dmw`
- `laHoma`: noun, `ROOT:lHm`
- `xinziyri`: noun, `ROOT:xnzr`
- `>uhil~a`: passive verb, form `(IV)`, `ROOT:hll`
- `{DoTur~a`: passive verb, form `(VIII)`, `ROOT:Drr`

Canonical v4 bu bilgileri Arabic root/lemma ve morphology string olarak zaten taşıyor. Ek değer segment-level audit ve role/POS güven kontrolü.

### 4:29

CSV:

- `ta>okulu`: verb, `ROOT:Akl`, `MOOD:JUS`
- `>amowa\`la`: noun, `ROOT:mwl`, plural accusative
- `ba\`Tili`: active participle, `ROOT:bTl`
- `tija\`rapF`: noun, `ROOT:tjr`
- `taqotulu`: verb, `ROOT:qtl`, `MOOD:JUS`
- `>anfusa`: noun, `ROOT:nfs`

Canonical v4:

- `تَأۡكُلُوٓاْ`: `ROOT:أكل`, `MOOD:JUS`
- `أَمۡوَٰلَكُم`: `ROOT:مول`, `ACC`
- `بِٱلۡبَٰطِلِ`: `ROOT:بطل`, `ACT_PCPL`, `GEN`
- `تِجَٰرَةً`: `ROOT:تجر`
- `تَقۡتُلُوٓاْ`: `ROOT:قتل`, `MOOD:JUS`

Sonuç: emir/yasak profilinde zaten işe yarayan morfolojik sinyaller canonical içinde mevcut.

### 112:1

CSV:

- `qulo`: imperative verb, `ROOT:qwl`, `2MS`
- `{ll~ahu`: proper noun, `ROOT:Alh`
- `>aHadN`: noun, `ROOT:AHd`, indefinite nominative

Canonical v4 bu bilgileri tevhid/birlik kararı için yeterli şekilde taşıyor.

## Canonical v4’te Olmayan Faydalı Bilgi Var mı?

Evet, ama çoğu user-facing değil; build/debug değeri var.

Ek katkılar:

- Segment-level ham lokasyon: `(surah:ayah:word:segment)`
- Buckwalter `FORM`
- Ham `TAG`
- Prefix/stem/suffix ayrımı
- Feature string’in orijinal hali
- Tokenization alignment kontrolü
- Canonical’da boş kalan birkaç morphology/root/lemma kaydı için repair adayı
- POS/feature distribution ile audit imkanı

Canonical v4 zaten şu alanları taşıyor:

- Arabic word
- root
- lemma
- pos
- role
- morphology string
- meaning_tr
- gloss_en
- confidence
- missing_fields

Bu yüzden `quran_morphology.csv` doğrudan yeni kullanıcı-facing veri gibi değil, canonical’ın doğrulama ve iyileştirme kaynağı gibi ele alınmalı.

## Kullanım Sınıfı Önerisi

| Kaynak | Önerilen sınıf | Gerekçe |
| --- | --- | --- |
| `quran_morphology.csv` | `build_input` | Tam kapsamlı ve güçlü, fakat ham Buckwalter/segment formatı kullanıcı-facing değil. |
| `morphology-terms-ar.json` | `debug_only` / `build_input` | Etiket açıklaması sağlar ama Türkçe değil; doğrudan kartta kullanılmamalı. |
| canonical v4 morphology alanı | kontrollü `user_facing` sinyal | Zaten normalize edilmiş; preview/decision katmanında dolaylı kullanılabilir. |

## Riskli Kullanım

Şunlar yapılmamalı:

- Ham Buckwalter formları kullanıcıya göstermek.
- `TAG`/`FEATURES` değerlerini Türkçeleştirmeden kartta göstermek.
- Prefix/pronoun/particle segmentlerini keyTerms gibi öne çıkarmak.
- CSV’yi canonical üzerine doğrudan merge etmek.
- 5 lokasyonluk index farkını çözmeden repair yapmak.
- Arapça gramer terim sözlüğünü Türkçe açıklama gibi kullanmak.

Özellikle particle/pronoun segmentleri çok yoğun:

- `PRON`: 24685 segment
- `P`: 13006 segment
- `CONJ`: 9450 segment
- `DET`: 8377 segment

Bu yüzden morfoloji kaynağı keyTerms görünürlüğünü artırmak için doğrudan kullanılmamalı; yoksa zamir/edat gürültüsü tekrar artar.

## Kanıtlı Analiz İçin Güvenli Kullanım

Güvenli alanlar:

- canonical morphology coverage audit
- root/lemma/pos boşluklarını tespit etme
- verb/noun/particle ayrımını doğrulama
- keyTerms filtrelerinde particle/pronoun baskılama için destek sinyal
- profile decision auditlerinde “fiil/isim/edat” ağırlığını doğrulama
- weak correspondence adaylarını segment türüne göre filtreleme

User-facing kullanım ancak dolaylı olmalı:

- “Kelime ve morfoloji verileri mevcut.”
- “Bu ayette fiil/isim yapısı belirgin.”

Ama şu tarz teknik metinler gösterilmemeli:

- `IMPF|ROOT:Ebd|1P`
- `ACT_PCPL`
- `MOOD:JUS`
- `PREFIX|Al+`

## Sonraki Küçük Adım

En güvenli sonraki adım:

1. Küçük bir inspect-only alignment audit üret.
2. CSV ile canonical v4 arasında uyuşmayan 5+5 lokasyonu detaylı incele.
3. Canonical’da morphology/root/lemma boş kalan kayıtlar için `quran_morphology.csv` gerçekten doğru repair sağlayabiliyor mu ölç.
4. Sonuç temizse yeni suffix’li repair candidate dosyası üret; canonical v4’ü doğrudan ezme.
5. Repair sonrası keyTerms ve weak correspondence gürültüsü artıyor mu diye 1000 ayet audit çalıştır.

Önerilen çıktı:

- `data/analysis-snapshots/morphology-canonical-alignment-audit.sample.json`
- `docs/MORPHOLOGY_CANONICAL_ALIGNMENT_AUDIT.md`

## Karar

Morfoloji kaynakları eksik değil; tam tersine güçlü ve kapsamlı. Ancak mevcut canonical v4 bu verinin büyük kısmını zaten normalize edilmiş şekilde taşıyor. Bu yüzden bugünkü en doğru kullanım, yeni user-facing katman açmak değil; canonical repair, source-backed filtering ve audit doğrulama için build-input olarak kullanmak.
