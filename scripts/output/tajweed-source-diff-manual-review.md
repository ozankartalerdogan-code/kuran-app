# Manuel İnceleme Gerektiren Ayetler

Sınıf 2, 3, 4, 6 veya 7 içeren ayetler listelenir. Bu liste hiçbir farkı doğru/yanlış ilan etmez ve production verisine otomatik karar taşımaz.

| Ayet | Sınıflar | Kayıt | Canonical örnek | Teknik neden |
|---|---|---:|---|---|
| 1:6 | 6 | 1 | `ٱلصِّرَٰطَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 1:7 | 6 | 1 | `صِرَٰطَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:2 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:3 | 6 | 1 | `ٱلصَّلَوٰةَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:5 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 2:10 | 6 | 1 | `أَلِيمٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:17 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 2:18 | 6 | 1 | `صُمٌّۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:19 | 6 | 2 | `ٱلصَّوَٰعِقِ` `مُحِيطٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:22 | 6 | 2 | `فِرَٰشًا` `ٱلثَّمَرَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:25 | 6 | 1 | `أَزْوَٰجٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:26 | 6 | 2 | `مَثَلًا` `مَثَلًا ۘ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:28 | 6 | 1 | `أَمْوَٰتًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:29 | 6 | 1 | `سَمَـٰوَٰتٍ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:30 | 7 | 1 | `نِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 2:31 | 6 | 1 | `أَنۢبِـُٔونِى` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:33 | 6, 7 | 4 | `يَـٰٓـَٔادَمُ` `مَّ` `نِّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 2:35 | 6 | 1 | `يَـٰٓـَٔادَمُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:39 | 6 | 1 | `بِـَٔايَـٰتِنَآ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:40 | 6 | 1 | `إِسْرَٰٓءِيلَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:41 | 6 | 3 | `كَافِرٍۭ` `بِـَٔايَـٰتِى` `قَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:43 | 6 | 3 | `ٱلصَّلَوٰةَ` `ٱلزَّكَوٰةَ` `ٱلرَّٰكِعِينَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:45 | 6 | 1 | `وَٱلصَّلَوٰةِ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:46 | 6 | 1 | `رَٰجِعُونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:47 | 6 | 1 | `إِسْرَٰٓءِيلَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:48 | 6 | 1 | `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:49 | 6, 7 | 2 | `ذَٰلِكُم` `مِّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 2:51 | 6 | 1 | `وَٰعَدْنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:52 | 6, 7 | 3 | `كُ` `مِّ` `ذَٰلِكَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:54 | 6 | 1 | `ذَٰلِكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:56 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 2:59 | 6 | 1 | `قَوْلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:61 | 6 | 5 | `وَٰحِدٍ` `ذَٰلِكَ` `بِـَٔايَـٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:62 | 6 | 1 | `وَٱلصَّـٰبِـِٔينَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:64 | 6, 7 | 3 | `مِّ` `ذَٰلِكَ ۖ` `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:65 | 6 | 1 | `خَـٰسِـِٔينَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:66 | 6 | 1 | `نَكَـٰلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:68 | 6 | 2 | `عَوَانٌۢ` `ذَٰلِكَ ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:70 | 7 | 2 | `نَّ` `شَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 2:72 | 6 | 1 | `فَٱدَّٰرَْٰٔتُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:73 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:74 | 6, 7 | 2 | `مِّ` `ذَٰلِكَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:78 | 7 | 1 | `نُّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 2:79 | 6 | 1 | `قَلِيلًا ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:81 | 6 | 1 | `خَطِيٓـَٔتُهُۥ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:83 | 6, 7 | 6 | `إِسْرَٰٓءِيلَ` `وَبِٱلْوَٰلِدَيْنِ` `ٱلصَّلَوٰةَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 2:85 | 6, 7 | 4 | `كُ` `وَٱلْعُدْوَٰنِ` `ذَٰلِكَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:86 | 6 | 1 | `ٱلْحَيَوٰةَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:87 | 6 | 1 | `رَسُولٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:88 | 6 | 2 | `غُلْفٌۢ ۚ` `فَقَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:91 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 2:93 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 2:95 | 6 | 2 | `أَبَدًۢا` `عَلِيمٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:96 | 6 | 2 | `حَيَوٰةٍ` `بَصِيرٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:98 | 6 | 2 | `لِّلَّهِ` `وَمِيكَىٰلَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:99 | 6 | 1 | `ءَايَـٰتٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:104 | 6 | 1 | `رَٰعِنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:105 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 2:107 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:108 | 6 | 1 | `تَسْـَٔلُوا۟` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:109 | 7 | 2 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 2:110 | 6 | 2 | `ٱلصَّلَوٰةَ` `ٱلزَّكَوٰةَ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:113 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:114 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 2:115 | 6 | 1 | `وَٰسِعٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:116 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:117 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:118 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:119 | 6, 7 | 2 | `نَّ` `تُسْـَٔلُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:122 | 6 | 1 | `إِسْرَٰٓءِيلَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:123 | 6 | 1 | `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:124 | 6 | 1 | `إِبْرَٰهِـۧمَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:125 | 6 | 2 | `إِبْرَٰهِـۧمَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:126 | 6 | 3 | `إِبْرَٰهِـۧمُ` `ٱلثَّمَرَٰتِ` `قَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:127 | 6, 7 | 2 | `إِبْرَٰهِـۧمُ` `نَّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 2:129 | 6 | 1 | `رَسُولًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:130 | 6 | 1 | `إِبْرَٰهِـۧمَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:132 | 6, 7 | 2 | `إِبْرَٰهِـۧمُ` `تُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 2:133 | 6 | 2 | `إِبْرَٰهِـۧمَ` `وَٰحِدًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:134 | 6 | 1 | `تُسْـَٔلُونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:135 | 6 | 1 | `إِبْرَٰهِـۧمَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:136 | 6 | 1 | `إِبْرَٰهِـۧمَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:137 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 2:140 | 6 | 1 | `إِبْرَٰهِـۧمَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:141 | 6 | 1 | `تُسْـَٔلُونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:142 | 6 | 3 | `وَلَّىٰهُمْ` `لِّلَّهِ` `صِرَٰطٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:143 | 6, 7 | 2 | `وَكَذَٰلِكَ` `مَّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 2:144 | 6 | 1 | `تَرْضَىٰهَا ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:145 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 2:148 | 6 | 1 | `ٱلْخَيْرَٰتِ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:151 | 6 | 1 | `رَسُولًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:153 | 6 | 1 | `وَٱلصَّلَوٰةِ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:154 | 6 | 1 | `أَمْوَٰتٌۢ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:155 | 6 | 2 | `ٱلْأَمْوَٰلِ` `وَٱلثَّمَرَٰتِ ۗ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:156 | 6, 7 | 2 | `نَّ` `رَٰجِعُونَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:157 | 6, 7 | 2 | `صَلَوَٰتٌ` `مِّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 2:163 | 6, 7 | 2 | `وَٰحِدٌ ۖ` `لَّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 2:164 | 6, 7 | 2 | `ٱلسَّمَـٰوَٰتِ` `مَّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 2:165 | 6 | 1 | `لِّلَّهِ ۗ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:167 | 6, 7 | 3 | `كَذَٰلِكَ` `حَسَرَٰتٍ` `نَّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 2:168 | 6 | 2 | `حَلَـٰلًا` `خُطُوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:170 | 6 | 1 | `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:171 | 6 | 1 | `صُمٌّۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:174 | 6 | 1 | `قَلِيلًا ۙ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:175 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 2:176 | 6 | 2 | `ذَٰلِكَ` `شِقَاقٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:177 | 6 | 3 | `وَٱلنَّبِيِّـۧنَ` `ٱلصَّلَوٰةَ` `ٱلزَّكَوٰةَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:178 | 6, 7 | 4 | `فَٱتِّبَاعٌۢ` `ذَٰلِكَ` `مِّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 2:179 | 6 | 1 | `حَيَوٰةٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:180 | 6 | 1 | `لِلْوَٰلِدَيْنِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:181 | 6 | 1 | `فَمَنۢ بَدَّلَهُۥ بَعْدَ مَا سَمِعَهُۥ فَإِنَّمَآ إِثْمُهُۥ عَلَى ٱلَّذِينَ يُبَدِّلُونَهُۥٓ ۚ إِنَّ ٱللَّهَ سَمِيعٌ عَلِيمٌ` | Canonical metin ile eski kaynağın token sayıları farklıdır; güvenli karakter-aralığı kararı otomatik verilemez. |
| 2:184 | 6, 7 | 2 | `مَّعْدُودَٰتٍ ۚ` `كُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 2:187 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:188 | 6 | 2 | `أَمْوَٰلَكُم` `أَمْوَٰلِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:189 | 6 | 3 | `يَسْـَٔلُونَكَ` `مَوَٰقِيتُ` `أَبْوَٰبِهَا ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:191 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:193 | 6 | 1 | `عُدْوَٰنَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:196 | 6, 7 | 3 | `كُ` `مِّ` `ذَٰلِكَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:198 | 6, 7 | 3 | `فَضْلًا` `مِّ` `تُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 2:201 | 7 | 2 | `مَّ` `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 2:203 | 6 | 1 | `مَّعْدُودَٰتٍ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:204 | 6 | 1 | `ٱلْحَيَوٰةِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:207 | 6 | 1 | `رَءُوفٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:208 | 6 | 1 | `خُطُوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:209 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 2:211 | 6 | 2 | `إِسْرَٰٓءِيلَ` `ءَايَةٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:212 | 6 | 1 | `ٱلْحَيَوٰةُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:213 | 6 | 4 | `وَٰحِدَةً` `ٱلنَّبِيِّـۧنَ` `بَغْيًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:215 | 6 | 2 | `يَسْـَٔلُونَكَ` `فَلِلْوَٰلِدَيْنِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:216 | 6 | 2 | `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:217 | 6 | 2 | `يَسْـَٔلُونَكَ` `وَكُفْرٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:219 | 6 | 3 | `يَسْـَٔلُونَكَ` `وَيَسْـَٔلُونَكَ` `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:220 | 6 | 2 | `وَيَسْـَٔلُونَكَ` `فَإِخْوَٰنُكُمْ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:222 | 6 | 2 | `وَيَسْـَٔلُونَكَ` `ٱلتَّوَّٰبِينَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:224 | 6 | 1 | `لِّأَيْمَـٰنِكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:226 | 7 | 1 | `فَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 2:228 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:229 | 6, 7 | 4 | `فَإِمْسَاكٌۢ` `تَسْرِيحٌۢ` `مَّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 2:230 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 2:231 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:232 | 6 | 4 | `أَزْوَٰجَهُنَّ` `تَرَٰضَوْا۟` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:233 | 6, 7 | 5 | `وَٱلْوَٰلِدَٰتُ` `وَٰلِدَةٌۢ` `ذَٰلِكَ ۗ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 2:234 | 6 | 1 | `أَزْوَٰجًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:235 | 6 | 1 | `قَوْلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:236 | 6 | 1 | `مَتَـٰعًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:238 | 6 | 2 | `ٱلصَّلَوَٰتِ` `وَٱلصَّلَوٰةِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:239 | 6 | 1 | `فَرِجَالًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:240 | 6 | 2 | `أَزْوَٰجًا` `لِّأَزْوَٰجِهِم` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:241 | 6 | 1 | `مَتَـٰعٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:242 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:246 | 6 | 3 | `إِسْرَٰٓءِيلَ` `قَلِيلًا` `عَلِيمٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:247 | 6 | 2 | `ٱصْطَفَىٰهُ` `وَٰسِعٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:248 | 6, 7 | 3 | `مِّ` `ذَٰلِكَ` `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:249 | 6, 7 | 4 | `نِّ` `غُرْفَةًۢ` `قَلِيلًا` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:251 | 6 | 1 | `وَءَاتَىٰهُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:253 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 2:255 | 6 | 3 | `ٱلسَّمَـٰوَٰتِ` `يَـُٔودُهُۥ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:258 | 6 | 5 | `إِبْرَٰهِـۧمَ` `ءَاتَىٰهُ` `إِبْرَٰهِـۧمُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:260 | 6 | 1 | `إِبْرَٰهِـۧمُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:261 | 6 | 2 | `أَمْوَٰلَهُمْ` `وَٰسِعٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:262 | 6 | 1 | `أَمْوَٰلَهُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:265 | 6 | 3 | `أَمْوَٰلَهُمُ` `جَنَّةٍۭ` `فَـَٔاتَتْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:266 | 6 | 2 | `ٱلثَّمَرَٰتِ` `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:267 | 6, 7 | 2 | `مَّ` `بِـَٔاخِذِيهِ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:268 | 6 | 2 | `وَفَضْلًا ۗ` `وَٰسِعٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:270 | 7 | 3 | `مِّ` `صَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 2:271 | 6, 7 | 2 | `كُ` `سَيِّـَٔاتِكُمْ ۗ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:273 | 6 | 1 | `يَسْـَٔلُونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:274 | 6 | 1 | `أَمْوَٰلَهُم` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:275 | 6, 7 | 6 | `ٱلرِّبَوٰا۟` `ذَٰلِكَ` `ٱلرِّبَوٰا۟ ۗ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 2:276 | 6 | 1 | `ٱلرِّبَوٰا۟` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:277 | 6 | 2 | `ٱلصَّلَوٰةَ` `ٱلزَّكَوٰةَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:278 | 6, 7 | 2 | `ٱلرِّبَوٰٓا۟` `تُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 2:279 | 6 | 1 | `أَمْوَٰلِكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:282 | 6, 7 | 6 | `تُ` `كَاتِبٌۢ` `شَيْـًٔا ۚ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:284 | 6 | 2 | `لِّلَّهِ` `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 2:285 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 2:286 | 6 | 1 | `مَوْلَىٰنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:3 | 7 | 1 | `جِ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 3:4 | 6 | 1 | `بِـَٔايَـٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:7 | 6 | 1 | `وَٱلرَّٰسِخُونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:10 | 6, 7 | 3 | `أَمْوَٰلُهُمْ` `شَيْـًٔا ۖ` `نَّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 3:11 | 6 | 1 | `بِـَٔايَـٰتِنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:13 | 6 | 2 | `ذَٰلِكَ` `لِّأُو۟لِى` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:14 | 6 | 4 | `ٱلشَّهَوَٰتِ` `ذَٰلِكَ` `ٱلْحَيَوٰةِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:15 | 6 | 4 | `ذَٰلِكُمْ ۚ` `وَأَزْوَٰجٌ` `وَرِضْوَٰنٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:16 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 3:18 | 6 | 1 | `قَآئِمًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:19 | 6 | 2 | `بَغْيًۢا` `بِـَٔايَـٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:20 | 6 | 2 | `وَٱلْأُمِّيِّـۧنَ` `بَصِيرٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:21 | 6 | 2 | `بِـَٔايَـٰتِ` `ٱلنَّبِيِّـۧنَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:22 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 3:24 | 6 | 2 | `ذَٰلِكَ` `مَّعْدُودَٰتٍ ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:28 | 6 | 2 | `ذَٰلِكَ` `تُقَىٰةً ۗ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:29 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:30 | 6, 7 | 3 | `سُ` `أَمَدًۢا` `رَءُوفٌۢ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:33 | 6 | 2 | `إِبْرَٰهِيمَ` `عِمْرَٰنَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:34 | 6 | 1 | `ذُرِّيَّةًۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:35 | 6, 7 | 2 | `عِمْرَٰنَ` `نِّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 3:36 | 7 | 1 | `نِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 3:39 | 6 | 1 | `مُصَدِّقًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:40 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:42 | 6 | 2 | `ٱصْطَفَىٰكِ` `وَٱصْطَفَىٰكِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:43 | 6 | 1 | `ٱلرَّٰكِعِينَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:44 | 6, 7 | 2 | `ذَٰلِكَ` `بَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 3:46 | 6 | 1 | `وَكَهْلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:47 | 6 | 1 | `كَذَٰلِكِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:48 | 7 | 1 | `جِ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 3:49 | 6, 7 | 9 | `وَرَسُولًا` `إِسْرَٰٓءِيلَ` `بِـَٔايَةٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 3:50 | 6, 7 | 2 | `بِـَٔايَةٍ` `مِّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 3:51 | 6 | 1 | `صِرَٰطٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:52 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 3:56 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 3:58 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:63 | 6 | 1 | `عَلِيمٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:64 | 6 | 2 | `سَوَآءٍۭ` `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:65 | 6 | 1 | `إِبْرَٰهِيمَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:67 | 6 | 1 | `إِبْرَٰهِيمُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:68 | 6 | 1 | `بِإِبْرَٰهِيمَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:70 | 6 | 1 | `بِـَٔايَـٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:73 | 6 | 1 | `وَٰسِعٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:75 | 6 | 2 | `ذَٰلِكَ` `ٱلْأُمِّيِّـۧنَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:77 | 6 | 1 | `قَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:79 | 6 | 1 | `رَبَّـٰنِيِّـۧنَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:80 | 6, 7 | 2 | `وَٱلنَّبِيِّـۧنَ` `تُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 3:81 | 6 | 3 | `ٱلنَّبِيِّـۧنَ` `ذَٰلِكُمْ` `وَأَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:82 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:83 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:84 | 6 | 1 | `إِبْرَٰهِيمَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:89 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:91 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 3:93 | 6 | 3 | `حِلًّا` `إِسْرَٰٓءِيلَ` `إِسْرَٰٓءِيلُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:94 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:95 | 6 | 1 | `إِبْرَٰهِيمَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:97 | 6 | 3 | `ءَايَـٰتٌۢ` `إِبْرَٰهِيمَ ۖ` `سَبِيلًا ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:98 | 6 | 1 | `بِـَٔايَـٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:101 | 6 | 1 | `صِرَٰطٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:102 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 3:103 | 6 | 2 | `إِخْوَٰنًا` `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:109 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:112 | 6 | 3 | `ذَٰلِكَ` `بِـَٔايَـٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:113 | 7 | 1 | `قَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 3:114 | 6 | 1 | `ٱلْخَيْرَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:115 | 6 | 1 | `عَلِيمٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:116 | 6 | 2 | `أَمْوَٰلُهُمْ` `شَيْـًٔا ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:117 | 6 | 1 | `ٱلْحَيَوٰةِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:118 | 6 | 2 | `خَبَالًا` `أَفْوَٰهِهِمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:119 | 6 | 1 | `عَلِيمٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:120 | 6 | 1 | `شَيْـًٔا ۗ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:129 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:130 | 6 | 1 | `ٱلرِّبَوٰٓا۟` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:133 | 6, 7 | 2 | `مِّ` `ٱلسَّمَـٰوَٰتُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:136 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 3:139 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 3:144 | 6 | 1 | `شَيْـًٔا ۗ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:145 | 6 | 1 | `مُّؤَجَّلًا ۗ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:148 | 6 | 1 | `فَـَٔاتَىٰهُمُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:150 | 6 | 1 | `مَوْلَىٰكُمْ ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:152 | 7 | 5 | `مِّ` `كُ` `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 3:153 | 6, 7 | 3 | `غَمًّۢا` `مٍّ` `خَبِيرٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 3:154 | 6, 7 | 2 | `مِّ` `عَلِيمٌۢ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:156 | 6 | 2 | `لِإِخْوَٰنِهِمْ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:160 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 3:162 | 6, 7 | 2 | `رِضْوَٰنَ` `بَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 3:163 | 6 | 1 | `بَصِيرٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:164 | 6 | 1 | `رَسُولًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:165 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 3:167 | 6 | 2 | `قِتَالًا` `بِأَفْوَٰهِهِم` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:168 | 6 | 1 | `لِإِخْوَٰنِهِمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:169 | 6 | 1 | `أَمْوَٰتًۢا ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:170 | 6 | 1 | `ءَاتَىٰهُمُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:174 | 6 | 1 | `رِضْوَٰنَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:175 | 6, 7 | 2 | `ذَٰلِكُمُ` `تُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 3:176 | 6 | 1 | `شَيْـًٔا ۗ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:177 | 6 | 1 | `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:178 | 6 | 1 | `لِّأَنفُسِهِمْ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:179 | 6 | 1 | `فَـَٔامِنُوا۟` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:180 | 6 | 3 | `ءَاتَىٰهُمُ` `مِيرَٰثُ` `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:182 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:185 | 6, 7 | 2 | `ذَ` `ٱلْحَيَوٰةُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:186 | 6 | 2 | `أَمْوَٰلِكُمْ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:187 | 6 | 1 | `قَلِيلًا ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:189 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:190 | 6 | 2 | `ٱلسَّمَـٰوَٰتِ` `لِّأُو۟لِى` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:191 | 6, 7 | 3 | `ٱلسَّمَـٰوَٰتِ` `بَـٰطِلًا` `نَّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 3:192 | 7 | 1 | `صَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 3:193 | 6 | 2 | `فَـَٔامَنَّا ۚ` `سَيِّـَٔاتِنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:195 | 6, 7 | 3 | `كُ` `مِّ` `سَيِّـَٔاتِهِمْ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:198 | 6 | 1 | `نُزُلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 3:199 | 6 | 2 | `بِـَٔايَـٰتِ` `قَلِيلًا ۗ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:1 | 6, 7 | 3 | `مِّ` `وَٰحِدَةٍ` `رِجَالًا` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:2 | 6 | 3 | `أَمْوَٰلَهُمْ ۖ` `أَمْوَٰلَهُمْ` `أَمْوَٰلِكُمْ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:3 | 6 | 2 | `فَوَٰحِدَةً` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:4 | 6, 7 | 3 | `شَ` `هَنِيٓـًٔا` `مَّرِيٓـًٔا` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:5 | 6 | 2 | `أَمْوَٰلَكُمُ` `قَوْلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:6 | 6 | 2 | `أَمْوَٰلَهُمْ ۖ` `أَمْوَٰلَهُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:7 | 6 | 2 | `ٱلْوَٰلِدَانِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:8 | 6 | 1 | `قَوْلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:9 | 6 | 1 | `قَوْلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:10 | 6 | 1 | `أَمْوَٰلَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:11 | 6 | 2 | `وَٰحِدَةً` `وَٰحِدٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:12 | 6, 7 | 4 | `أَزْوَٰجُكُمْ` `مِّ` `وَٰحِدٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 4:13 | 6 | 1 | `وَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:15 | 6 | 2 | `يَتَوَفَّىٰهُنَّ` `سَبِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:16 | 6 | 1 | `فَـَٔاذُوهُمَا ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:18 | 6 | 1 | `ٱلسَّيِّـَٔاتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:19 | 6 | 1 | `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:20 | 6 | 1 | `شَيْـًٔا ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:21 | 7 | 1 | `كُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 4:22 | 6 | 1 | `سَبِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:23 | 6, 7 | 3 | `وَأَخَوَٰتُكُمْ` `وَأَخَوَٰتُكُم` `مِّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 4:24 | 6 | 4 | `ذَٰلِكُمْ` `بِأَمْوَٰلِكُم` `فَـَٔاتُوهُنَّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:25 | 6, 7 | 4 | `طَوْلًا` `مِّ` `مُتَّخِذَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 4:27 | 6 | 2 | `ٱلشَّهَوَٰتِ` `مَيْلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:29 | 6 | 1 | `أَمْوَٰلَكُم` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:30 | 6 | 3 | `ذَٰلِكَ` `عُدْوَٰنًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:31 | 6 | 2 | `سَيِّـَٔاتِكُمْ` `مُّدْخَلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:32 | 6 | 1 | `وَسْـَٔلُوا۟` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:33 | 6 | 3 | `مَوَٰلِىَ` `ٱلْوَٰلِدَانِ` `فَـَٔاتُوهُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:34 | 6 | 3 | `قَوَّٰمُونَ` `أَمْوَٰلِهِمْ ۚ` `سَبِيلًا ۗ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:36 | 6 | 3 | `شَيْـًٔا ۖ` `وَبِٱلْوَٰلِدَيْنِ` `مُخْتَالًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:37 | 6 | 1 | `ءَاتَىٰهُمُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:38 | 6 | 1 | `أَمْوَٰلَهُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:41 | 6 | 1 | `أُمَّةٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:43 | 6, 7 | 3 | `ٱلصَّلَوٰةَ` `تُ` `كُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 4:46 | 6 | 3 | `وَرَٰعِنَا` `لَيًّۢا` `قَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:47 | 6, 7 | 2 | `نَّ` `مَفْعُولًا` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:48 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:49 | 6 | 1 | `فَتِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:51 | 6 | 1 | `سَبِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:54 | 6 | 2 | `ءَاتَىٰهُمُ` `إِبْرَٰهِيمَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:56 | 6 | 1 | `بِـَٔايَـٰتِنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:57 | 6 | 3 | `أَزْوَٰجٌ` `ظِلًّا` `ظَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:58 | 6 | 1 | `سَمِيعًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:59 | 6 | 2 | `ذَٰلِكَ` `تَأْوِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:60 | 6 | 1 | `ضَلَـٰلًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:62 | 6 | 1 | `مُّصِيبَةٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:63 | 6 | 1 | `قَوْلًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:67 | 7 | 2 | `مِّ` `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 4:68 | 6 | 1 | `صِرَٰطًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:69 | 6 | 1 | `ٱلنَّبِيِّـۧنَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:70 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:74 | 6 | 1 | `ٱلْحَيَوٰةَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:75 | 6 | 1 | `وَٱلْوِلْدَٰنِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:77 | 6 | 3 | `ٱلصَّلَوٰةَ` `ٱلزَّكَوٰةَ` `فَتِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:79 | 6 | 1 | `رَسُولًا ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:81 | 6 | 1 | `وَكِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:83 | 6 | 1 | `قَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:84 | 6 | 1 | `تَنكِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:88 | 6 | 1 | `سَبِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:90 | 6 | 2 | `قَوْمٍۭ` `سَبِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:92 | 6 | 3 | `خَطَـًٔا ۚ` `خَطَـًٔا` `قَوْمٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:94 | 6, 7 | 3 | `ٱلْحَيَوٰةِ` `كَذَٰلِكَ` `تُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 4:95 | 6 | 3 | `بِأَمْوَٰلِهِمْ` `وَكُلًّا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:97 | 6 | 2 | `تَوَفَّىٰهُمُ` `وَٰسِعَةً` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:98 | 6 | 2 | `وَٱلْوِلْدَٰنِ` `سَبِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:100 | 6 | 1 | `مُرَٰغَمًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:101 | 6 | 1 | `ٱلصَّلَوٰةِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:102 | 6, 7 | 3 | `ٱلصَّلَوٰةَ` `وَٰحِدَةً ۚ` `تُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 4:103 | 6 | 3 | `ٱلصَّلَوٰةَ` `ٱلصَّلَوٰةَ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:105 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 4:109 | 6, 7 | 3 | `ٱلْحَيَوٰةِ` `مَّ` `وَكِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 4:112 | 6 | 2 | `خَطِيٓـَٔةً` `بَرِيٓـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:113 | 7 | 1 | `شَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 4:114 | 6 | 2 | `إِصْلَـٰحٍۭ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:116 | 6 | 2 | `ذَٰلِكَ` `ضَلَـٰلًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:122 | 6 | 1 | `قِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:125 | 6 | 3 | `إِبْرَٰهِيمَ` `خَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:126 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:127 | 6 | 1 | `ٱلْوِلْدَٰنِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:130 | 6 | 2 | `كُلًّا` `وَٰسِعًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:131 | 6 | 2 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:132 | 6 | 2 | `ٱلسَّمَـٰوَٰتِ` `وَكِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:133 | 6 | 2 | `بِـَٔاخَرِينَ ۚ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:134 | 6 | 1 | `سَمِيعًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:135 | 6 | 2 | `قَوَّٰمِينَ` `ٱلْوَٰلِدَيْنِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:136 | 6 | 1 | `ضَلَـٰلًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:137 | 6 | 1 | `سَبِيلًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:141 | 6 | 1 | `سَبِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:142 | 6 | 2 | `ٱلصَّلَوٰةِ` `قَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:143 | 6 | 2 | `ذَٰلِكَ` `سَبِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:149 | 7 | 1 | `سُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 4:150 | 6 | 2 | `ذَٰلِكَ` `سَبِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:153 | 6 | 3 | `يَسْـَٔلُكَ` `ذَٰلِكَ` `ذَٰلِكَ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:155 | 6 | 3 | `بِـَٔايَـٰتِ` `غُلْفٌۢ ۚ` `قَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:157 | 6 | 1 | `يَقِينًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:161 | 6 | 2 | `ٱلرِّبَوٰا۟` `أَمْوَٰلَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:162 | 6 | 3 | `ٱلرَّٰسِخُونَ` `ٱلصَّلَوٰةَ ۚ` `ٱلزَّكَوٰةَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:163 | 6, 7 | 3 | `نَّ` `وَٱلنَّبِيِّـۧنَ` `إِبْرَٰهِيمَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:164 | 6 | 2 | `وَرُسُلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:165 | 6 | 2 | `رُّسُلًا` `حُجَّةٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:167 | 6 | 1 | `ضَلَـٰلًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:169 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:170 | 6 | 2 | `فَـَٔامِنُوا۟` `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:171 | 6 | 5 | `أَلْقَىٰهَآ` `فَـَٔامِنُوا۟` `وَٰحِدٌ ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:172 | 6 | 1 | `لِّلَّهِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:174 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 4:175 | 6 | 1 | `صِرَٰطًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 4:176 | 6 | 2 | `رِّجَالًا` `عَلِيمٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:2 | 6, 7 | 5 | `فَضْلًا` `مِّ` `وَرِضْوَٰنًا ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 5:3 | 6 | 2 | `ذَٰلِكُمْ` `لِّإِثْمٍ ۙ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:4 | 6, 7 | 2 | `يَسْـَٔلُونَكَ` `مَّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 5:6 | 6, 7 | 3 | `ٱلصَّلَوٰةِ` `تُ` `كُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 5:7 | 6 | 1 | `عَلِيمٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:8 | 6 | 3 | `قَوَّٰمِينَ` `شَنَـَٔانُ` `خَبِيرٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:10 | 6 | 1 | `بِـَٔايَـٰتِنَآ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:12 | 6, 7 | 6 | `إِسْرَٰٓءِيلَ` `ٱلصَّلَوٰةَ` `ٱلزَّكَوٰةَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 5:13 | 6 | 1 | `قَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:16 | 6 | 2 | `رِضْوَٰنَهُۥ` `صِرَٰطٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:17 | 6 | 2 | `شَيْـًٔا` `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:18 | 6, 7 | 2 | `تُ` `ٱلسَّمَـٰوَٰتِ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:20 | 6 | 1 | `وَءَاتَىٰكُم` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:22 | 6 | 1 | `دَٰخِلُونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:23 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 5:28 | 6, 7 | 2 | `أَنَا۠` `نِّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 5:29 | 6, 7 | 3 | `نِّ` `وَذَٰلِكَ` `جَزَٰٓؤُا۟` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:31 | 6 | 2 | `يُوَٰرِى` `فَأُوَٰرِىَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:32 | 6 | 4 | `ذَٰلِكَ` `إِسْرَٰٓءِيلَ` `نَفْسًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:33 | 6 | 2 | `جَزَٰٓؤُا۟` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:38 | 6 | 2 | `جَزَآءًۢ` `نَكَـٰلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:40 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:41 | 6 | 2 | `بِأَفْوَٰهِهِمْ` `شَيْـًٔا ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:42 | 6, 7 | 2 | `جَ` `شَيْـًٔا ۖ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:43 | 6 | 1 | `ذَٰلِكَ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:44 | 6, 7 | 3 | `نَّ` `بِـَٔايَـٰتِى` `قَلِيلًا ۚ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:48 | 6 | 3 | `وَٰحِدَةً` `ءَاتَىٰكُمْ ۖ` `ٱلْخَيْرَٰتِ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:54 | 6 | 2 | `ذَٰلِكَ` `وَٰسِعٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:55 | 6 | 3 | `ٱلصَّلَوٰةَ` `ٱلزَّكَوٰةَ` `رَٰكِعُونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:57 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 5:58 | 6 | 2 | `ٱلصَّلَوٰةِ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:59 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 5:60 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:62 | 6 | 1 | `وَٱلْعُدْوَٰنِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:63 | 6 | 1 | `يَنْهَىٰهُمُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:64 | 6, 7 | 2 | `مَّ` `ٱلْعَدَٰوَةَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:65 | 6 | 1 | `سَيِّـَٔاتِهِمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:66 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 5:68 | 7 | 2 | `مِّ` `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 5:69 | 6 | 1 | `وَٱلصَّـٰبِـُٔونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:70 | 6 | 3 | `إِسْرَٰٓءِيلَ` `رُسُلًا ۖ` `رَسُولٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:71 | 6 | 1 | `بَصِيرٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:72 | 6, 7 | 2 | `إِسْرَٰٓءِيلَ` `صَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 5:73 | 6 | 1 | `وَٰحِدٌ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:78 | 6 | 2 | `إِسْرَٰٓءِيلَ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:82 | 6 | 2 | `عَدَٰوَةً` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:85 | 6 | 1 | `وَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:86 | 6 | 1 | `بِـَٔايَـٰتِنَآ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:88 | 6, 7 | 2 | `حَلَـٰلًا` `تُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 5:89 | 6 | 2 | `ذَٰلِكَ` `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:91 | 6, 7 | 3 | `ٱلْعَدَٰوَةَ` `ٱلصَّلَوٰةِ ۖ` `تُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 5:94 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:95 | 6, 7 | 3 | `كُ` `هَدْيًۢا` `ذَٰلِكَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:97 | 6 | 2 | `ذَٰلِكَ` `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:101 | 6 | 2 | `تَسْـَٔلُوا۟` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:104 | 6 | 1 | `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:106 | 6, 7 | 2 | `ٱلصَّلَوٰةِ` `نَّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 5:107 | 6, 7 | 2 | `فَـَٔاخَرَانِ` `نَّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 5:108 | 6 | 2 | `ذَٰلِكَ` `أَيْمَـٰنٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:110 | 6 | 5 | `وَٰلِدَتِكَ` `وَكَهْلًا ۖ` `كَهَيْـَٔةِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:111 | 6 | 1 | `ٱلْحَوَارِيِّـۧنَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:112 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 5:114 | 6 | 2 | `لِّأَوَّلِنَا` `ٱلرَّٰزِقِينَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:115 | 7 | 2 | `نِّ` `لَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 5:119 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 5:120 | 6 | 2 | `ٱلسَّمَـٰوَٰتِ` `قَدِيرٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:1 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:2 | 6 | 1 | `أَجَلًا ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:3 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:9 | 6 | 1 | `رَجُلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:12 | 6 | 2 | `ٱلسَّمَـٰوَٰتِ` `لِّلَّهِ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:14 | 6, 7 | 2 | `ٱلسَّمَـٰوَٰتِ` `نِّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 6:15 | 7 | 1 | `نِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 6:16 | 6 | 1 | `وَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:19 | 6 | 2 | `شَهِيدٌۢ` `وَٰحِدٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:21 | 6 | 1 | `بِـَٔايَـٰتِهِۦٓ ۗ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:25 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 6:26 | 6 | 1 | `وَيَنْـَٔوْنَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:27 | 6 | 1 | `بِـَٔايَـٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:32 | 6 | 1 | `ٱلْحَيَوٰةُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:33 | 6 | 1 | `بِـَٔايَـٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:34 | 6 | 1 | `أَتَىٰهُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:35 | 6 | 1 | `بِـَٔايَةٍ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:37 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 6:38 | 7 | 1 | `دَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 6:39 | 6, 7 | 3 | `بِـَٔايَـٰتِنَا` `مٌّ` `صِرَٰطٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 6:40 | 6 | 1 | `أَتَىٰكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:41 | 7 | 1 | `شَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 6:44 | 6 | 1 | `أَبْوَٰبَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:47 | 6 | 1 | `أَتَىٰكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:49 | 6 | 1 | `بِـَٔايَـٰتِنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:52 | 6, 7 | 2 | `بِٱلْغَدَوٰةِ` `شَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 6:53 | 6, 7 | 2 | `وَكَذَٰلِكَ` `مِّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 6:54 | 6 | 2 | `بِـَٔايَـٰتِنَا` `سُوٓءًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:55 | 6 | 1 | `وَكَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:56 | 6 | 1 | `أَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:57 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 6:60 | 6 | 1 | `يَتَوَفَّىٰكُم` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:62 | 6 | 1 | `مَوْلَىٰهُمُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:63 | 6 | 1 | `أَنجَىٰنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:69 | 7 | 1 | `شَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 6:70 | 6 | 3 | `ٱلْحَيَوٰةُ` `نَفْسٌۢ` `أَلِيمٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:72 | 6 | 1 | `ٱلصَّلَوٰةَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:73 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:74 | 6, 7 | 2 | `إِبْرَٰهِيمُ` `نِّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 6:75 | 6 | 3 | `وَكَذَٰلِكَ` `إِبْرَٰهِيمَ` `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:76 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 6:77 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 6:78 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 6:79 | 6 | 2 | `ٱلسَّمَـٰوَٰتِ` `أَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:80 | 6 | 1 | `شَيْـًٔا ۗ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:83 | 6 | 1 | `إِبْرَٰهِيمَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:84 | 6 | 2 | `كُلًّا` `وَكَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:86 | 6 | 1 | `وَكُلًّا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:87 | 6 | 2 | `وَإِخْوَٰنِهِمْ ۖ` `صِرَٰطٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:88 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:90 | 6 | 1 | `أَسْـَٔلُكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:93 | 6 | 1 | `غَمَرَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:94 | 6, 7 | 2 | `فُرَٰدَىٰ` `كُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 6:95 | 6 | 1 | `ذَٰلِكُمُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:96 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:98 | 6, 7 | 2 | `مِّ` `وَٰحِدَةٍ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:99 | 6 | 1 | `ذَٰلِكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:100 | 6 | 1 | `وَبَنَـٰتٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:101 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:102 | 6 | 1 | `ذَٰلِكُمُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:104 | 6 | 1 | `أَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:105 | 6 | 1 | `وَكَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:108 | 6 | 2 | `عَدْوًۢا` `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:109 | 7 | 1 | `جَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 6:110 | 6 | 1 | `أَفْـِٔدَتَهُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:111 | 6 | 1 | `قُبُلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:112 | 6 | 1 | `وَكَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:113 | 6 | 1 | `أَفْـِٔدَةُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:114 | 6, 7 | 2 | `مُفَصَّلًا ۚ` `مِّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 6:115 | 6 | 1 | `وَعَدْلًا ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:118 | 6, 7 | 2 | `تُ` `بِـَٔايَـٰتِهِۦ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:122 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:123 | 6 | 1 | `وَكَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:124 | 6 | 1 | `شَدِيدٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:125 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:126 | 6 | 1 | `صِرَٰطُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:129 | 6 | 2 | `وَكَذَٰلِكَ` `بَعْضًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:130 | 6 | 1 | `ٱلْحَيَوٰةُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:131 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:134 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 6:137 | 6 | 1 | `وَكَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:139 | 6 | 1 | `أَزْوَٰجِنَا ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:140 | 6 | 1 | `سَفَهًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:142 | 6 | 1 | `خُطُوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:143 | 6 | 2 | `أَزْوَٰجٍ ۖ` `نَبِّـُٔونِى` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:144 | 6 | 1 | `وَصَّىٰكُمُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:146 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:147 | 6 | 1 | `وَٰسِعَةٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:148 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:150 | 6 | 1 | `بِـَٔايَـٰتِنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:151 | 6 | 5 | `شَيْـًٔا ۖ` `وَبِٱلْوَٰلِدَيْنِ` `ٱلْفَوَٰحِشَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:152 | 6 | 2 | `ذَٰلِكُمْ` `وَصَّىٰكُم` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:153 | 6 | 3 | `صِرَٰطِى` `ذَٰلِكُمْ` `وَصَّىٰكُم` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:154 | 6 | 1 | `وَتَفْصِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:157 | 6, 7 | 4 | `نَّ` `مِّ` `بِـَٔايَـٰتِ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:160 | 7 | 2 | `جَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 6:161 | 6 | 2 | `صِرَٰطٍ` `إِبْرَٰهِيمَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:163 | 6 | 2 | `وَبِذَٰلِكَ` `وَأَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 6:165 | 6 | 2 | `ءَاتَىٰكُمْ ۗ` `رَّحِيمٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:3 | 6, 7 | 2 | `مِّ` `قَلِيلًا` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:6 | 6 | 2 | `فَلَنَسْـَٔلَنَّ` `وَلَنَسْـَٔلَنَّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:8 | 6 | 1 | `مَوَٰزِينُهُۥ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:9 | 6 | 2 | `مَوَٰزِينُهُۥ` `بِـَٔايَـٰتِنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:10 | 6 | 1 | `قَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:12 | 6, 7 | 2 | `أَنَا۠` `طِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 7:16 | 6 | 1 | `صِرَٰطَكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:17 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 7:19 | 6 | 1 | `وَيَـٰٓـَٔادَمُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:20 | 6 | 2 | `سَوْءَٰتِهِمَا` `نَهَىٰكُمَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:22 | 6 | 2 | `فَدَلَّىٰهُمَا` `سَوْءَٰتُهُمَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:26 | 6 | 4 | `يُوَٰرِى` `سَوْءَٰتِكُمْ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:27 | 6 | 1 | `سَوْءَٰتِهِمَآ ۗ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:32 | 6 | 2 | `ٱلْحَيَوٰةِ` `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:33 | 6 | 1 | `ٱلْفَوَٰحِشَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:36 | 6 | 1 | `بِـَٔايَـٰتِنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:37 | 6 | 1 | `بِـَٔايَـٰتِهِۦٓ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:38 | 6 | 2 | `لِأُولَىٰهُمْ` `فَـَٔاتِهِمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:39 | 6 | 1 | `أُولَىٰهُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:40 | 6 | 3 | `بِـَٔايَـٰتِنَا` `أَبْوَٰبُ` `وَكَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:41 | 6 | 1 | `وَكَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:44 | 6 | 1 | `مُؤَذِّنٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:46 | 6 | 2 | `كُلًّۢا` `بِسِيمَىٰهُمْ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:48 | 6 | 2 | `رِجَالًا` `بِسِيمَىٰهُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:51 | 6 | 3 | `ٱلْحَيَوٰةُ` `نَنسَىٰهُمْ` `بِـَٔايَـٰتِنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:54 | 6 | 2 | `ٱلسَّمَـٰوَٰتِ` `مُسَخَّرَٰتٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:57 | 6 | 4 | `بُشْرًۢا` `ثِقَالًا` `ٱلثَّمَرَٰتِ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:58 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:59 | 7 | 1 | `نِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 7:61 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 7:63 | 7 | 2 | `جَ` `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 7:64 | 6 | 1 | `بِـَٔايَـٰتِنَآ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:67 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 7:68 | 6 | 1 | `وَأَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:69 | 7 | 2 | `جَ` `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 7:71 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 7:72 | 6 | 1 | `بِـَٔايَـٰتِنَا ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:73 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 7:75 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 7:76 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 7:85 | 6, 7 | 3 | `مِّ` `ذَٰلِكُمْ` `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:86 | 6 | 2 | `صِرَٰطٍ` `قَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:89 | 6 | 1 | `نَجَّىٰنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:101 | 6, 7 | 2 | `بَ` `كَذَٰلِكَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:103 | 6 | 1 | `بِـَٔايَـٰتِنَآ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:104 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 7:105 | 6, 7 | 3 | `لَّ` `مِّ` `إِسْرَٰٓءِيلَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:106 | 6 | 1 | `بِـَٔايَةٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:115 | 7 | 2 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 7:116 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 7:123 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 7:125 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 7:126 | 6, 7 | 2 | `نَّ` `بِـَٔايَـٰتِ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:130 | 6 | 1 | `ٱلثَّمَرَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:134 | 6 | 1 | `إِسْرَٰٓءِيلَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:136 | 6 | 1 | `بِـَٔايَـٰتِنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:137 | 6 | 1 | `إِسْرَٰٓءِيلَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:138 | 6 | 1 | `إِسْرَٰٓءِيلَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:141 | 6, 7 | 2 | `ذَٰلِكُم` `مِّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 7:142 | 6 | 1 | `وَوَٰعَدْنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:143 | 6, 7 | 2 | `مَّ` `وَأَنَا۠` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:145 | 6 | 1 | `وَتَفْصِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:146 | 6 | 4 | `سَبِيلًا` `سَبِيلًا ۚ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:147 | 6 | 1 | `بِـَٔايَـٰتِنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:148 | 6 | 2 | `عِجْلًا` `سَبِيلًا ۘ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:151 | 6 | 1 | `ٱلرَّٰحِمِينَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:152 | 6, 7 | 3 | `مِّ` `ٱلْحَيَوٰةِ` `وَكَذَٰلِكَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:153 | 6 | 1 | `ٱلسَّيِّـَٔاتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:155 | 6, 7 | 3 | `رَجُلًا` `مَّ` `نَّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 7:156 | 6 | 2 | `ٱلزَّكَوٰةَ` `بِـَٔايَـٰتِنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:157 | 6 | 1 | `وَيَنْهَىٰهُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:158 | 6 | 2 | `ٱلسَّمَـٰوَٰتِ` `فَـَٔامِنُوا۟` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:160 | 6 | 1 | `ٱسْتَسْقَىٰهُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:162 | 6 | 1 | `قَوْلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:163 | 6 | 2 | `وَسْـَٔلْهُمْ` `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:165 | 6 | 2 | `بِعَذَابٍۭ` `بَـِٔيسٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:166 | 6 | 1 | `خَـٰسِـِٔينَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:168 | 6 | 2 | `ذَٰلِكَ ۖ` `وَٱلسَّيِّـَٔاتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:170 | 6 | 1 | `ٱلصَّلَوٰةَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:171 | 6, 7 | 2 | `نُّ` `وَاقِعٌۢ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:173 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 7:174 | 6 | 1 | `وَكَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:176 | 6 | 2 | `ذَّٰلِكَ` `بِـَٔايَـٰتِنَا ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:177 | 6 | 2 | `مَثَلًا` `بِـَٔايَـٰتِنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:182 | 6 | 1 | `بِـَٔايَـٰتِنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:185 | 6, 7 | 3 | `ٱلسَّمَـٰوَٰتِ` `شَ` `حَدِيثٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 7:187 | 6 | 4 | `يَسْـَٔلُونَكَ` `مُرْسَىٰهَا ۖ` `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:188 | 6 | 1 | `أَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:189 | 6, 7 | 5 | `مِّ` `وَٰحِدَةٍ` `تَغَشَّىٰهَا` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:190 | 6, 7 | 3 | `مَّ` `ءَاتَىٰهُمَا` `ءَاتَىٰهُمَا ۚ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:191 | 6 | 1 | `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:196 | 6 | 1 | `وَلِـِّۧىَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:202 | 6 | 1 | `وَإِخْوَٰنُهُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 7:203 | 6 | 1 | `بِـَٔايَةٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 8:1 | 6, 7 | 2 | `يَسْـَٔلُونَكَ` `تُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 8:3 | 6 | 1 | `ٱلصَّلَوٰةَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 8:13 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 8:14 | 6, 7 | 2 | `ذَٰلِكُمْ` `نَّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 8:18 | 6 | 1 | `ذَٰلِكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 8:19 | 6 | 1 | `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 8:26 | 6 | 1 | `فَـَٔاوَىٰكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 8:28 | 6 | 1 | `أَمْوَٰلُكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 8:29 | 6 | 1 | `سَيِّـَٔاتِكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 8:36 | 6 | 1 | `أَمْوَٰلَهُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 8:40 | 6 | 1 | `مَوْلَىٰكُمْ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 8:41 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 8:42 | 6, 7 | 2 | `تُ` `مَفْعُولًا` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 8:43 | 6 | 2 | `قَلِيلًا ۖ` `عَلِيمٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 8:44 | 6 | 2 | `قَلِيلًا` `مَفْعُولًا ۗ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 8:48 | 7 | 2 | `نِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 8:51 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 8:52 | 6 | 1 | `بِـَٔايَـٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 8:53 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 8:54 | 6 | 1 | `بِـَٔايَـٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 8:63 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 8:65 | 7 | 1 | `كُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 8:66 | 7 | 1 | `كُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 8:69 | 6 | 1 | `حَلَـٰلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 8:70 | 7 | 2 | `فِ` `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 8:72 | 6, 7 | 3 | `بِأَمْوَٰلِهِمْ` `مِّ` `قَوْمٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 8:75 | 6 | 1 | `عَلِيمٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:3 | 6 | 1 | `وَأَذَٰنٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:4 | 6, 7 | 2 | `شَيْـًٔا` `مُّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 9:5 | 6 | 2 | `ٱلصَّلَوٰةَ` `ٱلزَّكَوٰةَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:6 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:8 | 6 | 2 | `إِلًّا` `بِأَفْوَٰهِهِمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:9 | 6 | 2 | `بِـَٔايَـٰتِ` `قَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:10 | 6 | 1 | `إِلًّا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:11 | 6 | 3 | `ٱلصَّلَوٰةَ` `ٱلزَّكَوٰةَ` `فَإِخْوَٰنُكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:12 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 9:13 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 9:16 | 6 | 1 | `خَبِيرٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:18 | 6 | 2 | `ٱلصَّلَوٰةَ` `ٱلزَّكَوٰةَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:20 | 6 | 1 | `بِأَمْوَٰلِهِمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:21 | 6 | 1 | `وَرِضْوَٰنٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:23 | 6 | 1 | `وَإِخْوَٰنَكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:24 | 6 | 3 | `وَإِخْوَٰنُكُمْ` `وَأَزْوَٰجُكُمْ` `وَأَمْوَٰلٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:25 | 6 | 1 | `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:26 | 6 | 1 | `وَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:27 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:28 | 7 | 1 | `شَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 9:30 | 6 | 3 | `ذَٰلِكَ` `بِأَفْوَٰهِهِمْ ۖ` `يُضَـٰهِـُٔونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:31 | 6, 7 | 2 | `وَٰحِدًا ۖ` `لَّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 9:32 | 6 | 2 | `يُطْفِـُٔوا۟` `بِأَفْوَٰهِهِمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:34 | 6 | 1 | `أَمْوَٰلَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:36 | 6 | 2 | `ٱلسَّمَـٰوَٰتِ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:37 | 6 | 1 | `لِّيُوَاطِـُٔوا۟` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:38 | 6 | 2 | `بِٱلْحَيَوٰةِ` `ٱلْحَيَوٰةِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:39 | 6 | 1 | `شَيْـًٔا ۗ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:41 | 6 | 3 | `وَثِقَالًا` `بِأَمْوَٰلِكُمْ` `ذَٰلِكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:44 | 6 | 3 | `يَسْتَـْٔذِنُكَ` `بِأَمْوَٰلِهِمْ` `عَلِيمٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:45 | 6 | 1 | `يَسْتَـْٔذِنُكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:47 | 6 | 2 | `خَبَالًا` `عَلِيمٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:49 | 6, 7 | 3 | `مَّ` `نِّ` `لَمُحِيطَةٌۢ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:51 | 6 | 1 | `مَوْلَىٰنَا ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:53 | 7 | 1 | `لَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 9:54 | 6 | 1 | `ٱلصَّلَوٰةَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:55 | 6 | 2 | `أَمْوَٰلُهُمْ` `ٱلْحَيَوٰةِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:57 | 6 | 3 | `مَلْجَـًٔا` `مَغَـٰرَٰتٍ` `مُدَّخَلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:58 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 9:59 | 6, 7 | 3 | `ءَاتَىٰهُمُ` `نَّ` `رَٰغِبُونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 9:63 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:66 | 6, 7 | 2 | `طَ` `طَآئِفَةًۢ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:67 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 9:69 | 6 | 1 | `أَمْوَٰلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:70 | 6 | 1 | `إِبْرَٰهِيمَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:71 | 6 | 2 | `ٱلصَّلَوٰةَ` `ٱلزَّكَوٰةَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:72 | 6 | 2 | `وَرِضْوَٰنٌ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:74 | 6 | 1 | `أَغْنَىٰهُمُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:75 | 6 | 1 | `ءَاتَىٰنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:76 | 6, 7 | 2 | `مَّ` `ءَاتَىٰهُم` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:80 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:81 | 6 | 1 | `بِأَمْوَٰلِهِمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:82 | 6 | 2 | `قَلِيلًا` `جَزَآءًۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:83 | 6 | 1 | `فَٱسْتَـْٔذَنُوكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:85 | 6 | 1 | `أَمْوَٰلُهُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:86 | 6 | 1 | `ٱسْتَـْٔذَنَكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:88 | 6 | 2 | `بِأَمْوَٰلِهِمْ` `ٱلْخَيْرَٰتُ ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:89 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:93 | 6 | 1 | `يَسْتَـْٔذِنُونَكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:95 | 6 | 1 | `جَزَآءًۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:99 | 6 | 1 | `وَصَلَوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:100 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:102 | 6 | 1 | `عَمَلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:103 | 6 | 2 | `أَمْوَٰلِهِمْ` `صَلَوٰتَكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:107 | 6 | 1 | `وَتَفْرِيقًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:109 | 6 | 1 | `وَرِضْوَٰنٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:111 | 6 | 2 | `وَأَمْوَٰلَهُم` `وَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:112 | 6 | 1 | `ٱلرَّٰكِعُونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:114 | 6 | 4 | `إِبْرَٰهِيمَ` `لِّلَّهِ` `لَأَوَّٰهٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:115 | 6 | 1 | `قَوْمًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:116 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:118 | 7 | 1 | `نُّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 9:120 | 6 | 3 | `ذَٰلِكَ` `يَطَـُٔونَ` `نَّيْلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 9:124 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 10:3 | 6 | 2 | `ٱلسَّمَـٰوَٰتِ` `ذَٰلِكُمُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:4 | 6 | 1 | `أَلِيمٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:5 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:6 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:7 | 6 | 1 | `بِٱلْحَيَوٰةِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:12 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:13 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:15 | 6, 7 | 2 | `تِلْقَآئِ` `نِّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 10:17 | 6 | 1 | `بِـَٔايَـٰتِهِۦٓ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:18 | 6 | 2 | `أَتُنَبِّـُٔونَ` `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:19 | 6 | 1 | `وَٰحِدَةً` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:20 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 10:21 | 7 | 2 | `مِّ` `فِ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 10:22 | 7 | 1 | `نُّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 10:23 | 6, 7 | 3 | `مَّ` `أَنجَىٰهُمْ` `ٱلْحَيَوٰةِ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:24 | 6 | 4 | `ٱلْحَيَوٰةِ` `أَتَىٰهَآ` `لَيْلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:25 | 6 | 1 | `صِرَٰطٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:27 | 6 | 2 | `ٱلسَّيِّـَٔاتِ` `سَيِّئَةٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:29 | 6 | 1 | `شَهِيدًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:30 | 6, 7 | 2 | `مَّ` `مَوْلَىٰهُمُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:31 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 10:32 | 6 | 1 | `فَذَٰلِكُمُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:33 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:34 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 10:35 | 7 | 2 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 10:36 | 6 | 2 | `شَيْـًٔا ۚ` `عَلِيمٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:39 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:40 | 7 | 2 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 10:41 | 6, 7 | 4 | `تُ` `بَرِيٓـُٔونَ` `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:42 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 10:43 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 10:44 | 6 | 1 | `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:49 | 6 | 1 | `يَسْتَـْٔخِرُونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:50 | 6 | 1 | `أَتَىٰكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:51 | 7 | 2 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 10:53 | 6, 7 | 2 | `وَيَسْتَنۢبِـُٔونَكَ` `تُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 10:55 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:57 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 10:58 | 6 | 1 | `فَبِذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:59 | 6, 7 | 3 | `مَّ` `مِّ` `وَحَلَـٰلًا` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:61 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:64 | 6 | 2 | `ٱلْحَيَوٰةِ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:66 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:67 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:68 | 6 | 2 | `ٱلسَّمَـٰوَٰتِ` `سُلْطَـٰنٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:71 | 6 | 1 | `بِـَٔايَـٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:73 | 6 | 1 | `بِـَٔايَـٰتِنَا ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:74 | 6 | 2 | `رُسُلًا` `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:75 | 6 | 1 | `بِـَٔايَـٰتِنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:80 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 10:81 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 10:84 | 7 | 2 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 10:87 | 6 | 1 | `ٱلصَّلَوٰةَ ۗ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:88 | 6 | 3 | `وَأَمْوَٰلًا` `ٱلْحَيَوٰةِ` `أَمْوَٰلِهِمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:90 | 6 | 3 | `إِسْرَٰٓءِيلَ` `وَأَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:93 | 6 | 1 | `إِسْرَٰٓءِيلَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:94 | 6, 7 | 2 | `مَّ` `فَسْـَٔلِ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:95 | 6 | 1 | `بِـَٔايَـٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:98 | 6, 7 | 2 | `مَّ` `ٱلْحَيَوٰةِ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:101 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:103 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:104 | 6 | 1 | `يَتَوَفَّىٰكُمْ ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 10:108 | 6 | 1 | `أَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:3 | 7 | 1 | `نِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 11:5 | 6 | 1 | `عَلِيمٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:6 | 7 | 1 | `دَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 11:7 | 6 | 2 | `ٱلسَّمَـٰوَٰتِ` `عَمَلًا ۗ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:9 | 6 | 1 | `لَيَـُٔوسٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:10 | 6, 7 | 2 | `ٱلسَّيِّـَٔاتُ` `نِّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 11:12 | 6 | 2 | `تَارِكٌۢ` `وَضَآئِقٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:14 | 7 | 2 | `لَّ` `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 11:15 | 6 | 1 | `ٱلْحَيَوٰةَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:17 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 11:24 | 6 | 1 | `مَثَلًا ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:26 | 7 | 1 | `نِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 11:27 | 6 | 1 | `فَضْلٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:28 | 6, 7 | 2 | `مِّ` `وَءَاتَىٰنِى` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:29 | 6, 7 | 4 | `أَسْـَٔلُكُمْ` `مَالًا ۖ` `أَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 11:31 | 7 | 1 | `نِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 11:32 | 6 | 1 | `جِدَٰلَنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:33 | 7 | 2 | `شَ` `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 11:35 | 6 | 1 | `وَأَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:41 | 6 | 1 | `وَمُرْسَىٰهَآ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:43 | 6 | 1 | `سَـَٔاوِىٓ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:46 | 6, 7 | 2 | `تَسْـَٔلْنِ` `نِّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 11:47 | 6, 7 | 2 | `نِّ` `أَسْـَٔلَكَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:48 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 11:49 | 7 | 1 | `بَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 11:51 | 6 | 1 | `أَسْـَٔلُكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:54 | 7 | 1 | `نِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 11:56 | 6, 7 | 3 | `دَ` `ءَاخِذٌۢ` `صِرَٰطٍ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:57 | 6, 7 | 2 | `مَّ` `شَيْـًٔا ۚ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:59 | 6 | 1 | `بِـَٔايَـٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:62 | 6 | 1 | `أَتَنْهَىٰنَآ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:63 | 6, 7 | 2 | `مِّ` `وَءَاتَىٰنِى` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:65 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:69 | 6, 7 | 2 | `إِبْرَٰهِيمَ` `جَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 11:70 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 11:72 | 6 | 1 | `وَأَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:74 | 6 | 1 | `إِبْرَٰهِيمَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:75 | 6 | 2 | `إِبْرَٰهِيمَ` `أَوَّٰهٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:76 | 6 | 1 | `يَـٰٓإِبْرَٰهِيمُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:77 | 7 | 1 | `سِ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 11:78 | 6 | 1 | `ٱلسَّيِّـَٔاتِ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:82 | 7 | 1 | `ضُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 11:84 | 7 | 2 | `نِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 11:86 | 6, 7 | 2 | `تُ` `أَنَا۠` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:87 | 6 | 2 | `أَصَلَوٰتُكَ` `أَمْوَٰلِنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:88 | 6, 7 | 2 | `مِّ` `أَنْهَىٰكُمْ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:89 | 7 | 1 | `كُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 11:96 | 6 | 1 | `بِـَٔايَـٰتِنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:100 | 6, 7 | 2 | `ذَٰلِكَ` `بَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 11:101 | 7 | 1 | `شَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 11:102 | 6 | 1 | `وَكَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:103 | 6 | 3 | `ذَٰلِكَ` `وَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:107 | 6 | 1 | `ٱلسَّمَـٰوَٰتُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:108 | 6 | 1 | `ٱلسَّمَـٰوَٰتُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:109 | 7 | 1 | `قُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 11:111 | 6 | 1 | `كُلًّا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:114 | 6 | 4 | `ٱلصَّلَوٰةَ` `ٱلسَّيِّـَٔاتِ ۚ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:116 | 6 | 1 | `قَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:118 | 6 | 1 | `وَٰحِدَةً ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:119 | 6 | 1 | `وَلِذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 11:120 | 6, 7 | 2 | `وَكُلًّا` `بَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 11:123 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:2 | 6, 7 | 2 | `نَّ` `قُرْءَٰنًا` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:6 | 6 | 2 | `وَكَذَٰلِكَ` `إِبْرَٰهِيمَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:11 | 6 | 1 | `تَأْمَ۫نَّا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:14 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 12:19 | 6 | 1 | `عَلِيمٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:20 | 6 | 3 | `بِثَمَنٍۭ` `دَرَٰهِمَ` `ٱلزَّٰهِدِينَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:21 | 6 | 1 | `وَكَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:22 | 6 | 1 | `وَكَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:23 | 6 | 2 | `وَرَٰوَدَتْهُ` `ٱلْأَبْوَٰبَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:24 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:26 | 6 | 1 | `رَٰوَدَتْنِى` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:29 | 6 | 1 | `ٱلْخَاطِـِٔينَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:30 | 6 | 2 | `تُرَٰوِدُ` `فَتَىٰهَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:31 | 6 | 2 | `مُتَّكَـًٔا` `وَٰحِدَةٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:32 | 6 | 2 | `فَذَٰلِكُنَّ` `رَٰوَدتُّهُۥ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:35 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 12:36 | 7 | 2 | `نِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 12:37 | 6 | 1 | `ذَٰلِكُمَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:38 | 6 | 2 | `إِبْرَٰهِيمَ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:39 | 6 | 1 | `ٱلْوَٰحِدُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:40 | 6, 7 | 2 | `مَّ` `ذَٰلِكَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:41 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 12:42 | 6 | 1 | `فَأَنسَىٰهُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:43 | 6, 7 | 2 | `نِّ` `بَقَرَٰتٍ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:45 | 6 | 1 | `أَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:46 | 6 | 1 | `بَقَرَٰتٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:47 | 6 | 1 | `قَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:48 | 6 | 2 | `ذَٰلِكَ` `قَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:49 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:50 | 6 | 1 | `فَسْـَٔلْهُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:51 | 6, 7 | 4 | `رَٰوَدتُّنَّ` `سُ` `أَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 12:52 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:53 | 6 | 1 | `لَأَمَّارَةٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:56 | 6 | 1 | `وَكَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:59 | 6, 7 | 2 | `نِّ` `وَأَنَا۠` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:61 | 6 | 1 | `سَنُرَٰوِدُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:64 | 6 | 1 | `ٱلرَّٰحِمِينَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:65 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:66 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 12:67 | 6, 7 | 3 | `وَٰحِدٍ` `أَبْوَٰبٍ` `كُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 12:68 | 6 | 1 | `قَضَىٰهَا ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:69 | 6, 7 | 2 | `نِّ` `أَنَا۠` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:72 | 6, 7 | 2 | `جَ` `وَأَنَا۠` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:74 | 6 | 1 | `جَزَٰٓؤُهُۥٓ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:75 | 6 | 3 | `جَزَٰٓؤُهُۥ` `جَزَٰٓؤُهُۥ ۚ` `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:76 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:79 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 12:80 | 6 | 1 | `ٱسْتَيْـَٔسُوا۟` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:82 | 6 | 1 | `وَسْـَٔلِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:87 | 6 | 2 | `تَا۟يْـَٔسُوا۟` `يَا۟يْـَٔسُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:88 | 6 | 1 | `مُّزْجَىٰةٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:90 | 6 | 1 | `أَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:91 | 6 | 1 | `لَخَـٰطِـِٔينَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:92 | 6 | 1 | `ٱلرَّٰحِمِينَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:96 | 6, 7 | 4 | `مَّ` `جَ` `أَلْقَىٰهُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:97 | 6 | 1 | `خَـٰطِـِٔينَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:99 | 7 | 1 | `شَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 12:101 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:102 | 6, 7 | 2 | `ذَٰلِكَ` `بَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 12:104 | 6 | 1 | `تَسْـَٔلُهُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:105 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:108 | 6 | 2 | `أَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:109 | 6 | 1 | `رِجَالًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 12:110 | 6, 7 | 2 | `ٱسْتَيْـَٔسَ` `نُّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 12:111 | 6 | 1 | `لِّأُو۟لِى` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 13:2 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 13:3 | 6 | 3 | `رَوَٰسِىَ` `ٱلثَّمَرَٰتِ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 13:4 | 6 | 3 | `مُّتَجَـٰوِرَٰتٌ` `وَٰحِدٍ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 13:5 | 6 | 1 | `تُرَٰبًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 13:7 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 13:10 | 6, 7 | 3 | `كُ` `مُسْتَخْفٍۭ` `وَسَارِبٌۢ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 13:11 | 7 | 3 | `مِّ` `سُ` `وَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 13:13 | 6 | 1 | `ٱلصَّوَٰعِقَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 13:15 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 13:16 | 6 | 2 | `ٱلسَّمَـٰوَٰتِ` `ٱلْوَٰحِدُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 13:17 | 6 | 3 | `أَوْدِيَةٌۢ` `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 13:22 | 6 | 1 | `ٱلصَّلَوٰةَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 13:23 | 6 | 1 | `وَأَزْوَٰجِهِمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 13:26 | 6 | 2 | `بِٱلْحَيَوٰةِ` `ٱلْحَيَوٰةُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 13:27 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 13:29 | 6 | 1 | `مَـَٔابٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 13:30 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 13:31 | 6 | 2 | `لِّلَّهِ` `يَا۟يْـَٔسِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 13:33 | 6 | 2 | `نَفْسٍۭ` `تُنَبِّـُٔونَهُۥ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 13:34 | 6, 7 | 2 | `ٱلْحَيَوٰةِ` `وَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 13:35 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 13:36 | 6 | 1 | `مَـَٔابِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 13:37 | 6 | 1 | `وَكَذَٰلِكَ أَنزَلْنَـٰهُ حُكْمًا عَرَبِيًّا ۚ وَلَئِنِ ٱتَّبَعْتَ أَهْوَآءَهُم بَعْدَ مَا جَآءَكَ مِنَ ٱلْعِلْمِ مَا لَكَ مِنَ ٱللَّهِ مِن وَلِىٍّ وَلَا وَاقٍ` | Canonical metin ile eski kaynağın token sayıları farklıdır; güvenli karakter-aralığı kararı otomatik verilemez. |
| 13:38 | 6 | 3 | `رُسُلًا` `أَزْوَٰجًا` `بِـَٔايَةٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 13:43 | 6 | 2 | `مُرْسَلًا ۚ` `شَهِيدًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 14:1 | 6 | 1 | `صِرَٰطِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 14:2 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 14:3 | 6 | 2 | `ٱلْحَيَوٰةَ` `ضَلَـٰلٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 14:5 | 6 | 3 | `بِـَٔايَـٰتِنَآ` `بِأَيَّىٰمِ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 14:6 | 6, 7 | 3 | `أَنجَىٰكُم` `ذَٰلِكُم` `مِّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 14:9 | 6 | 1 | `أَفْوَٰهِهِمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 14:10 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 14:14 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 14:16 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 14:18 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 14:19 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 14:20 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 14:21 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 14:22 | 6, 7 | 3 | `مَّ` `أَنَا۠` `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 14:24 | 6 | 1 | `مَثَلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 14:25 | 6 | 1 | `حِينٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 14:27 | 6 | 1 | `ٱلْحَيَوٰةِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 14:30 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 14:31 | 6 | 1 | `ٱلصَّلَوٰةَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 14:32 | 6 | 2 | `ٱلسَّمَـٰوَٰتِ` `ٱلثَّمَرَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 14:34 | 6 | 1 | `وَءَاتَىٰكُم` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 14:35 | 6 | 1 | `إِبْرَٰهِيمُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 14:37 | 6, 7 | 4 | `نِّ` `ٱلصَّلَوٰةَ` `أَفْـِٔدَةً` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 14:40 | 6 | 1 | `ٱلصَّلَوٰةِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 14:41 | 6 | 1 | `وَلِوَٰلِدَىَّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 14:42 | 6 | 1 | `غَـٰفِلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 14:43 | 6 | 1 | `وَأَفْـِٔدَتُهُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 14:48 | 6 | 2 | `وَٱلسَّمَـٰوَٰتُ ۖ` `ٱلْوَٰحِدِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 14:50 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 14:52 | 6 | 1 | `وَٰحِدٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 15:5 | 6 | 1 | `يَسْتَـْٔخِرُونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 15:11 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 15:12 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 15:19 | 6 | 1 | `رَوَٰسِىَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 15:20 | 6 | 1 | `بِرَٰزِقِينَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 15:22 | 6 | 1 | `لَوَٰقِحَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 15:23 | 6 | 1 | `ٱلْوَٰرِثُونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 15:24 | 6 | 1 | `ٱلْمُسْتَـْٔخِرِينَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 15:28 | 6 | 1 | `خَـٰلِقٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 15:33 | 6 | 1 | `لِّأَسْجُدَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 15:41 | 6 | 1 | `صِرَٰطٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 15:44 | 6 | 1 | `أَبْوَٰبٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 15:47 | 6 | 1 | `إِخْوَٰنًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 15:49 | 7 | 1 | `نِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 15:51 | 6 | 1 | `إِبْرَٰهِيمَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 15:58 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 15:66 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 15:75 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 15:77 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 15:85 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 15:88 | 6 | 1 | `أَزْوَٰجًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 15:89 | 7 | 1 | `نِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 15:92 | 6 | 1 | `لَنَسْـَٔلَنَّهُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:2 | 6 | 1 | `أَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:3 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:11 | 6 | 2 | `ٱلثَّمَرَٰتِ ۗ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:12 | 6 | 2 | `مُسَخَّرَٰتٌۢ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:13 | 6 | 2 | `أَلْوَٰنُهُۥٓ ۗ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:15 | 6 | 2 | `رَوَٰسِىَ` `وَسُبُلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:20 | 6 | 1 | `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:21 | 6 | 1 | `أَمْوَٰتٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:22 | 6 | 1 | `وَٰحِدٌ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:26 | 6 | 1 | `وَأَتَىٰهُمُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:28 | 6 | 3 | `تَتَوَفَّىٰهُمُ` `سُوٓءٍۭ ۚ` `عَلِيمٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:29 | 6 | 1 | `أَبْوَٰبَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:31 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:32 | 6 | 1 | `تَتَوَفَّىٰهُمُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:33 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:34 | 6 | 1 | `سَيِّـَٔاتُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:35 | 6, 7 | 2 | `شَ` `كَذَٰلِكَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:36 | 6 | 1 | `رَّسُولًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:37 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 16:43 | 6 | 2 | `رِجَالًا` `فَسْـَٔلُوٓا۟` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:45 | 6 | 1 | `ٱلسَّيِّـَٔاتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:48 | 6, 7 | 3 | `شَ` `لِّلَّهِ` `دَٰخِرُونَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:49 | 6, 7 | 2 | `ٱلسَّمَـٰوَٰتِ` `دَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 16:51 | 6 | 1 | `وَٰحِدٌ ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:52 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:53 | 6, 7 | 2 | `مِّ` `تَجْـَٔرُونَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:54 | 7 | 1 | `كُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 16:56 | 6 | 1 | `لَتُسْـَٔلُنَّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:59 | 6, 7 | 2 | `يَتَوَٰرَىٰ` `سُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 16:61 | 6, 7 | 2 | `دَ` `يَسْتَـْٔخِرُونَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:65 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:66 | 7 | 1 | `سَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 16:67 | 6 | 2 | `ثَمَرَٰتِ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:69 | 6 | 4 | `ٱلثَّمَرَٰتِ` `ذُلُلًا ۚ` `أَلْوَٰنُهُۥ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:70 | 6, 7 | 4 | `يَتَوَفَّىٰكُمْ ۚ` `كُ` `مَّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 16:72 | 6 | 2 | `أَزْوَٰجًا` `أَزْوَٰجِكُم` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:73 | 6 | 2 | `ٱلسَّمَـٰوَٰتِ` `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:75 | 6 | 1 | `مَثَلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:76 | 6 | 3 | `مَثَلًا` `مَوْلَىٰهُ` `صِرَٰطٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:77 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:78 | 6, 7 | 3 | `مِّ` `شَيْـًٔا` `وَٱلْأَفْـِٔدَةَ ۙ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:79 | 6 | 2 | `مُسَخَّرَٰتٍ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:80 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 16:81 | 6 | 4 | `ظِلَـٰلًا` `سَرَٰبِيلَ` `وَسَرَٰبِيلَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:90 | 6 | 1 | `وَإِيتَآئِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:91 | 6 | 1 | `كَفِيلًا ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:92 | 6 | 1 | `دَخَلًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:93 | 6 | 2 | `وَٰحِدَةً` `وَلَتُسْـَٔلُنَّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:94 | 6 | 2 | `دَخَلًۢا` `قَدَمٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:95 | 6 | 1 | `قَلِيلًا ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:97 | 6 | 1 | `حَيَوٰةً` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:101 | 6 | 1 | `مُفْتَرٍۭ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:104 | 6 | 1 | `بِـَٔايَـٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:105 | 6 | 1 | `بِـَٔايَـٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:106 | 6 | 1 | `مُطْمَئِنٌّۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:107 | 6 | 2 | `ذَٰلِكَ` `ٱلْحَيَوٰةَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:112 | 6 | 2 | `مَثَلًا` `فَأَذَٰقَهَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:114 | 6 | 1 | `حَلَـٰلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:119 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:120 | 6 | 2 | `إِبْرَٰهِيمَ` `لِّلَّهِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:121 | 6 | 3 | `لِّأَنْعُمِهِ ۚ` `ٱجْتَبَىٰهُ` `صِرَٰطٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 16:123 | 6 | 1 | `إِبْرَٰهِيمَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:1 | 6 | 1 | `لَيْلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:2 | 6 | 2 | `إِسْرَٰٓءِيلَ` `وَكِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:4 | 6 | 1 | `إِسْرَٰٓءِيلَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:5 | 6 | 2 | `أُولَىٰهُمَا` `مَّفْعُولًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:6 | 6 | 1 | `بِأَمْوَٰلٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:7 | 6 | 1 | `لِيَسُـۥٓـُٔوا۟` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:11 | 6 | 1 | `عَجُولًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:12 | 6, 7 | 3 | `فَضْلًا` `مِّ` `تَفْصِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 17:13 | 6 | 1 | `يَلْقَىٰهُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:15 | 6 | 1 | `رَسُولًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:17 | 6 | 1 | `خَبِيرًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:18 | 6 | 1 | `يَصْلَىٰهَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:20 | 6 | 1 | `كُلًّا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:21 | 6 | 1 | `تَفْضِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:22 | 6 | 1 | `مَّخْذُولًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:23 | 6 | 2 | `وَبِٱلْوَٰلِدَيْنِ` `قَوْلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:25 | 6 | 1 | `لِلْأَوَّٰبِينَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:27 | 6 | 1 | `إِخْوَٰنَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:28 | 6, 7 | 2 | `مِّ` `قَوْلًا` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:30 | 6 | 1 | `خَبِيرًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:31 | 6 | 1 | `خِطْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:32 | 6 | 1 | `سَبِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:34 | 6 | 1 | `مَسْـُٔولًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:35 | 6 | 2 | `ذَٰلِكَ` `تَأْوِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:36 | 6 | 1 | `مَسْـُٔولًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:37 | 6 | 1 | `طُولًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:38 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:39 | 6, 7 | 2 | `ذَٰلِكَ` `مَّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 17:40 | 6 | 2 | `أَفَأَصْفَىٰكُمْ` `قَوْلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:42 | 6 | 1 | `سَبِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:44 | 6 | 1 | `ٱلسَّمَـٰوَٰتُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:47 | 6 | 1 | `رَجُلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:48 | 6 | 1 | `سَبِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:52 | 6 | 1 | `قَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:54 | 6 | 1 | `وَكِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:55 | 6 | 2 | `ٱلسَّمَـٰوَٰتِ` `ٱلنَّبِيِّـۧنَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:56 | 6 | 1 | `تَحْوِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:58 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:62 | 6 | 1 | `قَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:64 | 6 | 1 | `ٱلْأَمْوَٰلِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:65 | 6 | 1 | `وَكِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:67 | 6 | 1 | `نَجَّىٰكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:68 | 6 | 1 | `وَكِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:70 | 6 | 1 | `تَفْضِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:71 | 6 | 2 | `أُنَاسٍۭ` `فَتِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:72 | 6 | 1 | `سَبِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:73 | 6 | 1 | `خَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:74 | 6 | 2 | `شَيْـًٔا` `قَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:75 | 6 | 1 | `ٱلْحَيَوٰةِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:76 | 6 | 1 | `قَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:77 | 6 | 1 | `تَحْوِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:78 | 6 | 1 | `ٱلصَّلَوٰةَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:83 | 6 | 2 | `وَنَـَٔا` `يَـُٔوسًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:84 | 6 | 1 | `سَبِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:85 | 6 | 2 | `وَيَسْـَٔلُونَكَ` `قَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:86 | 6 | 1 | `وَكِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:87 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 17:92 | 6 | 1 | `قَبِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:93 | 6 | 1 | `رَّسُولًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:94 | 6 | 1 | `رَّسُولًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:95 | 6 | 1 | `رَّسُولًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:96 | 6 | 2 | `شَهِيدًۢا` `خَبِيرًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:98 | 6 | 2 | `ذَٰلِكَ` `بِـَٔايَـٰتِنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:99 | 6 | 2 | `ٱلسَّمَـٰوَٰتِ` `أَجَلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:101 | 6 | 3 | `ءَايَـٰتٍۭ` `فَسْـَٔلْ` `إِسْرَٰٓءِيلَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:102 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:104 | 6 | 1 | `إِسْرَٰٓءِيلَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:106 | 6 | 1 | `تَنزِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:108 | 6 | 1 | `لَمَفْعُولًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:110 | 6 | 2 | `ذَٰلِكَ` `سَبِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 17:111 | 6 | 1 | `تَكْبِيرًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:2 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 18:5 | 6 | 1 | `أَفْوَٰهِهِمْ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:7 | 6 | 1 | `عَمَلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:14 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:15 | 6 | 1 | `بِسُلْطَـٰنٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:16 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 18:17 | 6 | 2 | `تَّزَٰوَرُ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:19 | 6 | 1 | `وَكَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:21 | 6 | 1 | `وَكَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:22 | 6 | 1 | `رَجْمًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:23 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:26 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:28 | 6 | 2 | `بِٱلْغَدَوٰةِ` `ٱلْحَيَوٰةِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:29 | 7 | 3 | `شَ` `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 18:30 | 6 | 1 | `عَمَلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:31 | 6 | 1 | `مُّتَّكِـِٔينَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:32 | 6 | 1 | `مَّثَلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:33 | 6 | 1 | `شَيْـًٔا ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:34 | 6 | 2 | `أَنَا۠` `مَالًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:37 | 6 | 1 | `رَجُلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:38 | 6 | 1 | `لَّـٰكِنَّا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:39 | 6 | 2 | `أَنَا۠` `مَالًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:45 | 6 | 1 | `ٱلْحَيَوٰةِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:46 | 6 | 2 | `ٱلْحَيَوٰةِ` `أَمَلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:48 | 6 | 1 | `مَرَّةٍۭ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:49 | 6 | 1 | `أَحْصَىٰهَا ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:50 | 6 | 2 | `عَدُوٌّۢ ۚ` `بَدَلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:51 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:53 | 7 | 1 | `نُّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 18:54 | 6 | 1 | `جَدَلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:55 | 6 | 1 | `قُبُلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:57 | 6 | 1 | `بِـَٔايَـٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:58 | 6, 7 | 2 | `لَّ` `مَوْئِلًا` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:60 | 6 | 1 | `لِفَتَىٰهُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:62 | 6 | 1 | `لِفَتَىٰهُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:63 | 6 | 1 | `أَنسَىٰنِيهُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:64 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:69 | 7 | 1 | `شَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 18:70 | 6 | 1 | `تَسْـَٔلْنِى` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:71 | 6 | 1 | `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:74 | 6 | 2 | `زَكِيَّةًۢ` `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:76 | 6 | 1 | `شَىْءٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:81 | 6 | 1 | `زَكَوٰةً` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:82 | 6, 7 | 2 | `مِّ` `ذَٰلِكَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:83 | 6 | 1 | `وَيَسْـَٔلُونَكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:86 | 7 | 2 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 18:91 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:93 | 6 | 1 | `قَوْلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:98 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 18:102 | 6, 7 | 2 | `نَّ` `نُزُلًا` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:103 | 6 | 1 | `أَعْمَـٰلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:104 | 6 | 1 | `ٱلْحَيَوٰةِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:105 | 6 | 1 | `بِـَٔايَـٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:106 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:107 | 6 | 1 | `نُزُلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:108 | 6 | 1 | `حِوَلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 18:110 | 6 | 4 | `أَنَا۠` `وَٰحِدٌ ۖ` `عَمَلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 19:5 | 6 | 1 | `ٱلْمَوَٰلِىَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 19:9 | 6 | 2 | `كَذَٰلِكَ` `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 19:13 | 6, 7 | 2 | `مِّ` `وَزَكَوٰةً ۖ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 19:14 | 6 | 2 | `وَبَرًّۢا` `بِوَٰلِدَيْهِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 19:18 | 7 | 1 | `نِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 19:19 | 6 | 1 | `أَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 19:21 | 6 | 1 | `كَذَٰلِكِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 19:27 | 6 | 1 | `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 19:30 | 6 | 1 | `ءَاتَىٰنِىَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 19:31 | 6 | 2 | `بِٱلصَّلَوٰةِ` `وَٱلزَّكَوٰةِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 19:32 | 6 | 2 | `وَبَرًّۢا` `بِوَٰلِدَتِى` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 19:34 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 19:36 | 6 | 1 | `صِرَٰطٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 19:41 | 6 | 1 | `إِبْرَٰهِيمَ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 19:42 | 6 | 1 | `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 19:43 | 6 | 1 | `صِرَٰطًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 19:45 | 7 | 1 | `نِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 19:46 | 6 | 1 | `يَـٰٓإِبْرَٰهِيمُ ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 19:49 | 6 | 1 | `وَكُلًّا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 19:50 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 19:51 | 6 | 1 | `رَسُولًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 19:54 | 6 | 1 | `رَسُولًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 19:55 | 6 | 2 | `بِٱلصَّلَوٰةِ` `وَٱلزَّكَوٰةِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 19:58 | 6 | 3 | `ٱلنَّبِيِّـۧنَ` `إِبْرَٰهِيمَ` `وَإِسْرَٰٓءِيلَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 19:59 | 6 | 2 | `ٱلصَّلَوٰةَ` `ٱلشَّهَوَٰتِ ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 19:60 | 6 | 1 | `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 19:64 | 6 | 1 | `ذَٰلِكَ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 19:65 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 19:67 | 6 | 1 | `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 19:77 | 6 | 2 | `بِـَٔايَـٰتِنَا` `مَالًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 19:83 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 19:89 | 6 | 1 | `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 19:90 | 6 | 1 | `ٱلسَّمَـٰوَٰتُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 19:93 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 19:94 | 6 | 1 | `أَحْصَىٰهُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 19:98 | 6 | 1 | `رِكْزًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:4 | 6 | 2 | `تَنزِيلًا` `وَٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:6 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:9 | 6 | 1 | `أَتَىٰكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:10 | 7 | 1 | `نِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 20:11 | 6, 7 | 2 | `مَّ` `أَتَىٰهَا` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:12 | 6, 7 | 2 | `نِّ` `أَنَا۠` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:14 | 6 | 2 | `أَنَا۠` `ٱلصَّلَوٰةَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:15 | 6 | 1 | `نَفْسٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:18 | 6 | 1 | `مَـَٔارِبُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:20 | 6 | 1 | `فَأَلْقَىٰهَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:27 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 20:42 | 6 | 1 | `بِـَٔايَـٰتِى` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:44 | 6 | 1 | `قَوْلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:47 | 6, 7 | 3 | `إِسْرَٰٓءِيلَ` `بِـَٔايَةٍ` `مِّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 20:53 | 6 | 2 | `سُبُلًا` `أَزْوَٰجًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:54 | 6 | 2 | `ذَٰلِكَ` `لِّأُو۟لِى` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:63 | 6 | 2 | `هَـٰذَٰنِ` `لَسَـٰحِرَٰنِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:65 | 7 | 2 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 20:72 | 6 | 1 | `ٱلْحَيَوٰةَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:73 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 20:76 | 6 | 1 | `وَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:80 | 6 | 2 | `إِسْرَٰٓءِيلَ` `وَوَٰعَدْنَـٰكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:86 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 20:87 | 6 | 1 | `فَكَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:88 | 6 | 1 | `عِجْلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:89 | 6 | 1 | `قَوْلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:90 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 20:94 | 6 | 1 | `إِسْرَٰٓءِيلَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:96 | 6 | 1 | `وَكَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:97 | 6 | 1 | `ٱلْحَيَوٰةِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:99 | 6, 7 | 2 | `كَذَٰلِكَ` `بَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 20:101 | 6 | 1 | `حِمْلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:105 | 6 | 1 | `وَيَسْـَٔلُونَكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:109 | 6 | 1 | `قَوْلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:113 | 6 | 1 | `وَكَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:117 | 6 | 1 | `يَـٰٓـَٔادَمُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:120 | 6 | 1 | `يَـٰٓـَٔادَمُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:121 | 6 | 1 | `سَوْءَٰتُهُمَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:123 | 6 | 1 | `جَمِيعًۢا ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:126 | 6 | 2 | `كَذَٰلِكَ` `وَكَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:127 | 6 | 2 | `وَكَذَٰلِكَ` `بِـَٔايَـٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:128 | 6 | 2 | `ذَٰلِكَ` `لِّأُو۟لِى` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:130 | 6 | 1 | `ءَانَآئِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:131 | 6 | 2 | `أَزْوَٰجًا` `ٱلْحَيَوٰةِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:132 | 6 | 2 | `بِٱلصَّلَوٰةِ` `نَسْـَٔلُكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:133 | 6, 7 | 2 | `بِـَٔايَةٍ` `مِّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 20:134 | 6, 7 | 2 | `نَّ` `رَسُولًا` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 20:135 | 6 | 1 | `ٱلصِّرَٰطِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 21:2 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 21:5 | 6 | 2 | `أَحْلَـٰمٍۭ` `بِـَٔايَةٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 21:7 | 6 | 2 | `رِجَالًا` `فَسْـَٔلُوٓا۟` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 21:12 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 21:13 | 6 | 1 | `تُسْـَٔلُونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 21:17 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 21:19 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 21:23 | 6 | 2 | `يُسْـَٔلُ` `يُسْـَٔلُونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 21:25 | 6 | 1 | `أَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 21:29 | 6, 7 | 3 | `نِّ` `فَذَٰلِكَ` `كَذَٰلِكَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 21:30 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 21:31 | 6 | 2 | `رَوَٰسِىَ` `سُبُلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 21:35 | 7 | 1 | `ذَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 21:47 | 6 | 2 | `ٱلْمَوَٰزِينَ` `شَيْـًٔا ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 21:51 | 6 | 1 | `إِبْرَٰهِيمَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 21:56 | 6 | 3 | `ٱلسَّمَـٰوَٰتِ` `وَأَنَا۠` `ذَٰلِكُم` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 21:58 | 6 | 1 | `جُذَٰذًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 21:59 | 6 | 1 | `بِـَٔالِهَتِنَآ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 21:60 | 6 | 1 | `إِبْرَٰهِيمُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 21:62 | 6 | 2 | `بِـَٔالِهَتِنَا` `يَـٰٓإِبْرَٰهِيمُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 21:63 | 6 | 1 | `فَسْـَٔلُوهُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 21:66 | 6 | 1 | `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 21:69 | 6 | 1 | `إِبْرَٰهِيمَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 21:72 | 6 | 1 | `وَكُلًّا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 21:73 | 6 | 3 | `ٱلْخَيْرَٰتِ` `ٱلصَّلَوٰةِ` `ٱلزَّكَوٰةِ ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 21:77 | 6 | 1 | `بِـَٔايَـٰتِنَآ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 21:79 | 6 | 1 | `وَكُلًّا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 21:80 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 21:82 | 6 | 2 | `عَمَلًا` `ذَٰلِكَ ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 21:83 | 6 | 1 | `ٱلرَّٰحِمِينَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 21:87 | 7 | 2 | `لَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 21:88 | 6 | 1 | `وَكَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 21:89 | 6 | 1 | `ٱلْوَٰرِثِينَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 21:90 | 6 | 1 | `ٱلْخَيْرَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 21:92 | 6 | 2 | `وَٰحِدَةً` `وَأَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 21:93 | 6 | 1 | `رَٰجِعُونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 21:95 | 6 | 1 | `وَحَرَٰمٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 21:98 | 6 | 1 | `وَٰرِدُونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 21:103 | 6 | 1 | `وَتَتَلَقَّىٰهُمُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 21:108 | 6, 7 | 2 | `وَٰحِدٌ ۖ` `تُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 22:2 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 22:5 | 6, 7 | 7 | `طِفْلًا` `كُ` `مَّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 22:6 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 22:10 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 22:11 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 22:12 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 22:15 | 7 | 1 | `لَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 22:16 | 6 | 2 | `وَكَذَٰلِكَ` `ءَايَـٰتٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 22:17 | 6 | 1 | `وَٱلصَّـٰبِـِٔينَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 22:18 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 22:24 | 6 | 1 | `صِرَٰطِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 22:25 | 6 | 1 | `بِإِلْحَادٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 22:26 | 6 | 2 | `لِإِبْرَٰهِيمَ` `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 22:27 | 6 | 1 | `رِجَالًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 22:28 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 22:30 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 22:32 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 22:34 | 6, 7 | 2 | `مِّ` `وَٰحِدٌ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 22:35 | 6 | 1 | `ٱلصَّلَوٰةِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 22:36 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 22:37 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 22:38 | 6 | 1 | `يُدَٰفِعُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 22:40 | 6 | 2 | `صَوَٰمِعُ` `وَصَلَوَٰتٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 22:41 | 6 | 2 | `ٱلصَّلَوٰةَ` `ٱلزَّكَوٰةَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 22:43 | 6 | 1 | `إِبْرَٰهِيمَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 22:49 | 6 | 1 | `أَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 22:53 | 6 | 1 | `شِقَاقٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 22:54 | 6 | 1 | `صِرَٰطٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 22:56 | 6 | 1 | `لِّلَّهِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 22:57 | 6 | 1 | `بِـَٔايَـٰتِنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 22:58 | 6 | 1 | `ٱلرَّٰزِقِينَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 22:59 | 6 | 1 | `مُّدْخَلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 22:60 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 22:61 | 6 | 2 | `ذَٰلِكَ` `سَمِيعٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 22:62 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 22:64 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 22:70 | 6 | 2 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 22:72 | 6 | 1 | `ذَٰلِكُمُ ۗ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 22:73 | 6 | 1 | `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 22:75 | 6 | 2 | `رُسُلًا` `سَمِيعٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 22:78 | 6 | 6 | `ٱجْتَبَىٰكُمْ` `إِبْرَٰهِيمَ ۚ` `سَمَّىٰكُمُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:4 | 6 | 1 | `لِلزَّكَوٰةِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:6 | 6 | 1 | `أَزْوَٰجِهِمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:7 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:8 | 6 | 1 | `رَٰعُونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:9 | 6 | 1 | `صَلَوَٰتِهِمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:10 | 6 | 1 | `ٱلْوَٰرِثُونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:12 | 7 | 1 | `طِ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 23:15 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:18 | 6 | 2 | `مَآءًۢ` `ذَهَابٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:19 | 6 | 1 | `فَوَٰكِهُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:25 | 6 | 1 | `رَجُلٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:28 | 6 | 1 | `نَجَّىٰنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:29 | 6 | 1 | `مُنزَلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:30 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:32 | 6 | 1 | `رَسُولًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:33 | 6 | 1 | `ٱلْحَيَوٰةِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:43 | 6 | 1 | `يَسْتَـْٔخِرُونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:45 | 6 | 1 | `بِـَٔايَـٰتِنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:52 | 6 | 2 | `وَٰحِدَةً` `وَأَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:53 | 6 | 1 | `حِزْبٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:56 | 6 | 1 | `ٱلْخَيْرَٰتِ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:58 | 6 | 1 | `بِـَٔايَـٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:60 | 6 | 1 | `رَٰجِعُونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:61 | 6 | 1 | `ٱلْخَيْرَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:63 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:64 | 6 | 1 | `يَجْـَٔرُونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:65 | 6 | 1 | `تَجْـَٔرُوا۟` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:70 | 6 | 1 | `جِنَّةٌۢ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:71 | 6 | 1 | `ٱلسَّمَـٰوَٰتُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:72 | 6 | 2 | `تَسْـَٔلُهُمْ` `ٱلرَّٰزِقِينَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:73 | 6 | 1 | `صِرَٰطٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:74 | 6 | 1 | `ٱلصِّرَٰطِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:78 | 6 | 2 | `وَٱلْأَفْـِٔدَةَ ۚ` `قَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:86 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:91 | 6 | 1 | `إِلَـٰهٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:97 | 6 | 1 | `هَمَزَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:102 | 6 | 1 | `مَوَٰزِينُهُۥ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:103 | 6 | 1 | `مَوَٰزِينُهُۥ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:105 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 23:106 | 7 | 1 | `ضَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 23:108 | 6 | 1 | `ٱخْسَـُٔوا۟` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:109 | 6 | 1 | `ٱلرَّٰحِمِينَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:110 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 23:113 | 6 | 1 | `فَسْـَٔلِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:114 | 6 | 1 | `قَلِيلًا ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 23:118 | 6 | 1 | `ٱلرَّٰحِمِينَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 24:1 | 6 | 1 | `ءَايَـٰتٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 24:2 | 6 | 1 | `وَٰحِدٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 24:3 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 24:5 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 24:6 | 6 | 2 | `أَزْوَٰجَهُمْ` `شَهَـٰدَٰتٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 24:8 | 6 | 1 | `شَهَـٰدَٰتٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 24:11 | 6 | 1 | `ٱمْرِئٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 24:17 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 24:21 | 6, 7 | 3 | `خُطُوَٰتِ` `كُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 24:27 | 6 | 1 | `ذَٰلِكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 24:30 | 6 | 2 | `ذَٰلِكَ` `خَبِيرٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 24:31 | 6 | 4 | `إِخْوَٰنِهِنَّ` `أَخَوَٰتِهِنَّ` `عَوْرَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 24:32 | 6 | 1 | `وَٰسِعٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 24:33 | 6, 7 | 4 | `مِّ` `ءَاتَىٰكُمْ ۚ` `ٱلْحَيَوٰةِ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 24:34 | 6 | 1 | `وَمَثَلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 24:35 | 6 | 2 | `ٱلسَّمَـٰوَٰتِ` `كَمِشْكَوٰةٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 24:37 | 6 | 2 | `ٱلصَّلَوٰةِ` `ٱلزَّكَوٰةِ ۙ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 24:39 | 6 | 4 | `كَسَرَابٍۭ` `ٱلظَّمْـَٔانُ` `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 24:40 | 6, 7 | 3 | `يَغْشَىٰهُ` `ظُلُمَـٰتٌۢ` `نُّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 24:41 | 6 | 2 | `ٱلسَّمَـٰوَٰتِ` `عَلِيمٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 24:42 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 24:44 | 6 | 2 | `ذَٰلِكَ` `لِّأُو۟لِى` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 24:45 | 7 | 4 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 24:46 | 6 | 1 | `صِرَٰطٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 24:47 | 6, 7 | 2 | `مِّ` `ذَٰلِكَ ۚ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 24:53 | 6 | 1 | `خَبِيرٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 24:55 | 6, 7 | 3 | `مِّ` `شَيْـًٔا ۚ` `ذَٰلِكَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 24:56 | 6 | 2 | `ٱلصَّلَوٰةَ` `ٱلزَّكَوٰةَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 24:58 | 6 | 8 | `لِيَسْتَـْٔذِنكُمُ` `مَرَّٰتٍ ۚ` `صَلَوٰةِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 24:59 | 6 | 3 | `فَلْيَسْتَـْٔذِنُوا۟` `ٱسْتَـْٔذَنَ` `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 24:60 | 6 | 2 | `وَٱلْقَوَٰعِدُ` `مُتَبَرِّجَـٰتٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 24:61 | 6 | 4 | `إِخْوَٰنِكُمْ` `أَخَوَٰتِكُمْ` `أَخْوَٰلِكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 24:62 | 6 | 3 | `يَسْتَـْٔذِنُوهُ ۚ` `يَسْتَـْٔذِنُونَكَ` `ٱسْتَـْٔذَنُوكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 24:64 | 6 | 2 | `ٱلسَّمَـٰوَٰتِ` `عَلِيمٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 25:2 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 25:3 | 6 | 2 | `شَيْـًٔا` `حَيَوٰةً` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 25:5 | 6 | 1 | `وَأَصِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 25:6 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 25:8 | 6 | 1 | `رَجُلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 25:9 | 6 | 1 | `سَبِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 25:10 | 6, 7 | 3 | `شَ` `ذَٰلِكَ` `قُصُورًۢا` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 25:12 | 6, 7 | 2 | `مِّ` `مَّكَانٍۭ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 25:14 | 6 | 1 | `وَٰحِدًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 25:15 | 6 | 1 | `أَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 25:16 | 6 | 1 | `مَّسْـُٔولًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 25:18 | 6 | 1 | `قَوْمًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 25:24 | 6 | 1 | `مَقِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 25:25 | 6 | 1 | `تَنزِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 25:27 | 6 | 1 | `سَبِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 25:28 | 6 | 1 | `خَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 25:29 | 6 | 1 | `خَذُولًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 25:31 | 6 | 1 | `وَكَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 25:32 | 6 | 3 | `وَٰحِدَةً ۚ` `كَذَٰلِكَ` `تَرْتِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 25:34 | 6 | 1 | `سَبِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 25:36 | 6 | 1 | `بِـَٔايَـٰتِنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 25:38 | 6 | 2 | `وَقُرُونًۢا` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 25:39 | 6 | 2 | `وَكُلًّا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 25:41 | 6 | 1 | `رَسُولًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 25:42 | 6 | 1 | `سَبِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 25:43 | 6 | 1 | `وَكِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 25:44 | 6 | 1 | `سَبِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 25:45 | 6 | 1 | `دَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 25:48 | 6 | 1 | `بُشْرًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 25:49 | 6 | 1 | `لِّنُحْـِۧىَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 25:57 | 6, 7 | 3 | `أَسْـَٔلُكُمْ` `شَ` `سَبِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 25:59 | 6 | 2 | `ٱلسَّمَـٰوَٰتِ` `فَسْـَٔلْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 25:61 | 6 | 1 | `سِرَٰجًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 25:67 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 25:68 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 25:70 | 6 | 2 | `عَمَلًا` `سَيِّـَٔاتِهِمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 25:73 | 6 | 1 | `بِـَٔايَـٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 25:74 | 6 | 1 | `أَزْوَٰجِنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 25:77 | 6 | 1 | `لِزَامًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 26:8 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 26:12 | 7 | 1 | `نِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 26:14 | 7 | 1 | `بٌ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 26:15 | 6 | 1 | `بِـَٔايَـٰتِنَآ ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 26:17 | 6 | 1 | `إِسْرَٰٓءِيلَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 26:20 | 6 | 1 | `وَأَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 26:22 | 6 | 1 | `إِسْرَٰٓءِيلَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 26:24 | 6, 7 | 2 | `ٱلسَّمَـٰوَٰتِ` `تُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 26:39 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 26:43 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 26:50 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 26:51 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 26:59 | 6 | 2 | `كَذَٰلِكَ` `إِسْرَٰٓءِيلَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 26:61 | 6 | 1 | `تَرَٰٓءَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 26:67 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 26:69 | 6 | 1 | `إِبْرَٰهِيمَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 26:74 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 26:77 | 7 | 1 | `لِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 26:82 | 6 | 1 | `خَطِيٓـَٔتِى` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 26:103 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 26:109 | 6 | 1 | `أَسْـَٔلُكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 26:114 | 6 | 1 | `أَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 26:115 | 6 | 1 | `أَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 26:121 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 26:127 | 6 | 1 | `أَسْـَٔلُكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 26:135 | 7 | 1 | `نِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 26:136 | 6 | 1 | `ٱلْوَٰعِظِينَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 26:139 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 26:145 | 6 | 1 | `أَسْـَٔلُكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 26:154 | 6 | 1 | `بِـَٔايَةٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 26:158 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 26:164 | 6 | 1 | `أَسْـَٔلُكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 26:166 | 6 | 1 | `أَزْوَٰجِكُم ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 26:174 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 26:176 | 6 | 1 | `لْـَٔيْكَةِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 26:180 | 6 | 1 | `أَسْـَٔلُكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 26:190 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 26:197 | 6 | 1 | `إِسْرَٰٓءِيلَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 26:200 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 27:3 | 6 | 2 | `ٱلصَّلَوٰةَ` `ٱلزَّكَوٰةَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 27:7 | 6, 7 | 2 | `نِّ` `سَـَٔاتِيكُم` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 27:10 | 7 | 1 | `نٌّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 27:11 | 6 | 1 | `حُسْنًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 27:19 | 6 | 2 | `وَٰلِدَىَّ` `تَرْضَىٰهُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 27:22 | 6 | 1 | `سَبَإٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 27:25 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 27:29 | 7 | 1 | `نِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 27:34 | 6 | 1 | `وَكَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 27:35 | 6 | 1 | `فَنَاظِرَةٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 27:36 | 6, 7 | 4 | `ءَاتَىٰنِۦَ` `مَّ` `ءَاتَىٰكُم` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 27:39 | 6 | 1 | `أَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 27:40 | 6 | 1 | `أَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 27:52 | 6 | 2 | `خَاوِيَةًۢ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 27:60 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 27:61 | 6 | 1 | `رَوَٰسِىَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 27:62 | 6, 7 | 2 | `مَّ` `قَلِيلًا` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 27:63 | 6, 7 | 2 | `مَّ` `بُشْرًۢا` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 27:64 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 27:65 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 27:66 | 6 | 1 | `ٱدَّٰرَكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 27:67 | 6 | 1 | `تُرَٰبًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 27:76 | 6 | 1 | `إِسْرَٰٓءِيلَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 27:81 | 6 | 1 | `بِـَٔايَـٰتِنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 27:82 | 6 | 1 | `بِـَٔايَـٰتِنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 27:83 | 6, 7 | 2 | `مَّ` `بِـَٔايَـٰتِنَا` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 27:84 | 6 | 1 | `بِـَٔايَـٰتِى` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 27:86 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 27:87 | 6, 7 | 3 | `ٱلسَّمَـٰوَٰتِ` `شَ` `دَٰخِرِينَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 27:88 | 6 | 1 | `خَبِيرٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 27:89 | 7 | 1 | `جَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 27:90 | 7 | 1 | `جَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 27:92 | 6 | 1 | `أَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 28:5 | 6 | 1 | `ٱلْوَٰرِثِينَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 28:8 | 6 | 1 | `خَـٰطِـِٔينَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 28:14 | 6 | 1 | `وَكَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 28:19 | 6, 7 | 2 | `مَّ` `نَفْسًۢا` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 28:26 | 6 | 2 | `ٱسْتَـْٔجِرْهُ ۖ` `ٱسْتَـْٔجَرْتَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 28:27 | 7 | 2 | `نِّ` `شَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 28:28 | 6 | 2 | `ذَٰلِكَ` `عُدْوَٰنَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 28:29 | 7 | 1 | `نِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 28:30 | 6, 7 | 4 | `مَّ` `أَتَىٰهَا` `شَـٰطِئِ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 28:31 | 7 | 1 | `نٌّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 28:32 | 6 | 1 | `فَذَٰنِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 28:34 | 7 | 1 | `نِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 28:35 | 6 | 1 | `بِـَٔايَـٰتِنَآ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 28:36 | 6 | 1 | `بِـَٔايَـٰتِنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 28:37 | 7 | 1 | `جَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 28:39 | 7 | 1 | `نُّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 28:45 | 7 | 2 | `نَّ` `فِ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 28:46 | 6, 7 | 4 | `مِّ` `مَّ` `أَتَىٰهُم` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 28:47 | 6 | 2 | `مُّصِيبَةٌۢ` `رَسُولًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 28:57 | 6, 7 | 2 | `ثَمَرَٰتُ` `مِّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 28:58 | 6, 7 | 4 | `قَرْيَةٍۭ` `مِّ` `قَلِيلًا ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 28:59 | 6 | 1 | `رَسُولًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 28:60 | 6 | 1 | `ٱلْحَيَوٰةِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 28:61 | 6 | 1 | `ٱلْحَيَوٰةِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 28:66 | 7 | 1 | `بَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 28:77 | 6 | 1 | `ءَاتَىٰكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 28:78 | 6, 7 | 2 | `دِ` `يُسْـَٔلُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 28:79 | 6 | 1 | `ٱلْحَيَوٰةَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 28:80 | 6 | 1 | `يُلَقَّىٰهَآ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 28:84 | 6, 7 | 3 | `جَ` `ٱلسَّيِّـَٔاتِ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 28:85 | 7 | 1 | `جَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 28:86 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 29:4 | 6 | 1 | `ٱلسَّيِّـَٔاتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 29:7 | 6 | 1 | `سَيِّـَٔاتِهِمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 29:8 | 6 | 1 | `بِوَٰلِدَيْهِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 29:10 | 7 | 2 | `جَ` `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 29:13 | 6 | 2 | `وَأَثْقَالًا` `وَلَيُسْـَٔلُنَّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 29:16 | 6 | 2 | `وَإِبْرَٰهِيمَ` `ذَٰلِكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 29:19 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 29:22 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 29:23 | 6 | 1 | `بِـَٔايَـٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 29:24 | 6 | 2 | `فَأَنجَىٰهُ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 29:25 | 6, 7 | 2 | `ٱلْحَيَوٰةِ` `مِّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 29:26 | 6 | 1 | `فَـَٔامَنَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 29:31 | 6 | 1 | `إِبْرَٰهِيمَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 29:33 | 7 | 3 | `مَّ` `جَ` `سِ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 29:35 | 6 | 1 | `ءَايَةًۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 29:38 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 29:40 | 6 | 1 | `فَكُلًّا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 29:42 | 7 | 1 | `شَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 29:44 | 6 | 2 | `ٱلسَّمَـٰوَٰتِ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 29:45 | 6 | 2 | `ٱلصَّلَوٰةَ ۖ` `ٱلصَّلَوٰةَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 29:46 | 6 | 1 | `وَٰحِدٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 29:47 | 6 | 2 | `وَكَذَٰلِكَ` `بِـَٔايَـٰتِنَآ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 29:49 | 6 | 2 | `ءَايَـٰتٌۢ` `بِـَٔايَـٰتِنَآ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 29:50 | 6, 7 | 2 | `مِّ` `أَنَا۠` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 29:51 | 6, 7 | 2 | `نَّ` `ذَٰلِكَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 29:52 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 29:54 | 6 | 1 | `لَمُحِيطَةٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 29:55 | 6 | 1 | `يَغْشَىٰهُمُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 29:56 | 6 | 1 | `وَٰسِعَةٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 29:57 | 7 | 1 | `ذَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 29:60 | 7 | 1 | `دَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 29:61 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 29:63 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 29:64 | 6 | 1 | `ٱلْحَيَوٰةُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 29:65 | 6 | 1 | `نَجَّىٰهُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 30:3 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 30:7 | 6 | 1 | `ٱلْحَيَوٰةِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 30:8 | 6 | 2 | `ٱلسَّمَـٰوَٰتِ` `بِلِقَآئِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 30:10 | 6 | 2 | `أَسَـٰٓـُٔوا۟` `بِـَٔايَـٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 30:16 | 6 | 2 | `بِـَٔايَـٰتِنَا` `وَلِقَآئِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 30:18 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 30:19 | 6 | 1 | `وَكَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 30:20 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 30:21 | 6 | 2 | `أَزْوَٰجًا` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 30:22 | 6 | 3 | `ٱلسَّمَـٰوَٰتِ` `وَأَلْوَٰنِكُمْ ۚ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 30:23 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 30:24 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 30:26 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 30:27 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 30:28 | 6, 7 | 3 | `مَّثَلًا` `مِّ` `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 30:29 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 30:30 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 30:31 | 6 | 1 | `ٱلصَّلَوٰةَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 30:32 | 6 | 1 | `حِزْبٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 30:36 | 6 | 1 | `سَيِّئَةٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 30:37 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 30:38 | 6 | 2 | `فَـَٔاتِ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 30:39 | 6, 7 | 3 | `مِّ` `أَمْوَٰلِ` `زَكَوٰةٍ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 30:40 | 6, 7 | 2 | `مَّ` `ذَٰلِكُم` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 30:46 | 6, 7 | 2 | `مُبَشِّرَٰتٍ` `مِّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 30:47 | 6 | 1 | `رُسُلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 30:50 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 30:53 | 6 | 1 | `بِـَٔايَـٰتِنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 30:55 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 30:58 | 6 | 1 | `بِـَٔايَةٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 30:59 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 31:4 | 6 | 2 | `ٱلصَّلَوٰةَ` `ٱلزَّكَوٰةَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 31:5 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 31:10 | 6 | 2 | `ٱلسَّمَـٰوَٰتِ` `رَوَٰسِىَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 31:14 | 6 | 2 | `بِوَٰلِدَيْهِ` `وَلِوَٰلِدَيْكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 31:16 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 31:17 | 6 | 2 | `ٱلصَّلَوٰةَ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 31:19 | 6 | 1 | `ٱلْأَصْوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 31:20 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 31:23 | 6 | 1 | `عَلِيمٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 31:24 | 6 | 1 | `قَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 31:25 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 31:26 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 31:28 | 6 | 2 | `وَٰحِدَةٍ ۗ` `سَمِيعٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 31:30 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 31:31 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 31:32 | 6 | 2 | `نَجَّىٰهُمْ` `بِـَٔايَـٰتِنَآ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 31:33 | 6 | 2 | `شَيْـًٔا ۚ` `ٱلْحَيَوٰةُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 31:34 | 6 | 2 | `نَفْسٌۢ` `خَبِيرٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 32:3 | 6, 7 | 3 | `مَّ` `أَتَىٰهُم` `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 32:4 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 32:6 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 32:7 | 7 | 1 | `طِ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 32:8 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 32:9 | 6 | 2 | `وَٱلْأَفْـِٔدَةَ ۚ` `قَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 32:10 | 6 | 1 | `جَدِيدٍۭ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 32:11 | 6 | 1 | `يَتَوَفَّىٰكُم` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 32:15 | 6 | 1 | `بِـَٔايَـٰتِنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 32:17 | 6, 7 | 2 | `مَّ` `جَزَآءًۢ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 32:19 | 6 | 1 | `نُزُلًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 32:20 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 32:22 | 6 | 1 | `بِـَٔايَـٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 32:23 | 6, 7 | 2 | `مِّ` `إِسْرَٰٓءِيلَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 32:24 | 6 | 1 | `بِـَٔايَـٰتِنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 32:26 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:3 | 6 | 1 | `وَكِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:4 | 6 | 4 | `أَزْوَٰجَكُمُ` `ٱلَّـٰٓـِٔى` `ذَٰلِكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:5 | 6 | 2 | `فَإِخْوَٰنُكُمْ` `وَمَوَٰلِيكُمْ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:6 | 6 | 2 | `وَأَزْوَٰجُهُۥٓ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:7 | 6 | 2 | `ٱلنَّبِيِّـۧنَ` `وَإِبْرَٰهِيمَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:8 | 6 | 1 | `لِّيَسْـَٔلَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:10 | 6 | 1 | `ٱلظُّنُونَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:11 | 6 | 1 | `زِلْزَالًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:13 | 6 | 1 | `وَيَسْتَـْٔذِنُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:15 | 6 | 1 | `مَسْـُٔولًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:16 | 6 | 1 | `قَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:18 | 6 | 2 | `لِإِخْوَٰنِهِمْ` `قَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:19 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:20 | 6, 7 | 3 | `يَسْـَٔلُونَ` `بَ` `قَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 33:23 | 6, 7 | 2 | `مَّ` `تَبْدِيلًا` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:24 | 7 | 1 | `شَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 33:27 | 6 | 2 | `وَأَمْوَٰلَهُمْ` `تَطَـُٔوهَا ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:28 | 6 | 3 | `لِّأَزْوَٰجِكَ` `ٱلْحَيَوٰةَ` `جَمِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:30 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:32 | 6 | 1 | `قَوْلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:33 | 6 | 3 | `ٱلصَّلَوٰةَ` `ٱلزَّكَوٰةَ` `وَرَسُولَهُۥٓ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:35 | 6 | 3 | `وَٱلصَّـٰبِرَٰتِ` `وَٱلذَّٰكِرِينَ` `وَٱلذَّٰكِرَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:36 | 6 | 1 | `ضَلَـٰلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:37 | 6, 7 | 4 | `تَخْشَىٰهُ ۖ` `فِ` `أَزْوَٰجِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 33:38 | 6 | 1 | `لَهُۥ ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:40 | 6, 7 | 2 | `مِّ` `ٱلنَّبِيِّـۧنَ ۗ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:42 | 6 | 1 | `وَأَصِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:45 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 33:47 | 6 | 1 | `فَضْلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:48 | 6 | 1 | `وَكِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:49 | 6 | 1 | `جَمِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:50 | 6, 7 | 4 | `نَّ` `أَزْوَٰجَكَ` `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:51 | 6 | 2 | `وَتُـْٔوِىٓ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:52 | 6 | 1 | `أَزْوَٰجٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:53 | 6 | 7 | `إِنَىٰهُ` `مُسْتَـْٔنِسِينَ` `ذَٰلِكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:54 | 6 | 1 | `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:55 | 6 | 3 | `إِخْوَٰنِهِنَّ` `أَخَوَٰتِهِنَّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:59 | 6 | 2 | `لِّأَزْوَٰجِكَ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:60 | 6 | 1 | `قَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:61 | 6 | 1 | `تَقْتِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:62 | 6 | 1 | `تَبْدِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:63 | 6 | 1 | `يَسْـَٔلُكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:66 | 6 | 1 | `ٱلرَّسُولَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:67 | 6, 7 | 2 | `نَّ` `ٱلسَّبِيلَا۠` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:70 | 6 | 1 | `قَوْلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:72 | 6 | 2 | `ٱلسَّمَـٰوَٰتِ` `جَهُولًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 33:73 | 6 | 1 | `رَّحِيمًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 34:1 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 34:3 | 6 | 2 | `ٱلسَّمَـٰوَٰتِ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 34:5 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 34:6 | 6 | 1 | `صِرَٰطِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 34:8 | 6 | 1 | `جِنَّةٌۢ ۗ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 34:9 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 34:10 | 6 | 1 | `فَضْلًا ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 34:12 | 6 | 1 | `رَبِّهِۦ ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 34:14 | 6 | 1 | `مِنسَأَتَهُۥ ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 34:15 | 6 | 1 | `لَهُۥ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 34:17 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 34:19 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 34:22 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 34:23 | 6 | 1 | `لَهُۥ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 34:24 | 6, 7 | 2 | `ٱلسَّمَـٰوَٰتِ` `نَّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 34:25 | 6, 7 | 3 | `تُسْـَٔلُونَ` `مَّ` `نُسْـَٔلُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 34:30 | 6 | 1 | `تَسْتَـْٔخِرُونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 34:32 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 34:35 | 6 | 1 | `أَمْوَٰلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 34:37 | 6 | 1 | `أَمْوَٰلُكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 34:39 | 6 | 2 | `يُخْلِفُهُۥ ۖ` `ٱلرَّٰزِقِينَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 34:42 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 34:46 | 6 | 2 | `بِوَٰحِدَةٍ ۖ` `وَفُرَٰدَىٰ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 34:52 | 6 | 1 | `مَّكَانٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 34:53 | 6 | 1 | `مَّكَانٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 34:54 | 6 | 1 | `مُّرِيبٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 35:1 | 6 | 2 | `ٱلسَّمَـٰوَٰتِ` `رُسُلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 35:2 | 6 | 1 | `بَعْدِهِۦ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 35:5 | 6 | 1 | `ٱلْحَيَوٰةُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 35:8 | 6 | 2 | `حَسَرَٰتٍ ۚ` `عَلِيمٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 35:9 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 35:10 | 6 | 2 | `يَرْفَعُهُۥ ۚ` `ٱلسَّيِّـَٔاتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 35:11 | 6 | 3 | `أَزْوَٰجًا ۚ` `بِعِلْمِهِۦ ۚ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 35:12 | 7 | 1 | `سَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 35:13 | 6 | 1 | `ذَٰلِكُمُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 35:17 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 35:18 | 6 | 2 | `ٱلصَّلَوٰةَ ۚ` `لِنَفْسِهِۦ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 35:20 | 7 | 1 | `نُّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 35:22 | 6 | 1 | `ٱلْأَمْوَٰتُ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 35:24 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 35:27 | 6 | 4 | `ثَمَرَٰتٍ` `أَلْوَٰنُهَا ۚ` `جُدَدٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 35:28 | 6 | 2 | `أَلْوَٰنُهُۥ` `كَذَٰلِكَ ۗ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 35:29 | 6 | 1 | `ٱلصَّلَوٰةَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 35:30 | 6 | 1 | `فَضْلِهِۦٓ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 35:31 | 6 | 1 | `لَخَبِيرٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 35:32 | 6 | 3 | `سَابِقٌۢ` `بِٱلْخَيْرَٰتِ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 35:36 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 35:38 | 6 | 2 | `ٱلسَّمَـٰوَٰتِ` `عَلِيمٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 35:39 | 6 | 1 | `كُفْرُهُۥ ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 35:40 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 35:41 | 6, 7 | 3 | `ٱلسَّمَـٰوَٰتِ` `مِّ` `بَعْدِهِۦٓ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 35:42 | 7 | 1 | `جَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 35:43 | 6 | 4 | `ٱلسَّيِّئِ ۚ` `بِأَهْلِهِۦ ۚ` `تَبْدِيلًا ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 35:44 | 6 | 2 | `قُوَّةً ۚ` `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 35:45 | 6, 7 | 2 | `دَ` `بَصِيرًۢا` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 36:4 | 6 | 1 | `صِرَٰطٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 36:6 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 36:8 | 6 | 1 | `أَغْلَـٰلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 36:13 | 6 | 1 | `مَّثَلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 36:14 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 36:16 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 36:21 | 6 | 1 | `يَسْـَٔلُكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 36:23 | 6 | 1 | `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 36:24 | 7 | 1 | `نِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 36:25 | 7 | 1 | `نِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 36:29 | 6 | 1 | `وَٰحِدَةً` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 36:30 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 36:36 | 6 | 1 | `ٱلْأَزْوَٰجَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 36:38 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 36:42 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 36:49 | 6 | 1 | `وَٰحِدَةً` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 36:53 | 6 | 1 | `وَٰحِدَةً` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 36:54 | 6 | 1 | `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 36:56 | 6 | 2 | `وَأَزْوَٰجُهُمْ` `مُتَّكِـُٔونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 36:58 | 6, 7 | 2 | `قَوْلًا` `مِّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 36:61 | 6 | 1 | `صِرَٰطٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 36:62 | 6 | 1 | `جِبِلًّا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 36:65 | 6 | 1 | `أَفْوَٰهِهِمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 36:66 | 6 | 1 | `ٱلصِّرَٰطَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 36:78 | 6 | 1 | `مَثَلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 36:80 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 36:81 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 36:82 | 6 | 1 | `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 37:2 | 6 | 1 | `فَٱلزَّٰجِرَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 37:4 | 6 | 1 | `لَوَٰحِدٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 37:5 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 37:11 | 6 | 1 | `لَّازِبٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 37:18 | 6 | 1 | `دَٰخِرُونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 37:19 | 6 | 1 | `وَٰحِدَةٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 37:21 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 37:22 | 6 | 1 | `وَأَزْوَٰجَهُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 37:23 | 6 | 1 | `صِرَٰطِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 37:24 | 6 | 1 | `مَّسْـُٔولُونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 37:30 | 6 | 1 | `سُلْطَـٰنٍۭ ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 37:34 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 37:36 | 6 | 1 | `مَّجْنُونٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 37:42 | 6 | 1 | `فَوَٰكِهُ ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 37:45 | 6 | 1 | `مَّعِينٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 37:48 | 6 | 1 | `قَـٰصِرَٰتُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 37:54 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 37:62 | 6 | 2 | `أَذَٰلِكَ` `نُّزُلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 37:66 | 6 | 1 | `فَمَالِـُٔونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 37:80 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 37:83 | 6 | 1 | `لَإِبْرَٰهِيمَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 37:93 | 6 | 1 | `ضَرْبًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 37:102 | 7 | 3 | `نِّ` `شَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 37:103 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 37:104 | 6 | 1 | `يَـٰٓإِبْرَٰهِيمُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 37:105 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 37:109 | 6 | 1 | `إِبْرَٰهِيمَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 37:110 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 37:118 | 6 | 1 | `ٱلصِّرَٰطَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 37:121 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 37:125 | 6 | 1 | `بَعْلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 37:131 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 37:148 | 6 | 1 | `فَـَٔامَنُوا۟` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 37:164 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 38:4 | 7 | 1 | `جَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 38:5 | 6 | 1 | `وَٰحِدًا ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 38:10 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 38:13 | 6 | 1 | `لْـَٔيْكَةِ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 38:15 | 6 | 1 | `وَٰحِدَةً` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 38:21 | 6 | 1 | `أَتَىٰكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 38:22 | 6 | 1 | `ٱلصِّرَٰطِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 38:23 | 6 | 1 | `وَٰحِدَةٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 38:25 | 6 | 2 | `ذَٰلِكَ ۖ` `مَـَٔابٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 38:26 | 6 | 1 | `شَدِيدٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 38:27 | 6, 7 | 3 | `بَـٰطِلًا ۚ` `ذَٰلِكَ` `نَّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 38:32 | 7 | 1 | `نِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 38:33 | 6 | 1 | `مَسْحًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 38:35 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 38:37 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 38:40 | 6 | 1 | `مَـَٔابٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 38:42 | 6 | 1 | `مُغْتَسَلٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 38:45 | 6 | 1 | `إِبْرَٰهِيمَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 38:46 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 38:49 | 6 | 1 | `مَـَٔابٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 38:50 | 6 | 1 | `ٱلْأَبْوَٰبُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 38:51 | 6 | 1 | `مُتَّكِـِٔينَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 38:52 | 6 | 1 | `قَـٰصِرَٰتُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 38:55 | 6 | 1 | `مَـَٔابٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 38:58 | 6 | 1 | `أَزْوَٰجٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 38:59 | 6, 7 | 2 | `مَرْحَبًۢا` `نَّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 38:60 | 6 | 1 | `مَرْحَبًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 38:61 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 38:62 | 6 | 1 | `رِجَالًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 38:64 | 6, 7 | 2 | `ذَٰلِكَ` `نَّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 38:65 | 6 | 2 | `أَنَا۠` `ٱلْوَٰحِدُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 38:66 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 38:69 | 6 | 1 | `عِلْمٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 38:70 | 6 | 1 | `أَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 38:71 | 6, 7 | 2 | `خَـٰلِقٌۢ` `طِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 38:76 | 6, 7 | 2 | `أَنَا۠` `طِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 38:86 | 6 | 2 | `أَسْـَٔلُكُمْ` `أَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 38:88 | 6 | 1 | `حِينٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 39:2 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 39:4 | 6 | 1 | `ٱلْوَٰحِدُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 39:5 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 39:6 | 6, 7 | 5 | `مِّ` `وَٰحِدَةٍ` `أَزْوَٰجٍ ۚ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 39:7 | 6 | 1 | `عَلِيمٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 39:8 | 6, 7 | 2 | `قَلِيلًا ۖ` `نَّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 39:10 | 6 | 1 | `وَٰسِعَةٌ ۗ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 39:11 | 7 | 1 | `نِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 39:13 | 7 | 1 | `نِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 39:15 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 39:16 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 39:19 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 39:21 | 6 | 2 | `أَلْوَٰنُهُۥ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 39:22 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 39:23 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 39:25 | 6 | 1 | `فَأَتَىٰهُمُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 39:26 | 6 | 1 | `ٱلْحَيَوٰةِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 39:29 | 6 | 4 | `مَثَلًا` `رَّجُلًا` `وَرَجُلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 39:34 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 39:38 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 39:41 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 39:42 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 39:43 | 6 | 1 | `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 39:44 | 6 | 2 | `لِّلَّهِ` `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 39:46 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 39:47 | 7 | 1 | `سُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 39:48 | 6 | 1 | `سَيِّـَٔاتُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 39:49 | 6 | 1 | `عِلْمٍۭ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 39:51 | 6 | 2 | `سَيِّـَٔاتُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 39:52 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 39:55 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 39:63 | 6 | 2 | `ٱلسَّمَـٰوَٰتِ` `بِـَٔايَـٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 39:64 | 7 | 1 | `نِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 39:67 | 6 | 2 | `وَٱلسَّمَـٰوَٰتُ` `مَطْوِيَّـٰتٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 39:68 | 6, 7 | 2 | `ٱلسَّمَـٰوَٰتِ` `شَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 39:69 | 6 | 1 | `بِٱلنَّبِيِّـۧنَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 39:71 | 6 | 1 | `أَبْوَٰبُهَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 39:72 | 6 | 1 | `أَبْوَٰبَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 39:73 | 6 | 1 | `أَبْوَٰبُهَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 40:5 | 6 | 1 | `أُمَّةٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 40:6 | 6, 7 | 2 | `وَكَذَٰلِكَ` `نَّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 40:8 | 6 | 1 | `وَأَزْوَٰجِهِمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 40:9 | 6 | 3 | `ٱلسَّيِّـَٔاتِ ۚ` `ٱلسَّيِّـَٔاتِ` `وَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 40:12 | 6 | 1 | `ذَٰلِكُم` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 40:16 | 6 | 1 | `ٱلْوَٰحِدِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 40:17 | 6 | 1 | `نَفْسٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 40:21 | 7 | 1 | `وَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 40:22 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 40:23 | 6 | 1 | `بِـَٔايَـٰتِنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 40:26 | 7 | 1 | `نِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 40:28 | 6 | 1 | `رَجُلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 40:29 | 7 | 1 | `جَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 40:30 | 7 | 1 | `نِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 40:32 | 7 | 1 | `نِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 40:34 | 6 | 2 | `رَسُولًا ۚ` `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 40:35 | 6 | 2 | `أَتَىٰهُمْ ۖ` `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 40:37 | 6 | 2 | `ٱلسَّمَـٰوَٰتِ` `وَكَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 40:39 | 6 | 1 | `ٱلْحَيَوٰةُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 40:41 | 6, 7 | 2 | `ٱلنَّجَوٰةِ` `نَّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 40:42 | 6 | 1 | `وَأَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 40:43 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 40:44 | 6 | 1 | `بَصِيرٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 40:45 | 6 | 3 | `فَوَقَىٰهُ` `سَيِّـَٔاتِ` `بِـَٔالِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 40:47 | 7 | 2 | `تُ` `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 40:51 | 6 | 1 | `ٱلْحَيَوٰةِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 40:53 | 6 | 1 | `إِسْرَٰٓءِيلَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 40:56 | 6 | 1 | `أَتَىٰهُمْ ۙ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 40:57 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 40:58 | 6 | 1 | `قَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 40:62 | 6, 7 | 2 | `ذَٰلِكُمُ` `لَّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 40:63 | 6 | 2 | `كَذَٰلِكَ` `بِـَٔايَـٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 40:64 | 6 | 1 | `ذَٰلِكُمُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 40:67 | 6, 7 | 4 | `طِفْلًا` `كُ` `مَّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 40:74 | 6 | 2 | `شَيْـًٔا ۚ` `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 40:75 | 6 | 1 | `ذَٰلِكُم` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 40:76 | 6 | 1 | `أَبْوَٰبَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 40:77 | 6 | 1 | `حَقٌّ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 40:78 | 6, 7 | 3 | `رُسُلًا` `مَّ` `بِـَٔايَةٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 40:85 | 6 | 1 | `عِبَادِهِۦ ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 41:6 | 6 | 2 | `أَنَا۠` `وَٰحِدٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 41:7 | 6 | 1 | `ٱلزَّكَوٰةَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 41:9 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 41:10 | 6 | 2 | `رَوَٰسِىَ` `أَقْوَٰتَهَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 41:12 | 6 | 2 | `فَقَضَىٰهُنَّ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 41:15 | 6 | 1 | `بِـَٔايَـٰتِنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 41:16 | 6, 7 | 2 | `فِ` `ٱلْحَيَوٰةِ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 41:23 | 6, 7 | 2 | `وَذَٰلِكُمْ` `تُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 41:28 | 6 | 3 | `ذَٰلِكَ` `جَزَآءًۢ` `بِـَٔايَـٰتِنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 41:31 | 6 | 1 | `ٱلْحَيَوٰةِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 41:32 | 6 | 1 | `نُزُلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 41:33 | 6 | 1 | `قَوْلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 41:34 | 6 | 1 | `عَدَٰوَةٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 41:35 | 6 | 2 | `يُلَقَّىٰهَآ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 41:38 | 6 | 1 | `يَسْـَٔمُونَ ۩` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 41:40 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 41:44 | 6 | 2 | `ءَا۬عْجَمِىٌّ` `مَّكَانٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 41:47 | 6 | 1 | `ثَمَرَٰتٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 41:48 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 41:49 | 6 | 2 | `يَسْـَٔمُ` `فَيَـُٔوسٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 41:51 | 6 | 1 | `وَنَـَٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 41:52 | 6 | 1 | `شِقَاقٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 41:54 | 6, 7 | 2 | `مِّ` `مُّحِيطٌۢ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 42:3 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 42:4 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 42:5 | 6 | 1 | `ٱلسَّمَـٰوَٰتُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 42:7 | 6 | 1 | `وَكَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 42:8 | 6, 7 | 2 | `وَٰحِدَةً` `مِّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 42:10 | 6 | 1 | `ذَٰلِكُمُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 42:11 | 6 | 3 | `ٱلسَّمَـٰوَٰتِ` `أَزْوَٰجًا` `أَزْوَٰجًا ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 42:12 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 42:13 | 6 | 1 | `إِبْرَٰهِيمَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 42:14 | 6 | 1 | `بَغْيًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 42:15 | 6 | 1 | `فَلِذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 42:18 | 6 | 1 | `ضَلَـٰلٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 42:19 | 6 | 1 | `لَطِيفٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 42:22 | 6 | 2 | `وَاقِعٌۢ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 42:23 | 6 | 2 | `ذَٰلِكَ` `أَسْـَٔلُكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 42:24 | 6 | 1 | `عَلِيمٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 42:25 | 6 | 1 | `ٱلسَّيِّـَٔاتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 42:27 | 6 | 1 | `خَبِيرٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 42:29 | 6, 7 | 2 | `ٱلسَّمَـٰوَٰتِ` `دَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 42:30 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 42:31 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 42:33 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 42:35 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 42:36 | 6 | 1 | `ٱلْحَيَوٰةِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 42:37 | 6 | 1 | `وَٱلْفَوَٰحِشَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 42:38 | 6 | 1 | `ٱلصَّلَوٰةَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 42:40 | 6 | 1 | `وَجَزَٰٓؤُا۟` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 42:43 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 42:44 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 42:47 | 7 | 2 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 42:48 | 6, 7 | 2 | `نَّ` `سَيِّئَةٌۢ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 42:49 | 6 | 2 | `لِّلَّهِ` `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 42:51 | 6 | 2 | `وَرَآئِ` `رَسُولًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 42:52 | 6 | 2 | `وَكَذَٰلِكَ` `صِرَٰطٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 42:53 | 6 | 2 | `صِرَٰطِ` `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 43:3 | 6 | 1 | `قُرْءَٰنًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 43:7 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 43:9 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 43:10 | 6 | 1 | `سُبُلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 43:11 | 6 | 2 | `مَآءًۢ` `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 43:12 | 6 | 1 | `ٱلْأَزْوَٰجَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 43:14 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 43:16 | 6 | 1 | `وَأَصْفَىٰكُم` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 43:17 | 6 | 1 | `مَثَلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 43:19 | 6 | 1 | `وَيُسْـَٔلُونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 43:20 | 6 | 1 | `بِذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 43:23 | 6 | 1 | `وَكَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 43:26 | 6 | 1 | `إِبْرَٰهِيمُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 43:28 | 6 | 1 | `كَلِمَةًۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 43:32 | 6 | 1 | `ٱلْحَيَوٰةِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 43:33 | 6 | 1 | `وَٰحِدَةً` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 43:34 | 6 | 2 | `أَبْوَٰبًا` `يَتَّكِـُٔونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 43:35 | 6 | 2 | `ذَٰلِكَ` `ٱلْحَيَوٰةِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 43:43 | 6 | 1 | `صِرَٰطٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 43:44 | 6 | 1 | `تُسْـَٔلُونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 43:45 | 6 | 1 | `وَسْـَٔلْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 43:46 | 6 | 1 | `بِـَٔايَـٰتِنَآ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 43:47 | 6 | 1 | `بِـَٔايَـٰتِنَآ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 43:52 | 6 | 1 | `أَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 43:55 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 43:56 | 6 | 1 | `وَمَثَلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 43:57 | 6 | 1 | `مَثَلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 43:58 | 6 | 2 | `ءَأَـٰلِهَتُنَا` `جَدَلًۢا ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 43:59 | 6 | 2 | `مَثَلًا` `إِسْرَٰٓءِيلَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 43:60 | 7 | 1 | `كُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 43:61 | 6 | 1 | `صِرَٰطٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 43:64 | 6 | 1 | `صِرَٰطٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 43:67 | 6 | 1 | `يَوْمَئِذٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 43:69 | 6 | 1 | `بِـَٔايَـٰتِنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 43:70 | 6 | 1 | `وَأَزْوَٰجُكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 43:81 | 6 | 1 | `فَأَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 43:82 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 43:85 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 44:3 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 44:6 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 44:7 | 6, 7 | 2 | `ٱلسَّمَـٰوَٰتِ` `تُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 44:15 | 6 | 1 | `قَلِيلًا ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 44:19 | 7 | 1 | `نِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 44:23 | 6 | 1 | `لَيْلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 44:28 | 6 | 1 | `كَذَٰلِكَ ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 44:30 | 6 | 1 | `إِسْرَٰٓءِيلَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 44:36 | 6 | 1 | `بِـَٔابَآئِنَآ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 44:38 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 44:41 | 6 | 1 | `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 44:50 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 44:54 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 44:56 | 6 | 1 | `وَوَقَىٰهُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 44:57 | 6, 7 | 3 | `فَضْلًا` `مِّ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 45:3 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 45:4 | 7 | 1 | `دَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 45:6 | 6 | 1 | `حَدِيثٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 45:9 | 6 | 1 | `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 45:10 | 6 | 1 | `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 45:11 | 6, 7 | 2 | `بِـَٔايَـٰتِ` `مِّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 45:13 | 6 | 2 | `ٱلسَّمَـٰوَٰتِ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 45:14 | 6 | 1 | `قَوْمًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 45:16 | 6 | 1 | `إِسْرَٰٓءِيلَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 45:17 | 6 | 1 | `بَغْيًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 45:19 | 6 | 1 | `شَيْـًٔا ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 45:21 | 6 | 1 | `ٱلسَّيِّـَٔاتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 45:22 | 6 | 2 | `ٱلسَّمَـٰوَٰتِ` `نَفْسٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 45:24 | 6, 7 | 2 | `بِذَٰلِكَ` `نُّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 45:25 | 6 | 1 | `بِـَٔابَآئِنَآ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 45:27 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 45:30 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 45:33 | 6 | 1 | `سَيِّـَٔاتُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 45:34 | 6, 7 | 2 | `نَنسَىٰكُمْ` `مِّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 45:35 | 6 | 2 | `ذَٰلِكُم` `ٱلْحَيَوٰةُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 45:36 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 45:37 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 46:3 | 6, 7 | 2 | `ٱلسَّمَـٰوَٰتِ` `مَّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 46:4 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 46:5 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 46:8 | 6 | 2 | `شَيْـًٔا ۖ` `شَهِيدًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 46:9 | 6 | 1 | `أَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 46:10 | 6, 7 | 3 | `مِّ` `إِسْرَٰٓءِيلَ` `فَـَٔامَنَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 46:14 | 6 | 1 | `جَزَآءًۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 46:15 | 6 | 3 | `بِوَٰلِدَيْهِ` `وَٰلِدَىَّ` `تَرْضَىٰهُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 46:16 | 6 | 1 | `سَيِّـَٔاتِهِمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 46:17 | 6 | 1 | `لِوَٰلِدَيْهِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 46:21 | 7 | 1 | `نِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 46:23 | 7 | 2 | `مَّ` `نِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 46:25 | 6 | 2 | `شَىْءٍۭ` `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 46:26 | 6 | 3 | `وَأَفْـِٔدَةً` `أَفْـِٔدَتُهُم` `بِـَٔايَـٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 46:28 | 6 | 2 | `ءَالِهَةًۢ ۖ` `وَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 46:33 | 6 | 2 | `ٱلسَّمَـٰوَٰتِ` `يُحْـِۧىَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 46:35 | 6 | 1 | `نَّهَارٍۭ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 47:2 | 6 | 1 | `سَيِّـَٔاتِهِمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 47:3 | 6 | 2 | `ذَٰلِكَ` `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 47:4 | 6 | 2 | `مَنًّۢا` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 47:9 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 47:11 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 47:14 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 47:15 | 6, 7 | 4 | `مَّ` `مِّ` `ٱلثَّمَرَٰتِ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 47:16 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 47:17 | 6 | 1 | `وَءَاتَىٰهُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 47:25 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 47:26 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 47:28 | 6 | 2 | `ذَٰلِكَ` `رِضْوَٰنَهُۥ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 47:29 | 7 | 1 | `لَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 47:32 | 6 | 1 | `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 47:36 | 6 | 3 | `ٱلْحَيَوٰةُ` `يَسْـَٔلْكُمْ` `أَمْوَٰلَكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 47:37 | 6 | 1 | `يَسْـَٔلْكُمُوهَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 47:38 | 7 | 2 | `كُ` `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 48:2 | 6 | 1 | `صِرَٰطًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 48:4 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 48:5 | 6 | 2 | `سَيِّـَٔاتِهِمْ ۚ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 48:7 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 48:8 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 48:9 | 6 | 1 | `وَأَصِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 48:11 | 6 | 4 | `أَمْوَٰلُنَا` `شَيْـًٔا` `نَفْعًۢا ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 48:12 | 6, 7 | 3 | `لَّ` `ذَٰلِكَ` `قَوْمًۢا` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 48:13 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 48:14 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 48:15 | 6 | 2 | `كَذَٰلِكُمْ` `قَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 48:20 | 6 | 1 | `صِرَٰطًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 48:23 | 6 | 1 | `تَبْدِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 48:25 | 6 | 2 | `تَطَـُٔوهُمْ` `مَّعَرَّةٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 48:27 | 6, 7 | 2 | `شَ` `ذَٰلِكَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 48:29 | 6 | 6 | `فَضْلًا` `وَرِضْوَٰنًا ۖ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 49:2 | 6 | 1 | `أَصْوَٰتَكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 49:3 | 6 | 1 | `أَصْوَٰتَهُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 49:4 | 6 | 1 | `ٱلْحُجُرَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 49:6 | 6, 7 | 3 | `جَ` `فَاسِقٌۢ` `قَوْمًۢا` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 49:7 | 6 | 1 | `ٱلرَّٰشِدُونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 49:8 | 6 | 1 | `فَضْلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 49:9 | 7 | 2 | `طَ` `فَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 49:13 | 6 | 1 | `أَتْقَىٰكُمْ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 49:14 | 6 | 1 | `شَيْـًٔا ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 49:15 | 6 | 1 | `بِأَمْوَٰلِهِمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 49:16 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 49:18 | 6 | 2 | `ٱلسَّمَـٰوَٰتِ` `بَصِيرٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 50:2 | 7 | 1 | `جَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 50:3 | 6 | 2 | `ذَٰلِكَ` `رَجْعٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 50:4 | 6 | 1 | `حَفِيظٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 50:7 | 6 | 2 | `رَوَٰسِىَ` `زَوْجٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 50:11 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 50:13 | 6 | 1 | `وَإِخْوَٰنُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 50:19 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 50:20 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 50:27 | 6 | 1 | `ضَلَـٰلٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 50:29 | 6 | 1 | `أَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 50:34 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 50:37 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 50:38 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 50:42 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 50:44 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 51:1 | 6 | 1 | `وَٱلذَّٰرِيَـٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 51:6 | 6 | 1 | `لَوَٰقِعٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 51:10 | 6 | 1 | `ٱلْخَرَّٰصُونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 51:12 | 6 | 1 | `يَسْـَٔلُونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 51:14 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 51:16 | 6 | 2 | `ءَاتَىٰهُمْ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 51:17 | 6 | 1 | `قَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 51:19 | 6 | 1 | `أَمْوَٰلِهِمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 51:24 | 6 | 2 | `أَتَىٰكَ` `إِبْرَٰهِيمَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 51:30 | 6 | 1 | `كَذَٰلِكِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 51:32 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 51:33 | 7 | 1 | `طِ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 51:52 | 6, 7 | 2 | `كَذَٰلِكَ` `مِّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 51:57 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 52:3 | 7 | 1 | `شُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 52:7 | 6 | 1 | `لَوَٰقِعٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 52:14 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 52:18 | 6 | 2 | `ءَاتَىٰهُمْ` `وَوَقَىٰهُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 52:19 | 6 | 1 | `هَنِيٓـًٔۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 52:20 | 6 | 1 | `مُتَّكِـِٔينَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 52:21 | 6 | 1 | `ٱمْرِئٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 52:27 | 6 | 1 | `وَوَقَىٰنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 52:36 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 52:40 | 6, 7 | 2 | `تَسْـَٔلُهُمْ` `مِّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 52:46 | 6 | 1 | `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 52:47 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 53:20 | 6 | 1 | `وَمَنَوٰةَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 53:23 | 7 | 2 | `مَّ` `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 53:26 | 6, 7 | 3 | `مِّ` `ٱلسَّمَـٰوَٰتِ` `شَيْـًٔا` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 53:28 | 6 | 1 | `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 53:29 | 6 | 1 | `ٱلْحَيَوٰةَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 53:30 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 53:31 | 6 | 2 | `ٱلسَّمَـٰوَٰتِ` `أَسَـٰٓـُٔوا۟` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 53:32 | 6 | 2 | `وَٱلْفَوَٰحِشَ` `وَٰسِعُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 53:34 | 6 | 1 | `قَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 53:37 | 6 | 1 | `وَإِبْرَٰهِيمَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 53:54 | 6 | 1 | `فَغَشَّىٰهَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 54:4 | 7 | 1 | `بَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 54:5 | 6 | 1 | `حِكْمَةٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 54:11 | 6 | 1 | `أَبْوَٰبَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 54:13 | 6 | 1 | `أَلْوَٰحٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 54:19 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 54:24 | 6, 7 | 2 | `وَٰحِدًا` `نَّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 54:28 | 6 | 1 | `قِسْمَةٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 54:31 | 6, 7 | 2 | `نَّ` `وَٰحِدَةً` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 54:33 | 6 | 1 | `لُوطٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 54:34 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 54:35 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 54:37 | 6 | 1 | `رَٰوَدُوهُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 54:42 | 6 | 1 | `بِـَٔايَـٰتِنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 54:50 | 6 | 2 | `وَٰحِدَةٌ` `كَلَمْحٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 54:55 | 6 | 1 | `مُّقْتَدِرٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 55:15 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 55:24 | 6 | 1 | `ٱلْمُنشَـَٔاتُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 55:29 | 6 | 2 | `يَسْـَٔلُهُۥ` `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 55:33 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 55:39 | 6 | 1 | `يُسْـَٔلُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 55:41 | 6 | 1 | `بِٱلنَّوَٰصِى` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 55:54 | 6 | 2 | `مُتَّكِـِٔينَ` `فُرُشٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 55:56 | 6 | 1 | `قَـٰصِرَٰتُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 55:68 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 55:70 | 6 | 1 | `خَيْرَٰتٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 55:72 | 6 | 1 | `مَّقْصُورَٰتٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 55:76 | 6 | 1 | `مُتَّكِـِٔينَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 56:7 | 6 | 1 | `أَزْوَٰجًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 56:9 | 6 | 2 | `ٱلْمَشْـَٔمَةِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 56:16 | 6 | 1 | `مُّتَّكِـِٔينَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 56:17 | 6 | 1 | `وِلْدَٰنٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 56:23 | 6 | 1 | `ٱللُّؤْلُؤِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 56:24 | 6 | 1 | `جَزَآءًۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 56:26 | 6 | 1 | `قِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 56:29 | 7 | 1 | `ضُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 56:35 | 7 | 2 | `نَّ` `شَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 56:38 | 6 | 1 | `لِّأَصْحَـٰبِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 56:45 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 56:53 | 6 | 1 | `فَمَالِـُٔونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 56:64 | 6 | 1 | `ٱلزَّٰرِعُونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 56:72 | 6 | 1 | `ٱلْمُنشِـُٔونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 56:75 | 6 | 1 | `بِمَوَٰقِعِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 56:80 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 56:81 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 56:88 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 56:90 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 56:92 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 57:1 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 57:2 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 57:4 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 57:5 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 57:6 | 6 | 1 | `عَلِيمٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 57:8 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 57:9 | 6 | 1 | `ءَايَـٰتٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 57:10 | 6, 7 | 4 | `مِيرَٰثُ` `ٱلسَّمَـٰوَٰتِ` `كُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 57:12 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 57:13 | 6 | 1 | `بَابٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 57:15 | 6 | 1 | `مَوْلَىٰكُمْ ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 57:19 | 6 | 1 | `بِـَٔايَـٰتِنَآ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 57:20 | 6 | 5 | `ٱلْحَيَوٰةُ` `وَتَفَاخُرٌۢ` `ٱلْأَمْوَٰلِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 57:21 | 6, 7 | 2 | `مِّ` `ذَٰلِكَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 57:22 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 57:23 | 6 | 1 | `ءَاتَىٰكُمْ ۗ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 57:26 | 6 | 1 | `وَإِبْرَٰهِيمَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 57:27 | 6 | 2 | `رِضْوَٰنِ` `فَـَٔاتَيْنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 58:1 | 6 | 1 | `سَمِيعٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 58:2 | 6, 7 | 3 | `كُ` `مِّ` `ٱلَّـٰٓـِٔى` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 58:3 | 6 | 1 | `ذَٰلِكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 58:4 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 58:5 | 6 | 1 | `ءَايَـٰتٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 58:6 | 6 | 1 | `أَحْصَىٰهُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 58:7 | 6 | 2 | `ٱلسَّمَـٰوَٰتِ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 58:8 | 6 | 1 | `وَٱلْعُدْوَٰنِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 58:9 | 6 | 1 | `وَٱلْعُدْوَٰنِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 58:10 | 6 | 1 | `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 58:12 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 58:13 | 6 | 3 | `ٱلصَّلَوٰةَ` `ٱلزَّكَوٰةَ` `خَبِيرٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 58:17 | 6 | 2 | `أَمْوَٰلُهُمْ` `شَيْـًٔا ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 58:19 | 6 | 1 | `فَأَنسَىٰهُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 58:21 | 6 | 1 | `أَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 58:22 | 6 | 1 | `إِخْوَٰنَهُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 59:1 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 59:2 | 6, 7 | 2 | `نُّ` `فَأَتَىٰهُمُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 59:3 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 59:4 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 59:5 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 59:7 | 6 | 3 | `دُولَةًۢ` `ءَاتَىٰكُمُ` `نَهَىٰكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 59:8 | 6 | 3 | `وَأَمْوَٰلِهِمْ` `فَضْلًا` `وَرِضْوَٰنًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 59:9 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 59:10 | 6 | 2 | `وَلِإِخْوَٰنِنَا` `غِلًّا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 59:11 | 6 | 1 | `لِإِخْوَٰنِهِمُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 59:13 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 59:14 | 6 | 2 | `جُدُرٍۭ ۚ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 59:16 | 7 | 1 | `نِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 59:17 | 6 | 2 | `وَذَٰلِكَ` `جَزَٰٓؤُا۟` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 59:18 | 6 | 1 | `خَبِيرٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 59:19 | 6 | 1 | `فَأَنسَىٰهُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 59:24 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 60:1 | 6 | 1 | `وَأَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 60:4 | 6, 7 | 6 | `فِ` `إِبْرَٰهِيمَ` `بُرَءَٰٓؤُا۟` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 60:8 | 6 | 1 | `يَنْهَىٰكُمُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 60:9 | 6 | 1 | `يَنْهَىٰكُمُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 60:10 | 6, 7 | 5 | `مُهَـٰجِرَٰتٍ` `مَّ` `وَسْـَٔلُوا۟` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 60:11 | 6, 7 | 4 | `أَزْوَٰجِكُمْ` `فَـَٔاتُوا۟` `أَزْوَٰجُهُم` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 60:12 | 6 | 1 | `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 61:1 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 61:6 | 6 | 2 | `إِسْرَٰٓءِيلَ` `وَمُبَشِّرًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 61:8 | 6 | 2 | `لِيُطْفِـُٔوا۟` `بِأَفْوَٰهِهِمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 61:11 | 6 | 2 | `بِأَمْوَٰلِكُمْ` `ذَٰلِكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 61:12 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 61:14 | 6, 7 | 4 | `لِلْحَوَارِيِّـۧنَ` `فَـَٔامَنَت` `مِّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 62:1 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 62:2 | 6 | 2 | `ٱلْأُمِّيِّـۧنَ` `رَسُولًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 62:4 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 62:5 | 6 | 2 | `أَسْفَارًۢا ۚ` `بِـَٔايَـٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 62:7 | 6 | 2 | `أَبَدًۢا` `عَلِيمٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 62:9 | 6 | 2 | `لِلصَّلَوٰةِ` `ذَٰلِكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 62:10 | 6 | 1 | `ٱلصَّلَوٰةُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 62:11 | 6 | 1 | `ٱلرَّٰزِقِينَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 63:3 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 63:7 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 63:9 | 6 | 2 | `أَمْوَٰلُكُمْ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 63:11 | 6 | 1 | `خَبِيرٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 64:1 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 64:2 | 7 | 1 | `كُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 64:3 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 64:4 | 6 | 2 | `ٱلسَّمَـٰوَٰتِ` `عَلِيمٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 64:6 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 64:7 | 6, 7 | 2 | `لَّ` `وَذَٰلِكَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 64:8 | 6 | 1 | `فَـَٔامِنُوا۟` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 64:9 | 6 | 3 | `ذَٰلِكَ` `سَيِّـَٔاتِهِۦ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 64:10 | 6 | 1 | `بِـَٔايَـٰتِنَآ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 64:14 | 6 | 1 | `أَزْوَٰجِكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 64:15 | 6 | 1 | `أَمْوَٰلُكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 64:16 | 6 | 1 | `لِّأَنفُسِكُمْ ۗ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 65:1 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 65:2 | 6 | 1 | `ذَٰلِكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 65:4 | 6 | 2 | `وَٱلَّـٰٓـِٔى` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 65:5 | 6 | 2 | `ذَٰلِكَ` `سَيِّـَٔاتِهِۦ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 65:6 | 6, 7 | 3 | `تُ` `مِّ` `فَـَٔاتُوهُنَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 65:7 | 6, 7 | 3 | `مَّ` `ءَاتَىٰهُ` `ءَاتَىٰهَا ۚ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 65:11 | 6 | 1 | `رَّسُولًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 65:12 | 6 | 2 | `سَمَـٰوَٰتٍ` `عِلْمًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 66:1 | 6 | 1 | `أَزْوَٰجِكَ ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 66:2 | 6 | 1 | `مَوْلَىٰكُمْ ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 66:3 | 6 | 1 | `أَزْوَٰجِهِۦ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 66:4 | 6 | 2 | `مَوْلَىٰهُ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 66:5 | 6 | 2 | `أَزْوَٰجًا` `عَـٰبِدَٰتٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 66:8 | 6 | 1 | `سَيِّـَٔاتِكُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 66:10 | 6 | 3 | `مَثَلًا` `شَيْـًٔا` `ٱلدَّٰخِلِينَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 66:11 | 6 | 1 | `مَثَلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 66:12 | 6 | 1 | `عِمْرَٰنَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 67:2 | 6 | 2 | `وَٱلْحَيَوٰةَ` `عَمَلًا ۚ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 67:3 | 6 | 1 | `سَمَـٰوَٰتٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 67:11 | 6 | 1 | `لِّأَصْحَـٰبِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 67:13 | 6 | 1 | `عَلِيمٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 67:15 | 6 | 1 | `ذَلُولًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 67:16 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 67:17 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 67:19 | 6 | 1 | `شَىْءٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 67:22 | 6, 7 | 2 | `مَّ` `صِرَٰطٍ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 67:23 | 6 | 2 | `وَٱلْأَفْـِٔدَةَ ۖ` `قَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 67:26 | 6 | 1 | `أَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 67:27 | 6, 7 | 2 | `سِيٓـَٔتْ` `تُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 67:30 | 6 | 1 | `مَّعِينٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 68:11 | 6 | 1 | `مَّشَّآءٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 68:13 | 6 | 2 | `عُتُلٍّۭ` `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 68:19 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 68:32 | 6, 7 | 2 | `نَّ` `رَٰغِبُونَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 68:33 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 68:40 | 6 | 1 | `بِذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 68:46 | 6, 7 | 2 | `تَسْـَٔلُهُمْ` `مِّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 68:49 | 6, 7 | 2 | `تَدَٰرَكَهُۥ` `مِّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 69:4 | 6 | 1 | `وَعَادٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 69:8 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 69:12 | 6 | 1 | `وَٰعِيَةٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 69:13 | 6 | 1 | `وَٰحِدَةٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 69:14 | 6 | 1 | `وَٰحِدَةً` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 69:24 | 6 | 1 | `هَنِيٓـًٔۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 69:37 | 6 | 1 | `ٱلْخَـٰطِـُٔونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 69:41 | 6 | 1 | `قَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 69:42 | 6 | 1 | `قَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 69:43 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 69:47 | 7 | 1 | `كُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 69:49 | 7 | 1 | `كُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 70:1 | 6 | 1 | `سَآئِلٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 70:5 | 6 | 1 | `جَمِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 70:10 | 6 | 1 | `يَسْـَٔلُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 70:11 | 6 | 1 | `يَوْمِئِذٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 70:13 | 6 | 1 | `تُـْٔوِيهِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 70:14 | 7 | 1 | `جِ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 70:24 | 6 | 1 | `أَمْوَٰلِهِمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 70:30 | 6 | 1 | `أَزْوَٰجِهِمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 70:31 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 70:32 | 6 | 1 | `رَٰعُونَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 70:33 | 6 | 1 | `بِشَهَـٰدَٰتِهِمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 70:38 | 6 | 1 | `ٱمْرِئٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 70:44 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 71:1 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 71:5 | 6 | 1 | `لَيْلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 71:9 | 7 | 1 | `نِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 71:12 | 6 | 1 | `بِأَمْوَٰلٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 71:15 | 6 | 1 | `سَمَـٰوَٰتٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 71:20 | 6 | 1 | `سُبُلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 71:24 | 6 | 1 | `ضَلَـٰلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 71:28 | 6 | 2 | `وَلِوَٰلِدَىَّ` `تَبَارًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 72:2 | 6 | 1 | `فَـَٔامَنَّا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 72:5 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 72:7 | 7 | 1 | `لَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 72:11 | 6 | 1 | `ذَٰلِكَ ۖ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 72:12 | 7 | 2 | `نَّ` `لَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 72:16 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 72:28 | 6 | 1 | `عَدَدًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 73:2 | 6 | 1 | `قَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 73:3 | 6 | 1 | `قَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 73:4 | 6 | 1 | `تَرْتِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 73:5 | 6 | 2 | `قَوْلًا` `ثَقِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 73:6 | 6 | 2 | `وَطْـًٔا` `قِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 73:7 | 6 | 1 | `طَوِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 73:8 | 6 | 1 | `تَبْتِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 73:9 | 6 | 1 | `وَكِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 73:10 | 6 | 1 | `جَمِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 73:11 | 6 | 1 | `قَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 73:12 | 6 | 1 | `أَنكَالًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 73:14 | 6 | 1 | `مَّهِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 73:15 | 6, 7 | 3 | `نَّ` `رَسُولًا` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 73:16 | 6 | 1 | `وَبِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 73:17 | 6 | 1 | `ٱلْوِلْدَٰنَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 73:18 | 6 | 2 | `مُنفَطِرٌۢ` `مَفْعُولًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 73:19 | 6, 7 | 2 | `شَ` `سَبِيلًا` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 73:20 | 6, 7 | 4 | `كُ` `ٱلصَّلَوٰةَ` `ٱلزَّكَوٰةَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 74:9 | 6 | 1 | `فَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 74:12 | 6 | 1 | `مَالًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 74:31 | 6 | 2 | `مَثَلًا ۚ` `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 74:37 | 7 | 1 | `شَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 74:38 | 6 | 1 | `نَفْسٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 74:47 | 6 | 1 | `أَتَىٰنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 74:51 | 6 | 1 | `قَسْوَرَةٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 74:52 | 6 | 1 | `ٱمْرِئٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 74:55 | 7 | 1 | `شَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 75:6 | 6 | 1 | `يَسْـَٔلُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 75:13 | 6 | 1 | `يَوْمَئِذٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 75:24 | 6 | 1 | `يَوْمَئِذٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 75:27 | 7 | 1 | `رَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 75:40 | 6 | 2 | `ذَٰلِكَ` `يُحْـِۧىَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 76:1 | 6 | 1 | `شَيْـًٔا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 76:2 | 6 | 1 | `سَمِيعًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 76:4 | 6, 7 | 2 | `نَّ` `وَأَغْلَـٰلًا` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 76:11 | 6 | 3 | `فَوَقَىٰهُمُ` `ذَٰلِكَ` `وَلَقَّىٰهُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 76:13 | 6 | 1 | `مُّتَّكِـِٔينَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 76:14 | 6 | 1 | `تَذْلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 76:15 | 6 | 2 | `بِـَٔانِيَةٍ` `قَوَارِيرَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 76:17 | 6 | 1 | `زَنجَبِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 76:18 | 6 | 1 | `سَلْسَبِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 76:19 | 6 | 1 | `وِلْدَٰنٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 76:21 | 6 | 1 | `وَسَقَىٰهُمْ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 76:23 | 6 | 1 | `تَنزِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 76:25 | 6 | 1 | `وَأَصِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 76:26 | 6 | 2 | `لَيْلًا` `طَوِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 76:27 | 6 | 1 | `ثَقِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 76:28 | 6 | 1 | `تَبْدِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 76:29 | 6, 7 | 2 | `شَ` `سَبِيلًا` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 76:31 | 6 | 1 | `أَلِيمًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 77:3 | 6 | 1 | `وَٱلنَّـٰشِرَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 77:7 | 6 | 1 | `لَوَٰقِعٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 77:18 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 77:20 | 7 | 2 | `مِّ` `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 77:26 | 6 | 1 | `وَأَمْوَٰتًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 77:27 | 6, 7 | 2 | `رَوَٰسِىَ` `مَّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 77:29 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 77:42 | 6 | 1 | `وَفَوَٰكِهَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 77:43 | 6 | 1 | `هَنِيٓـًٔۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 77:44 | 6 | 1 | `كَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 77:46 | 6 | 1 | `قَلِيلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 77:50 | 6 | 1 | `حَدِيثٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 78:8 | 6 | 1 | `أَزْوَٰجًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 78:14 | 6 | 1 | `ٱلْمُعْصِرَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 78:19 | 6 | 1 | `أَبْوَٰبًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 78:22 | 6 | 1 | `مَـَٔابًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 78:28 | 6 | 1 | `بِـَٔايَـٰتِنَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 78:35 | 6 | 1 | `كِذَّٰبًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 78:36 | 7 | 1 | `مِّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 78:37 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 78:39 | 6, 7 | 3 | `ذَٰلِكَ` `شَ` `مَـَٔابًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.; Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 78:40 | 6, 7 | 2 | `نَّ` `تُرَٰبًۢا` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 79:5 | 6 | 1 | `فَٱلْمُدَبِّرَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 79:13 | 6 | 1 | `وَٰحِدَةٌ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 79:15 | 6 | 1 | `أَتَىٰكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 79:24 | 6 | 1 | `أَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 79:26 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 79:27 | 6 | 1 | `بَنَىٰهَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 79:29 | 6 | 1 | `ضُحَىٰهَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 79:30 | 6 | 2 | `ذَٰلِكَ` `دَحَىٰهَآ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 79:31 | 6 | 1 | `وَمَرْعَىٰهَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 79:32 | 6 | 1 | `أَرْسَىٰهَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 79:38 | 6 | 1 | `ٱلْحَيَوٰةَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 79:42 | 6 | 2 | `يَسْـَٔلُونَكَ` `مُرْسَىٰهَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 79:44 | 6 | 1 | `مُنتَهَىٰهَآ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 79:45 | 6 | 1 | `يَخْشَىٰهَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 79:46 | 6 | 1 | `ضُحَىٰهَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 80:2 | 7 | 1 | `جَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 80:8 | 7 | 1 | `جَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 80:12 | 7 | 1 | `شَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 80:14 | 6 | 1 | `مُّطَهَّرَةٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 80:16 | 6 | 1 | `كِرَامٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 80:29 | 6 | 1 | `وَنَخْلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 80:37 | 6 | 1 | `ٱمْرِئٍ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 81:9 | 7 | 1 | `بٍ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 81:14 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 81:28 | 7 | 1 | `شَ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 82:19 | 6 | 2 | `شَيْـًٔا ۖ` `لِّلَّهِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 83:17 | 7 | 1 | `تُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 83:26 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 84:14 | 7 | 1 | `لَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 84:25 | 6 | 1 | `مَمْنُونٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 85:9 | 6 | 1 | `ٱلسَّمَـٰوَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 85:11 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 85:17 | 6 | 1 | `أَتَىٰكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 85:20 | 6 | 1 | `مُّحِيطٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 85:22 | 6 | 1 | `مَّحْفُوظٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 86:6 | 7 | 1 | `مَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 86:17 | 6 | 1 | `رُوَيْدًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 87:16 | 6 | 1 | `ٱلْحَيَوٰةَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 87:19 | 6 | 1 | `إِبْرَٰهِيمَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 88:1 | 6 | 1 | `أَتَىٰكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 88:7 | 7 | 1 | `جُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 89:5 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 89:15 | 6 | 1 | `ٱبْتَلَىٰهُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 89:16 | 6, 7 | 2 | `مَّ` `ٱبْتَلَىٰهُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.; Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 89:19 | 6 | 1 | `أَكْلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 89:23 | 6 | 1 | `يَوْمَئِذٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 90:2 | 6 | 1 | `حِلٌّۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 90:5 | 7 | 1 | `لَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 90:6 | 6 | 1 | `مَالًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 90:19 | 6 | 2 | `بِـَٔايَـٰتِنَا` `ٱلْمَشْـَٔمَةِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 90:20 | 6 | 1 | `مُّؤْصَدَةٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 91:1 | 6 | 1 | `وَضُحَىٰهَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 91:2 | 6 | 1 | `تَلَىٰهَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 91:3 | 6 | 1 | `جَلَّىٰهَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 91:4 | 6 | 1 | `يَغْشَىٰهَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 91:5 | 6 | 1 | `بَنَىٰهَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 91:6 | 6 | 1 | `طَحَىٰهَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 91:9 | 6 | 1 | `زَكَّىٰهَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 91:10 | 6 | 1 | `دَسَّىٰهَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 91:12 | 6 | 1 | `أَشْقَىٰهَا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 92:15 | 6 | 1 | `يَصْلَىٰهَآ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 93:6 | 6 | 1 | `فَـَٔاوَىٰ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 93:7 | 6 | 1 | `ضَآلًّا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 93:8 | 6 | 1 | `عَآئِلًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 96:15 | 6 | 1 | `لَنَسْفَعًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 97:1 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 98:5 | 6 | 3 | `ٱلصَّلَوٰةَ` `ٱلزَّكَوٰةَ ۚ` `وَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 98:8 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 100:3 | 6 | 1 | `فَٱلْمُغِيرَٰتِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 100:7 | 6 | 1 | `ذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 100:11 | 6 | 1 | `لَّخَبِيرٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 101:5 | 7 | 1 | `فُ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 101:6 | 6 | 1 | `مَوَٰزِينُهُۥ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 101:8 | 6 | 1 | `مَوَٰزِينُهُۥ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 101:11 | 6 | 1 | `حَامِيَةٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 102:1 | 6 | 1 | `أَلْهَىٰكُمُ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 102:8 | 6 | 1 | `لَتُسْـَٔلُنَّ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 104:2 | 6 | 1 | `مَالًا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 104:7 | 6 | 1 | `ٱلْأَفْـِٔدَةِ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 104:9 | 6 | 1 | `مُّمَدَّدَةٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 105:5 | 6 | 1 | `مَّأْكُولٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 106:4 | 6 | 1 | `خَوْفٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 107:2 | 6 | 1 | `فَذَٰلِكَ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 108:1 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 109:4 | 6 | 1 | `أَنَا۠` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 110:3 | 6 | 1 | `تَوَّابًۢا` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 111:5 | 6 | 1 | `مَّسَدٍۭ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 112:4 | 6 | 1 | `أَحَدٌۢ` | Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir. |
| 114:1 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 114:2 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 114:3 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 114:4 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 114:5 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
| 114:6 | 7 | 1 | `نَّ` | Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır. |
