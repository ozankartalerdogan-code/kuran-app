# PARADIGM_GAP kovası (44 token) — mevcut lexeme'den türetilebilir gövde araması

Bu tur tek bir soruyu sorar: bu 44 tokende **eksik olan şey, CAMeL'in zaten
sahip olduğu bir lexeme'in bir çekim gövdesi mi?** Cevap ölçüldü ve **hayır**.

## Dondurma

Önce `frozen-orthographic-production-v1_7-manifest.json` doğrulanır (19 artefakt),
sürüklenme varsa çalışma başlamaz. Bu turda **hiçbir şey dondurulmuş artefakta
yazmaz**; CAMeL DB ve dump'lar salt-okunur açılır, production DB'ye
dokunulmaz, 77.429'luk dump yeniden üretilmez.

## Kabul ölçütü

Bir token ancak yüzey, **CAMeL'in kendi ek envanterine göre**

```
[proklitik] + GÖVDE + EK
```

biçiminde ayrıştığında aday olur:

* **EK açık bir paradigma bildirmeli** — CAMeL'in kendi alanlarında `form_num` ∈
  {d, p} veya `form_gen` ∈ {m, f}. Boş ek reddedilir: görünür bir ek yoksa
  yüzeyden okunacak bir paradigma da yoktur, gövde tüm kelime olur. Enklitik
  taşıyan ekler (zamir) dışlanır — zamir çekim değildir.
* **GÖVDE, CAMeL'in zaten sahip olduğu bir stem girdisinin `diac`'ı olmalı.**
  Lexeme uydurulmaz; kök de uydurulmaz, o girdiden **kopyalanır**.
* **Tam olarak BİR (lex, kök) hayatta kalmalı.** İki aday lexeme varsa yüzey
  lexeme'i belirlemiyordur; token tercihle çözülmez, düşürülür.

İki eşleştirme rejimi ayrı ayrı ölçüldü:

| rejim | tanım | statü |
| --- | --- | --- |
| `VOCALIZED` | gövde, girdinin `diac`'ına dondurulmuş normalize seslendirmede eşit | **kabul rejimi** |
| `LETTERS_ONLY` | gövde yalnız harf iskeletinde eşit | raporlanır, tek başına kabul edilmez |

`LETTERS_ONLY` ayrıca ölçüldü çünkü ünlüleri atmak bir yüzeyin alakasız
stem'lerle eşleşmesine izin veriyor; hayatta kalanı yine de üretime sokup yüzey
doğrulamasından geçirdik, böylece bu gevşekliğin ne ürettiği raporda görünüyor.

## 44 tokenın paradigma türüne göre dağılımı

Tür yalnız yüzeyin sonundan okunur, betimleyicidir.

| yüzey paradigma türü | token |
| --- | --- |
| `VERB_PLURAL_WAW` (`ـوا` / `ـو`) | **20** |
| `NO_OVERT_NUMBER_OR_GENDER_ENDING` | **17** |
| `SOUND_MASC_PLURAL` (`ـون` / `ـين`) | **7** |
| `SOUND_FEM_PLURAL`, `DUAL`, `FEMININE_TA_MARBUTA` | 0 |

Tür × sonuç:

| token | tür | sonuç |
| --- | --- | --- |
| 16 | VERB_PLURAL_WAW | CAMeL'de gövde yok |
| 12 | açık ek yok | CAMeL'de gövde yok |
| 6 | SOUND_MASC_PLURAL | CAMeL'de gövde yok |
| 4 | VERB_PLURAL_WAW | belirsiz lexeme, düşürüldü |
| 4 | açık ek yok | güvenli türetme (aday) |
| 1 | açık ek yok | belirsiz lexeme, düşürüldü |
| 1 | SOUND_MASC_PLURAL | belirsiz lexeme, düşürüldü |

## Güvenli türetilebilen token ve lexeme sayısı

| ölçüt | `VOCALIZED` (kabul) | `LETTERS_ONLY` (rapor) |
| --- | --- | --- |
| CAMeL'de açık paradigma altında gövde yok | **34** | 21 |
| belirsiz lexeme, düşürüldü | **6** | 22 |
| güvenli türetme | **4** | 1 |
| ayrık lexeme | **1** | 1 |

`VOCALIZED` rejimindeki 4 güvenli tokenın 3'ü üretimden **önce** düştü:
`بِئْسَمَا` ×3, `بِئْس` + `ما` (NUM_D) olarak ayrışıyor ama CAMeL'de bu eki lisanslayan
**hiçbir attested kategori yok** — `NO_ATTESTED_CATEGORY_LICENSES_THIS_SUFFIX`.
Kategori uydurulmadığı için türetme kendiliğinden durdu.

## Üretilen aday girdiler

İki aday girdi yazıldı (`camel_morph_msa_v1.0+paradigm-stem-v2.CANDIDATE.db`).
Her biri kaynak stem satırının klonudur: `diac`/`lex`/`root` kopyalanır, `gloss`
`GENERATED_PARADIGM_STEM_V2` ile değiştirilir, `caphi` boşaltılır, kategori aynı
POS'lu attested bir prototipten **ödünç alınır**.

| kaynak lemma | kaynak stem | üretilen gövde | paradigma | ödünç kategori | motive eden token |
| --- | --- | --- | --- | --- | --- |
| `مَات-ُ` (م.و.ت) | `مُت` (X00151) | `مت` | NUM_P_GEN_M | X00413 (`ٱِفْتَأَت`) | 61:8:7 `مُتِمُّ` |
| `تَغَابَى` (غ.ب.ي) | `تَغَاب` (X00381) | `تغاب` | NUM_P_GEN_F | X00418 (`ٱِئْتَكَل`) | 64:9:7 `ٱلتَّغَابُنِ` |

## Yüzey doğrulamasında düşenler — 2/2

Doğrulama makinede: motive eden yüzey, genişletilmiş DB ile **üretilen lexeme'i
döndürmeli** ve o analizin kökü teacher köküyle **uyuşmalı**. Teacher yalnız
burada, değerlendirme oracle'ı olarak kullanılır; hangi tokene türetme
uygulanacağını asla belirlemez.

| girdi | verdict | neden |
| --- | --- | --- |
| `تَغَابَى` / غ.ب.ي | `DROPPED_ROOT_DISAGREES_WITH_TEACHER` | `ٱلتَّغَابُنِ`'nin teacher kökü **غبن**, üretilen girdinin kökü **غ.ب.ي**. Ayrıca token bir isim; eşleşme onu dişil-çoğul fiil eki taşıyan bir fiil olarak okuyor. |
| `مَات-ُ` / م.و.ت | `DROPPED_SURFACE_STILL_NOT_ANALYZABLE` | `مُتِمُّ`'nün teacher lemması `مُتِمّ`, kökü **تمم**. Eşleşme onu "ölmek" fiilinin `مُت` gövdesi + tek harflik `م` çoğul eki olarak okuyor; girdi yazıldıktan sonra bile yüzey bu lexeme ile analiz edilemiyor. |

**Kabul edilen girdi: 0. Kabul edilen lexeme: 0.**

## Yalnız üretilen lexeme'lerde aday eklendiğinin kanıtı

Kabul edilen küme boş olduğundan sevk edilebilir extension boştur ve hiçbir
havuzu değiştiremez:

```
"additivity_small_scope_accepted": {
  "entries": 0, "analyses_removed_or_altered": 0,
  "additions_outside_generated_lexemes": 0, "purely_additive": true
}
```

Reddedilen **aday** DB ise ayrıca ölçüldü — korpusun **18.993 ayrık canonical
yüzeyinin tamamında**, analizör ile (dump gerekmeden):

```
"surfaces_checked": 18993,
"analyses_removed_or_altered": 0,
"additions_outside_generated_lexemes": 27,
"purely_additive": false
```

Hiçbir mevcut analiz kaybolmuyor, ama aday DB **üretilen lexeme'ler dışında** 27
aday sızdırıyor — `أَمَتَّنَا`, `أَمْتًا` gibi ilgisiz yüzeylere `مَات` altında. Yani
bu adayları sevk etmemek için yüzey doğrulamasından bağımsız **ikinci** bir
gerekçe var. Aday DB kanıt olarak `.CANDIDATE.db` adıyla duruyor; production
adayı değildir.

## Sonraki toplu full-dump turunda beklenen kapanış

**0 token.** Kabul edilen girdi olmadığı için yeniden üretilecek bir dump farkı
yok. Bu turda dump üretilmedi.

## Determinizm

İki bağımsız çalışma (ayrı çıktı dizinleri), dört dosyanın dördü bayt-aynı:

| dosya | sha256 |
| --- | --- |
| `classification.jsonl` | `0f554ec040819257bd6f77f0e03623f2f96690864f604985c9a8922e164a2a68` |
| `report.json` | `525aa6b1184a0876c2029e756d0e1ac0ce4aa42d…` (checksums.json'da tam) |
| `checksums.json` | `3850dd55b7289e98afd2f8b17334c9e543ab2c44…` |
| `…+paradigm-stem-v2.CANDIDATE.db` | `511cfae2a0c99dc7a9486ea5583bc58a69f7a5de…` |

## Bu sonucun anlamı

`PARADIGM_GAP` kovası, sınıflandırıcının tanımı gereği "teacher lemması korpusta
erişilebilir **veya** teacher kökü CAMeL'de temel fiil taşıyor" demekti. İkinci
şık bu 44 tokenın çoğunu buraya koydu — yani **kök** biliniyor, **lexeme
bilinmiyor**. Bu turun ölçtüğü şey daha dar bir iddiaydı: eksik olan, var olan
bir lexeme'in bir gövdesi mi? Değil.

CAMeL'de bulunamayan gövdeler doğrudan raporda listeli: `هزو`, `تنابز`,
`يستعتب`, `تسترضع`, `يستاخر`, `اركس`, `لناكب`, `التغاب`, `تضاروه`, `ادارا`,
`ياليت` … Bunlar çekim boşluğu değil, **sözlük girdisi boşluğu**. Kapanmaları
için bağımsız bir kaynaktan lemma yazılması gerekir — bu hattın otomasyon
kapsamı dışında, ve `LEXICON_OOV` kovasıyla aynı muameleyi hak ediyor.

## Çalıştırma

```
py -3.12 scripts/morphology/freeze-orthographic-production-v1_7.py
py -3.12 scripts/morphology/analyze-paradigm-gap-v2.py
```
