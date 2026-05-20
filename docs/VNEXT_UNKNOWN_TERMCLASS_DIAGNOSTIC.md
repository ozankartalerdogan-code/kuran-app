# vNext Unknown TermClass Diagnostic

Bu rapor, guncel vNext conflict matrix audit'indeki `unknown` termClass yuksekligini teshis eder. Runtime, UI, default source, classifier kodu, kaynak veri, Batch 2 ve overlay degistirilmedi.

## Classifier Hangi Alana Bakiyor?

Classifier input'u sadece `conflictType`, `value` ve `selectedProfile` aliyor. Term tanima su sekilde calisiyor:

- `displayValue(value)`: `value` icindeki son `|` parcasi
- `normalize(displayValue(value))`
- `normalize(value)`
- `selectedProfile`: profile relevance kontrolu icin

Dogru/yanlis ayrimi acisindan onemli nokta: classifier asagidaki alanlari ayri field olarak kullanmiyor:

- `normalizedValue`: kullanilmiyor
- `arabic`: kullanilmiyor
- `lemma`: kullanilmiyor
- `root`: kullanilmiyor
- `meaning_tr`: kullanilmiyor
- `gloss_en`: kullanilmiyor

## Ozet

- Islenen ayet: 6236
- Hata: 0
- Classifier seviyesinde `unclear` needsManualReview: 6139
- Matrix audit `unknown` conflict: 4461
- Matrix audit rapor edilen `unknown`: 4461
- Unique matrix unknown term: 2874
- Top 20 unknown conflict etkisi: 149 (%3.34)
- Ilk 100 unknown conflict etkisi: 538 (%12.06)

## Unknown Sebep Dagilimi (Ilk 100)

- term listesi dar: 100
- karışık raw/normalized form: 97
- lemma/root kullanılmıyor: 97

## En Sik 20 Matrix Unknown Term

| # | Term | Count | normalizedValue | Ornek ayetler | Muhtemel sebepler |
|---:|---|---:|---|---|---|
| 1 | `çatıları` | 11 | `ٱل ع ر ش ع ر ش catıları` | 9:129 (genel_karma, keyTermOnlyInV4); 17:42 (yol_hidayet, keyTermOnlyInV4); 20:5 (genel_karma, keyTermOnlyInV4) | karışık raw/normalized form, lemma/root kullanılmıyor, term listesi dar |
| 2 | `رَحْمٰن` | 10 | `ٱلر ح م ن ر ح م ن` | 19:69 (genel_karma, keyTermMissingInV4); 19:69 (genel_karma, profileRelevantTermDropped); 19:78 (genel_karma, keyTermMissingInV4) | karışık raw/normalized form, term listesi dar |
| 3 | `gören` | 10 | `ب ص ير ب ص ير goren` | 2:96 (uyari_inkar, keyTermMissingInV4); 2:96 (uyari_inkar, profileRelevantTermDropped); 2:237 (uyari_inkar, keyTermMissingInV4) | karışık raw/normalized form, lemma/root kullanılmıyor, term listesi dar |
| 4 | `onları üzer` | 10 | `س ا ء ساء onları uzer` | 5:66 (genel_karma, keyTermOnlyInV4); 6:31 (genel_karma, keyTermOnlyInV4); 6:136 (yol_hidayet, keyTermOnlyInV4) | karışık raw/normalized form, lemma/root kullanılmıyor, term listesi dar |
| 5 | `eş, çift` | 8 | `ا ز و ج ا ز و ج es cift` | 2:234 (emir_yasak, keyTermMissingInV4); 2:234 (emir_yasak, profileRelevantTermDropped); 20:53 (genel_karma, keyTermMissingInV4) | karışık raw/normalized form, lemma/root kullanılmıyor, term listesi dar |
| 6 | `oğlum` | 8 | `ب ن ي ب ن ى oglum` | 7:137 (kissa, keyTermMissingInV4); 7:137 (kissa, profileRelevantTermDropped); 10:93 (genel_karma, keyTermMissingInV4) | karışık raw/normalized form, lemma/root kullanılmıyor, term listesi dar |
| 7 | `şiddetli` | 8 | `ش د يد ش د يد siddetli` | 8:13 (genel_karma, keyTermMissingInV4); 8:13 (genel_karma, profileRelevantTermDropped); 8:25 (genel_karma, keyTermMissingInV4) | karışık raw/normalized form, lemma/root kullanılmıyor, term listesi dar |
| 8 | `müstağni` | 7 | `ٱل غ ن ي غ ن ي mustagni` | 6:133 (tevhid_birlik, keyTermOnlyInV4); 10:68 (tevhid_birlik, keyTermOnlyInV4); 22:64 (genel_karma, keyTermOnlyInV4) | karışık raw/normalized form, lemma/root kullanılmıyor, term listesi dar |
| 9 | `seçilmiş` | 7 | `ٱل م خ ل ص ين م خ ل ص secilmis` | 15:40 (dua_kulluk, keyTermOnlyInV4); 37:40 (dua_kulluk, keyTermOnlyInV4); 37:74 (dua_kulluk, keyTermOnlyInV4) | karışık raw/normalized form, lemma/root kullanılmıyor, term listesi dar |
| 10 | `savaş` | 7 | `ب ا س ن ا ب ا س savas` | 6:43 (uyari_inkar, keyTermOnlyInV4); 7:4 (genel_karma, keyTermOnlyInV4); 7:5 (dua_kulluk, keyTermOnlyInV4) | karışık raw/normalized form, lemma/root kullanılmıyor, term listesi dar |
| 11 | `acele istemek` | 7 | `ت س ت ع ج ل ون اس ت ع ج ل acele istemek` | 6:57 (genel_karma, keyTermOnlyInV4); 6:58 (genel_karma, keyTermOnlyInV4); 10:51 (genel_karma, keyTermOnlyInV4) | karışık raw/normalized form, lemma/root kullanılmıyor, term listesi dar |
| 12 | `yücelmek` | 7 | `و ت ع ل ى ت عال ى yucelmek` | 6:100 (genel_karma, keyTermOnlyInV4); 10:18 (dua_kulluk, keyTermOnlyInV4); 16:1 (genel_karma, keyTermOnlyInV4) | karışık raw/normalized form, lemma/root kullanılmıyor, term listesi dar |
| 13 | `kuşattı` | 7 | `و ح اق حاق kusattı` | 11:8 (uyari_inkar, keyTermOnlyInV4); 16:34 (genel_karma, keyTermOnlyInV4); 39:48 (genel_karma, keyTermOnlyInV4) | karışık raw/normalized form, lemma/root kullanılmıyor, term listesi dar |
| 14 | `geride kalanlar` | 6 | `ٱل غ ب ر ين غاب ر geride kalanlar` | 7:83 (genel_karma, keyTermOnlyInV4); 15:60 (genel_karma, keyTermOnlyInV4); 26:171 (genel_karma, keyTermOnlyInV4) | karışık raw/normalized form, lemma/root kullanılmıyor, term listesi dar |
| 15 | `apaçık` | 6 | `ٱل م ب ين م ب ين apacık` | 6:16 (genel_karma, keyTermMissingInV4); 6:16 (genel_karma, profileRelevantTermDropped); 39:15 (kissa, keyTermMissingInV4) | karışık raw/normalized form, lemma/root kullanılmıyor, term listesi dar |
| 16 | `Müşrik` | 6 | `ٱل م ش ر ك ين م ش ر ك musrik` | 6:14 (tevhid_birlik, keyTermMissingInV4); 6:14 (tevhid_birlik, profileRelevantTermDropped); 6:137 (ahiret, keyTermMissingInV4) | karışık raw/normalized form, lemma/root kullanılmıyor, term listesi dar |
| 17 | `Şer` | 6 | `ٱلش ر ش ر ser` | 10:11 (ahiret, keyTermMissingInV4); 10:11 (ahiret, profileRelevantTermDropped); 17:83 (ahiret, keyTermMissingInV4) | karışık raw/normalized form, lemma/root kullanılmıyor, term listesi dar |
| 18 | `oğul` | 6 | `ا ب ن ا ء ه م اب ن ogul` | 6:20 (genel_karma, keyTermMissingInV4); 6:20 (genel_karma, profileRelevantTermDropped); 7:127 (kissa, keyTermMissingInV4) | karışık raw/normalized form, lemma/root kullanılmıyor, term listesi dar |
| 19 | `kapı` | 6 | `ا ب و ب باب kapı` | 6:44 (genel_karma, keyTermOnlyInV4); 15:44 (genel_karma, keyTermOnlyInV4); 16:29 (ahiret, keyTermOnlyInV4) | karışık raw/normalized form, lemma/root kullanılmıyor, term listesi dar |
| 20 | `sığınmak` | 6 | `ا ع وذ ع ذ sıgınmak` | 2:67 (kissa, keyTermOnlyInV4); 11:47 (genel_karma, keyTermOnlyInV4); 19:18 (genel_karma, keyTermOnlyInV4) | karışık raw/normalized form, lemma/root kullanılmıyor, term listesi dar |

## Neden Unknown Yuksek?

1. Classifier `lemma/root/meaning_tr/gloss_en` alanlarini ayri ayri kullanmiyor; yalnizca birlestirilmis `value` metnindeki string pattern'lere bakiyor.
2. `value` ve `normalizedValue` icinde Arapca kelime, kok/lemma parcalari ve Turkce label ayni satirda karisik duruyor. Bu pattern matching'i zorluyor.
3. Term listesi dar: cok sayida gercek content terim henuz contentRules icinde yok.
4. Duplicate/variant formlar fazla: ayni kavram farkli Arapca yuzey formu veya ekli bicimlerle ayriliyor.
5. Bazi terimler gercekten belirsiz veya profil bagimli; dogrudan genis rule eklemek riskli.

## En Guvenli Duzeltme Onerisi

Ilk adim classifier rule genisletmek degil; Evidence Layer icinde veya audit helper'inda structured term parse/normalization pilotu yapmak. `value` icinden user label, Arabic surface, root/lemma ve meaning label ayrilmali; classifier bu structured parcaya gore audit edilmeli.

## Sonraki Adim Karari

- En guvenli: normalization/structured parse pilotu.
- Ikinci adim: parse sonucu ile kucuk classifier rule batch.
- En riskli: dogrudan genis pattern rule eklemek.
- Overlay pilot: ancak parse raporu dogrulaninca dusunulmeli.
