# vNext Structured Term Parse Pilot

Bu pilot, vNext Evidence Layer icindeki keyTerm `value` string'lerini audit-only olarak yapilandirilmis parcalara ayirir. Runtime, UI, default source, classifier kararlari, v4 default, kaynak veri, Batch 2 ve overlay degistirilmedi.

## Value Yapisi

Gozlenen yaygin yapi:

- `Arapca yuzey | lemma/kok adayi | Turkce display meaning`
- `Arapca yuzey | lemma/kok adayi` (Turkce anlam eksik)

Parser bu formati okuyup su alanlari cikarmaya calisir:

- `rawValue`
- `displayValue`
- `arabicSurface`
- `root`
- `lemma`
- `displayMeaning`
- `normalizedMeaning`
- `parseConfidence`
- `parseWarnings`

## Ozet

- Islenen ayet: 6236
- Hata: 0
- Matrix unknown conflict: 4461
- Unique matrix unknown term: 2874
- Parsed unknown conflict: 4461
- Arabic surface cikarilan: 4461
- Root cikarilan: 3670
- Lemma cikarilan: 4453
- Display meaning cikarilan: 4403

## Parse Confidence Dagilimi

- `high`: 4395
- `medium`: 66
- `low`: 0

## Parse Warning Dagilimi

- `root_lemma_ambiguous`: 3670
- `root_not_inferred`: 783
- `missing_display_meaning`: 58
- `display_value_is_arabic`: 58
- `missing_lemma_or_root`: 8

## Top Unknown Gruplarda Parser Ciktisi

| Term | Count | Confidence | Arabic Surface | Lemma | Root | Display Meaning | Warnings |
|---|---:|---|---|---|---|---|---|
| `çatıları` | 11 | high | `ٱلۡعَرۡشِ` | `عَرْش` | `عَرْش` | `çatıları` | root_lemma_ambiguous |
| `رَحْمٰن` | 10 | medium | `ٱلرَّحۡمَٰنِ` | `رَحْمٰن` | `رَحْمٰن` | `-` | root_lemma_ambiguous, missing_display_meaning, display_value_is_arabic |
| `gören` | 10 | high | `بَصِيرُۢ` | `بَصِير` | `بَصِير` | `gören` | root_lemma_ambiguous |
| `onları üzer` | 10 | high | `سَآءَ` | `ساءَ` | `ساءَ` | `onları üzer` | root_lemma_ambiguous |
| `eş, çift` | 8 | high | `أَزۡوَٰجٗا` | `زَوْج` | `زَوْج` | `eş, çift` | root_lemma_ambiguous |
| `oğlum` | 8 | high | `بَنِيٓ` | `بُنَىّ` | `بُنَىّ` | `oğlum` | root_lemma_ambiguous |
| `şiddetli` | 8 | high | `شَدِيدُ` | `شَدِيد` | `شَدِيد` | `şiddetli` | root_lemma_ambiguous |
| `müstağni` | 7 | high | `ٱلۡغَنِيُّ` | `غَنِيّ` | `غَنِيّ` | `müstağni` | root_lemma_ambiguous |
| `seçilmiş` | 7 | high | `ٱلۡمُخۡلَصِينَ` | `مُخْلَص` | `مُخْلَص` | `seçilmiş` | root_lemma_ambiguous |
| `savaş` | 7 | high | `بَأۡسُنَا` | `بَأْس` | `بَأْس` | `savaş` | root_lemma_ambiguous |
| `acele istemek` | 7 | high | `تَسۡتَعۡجِلُونَ` | `اسْتَعْجَلَ` | `-` | `acele istemek` | root_not_inferred |
| `yücelmek` | 7 | high | `وَتَعَٰلَىٰ` | `تَعالَى` | `-` | `yücelmek` | root_not_inferred |
| `kuşattı` | 7 | high | `وَحَاقَ` | `حاقَ` | `حاقَ` | `kuşattı` | root_lemma_ambiguous |
| `geride kalanlar` | 6 | high | `ٱلۡغَٰبِرِينَ` | `غابِر` | `غابِر` | `geride kalanlar` | root_lemma_ambiguous |
| `apaçık` | 6 | high | `ٱلۡمُبِينُ` | `مُبِين` | `مُبِين` | `apaçık` | root_lemma_ambiguous |
| `Müşrik` | 6 | high | `ٱلۡمُشۡرِكِينَ` | `مُشْرِك` | `مُشْرِك` | `Müşrik` | root_lemma_ambiguous |
| `Şer` | 6 | high | `ٱلشَّرَّ` | `شَرّ` | `شَرّ` | `Şer` | root_lemma_ambiguous |
| `oğul` | 6 | high | `أَبۡنَآءَهُمُۘ` | `ابْن` | `ابْن` | `oğul` | root_lemma_ambiguous |
| `kapı` | 6 | high | `أَبۡوَٰبَ` | `باب` | `باب` | `kapı` | root_lemma_ambiguous |
| `sığınmak` | 6 | high | `أَعُوذُ` | `عُذْ` | `عُذْ` | `sığınmak` | root_lemma_ambiguous |

## Teshis

- Unknown terimlerin buyuk kismi parse edilebilir parcalara sahip: Arapca yuzey ve lemma/kok adayi genelde ayrilabiliyor.
- En buyuk sorun parser degil, mevcut classifier'in bu yapilandirilmis alanlari kullanmamasi.
- Root alani temkinli tutuldu; lemma/kok adayi kisa ise root olarak da isaretlendi ve `root_lemma_ambiguous` uyarisi verildi.
- Turkce display meaning eksik olan kayitlar ayrica `missing_display_meaning` ile gorunur hale geldi.

## Unknown Dusurmek Icin En Iyi Sonraki Adim

Classifier'a genis string rule eklemek yerine, bu parser'i once audit classifier'da kullanarak kucuk bir structured-classification pilotu yapmak en guvenli yol. Sonra sadece parse confidence'i `high` veya `medium` olan ve displayMeaning'i temiz gorunen gruplardan yeni karar batch'i uretilmeli.
