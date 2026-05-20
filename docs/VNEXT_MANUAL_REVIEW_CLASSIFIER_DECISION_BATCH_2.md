# vNext Manual Review Classifier Decision Batch 2

Bu karar paketi Batch 1 sonrasinda kalan `needsManualReview` gruplarindan top 150 icindeki bariz karar verilebilenleri ayirir. Classifier kodu, UI, runtime, default source ve v4 default davranisi degistirilmedi.

## Kapsam

- Incelenen grup: 150
- Karar verilen grup: 30
- Manual kalan grup: 120
- Toplam needsManualReview conflict: 6139
- Top 150 conflict: 1183
- Bu batch uygulanirsa tahmini azaltma: 268
- Tum needsManualReview icinde tahmini etki: %4.37
- Top 150 icinde tahmini etki: %22.65

## Karar Dagilimi

- `genericNeutral`: 12 grup / 95 conflict
- `likelyUsefulV4Addition`: 10 grup / 91 conflict
- `likelyRiskyDrop`: 8 grup / 82 conflict
- `keepNeedsManualReview`: 120 grup

## Karar Tablosu

| Rank | Term | Decision | Count | Examples | Note |
|---:|---|---|---:|---|---|
| 4 | `gündüz` | `likelyUsefulV4Addition` | 22 | 2:274 (genel_karma, keyTermOnlyInV4); 3:190 (genel_karma, keyTermOnlyInV4); 6:13 (uyari_inkar, keyTermOnlyInV4) | V4 eklemesi; gece-gündüz/doğa sahnesi için source-backed content olabilir. |
| 8 | `ümmet, topluluk` | `likelyRiskyDrop` | 12 | 2:128 (rahmet_magfiret, keyTermMissingInV4); 2:128 (rahmet_magfiret, profileRelevantTermDropped); 2:134 (genel_karma, keyTermMissingInV4) | Topluluk/ümmet content terimi; v4 düşürmesi bilgi kaybı olabilir. |
| 9 | `güzel` | `genericNeutral` | 12 | 2:245 (genel_karma, keyTermMissingInV4); 2:245 (genel_karma, profileRelevantTermDropped); 3:37 (hukum_istisna, keyTermMissingInV4) | Genel niteleme; tek başına profil/analiz ekseni kurmuyor. |
| 11 | `Büyük` | `genericNeutral` | 12 | 2:114 (uyari_inkar, keyTermMissingInV4); 2:114 (uyari_inkar, profileRelevantTermDropped); 12:28 (kissa, keyTermMissingInV4) | Genel büyüklük nitelemesi; profil bağımsız keyTerm için zayıf. |
| 14 | `gündüz` | `likelyUsefulV4Addition` | 11 | 3:27 (ahiret, keyTermOnlyInV4); 11:114 (dua_kulluk, keyTermOnlyInV4); 22:61 (uyari_inkar, keyTermOnlyInV4) | V4 eklemesi; gündüz/doğa sahnesi source-backed content olabilir. |
| 17 | `Mümin` | `likelyRiskyDrop` | 10 | 5:11 (yol_hidayet, keyTermMissingInV4); 5:11 (yol_hidayet, profileRelevantTermDropped); 8:74 (genel_karma, keyTermMissingInV4) | Mümin inanç/kimlik terimi; v4 düşürmesi content kaybı olabilir. |
| 20 | `sahipler, arkadaşlar` | `likelyRiskyDrop` | 10 | 7:42 (ahiret, keyTermMissingInV4); 7:42 (ahiret, profileRelevantTermDropped); 7:47 (genel_karma, keyTermMissingInV4) | Ashab/sahipler content grubu; ahiret/kıssa bağlamlarında düşmesi riskli olabilir. |
| 27 | `süslemek` | `likelyUsefulV4Addition` | 10 | 2:212 (uyari_inkar, keyTermOnlyInV4); 3:14 (yol_hidayet, keyTermOnlyInV4); 6:122 (uyari_inkar, keyTermOnlyInV4) | V4 eklemesi; dünya/aldanma/uyarı bağlamlarında content fiil olabilir. |
| 30 | `Mümin` | `likelyRiskyDrop` | 10 | 2:97 (yol_hidayet, keyTermMissingInV4); 2:97 (yol_hidayet, profileRelevantTermDropped); 9:61 (uyari_inkar, keyTermMissingInV4) | Mümin inanç/kimlik terimi; v4 düşürmesi content kaybı olabilir. |
| 31 | `geçici fayda` | `likelyRiskyDrop` | 10 | 3:14 (yol_hidayet, keyTermMissingInV4); 3:14 (yol_hidayet, profileRelevantTermDropped); 3:185 (ahiret, keyTermMissingInV4) | Dünya/geçici fayda karşıtlığı content taşıyor; düşmesi riskli olabilir. |
| 32 | `Mümin` | `likelyRiskyDrop` | 10 | 5:23 (yol_hidayet, keyTermMissingInV4); 5:23 (yol_hidayet, profileRelevantTermDropped); 7:72 (uyari_inkar, keyTermMissingInV4) | Mümin inanç/kimlik terimi; v4 düşürmesi content kaybı olabilir. |
| 33 | `uyarıcı` | `likelyRiskyDrop` | 10 | 5:19 (rahmet_magfiret, keyTermMissingInV4); 5:19 (rahmet_magfiret, profileRelevantTermDropped); 28:46 (kissa, keyTermMissingInV4) | Uyarıcı kavramı content terim; v4 düşürmesi riskli olabilir. |
| 34 | `vaat etti` | `likelyRiskyDrop` | 10 | 11:65 (genel_karma, keyTermMissingInV4); 11:65 (genel_karma, profileRelevantTermDropped); 17:7 (emir_yasak, keyTermMissingInV4) | Vaat/sonuç dili content sinyali olabilir; düşmesi riskli olabilir. |
| 35 | `yüksek` | `genericNeutral` | 8 | 20:68 (genel_karma, keyTermOnlyInV4); 30:27 (genel_karma, keyTermOnlyInV4); 37:8 (uyari_inkar, keyTermOnlyInV4) | Genel yükseklik nitelemesi; content keyTerm olarak bariz değil. |
| 40 | `şehir` | `likelyUsefulV4Addition` | 8 | 12:30 (yol_hidayet, keyTermOnlyInV4); 15:67 (genel_karma, keyTermOnlyInV4); 27:48 (genel_karma, keyTermOnlyInV4) | V4 eklemesi; kıssa/sahne lokasyonu olarak content olabilir. |
| 41 | `daha güzel` | `genericNeutral` | 8 | 6:152 (emir_yasak, keyTermMissingInV4); 6:152 (emir_yasak, profileRelevantTermDropped); 11:7 (ahiret, keyTermMissingInV4) | Karşılaştırmalı niteleme; bağlamdan bağımsız analiz terimi değil. |
| 44 | `yemin etmek` | `likelyUsefulV4Addition` | 8 | 56:75 (genel_karma, keyTermOnlyInV4); 69:38 (uyari_inkar, keyTermOnlyInV4); 70:40 (genel_karma, keyTermOnlyInV4) | V4 eklemesi; yemin/ifade eylemi content sinyali olabilir. |
| 47 | `altında` | `genericNeutral` | 8 | 4:13 (ahiret, keyTermMissingInV4); 4:13 (ahiret, profileRelevantTermDropped); 9:100 (ahiret, keyTermMissingInV4) | Konum zarfı; kullanıcı-facing keyTerm değeri düşük. |
| 49 | `tadın` | `likelyUsefulV4Addition` | 8 | 3:181 (uyari_inkar, keyTermOnlyInV4); 10:52 (ahiret, keyTermOnlyInV4); 29:55 (uyari_inkar, keyTermOnlyInV4) | V4 eklemesi; uyarı/azap bağlamında content fiil olabilir. |
| 52 | `büyük` | `genericNeutral` | 8 | 4:2 (genel_karma, keyTermMissingInV4); 4:2 (genel_karma, profileRelevantTermDropped); 17:4 (genel_karma, keyTermMissingInV4) | Genel büyüklük nitelemesi; profil bağımsız keyTerm için zayıf. |
| 54 | `gibi, benzer` | `genericNeutral` | 8 | 2:214 (ahiret, keyTermMissingInV4); 2:214 (ahiret, profileRelevantTermDropped); 4:11 (tevhid_birlik, keyTermMissingInV4) | Benzetme/karşılaştırma ifadesi; tek başına analiz terimi değil. |
| 60 | `teslim olmak` | `likelyUsefulV4Addition` | 7 | 2:112 (emir_yasak, keyTermOnlyInV4); 2:131 (genel_karma, keyTermOnlyInV4); 3:83 (ahiret, keyTermOnlyInV4) | V4 eklemesi; inanç/yöneliş fiili olarak content taşıyor. |
| 64 | `arkalarından` | `genericNeutral` | 7 | 4:9 (genel_karma, keyTermOnlyInV4); 7:17 (yol_hidayet, keyTermOnlyInV4); 8:57 (genel_karma, keyTermOnlyInV4) | Konum/yön ilişkisi; keyTerm değeri düşük. |
| 65 | `yıllar` | `genericNeutral` | 7 | 12:47 (kissa, keyTermOnlyInV4); 18:11 (genel_karma, keyTermOnlyInV4); 18:25 (genel_karma, keyTermOnlyInV4) | Zaman miktarı; profil bağımsız content term değil. |
| 66 | `şüphe` | `likelyUsefulV4Addition` | 7 | 10:94 (genel_karma, keyTermOnlyInV4); 10:104 (dua_kulluk, keyTermOnlyInV4); 11:62 (dua_kulluk, keyTermOnlyInV4) | V4 eklemesi; uyarı/iman bağlamında content kavram olabilir. |
| 67 | `kaldım` | `genericNeutral` | 7 | 17:52 (dua_kulluk, keyTermOnlyInV4); 18:19 (genel_karma, keyTermOnlyInV4); 20:103 (genel_karma, keyTermOnlyInV4) | Bağlama bağlı fiil/kalış süresi; bu düzeyde generic tutulmalı. |
| 143 | `yakın` | `genericNeutral` | 5 | 7:56 (dua_kulluk, keyTermOnlyInV4); 34:50 (yol_hidayet, keyTermOnlyInV4); 42:17 (ahiret, keyTermOnlyInV4) | Genel yakınlık nitelemesi; profil bağımsız keyTerm için zayıf. |
| 144 | `sana yeter` | `genericNeutral` | 5 | 13:43 (uyari_inkar, keyTermOnlyInV4); 17:14 (ahiret, keyTermOnlyInV4); 17:96 (dua_kulluk, keyTermOnlyInV4) | Kalıp ifade; content keyTerm olarak gösterilmemeli. |
| 148 | `İsmail` | `likelyUsefulV4Addition` | 5 | 2:127 (dua_kulluk, keyTermOnlyInV4); 2:140 (kissa, keyTermOnlyInV4); 4:163 (kissa, keyTermOnlyInV4) | V4 eklemesi; kıssa/proper-name content olabilir. |
| 150 | `alıkoymak` | `likelyUsefulV4Addition` | 5 | 4:167 (yol_hidayet, keyTermOnlyInV4); 16:88 (uyari_inkar, keyTermOnlyInV4); 47:1 (uyari_inkar, keyTermOnlyInV4) | V4 eklemesi; yol/hidayet veya uyarı bağlamında content fiil olabilir. |

## Bilerek Manual Birakilan Odak Terimler

- Rank 1: `Hayır` / `خ ي ر خ ي ر hayır` (42) - Çok anlamlı veya profile bağımlı; Batch 2 içinde zorla sınıflandırılmadı.
- Rank 2: `gün` / `ي و م ي و م gun` (42) - Çok anlamlı veya profile bağımlı; Batch 2 içinde zorla sınıflandırılmadı.
- Rank 3: `bilen, alim` / `ع ل يم ع ل يم bilen alim` (22) - Çok anlamlı veya profile bağımlı; Batch 2 içinde zorla sınıflandırılmadı.
- Rank 10: `güçlü, aziz` / `ع ز يز ع ز يز guclu aziz` (12) - Çok anlamlı veya profile bağımlı; Batch 2 içinde zorla sınıflandırılmadı.
- Rank 12: `gün` / `و ي و م ي و م gun` (12) - Çok anlamlı veya profile bağımlı; Batch 2 içinde zorla sınıflandırılmadı.
- Rank 15: `emir, iş` / `ٱل ا م ر ا م ر emir is` (10) - Çok anlamlı veya profile bağımlı; Batch 2 içinde zorla sınıflandırılmadı.
- Rank 16: `güçlü, aziz` / `ٱل ع ز يز ع ز يز guclu aziz` (10) - Çok anlamlı veya profile bağımlı; Batch 2 içinde zorla sınıflandırılmadı.
- Rank 21: `emir, iş` / `ا م ر ا م ر emir is` (10) - Çok anlamlı veya profile bağımlı; Batch 2 içinde zorla sınıflandırılmadı.
- Rank 22: `emir, iş` / `ا م ر ن ا ا م ر emir is` (10) - Çok anlamlı veya profile bağımlı; Batch 2 içinde zorla sınıflandırılmadı.
- Rank 25: `gün` / `ا ي ام ي و م gun` (10) - Çok anlamlı veya profile bağımlı; Batch 2 içinde zorla sınıflandırılmadı.
- Rank 29: `söz, kelam` / `ق و ل ا ق و ل soz kelam` (10) - Çok anlamlı veya profile bağımlı; Batch 2 içinde zorla sınıflandırılmadı.
- Rank 39: `söz, kelam` / `ٱل ق و ل ق و ل soz kelam` (8) - Çok anlamlı veya profile bağımlı; Batch 2 içinde zorla sınıflandırılmadı.
- Rank 48: `Hayır` / `خ ي ر ا خ ي ر hayır` (8) - Çok anlamlı veya profile bağımlı; Batch 2 içinde zorla sınıflandırılmadı.
- Rank 55: `gün` / `ي و م ي ذ ي و م gun` (8) - Çok anlamlı veya profile bağımlı; Batch 2 içinde zorla sınıflandırılmadı.
- Rank 74: `bilen, alim` / `ٱل ع ل يم ع ل يم bilen alim` (6) - Çok anlamlı veya profile bağımlı; Batch 2 içinde zorla sınıflandırılmadı.

## Not

`Hayır`, `gün`, `bilen/alim`, `emir/iş`, `söz/kelam`, `güçlü/aziz` gibi cok anlamli veya profile bagimli terimler bu batch'te zorla siniflandirilmadi.

## Sonraki Kucuk Adim

Bu batch onaylanirsa classifier'a yine exact-match dar kapsamla uygulanabilir. Sonrasinda once `--limit=1000`, sonra gerekirse full audit ile etkisi olculmeli.
