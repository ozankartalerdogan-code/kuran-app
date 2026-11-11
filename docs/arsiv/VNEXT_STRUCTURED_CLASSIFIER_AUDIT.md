# vNext Structured Classifier Audit

Bu audit, structured term parser ciktisini kullanarak mevcut classifier'i degistirmeden unknown siniflandirma potansiyelini olcer. Runtime, UI, default source, classifier kararlari, v4 default, kaynak veri, Batch 2 ve overlay degistirilmedi.

## Ozet

- Matrix unknown conflict: 4461
- Unique unknown group: 100
- Guvenle siniflandirilabilir conflict: 129
- Guvenle siniflandirilabilir oran: %2.89
- Tahmini needsManualReview azalmasi: 129
- Tahmini kalan needsManualReview: 6010

## TermClass Dagilimi

- `keep_unknown`: 381
- `content`: 112
- `profile_bound`: 28
- `generic`: 17

## ResolutionCandidate Dagilimi

- `keep_manual`: 381
- `useful_addition_candidate`: 74
- `risky_drop_candidate`: 38
- `profile_dependent_manual`: 28
- `drop_debug`: 17

## ReasonCode Dagilimi

- `no_structured_rule_match`: 361
- `content_meaning`: 112
- `profile_bound_meaning`: 28
- `missing_or_low_confidence_parse`: 20
- `generic_meaning`: 17

## En Sik Structured Siniflandirma Ornekleri

| Term | Count | termClass | resolutionCandidate | reason | displayMeaning |
|---|---:|---|---|---|---|
| `çatıları` | 11 | generic | drop_debug | generic_meaning | çatıları |
| `رَحْمٰن` | 10 | keep_unknown | keep_manual | missing_or_low_confidence_parse | - |
| `gören` | 10 | profile_bound | profile_dependent_manual | profile_bound_meaning | gören |
| `onları üzer` | 10 | content | useful_addition_candidate | content_meaning | onları üzer |
| `eş, çift` | 8 | content | risky_drop_candidate | content_meaning | eş, çift |
| `oğlum` | 8 | content | risky_drop_candidate | content_meaning | oğlum |
| `şiddetli` | 8 | profile_bound | profile_dependent_manual | profile_bound_meaning | şiddetli |
| `müstağni` | 7 | content | useful_addition_candidate | content_meaning | müstağni |
| `seçilmiş` | 7 | content | useful_addition_candidate | content_meaning | seçilmiş |
| `savaş` | 7 | content | useful_addition_candidate | content_meaning | savaş |
| `acele istemek` | 7 | content | useful_addition_candidate | content_meaning | acele istemek |
| `yücelmek` | 7 | content | useful_addition_candidate | content_meaning | yücelmek |
| `kuşattı` | 7 | content | useful_addition_candidate | content_meaning | kuşattı |
| `geride kalanlar` | 6 | content | useful_addition_candidate | content_meaning | geride kalanlar |
| `apaçık` | 6 | generic | drop_debug | generic_meaning | apaçık |
| `Müşrik` | 6 | content | risky_drop_candidate | content_meaning | Müşrik |
| `Şer` | 6 | content | risky_drop_candidate | content_meaning | Şer |
| `oğul` | 6 | content | risky_drop_candidate | content_meaning | oğul |
| `kapı` | 6 | content | useful_addition_candidate | content_meaning | kapı |
| `sığınmak` | 6 | content | useful_addition_candidate | content_meaning | sığınmak |
| `çoğu, daha fazla` | 6 | keep_unknown | keep_manual | no_structured_rule_match | çoğu, daha fazla |
| `عَبْد` | 6 | keep_unknown | keep_manual | missing_or_low_confidence_parse | - |
| `ansızın` | 6 | keep_unknown | keep_manual | no_structured_rule_match | ansızın |
| `kaçış` | 6 | keep_unknown | keep_manual | no_structured_rule_match | kaçış |
| `sakınca` | 6 | keep_unknown | keep_manual | no_structured_rule_match | sakınca |
| `zürriyetim` | 6 | keep_unknown | keep_manual | no_structured_rule_match | zürriyetim |
| `iddia etmek` | 6 | keep_unknown | keep_manual | no_structured_rule_match | iddia etmek |
| `selam, barış` | 6 | keep_unknown | keep_manual | no_structured_rule_match | selam, barış |
| `Süleyman` | 6 | keep_unknown | keep_manual | no_structured_rule_match | Süleyman |
| `Yıl` | 6 | keep_unknown | keep_manual | no_structured_rule_match | Yıl |
| `Yıl` | 6 | keep_unknown | keep_manual | no_structured_rule_match | Yıl |
| `Eşit` | 6 | keep_unknown | keep_manual | no_structured_rule_match | Eşit |
| `şiddetli` | 6 | profile_bound | profile_dependent_manual | profile_bound_meaning | şiddetli |
| `sapıklık` | 6 | keep_unknown | keep_manual | no_structured_rule_match | sapıklık |
| `Arapça` | 6 | keep_unknown | keep_manual | no_structured_rule_match | Arapça |
| `İsa` | 6 | keep_unknown | keep_manual | no_structured_rule_match | İsa |
| `sizi kurtardık` | 6 | keep_unknown | keep_manual | no_structured_rule_match | sizi kurtardık |
| `bırakmak` | 6 | keep_unknown | keep_manual | no_structured_rule_match | bırakmak |
| `güçlü olmak` | 6 | keep_unknown | keep_manual | no_structured_rule_match | güçlü olmak |
| `çoğalmak` | 6 | keep_unknown | keep_manual | no_structured_rule_match | çoğalmak |

## Degerlendirme

- Structured alanlar unknown azaltmak icin anlamli bir potansiyel gosteriyor.
- Buna ragmen `profile_bound` ve `keep_unknown` gruplar dogrudan classifier'a baglanmamali.
- En guvenli adaylar `generic/drop_debug`, `content/source_gap`, `content/term_overlap` ve `proper_noun/source_gap` gruplarindan parseConfidence'i high/medium olanlar.

## Sonraki Adim

Classifier'a dogrudan genis baglanti yerine, bu audit sonucundan kucuk bir Batch 3 karar paketi uretmek daha guvenli. Batch 3 sadece `safeToAutoClassify=true` olan, meaning'i temiz ve conflictType'i net gruplardan secilmeli.
