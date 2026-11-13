# Elif-Ba Alıştırma Tasarımı ve Boşluk Analizi

**Tarih:** 2026-11-13  
**Kapsam:** `apps/mobile` (Expo / React Native, TR+EN) Elif-Ba modülü  
**Durum:** Tasarım önerisi (kod değişikliği içermez)

---

## 1. Mevcut Durum (Kod Kanıtlı)

### 1.1 Ekranlar ve Akış (`apps/mobile/app/elifba/`)

- **`apps/mobile/app/elifba/index.tsx` (`OgrenScreen`, satır 248–430):**
  - Üstte iki sekme gösterir: `Elif-Ba` ve `Harf-i Tarif` (`satır 26–30, 320–337`).
  - `Elif-Ba` sekmesinde genel ilerleme kartı (`satır 365–376`) ve 3 sütunlu yılan (snake) düzeninde ders yol haritası (`PathNode`, `satır 176–224, 278–283, 379–391`) yer alır.
  - Ders düğümüne dokununca `LessonPopup` modalı açılır (`satır 75–172, 396–418`). Modalda kart ilerleme yüzdesi, son test skoru ve iki buton (`📇 Kartlar`, `🧠 Test`) bulunur (`satır 149–166`).
  - Ders tamamlama kuralı (`checkCompleted`, `satır 49–58`): Dersteki tüm harf kartlarının görülmesi (`seen.length >= ders.harf_sayisi`) **ve** testten en az `QUIZ_PASS = 10` (`10/15`) alınması gerekir. İlk ders her zaman aktiftir; sonraki dersler bir önceki ders tamamlanınca açılır (`getStatus`, `satır 60–71`).
- **`apps/mobile/app/elifba/[dersId].tsx` (`DersScreen`, satır 416–599):**
  - Üstte `Kartlar` ve `Test` mod seçici çubuğu vardır (`satır 515–538`).
  - **`Flashcard` bileşeni (`satır 87–209`):** Ön yüzde sağ üstte hoparlör butonu (`🔊`) ve ortada harfin tek başına Arapça glifi (`tek_basina`, 96px `Amiri`) görünür (`satır 127–161`). Karta dokununca arka yüz açılır: harf adı, sesi, `BAŞTA / ORTADA / SONDA` yazılış kutuları, mahreç bilgisi ve `kalın/ince` ile `birleşen/birleşmeyen` rozetleri gösterilir (`satır 163–185`). Altta `Önceki / Sonraki` (son kartta `✓ Teste Geç`) butonları ve 30 harfe kadar hızlı geçiş noktaları (`dots`, `satır 550–574`) bulunur.
  - **`QuizView` bileşeni (`satır 226–410`):** API'den gelen soruları karıştırır ve ilk 15 soruyu seçer (`satır 257–261`). Çoktan seçmeli şıkları listeler; doğru seçimde yeşil zemin + Lottie konfeti (`Success-celebration.json`, `satır 398–407`), yanlış seçimde kırmızı zemin + sarı ipucu kutusu (`💡`, `satır 383–387`) gösterir. Bitişte yüzdeye göre mesaj ve `Derslere dön` butonu çıkar (`satır 312–328`).
- **`apps/mobile/app/elifba/harf-i-tarif.tsx` (`satır 1–16`) ve `apps/mobile/src/components/HarfITarifContent.tsx` (`satır 1–329`):**
  - `harf-i-tarif.tsx` doğrudan `HarfITarifContent` bileşenini sarar.
  - `HarfITarifContent` şemsiye ve kameriye harflerini anlatan 9 bölümlü (`bilgi`, `kural`, `liste`, `ornekler`, `baglam`, `quiz`, `ozet`) statik bir ders akışı ve 25 soruluk ikili seçmeli ("eş-şems mı, el-şems mi?") mini test sunar (`HarfITarifContent.tsx:51–150`).

### 1.2 Veri Kaynağı, Ders Listesi ve Soru Dağılımı

- **İstemci Tipleri ve API (`apps/mobile/src/lib/api.ts:159–188, 589–624`):**
  - `ElifbaDers` (`id, baslik, konu_sirasi, seviye, harf_sayisi`), `ElifbaHarf` (`harf_id, harf_adi, harf_sesi, tek_basina, basta, ortada, sonda, mahrec, kalin_ince, grup`), `ElifbaQuizSoru` (`quiz_id, lesson_id, soru, secenekler, dogru_cevap, ipucu, zorluk`).
  - İstemci veriyi `/elifba/dersler`, `/elifba/dersler/:id/harfler` ve `/elifba/quiz/:lessonId` uçlarından çeker; `withCacheFallback` ile MMKV'de 7 gün (`CACHE_TTL_STATIC`) `v4_cache_elifba_*` anahtarlarıyla önbelleğe alır (`api.ts:318, 323–324, 592–623`).
- **Sunucu ve Veritabanı (`apps/web/src/app/api/elifba/**` ve `data/app.db`):**
  - Next.js API uçları `apps/web/src/lib/dbUtils.ts:23–25, 111–113` üzerinden canlıda Turso'dan, yerelde `data/app.db` SQLite dosyasından okur.
  - **Kritik Bulgular (Veritabanı vs. API):** `data/app.db` içindeki `elifba_dersler` tablosunda Diyanet Elif-Ba 2024'ten (`data/diyanetelifba.json`) aktarılmış `icerik_json` sütunu (konu açıklaması, harekeli/cezimli/şeddeli/medli/tenvinli örnek kelimeler ve tablolar) mevcuttur. Ancak `apps/web/src/app/api/elifba/dersler/route.ts:15–22` sorgusu `icerik_json` sütununu **seçmez**.
  - **Ders Listesi ve Harf Eşleşmesi (`elifba_dersler` + `elifba_harf_ders`):**
    1. `1. KONU: HARFLER` (`başlangıç`) — 28 harf (`harf_id` 1..28)
    2. `2. KONU: HARFLERİN KELİME İÇİNDE YAZILIŞLARI` (`başlangıç`) — 29 harf (`harf_id` 1..29, 29 = Lamelif `لا`)
    3. `3. KONU: HAREKELER` (`temel`) — 29 harf (1..29 yalın harfler)
    4. `4. KONU: CEZM` (`temel`) — 29 harf (1..29 yalın harfler)
    5. `5. KONU: ŞEDDE` (`temel`) — 29 harf (1..29 yalın harfler)
    6. `6. KONU: MED HARFLERİ` (`orta`) — 3 harf (`harf_id` 1 Elif, 26 Vav, 28 Ye)
    7. `7. KONU: TENVİN` (`orta`) — 29 harf (1..29 yalın harfler)
    8. `8. KONU: ASAR, MED ve KASR` (`orta`) — 29 harf (1..29 yalın harfler)
    9. `9. KONU: ZAMİR VE LAFZATULLAH` (`orta`) — 29 harf (1..29 yalın harfler)
  - **Quiz Havuzu (`scripts/_build-elifba-quiz.mjs:14, 70–117` ve `content/elifba/source.tr.json`):**
    - Ders başına 45 soru olmak üzere toplam **405 soru** (`soru_tipi: "coktan_secmeli"`) üretilmiştir.
    - Tüm 9 dersteki sorular yalnız `elifba_harfler` tablosundaki 7 şablondan (`GEN`, `satır 71–89`) üretilir: `glif_ad` (66), `kalin_ince` (67), `ad_glif` (61), `glif_ses` (60), `birlesme` (57), `ayirt` (56), `basta` (38). Ders 3–9'un konu başlıkları Hareke, Cezm, Şedde, Med, Tenvin, Zamir/Lafzatullah olduğu halde bu derslerin hem kartları hem de 45'er soruluk quiz havuzları **yalnızca 1. ve 2. konudaki yalın harf tanıma sorularının tekrarıdır**.
- **İngilizce Katmanı (`apps/mobile/src/lib/elifbaEn.ts:15–82`):**
  - Sunucu Türkçe döner; istemci `apps/mobile/src/data/elifba.en.json` sözlüğünü kullanarak ders başlıklarını, harf adı/sesi/mahrecini ve tüm şıkları çevrilebilen quiz sorularını İngilizceye çevirir (`localizeDersler`, `localizeHarfler`, `localizeQuiz`).

### 1.3 Ses Dosyaları

- **Mevcut Sesler:** `apps/web/public/audio/elifba/` altında `harf_01.mp3` .. `harf_29.mp3` (toplam 29 dosya, 28 harf + Lamelif) bulunur. Hareke, hece veya kelime sesi yoktur.
- **Çalma ve Çevrimdışı Durum (`apps/mobile/app/elifba/[dersId].tsx:33–83`):**
  - Sesler mobil pakete gömülü değildir (`apps/mobile/assets/` altında ses dosyası yok). `${AUDIO_BASE}/audio/elifba/harf_XX.mp3` adresinden (`runtimeConfig.ts:15–16`, varsayılan Vercel/CDN) `expo-audio` (`createAudioPlayer`) ile ağ üzerinden çalınır (`satır 35–37, 57`).
  - Çevrimdışı çalışmaz; 3 saniye içinde yüklenmezse `sesHata` durumu tetiklenir ve *"🔇 Ses yüklenemedi — internet bağlantını kontrol et"* uyarısı gösterilir (`satır 68–70, 137–141`).

### 1.4 İlerleme, Puan ve Seri Kaydı

- **Saklanan Anahtarlar (`apps/mobile/src/lib/storage.ts:12–13`, `elifbaProgress.ts:1–55`):**
  - `STORAGE_KEYS.elifbaProgress` (`"elifbaProgress"`): `Record<string, number[]>` biçiminde her derste görülen `harf_id` dizisini tutar.
  - `STORAGE_KEYS.quizScores` (`"elifbaQuizScores"`): `Record<string, { score: number; total: number }>` biçiminde dersin son test skorunu tutar (`[dersId].tsx:492–495`).
  - Her iki anahtar MMKV'de (yoksa AsyncStorage'da) saklanır ve `apps/mobile/src/lib/cloudBackup.ts:46–47` ile Firebase Firestore'a yedeklenir.
- **Eksikler:**
  - Elif-Ba çalışması günlük okuma serisini (`STORAGE_KEYS.streak = "readingStreak"`) **güncellemez**; `useStreak` yalnızca ayet okuma ekranlarında kayıt yapar (`apps/mobile/src/hooks/useStreak.ts:45–49`).
  - `HarfITarifContent.tsx:97–98` içindeki 25 soruluk testin sonucu yalnız bileşen belleğinde (`useState`) tutulur; ekrandan çıkınca silinir.
  - Hangi harfin veya kuralın yanlış yapıldığına dair öğe bazlı kayıt yoktur.

### 1.5 Mevcut Quiz Bileşeninin Yeniden Kullanılabilirliği

- `[dersId].tsx:226–410` içindeki `QuizView` şu an dosya dışına aktarılmamıştır (`export` edilmemiş) ve veriyi doğrudan `api.elifba.quiz(dersId)` ile çeker (`satır 253`).
- Ancak bileşenin soru kartı (`renderSoru`), 2–4 şıklı buton yapısı, doğru/yanlış renk geri bildirimi, ipucu kutusu ve konfeti katmanı çok temizdir. Veri çekme mantığı dışarı alınıp `questions: AlıştırmaSorusu[]`, `onPlayAudio?: (url: string) => void` ve `onAnswer?: (itemId: string, correct: boolean) => void` prop'ları eklendiğinde tüm çoktan seçmeli ve dinle-seç alıştırmaları için doğrudan yeniden kullanılabilir.

---

## 2. Beceri Boşluk Analizi

| Beceri | Mevcut Durum | Kanıt / Açıklama |
| :--- | :--- | :--- |
| **Harf tanıma (yalın)** | **Var** | `glif_ad`, `ad_glif`, `glif_ses`, `ayirt` şablonları (`_build-elifba-quiz.mjs:72–77, 87–88`). |
| **Harfin baş / orta / son hali** | **Kısmi (Yalnız Başta)** | Quiz'de yalnız `basta` sorulur (`satır 78–81`). **Ortada** (`ortada`) ve **sonda** (`sonda`) yazılışlar kart arkasında görünür ama hiç sorulmaz. |
| **Üstün / Esre / Ötre (Harekeler)** | **Yok (0 soru)** | Ders 3 başlığı "Harekeler"dir ancak kartlar ve quiz yalın harfleri sorar. |
| **Cezm** | **Yok (0 soru)** | Ders 4'te `أَبْ إِبْ أُبْ` heceleri `app.db` `icerik_json`'da var ama ekranda ve quiz'de yok. |
| **Şedde** | **Yok (0 soru)** | Ders 5'te şedde kuralı ve örnekleri `icerik_json`'da var ama ekranda ve quiz'de yok. |
| **Med harfleri ve uzatma** | **Yok (0 soru)** | Ders 6 yalnız `ا، و، ي` yalın kartlarını gösterir; hangi harekeyi hangi med harfinin uzattığı sorulmaz. |
| **Tenvin (iki üstün/esre/ötre)** | **Yok (0 soru)** | Ders 7'de `-en/-in/-un` sesi hiç alıştırılmaz. |
| **Harf birleştirme / hece okuma** | **Yok (0 soru)** | Ayrı harflerin birleşince aldığı şekil veya tek hece okunuşu sorulmaz. |
| **Kısa kelime okuma** | **Yok (0 soru)** | `diyanetelifba.json` içindeki 150+ alıştırma kelimesi uygulamada hiç kullanılmaz. |
| **İşitme → Seçme (Dinle & Bul)** | **Yok (0 soru)** | 29 harf sesi mevcut olmasına rağmen quiz'de sesli soru hiç yoktur. |

---

## 3. Önerilen Alıştırma Tipleri (Öncelik Sırasıyla)

### Tip 1: Hareke ve İşaret Tanıma (Üstün, Esre, Ötre, Cezm, Şedde, Tenvin, Med)
- **Ne sorulur:** Harekeli/işaretli tek bir harf veya iki harfli hece (ör. `بَ`, `بِ`, `بُ`, `أَبْ`, `رَبَّ`, `بًا`, `بَا`) gösterilir; doğru okunuşu veya üzerindeki işaretin adı/işlevi (4 şık) sorulur.
- **Ekran Taslağı:**
```text
+---------------------------------------+
| Soru 3/15 · 2 doğru                   |
| +-----------------------------------+ |
| |               بِ                  | |
| |  Bu harfin okunuşu hangisidir?    | |
| +-----------------------------------+ |
| [  be  ]  [ ✓ bi ]  [  bü  ]  [  eb ] |
| 💡 Esre (kesra) harfin altına yazılır |
|    ve ince harflere "i" sesi verir.   |
+---------------------------------------+
```
- **Veri ve Ses:** Yeni Arapça metin uydurulmaz. `data/elifba_harfler.json` içindeki 28 harf + Unicode harekeler (`\u064E` fetha, `\u0650` kesra, `\u064F` damme, `\u0652` sükun/cezm, `\u0651` şedde, `\u064B\u064D\u064C` tenvin) ve `data/diyanetelifba.json` sayfa 14'teki cezm tablosu (`أَبْ إِبْ أُبْ`..`أَىْ إِىْ أُىْ`) kullanılır. Kalın/ince bilgisi (`kalin_ince`) mevcut olduğundan Türkçe/İngilizce okunuş (`be/ba`, `bi/bı`, `bü/bu`) deterministik üretilir.
- **Geri Bildirim ve Ses:** Doğruysa yeşil + konfeti, yanlışsa kırmızı + kural ipucu. Harekeli hece sesi mevcut değildir (**yeni ses kaydı/lisansı gerekir**; ilk aşamada sessiz çalışır).
- **Efor:** **S**

### Tip 2: Harfin Konum Şekilleri (Başta / Ortada / Sonda) ve Harf Birleştirme
- **Ne sorulur:** (a) Harfin kelime başı, ortası veya sonundaki şekli (`basta`, `ortada`, `sonda`) sorulur; veya (b) Diyanet Elif-Ba 2. Konu tablosundaki 3 harfli harekesiz bir kelimenin (`جبل`, `فتح`, `سمع`, `شكر`) ayrık harfleri (`ج + ب + ل`) verilip birleşik yazılışı (veya tersi) sorulur.
- **Ekran Taslağı:**
```text
+---------------------------------------+
| +-----------------------------------+ |
| |           ج + ب + ل               | |
| | Harfleri birleşince nasıl yazılır?| |
| +-----------------------------------+ |
| [ ✓ جبل ]  [  حبل ]  [  جتل ]  [ خبل ]|
+---------------------------------------+
```
- **Veri ve Ses:** `elifba_harfler` tablosunda tüm harflerin `basta`, `ortada`, `sonda` şekilleri ve `data/diyanetelifba.json` sayfa 9–11'de (ve `app.db` `elifba_dersler.icerik_json` Ders 2'de) her harf için Başta/Ortada/Sonda 84 gerçek örnek kelime (`احد، سال، بدا`, `بعث، جبل، حسب` vb.) hazırdır.
- **Geri Bildirim ve Ses:** Yanlış şıkta birleşmeyen harfler (`ا، د، ذ، ر، ز، و`) veya nokta sayısı ipucu gösterilir. Tek harf sorularında mevcut `harf_XX.mp3` çalınır.
- **Efor:** **S**

### Tip 3: Dinle ve Seç (İşitme → Glif / Harf Adı)
- **Ne sorulur:** Ekranda büyük bir ses butonu otomatik çalar (ve dokununca tekrar çalar); kullanıcı duyduğu harfin Arapça glifini 4 benzer harf (`SIMILAR` grupları: `ث/س/ص`, `ذ/ز/ظ`, `ح/خ/ه`, `ت/ط`, `د/ض`) arasından seçer.
- **Ekran Taslağı:**
```text
+---------------------------------------+
| +-----------------------------------+ |
| |            [ 🔊 Dinle ]           | |
| |   Duyduğun harf hangisidir?       | |
| +-----------------------------------+ |
| [   ث   ]  [ ✓ س   ]  [   ص   ] [ ش ] |
+---------------------------------------+
```
- **Veri ve Ses:** Mevcut 29 ses dosyası (`apps/web/public/audio/elifba/harf_01.mp3`..`harf_29.mp3`) ve `elifba_harfler` tablosu yeterlidir; **yeni ses veya veri gerekmez**. Çevrimdışı durumda (ses yüklenemezse) soru otomatik olarak görsel yedek soruya düşer.
- **Geri Bildirim ve Ses:** Yanlış seçimde seçilen şıkkın mahreç farkı (`"Bu Sad (kalın); duyduğun Sin (ince)"`) ipucu olarak gösterilir.
- **Efor:** **S**

### Tip 4: Kısa Kelime Okuma (Diyanet Elif-Ba + Kuran Kelimesi → Okunuş Seçme)
- **Ne sorulur:** Dersin konusuna uygun (3. Ders harekeli: `رَزَقَ، كُتُبُ`; 4. Ders cezimli: `قُلْ، يَوْمَ، نَعْبُدُ`; 5. Ders şeddeli: `رَبِّ، جَنَّةُ`; 6. Ders medli: `قَالَ، غَفُورٌ`; 7. Ders tenvinli: `أَحَدٌ، حَكِيمًا`; 9. Ders zamir/lafzatullah: `بِاللَّهِ، لَهُ`) gerçek bir Kuran/Elif-Ba kelimesi gösterilir; 4 okunuş şıkkından doğrusu seçilir.
- **Ekran Taslağı:**
```text
+---------------------------------------+
| +-----------------------------------+ |
| |               قُلْ                 | |
| |  Bu kelimenin okunuşu nasıldır?   | |
| +-----------------------------------+ |
| [ ✓ kul ]  [  kale ]  [  külli ] [ kil]|
+---------------------------------------+
```
- **Veri ve Ses:** `data/diyanetelifba.json` sayfa 13–24'te (ve `app.db` `elifba_dersler.icerik_json` içinde) derslere göre sınıflandırılmış **185 gerçek kelime** hazırdır. Ayrıca `apps/mobile/src/data/quran_arabic.json` içindeki kısa ayet kelimeleri ve `packages/core/src/transliteration/readingTr.ts` (TR) + `apps/mobile/src/lib/translitEn.ts` (EN) kurallarıyla okunuşlar derleme zamanında (build script ile) üretilip doğrulanabilir. Kelime bazlı ses dosyası repoda yoktur (**yeni ses kaydı/lisansı gerekir**; ilk aşamada görsel + transliterasyon ile çalışır).
- **Geri Bildirim ve Ses:** Yanlış cevapta kelimedeki hedef kural (ör. *"Lam harfinde cezm var, harekesiz birleşir: kul"*) açıklanır.
- **Efor:** **M**

### Tip 5: Kelime İçinde Kural Avı (Hedef Harf / Kural Bulma)
- **Ne sorulur:** `diyanetelifba.json` veya `quran_arabic.json` içinden alınan 3–4 kelimelik kısa bir ayet/ibare veya 4 ayrı kelime şıkkı verilir; *"Hangisinde şedde vardır?"*, *"Hangisinde med (uzatma) harfi vardır?"*, *"Lafzatullah (الله) hangisinde kalın okunur?"* veya *"Hangisinde şemsiye harfi (idğam) vardır?"* diye sorulur.
- **Ekran Taslağı:**
```text
+---------------------------------------+
| +-----------------------------------+ |
| | Hangi kelimede ŞEDDE vardır?      | |
| +-----------------------------------+ |
| [  قَرَأَ  ] [  قَبْلَ  ] [ ✓ حَقَّ ] [ قَالَ ]|
+---------------------------------------+
```
- **Veri ve Ses:** `data/diyanetelifba.json` (Ders 3–9 kelimeleri) ve `apps/mobile/src/data/content/harf_i_tarif.json` örnekleri doğrudan kullanılır. **Yeni ses gerekmez.**
- **Geri Bildirim ve Ses:** Doğru/yanlış seçim sonrası kelimedeki işaret (`◌ّ`, `◌ْ`, `ا/و/ي`, `◌ً/◌ٍ/◌ٌ`) ve okunuşu ipucu kutusunda gösterilir.
- **Efor:** **M**

### Tip 6: Hece Birleştirme (Sıralı Dokunarak Kelime Kurma)
- **Ne sorulur:** Harekeli bir kelimenin okunuşu (ör. *"ra - ze - ka"*) verilir; ekrandaki 4–5 karışık harekeli hece kutusuna (`رَ`, `زَ`, `قَ`, `ذَ`) sırayla dokunarak kelimeyi sağdan sola dizmesi istenir.
- **Ekran Taslağı:**
```text
+---------------------------------------+
| Okunuşu: "ra - ze - ka"               |
| +-----------------------------------+ |
| |   [ قَ ]   ←   [ زَ ]   ←   [ رَ ]   | |
| +-----------------------------------+ |
| Seçenekler: [ زَ ] [ رَ ] [ ذَ ] [ قَ ]   |
+---------------------------------------+
```
- **Veri ve Ses:** Ders 3 (`diyanetelifba.json` sayfa 13) içindeki 28 adet üç harfli harekeli fiilden (`رَزَقَ، رَجَعَ، ضَرَبَ، شَهِدَ، عَمِلَ، كُتُبُ` vb.) otomatik ayrıştırılır. Hece sesi için **yeni ses kaydı/lisansı gerekir** (ilk aşamada sessiz).
- **Geri Bildirim ve Ses:** Tamamlandığında kelimenin birleşik hali (`رَزَقَ`) gösterilir.
- **Efor:** **L**

> **Ses Gereksinimi Özeti:** Tip 2 (tek harf) ve Tip 3 mevcut 29 `harf_XX.mp3` ile hemen sesli çalışır. Tip 1 (harekeli hece), Tip 4 ve Tip 6 için sesli okuma istenirse açık lisanslı (ör. EveryAyah kelime sesleri veya telifsiz stüdyo kaydı) yeni MP3 seti üretilmeli ve R2/CDN'e yüklenmelidir.

---

## 4. Tekrar (SRS) ve İlerleme Tasarımı

### 4.1 Basit Leitner Kuralı (3 Kutu)
- Her soru öğesi benzersiz bir kimliğe sahiptir (`itemId`: ör. `"q:104"` veya `"harf:14"`).
- **Kutu 1 (Zor / Yanlış):** Yanlış cevaplanan her öğe Kutu 1'e düşer (`box = 1`).
- **Kutu 2 (Öğreniliyor):** Kutu 1'deki öğe bir sonraki testte doğru cevaplanırsa Kutu 2'ye çıkar (`box = 2`).
- **Kutu 3 (Ustalaşıldı):** Kutu 2'deki öğe doğru cevaplanırsa Kutu 3'e çıkar (`box = 3`). Herhangi bir kutuda yanlış cevaplanan öğe doğrudan Kutu 1'e geri döner.
- **Soru Seçimi (15 soruluk oturum):** Bir dersin testi veya "Tekrar" oturumu başlatıldığında, önce o derse ait `box === 1` (en fazla 5 soru) ve `box === 2` (en fazla 3 soru) öğeleri havuzdan seçilir; kalan sorular dersin yeni/Kutu 3 sorularından rastgele tamamlanır.

### 4.2 Saklanacak Veri Biçimi (MMKV)
- `apps/mobile/src/lib/storage.ts` içine tek bir yeni anahtar eklenir ve `cloudBackup.ts` `BACKUP_KEYS` listesine dahil edilir:
  - Anahtar: `STORAGE_KEYS.elifbaSrs = "elifbaSrs"`
  - Biçim:
```ts
export type ElifbaSrsEntry = {
  box: 1 | 2 | 3;
  wrong: number;   // toplam yanlış sayısı
  lastTs: number;  // son yanıt zamanı (epoch sn)
};
export type ElifbaSrsMap = Record<string, ElifbaSrsEntry>; // anahtar: quiz_id veya kural kimliği
```

### 4.3 Ders Kilidi ve Rozet Önerisi
- **Ders Kilidi:** Mevcut kural (`seen.length >= ders.harf_sayisi && score >= 10`) korunur; böylece mevcut kullanıcıların açık dersleri bozulmaz.
- **Ders Yıldızı / Rozeti (3 kademe):** `index.tsx` içindeki `PathNode` üzerinde mevcut `quizScores` ve `elifbaSrs` verisiyle ek depolama gerektirmeden hesaplanır:
  - ⭐ **Geçti:** Test skoru `10..12 / 15`
  - 🌟 **Usta:** Test skoru `13..14 / 15`
  - 👑 **Tam İsabet:** Test skoru `15 / 15` ve o derste `box === 1` olan yanlış öğe kalmamış.
- Ayrıca `index.tsx` üst kısmına *"🔄 Yanlışlarımı Tekrar Et (N)"* hızlı butonu eklenir (`box === 1` öğe sayısı > 0 ise görünür).

---

## 5. Uygulama Planı (4 Bağımsız Commit Adımı)

> **Test Kısıtı Notu:** `npm run test:mobile` (`node --test "apps/mobile/src/**/*.test.ts"`) büyük JSON dosyalarını ve uzantısız göreli importları doğrudan yükleyemediği için (`apps/mobile/src/lib/elifbaEn.test.ts` örneğindeki gibi) tüm yeni mantık fonksiyonları `apps/mobile/src/lib/` altında **saf (pure) ve dışarıdan veri/sözlük alan (dependency-injected)** fonksiyonlar olarak yazılacak, testlerde `.ts` uzantılı import kullanılacaktır.

### Adım 1: Konu Bazlı Quiz ve Alıştırma Üretim Hattı (Veri + EN Sözlük)
- **Hedef:** Ders 2–9'un quiz havuzunu yalın harf tekrarı olmaktan çıkarıp `diyanetelifba.json` / `elifba_dersler.icerik_json` verisiyle dersin gerçek konusuna (Başta/Ortada/Sonda, Hareke, Cezm, Şedde, Med, Tenvin, Lafzatullah/Zamir) uygun sorularla (Tip 1, Tip 2, Tip 4, Tip 5) zenginleştirmek.
- **Dokunulacak Dosyalar:**
  - `apps/mobile/src/lib/elifbaExerciseGen.ts` (yeni — saf soru üretim ve transliterasyon fonksiyonları)
  - `apps/mobile/src/lib/elifbaExerciseGen.test.ts` (yeni — birim testleri)
  - `scripts/_build-elifba-quiz.mjs` (yeni soru üreticilerinin `app.db` ve Turso'ya yazılması)
  - `content/elifba/source.tr.json`, `content/elifba/strings.en.json`, `apps/mobile/src/data/elifba.en.json` (`export-elifba-source.mjs` + `build-elifba-en.mjs` ile güncelleme)
- **Test Edilebilir Saf Fonksiyonlar (`elifbaExerciseGen.ts`):**
  - `syllableReadingTr(harfSes: string, kalinInce: string, hareke: "ustun" | "esre" | "otre" | "tenvin_ustun" | "tenvin_esre" | "tenvin_otre"): string`
  - `buildPositionQuestion(harf: ElifbaHarf, pos: "basta" | "ortada" | "sonda", pool: ElifbaHarf[]): ElifbaQuizSoru | null`
  - `detectRuleInWord(arabicWord: string): { hasShedde: boolean; hasCezm: boolean; hasMed: boolean; hasTenvin: boolean }`

### Adım 2: SRS (Leitner) ve İlerleme Saf Mantık Katmanı
- **Hedef:** Yanlış yapılan soruların kutu takibini, oturum soru seçimini ve rozet seviyesi hesabını saf fonksiyonlarla eklemek.
- **Dokunulacak Dosyalar:**
  - `apps/mobile/src/lib/storage.ts` (`STORAGE_KEYS.elifbaSrs` eklenmesi)
  - `apps/mobile/src/lib/cloudBackup.ts` (`BACKUP_KEYS` listesine `STORAGE_KEYS.elifbaSrs` eklenmesi)
  - `apps/mobile/src/lib/elifbaProgress.ts` (SRS ayrıştırıcı, güncelleyici ve soru seçici saf fonksiyonlar)
  - `apps/mobile/src/lib/elifbaProgress.test.ts` (yeni — birim testleri)
- **Test Edilebilir Saf Fonksiyonlar (`elifbaProgress.ts`):**
  - `parseElifbaSrs(raw: unknown): ElifbaSrsMap`
  - `updateElifbaSrs(map: ElifbaSrsMap, itemId: string, isCorrect: boolean, nowSec: number): ElifbaSrsMap`
  - `selectQuizQuestionsWithSrs<T extends { quiz_id: number }>(pool: T[], srs: ElifbaSrsMap, count: number, rng?: () => number): T[]`
  - `computeLessonBadge(score: number, total: number, box1Count: number): "none" | "pass" | "master" | "crown"`

### Adım 3: Ders İçeriği (Konu Özeti + Örnek Kelime Kartları) Gösterimi
- **Hedef:** Ders 2–9'da yalnız yalın harf kartları göstermek yerine `elifba_dersler.icerik_json` içindeki konu açıklamasını ve harekeli/cezimli/şeddeli örnek kelimeleri de kart/tablo olarak göstermek.
- **Dokunulacak Dosyalar:**
  - `apps/web/src/app/api/elifba/dersler/route.ts` (`icerik_json` alanının sorguya eklenmesi, geriye dönük uyumlu)
  - `apps/mobile/src/lib/api.ts` (`ElifbaDers` tipine opsiyonel `icerik_json?: string | null` eklenmesi)
  - `apps/mobile/src/lib/elifbaLessonContent.ts` ve `elifbaLessonContent.test.ts` (yeni — `icerik_json` metnini güvenli ayrıştıran ve alıştırma kelimelerini diziye çeviren saf fonksiyonlar)
  - `apps/mobile/app/elifba/[dersId].tsx` (kart ekranının üstünde kısa konu kuralı ve örnek kelime çipleri)
- **Test Edilebilir Saf Fonksiyonlar (`elifbaLessonContent.ts`):**
  - `parseDersIcerik(rawJson: string | null | undefined): { aciklama: string | null; kelimeler: string[] }`

### Adım 4: Yeniden Kullanılabilir Quiz Bileşeni, Dinle-Seç Modu ve Tekrar Ekranı
- **Hedef:** `QuizView` bileşenini ses destekli (`audioHarfId` varsa `🔊 Dinle` butonu çıkaran) ve SRS kaydı yapan yapıya kavuşturmak; ana Elif-Ba ekranına rozetleri ve "Yanlışlarımı Tekrar Et" modunu bağlamak; Harf-i Tarif test sonucunu kalıcı kaydetmek.
- **Dokunulacak Dosyalar:**
  - `apps/mobile/app/elifba/[dersId].tsx` (`QuizView` içinde `updateElifbaSrs` çağrısı, `selectQuizQuestionsWithSrs` kullanımı ve Tip 3 Dinle-Seç ses butonu)
  - `apps/mobile/app/elifba/index.tsx` (`PathNode` rozet gösterimi ve Kutu 1 tekrar başlatıcısı)
  - `apps/mobile/src/components/HarfITarifContent.tsx` (test skorunun MMKV'ye kaydedilmesi)
  - `apps/mobile/src/i18n/strings/elifba.ts` (TR/EN yeni arayüz metinleri)
