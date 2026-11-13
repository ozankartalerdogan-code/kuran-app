**Kararım: Aşağıdaki yayın öncesi işler tamamlanmadan AAB’ye geçmeyin.** Yeni değişikliklerde favori, not veya ilerleme verisini silen bir işlem bulmadım; açılış yönlendirmesi ve bildirim koordinasyonunda açık riskler var.

Salt okunur inceleme yaptım; dosya değiştirmedim. **23 hedefli test geçti; mobil TypeScript 6.0.3 ile typecheck geçti.** Testler süreç izolasyonu kapatılarak çalıştırıldı; varsayılan çalıştırma ortamın `spawn EPERM` engeline takıldı. Build ve cihaz testi yapmadım.

**1. Doğruluk bulguları**

| No / öncelik | Konum | Senaryo ve etki |
|---|---|---|
| **B1 — Yüksek** | [app/_layout.tsx:276](C:/Projects/kuran_app/apps/mobile/app/_layout.tsx:276), [onboarding.tsx:41](C:/Projects/kuran_app/apps/mobile/app/onboarding.tsx:41) | **Bildirimden soğuk açılış:** yönlendirme `ready` yerine 500 ms bekliyor; splash en az 600 ms. Stack kurulmadan gezinme denenebilir. Ayrıca ilk kurulumdaki derin bağlantı onboarding tarafından değiştirilip bitişte ana sayfaya gönderiliyor; bekleyen hedef saklanmıyor. **Önceden mevcut, bu yayın kapsamında çözülmemiş.** |
| **B2 — Yüksek** | [onboarding strings:7](C:/Projects/kuran_app/apps/mobile/src/i18n/strings/onboarding.ts:7), [bildirimler.tsx:167](C:/Projects/kuran_app/apps/mobile/app/bildirimler.tsx:167) | **Konum reddi:** TR/EN metni şehir değiştirme sözü veriyor; Bildirimler ekranında şehir seçici yok. İstanbul dışındaki kullanıcı yanlış vakitleri düzeltmek için olmayan bir kontrolü arar. |
| **B3 — Yüksek** | [namazNotifications.ts:476](C:/Projects/kuran_app/apps/mobile/src/lib/namazNotifications.ts:476), [bildirimler.tsx:115](C:/Projects/kuran_app/apps/mobile/app/bildirimler.tsx:115) | **Yenileme sırasında ayar değiştirme:** yeni `firstRunInFlight/freshInFlight` koruması, ayarlar ekranının doğrudan `applyNotifications` çağrısını kapsamıyor. İptal ve kurulumlar yarışabilir; kapatılmış bildirim yeniden planlanabilir. Ayrıca eski plan önce siliniyor; sonraki planlama hatasında eski plan korunmuyor. **Önceden mevcut bildirim borcu; güncelleme güvenliğini etkiliyor.** |
| **B4 — Orta** | [namazNotifications.ts:513](C:/Projects/kuran_app/apps/mobile/src/lib/namazNotifications.ts:513), [app/_layout.tsx:226](C:/Projects/kuran_app/apps/mobile/app/_layout.tsx:226), [onboarding.tsx:38](C:/Projects/kuran_app/apps/mobile/app/onboarding.tsx:38) | **İzin akışında uygulama öldürülürse:** bildirim tercihi yazılmış, onboarding henüz tamamlanmamış olabilir. Sonraki açılış bunu mevcut kullanıcı kabul edip karşılamayı atlar. Başlangıç seçimi yalnız `finish()` içinde kaydedildiği için kaybolur. |
| **B5 — Orta** | [app/_layout.tsx:300](C:/Projects/kuran_app/apps/mobile/app/_layout.tsx:300), [AppTourProvider.tsx:130](C:/Projects/kuran_app/apps/mobile/src/tour/AppTourProvider.tsx:130), [ana sayfa:483](C:/Projects/kuran_app/apps/mobile/app/(tabs)/index.tsx:483) | **İstem çakışması:** exact-alarm zamanlayıcısı `ready/foreground` beklemiyor; sağlayıcı splash sırasında henüz yok. Ana sayfanın zikir/ruh hâli modalları ve Bildirimler ekranındaki bazı izin/Alert çağrıları ortak kilide bağlı değil. Dolayısıyla exact-alarm/değerlendirme bunlarla çakışabilir. |
| **B6 — Orta** | [TourOverlay.tsx:37](C:/Projects/kuran_app/apps/mobile/src/tour/TourOverlay.tsx:37) | **Hedef ölçülemezse:** 180 ms tekrarın süre/deneme sınırı yok; arka plana geçiş de durdurmuyor. Rehber, kapatma dışında boş bir dokunma engeli olarak kalabilir. Ölçüm callback’i hiç dönmezse yeniden deneme dahi başlamaz. |
| **B7 — Orta** | [surah/[id].tsx:186](C:/Projects/kuran_app/apps/mobile/app/surah/[id].tsx:186), [root/[root]/index.tsx:82](C:/Projects/kuran_app/apps/mobile/app/root/[root]/index.tsx:82), [tourPolicy.ts:44](C:/Projects/kuran_app/apps/mobile/src/tour/tourPolicy.ts:44) | **Kaydırma/büyük yazı:** sure yardımı yalnız ilk ayete, kök yardımı yalnız ilk dolu kutuya bağlı. Başka geçerli hedef görünürken yardım devre dışı kalır. Tam görünürlük şartı, viewport’tan yüksek ilk ayette yardımı hiç açtırmaz. |
| **B8 — Orta, cihaz doğrulaması gerekli** | [AppTourProvider.tsx:208](C:/Projects/kuran_app/apps/mobile/src/tour/AppTourProvider.tsx:208), [tabs/_layout.tsx:30](C:/Projects/kuran_app/apps/mobile/app/(tabs)/_layout.tsx:30) | **TalkBack/VoiceOver:** rehber kapanış odağı gerçek sekme düğmesine değil, ölçüm için eklenen erişilebilir olmayan `View` sarmalayıcısına gönderiliyor. Odak dönüşü güvenilir değil; ölçüm ve odak referansları ayrılmalı. |

Ek kontroller:

- **İzin reddi:** bildirim reddinden sonra konum istenmiyor; bulgu yok.
- **Dil değişimi:** yeni metinler reaktif, onboarding seçimi/adımı korunuyor; bulgu yok.
- **Android geri:** rehberi kapatma ve onboarding ikinci adımdan dönüş mevcut; bulgu yok.
- **Bozuk rehber kaydı:** güvenli biçimde mevcut kullanıcı sayılıyor; bulgu yok. Ancak bozuk `contextualHints` JSON’u boş kayıt kabul edildiğinden yeni kullanıcıda ipuçları yeniden görünebilir — **Düşük**, [storage.ts:159](C:/Projects/kuran_app/apps/mobile/src/lib/storage.ts:159).
- **Döndürme:** uygulama portrait kilitli; boyut değişiminde rehber yeniden ölçülüyor. Büyük yazı/küçük pencere yerleşimi cihazda doğrulanmadı.
- **Ders ipucu:** statik incelemede kesin hata bulmadım; kart/test/tümünü oku geçişleri cihazda doğrulanmalı.

**2. Yayın riski**

- **Veri:** yeni anahtarlar eklenmiş; eski favori/not/ilerleme anahtarları değiştirilmemiş. Bu diff kaynaklı veri kaybı bulgusu yok.
- **Mevcut kullanıcı:** normal `onboarding_completed=1` veya eski tur kaydı için davet bastırılıyor. Bildirim tercihleri topluca sıfırlanmıyor. B3 nedeniyle bildirim planının korunması ayrıca test edilmeli.
- **Sürüm — Engelleyici hazırlık eksikliği:** [build.gradle:97](C:/Projects/kuran_app/apps/mobile/android/app/build.gradle:97) hâlâ `versionCode 20`, `versionName "1.2.0"`; `app.config.js` ise 1.2.1. Doğrudan bu Gradle durumuyla paket üretilemez; nihai AAB’de **21 / 1.2.1** doğrulanmalı.
- **İzin politikası:** isteğe bağlı bildirim ve konum reddi sonrası devam olumlu. B2’deki yanlış vaat düzeltilmeli. İncelenen değişikliklerde açık izin zorlama bulgusu yok; Apple amaç metinlerinin kullanımı doğru açıklamasını istiyor. [Apple rehberi](https://developer.apple.com/app-store/review/guidelines/#privacy)
- **Değerlendirme — Orta:** [useStoreReview.ts:13](C:/Projects/kuran_app/apps/mobile/src/hooks/useStoreReview.ts:13) üçüncü açılışı yeterli sayıyor; sağlayıcı 12 saniye sonra soruyor. Anlamlı kullanım kanıtı yok, okuma/quiz sırasında kesebilir. Kesin politika ihlali demiyorum; Google yeterli deneyimden sonra istemeyi öneriyor. [Google rehberi](https://developer.android.com/guide/playcore/in-app-review#when-to-request)
- **Apple 4.2:** onboarding cilası tek başına itirazı çözmez. Yerel okuma, analiz, ders ve takip işlevlerinin inceleyiciye gösterilmesi gerekir; onay garantisi çıkarılamaz. [Apple 4.2](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality)

**3. Teknik borç**

- **Düşük — Eski hedefleri sil:** `home.prayerTimes`, `home.quick.qibla`, `kuran.surahList`, `learn.dersler`, `learn.hadith`, `ibadet.main`, `more.appSection`, `more.restartTour`, `ayah.main`, `ayah.analysis`, `hadith.topics`, `dersler.firstCard`, `surahList.search`, `root.list`. Yeni rehber yalnız üç `tab.*` hedefini kullanıyor. [Örnek: index.tsx:137](C:/Projects/kuran_app/apps/mobile/app/(tabs)/index.tsx:137)
- **Düşük — Gereksiz API:** kullanılmayan `TourTarget` export’unu kaldır; `useTourScroller` yerine ihtiyaç olan yerlerde normal `useRef` bırak. Ayet ekranının gerçek kaydırma referansını koru. [AppTourProvider.tsx:215](C:/Projects/kuran_app/apps/mobile/src/tour/AppTourProvider.tsx:215)
- **Düşük — Tip/şema:** `ContextualHint.id: string` + `find(...)!` yerine `HintId` anahtarlı kayıt kullan; kullanılmayan `screen/priority` alanlarını kaldır. Sabit `7` değerlerini tek sürüm kaynağına bağla. [contextualHints.ts:1](C:/Projects/kuran_app/apps/mobile/src/tour/contextualHints.ts:1)
- **Düşük — Temizlik:** kullanılmayan `tour.hintHelp`, `onboarding.close`; eski “ilk açılışta varsayılan açık” yorumları temizlenmeli. Konum/planlama mantığı Bildirimler ekranı ile servis arasında birleştirilmeli.
- **Düşük — Satır sonları:** dosyalar arasında LF/CRLF farkı var; incelenen yeni dosyalarda dosya içi karışım yok. Repo `eol=lf` kuralına normalize edilmeli.
- **Orta — Test boşluğu:** mevcut testler saf politika/geometri/kilit davranışını kapsıyor; hydration, hook zamanlaması, gerçek layout, izin ve notification routing entegrasyonu yok.

**4. A03 performansı**

- B6 dışında sürekli ölçüm döngüsü bulgusu yok.
- [useContextualHint.ts:131](C:/Projects/kuran_app/apps/mobile/src/tour/useContextualHint.ts:131) her render’da yeni `targetProps`, `scrollProps` ve callback’ler üretiyor. Sure `renderItem` bağımlılıkları değişiyor; kök ekranında değişken `hint` nesnesi `HeatGrid` memo avantajını bozuyor. **Düşük:** referansları sabitle.
- Eski hedef kayıtları gereksiz provider güncellemeleri/native sarmalayıcılar yaratıyor.
- **Dinleyici sızıntısı: bulgu yok.** İncelenen AppState, BackHandler ve store aboneliklerinin cleanup’ları mevcut.

**5–6. Uygulayıcı modele sıralı görevler ve kabul ölçütleri**

**1.2.1 öncesi zorunlu:**

1. **A1 — B1:** yönlendirmeyi navigation hazır olmasına ve onboarding tamamlanmasına bağla; bekleyen hedefi sakla, bildirimi tek kez tüket. **Kabul:** soğuk/sıcak açılışta doğru ayet, tek navigation, onboarding sonrası hedef korunur.
2. **A2 — B2:** şehir değiştirme vaadini mevcut davranışa uygun TR/EN metinle düzelt. **Kabul:** ekranda olmayan özellik vaat edilmez.
3. **A3 — B3:** bütün bildirim mutasyonlarını ortak sıraya al; eski tercihli devam eden işin son kullanıcı kararını ezmesini önle. Planlama hatasını başarı damgasıyla kapatma. **Kabul:** yenileme sırasında kapatma sonunda plan boş; hata sonrası yeniden deneme çalışır, çift bildirim oluşmaz.
4. **A4 — B4/B5:** yarım onboarding’i eski kullanıcıdan ayır; başlangıç seçimini koru. Exact-alarm için hazır/ön plan/örtü koşulları ekle; ilgili modalları ortak kilide bağla. **Kabul:** süreç öldürme ve ayarlardan dönüşte seçim kaybolmaz, istemler çakışmaz.
5. **A5 — B6/B8:** ölçüme süre sınırı ve foreground kontrolü ekle; başarısızlıkta kullanılabilir çıkış sun. Odağı gerçek sekme düğmesine döndür. **Kabul:** eksik hedefte sonsuz polling yok; TalkBack/VoiceOver rehberden güvenle çıkar.
6. **A6 — Cihaz kabulü:** aşağıdaki listeyi tamamla; özellikle büyük yazıda B7 yeniden üretilirse bu yayında düzelt.
7. **A7 — Yayın hazırlığı:** yeni izlenmeyen dosyalar dahil diff’i commit et; `.claude/skills/local-production-aab/SKILL.md` ile mevcut signing yöntemini kullan. **Kabul:** AAB manifesti `1.2.1 / 21`, aynı imza, 1.2.0 üzerine veri korunarak kurulabilir.

**Sonraya bırakılabilir:**

8. **A8:** eski tur hedefleri, kullanılmayan anahtarlar/alanlar, sürüm sabitleri ve LF temizliği; gerekli kaydırma davranışları korunmalı.
9. **A9:** hook referanslarını sabitle; değerlendirmeyi tamamlanan anlamlı işlem sonrasına taşı; B7’nin genel “görünür geçerli hedef” çözümünü tamamla.

**Elle test listesi:**

- Gerçek temiz kurulum: yedekten geri yükleme olmadan; seçimsiz ve üç seçimle.
- “Aç”: bildirim kabul/ret, konum kabul/ret, sistemden kalıcı ret; “Şimdi değil” hiçbir izin açmamalı.
- Her izin adımında uygulamayı öldürüp yeniden açma; uçak modu ve yavaş ağdan toparlanma.
- 1.2.0 üzerine güncelleme: favori, not, ilerleme, dil/tema ve iki bildirim tercihini karşılaştırma.
- Bildirim/URL ile soğuk ve sıcak açılış; rehber açıkken gelen bağlantı.
- Ders: ilk/son kart, test, tümünü oku; sure/kök yardımı kaydırma sonrası.
- TR/EN × açık/koyu × 1,0/1,3/2,0 yazı; üç düğmeli ve hareketli Android gezinmesi.
- TalkBack; iOS yayını öncesi ayrıca VoiceOver ve gerçek iPhone izin akışı.
- Bildirim yenilenirken kapatma; exact-alarm ayarlarından dönüş; planlanan ve gerçekten teslim edilen bildirim kontrolü.