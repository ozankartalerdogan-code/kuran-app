# ORTHOGRAPHIC_ONLY kovası — analiz girdisine özel yazım dönüşümleri (v1)

Bu tur yalnız `classify-lexicon-oov.py`'nin `ORTHOGRAPHIC_ONLY` kovasına koyduğu
**120 tokenı** ele alır. Tanzil canonical yüzeyi değişmez; dönüşümler yalnız
analizöre verilen girdi dizesinde yaşar.

## Dondurma

v1.6 ve 30 lexeme'lik paradigma extension'ı **dondurulmuş kabul edilir**.
`scripts/morphology/resources/frozen-v1_6-manifest.json` her çalıştırmanın
başında yeniden doğrulanır ve sürüklenme varsa çalışma başlamaz:

| Doğrulanan | Sonuç |
| --- | --- |
| Manifest artefaktları | 31 / 31 sha256 eşleşti |
| Genişletilmiş dump shard'ları | 114 / 114 sha256 eşleşti |
| v1.5 manifest zinciri (`chains_from`) | eşleşti |
| Durum | `VERIFIED_UNCHANGED` |

R1–R5 recall sözleşmesi, selector cascade'i, clitic-split sözleşmesi ve lexicon
extension **düzenlenmedi**. Hepsi bu turda yalnız *baseline* kurmak için
olduğu gibi import edilip çalıştırıldı: her dönüşüm, dondurulmuş v1.6 aday
havuzu **artı** R1–R5'in ürettiği varyant havuzuna karşı ölçüldü.

## Dönüşümlerin biçimi — tersine doğrulanabilirlik

Bir dönüşüm string döndürmez, **edit script** döndürür: girdi koordinatlarında
`(offset, silinen codepoint'ler, eklenen codepoint'ler)` listesi. Çıktı bu
scriptten türetilir ve `invert()` çıktıdan girdiyi yeniden kurar. Üretilen her
varyant kullanılmadan önce bu yolla denetlenir — "codepoint düzeyinde tersine
doğrulanabilir" iddiası nesir değil, makine koşuludur.

Bu turda **319 tersine çevirme denetimi** çalıştı, hepsi geçti.

## Kapalı dönüşüm kümesi

Ayrım tek bir ölçüte dayanır: **kaynak farkı işaretliyor mu?**

### Uygulanan sınıf — Uthmani notasyonunun çözülmesi

Uthmani metin, "burada satırdaki harf okunanın kendisi değil" diyen açık bir
notasyon codepoint'i taşıyor. Onu çözmek kaynağı *okumaktır*, düzenlemek değil.

| id | işlem | kapsamda tetiklenen | kapattığı token |
| --- | --- | --- | --- |
| `O1_SMALL_WAW_TO_WAW` | U+06E5 → U+0648 | 6 | **6** |
| `O2_SMALL_YEH_TO_YEH` | U+06E6 → U+064A | 0 | 0 |
| `O3_SILENT_LETTER_DROP` | `[ا و ي ى]` + U+06DF → ∅ | 36 | **6** |
| `O5_SMALL_SEEN_SAD_TO_SEEN` | U+0635(+harakat) U+06DC → U+0633(+harakat) | 1 | **1** |

`O2` kapsamda hiç tetiklenmiyor; kümede tanımlı kalıyor ki ileriki turlarda
"ölçülmedi" ile "0 çıktı" karışmasın.

`O3`'te ek bir koşul **yok**. U+06DF zaten hangi harflerin etkilendiğini
söylüyor; üstüne "çoğul vavının atıl elifi hariç" gibi bir koşul koymak, bu
hattın elinde kanıtı olmayan bir kural icat etmek olurdu. Nitekim koşulsuz
biçim, koşullunun kapatamadığı `نَدْعُوا۟` / `نَتْلُوا۟` / `أَنَدْعُوا۟` ailesini kapatıyor.

### Ölçülen ama uygulanmayan sınıf

Deterministik ve tersinir, ama kaynakta konumu işaretleyen hiçbir şey yok:
Tanzil'in gerçekten yazdığı bir harfin üzerine konvansiyon gerekçesiyle
yazıyorlar.

| id | işlem | kapsamda tetiklenen | kapatabileceği |
| --- | --- | --- | --- |
| `O4X_PLURAL_WAW_OTIOSE_ALEF` | kelime sonu U+0648(+harakat) → +U+0627 | 12 | **0** |
| `O6X_FINAL_ALEF_TO_MAQSURA` | kelime sonu U+0627 → U+0649 | 66 | **14** |

## Kapanabilecek token sayısı

**13 token / 10 ayrık yüzey**, yalnız uygulanan sınıflarla.

| Ayet | Yüzey | Sınıf | Sonuç | +teacher-uyumlu aday | +uyumsuz |
| --- | --- | --- | --- | --- | --- |
| 2:245:14 | `وَيَبْصُۜطُ` | O5 | EXACT_CORE | 36 | 0 |
| 6:71:2 | `أَنَدْعُوا۟` | O3 | EXACT_CORE | 4 | 0 |
| 9:19:17 | `يَسْتَوُۥنَ` | O1 | EXACT_CORE | 8 | 0 |
| 16:75:21 | `يَسْتَوُۥنَ` | O1 | EXACT_CORE | 8 | 0 |
| 16:86:12 | `نَدْعُوا۟` | O3 | EXACT_CORE | 2 | 0 |
| 17:7:12 | `لِيَسُـۥٓـُٔوا۟` | O1 | EXACT_CORE | 3 | 3 |
| 17:71:2 | `نَدْعُوا۟` | O3 | EXACT_CORE | 2 | 0 |
| 18:14:12 | `نَّدْعُوَا۟` | O3 | EXACT_CORE | 2 | 0 |
| 18:16:7 | `فَأْوُۥٓا۟` | O1 | EXACT_CORE | 28 | 2 |
| 28:3:1 | `نَتْلُوا۟` | O3 | ROOT_POS_MATCH | 2 | 2 |
| 32:18:8 | `يَسْتَوُۥنَ` | O1 | EXACT_CORE | 8 | 0 |
| 40:74:10 | `نَّدْعُوا۟` | O3 | EXACT_CORE | 2 | 0 |
| 43:13:1 | `لِتَسْتَوُۥا۟` | O1 | EXACT_CORE | 6 | 1 |

Ayrıca **2 token** dondurulmuş kurallarla zaten residual dışında
(`ALREADY_REACHED_BY_FROZEN_RULES`) — bu turun eklediği bir şey yok.

### Uygulamanın kapsamı

Extension yalnız, dönüşümün ölçülebilir biçimde **teacher-doğru bir aday
eklediği** tokenlar için yazılır. Dönüşüm sınıfının kendisi teacher'dan
bağımsızdır (yalnız codepoint okur); teacher sadece emisyon kapısında,
v1.6'daki yüzey doğrulama kapısıyla aynı rolde kullanılır. Bu yüzden `O3` 36
tokende tetiklenirken 6'sı için yazılır: kalan 30'unda kanıtlanmış bir kazanç
yok, dolayısıyla doğrulanmamış hiçbir ekleme yapılmıyor.

## Riskli / çözülemeyen kayıtlar

**105 token.**

### `MEASURED_ONLY::O6X_FINAL_ALEF_TO_MAQSURA` — 11 token

Tamamı `رَءَا` / `وَرَءَا` / `رَّءَا` / `رَءَآ` ailesi, teacher lemma `رَأَى`. Dönüşüm
+ dondurulmuş R2 hamza taşıyıcısı `رَأَى` veriyor ve EXACT_CORE'a ulaşıyor. Yine
de bu turda uygulanmıyor, iki gerekçeyle:

1. **Lisans yok.** Kaynakta bu elifi işaretleyen bir notasyon yok; O1/O3/O5'in
   dayandığı U+06E5/U+06DF/U+06DC gibi bir kanıt bulunmuyor. Kural, Tanzil'in
   yazdığı harfi siliyor.
2. **Gürültü profili ters.** Uygulanan sınıflarda eklenen adayların neredeyse
   tamamı teacher-uyumlu (36/0, 8/0, 2/0…). O6X'te oran tersine dönüyor:
   token başına **+41 uyumlu / +87 uyumsuz**, `وَرَءَا`'da **+108 / +297**.
   Kelime sonundaki her elifte ateşlendiği için (kapsamda 66 token) aday
   havuzlarına taşıdığı gürültü, kapattığı 11 tokenın çok ötesinde.

Kendi kabul turunu hak ediyor; bu turda kapatılmış sayılmıyor.

### `UNRESOLVED_NOT_ORTHOGRAPHIC` — 94 token

Hiçbir yazım dönüşümü teacher okumasına ulaşmıyor. Residual seviyeye göre:
L7C 56, L7D 26, L7B 12.

En büyük aileler ve gerçek sebepleri:

| Yüzey ailesi | Token | Sebep |
| --- | --- | --- |
| `جَآءُو` / `جَآءُوكَ` / `جَآءُوهَا` / `فَجَآءُوهُم` … | ~25 | **Hamza taşıyıcısı.** `O4X` bu ailede 12 tokende tetikleniyor ve 0 kapatıyor: CAMeL `جاءوا` girdisine hiç analiz vermiyor (`جَاءُوا`, `جاءوك`, `جاءوكم` de aynı) — yani eksik olan atıl elif değil. **Düzeltme:** ilk yazımda bunu "ecvef paradigma boşluğu" olarak kaydetmiştim; residual yeniden sınıflandırma aksini gösteriyor — CAMeL lexeme'i **waw taşıyıcılı** tanıyor, `جاءو` → `جاؤو` (U+0621 → U+0624) `ج.ي.أ` köküne ulaşıyor. Aile `HAMZA_CARRIER` kovasına ait. O4X'in reddi yine de geçerli. |
| `هُزُوًا` | 11 | CAMeL `هزوا`'yı `هَزّ` (ه.ز.ز) olarak biliyor; teacher lemma `هُزُو`, kök `هزأ`. Doğru okumaya ancak `و → ؤ` yazımıyla (`هزؤا` → `هُزُؤ`, ه.ز.أ) varılıyor; bu da hiçbir notasyonun işaretlemediği bir harf değişimi — lemma tahminine komşu, uygulanmadı. |
| `يَبْدَؤُا۟` | 6 | `O3` atıl elifi düşürüyor ama `يبدؤ` → MSA `يبدأ` için taşıyıcı değişimi gerekiyor; dondurulmuş R2 klasik kurala göre (damma → ؤ) doğru olanı üretmiyor. R2 bu turda değiştirilmez. |
| `يَشَآءُونَ` / `تَشَآءُونَ` | 7 | Aynı ecvef + çoğul vavı boşluğu. |
| `يَسْتَـْٔخِرُونَ` / `تَسْتَـْٔخِرُونَ` | 5 | R3+R2 zaten `يستأخرون` üretiyor; CAMeL'de `استأخر` lexeme'i yok (L7D). |
| `هَاتُوا۟` | 4 | `هاتُ` CAMeL'de hiç yok (L7B). |
| `بِئْسَمَا` | 3 | CAMeL tek parça `بِئْسَمَا` veriyor, köksüz. |

Yani kovanın adı iyimser: `ORTHOGRAPHIC_ONLY` yalnız "donmuş bir prob *bir*
analiz üretiyor" demekti, "*doğru* analizi üretiyor" değil. 120 tokenın
gerçekte yazım kaynaklı olanı 13'ü; 94'ü lexicon/paradigma boşluğu.

## Silme/değişme = 0 doğrulaması

Extension yalnız adlandırılmış tokenlara **ek analizör girdi biçimi** verir;
mevcut havuz yapı gereği olduğu gibi taşınır. Bu yine de kaynakta yeniden
denetlenir — dondurulmuş v1.6 havuzunun her aday parmak izi, genişletilmiş
havuzda en az aynı çoklukta bulunmalıdır:

```
"scope_tokens_checked": 13,
"pools_removed": 0,
"pools_altered": 0,
"out_of_scope_tokens_touched": 0,
"tokens_gaining_candidates": 13,
"purely_additive": true
```

Kapsam dışı tek bir token bile dosyaya girmiyor, dolayısıyla v1.6'nın hiçbir
seçimi dönemez.

## Determinizm

İki **bağımsız** çalışma — ikincisi önbelleksiz, dondurulmuş dump'ı sıfırdan
tarayarak — üç çıktının üçünde de bayt-aynı:

| Dosya | sha256 |
| --- | --- |
| `classification.jsonl` | `6b36eced472ed73cb578cc0e37b4d04b22bac84e9e70fe78b394f5943df4ec96` |
| `analysis-form-extension.jsonl` | `ec70bc30160c1e4877884b273684e171cede237a0c7d1efcae7b3451cba9a0d7` |
| `report.json` | `2c73be618b91231dcdf3e4f04eef64ce1a75bdf2c9fa8f7ed46b3c48b372b58d` |

## Kapsam dışı bırakılanlar

* 77 429 tokenlık dump **yeniden üretilmedi**. `analysis-form-extension.jsonl`
  girdi tarafında bir extension'dır; seçici çıktısına yansıması için dump'ın
  ayrı bir turda yeniden üretilmesi gerekir. Yukarıdaki katkısallık kanıtı o
  turun mevcut her adayı koruyacağını şimdiden garanti eder.
* Production DB'ye yazılmadı; orijinal CAMeL DB salt-okunur açıldı.
* Dondurulmuş artefaktların hiçbiri değiştirilmedi.

## Çalıştırma

```
py -3.12 scripts/morphology/analyze-orthographic-only-v1.py
```

Çıktılar `data/candidates/morphology/orthographic-only-v1/` altındadır.
