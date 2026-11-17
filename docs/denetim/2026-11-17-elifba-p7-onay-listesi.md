# Elif-Ba Paket 7 — 16 soruluk onay taslağı

1. Her soruda önce büyük Arapça metni ve Türkçe soruyu okuyun; Ders 8’de kaynaklı Arapça görsel olmadığı açıkça belirtilir.
2. ✅ işaretli cevap taslak anahtarıdır; kaynak satırına bakarak cevabı ve diğer şıkları tek tek değerlendirin.
3. “Türetilmiş — onay gerekli” okunuşlar kaynakta hazır Latin cevap değildir; gerekçesini ve EN karşılığını da inceleyin.
4. Uygunsa Onay kutusunu, değişiklik gerekiyorsa Düzelt kutusunu işaretleyip neyin değişeceğini yazın.
5. Kutular insan incelemesi içindir; JSON’daki tüm kayıtlar draft, reviewer/date boş kalır ve otomatik onay verilmez.

16 kayıt; Ders 2–9 için ikişer soru; quizId 100001–100016. Ders başlıkları node:sqlite DatabaseSync ile readOnly:true açılan data/app.db içindeki elifba_dersler.id/baslik alanlarından alındı. Dört soru tipi de temsil edilir. TR ve EN aynı sıradaki seçenekle aynı cevabı ölçer.

Soru cümleleri, ipuçları ve EN çeviriler editoryal taslaktır; kaynak alıntısı olarak sunulmaz. Latin harf adları ve işaret adları, kelime okunuşu şıkları değildir. Arapça metinler NFC eşdeğerliğiyle, hareke silinmeden doğrulandı; bağlantı çizgileri korundu. Tek source alanı ana kanıttır; tüm Arapça parçaların ayrı kaynakları aşağıdadır. Arapça içermeyen Ders 8 sorularında source yazılı tanıma gider, arabic boş dizedir.

## D2 · 1 · position — 2. KONU: HARFLERİN KELİME İÇİNDE YAZILIŞLARI

quizId: 100001 · key: p7-d2-1 · review.status: draft · reviewer: boş · date: boş

**Soru (TR):** Be harfinin iki yandan bağlanan orta biçimi hangisidir?

<div dir="rtl" lang="ar" style="font-size: 48px; line-height: 1.8;">ب</div>

- بـ
- ـبـ ✅
- ـب

**İpucu (TR):** Ortadaki biçimde harfin hem sağında hem solunda bağlantı çizgisi vardır.

**EN prompt:** Which is the medial form of Ba when joined on both sides?

- بـ
- ـبـ ✅
- ـب

**EN hint:** The medial form has a joining stroke on both the right and the left.

**Kanıt — her Arapça parça:**

- <span dir="rtl" lang="ar">ب</span> → `data/elifba_harfler.json:19`; kısa alıntı: “"tek_basina": "ب"”.
- <span dir="rtl" lang="ar">بـ</span> → `data/elifba_harfler.json:20`; kısa alıntı: “"basta": "بـ"”.
- <span dir="rtl" lang="ar">ـبـ</span> → `data/elifba_harfler.json:21`; kısa alıntı: “"ortada": "ـبـ"”.
- <span dir="rtl" lang="ar">ـب</span> → `data/elifba_harfler.json:22`; kısa alıntı: “"sonda": "ـب"”.

**Kural / bağlam kanıtı:**

- Ders konusu: data/app.db → elifba_dersler / id=2 / baslik.

**Türetilmiş kısımlar / inceleme notu:**

- Latin okunuş şıkkı yok; ek türetilmiş Arapça parça yok.

- [ ] Onay   - [ ] Düzelt: ______

## D2 · 2 · position — 2. KONU: HARFLERİN KELİME İÇİNDE YAZILIŞLARI

quizId: 100002 · key: p7-d2-2 · review.status: draft · reviewer: boş · date: boş

**Soru (TR):** Te harfinin önceki harfe bağlanan son biçimi hangisidir?

<div dir="rtl" lang="ar" style="font-size: 48px; line-height: 1.8;">ت</div>

- ـتـ
- تـ
- ـت ✅

**İpucu (TR):** Sondaki biçim sağdan önceki harfe bağlanır; solunda devam çizgisi bulunmaz.

**EN prompt:** Which is the final form of Ta when joined to the preceding letter?

- ـتـ
- تـ
- ـت ✅

**EN hint:** The final form joins to the preceding letter on the right, with no continuing stroke on the left.

**Kanıt — her Arapça parça:**

- <span dir="rtl" lang="ar">ت</span> → `data/elifba_harfler.json:32`; kısa alıntı: “"tek_basina": "ت"”.
- <span dir="rtl" lang="ar">ـتـ</span> → `data/elifba_harfler.json:34`; kısa alıntı: “"ortada": "ـتـ"”.
- <span dir="rtl" lang="ar">تـ</span> → `data/elifba_harfler.json:33`; kısa alıntı: “"basta": "تـ"”.
- <span dir="rtl" lang="ar">ـت</span> → `data/elifba_harfler.json:35`; kısa alıntı: “"sonda": "ـت"”.

**Türetilmiş kısımlar / inceleme notu:**

- Latin okunuş şıkkı yok; ek türetilmiş Arapça parça yok.

- [ ] Onay   - [ ] Düzelt: ______

## D3 · 1 · mark — 3. KONU: HAREKELER

quizId: 100003 · key: p7-d3-1 · review.status: draft · reviewer: boş · date: boş

**Soru (TR):** İlk harf olan Ra üzerindeki harekenin adı nedir?

<div dir="rtl" lang="ar" style="font-size: 48px; line-height: 1.8;">رَزَقَ</div>

- Üstün (fetha) ✅
- Esre (kesra)
- Ötre (damme)

**İpucu (TR):** Ra harfinin üstündeki kısa eğik çizgiye bak.

**EN prompt:** What is the vowel mark on the first letter, Ra?

- Fatha ✅
- Kasra
- Damma

**EN hint:** Look at the short slanting stroke above Ra.

**Kanıt — her Arapça parça:**

- <span dir="rtl" lang="ar">رَزَقَ</span> → `data/diyanetelifba.json:45`; kısa alıntı: “رَزَقَ | رَجَعَ | قَرَأَ | ضَرَبَ”.

**Kural / bağlam kanıtı:**

- data/diyanetelifba.json:39 — Bunlar, fetha (üstün), kesra (esre) ve damme (ötre) olarak isimlendirilir.

**Türetilmiş kısımlar / inceleme notu:**

- Latin okunuş şıkkı yok; ek türetilmiş Arapça parça yok.

- [ ] Onay   - [ ] Düzelt: ______

## D3 · 2 · mark — 3. KONU: HAREKELER

quizId: 100004 · key: p7-d3-2 · review.status: draft · reviewer: boş · date: boş

**Soru (TR):** Ortadaki He harfinin altındaki harekenin adı nedir?

<div dir="rtl" lang="ar" style="font-size: 48px; line-height: 1.8;">شَهِدَ</div>

- Ötre (damme)
- Esre (kesra) ✅
- Üstün (fetha)

**İpucu (TR):** Ortadaki harfin altındaki kısa çizgi esredir.

**EN prompt:** What is the vowel mark below the middle letter, Ha?

- Damma
- Kasra ✅
- Fatha

**EN hint:** The short stroke below the middle letter is kasra.

**Kanıt — her Arapça parça:**

- <span dir="rtl" lang="ar">شَهِدَ</span> → `data/diyanetelifba.json:45`; kısa alıntı: “شَهِدَ | عَمِلَ | سَمِعَ | حَمَدَ”.

**Kural / bağlam kanıtı:**

- data/diyanetelifba.json:39 — fetha (üstün), kesra (esre) ve damme (ötre)

**Türetilmiş kısımlar / inceleme notu:**

- Harf adı notu: Buradaki He, data/elifba_harfler.json:342 satırındaki He adlandırmasıdır; Latin ad tek başına mahreci göstermez.

- [ ] Onay   - [ ] Düzelt: ______

## D4 · 1 · reading — 4. KONU: CEZM

quizId: 100005 · key: p7-d4-1 · review.status: draft · reviewer: boş · date: boş

**Soru (TR):** Bu hece nasıl okunur?

<div dir="rtl" lang="ar" style="font-size: 48px; line-height: 1.8;">إِبْ</div>

- ib ✅
- eb
- bi

**İpucu (TR):** Türetilmiş — onay gerekli: ib / eb / bi seçeneklerinin hiçbiri bu heceye bağlı Latin cevap anahtarı değildir; baştaki esre i sesini verir, sondaki Be cezimli olduğu için yeni ünlü eklenmez.

**EN prompt:** How is this syllable read in the draft’s approximate Latin notation?

- ib ✅
- eb
- bi

**EN hint:** Derived — approval required: none of ib / eb / bi is a source-provided Latin answer key for this syllable; the initial kasra gives i, and the final Ba has sukun, so no new vowel is added.

**Kanıt — her Arapça parça:**

- <span dir="rtl" lang="ar">إِبْ</span> → `data/diyanetelifba.json:51`; kısa alıntı: “أَبْ إِبْ أُبْ”.

**Kural / bağlam kanıtı:**

- data/diyanetelifba.json:51 — Cezimli harf okunurken hareke sesi vermemeye dikkat edilmelidir.

**Türetilmiş kısımlar / inceleme notu:**

- **ib (doğru): türetilmiş — onay gerekli.** Baştaki esre i sesini verir ve cezimli Be ile birleşir.
- **eb (çeldirici): türetilmiş — onay gerekli.** Baştaki esre yerine üstün varmış gibi seslendirdiği için bu yazıma uymaz.
- **bi (çeldirici): türetilmiş — onay gerekli.** Ünlüyü sondaki cezimli Be’ye taşıdığı ve ses sırasını değiştirdiği için yanlıştır.
- TR ve EN aynı ib / eb / bi taslak gösterimini kullanır; bu gösterim ses kaydı veya ayrıntılı fonetik transkripsiyon değildir.

- [ ] Onay   - [ ] Düzelt: ______

## D4 · 2 · rule — 4. KONU: CEZM

quizId: 100006 · key: p7-d4-2 · review.status: draft · reviewer: boş · date: boş

**Soru (TR):** Sondaki Lam cezimli olduğu için nasıl okunur?

<div dir="rtl" lang="ar" style="font-size: 48px; line-height: 1.8;">قُلْ</div>

- Lamdan sonra yeni bir ünlü eklenmeden ✅
- Lama yeni bir esre sesi eklenerek
- Lam iki kez okunarak

**İpucu (TR):** Cezimli harf önceki harfin harekesiyle birleşir; kendisine yeni bir hareke sesi verilmez.

**EN prompt:** How is the final Lam read because it has sukun?

- Without adding a new vowel after Lam ✅
- By adding a new kasra vowel to Lam
- By pronouncing Lam twice

**EN hint:** A letter with sukun joins the preceding vowel; it is not given a new vowel of its own.

**Kanıt — her Arapça parça:**

- <span dir="rtl" lang="ar">قُلْ</span> → `data/diyanetelifba.json:57`; kısa alıntı: “قُلْ لَمْ هُمْ مِنْ”.

**Kural / bağlam kanıtı:**

- data/diyanetelifba.json:51 — Cezm, üzerinde bulunduğu harfi, kendinden önceki harfin harekesi ile birleştirir.

**Türetilmiş kısımlar / inceleme notu:**

- Latin okunuş şıkkı yok; ek türetilmiş Arapça parça yok.

- [ ] Onay   - [ ] Düzelt: ______

## D5 · 1 · mark — 5. KONU: ŞEDDE

quizId: 100007 · key: p7-d5-1 · review.status: draft · reviewer: boş · date: boş

**Soru (TR):** Nun üzerindeki, harfin tekrarını gösteren işaretin adı nedir?

<div dir="rtl" lang="ar" style="font-size: 48px; line-height: 1.8;">جَنَّةُ</div>

- Cezm
- Şedde ✅
- Tenvin

**İpucu (TR):** Nun üzerindeki küçük kıvrımlı işaret şeddedir.

**EN prompt:** What is the mark on Nun that indicates doubling the letter?

- Sukun
- Shadda ✅
- Tanwin

**EN hint:** The small curved mark above Nun is shadda.

**Kanıt — her Arapça parça:**

- <span dir="rtl" lang="ar">جَنَّةُ</span> → `data/diyanetelifba.json:69`; kısa alıntı: “جَنَّةُ نُسَبِّحُ يَظُنُّ نَزَّلَ”.

**Kural / bağlam kanıtı:**

- data/diyanetelifba.json:63 — Şedde, üzerinde bulunduğu harfi bir önceki harf ile birleştirir ve harekesiyle tekrar okutur.

**Türetilmiş kısımlar / inceleme notu:**

- Latin okunuş şıkkı yok; ek türetilmiş Arapça parça yok.

- [ ] Onay   - [ ] Düzelt: ______

## D5 · 2 · rule — 5. KONU: ŞEDDE

quizId: 100008 · key: p7-d5-2 · review.status: draft · reviewer: boş · date: boş

**Soru (TR):** Şeddeli Kaf nasıl okunur?

<div dir="rtl" lang="ar" style="font-size: 48px; line-height: 1.8;">حَقَّ</div>

- Tek bir kısa harf gibi
- İlki cezimli, ikincisi harekeli iki aynı harf gibi ✅
- Kaf tamamen atlanarak

**İpucu (TR):** Şedde, harfi önceki sesle birleştirir ve kendi harekesiyle tekrar okutur.

**EN prompt:** How is the Qaf with shadda pronounced?

- As a single short consonant
- As two identical consonants, the first with sukun and the second with a vowel ✅
- By omitting Qaf entirely

**EN hint:** Shadda joins the letter to the preceding sound and repeats it with its own vowel.

**Kanıt — her Arapça parça:**

- <span dir="rtl" lang="ar">حَقَّ</span> → `data/diyanetelifba.json:69`; kısa alıntı: “كُلُّ حَقَّ عَلَّمَ زَيَّنَ”.

**Kural / bağlam kanıtı:**

- data/diyanetelifba.json:63 — Şedde, üzerinde bulunduğu harfi bir önceki harf ile birleştirir ve harekesiyle tekrar okutur.

**Türetilmiş kısımlar / inceleme notu:**

- Kuralın iki harfle açıklanması pedagojik açımlamadır; kaynakta kelimenin Latin okunuşu verilmemiştir ve burada Latin okunuş sorulmaz.

- [ ] Onay   - [ ] Düzelt: ______

## D6 · 1 · rule — 6. KONU: MED HARFLERİ

quizId: 100009 · key: p7-d6-1 · review.status: draft · reviewer: boş · date: boş

**Soru (TR):** Bu kelimede Kafın üstün sesini uzatan med harfi hangisidir?

<div dir="rtl" lang="ar" style="font-size: 48px; line-height: 1.8;">قَالَ</div>

- Elif ✅
- Vav
- Ye

**İpucu (TR):** Üstünlü Kafın ardından harekesiz Elif gelir.

**EN prompt:** Which madd letter lengthens the fatha vowel of Qaf in this word?

- Alif ✅
- Waw
- Ya

**EN hint:** Qaf with fatha is followed by an Alif without a vowel mark.

**Kanıt — her Arapça parça:**

- <span dir="rtl" lang="ar">قَالَ</span> → `data/diyanetelifba.json:81`; kısa alıntı: “قَالَ كَانَ كِتَابٌ جَوَابٌ”.

**Kural / bağlam kanıtı:**

- data/diyanetelifba.json:75 — Med, uzatarak okumak demektir.

**Türetilmiş kısımlar / inceleme notu:**

- Cevap, kaynaklı kelimedeki üstün + Elif düzeninin kural yorumudur; insan onayı gereklidir. Elif/Vav/Ye seçenekleri harf adlarıdır, kelimenin Latin okunuşu değildir.

- [ ] Onay   - [ ] Düzelt: ______

## D6 · 2 · rule — 6. KONU: MED HARFLERİ

quizId: 100010 · key: p7-d6-2 · review.status: draft · reviewer: boş · date: boş

**Soru (TR):** Bu kelimedeki Vav med harfi görevi yapar mı?

<div dir="rtl" lang="ar" style="font-size: 48px; line-height: 1.8;">يَوْمَ</div>

- Evet; önceki sesi med ile uzatır
- Hayır; önceki harf üstünlü, Vav cezimlidir ✅

**İpucu (TR):** Vavın med olması için önceki harfin ötreli olması gerekir; burada önceki harf üstünlüdür.

**EN prompt:** Does Waw function as a madd letter in this word?

- Yes; it lengthens the preceding vowel as madd
- No; the preceding letter has fatha and Waw has sukun ✅

**EN hint:** For Waw to function as a madd letter, the preceding letter must have damma; here it has fatha.

**Kanıt — her Arapça parça:**

- <span dir="rtl" lang="ar">يَوْمَ</span> → `data/diyanetelifba.json:57`; kısa alıntı: “قَبْلَ يَوْمَ كَيْفَ لَكُمْ”.

**Kural / bağlam kanıtı:**

- data/diyanetelifba.json:75 — kendinden önceki harfin sesini, harekesi doğrultusunda uzatarak
- docs/denetim/2026-11-17-elifba-dogrulama-ve-paketler.md:188 — Cezm Vav üzerinde; med Vavı diye sınıflandırılamaz.

**Türetilmiş kısımlar / inceleme notu:**

- **Kural yorumu — onay gerekli.** Önceki hareke üstün olduğu için bu Vav med Vavı değildir; yalnız Vav bulunmasına bakılarak uzatma kararı verilmez. Örnek cezm sayfasından alınmıştır; soru Ders 6’nın med koşulunu ölçer.

- [ ] Onay   - [ ] Düzelt: ______

## D7 · 1 · mark — 7. KONU: TENVİN

quizId: 100011 · key: p7-d7-1 · review.status: draft · reviewer: boş · date: boş

**Soru (TR):** Sondaki Dal üzerindeki tenvinin adı nedir?

<div dir="rtl" lang="ar" style="font-size: 48px; line-height: 1.8;">أَحَدٌ</div>

- İki üstün
- İki esre
- İki ötre ✅

**İpucu (TR):** Son harfin üstünde çift ötre bulunur; soru yalnız işaretin adını sorar.

**EN prompt:** What is the tanwin mark on the final Dal called?

- Fathatan (double fatha)
- Kasratan (double kasra)
- Dammatan (double damma) ✅

**EN hint:** There is a double damma above the final letter; this question asks only for the mark’s name.

**Kanıt — her Arapça parça:**

- <span dir="rtl" lang="ar">أَحَدٌ</span> → `data/diyanetelifba.json:93`; kısa alıntı: “أَحَدٌ رُسُلٌ كِتَابٌ فِدْيَةٌ”.

**Kural / bağlam kanıtı:**

- data/diyanetelifba.json:87 — Tenvin; iki üstün, iki esre ve iki ötreye denir.
- Vakıfta sonun nasıl okunacağı sorulmaz; Latin son ek türetilmez.

**Türetilmiş kısımlar / inceleme notu:**

- Latin okunuş şıkkı yok; ek türetilmiş Arapça parça yok.

- [ ] Onay   - [ ] Düzelt: ______

## D7 · 2 · mark — 7. KONU: TENVİN

quizId: 100012 · key: p7-d7-2 · review.status: draft · reviewer: boş · date: boş

**Soru (TR):** Sondaki Dal altındaki tenvinin adı nedir?

<div dir="rtl" lang="ar" style="font-size: 48px; line-height: 1.8;">عَادٍ</div>

- İki esre ✅
- İki ötre
- İki üstün

**İpucu (TR):** Son harfin altında çift esre bulunur; soru yalnız işaretin adını sorar.

**EN prompt:** What is the tanwin mark below the final Dal called?

- Kasratan (double kasra) ✅
- Dammatan (double damma)
- Fathatan (double fatha)

**EN hint:** There is a double kasra below the final letter; this question asks only for the mark’s name.

**Kanıt — her Arapça parça:**

- <span dir="rtl" lang="ar">عَادٍ</span> → `data/diyanetelifba.json:93`; kısa alıntı: “عَادٍ أَجْرٍ سَفَرٍ أَيَّامٍ”.

**Kural / bağlam kanıtı:**

- data/diyanetelifba.json:87 — Tenvin; iki üstün, iki esre ve iki ötreye denir.
- Vakıfta sonun nasıl okunacağı sorulmaz; Latin son ek türetilmez.

**Türetilmiş kısımlar / inceleme notu:**

- Latin okunuş şıkkı yok; ek türetilmiş Arapça parça yok.

- [ ] Onay   - [ ] Düzelt: ______

## D8 · 1 · rule — 8. KONU: ASAR, MED ve KASR

quizId: 100013 · key: p7-d8-1 · review.status: draft · reviewer: boş · date: boş

**Soru (TR):** Kaynak açıklamasına göre kasr ne anlama gelir?

**Arapça görsel: kaynak yetersiz.** Bu sözlü kural sorusunda Arapça metin yok; `arabic: ""`.

- Uzatılmaz ✅
- İki kez okunur
- Her zaman uzatılır

**İpucu (TR):** Bu soru işaretin çizimini değil, kaynakta yazılı kasr tanımını sorar.

**EN prompt:** According to the source explanation, what does qasr mean?

- Do not lengthen ✅
- Pronounce twice
- Always lengthen

**EN hint:** This question asks about the written definition of qasr, rather than the shape of its sign.

**Kanıt — her Arapça parça:**

- Soruda ve şıklarda Arapça parça yoktur; tahmini işaret eklenmemiştir.

**Kural / bağlam kanıtı:**

- data/diyanetelifba.json:99 — Kasr (>): Uzatılmaz anlamına gelir.
- data/app.db → elifba_dersler / id=8 / icerik_json.aciklama: Kasr (>): Uzatılmaz anlamına gelir.; icerik_json.alistirma=null; icerik_json.ek_tablolar=[]

**Türetilmiş kısımlar / inceleme notu:**

- **Kaynak yetersiz: Arapça işaret/görsel örneği.** Med ve kasr aynı ASCII > ile aktarılmıştır; bu karakter Arapça işaret diye gösterilmedi. arabic alanı boş tutuldu. Yazılı kasr tanımı bu sözlü rule sorusunu destekler.

- [ ] Onay   - [ ] Düzelt: ______

## D8 · 2 · rule — 8. KONU: ASAR, MED ve KASR

quizId: 100014 · key: p7-d8-2 · review.status: draft · reviewer: boş · date: boş

**Soru (TR):** Kaynak açıklamasına göre asar işareti neyi gösterir?

**Arapça görsel: kaynak yetersiz.** Bu sözlü kural sorusunda Arapça metin yok; `arabic: ""`.

- Harfin atlanacağını
- Harfin uzatılacağını ✅
- Harfin iki ayrı harf olarak okunacağını

**İpucu (TR):** Kaynak, med harfi bulunsa da bulunmasa da ilgili harfin uzatılacağını söyler.

**EN prompt:** According to the source explanation, what does the asar sign indicate?

- That the letter is omitted
- That the letter is lengthened ✅
- That the letter is pronounced as two separate consonants

**EN hint:** The source says that the letter is lengthened whether or not a madd letter is present.

**Kanıt — her Arapça parça:**

- Soruda ve şıklarda Arapça parça yoktur; tahmini işaret eklenmemiştir.

**Kural / bağlam kanıtı:**

- data/diyanetelifba.json:99 — Asar ('): Önünde med harfi olsun veya olmasın, o harfin uzatılacağını gösterir.
- data/app.db → elifba_dersler / id=8 / icerik_json.aciklama: aynı tanım; icerik_json.alistirma=null; icerik_json.ek_tablolar=[]

**Türetilmiş kısımlar / inceleme notu:**

- **Kaynak yetersiz: Arapça işaret/görsel örneği.** Asar yalnız ASCII apostrofla aktarılmıştır; yerine tahmini bir Arapça işaret çizilmedi. arabic alanı boş tutuldu. Yazılı asar tanımı bu sözlü rule sorusunu destekler.

- [ ] Onay   - [ ] Düzelt: ______

## D9 · 1 · rule — 9. KONU: ZAMİR VE LAFZATULLAH

quizId: 100015 · key: p7-d9-1 · review.status: draft · reviewer: boş · date: boş

**Soru (TR):** Gösterilen Allah adına bu derste verilen özel ad nedir?

<div dir="rtl" lang="ar" style="font-size: 48px; line-height: 1.8;">الله</div>

- Lafzatullah ✅
- Tenvin
- Cezm

**İpucu (TR):** Kaynak, Allah kelimesinin bu özel adla anıldığını söyler; harekesiz örnekten kalınlık kararı istenmez.

**EN prompt:** What special term does this lesson use for the displayed name Allah?

- Lafzatullah ✅
- Tanwin
- Sukun

**EN hint:** The source gives this special term for the word Allah; no thickness of pronunciation is inferred from this unvowelled example.

**Kanıt — her Arapça parça:**

- <span dir="rtl" lang="ar">الله</span> → `data/diyanetelifba.json:105`; kısa alıntı: “Allah (الله) kelimesine lafzatullah denilir.”.

**Kural / bağlam kanıtı:**

- data/diyanetelifba.json:105 — Allah (الله) kelimesine lafzatullah denilir.
- data/app.db → elifba_dersler / id=9 / icerik_json.aciklama: aynı cümle.

**Türetilmiş kısımlar / inceleme notu:**

- Latin okunuş şıkkı yok; ek türetilmiş Arapça parça yok.

- [ ] Onay   - [ ] Düzelt: ______

## D9 · 2 · rule — 9. KONU: ZAMİR VE LAFZATULLAH

quizId: 100016 · key: p7-d9-2 · review.status: draft · reviewer: boş · date: boş

**Soru (TR):** Bu örnekte lafzatullahtaki Lam kalın mı, ince mi okunur?

<div dir="rtl" lang="ar" style="font-size: 48px; line-height: 1.8;">بِاللَّهِ</div>

- İnce ✅
- Kalın

**İpucu (TR):** Lafzatullahtan önceki Bi hecesi esrelidir; bu nedenle Lam ince okunur.

**EN prompt:** In this example, is the Lam in lafzatullah pronounced thin or thick?

- Thin ✅
- Thick

**EN hint:** The preceding syllable Bi has kasra, so the Lam is pronounced thin.

**Kanıt — her Arapça parça:**

- <span dir="rtl" lang="ar">بِاللَّهِ</span> → `data/diyanetelifba.json:117`; kısa alıntı: “أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ”.

**Kural / bağlam kanıtı:**

- data/diyanetelifba.json:105 — Lafzatullahtaki lam harfi bir önceki harfin harekesine göre kalın veya ince okunur.

**Türetilmiş kısımlar / inceleme notu:**

- **Kural yorumu — onay gerekli.** Baştaki esre nedeniyle Lam ince okunur; örnek s.25’tedir ve DB ders 9 alıştırmasına aktarılmamıştır.
- **Bi (ipucundaki Latin hece): türetilmiş — onay gerekli.** Başlangıçtaki Be esreli olduğu için yaklaşık Bi gösterimi kullanıldı; kaynakta bu örneğe bağlı Latin okunuş anahtarı yoktur. Bu not hem TR hem EN ipucu için geçerlidir.

- [ ] Onay   - [ ] Düzelt: ______

## Kaynak yetersiz kalan dersler ve sınırlar

- **Ders 8 — Arapça işaret tanıma ve örnek okuma için kaynak yetersiz.** data/diyanetelifba.json:99 ve data/app.db → elifba_dersler / id=8 / icerik_json.aciklama, med ve kasrı aynı ASCII > karakteriyle; asarı ASCII apostrofla verir. icerik_json.alistirma=null, ek_tablolar=[] olduğundan doğrulanabilir harekeli örnek/görsel yoktur. 100013 ve 100014 yalnız mevcut yazılı tanımları sorar; Arapça görsel alanları bu yüzden boştur. İşaretli soru istenirse doğru Unicode işaretleriyle kaynaklı, harekeli ve bağlamlı iki örnek gerekir; bu iki sözlü sorunun yerini ancak ayrıca onayla alabilir.
- **Ders 9 — zamir uzatması için mevcut DB bağlamı yetersiz.** Her son He’yi zamir sayan genellemeden soru üretilmedi. İki soru lafzatullah alt konusundadır; zamir kazanımını ölçmez. 100016 için s.25’teki kaynak kullanıldı; bu örnek DB ders 9 alıştırmasında yoktur. İki taslak için Arapça kaynak mevcut, ancak kural yorumu ve insan onayı gereklidir. Zamir sorusu istenirse önceki ve sonraki harfi de içeren, zamir işlevi ve uzatma hükmü doğrulanmış bir bağlam gerekir.

Bu teslim bir onay taslağıdır. 16 kayıt olması, 16 insan onayı veya Paket 7’nin üretici/mobil uygulamasının tamamlandığı anlamına gelmez. Kod, DB, kaynak JSON’lar ve betikler değiştirilmedi; commit yapılmadı.

## Onay

2026-11-17: 16 sorunun tamamı proje sahibi (jalek) tarafından onaylandı. D4-1 soru metni Claude tarafından "Bu hece nasıl okunur?" olarak sadeleştirildi. Onaylı banka: `content/elifba/exercises.reviewed.json`.
