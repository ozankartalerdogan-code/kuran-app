# vNext Needs Manual Review Term Groups

Bu rapor, full vNext Evidence Layer global audit sonrasinda `needsManualReview` olarak kalan conflict'leri normalized term ve term family bazinda gruplar. Runtime, UI, default source, decision, preview ve classifier davranisi degistirilmedi.

## Kapsam

- Islenen ayet: 6236
- Hata veren ayet: 0
- Toplam needsManualReview conflict: 6582
- Unique normalized term: 3522
- Unique term/family grubu: 3522
- Karar tablosu: ilk 100 grup

## Input Global Audit

- Path: `data/analysis-snapshots/vnext-evidence-layer-global-audit.json`
- Generated at: 2026-05-14T14:34:18.836Z
- Reported processed ayahs: 6236
- Reported failed ayahs: 0
- Reported needsManualReview conflicts: 6582

## Term Family Dagilimi

- `unclear`: 6582

## Conflict Type Dagilimi

- `keyTermOnlyInV4`: 4440
- `keyTermMissingInV4`: 1085
- `profileRelevantTermDropped`: 1057

## Ilk 20 En Sik Term

1. `ش ي ء ش ى ء sey bir sey` (unclear) - 48 conflict - display: şey, bir şey
2. `خ ي ر خ ي ر hayır` (unclear) - 42 conflict - display: Hayır
3. `ي و م ي و م gun` (unclear) - 42 conflict - display: gün
4. `ٱل م و م ن ين م و م ن mumin` (unclear) - 34 conflict - display: Mümin
5. `ق ل يل ا ق ل يل az biraz` (unclear) - 28 conflict - display: az, biraz
6. `ٱلد ن ي ا د ن يا dunya` (unclear) - 24 conflict - display: Dünya
7. `ع ل يم ع ل يم bilen alim` (unclear) - 22 conflict - display: bilen, alim
8. `و ٱلن ه ار ن هار gunduz` (unclear) - 22 conflict - display: gündüz
9. `ش ي ـ ا ش ى ء sey bir sey` (unclear) - 20 conflict - display: şey, bir şey
10. `و ك ف ى ك ف ى sana yeter` (unclear) - 19 conflict - display: sana yeter
11. `ٱل ج ب ال ج ب ل dag` (unclear) - 18 conflict - display: dağ
12. `ا ل يم ا ل يم acı veren` (unclear) - 18 conflict - display: acı veren
13. `م ب ين م ب ين apacık` (unclear) - 18 conflict - display: apaçık
14. `ٱلص ـ ل ح ت صال ح ة ıslah iyi olmak` (unclear) - 16 conflict - display: ıslah, iyi olmak
15. `ح ك يم ح ك يم hikmetli hakim` (unclear) - 16 conflict - display: hikmetli, hakim
16. `ع س ى ع س ى umulur ki` (unclear) - 16 conflict - display: umulur ki
17. `ق د ير ق د ير kadir guclu` (unclear) - 16 conflict - display: kadir, güçlü
18. `ء ال ا ل the belirtec` (unclear) - 14 conflict - display: the (belirteç)
19. `ٱل م ج ر م ين م ج ر م suclular` (unclear) - 14 conflict - display: suçlular
20. `ٱلش م س ش م س gunes` (unclear) - 14 conflict - display: Güneş

## Manuel Karar Tablosu

| # | normalizedValue | termFamily | displayValue | count | examples | classifyAs | note |
|---:|---|---|---|---:|---|---|---|
| 1 | `ش ي ء ش ى ء sey bir sey` | unclear | şey, bir şey | 48 | 2:284 (uyari_inkar, keyTermMissingInV4); 2:284 (uyari_inkar, profileRelevantTermDropped); 3:26 (tevhid_birlik, keyTermMissingInV4); 3:26 (tevhid_birlik, profileRelevantTermDropped); 3:29 (genel_karma, keyTermMissingInV4) |  |  |
| 2 | `خ ي ر خ ي ر hayır` | unclear | Hayır | 42 | 2:103 (genel_karma, keyTermMissingInV4); 2:103 (genel_karma, profileRelevantTermDropped); 2:220 (ahiret, keyTermMissingInV4); 2:220 (ahiret, profileRelevantTermDropped); 2:280 (genel_karma, keyTermMissingInV4) |  |  |
| 3 | `ي و م ي و م gun` | unclear | gün | 42 | 3:161 (genel_karma, keyTermMissingInV4); 3:161 (genel_karma, profileRelevantTermDropped); 3:194 (genel_karma, keyTermMissingInV4); 3:194 (genel_karma, profileRelevantTermDropped); 5:119 (ahiret, keyTermMissingInV4) |  |  |
| 4 | `ٱل م و م ن ين م و م ن mumin` | unclear | Mümin | 34 | 2:223 (genel_karma, keyTermMissingInV4); 2:223 (genel_karma, profileRelevantTermDropped); 3:179 (genel_karma, keyTermMissingInV4); 3:179 (genel_karma, profileRelevantTermDropped); 4:84 (uyari_inkar, keyTermMissingInV4) |  |  |
| 5 | `ق ل يل ا ق ل يل az biraz` | unclear | az, biraz | 28 | 3:77 (uyari_inkar, keyTermMissingInV4); 3:77 (uyari_inkar, profileRelevantTermDropped); 3:199 (ahiret, keyTermMissingInV4); 3:199 (ahiret, profileRelevantTermDropped); 5:13 (genel_karma, keyTermMissingInV4) |  |  |
| 6 | `ٱلد ن ي ا د ن يا dunya` | unclear | Dünya | 24 | 2:212 (uyari_inkar, keyTermMissingInV4); 2:212 (uyari_inkar, profileRelevantTermDropped); 5:33 (ahiret, keyTermMissingInV4); 5:33 (ahiret, profileRelevantTermDropped); 9:38 (yol_hidayet, keyTermMissingInV4) |  |  |
| 7 | `ع ل يم ع ل يم bilen alim` | unclear | bilen, alim | 22 | 2:115 (rahmet_magfiret, keyTermMissingInV4); 2:115 (rahmet_magfiret, profileRelevantTermDropped); 2:158 (emir_yasak, keyTermMissingInV4); 2:158 (emir_yasak, profileRelevantTermDropped); 3:119 (genel_karma, keyTermMissingInV4) |  |  |
| 8 | `و ٱلن ه ار ن هار gunduz` | unclear | gündüz | 22 | 2:274 (genel_karma, keyTermOnlyInV4); 3:190 (genel_karma, keyTermOnlyInV4); 6:13 (uyari_inkar, keyTermOnlyInV4); 10:6 (genel_karma, keyTermOnlyInV4); 10:67 (uyari_inkar, keyTermOnlyInV4) |  |  |
| 9 | `ش ي ـ ا ش ى ء sey bir sey` | unclear | şey, bir şey | 20 | 3:176 (uyari_inkar, keyTermMissingInV4); 3:176 (uyari_inkar, profileRelevantTermDropped); 9:39 (uyari_inkar, keyTermMissingInV4); 9:39 (uyari_inkar, profileRelevantTermDropped); 11:57 (kissa, keyTermMissingInV4) |  |  |
| 10 | `و ك ف ى ك ف ى sana yeter` | unclear | sana yeter | 19 | 4:45 (genel_karma, keyTermOnlyInV4); 4:50 (uyari_inkar, keyTermOnlyInV4); 4:55 (ahiret, keyTermOnlyInV4); 4:70 (genel_karma, keyTermOnlyInV4); 4:79 (emir_yasak, keyTermOnlyInV4) |  |  |
| 11 | `ٱل ج ب ال ج ب ل dag` | unclear | dağ | 18 | 14:46 (genel_karma, keyTermOnlyInV4); 15:82 (genel_karma, keyTermOnlyInV4); 16:68 (genel_karma, keyTermOnlyInV4); 17:37 (genel_karma, keyTermOnlyInV4); 19:90 (genel_karma, keyTermOnlyInV4) |  |  |
| 12 | `ا ل يم ا ل يم acı veren` | unclear | acı veren | 18 | 3:177 (uyari_inkar, keyTermMissingInV4); 3:177 (uyari_inkar, profileRelevantTermDropped); 9:79 (uyari_inkar, keyTermMissingInV4); 9:79 (uyari_inkar, profileRelevantTermDropped); 9:90 (uyari_inkar, keyTermMissingInV4) |  |  |
| 13 | `م ب ين م ب ين apacık` | unclear | apaçık | 18 | 2:168 (genel_karma, keyTermMissingInV4); 2:168 (genel_karma, profileRelevantTermDropped); 2:208 (genel_karma, keyTermMissingInV4); 2:208 (genel_karma, profileRelevantTermDropped); 7:22 (ahiret, keyTermMissingInV4) |  |  |
| 14 | `ٱلص ـ ل ح ت صال ح ة ıslah iyi olmak` | unclear | ıslah, iyi olmak | 16 | 4:173 (dua_kulluk, keyTermMissingInV4); 4:173 (dua_kulluk, profileRelevantTermDropped); 17:9 (yol_hidayet, keyTermMissingInV4); 17:9 (yol_hidayet, profileRelevantTermDropped); 18:2 (genel_karma, keyTermMissingInV4) |  |  |
| 15 | `ح ك يم ح ك يم hikmetli hakim` | unclear | hikmetli, hakim | 16 | 5:38 (ahiret, keyTermMissingInV4); 5:38 (ahiret, profileRelevantTermDropped); 6:83 (kissa, keyTermMissingInV4); 6:83 (kissa, profileRelevantTermDropped); 8:10 (uyari_inkar, keyTermMissingInV4) |  |  |
| 16 | `ع س ى ع س ى umulur ki` | unclear | umulur ki | 16 | 7:129 (kissa, keyTermOnlyInV4); 7:185 (tevhid_birlik, keyTermOnlyInV4); 12:21 (kissa, keyTermOnlyInV4); 17:8 (uyari_inkar, keyTermOnlyInV4); 17:51 (dua_kulluk, keyTermOnlyInV4) |  |  |
| 17 | `ق د ير ق د ير kadir guclu` | unclear | kadir, güçlü | 16 | 2:284 (uyari_inkar, keyTermMissingInV4); 2:284 (uyari_inkar, profileRelevantTermDropped); 5:40 (uyari_inkar, keyTermMissingInV4); 5:40 (uyari_inkar, profileRelevantTermDropped); 9:39 (uyari_inkar, keyTermMissingInV4) |  |  |
| 18 | `ء ال ا ل the belirtec` | unclear | the (belirteç) | 14 | 2:49 (kissa, keyTermMissingInV4); 2:49 (kissa, profileRelevantTermDropped); 2:50 (kissa, keyTermMissingInV4); 2:50 (kissa, profileRelevantTermDropped); 2:248 (kissa, keyTermMissingInV4) |  |  |
| 19 | `ٱل م ج ر م ين م ج ر م suclular` | unclear | suçlular | 14 | 6:55 (genel_karma, keyTermOnlyInV4); 6:147 (rahmet_magfiret, keyTermOnlyInV4); 14:49 (genel_karma, keyTermOnlyInV4); 15:12 (uyari_inkar, keyTermOnlyInV4); 18:49 (tevhid_birlik, keyTermOnlyInV4) |  |  |
| 20 | `ٱلش م س ش م س gunes` | unclear | Güneş | 14 | 18:17 (yol_hidayet, keyTermMissingInV4); 18:17 (yol_hidayet, profileRelevantTermDropped); 18:90 (genel_karma, keyTermMissingInV4); 18:90 (genel_karma, profileRelevantTermDropped); 25:45 (genel_karma, keyTermMissingInV4) |  |  |
| 21 | `ا ش د ا ش د daha siddetli` | unclear | daha şiddetli | 14 | 2:74 (uyari_inkar, keyTermMissingInV4); 2:74 (uyari_inkar, profileRelevantTermDropped); 2:200 (dua_kulluk, keyTermMissingInV4); 2:200 (dua_kulluk, profileRelevantTermDropped); 4:84 (uyari_inkar, keyTermMissingInV4) |  |  |
| 22 | `ا م ة ا م ة ummet topluluk` | unclear | ümmet, topluluk | 12 | 2:128 (rahmet_magfiret, keyTermMissingInV4); 2:128 (rahmet_magfiret, profileRelevantTermDropped); 2:134 (genel_karma, keyTermMissingInV4); 2:134 (genel_karma, profileRelevantTermDropped); 2:141 (genel_karma, keyTermMissingInV4) |  |  |
| 23 | `ح س ن ا ح س ن guzel` | unclear | güzel | 12 | 2:245 (genel_karma, keyTermMissingInV4); 2:245 (genel_karma, profileRelevantTermDropped); 3:37 (hukum_istisna, keyTermMissingInV4); 3:37 (hukum_istisna, profileRelevantTermDropped); 8:17 (uyari_inkar, keyTermMissingInV4) |  |  |
| 24 | `ع ز يز ع ز يز guclu aziz` | unclear | güçlü, aziz | 12 | 5:38 (ahiret, keyTermMissingInV4); 5:38 (ahiret, profileRelevantTermDropped); 8:10 (uyari_inkar, keyTermMissingInV4); 8:10 (uyari_inkar, profileRelevantTermDropped); 8:49 (uyari_inkar, keyTermMissingInV4) |  |  |
| 25 | `ع ظ يم ع ظ يم buyuk` | unclear | Büyük | 12 | 2:114 (uyari_inkar, keyTermMissingInV4); 2:114 (uyari_inkar, profileRelevantTermDropped); 12:28 (kissa, keyTermMissingInV4); 12:28 (kissa, profileRelevantTermDropped); 16:94 (uyari_inkar, keyTermMissingInV4) |  |  |
| 26 | `ف و ق ف و ق ustunde` | unclear | Üstünde | 12 | 4:11 (tevhid_birlik, keyTermMissingInV4); 4:11 (tevhid_birlik, profileRelevantTermDropped); 6:165 (genel_karma, keyTermMissingInV4); 6:165 (genel_karma, profileRelevantTermDropped); 14:26 (tevhid_birlik, keyTermMissingInV4) |  |  |
| 27 | `و ي و م ي و م gun` | unclear | gün | 12 | 9:25 (genel_karma, keyTermMissingInV4); 9:25 (genel_karma, profileRelevantTermDropped); 10:45 (yol_hidayet, keyTermMissingInV4); 10:45 (yol_hidayet, profileRelevantTermDropped); 16:80 (yol_hidayet, keyTermMissingInV4) |  |  |
| 28 | `ٱل ع ر ش ع ر ش catıları` | unclear | çatıları | 11 | 9:129 (genel_karma, keyTermOnlyInV4); 17:42 (yol_hidayet, keyTermOnlyInV4); 20:5 (genel_karma, keyTermOnlyInV4); 21:22 (genel_karma, keyTermOnlyInV4); 23:86 (genel_karma, keyTermOnlyInV4) |  |  |
| 29 | `ٱلن ه ار ن هار gunduz` | unclear | gündüz | 11 | 3:27 (ahiret, keyTermOnlyInV4); 11:114 (dua_kulluk, keyTermOnlyInV4); 22:61 (uyari_inkar, keyTermOnlyInV4); 25:47 (genel_karma, keyTermOnlyInV4); 31:29 (genel_karma, keyTermOnlyInV4) |  |  |
| 30 | `ٱل ا م ر ا م ر emir is` | unclear | emir, iş | 10 | 2:210 (genel_karma, keyTermMissingInV4); 2:210 (genel_karma, profileRelevantTermDropped); 3:159 (rahmet_magfiret, keyTermMissingInV4); 3:159 (rahmet_magfiret, profileRelevantTermDropped); 11:44 (kissa, keyTermMissingInV4) |  |  |
| 31 | `ٱل ع ز يز ع ز يز guclu aziz` | unclear | güçlü, aziz | 10 | 3:126 (uyari_inkar, keyTermMissingInV4); 3:126 (uyari_inkar, profileRelevantTermDropped); 12:30 (yol_hidayet, keyTermMissingInV4); 12:30 (yol_hidayet, profileRelevantTermDropped); 30:27 (genel_karma, keyTermMissingInV4) |  |  |
| 32 | `ٱل م ج ر م ون م ج ر م suclular` | unclear | suçlular | 10 | 8:8 (genel_karma, keyTermOnlyInV4); 10:17 (uyari_inkar, keyTermOnlyInV4); 10:50 (uyari_inkar, keyTermOnlyInV4); 10:82 (kissa, keyTermOnlyInV4); 18:53 (ahiret, keyTermOnlyInV4) |  |  |
| 33 | `ٱل م ل ا م ل ا ileri gelenler` | unclear | ileri gelenler | 10 | 7:60 (kissa, keyTermOnlyInV4); 7:66 (kissa, keyTermOnlyInV4); 7:88 (kissa, keyTermOnlyInV4); 7:90 (kissa, keyTermOnlyInV4); 7:109 (kissa, keyTermOnlyInV4) |  |  |
| 34 | `ٱل م و م ن ون م و م ن mumin` | unclear | Mümin | 10 | 5:11 (yol_hidayet, keyTermMissingInV4); 5:11 (yol_hidayet, profileRelevantTermDropped); 8:74 (genel_karma, keyTermMissingInV4); 8:74 (genel_karma, profileRelevantTermDropped); 9:122 (ahiret, keyTermMissingInV4) |  |  |
| 35 | `ٱلر ح م ن ر ح م ن` | unclear | رَحْمٰن | 10 | 19:69 (genel_karma, keyTermMissingInV4); 19:69 (genel_karma, profileRelevantTermDropped); 19:78 (genel_karma, keyTermMissingInV4); 19:78 (genel_karma, profileRelevantTermDropped); 20:5 (genel_karma, keyTermMissingInV4) |  |  |
| 36 | `ٱلن س ا ء ن ساء kadınlarınız` | unclear | kadınlarınız | 10 | 2:236 (emir_yasak, keyTermOnlyInV4); 3:14 (yol_hidayet, keyTermOnlyInV4); 4:3 (tevhid_birlik, keyTermOnlyInV4); 4:4 (genel_karma, keyTermOnlyInV4); 4:22 (genel_karma, keyTermOnlyInV4) |  |  |
| 37 | `ا ص ح ب ا ص حاب sahipler arkadaslar` | unclear | sahipler, arkadaşlar | 10 | 7:42 (ahiret, keyTermMissingInV4); 7:42 (ahiret, profileRelevantTermDropped); 7:47 (genel_karma, keyTermMissingInV4); 7:47 (genel_karma, profileRelevantTermDropped); 13:5 (ahiret, keyTermMissingInV4) |  |  |
| 38 | `ا ع ل م ا ع ل م daha iyi bilir` | unclear | daha iyi bilir | 10 | 3:36 (dua_kulluk, keyTermMissingInV4); 3:36 (dua_kulluk, profileRelevantTermDropped); 12:77 (kissa, keyTermMissingInV4); 12:77 (kissa, profileRelevantTermDropped); 18:22 (genel_karma, keyTermMissingInV4) |  |  |
| 39 | `ا م ر ا م ر emir is` | unclear | emir, iş | 10 | 5:52 (uyari_inkar, keyTermMissingInV4); 5:52 (uyari_inkar, profileRelevantTermDropped); 11:43 (kissa, keyTermMissingInV4); 11:43 (kissa, profileRelevantTermDropped); 11:59 (genel_karma, keyTermMissingInV4) |  |  |
| 40 | `ا م ر ن ا ا م ر emir is` | unclear | emir, iş | 10 | 3:147 (genel_karma, keyTermMissingInV4); 3:147 (genel_karma, profileRelevantTermDropped); 9:50 (emir_yasak, keyTermMissingInV4); 9:50 (emir_yasak, profileRelevantTermDropped); 11:40 (genel_karma, keyTermMissingInV4) |  |  |
| 41 | `ا ه ل ا ه ل ehil sahip` | unclear | ehil, sahip | 10 | 3:75 (kissa, keyTermMissingInV4); 3:75 (kissa, profileRelevantTermDropped); 18:77 (kissa, keyTermMissingInV4); 18:77 (kissa, profileRelevantTermDropped); 28:12 (kissa, keyTermMissingInV4) |  |  |
| 42 | `ا ه ل ه ا ا ه ل ehil sahip` | unclear | ehil, sahip | 10 | 7:100 (uyari_inkar, keyTermMissingInV4); 7:100 (uyari_inkar, profileRelevantTermDropped); 18:71 (kissa, keyTermMissingInV4); 18:71 (kissa, profileRelevantTermDropped); 24:27 (genel_karma, keyTermMissingInV4) |  |  |
| 43 | `ا ي ام ي و م gun` | unclear | gün | 10 | 2:184 (emir_yasak, keyTermMissingInV4); 2:184 (emir_yasak, profileRelevantTermDropped); 7:54 (uyari_inkar, keyTermMissingInV4); 7:54 (uyari_inkar, profileRelevantTermDropped); 11:7 (ahiret, keyTermMissingInV4) |  |  |
| 44 | `ب ص ير ب ص ير goren` | unclear | gören | 10 | 2:96 (uyari_inkar, keyTermMissingInV4); 2:96 (uyari_inkar, profileRelevantTermDropped); 2:237 (uyari_inkar, keyTermMissingInV4); 2:237 (uyari_inkar, profileRelevantTermDropped); 11:112 (uyari_inkar, keyTermMissingInV4) |  |  |
| 45 | `ز ي ن ز ي ن suslemek` | unclear | süslemek | 10 | 2:212 (uyari_inkar, keyTermOnlyInV4); 3:14 (yol_hidayet, keyTermOnlyInV4); 6:122 (uyari_inkar, keyTermOnlyInV4); 6:137 (ahiret, keyTermOnlyInV4); 8:48 (genel_karma, keyTermOnlyInV4) |  |  |
| 46 | `س ا ء ساء onları uzer` | unclear | onları üzer | 10 | 5:66 (genel_karma, keyTermOnlyInV4); 6:31 (genel_karma, keyTermOnlyInV4); 6:136 (yol_hidayet, keyTermOnlyInV4); 7:177 (uyari_inkar, keyTermOnlyInV4); 9:9 (genel_karma, keyTermOnlyInV4) |  |  |
| 47 | `ع اد عاد ad kavmi` | unclear | âd kavmi | 10 | 7:65 (kissa, keyTermOnlyInV4); 11:50 (kissa, keyTermOnlyInV4); 11:59 (genel_karma, keyTermOnlyInV4); 26:123 (genel_karma, keyTermOnlyInV4); 36:39 (genel_karma, keyTermOnlyInV4) |  |  |
| 48 | `ف ذ وق وا ذاق tadın` | unclear | tadın | 10 | 3:106 (uyari_inkar, keyTermOnlyInV4); 6:30 (uyari_inkar, keyTermOnlyInV4); 7:39 (uyari_inkar, keyTermOnlyInV4); 8:35 (uyari_inkar, keyTermOnlyInV4); 9:35 (ahiret, keyTermOnlyInV4) |  |  |
| 49 | `ق و ل ا ق و ل soz kelam` | unclear | söz, kelam | 10 | 4:5 (kissa, keyTermMissingInV4); 4:5 (kissa, profileRelevantTermDropped); 4:8 (emir_yasak, keyTermMissingInV4); 4:8 (emir_yasak, profileRelevantTermDropped); 4:9 (genel_karma, keyTermMissingInV4) |  |  |
| 50 | `ل ل م و م ن ين م و م ن mumin` | unclear | Mümin | 10 | 2:97 (yol_hidayet, keyTermMissingInV4); 2:97 (yol_hidayet, profileRelevantTermDropped); 9:61 (uyari_inkar, keyTermMissingInV4); 9:61 (uyari_inkar, profileRelevantTermDropped); 10:57 (yol_hidayet, keyTermMissingInV4) |  |  |
| 51 | `م ت ع م تاع gecici fayda` | unclear | geçici fayda | 10 | 3:14 (yol_hidayet, keyTermMissingInV4); 3:14 (yol_hidayet, profileRelevantTermDropped); 3:185 (ahiret, keyTermMissingInV4); 3:185 (ahiret, profileRelevantTermDropped); 9:38 (yol_hidayet, keyTermMissingInV4) |  |  |
| 52 | `م و م ن ين م و م ن mumin` | unclear | Mümin | 10 | 5:23 (yol_hidayet, keyTermMissingInV4); 5:23 (yol_hidayet, profileRelevantTermDropped); 7:72 (uyari_inkar, keyTermMissingInV4); 7:72 (uyari_inkar, profileRelevantTermDropped); 9:13 (genel_karma, keyTermMissingInV4) |  |  |
| 53 | `ن ذ ير ن ذ ير uyarıcı` | unclear | uyarıcı | 10 | 5:19 (rahmet_magfiret, keyTermMissingInV4); 5:19 (rahmet_magfiret, profileRelevantTermDropped); 28:46 (kissa, keyTermMissingInV4); 28:46 (kissa, profileRelevantTermDropped); 34:46 (tevhid_birlik, keyTermMissingInV4) |  |  |
| 54 | `و ب ش ر ب ش ر mujde ver` | unclear | müjde ver | 10 | 2:25 (ahiret, keyTermOnlyInV4); 2:155 (genel_karma, keyTermOnlyInV4); 2:223 (genel_karma, keyTermOnlyInV4); 9:3 (uyari_inkar, keyTermOnlyInV4); 9:112 (dua_kulluk, keyTermOnlyInV4) |  |  |
| 55 | `و ع د و ع د vaat etti` | unclear | vaat etti | 10 | 11:65 (genel_karma, keyTermMissingInV4); 11:65 (genel_karma, profileRelevantTermDropped); 17:7 (emir_yasak, keyTermMissingInV4); 17:7 (emir_yasak, profileRelevantTermDropped); 17:104 (ahiret, keyTermMissingInV4) |  |  |
| 56 | `ٱل ا ع ل ى ا ع ل ى yuksek` | unclear | yüksek | 8 | 20:68 (genel_karma, keyTermOnlyInV4); 30:27 (genel_karma, keyTermOnlyInV4); 37:8 (uyari_inkar, keyTermOnlyInV4); 38:69 (tevhid_birlik, keyTermOnlyInV4); 53:7 (genel_karma, keyTermOnlyInV4) |  |  |
| 57 | `ٱل ب ر ب ر iyilik` | unclear | İyilik | 8 | 10:22 (ahiret, keyTermMissingInV4); 10:22 (ahiret, profileRelevantTermDropped); 17:67 (genel_karma, keyTermMissingInV4); 17:67 (genel_karma, profileRelevantTermDropped); 27:63 (yol_hidayet, keyTermMissingInV4) |  |  |
| 58 | `ٱل ح س ن ى ح س ن ى guzel` | unclear | güzel | 8 | 7:137 (kissa, keyTermMissingInV4); 7:137 (kissa, profileRelevantTermDropped); 7:180 (ahiret, keyTermMissingInV4); 7:180 (ahiret, profileRelevantTermDropped); 17:110 (dua_kulluk, keyTermMissingInV4) |  |  |
| 59 | `ٱل ح ك يم ح ك يم hikmetli hakim` | unclear | hikmetli, hakim | 8 | 3:6 (genel_karma, keyTermMissingInV4); 3:6 (genel_karma, profileRelevantTermDropped); 3:126 (uyari_inkar, keyTermMissingInV4); 3:126 (uyari_inkar, profileRelevantTermDropped); 30:27 (genel_karma, keyTermMissingInV4) |  |  |
| 60 | `ٱل ع ظ يم ع ظ يم buyuk` | unclear | Büyük | 8 | 9:89 (ahiret, keyTermMissingInV4); 9:89 (ahiret, profileRelevantTermDropped); 9:129 (genel_karma, keyTermMissingInV4); 9:129 (genel_karma, profileRelevantTermDropped); 10:64 (genel_karma, keyTermMissingInV4) |  |  |
| 61 | `ٱل ق و ل ق و ل soz kelam` | unclear | söz, kelam | 8 | 4:108 (genel_karma, keyTermMissingInV4); 4:108 (genel_karma, profileRelevantTermDropped); 27:82 (genel_karma, keyTermMissingInV4); 27:82 (genel_karma, profileRelevantTermDropped); 41:25 (genel_karma, keyTermMissingInV4) |  |  |
| 62 | `ٱل م د ين ة م د ين ة sehir` | unclear | şehir | 8 | 12:30 (yol_hidayet, keyTermOnlyInV4); 15:67 (genel_karma, keyTermOnlyInV4); 27:48 (genel_karma, keyTermOnlyInV4); 28:15 (kissa, keyTermOnlyInV4); 28:18 (kissa, keyTermOnlyInV4) |  |  |
| 63 | `ٱلص ور ص ور sur` | unclear | sûr | 8 | 20:102 (ahiret, keyTermOnlyInV4); 23:101 (genel_karma, keyTermOnlyInV4); 27:87 (genel_karma, keyTermOnlyInV4); 36:51 (genel_karma, keyTermOnlyInV4); 39:68 (genel_karma, keyTermOnlyInV4) |  |  |
| 64 | `ا ح س ن ا ح س ن daha guzel` | unclear | daha güzel | 8 | 6:152 (emir_yasak, keyTermMissingInV4); 6:152 (emir_yasak, profileRelevantTermDropped); 11:7 (ahiret, keyTermMissingInV4); 11:7 (ahiret, profileRelevantTermDropped); 16:125 (yol_hidayet, keyTermMissingInV4) |  |  |
| 65 | `ا ز و ج ا ز و ج es cift` | unclear | eş, çift | 8 | 2:234 (emir_yasak, keyTermMissingInV4); 2:234 (emir_yasak, profileRelevantTermDropped); 20:53 (genel_karma, keyTermMissingInV4); 20:53 (genel_karma, profileRelevantTermDropped); 30:21 (genel_karma, keyTermMissingInV4) |  |  |
| 66 | `ا س ر ـ ء يل ا س راي يل israil` | unclear | İsrail | 8 | 3:49 (genel_karma, keyTermMissingInV4); 3:49 (genel_karma, profileRelevantTermDropped); 7:105 (genel_karma, keyTermMissingInV4); 7:105 (genel_karma, profileRelevantTermDropped); 10:90 (kissa, keyTermMissingInV4) |  |  |
| 67 | `ا ق س م ا ق س م yemin etmek` | unclear | yemin etmek | 8 | 56:75 (genel_karma, keyTermOnlyInV4); 69:38 (uyari_inkar, keyTermOnlyInV4); 70:40 (genel_karma, keyTermOnlyInV4); 75:1 (genel_karma, keyTermOnlyInV4); 75:2 (genel_karma, keyTermOnlyInV4) |  |  |
| 68 | `ا ن ى ا ن ى nasıl` | unclear | nasıl | 8 | 3:40 (genel_karma, keyTermOnlyInV4); 3:47 (genel_karma, keyTermOnlyInV4); 3:165 (tevhid_birlik, keyTermOnlyInV4); 6:101 (genel_karma, keyTermOnlyInV4); 19:8 (genel_karma, keyTermOnlyInV4) |  |  |
| 69 | `ا ي م ن ك م ي م ين sag yemin` | unclear | sağ, yemin | 8 | 4:3 (tevhid_birlik, keyTermMissingInV4); 4:3 (tevhid_birlik, profileRelevantTermDropped); 4:24 (rahmet_magfiret, keyTermMissingInV4); 4:24 (rahmet_magfiret, profileRelevantTermDropped); 5:89 (uyari_inkar, keyTermMissingInV4) |  |  |
| 70 | `ب ن ي ب ن ى oglum` | unclear | oğlum | 8 | 7:137 (kissa, keyTermMissingInV4); 7:137 (kissa, profileRelevantTermDropped); 10:93 (genel_karma, keyTermMissingInV4); 10:93 (genel_karma, profileRelevantTermDropped); 17:70 (emir_yasak, keyTermMissingInV4) |  |  |
| 71 | `ت ح ت ت ح ت altında` | unclear | altında | 8 | 5:66 (genel_karma, keyTermMissingInV4); 5:66 (genel_karma, profileRelevantTermDropped); 29:55 (uyari_inkar, keyTermMissingInV4); 29:55 (uyari_inkar, profileRelevantTermDropped); 48:18 (uyari_inkar, keyTermMissingInV4) |  |  |
| 72 | `ت ح ت ه ا ت ح ت altında` | unclear | altında | 8 | 4:13 (ahiret, keyTermMissingInV4); 4:13 (ahiret, profileRelevantTermDropped); 9:100 (ahiret, keyTermMissingInV4); 9:100 (ahiret, profileRelevantTermDropped); 39:20 (genel_karma, keyTermMissingInV4) |  |  |
| 73 | `خ ل د ون خال د ebedi kalan` | unclear | ebedi kalan | 8 | 2:81 (ahiret, keyTermMissingInV4); 2:81 (ahiret, profileRelevantTermDropped); 5:80 (uyari_inkar, keyTermMissingInV4); 5:80 (uyari_inkar, profileRelevantTermDropped); 7:42 (ahiret, keyTermMissingInV4) |  |  |
| 74 | `خ ي ر ا خ ي ر hayır` | unclear | Hayır | 8 | 2:158 (emir_yasak, keyTermMissingInV4); 2:158 (emir_yasak, profileRelevantTermDropped); 11:31 (emir_yasak, keyTermMissingInV4); 11:31 (emir_yasak, profileRelevantTermDropped); 33:25 (uyari_inkar, keyTermMissingInV4) |  |  |
| 75 | `ذ وق وا ذاق tadın` | unclear | tadın | 8 | 3:181 (uyari_inkar, keyTermOnlyInV4); 10:52 (ahiret, keyTermOnlyInV4); 29:55 (uyari_inkar, keyTermOnlyInV4); 32:20 (ahiret, keyTermOnlyInV4); 34:42 (ahiret, keyTermOnlyInV4) |  |  |
| 76 | `ر و س ي ر واس ي dag` | unclear | dağ | 8 | 13:3 (uyari_inkar, keyTermOnlyInV4); 15:19 (ahiret, keyTermOnlyInV4); 16:15 (yol_hidayet, keyTermOnlyInV4); 21:31 (yol_hidayet, keyTermOnlyInV4); 27:61 (tevhid_birlik, keyTermOnlyInV4) |  |  |
| 77 | `ش د يد ش د يد siddetli` | unclear | şiddetli | 8 | 8:13 (genel_karma, keyTermMissingInV4); 8:13 (genel_karma, profileRelevantTermDropped); 8:25 (genel_karma, keyTermMissingInV4); 8:25 (genel_karma, profileRelevantTermDropped); 13:13 (genel_karma, keyTermMissingInV4) |  |  |
| 78 | `ك ب ير ا ك ب ير buyuk` | unclear | büyük | 8 | 4:2 (genel_karma, keyTermMissingInV4); 4:2 (genel_karma, profileRelevantTermDropped); 17:4 (genel_karma, keyTermMissingInV4); 17:4 (genel_karma, profileRelevantTermDropped); 25:19 (uyari_inkar, keyTermMissingInV4) |  |  |
| 79 | `ك ي ف ك ي ف nasıl` | unclear | Nasıl | 8 | 5:64 (kissa, keyTermMissingInV4); 5:64 (kissa, profileRelevantTermDropped); 7:103 (kissa, keyTermMissingInV4); 7:103 (kissa, profileRelevantTermDropped); 50:6 (tevhid_birlik, keyTermMissingInV4) |  |  |
| 80 | `م ت ع ا م تاع gecici fayda` | unclear | geçici fayda | 8 | 2:236 (emir_yasak, keyTermMissingInV4); 2:236 (emir_yasak, profileRelevantTermDropped); 2:240 (emir_yasak, keyTermMissingInV4); 2:240 (emir_yasak, profileRelevantTermDropped); 5:96 (ahiret, keyTermMissingInV4) |  |  |
| 81 | `م ث ل م ث ل gibi benzer` | unclear | gibi, benzer | 8 | 2:214 (ahiret, keyTermMissingInV4); 2:214 (ahiret, profileRelevantTermDropped); 4:11 (tevhid_birlik, keyTermMissingInV4); 4:11 (tevhid_birlik, profileRelevantTermDropped); 5:31 (kissa, keyTermMissingInV4) |  |  |
| 82 | `و ح د واح د birlemek tek` | unclear | birlemek, tek | 8 | 5:73 (tevhid_birlik, keyTermMissingInV4); 5:73 (tevhid_birlik, profileRelevantTermDropped); 12:67 (tevhid_birlik, keyTermMissingInV4); 12:67 (tevhid_birlik, profileRelevantTermDropped); 13:4 (tevhid_birlik, keyTermMissingInV4) |  |  |
| 83 | `ي و م ي ذ ي و م gun` | unclear | gün | 8 | 11:66 (genel_karma, keyTermMissingInV4); 11:66 (genel_karma, profileRelevantTermDropped); 20:102 (ahiret, keyTermMissingInV4); 20:102 (ahiret, profileRelevantTermDropped); 23:101 (genel_karma, keyTermMissingInV4) |  |  |
| 84 | `ٱل ا ن ه ر ن ه ر ırmaklar` | unclear | ırmaklar | 7 | 3:198 (ahiret, keyTermOnlyInV4); 5:85 (ahiret, keyTermOnlyInV4); 9:89 (ahiret, keyTermOnlyInV4); 16:31 (ahiret, keyTermOnlyInV4); 17:91 (ahiret, keyTermOnlyInV4) |  |  |
| 85 | `ٱل ب ل د ب ل د sehir` | unclear | şehir | 7 | 3:196 (uyari_inkar, keyTermOnlyInV4); 40:4 (uyari_inkar, keyTermOnlyInV4); 89:8 (tevhid_birlik, keyTermOnlyInV4); 89:11 (genel_karma, keyTermOnlyInV4); 90:1 (genel_karma, keyTermOnlyInV4) |  |  |
| 86 | `ٱل غ ن ي غ ن ي mustagni` | unclear | müstağni | 7 | 6:133 (tevhid_birlik, keyTermOnlyInV4); 10:68 (tevhid_birlik, keyTermOnlyInV4); 22:64 (genel_karma, keyTermOnlyInV4); 31:26 (genel_karma, keyTermOnlyInV4); 35:15 (genel_karma, keyTermOnlyInV4) |  |  |
| 87 | `ٱل م خ ل ص ين م خ ل ص secilmis` | unclear | seçilmiş | 7 | 15:40 (dua_kulluk, keyTermOnlyInV4); 37:40 (dua_kulluk, keyTermOnlyInV4); 37:74 (dua_kulluk, keyTermOnlyInV4); 37:128 (dua_kulluk, keyTermOnlyInV4); 37:160 (dua_kulluk, keyTermOnlyInV4) |  |  |
| 88 | `ٱل م س ل م ين م س ل م muslumanlar` | unclear | müslümanlar | 7 | 6:163 (genel_karma, keyTermOnlyInV4); 10:72 (genel_karma, keyTermOnlyInV4); 33:35 (genel_karma, keyTermOnlyInV4); 39:12 (genel_karma, keyTermOnlyInV4); 41:33 (dua_kulluk, keyTermOnlyInV4) |  |  |
| 89 | `ا س ل م ا س ل م teslim olmak` | unclear | teslim olmak | 7 | 2:112 (emir_yasak, keyTermOnlyInV4); 2:131 (genel_karma, keyTermOnlyInV4); 3:83 (ahiret, keyTermOnlyInV4); 4:125 (ahiret, keyTermOnlyInV4); 6:14 (tevhid_birlik, keyTermOnlyInV4) |  |  |
| 90 | `ب ا س ن ا ب ا س savas` | unclear | savaş | 7 | 6:43 (uyari_inkar, keyTermOnlyInV4); 7:4 (genel_karma, keyTermOnlyInV4); 7:5 (dua_kulluk, keyTermOnlyInV4); 7:97 (genel_karma, keyTermOnlyInV4); 7:98 (genel_karma, keyTermOnlyInV4) |  |  |
| 91 | `ت س ت ع ج ل ون اس ت ع ج ل acele istemek` | unclear | acele istemek | 7 | 6:57 (genel_karma, keyTermOnlyInV4); 6:58 (genel_karma, keyTermOnlyInV4); 10:51 (genel_karma, keyTermOnlyInV4); 21:37 (genel_karma, keyTermOnlyInV4); 27:46 (rahmet_magfiret, keyTermOnlyInV4) |  |  |
| 92 | `ح م يم ح م يم kaynar su` | unclear | kaynar su | 7 | 26:101 (genel_karma, keyTermOnlyInV4); 37:67 (genel_karma, keyTermOnlyInV4); 38:57 (genel_karma, keyTermOnlyInV4); 55:44 (ahiret, keyTermOnlyInV4); 56:93 (genel_karma, keyTermOnlyInV4) |  |  |
| 93 | `خ س ر و ا خ س ر kayıp` | unclear | kayıp | 7 | 6:12 (rahmet_magfiret, keyTermOnlyInV4); 6:20 (genel_karma, keyTermOnlyInV4); 7:9 (ahiret, keyTermOnlyInV4); 11:21 (ahiret, keyTermOnlyInV4); 23:103 (ahiret, keyTermOnlyInV4) |  |  |
| 94 | `خ ل ف ه م خ ل ف arkalarından` | unclear | arkalarından | 7 | 4:9 (genel_karma, keyTermOnlyInV4); 7:17 (yol_hidayet, keyTermOnlyInV4); 8:57 (genel_karma, keyTermOnlyInV4); 20:110 (genel_karma, keyTermOnlyInV4); 21:28 (genel_karma, keyTermOnlyInV4) |  |  |
| 95 | `س ن ين س ن ين yıllar` | unclear | yıllar | 7 | 12:47 (kissa, keyTermOnlyInV4); 18:11 (genel_karma, keyTermOnlyInV4); 18:25 (genel_karma, keyTermOnlyInV4); 23:112 (genel_karma, keyTermOnlyInV4); 26:18 (kissa, keyTermOnlyInV4) |  |  |
| 96 | `ش ك ش ك suphe` | unclear | şüphe | 7 | 10:94 (genel_karma, keyTermOnlyInV4); 10:104 (dua_kulluk, keyTermOnlyInV4); 11:62 (dua_kulluk, keyTermOnlyInV4); 27:66 (ahiret, keyTermOnlyInV4); 34:21 (tevhid_birlik, keyTermOnlyInV4) |  |  |
| 97 | `ل ب ث ت م ل ب ث kaldım` | unclear | kaldım | 7 | 17:52 (dua_kulluk, keyTermOnlyInV4); 18:19 (genel_karma, keyTermOnlyInV4); 20:103 (genel_karma, keyTermOnlyInV4); 20:104 (tevhid_birlik, keyTermOnlyInV4); 23:112 (genel_karma, keyTermOnlyInV4) |  |  |
| 98 | `ن ط ف ة ن ط ف ة meni damlası` | unclear | meni damlası | 7 | 16:4 (genel_karma, keyTermOnlyInV4); 23:13 (genel_karma, keyTermOnlyInV4); 36:77 (genel_karma, keyTermOnlyInV4); 53:46 (genel_karma, keyTermOnlyInV4); 75:37 (genel_karma, keyTermOnlyInV4) |  |  |
| 99 | `و ا ع ت د ن ا ا ع ت د ت hazırlamak` | unclear | hazırlamak | 7 | 4:37 (uyari_inkar, keyTermOnlyInV4); 4:151 (uyari_inkar, keyTermOnlyInV4); 4:161 (uyari_inkar, keyTermOnlyInV4); 25:11 (genel_karma, keyTermOnlyInV4); 25:37 (kissa, keyTermOnlyInV4) |  |  |
| 100 | `و ا ع د ا ع د hazırlamak` | unclear | hazırlamak | 7 | 4:93 (ahiret, keyTermOnlyInV4); 9:100 (ahiret, keyTermOnlyInV4); 33:8 (uyari_inkar, keyTermOnlyInV4); 33:44 (genel_karma, keyTermOnlyInV4); 33:57 (uyari_inkar, keyTermOnlyInV4) |  |  |

## Karar Alanlari

`classifyAs` alani manuel review icin bos birakildi. Onerilen degerler:

- `genericNeutral`
- `likelyUsefulV4Addition`
- `likelyRiskyDrop`
- `keepNeedsManualReview`

## Sonraki Kucuk Adim

Ilk 100 grup icinden tekrar eden ve net generic/content ayrimi yapilabilen 20-30 terim icin classifier'a kucuk, kaynak-agnostic kural eklenebilir. Belirsiz veya profil bagimli terimler `keepNeedsManualReview` olarak kalmali.
