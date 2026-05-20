# Filtered Weak Preview Comparison

Tarih: 2026-05-14

Bu rapor ilk 1000 ayette mevcut weak preview ile filtreli missing-meanings aday gruplarini karsilastirir. Runtime, UI, default source ve mevcut preview logic degistirilmedi.

## Ozet

- Islenen ayet: 1000
- Ham missing kayit: 5971
- Ham missing ayet: 964
- Mevcut preview weak gosteren ayet: 964
- Filtreli preview weak gosterebilecek ayet: 848
- Iki yaklasimda da weak olan ayet: 848
- Mevcut var / filtreli yok: 116
- Filtreli var / mevcut yok: 0
- Filtreli candidate: 2887
- Bastirilan kayit: 3084
- Gurultu azalmasi: %51.6

## En Iyi 20 Ornek

| Ayet | Profile | Ham | Filtreli | Gruplar | Mevcut preview |
|---|---|---:|---:|---|---|
| 5:3 | hukum_istisna | 27 | 20 | yiyecek ve yasakli maddeler; diger kelime eslesme adaylari; ahlaki yasak ve davranis uyarilari; zaruret, istisna ve sorumluluk | yiyecek adlari; zaruret/istisna ifadesi |
| 4:11 | emir_yasak | 24 | 18 | diger kelime eslesme adaylari; kissa sahnesi ve olay unsurlari | emir, yasak ve davranis uyarilari |
| 2:196 | yol_hidayet | 24 | 17 | diger kelime eslesme adaylari; yiyecek ve yasakli maddeler | yol ve yonelis ifadeleri |
| 6:141 | ahiret | 18 | 15 | diger kelime eslesme adaylari; kissa sahnesi ve olay unsurlari; rahmet, tovbe ve umut | amel, karsilik ve sonuc ifadeleri |
| 2:249 | genel_karma | 20 | 15 | diger kelime eslesme adaylari; amel, olcu ve ahiret sonucu | bazi kelime-karsilik eslesmeleri |
| 2:259 | ahiret | 23 | 16 | diger kelime eslesme adaylari; kissa sahnesi ve olay unsurlari; yiyecek ve yasakli maddeler | amel, karsilik ve sonuc ifadeleri |
| 5:6 | emir_yasak | 29 | 17 | diger kelime eslesme adaylari; zaruret, istisna ve sorumluluk | emir, yasak ve davranis uyarilari |
| 5:31 | kissa | 12 | 11 | yol, hidayet ve sapma; diger kelime eslesme adaylari | kisi, olay ve anlati ifadeleri |
| 4:12 | tevhid_birlik | 31 | 17 | diger kelime eslesme adaylari; zaruret, istisna ve sorumluluk | birlik vurgusunu tasiyan terimler |
| 4:36 | emir_yasak | 13 | 11 | diger kelime eslesme adaylari; zaruret, istisna ve sorumluluk | emir, yasak ve davranis uyarilari |
| 2:282 | genel_karma | 33 | 17 | diger kelime eslesme adaylari; ahlaki yasak ve davranis uyarilari; zaruret, istisna ve sorumluluk | bazi kelime-karsilik eslesmeleri |
| 4:6 | genel_karma | 21 | 13 | diger kelime eslesme adaylari; rahmet, tovbe ve umut | bazi kelime-karsilik eslesmeleri |
| 2:177 | genel_karma | 13 | 10 | yol, hidayet ve sapma; diger kelime eslesme adaylari; zaruret, istisna ve sorumluluk | bazi kelime-karsilik eslesmeleri |
| 3:154 | uyari_inkar | 22 | 13 | diger kelime eslesme adaylari; kissa sahnesi ve olay unsurlari | kalp, isitme ve gorme alani |
| 5:110 | yol_hidayet | 27 | 21 | diger kelime eslesme adaylari | yol ve yonelis ifadeleri |
| 6:145 | hukum_istisna | 8 | 8 | diger kelime eslesme adaylari; yiyecek ve yasakli maddeler; zaruret, istisna ve sorumluluk | yiyecek adlari; zaruret/istisna ifadesi |
| 5:106 | dua_kulluk | 15 | 10 | diger kelime eslesme adaylari; zaruret, istisna ve sorumluluk | kulluk ve yonelis fiilleri |
| 6:84 | kissa | 12 | 9 | diger kelime eslesme adaylari; amel, olcu ve ahiret sonucu | kisi, olay ve anlati ifadeleri |
| 4:43 | genel_karma | 22 | 12 | diger kelime eslesme adaylari; zaruret, istisna ve sorumluluk | bazi kelime-karsilik eslesmeleri |
| 2:102 | genel_karma | 23 | 12 | diger kelime eslesme adaylari; zaruret, istisna ve sorumluluk | bazi kelime-karsilik eslesmeleri |

## En Riskli 20 Ornek

| Ayet | Profile | Ham | Filtreli | Bastirilan | Gruplar | Risk nedeni |
|---|---|---:|---:|---:|---|---|
| 4:102 | uyari_inkar | 33 | 19 | 14 | diger kelime eslesme adaylari | cok fazla aday, generic grup |
| 2:282 | genel_karma | 33 | 17 | 16 | diger kelime eslesme adaylari; ahlaki yasak ve davranis uyarilari; zaruret, istisna ve sorumluluk | cok fazla aday, generic grup |
| 4:12 | tevhid_birlik | 31 | 17 | 14 | diger kelime eslesme adaylari; zaruret, istisna ve sorumluluk | cok fazla aday, generic grup |
| 5:110 | yol_hidayet | 27 | 21 | 6 | diger kelime eslesme adaylari | cok fazla aday, generic grup |
| 2:61 | tevhid_birlik | 32 | 15 | 17 | diger kelime eslesme adaylari | cok fazla aday, generic grup |
| 5:3 | hukum_istisna | 27 | 20 | 7 | yiyecek ve yasakli maddeler; diger kelime eslesme adaylari; ahlaki yasak ve davranis uyarilari; zaruret, istisna ve sorumluluk | cok fazla aday, generic grup |
| 5:6 | emir_yasak | 29 | 17 | 12 | diger kelime eslesme adaylari; zaruret, istisna ve sorumluluk | cok fazla aday, generic grup |
| 2:233 | emir_yasak | 29 | 14 | 15 | diger kelime eslesme adaylari; zaruret, istisna ve sorumluluk; ahlaki yasak ve davranis uyarilari | cok fazla aday, generic grup |
| 2:187 | rahmet_magfiret | 27 | 15 | 12 | diger kelime eslesme adaylari | cok fazla aday, generic grup |
| 4:11 | emir_yasak | 24 | 18 | 6 | diger kelime eslesme adaylari; kissa sahnesi ve olay unsurlari | cok fazla aday, generic grup |
| 2:196 | yol_hidayet | 24 | 17 | 7 | diger kelime eslesme adaylari; yiyecek ve yasakli maddeler | cok fazla aday, generic grup |
| 2:259 | ahiret | 23 | 16 | 7 | diger kelime eslesme adaylari; kissa sahnesi ve olay unsurlari; yiyecek ve yasakli maddeler | cok fazla aday, generic grup |
| 4:25 | rahmet_magfiret | 22 | 14 | 8 | diger kelime eslesme adaylari | cok fazla aday, generic grup |
| 2:102 | genel_karma | 23 | 12 | 11 | diger kelime eslesme adaylari; zaruret, istisna ve sorumluluk | cok fazla aday, generic grup |
| 2:249 | genel_karma | 20 | 15 | 5 | diger kelime eslesme adaylari; amel, olcu ve ahiret sonucu | cok fazla aday, generic grup |
| 3:154 | uyari_inkar | 22 | 13 | 9 | diger kelime eslesme adaylari; kissa sahnesi ve olay unsurlari | cok fazla aday, generic grup |
| 5:64 | kissa | 21 | 14 | 7 | diger kelime eslesme adaylari | cok fazla aday, generic grup |
| 6:99 | ahiret | 20 | 15 | 5 | diger kelime eslesme adaylari | cok fazla aday, generic grup |
| 4:6 | genel_karma | 21 | 13 | 8 | diger kelime eslesme adaylari; rahmet, tovbe ve umut | cok fazla aday, generic grup |
| 4:43 | genel_karma | 22 | 12 | 10 | diger kelime eslesme adaylari; zaruret, istisna ve sorumluluk | cok fazla aday, generic grup |

## Kullanici-facing Metin Onerisi

- `Bazı kelime-karşılık eşleşmeleri kontrol gerektiriyor.`
- `{grup} alanında bazı kelime-karşılık eşleşmeleri kontrol gerektiriyor.`
- `Bu notlar teknik eşleşme verisinden türetilmiştir; yorum/tefsir değildir.`

Raw `matching_gap`, ham Arapca parca veya tekil lemma kullaniciya basilmamali.

## Karar

Filtreli aday gruplari mevcut weak preview'a gore daha temiz ve daha source-backed gorunuyor. Ancak generic grup ve cok adayli ayetler icin ekstra sinirlama gerekir. En guvenli sonraki adim, sadece profile-spesifik grup eslesen adaylari opt-in preview auditinde denemektir.