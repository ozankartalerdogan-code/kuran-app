# vNext Manual Review Classifier Decision Batch 1

Bu dokuman, `vnext-needs-manual-review-term-groups.json` icindeki top 100 `needsManualReview` grubundan sadece bariz karar verilebilenleri ayirir. Classifier kodu, UI, runtime, default source ve v4 default davranisi degistirilmedi.

## Kapsam

- Incelenen grup: 100
- Karar verilen grup: 30
- Manuel kalan grup: 70
- Toplam needsManualReview conflict: 6582
- Top 100 conflict: 1172
- Bu batch uygulanirsa tahmini azaltma: 443 conflict
- Tum needsManualReview icinde tahmini etki: %6.73
- Top 100 icinde tahmini etki: %37.8

## Karar Dagilimi

- `genericNeutral`: 12 grup / 209 conflict
- `likelyUsefulV4Addition`: 10 grup / 104 conflict
- `likelyRiskyDrop`: 8 grup / 130 conflict
- `keepNeedsManualReview`: 70 grup / 729 conflict (top 100 icinde)

## Karar Tablolari

### genericNeutral

| Rank | Term | Decision | Count | Examples | Note |
|---:|---|---|---:|---|---|
| 1 | `şey, bir şey` | `genericNeutral` | 48 | 2:284 (uyari_inkar, keyTermMissingInV4); 2:284 (uyari_inkar, profileRelevantTermDropped); 3:26 (tevhid_birlik, keyTermMissingInV4) | ?ok genel ??ey/bir ?ey? etiketi; keyTerm olarak analiz de?eri d???k. |
| 5 | `az, biraz` | `genericNeutral` | 28 | 3:77 (uyari_inkar, keyTermMissingInV4); 3:77 (uyari_inkar, profileRelevantTermDropped); 3:199 (ahiret, keyTermMissingInV4) | Miktar/zarf niteli?inde ?az/biraz?; profil ba??ms?z keyTerm de?eri zay?f. |
| 9 | `şey, bir şey` | `genericNeutral` | 20 | 3:176 (uyari_inkar, keyTermMissingInV4); 3:176 (uyari_inkar, profileRelevantTermDropped); 9:39 (uyari_inkar, keyTermMissingInV4) | ??ey/bir ?ey? varyant?; ayn? d???k de?erli genel etiket ailesi. |
| 10 | `sana yeter` | `genericNeutral` | 19 | 4:45 (genel_karma, keyTermOnlyInV4); 4:50 (uyari_inkar, keyTermOnlyInV4); 4:55 (ahiret, keyTermOnlyInV4) | Kal?p ifade gibi duruyor; profil ba??ms?z keyTerm olarak g?sterilmemeli. |
| 13 | `apaçık` | `genericNeutral` | 18 | 2:168 (genel_karma, keyTermMissingInV4); 2:168 (genel_karma, profileRelevantTermDropped); 2:208 (genel_karma, keyTermMissingInV4) | Genel niteleme/adjective; tek ba??na analiz ekseni kurmuyor. |
| 16 | `umulur ki` | `genericNeutral` | 16 | 7:129 (kissa, keyTermOnlyInV4); 7:185 (tevhid_birlik, keyTermOnlyInV4); 12:21 (kissa, keyTermOnlyInV4) | Kal?p/modal ifade; content keyTerm de?il. |
| 18 | `the (belirteç)` | `genericNeutral` | 14 | 2:49 (kissa, keyTermMissingInV4); 2:49 (kissa, profileRelevantTermDropped); 2:50 (kissa, keyTermMissingInV4) | Belirte?/teknik token; kullan?c?-facing keyTerm olmamal?. |
| 26 | `Üstünde` | `genericNeutral` | 12 | 4:11 (tevhid_birlik, keyTermMissingInV4); 4:11 (tevhid_birlik, profileRelevantTermDropped); 6:165 (genel_karma, keyTermMissingInV4) | Konum/edat benzeri genel ifade; keyTerm de?eri d???k. |
| 38 | `daha iyi bilir` | `genericNeutral` | 10 | 3:36 (dua_kulluk, keyTermMissingInV4); 3:36 (dua_kulluk, profileRelevantTermDropped); 12:77 (kissa, keyTermMissingInV4) | Kal?p bilgi ifadesi; analiz terimi olarak fazla genel. |
| 68 | `nasıl` | `genericNeutral` | 8 | 3:40 (genel_karma, keyTermOnlyInV4); 3:47 (genel_karma, keyTermOnlyInV4); 3:165 (tevhid_birlik, keyTermOnlyInV4) | Soru/zarf ifadesi; content keyTerm de?il. |
| 71 | `altında` | `genericNeutral` | 8 | 5:66 (genel_karma, keyTermMissingInV4); 5:66 (genel_karma, profileRelevantTermDropped); 29:55 (uyari_inkar, keyTermMissingInV4) | Konum zarf?; content keyTerm de?il. |
| 79 | `Nasıl` | `genericNeutral` | 8 | 5:64 (kissa, keyTermMissingInV4); 5:64 (kissa, profileRelevantTermDropped); 7:103 (kissa, keyTermMissingInV4) | Soru/zarf ifadesi; content keyTerm de?il. |
### likelyUsefulV4Addition

| Rank | Term | Decision | Count | Examples | Note |
|---:|---|---|---:|---|---|
| 11 | `dağ` | `likelyUsefulV4Addition` | 18 | 14:46 (genel_karma, keyTermOnlyInV4); 15:82 (genel_karma, keyTermOnlyInV4); 16:68 (genel_karma, keyTermOnlyInV4) | V4 taraf?ndan eklenen somut do?a/nesne terimi; kullan?c?-facing olmasa bile content evidence olarak faydal?. |
| 19 | `suçlular` | `likelyUsefulV4Addition` | 14 | 6:55 (genel_karma, keyTermOnlyInV4); 6:147 (rahmet_magfiret, keyTermOnlyInV4); 14:49 (genel_karma, keyTermOnlyInV4) | V4 taraf?ndan eklenen uyar?/ak?bet alan?na yak?n content grup. |
| 32 | `suçlular` | `likelyUsefulV4Addition` | 10 | 8:8 (genel_karma, keyTermOnlyInV4); 10:17 (uyari_inkar, keyTermOnlyInV4); 10:50 (uyari_inkar, keyTermOnlyInV4) | ?Su?lular? varyant?; uyar?/ak?bet i?eri?i ta??yor. |
| 33 | `ileri gelenler` | `likelyUsefulV4Addition` | 10 | 7:60 (kissa, keyTermOnlyInV4); 7:66 (kissa, keyTermOnlyInV4); 7:88 (kissa, keyTermOnlyInV4) | K?ssa ba?lam?nda ?ileri gelenler? sahne/ki?i grubu olarak faydal?. |
| 47 | `âd kavmi` | `likelyUsefulV4Addition` | 10 | 7:65 (kissa, keyTermOnlyInV4); 11:50 (kissa, keyTermOnlyInV4); 11:59 (genel_karma, keyTermOnlyInV4) | K?ssa/?zel topluluk ad?; v4 eklemesi content ta??yor. |
| 48 | `tadın` | `likelyUsefulV4Addition` | 10 | 3:106 (uyari_inkar, keyTermOnlyInV4); 6:30 (uyari_inkar, keyTermOnlyInV4); 7:39 (uyari_inkar, keyTermOnlyInV4) | Uyar?/azap ba?lam?nda fiil; v4 eklemesi faydal? content olabilir. |
| 54 | `müjde ver` | `likelyUsefulV4Addition` | 10 | 2:25 (ahiret, keyTermOnlyInV4); 2:155 (genel_karma, keyTermOnlyInV4); 2:223 (genel_karma, keyTermOnlyInV4) | M?jde verme fiili; ahiret/rahmet ba?lamlar?nda content sinyali olabilir. |
| 63 | `sûr` | `likelyUsefulV4Addition` | 8 | 20:102 (ahiret, keyTermOnlyInV4); 23:101 (genel_karma, keyTermOnlyInV4); 27:87 (genel_karma, keyTermOnlyInV4) | Ahiret sahnesiyle ili?kili ?s?r?; v4 eklemesi faydal? content. |
| 84 | `ırmaklar` | `likelyUsefulV4Addition` | 7 | 3:198 (ahiret, keyTermOnlyInV4); 5:85 (ahiret, keyTermOnlyInV4); 9:89 (ahiret, keyTermOnlyInV4) | Ahiret/cennet tasviriyle ili?kili somut isim; v4 eklemesi faydal? olabilir. |
| 92 | `kaynar su` | `likelyUsefulV4Addition` | 7 | 26:101 (genel_karma, keyTermOnlyInV4); 37:67 (genel_karma, keyTermOnlyInV4); 38:57 (genel_karma, keyTermOnlyInV4) | Ahiret/azap alan?na yak?n somut terim; v4 eklemesi content ta??yor. |
### likelyRiskyDrop

| Rank | Term | Decision | Count | Examples | Note |
|---:|---|---|---:|---|---|
| 4 | `Mümin` | `likelyRiskyDrop` | 34 | 2:223 (genel_karma, keyTermMissingInV4); 2:223 (genel_karma, profileRelevantTermDropped); 3:179 (genel_karma, keyTermMissingInV4) | ?M?min? inan?/kimlik terimi; v4?te d??mesi content kayb? olabilir. |
| 6 | `Dünya` | `likelyRiskyDrop` | 24 | 2:212 (uyari_inkar, keyTermMissingInV4); 2:212 (uyari_inkar, profileRelevantTermDropped); 5:33 (ahiret, keyTermMissingInV4) | ?D?nya? ahiret/d?nya kar??tl??? i?in merkez? olabilen content terim. |
| 12 | `acı veren` | `likelyRiskyDrop` | 18 | 3:177 (uyari_inkar, keyTermMissingInV4); 3:177 (uyari_inkar, profileRelevantTermDropped); 9:79 (uyari_inkar, keyTermMissingInV4) | ?Ac? veren? uyar?/azap diliyle ili?kili; v4 d???rmesi riskli olabilir. |
| 14 | `ıslah, iyi olmak` | `likelyRiskyDrop` | 16 | 4:173 (dua_kulluk, keyTermMissingInV4); 4:173 (dua_kulluk, profileRelevantTermDropped); 17:9 (yol_hidayet, keyTermMissingInV4) | Islah/salih amel ailesi content de?er ta??yor; d??mesi riskli olabilir. |
| 20 | `Güneş` | `likelyRiskyDrop` | 14 | 18:17 (yol_hidayet, keyTermMissingInV4); 18:17 (yol_hidayet, profileRelevantTermDropped); 18:90 (genel_karma, keyTermMissingInV4) | ?G?ne?? do?a/ayet sahnelerinde somut content; d??mesi riskli olabilir. |
| 57 | `İyilik` | `likelyRiskyDrop` | 8 | 10:22 (ahiret, keyTermMissingInV4); 10:22 (ahiret, profileRelevantTermDropped); 17:67 (genel_karma, keyTermMissingInV4) | ??yilik? ahlaki/amel alan?nda content de?er ta??yor. |
| 73 | `ebedi kalan` | `likelyRiskyDrop` | 8 | 2:81 (ahiret, keyTermMissingInV4); 2:81 (ahiret, profileRelevantTermDropped); 5:80 (uyari_inkar, keyTermMissingInV4) | ?Ebedi kalan? ahiret sonucuyla ili?kili content ifade. |
| 82 | `birlemek, tek` | `likelyRiskyDrop` | 8 | 5:73 (tevhid_birlik, keyTermMissingInV4); 5:73 (tevhid_birlik, profileRelevantTermDropped); 12:67 (tevhid_birlik, keyTermMissingInV4) | ?Birlemek/tek? tevhid profili i?in g??l? content sinyali. |

## Bilerek Manuel Birakilanlar

Top 100 icindeki 70 grup bu batch'te zorla siniflandirilmadi. Ozellikle `Hay?r`, `g?n`, `bilen/alim`, `g??l?/aziz`, `emir/i?`, `ehil/sahip`, `s?z/kelam` gibi profil bagimli veya cok anlamli terimler sonraki daha dikkatli pakete kalmali.

## Sonraki Kucuk Adim

Bu karar paketi onaylanirsa classifier'a ayni dar kapsamla uygulanabilir. Uygulama sonrasi `audit-vnext-evidence-layer-global.ts --limit=1000` ve ardindan full audit ile `needsManualReview`, `genericNeutral`, `likelyUsefulV4Addition` ve `likelyRiskyDrop` dagilimi tekrar olculmeli.
