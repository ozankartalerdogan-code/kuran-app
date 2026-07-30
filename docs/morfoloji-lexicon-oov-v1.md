# Lexicon/paradigma OOV grubu — yeniden sınıflandırma ve ilk güvenli genişletme

Bu belge v1.5 sonrası kalan gerçek lexicon/paradigma OOV grubunu ele alır.
Segmentasyon kuralı **eklenmez**; v1.5'in clitic-split sözleşmesi dokunulmadan
kalır.

## v1.5 dondurma

`scripts/morphology/resources/frozen-v1_5-manifest.json`, v1.4 manifestinden
zincirlenir (`chains_from` alanı önceki manifesti sha256 ile işaret eder) ve şunları
ekler: `select-camel-candidate-v1_5.py`, `camel_clitic_split_rules.py`,
`analyze-clitic-split-residual.py`, v1.5 çıktı dosyaları. Toplam 18 artefakt
sabittir. `سُوَاعًا` politikası ve kök-tahmin-yok kuralı miras alınır.

## Kapsam

* v1.5 altında hâlâ `RECALL_GAP` olan L7B/L7C/L7D residual tokenları: **533**
* v1.5'in açık bıraktığı segmentasyon tokenları: **82**
* Toplam: **615**

## Yeniden sınıflandırma

`scripts/morphology/classify-lexicon-oov.py`. Her token tam olarak bir kovaya
girer (teacher yalnız raporlama oracle'ı):

| Kova | Token | Anlamı |
| --- | --- | --- |
| `UNCLASSIFIED` | 298 | Aşağıdakilerin hiçbiri |
| `ORTHOGRAPHIC_ONLY` | 120 | Donmuş bir ortografik prob zaten analiz edilebilir kılıyor — CAMeL kelimeyi biliyor, Uthmani imla gizliyor. Lexicon sorunu değil. |
| `SEGMENTATION_RESIDUAL` | 82 | v1.5 clitic-split sözleşmesinin açık bıraktığı. Yeni kural eklenmez. |
| `DERIVABLE_PARADIGM_GAP` | 80 | Yüzey, CAMeL'in üretken kullandığı bir gövde şablonuyla, CAMeL'in zaten temel fiil taşıdığı bir kökten birleşiyor. Paradigma genişletmesiyle kapatılabilir. |
| `LEXICAL_ENTRY_GAP` | 35 | Ne lemma ne kök CAMeL'de. Yalnız bağımsız kaynaktan yeni girdi yazarak kapatılır — otomasyon dışı. |

Residual seviye kırılımı: L7C (lemma-known) neredeyse tamamen ortografik
(80 ORTHOGRAPHIC), L7D (root-known-lemma-absent) gerçek türetme boşluğu
(33 DERIVABLE), L7B (lexicon OOV) çoğunlukla gerçek entry boşluğu (35 LEXICAL).

### Kök politikası

Kök **tahmin edilmez**. `DERIVABLE_PARADIGM_GAP`'te kök, yüzeyi bir CAMeL şablonuyla
birleştirmekten *düşer* ve CAMeL'de zaten en az bir temel fiil lexeme'iyle var olması
**zorunludur**. CAMeL'in bilmediği bir kök reddedilir. Zayıf/hemzeli kökler dışlanır:
CAMeL şablonları bunlarda round-trip yapmıyor (`ش.ه.و` + `ٱِ1ْتِ2َا` → `ٱِشْتِهَاء`,
`ٱِشْتِهَا` değil), üretmek biçim uydurmak olurdu.

## Aynı lemma/çekim ailesinde gruplama

`data/candidates/morphology/lexicon-oov/families.json`. Tekrarlayan Kur'an yüzeyleri
üretilen lexeme + kök + pos ile gruplanır. En büyükleri: `مُكَذِّب` (ك.ذ.ب),
`دَاخِر` (د.خ.ر), `مَحِيض` (م.ح.ض), `صَبَّار` (ص.ب.ر).

## Güvenli ilk küme

`safe_for_extension` = `DERIVABLE_PARADIGM_GAP` **ve** türetme tek (iki şablon
farklı lexeme veremez) **ve** yüzeyin gövdeden farkı yalnız **sağlam eril
çoğul/ikil eki** (`ين`/`ون`). Boş veya dişil ek durumunda gövde tüm kelimedir ve
CAMeL'in gövde envanteri ile QAC'nin tekil-lemma sözleşmesi meşru biçimde
ayrışabilir (`زُرُوع` vs `زَرْع`, `مُسافِحَة` vs `مُسافِح`) — bunu hiçbir yüzey delili
çözmez. Eril çoğul/ikil eki ise saf uyumdur, lexeme'e ait değildir; CAMeL'in kendi
`form_gen`/`form_num` alanlarından okunur.

Sonuç: **54 token, 35 lexeme**, hepsinin üretilen lexeme'i attested lemma ile
birebir (54/54 — teacher yalnız doğrulama için).

## Uygulanan aday lexicon extension

`scripts/morphology/build-camel-lexicon-extension.py`. Her eksik lexeme için bir
STEM girdisi üretir ve CAMeL veritabanının **genişletilmiş bir kopyasını** yazar.
Orijinal DB'ye dokunulmaz.

Üretim, yazım değil:
* `diac`/`lex` = şablonun kökle instantiate edilmesi;
* `root` = birleştirmenin çıkardığı ve CAMeL'de temel fiili olan kök;
* `stemcat` = aynı şablonu kullanan attested prototipin kategorisi — çekim ve
  klitik davranışını CAMeL sağlar;
* `gloss` prototipten **miras alınmaz** (doğrulanmamış anlam iddia etmemek için),
  `GENERATED_PARADIGM_EXTENSION` işaretiyle yazılır; `caphi` boşaltılır.

### Doğrulama (yazımdan önce)

* Şablon, kapsadığı her sağlam-kök girdisini round-trip etmeli;
* Üretilen girdi kendi `diac`'ını yeniden üretmeli;
* Lexeme o kök altında zaten bulunmamalı;
* Genişletilmiş DB yüklenebilmeli ve analizör, girdiyi motive eden yüzeyler için
  üretilen lexeme'i döndürmeli. **Hiçbir motive edici yüzeyi analiz edilebilir
  kılmayan girdi düşürülür** (5 lexeme böyle düştü).

### Korpus geneli katkısallık (kabul kapısı)

"Mevcut doğrular değişmesin, yeni yanlış 0" kaynakta kanıtlanır: korpusun içerdiği
**17 049 ayrık yüzeyin tamamında**, genişletilmiş analizör (a) temel analizörün
verdiği her analizi korur — hiçbiri kaldırılmaz/değiştirilmez — ve (b) üretilen
lexeme'ler dışında hiçbir şey eklemez. İkisi de sağlandığından korpustaki hiçbir
mevcut aday havuzu değişemez, dolayısıyla hiçbir önceki seçim dönemez.

```
"analyses_removed_or_altered": [],
"additions_outside_generated_lexemes": [],
"purely_additive": true
```

## Sonuçlar

| Ölçüt | Sonuç |
| --- | --- |
| Yeniden sınıflanan token | 615 (533 OOV + 82 residual) |
| Güvenli ilk küme | 54 token / 35 lexeme |
| Yazılan girdi | 30 lexeme (5'i yüzey doğrulamasında düştü) |
| Kapsanan token (yüzey analiz edilebilir) | 44 / 54 |
| Korpus geneli katkısallık | **saf katkısal** (17 049 yüzey, 0 kaldırma, 0 yabancı ekleme) |
| Mevcut doğrular | değişemez (kaynakta kanıtlı) |
| Yeni yanlış | 0 |
| Determinizm | classifier ve builder iki çalışmada bayt-aynı |
| Production DB | yazılmadı; orijinal CAMeL DB dokunulmadı |

## Not — "uygulama"nın kapsamı

Seçiciler adayları önceden hesaplanmış `full-analysis/*.jsonl.gz` dökümünden okur.
Genişletmenin seçici çıktısına yansıması için bu döküm genişletilmiş DB ile yeniden
üretilmelidir (ayrı, uzun bir adım). Bu belgedeki katkısallık kanıtı, o yeniden
üretimin mevcut her analizi koruyup yalnız üretilen lexeme'leri ekleyeceğini şimdiden
garanti eder — yani güvenli. Genişletilmiş DB
`data/candidates/morphology/lexicon-extension-v1/` altındadır.

## Çalıştırma

```
.venv/Scripts/python.exe scripts/morphology/classify-lexicon-oov.py
.venv/Scripts/python.exe scripts/morphology/build-camel-lexicon-extension.py
```
