# vNext Manual Review Classifier Decision Batch 3

Bu rapor, structured classifier audit icinde guvenli gorunen conflictleri classifier koduna dokunmadan exact-match karar paketine donusturur. Runtime, UI, default source, v4 default, kaynak veri ve Batch 2 degistirilmedi.

## Ozet

- Incelenen conflict: 538
- Karar uretilen grup: 19
- Karar uretilen conflict: 129
- Tahmini needsManualReview dususu: 129
- Tahmini kalan needsManualReview: 6010
- Disarida birakilan keep_unknown grup/conflict: 77 / 381
- Disarida birakilan profile_bound grup/conflict: 4 / 28

## Karar Dagilimi

- `genericNeutral`: 17 conflict / 2 grup
- `likelyUsefulV4Addition`: 74 conflict / 11 grup
- `likelyRiskyDrop`: 38 conflict / 6 grup
- `profileDependentManual`: 0 conflict / 0 grup

## Karar Tablosu

| Rank | Term | Conflict | Classify As | Reason | Conflict Types |
|---:|---|---:|---|---|---|
| 1 | `çatıları` | 11 | `genericNeutral` | `generic_meaning` | keyTermOnlyInV4:11 |
| 2 | `onları üzer` | 10 | `likelyUsefulV4Addition` | `content_meaning` | keyTermOnlyInV4:10 |
| 3 | `eş, çift` | 8 | `likelyRiskyDrop` | `content_meaning` | keyTermMissingInV4:4, profileRelevantTermDropped:4 |
| 4 | `oğlum` | 8 | `likelyRiskyDrop` | `content_meaning` | keyTermMissingInV4:4, profileRelevantTermDropped:4 |
| 5 | `müstağni` | 7 | `likelyUsefulV4Addition` | `content_meaning` | keyTermOnlyInV4:7 |
| 6 | `seçilmiş` | 7 | `likelyUsefulV4Addition` | `content_meaning` | keyTermOnlyInV4:7 |
| 7 | `savaş` | 7 | `likelyUsefulV4Addition` | `content_meaning` | keyTermOnlyInV4:7 |
| 8 | `acele istemek` | 7 | `likelyUsefulV4Addition` | `content_meaning` | keyTermOnlyInV4:7 |
| 9 | `yücelmek` | 7 | `likelyUsefulV4Addition` | `content_meaning` | keyTermOnlyInV4:7 |
| 10 | `kuşattı` | 7 | `likelyUsefulV4Addition` | `content_meaning` | keyTermOnlyInV4:7 |
| 11 | `geride kalanlar` | 6 | `likelyUsefulV4Addition` | `content_meaning` | keyTermOnlyInV4:6 |
| 12 | `apaçık` | 6 | `genericNeutral` | `generic_meaning` | keyTermMissingInV4:3, profileRelevantTermDropped:3 |
| 13 | `Müşrik` | 6 | `likelyRiskyDrop` | `content_meaning` | keyTermMissingInV4:3, profileRelevantTermDropped:3 |
| 14 | `Şer` | 6 | `likelyRiskyDrop` | `content_meaning` | keyTermMissingInV4:3, profileRelevantTermDropped:3 |
| 15 | `oğul` | 6 | `likelyRiskyDrop` | `content_meaning` | keyTermMissingInV4:3, profileRelevantTermDropped:3 |
| 16 | `kapı` | 6 | `likelyUsefulV4Addition` | `content_meaning` | keyTermOnlyInV4:6 |
| 17 | `sığınmak` | 6 | `likelyUsefulV4Addition` | `content_meaning` | keyTermOnlyInV4:6 |
| 18 | `eş, çift` | 4 | `likelyRiskyDrop` | `content_meaning` | keyTermMissingInV4:2, profileRelevantTermDropped:2 |
| 19 | `oğul` | 4 | `likelyUsefulV4Addition` | `content_meaning` | keyTermOnlyInV4:4 |

## Neden keep_unknown Disarida Kaldi?

- `keep_unknown` gruplarda structured parser yeterli anlam sinyali cikarsa bile exact-match karar guvenli degil.
- Bu gruplarda cok anlamlilik, eksik meaning, dar kural eslesmesi veya profil bagimliligi riski var.
- Bu nedenle Batch 3 sadece `safeAutoClassifyGroups` icindeki 19 grubu kapsar.

## Profile-bound Neden Uygulanmadi?

- `profile_bound` gruplar bazi profillerde yararli, bazilarinda gurultulu olabilir.
- Global exact-match olarak classifier'a eklemek erken olur.
- Bunlar icin ayri profil-bagimli karar kuralina ihtiyac var.

## Uygulama Guvenligi

- Bu paket classifier koduna henuz uygulanmadi.
- Uygulanirsa sadece exact normalizedValue eslesmesiyle dar kapsamli eklenmeli.
- Sonraki guvenli test: conflict audit + global audit `--limit=1000` + typecheck.

## Cikti

- Snapshot: `data/analysis-snapshots/vnext-manual-review-classifier-decision-batch-3.json`

