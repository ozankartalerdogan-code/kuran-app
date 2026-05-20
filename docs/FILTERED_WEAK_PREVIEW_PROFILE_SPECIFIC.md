# Filtered Weak Preview Profile-Specific Audit

Tarih: 2026-05-14

Bu rapor filtreli weak adaylari daha siki bir profile-specific kapidan gecirir. `diger kelime eslesme adaylari` normal kullanici-facing aday sayilmadi; yalniz debug/sourceStatus adayi kabul edildi. Runtime, UI, default source ve mevcut preview logic degistirilmedi.

## Ozet

- Islenen ayet: 1000
- Mevcut weak preview gosteren ayet: 964
- Filtreli herhangi weak adayli ayet: 848
- Profile-specific weak gosterilebilecek ayet: 171
- Generic-only oldugu icin gizlenecek ayet: 677
- Filtreli candidate toplam: 2887
- Kullanici-facing specific candidate: 212
- Debug generic candidate: 2480
- Generic-only gizlenen candidate: 1914
- Bastirilan ham gurultu: 3084
- Filtreli candidate uzerinden ek azalma: %92.7

## En Iyi 20 Ornek

| Ayet | Profile | User-facing grup | Specific label | Debug generic label | Mevcut preview |
|---|---|---|---:|---:|---|
| 5:3 | hukum_istisna | yiyecek ve yasakli maddeler; ahlaki yasak ve davranis uyarilari; zaruret, istisna ve sorumluluk | 8 | 12 | yiyecek adlari; zaruret/istisna ifadesi |
| 5:90 | emir_yasak | yiyecek ve yasakli maddeler; zaruret, istisna ve sorumluluk | 6 | 0 | emir, yasak ve davranis uyarilari |
| 2:173 | hukum_istisna | yiyecek ve yasakli maddeler; zaruret, istisna ve sorumluluk | 5 | 0 | yiyecek adlari; zaruret/istisna ifadesi |
| 6:145 | hukum_istisna | yiyecek ve yasakli maddeler; zaruret, istisna ve sorumluluk | 5 | 3 | yiyecek adlari; zaruret/istisna ifadesi |
| 2:219 | emir_yasak | yiyecek ve yasakli maddeler; zaruret, istisna ve sorumluluk | 3 | 1 | emir, yasak ve davranis uyarilari |
| 2:177 | genel_karma | yol, hidayet ve sapma; zaruret, istisna ve sorumluluk | 3 | 7 | bazi kelime-karsilik eslesmeleri |
| 5:2 | yol_hidayet | ahlaki yasak ve davranis uyarilari; zaruret, istisna ve sorumluluk | 2 | 6 | yol ve yonelis ifadeleri |
| 6:141 | ahiret | kissa sahnesi ve olay unsurlari; rahmet, tovbe ve umut | 3 | 10 | amel, karsilik ve sonuc ifadeleri |
| 2:282 | genel_karma | ahlaki yasak ve davranis uyarilari; zaruret, istisna ve sorumluluk | 3 | 11 | bazi kelime-karsilik eslesmeleri |
| 2:259 | ahiret | kissa sahnesi ve olay unsurlari; yiyecek ve yasakli maddeler | 2 | 10 | amel, karsilik ve sonuc ifadeleri |
| 2:233 | emir_yasak | zaruret, istisna ve sorumluluk; ahlaki yasak ve davranis uyarilari | 2 | 11 | emir, yasak ve davranis uyarilari |
| 4:29 | emir_yasak | ahlaki yasak ve davranis uyarilari | 2 | 0 | emir, yasak ve davranis uyarilari |
| 7:8 | ahiret | amel, olcu ve ahiret sonucu | 2 | 0 | amel, karsilik ve sonuc ifadeleri |
| 2:115 | rahmet_magfiret | yol, hidayet ve sapma | 2 | 1 | rahmet, bagislanma ve tovbe ifadeleri |
| 2:142 | yol_hidayet | yol, hidayet ve sapma | 2 | 1 | yol ve yonelis ifadeleri |
| 2:258 | genel_karma | yol, hidayet ve sapma | 2 | 1 | bazi kelime-karsilik eslesmeleri |
| 4:40 | ahiret | amel, olcu ve ahiret sonucu | 2 | 1 | amel, karsilik ve sonuc ifadeleri |
| 7:31 | genel_karma | rahmet, tovbe ve umut | 2 | 2 | bazi kelime-karsilik eslesmeleri |
| 2:46 | dua_kulluk | amel, olcu ve ahiret sonucu | 1 | 0 | kulluk ve yonelis fiilleri |
| 3:34 | kissa | amel, olcu ve ahiret sonucu | 1 | 0 | kisi, olay ve anlati ifadeleri |

## En Riskli 20 Ornek

| Ayet | Profile | Specific label | Generic debug | Bastirilan | Risk |
|---|---|---:|---:|---:|---|
| 5:110 | yol_hidayet | 0 | 17 | 6 | generic-only gizlendi, generic debug fazla |
| 2:61 | tevhid_birlik | 0 | 15 | 17 | generic-only gizlendi, generic debug fazla |
| 4:102 | uyari_inkar | 0 | 14 | 14 | generic-only gizlendi, generic debug fazla |
| 6:99 | ahiret | 0 | 15 | 5 | generic-only gizlendi, generic debug fazla |
| 5:64 | kissa | 0 | 14 | 7 | generic-only gizlendi, generic debug fazla |
| 4:176 | genel_karma | 0 | 13 | 8 | generic-only gizlendi, generic debug fazla |
| 2:187 | rahmet_magfiret | 0 | 12 | 12 | generic-only gizlendi, generic debug fazla |
| 5:89 | genel_karma | 0 | 12 | 5 | generic-only gizlendi, generic debug fazla |
| 4:25 | rahmet_magfiret | 0 | 11 | 8 | generic-only gizlendi, generic debug fazla |
| 4:46 | genel_karma | 0 | 10 | 11 | generic-only gizlendi, generic debug fazla |
| 5:13 | genel_karma | 0 | 11 | 5 | generic-only gizlendi, generic debug fazla |
| 2:235 | rahmet_magfiret | 0 | 10 | 9 | generic-only gizlendi, generic debug fazla |
| 4:163 | kissa | 0 | 10 | 4 | generic-only gizlendi, generic debug fazla |
| 5:41 | uyari_inkar | 0 | 9 | 8 | generic-only gizlendi, generic debug fazla |
| 5:95 | genel_karma | 0 | 10 | 2 | generic-only gizlendi, generic debug fazla |
| 2:71 | genel_karma | 0 | 9 | 7 | generic-only gizlendi, generic debug fazla |
| 4:23 | genel_karma | 0 | 9 | 7 | generic-only gizlendi, generic debug fazla |
| 3:14 | yol_hidayet | 0 | 10 | 0 | generic-only gizlendi, generic debug fazla |
| 4:3 | tevhid_birlik | 0 | 9 | 6 | generic-only gizlendi, generic debug fazla |
| 2:184 | emir_yasak | 0 | 9 | 4 | generic-only gizlendi, generic debug fazla |

## Kullanici-facing Metin Onerisi

- `{profile-specific grup} alanında bazı kelime-karşılık eşleşmeleri kontrol gerektiriyor.`
- `Bu notlar teknik eşleşme verisinden türetilmiştir; yorum/tefsir değildir.`
- Generic grup varsa normal kullanıcıya gösterme; sourceStatus/debug tarafında `Ek kelime eşleşme adayları debug'da tutuldu.` gibi sakla.

## Karar

Profile-specific gate kullanici-facing kalite icin daha guvenli. Ancak user-facing ayet sayisi dusuyor; bu bilincli ve olumlu bir tradeoff. Bir sonraki adim, yalniz profile-specific gruplari preview'a opt-in olarak baglayan kucuk bir test paketidir.