# HAMZA_CARRIER kovası (42 token) — yalnız taşıyıcı düzeyinde genel kurallar

Soru dar: canonical Tanzil yüzeyine dokunmadan, **yalnız hamzanın taşıyıcısını**
değiştirerek CAMeL'in tanıdığı biçime ulaşan **genel** bir kural var mı?

## Sözleşme

Bir kural tek bir şey yapabilir: **bir hamza-ailesi codepoint'ini başka bir
hamza-ailesi codepoint'i ile değiştirmek.** Hamza silinemez, hamza-dışı bir
harfe katlanamaz, başka hiçbir harf veya hareke değişemez. Bu niyet değil,
koşul: her varyant için

* edit script tek-codepoint yer değiştirmesi mi,
* uzunluk korunuyor mu,
* değişen her konum hem öncesinde hem sonrasında taşıyıcı kümesinde mi,
* `invert()` girdiyi geri kuruyor mu

diye denetleniyor; sağlanmazsa çalışma durur.

Verse-key yok, yüzey allowlist'i yok, teacher-kapılı emisyon yok. Kural,
codepoint önkoşulu nerede sağlanıyorsa orada ateşlenir. Teacher yalnız
puanlamada okunur.

R1–R3 hamza kuralları, R1–R5 recall, selector ve O1a/O2a/O5 **değiştirilmedi**.
HC2, R2'nin kendi `_carrier_for` fonksiyonunu *çağırır* — R2'nin reddettiği bir
bağlamda; fonksiyon değiştirilmez.

## Dönüşüm aileleri

Aile yalnız yüzeydeki hamza bağlamından okunur.

| aile | token |
| --- | --- |
| `BARE_AFTER_LONG_ALEF_BEFORE_WAW` | **29** |
| `SEATED_WAW` (ؤ) | **7** |
| `BARE_AFTER_LONG_YEH` + `BARE_AFTER_SUKUN_GLIDE` | **2** |
| `SEATED_YEH` (ئ) | **2** |
| `BARE_AFTER_LONG_ALEF_OTHER` | **1** |
| `BARE_AFTER_LONG_YEH` | **1** |

## Aday kurallar ve ölçüm

Her kural hem 42 tokende hem de **korpusun geri kalanında ateşlendiği her
yüzeyde** ölçüldü. Negatif örneklemdeki risk ölçütü somut: dondurulmuş v1.7
seçiminde **zaten CORRECT olan** bir tokene, seçilenden farklı bir *lexical
core* veriyor mu?

| kural | kapsam içi ateşleme | teacher core'a ulaşan | uyumlu/uyumsuz aday | negatif yüzey | v1.7 CORRECT'e rakip core | verdict |
| --- | --- | --- | --- | --- | --- | --- |
| `HC1_BARE_AFTER_LONG_ALEF_BEFORE_WAW` | 29 | **29** | 86 / 29 | 8 | **0** | **PROPOSED** |
| `HC2_BARE_AFTER_SUKUN_GLIDE` | 2 | 2 | 42 / 6 | 17 | 9 | REJECTED |
| `HC3_BARE_AFTER_LONG_YEH` | 3 | 3 | 24 / 1 | 358 | 13 | REJECTED |
| `HC4X_WAW_SEAT_TO_YEH_SEAT` | 7 | 7 | 32 / 7 | 693 | 58 | REJECTED |
| `HC5X_YEH_SEAT_TO_ALEF_SEAT` | 2 | 2 | 18 / 88 | 919 | 178 | REJECTED |
| `HC6X_WAW_SEAT_TO_ALEF_SEAT` | 7 | **0** | 0 / 7 | 693 | 85 | REJECTED |

Verdict ölçütü tek ve herkese aynı uygulanıyor: kazanç yoksa reddet; kazanç
varsa ve **hiçbir** zaten-doğru tokene rakip core verilmiyorsa öner; rakip core
veriliyorsa, riske attığı doğru token sayısı kapattığından **fazlaysa** reddet,
değilse ertele. Bu turda hiçbir kural erteleme bandına düşmedi. Allowlist ile
daraltma seçenek değil.

### Birden fazla lexical core üreten dönüşümler

| kural | >1 yeni core üreten token |
| --- | --- |
| HC1 | 29 / 29 |
| HC2 | 2 / 2 |
| HC3 | 3 / 3 |
| HC4X | 7 / 7 |
| HC5X | 2 / 2 |
| HC6X | 0 / 7 |

Kapsam içinde her kural token başına birden fazla yeni core üretiyor — bu tek
başına diskalifiye değil, çünkü havuzlar zaten çok adaylı ve seçiciyi R1–R5
kararlaştırıyor. Ayırt edici sinyal negatif örneklemdeki **rakip core** sayısı:
HC1'de 0, diğerlerinde 9–178.

## Genel kuralla kapanabilecek tokenlar

**29 token** — tamamı `HC1`, `جَآءُو` / `جَآءُوكَ` / `جَآءُوهَا` / `فَجَآءُوهُم` /
`وَجَآءُو` ve `يَشَآءُونَ` / `تَشَآءُونَ` aileleri. 29/29 teacher core'a ulaşıyor.

`HC1`'in özgüllüğü dikkate değer: koşul (kısa ünlü taşımayan elif + bare hamza +
ardından vav) korpusun geri kalanında yalnız **8 yüzeyde** ateşleniyor, 20 aday
ekliyor ve zaten doğru olan hiçbir tokene rakip core vermiyor.

Bu, önceki turlarda `جَآءُو` ailesi için verilen iki yanlış teşhisi de kapatıyor:
paradigma boşluğu değil (v1'de öyle demiştim, düzeltildi), atıl elif eksikliği de
değil (`O4X` reddedildi) — **taşıyıcı** meselesi.

## Güvenli / riskli / çözülemeyen

| grup | token | içerik |
| --- | --- | --- |
| **güvenli** | **29** | HC1 ailesi |
| **riskli** | **12** | HC2/HC3 ile ulaşılan 3 (`ٱسْتَيْـَٔسَ`, `ٱسْتَيْـَٔسُوا۟`, `سِيٓـَٔتْ`), HC4X ile ulaşılan 7 (`يَبْدَؤُا۟` ×6, `يُنَبَّؤُا۟`), HC5X ile ulaşılan 2 (`ٱئْتُوا۟`) — hepsi reddedilen kurallarla ulaşılıyor |
| **çözülemeyen** | **1** | `تَسَآءَلُونَ` (4:1:21), lemma `يَتَساءَلُ` — hiçbir taşıyıcı kuralı teacher core'a ulaşmıyor |

Riskli gruptaki 12 token için allowlist eklenmedi. `يَبْدَؤُا۟` ailesi ayrıca
taşıyıcı-dışı bir şeye ihtiyaç duyuyor: MSA `يبدأ`, Uthmani `يَبْدَؤُا۟` — sessiz
elif de düşmeli, o kural (`O3`) v1.7'de çekilmişti.

## Önerilen production kuralı

Tek kural:

```
HC1_BARE_AFTER_LONG_ALEF_BEFORE_WAW
  U+0621 -> U+0624
  koşul: önceki harf U+0627 / U+0622 / U+0671 olacak ve kısa ünlü taşımayacak,
         sonraki harf U+0648 olacak
```

Gerekçe: Uthmani `جَآءُو`'da hamzayı satırda bırakır; MSA, ardından vav gelince
taşıyıcıyı vav yapar (`جاؤوا`). Dondurulmuş R2 bu bağlamı bilerek reddeder
(uzun ünlüden sonraki hamzayı satırda bırakır), dolayısıyla bu R2'ye yapılmış
bir değişiklik değil, R2'nin girmediği yeni bir bağlam.

Bu tur kuralı **uygulamadı**: dump üretilmedi, selector çalıştırılmadı. Öneri,
kendi kabul turunda v1.7 seçimine karşı ölçülmeli.

## Determinizm

İki bağımsız çalışma, üç dosyanın üçü bayt-aynı:

| dosya | sha256 |
| --- | --- |
| `classification.jsonl` | `77456c423c5d341a8a35540601b5674df70825d2461629aefbaf4e96b180a9d3` |
| `report.json` | `5cef2bd11371fcdae8698c794d1e8300759b8f81…` |
| `checksums.json` | `bb7152331b9fd6d5f239a0802a6aecd11cd894f1…` |

## Kapsam dışı

Production DB'ye yazılmadı, selector çalıştırılmadı, dondurulmuş dump'lara
dokunulmadı, 77.429'luk dump yeniden üretilmedi.

## Çalıştırma

```
py -3.12 scripts/morphology/analyze-hamza-carrier-v1.py
```
