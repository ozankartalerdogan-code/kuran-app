# Kuran Yolu — Kapsamlı Rakip Analizi ve Ürün Konumlandırma Raporu

**Tarih:** 2026-11-13  
**Uygulama:** Kuran Yolu (`v1.2.1`, Expo / React Native, Türkçe + İngilizce, Google Play'de yayında, App Store'da incelemede)  
**Yöntem:** Kod tabanı statik incelemesi (`apps/mobile`, `packages/core`, `docs/store`) + 2025–2026 mağaza ve resmi web kaynakları araştırması.

---

## 1. Uygulamamızın Gerçek Özellikleri (Koddan Kanıtlı)

### 1.1 Mağaza Konumlandırması
- **Başlık ve Vaat:** TR'de *"Kuran Yolu: Kuran, Namaz ve Öğrenme"* (`docs/store/listing.tr.md:7`), EN'de *"Kuran Yolu: Quran, Prayer & Learning"* (`docs/store/listing.en.md:7`).
- **Temel İlkeler:** Tamamen ücretsiz, reklamsız, reklam kimliği (Advertising ID) kullanmayan, hassas GPS konumu yerine yaklaşık konumla çalışan gizlilik odaklı mimari (`docs/store/listing.tr.md:74-78`, `docs/store/listing.en.md:70-72`). Namaz vakitlerinde Diyanet hesaplama yöntemi kullanılır; mağaza kuralı gereği "Diyanet ile birebir aynı" iddiası yapılmaz (`docs/store/listing.tr.md:4`).

### 1.2 Ekranlar ve Navigasyon Mimarisi (`apps/mobile/app`)
- **Kök Akış ve İlk Kurulum:** `apps/mobile/app/_layout.tsx:62-175` üzerinde Sentry hata takibi, bildirim/widget yenileme ve `initCloudBackup` çalışır. `apps/mobile/app/onboarding.tsx:16-108` 2 adımlı karşılama, TR/EN dil seçimi (`onboarding.tsx:80-86`) ve ilk namaz bildirimi iznini (`onboarding.tsx:54-67`) yönetir.
- **5 Ana Sekme (`apps/mobile/app/(tabs)/_layout.tsx:13-24`):**
  1. **Ana Sayfa (`(tabs)/index.tsx:92-522`):** Arama çubuğu (`index.tsx:249-258`), Miladi/Hicri takvim (`index.tsx:260-262`), okuma serisi (streak) rozeti ve karanlık/aydınlık tema anahtarı (`index.tsx:275-307`), Günün Ayeti (`index.tsx:309-335`), canlı geriisayımlı Namaz Vakitleri kartı (`index.tsx:338-397`), 10 kategorili "Ruh Haline Göre" ayet seçici (`index.tsx:55-66, 400-423`), Günün Duası (`index.tsx:425-451`), Zikirmatik ve Kıble hızlı kısayolları (`index.tsx:454-476`).
  2. **Kur'an (`(tabs)/kuran.tsx:40-258`):** Son okunan Mushaf sayfası ve aktif hatim ilerlemesini gösteren "Okumaya Devam Et" kartı (`kuran.tsx:78-86, 179-233`), Mushaf Sayfa Görünümü ve Sure Listesi girişleri.
  3. **Öğren (`(tabs)/ogren.tsx:26-114`):** Öne çıkan Dersler kartı (`ogren.tsx:63-80`), Orta seviye içerikler (Peygamber Kıssaları `/peygamber-kissalari`, Siyer `/siyer`, Mübarek Gün ve Geceler `/mubarek-gunler`, Hadisler `/hadisler`) ve İleri seviye Kök Haritası (`/root`).
  4. **İbadet (`(tabs)/ibadet.tsx:35-51`):** Namaz Rehberi (`/namaz-rehberi`), Dualar (`/dualar`), İbadet Rehberi (`/ibadet-rehberi`), Kıble Pusulası (`/kible`) ve Tesbih/Zikirmatik modalı (`src/components/ZikirMatik.tsx`).
  5. **Daha Fazla (`(tabs)/daha-fazla.tsx:31-164`):** Esmaül Hüsna (`/esma`), Manevi Sığınak (`/manevi-siginak` ve `/manevi-siginak/ismi-azam`), Favoriler (`/favoriler`), Notlar (`/notlar`), Bildirimler (`/bildirimler`), Android'de Widget Ekle (`/widget-ekle`, `daha-fazla.tsx:54-56`), Hakkında ve Lisanslar (`/hakkinda`), Gizlilik (`/gizlilik`), Rehberi Tekrar Başlat ve Sistem/TR/EN dil seçici (`daha-fazla.tsx:138-162`).
- **Detay Ekranları:**
  - **Mushaf (`mushaf-sayfa.tsx:26-687`):** 604 sayfa Medine Mushafı (`src/lib/mushafSayfa.ts`), sağdan sola (RTL) yatay sayfa çevirme, ayete dokunarak vurgulama ve aksiyon çubuğu açma, tecvid anahtarı (`mushaf-sayfa.tsx:86-107, 207-216`), yazı boyutu ölçekleme (`src/hooks/useFontScale.ts:6-8`, `0.85x–1.6x`), ekranı açık tutma (`useKeepAwake`, `mushaf-sayfa.tsx:234`), sayfa/sure/cüz atlama modalı ve gömülü Hatim Paneli (`src/components/HatimPanel.tsx`).
  - **Sure Listesi ve Detayı (`sure-listesi.tsx:39-200`, `surah/[id].tsx:38-250`):** Mushaf ve Nüzul sırası geçişi (`sure-listesi.tsx:82, 162-177`), Mekki/Medeni rozetleri, sure tefsiri bağlantısı, Arapça satırı gizleme/gösterme (`surah/[id].tsx:124-147`).
  - **Ayet Detayı (`ayah/[surahId]/[ayahNumber].tsx:1-1601`):** Tecvidli Mushaf kartı, A−/A+ boyutlandırma, Latin okunuş (`transliteration`), görsel kart veya metin olarak paylaşım (`src/components/AyahShareModal.tsx`), favori ve kişisel not alanı (`ayah:1167-1214`). 4 sekme: *Meal*, *Kelimeler*, *Kökler*, *Analiz* (`ayah:289-308, 949-1161`).
  - **Tefsir (`tafsir/[surahId].tsx:19-184`):** TR'de "Orijinal" ve "Sadeleştirilmiş" Elmalılı tefsiri geçişi; EN'de sadeleştirilmiş İngilizce tefsir.
  - **Dersler (`dersler/index.tsx:1-171`, `dersler/[dersId].tsx:1-250`) ve Elif-Ba (`elifba/index.tsx:1-250`, `elifba/[dersId].tsx:1-250`):** Kaydırılabilir ders kartları, okuma modu, %70 geçme barajlı 10 soruluk çoktan seçmeli testler (`dersler/[dersId].tsx:34`) ve Elif-Ba'da 10/10 kilitlemeli öğrenme yolu + Harf-i Tarif sekmesi (`src/components/HarfITarifContent.tsx`).

### 1.3 Veri Seti Büyüklükleri (`apps/mobile/src/data`)
- **Kur'an Arapça Metni:** 114 sure, 6.236 ayet (`src/data/quran_arabic.json`, Tanzil Uthmani 1.1).
- **Meal:** TR'de tek meal (Elmalılı Hamdi Yazır, API üzerinden). Telif güvenliği için 4 diğer Türkçe meal veri tabanından tamamen kaldırılmıştır (`packages/core/src/presentation/sourceLicenses.ts:89-92`). EN'de tek meal: M. M. Pickthall (1930, kamu malı), 114 sure / 6.236 ayet yerel gömülü (`src/data/meal_en_pickthall.json`).
- **Tefsir:** 114 surenin tamamı için yerel gömülü sadeleştirilmiş Elmalılı tefsiri (TR: `src/data/tafsirSimplifiedData/001..114.json`, EN: `src/data/tafsirSimplifiedDataEn/001..114.json`, yükleyici: `src/data/tafsirSimplified.ts:8-260`). Orijinal Elmalılı metni API'den (`/tafsir/:surahId`) gelir.
- **Kelime ve Kök Sözlüğü:** EN yerel sözlükte 4.378 kelime anlamı ve 1.703 kök anlamı (`src/data/wordMeaningsEn.json`). Kök Haritası ekranında en sık geçen 200 kök listelenir (`app/root/index.tsx:3`).
- **Dersler ve Quiz:** 16 ders modülü + 1 Elif-Ba kısayolu (`src/data/Dersler/dersler_registry.ts:224-275`). 16 modülde toplam **274 ders kartı** ve **651 test sorusu** (TR ve EN ayrı dosyalar).
- **Elif-Ba:** 9 ders (`elifba.en.json`) + 1 Harf-i Tarif dersi (`src/data/content/harf_i_tarif.json`).
- **Hadisler:** 7 grup, 27 başlık altında **219 hadis** (`src/data/hadisler_v2.json` ve `.en.json`).
- **Dualar:** 23 kategoride **89 dua** (`src/data/dualar.json` ve `.en.json`), İsm-i Azam duaları (`src/data/ismi_azam_dualari.ts`) ve Zikirmatik'te 9 hazır tesbih + özel zikir (`src/components/ZikirMatik.tsx:40-51`).
- **Diğer Rehber ve Kültür Verileri:** 25 peygamber kıssası (`src/data/peygamber_kissalari.json`), 8 dönem / 49 olay Siyer-i Nebi (`src/data/siyer_i_nebi.json`), 13 mübarek gün ve gece (`src/data/mubarek_gunler.json`, 5 kademeli sahihlik rozetiyle: `app/mubarek-gunler.tsx:17, 112-118`), 12 özel namaz (`src/data/ozel_namazlar.json`), 5 vakit namaz rehberi (`src/data/namaz_rehberi.json`), 8 bölümlü ibadet rehberi (`src/data/content/ibadet_rehberi.json`), 99 Esmaül Hüsna (`src/data/esmaulHusna.ts:12-112`) ve 876 Emir Ayeti (`src/data/emirAyetleri.json`).

### 1.4 Altı Kritik Teknik Sorunun Kod Kanıtlı Yanıtı
1. **Ses (Kıraat) var mı? → Kısmen (Yalnız Elif-Ba harf sesleri var; Kur'an sure/ayet sesli kıraati YOK).**  
   `expo-audio` paketi (`apps/mobile/package.json:24`) projede yalnızca `apps/mobile/app/elifba/[dersId].tsx:18, 35-83` içinde 28 Elif-Ba harfinin CDN üzerindeki MP3 seslerini (`${AUDIO_BASE}/audio/elifba/harf_XX.mp3`) çalmak için kullanılır. `mushaf-sayfa.tsx`, `surah/[id].tsx` veya `ayah/[surahId]/[ayahNumber].tsx` içinde sure/ayet ses oynatıcısı, hafız seçimi veya sesli takip yoktur.
2. **Tecvid renklendirme var mı? → Evet (✓).**  
   Tanzil metni üzerinde kod noktası aralığı (`tajweedSpans`) tabanlı 4 renk grubu (Med `#e11d48`, Ğunne/İhfâ/İdgâm `#16a34a`, Kalkale `#2563eb`, Sessiz harf `#9ca3af`) uygulanmıştır (`apps/mobile/src/lib/tajweed.ts:12-121`, `src/components/TajweedText.tsx`). Hem Mushaf sayfasında (`app/mushaf-sayfa.tsx:86-107, 207-216`) hem Ayet detayında (`app/ayah/[surahId]/[ayahNumber].tsx:441-459, 808-828, 862-891`) aç/kapa anahtarı ve renk açıklamasıyla çalışır.
3. **Çevrimdışı (Offline) var mı? → Kısmen.**  
   Arapça Kur'an metni, EN Pickthall meali, TR/EN sadeleştirilmiş tefsir, 16 ders modülü, hadisler, dualar, kıssalar, siyer, namaz/ibadet rehberleri, zikirmatik ve son konumla kıble pusulası (`src/lib/namazNotifications.ts:47-62`) pakete gömülüdür ve tam çevrimdışıdır. Ancak TR Elmalılı meali, Mushaf sayfa ayet/tecvid verisi, kelime-kök-fark analizleri, orijinal tefsir ve Elif-Ba dersleri API'den çekilir ve yerel MMKV önbelleğinde 7 gün (`withCacheFallback`, `src/lib/api.ts:318, 372-625`) tutulur. Daha önce açılmamış sayfalar ve CDN'deki Elif-Ba harf sesleri (`elifba/[dersId].tsx:68-70`) ilk kullanımda internet gerektirir.
4. **Hesap / Senkron / Bulut Yedek var mı? → Kısmen (Anonim bulut yedek var; kullanıcı girişi ve cihazlar arası senkron YOK).**  
   `apps/mobile/src/lib/cloudBackup.ts:1-258` içinde `@react-native-firebase/auth` anonim giriş (`signInAnonymously`, `cloudBackup.ts:86-95`) ve Firestore (`backups/{uid}`, `cloudBackup.ts:68-70`) kullanılarak 13 yerel anahtar (favoriler, notlar, okuma serisi, son sayfa, hatim, ders ilerlemesi, ayarlar — `cloudBackup.ts:40-54`) 20 saniye gecikmeli (debounce) yedeklenir. `/gizlilik` ekranında (`app/gizlilik.tsx:96-120`, `cloudBackup.ts:218-258`) bulut verisini ve anonim hesabı silme düğmesi mevcuttur. E-posta/Google/Apple ile oturum açıp yeni cihaza veri taşıma özelliği yoktur.
5. **Widget var mı? → Kısmen (Yalnız Android'de Emir Ayetleri widget'ı var; iOS widget'ı ve Namaz Vakti widget'ı YOK).**  
   `react-native-android-widget` (`package.json:47`) ile 876 emir ayetini döndüren `EmirAyetWidget` (`src/widgets/EmirAyetWidget.tsx:1-208`, `src/widgets/emirRotation.ts`) yazılmıştır. iOS'ta widget desteği yoktur ve menüde gizlenir (`app/(tabs)/daha-fazla.tsx:52-56`, `app/widget-ekle.tsx:35, 56-73`).
6. **Kelime kelime meal / morfoloji var mı? → Evet (✓).**  
   `app/ayah/[surahId]/[ayahNumber].tsx:974-1118` ekranında her kelimenin Arapçası, TR/EN anlamı, sözcük türü (POS), morfolojik özellikleri (`packages/core/src/presentation/morphologyLabels.ts`), lemaya/köke bağlı detayları, tıklanabilir kök bağlantısı (`/root/[root]` üzerinde 114 surelik ısı haritası ve türev kelimeler: `app/root/[root]/index.tsx:32-217`), kelime-kelime düz (literal) çeviri ve Meal–Literal Fark Analizi (`farkAnalizi`) yer alır.

---

## 2. Rakip İncelemesi (2025–2026 Web Verileri)

### 2.1 Türkiye Pazarı Rakipleri

1. **Diyanet İşleri Başkanlığı — "Kur'an-ı Kerim" ve "e-Diyanet" (`tr.gov.diyanet.kuranikerim` / e-Diyanet)**
   - **Temel Özellikler:** Medine/Diyanet Mushafı, Diyanet meali ve tefsiri, çoklu hafızdan sesli kıraat, hatim takibi; *e-Diyanet* süper uygulamasında ek olarak "Kur'an Akademi", namaz vakitleri, fetva, hadis ve kıble.
   - **Farklılaştırıcılar:** Resmi kurum güveni, telif sorunu olmayan resmi Diyanet meali/kıraatleri, sıfır reklam.
   - **Ücret Modeli:** %100 ücretsiz ve reklamsız.
   - **Mağaza Puanı / İndirme:** Resmi uygulamalar milyonlarca indirmeye sahiptir; puan ortalaması sürüme göre 4.5–4.8 bandında seyretmekle birlikte büyük arayüz güncellemeleri sonrasında düşüşler yaşanmaktadır (kesin anlık kırılım doğrulanamadı; yaklaşık, kaynak: genel site) [Kaynak 1, 2].
   - **Sık Şikâyetler:** Güncelleme sonrası kaybolan yer imleri/hatimler, çalışmayan widget'lar, geciken bildirimler ve yavaş arayüz [Kaynak 13].

2. **Diyanet Namaz Vaktim / Resmi Namaz Uygulamaları**
   - **Temel Özellikler:** Resmi Diyanet takvimine göre konum bazlı ezan vakitleri, imsakiye, vakit hatırlatıcıları ve kıble pusulası.
   - **Farklılaştırıcılar:** Türkiye'de cami ezanlarıyla tam uyumlu resmi veri kaynağı (`namazvakitleri.diyanet.gov.tr`).
   - **Ücret Modeli:** %100 ücretsiz ve reklamsız.
   - **Mağaza Puanı / İndirme:** Genel kategori ortalaması 4.5–4.8; milyonlarca indirme (kesin tekil mağaza rakamı doğrulanamadı; yaklaşık, kaynak: genel site) [Kaynak 2].
   - **Sık Şikâyetler:** Arka planda pil tasarrufu nedeniyle çalmayan ezan alarmları ve donan ana ekran widget'ları [Kaynak 13].

3. **Namaz Vakti / Ezan Vakti Pro (Ticari TR Namaz ve Kur'an Uygulamaları)**
   - **Temel Özellikler:** Ezan vakti alarmları, sesli Kur'an ve meal, kaza namazı takibi, zikirmatik, kıble, dini günler, çoklu widget.
   - **Farklılaştırıcılar:** Zengin bildirim/widget seçenekleri ve kaza/hatim takip araçları.
   - **Ücret Modeli:** Freemium (reklam destekli ücretsiz sürüm + reklamsız Pro abonelik veya tek seferlik paket).
   - **Mağaza Puanı / İndirme:** Google Play'de milyonlarca indirme, 4.3–4.8 puan aralığı (uygulama varyantına göre kesin rakam doğrulanamadı; yaklaşık, kaynak: genel site) [Kaynak 3, 13].
   - **Sık Şikâyetler:** Kur'an ve namaz ekranlarında çıkan tam ekran, geçilemeyen veya dini hassasiyete aykırı (+18/sohbet/kumar) üçüncü taraf reklam ağları; habersiz yenilenen yüksek tutarlı (800–900 TL bandında; yaklaşık, kaynak: genel site) yıllık abonelikler [Kaynak 13].

4. **"Kuran-ı Kerim ve Meali" / "Hz. Kur'an" / Hayrat Neşriyat Türü Popüler TR Uygulamaları**
   - **Temel Özellikler:** Renkli tecvidli Mushaf, satır altı kelime meali, sesli sure indirme, cüz/hatim takibi, Risale/tefsir notları.
   - **Farklılaştırıcılar:** Geleneksel basılı mushaf alışkanlığına yakın görünüm ve Türkçe satır altı kelime meali.
   - **Ücret Modeli:** Vakıf destekli olanlar (ör. Hayrat) ücretsiz/reklamsız; bireysel geliştirici uygulamaları reklamlı + Pro abonelikli.
   - **Mağaza Puanı / İndirme:** Yüz binlerce ile milyonlar arası indirme; puanlar 4.4–4.8 aralığında (kesin rakam doğrulanamadı; yaklaşık, kaynak: genel site) [Kaynak 3].
   - **Sık Şikâyetler:** Yüksek ses dosyası indirme boyutları, eski tip kullanıcı arayüzü ve ticari olanlarda tam ekran reklamlar.

5. **Elif-Ba Öğretici Uygulamalar (Elif Ba Kur'an Öğreniyorum / Sesli Elifba Cüzü)**
   - **Temel Özellikler:** Diyanet müfredatına uygun 28 harf, harekeler (üstün, esre, ötre), cezm, şedde, med harfleri, sesli telaffuz ve basit harf bulma oyunları.
   - **Farklılaştırıcılar:** Çocuklar ve yeni başlayanlar için sesli cüz tekrarı.
   - **Ücret Modeli:** Çoğunlukla reklamlı ücretsiz; küçük tek seferlik ücretle reklamsız.
   - **Mağaza Puanı / İndirme:** Yüz binlerce indirme, Google Play'de 4.5+ puan ortalaması (kesin tekil rakam doğrulanamadı; yaklaşık, kaynak: genel site) [Kaynak 3].
   - **Sık Şikâyetler:** Çocukların yanlışlıkla tıkladığı tam ekran reklamlar, pedagojik açıklama eksikliği ve Kur'an'a geçişte kopukluk.

### 2.2 Global Pazar Rakipleri

1. **Muslim Pro (Bitsmedia)**
   - **Temel Özellikler:** Namaz vakitleri, ezan, kıble, sesli Kur'an, çoklu meal, hatim, zikirmatik, Hicri takvim ve Qalbox İslami video akışı.
   - **Farklılaştırıcılar:** En geniş küresel yaşam tarzı ekosistemi, AI destekli özellikler ve medya platformu (Qalbox).
   - **Ücret Modeli:** Freemium (ağır reklamlı ücretsiz katman; Premium abonelik ~$12.99/ay veya ~$34.99/yıl; yaklaşık, kaynak: genel site) [Kaynak 4].
   - **Mağaza Puanı / İndirme:** Küresel 190M+ indirme, Google Play'de 100M+ indirme dilimi (güncel tekil mağaza puanı bölgeye göre değişmekte olup kesin rakam doğrulanamadı; yaklaşık, kaynak: genel site) [Kaynak 4].
   - **Sık Şikâyetler:** Yoğun ve agresif reklamlar, temel özelliklerin ücretli duvara alınması ve geçmişteki konum verisi paylaşımı/gizlilik tartışmaları [Kaynak 4].

2. **Quran by Quran.com — قرآن (Quran Foundation)**
   - **Temel Özellikler:** Medine Mushafı ve tecvidli sayfa görünümleri, onlarca dilde çoklu meal ve tefsir, çoklu hafızdan ayet ayet sesli takip, yer imi ve cihazlar arası hesap senkronizasyonu.
   - **Farklılaştırıcılar:** Açık kaynaklı, 100% reklamsız, temiz ve hızlı okuma/dinleme standardı.
   - **Ücret Modeli:** %100 ücretsiz, reklamsız, uygulama içi satış yok (bağış/vakıf destekli) [Kaynak 4].
   - **Mağaza Puanı / İndirme:** Google Play'de 50M+ indirme ve ~4.73/5 puan (610 bin+ yorum); App Store'da ~4.86–4.9/5 puan (yaklaşık, kaynak: genel site) [Kaynak 4].
   - **Sık Şikâyetler:** Yapılandırılmış ders, Elif-Ba veya namaz/ibadet rehberi gibi başlangıç seviyesi eğitim modüllerinin bulunmaması.

3. **Tarteel: AI Quran Memorization (`tarteel.ai`)**
   - **Temel Özellikler:** Yapay zekâ ses tanıma ile kullanıcının okuyuşunu dinleme, ayetleri gizleyerek ezber (hıfz) testi, unutulan veya yanlış okunan kelimeleri gerçek zamanlı işaretleme, ezber analitiği.
   - **Farklılaştırıcılar:** Kur'an tilaveti için özel eğitilmiş konuşma tanıma yapay zekâsı.
   - **Ücret Modeli:** Freemium (temel okuma/dinleme ücretsiz; AI hata tespiti ve ezber araçları Premium: ~$12.99–$19.99/ay veya ~$99–$239.99/yıl; yaklaşık, kaynak: genel site) [Kaynak 4].
   - **Mağaza Puanı / İndirme:** Küresel 15M+ kullanıcı, Google Play'de 10M+ indirme; mağazalarda ~4.6–4.7/5 puan (100 bin+ yorum) (yaklaşık, kaynak: genel site) [Kaynak 4].
   - **Sık Şikâyetler:** Yüksek abonelik fiyatı, tecvid kurallarını değil yalnız kelime doğruluğunu denetlemesi ve Türkçe anlam/eğitim derinliğinin olmaması.

4. **Quran Majeed (PakData)**
   - **Temel Özellikler:** Çoklu mushaf hattı (IndoPak, Uthmani), renkli tecvid, ünlü hafızlardan sesli kıraat, çoklu dilde meal/tefsir, namaz vakitleri, kıble, CarPlay ve Apple Watch desteği.
   - **Farklılaştırıcılar:** Zengin mushaf hattı seçenekleri ve giyilebilir cihaz / araç entegrasyonları.
   - **Ücret Modeli:** Freemium (ücretsiz sürümde reklam; Premium yükseltme ile reklamsız ve ek ses/tema özellikleri) [Kaynak 5].
   - **Mağaza Puanı / İndirme:** Dünya genelinde 100M+ kullanıcı; App Store'da ~4.7/5, Google Play'de ~4.5+/5 puan (yaklaşık, kaynak: genel site) [Kaynak 5].
   - **Sık Şikâyetler:** Ücretsiz sürümde okuma deneyimini bölen reklamlar ve kalabalık arayüz.

5. **iQuran (Guided Ways)**
   - **Temel Özellikler:** Renkli tecvid kuralları, kelime kelime çeviri, ayet gruplu tekrarlı ses oynatımı, kök/morfoloji ipuçları, arama ve not alma.
   - **Farklılaştırıcılar:** Abonelik dayatması yerine düşük maliyetli tek seferlik Pro yükseltme (~$1.99; yaklaşık, kaynak: genel site) geleneği ve güçlü tecvid gösterimi [Kaynak 5].
   - **Ücret Modeli:** Freemium / Lite + tek seferlik Pro (~$1.99; yaklaşık, kaynak: genel site) [Kaynak 5].
   - **Mağaza Puanı / İndirme:** Google Play'de ~4.3–4.7/5, App Store'da ~4.8/5 puan; milyonlarca indirme (kesin toplam rakam doğrulanamadı; yaklaşık, kaynak: genel site) [Kaynak 5].
   - **Sık Şikâyetler:** Arayüz tasarımının modern rakiplere kıyasla eski kalması ve sosyal/öğrenme modüllerinin bulunmaması.

6. **Ayah: Quran App (`ayahapp.com`)**
   - **Temel Özellikler:** Sade Medine Mushafı, seçkin hafızlardan sesli tilavet, Muhtasar fi't-Tefsir entegrasyonu, hatim (Khatmah) takibi, ayet paylaşım kartları.
   - **Farklılaştırıcılar:** Minimalist, dikkat dağıtmayan estetik tasarım ve hız.
   - **Ücret Modeli:** Ücretsiz (isteğe bağlı bağış/destek) [Kaynak 7].
   - **Mağaza Puanı / İndirme:** Google Play'de 10M+ indirme ve ~4.6/5 puan (140 bin+ değerlendirme); App Store'da ~4.7/5 puan (37 bin+ değerlendirme) (yaklaşık, kaynak: genel site) [Kaynak 7].
   - **Sık Şikâyetler:** Sınırlı dil/meal çeşitliliği, kelime/kök analizinin ve ibadet araçlarının olmaması.

7. **Athan: Prayer Times & Al Quran (IslamicFinder)**
   - **Temel Özellikler:** Küresel namaz vakitleri, ezan alarmları, namaz takip çizelgesi (Prayerbook), Kur'an okuma/dinleme, dua, Hicri takvim ve kıble.
   - **Farklılaştırıcılar:** IslamicFinder'ın köklü küresel vakit hesaplama altyapısı ve ibadet alışkanlık takibi.
   - **Ücret Modeli:** Freemium (reklamlı ücretsiz sürüm + aylık/yıllık *Athan Pro* aboneliği) [Kaynak 5].
   - **Mağaza Puanı / İndirme:** Küresel 55M+ kullanıcı; App Store'da ~4.7/5, Google Play'de ~4.5+/5 puan (yaklaşık, kaynak: genel site) [Kaynak 5].
   - **Sık Şikâyetler:** Reklam yoğunluğu ve bildirim izinlerinin cihaz güncellemelerinde sıfırlanması.

8. **Quranic (`getquranic.com`) ve Bayyinah TV (`bayyinahtv.com`)**
   - **Temel Özellikler:** *Quranic:* Kur'an kıssaları üzerinden oyunlaştırılmış (Duolingo tarzı) Kur'an Arapçası kelime ve gramer dersleri, aralıklı tekrar (spaced repetition). *Bayyinah TV:* Nouman Ali Khan tarafından hazırlanan 2.000+ saatlik (yaklaşık, kaynak: genel site) video tefsir ve Arapça müfredatı + *Revealed* mushaf uygulaması.
   - **Farklılaştırıcılar:** Doğrudan Kur'an kelimeleriyle yapılandırılmış dil ve tefsir eğitimi.
   - **Ücret Modeli:** *Quranic:* Freemium (ilk dersler ücretsiz, tam müfredat aylık/yıllık abonelik). *Bayyinah TV:* ~$11/ay veya ~$112/yıl abonelik (7 gün deneme; yaklaşık, kaynak: genel site) [Kaynak 6, 7].
   - **Mağaza Puanı / İndirme:** *Bayyinah TV:* Google Play 100K+ indirme, ~4.5/5 puan (4.300+ yorum); App Store ~4.4–4.6/5 (yaklaşık, kaynak: genel site) [Kaynak 6]. *Quranic:* ~4.5–4.8/5 puan (kesin indirme sayısı doğrulanamadı; yaklaşık, kaynak: genel site) [Kaynak 7].
   - **Sık Şikâyetler:** Yalnızca İngilizce olması (Türkçe destek yok), yüksek döviz bazlı abonelik ücreti ve Bayyinah video oynatıcı/aktarım (casting) hataları [Kaynak 6].

---

## 3. Özellik Karşılaştırma Tablosu

*Kısaltmalar:* **KY:** Kuran Yolu | **Diyanet:** Diyanet Kur'an / e-Diyanet | **NV Pro:** Namaz Vakti / Ezan Vakti Pro | **M.Pro:** Muslim Pro | **Q.com:** Quran.com | **Tarteel:** Tarteel AI | **Q.Maj:** Quran Majeed | **Quranic:** Get Quranic

| # | Özellik | KY | Diyanet | NV Pro | M.Pro | Q.com | Tarteel | Q.Maj | Quranic |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Mushaf sayfa görünümü | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | kısmen |
| 2 | Sesli kıraat / hafız seçimi | kısmen¹ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | kısmen |
| 3 | Ayet ayet takip (sesli) | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| 4 | Tecvid renkleri | ✓ | kısmen | ✓ | kısmen | ✓ | ✓ | ✓ | ✗ |
| 5 | Kelime kelime meal | ✓ | ✓ | kısmen | kısmen | ✓ | ✓ | ✓ | ✓ |
| 6 | Kök / morfoloji | ✓ | ✗ | ✗ | ✗ | kısmen | kısmen | kısmen | kısmen |
| 7 | Tefsir | ✓ | ✓ | kısmen | kısmen | ✓ | ✓ | ✓ | kısmen |
| 8 | Çoklu meal | kısmen² | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| 9 | Arama | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| 10 | Namaz vakti + ezan bildirimi | kısmen³ | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ |
| 11 | Kıble | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ |
| 12 | Zikirmatik | ✓ | kısmen | ✓ | ✓ | ✗ | ✗ | kısmen | ✗ |
| 13 | Dua / hadis | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | kısmen | ✗ |
| 14 | Hatim takibi | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| 15 | Ezber (hıfz) aracı | ✗ | kısmen | ✗ | kısmen | kısmen | ✓ | ✓ | ✗ |
| 16 | Elif-Ba / Arapça öğrenme | ✓ | ✓ | kısmen | ✗ | ✗ | ✗ | ✗ | ✓ |
| 17 | Dersler / quiz | ✓ | kısmen | ✗ | kısmen | ✗ | ✗ | ✗ | ✓ |
| 18 | Seri / oyunlaştırma | ✓ | ✗ | ✗ | ✓ | kısmen | ✓ | ✗ | ✓ |
| 19 | Widget | kısmen⁴ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ |
| 20 | Çevrimdışı | kısmen⁵ | ✓ | ✓ | kısmen | ✓ | kısmen | ✓ | kısmen |
| 21 | Hesap / senkron | kısmen⁶ | kısmen | kısmen | ✓ | ✓ | ✓ | ✓ | ✓ |
| 22 | Karanlık mod | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 23 | Erişilebilirlik | ✓ | kısmen | kısmen | kısmen | ✓ | ✓ | ✓ | kısmen |
| 24 | Reklamsızlık / gizlilik | ✓ | ✓ | ✗ | ✗ | ✓ | ✓ | ✗ | ✓ |
| 25 | Çoklu dil | ✓ (TR/EN) | kısmen | kısmen | ✓ | ✓ | ✓ | ✓ | ✗ (EN) |

*Tablo Notları (Kuran Yolu):*  
¹ Yalnızca Elif-Ba'da 28 harf sesi var; sure/ayet kıraati yok (`app/elifba/[dersId].tsx:68-70`).  
² TR'de yalnız Elmalılı, EN'de yalnız Pickthall meali var (`sourceLicenses.ts:89-92`).  
³ Vakit hesabı ve ayetli bildirim var; ancak bildirim sesi standart sistem sesidir, tam ezan MP3 okunmaz (`app/_layout.tsx:95`).  
⁴ Yalnız Android'de Emir Ayetleri widget'ı var; iOS widget'ı ve Namaz Vakti widget'ı yok (`app/widget-ekle.tsx:35`).  
⁵ Temel metinler ve dersler gömülü; TR meal, kelime/kök ve Mushaf sayfaları 7 günlük önbellekle çalışır (`src/lib/api.ts:318`).  
⁶ Anonim Firebase yedekleme var; e-posta/Google/Apple ile cihazlar arası aktarım yok (`src/lib/cloudBackup.ts:86-95`).

---

## 4. Eksiklerimiz ve Lisans / Risk Analizi

### 4.1 İçerik Eksikleri

| Eksik Madde | Neden Önemli (Rakip / Kullanıcı Kanıtı) | Efor | Risk (Telif / Lisans / Boyut / Mağaza) | Öneri |
|---|---|---|---|---|
| **1. Sesli Kıraat, Hafız Seçimi ve Ayet Takibi** | Diyanet, Quran.com, Muslim Pro, Ayah ve Quran Majeed'in tamamında temel özelliktir; kullanıcılar okurken dinlemek ve takip etmek ister. | **M** | **Yüksek (Telif & Boyut):** Tüm Kur'an MP3 dosyalarını pakete gömmek uygulamayı 500MB–1.5GB büyütür. Akış (streaming) + isteğe bağlı sure indirme yapılmalı; yalnız açık lisanslı kaynak kullanılmalıdır. | **YAP** |
| **2. İkinci Açık Lisanslı Türkçe ve Çağdaş İngilizce Meal** | Şu an dil başına tek meal var (`sourceLicenses.ts:89-92`). Rakipler karşılaştırmalı okumada 5–20 meal sunar; Elmalılı ve 1930 Pickthall dili bazı kullanıcılar için ağır kalabilir. | **S** | **Yüksek (Telif):** Türkiye'deki çağdaş meallerin çoğunun ticari/mobil dağıtım izni kısıtlıdır. Yazılı izin veya açık API şarttır. | **SONRA** |
| **3. Elif-Ba Hareke / Tecvid Uygulama Alıştırmaları** | Elif-Ba modülümüz 9 ders ve Harf-i Tarif içeriyor (`dersler_registry.ts:274`), ancak rakiplerdeki kelime birleştirme ve sesli tecvid örnekleri geçişi kolaylaştırır. | **S** | **Düşük:** Kendi telifimizle üretilebilir; ses dosyaları CDN'den sunulur (`elifba/[dersId].tsx:68`). | **YAP** |
| **4. Ayet Tema Etiketlerinin (`SHOW_THEME_TAGS`) Doğrulanıp Açılması** | Veri tabanında (`verse_tags`) tema etiketleri mevcuttur ancak `git log -S "SHOW_THEME_TAGS"` incelemesine göre (`commit 6a4e896`, 2026-07-05: *"feat(mobile): analiz sekmesinde tema etiketleri kartını gizle"*) iki nedenle kapatılmıştır: (1) Kart ham kategori kodunu (`"A1_ALLAH_ULUHIYET"` vb.) doğrudan gösteriyor, Keşfet sayfasındaki kod→okunur başlık haritasını kullanmıyordu; (2) Kod yorumunda belirtildiği üzere (`app/ayah/[surahId]/[ayahNumber].tsx:60-62`) ayet-etiket atamalarının doğruluğu henüz teyit edilmemişti. | **M** | **Orta (Veri Kalitesi):** Yalnız bayrağı `true` yapmak yetmez; önce `verse_tags` atama doğruluğu denetlenmeli ve kod→TR/EN başlık haritası bağlanmalıdır (1.3 sürüm hedefi). | **1.3'TE YAP** |

### 4.2 Teknik Eksikler

| Eksik Madde | Neden Önemli (Rakip / Kullanıcı Kanıtı) | Efor | Risk (Telif / Lisans / Boyut / Mağaza) | Öneri |
|---|---|---|---|---|
| **1. Tek Tıkla Tam Çevrimdışı Kur'an & Meal Paketi** | Uçakta, camide veya internetin zayıf olduğu yerlerde daha önce açılmamış Mushaf sayfası/TR meal açılmıyor (`src/lib/api.ts:372-387`). Quran.com ve Diyanet tam çevrimdışı çalışır. | **M** | **Orta (Depolama):** 6.236 ayet TR meal + tecvid JSON verisi sıkıştırılmış olarak ~10–15 MB yer tutar; SQLite veya dosya sistemine indirilebilir. | **YAP** |
| **2. Namaz Vakti Widget'ı (Android + iOS WidgetKit)** | TR kullanıcılarının namaz uygulamalarını (Diyanet, Namaz Vakti) ana ekranda tutma sebebi vakit widget'ıdır. Bizde yalnız Android Emir Ayeti widget'ı var (`EmirAyetWidget.tsx`). | **M** | **Orta (App Store / iOS):** iOS WidgetKit için Expo config plugin (`expo-apple-targets` vb.) ve App Groups yapılandırması gerekir. | **YAP** |
| **3. İsteğe Bağlı Ezan Sesiyle Bildirim** | Bildirimlerimiz şu an yalnız standart işletim sistemi sesi çalar (`app/_layout.tsx:95`). Kullanıcılar vakit girdiğinde kısa ezan sesi seçeneği bekler. | **S** | **Orta (iOS 30sn Sınırı):** iOS yerel bildirim sesleri en fazla 30 saniye olabilir; kısa (`<28sn`) telifsiz ezan/uyarı sesi pakete eklenmelidir. | **SONRA** |
| **4. Cihazlar Arası Hesap Bağlama (Apple / Google Girişi)** | Şu an anonim Firebase UID kullanılıyor (`cloudBackup.ts:86-95`); telefon sıfırlandığında veya değiştirildiğinde favoriler, notlar ve hatim kaybolur. | **M** | **Yüksek (App Store Kural 4.8):** Google girişi eklenirse Apple "Sign in with Apple" zorunluluğu getirir; hesap silme akışı (`/gizlilik`) zaten mevcuttur. | **SONRA** |
| **5. Yapay Zekâ Sesli Ezber / Hıfz Denetimi (Tarteel Tarzı)** | Hafızlık öğrencileri için Tarteel'in ana farkıdır; ancak Kuran Yolu'nun ana hedef kitlesi anlam ve ibadet odaklıdır. | **L** | **Yüksek (Maliyet & Altyapı):** Gerçek zamanlı ASR sunucu maliyeti ve mikrofon izinleri gerektirir; reklamsız/ücretsiz modelle bağdaşmaz. | **YAPMA** |

### 4.3 Açık Lisanslı Kaynak Analizi (Doğrulanmış Koşullar)
- **Tanzil.net (`https://tanzil.net/docs/Text_License`):** Arapça Kur'an metni **CC BY 3.0** lisanslıdır [Kaynak 8]. Metinde hiçbir değişiklik yapmamak ve `tanzil.net` adresine kaynak bağlantısı vermek şartıyla ticari/ücretsiz uygulamalarda serbestçe kullanılabilir (projemizde `sourceLicenses.ts:15-26` ile uyumludur). Ancak Tanzil üzerindeki meallerin telifi ilgili çevirmenlere aittir [Kaynak 8].
- **EveryAyah (`https://everyayah.com`):** Ayet ayet bölünmüş MP3 dosyaları ve zamanlama verileri sunar. Ancak sitede resmi bir açık lisans metni yoktur; ses kayıtları farklı yayıncılardan derlenmiştir [Kaynak 9]. Doğrudan dosyaları uygulama içine gömmek yerine açık API veya kamu malı kayıtlar tercih edilmelidir.
- **Quran Foundation / Quran.com API (`https://api-docs.quran.foundation/legal/terms-of-service`):** Geliştirici Kullanım Koşullarına göre Kur'an metnini değiştirmemek, veriyi son kullanıcı arayüzünde göstermek ve ham veriyi üçüncü taraflara satmamak şartıyla ücretsiz veya ticari uygulamalarda ayrı bir ticari lisans olmadan kullanılabilir [Kaynak 10]. Çevrimdışı önbelleklerin en az 7 günde bir senkronize edilmesi ve API inceleme sürecinden geçilmesi istenir [Kaynak 10].
- **Tarteel QUL (`https://qul.tarteel.ai`):** Quranic Universal Library; açık kaynaklı mushaf dizilimi, tecvid, morfoloji ve ses zamanlama verilerini birleştiren geliştirici portalıdır; her veri setinin kendi alt lisansı kontrol edilerek entegre edilebilir.

---

## 5. Güçlü Yanlarımız (Koddan Doğrulanmış Rekabet Avantajları)

1. **114 Surelik Kök Isı Haritası ve Morfoloji Derinliği:** Rakiplerin neredeyse hiçbirinde (Quran.com ve Tarteel dahil) bir Arapça kökün 114 suredeki dağılımını renk yoğunluğuyla gösteren **Isı Haritası (`HeatGrid`, `app/root/[root]/index.tsx:32-146`)**, anlam grupları akordiyonu (`MeaningGroup`) ve türev kelime listesi bir arada bulunmaz.
2. **Meal – Literal (Kelime Kelime Düz Çeviri) Fark Analizi:** `app/ayah/[surahId]/[ayahNumber].tsx:1084-1118` içindeki *Analiz* sekmesi, mealdeki edebi çeviri ile Arapça kelimelerin düz dizilimi arasındaki farkı (`farkAnalizi`) ve ham anlam özetini (`RawMeaningSummary`) açıklar. Bu özellik Türkiye ve global pazarda benzersizdir.
3. **Sıfır Reklam, Sıfır Abonelik ve Tam Gizlilik:** Türkiye'deki ticari rakiplerin (Ezan Vakti Pro vb.) ve Muslim Pro'nun en büyük zayıflığı olan uygunsuz/tam ekran reklamlar ve pahalı abonelikler bizde yoktur. Reklam kimliği kullanılmaz, bulut yedekleri kullanıcı tek tuşla silebilir (`app/gizlilik.tsx:96-120`).
4. **Yapılandırılmış Eğitim (274 Ders Kartı + 651 Quiz + Elif-Ba + Harf-i Tarif):** Quran.com ve Diyanet Kur'an uygulaması yalnız okuma/dinleme sunarken, Kuran Yolu 16 ders modülü (`dersler_registry.ts`), %70 geçme barajlı testler (`dersler/[dersId].tsx:34`) ve 10/10 kilitlemeli Elif-Ba öğrenme yoluyla (`elifba/index.tsx`) sıfırdan başlayan kullanıcıyı adım adım yetiştirir.
5. **Hurafeye Karşı Kanıt Derecelendirme Sistemi:** Mübarek gün ve gecelerde 5 kademeli sahihlik rozeti (`sahih`, `tartismali`, `zayif`, `kulturel`, `uydurma` — `app/mubarek-gunler.tsx:17, 112-118`) ve Manevi Sığınak ekranında 10/10, 8/10, 0/10 güvenilirlik rozetleri ile "Yap / Yapma" uyarıları (`app/manevi-siginak.tsx:30-60`) rakiplerdeki denetimsiz dini içerik kirliliğine karşı güçlü bir güven unsurudur.
6. **Kuzey Enlemleri İçin Özel Namaz Vakti Algoritması:** `src/lib/prayerMethod.ts:39-128` içinde `|enlem| >= 44°` olan Avrupa/Kuzey ülkeleri için geliştirilen özel alacakaranlık açısı düşürme (`adjustHighLatitude`) ve saat dilimi bazlı Diyanet tune ayarları, yurt dışındaki Türk kullanıcılar için önemli bir teknik üstünlüktür.
7. **Ruh Haline Göre Ayet Seçici ve Emir Ayetleri:** Ana sayfadaki 10 duygu durumu çipi (`app/(tabs)/index.tsx:55-66`) ve 876 ayetlik Emir Ayetleri havuzu (`src/data/emirAyetleri.json`), günlük kullanımda Kur'an ile canlı bağ kurdurur.

---

## 6. Tam Yol Haritası

Bölüm 3'teki karşılaştırma tablosunda **✗** veya **kısmen** olan tüm satırlar (sesli kıraat, ayet ayet sesli takip, çoklu meal, namaz/ezan sesi, ezber aracı, Android/iOS widget, çevrimdışı mod, hesap/senkron), Bölüm 4.1–4.2'deki tüm maddeler ve raporda tespit edilen diğer fırsatlar (arama iyileştirme, tema etiketleri, lisans ve iş modeli sınırları) aşağıda dört grupta sınıflandırılmıştır:

### 6.1 Hemen (`1.2.x` — Küçük, Düşük Risk)

1. **Elif-Ba Hareke Birleştirme, Pratik Alıştırmaları ve Ses Önbelleği (Tablo #16, Bölüm 4.1.3)**
   - **Gerekçe:** Mevcut 9 Elif-Ba dersi ve 28 harf sesini (`app/elifba/[dersId].tsx:68-70`) kelime birleştirme pratikleri ve çevrimdışı ses önbelleğiyle güçlendirerek Kur'an okumaya geçişteki kopukluğu kapatır.
   - **Efor:** `S`
   - **Bağımlılık:** Yok (`expo-audio` ve CDN altyapısı hazır).
   - **Risk:** Düşük (içerik kendi telifimizle üretilir, ses dosyaları küçüktür).

2. **İsteğe Bağlı Kısa Ezan / Vakit Sesiyle Bildirim (Tablo #10 `kısmen³`, Bölüm 4.2.3)**
   - **Gerekçe:** Standart sistem bildirim sesi (`app/_layout.tsx:95`) yerine kullanıcının seçebileceği kısa ezan veya vakit uyarısı sesi ekleyerek namaz vakti rakipleriyle temel pariteyi sağlar.
   - **Efor:** `S`
   - **Bağımlılık:** Yok (`expo-notifications` kanal yapısı mevcut).
   - **Risk:** Orta (iOS yerel bildirimlerinde 30 saniye ses süresi sınırı vardır; `<28sn` uzunluğunda kamu malı/telifsiz ses dosyası kullanılmalıdır).

3. **Android Namaz Vakti Ana Ekran Widget'ı (Tablo #19 `kısmen⁴`, Bölüm 4.2.2 — Android Fazı)**
   - **Gerekçe:** Türkiye'deki kullanıcıların namaz uygulamalarını ana ekranda tutma nedeni olan canlı vakit ve geri sayım görünümünü, mevcut Android widget altyapısını genişleterek hızla sunar.
   - **Efor:** `S`
   - **Bağımlılık:** Mevcut `react-native-android-widget` (`src/widgets/EmirAyetWidget.tsx`) ve yerel vakit hesaplayıcı (`src/lib/prayerMethod.ts`).
   - **Risk:** Düşük (Android widget köprüsü zaten prodüksiyonda çalışmaktadır).

4. **Arama İyileştirme: Türkçe/Arapça Esnek Eşleşme ve Hızlı Filtreler (Tablo #9 Geliştirmesi)**
   - **Gerekçe:** Şapkalı/şapkasız Türkçe harf (`â/a`, `î/i`), harekesiz Arapça metin ve sure/cüz filtrelerinde arama toleransını artırarak ayet ve kök bulma hızını iyileştirir.
   - **Efor:** `S`
   - **Bağımlılık:** Yok (mevcut arama uç noktası ve yerel Kur'an/kök dizini üzerinde çalışır).
   - **Risk:** Düşük (veri şeması değişikliği gerektirmez).

---

### 6.2 `1.3` (Orta Vadeli, Yüksek Etkili)

1. **Sure ve Ayet Bazlı Sesli Kıraat + Hafız Seçimi (Tablo #2 `kısmen¹`, Bölüm 4.1.1 — Faz 1)**
   - **Gerekçe:** Rakiplerin tamamında bulunan sesli Kur'an dinleme ihtiyacını, uygulama boyutunu büyütmeden akış (streaming) ve isteğe bağlı sure indirme mimarisiyle karşılar.
   - **Efor:** `M`
   - **Bağımlılık:** Açık lisanslı ses API'si (Quran Foundation API / QUL) entegrasyonu ve arka plan ses oynatıcı (`expo-audio`) servisi önce kurulmalıdır.
   - **Risk:** Yüksek — Telif ve Boyut (MP3 dosyaları uygulama paketine gömülmemeli, yalnız açık lisanslı kaynaklardan akış/indirme yapılmalıdır).

2. **Ayet Ayet Sesli Takip ve Otomatik Vurgulama (Tablo #3 `✗`, Bölüm 4.1.1 — Faz 2)**
   - **Gerekçe:** Kıraat çalarken okunan ayeti Mushaf sayfasında (`mushaf-sayfa.tsx`) ve sure listesinde (`surah/[id].tsx`) eşzamanlı vurgulayarak takip ve telaffuz öğrenimini kolaylaştırır.
   - **Efor:** `M`
   - **Bağımlılık:** Ses altyapısı önce tamamlanmalı (Madde 6.2.1) ve hafız bazlı ayet zaman damgası (timestamp) verisi bağlanmalıdır.
   - **Risk:** Orta (Mushaf sayfasında 60fps kaydırma ve satır vurgulama senkronizasyonu dikkatli performans optimizasyonu gerektirir).

3. **Tek Tıkla Tam Çevrimdışı Kur'an, Türkçe Meal ve Analiz Paketi (Tablo #20 `kısmen⁵`, Bölüm 4.2.1)**
   - **Gerekçe:** Şu an 7 günlük MMKV önbelleğiyle çalışan (`src/lib/api.ts:318`) Türkçe meal, Mushaf sayfa/tecvid ve kelime verilerini tek paket halinde indirilebilir yaparak cami ve uçak modunda kesintisiz okuma/arama sağlar.
   - **Efor:** `M`
   - **Bağımlılık:** Yerel depolama/SQLite paket indirici ve sürüm kontrol mekanizması.
   - **Risk:** Orta (Sıkıştırılmış ~10–15 MB veri paketinin yarım kalmış indirme ve güncelleme bütünlüğü yönetilmelidir).

4. **iOS WidgetKit Desteği: Namaz Vakti ve Emir Ayetleri (Tablo #19 `kısmen⁴`, Bölüm 4.2.2 — iOS Fazı)**
   - **Gerekçe:** Şu an yalnızca Android'de bulunan widget desteğini (`app/widget-ekle.tsx:35`) iOS ana ekranına ve kilit ekranına taşıyarak iOS kullanıcılarında günlük etkileşimi artırır.
   - **Efor:** `M`
   - **Bağımlılık:** Native iOS target (`WidgetKit` / `App Groups`) yapılandırması ve yeni iOS native derlemesi.
   - **Risk:** Orta (App Store inceleme kuralları ve Expo prebuild/native provisioning uyumluluğu dikkatle doğrulanmalıdır).

5. **Ayet Tema Etiketlerinin (`SHOW_THEME_TAGS`) Veri Denetimi ve Kod→Başlık Haritasıyla Açılması (Bölüm 4.1.4)**
   - **Gerekçe:** `commit 6a4e896` ile ham kategori kodlarını (`"A1_ALLAH_ULUHIYET"`) doğrudan bastığı ve etiket atamaları doğrulanmadığı için gizlenen tema kartını, veri kalitesi denetimi ve TR/EN okunur başlık eşlemesi sonrası kullanıcıya ve aramaya açar.
   - **Efor:** `M`
   - **Bağımlılık:** `verse_tags` veri tabanı atama doğruluğu denetimi (veri kalitesi kontrolü) ve Keşfet sayfasındaki kod→başlık haritasının `ayah/[surahId]/[ayahNumber].tsx` ile ortaklaştırılması önce tamamlanmalıdır.
   - **Risk:** Orta (Doğrulanmamış etiketlerin erken açılması dini/ilmî içerik güvenini zedeleyebileceğinden 1.2.x yerine 1.3'e alınmıştır).

---

### 6.3 Sonra / Belki (Uzun Vadeli veya Dış Koşula Bağlı)

1. **İsteğe Bağlı Cihazlar Arası Hesap Bağlama — Sign in with Apple / Google (Tablo #21 `kısmen⁶`, Bölüm 4.2.4)**
   - **Gerekçe:** Mevcut anonim Firebase yedeklemesini (`src/lib/cloudBackup.ts:86-95`) isteğe bağlı kimlik doğrulamayla birleştirerek telefon değiştiren kullanıcıların favori, not, hatim ve ders ilerlemesini korur.
   - **Efor:** `M`
   - **Bağımlılık:** Mevcut `cloudBackup.ts` anonim UID birleştirme (`linkWithCredential`) akışı ve Apple Developer/Google OAuth yapılandırması.
   - **Risk:** Yüksek — Mağaza Kuralı (App Store Kural 4.8 gereği Google girişi eklendiğinde "Sign in with Apple" zorunludur; zorunlu kayıt dayatılmamalıdır).

2. **İkinci Açık Lisanslı Türkçe ve Çağdaş İngilizce Meal (Tablo #8 `kısmen²`, Bölüm 4.1.2)**
   - **Gerekçe:** Dil başına tek meal (`sourceLicenses.ts:89-92`) sınırını aşarak Elmalılı ve 1930 Pickthall dilini ağır bulan kullanıcılara sadeleştirilmiş/çağdaş karşılaştırmalı okuma imkânı verir.
   - **Efor:** `S` (yazılım) / `L` (telif süreci)
   - **Bağımlılık:** Önce yazılı dağıtım izni, kamu malı doğrulaması veya resmi açık API anlaşması sağlanmalıdır.
   - **Risk:** Yüksek — Telif (Türkiye'deki çağdaş meallerin çoğunun mobil dağıtım hakkı kısıtlıdır; izinsiz ekleme mağaza kaldırma riski taşır).

3. **Klasik Ezber (Hıfz) Yardımcı Modu: Ayet Gizleme ve Aralık Tekrarı (Tablo #15 `✗` — AI Olmayan Alternatif)**
   - **Gerekçe:** Yapay zekâ maliyeti olmadan, Mushaf/ayet ekranında metni dokunarak açma (gizleme/bulanıklaştırma) ve seçilen ayet aralığını N kez sesli tekrarlama (loop) özelliğiyle hafızlık çalışanlara pratik araç sunar.
   - **Efor:** `M`
   - **Bağımlılık:** Ses altyapısı ve ayet bazlı ses oynatıcı (Madde 6.2.1 ve 6.2.2) önce tamamlanmalıdır.
   - **Risk:** Düşük (Tamamen cihaz içinde çalışır, sunucu maliyeti veya mikrofon izni gerektirmez).

---

### 6.4 Yapma (Gerekçesiyle)

1. **Tarteel Tarzı Gerçek Zamanlı Yapay Zekâ Ses Tanımalı Hıfz Denetimi (Tablo #15, Bölüm 4.2.5)**
   - **Gerekçe:** Kuran Yolu'nun ana değer önerisi anlam, morfoloji ve temel ibadet eğitimidir; gerçek zamanlı Kur'an ASR (konuşma tanıma) modeli eğitmek/işletmek sürekli bulut GPU maliyeti doğurur ve %100 ücretsiz/reklamsız ürün ilkemizle bağdaşmaz.
   - **Efor:** `L`
   - **Bağımlılık:** Özel ses tanıma modeli, sürekli ses akışı sunucuları ve mikrofon izin altyapısı.
   - **Risk:** Çok Yüksek (Sürekli sunucu maliyeti, tecvid hatalarını yanlış onaylama/reddetme riski ve gizlilik/mikrofon hassasiyeti).

2. **Telif İzni Belirsiz Türkçe Meallerin veya EveryAyah MP3 Dosyalarının Pakete Gömülmesi (Bölüm 4.1.1, 4.1.2, 4.3)**
   - **Gerekçe:** Geçmişte telif güvenliği için 4 Türkçe meal kaldırıldığı (`sourceLicenses.ts:89-92`) ve EveryAyah'ta açık lisans metni bulunmadığı için, lisansı yazılı olarak doğrulanmamış hiçbir meal veya ses kaydı uygulama içine gömülmemelidir.
   - **Efor:** `S`
   - **Bağımlılık:** Yok.
   - **Risk:** Çok Yüksek (Telif ihlali, DMCA/mağaza yayından kaldırma ve uygulama boyutunun 500MB–1.5GB'a şişmesi).

3. **Üçüncü Taraf Reklam Ağları, Zorunlu Abonelik Duvarı veya Yaşam Tarzı Video Akışı (Muslim Pro / Qalbox Tarzı)**
   - **Gerekçe:** Rakip analizinde kullanıcıların en büyük şikâyet kaynağının Kur'an/namaz ekranlarındaki uygunsuz reklamlar, agresif abonelikler ve dikkat dağıtan medya akışları olduğu kanıtlanmıştır; Kuran Yolu'nun en güçlü rekabet avantajı sade, reklamsız ve gizlilik odaklı mimarisidir (`docs/store/listing.tr.md:74-78`).
   - **Efor:** `M`
   - **Bağımlılık:** Yok.
   - **Risk:** Çok Yüksek (Marka güveni kaybı, Advertising ID izni zorunluluğu ve kullanıcı terk oranı).

---

## 7. Kaynak Listesi (URL)

1. Diyanet İşleri Başkanlığı Mobil Uygulamalar ve e-Diyanet Duyuruları: https://www.diyanet.gov.tr
2. Diyanet Namaz Vakitleri Resmi Portalı: https://namazvakitleri.diyanet.gov.tr
3. Google Play Türkiye — Kur'an, Namaz Vakti ve Elif-Ba Uygulamaları Mağaza Kayıtları: https://play.google.com/store/apps
4. Muslim Pro, Quran.com ve Tarteel Resmi Siteleri ve Mağaza İstatistikleri: https://www.muslimpro.com | https://quran.com | https://tarteel.ai
5. Quran Majeed, iQuran ve Athan (IslamicFinder) Resmi Siteleri: https://quranmajeed.com | https://www.islamicfinder.org/athan/
6. Bayyinah TV Resmi Platformu ve Abonelik Bilgileri: https://bayyinahtv.com
7. Ayah: Quran App ve Quranic Resmi Siteleri: https://ayahapp.com | https://getquranic.com
8. Tanzil Project — Kur'an Metni Lisans Koşulları (CC BY 3.0): https://tanzil.net/docs/Text_License
9. EveryAyah — Ayet Ayet Ses Dosyaları Projesi: https://everyayah.com
10. Quran Foundation (Quran.com API) Geliştirici Kullanım Koşulları: https://api-docs.quran.foundation/legal/terms-of-service
11. Tarteel Quranic Universal Library (QUL) Açık Kaynak Veri Portalı: https://qul.tarteel.ai
12. M. M. Pickthall (1930) *The Meaning of the Glorious Koran* (Kamu Malı / Tanzil): https://tanzil.net/trans/
13. Şikayetvar — Türkiye Namaz Vakti ve Kur'an Uygulamaları Kullanıcı Şikâyet Analizleri: https://www.sikayetvar.com
