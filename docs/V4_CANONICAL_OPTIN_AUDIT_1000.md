# V4 Canonical Opt-In Audit 1000

Bu rapor `canonical_word_analysis_v4` kaynağının default source'a dokunmadan ilk 1000 ayette JSON default ile karşılaştırmalı etkisini ölçer.

## İncelenen Altyapı

İlgili mevcut scriptler:

- `scripts/audit-verse-analysis-global.ts`
- `scripts/inspect-v2-keyterms-impact.ts`
- `scripts/inspect-verse-analysis-context.ts`

İlgili mevcut snapshotlar:

- `data/analysis-snapshots/verse-analysis-json-audit-1000.json`
- `data/analysis-snapshots/verse-analysis-v3-audit-1000.json`
- `data/analysis-snapshots/verse-analysis-v4-audit-1000.json`
- `data/analysis-snapshots/v4-keyterms-visibility-drift-audit.temp.json`

Yeni dar kapsamlı script:

- `scripts/audit-v4-canonical-optin-1000.ts`

## Özet Metrikler

- Toplam ayet: 1000
- Error count: 0
- JSON emptyKeyTerms: 191
- v4 emptyKeyTerms: 199
- JSON visibleKeyTerms: 2161
- v4 visibleKeyTerms: 2171
- v4 low-confidence visible term: 0
- v4 noisy term: 735
- JSON'da keyTerms varken v4'te boşalan ayet: 38
- JSON boşken v4 dolan ayet: 30
- Profile shift: 114
- v4 tarafından bastırılan noisy term: 144
- Kaybolan faydalı content term: 31
- Süre: 5116653 ms

## JSON Profile Dağılımı

- `genel_karma`: 319
- `uyari_inkar`: 157
- `ahiret`: 146
- `yol_hidayet`: 102
- `dua_kulluk`: 65
- `kissa`: 56
- `rahmet_magfiret`: 54
- `tevhid_birlik`: 51
- `emir_yasak`: 45
- `hukum_istisna`: 5

## v4 Profile Dağılımı

- `genel_karma`: 310
- `uyari_inkar`: 145
- `ahiret`: 127
- `yol_hidayet`: 113
- `dua_kulluk`: 85
- `tevhid_birlik`: 58
- `kissa`: 55
- `emir_yasak`: 53
- `rahmet_magfiret`: 49
- `hukum_istisna`: 5

## JSON Dolu / v4 Boş Örnekleri

- `2:4`: json(genel_karma) 5 term -> v4(tevhid_birlik) 0 term | removed: أُنزِلَ — İndirdi, قَبۡلِكَ — Önce, وَبِٱلۡأٓخِرَةِ — başka, diğer, يُؤۡمِنُونَ — iman, يُوقِنُونَ — Kesin inanır | added: -
- `2:139`: json(genel_karma) 5 term -> v4(dua_kulluk) 0 term | removed: أَتُحَآجُّونَنَا — hac, delil, أَعۡمَٰلُنَا — amel, iş, ٱللَّهِ — Allah, وَرَبُّكُمۡ — Rab, فِي — İçinde | added: -
- `2:149`: json(genel_karma) 5 term -> v4(dua_kulluk) 0 term | removed: ٱلۡحَرَامِۖ — Haram, ٱللَّهُ — Allah, ٱلۡمَسۡجِدِ — Mescid, تَعۡمَلُونَ — amel, iş, حَيۡثُ — nerede, -diği yerde | added: -
- `2:209`: json(genel_karma) 5 term -> v4(yol_hidayet) 0 term | removed: ٱلۡبَيِّنَٰتُ — apaçık delil, ٱللَّهَ — Allah, بَعۡدِ — sonra, ardından, حَكِيمٌ — hikmetli, hakim, عَزِيزٌ — güçlü, aziz | added: -
- `2:281`: json(genel_karma) 5 term -> v4(dua_kulluk) 0 term | removed: ٱللَّهِۖ — Allah, إِلَى — -e, -a doğru, تُرۡجَعُونَ — Döndü, ثُمَّ — sonra, ardından, كَسَبَتۡ — kazandı | added: -
- `3:18`: json(genel_karma) 5 term -> v4(dua_kulluk) 0 term | removed: ٱلۡحَكِيمُ — hikmetli, hakim, ٱلۡعَزِيزُ — güçlü, aziz, ٱلۡعِلۡمِ — İlim, ٱللَّهُ — Allah, إِلَٰهَ — ilah, tanrı | added: -
- `3:22`: json(genel_karma) 5 term -> v4(tevhid_birlik) 0 term | removed: أَعۡمَٰلُهُمۡ — amel, iş, ٱلدُّنۡيَا — Dünya, فِي — İçinde, نَّـٰصِرِينَ — yardim, وَٱلۡأٓخِرَةِ — başka, diğer | added: -
- `3:42`: json(genel_karma) 5 term -> v4(dua_kulluk) 0 term | removed: ٱلۡعَٰلَمِينَ — alem, evren, ٱللَّهَ — Allah, ٱلۡمَلَـٰٓئِكَةُ — Melek, عَلَىٰ — üzerine, üstüne, قَالَتِ — Dedi | added: -
- `3:115`: json(uyari_inkar) 1 term -> v4(emir_yasak) 0 term | removed: يُكۡفَرُوهُۗ — Küfretti | added: -
- `3:120`: json(tevhid_birlik) 1 term -> v4(emir_yasak) 0 term | removed: ٱللَّهَ — Allah | added: -
- `3:146`: json(genel_karma) 5 term -> v4(dua_kulluk) 0 term | removed: أَصَابَهُمۡ — isabet, ٱلصَّـٰبِرِينَ — Sabır, وَٱللَّهُ — Allah, رِبِّيُّونَ — rab, efendi, سَبِيلِ — Yol | added: -
- `3:161`: json(genel_karma) 5 term -> v4(tevhid_birlik) 0 term | removed: ٱلۡقِيَٰمَةِۚ — Kavim, ثُمَّ — sonra, ardından, كَانَ — Oldu, كَسَبَتۡ — kazandı, كُلُّ — Hepsi | added: -
- `3:184`: json(genel_karma) 5 term -> v4(tevhid_birlik) 0 term | removed: ٱلۡمُنِيرِ — Nur, بِٱلۡبَيِّنَٰتِ — apaçık delil, رُسُلٞ — Elçi, فَقَدۡ — ve, böylece, قَبۡلِكَ — Önce | added: -
- `4:25`: json(uyari_inkar) 2 term -> v4(rahmet_magfiret) 0 term | removed: ٱلۡعَذَابِۚ — Azap, بِإِيمَٰنِكُمۚ — İman | added: -
- `4:32`: json(tevhid_birlik) 1 term -> v4(yol_hidayet) 0 term | removed: ٱللَّهُ — Allah | added: -
- `4:70`: json(genel_karma) 3 term -> v4(yol_hidayet) 0 term | removed: ٱلۡفَضۡلُ — fazilet, lütuf, بِٱللَّهِ — Allah, عَلِيمٗا — bilen, alim | added: -
- `4:90`: json(yol_hidayet) 1 term -> v4(dua_kulluk) 0 term | removed: سَبِيلٗا — Yol | added: -
- `4:106`: json(genel_karma) 4 term -> v4(dua_kulluk) 0 term | removed: ٱللَّهَ — Allah, غَفُورٗا — çok bağışlayan, كَانَ — Oldu, وَٱسۡتَغۡفِرِ — Bağışladı | added: -
- `4:129`: json(genel_karma) 5 term -> v4(dua_kulluk) 0 term | removed: ٱللَّهَ — Allah, بَيۡنَ — arasında, تَسۡتَطِيعُوٓاْ — güç yetirdi, تُصۡلِحُواْ — ıslah, iyi olmak, تَعۡدِلُواْ — Adalet | added: -
- `5:6`: json(yol_hidayet) 1 term -> v4(emir_yasak) 0 term | removed: نِعۡمَتَهُۥ — nimet | added: -


## Profile Shift Örnekleri

- `2:4`: json(genel_karma) 5 term -> v4(tevhid_birlik) 0 term | removed: أُنزِلَ — İndirdi, قَبۡلِكَ — Önce, وَبِٱلۡأٓخِرَةِ — başka, diğer, يُؤۡمِنُونَ — iman, يُوقِنُونَ — Kesin inanır | added: -
- `2:22`: json(tevhid_birlik) 1 term -> v4(dua_kulluk) 1 term | removed: لِلَّهِ — Allah | added: رِزۡقٗا — rizik
- `2:58`: json(dua_kulluk) 0 term -> v4(rahmet_magfiret) 0 term | removed: - | added: -
- `2:70`: json(dua_kulluk) 1 term -> v4(yol_hidayet) 1 term | removed: ٱدۡعُ — dua | added: لَمُهۡتَدُونَ — hidayet
- `2:89`: json(rahmet_magfiret) 0 term -> v4(genel_karma) 5 term | removed: - | added: ٱلۡكَٰفِرِينَ — Kafir, ٱللَّهِ — Allah, عَرَفُواْ — tanımak, bilmek, عَلَى — üzerine, üstüne, عِندِ — yanında, katında
- `2:102`: json(ahiret) 1 term -> v4(genel_karma) 5 term | removed: شَرَوۡاْ — Şer | added: أَحَدٍ — Biri, أُنزِلَ — İndirdi, أَنفُسَهُمۡۚ — Nefis, ٱشۡتَرَىٰهُ — satın almak, ٱلۡأٓخِرَةِ — başka, diğer
- `2:135`: json(kissa) 1 term -> v4(genel_karma) 5 term | removed: - | added: أَوۡ — Veya, ٱلۡمُشۡرِكِينَ — Müşrik, بَلۡ — Aksine, تَهۡتَدُواْۗ — hidayete erdi
- `2:139`: json(genel_karma) 5 term -> v4(dua_kulluk) 0 term | removed: أَتُحَآجُّونَنَا — hac, delil, أَعۡمَٰلُنَا — amel, iş, ٱللَّهِ — Allah, وَرَبُّكُمۡ — Rab, فِي — İçinde | added: -
- `2:143`: json(uyari_inkar) 2 term -> v4(yol_hidayet) 2 term | removed: يَنقَلِبُ — Kalp, إِيمَٰنَكُمۡۚ — İman | added: هَدَى — hidayet, وَسَطٗا — orta yol
- `2:149`: json(genel_karma) 5 term -> v4(dua_kulluk) 0 term | removed: ٱلۡحَرَامِۖ — Haram, ٱللَّهُ — Allah, ٱلۡمَسۡجِدِ — Mescid, تَعۡمَلُونَ — amel, iş, حَيۡثُ — nerede, -diği yerde | added: -
- `2:151`: json(tevhid_birlik) 0 term -> v4(yol_hidayet) 0 term | removed: - | added: -
- `2:159`: json(rahmet_magfiret) 0 term -> v4(yol_hidayet) 1 term | removed: - | added: وَٱلۡهُدَىٰ — hidayet
- `2:175`: json(genel_karma) 5 term -> v4(yol_hidayet) 1 term | removed: أَصۡبَرَهُمۡ — Sabır, ٱلضَّلَٰلَةَ — Dalalet, ٱلنَّارِ — Ateş/Cehennem, بِٱلۡمَغۡفِرَةِۚ — Bağışlama | added: -
- `2:200`: json(dua_kulluk) 0 term -> v4(kissa) 1 term | removed: - | added: ءَابَآءَكُمۡ — babalar, atalar
- `2:201`: json(ahiret) 1 term -> v4(genel_karma) 5 term | removed: - | added: ٱلۡأٓخِرَةِ — başka, diğer, ٱلدُّنۡيَا — Dünya, حَسَنَةٗ — güzel, رَبَّنَآ — Rab
- `2:209`: json(genel_karma) 5 term -> v4(yol_hidayet) 0 term | removed: ٱلۡبَيِّنَٰتُ — apaçık delil, ٱللَّهَ — Allah, بَعۡدِ — sonra, ardından, حَكِيمٌ — hikmetli, hakim, عَزِيزٌ — güçlü, aziz | added: -
- `2:214`: json(ahiret) 0 term -> v4(genel_karma) 5 term | removed: - | added: ءَامَنُواْ — iman, ٱلۡجَنَّةَ — cennet, ٱلرَّسُولُ — Elçi, ٱللَّهِ — Allah, تَدۡخُلُواْ — Girdi
- `2:219`: json(ahiret) 0 term -> v4(emir_yasak) 0 term | removed: - | added: -
- `2:220`: json(ahiret) 0 term -> v4(genel_karma) 5 term | removed: - | added: ٱلدُّنۡيَا — Dünya, وَٱللَّهُ — Allah, إِصۡلَاحٞ — ıslah, iyi olmak, تُخَالِطُوهُمۡ — karışmak, حَكِيمٞ — hikmetli, hakim
- `2:231`: json(yol_hidayet) 1 term -> v4(emir_yasak) 2 term | removed: نِعۡمَتَ — nimet | added: بِمَعۡرُوفٖۚ — İyilik, نَفۡسَهُۥۚ — Nefis


## v4 Low-Confidence Visible Term Örnekleri

- Yok.


## v4 Noisy Visible Term Örnekleri

- `1:1`: json(genel_karma) 3 term -> v4(genel_karma) 3 term | removed: - | added: -
- `1:2`: json(genel_karma) 4 term -> v4(genel_karma) 4 term | removed: - | added: -
- `1:3`: json(genel_karma) 1 term -> v4(genel_karma) 1 term | removed: - | added: -
- `1:4`: json(ahiret) 1 term -> v4(ahiret) 1 term | removed: - | added: -
- `1:6`: json(yol_hidayet) 2 term -> v4(yol_hidayet) 2 term | removed: - | added: -
- `1:7`: json(yol_hidayet) 3 term -> v4(yol_hidayet) 3 term | removed: - | added: -
- `2:2`: json(yol_hidayet) 2 term -> v4(yol_hidayet) 2 term | removed: - | added: -
- `2:3`: json(dua_kulluk) 4 term -> v4(dua_kulluk) 4 term | removed: - | added: -
- `2:11`: json(genel_karma) 5 term -> v4(genel_karma) 5 term | removed: مُصۡلِحُونَ — ıslah, iyi olmak | added: تُفۡسِدُواْ — bozgunculuk
- `2:12`: json(genel_karma) 1 term -> v4(genel_karma) 2 term | removed: - | added: يَشۡعُرُونَ — fark etmek
- `2:13`: json(genel_karma) 5 term -> v4(genel_karma) 5 term | removed: - | added: -
- `2:14`: json(genel_karma) 5 term -> v4(genel_karma) 5 term | removed: قَالُوٓاْ — Dedi | added: خَلَوۡاْ — geçip gitmek
- `2:15`: json(genel_karma) 2 term -> v4(genel_karma) 5 term | removed: - | added: طُغۡيَٰنِهِمۡ — azgınlık, وَيَمُدُّهُمۡ — uzatmak, يَسۡتَهۡزِئُ — alay etmek
- `2:24`: json(ahiret) 1 term -> v4(ahiret) 1 term | removed: - | added: -
- `2:27`: json(genel_karma) 5 term -> v4(genel_karma) 5 term | removed: - | added: -
- `2:29`: json(genel_karma) 5 term -> v4(genel_karma) 5 term | removed: - | added: -
- `2:30`: json(genel_karma) 5 term -> v4(genel_karma) 5 term | removed: رَبُّكَ — Rab | added: خَلِيفَةٗۖ — halife
- `2:31`: json(genel_karma) 5 term -> v4(genel_karma) 5 term | removed: صَٰدِقِينَ — doğru söyleyen | added: ءَادَمَ — Âdem
- `2:32`: json(genel_karma) 5 term -> v4(genel_karma) 5 term | removed: - | added: -
- `2:33`: json(genel_karma) 5 term -> v4(genel_karma) 5 term | removed: - | added: -


## v4'ün Bastırdığı Noisy Term Örnekleri

- `2:4`: json(genel_karma) 5 term -> v4(tevhid_birlik) 0 term | removed: أُنزِلَ — İndirdi, قَبۡلِكَ — Önce, وَبِٱلۡأٓخِرَةِ — başka, diğer, يُؤۡمِنُونَ — iman, يُوقِنُونَ — Kesin inanır | added: -
- `2:22`: json(tevhid_birlik) 1 term -> v4(dua_kulluk) 1 term | removed: لِلَّهِ — Allah | added: رِزۡقٗا — rizik
- `2:36`: json(genel_karma) 5 term -> v4(genel_karma) 5 term | removed: ٱلۡأَرۡضِ — Yer, حِينٖ — bir süre | added: مُسۡتَقَرّٞ — yer, ٱهۡبِطُواْ — inmek
- `2:66`: json(genel_karma) 4 term -> v4(genel_karma) 5 term | removed: وَمَوۡعِظَةٗ — ogut | added: خَلۡفَهَا — arkalarından, نَكَٰلٗا — ibretlik ceza
- `2:71`: json(genel_karma) 5 term -> v4(genel_karma) 5 term | removed: يَقُولُ — Dedi, لَّا — Hayır/değil, يَفۡعَلُونَ — Yaptı | added: بَقَرَةٞ — inek, تُثِيرُ — sürmek, تَسۡقِي — sulamak
- `2:84`: json(genel_karma) 5 term -> v4(genel_karma) 5 term | removed: تَشۡهَدُونَ — sahitlik, ثُمَّ — sonra, ardından | added: أَقۡرَرۡتُمۡ — onaylamak, تَسۡفِكُونَ — dökmek
- `2:100`: json(genel_karma) 5 term -> v4(genel_karma) 5 term | removed: لَا — Hayır/değil | added: أَوَكُلَّمَا — zaman
- `2:125`: json(genel_karma) 5 term -> v4(genel_karma) 5 term | removed: لِّلنَّاسِ — İnsanlar | added: طَهِّرَا — temizlemek
- `2:130`: json(genel_karma) 5 term -> v4(genel_karma) 5 term | removed: عَن — hakkında, -den | added: ٱصۡطَفَيۡنَٰهُ — seçmek
- `2:139`: json(genel_karma) 5 term -> v4(dua_kulluk) 0 term | removed: أَتُحَآجُّونَنَا — hac, delil, أَعۡمَٰلُنَا — amel, iş, ٱللَّهِ — Allah, وَرَبُّكُمۡ — Rab, فِي — İçinde | added: -
- `2:143`: json(uyari_inkar) 2 term -> v4(yol_hidayet) 2 term | removed: يَنقَلِبُ — Kalp, إِيمَٰنَكُمۡۚ — İman | added: هَدَى — hidayet, وَسَطٗا — orta yol
- `2:145`: json(genel_karma) 5 term -> v4(genel_karma) 5 term | removed: ٱلۡكِتَٰبَ — Kitap | added: أَهۡوَآءَهُم — arzuları
- `2:149`: json(genel_karma) 5 term -> v4(dua_kulluk) 0 term | removed: ٱلۡحَرَامِۖ — Haram, ٱللَّهُ — Allah, ٱلۡمَسۡجِدِ — Mescid, تَعۡمَلُونَ — amel, iş, حَيۡثُ — nerede, -diği yerde | added: -
- `2:167`: json(ahiret) 2 term -> v4(ahiret) 1 term | removed: ٱلنَّارِ — Ateş/Cehennem | added: -
- `2:175`: json(genel_karma) 5 term -> v4(yol_hidayet) 1 term | removed: أَصۡبَرَهُمۡ — Sabır, ٱلضَّلَٰلَةَ — Dalalet, ٱلنَّارِ — Ateş/Cehennem, بِٱلۡمَغۡفِرَةِۚ — Bağışlama | added: -
- `2:186`: json(dua_kulluk) 4 term -> v4(dua_kulluk) 3 term | removed: وَلۡيُؤۡمِنُواْ — iman | added: -
- `2:205`: json(genel_karma) 5 term -> v4(genel_karma) 5 term | removed: فِي — İçinde, لَا — Hayır/değil, وَٱللَّهُ — Allah | added: لِيُفۡسِدَ — bozgunculuk, سَعَىٰ — çaba göstermek, فِيهَا — içinde
- `2:209`: json(genel_karma) 5 term -> v4(yol_hidayet) 0 term | removed: ٱلۡبَيِّنَٰتُ — apaçık delil, ٱللَّهَ — Allah, بَعۡدِ — sonra, ardından, حَكِيمٌ — hikmetli, hakim, عَزِيزٌ — güçlü, aziz | added: -
- `2:210`: json(genel_karma) 5 term -> v4(genel_karma) 5 term | removed: هَلۡ — mı? (soru) | added: ظُلَلٖ — örtüler
- `2:223`: json(genel_karma) 5 term -> v4(genel_karma) 5 term | removed: لِأَنفُسِكُمۡۚ — Nefis, وَٱتَّقُواْ — sakındı, korundu | added: أَنَّىٰ — nasıl, حَرۡثَكُمۡ — ekin


## Kaybolan Faydalı Content Term Örnekleri

- `2:4`: json(genel_karma) 5 term -> v4(tevhid_birlik) 0 term | removed: أُنزِلَ — İndirdi, قَبۡلِكَ — Önce, وَبِٱلۡأٓخِرَةِ — başka, diğer, يُؤۡمِنُونَ — iman, يُوقِنُونَ — Kesin inanır | added: -
- `2:139`: json(genel_karma) 5 term -> v4(dua_kulluk) 0 term | removed: أَتُحَآجُّونَنَا — hac, delil, أَعۡمَٰلُنَا — amel, iş, ٱللَّهِ — Allah, وَرَبُّكُمۡ — Rab, فِي — İçinde | added: -
- `2:143`: json(uyari_inkar) 2 term -> v4(yol_hidayet) 2 term | removed: يَنقَلِبُ — Kalp, إِيمَٰنَكُمۡۚ — İman | added: هَدَى — hidayet, وَسَطٗا — orta yol
- `2:145`: json(genel_karma) 5 term -> v4(genel_karma) 5 term | removed: ٱلۡكِتَٰبَ — Kitap | added: أَهۡوَآءَهُم — arzuları
- `2:149`: json(genel_karma) 5 term -> v4(dua_kulluk) 0 term | removed: ٱلۡحَرَامِۖ — Haram, ٱللَّهُ — Allah, ٱلۡمَسۡجِدِ — Mescid, تَعۡمَلُونَ — amel, iş, حَيۡثُ — nerede, -diği yerde | added: -
- `2:154`: json(genel_karma) 5 term -> v4(genel_karma) 5 term | removed: سَبِيلِ — Yol | added: تَشۡعُرُونَ — fark etmek
- `2:186`: json(dua_kulluk) 4 term -> v4(dua_kulluk) 3 term | removed: وَلۡيُؤۡمِنُواْ — iman | added: -
- `2:231`: json(yol_hidayet) 1 term -> v4(emir_yasak) 2 term | removed: نِعۡمَتَ — nimet | added: بِمَعۡرُوفٖۚ — İyilik, نَفۡسَهُۥۚ — Nefis
- `3:4`: json(uyari_inkar) 2 term -> v4(yol_hidayet) 1 term | removed: عَذَابٞ — Azap, كَفَرُواْ — Küfretti | added: هُدٗى — hidayet
- `3:22`: json(genel_karma) 5 term -> v4(tevhid_birlik) 0 term | removed: أَعۡمَٰلُهُمۡ — amel, iş, ٱلدُّنۡيَا — Dünya, فِي — İçinde, نَّـٰصِرِينَ — yardim, وَٱلۡأٓخِرَةِ — başka, diğer | added: -
- `3:112`: json(uyari_inkar) 2 term -> v4(genel_karma) 5 term | removed: بِغَضَبٖ — gazap, يَكۡفُرُونَ — Küfretti | added: أَيۡنَ — Nerede, ٱلۡأَنۢبِيَآءَ — Peygamber, ٱللَّهِ — Allah, ٱلنَّاسِ — İnsanlar, بِـَٔايَٰتِ — ayet, delil
- `3:146`: json(genel_karma) 5 term -> v4(dua_kulluk) 0 term | removed: أَصَابَهُمۡ — isabet, ٱلصَّـٰبِرِينَ — Sabır, وَٱللَّهُ — Allah, رِبِّيُّونَ — rab, efendi, سَبِيلِ — Yol | added: -
- `3:184`: json(genel_karma) 5 term -> v4(tevhid_birlik) 0 term | removed: ٱلۡمُنِيرِ — Nur, بِٱلۡبَيِّنَٰتِ — apaçık delil, رُسُلٞ — Elçi, فَقَدۡ — ve, böylece, قَبۡلِكَ — Önce | added: -
- `3:194`: json(genel_karma) 5 term -> v4(genel_karma) 5 term | removed: رُسُلِكَ — Elçi, عَلَىٰ — üzerine, üstüne | added: تُخۡزِنَا — rezil etmek, تُخۡلِفُ — başarısız olmak
- `4:22`: json(genel_karma) 4 term -> v4(emir_yasak) 1 term | removed: سَبِيلًا — Yol, قَدۡ — muhakkak, gerçekten, كَانَ — Oldu | added: -
- `4:25`: json(uyari_inkar) 2 term -> v4(rahmet_magfiret) 0 term | removed: ٱلۡعَذَابِۚ — Azap, بِإِيمَٰنِكُمۚ — İman | added: -
- `4:90`: json(yol_hidayet) 1 term -> v4(dua_kulluk) 0 term | removed: سَبِيلٗا — Yol | added: -
- `4:94`: json(genel_karma) 5 term -> v4(tevhid_birlik) 1 term | removed: ءَامَنُوٓاْ — iman, أَلۡقَىٰٓ — attı, bıraktı, ٱلۡحَيَوٰةِ — Hayat, ٱلدُّنۡيَا — Dünya, ٱلسَّلَٰمَ — selam, barış | added: ٱللَّهِ — Allah
- `4:105`: json(genel_karma) 5 term -> v4(tevhid_birlik) 1 term | removed: أَرَىٰكَ — gördü, أَنزَلۡنَآ — İndirdi, ٱلۡكِتَٰبَ — Kitap, ٱلنَّاسِ — İnsanlar | added: -
- `4:129`: json(genel_karma) 5 term -> v4(dua_kulluk) 0 term | removed: ٱللَّهَ — Allah, بَيۡنَ — arasında, تَسۡتَطِيعُوٓاْ — güç yetirdi, تُصۡلِحُواْ — ıslah, iyi olmak, تَعۡدِلُواْ — Adalet | added: -


## Kısa Değerlendirme

- v4 bu audit içinde default yapılmadı.
- Runtime/UI davranışı değiştirilmedi.
- Eğer v4 noisy term sayısı düşük, low-confidence visible term sayısı kabul edilebilir ve profile shift sınırlıysa v4 sonraki fazda daha geniş audit'e adaydır.
- Eğer faydalı content term kaybı yüksekse v4 default için erken kabul edilmelidir.

