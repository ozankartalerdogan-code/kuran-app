# 14 Ayetlik Tecvid Karar İncelemesi

Bu rapor `tajweed-actionable-review.md/.json`, `tajweed-diff-root-causes.md` ve `docs/TAJWEED_MUSHAF_RENDER_ARCHITECTURE.md` tamamen okunarak; 14 ayetin immutable Tanzil metni, `data/app.db` içindeki eski `arabic_tajweed` markup'ı ve `data/generated/quran/tajweed-spans.json` final span'leri salt okunur yeniden karşılaştırılarak hazırlanmıştır.

Harici kaynak yalnız çapraz kontrol kanıtıdır. Bu rapor hiçbir span'i eklemez, silmez veya doğru ilan etmez. Aralıklar yarı açık `[start,end)` biçimindedir. İncelenen 14 token yalnız BMP karakterlerinden oluştuğu için gösterilen code-point ve UTF-16 sayıları numerik olarak aynıdır; bu, genel sistemde iki koordinat türünün eşdeğer olduğu anlamına gelmez.

## Sonuç özeti

| Karar | Ayet |
|---|---:|
| mevcut span zaten doğru | 0 |
| güvenle renksiz bırakılmalı | 0 |
| hizalayıcı geliştirilebilir | 8 |
| veriye hedefli span eklenmesi değerlendirilmeli | 0 |
| ilmî/tecvid doğrulaması gerekli | 6 |

Hizalayıcı geliştirilebilir: **5:3, 10:15, 18:63, 28:30, 35:43, 42:51, 43:58, 56:23**.  
İlmî doğrulama gerekli: **7:46, 24:11, 52:21, 70:38, 74:52, 80:37**.

Karar eşiği şudur: eski kuralın taşıdığı grapheme canonical tarafta birebir aynıysa veya gereken eşdeğerlik mevcut kodda zaten tanımlıysa teknik iyileştirme önerildi. Kural taşıyan grapheme'in kendisi yeni bir hamza/tenvin/topoloji eşdeğerliği gerektiriyorsa ilmî doğrulama istendi. “Hizalayıcı geliştirilebilir” kararı, dış kaynaktaki kuralın doğru olduğunu veya otomatik olarak final veriye alınabileceğini söylemez.

Repo içindeki kural adları `scripts/_build-tajweed.mjs:20` tablosundan alınmıştır: `a` İhfâ Şefevî, `f/i` İhfâ, `h` Hemze-i Vasl (sessiz), `l` Şemsî Lâm (sessiz), `n` Tabii Med (2), `u` İdgâm (ğunneli).

## Grup A — Kural taşımayan kaynak gürültüsü; kural cluster'ları ayrıştırılabilir

### 5:3 — hizalayıcı geliştirilebilir

- Tam canonical Tanzil metni: `حُرِّمَتْ عَلَيْكُمُ ٱلْمَيْتَةُ وَٱلدَّمُ وَلَحْمُ ٱلْخِنزِيرِ وَمَآ أُهِلَّ لِغَيْرِ ٱللَّهِ بِهِۦ وَٱلْمُنْخَنِقَةُ وَٱلْمَوْقُوذَةُ وَٱلْمُتَرَدِّيَةُ وَٱلنَّطِيحَةُ وَمَآ أَكَلَ ٱلسَّبُعُ إِلَّا مَا ذَكَّيْتُمْ وَمَا ذُبِحَ عَلَى ٱلنُّصُبِ وَأَن تَسْتَقْسِمُوا۟ بِٱلْأَزْلَـٰمِ ۚ ذَٰلِكُمْ فِسْقٌ ۗ ٱلْيَوْمَ يَئِسَ ٱلَّذِينَ كَفَرُوا۟ مِن دِينِكُمْ فَلَا تَخْشَوْهُمْ وَٱخْشَوْنِ ۚ ٱلْيَوْمَ أَكْمَلْتُ لَكُمْ دِينَكُمْ وَأَتْمَمْتُ عَلَيْكُمْ نِعْمَتِى وَرَضِيتُ لَكُمُ ٱلْإِسْلَـٰمَ دِينًا ۚ فَمَنِ ٱضْطُرَّ فِى مَخْمَصَةٍ غَيْرَ مُتَجَانِفٍ لِّإِثْمٍ ۙ فَإِنَّ ٱللَّهَ غَفُورٌ رَّحِيمٌ`
- Sorunlu canonical / eski kaynak: `لِّإِثْمٍ ۙ` / `لِّإٍِثْمٍۙ`.
- Aralıklar: canonical CP/UTF-16 **[552,563)**; kaynak CP/UTF-16 **[552,564)**. Ayet uzunluğu 596 CP / 596 UTF-16.
- Kaynak kuralları: `u` (`لِّ`, kaynak [552,555)); `f` (`مٍۙ`, kaynak [560,564)). Final span: **uncolored**, overlap `[]`.
- İlgili cluster'lar: canonical `لِّ` = U+0644 U+0651 U+0650; kaynak `لِّ` = U+0644 U+0650 U+0651. Canonical `إِ` = U+0625 U+0650; kaynak `إٍِ` = U+0625 **U+064D** U+0650. Canonical `مٍ` + ` ۙ`; kaynak `مٍ` + U+200C + U+06D9.
- Kesin kök neden: kural taşımayan fazladan U+064D ve separator/mark yazımı token key'ini bozar. `alignTajweedSpans()` token uyuşmazlığında tüm tokenı bırakınca ayrı eşlenebilir `u` ve `f` cluster'ları da kaybolur.
- Aynı kök neden: audit'te başka ayet yok.
- Karar gerekçesi: kural taşımayan ek karakter unmatched bırakılıp yalnız birebir/NFD-eşlenebilir kural cluster'ları bağlanabilir. Otomatik span yazımı yine yasaktır.

### 18:63 — hizalayıcı geliştirilebilir

- Tam canonical Tanzil metni: `قَالَ أَرَءَيْتَ إِذْ أَوَيْنَآ إِلَى ٱلصَّخْرَةِ فَإِنِّى نَسِيتُ ٱلْحُوتَ وَمَآ أَنسَىٰنِيهُ إِلَّا ٱلشَّيْطَـٰنُ أَنْ أَذْكُرَهُۥ ۚ وَٱتَّخَذَ سَبِيلَهُۥ فِى ٱلْبَحْرِ عَجَبًا`
- Sorunlu canonical / eski kaynak: `أَنسَىٰنِيهُ` / `أَنْسَـٰنِيهُ`.
- Aralıklar: canonical CP/UTF-16 **[84,96)**; kaynak CP/UTF-16 **[84,97)**. Ayet uzunluğu 180/180.
- Kaynak kuralı: `n` (`ـٰ`, kaynak [90,92)). Final span: **uncolored**, overlap `[]`.
- İlgili cluster'lar: canonical `ن` [86,87) = U+0646; kaynak `نْ` [86,88) = U+0646 U+0652. Canonical `ىٰ` [89,91) = U+0649 U+0670; kaynak `ـٰ` [90,92) = U+0640 U+0670, `n`.
- Kesin kök neden: kaynakta kural taşımayan ek sukun vardır. `orthographicText()` tatweel ve dagger-alif seat farkını zaten kontrollü normalize eder; ek sukun nedeniyle bütün token reddedilir.
- Aynı kök neden: audit'te başka ayet yok.
- Karar gerekçesi: mevcut orthographic seat politikasını değiştirmeden ek sukun unmatched bırakılabilir; `n` yalnız doğrulanmış dagger-alif cluster'ına bağlanabilir.

## Grup B — Son hamza-seat cluster'ı kural taşımıyor; önceki kural cluster'ları birebir

Bu dört ayette ortak fark canonical `ئِ` (U+0626 U+0650) ile eski kaynaktaki `ىِٕ` (U+0649 U+0655 U+0650) arasındadır. Bu son cluster'a yeni eşdeğerlik verilmesi önerilmez. Teknik öneri, yalnız daha önceki birebir cluster'ları map edip son cluster'ı renksiz bırakabilen partial-token eşlemedir.

### 10:15 — hizalayıcı geliştirilebilir

- Tam canonical Tanzil metni: `وَإِذَا تُتْلَىٰ عَلَيْهِمْ ءَايَاتُنَا بَيِّنَـٰتٍ ۙ قَالَ ٱلَّذِينَ لَا يَرْجُونَ لِقَآءَنَا ٱئْتِ بِقُرْءَانٍ غَيْرِ هَـٰذَآ أَوْ بَدِّلْهُ ۚ قُلْ مَا يَكُونُ لِىٓ أَنْ أُبَدِّلَهُۥ مِن تِلْقَآئِ نَفْسِىٓ ۖ إِنْ أَتَّبِعُ إِلَّا مَا يُوحَىٰٓ إِلَىَّ ۖ إِنِّىٓ أَخَافُ إِنْ عَصَيْتُ رَبِّى عَذَابَ يَوْمٍ عَظِيمٍ`
- Sorunlu canonical / kaynak: `تِلْقَآئِ` / `تِلْقَآىِٕ`.
- Aralıklar: canonical **[191,201)** CP/UTF-16; kaynak **[191,202)**. Ayet 317/317.
- Kaynak kuralı: `f`, birebir `تِ` [191,193). Final span uncolored, overlap `[]`.
- İlgili cluster: canonical `ئِ` [199,201) U+0626 U+0650; kaynak `ىِٕ` [199,202) U+0649 U+0655 U+0650. Farklı cluster kural taşımıyor.
- Kesin neden/karar: token sonundaki kural taşımayan fark, baştaki birebir `f` cluster'ını da düşürüyor; partial-token eşleme geliştirilebilir.
- Aynı kök neden: 28:30, 35:43, 42:51.

### 28:30 — hizalayıcı geliştirilebilir

- Tam canonical Tanzil metni: `فَلَمَّآ أَتَىٰهَا نُودِىَ مِن شَـٰطِئِ ٱلْوَادِ ٱلْأَيْمَنِ فِى ٱلْبُقْعَةِ ٱلْمُبَـٰرَكَةِ مِنَ ٱلشَّجَرَةِ أَن يَـٰمُوسَىٰٓ إِنِّىٓ أَنَا ٱللَّهُ رَبُّ ٱلْعَـٰلَمِينَ`
- Sorunlu canonical / kaynak: `شَـٰطِئِ` / `شَـٰطِىِٕ`.
- Aralıklar: canonical **[32,40)** CP/UTF-16; kaynak **[32,41)**. Ayet 170/170.
- Kaynak kuralları: `f` (`شَ`, [32,34)); `n` (`ـٰ`, [34,36)). Final span uncolored, overlap `[]`.
- İlgili fark: canonical `ئِ` [38,40) U+0626 U+0650; kaynak `ىِٕ` [38,41) U+0649 U+0655 U+0650; bu cluster kural taşımıyor.
- Kesin neden/karar: birebir `شَ` ve `ـٰ` cluster'ları map edilip farklı son cluster renksiz bırakılabilir.
- Aynı kök neden: 10:15, 35:43, 42:51.

### 35:43 — hizalayıcı geliştirilebilir

- Tam canonical Tanzil metni: `ٱسْتِكْبَارًا فِى ٱلْأَرْضِ وَمَكْرَ ٱلسَّيِّئِ ۚ وَلَا يَحِيقُ ٱلْمَكْرُ ٱلسَّيِّئُ إِلَّا بِأَهْلِهِۦ ۚ فَهَلْ يَنظُرُونَ إِلَّا سُنَّتَ ٱلْأَوَّلِينَ ۚ فَلَن تَجِدَ لِسُنَّتِ ٱللَّهِ تَبْدِيلًا ۖ وَلَن تَجِدَ لِسُنَّتِ ٱللَّهِ تَحْوِيلًا`
- Sorunlu canonical / kaynak: `ٱلسَّيِّئِ ۚ` / `ٱلسَّيِّىِٕۚ`.
- Aralıklar: iki tarafta **[37,49)** CP/UTF-16. Ayet 240/240.
- Kaynak kuralları: `h` (`ٱ`, [37,38)); `l` (`ل`, [38,39)). Final span uncolored, overlap `[]`.
- İlgili fark: canonical `ئِ` [45,47) U+0626 U+0650 ve ` ۚ` [47,49) U+0020 U+06DA; kaynak `ىِٕۚ` [45,49) U+0649 U+0655 U+0650 U+06DA. Farklı bölüm kural taşımıyor.
- Kesin neden/karar: birebir `h/l` prefix cluster'ları ayrıştırılabilir; son cluster renksiz kalmalıdır.
- Aynı kök neden: 10:15, 28:30, 42:51.

### 42:51 — hizalayıcı geliştirilebilir

- Tam canonical Tanzil metni: `۞ وَمَا كَانَ لِبَشَرٍ أَن يُكَلِّمَهُ ٱللَّهُ إِلَّا وَحْيًا أَوْ مِن وَرَآئِ حِجَابٍ أَوْ يُرْسِلَ رَسُولًا فَيُوحِىَ بِإِذْنِهِۦ مَا يَشَآءُ ۚ إِنَّهُۥ عَلِىٌّ حَكِيمٌ`
- Sorunlu canonical / kaynak: `وَرَآئِ` / `وَرَآىِٕ`.
- Aralıklar: canonical **[71,79)** CP/UTF-16; kaynak **[71,80)**. Ayet 172/172.
- Kaynak kuralı: `a`, birebir `وَ` [71,73). Final span uncolored, overlap `[]`.
- İlgili fark: canonical `ئِ` [77,79) U+0626 U+0650; kaynak `ىِٕ` [77,80) U+0649 U+0655 U+0650. Farklı bölüm kural taşımıyor.
- Kesin neden/karar: birebir ilk cluster map edilebilir; final hamza-seat cluster'ı renksiz bırakılmalıdır.
- Aynı kök neden: 10:15, 28:30, 35:43.

### 56:23 — hizalayıcı geliştirilebilir

- Tam canonical Tanzil metni: `كَأَمْثَـٰلِ ٱللُّؤْلُؤِ ٱلْمَكْنُونِ`
- Sorunlu canonical / kaynak: `ٱللُّؤْلُؤِ` / `ٱللُّؤْلُوِٕ`.
- Aralıklar: canonical **[13,24)** CP/UTF-16; kaynak **[13,25)**. Ayet 37/37.
- Kaynak kuralları: `h` (`ٱ`, [13,14)); `l` (`ل`, [14,15)). Final span uncolored, overlap `[]`.
- İlgili fark: canonical `ؤِ` [22,24) U+0624 U+0650; kaynak `وِٕ` [22,25) U+0648 U+0655 U+0650. Farklı son cluster kural taşımıyor.
- Kesin neden/karar: birebir `h/l` prefix cluster'ları map edilebilir; son cluster'a kural taşınmaz.
- Aynı kök neden: aynı imza başka ayette yok; teknik çözüm deseni 10:15/28:30/35:43/42:51 ile aynıdır.

## Grup C — Mevcut U+0672 eşdeğerliği cluster şekline yetmiyor

### 43:58 — hizalayıcı geliştirilebilir

- Tam canonical Tanzil metni: `وَقَالُوٓا۟ ءَأَـٰلِهَتُنَا خَيْرٌ أَمْ هُوَ ۚ مَا ضَرَبُوهُ لَكَ إِلَّا جَدَلًۢا ۚ بَلْ هُمْ قَوْمٌ خَصِمُونَ`
- Sorunlu canonical / kaynak: `ءَأَـٰلِهَتُنَا` / `ءَأَٲلِهَتُنَا`.
- Aralıklar: canonical **[12,27)** CP/UTF-16; kaynak **[12,26)**. Ayet 110/110.
- Kaynak kuralı: `n`, kaynak `أَ` [14,16) ve `ٲ` [16,17). Final span uncolored, overlap `[]`.
- İlgili cluster'lar: canonical `أَ` [14,16) U+0623 U+064E + `ـٰ` [16,18) U+0640 U+0670; kaynak `أَ` [14,16) + `ٲ` [16,17) U+0672.
- Kesin kök neden: `matchingChar()` U+0672→U+0670 eşdeğerliğini zaten içerir, fakat canonical 2-code-point `ـٰ` ile kaynak 1-code-point `ٲ` farklı cluster sayısı/şekli ürettiği için equality aşaması tokenı reddeder.
- Aynı kök neden: audit'te başka ayet yok.
- Karar gerekçesi: yeni tecvid hükmü seçmeden mevcut eşdeğerliğin cluster şekline kontrollü genişletilmesi test edilebilir.

## Grup D — Kural taşıyan grapheme'in kendisi doğrulanmamış biçimde farklı

### 7:46 — ilmî/tecvid doğrulaması gerekli

- Tam canonical Tanzil metni: `وَبَيْنَهُمَا حِجَابٌ ۚ وَعَلَى ٱلْأَعْرَافِ رِجَالٌ يَعْرِفُونَ كُلًّۢا بِسِيمَىٰهُمْ ۚ وَنَادَوْا۟ أَصْحَـٰبَ ٱلْجَنَّةِ أَن سَلَـٰمٌ عَلَيْكُمْ ۚ لَمْ يَدْخُلُوهَا وَهُمْ يَطْمَعُونَ`
- Sorunlu canonical / kaynak: `كُلًّۢا` / `كُلاَّۢ`; iki taraf **[65,72)** CP/UTF-16; ayet 185/185.
- Kaynak kuralı: `i`, kaynak `اَّۢ` [68,72). Final span uncolored, overlap `[]`.
- İlgili grapheme'ler: canonical `لًّۢ` [67,71) U+0644 U+0651 U+064B U+06E2 + `ا` [71,72); kaynak `ل` [67,68) + kural taşıyan `اَّۢ` U+0627 U+0651 U+064E U+06E2.
- Kesin neden: kaynakta tek kural cluster'ı canonical tarafta iki grapheme'e yeniden dağılmıştır. Hangi canonical grapheme/range'in `i` taşıyacağı Unicode normalizasyonuyla belirlenemez.
- Aynı kök neden: yok. Karar: hedefli span veya 1→2 eşdeğerlik öncesinde ilmî doğrulama.

### 24:11, 70:38, 74:52, 80:37 — ilmî/tecvid doğrulaması gerekli

Bu dört ayette aynı token ve aynı kök neden vardır: canonical `ٱمْرِئٍ`, kaynak `ٱمْرِىٍٕ`. Başlangıç `ٱ` cluster'ındaki `h` birebir eşleşir; fakat `a` doğrudan farklı son grapheme üzerindedir.

| Ayet | Tam canonical Tanzil metni | Canonical/kaynak aralık | Kural cluster'ı |
|---|---|---|---|
| 24:11 | `إِنَّ ٱلَّذِينَ جَآءُو بِٱلْإِفْكِ عُصْبَةٌ مِّنكُمْ ۚ لَا تَحْسَبُوهُ شَرًّا لَّكُم ۖ بَلْ هُوَ خَيْرٌ لَّكُمْ ۚ لِكُلِّ ٱمْرِئٍ مِّنْهُم مَّا ٱكْتَسَبَ مِنَ ٱلْإِثْمِ ۚ وَٱلَّذِى تَوَلَّىٰ كِبْرَهُۥ مِنْهُمْ لَهُۥ عَذَابٌ عَظِيمٌ` | [123,130) / [123,131) | `h`: ٱ [123,124); `a`: ىٍٕ [128,131) |
| 70:38 | `أَيَطْمَعُ كُلُّ ٱمْرِئٍ مِّنْهُمْ أَن يُدْخَلَ جَنَّةَ نَعِيمٍ` | [17,24) / [17,25) | `h`: ٱ [17,18); `a`: ىٍٕ [22,25) |
| 74:52 | `بَلْ يُرِيدُ كُلُّ ٱمْرِئٍ مِّنْهُمْ أَن يُؤْتَىٰ صُحُفًا مُّنَشَّرَةً` | [19,26) / [19,27) | `h`: ٱ [19,20); `a`: ىٍٕ [24,27) |
| 80:37 | `لِكُلِّ ٱمْرِئٍ مِّنْهُمْ يَوْمَئِذٍ شَأْنٌ يُغْنِيهِ` | [8,15) / [8,16) | `h`: ٱ [8,9); `a`: ىٍٕ [13,16) |

- Ayet uzunlukları sırasıyla 232/232, 63/63, 70/70, 53/53 CP/UTF-16'dır.
- İlgili canonical cluster: `ئٍ` = U+0626 U+064D. Kaynak cluster: `ىٍٕ` = U+0649 U+0655 U+064D, `a`.
- Final durum: dört ayette de sorunlu token tamamen uncolored; overlapping final span `[]`.
- Kesin kök neden: kural taşıyan kaynak cluster hamza seat/yönü bakımından canonical cluster ile mevcut doğrulanmış eşdeğerliklerde bağlanmaz. Bu, salt yazım normalizasyonu değildir.
- Aynı kök neden: dört ayetin tamamında görülür.
- Karar gerekçesi: `h` teknik olarak ayrıştırılabilse de ayet düzeyindeki unresolved `a` için canonical hedef seçimi ilmî teyit gerektirir; dış kaynak tek başına hedefli span ekleme kanıtı değildir.

### 52:21 — ilmî/tecvid doğrulaması gerekli

- Tam canonical Tanzil metni: `وَٱلَّذِينَ ءَامَنُوا۟ وَٱتَّبَعَتْهُمْ ذُرِّيَّتُهُم بِإِيمَـٰنٍ أَلْحَقْنَا بِهِمْ ذُرِّيَّتَهُمْ وَمَآ أَلَتْنَـٰهُم مِّنْ عَمَلِهِم مِّن شَىْءٍ ۚ كُلُّ ٱمْرِئٍۭ بِمَا كَسَبَ رَهِينٌ`
- Sorunlu canonical / kaynak: `ٱمْرِئٍۭ` / `ٱمْرِىِٕۭ`.
- Aralıklar: canonical **[157,165)** CP/UTF-16; kaynak **[157,166)**. Ayet 186/186.
- Kaynak kuralları: `h` (`ٱ`, [157,158)); `i` (`ىِٕۭ`, [162,166)). Final span uncolored, overlap `[]`.
- İlgili cluster'lar: canonical `ئٍۭ` = U+0626 U+064D U+06ED; kaynak `ىِٕۭ` = U+0649 U+0655 U+0650 U+06ED.
- Kesin kök neden: kural taşıyan cluster'da hem hamza seat/yönü hem U+064D tanvin-kasra ↔ U+0650 kasra yazımı değişir. Bu kombinasyon mevcut eşdeğerliklerde yoktur.
- Aynı kök neden: audit'te başka ayet yok.
- Karar gerekçesi: `i` kuralının canonical taşıyıcısı ilmî teyit olmadan belirlenemez; hedefli span değerlendirmesi bu teyitten sonra ayrı bir veri kararı olabilir.

## Kod ve audit kanıtı

- Eski markup gerçek üretim parser'ıyla okundu: `scripts/build-quran-runtime.mjs:107` `parseTajweedMarkup()`.
- Üretim token/grapheme mantığı: `scripts/build-quran-runtime.mjs:159` `tokenize()`, `:229` `clustersFor()`.
- Mevcut eşdeğerlikler: `scripts/build-quran-runtime.mjs:174` `matchingChar()`; audit genişletmeleri `scripts/analyze-tajweed-actionable-review.mjs:152` `orthographicText()`.
- Whole-token kayıp nedeni: `scripts/build-quran-runtime.mjs:292-302`; token veya cluster anahtarı uyuşmazsa `continue` ile tokenın tamamı uncolored olur.
- Actionable sınıflandırma: `scripts/analyze-tajweed-actionable-review.mjs:225` `classifyUnmatchedToken()`.
- Kural adları: `scripts/_build-tajweed.mjs:20` `RULES`.
- Final otorite ve koordinat: `data/generated/quran/tajweed-spans.json:4`; 14 sorunlu canonical aralığın tamamında gerçek overlap sorgusu `[]` döndü.

Makine okunabilir tüm alanlar, her ayetin cluster/code-point dökümü ve karar grupları `tajweed-14-verse-review.json` içindedir.
