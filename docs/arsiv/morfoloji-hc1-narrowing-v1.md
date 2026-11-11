# HC1 daraltma ve kompozisyon — HC1a ve HC1_PLUS_O4

HC1 mevcut haliyle uygulanmadı. Sebep önceki turda bulundu: HC1'in "29 token"
rakamı, "kök eşleşiyor ve lemma boş değil"i başarı sayan bir ölçütten geliyordu.
Sıkı (lemma+kök+POS tam) ölçümle 42 tokenin 20'si kapanıyor, 9'u yalnız kök
eşleştiriyor — çünkü `جاؤو` CAMeL'de **sıfat** `جَائِي` veriyor, fiil `جَاء`
vermiyor.

Bu tur o 9 tokeni ikiye ayırdı: kuralı daralt, ve eksik kalan parçayı ayrı bir
kural olarak değil **tek birleşik edit-script** olarak ekle.

## Kurallar

### `HC1a` — daraltma

```
U+0621 -> U+0624
koşul: önceki harf U+0627/U+0622/U+0671, kısa ünlü taşımıyor
       sonraki harf U+0648
       ve o vav'dan sonra, kelime sonundaki atıl eliften ibaret olmayan
       gerçek bir harf geliyor
```

Çıplak sonlu `جَآءُو` / `وَجَآءُو` / `وَجَآءُوٓ` biçimlerinde **ateşlenmiyor**. Koşul
yalnız codepoint komşuluğu; yüzey listesi veya verse-key yok.

### `HC1_PLUS_O4` — kompozisyon

Aynı HC1 bölgesinde, vav kelime sonundaysa iki edit **tek script** olarak
çıkıyor: taşıyıcı `U+0621 -> U+0624` ve vav'dan sonra `U+0627` eklenmesi.

O4X bağımsız kural olarak diriltilmedi ve diriltilemez: elif edit'inin kendi
tetikleyicisi yok, yalnız aynı scriptteki taşıyıcı edit'iyle birlikte üretiliyor
ve `bound_to_carrier_at` alanıyla ona bağlanıyor. Betik, bağsız bir elif edit'i
görürse durur.

Her iki kuralda da edit'ler kaynak offset'leriyle açık ve `invert()` girdiyi geri
kuruyor; taşıyıcı edit'inin hem silinen hem eklenen codepoint'i taşıyıcı
kümesinde olmak zorunda — üçü de assert.

## Ölçüm

| | `HC1a` | `HC1_PLUS_O4` |
| --- | --- | --- |
| kapsam içi ateşleme | 20 | 9 |
| **exact lemma+kök+POS** | **20** | **9** |
| yalnız yanlış lemma adayı kalan token | 0 | 0 |
| negatif korpusta tetiklenen yüzey | **2** | **4** |
| eklenen aday (negatif) | 4 | 13 |
| **v1.7 CORRECT tokenlara rakip core** | **0** | **0** |

Kapanan yüzeyler — `HC1a`: `جَآءُوكَ` 5, `يَشَآءُونَ` 5, `جَآءُوهَا` 3, `تَشَآءُونَ` 2,
`جَآءُوكُمْ` 2, `فَجَآءُوهُم` 2, `جَآءُوكُم` 1. `HC1_PLUS_O4`: `جَآءُو` 6, `وَجَآءُو` 2,
`وَجَآءُوٓ` 1.

### Çakışma

**Yok.** İki kuralın birlikte ateşlendiği token sayısı 0, ikisinin birden
kapattığı token sayısı 0. Koşullar tanım gereği birbirini dışlıyor: biri vav'dan
sonra gerçek ek isterken diğeri vav'ın kelime sonu olmasını istiyor.

## Kabul kapıları

| kapı | HC1a | HC1_PLUS_O4 |
| --- | --- | --- |
| mevcut doğru tokenlara rakip core = 0 | ✓ | ✓ |
| yalnız yanlış lemma adayı kalan token = 0 | ✓ | ✓ |
| exact kazanç > 0 | ✓ | ✓ |

**Her iki kural da `PROPOSED_FOR_PRODUCTION`.**

### Açıkça kaydedilen sınır

Kapanan 29 tokenin **hepsi**, doğru adayın yanında en az bir yanlış-lemma adayı
da alıyor (fiil `جَاء` ile birlikte sıfat `جَائِي`). Kapı "yalnız yanlış lemma
kalan token = 0" olarak uygulandı, "hiç yanlış lemma adayı eklenmesin" olarak
değil — ikincisi bu korpusta hiçbir kuralın geçemeyeceği bir eşik, çünkü havuzlar
zaten çok adaylı ve ayrımı R1–R5 cascade'i yapıyor. Bu sınırı kapının yeşiline
saklamak yerine buraya yazıyorum; daha katı bir eşik istenirse iki kural da
reddedilir.

## Final full-dump paketi

| kalem | token |
| --- | --- |
| `HC1a` ile güvenli kapanacak | **20** |
| `HC1_PLUS_O4` ile güvenli kapanacak | **9** |
| **beklenen toplam kesin kapanış** | **29** |
| HAMZA_CARRIER kovasında dışarıda kalan | 13 |

Dışarıda kalan 13 token yalnız reddedilen kurallarla (HC2/HC3/HC4X/HC5X) veya
hiçbir taşıyıcı kuralıyla ulaşılabiliyor; bu turda hiçbiri diriltilmedi.

## Kapsam dışı

Full dump üretilmedi, selector çalıştırılmadı, allowlist/verse-key/selector
değişikliği yok, production DB'ye ve dondurulmuş artefaktlara dokunulmadı.

## Determinizm

İki bağımsız çalışma, üç dosyanın üçü bayt-aynı:

| dosya | sha256 |
| --- | --- |
| `tokens.jsonl` | `05ee2473e4b72aab662e9ad5b97414a650d74ad29025c571a9ec06f04d611726` |
| `report.json` | `cd32badce506d945e909aea04d6ae4ca60bc10109638c270f1ed7f46a67b3d1c` |

## Çalıştırma

```
py -3.12 scripts/morphology/analyze-hc1-narrowing-v1.py
```
