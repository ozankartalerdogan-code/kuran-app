# Öğretici cihaz testi — 18 Kasım 2026

## Sonuç

**Kısmi başarı; uçtan uca onay verilemez.** Türkçe ve İngilizce üç adımlı rehber tamamlandı. Spotlight/ok hizalaması, adım sırası, ileri/geri ve bitirme kontrolleri geçti. Dört bağlamsal “?” ipucu iki dilde açıldı; sure ipucunda içerik örtüşmesi, kök haritası ipucunda metin/davranış uyumsuzluğu bulundu. Onboarding ve yeni kullanıcıya otomatik gösterim **BLOCKED** kaldı; bunlar başarılı sayılmadı.

Kod değiştirilmedi; commit, build, kurulum, force-stop, veri temizleme ve yeni Metro başlatma yapılmadı.

## Ortam ve yöntem

- Repo: `C:\Projects\kuran_app`, `master`, HEAD `1bde783c`.
- Cihaz: Samsung A03 / SM-A035F, `R96T80012SY`; fiziksel ekran 720×1600, yoğunluk 300 dpi, sistem yazı ölçeği 1.0.
- Paket: `com.kuranapp.mobile`, Expo development client; mevcut Metro ve adb reverse `8082` kullanıldı. Sonuçlar bu dev oturumuna aittir; kurulu JS paketinin bağımsız hash doğrulaması yapılmadı.
- Her dokunma, kaydırma, tuş ve ekran görüntüsünden önce `dumpsys window` içindeki `mCurrentFocus` paket kontrolü yapıldı. Paket dışına çıkıldığı tespit edildiğinde ekran eylemi/görüntüsü engellendi ve yalnız verilen `monkey` komutuyla uygulama öne alındı. Başka uygulamada işlem yapılmadı.
- UI Automator ağacı ve PNG görüntüleri birlikte değerlendirildi. PNG'ler doğrudan `adb exec-out screencap -p` çıktısıdır; yeniden boyutlandırılmadı.
- Kanıt dizini: [ogretici-2026-11-18](ogretici-2026-11-18/). Tablodaki dosya adları bu dizine göredir. Dizinde 44 PNG vardır; numaralar test sırasını gösterir, bazı ara yakalamalar kurtarma/teşhis içindir.

## Koddan çıkarılan tam akış ve hedef envanteri

İncelenen dosyalar: `src/tour/{AppTourProvider,appTourSteps,tourPolicy,appTourStorage,TourOverlay,contextualHints,useContextualHint,ContextualHintCard,tourGeometry}`, `src/components/onboarding/*`, `app/onboarding.tsx`, `app/_layout.tsx`, `app/(tabs)/{_layout,daha-fazla,ibadet}.tsx` ve ipuçlarını kullanan sure, ayet, kök ve ders ekranları. Aşağıdaki yolların kökü `apps/mobile/` dizinidir.

| Akış / kimlik | Hedef ve gösterim | Metin / işlem |
|---|---|---|
| Onboarding 1/2 | Karşılama ekranı; spotlight/ok yok | TR “Kuran Yolu’na hoş geldin”; EN “Welcome to Kuran Yolu”. Başlangıç seçenekleri: Kur’an okumak / meal ve anlam / harfler; TR/EN dil seçimi; Devam/Continue. |
| Onboarding 2/2 | Bildirim açıklaması ve sabit alt düğmeler; spotlight/ok yok | TR “Vakitleri hatırlatalım”; EN “Remember prayer times”. Konum/İstanbul açıklaması; Bildirimleri aç / Enable notifications; Şimdi değil / Not now; Geri/Back. |
| Onboarding 2/2 sonuç varyantları | Aynı ekrandaki bilgi alanı | İzin reddi veya hazırlama hatası açıklaması; Devam/Continue ile bitiş. Ayrı üçüncü adım yok. |
| Rehber daveti | `HomeWelcomeCards`, ana sayfa kartı | “Uygulamayı tanı / Get to know the app”; Rehberi aç / Open guide; Şimdi değil / Not now. Yalnız `eligible` durumunda. |
| `quran`, 1/3 | `tab.kuran`; Kur’an sekmesinin ölçüm sarmalayıcısı | TR “Kur’an — Mushaf ve surelere buradan ulaşabilirsin.” EN “Quran — Find Quran pages and surahs here.” |
| `learn`, 2/3 | `tab.ogren`; Öğren sekmesi | TR dersler/anlamaya yardımcı içerikler; EN lessons/resources açıklaması. |
| `more`, 3/3 | `tab.daha-fazla`; Daha Fazla sekmesi | TR/EN favoriler, notlar, ayarlar ve rehberi yeniden açma açıklaması. Son düğme Başlayalım / Let’s begin. |
| `surahInteraction` | `surah.reader`; sure ekranının tüm içerik kök View'ı | “Meal ve ayrıntıları açmak için bir ayete dokun.” / “Tap a verse to open its translation and details.” `app/surah/[id].tsx:225,324`. |
| `ayahTabs` | `ayah.tabs`; Meal/Kelimeler/Kökler/Analiz sekme grubu | “Meal, kelimeler, kökler ve analiz arasında bu sekmelerden geçebilirsin.” / “Use these tabs to explore the translation, words, roots and analysis.” `app/ayah/[surahId]/[ayahNumber].tsx:418,943`. |
| `lessonProgress` | `lesson.next`; Sonraki kart düğmesi | “Sonraki ile kartları ilerlet. Dersin testi varsa son karttan açabilirsin.” / “Use Next to move through the cards. If this lesson has a quiz, open it from the last card.” `app/dersler/[dersId].tsx:198,632`. Son kart/okuma/test modunda uygun değil. |
| `rootMap` | `root.heatmap`; 114 surelik renkli ızgara | “Bu kökün geçtiği ayetleri görmek için renkli bir sure kutusuna dokun.” / “Tap a colored surah tile to see verses containing this root.” `app/root/[root]/index.tsx:85,231,385`. |

Rehber sürümü **7**, toplam **3** adım; dört ipucunun içerik sürümü **1**. Rehber adımları ekranlar arasında gezinmez: ana sayfada kalıp alt sekmeleri gösterir. `more.appSection`, `more.restartTour`, `ibadet.main` kayıtları vardır ama mevcut üç adımlı listede kullanılmaz.

Yeniden başlatma yolu: **Daha Fazla → kaydır → Kısa rehberi göster** (`app/(tabs)/daha-fazla.tsx:59,82`). İngilizcesi **More → Show short guide**. İbadet ekranında mevcut kodda veya cihazda uygulama turunu yeniden başlatan düğme yoktur; oradaki “İbadet Rehberi” ayrı içeriktir (`app/(tabs)/ibadet.tsx:35`). Bu ayrım tek başına regresyon olarak sınıflandırılmadı.

İpuçları spotlight/ok kullanmaz; `ContextualHintCard.tsx` bilgi kartı ve kapatma düğmesi üretir. Dolayısıyla onlar için ok hizalaması **uygulanamaz**. Otomatik politika: ziyaret başına en fazla 1, oturum başına en fazla 2; görünür hedef/veri/odak ve rehber sonrası etkileşim gerekir. Manuel “?” açılışı görülmüş kaydını yeniden yazmaz.

## Cihaz sonuçları — her adım ve ipucu

PASS yalnız cihazda gözlenen kontrole verildi. BLOCKED, başarısız ürün davranışı ile aynı değildir.

| Dil / adım veya ipucu | Sonuç | PNG kanıtı | Kontrol ve bulgu |
|---|---|---|---|
| TR onboarding 1/2 | **BLOCKED** | `09-onboarding-route.png` | `kuranyolu://onboarding` intent'i uygulamaya teslim edildi; ekran ana sayfaya döndü. Karşılama metni/tercihler/Devam cihazda görülemedi. |
| TR onboarding 2/2 | **BLOCKED** | `09-onboarding-route.png` | Önceki adım erişilemedi; geri/izin/ret/sonuç/bitiş ve metin sığması doğrulanamadı. |
| EN onboarding 1/2 | **BLOCKED** | — | Aynı erişim engeli; yalnız kaynak metni incelendi. |
| EN onboarding 2/2 ve sonuç varyantları | **BLOCKED** | — | İzin reddi/hata/bitiş dahil cihaz kanıtı yok. |
| TR/EN ana sayfa rehber daveti | **BLOCKED** | `00-baslangic.png` | Mevcut kullanıcı/legacy kaydı nedeniyle davet uygun değil. Daveti kabul/ertele ve ilk onboarding sonrası geçiş denenemedi. |
| TR rehber 1/3 `quran` | **PASS** | `03-tr-tur-1.png`, `05-tr-tur-geri-1.png` | Hedef görünür; çerçeve ve ok Kur’an sekmesinde. Metin ve kart sığıyor; Devam ve 2→1 Geri çalışıyor. Dev Tools çakışması aşağıda ayrıca belirtilmiştir. |
| TR rehber 2/3 `learn` | **PASS** | `04-tr-tur-2.png`, `07-tr-tur-geri-2.png` | Hedef Öğren; metin iki satırda tam. Devam, Geri ve 3→2 dönüşü doğru. |
| TR rehber 3/3 `more` | **PASS** | `06-tr-tur-3.png`, `08-tr-tur-bitti.png` | Hedef Daha Fazla; kart/ok hedefi örtmüyor. Başlayalım örtüyü kaldırıyor, ana sayfa kullanılabilir kalıyor. |
| EN rehber 1/3 `quran` | **PASS** | `32-en-tur-1.png` | Quran hedefi doğru, başlık/açıklama/Next eksiksiz. |
| EN rehber 2/3 `learn` | **PASS** | `33-en-tur-2.png` | Learn hedefi doğru; açıklama ve Back/Next sığıyor. İngilizcede geri düğmesine ayrıca basılmadı; geri davranışı TR'de test edildi. |
| EN rehber 3/3 `more` | **PASS** | `34-en-tur-3.png`, `35-en-tur-bitti.png` | More hedefi doğru; açıklama ve Let’s begin sığıyor; bitirme çalışıyor. |
| TR `surahInteraction` | **FAIL** | `10-tr-sure-yardim-oncesi.png`, `11-tr-ipucu-sure.png`, `12-tr-ipucu-sure-tekrar.png`, `43-tr-sure-ipucu-kaydirma.png` | “?” aç/kapat/tekrar aç ve ayete dokunarak ayrıntıya geçiş çalışıyor; metin tam. Sabit kart önce Arapça sure başlığını, kaydırınca görünür ayet içeriğini örtüyor. |
| EN `surahInteraction` | **FAIL** | `36-en-ipucu-sure.png` | İngilizce doğru ve sığıyor; kart aynı Arapça başlığı örtüyor. Kapatma çalışıyor. |
| TR `ayahTabs` | **PASS** | `13-tr-ayet.png`, `14-tr-ipucu-sekmeler.png`, `15-tr-kokler.png` | Dört sekme görünür; kart altında, hedefi örtmüyor. Aç/kapat/tekrar aç çalıştı; Kökler seçildiğinde kart kapanıp içerik değişti. |
| EN `ayahTabs` | **PASS** | `37-en-ipucu-sekmeler.png` | Translation/Words/Roots/Analysis ve açıklama tam; kart hedefin altında. Kapat ve Roots seçimi çalıştı. Dev Tools Analysis üzerinde görsel örtüşme yapıyor; ipucu kartından kaynaklanmıyor. |
| TR `lessonProgress` | **PASS** | `20-tr-ders-yardim.png`, `21-tr-ipucu-ders.png`, `22-tr-ipucu-ders-tekrar.png` | Var olan Namaz ders kartında hedef sabit alt Sonraki düğmesi. Kart onun üstünde, hedef ve metin görünür; aç/kapat/tekrar aç çalışıyor. Ders ilerlemesini değiştirmemek için Sonraki kart/test başlatma yapılmadı. |
| EN `lessonProgress` | **PASS** | `39-en-ipucu-ders.png` | Üç satırlık İngilizce ipucu tam, Next hedefi örtülmüyor. Uzun ders içeriği kaydırılabilir alan içinde; ipucu/alt düğme ekranda. Kapatma çalışıyor. |
| TR `rootMap` | **FAIL** | `17-tr-kok-yuklendi.png`, `18-tr-ipucu-kok.png`, `19-tr-kok-hedef-eylemi.png` | Izgara ve yardım görünür; aç/kapat/tekrar aç çalışıyor; metin üç satırda tam. Renkli Bakara kutusuna dokunma kartı kapatıp “2. Sure / 288 geçiş / Sureye Git” penceresi açıyor; ipucunun vadettiği ayet listesi açılmıyor. |
| EN `rootMap` | **FAIL** | `38-en-ipucu-kok.png` | Metin iki satırda tam; kart ızgaranın üstünde, hedefi örtmüyor. Aynı davranışı yanlış anlatan İngilizce metin. İngilizcede hücre eylemi yeniden denenmedi; ortak kod ve TR cihaz kanıtıyla değerlendirildi. |

### Hizalama ölçümleri ve geçiş kontrolleri

UI Automator sekme dokunma düğümleri: Kur’an `[144,1420][288,1465]`, Öğren `[288,1420][432,1465]`, Daha Fazla `[576,1420][720,1465]`. PNG'lerde spotlight dış sınırları yaklaşık sırasıyla `[144,1420]–[287,1510]`, `[288,1420]–[432,1510]`, `[576,1420]–[720,1510]`; ok uçlarının x değerleri yaklaşık **217 / 361 / 647**, sekme merkezlerinden yaklaşık **1 px** farklı. Kart sağ/sol sınırları yaklaşık x=30/690; alt kenar y=1390, ok ucu y=1404, hedef üstü y=1420: kart ve ok hedefi kapatmıyor. Aynı geometri iki dilde korundu.

**Ölçüm sınırı:** UI Automator bu oturumda alt etiketleri `[0,0][0,0]` verip düğüm altını y=1465'te kırpıyor; PNG'de ikon ve etiket y=1510'a kadar görünüyor. Bu nedenle tam dikey hedef sınırı için “UI ağacına göre ±12 px kesin geçti” iddiası yapılmadı. Üst/yatay sınırlar tolerans içinde; tam ikon+etiketin çerçeve içinde olduğu doğrudan PNG'den doğrulandı.

Ayet TR sekme grubu yaklaşık `[31,920]–[691,991]`; ipucu yazısı `[98,1054]–[570,1134]`, kapatma `[586,1055]–[676,1145]`: hedefle çakışmıyor. Ders TR Sonraki düğümünün UI sınırı `[242,1401]–[690,1465]`; ipucu yazısı `[109,1249]–[559,1329]`: ekranda ve hedefin üstünde. Kök ızgarası TR ipucu öncesi x=55–664, y=701–1225; ipucu açıldığında PNG'de yaklaşık y=896–1421'e yer değiştiriyor ve tamamı görünür kalıyor.

- Rehber sırası TR: **1→2→1→2→3→2→3→bitir**; atlanan veya takılan adım yok. EN: **1→2→3→bitir**. Gösterge her dilde toplam 3.
- Daha Fazla'daki yeniden açma satırı başlangıçta ekran altında; elle kaydırılarak erişildi. Rehberin kendi üç hedefi sabit sekmeler olduğu için otomatik hedef kaydırması gerekmiyor.
- Normal rehberde ayrı “Atla/Skip” düğmesi yok; X kapatma/erken çıkış işlevi görüyor. X'in Tools ile örtüşmeyen kısmından çıkış doğrulandı (`31-tr-kapat-kontrol.png`). Tek donanım BACK ile de kapandı; hemen odak yeniden kontrol edildi (`42-tr-donanim-geri.png`).
- “Adımı atla / Skip step” yalnız hedef bulunamazsa çıkan yedek kartta var. Üç hedef de bulunduğundan bu hata yolu tetiklenmedi, **test edilmedi**.
- Dev launcher'a dönüşten sonra RECENTLY OPENED → `http://localhost:8082` ile JS uygulaması yeniden açıldı. Yükleme/splash sonrası rehber kendiliğinden başlamadı. Force-stop ile soğuk başlatma yapılmadı. Ana sayfaya normal dönüşlerde de kendiliğinden başlamadı.
- Rehber açıkken kart dışındaki alanda kaydırma kontrolünde arka plan değişmedi (`40-tr-ortuyu-test-oncesi.png`, `41-tr-ortuyu-test-sonrasi.png`).
- Öğretici kartlarında 720 px genişlikte TR/EN taşma, üç nokta veya ekran dışı kontrol görülmedi. Yüksek yazı ölçeği/yatay yön bu testin kapsamına alınmadı.
- Otomatik ipuçlarının ilk gösterimi, oturum/ziyaret limitleri, ilk kurulum daveti ve onboarding→rehber geçişi cihazda **doğrulanamadı**; yalnız politikası koddan okundu.

## Öncelikli bulgular ve düzeltme önerileri

### P2 — Sure ipucu okuma hedefini örtüyor

**Tekrar:** Fâtiha → üst “?” → kart açıkken yukarı kaydır. Kart yaklaşık x=23–698, y=165–301 alanında sabit kalır; 1. ayetin mealini ve 2. ayetin Arapça satırını örter. Kaydırma öncesinde de Arapça sure başlığını kapatır. Türkçe ve İngilizcede başlık örtüşmesi gözlendi.

**Kanıt:** `11-tr-ipucu-sure.png`, `36-en-ipucu-sure.png`, özellikle `43-tr-sure-ipucu-kaydirma.png`. Son görüntünün ağacında 1. ayet `[0,150][720,222]`, 2. ayet `[0,223][720,410]`; kartın y=165–301 aralığı iki hedef satırıyla kesişiyor.

**Olası yer:** `apps/mobile/app/surah/[id].tsx:324` hedefi bütün okuyucuya veriyor; `:350` kartı FlatList'in üstüne yerleştiriyor; `:361` `position: absolute, top: 8` ile sabitliyor.

**Öneri:** Bilgi kartını FlatList üstünde yer ayıran normal akışa taşıyın veya ölçülen yüksekliği kadar liste üst alanı ayırın. Hedefi tüm okuyucu yerine görünür ayet bölgesiyle tanımlayın; kart açıkken kaydırmada da hiçbir ayetin altına düşmediğini doğrulayın. Uygulanmadı.

### P2 — Kök haritası ipucu gerçekleşen eylemi yanlış anlatıyor

**Tekrar:** Kök → “?” → renkli Bakara kutusu. İpucu ilgili ayetleri görmeyi vaat ediyor; önce sure numarası ve geçiş sayısı içeren modal geliyor. Modalın “Sureye Git” işlemi de filtrelenmiş kök ayetlerine değil tam sureye yönlendiriliyor.

**Kanıt:** `18-tr-ipucu-kok.png` → `19-tr-kok-hedef-eylemi.png`; EN metin `38-en-ipucu-kok.png`.

**Olası yer:** `apps/mobile/src/i18n/strings/tour.ts:11` ve `:27`; gerçek hücre eylemi `apps/mobile/app/root/[root]/index.tsx:95`, tam sure yönlendirmesi `:132`.

**Öneri:** TR “Bu kökün bir surede kaç kez geçtiğini görmek için renkli bir kutuya dokun.” ve buna eşdeğer EN metin kullanın; ya da mevcut vaadi koruyacaksanız seçilen sure/köke ait ayetleri filtreleyerek açın. Uygulanmadı.

### P3 / yalnız dev istemci — Tools balonu rehber kapatma ve bazı içerik alanlarıyla çakışıyor

İlk rehber kartında X merkezi yaklaşık `(605,937)`, Expo Tools balonu yaklaşık x=593–691/y=927–1023 alanında. Merkeze dokunma dev menüsünü açtı (`24-tr-rehber-atla.png`); dosya adına rağmen bu görüntü başarılı atlama kanıtı değildir. X'in üstteki `(600,918)` kısmına dokununca rehber kapandı (`31-tr-kapat-kontrol.png`). Balon ayet ekranındaki Analiz/Analysis alanını da kısmen örtüyor. Bunun üretim uygulamasında bulunduğuna dair kanıt yok.

**Olası yer:** Uygulama tarafında `apps/mobile/src/tour/TourOverlay.tsx:109` kapatma konumu ve `src/tour/tourGeometry.ts:10` kart yerleşimi; engelleyen üst katman Expo development client'a ait.

**Öneri:** Sonraki dev cihaz testinde Tools balonunu boş bir alana taşıyın; gerekiyorsa dev yapılandırmasında gizleyin. Üretim UI'sını bu balona göre değiştirmeden release benzeri istemcide X'i tekrar doğrulayın. Uygulanmadı.

## Engeller

Onboarding rotası kaynakta vardır; “rota yok” sonucu çıkarılmadı. `app/_layout.tsx:173`, zaten onboard edilmiş kullanıcı `/onboarding` açtığında ana sayfaya yönlendirir; cihaz gözlemi bununla tutarlı. Başlangıçta `onboarding_completed=1` olduğu için tercih/izin ekranlarına erişilemedi.

İzin verilen alternatif için `run-as … which sqlite3` kontrolü sonuç vermedi; `/system/bin/sqlite3` ve `/system/xbin/sqlite3` mevcut değil. Cihazda kullanılabilir SQLite CLI saptanamadığından onboarding/hint kayıtları **sıfırlanmadı**. Binary yüklenmedi, veritabanı değiştirilip geri kopyalanmadı ve başka sıfırlama yöntemi kullanılmadı. Bu nedenle onboarding ve otomatik ilk gösterimler BLOCKED bırakıldı. Bu engel, kullanıcı yönlendirmesinin beklenen davranışı olabilir; tek başına ürün hatası olarak listelenmedi.

## Restorasyon doğrulaması

Başlamadan `run-as com.kuranapp.mobile cat databases/RKStorage` ile `%TEMP%\kuran-tour-original-rk.db` yedeği alındı; bitiş okuması `%TEMP%\kuran-tour-final-rk.db` ile `catalystLocalStorage` değerleri karşılaştırıldı. SQLite'a doğrudan yazılmadı.

| Anahtar | Başlangıç | Bitiş / sonuç |
|---|---|---|
| `onboarding_completed` | `1` | `1`, aynı |
| `onboarding_started` | kayıt yok | kayıt yok, aynı |
| `app_tour_completed` | `6` | `6`, aynı |
| `app_guide_state` | `{"version":7,"status":"skipped"}` | aynı |
| `contextual_hints_seen` | `{"surahInteraction":1,"ayahTabs":1,"rootMap":1,"lessonProgress":1}` | aynı |
| `uiLanguage` | `tr` | UI'dan EN→Türkçe dönüldü; `tr`, aynı |

**Öğreticiye ait altı ilgili kayıt başlangıçla birebir eşleşiyor.** Mevcut kullanıcı kohortu manuel bitirmede korunur (`AppTourProvider.tsx:122` çevresindeki `persist`); dolayısıyla `skipped` kaydının bitirmeden sonra değişmemesi tek başına hata değildir.

**Tam veritabanı restorasyonu iddia edilmiyor:** normal kullanım/dil değişimi sırasında uygulama kendisi `v4_cache_root_أله`, `namazNotifPlanCacheV1`, `namazNotifPlanCacheV2`, `namazNotifSchedDay`, `app_open_count`, `readingStreak` kayıtlarını değiştirdi. Bu altı yan kayıt geri alınamadı; kullanılabilir cihaz SQLite CLI yok ve bunları geri alan UI yolu kullanılmadı. Bildirim ayarlarına/alarmlara doğrudan müdahale edilmedi; dil ayarı kendi bildirim planlama işlevini çalıştırdı. Ders Sonraki/test ve onboarding tercihleri değiştirilmedi.

**Son gözlenen durum:** dil **Türkçe**, uygulama **Ana Sayfa** üst konumunda, açık rehber/ipucu yok; paket odağı doğrulandı. Kanıt: `44-tr-son-ana-sayfa.png`. Kod/commit değişikliği yok; repo çıktısı yalnız bu rapor ve belirtilen PNG dizinidir.
