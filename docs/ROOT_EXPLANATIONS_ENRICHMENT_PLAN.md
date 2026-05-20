# Root Explanations Enrichment Plan

Tarih: 2026-05-13

Bu rapor, `root_explanations_tr_enriched.json` icindeki bos Turkce kok aciklamalarini inspect-only olarak inceler. Kod, veri, build/import, UI, preview veya decision logic degistirilmedi.

## 1. Genel Sayilar

| Metrik | Deger |
|---|---:|
| Toplam enriched kok sayisi | 983 |
| Seed kok sayisi | 250 |
| `short_tr` bos kok sayisi | 733 |
| `summary_tr` bos kok sayisi | 733 |
| Her iki alandan en az biri bos kok sayisi | 733 |
| Bos koklerin canonical v4 toplam gecis frekansi | 6637 |
| Risk: kolay | 413 |
| Risk: orta | 208 |
| Risk: zor | 112 |

Not: `quran_lemmas.csv` dogrudan root kolonu tasimiyor. Bu raporda lemma frequency/POS bilgisi, canonical v4 icindeki root-lemma eslesmesi uzerinden dolayli olarak baglandi.

## 2. En Yuksek Frekansli Bos 20 Kok

| Sira | Kok | Canonical gecis | quran_verbs gloss | Canonical Turkce anlamlar | Risk |
|---:|---|---:|---|---|---|
| 1 | `سبق` | 37 | to precede (20), to race (6) | önce gelmek (20), öne geçenler (7), yarışmak (6), geçilmiş (2) | zor |
| 2 | `نكر` | 37 | to deny (3), to feel unfamiliar (1), to disguise (1) | Kötülük (21), inkar etmek (16) | kolay |
| 3 | `قطع` | 36 | to cut (12), to cut, to divide (12), to cut, to severe (5) | kesmek (36) | kolay |
| 4 | `ريب` | 36 | to doubt (9) | Şüphe (36) | kolay |
| 5 | `حدث` | 36 | to report, to narate (3), to cause, to bring about (3) | hadis, olmak (36) | kolay |
| 6 | `بطل` | 36 | to make vain, to nullify (4), to become futile (1) | Batıl (26), batıl, boş (10) | kolay |
| 7 | `عفو` | 35 | to forgive, to pardon (27) | Affetti (27), affetmek (8) | kolay |
| 8 | `ورث` | 35 | to inherit (13), to make inherit (12) | miras almak (13), mirasçı kılmak (12), mirasçı (7), miras (3) | orta |
| 9 | `مرر` | 35 | to pass, to continue (10) | kez (30), sürekli (2), geçmek (1), defa (1) | zor |
| 10 | `كيد` | 35 | to scheme, to plot, to plan (8) | tuzak (34), tuzak kurmak (1) | kolay |
| 11 | `غفل` | 35 | to neglect (1), to make heedless (1) | habersiz (27), gaflet (5), ihmal etmek (1), gaflete düşürmek (1) | kolay |
| 12 | `خفي` | 34 | to conceal, to hide (18), to hide (9) | gizlemek (18), gizli (10), gizlenmek (3), gizlice (2) | zor |
| 13 | `جنح` | 34 | to incline (2) | sakınca (25), kanatlar (7), meyletmek (2) | kolay |
| 14 | `وثق` | 34 | to bound (1), to bind (1) | Ahit (25), sağlam söz (3), sağlam (2), bağ (2) | kolay |
| 15 | `كفي` | 33 | to be sufficient (32) | sana yeter (32), yetmek (1) | zor |
| 16 | `قسم` | 33 | to swear (21), to distribute (3), to seek division (1) | yemin etmek (20), paylaşma (3), paylaştırmak (3), yemin (3) | orta |
| 17 | `حجج` | 33 | to argue (12), to perform pilgrimage, to argue (1), to dispute (1) | hac, delil (22), Hac (11) | kolay |
| 18 | `جنب` | 33 | to avoid (10), to keep away (1), to remove from (1) | yan (17), kaçınmak (9), uzak (4), uzak tutmak (1) | orta |
| 19 | `ظلل` | 33 | to continue, to remain (9), to shade (2) | gölge (23), örtüler (6), gölgelendirmek (2), gölgeli (2) | kolay |
| 20 | `عمي` | 33 | to be blind (7), to obscure (1) | kör (21), körleşmek (7), körler (2), körlük (2) | orta |

## 3. En Sik Gecen Bos 100 Kok ve Kaynak Durumu

| Sira | Kok | Gecis | quran_verbs translation | quran_lemmas frequency/POS | word-translations rootMeaning | Canonical ornekleri | Risk |
|---:|---|---:|---|---|---|---|---|
| 1 | `سبق` | 37 | to precede (20), to race (6) | سَبَقَ (20; no lemma csv match), سابِق (7; no lemma csv match), اسْتَبَقَ (5; no lemma csv match), مَسْبُوق (2; no lemma csv match) | - | 2:148 فَٱسۡتَبِقُواْ=yarışmak; 5:48 فَٱسۡتَبِقُواْ=yarışmak; 7:80 سَبَقَكُم=önce gelmek | zor |
| 2 | `نكر` | 37 | to deny (3), to feel unfamiliar (1), to disguise (1) | مُنكَر (18; freq 18; Noun), نَكِير (5; freq 4; Noun), مُنكِر (3; no lemma csv match), يُنكِرُ (3; no lemma csv match) | inkar etmek | 3:104 ٱلۡمُنكَرِۚ=Kötülük; 3:110 ٱلۡمُنكَرِ=Kötülük; 3:114 ٱلۡمُنكَرِ=Kötülük | kolay |
| 3 | `قطع` | 36 | to cut (12), to cut, to divide (12), to cut, to severe (5) | قُطِعَ (12; no lemma csv match), قَطَّعَ (12; no lemma csv match), تَقَطَّعَ (5; no lemma csv match), قِطَع (2; freq 2; Noun) | kesmek | 2:27 وَيَقۡطَعُونَ=kesmek; 2:166 وَتَقَطَّعَتۡ=kesmek; 3:127 لِيَقۡطَعَ=kesmek | kolay |
| 4 | `ريب` | 36 | to doubt (9) | رَيْب (18; freq 18; Noun), ارْتابَ (9; no lemma csv match), مُرِيب (7; freq 7; Noun), رِيبَة (1; freq 1; Noun) | şüphe | 2:2 رَيۡبَۛ=Şüphe; 2:23 رَيۡبٖ=Şüphe; 2:282 تَرۡتَابُوٓاْ=Şüphe | kolay |
| 5 | `حدث` | 36 | to report, to narate (3), to cause, to bring about (3) | حَدِيث (28; freq 28; Noun), تُحَدِّثُ (3; no lemma csv match), يُحْدِثُ (3; no lemma csv match), مُحْدَث (2; freq 2; Noun) | hadis, olmak | 2:76 أَتُحَدِّثُونَهُم=hadis, olmak; 4:42 حَدِيثٗا=hadis, olmak; 4:78 حَدِيثٗا=hadis, olmak | kolay |
| 6 | `بطل` | 36 | to make vain, to nullify (4), to become futile (1) | باطِل (26; no lemma csv match), مُبْطِل (5; no lemma csv match), يُبْطِلَ (4; no lemma csv match), بَطَلَ (1; no lemma csv match) | batıl, boş | 2:42 بِٱلۡبَٰطِلِ=Batıl; 2:188 بِٱلۡبَٰطِلِ=Batıl; 2:264 تُبۡطِلُواْ=batıl, boş | kolay |
| 7 | `عفو` | 35 | to forgive, to pardon (27) | عَفا (27; no lemma csv match), عَفُوّ (5; freq 5; Noun), عَفْو (2; freq 2; Noun), عافي (1; no lemma csv match) | affetmek | 2:52 عَفَوۡنَا=Affetti; 2:109 فَٱعۡفُواْ=Affetti; 2:178 عُفِيَ=Affetti | kolay |
| 8 | `ورث` | 35 | to inherit (13), to make inherit (12) | وَرِثَ (13; no lemma csv match), أَوْرَثَ (12; no lemma csv match), وارِث (7; no lemma csv match), مِيراث (2; no lemma csv match) | - | 2:233 ٱلۡوَارِثِ=mirasçı; 3:180 مِيرَٰثُ=miras; 4:11 وَوَرِثَهُۥٓ=miras almak | orta |
| 9 | `مرر` | 35 | to pass, to continue (10) | مَرَّة (20; no lemma csv match), مَرَّ (10; no lemma csv match), مُسْتَمِرّ (2; no lemma csv match), مَرّ (1; freq 1; Noun) | - | 2:229 مَرَّتَانِۖ=kez; 2:259 مَرَّ=kez; 6:94 مَرَّةٖ=kez | zor |
| 10 | `كيد` | 35 | to scheme, to plot, to plan (8) | كَيْد (26; freq 26; Noun), كِيدُ (8; no lemma csv match), مَكِيد (1; no lemma csv match) | - | 3:120 كَيۡدُهُمۡ=tuzak; 4:76 كَيۡدَ=tuzak; 7:183 كَيۡدِي=tuzak | kolay |
| 11 | `غفل` | 35 | to neglect (1), to make heedless (1) | غافِل (27; no lemma csv match), غَفْلَة (5; freq 5; Noun), تَغْفُلُ (1; no lemma csv match), أَغْفَلْ (1; no lemma csv match) | - | 2:74 بِغَٰفِلٍ=habersiz; 2:85 بِغَٰفِلٍ=habersiz; 2:140 بِغَٰفِلٍ=habersiz | kolay |
| 12 | `خفي` | 34 | to conceal, to hide (18), to hide (9) | أُخْفِيَ (18; no lemma csv match), يَخْفَى (6; no lemma csv match), يَسْتَخْفُ (3; no lemma csv match), خُفْيَة (2; freq 2; Noun) | - | 2:271 تُخۡفُوهَا=gizlemek; 2:284 تُخۡفُوهُ=gizlemek; 3:5 يَخۡفَىٰ=gizli | zor |
| 13 | `جنح` | 34 | to incline (2) | جُناح (25; no lemma csv match), جَناح (7; no lemma csv match), جَنَحُ (2; no lemma csv match) | - | 2:158 جُنَاحَ=sakınca; 2:198 جُنَاحٌ=sakınca; 2:229 جُنَاحَ=sakınca | kolay |
| 14 | `وثق` | 34 | to bound (1), to bind (1) | مِيثاق (25; no lemma csv match), مَوْثِق (3; no lemma csv match), وُثْقَى (2; no lemma csv match), وَثاق (2; no lemma csv match) | - | 2:27 مِيثَٰقِهِۦ=Ahit; 2:63 مِيثَٰقَكُمۡ=Ahit; 2:83 مِيثَٰقَ=Ahit | kolay |
| 15 | `كفي` | 33 | to be sufficient (32) | كَفَى (32; no lemma csv match), كاف (1; no lemma csv match) | - | 2:137 فَسَيَكۡفِيكَهُمُ=sana yeter; 3:124 يَكۡفِيَكُمۡ=sana yeter; 4:6 وَكَفَىٰ=sana yeter | zor |
| 16 | `قسم` | 33 | to swear (21), to distribute (3), to seek division (1) | أَقْسَمُ (20; no lemma csv match), قِسْمَة (3; freq 3; Noun), قَسَمْ (2; no lemma csv match), قَسَم (2; freq 2; Noun) | - | 4:8 ٱلۡقِسۡمَةَ=paylaşma; 5:3 تَسۡتَقۡسِمُواْ=paylaştırmak; 5:53 أَقۡسَمُواْ=yemin etmek | orta |
| 17 | `حجج` | 33 | to argue (12), to perform pilgrimage, to argue (1), to dispute (1) | حاجَّ (12; no lemma csv match), حَجّ (9; freq 9; Noun), حُجَّة (7; no lemma csv match), حَجَّ (1; no lemma csv match) | hac, delil | 2:76 لِيُحَآجُّوكُم=hac, delil; 2:139 أَتُحَآجُّونَنَا=hac, delil; 2:150 حُجَّةٌ=hac, delil | kolay |
| 18 | `جنب` | 33 | to avoid (10), to keep away (1), to remove from (1) | اجْتَنَبُ (9; no lemma csv match), جانِب (9; no lemma csv match), جَنب (8; freq 8; Noun), جُنُب (4; freq 1; Adjective) | - | 3:191 جُنُوبِهِمۡ=yan; 4:31 تَجۡتَنِبُواْ=kaçınmak; 4:36 ٱلۡجُنُبِ=uzak | orta |
| 19 | `ظلل` | 33 | to continue, to remain (9), to shade (2) | ظِلّ (14; freq 14; Noun), ظَلَّ (9; no lemma csv match), ظُلَّة (6; no lemma csv match), ظَلَّلْ (2; no lemma csv match) | - | 2:57 وَظَلَّلۡنَا=gölgelendirmek; 2:210 ظُلَلٖ=örtüler; 4:57 ظِلّٗا=gölge | kolay |
| 20 | `عمي` | 33 | to be blind (7), to obscure (1) | أَعْمَى (21; no lemma csv match), عَمِيَ (7; no lemma csv match), عَمي (2; no lemma csv match), عَمًى (2; freq 2; Noun) | - | 2:18 عُمۡيٞ=kör; 2:171 عُمۡيٞ=kör; 5:71 فَعَمُواْ=körleşmek | orta |
| 21 | `عرش` | 33 | to erect, to construct (2) | عَرْش (29; freq 29; Noun), مَعْرُوشَة (2; no lemma csv match), يَعْرِشُ (2; no lemma csv match) | - | 2:259 عُرُوشِهَا=çatıları; 6:141 مَّعۡرُوشَٰتٖ=asma üzerinde; 6:141 مَعۡرُوشَٰتٖ=asma üzerinde | kolay |
| 22 | `عصي` | 32 | to disobey (27) | عَصا (27; no lemma csv match), عَصِيّ (2; freq 1; Noun), مَعْصِيَت (2; freq 2; Noun), عِصْيان (1; no lemma csv match) | - | 2:61 عَصَواْ=asan; 2:93 وَعَصَيۡنَا=asan; 3:112 عَصَواْ=asan | kolay |
| 23 | `مدد` | 32 | to spread, to extend, to prolong (13), to reinforce, to extend, to provide, to aid (10) | مَدَّ (13; no lemma csv match), أَمَدَّ (10; no lemma csv match), مَدّ (2; freq 2; Noun), مَمْدُود (2; no lemma csv match) | - | 2:15 وَيَمُدُّهُمۡ=uzatmak; 3:124 يُمِدَّكُمۡ=uzatmak; 3:125 يُمۡدِدۡكُمۡ=uzatmak | kolay |
| 24 | `وصي` | 32 | to enjoin (11), to make, to instruct, to enjoin (5), to enjoin, to transmit (5) | وَصَّى (11; no lemma csv match), وَصِيَّة (8; no lemma csv match), أَوْصا (5; no lemma csv match), تَواصَ (5; no lemma csv match) | - | 2:132 وَوَصَّىٰ=tavsiye etmek; 2:180 ٱلۡوَصِيَّةُ=vasiyet; 2:182 مُّوصٖ=vasiyet eden | zor |
| 25 | `برك` | 32 | to be blessed (9), to bless (8) | تَبارَكَ (9; no lemma csv match), مُبارَك (8; no lemma csv match), بارَكَ (8; no lemma csv match), مُبارَكَة (4; no lemma csv match) | - | 3:96 مُبَارَكٗا=bereket; 6:92 مُبَارَكٞ=bereket; 6:155 مُبَارَكٞ=bereket | kolay |
| 26 | `وري` | 32 | to hide, to conceal, to cover (4), to hide (2), to ignite (1) | وَراء (24; no lemma csv match), وُۥرِيَ (4; no lemma csv match), تَوارَتْ (2; no lemma csv match), تُورُ (1; no lemma csv match) | - | 2:91 وَرَآءَهُۥ=Arkasında; 2:101 وَرَآءَ=Arkasında; 3:187 وَرَآءَ=Arkasında | kolay |
| 27 | `وسع` | 32 | to encompass, to extend (6) | واسِع (9; no lemma csv match), سَعَة (6; freq 6; Noun), وَسِعَ (6; no lemma csv match), وُسْع (5; freq 5; Noun) | - | 2:115 وَٰسِعٌ=kuşatır; 2:233 وُسۡعَهَاۚ=güç yetirmek; 2:236 ٱلۡمُوسِعِ=varlıklı | orta |
| 28 | `برر` | 32 | to be good, to be kind (2) | بَرّ (22; freq 1; Adjective), بِرّ (8; freq 8; Noun), تَبَرُّ (2; no lemma csv match) | - | 2:44 بِٱلۡبِرِّ=İyilik; 2:177 ٱلۡبِرَّ=İyilik; 2:177 ٱلۡبِرَّ=İyilik | kolay |
| 29 | `نصب` | 32 | to be fixed, to labour (2) | نَصِيب (21; freq 21; Noun), نَصَب (4; freq 4; Noun), نُصُب (3; freq 3; Noun), نُصِبَتْ (2; no lemma csv match) | - | 2:202 نَصِيبٞ=pay; 3:23 نَصِيبٗا=pay; 4:7 نَصِيبٞ=pay | kolay |
| 30 | `لبث` | 31 | to remain, to stay, to hesitate, to delay (30) | لَبِثَ (30; no lemma csv match), لابِث (1; no lemma csv match) | - | 2:259 لَبِثۡتَۖ=kaldım; 2:259 لَبِثۡتُ=kaldım; 2:259 لَّبِثۡتَ=kaldım | kolay |
| 31 | `بدو` | 31 | to reveal, to disclose (15), to become apparent (11) | يُبْدِيَ (15; no lemma csv match), بَدا (11; no lemma csv match), بادِي (1; no lemma csv match), بَدْو (1; freq 1; Noun) | - | 2:33 تُبۡدُونَ=açığa çıkarmak; 2:271 تُبۡدُواْ=açığa çıkarmak; 2:284 تُبۡدُواْ=açığa çıkarmak | zor |
| 32 | `هجر` | 31 | to emigrate (16), to avoid (5) | هاجَرَ (16; no lemma csv match), مُهاجِر (7; no lemma csv match), اهْجُرْ (5; no lemma csv match), مَهْجُور (1; freq 1; Noun) | - | 2:218 هَاجَرُواْ=hicret etmek; 3:195 هَاجَرُواْ=hicret etmek; 4:34 وَٱهۡجُرُوهُنَّ=terk etmek | kolay |
| 33 | `طهر` | 31 | to purify (10), to cleanse, to purify (5) | طَهَّرَ (9; no lemma csv match), مُطَهَّرَة (5; no lemma csv match), تَطَهَّرْ (5; no lemma csv match), أَطْهَر (4; freq 4; Noun) | - | 2:25 مُّطَهَّرَةٞۖ=temizlenmiş; 2:125 طَهِّرَا=temizlemek; 2:222 يَطۡهُرۡنَۖ=they are cleansed | orta |
| 34 | `غلب` | 31 | to overcome, to defeat (15) | غَلَبُ (15; no lemma csv match), غالِب (13; no lemma csv match), غَلَب (1; freq 1; Noun), مَغْلُوب (1; freq 1; Noun) | galip gelmek | 2:249 غَلَبَتۡ=galip gelmek; 3:12 سَتُغۡلَبُونَ=galip gelmek; 3:160 غَالِبَ=galip gelmek | kolay |
| 35 | `قعد` | 31 | to sit (12) | قَعَدَ (12; no lemma csv match), قاعِد (7; no lemma csv match), مَقْعَد (4; freq 4; Noun), قُعُود (4; freq 4; Noun) | - | 2:127 ٱلۡقَوَاعِدَ=temeller; 3:121 مَقَٰعِدَ=oturak; 3:168 وَقَعَدُواْ=oturmak | orta |
| 36 | `شفع` | 31 | to intercede (5) | شَفاعَة (13; no lemma csv match), شَفِيع (10; freq 1; Adjective), يَشْفَعُ (5; no lemma csv match), شافِع (2; no lemma csv match) | - | 2:48 شَفَٰعَةٞ=şefaat; 2:123 شَفَٰعَةٞ=şefaat; 2:254 شَفَٰعَةٞۗ=şefaat | kolay |
| 37 | `خلص` | 31 | to choose, to be sincere (2), to seclude (1), to select (1) | مُخْلِص (11; freq 11; Noun), مُخْلَص (9; freq 1; Noun), خالِصَة (5; no lemma csv match), أَخْلَصُ (2; no lemma csv match) | - | 2:94 خَالِصَةٗ=özel; 2:139 مُخۡلِصُونَ=samimi; 4:146 وَأَخۡلَصُواْ=samimi olmak | zor |
| 38 | `عسي` | 30 | to perhaps (30) | عَسَى (30; no lemma csv match) | - | 2:216 وَعَسَىٰٓ=umulur ki; 2:216 وَعَسَىٰٓ=umulur ki; 2:246 عَسَيۡتُمۡ=umulur ki | kolay |
| 39 | `صرف` | 30 | to divert, to turn away (14), to explain (10), to turn away (1) | صَرَفَ (14; no lemma csv match), صَرَّفْ (10; no lemma csv match), تَصْرِيف (2; freq 2; Noun), انصَرَفُ (1; no lemma csv match) | - | 2:164 وَتَصۡرِيفِ=yönlendirme; 3:152 صَرَفَكُمۡ=çevirmek; 6:16 يُصۡرَفۡ=çevirmek | kolay |
| 40 | `سعي` | 30 | to strive, to run (20) | سَعَى (20; no lemma csv match), سَعْي (10; freq 10; Noun) | - | 2:114 وَسَعَىٰ=çaba göstermek; 2:205 سَعَىٰ=çaba göstermek; 2:260 سَعۡيٗاۚ=çaba göstermek | kolay |
| 41 | `قصص` | 30 | to narrate (20) | قَصَّ (20; no lemma csv match), قَصَص (6; freq 6; Noun), قِصاص (4; no lemma csv match) | kıssa, hikaye | 2:178 ٱلۡقِصَاصُ=kıssa, hikaye; 2:179 ٱلۡقِصَاصِ=kıssa, hikaye; 2:194 قِصَاصٞۚ=kıssa, hikaye | kolay |
| 42 | `هود` | 30 | to be Jewish (11) | هادُ (11; no lemma csv match), هُود (10; freq 3; Proper noun), يَهُود (9; no lemma csv match) | - | 2:62 هَادُواْ=Yahudiler; 2:111 هُودًا=Yahudiler; 2:113 ٱلۡيَهُودُ=Yahudiler | kolay |
| 43 | `دري` | 29 | to make known (17), to know (12) | أَدْرَى (17; no lemma csv match), تَدْرِي (12; no lemma csv match) | - | 4:11 تَدۡرُونَ=bilmek; 10:16 أَدۡرَىٰكُم=bildirmek; 21:109 أَدۡرِيٓ=bilmek | orta |
| 44 | `جدل` | 29 | to argue, to dispute (25) | جادَلُ (25; no lemma csv match), جِدال (2; no lemma csv match), جَدَل (2; freq 2; Noun) | - | 2:197 جِدَالَ=tartışma; 4:107 تُجَٰدِلۡ=tartışmak; 4:109 جَٰدَلۡتُمۡ=tartışmak | kolay |
| 45 | `غشو` | 29 | to cover (23) | غَشِيَ (13; no lemma csv match), أُغْشِيَتْ (4; no lemma csv match), غاشِيَة (3; no lemma csv match), غَشَّى (3; no lemma csv match) | - | 2:7 غِشَٰوَةٞۖ=Perde; 3:154 يَغۡشَىٰ=örtmek, perde; 7:41 غَوَاشٖۚ=örtüler | orta |
| 46 | `رفع` | 29 | to raise (22) | رَفَعَ (22; no lemma csv match), مَرْفُوعَة (3; no lemma csv match), رافِع (1; no lemma csv match), رَفِيع (1; freq 1; Adjective) | - | 2:63 وَرَفَعۡنَا=yükseltmek; 2:93 وَرَفَعۡنَا=yükseltmek; 2:127 يَرۡفَعُ=yükseltmek | kolay |
| 47 | `ودد` | 29 | to love, to wish (17) | وَدَّ (17; no lemma csv match), مَوَدَّة (8; no lemma csv match), وَدُود (2; freq 1; Noun), وُدّ (1; freq 1; Noun) | - | 2:96 يَوَدُّ=istemek; 2:105 يَوَدُّ=istemek; 2:109 وَدَّ=istemek | orta |
| 48 | `طير` | 29 | to ascribe an evil omen (3), to fly (1) | طَيْر (19; freq 19; Noun), طائِر (5; no lemma csv match), اطَّيَّرْ (3; no lemma csv match), يَطِيرُ (1; no lemma csv match) | - | 2:260 ٱلطَّيۡرِ=kuşlar; 3:49 ٱلطَّيۡرِ=kuşlar; 3:49 طَيۡرَۢا=kuşlar | kolay |
| 49 | `فوز` | 29 | to be successful, to attain (3) | فَوْز (19; freq 19; Noun), فائِز (4; no lemma csv match), فازَ (3; no lemma csv match), مَفازَة (2; no lemma csv match) | - | 3:185 فَازَۗ=kazanmak; 3:188 بِمَفَازَةٖ=kurtuluş; 4:13 ٱلۡفَوۡزُ=başarı | kolay |
| 50 | `ثني` | 29 | to fold up (1), to except (1) | اثْنَيْن (13; no lemma csv match), اثْنَتَيْن (7; no lemma csv match), مَثْنَى (3; no lemma csv match), ثانِي (2; no lemma csv match) | - | 2:60 ٱثۡنَتَا=iki; 4:3 مَثۡنَىٰ=ikişer; 4:11 ٱثۡنَتَيۡنِ=iki | kolay |
| 51 | `صير` | 29 | to reach (1) | مَصِير (28; freq 28; Noun), تَصِيرُ (1; no lemma csv match) | - | 2:126 ٱلۡمَصِيرُ=varış yeri; 2:285 ٱلۡمَصِيرُ=varış yeri; 3:28 ٱلۡمَصِيرُ=varış yeri | kolay |
| 52 | `خلو` | 28 | to pass away (25), to leave (1), to become empty (1) | خَلا (25; no lemma csv match), خَلُّ (1; no lemma csv match), خالِيَة (1; no lemma csv match), تَخَلَّتْ (1; no lemma csv match) | - | 2:14 خَلَوۡاْ=geçip gitmek; 2:76 خَلَا=geçip gitmek; 2:134 خَلَتۡۖ=geçip gitmek | kolay |
| 53 | `رجو` | 28 | to hope, to expect, to desire (22), to defer, to postpone (3) | يَرْجُوا۟ (22; no lemma csv match), تُرْجِي (3; no lemma csv match), مُرْجَوْن (1; freq 1; Noun), مَرْجُوّ (1; freq 1; Noun) | ummak | 2:218 يَرۡجُونَ=ummak; 4:104 وَتَرۡجُونَ=ummak; 4:104 يَرۡجُونَۗ=ummak | kolay |
| 54 | `حوط` | 28 | to surround, to encompass (17) | أَحاطَ (17; no lemma csv match), مُحِيط (9; freq 9; Noun), مُحِيطَة (2; freq 2; Noun) | - | 2:19 مُحِيطُۢ=kuşatmak; 2:81 وَأَحَٰطَتۡ=kuşatmak; 2:255 يُحِيطُونَ=kuşatmak | kolay |
| 55 | `شقق` | 28 | to split (8), to oppose (7), to make difficult, to cleave (2) | شِقاق (7; no lemma csv match), شاقُّ (7; no lemma csv match), انشَقَّ (5; no lemma csv match), يَشَّقَّقُ (3; no lemma csv match) | - | 2:74 يَشَّقَّقُ=yarılmak; 2:137 شِقَاقٖۖ=ayrılık; 2:176 شِقَاقِۭ=ayrılık | zor |
| 56 | `عدل` | 28 | to be just (14) | عَدْل (14; freq 14; Noun), عَدَلَ (14; no lemma csv match) | - | 2:48 عَدۡلٞ=Adalet; 2:123 عَدۡلٞ=Adalet; 2:282 بِٱلۡعَدۡلِۚ=Adalet | kolay |
| 57 | `يقن` | 28 | to believe firmly (12), to be convinced, to be certain (2) | يُوقِنُ (12; no lemma csv match), يَقِين (8; freq 2; Adjective), مُوقِن (5; no lemma csv match), اسْتَيْقَنَتْ (2; no lemma csv match) | kesin bilmek | 2:4 يُوقِنُونَ=Kesin inanır; 2:118 يُوقِنُونَ=Kesin inanır; 4:157 يَقِينَۢا=kesin bilmek | kolay |
| 58 | `ثقل` | 28 | to be heavy (6) | مِثْقال (8; no lemma csv match), ثَقَل (6; no lemma csv match), ثَقِيل (5; freq 1; Noun), ثَقُلَتْ (4; no lemma csv match) | - | 4:40 مِثۡقَالَ=ağırlık; 7:8 ثَقُلَتۡ=ağırlaşmak; 7:57 ثِقَالٗا=ağır | zor |
| 59 | `ثوب` | 28 | to reward (4) | ثَواب (13; no lemma csv match), ثِياب (8; no lemma csv match), أَثابَ (3; no lemma csv match), مَثُوبَة (2; freq 2; Noun) | - | 2:103 لَمَثُوبَةٞ=karşılık; 2:125 مَثَابَةٗ=dönüş yeri; 3:145 ثَوَابَ=Sevap | zor |
| 60 | `مسك` | 27 | to retain, to withhold (18), to grasp, to hold fast (3), to hold fast (1) | أَمْسَكَ (18; no lemma csv match), اسْتَمْسَكَ (3; no lemma csv match), إِمْساك (1; no lemma csv match), يُمَسِّكُ (1; no lemma csv match) | - | 2:229 فَإِمۡسَاكُۢ=tutmak; 2:231 فَأَمۡسِكُوهُنَّ=tutmak; 2:231 تُمۡسِكُوهُنَّ=tutmak | kolay |
| 61 | `سير` | 27 | to travel (16), to move (5) | سارَ (16; no lemma csv match), سُيِّرَتْ (5; no lemma csv match), سَيّارَة (3; no lemma csv match), سَيْر (2; freq 2; Noun) | - | 3:137 فَسِيرُواْ=yolculuk; 5:96 وَلِلسَّيَّارَةِۖ=yolcular; 6:11 سِيرُواْ=yolculuk | kolay |
| 62 | `عجب` | 27 | to please, to impress (11), to wonder, to be amazed, to be astonished (8) | أَعْجَبَ (11; no lemma csv match), عَجِبُ (8; no lemma csv match), عَجَب (5; freq 2; Noun), عَجِيب (2; freq 2; Adjective) | - | 2:204 يُعۡجِبُكَ=şaşırmak; 2:221 أَعۡجَبَتۡكُمۡۗ=şaşırmak; 2:221 أَعۡجَبَكُمۡۗ=şaşırmak | orta |
| 63 | `منن` | 27 | to favor (16) | مَنَّ (16; no lemma csv match), مَنّ (6; freq 6; Noun), مَمْنُون (4; freq 4; Noun), مَنُون (1; freq 1; Noun) | - | 2:57 ٱلۡمَنَّ=-den, -dan; 2:262 مَنّٗا=-den, -dan; 2:264 بِٱلۡمَنِّ=-den, -dan | kolay |
| 64 | `غرر` | 27 | to deceive, to delude (15) | غَرَّ (15; no lemma csv match), غُرُور (9; freq 9; Noun), غَرُور (3; freq 3; Noun) | - | 3:24 وَغَرَّهُمۡ=aldatmak; 3:185 ٱلۡغُرُورِ=aldatıcı; 3:196 يَغُرَّنَّكَ=aldatmak | orta |
| 65 | `وزر` | 27 | to bear (7) | وِزْر (12; freq 12; Noun), يَزِرُ (7; no lemma csv match), وازِرَة (5; no lemma csv match), وَزِير (2; freq 2; Noun) | - | 6:31 أَوۡزَارَهُمۡ=yükler; 6:31 يَزِرُونَ=yüklenirler; 6:164 تَزِرُ=yüklenirler | orta |
| 66 | `شجر` | 27 | to arise (1) | شَجَرَة (19; freq 19; Noun), شَجَر (7; freq 7; Noun), شَجَرَ (1; no lemma csv match) | - | 2:35 ٱلشَّجَرَةَ=ağaç; 4:65 شَجَرَ=baş göstermek; 7:19 ٱلشَّجَرَةَ=ağaç | kolay |
| 67 | `عشر` | 27 | to live (1) | عَشْر (7; freq 1; Adjective), عَشَر (4; freq 4; Noun), عَشْرَة (3; freq 3; Noun), مَعْشَر (3; freq 3; Noun) | - | 2:60 عَشۡرَةَ=on; 2:196 عَشَرَةٞ=on; 2:234 وَعَشۡرٗاۖ=on | orta |
| 68 | `وضع` | 26 | to deliver, to give birth (21), to be active (1) | وَضَعَ (21; no lemma csv match), مَواضِع (3; no lemma csv match), أَوْضَعُ (1; no lemma csv match), مَوْضُوعَة (1; no lemma csv match) | - | 3:36 وَضَعَتۡهَا=doğurmak; 3:36 وَضَعۡتُهَآ=doğurmak; 3:36 وَضَعَتۡ=doğurmak | kolay |
| 69 | `نبت` | 26 | to make grow (16), to produce (1) | أَنۢبَتَ (16; no lemma csv match), نَبات (9; no lemma csv match), تَنۢبُتُ (1; no lemma csv match) | - | 2:61 تُنۢبِتُ=bitirmek; 2:261 أَنۢبَتَتۡ=bitirmek; 3:37 وَأَنۢبَتَهَا=bitirmek | kolay |
| 70 | `خزي` | 26 | to disgrace (12), to be disgraced (1) | أَخْزَيْ (12; no lemma csv match), خِزْى (11; freq 11; Noun), مُخْزِي (1; no lemma csv match), نَخْزَى (1; no lemma csv match) | - | 2:85 خِزۡيٞ=rezillik; 2:114 خِزۡيٞ=rezillik; 3:192 أَخۡزَيۡتَهُۥۖ=rezil etmek | orta |
| 71 | `عجز` | 26 | to escape (4), to be unable (1) | مُعْجِز (12; freq 12; Noun), يُعْجِزَ (4; no lemma csv match), عَجُوز (4; freq 4; Noun), مُعاجِز (3; no lemma csv match) | - | 5:31 أَعَجَزۡتُ=aciz kalmak; 6:134 بِمُعۡجِزِينَ=kaçış; 8:59 يُعۡجِزُونَ=kaçıp kurtulmak | zor |
| 72 | `هون` | 26 | to humiliate (2) | مُهِين (14; no lemma csv match), هُون (4; freq 1; Adjective), هَيِّن (3; no lemma csv match), أَهانَ (2; no lemma csv match) | - | 2:90 مُّهِينٞ=alçaltıcı; 3:178 مُّهِينٞ=alçaltıcı; 4:14 مُّهِينٞ=alçaltıcı | kolay |
| 73 | `شري` | 25 | to buy, to purchase, to exchange (21), to sell (4) | اشْتَرَى (21; no lemma csv match), شَرَ (4; no lemma csv match) | - | 2:16 ٱشۡتَرَوُاْ=satın almak; 2:41 تَشۡتَرُواْ=satın almak; 2:79 لِيَشۡتَرُواْ=satın almak | kolay |
| 74 | `سقي` | 25 | to water, to give drink (12), to give drink (8), to ask for water (2) | سَقَى (12; no lemma csv match), أَسْقَيْ (8; no lemma csv match), اسْتَسْقَى (2; no lemma csv match), سِقايَة (2; no lemma csv match) | - | 2:60 ٱسۡتَسۡقَىٰ=su istemek; 2:71 تَسۡقِي=sulamak; 7:160 ٱسۡتَسۡقَىٰهُ=su istemek | zor |
| 75 | `وهب` | 25 | to grant, to bestow (22) | وَهَبَ (22; no lemma csv match), وَهّاب (3; no lemma csv match) | - | 3:8 وَهَبۡ=bağışlamak; 3:8 ٱلۡوَهَّابُ=çok bağışlayan; 3:38 هَبۡ=bağışlamak | kolay |
| 76 | `صلي` | 25 | to burn (18), to warm (2) | يَصْلَى (13; no lemma csv match), أُصْلِي (4; no lemma csv match), تَصْطَلُ (2; no lemma csv match), صالُوا (2; no lemma csv match) | - | 4:10 وَسَيَصۡلَوۡنَ=Namaz kıldı; 4:30 نُصۡلِيهِ=Namaz kıldı; 4:56 نُصۡلِيهِمۡ=Namaz kıldı | kolay |
| 77 | `بسط` | 25 | to extend, to stretch (16) | بَسَطَ (16; no lemma csv match), باسِط (4; no lemma csv match), بَصطَة (2; freq 2; Noun), مَبْسُوطَتان (1; no lemma csv match) | - | 2:245 وَيَبۡصُۜطُ=bolluk; 2:247 بَسۡطَةٗ=bolluk; 5:11 يَبۡسُطُوٓاْ=bolluk | kolay |
| 78 | `وعظ` | 25 | to instruct, to advise, to preach (15) | وَعَظْ (15; no lemma csv match), مَوْعِظَة (9; no lemma csv match), واعِظ (1; no lemma csv match) | öğüt vermek | 2:66 وَمَوۡعِظَةٗ=öğüt vermek; 2:231 يَعِظُكُم=öğüt vermek; 2:232 يُوعَظُ=öğüt vermek | orta |
| 79 | `حضر` | 25 | to approach, to attend (7), to bring (3) | مُحْضَر (10; no lemma csv match), حَضَرَ (7; no lemma csv match), أَحْضَرَتْ (3; no lemma csv match), حاضِرَة (2; no lemma csv match) | hazır olmak | 2:133 حَضَرَ=hazır olmak; 2:180 حَضَرَ=hazır olmak; 2:196 حَاضِرِي=hazır olmak | kolay |
| 80 | `حدد` | 25 | to oppose (4) | حُدُود (14; freq 14; Noun), حَدِيد (6; freq 6; Noun), حادَّ (2; no lemma csv match), يُحادُّ (2; no lemma csv match) | - | 2:187 حُدُودُ=sınırlar; 2:229 حُدُودَ=sınırlar; 2:229 حُدُودَ=sınırlar | orta |
| 81 | `حول` | 25 | to come (3) | حَوْل (17; freq 1; Time adverb), حالَ (3; no lemma csv match), تَحْوِيل (3; freq 3; Noun), حِيلَة (1; freq 1; Noun) | - | 2:17 حَوۡلَهُۥ=Etrafında; 2:233 حَوۡلَيۡنِ=Etrafında; 2:240 ٱلۡحَوۡلِ=Etrafında | kolay |
| 82 | `قسط` | 25 | to be just (3) | قِسْط (15; freq 15; Noun), تُقْسِطُ (3; no lemma csv match), مُقْسِط (3; no lemma csv match), أَقْسَط (2; freq 2; Noun) | - | 2:282 أَقۡسَطُ=Kıstas; 3:18 بِٱلۡقِسۡطِۚ=Kıstas; 3:21 بِٱلۡقِسۡطِ=Kıstas | kolay |
| 83 | `بطن` | 25 | to be concealed (2) | بَطْن (17; freq 17; Noun), باطِن (3; no lemma csv match), بِطانَة (2; no lemma csv match), بَطَنَ (2; no lemma csv match) | gizlenmek, batın | 2:174 بُطُونِهِمۡ=gizlenmek, batın; 3:35 بَطۡنِي=gizlenmek, batın; 3:118 بِطَانَةٗ=gizlenmek, batın | kolay |
| 84 | `كود` | 24 | to be near, to nearly do, to almost do (24) | كادَ (24; no lemma csv match) | - | 2:20 يَكَادُ=neredeyse; 2:71 كَادُواْ=neredeyse; 4:78 يَكَادُونَ=neredeyse | zor |
| 85 | `وقع` | 24 | to fall, to occur, to fulfill (12), to cause (1) | وَقَعَ (12; no lemma csv match), واقِع (6; no lemma csv match), واقِعَة (2; no lemma csv match), يُوقِعَ (1; no lemma csv match) | - | 4:100 وَقَعَ=düştü; 5:91 يُوقِعَ=sebep olmak; 7:71 وَقَعَ=düştü | zor |
| 86 | `عمر` | 24 | to grant life (5), to maintain, to build on (4), to perform Umrah (1) | عُمُر (7; freq 7; Noun), يُعَمَّرُ (5; no lemma csv match), عَمَرُ (4; no lemma csv match), عُمْرَة (2; freq 2; Noun) | - | 2:96 يُعَمَّرُ=ömür verilmek; 2:96 يُعَمَّرَۗ=ömür verilmek; 2:158 ٱعۡتَمَرَ=umre yapmak | zor |
| 87 | `فجر` | 24 | to cause gush (6), to give lie (2), to gush forth (2) | فَجْر (6; freq 6; Noun), فُجِّرَتْ (6; no lemma csv match), فُجّار (4; no lemma csv match), يَفْجُرَ (2; no lemma csv match) | - | 2:60 فَٱنفَجَرَتۡ=fışkırmak; 2:74 يَتَفَجَّرُ=fışkırmak; 2:187 ٱلۡفَجۡرِۖ=şafak | zor |
| 88 | `رقب` | 24 | to watch (4), to respect (3), to be vigilant (2) | رَقَبَة (9; freq 9; Noun), رَقِيب (5; freq 5; Noun), ارْتَقِبْ (4; no lemma csv match), يَرْقُبُ (3; no lemma csv match) | - | 2:177 ٱلرِّقَابِ=boyunlar; 4:1 رَقِيبٗا=gözetleyici; 4:92 رَقَبَةٖ=boyunlar | zor |
| 89 | `غضب` | 24 | to be angry (6) | غَضَب (14; freq 14; Noun), غَضِبَ (6; no lemma csv match), غَضْبان (2; no lemma csv match), مَغْضُوب (1; freq 1; Noun) | gazap, kızmak | 1:7 ٱلۡمَغۡضُوبِ=gazap edilmiş; 2:61 بِغَضَبٖ=gazap etti; 2:90 بِغَضَبٍ=gazap etti | kolay |
| 90 | `جهل` | 24 | to be ignorant (5) | جاهِل (10; no lemma csv match), يَجْهَلُ (5; no lemma csv match), جاهِلِيَّة (4; no lemma csv match), جَهالَة (4; no lemma csv match) | - | 2:67 ٱلۡجَٰهِلِينَ=cehalet; 2:273 ٱلۡجَاهِلُ=cehalet; 3:154 ٱلۡجَٰهِلِيَّةِۖ=cahiliye | orta |
| 91 | `ذلل` | 24 | to tame (2), to humiliate (2) | ذِلَّة (7; no lemma csv match), أَذِلَّة (4; no lemma csv match), ذُلّ (3; no lemma csv match), ذَلُول (2; freq 1; Noun) | - | 2:61 ٱلذِّلَّةُ=zillet; 2:71 ذَلُولٞ=uysal; 3:26 وَتُذِلُّ=alçaltmak | orta |
| 92 | `ثمر` | 24 | to bear fruit (2) | ثَمَرَة (17; freq 1; Noun), ثَمَر (5; freq 5; Noun), أَثْمَرَ (2; no lemma csv match) | - | 2:22 ٱلثَّمَرَٰتِ=meyveler; 2:25 ثَمَرَةٖ=meyveler; 2:126 ٱلثَّمَرَٰتِ=meyveler | zor |
| 93 | `مرض` | 24 | to be ill (1) | مَرَض (13; no lemma csv match), مَرِيض (10; no lemma csv match), مَرِضْ (1; no lemma csv match) | - | 2:10 مَّرَضٞ=hastalık; 2:10 مَرَضٗاۖ=hastalık; 2:184 مَّرِيضًا=hasta | orta |
| 94 | `مشي` | 23 | to walk (21) | مَشَ (21; no lemma csv match), مَشْي (1; freq 1; Noun), مَشّاء (1; no lemma csv match) | yürümek | 2:20 مَّشَوۡاْ=Yürüdü; 6:122 يَمۡشِي=Yürüdü; 7:195 يَمۡشُونَ=Yürüdü | kolay |
| 95 | `طلق` | 23 | to divorce (10), to set out, to proceeed, to go forth (9) | طَلَّقَ (10; no lemma csv match), انطَلَقَ (8; no lemma csv match), طَلاق (2; no lemma csv match), مُطَلَّقَة (2; no lemma csv match) | - | 2:227 ٱلطَّلَٰقَ=boşanma; 2:228 وَٱلۡمُطَلَّقَٰتُ=boşanmış kadınlar; 2:229 ٱلطَّلَٰقُ=boşanma | kolay |
| 96 | `نكح` | 23 | to marry (18) | نَكَحَ (14; no lemma csv match), نِكاح (5; no lemma csv match), تُنكِحُ (3; no lemma csv match), يَسْتَنكِحَ (1; no lemma csv match) | - | 2:221 تَنكِحُواْ=evlenmek; 2:221 تُنكِحُواْ=evlendirmek; 2:230 تَنكِحَ=evlenmek | orta |
| 97 | `غرق` | 23 | to drown (17) | أُغْرِقُ (17; no lemma csv match), مُغْرَق (4; no lemma csv match), غَرَق (1; freq 1; Noun), غَرْق (1; freq 1; Noun) | - | 2:50 وَأَغۡرَقۡنَآ=boğmak; 7:64 وَأَغۡرَقۡنَا=boğmak; 7:136 فَأَغۡرَقۡنَٰهُمۡ=boğmak | kolay |
| 98 | `لبس` | 23 | to obscure, to confuse, to mix, to wear (11) | لَبَسْ (11; no lemma csv match), لِباس (10; no lemma csv match), لَبُوس (1; freq 1; Noun), لَبْس (1; freq 1; Noun) | - | 2:42 تَلۡبِسُواْ=giymek; 2:187 لِبَاسٞ=giymek; 2:187 لِبَاسٞ=giymek | kolay |
| 99 | `سرع` | 23 | to hasten (9) | سَرِيع (10; freq 2; Adjective), يُسارِعُ (9; no lemma csv match), أَسْرَع (2; freq 2; Noun), سِراع (2; no lemma csv match) | - | 2:202 سَرِيعُ=hızlı; 3:19 سَرِيعُ=hızlı; 3:114 وَيُسَٰرِعُونَ=acele etmek | orta |
| 100 | `سرف` | 23 | to be extravagant, to exceed, to transgress (6) | مُسْرِف (15; freq 3; Adjective), أَسْرَفَ (6; no lemma csv match), إِسْراف (2; no lemma csv match) | - | 3:147 وَإِسۡرَافَنَا=aşırılıklarımız; 4:6 إِسۡرَافٗا=aşırılıklarımız; 5:32 لَمُسۡرِفُونَ=aşırı gidenler | kolay |

## 4. Risk Siniflandirmasi

| Risk | Adet | Anlam |
|---|---:|---|
| kolay | 413 | Eldeki Turkce rootMeaning veya canonical v4 icinde baskin ve temiz Turkce aday var. Ilk enrichment batch icin uygundur. |
| orta | 208 | Turkce veya Ingilizce kaynak var ama anlam yakinlari/coklu kullanim kontrol ister. Batch 2 icin daha uygun. |
| zor | 112 | Cok anlamli, kalip/edat kirintisi kok anlamina karismis veya sadece baglamdan cikarim gerektiriyor. Manual review olmadan eklenmemeli. |

## 5. Ilk Enrichment Batch Onerisi

Ilk batch icin en sik gecen ve `kolay` sinifina giren 100 kok onerildi. Bu liste mevcut seed degerlerini ezmeden, sadece bos `short_tr` ve `summary_tr` alanlarini doldurmak icin manuel review adayidir.

| Sira | Kok | Gecis | short_tr adayi | summary_tr icin tefsirsiz aday | Kaynak |
|---:|---|---:|---|---|---|
| 1 | `نكر` | 37 | inkar etmek | Bu k?k, 'inkar etmek' anlam alan?yla ili?kili kullan?mlar? ta??r. | word-translations-tr.rootMeanings |
| 2 | `قطع` | 36 | kesmek | Bu k?k, 'kesmek' anlam alan?yla ili?kili kullan?mlar? ta??r. | word-translations-tr.rootMeanings |
| 3 | `ريب` | 36 | şüphe | Bu k?k, 'şüphe' anlam alan?yla ili?kili kullan?mlar? ta??r. | word-translations-tr.rootMeanings |
| 4 | `حدث` | 36 | hadis, olmak | Bu k?k, 'hadis, olmak' anlam alan?yla ili?kili kullan?mlar? ta??r. | word-translations-tr.rootMeanings |
| 5 | `بطل` | 36 | batıl, boş | Bu k?k, 'batıl, boş' anlam alan?yla ili?kili kullan?mlar? ta??r. | word-translations-tr.rootMeanings |
| 6 | `عفو` | 35 | affetmek | Bu k?k, 'affetmek' anlam alan?yla ili?kili kullan?mlar? ta??r. | word-translations-tr.rootMeanings |
| 7 | `كيد` | 35 | tuzak | Bu k?k, 'tuzak' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 8 | `غفل` | 35 | habersiz | Bu k?k, 'habersiz' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 9 | `جنح` | 34 | sakınca | Bu k?k, 'sakınca' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 10 | `وثق` | 34 | Ahit | Bu k?k, 'Ahit' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 11 | `حجج` | 33 | hac, delil | Bu k?k, 'hac, delil' anlam alan?yla ili?kili kullan?mlar? ta??r. | word-translations-tr.rootMeanings |
| 12 | `ظلل` | 33 | gölge | Bu k?k, 'gölge' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 13 | `عرش` | 33 | çatıları | Bu k?k, 'çatıları' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 14 | `عصي` | 32 | asan | Bu k?k, 'asan' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 15 | `مدد` | 32 | uzatmak | Bu k?k, 'uzatmak' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 16 | `برك` | 32 | bereket | Bu k?k, 'bereket' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 17 | `وري` | 32 | Arkasında | Bu k?k, 'Arkasında' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 18 | `برر` | 32 | İyilik | Bu k?k, 'İyilik' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 19 | `نصب` | 32 | pay | Bu k?k, 'pay' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 20 | `لبث` | 31 | kaldım | Bu k?k, 'kaldım' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 21 | `هجر` | 31 | hicret etmek | Bu k?k, 'hicret etmek' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 22 | `غلب` | 31 | galip gelmek | Bu k?k, 'galip gelmek' anlam alan?yla ili?kili kullan?mlar? ta??r. | word-translations-tr.rootMeanings |
| 23 | `شفع` | 31 | şefaat | Bu k?k, 'şefaat' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 24 | `عسي` | 30 | umulur ki | Bu k?k, 'umulur ki' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 25 | `صرف` | 30 | çevirmek | Bu k?k, 'çevirmek' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 26 | `سعي` | 30 | çaba göstermek | Bu k?k, 'çaba göstermek' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 27 | `قصص` | 30 | kıssa, hikaye | Bu k?k, 'kıssa, hikaye' anlam alan?yla ili?kili kullan?mlar? ta??r. | word-translations-tr.rootMeanings |
| 28 | `هود` | 30 | Yahudiler | Bu k?k, 'Yahudiler' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 29 | `جدل` | 29 | tartışmak | Bu k?k, 'tartışmak' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 30 | `رفع` | 29 | yükseltmek | Bu k?k, 'yükseltmek' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 31 | `طير` | 29 | kuşlar | Bu k?k, 'kuşlar' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 32 | `فوز` | 29 | başarı | Bu k?k, 'başarı' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 33 | `ثني` | 29 | iki | Bu k?k, 'iki' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 34 | `صير` | 29 | varış yeri | Bu k?k, 'varış yeri' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 35 | `خلو` | 28 | geçip gitmek | Bu k?k, 'geçip gitmek' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 36 | `رجو` | 28 | ummak | Bu k?k, 'ummak' anlam alan?yla ili?kili kullan?mlar? ta??r. | word-translations-tr.rootMeanings |
| 37 | `حوط` | 28 | kuşatmak | Bu k?k, 'kuşatmak' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 38 | `عدل` | 28 | Adalet | Bu k?k, 'Adalet' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 39 | `يقن` | 28 | kesin bilmek | Bu k?k, 'kesin bilmek' anlam alan?yla ili?kili kullan?mlar? ta??r. | word-translations-tr.rootMeanings |
| 40 | `مسك` | 27 | tutmak | Bu k?k, 'tutmak' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 41 | `سير` | 27 | yolculuk | Bu k?k, 'yolculuk' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 42 | `منن` | 27 | -den, -dan | Bu k?k, '-den, -dan' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 43 | `شجر` | 27 | ağaç | Bu k?k, 'ağaç' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 44 | `وضع` | 26 | doğurmak | Bu k?k, 'doğurmak' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 45 | `نبت` | 26 | bitirmek | Bu k?k, 'bitirmek' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 46 | `هون` | 26 | alçaltıcı | Bu k?k, 'alçaltıcı' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 47 | `شري` | 25 | satın almak | Bu k?k, 'satın almak' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 48 | `وهب` | 25 | bağışlamak | Bu k?k, 'bağışlamak' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 49 | `صلي` | 25 | Namaz kıldı | Bu k?k, 'Namaz kıldı' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 50 | `بسط` | 25 | bolluk | Bu k?k, 'bolluk' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 51 | `حضر` | 25 | hazır olmak | Bu k?k, 'hazır olmak' anlam alan?yla ili?kili kullan?mlar? ta??r. | word-translations-tr.rootMeanings |
| 52 | `حول` | 25 | Etrafında | Bu k?k, 'Etrafında' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 53 | `قسط` | 25 | Kıstas | Bu k?k, 'Kıstas' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 54 | `بطن` | 25 | gizlenmek, batın | Bu k?k, 'gizlenmek, batın' anlam alan?yla ili?kili kullan?mlar? ta??r. | word-translations-tr.rootMeanings |
| 55 | `غضب` | 24 | gazap, kızmak | Bu k?k, 'gazap, kızmak' anlam alan?yla ili?kili kullan?mlar? ta??r. | word-translations-tr.rootMeanings |
| 56 | `مشي` | 23 | yürümek | Bu k?k, 'yürümek' anlam alan?yla ili?kili kullan?mlar? ta??r. | word-translations-tr.rootMeanings |
| 57 | `طلق` | 23 | boşamak | Bu k?k, 'boşamak' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 58 | `غرق` | 23 | boğmak | Bu k?k, 'boğmak' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 59 | `لبس` | 23 | giymek | Bu k?k, 'giymek' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 60 | `سرف` | 23 | aşırı gidenler | Bu k?k, 'aşırı gidenler' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 61 | `وزن` | 23 | Terazi | Bu k?k, 'Terazi' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 62 | `تمم` | 22 | tamamlamak | Bu k?k, 'tamamlamak' anlam alan?yla ili?kili kullan?mlar? ta??r. | word-translations-tr.rootMeanings |
| 63 | `فرح` | 22 | sevinmek | Bu k?k, 'sevinmek' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 64 | `كتم` | 21 | gizlemek | Bu k?k, 'gizlemek' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 65 | `حذر` | 21 | sakınmak | Bu k?k, 'sakınmak' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 66 | `نشر` | 21 | yaymak, diriltmek | Bu k?k, 'yaymak, diriltmek' anlam alan?yla ili?kili kullan?mlar? ta??r. | word-translations-tr.rootMeanings |
| 67 | `فقه` | 20 | anlamak, fıkıh | Bu k?k, 'anlamak, fıkıh' anlam alan?yla ili?kili kullan?mlar? ta??r. | word-translations-tr.rootMeanings |
| 68 | `نفخ` | 20 | üflemek | Bu k?k, 'üflemek' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 69 | `صنع` | 20 | yapmak | Bu k?k, 'yapmak' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 70 | `كشف` | 20 | gidermek | Bu k?k, 'gidermek' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 71 | `لعب` | 20 | oyun | Bu k?k, 'oyun' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 72 | `درج` | 20 | derece | Bu k?k, 'derece' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 73 | `رشد` | 19 | doğru yol | Bu k?k, 'doğru yol' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 74 | `سعر` | 19 | ateş | Bu k?k, 'ateş' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 75 | `فكر` | 18 | düşünmek | Bu k?k, 'düşünmek' anlam alan?yla ili?kili kullan?mlar? ta??r. | word-translations-tr.rootMeanings |
| 76 | `مكن` | 18 | yerleştirmek | Bu k?k, 'yerleştirmek' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 77 | `فرض` | 18 | Farz | Bu k?k, 'Farz' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 78 | `ملل` | 18 | din | Bu k?k, 'din' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 79 | `عوذ` | 17 | sığınmak | Bu k?k, 'sığınmak' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 80 | `صفو` | 17 | seçmek | Bu k?k, 'seçmek' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 81 | `ربص` | 17 | beklemek | Bu k?k, 'beklemek' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 82 | `زعم` | 17 | iddia etmek | Bu k?k, 'iddia etmek' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 83 | `منع` | 17 | engellemek | Bu k?k, 'engellemek' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 84 | `خشع` | 17 | huşu duyanlar | Bu k?k, 'huşu duyanlar' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 85 | `حبط` | 16 | boşa çıkmak | Bu k?k, 'boşa çıkmak' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 86 | `عتد` | 16 | hazırlamak | Bu k?k, 'hazırlamak' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 87 | `علن` | 16 | açıklamak, aşikar | Bu k?k, 'açıklamak, aşikar' anlam alan?yla ili?kili kullan?mlar? ta??r. | word-translations-tr.rootMeanings |
| 88 | `جهر` | 16 | açıkça | Bu k?k, 'açıkça' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 89 | `كيل` | 16 | ölçü | Bu k?k, 'ölçü' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 90 | `خبث` | 16 | kötü | Bu k?k, 'kötü' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 91 | `صمم` | 15 | sağır | Bu k?k, 'sağır' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 92 | `مسح` | 15 | silmek | Bu k?k, 'silmek' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 93 | `وصف` | 14 | nitelemek | Bu k?k, 'nitelemek' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 94 | `ولج` | 14 | girmek | Bu k?k, 'girmek' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 95 | `زرع` | 14 | ekinler | Bu k?k, 'ekinler' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 96 | `صوم` | 14 | oruç tutmak | Bu k?k, 'oruç tutmak' anlam alan?yla ili?kili kullan?mlar? ta??r. | word-translations-tr.rootMeanings |
| 97 | `حرث` | 14 | ekin | Bu k?k, 'ekin' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 98 | `رسو` | 14 | dağ | Bu k?k, 'dağ' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 99 | `عشو` | 14 | akşam | Bu k?k, 'akşam' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |
| 100 | `حلف` | 13 | yemin etmek | Bu k?k, 'yemin etmek' anlam alan?yla ili?kili kullan?mlar? ta??r. | canonical_word_analysis_v4 dominant meaning_tr |

## 6. En Riskli Kok Ornekleri

Bu kokler ya cok anlamli, ya canonical anlamlari kalip/phrase kirintisi gibi duruyor, ya da Turkce kaynak zayif. Ilk batch disinda tutulmalidir.

| Kok | Gecis | quran_verbs translation | Canonical Turkce anlamlar | Neden riskli? |
|---|---:|---|---|---|
| `سبق` | 37 | to precede (20), to race (6) | önce gelmek (20), öne geçenler (7), yarışmak (6), geçilmiş (2) | ?ok anlaml? da??l?m var; tek k?sa anlam riskli olabilir. |
| `مرر` | 35 | to pass, to continue (10) | kez (30), sürekli (2), geçmek (1), defa (1) | Dominant T?rk?e aday k?k anlam? de?il, kal?p/ba?lam k?r?nt?s? gibi g?r?n?yor. |
| `خفي` | 34 | to conceal, to hide (18), to hide (9) | gizlemek (18), gizli (10), gizlenmek (3), gizlice (2) | ?ok anlaml? da??l?m var; tek k?sa anlam riskli olabilir. |
| `كفي` | 33 | to be sufficient (32) | sana yeter (32), yetmek (1) | Dominant T?rk?e aday k?k anlam? de?il, kal?p/ba?lam k?r?nt?s? gibi g?r?n?yor. |
| `وصي` | 32 | to enjoin (11), to make, to instruct, to enjoin (5), to enjoin, to transmit (5) | tavsiye etmek (11), vasiyet (9), vasiyet etmek (5), öğütleşmek (5) | Birden ?ok/kar???k ?ngilizce gloss var; manuel kontrol gerekir. |
| `بدو` | 31 | to reveal, to disclose (15), to become apparent (11) | açığa çıkarmak (15), oldu (11), sığ görüşlü (1), çöl hayatı (1) | ?ok anlaml? da??l?m var; tek k?sa anlam riskli olabilir. |
| `خلص` | 31 | to choose, to be sincere (2), to seclude (1), to select (1) | samimi (11), seçilmiş (9), özel (5), samimi olmak (2) | Birden ?ok/kar???k ?ngilizce gloss var; manuel kontrol gerekir. |
| `شقق` | 28 | to split (8), to oppose (7), to make difficult, to cleave (2) | yarılmak (8), ayrılık (7), karşı çıkar (7), zor gelmek (2) | Birden ?ok/kar???k ?ngilizce gloss var; manuel kontrol gerekir. |
| `ثقل` | 28 | to be heavy (6) | ağırlık (14), ağır (6), ağırlaşmak (5), yüklenmiş (2) | ?ok anlaml? da??l?m var; tek k?sa anlam riskli olabilir. |
| `ثوب` | 28 | to reward (4) | Sevap (13), giysiler (8), karşılık vermek (3), karşılık (2) | ?ok anlaml? da??l?m var; tek k?sa anlam riskli olabilir. |
| `عجز` | 26 | to escape (4), to be unable (1) | kaçış (12), kaçıp kurtulmak (4), yaşlı kadın (4), kaçanlar (3) | ?ok anlaml? da??l?m var; tek k?sa anlam riskli olabilir. |
| `سقي` | 25 | to water, to give drink (12), to give drink (8), to ask for water (2) | sulamak (12), içmek (8), su istemek (2), su dağıtma (2) | ?ok anlaml? da??l?m var; tek k?sa anlam riskli olabilir. |
| `كود` | 24 | to be near, to nearly do, to almost do (24) | neredeyse (24) | Dominant T?rk?e aday k?k anlam? de?il, kal?p/ba?lam k?r?nt?s? gibi g?r?n?yor. |
| `وقع` | 24 | to fall, to occur, to fulfill (12), to cause (1) | düştü (12), düşmek (6), olay (2), sebep olmak (1) | ?ok anlaml? da??l?m var; tek k?sa anlam riskli olabilir. |
| `عمر` | 24 | to grant life (5), to maintain, to build on (4), to perform Umrah (1) | ömür (7), ömür verilmek (5), imar etmek (4), umre (2) | Birden ?ok/kar???k ?ngilizce gloss var; manuel kontrol gerekir. |
| `فجر` | 24 | to cause gush (6), to give lie (2), to gush forth (2) | fışkırtmak (8), şafak (6), günahkârlar (4), fışkırmak (2) | Birden ?ok/kar???k ?ngilizce gloss var; manuel kontrol gerekir. |
| `رقب` | 24 | to watch (4), to respect (3), to be vigilant (2) | boyunlar (9), gözetmek (6), gözetleyici (5), gözetlemek (4) | Birden ?ok/kar???k ?ngilizce gloss var; manuel kontrol gerekir. |
| `ثمر` | 24 | to bear fruit (2) | meyveler (17), meyve (5), meyve vermek (2) | Dominant T?rk?e aday k?k anlam? de?il, kal?p/ba?lam k?r?nt?s? gibi g?r?n?yor. |
| `مني` | 22 | to wish (9), to emit (3), to arouse desire (2) | dilemek (9), kuruntular (6), dökülmek (3), arzu uyandırmak (2) | Birden ?ok/kar???k ?ngilizce gloss var; manuel kontrol gerekir. |
| `بقي` | 21 | to remain (3), to spare, to remain (1) | kalıcı (11), kalmak (4), kalıntı (3), geride kalanlar (2) | ?ok anlaml? da??l?m var; tek k?sa anlam riskli olabilir. |

## 7. Veri Kaynaklari Ne Sagliyor?

- `root_explanations_tr_enriched.json`: 983 kokluk ana calisma havuzu. 250 seed kok reviewed, 733 kokte Turkce kisa/ozet alanlari bos.
- `root_explanations_tr.seed.json`: mevcut guvenli Turkce kok aciklamalarinin korunmasi gereken base kaynagi.
- `quran_verbs.csv`: root bazinda Ingilizce fiil gloss ve frequency sagliyor. Turkce aciklama icin dogrudan runtime kaynagi degil, review destek kaynagi olmali.
- `quran_lemmas.csv`: lemma frequency ve POS sagliyor; root kolonu olmadigi icin canonical v4 root-lemma eslesmesiyle dolayli kullanilmali.
- `word-translations-tr.json`: `rootMeanings` alaninda 167 kok icin Turkce karsilik var. Bos koklerde varsa en guvenli short_tr adayi buradan gelmeli.
- `canonical_word_analysis_v4.json`: root gecis frekansi, lemma, POS, mevcut `meaning_tr`, `gloss_en` ve ornek ayetleri sagliyor. En yararli audit ve batch siralama kaynagi bu dosya.

## 8. Simdilik Yapilmamasi Gerekenler

- Tefsir yazma veya kok anlamini ayet yorumu gibi genisletme.
- Mevcut seed degerlerini ezme.
- Ingilizce quran_verbs glosslarini otomatik Turkceye cevirip runtime default yapma.
- Kalip/edat/phrase kirintilarini kok anlami gibi kaydetme.
- Root enrichment bittikten sonra audit yapmadan v4/default davranisini degistirme.

## 9. Sonraki Guvenli Adim

En guvenli adim, bu rapordaki ilk 100 `kolay` koku ayri bir review dosyasina cikarmak ve sadece bos `short_tr` / `summary_tr` alanlari icin manuel onayli enrichment uretmektir. Bu enrichment once opt-in canonical v4/v5 auditinde denenmeli; default source ancak bos keyTerms ve noisy term metrikleri iyilestikten sonra tartisilmalidir.
