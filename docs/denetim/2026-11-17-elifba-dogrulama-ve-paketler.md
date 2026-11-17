# Elif-Ba tasarım belgesi: doğrulama ve DeepSeek iş paketleri

**Tarih:** 17 Kasım 2026. **İncelenen belge:** `docs/denetim/2026-11-13-elifba-alistirma-tasarimi.md`. **Kapsam:** mevcut çalışma ağacı, yerel veri ve kod; canlı Turso verisi sorgulanmadı, sesler dinlenmedi. Kod, veri, DB ve eski belge değiştirilmedi; hiçbir üretim/DB yazma betiği çalıştırılmadı.

`c3f80dde` yalnız iki mantık dosyasını değil, `storage.ts` ve `cloudBackup.ts` kayıtlarını da içeriyor. Adım 2'nin saf mantığı var; ekran bağlantısı yok. Aşağıdaki satırlar bu inceleme anındaki kaynaklara aittir. Tasarım önerisini mevcut özellikten ayırmak için henüz uygulanmamış öneriler **KISMEN — tasarım** olarak işaretlendi; efor tahminleri kodla doğrulanabilecek olgu sayılmadı.

## 1) Doğrulama tablosu

Kısaltmalar yalnız kanıt tablosunda kullanılır; her biri depo kökünden dosya yoludur:

- **L:** `apps/mobile/app/elifba/index.tsx`
- **D:** `apps/mobile/app/elifba/[dersId].tsx`
- **A:** `apps/mobile/src/lib/api.ts`
- **P:** `apps/mobile/src/lib/elifbaProgress.ts`
- **H:** `apps/mobile/src/components/HarfITarifContent.tsx`
- **J:** `data/diyanetelifba.json`
- **G:** `scripts/_build-elifba-quiz.mjs`
- **S:** `content/elifba/source.tr.json`
- **storage:** `apps/mobile/src/lib/storage.ts`; **cloudBackup:** `apps/mobile/src/lib/cloudBackup.ts` (bu iki kısa ad da tablodaki satır atıflarında kullanılır).

| Eski belgedeki somut iddia | Sonuç | Kod/veri kanıtı ve düzeltme |
|---|---|---|
| `OgrenScreen`, Elif-Ba/Harf-i Tarif sekmeleri | DOĞRU | L:248; sekme anahtarları L:26–30, çizim L:320–337. |
| Genel ilerleme kartı, üç sütunlu yılan düzeni, `PathNode` | DOĞRU | L:34,176,278–283,365–391. |
| Düğüme basınca `LessonPopup`; kart ilerlemesi, son skor, Kartlar/Test | DOĞRU | L:75–166,299,396–418. Kilitli düğüm basılamaz: L:193. |
| Tamamlamak için tüm kartlar ve en az 10 puan; ilk ders açık, önceki ders tamamlanınca sıradaki açılır | DOĞRU | L:32,49–71. Ek koşul `harf_sayisi > 0`; eşik oran değil mutlak puandır. Önceden tamamlanmış ders önce kontrol edilir. |
| “Kartın görülmesi” otomatik kaydedilir | KISMEN | Veri anlamı görülen ID listesidir; pratikte `markSeen` ileri/geri/nokta geçişinde çağrılır. Yalnız kartı açmak veya çevirmek kayıt değildir: D:469–489,555–558. |
| `DersScreen`, Kartlar/Test seçici | DOĞRU | D:416–419,444,515–538. `mode=quiz` ile doğrudan test açılabilir. |
| `Flashcard`, tek glif, 96px Amiri; arka yüzde ad/ses/üç biçim/mahreç/rozet | DOĞRU | D:87,127–185,635–636. Ses butonu kart kapsayıcısındadır. |
| Önceki/Sonraki, son kartta Teste Geç; en fazla 30 kartta noktalar | DOĞRU | D:187–204,480–483,550–572. Önceki ilk kartta işlevsizdir: D:487. |
| API soruları karıştırılıp ilk 15 alınır | DOĞRU | D:253–261; önce yerelleştirme ve `normalizeQuizSorular` uygulanır: D:213–223,256. |
| 2–4 seçenekli yapı | KISMEN | Mevcut üreticide ikili/üçlü/dörtlü sorular var: G:72–88. UI sınır koymaz, tüm seçenekleri çizer: D:357. Normalizasyon iki seçenek şartı bile koymaz: D:219–221. |
| Doğru yeşil/konfeti, yanlış kırmızı/ipucu, sonuçta yüzde mesajı/dönüş | DOĞRU | D:280–288,312–325,361–385,398–405. Konfeti native Lottie mevcutsa gösterilir: D:7–14,398. İpucu yalnız doluysa ve yanlışta görünür. |
| `QuizView` export değil, API'yi kendi çeker, `renderSoru` var | DOĞRU | D:226,253,334–347. `renderSoru` Arapça satırları ayırır ve önce gösterir; basit metin kutusu değildir. |
| `questions: AlıştırmaSorusu[]`, `onPlayAudio`, `onAnswer` ekleyerek yeniden kullanım | KISMEN — tasarım | Bu tip/prop'lar mevcut değil; mevcut imza yalnız `dersId,onFinish`: D:226. Yükleme/hata/yerelleştirme/seçim ile sunumu ayırmak gerekir. |
| `harf-i-tarif.tsx` sarmalayıcı, dokuz bölüm ve 25 ikili soru | DOĞRU | `apps/mobile/app/elifba/harf-i-tarif.tsx:7–14`; H:23–28,51–54,94–150,286. Bölüm verisi `apps/mobile/src/data/content/harf_i_tarif.json:18–507`; yedi farklı `tip`, dokuz bölüm örneği var. |
| `ElifbaDers`, `ElifbaHarf`, `ElifbaQuizSoru` alan listeleri | DOĞRU | A:159–188. `icerik_json`, `audioHarfId`, öğe/kural kimliği bu tiplerde yok. Quiz API'sinin döndürdüğü `soru_tipi` mobil tipte tanımlı değil. |
| Üç API yolu, 7 günlük `v4_cache_elifba_*` önbelleği | DOĞRU | A:318,323–324,589–623. `withCacheFallback` ağ hatasında süre aşmış cache'i de döndürebilir: A:372–389; “7 gün sonra veri yok” sonucu çıkarılmamalı. |
| Sunucu canlıda Turso, yerelde `data/app.db` | KISMEN | Ortam adı değil **iki env değişkeninin varlığı** belirler; `DATA_PATH` yerel yolu değiştirebilir. `apps/web/src/lib/dbUtils.ts:21–25,111–126,146–155`. Canlı DB içeriği bu denetimde doğrulanmadı. |
| Yerel `elifba_dersler.icerik_json` mevcut, ders API'si seçmiyor | DOĞRU | Salt okunur SQL ile sütun ve dokuz kayıt doğrulandı. Metinsel kaynak J:21–111; seçilmeyen sorgu `apps/web/src/app/api/elifba/dersler/route.ts:15–22`. DB dosyasının satır numarası yoktur; SQL kanıtı aşağıda. |
| İçerik Diyanet Elif-Ba 2024'ten aktarılmış | KISMEN | J:2–3 kaynak etiketini verir; DB metinleriyle kaynak eşleşiyor. Bu, özgün PDF'ye harf harf uygunluk veya aktarma betiğinin doğrulanması değildir. |
| Ders 1: başlangıç, 28 harf 1–28 | DOĞRU | Yerel SQL Q2; başlık S:4–5, harf kaynağı `data/elifba_harfler.json:3`. |
| Ders 2: başlangıç, 29 harf 1–29; 29 Lamelif | DOĞRU | Q2; başlık S:8–9; Lamelif `data/elifba_harfler.json:367–378`. Lamelif ayrı alfabe harfi değildir: J:15. |
| Ders 3/4/5: temel, her biri 29 yalın harf | DOĞRU | Q2; başlıklar S:12–21; API yalnız harf tablosunu getirir: `apps/web/src/app/api/elifba/dersler/[id]/harfler/route.ts:30–35`. |
| Ders 6: orta, 1/26/28 Elif/Vav/Ye | DOĞRU | Q2; başlık S:24–25; harfler `data/elifba_harfler.json:3,328,354`. |
| Ders 7/8/9: orta, her biri 29 yalın harf | DOĞRU | Q2; başlıklar S:28–37. |
| Dokuz derste 45'er, toplam 405 `coktan_secmeli` soru | DOĞRU | G:14,105–116; Q3; S:216 itibarıyla 405 kayıt. S, `lesson_id` ve `soru_tipi` içermez; bu iki alanı S'den doğrulamak mümkün değildir. |
| Yedi şablon ve sayıları 66/67/61/60/57/56/38 | DOĞRU | G:71–89; S:216 sonrası soru gövdeleri sınıflandırılarak tekrar sayıldı: `glif_ad=66, kalin_ince=67, ad_glif=61, glif_ses=60, birlesme=57, ayirt=56, basta=38`. Toplam 405. |
| Ders 3–9 kart ve quiz'leri konuya özgü değil | DOĞRU | G:91–116 yalnız harfler üzerinden üretir, D:453,544 kartları harflerden kurar. Ders 6 havuzu yetersizse başka ders harflerinden tamamlanır: G:108–114. “Tekrar” aynı soru kayıtlarının birebir kopyası anlamına gelmez. |
| Yalın harf tanıma var; konum sorusu yalnız başta | DOĞRU | G:72–88; orta/son kartta var D:168, üreticide yok. |
| Hareke/cezm/şedde/med/tenvin/hece/kelime/dinle sorusu sıfır | DOĞRU | Mevcut yedi şablonun tamamı G:71–89; quiz ses kodu yok D:226–410. Harf-i Tarif ayrı mini testtir; onun şemsiye/kameriye soruları bu sıfırlara dahil değildir. |
| Kaynaktaki “150+ kelime” kullanılmıyor | KISMEN | Sayı alt sınır olarak tutuyor; ders kart/quiz akışında kullanılmıyor. “Uygulamada hiç kullanılmaz” fazla geniş: Harf-i Tarif kendi verisini zaten kullanıyor, Kuran kelimeleri başka ekranlarda mevcut. J:45,57,69,81,93,111; D:253,453. |
| TR sunucu + `elifba.en.json` + üç yerelleştirici | DOĞRU | `apps/mobile/src/lib/elifbaEn.ts:15–19,31–81`. Quiz yalnız soru, **tüm şıklar, doğru cevap ve ipucu** çevrilebiliyorsa çevrilir; eksikte bütün soru TR kalır: aynı dosya:50–68. |
| Elif-Ba ses klasöründe 29 MP3; hece/kelime seti yok | KISMEN | Klasör envanteri tam `harf_01.mp3`…`harf_29.mp3`, 29 dosya. D:35–37 bunları ID ile eşler. Dosya adı içerik/doğru telaffuz kanıtı değildir; ses dinleme yapılmadı. “Repoda kelime sesi yok” başka modüllerin ayet sesleri hakkında iddia olarak kullanılmamalı. |
| Mobil assets altında ses yok, ağdan `expo-audio` ile çalıyor | DOĞRU | `apps/mobile/assets` ses uzantısı envanteri boş; D:18,35–37,57. `apps/mobile/src/lib/runtimeConfig.ts:5,15–16` varsayılan Vercel web URL'sini veya env ile verilen ses URL'sini kullanır; ayrı bir CDN zorunlu değildir. |
| Çevrimdışı çalışmaz, 3 sn sonra uyarı | KISMEN | Paketlenmiş/kalıcı offline ses cache'i yok; ağ hatası veya 3 sn içinde **yüklenip çalmama** hata verir: D:60–74,115–121,137–141. İşletim sistemi cache'i hakkında kesin “asla” hükmü verilemez. |
| İlerleme/skor MMKV, AsyncStorage fallback, Firestore yedeği | DOĞRU | `apps/mobile/src/lib/storage.ts:12–14,30–38,145–158`; P:1–3,13–54; D:492–495; `apps/mobile/src/lib/cloudBackup.ts:40–48,100–115`. Yedekleme altyapısı kullanılabilir olduğu koşullarda işler, her cihazda başarı garantisi değildir. |
| Elif-Ba seri güncellemez; seri yalnız ayet ekranlarında yazılır | KISMEN | Elif-Ba çağrısı yok, doğru. Ancak mushaf sayfası da yazar: `apps/mobile/app/mushaf-sayfa.tsx:234`; ayet `apps/mobile/app/ayah/[surahId]/[ayahNumber].tsx:412`. Ana sayfa salt okur: `apps/mobile/app/(tabs)/index.tsx:106`. |
| Harf-i Tarif sonucu yalnız bellekte, çıkınca kaybolur | DOĞRU | H:97–100,129,139; storage kaydı yok. Sekme değişimi bile bileşeni yeniden oluşturabilir: L:340 ve Harf-i Tarif render dalı. |
| Öğe bazında yanlış kaydı yok | KISMEN | **Ekran hâlâ yazmıyor**, D:280–289. Ama SRS tipi/ayrıştırıcı/güncelleyici artık var: P:57–120; storage:14, cloudBackup:48. “Mantık yok” ifadesi artık yanlış olur. |
| Tip 1: 28 harf ve işaretlerden doğru TR/EN okunuş deterministik çıkar | YANLIŞ | JSON **29 kayıt**, harf sesi esasen ünsüz etiketi: `data/elifba_harfler.json:3–25,367–378`. `her ikisi` de var (ör. ra:129). Bağlam, vakıf/vasıl, med ve harf ayrımları yalnız `kalin_ince` ile çözülmez. Arapça kontrolüne bakınız. |
| Tip 2: 84 konum kelimesi hazır | DOĞRU | J:21,27,33 tablolarında 8+10+10 satır × 3 kelime = 84 hücre. Bunlar harekesiz yazım örnekleridir; okunuş doğrulaması sağlamaz. |
| Tip 3'te yazılan gruplar mevcut `SIMILAR` | YANLIŞ | G:30–32 görsel ID grupları içerir; ör. `[2,3,4,25,28]`, `[5,6,7]`. Belgedeki ses benzerliği grupları bunların karşılığı değil. |
| Tip 3 mevcut seslerle yapılabilir; otomatik ses/görsel fallback var | KISMEN — tasarım | Ses adresi altyapısı var D:35–83; quiz'de otomatik çalma veya fallback yok D:226–410. Bunlar yeni UI ve oturum davranışı gerektirir. |
| Tip 4: s.13–24 / DB'de 185 gerçek kelime hazır | YANLIŞ | J:45,57,69,81,93,111: 28+31+30+29+32+46 = **196 geçiş, 178 farklı yazım** (boşluk ve dik çizgi ayırarak). 185 için sayım tanımı yok. Son sayfa ibare/ayet içerir; hepsi bağımsız kelime kartı değildir. |
| Tip 4: `readingTr.ts` + `translitEn.ts` Arapçadan okunuş üretir/doğrular | YANLIŞ | `packages/core/src/transliteration/readingTr.ts:322–349` mevcut **Latin transliterasyonu** normalize eder. `apps/mobile/src/lib/translitEn.ts:1–13,28–48` TR Latin yazımı EN yazıma dönüştürür; Arapça girdi okunuşa çevrilmez. |
| Tip 5: işaret varlığı med/lafzatullah/şemsiye kuralını çözmeye yeter | KISMEN — tasarım | Şedde/cezm/tenvin kod noktaları taranabilir; med yalnız `ا/و/ي` varlığı değildir, lafzatullah önceki harekeye bağlıdır: J:75,105. Harf-i Tarif bağlam örnekleri ayrı kaynak: `apps/mobile/src/data/content/harf_i_tarif.json:208–297`. |
| Tip 6: s.13'te 28 üç harfli harekeli **fiil** var | YANLIŞ | 28 hücre doğru (J:45), hepsi fiil değil: `كُتُبُ`, `رُسُلُ` gibi isimler var; `ذِكْرَ` cezm içeriyor. Harf/işaret segmentasyonu da salt karakter dilimleme değildir. |
| Tip 1/4/6 sesli olacaksa yeni kayıt/lisans gerekir | KISMEN — tasarım | Mevcut Elif-Ba seti tek harf dosyalarıyla sınırlı. Yeni içerik için uygun ses kaynağı gerekir; EveryAyah'ın kelime seti/lisansı ve R2 yükleme gereği repodan kanıtlanmadı. Kaynak/lisans seçimi henüz yapılmış sayılmamalı. |
| Üç kutu, yanlış 1'e, doğru 1→2→3 | DOĞRU | P:93–120. Yeni öğede doğru cevap **kayıt oluşturmaz**: P:102; test `apps/mobile/src/lib/elifbaProgress.test.ts:97`. “Bir sonraki test” veya zaman aralığı kontrol edilmez. Bu zamanlanmış SRS değil kutu öncelikli seçimdir. |
| 15 soruda en fazla 5 Kutu1 + 3 Kutu2, gerisi yeni/Kutu3 | KISMEN | P:147–187; ilk tercih 5+3, fakat diğerleri yetmezse fallback Kutu1/2'den de doldurur. Havuz ≤ count ise tümü karıştırılır. Dolayısıyla mutlak üst sınır değil öncelik kotasıdır. |
| `q:104` ve `harf:14` eşdeğer seçim anahtarları | KISMEN | Ayrıştırıcı her iki biçimi kabul eder P:62–69; **soru seçici yalnız `q:${quiz_id}` okur**, P:152,164. Ders ilişkisi haritada saklanmaz. |
| `ElifbaSrsEntry`, map, dört saf fonksiyon, storage ve backup ekleme | DOĞRU — tamamlandı | Tipler P:57–60; işlevler P:73,93,131,192; storage:14; cloudBackup:48. Eski belgenin Adım 2 imzaları mevcut kodla uyumlu. |
| Rozet 10–12/13–14/15 ve Kutu1 yoksa taç; ek depolama gereksiz | KISMEN | P:192–206 **15'e normalize edilmiş oranla** hesaplar; 15/15 + Kutu1>0 → `master`. UI yok L:176–224. Bir dersteki Kutu1 sayısı yalnız map'ten bilinmez; soru→ders kataloğu gerekir. |
| Kilit korunacak, üstte yanlış tekrar düğmesi | KISMEN — tasarım | Kilit mevcut L:49–71; rozet/tekrar düğmesi henüz yok L:365–391. Tekrar testi eski normal skoru üzerine yazmamalı. |
| Adım 1 yeni `elifbaExerciseGen.ts` ve test imzaları | KISMEN — tasarım | Dosyalar mevcut değil. `syllableReadingTr` sözleşmesi güvenli içerik sözleşmesi değildir; onaylı okunuş tablosu gerekir. `detectRuleInWord.hasMed` için bağlamlı tanım gerekir. |
| Adım 1 export/build ile EN dosyaları güncellenir | KISMEN | `scripts/export-elifba-source.mjs:20–43` DB okur; `scripts/build-elifba-en.mjs:16–19,43–65` **hazır** `letters.en.json` ve `strings.en.json` ister. Bu iki komut yeni çeviri üretmez. G:130–152 DB/Turso silip yazar; ayrı risk paketidir. |
| Adım 3 opsiyonel `icerik_json`, güvenli parser, özet/çipler | KISMEN — tasarım | A:159–165 ve ders route:15–22 alanı taşımıyor; parser dosyaları mevcut değil; D:540–574 henüz yalnız harf kartı. DB alanları `aciklama,alistirma,ek_tablolar`; `kelimeler` diye hazır dizi yok. |
| Adım 4 ses alanı, SRS, rozet, tekrar, kalıcı Harf-i Tarif | KISMEN — tasarım | D:226,280–289; L:176–224; H:94–150 bu bağlantıları içermiyor. Dört “bağımsız” commit ifadesi yanlış: bu bağlantılar Adım 2'ye, yeni içerik de onay/üretim hattına bağlı. |
| Saf DI modülleri, `.ts` test importları ve test komutu | DOĞRU — proje kuralı | `package.json:18`; `apps/mobile/src/lib/elifbaEn.test.ts:6–7`, `elifbaProgress.test.ts:1–10`. Node kısıtı tüm JSON'ları yasaklamaz; bu proje için test edilen modülün RN/büyük JSON/çözülemeyen runtime import yüklememesi esastır. |

### Yerel DB kanıtının yeniden üretilmesi

`data/app.db` ikili SQLite dosyasıdır; ona sahte `:satır` atanmamıştır. Yukarıdaki metinsel kaynak kanıtlarına ek olarak Python `sqlite3.connect('file:data/app.db?mode=ro', uri=True)` bağlantısında şu salt okunur sorgular çalıştırıldı:

```sql
-- Q1: dört tablo şeması; icerik_json TEXT NOT NULL,
-- elifba_quiz.secenekler TEXT ve doğru cevap string olarak saklanıyor.
SELECT name, sql FROM sqlite_master
WHERE name IN ('elifba_dersler','elifba_harfler','elifba_harf_ders','elifba_quiz');
-- Q2: başlık/seviye ve gerçek harf eşlemeleri.
SELECT d.id, d.baslik, d.seviye, COUNT(hd.harf_id), GROUP_CONCAT(hd.harf_id)
FROM elifba_dersler d JOIN elifba_harf_ders hd ON hd.ders_id=d.id GROUP BY d.id;
-- Q3: her derste 45; toplam 405, yalnız coktan_secmeli.
SELECT lesson_id,soru_tipi,COUNT(*) FROM elifba_quiz GROUP BY lesson_id,soru_tipi;
-- Q4: içerik şekli ve kelimelerin derslere gerçekten aktarılıp aktarılmadığı.
SELECT id,icerik_json FROM elifba_dersler ORDER BY id;
```

Q4'te `JSON.parse` eşdeğeri sonrası bazı içeriklerde gerçek satır sonu yerine **literal `\n`** kaldığı görüldü. Parser hem gerçek satır sonunu hem bu eski temsil biçimini işlemeli. Ders 8'de `alistirma=null`; ders 9 yalnız s.24 alıştırmasını içeriyor. J:117'deki s.25 `بِاللَّهِ` örneği ders 9 DB alıştırmasına aktarılmamış. Sayfa 24 metnindeki `وَالْبَيِّنِينَ` ve `وَالذِّرِيَّاتِ` gibi yazımlar da “kaynakta var” ile “Kuran metni olarak doğru” ayrımını gerektirir; otomatik soru kaynağı olarak insan kontrolü olmadan kullanılmamalı.

## 2) Arapça kontrolü

**Yöntem:** Eski belgedeki 76 farklı Arapça dizi (tek işaretler dahil) tek tek çıkarıldı; J, `data/elifba_harfler.json`, `apps/mobile/src/data/content/harf_i_tarif.json` ve `apps/mobile/src/data/quran_arabic.json` içinde tam sözcük karşılaştırması yapıldı. Şedde/hareke sırası için ayrıca NFC eşdeğerliği kontrol edildi; hareke silinerek eşleşme sayılmadı. Bir kelimenin içinde geçmek, bağımsız hecenin veride bulunduğu anlamına gelmez. Tekrarlanan aynı örnek aşağıda bir kez listelenir; işaretlerin kaynakta görünmesi ayrıca işaret tablosunda gösterilir.

Kod, sesin doğru telaffuzunu veya yeni Latin okunuşunu tek başına kanıtlamaz. Aşağıdaki dil notları içerik incelemesidir; yeni soru anahtarı için insan onayının yerini almaz. Özellikle ötreyi kesin Türkçe “ü” diye öğretmek fazla kesindir: [Diyanet Din İşleri Yüksek Kurulu](https://kurul.diyanet.gov.tr/tr/fetva/arapcada-otreli-harfin-u-veya-u-seslerinden-hangisiyle/0193c42d-8871-71b1-181f-6c267420cfa3) ince harfte u–ü arası ses açıklar. Üstün/esre temel işlevi için [MEB Kur'an-ı Kerim öğretim metni](https://dogm.eba.gov.tr/panel/upload/kitap/kur05/kur05_u3.pdf) de kontrol edildi. Bunlar veri dosyasında bulunma iddiasının yerine kullanılmadı.

### 2.1 Harfler ve işaretler

Bu tablodaki **F**, yalnız bu bölüm için `data/elifba_harfler.json` yoludur. Tüm harfler Unicode Arapça harfleridir; sunum şekillerini/tatvili ayrı harf saymıyoruz.

| Belgede geçen harf | Sonuç ve tekil kanıt | Okunuş/kullanım notu |
|---|---|---|
| ا | DOĞRU; F:6 | Elif; tek başına daima “a/e” ünsüzü değildir. |
| ب | DOĞRU; F:19 | Be; `harf_sesi=B`, F:18. |
| ت | DOĞRU; F:32 | Te; `ت/ط` farklı harflerdir. |
| ث | DOĞRU; F:45 | Se; Sin/Sad ile aynı ses değildir. |
| ج | DOĞRU; F:58 | Cim; `ج + ب + ل` doğru sıra. |
| ح | DOĞRU; F:71 | Ha; `خ/ه` ile aynı mahreç değildir. |
| خ | DOĞRU; F:84 | Hı; kalın niteliği F:90. |
| د | DOĞRU; F:97 | Dal. |
| ذ | DOĞRU; F:110 | Zel; `ذَ` hecesi bundan türetilmiştir. |
| ر | DOĞRU; F:123 | Ra; `her ikisi`, F:129; bağlam önemlidir. |
| ز | DOĞRU; F:136 | Ze; üstün yazımı belgedeki `زَ`. |
| س | DOĞRU; F:149 | Sin; ince, F:155. |
| ش | DOĞRU; F:162 | Şın; Tip 3 taslağında ek çeldirici. |
| ص | DOĞRU; F:175 | Sad; kalın, F:181. |
| ض | DOĞRU; F:188 | Dad; Dal ile aynı ses değildir. |
| ط | DOĞRU; F:201 | Tı; kalın. |
| ظ | DOĞRU; F:214 | Zı; kalın. |
| ل | DOĞRU; F:292 | Lam; cezm örneğinin ikinci harfi. |
| و | DOĞRU; F:331 | Vav; her vav med değildir. |
| ه | DOĞRU; F:344 | He; kelime sonundaki her he otomatik zamir sayılmaz. |
| ي | DOĞRU; F:357 | Ye; kaynak elifba tablosu bazı yerlerde `ى` kullanır (J:15,33,51); körlemesine değiştirilmemeli. |
| لا | DOĞRU; F:370; J:15 | Lam+elif birleşimi; 29. kayıt, 29. bağımsız alfabe harfi değil. |
| ا، د، ذ، ر، ز، و | DOĞRU; F:13,104,117,130,143,338 | Kendinden **sonraki** harfe bağlanmayan altılı; öncekiyle bağlantıyı reddetmez. |
| ث/س/ص | KISMEN; F:45,149,175 | Harflerin hepsi var; G:30–32'de böyle bir `SIMILAR` grubu yok. |
| ذ/ز/ظ | KISMEN; F:110,136,214 | Hepsi var; mevcut görsel grup değil. |
| ح/خ/ه | KISMEN; F:71,84,344 | Hepsi var; mevcut grup `[5,6,7]` = ج/ح/خ. |
| ت/ط | KISMEN; F:32,201 | Var; mevcut `SIMILAR` çifti değil. |
| د/ض | KISMEN; F:97,188 | Var; mevcut `SIMILAR` çifti değil. |

| İşaret (belgedeki kaçış dahil) | Sonuç / kaynakta görünüş | Düzeltme |
|---|---|---|
| `َ`, `\u064E` | DOĞRU — fetha/üstün; J:45 | `بَ` gibi birleşimler ayrıca onay gerektirir. |
| `ِ`, `\u0650` | DOĞRU — kesra/esre; J:45 | İnce harfte “i” pedagojik gösterimi kullanılabilir. |
| `ُ`, `\u064F` | DOĞRU — damme/ötre; J:45 | “ü/u” iki kesin fonemmiş gibi otomatik üretme. |
| `ْ`, `\u0652`, `◌ْ` | DOĞRU — sükûn/cezm; J:51,57 | Daire `◌` görselleştirme tabanı, içerik harfi değil. |
| `ّ`, `\u0651`, `◌ّ` | DOĞRU — şedde; J:69 | Önceki harekeyle birleşme ve ünsüzün tekrarıdır. |
| `ً`, `\u064B`, `◌ً` | DOĞRU — iki üstün; J:93 | Vasıl/vakıf ayrımı olmadan “-en” genellemesi eksik. |
| `ٍ`, `\u064D`, `◌ٍ` | DOĞRU — iki esre; J:93 | İşaret bulunabilir; kelimenin doğru okunuşu ayrı veri. |
| `ٌ`, `\u064C`, `◌ٌ` | DOĞRU — iki ötre; J:93 | Aynı ayrım geçerli. |
| `ا/و/ي` med göstergesi | KISMEN; J:75 | Önceki uygun hareke ve harfin konumu/harekesizliği gerekir; salt harf varlığı yeterli değil. |

### 2.2 Bütün hece ve kelime örnekleri

**Q:** `apps/mobile/src/data/quran_arabic.json:1` (tek satırlık JSON; parantezde sure:ayet ayrıca verildi). “VERİDE YOK” dört dosyada bağımsız ve NFC eşdeğer sözcük bulunmadığını belirtir. “Diyanet'te yok” yalnız J'de bulunmama demektir. Kaynakta bulunması yazımı/öğretim uygunluğunu tek başına doğrulamaz.

| Örnek | Sonuç ve dosya:satır | Okunuş / taslak açısından değerlendirme |
|---|---|---|
| بَ | VERİDE YOK — türetilmiş hece | Be'nin üstünlü hali; “be” yaklaşık TR öğretim yazımı. J'de bağımsız kayıt diye gösterilemez. |
| بِ | VERİDE YOK — türetilmiş hece | “bi” doğru temel eşleştirme; taslaktaki doğru cevap uygun. |
| بُ | VERİDE YOK — türetilmiş hece | “bü” pedagojik yaklaşım; ses u–ü arası. |
| أَبْ | DOĞRU; J:51 | “eb” yaklaşımı; son Be cezimli. |
| إِبْ | DOĞRU; J:51 | “ib”; hemze altta, esre. |
| أُبْ | DOĞRU; J:51 | “üb” yaklaşımı; ötre için yukarıdaki ses notu. |
| أَىْ | DOĞRU — kaynakta var; J:51 | Noktasız `ى` yazımı korunmalı; “ey” yaklaşımı ancak insan onayıyla. |
| إِىْ | DOĞRU — kaynakta var; J:51 | “iy” yaklaşımı; metin içeriği bulunması ses doğrulaması değil. |
| أُىْ | DOĞRU — kaynakta var; J:51 | “üy” yaklaşımı; aynı sınırlama. |
| رَبَّ | KISMEN; Diyanet'te bu bağımsız biçim yok; Q (5:28), NFC | Şedde+üstün sırası farklı. “rabbe” yaklaşımı; bunu J'den alınmış örnek diye sunmak yanlış. |
| بًا | VERİDE YOK — türetilmiş hece | İki üstünlü alıştırma, “ben” yaklaşımı; bağımsız gerçek kelime değildir, vakıf ayrımı gerekir. |
| بَا | VERİDE YOK — türetilmiş hece | Uzun “bâ”; yeni alıştırma içeriğidir. |
| جبل | DOĞRU; J:21 | Bağlama örneği var; harekesiz metinden tek kesin okunuş çıkarılamaz. |
| فتح | DOĞRU; J:21 | Aynı sınırlama. |
| سمع | DOĞRU; J:33 | Aynı sınırlama. |
| شكر | VERİDE YOK | Eski belgedeki “Diyanet 2. Konu tablosunda” iddiası yanlış; tasarımda kaynaksız örnek üretmişim. `يَشْكُرُونَ` (J:81) aynı sözcük değildir. |
| حبل | VERİDE YOK | Taslak çeldiricisi; kaynaklı kelime gibi sunulmamalı. |
| جتل | VERİDE YOK | Taslakta üretilmiş çeldirici; gerçek kelime diye tanıtılamaz. |
| خبل | VERİDE YOK | Taslak çeldiricisi; kaynaklı kelime değil. |
| احد | DOĞRU; J:21 | Harekesiz/hemzesiz tablodaki biçim aynen var; `أَحَدٌ` ile aynı ham metin değil. |
| سال | DOĞRU; J:21 | Harekesiz konum örneği; ses anahtarı yok. |
| بدا | DOĞRU; J:21 | Aynı sınırlama. |
| بعث | DOĞRU; J:21 | Aynı sınırlama. |
| حسب | DOĞRU; J:21 | Aynı sınırlama. |
| رَزَقَ | DOĞRU; J:45 | `ra-ze-ka` yaklaşık Türkçe öğretim yazımı olabilir; kalın Kaf'ın mahrecini Latin `k` tek başına göstermez. Veride bu kelimeye bağlı bir Latin cevap anahtarı yok; yazım standardı insan onayıyla sabitlenmeli. |
| كُتُبُ | DOĞRU; J:45 | Fiil değil, isim biçimi; “28 fiil” iddiasını bozar. Belgede Latin karşılık verilmemiş. |
| قُلْ | DOĞRU; J:57 | Taslaktaki “kul” yaklaşık TR karşılık olarak uygun; Lam cezimli, kısa ses. |
| يَوْمَ | DOĞRU; J:57 | Cezm Vav üzerinde; med Vavı diye sınıflandırılamaz. Latin karşılık belgede yok. |
| نَعْبُدُ | DOĞRU; J:57 | Cezm Ayn üzerinde; Latin karşılık belgede yok. |
| رَبِّ | KISMEN; Diyanet'te bağımsız biçim yok; Q (1:2), NFC | “rabbi” yaklaşımı; kesra ve şedde sırası normalize edilebilir, harekesi değiştirilemez. |
| جَنَّةُ | DOĞRU; J:69 | Şedde Nun'da; Latin karşılık belgede yok. |
| قَالَ | DOĞRU; J:81 | Med örneği; uzun ünlü kaybolmamalı. |
| غَفُورٌ | KISMEN; Diyanet med sayfasında yok; Q (2:173) | Kurandaki örnek var; J/DB med alıştırmasından gelmiyor. |
| أَحَدٌ | DOĞRU; J:93 | İki ötre; vakıfta son tenvin okunmaz. |
| حَكِيمًا | DOĞRU; J:93 | İki üstün ve med içerir; yalnız tek kural içeren kelime sayılmamalı. |
| بِاللَّهِ | KISMEN; J:117 (s.25) | Veride var, s.13–24/DB ders9 kapsamı iddiası yanlış. Başındaki esreden dolayı lam ince okunur. |
| لَهُ | KISMEN; Diyanet'te bağımsız biçim yok; Q (2:206) | Zamir he'sinin uzatılması komşu bağlama bağlı; izole kelimeden uzunluk anahtarı üretme. |
| الله | DOĞRU; J:105 | Lafzatullah etiketi; harekesiz tek başına kalın/ince sorusunun cevabını belirlemez. |
| قَرَأَ | DOĞRU; J:45 | Şedde yok; taslakta yanlış seçenek olması uygun. |
| قَبْلَ | DOĞRU; J:57 | Cezm var, şedde yok. |
| حَقَّ | DOĞRU; J:69 | Şedde var; Tip5 taslağında tek doğru seçenek. |
| رَ | VERİDE YOK — bağımsız hece | `رَزَقَ` içinden türetilebilir; kelime kaydı diye gösterilmez. |
| زَ | VERİDE YOK — bağımsız hece | Aynı ayrım. |
| قَ | VERİDE YOK — bağımsız hece | Kaf'ın üstünlü hali; “ka” ince Kef'ten ayırt edilmelidir. |
| ذَ | VERİDE YOK — bağımsız hece | Taslak çeldiricisi; mahreç farkı yalnız Latin “z” ile kaybolabilir. |
| رَجَعَ | DOĞRU; J:45 | Harekeli üç harfli örnek; Latin karşılık belgede yok. |
| ضَرَبَ | DOĞRU; J:45 | Aynı kaynak; Dad ayrımı korunmalı. |
| شَهِدَ | DOĞRU; J:45 | Aynı kaynak; ortadaki hareke esre. |
| عَمِلَ | DOĞRU; J:45 | Aynı kaynak; Ayn ayrımı korunmalı. |

`رَزَقَ` için `ze` hecesi Türkçe ince harf öğretiminde kullanılabilir. Dolayısıyla **tek başına “ze yanlış” veya “ka yanlış” kesin hükmü kurulamaz**. Belgenin eksikliği, yaklaşık yazımla mahreçleri ayıran transliterasyonun farkını açıklamaması ve onaylı bir yazım standardı tanımlamamasıdır. Bu örnek yeni cevap anahtarı olarak onaylanmış değildir.

### 2.3 Belgede yazılmış bütün Türkçe okunuşlar

| Yazım | Sonuç | Açıklama / kanıt |
|---|---|---|
| `eş-şems`, `el-şems` | DOĞRU / YANLIŞ (belgenin soru karşıtlığı olarak doğru) | Şın şemsiye harfidir; idğamlı seçenek doğru. `apps/mobile/src/data/content/harf_i_tarif.json:77–81`; H:23–28 yalnız seçenek metnini ayrıştırır. |
| `be`, `bi`, `bü`, `eb` | KISMEN | Taslaktaki `بِ` için yalnız `bi` doğru; diğerleri çeldirici. Bu dört hece için veri dosyasında onaylı TR karşılık tablosu yok; F:18 yalnız `B` verir. Ötre “bü” yaklaşık yazımdır. |
| `be/ba`, `bi/bı`, `bü/bu` | KISMEN | Genel pedagojik ünlü karşıtlıkları; tek bir Be'nin kalın/ince iki okunuşu gibi uygulanamaz. Elif/Ra/Lam bağlamı ve mahreç için F:12,129 ve J:105; kesin otomatik fonksiyon önerisi geri çekilmeli. |
| `-en/-in/-un` | KISMEN | Tenvin sona n getirir (J:87); kalınlık, ötre yaklaşımı ve vakıf/vasıl olmadan tüm kelimeler için değişmez son ek değildir. |
| `kul` | DOĞRU — yaklaşık TR | `قُلْ`, J:57; Lam cezimli açıklaması doğru. “Türkçe kul kelimesinin sesiyle tamamen aynıdır” denemez; Kaf mahreci ayrı. |
| `kale`, `külli`, `kil` | DOĞRU — yalnız çeldirici göreviyle | `قُلْ` için üçü de yanlış cevap. Bunların başka gerçek kelimeler olduğu veya veriden alındığı iddia edilmemeli. |
| `ra - ze - ka` | KISMEN | Öğretim standardı belirtilmediği için doğrulanmış tek karşılık değil; yukarıdaki açıklama. Yeni TR/EN okunuşu otomatik türetilemez. |
| `Sad (kalın)`, `Sin (ince)` | DOĞRU | F:173–181,147–155; fakat bunlar tam bir mahreç farkı açıklaması değil, kalınlık etiketidir. |

## 3) Belgede düzeltilmesi gerekenler

1. Durum kutusunu güncelle: Adım 2 **saf mantık + storage/backup anahtarı tamamlandı**, UI henüz bağlı değil. Adım 1/3/4 yapılmadı. “Öğe kaydı yok” ile “kayıt altyapısı yok” ayrılmalı.
2. 185 sayısını kaldır; sayım tanımını yaz: s.13/15/17/19/21/24 için 196 geçiş, 178 farklı yazım. s.9–11 için 84 konum hücresi doğru. “28 fiil” yerine “28 alıştırma hücresi”; hepsi fiil ve yalnız hareke örneği değil.
3. `شكر`, `حبل`, `جتل`, `خبل` ve bağımsız türetilmiş heceleri kaynak alıntısı gibi sunma. `رَبَّ/رَبِّ/غَفُورٌ/لَهُ` için Q kaynağını ayır. `بِاللَّهِ` s.25'tedir, DB ders9'a aktarılmamış.
4. `syllableReadingTr(harfSes,kalinInce,hareke)` ile doğrulanmış TR/EN üretileceği vaadini kaldır. Her yeni Arapça/Latin soru-şık-ipucu satırı onaylı içerik girdisi olmalı. Normalizasyon ve transliterasyon **üretim/doğrulama** aynı şey değildir.
5. `readingTr.ts` ve `translitEn.ts` açıklamalarını düzelt: Latin→Latin işlevler. Tenvin, vakıf/vasıl, Ra/Lam, zamir ve med için bağlam sözleşmesi olmadan otomatik cevap anahtarı çıkarma. `hasMed` salt harf araması olamaz.
6. `SIMILAR` için mevcut ID gruplarını referans ver; önerilen fonetik gruplar yeni pedagojik karardır. Ses dosyalarının varlığını ses içeriğinin doğrulanması diye raporlama; EveryAyah kelime sesi/lisansı ve R2 zorunluluğu doğrulanmamış.
7. `QuizView` yeni tip/prop'larını öneri olarak işaretle. Seçenek sayısına UI'nin sınır koymadığını, Lottie'nin koşullu olduğunu, normal skorun sonuçtaki dönüş düğmesinde yazıldığını belirt.
8. SRS seçimi 5/3 **öncelik** kotasıdır; fallback sınırı aşabilir. Seçici yalnız `q:` anahtarlarını okur; yeni doğru kaydedilmez. `lastTs` zaman planlaması yapmaz. Rozet oranlıdır; 15/15 ve yanlış varken `master` döner.
9. Rozet/tekrar için soru→ders katalog ihtiyacını ekle. Quiz kimlikleri bugün G:130–138 ile silinip sıradan yeniden atanıyor; bu davranış SRS'i yanlış soruya bağlar. Kimlik koruması DB paketinin zorunlu kabul koşuludur.
10. `icerik_json` gerçek biçimini ve literal `\n` sorununu yaz. `ek_tablolar` ve `alistirma` ayrıştırılmalı; boş/bozuk/eksik alanda eski kart akışı sürmeli. İngilizce kullanıcıya çevrilmemiş TR konu paragrafını kendiliğinden ekleme.
11. Ders ve quiz route'larında bir yıllık shared cache var (`dersler/route.ts:23`, `quiz/[lessonId]/route.ts:40`), mobilde yedi günlük cache var. Master/deploy ve cache yenilenmesi gerçekleşmeden yeni alana güvenilemez.
12. Dört “bağımsız” adımı aşağıdaki sekiz bağımlı, tek commit paketine çevir. DB yazan betik hazırlamakla çalıştırmak ayrı eylemlerdir; bu görev hiçbirine uygulama izni vermiyor.

## 4) Paket listesi

### Bütün paketlerde uygulanacak kurallar

- Her paket **tek commit**; belirtilmeyen dosyaya dokunma. Aşağıdaki “dokunulmayacaklar” buna ek kritik yasakları vurgular. Yeni dosya açıkça “yeni” yazılmıştır. Eski tasarım belgesini uygulama commit'lerine katma.
- Test edilen modül büyük JSON veya uzantısız **runtime** göreli import yüklememeli. Saf işlev + bağımlılık enjeksiyonu kullan; test importları `.ts` uzantılı olmalı. Gereken tipleri `import type` ile al; UI, storage, API, JSON yüklemelerini ayrı adaptörde tut.
- Uygulama kodunda `import.meta` / `createRequire` **YOK**; Metro/Hermes uyumu korunacak. Yeni bağımlılık ekleme. Betiklerin mevcut Node ESM düzenini mobil koda taşıma.
- Yeni UI metinleri yalnız `C:\Projects\kuran_app\apps\mobile\src\i18n\strings\elifba.ts` içinde TR+EN; boş/hata/erişilebilirlik metinleri dahil. Renkler `useColors()` token'larından; yeni sabit renk yazma. RTL, Amiri ve ekran okuyucu etiketlerini koru.
- Kökten test: `NODE_OPTIONS=--test-isolation=none npm run test:mobile`. PowerShell eşdeğeri: `$env:NODE_OPTIONS='--test-isolation=none'` ardından `npm run test:mobile`. Tip: `cd apps/mobile && npx tsc --noEmit -p tsconfig.json`. Ortam değişkenini iş sonunda önceki değerine geri getir. Uzun/yüksek çıktılı komutlarda `.agents/skills/efficient-coding/SKILL.md` bölüm 7 uygulanacak: bir çalıştırma, loga yönlendirme, özet ve seyrek kontrol; hata nedenini değiştirmeden tekrar yok.
- UI içeren pakette Android üzerinde TR+EN, açık+koyu tema; test edilen akışta çıkış/geri dönüş, boş havuz, ağ ve storage hatası kontrolü. Kod testi saf mantığı kanıtlar, ses/UI davranışı için manuel kontrol ayrıca yazılır. Bu denetim görevinde test/typecheck çalıştırılmadı; yalnız belge değişti.
- `[CANLI-DB]`: app.db/Turso yazma **kullanıcı onayı olmadan çalıştırılmaz**. `[WEB-API]`: mobil alan yokken de çalışır; master+deploy öncesi alan zorunlu tutulmaz. `[ARAPÇA]`: yeni Arapça içerik/okunuş/çeldirici insan doğrulaması olmadan etkinleştirilmez. Riskler aynı pakette karıştırılmayacak.

### Paket 1 — Mevcut quiz'i sunum bileşenine ayır ve SRS'i bağla

**Amaç:** Var olan normal 15 soruluk testte yanlışları hemen kaydet; mevcut Leitner seçiciyi kullan. Adım 2'yi yeniden yazmadan Adım 4'ün temel bağlantısını bitir.

**Dokunulacak tam yollar:**

- `C:\Projects\kuran_app\apps\mobile\app\elifba\[dersId].tsx`
- `C:\Projects\kuran_app\apps\mobile\src\components\ElifbaQuizView.tsx` (yeni)
- `C:\Projects\kuran_app\apps\mobile\src\lib\elifbaQuizSession.ts` (yeni)
- `C:\Projects\kuran_app\apps\mobile\src\lib\elifbaQuizSession.test.ts` (yeni)
- `C:\Projects\kuran_app\apps\mobile\src\i18n\strings\elifba.ts`

**Dokunulmayacaklar:** `elifbaProgress.ts` algoritmaları/testleri, storage anahtarları, cloudBackup, ana ders listesi, web, DB, JSON kaynakları.

**Kesin sözleşme:** Saf modülde mevcut soru tipinin yapısal eşdeğeri `QuizQuestion` export et: `quiz_id:number;lesson_id:number;soru:string;secenekler:string[];dogru_cevap:string;ipucu:string|null;zorluk:number`. `normalizeQuizQuestions(pool: readonly QuizQuestion[]): QuizQuestion[]` mevcut normalizasyonu taşır; ek olarak en az iki benzersiz şık şartı koyar. `answerOnce(state: AnswerState, q: QuizQuestion, answer: string, nowSec: number, updateSrs: (map:ElifbaSrsMap,id:string,correct:boolean,ts:number)=>ElifbaSrsMap): AnswerState`; `AnswerState={answeredIds:number[];score:number;srs:ElifbaSrsMap}`; listedeki soruya ikinci yanıt veya şıklarda olmayan yanıt no-op. Yan etki yok; çağıran mevcut `updateElifbaSrs` işlevini geçirir. Böylece test modülünde uzantısız runtime import gerekmez; SRS tipi yalnız `import type` ile alınır.

`ElifbaQuizView({questions,onAnswer,onFinish})` export edilir: `questions: QuizQuestion[]`, `onAnswer:(q:QuizQuestion,correct:boolean)=>void`, `onFinish:(score:number,total:number)=>void`. API/storage/yerelleştirme/seçim içermez. Soru kartı, `renderSoru`, seçenekler, ipucu, konfeti, sonuç davranışı korunur. Sorular yüklenip sabitlendiğinde yeni oturum anahtarıyla mount edilir; render başına yeniden seçilmez.

Ders ekranı normalizasyon+yerelleştirme sonrası `selectQuizQuestionsWithSrs(pool,srs,15)` çağırır. SRS depodan okunana kadar cevaplamayı açmaz; okuma hatasında boş harita ve görünür tekrar deneme durumu. Yanıtta ref'teki son map güncellenir, `q:${quiz_id}` kullanılır, `Math.floor(Date.now()/1000)` geçirilir; storage yazmaları tek promise kuyruğunda sırayla yapılır. Effect veya React state updater içinde yazma yok. Çift dokunma ref kilidiyle kesilir; yazma hatası görünür olur ve tekrar aynı **snapshot** kaydedilir (yanlış sayısını tekrar artırma). Normal test skoru mevcut bitirme callback'inde kalır.

**Test:** `elifbaQuizSession.test.ts`: bozuk/tek şıklı soruyu eleme, doğru şık zorunluluğu, kopya şıkları silme; tek yanıt/çift yanıt/şık dışı yanıt; yanlışta q anahtarı, yeni doğruda kayıt yok; skor ve girdi immutability. Mevcut `elifbaProgress.test.ts` zaten kutu/seçim/rozet algoritmasını kapsar; kopya test yazma. UI'de yarıda çıkışta yanıtlanan yanlış kalmalı, normal skor henüz değişmemeli.

**Bağımlılık:** Tamamlanmış Adım 2. **Risk:** Yok (yalnız mevcut mobil soru verisi).

### Paket 2 — Ders rozetleri ve ayrı yanlış tekrar oturumu

**Amaç:** Normal test skorunu bozmadan Kutu1 sorularını tekrar ettir. Rozetleri yalnız dersle eşleştirilebilen sorulardan hesapla.

**Dokunulacak tam yollar:**

- `C:\Projects\kuran_app\apps\mobile\app\elifba\index.tsx`
- `C:\Projects\kuran_app\apps\mobile\app\elifba\tekrar.tsx` (yeni)
- `C:\Projects\kuran_app\apps\mobile\src\lib\elifbaReview.ts` (yeni)
- `C:\Projects\kuran_app\apps\mobile\src\lib\elifbaReview.test.ts` (yeni)
- `C:\Projects\kuran_app\apps\mobile\src\i18n\strings\elifba.ts`

**Dokunulmayacaklar:** Ders kilit işlevleri, normal `quizScores` yazımı, web/DB, ses ve Arapça veri.

**Kesin sözleşme:** `indexLessonQuestions(pools: readonly (readonly {quiz_id:number;lesson_id:number}[])[]): Record<string,number>` q anahtarı→ders ID döndürür; çakışan farklı ders ID'sindeki quiz ID'sini dışlar. `countLessonWrong(srs:ElifbaSrsMap,catalog:Record<string,number>,lessonId:number):number`; `selectWrongReview<T extends {quiz_id:number}>(pool:readonly T[],srs:ElifbaSrsMap,count:number,rng:()=>number):T[]` yalnız Kutu1 ve benzersiz ID, en fazla count; boşta `[]`. Algoritma `elifbaProgress` seçicisinin normal havuz fallback'ini tekrar için kullanmaz.

Ana ekranda mevcut `api.elifba.quiz(ders.id)` sonuçlarından katalog hazırlanır; odakta SRS/skor tekrar okunur. Başarısız ders istekleri ders bazında yeniden denenebilir; **eksik katalogda taç gösterme**. `computeLessonBadge` mevcut işlevi DI ile geçirilir; skor yoksa `none`. Normal test puanı ile rozet gösterilir, kilitler aynen kalır. Mevcut tamamlama yıldızı ile yeni başarı rozeti ayrı erişilebilir etiket taşır.

Katalogla çözümlenebilen, açık/tamamlanmış derslere ait Kutu1 sayısı N>0 ise `Yanlışlarımı Tekrar Et (N)` / `Review mistakes (N)` düğmesi `/elifba/tekrar` açar. Tekrar ekranı aynı açık ders havuzlarını yükler, dil uygular, saf seçiciyle en fazla 15 yanlış seçer. Başlangıç soruları oturum boyunca sabit; her yanıt Paket1 düzeniyle SRS yazar. `quizScores` ve kart ilerlemesine **yazmaz**. Soruların hepsi doğruysa bu oturum sonucu gösterilir, sonraki açılışta hâlâ Kutu1 olanlar kalır. Eksik katalog/boş/ağ hatasında uygun boş durum ve tekrar deneme; yetim q kayıtları silinmez ve N'ye katılmaz.

**Test:** `elifbaReview.test.ts`: derslere ayrım, aynı quiz ID'si/çakışma, yetim q ve `harf:` dışlama, kilitli dersleri çağıranın filtrelemesi için fixture, yalnız Kutu1, 0/15/16 soru, RNG determinismi/immutability. UI: 15/15+yanlışta master; tümü çözülünce taç; eksik katalogda taç yok; tekrar sonucu normal son skoru değiştirmez.

**Bağımlılık:** Paket1. **Risk:** Yok; ek API alanı istemez, var olan endpoint/cache'i kullanır.

### Paket 3 — Mevcut 29 sesle Dinle-Seç

**Amaç:** Yeni Arapça veya fonetik gruplar üretmeden mevcut harf kayıtlarından dinleme testi oluştur. Ağ hatasında aynı öğeyi görsel tanıma sorusuna çevir.

**Dokunulacak tam yollar:**

- `C:\Projects\kuran_app\apps\mobile\app\elifba\[dersId].tsx`
- `C:\Projects\kuran_app\apps\mobile\src\components\ElifbaQuizView.tsx`
- `C:\Projects\kuran_app\apps\mobile\src\lib\elifbaAudio.ts` (yeni; D'deki ses yardımcılarını buraya taşı)
- `C:\Projects\kuran_app\apps\mobile\src\lib\elifbaListening.ts` (yeni; saf)
- `C:\Projects\kuran_app\apps\mobile\src\lib\elifbaListening.test.ts` (yeni)
- `C:\Projects\kuran_app\apps\mobile\src\i18n\strings\elifba.ts`

**Dokunulmayacaklar:** MP3'ler, DB/web, `SIMILAR`, mevcut normal quiz ID'leri, `quizScores`, Arapça/Latin içerik kaynakları. Tekrar ekranı bu ayrı modu kapsamına almaz.

**Kesin sözleşme:** Kartlar/Test yanına ayrı `Dinle` / `Listen` modu koy. `buildListeningItems(letters:readonly Letter[],rng:()=>number):ListeningItem[]`; `Letter={harf_id:number;tek_basina:string;harf_adi:string}`; `ListeningItem={itemId:string;audioHarfId:number;options:{id:number;label:string}[];correctId:number;fallbackLabel:string}`. itemId `listen:harf:${id}`; doğru glif + havuzdan üç farklı mevcut glif, dört benzersiz seçenek bulunamazsa öğe atlanır. En fazla 15, kaynak diziyi değiştirme. Ürün kararı gerektiren “benzer ses” grubu kurma; mevcut harf havuzundan RNG ile seç. Şık kimliği ID'dir, çeviri etiketi değildir.

`ElifbaQuizView` için dinleme dalı ayrı discriminant ile tanımlanır: `kind:'listening'`, yukarıdaki öğe; `onPlayAudio:(harfId:number,onError:()=>void)=>()=>void` enjekte edilir. Normal soru tipi/yanıt callback'i korunur. Soruda doğru glifi/adı başlangıçta gösterme; buton ve ekran okuyucu etiketi cevabı sızdırmasın. Mount'ta bir kez çal, tekrar basılabilir. Ses hatası/3 sn yüklenmeme halinde aynı soru `fallbackLabel` (harf adı) ile “Bu harf hangisi?” görsel sorusuna dönüşür, otomatik yanıt verilmez. Eski player/listener/timer soru değişiminde ve unmount'ta temizlenir; gecikmiş hata yeni soruyu etkilemez. İptal player'ı durdurup kaldırmalıdır; mevcut yalnız listener iptali bu kullanım için yeterli değildir.

Bu ayrı mod yalnız `listen:harf:*` SRS kayıtlarını günceller; normal quiz skoru ve q kataloğuna yazmaz. Paket2'nin N sayacı bu kimlikleri bilerek kapsamaz. Tamamlama kilidi için normal Test gerekir.

**Test:** `elifbaListening.test.ts`: 0–3 benzersiz harf→boş, 4 harf→dört benzersiz şık, doğru ID şıklarda, 29 ID/15 sınırı, aynı glifli kayıtlar, deterministik RNG, sabit ID/immutability. Manuel: otomatik çalma, yeniden çalma, uçak modu→fallback, hızlı soru değişimi, geri çıkışta ses kesilmesi, erişilebilirlikte cevap sızmaması.

**Bağımlılık:** Paket1; önerilen sırada Paket2 sonrası. **Risk:** Yok; yeni Arapça/okunuş üretmez. MP3 telaffuz kalitesinin bu commit'le doğrulandığı iddia edilmez.

### Paket 4 — Harf-i Tarif son tamamlanmış testini sakla

**Amaç:** 25 soruluk mini testin son tamamlanmış sonucunu geri dönünce göster. Yeni ilerleme/backup anahtarı açmadan mevcut skor haritasını kullan.

**Dokunulacak tam yollar:**

- `C:\Projects\kuran_app\apps\mobile\src\components\HarfITarifContent.tsx`
- `C:\Projects\kuran_app\apps\mobile\src\lib\harfITarifScore.ts` (yeni)
- `C:\Projects\kuran_app\apps\mobile\src\lib\harfITarifScore.test.ts` (yeni)
- `C:\Projects\kuran_app\apps\mobile\src\i18n\strings\elifba.ts`

**Dokunulmayacaklar:** Harf-i Tarif JSON'ları/içerik metinleri, normal ders kilitleri, `parseElifbaQuizScores`, SRS, storage/backup anahtar listeleri.

**Kesin sözleşme:** `const HARF_I_TARIF_SCORE_ID='1000'` (mevcut dersler 1–9; bu sanal skor anahtarıdır, API ders ID'si değildir). `summarizeHarfITarif(ids:readonly string[],answers:Record<string,boolean>):{score:number;total:number}|null`; yalnız tüm benzersiz soru ID'leri yanıtlandığında sonuç, ekstra ID'ler sayılmaz, boş/kopya ID listesinde null. `mergeHarfITarifScore(scores:Record<string,{score:number;total:number}>,result:{score:number;total:number}):Record<string,{score:number;total:number}>` yeni map döndürür; sadece `1000` değişir.

Quiz açılışında `quizScores` parse edilip `1000` sonucu `Son tamamlanan test: X/Y` / `Last completed quiz: X/Y` olarak gösterilir. Son yanıt verildiğinde bir kez read-merge-write yap; yazma sonucu/hatası UI'de görünür, tekrar deneme aynı snapshot'ı kaydeder. Yeniden başlatmak veya yarım bırakmak eski tamamlanmış sonucu silmez. Mevcut BACKUP_KEYS zaten bu haritayı kapsar. Sanal skor gerçek ders listesine, rozet veya kilit hesaplarına sokulmaz.

**Test:** `harfITarifScore.test.ts`: boş/eksik/tam 25, doğru-yanlış karışık, fazladan cevap, duplicate ID, diğer ders skorlarını koruma, girdi değişmezliği. Manuel: tamamla→sekmeden çık→geri dön; yeniden başlat/yarım bırak; storage hata/tekrar deneme.

**Bağımlılık:** Adım2 parser'ları mevcut; Paket1–3'ten bağımsız uygulanabilir. **Risk:** Yok.

### Paket 5 — Opsiyonel ders içeriğini mobilde güvenle göster

**Amaç:** Adım3'ün mobil tarafını eski API/cached yanıtlarda bozulmadan hazırla. Mevcut veriyi göster; yeni okunuş veya kural sorusu üretme.

**Dokunulacak tam yollar:**

- `C:\Projects\kuran_app\apps\mobile\src\lib\api.ts` (yalnız `ElifbaDers` tipi)
- `C:\Projects\kuran_app\apps\mobile\src\lib\elifbaLessonContent.ts` (yeni)
- `C:\Projects\kuran_app\apps\mobile\src\lib\elifbaLessonContent.test.ts` (yeni)
- `C:\Projects\kuran_app\apps\mobile\src\components\ElifbaLessonContent.tsx` (yeni)
- `C:\Projects\kuran_app\apps\mobile\app\elifba\[dersId].tsx`
- `C:\Projects\kuran_app\apps\mobile\src\i18n\strings\elifba.ts`

**Dokunulmayacaklar:** Web/DB/cache sürümü, Arapça kaynak JSON, otomatik transliterasyon, mevcut kart görülme/kilit mantığı.

**Kesin sözleşme:** `ElifbaDers` içine `icerik_json?:string|null`. Saf modülde `parseDersIcerik(raw:string|null|undefined):{aciklama:string|null;kelimeler:string[]}`; ayrı test edilebilir `extractArabicCells(text:string):string[]`. Yalnız plain object kabul et; hatalı JSON/alan tipi→ilgili alan boş. Literal `\\n` dizisini satır sonuna dönüştür. `aciklama` içindeki ilk Markdown tablo öncesini özet al; `alistirma` ve açıklama/`ek_tablolar[].icerik` tablolarındaki Arapça hücreleri kaynak sırasıyla, aynı ham metin tekrarını kaldırarak topla. `|Sonda|Ortada|Başta|Harfler|` tablosunda yalnız ilk üç hücre; harf sütununu kelime yapma. Düz alıştırma satırlarını boşluk/`|` ile ayır; Arapça harf+işaretleri koru, hareke silme/med ekleme yok. Maksimum gösterim 12 kelime/çip; parser tüm geçerli kelimeleri döndürür.

Ders ekranı mevcut ders listesi endpoint'inden kendi `id` kaydını bulur; bu yardımcı istek kartların yüklenmesini engellemez. Alan eksik/bozuk/boşsa bölüm tamamen gizli, harf kartları normal çalışır. Bölüm yalnız Kartlar modunun üstünde; çipler salt gösterim, ses/çeviri/okunuş iddiası yok. TR'de mevcut açıklama gösterilir; EN'de **TR paragrafı gösterilmez**, yalnız çevrili “Examples” başlığı ve Arapça çipler gösterilir. Yeni açıklama çevirisi üretmek bu paketin işi değildir. Uzun metin/çipler kaydırılabilir; içerik ilerleme veya kilit kazanımı sayılmaz.

**Test:** `elifbaLessonContent.test.ts`: undefined/null/bozuk JSON/array/yanlış alanlar, gerçek ve literal satır sonu, `alistirma=null`, ek tablolar, 84 hücre mantığı küçük fixture'la, tekrarlar, Arapça işaretleri aynen koruma, TR metni kelimeye çevirmeme. Manuel: eski API yanıtı, yeni yanıt fixture'ı, EN/TR, uzun açıklama, istek hatasında harf kartlarının çalışması.

**Bağımlılık:** Mevcut API; Paket1 sonrasında aynı ders dosyasında uygulanması önerilir. **Risk:** Yok; üretimde alan bulunmasına güvenmez.

### Paket 6 — Ders API'sinde içeriği opsiyonel sun [WEB-API]

**Amaç:** Hazır DB sütununu mobilin kullanabileceği geriye uyumlu yanıta ekle. Mobil Paket5 canlı alan gelene kadar mevcut davranışını korur.

**Dokunulacak tam yollar:**

- `C:\Projects\kuran_app\apps\web\src\app\api\elifba\dersler\route.ts`

**Dokunulmayacaklar:** Tüm mobil dosyalar, diğer web route'ları, DB, schema/migration, JSON, çeviriler.

**Kesin sözleşme:** `DersRow.icerik_json:string|null` ekle; SELECT'e `d.icerik_json` ekle, diğer kolonları/sıralamayı/COUNT eşlemesini koru. GROUP BY'ı seçilen ders kolonlarıyla açık hale getir. Boş/null içeriği null döndür, yeni endpoint açma; JSON içini route'ta yorumlama. Ders route'unun uzun shared-cache başlığını `public, s-maxage=3600, stale-while-revalidate=86400` yap; mevcut cache'in deploy sonrası yenilendiği ayrıca gözlenmeden tüm istemciler alan alıyor denmesin.

**Test:** Yeni saf işlev gerekmez; yalnız SQL alan ekleme için yapay birim testi yazma. Yerel read-only DB ile GET yanıtında dokuz ders, eski alanların aynı değerleri ve içeriğin string/null olması doğrulanır; başarısız DB'de mevcut 500 korunur. Paket5 parser testleri null/eksik alanı zaten kapsar. Kökten `npm run typecheck --workspace=@quran-app/web` çalıştır (`apps/web/package.json:9`); web build ancak yeni hata/entegrasyon belirsizliği gerekçesi varsa `npm run build --workspace=@quran-app/web`. Mobil test komutunun web doğrulaması olduğu söylenmez.

**Bağımlılık:** Paket5'in eksik alan desteği önce hazır olmalı; deploy bu paketin kod hazırlığından ayrı. **Risk:** **[WEB-API]** — master'a birleşip canlıya çıkmadan mobil buna güvenemez; bu paket DB yazmaz.

### Paket 7 — Onaylı konu soruları için saf üretici ve mobil yerel havuz [ARAPÇA]

**Amaç:** Adım1'i güvenli bir ilk dikey dilim olarak tamamla: genel harf algoritmasından okunuş uydurmak yerine insanın onayladığı küçük TR+EN soru bankasını doğrula ve mobilde kullan. Kapsam Tip1/2/4/5; Tip6 sıralı hece kurma eski Adım1/3/4 tesliminin dışında, ayrı gelecek özelliktir.

**Dokunulacak tam yollar:**

- `C:\Projects\kuran_app\content\elifba\exercises.reviewed.json` (yeni)
- `C:\Projects\kuran_app\apps\mobile\src\lib\elifbaExerciseGen.ts` (yeni; saf)
- `C:\Projects\kuran_app\apps\mobile\src\lib\elifbaExerciseGen.test.ts` (yeni)
- `C:\Projects\kuran_app\scripts\build-elifba-exercises.mjs` (yeni; yalnız dosya üretir)
- `C:\Projects\kuran_app\apps\mobile\src\data\elifba.exercises.json` (yeni; üretilmiş)
- `C:\Projects\kuran_app\apps\mobile\app\elifba\[dersId].tsx`
- `C:\Projects\kuran_app\apps\mobile\src\i18n\strings\elifba.ts`

**Dokunulmayacaklar:** DB/Turso, `_build-elifba-quiz.mjs`, web/API, eski `source.tr.json`/EN sözlükleri, mevcut harf/Kuran/Diyanet JSON'ları, transliterasyon motorları, sesler.

**Kesin sözleşme:** Girdi `ReviewedExercise={key:string;lessonId:number;kind:'mark'|'position'|'reading'|'rule';source:{path:string;line:number;page?:number};arabic:string;tr:{prompt:string;options:string[];answer:string;hint:string};en:{prompt:string;options:string[];answer:string;hint:string};review:{status:'draft'|'approved';reviewer:string;date:string};quizId:number}`. Soru/şık/okunuş/ipucu **tamamı hazır içerik**; DeepSeek çeldirici veya okunuş icat etmez. Her Arapça parça için kaynak/provenans veya açık “türetilmiş, insan onaylı” kaydı gerekir; kaynak satırı değiştirilirse tekrar inceleme. Taslak `approved` yapılamaz; doğrulayıcı adı/onayı gerçek insan tarafından sağlanır.

Kalıcı ID aralığı `100000..199999`; onaylı bir key'e atanmış ID asla yeniden kullanılmaz. Her derse 2–9 için ilk aşamada **iki onaylı soru** yeterli; bu 16 öğelik küçük başlangıç bankasıdır, 45/derse tam otomatik genişletme vaadi yok. Ders8/9 için kaynak kusurlu veya bağlam yetersizse paket onaylı girdi gelmeden tamamlanmış sayılamaz; model doldurmaz. Mevcut içerikte kusur bulmak kaynak dosyalarını bu pakette değiştirme izni değildir.

Saf imzalar: `validateExercises(rows:readonly ReviewedExercise[]):{valid:ReviewedExercise[];errors:string[]}`; `buildExerciseQuestions(rows:readonly ReviewedExercise[],lessonId:number,lang:'tr'|'en'):QuizQuestion[]`. Yalnız approved+reviewer+date dolu, doğru ders, benzersiz key/ID, 2–4 benzersiz şık ve şıklarda doğru cevap; Arapça metin aynen korunur. Eksik TR/EN veya onaysız satır geçersiz. Üretici hatada dosya yazmadan nonzero çıkar. Modüle sözlük/veri dışarıdan verilir; büyük JSON importu yok. `syllableReadingTr` ve `hasMed` otomatik üreticisi **yazılmaz**; işaret/rule cevabı onaylı kayıttan gelir.

Mobil normal teste ek bir `Alıştırmalar` / `Exercises` modu ekle; bu mod yalnız gömülü bankadaki ilgili ders sorularını gösterir, Paket1 sunum bileşenini kullanır. Normal q havuzu ve kilit skoru değişmez. SRS anahtarı `exercise:${quiz_id}`; aynı 16 öğe DB'ye çıksa bile normal q ile karışmaz. Paket2 tekrarı bu ilk dilimde yalnız API `q:` sorularını kapsar; düğme metni/erişilebilirlik etiketi “Test yanlışları” kapsamını açıklar. Yeni havuz varsa bile normal Test düğmesinin anlamını sessizce değiştirme.

**Test:** `elifbaExerciseGen.test.ts`: draft/eksik onay/eksik EN reddi, duplicate key/ID/aralık, ders filtresi, şık çakışması/doğru cevap yok, kimliklerin sıradan bağımsızlığı, Unicode ve kaynak metnini koruma, iki dilde aynı doğru öğe, boş banka; fixture'lar küçük ve DI. Üretim betiği aynı onaylı girdide aynı JSON'u üretmeli. Manuel: yalnız approved öğe, normal test skoru ve kilit etkilenmez, EN bankası tamdır.

**Bağımlılık:** Paket1; Paket5/6 gerekmez. **Risk:** **[ARAPÇA]** — onaylı 16 satır ve TR/EN okunuş/çeldirici incelemesi gerekli. Bu girdi yokken yalnız taslak hazırlamak teslimin tamamlanması değildir. DB veya web değişikliği bu commit'e katılmaz.

### Paket 8 — Onaylı soruları DB'ye güvenli aktaracak betik [CANLI-DB]

**Amaç:** Adım1'in sunucu veri dağıtımını ayrı tut; mevcut quiz ID'lerini ve kullanıcı SRS ilişkilerini koru. Varsayılan çalışma salt okunur plan üretir; onaysız gerçek yazma yapılmaz.

**Dokunulacak tam yollar:**

- `C:\Projects\kuran_app\scripts\_build-elifba-quiz.mjs`
- `C:\Projects\kuran_app\scripts\lib\elifbaQuizWritePlan.mjs` (yeni; saf)
- `C:\Projects\kuran_app\scripts\lib\elifbaQuizWritePlan.test.mjs` (yeni)
- `C:\Projects\kuran_app\scripts\export-elifba-source.mjs` (yalnız gerektiğinde girdi DB yolu seçeneği)
- `C:\Projects\kuran_app\content\elifba\source.tr.json` (onaylı girdiden hazırlanan aday snapshot)
- `C:\Projects\kuran_app\content\elifba\strings.en.json` (aynı hazır onaylı EN metinleri)
- `C:\Projects\kuran_app\apps\mobile\src\data\elifba.en.json` (mevcut build ile üretilen sözlük)

**Dokunulmayacaklar:** `data/app.db` (onay öncesi), canlı Turso (onay öncesi), web route'ları, mobil işlev/UI kodu, yeni Arapça/okunuş/çeviri üretimi, signing/deploy.

**Kesin sözleşme:** `makeWritePlan(existingRows,approvedRows):{inserts:QuizRow[];unchanged:number;errors:string[]}` saf `.mjs` modülünde. Paket7'nin üretilmiş ve onaylanmış verisini alır; TR soru/şık/cevap/ipucu hazır, EN sözlük karşılıkları hazır. **Eski 1–405 kayıtlarını silme, ID'yi yeniden numaralama veya başka soruya atama yok.** Yeni kayıtlar Paket7 ID'lerini kullanır, `lesson_id` 2–9, `soru_tipi='coktan_secmeli'`, `secenekler=JSON.stringify(options)`; aynı ID+içerik no-op, aynı ID+farklı içerik hata. Yeni toplam ilk bankada 421; “45/derse” artık kabul koşulu değil. Mevcut soru havuzu konu bazlı öğelerle zenginleşir; normal 15 seçimi aynı kalır.

CLI varsayılanı `--dry`; ayrıca `--target local|turso` ve açık `--apply` gerektirir. `--apply` yokken DB salt okunur açılır, env/secrets loglanmaz; plan/count/ID çakışması ve EN kapsam raporu verir. `--apply` yanlış/eksik target'ta nonzero; yerel ve Turso aynı çağrıda zincirlenmez. Her hedefte tek transaction/batch ile atomik insert, hata halinde rollback; otomatik retry yok. Çalıştırma onayı alınmadan `--apply` kullanılmaz. Onay için gerçek plan, hedef ve kayıt sayıları incelemeye hazır olmalı.

`source.tr.json` adayı gerçek DB'yi değiştirmeden mevcut snapshot + onaylı yeni kayıtlar üzerinden hazırlanır. Mevcut export/build biçimi korunur; `scripts/build-elifba-en.mjs` onaylı EN metinleriyle çalışır. Onaylı apply sonrası DB export'u adayla eşleşmeli. Yeni metinler eski mobil EN sözlüğünde yoksa eski mobilin bütün soruyu TR gösterdiği bilinen fallback'tir; “eski mobilde EN tamam” denemez.

**Test:** `elifbaQuizWritePlan.test.mjs`: 405 kaydı koruyup 16 ekleme, aynı planı tekrar uygulama no-op, farklı içerik/aynı ID reddi, `lesson_id` ve ID aralığı kontrolü, eksik EN ve geçersiz şık reddi. Komut: `node --test scripts/lib/elifbaQuizWritePlan.test.mjs` (mobil komutu `.mjs` testini kapsamaz). Gerçek app.db yerine geçici fixture DB'de transaction rollback/idempotence doğrula. Kullanıcı onayı sonrası her hedefte COUNT, eski 405 kaydın içerik eşitliği, yeni 16 ID, doğru cevabın şıklarda olması ve export karşılaştırması; bu postflight yapılmadan canlı uygulama başarılı raporlanmaz.

**Bağımlılık:** Paket7'nin insan onaylı girdisi + testleri. Paket6 gerekmez, mevcut quiz API kolonları yeterlidir. **Risk:** **[CANLI-DB]** — betik kodunu hazırlamak serbest; app.db/Turso'ya yazma kullanıcı onayı olmadan çalıştırılmayacak. DB dosyası bu hazırlık commit'ine dahil edilmez.

### Uygulama sırası ve kapsam sınırı

Önerilen sıra **1 → 2 → 3 → 4 → 5 → 6 → 7 → 8**. Paket4 bağımsızdır; 7, 6'yı beklemeden başlayabilir ama insan onayı olmadan içerik tamamlanamaz. İlk beş paket sunucu/DB dağıtımı gerektirmeden çalışır; 5'te yeni içerik alanı gelene kadar bölüm gizlidir. Paket7 küçük onaylı banka teslimidir; 405 eski soruyu topluca yeniden üretmek, 45'er yeni konu sorusu yazmak, yeni ses kaydetmek, günlük streak davranışını değiştirmek ve Tip6 sürükle/sıralama UI'si bu sekiz paketin kapsamı değildir.

## 5) Kullanıcıya sorulacak ürün kararları

1. **[ARAPÇA] Onay:** Paket7'deki 16 başlangıç sorusunu ve TR/EN okunuş standardını kim doğrulayacak? İnceleme yapılana kadar otomatik hece/kelime okunuşu üretilmeyecek; ilk beş paket bu cevabı beklemez.
2. **Alıştırma genişliği:** İlk onaylı 2 soru/ders bankası yeterli mi, yoksa derslerin normal test havuzları ileride tamamen konu bazlı sorularla mı değiştirilecek? Bu planda ilk seçenek sabitlenmiştir; toplu değiştirme yeni içerik ve ID geçiş planı gerektirir.
3. **Tekrar kapsamı:** İlk teslimde tekrar düğmesi yalnız mevcut normal testlerin `q:` yanlışlarını kapsıyor. Dinleme ve yeni alıştırma yanlışlarının da tek kuyrukta görünmesi isteniyor mu? İstenirse bu, üç türü çözen katalog ve yeni tekrar seçicisiyle ayrı sonraki commit olarak tarif edilmeli; DeepSeek kapsamı kendi başına genişletmemeli.
