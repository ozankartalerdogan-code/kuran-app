# Kuran Yolu — Yayın Öncesi Final Denetim Raporu

**Denetim tarihi:** 14 Temmuz 2026  
**İncelenen branch:** `feature/prayer-widget-chronometer`  
**İncelenen commit:** `54ca74a`  
**Kapsam:** Expo/React Native mobil uygulama, Next.js web uygulaması ve API route'ları, Android namaz widget'ı native modülü, depolama/migration, Firebase, Turso, bildirimler, App Links, izinler, gizlilik ve yayın yapılandırması.

Bu rapor salt-okunur denetim sonucudur. Build, EAS build, deploy, migration, commit, push veya otomatik düzeltme yapılmadı. Tarihsel `kuran_app_baglam_v_before_compress_backup.txt` ve `Hatalar.txt` yalnız geçmiş bağlamı anlamak için okundu; aşağıdaki sonuçlar aktif branch, güncel dosyalar ve çalıştırılan kontrollerden üretildi.

## 1. Yönetici özeti

### Genel yayın güveni

**4/10**

TypeScript kontrolleri, Expo Doctor ve mevcut testlerin çalıştırılabilir takımları başarılıdır. Android widget kodu; boot, paket güncellemesi, saat/saat dilimi değişikliği, exact-alarm izni yokluğu ve eski native build durumları için savunmacı kontroller içerir. Firestore kuralları da kaynak kod düzeyinde kullanıcıyı yalnız kendi `backups/{uid}` belgesine sınırlar.

Buna rağmen mevcut kaynak ağacında yayın kararını durdurması gereken birden fazla kanıtlanmış sorun vardır: yüksek önem dereceli güvenlik kayıtları bulunan Next.js sürümü, web tarafında aynı süreçte iki farklı React ana sürümünün çözülmesi, iOS Expo introspection'ın kesin olarak başarısız olması, namaz vakitlerinde İstanbul saat diliminin konumdan bağımsız zorlanması ve bulut yedek davranışı ile kullanıcıya verilen güvenceler arasındaki boşluklar.

### Production'a engel kesin sorun var mı?

**Evet.** En az şu üç başlık yayın engelidir:

1. `next@14.2.28`, 14 Temmuz 2026 tarihli `npm audit --omit=dev` çıktısında doğrudan production bağımlılığı olarak **yüksek** önem dereceli birden fazla güvenlik kaydından etkilenmektedir.
2. Kurulu monorepo ağacında Next 14, kökten React/ReactDOM 19.2.3'e; web uygulaması ise kendi klasöründen React/ReactDOM 18.3.1'e çözülmektedir. `npm ls` bunu `ELSPROBLEMS` ile geçersiz peer ağacı olarak doğrulamıştır.
3. `npx expo config --type introspect --json`, iOS için `ios.googleServicesFile` eksikliği nedeniyle durmaktadır. Mevcut yapılandırmayla iOS native config üretimi güvenilir değildir.

Namaz vakti doğruluğu ve bulut yedek güvenceleri de, kapsam yalnız Android kapalı test olsa dahi düzeltilmeden production'a taşınmamalıdır.

### Kapalı testte kalması gereken riskler

- İstanbul dışı konumlarda ve cihaz saat dilimi `Europe/Istanbul` değilken namaz vakti, bildirim ve widget doğruluğu.
- Konum izni reddedildiğinde uygulamanın bunu kullanıcıya bildirmeden İstanbul vakitlerini etkinleştirmesi.
- Android 12–16 arasında exact alarm izni verilmiş/reddedilmiş/sonradan geri alınmış durumlar.
- Boot, launcher yeniden çizimi, saat ve saat dilimi değişimi, uygulama güncellemesi ve eski build üzerine güncelleme.
- Bulut yedeklemenin gerçek cihazlar arası geri yükleme, çevrimdışı hata, 20 saniyelik debounce sırasında kapanma ve büyük not seti senaryoları.
- App Links sertifika eşleşmesi ve final imzalı AAB'nin birleşmiş manifesti.
- Gerçek production env'inde Upstash rate limit ve CORS davranışı.

### En önemli ilk 5 konu

1. **Next.js güvenlik açıkları:** doğrudan production bağımlılığı güncel yüksek önem dereceli kayıtlardan etkileniyor.
2. **Web React ağacı:** Next 14 React 19'a, uygulama React 18'e çözülüyor; tek runtime içinde iki React kopyası var.
3. **Namaz vakti doğruluğu:** koordinat değişse bile Aladhan istekleri `Europe/Istanbul` kullanıyor; izin reddinde sessiz İstanbul fallback'i bildirimleri açıyor.
4. **Bulut yedek güvenilirliği ve beyanı:** anonim UID taşınmadığında eski yedeğe erişim yolu yok; hata ve belge boyutu aşımı kullanıcıya görünmüyor; hesap silme başarısız olsa da başarı bildirilebiliyor.
5. **iOS ve gizlilik yapılandırması:** iOS Firebase plist yapılandırması eksik; ayrıca politika “hassas konum yok” derken iOS kodu `Accuracy.High` isteyebiliyor ve Advertising ID toplamanın kapatıldığı native Firebase ayarı bulunmuyor.

## 2. Kesin bulgular

### F-01 — Kullanılan Next.js sürümü yüksek önem dereceli production güvenlik açıklarından etkileniyor

- **Önem derecesi:** Yüksek
- **Alan:** Web / API / Güvenlik
- **Dosya ve kod bölümü:** `apps/web/package.json:13-25` (`next: 14.2.28`); `package-lock.json` içindeki kurulu sürüm; doğrulama: `npm audit --omit=dev --json`
- **Sorunun açıklaması:** Güncel npm audit, doğrudan kullanılan `next@14.2.28` paketini yüksek önem dereceli olarak işaretledi. Çıktıda Server Components DoS, WebSocket upgrade SSRF, middleware bypass, request smuggling, image cache/optimizer DoS ve bazı cache/XSS kayıtları bulunuyor. Audit toplamında 1 yüksek, 13 orta önem dereceli production paket zinciri raporlandı; yüksek paket doğrudan `next` bağımlılığıdır. Örnek kayıtlar: [GHSA-c4j6-fc7j-m34r](https://github.com/advisories/GHSA-c4j6-fc7j-m34r), [GHSA-q4gf-8mx6-v5v3](https://github.com/advisories/GHSA-q4gf-8mx6-v5v3), [GHSA-36qx-fr4f-26g5](https://github.com/advisories/GHSA-36qx-fr4f-26g5).
- **Gerçek kullanıcı etkisi:** Uygulanabilir kaydın tetiklenmesine bağlı olarak API/web servisinde hizmet kesintisi, isteklerin istenmeyen hedeflere yönelmesi veya güvenlik kontrolünün atlanması mümkündür. Her kayıt bu uygulamanın kullandığı her route'a otomatik olarak uygulanmaz; ancak kurulu sürümün kayıt aralıklarında olduğu kesindir.
- **Hangi koşulda ortaya çıkar:** Etkilenen Next.js kod yoluna saldırgan kontrollü istek ulaştığında. Uygulama App Router, middleware ve API route'larını aktif olarak kullanmaktadır.
- **Önerilen minimum çözüm:** Next.js'i, kullanılan özellikler için ilgili güvenlik kayıtlarının tamamının giderildiği desteklenen bir sürüme yükseltmek; ardından typecheck, lint, test ve kullanıcı onaylı ayrı bir build doğrulaması yapmak. `npm audit fix --force` çıktısındaki SDK/major geri dönüş önerileri körlemesine uygulanmamalıdır.
- **Çözümün yan etki riski:** **Yüksek.** Next major yükseltmesi React, App Router, middleware, image ve build davranışlarını değiştirebilir; kontrollü migration ve regresyon testi gerekir.

### F-02 — Web runtime'ında Next ve uygulama farklı React ana sürümlerine çözülüyor

- **Önem derecesi:** Yüksek
- **Alan:** Web
- **Dosya ve kod bölümü:** `package.json:40-47` (React/ReactDOM 19.2.3); `apps/web/package.json:13-25` (Next 14.2.28, React/ReactDOM 18.3.1); `apps/web/next.config.mjs:13-26` (build tip/lint engelleri kapalı)
- **Sorunun açıklaması:** Salt-okunur çözümleme kontrolü Next paketinin `C:\...\node_modules\react` üzerinden **19.2.3**, web kaynaklarının `apps/web/node_modules/react` üzerinden **18.3.1** kullandığını gösterdi. `npm ls react react-dom next --workspace @quran-app/web --all`, Next 14'ün `^18.2.0` peer koşuluna karşı React ve ReactDOM 19'u `invalid` işaretleyip `ELSPROBLEMS` ile çıktı. Bu yalnız teorik bir package.json uyuşmazlığı değil; iki farklı fiziksel React kopyası çözülmektedir.
- **Gerçek kullanıcı etkisi:** Invalid hook call, context'in iki React kopyası arasında taşınamaması, hydration/SSR tutarsızlığı veya yalnız production install ağacında ortaya çıkan render hataları oluşabilir. `ignoreBuildErrors` bu sınıftaki bir kurulum sorununu build'de maskeleyebilir.
- **Hangi koşulda ortaya çıkar:** Next'in yüklediği renderer/kütüphane ile web bileşenlerinin farklı React örneklerini aynı render yolunda kullanması veya Vercel'in mevcut monorepo hoisting düzenini üretmesi.
- **Önerilen minimum çözüm:** Monorepoda web için tek ve Next sürümünün desteklediği React/ReactDOM çifti çözülmesini sağlamak; kök ve workspace sürümlerini uyumlu hale getirmek; `npm ls` çıktısını temizlemek. Sonrasında build hatalarını görmezden gelme ayarı yeniden değerlendirilmelidir.
- **Çözümün yan etki riski:** **Yüksek.** Mobil Expo SDK 56 React 19 kullanıyor; kök sürümü doğrudan düşürmek mobil tarafı bozabilir. Workspace izolasyonu veya uyumlu Next yükseltmesi planlanmalıdır.

### F-03 — iOS Expo introspection Firebase Auth yapılandırmasında kesin olarak duruyor

- **Önem derecesi:** Yüksek
- **Alan:** Mobil / Store
- **Dosya ve kod bölümü:** `apps/mobile/app.config.js:15-25` (iOS'ta `googleServicesFile` yok); `apps/mobile/app.config.js:136-140` (RNFirebase Auth eklentisi); `apps/mobile/GoogleService-Info.plist` mevcut değil
- **Sorunun açıklaması:** Mobil klasörde çalıştırılan `npx expo config --type introspect --json`, `[@react-native-firebase/auth] Your app.json file is missing ios.googleServicesFile` hatasıyla çıkış kodu 1 döndürdü. Android için `googleServicesFile` tanımlı, iOS için karşılığı yok.
- **Gerçek kullanıcı etkisi:** iOS native yapılandırma üretimi/build'i başlamadan engellenir veya Firebase Auth doğru kurulmaz. iOS sürümünün Store'a hazırlanması mümkün değildir.
- **Hangi koşulda ortaya çıkar:** Expo config eklentileri iOS modlarını çalıştırdığında; yani iOS prebuild/EAS build sürecinde.
- **Önerilen minimum çözüm:** Doğru Firebase iOS uygulamasına ait plist'i güvenli secret/file akışıyla sağlamak ve `ios.googleServicesFile` tanımını eklemek. Dosya repoya secret olarak commit edilmemelidir; proje standardına uygun EAS file secret tercih edilmelidir.
- **Çözümün yan etki riski:** **Orta.** Yanlış Firebase projesi/bundle ID seçilirse auth ve analytics farklı ortama bağlanabilir.

### F-04 — Namaz API istekleri koordinattan bağımsız olarak İstanbul saat dilimini zorluyor

- **Önem derecesi:** Yüksek
- **Alan:** Mobil / Android Native
- **Dosya ve kod bölümü:** `apps/mobile/src/lib/namazNotifications.ts:139-152`, `:228-243`; `apps/mobile/src/hooks/useDailyContent.ts:346-353`; `apps/mobile/src/widgets/prayerWidgetSync.ts:32-50`
- **Sorunun açıklaması:** Aladhan çağrılarının tümünde `timezonestring=Europe/Istanbul` sabit. Buna karşılık koordinatlar cihaz konumundan gelebiliyor. Dönen `HH:mm` değerleri widget tarafında cihazın yerel saat dilimiyle epoch'a çevriliyor (`Date.setHours`). Böylece koordinat başka bir saat dilimindeyken API'nin İstanbul duvar saati, cihazın yerel duvar saati gibi yorumlanıyor.
- **Gerçek kullanıcı etkisi:** Türkiye dışındaki kullanıcı veya seyahat eden kullanıcı yanlış vakit görür; bildirim ve widget geri sayımı gerçek vakitten saatlerce sapabilir. Günlük içerik kartı ile bildirim/widget aynı hatalı kaynağı kullanır.
- **Hangi koşulda ortaya çıkar:** Koordinatın gerçek saat dilimi `Europe/Istanbul` olmadığında ya da cihaz saat dilimi ile zorlanan API saat dilimi ayrıştığında.
- **Önerilen minimum çözüm:** Saat dilimini koordinattan/API yanıtından belirlemek ve API yanıtını açık saat dilimiyle epoch'a çevirmek; bildirim, günlük kart ve widget'ın aynı normalize edilmiş zaman modelini kullanmasını sağlamak.
- **Çözümün yan etki riski:** **Yüksek.** Tarih sınırı, DST, seyahat ve mevcut cache/planlanmış bildirimlerin yeniden kurulması dikkatle ele alınmalıdır.

### F-05 — Konum izni reddedilince kullanıcıya açıklamadan İstanbul bildirimleri etkinleştiriliyor

- **Önem derecesi:** Yüksek
- **Alan:** Mobil
- **Dosya ve kod bölümü:** `apps/mobile/src/lib/namazNotifications.ts:27-45`, `:52-88`, `:535-556`; `apps/mobile/src/widgets/prayerWidgetSync.ts:73-88`
- **Sorunun açıklaması:** İlk bildirim akışında konum izni reddedilirse `getLocationRequesting()` doğrudan İstanbul koordinatını döndürüyor. Bildirim izni verilmişse bu koordinatla 7 günlük vakitler planlanıyor ve tercihler `"1"` yazılarak özellik etkin kabul ediliyor. Sessiz yenileme ve widget da kayıtlı koordinat yoksa İstanbul'a düşüyor. Kullanıcıya kullanılan şehrin İstanbul olduğu veya vakitlerin yaklaşık/fallback olduğu bildirilmez.
- **Gerçek kullanıcı etkisi:** İstanbul dışında yaşayan ve konum iznini reddeden kullanıcı, doğru sandığı fakat başka şehre ait ezan bildirimleri ve widget vakitleri alır. Bu, uygulamanın çekirdek işlevinde güven kaybına yol açar.
- **Hangi koşulda ortaya çıkar:** Bildirim izni verilirken konum izni reddedildiğinde, konum timeout/hatasında veya daha önce geçerli koordinat kaydedilmemiş arka plan/widget yenilemesinde.
- **Önerilen minimum çözüm:** Fallback şehri açıkça kullanıcıya seçtirmek/göstermek veya konum yokken namaz bildirimini etkin saymamak; şehir seçimi kalıcı ve değiştirilebilir olmalıdır.
- **Çözümün yan etki riski:** **Orta.** Onboarding ve mevcut bildirim tercih migration'ı etkilenir; mevcut İstanbul fallback kullanıcıları için açık geçiş gerekir.

### F-06 — “Yeni cihazda geri yükleme” güvencesi anonim UID taşınmadığında gerçekleştirilemiyor

- **Önem derecesi:** Yüksek
- **Alan:** Mobil / Gizlilik
- **Dosya ve kod bölümü:** `apps/mobile/src/lib/cloudBackup.ts:72-93`, `:125-148`; `firestore.rules:4-12`; `apps/mobile/app/gizlilik.tsx:169-178`; `apps/web/src/app/privacy/page.tsx:30-32`
- **Sorunun açıklaması:** Yedek belgesi `backups/{uid}` altında ve yalnız aynı Firebase UID ile okunabiliyor. Uygulama yalnız Anonymous Auth kullanıyor; e-posta/telefon, hesap bağlama, transfer kodu veya eski UID'yi yeni cihazdaki anonim hesaba taşıyan bir mekanizma yok. Yeni cihaz/sıfırlanmış kurulum Firebase auth durumunu Android sistem yedeği üzerinden geri alamazsa `signInAnonymously()` yeni UID üretir ve `maybeRestore()` yalnız yeni UID'nin boş belgesini arar. Buna rağmen mobil ve web politikası yeni cihaza geçişte ilerlemenin kaybolmaması için bu yedeğin kullanıldığını genel bir güvence olarak sunuyor.
- **Gerçek kullanıcı etkisi:** Sistem uygulama verisini/auth durumunu taşımayan yeni cihaz veya temiz kurulumda kullanıcı eski yedeğine erişemez; yedek Firestore'da kalırken uygulama boş veriyle yeni hesap açabilir.
- **Hangi koşulda ortaya çıkar:** Firebase anonim auth kalıcılığı yeni cihaza taşınmadığında; örneğin sistem yedeği kapalı/başarısız olduğunda, farklı platforma geçildiğinde veya uygulama verisi temizlendiğinde.
- **Önerilen minimum çözüm:** Politika metnini gerçek garantiye daraltmak veya kullanıcı kontrollü, güvenli bir hesap bağlama/transfer mekanizması eklemek. Yalnız Android Auto Backup'a güvenilecekse bunun koşullu olduğu açıkça belirtilmelidir.
- **Çözümün yan etki riski:** **Yüksek.** Hesap bağlama kimlik, veri birleştirme, KVKK/Data Safety ve hesap silme kapsamını büyütür; yalnız metni düzeltmek daha düşük risklidir fakat ürün beklentisini değiştirir.

### F-07 — Bulut yedek hataları ve Firestore belge boyutu aşımı kullanıcıya görünmüyor

- **Önem derecesi:** Orta
- **Alan:** Mobil / Gizlilik
- **Dosya ve kod bölümü:** `apps/mobile/src/lib/cloudBackup.ts:37-53`, `:105-116`, `:174-196`, `:250-256`; `apps/mobile/app/gizlilik.tsx:47-77`; not girişinde sınır bulunmayan `apps/mobile/app/ayah/[surahId]/[ayahNumber].tsx:1127-1137`
- **Sorunun açıklaması:** Auth/restore hataları `initCloudBackup()` içinde tamamen yutuluyor; `pushBackup()` yazma hatasını yutup yalnız `dirty` bırakıyor. Gizlilik ekranındaki “aktif” durum gerçek Firebase oturumu veya başarılı son yazma ile değil, yalnız yerel `disabled` bayrağının yokluğuyla belirleniyor. “Yeniden aç” işlemi de `initCloudBackup()` hatayı yuttuğu için çevrimdışıyken bile aktif görünebilir. Ayrıca tüm favori/not/ilerleme verisi tek Firestore belgesine yazılıyor ve notlarda uzunluk sınırı yok. Firestore'un resmi belge sınırı **1 MiB**'dır: [Firestore usage and limits](https://firebase.google.com/docs/firestore/quotas). Sınır aşılırsa yazma sessizce başarısız olur.
- **Gerçek kullanıcı etkisi:** Kullanıcı yedeğin çalıştığını düşünürken güncel veriler buluta hiç ulaşmamış olabilir; cihaz kaybında veri kurtarılamaz.
- **Hangi koşulda ortaya çıkar:** Anonim Auth kapalı/erişilemez olduğunda, Firestore kuralı veya ağ hatasında, yazma timeout'unda ya da toplam snapshot 1 MiB'ı aştığında.
- **Önerilen minimum çözüm:** Son başarılı yedek zamanı ve hata durumunu doğrulanmış state olarak göstermek; hata telemetrisi eklemek; belge boyutunu yazmadan önce ölçmek ve notları/büyük koleksiyonları bölmek.
- **Çözümün yan etki riski:** **Orta.** Belgeyi bölmek Firestore kuralı, restore atomikliği ve migration gerektirir; yalnız durum görünürlüğü eklemek daha düşük risklidir.

### F-08 — Anonim Firebase hesabı silinemese de UI “hesap kalıcı olarak silindi” diyor

- **Önem derecesi:** Orta
- **Alan:** Mobil / Gizlilik / Store
- **Dosya ve kod bölümü:** `apps/mobile/src/lib/cloudBackup.ts:217-246`; `apps/mobile/app/gizlilik.tsx:93-110`, `:244-249`
- **Sorunun açıklaması:** Firestore belgesi silindikten sonra `user.delete()` ayrı `try/catch` içinde; hata tamamen yutuluyor ve fonksiyon `true` döndürüyor. UI bu `true` sonucunda “Bulut yedeğiniz ve anonim hesabınız kalıcı olarak silindi” mesajını gösteriyor. Kaynak yorumunda da boş hesabın kalabileceği açıkça yazıyor.
- **Gerçek kullanıcı etkisi:** İçerik belgesi silinse bile Firebase Authentication hesabı kalabilir; kullanıcıya gerçekleşmemiş bir hesap silme sonucu bildirilir. Bu, mağaza hesap/veri silme beyanıyla tutarsızdır.
- **Hangi koşulda ortaya çıkar:** `user.delete()` ağ, timeout, yeniden kimlik doğrulama veya servis hatasıyla başarısız olduğunda; `deleteDoc()` başarılıysa hata kullanıcıdan gizlenir.
- **Önerilen minimum çözüm:** Belge silme ve hesap silme sonuçlarını ayırmak; hesap silinemediyse kısmi başarıyı açıkça göstermek ve tekrar deneme/operasyonel temizlik yolu sağlamak.
- **Çözümün yan etki riski:** **Düşük-Orta.** Akışın idempotentliği ve belge yeniden oluşturma yarışı korunmalıdır.

### F-09 — “Advertising ID toplamıyoruz” beyanını kapatan Firebase native ayarı yok

- **Önem derecesi:** Orta
- **Alan:** Gizlilik / Store
- **Dosya ve kod bölümü:** `apps/mobile/app/gizlilik.tsx:198-199`; `apps/web/src/app/privacy/page.tsx:33-36`; `apps/mobile/app.config.js:41-60`; kök `firebase.json:1-8`; `node_modules/@react-native-firebase/analytics/android/build.gradle:95`, `node_modules/@react-native-firebase/app/firebase-schema.json:20-22`
- **Sorunun açıklaması:** Android manifestten `com.google.android.gms.permission.AD_ID` kaldırılıyor; ancak RNFirebase Analytics'in `google_analytics_adid_collection_enabled` ayarı `firebase.json` içindeki `react-native` bölümünde `false` yapılmamış. Kurulu RNFirebase build mantığı bu bayrağın varsayılanını `true` alıyor. Firebase'in resmi dokümanı reklam kimliği toplamayı kapatmak için bu meta-data değerinin `false` olmasını istiyor: [Configure Analytics data collection](https://firebase.google.com/docs/analytics/android/configure-data-collection). Android 13+ izin kaldırılması erişimi sınırlar; Android 12 ve öncesinde bu yeni permission modeli aynı korumayı sağlamaz.
- **Gerçek kullanıcı etkisi:** Desteklenen bazı Android sürümlerinde Analytics SDK reklam kimliğine erişebilirken politika bunun hiç toplanmadığını söylüyor; Play Data Safety beyanı yanlış olabilir.
- **Hangi koşulda ortaya çıkar:** Firebase Analytics çalışırken cihaz/Play Services reklam kimliği erişimi sunduğunda, özellikle AD_ID runtime permission modelinden önceki Android sürümlerinde.
- **Önerilen minimum çözüm:** RNFirebase'in beklediği `firebase.json` yapılandırmasında `google_analytics_adid_collection_enabled: false` değerini açıkça tanımlamak ve final merged manifestte meta-data değerini doğrulamak.
- **Çözümün yan etki riski:** **Düşük.** Reklam ilişkilendirme raporları etkilenir; uygulama reklamsız olduğunu beyan ettiği için beklenen sonuç budur.

### F-10 — Gizlilik metni iOS'ta mümkün olan hassas konum isteğiyle çelişiyor

- **Önem derecesi:** Orta
- **Alan:** Mobil / Gizlilik / Store
- **Dosya ve kod bölümü:** `apps/mobile/app/gizlilik.tsx:186-189`; `apps/web/src/app/privacy/page.tsx:33`; `apps/mobile/app/kible.tsx:280-329`; `apps/mobile/app.config.js:15-24`, `:54-60`
- **Sorunun açıklaması:** Politika “hassas (GPS) konum kullanılmaz” diyor. Android'de `ACCESS_FINE_LOCATION` engellenmiş olsa da aynı uygulamanın iOS kodu Balanced denemeden sonra `Location.Accuracy.High` ile gerçek yüksek doğruluk isteği yapıyor; iOS config'te reduced-accuracy zorlaması bulunmuyor.
- **Gerçek kullanıcı etkisi:** iOS kullanıcısı işletim sistemi ayarlarında “Precise Location” açıksa uygulama politika metninden daha hassas konum alabilir. Kıble hesabı cihazda kalsa da toplanan doğruluk düzeyi beyanla uyumsuzdur.
- **Hangi koşulda ortaya çıkar:** iOS'ta son bilinen ve Balanced konum bulunamadığında üçüncü GPS adımı çalıştığında.
- **Önerilen minimum çözüm:** iOS'ta yaklaşık doğruluğu teknik olarak zorlamak veya politika metnini platforma ve gerçek fallback davranışına uygun hale getirmek.
- **Çözümün yan etki riski:** **Orta.** Kıble doğruluğu ile veri minimizasyonu arasında ürün kararı gerekir.

### F-11 — Geçerli JSON fakat yanlış şekilli storage verisi iki ekranda runtime çökmesine yol açabiliyor

- **Önem derecesi:** Orta
- **Alan:** Mobil
- **Dosya ve kod bölümü:** `apps/mobile/src/lib/storage.ts:100-105`, `:128-160`; `apps/mobile/app/search.tsx:82-87`, `:230-237`, `:362-365`, `:400-403`; `apps/mobile/src/components/ZikirMatik.tsx:126-143`, `:422-425`
- **Sorunun açıklaması:** Ortak `safeParse<T>` yalnız JSON sözdizimini doğruluyor, runtime şemasını doğrulamıyor. Arama geçmişi `string[]` varsayımıyla state'e atanıp `forEach/filter` çağrılıyor. Zikirmatik kayıtları da parse sonucunu doğrudan `savedList` state'ine atayıp `map` çağırıyor. Örneğin storage değerinin geçerli JSON olan `"bozuk"` veya `{}` olması parse/catch'i tetiklemez ama sonraki render'da metot bulunamadığı için hata üretir.
- **Gerçek kullanıcı etkisi:** Arama veya Zikirmatik ekranı kalıcı olarak açılırken çökebilir; aynı bozuk değer silinmediği için her girişte tekrarlar.
- **Hangi koşulda ortaya çıkar:** Eski sürüm migration'ı, kısmi yazma, manuel restore veya bozuk/uyumsuz schema geçerli JSON fakat beklenmeyen veri tipi bıraktığında.
- **Önerilen minimum çözüm:** Okuma sınırında `Array.isArray` ve öğe şeması doğrulaması yapmak; geçersiz değeri güvenli varsayılana çevirmek ve gerekirse karantinaya almak/silmek.
- **Çözümün yan etki riski:** **Düşük.** Sadece bozuk verinin nasıl kurtarılacağı kararı gerekir.

### F-12 — Production API cold start'ında Turso üzerinde DDL çalıştırılıyor

- **Önem derecesi:** Orta
- **Alan:** API / Güvenlik
- **Dosya ve kod bölümü:** `apps/web/src/lib/dbUtils.ts:21-25`, `:35-106`, `:146-149`, `:181-188`; `scripts/indexes.sql`
- **Sorunun açıklaması:** İlk Turso sorgusunda `ensureTursoIndexes()` `scripts/indexes.sql` dosyasını okuyup tüm `CREATE INDEX IF NOT EXISTS` ifadelerini production auth tokenıyla sırayla çalıştırıyor. Serverless her yeni instance bunu yeniden dener. Her statement hatası ayrı ayrı yutulduğu için “0 index aktif” ile permission, ağ ve gerçek SQL hatası ayrıştırılamıyor. Salt-okunur API runtime'ı böylece DDL yetkisine bağımlı hale geliyor.
- **Gerçek kullanıcı etkisi:** Cold start gecikmesi ve gereksiz Turso istek maliyeti oluşur. Token DDL yazma yetkisine sahipse ele geçirilmesi halinde etki alanı gereksiz büyür; yetkisi yoksa her cold start başarısız DDL denemeleri üretir.
- **Hangi koşulda ortaya çıkar:** `TURSO_DB_URL` ve `TURSO_AUTH_TOKEN` tanımlı production instance'ında ilk `dbAll/dbGet` çağrısında ve `indexes.sql` bundle içinde bulunduğunda.
- **Önerilen minimum çözüm:** Index oluşturmayı kontrollü, tek seferlik migration/deploy prosedürüne taşımak; web runtime'a yalnız okuma yetkili token vermek.
- **Çözümün yan etki riski:** **Orta.** Indexlerin gerçekten production'da var olduğu migration öncesi doğrulanmalıdır; aksi halde sorgu performansı düşebilir.

### F-13 — Production teşhis endpoint'i kimlik doğrulamasız olarak DB probe ve iç ortam bilgisi yayımlıyor

- **Önem derecesi:** Düşük
- **Alan:** API / Güvenlik
- **Dosya ve kod bölümü:** `apps/web/src/app/api/version/route.ts:1-77`; karşılaştırma için production'da kapalı debug route'u `apps/web/src/app/api/debug/ayah-validator/route.ts:13-21`
- **Sorunun açıklaması:** `/api/version` `force-dynamic` ve `no-store`; her anonim GET isteğinde ana veri kaynağına count/literal sorguları, ayrıca Turso'ya iki ayrı count sorgusu yapıyor. Yanıtta DB host adı, veri kaynağı detayı, deploy commit'i, tablo satır sayıları ve hata mesajının ilk satırı veriliyor. Debug validator production'da kapalıyken bu teşhis route'u açıktır.
- **Gerçek kullanıcı etkisi:** Saldırgan iç altyapı/versiyon bilgisi toplayabilir ve rate limit ölçüsünde her istekle birden fazla ücretli DB sorgusu üretebilir.
- **Hangi koşulda ortaya çıkar:** Her production `GET /api/version` isteğinde.
- **Önerilen minimum çözüm:** Endpoint'i production'da kapatmak, kimlik doğrulamak veya yalnız ucuz/zararsız health bilgisini cache'li sunmak; DB host/hata/count detayını kaldırmak.
- **Çözümün yan etki riski:** **Düşük.** Operasyon ekibinin mevcut teşhis alışkanlığı etkilenebilir.

### F-14 — MMKV'den silinen bazı legacy anahtarlar AsyncStorage'dan yeniden dirilebiliyor

- **Önem derecesi:** Düşük
- **Alan:** Mobil
- **Dosya ve kod bölümü:** `apps/mobile/src/lib/storage.ts:38-70`, `:135-147`, `:171-181`; örnek çağıran `apps/mobile/src/tour/appTourStorage.ts:10-15`
- **Sorunun açıklaması:** Migration anahtarları AsyncStorage'dan MMKV'ye kopyalanıyor fakat legacy kaynak silinmiyor. MMKV aktifken `remove()` yalnız MMKV kaydını siliyor. Sonraki `getString()` MMKV'de değer bulamazsa AsyncStorage'a düşüp eski değeri yeniden MMKV'ye yazıyor. Bu nedenle silme, daha önce migrate edilmiş bir anahtarda kalıcı olmayabilir.
- **Gerçek kullanıcı etkisi:** Örneğin “turu yeniden başlat” için silinen `app_tour_completed` eski AsyncStorage değerinden geri gelebilir; benzer reset akışları beklenmedik şekilde geri alınır.
- **Hangi koşulda ortaya çıkar:** Anahtar eski sürümde AsyncStorage'da bulunmuş, MMKV migration'ıyla kopyalanmış ve daha sonra `remove()` ile silinmişse.
- **Önerilen minimum çözüm:** MMKV aktifken remove/removeMany işlemlerini legacy AsyncStorage'a da uygulamak veya başarılı migration sonrası kaynak anahtarları kontrollü silmek.
- **Çözümün yan etki riski:** **Düşük-Orta.** Eski build'e downgrade/rollback yapılırsa AsyncStorage verisinin artık bulunmaması dikkate alınmalıdır.

## 3. Doğrulanamayan şüpheler

Bu bölümdeki maddeler kesin hata değildir.

### S-01 — Final release manifesti ve AAB izinleri

Expo config ve bağımlılık manifestleri incelendi; ancak kullanıcının build yasağı nedeniyle Gradle `processReleaseMainManifest` veya AAB analizi çalıştırılmadı. Manifest merger; flavor, target SDK ve bağımlılık sürümüne göre son çıktıyı değiştirebilir. Final imzalı AAB'de `apkanalyzer manifest permissions` veya Play Console App Bundle Explorer ile Bölüm 4'teki izin listesi bire bir doğrulanmalıdır.

### S-02 — App Links sertifika parmak izi

`apps/web/public/.well-known/assetlinks.json:1-12` paket adını ve bir SHA-256 parmak izini içeriyor; `apps/mobile/app.config.js:66-79` aynı canlı host ve `/surah` prefix'i için `autoVerify` tanımlıyor. İmzalı artifact/Play App Signing sertifikası olmadığı için parmak izinin gerçek production sertifikasıyla eşleşmesi doğrulanamadı. Play Console'daki App Signing certificate SHA-256 ile karşılaştırılmalı ve `adb shell pm get-app-links com.kuranapp.mobile` ile cihazda test edilmelidir.

### S-03 — Exact alarm izninin sonradan geri alınması

Native receiver `SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED` dinliyor ve uygulama öne geldiğinde reconcile çalışıyor. Android dokümanı grant broadcast'inin izin verildiğinde gönderildiğini, geri alma durumunda aynı garantinin olmadığını belirtir. İzin Ayarlar'dan geri alınır ve uygulama açılmazsa widget'ın 30 dakikalık periyodik update'e kadar eski Chronometer durumunu göstermesi mümkün. Gerçek launcher/OS davranışı cihaz testi gerektirir: [AlarmManager permission state action](https://developer.android.com/reference/android/app/AlarmManager#ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED).

### S-04 — Production CORS ve rate limit env'i

`apps/web/src/middleware.ts:8-10` varsayılan origin olarak eski `https://kuranapp.vercel.app` adresini, `apps/web/next.config.mjs:39-42` ise mevcut hostu kullanıyor. Middleware production'da Upstash env yoksa serverless için etkisiz in-memory fallback'e geçiyor (`apps/web/src/middleware.ts:19-38`, `:93-104`). Vercel production env erişimi olmadığı için `ALLOWED_ORIGINS` ile iki Upstash secret'ının gerçekten tanımlı olup olmadığı doğrulanamadı. Env yoksa cross-origin preflight ve dağıtık rate limit sorunları kesinleşir.

### S-05 — Firebase console ve deploy edilen rules durumu

Kaynak `firestore.rules` doğru kullanıcı izolasyonu içeriyor; ancak deploy edilen ruleset, Anonymous Auth sağlayıcısının açık oluşu, Firestore TTL/backup ve gerçek proje kimliği salt yerel dosyalardan doğrulanamaz. `firebase.json` içindeki `auth.providers.anonymous` satırı tek başına console durumunun kanıtı kabul edilmedi. Firebase Console/CLI ile salt-okunur doğrulama yapılmalıdır.

### S-06 — Data Safety console beyanı ve gerçek telemetri payload'ı

Repo, Play Console Data Safety formunun güncel cevaplarını içermiyor. Kodda Analytics event parametrelerinde arama metni/not/konum görülmedi; Sentry yakalamaları hata ve component stack gönderiyor. Buna rağmen SDK'ların gerçek cihazda gönderdiği cihaz kimliği, app instance ID, IP işleme, OS/model ve breadcrumb içeriği proxy/Sentry event inspector/Firebase DebugView ile doğrulanmadı. Bu nedenle console beyanıyla bire bir karşılaştırma manuel yapılmalıdır.

### S-07 — Gerçek bundle boyutu ve ilk açılış maliyeti

Kaynak envanterinde `apps/mobile/assets` yaklaşık 5,07 MiB/25 dosya, `apps/mobile/src/data` yaklaşık 2,90 MiB/162 dosya; `assetBundlePatterns: ['**/*']` etkin. Kullanılmayan asset tree-shaking, Hermes bytecode, native kütüphane boyutu ve sıkıştırılmış AAB yalnız build/analyzer ile ölçülebilir. Build yasağı nedeniyle “ilk açılış yavaş” şeklinde kesin bulgu yazılmadı; release AAB ve gerçek cihaz profiler testi gerekir.

### S-08 — Web güvenlik kayıtlarının endpoint bazında sömürülebilirliği

Next sürümünün advisory aralıklarında olduğu kesindir; ancak her kaydın bu uygulamadaki belirli config/route ile sömürülebilirliği ayrı penetrasyon testi gerektirir. Bu belirsizlik paket güncelleme gereğini ortadan kaldırmaz, sadece olası etkinin route bazında derecesini etkiler.

## 4. Store ve gizlilik uyumu

### Manifestteki gerçek izinler

Build yapılmadan elde edilebilen en güçlü sonuç, Expo Android introspection ile bağımlılık ve local module manifestlerinin birlikte okunmasıdır. Kaynak-temelli beklenen release izinleri:

| İzin | Kaynak / amaç | Store değerlendirmesi |
|---|---|---|
| `INTERNET` | Expo/Firebase/API | Normal izin; API, Firebase, Sentry, Analytics ve Aladhan için gerekli. |
| `ACCESS_NETWORK_STATE` | RNFirebase | Normal izin; bağlantı durumu/SDK çalışması. |
| `WAKE_LOCK` | RNFirebase | Normal izin; Data Safety verisi değildir fakat final manifestte görünür. |
| `VIBRATE` | Expo Notifications | Bildirim davranışı. |
| `POST_NOTIFICATIONS` | App config/Expo Notifications | Android 13+ runtime izin; onboarding akışı bağlam içinde soruyor. Reddetme testi gerekli. |
| `ACCESS_COARSE_LOCATION` | App config/Expo Location | Namaz vakti/kıble için yaklaşık konum. Data Safety'de amaç ve üçüncü taraf Aladhan aktarımıyla uyumlu beyan edilmeli. |
| `MODIFY_AUDIO_SETTINGS` | Expo Audio | Ses oynatma altyapısı; mikrofon izni değildir. |
| `FOREGROUND_SERVICE` | Expo Audio/arka plan bileşenleri | Normal izin; final merged manifestte servis türü ve gerçek kullanım doğrulanmalı. |
| `FOREGROUND_SERVICE_MEDIA_PLAYBACK` | Expo Audio | Ses oynatma; mikrofon beyanıyla çelişmez. |
| `RECEIVE_BOOT_COMPLETED` | Expo Notifications + prayer widget | Bildirim/widget alarmını boot sonrası toparlamak için. |
| `SCHEDULE_EXACT_ALARM` | `modules/prayer-widget` | Özel erişim; kullanıcı kontrollü ayar ekranı ve izinsiz statik fallback var. Play politika gerekçesi ve gerçek cihaz testi zorunlu. |

Kaynak config şu izinleri `tools:node="remove"` yoluyla engelliyor: `ACCESS_FINE_LOCATION`, `AD_ID`, `ACTIVITY_RECOGNITION`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `SYSTEM_ALERT_WINDOW`. Final AAB olmadan birleşmiş sonuç kesinleştirilemez; bu yüzden S-01 manuel kontrolü zorunludur.

### Data Safety beyanlarıyla olası çelişkiler

Play Console formunda en az şu gerçek davranışlar hesaba katılmalıdır:

- **Yaklaşık konum:** cihazdan alınır ve namaz vakti için Aladhan'a gönderilir. Android'de coarse izin var; iOS'ta F-10 nedeniyle daha hassas veri mümkün.
- **Kullanıcı içeriği:** kişisel notlar, favoriler ve ilerleme Firestore yedeğine girer.
- **Kullanıcı kimliği:** Firebase Anonymous Auth UID'si kişisel ad/e-posta olmasa da kalıcı/pseudonymous kullanıcı tanımlayıcısıdır.
- **Uygulama etkileşimleri:** Firebase Analytics ekran/özellik event'leri toplar; ayet/jüz/sayfa gibi içerik etkileşim parametreleri kodda mevcuttur.
- **Teşhis ve performans:** Sentry crash ve production'da `%20` performance trace örneklemesi (`apps/mobile/app/_layout.tsx:57-75`) kullanır.
- **Cihaz veya diğer kimlikler:** Firebase app instance/analytics tanımlayıcıları ve Advertising ID için F-09 çözülmeden “toplanmıyor” cevabı güvenli değildir.
- **Arama sorgusu:** API'ye iletilir; kod Analytics'e sorgu metni göndermiyor. Sunucu erişim logu/hosting log retention politikası ayrıca beyanla eşleştirilmelidir.

“Veri paylaşımı” sorusu Play'in hizmet sağlayıcı istisnaları ve sözleşmelere göre doldurulmalıdır; teknik olarak Aladhan, Firebase, Sentry, Turso ve hosting sağlayıcısına veri/telemetri akışı vardır. Repo, console cevaplarını göstermediği için kesin console çelişkisi yalnız F-09/F-10 ve hesap silme metni düzeyinde raporlandı.

### Exact alarm, bildirim ve konum

- Exact alarm isteği otomatik ayar ekranı açmıyor; `widget-ekle.tsx` üzerinden kullanıcı eylemiyle `ACTION_REQUEST_SCHEDULE_EXACT_ALARM` açılıyor. İzin yokken native kod canlı Chronometer yerine sıradaki vakit ve saati gösteriyor. Bu iyi bir fallback'tir.
- Widget yalnız sıradaki vakit için tek exact alarm kuruyor; boot, package replace, time set ve timezone changed receiver'ları mevcut. Ağ işi receiver içinde yapılmıyor.
- Android 13+ bildirim izni onboarding bağlamında isteniyor; kullanıcı “şimdi değil” derse tekrar otomatik istenmiyor. Buna karşılık konum reddi F-05'teki yanlış şehir davranışına dönüşüyor.
- `SCHEDULE_EXACT_ALARM`, uygulamanın çekirdek kullanıcı işlevi olarak namaz vaktinde widget geçişi gerekçesiyle açıklanmalı. Play incelemesi ve yeni kurulumda default-denied davranış gerçek cihazda kanıtlanmalıdır.

### Firebase, Analytics ve Sentry

- Kaynak Firestore kuralları “authenticated user yalnız kendi UID belgesi” şeklinde doğru least-privilege veri erişimi sağlıyor.
- Firebase env/plist dosyaları git tarafından ignore ediliyor; taramada repoya commit edilmiş Turso/Sentry tokenı veya Google service secret'ı bulunmadı.
- Analytics event'lerinde arama metni veya kişisel not içeriği gönderildiğine dair kanıt yok. Ayet numarası, jüz, sayfa ve özellik etkileşimleri gönderiliyor; bunlar app activity olarak beyan edilmelidir.
- Sentry `enabled` yalnız DSN varsa aktif ve `debug` yalnız dev'de; ErrorBoundary component stack gönderiyor. Kullanıcı notu/arama metnini explicit context'e ekleyen kod bulunmadı. Gerçek SDK default payload'ı S-06 kapsamında doğrulanmalıdır.
- Advertising ID kapatma ayarı F-09 nedeniyle eksiktir.

### Kullanıcı verisi silme ve bulut yedekleme

- Firestore dokümanı hesap silinmeden önce siliniyor; böylece auth gerektiren kural sırası doğru.
- Silme sırasında bekleyen debounce iptal ediliyor ve UID null yapılarak yeniden yazma yarışı büyük ölçüde önlenmiş.
- Ancak Auth hesabı silme sonucu yutuluyor ve kullanıcıya yanlış tam başarı verilebiliyor (F-08).
- Yedek durumu gerçek başarılı yazmayı göstermiyor; anonim UID genel cihazlar arası geri yükleme garantisi sağlamıyor; tek belge 1 MiB sınırına tabi (F-06/F-07).
- Uygulama içi yerel veri için ayrı “tüm yerel veriyi sil” düğmesi yok; politika cihaz ayarlarından veri temizleme veya kaldırma yolunu açıkça söylüyor. Store hesabı olmayan uygulama için bu tek başına kesin ihlal olarak değerlendirilmedi.

## 5. Gerçek cihazda test edilmesi gerekenler

### P0 — Yayın kararından önce

1. **Namaz doğruluğu / şehir ve saat dilimi**
   1. İstanbul, Ankara, Kars ve `Europe/Istanbul` dışındaki bir konumda temiz kurulum yapın.
   2. Aynı tarih için günlük kart, Bildirimler ekranı, planlanmış notification ve widget saatlerini resmi referansla karşılaştırın.
   3. Cihaz saat dilimini otomatikten manuel farklı bir dilime alın; uygulamayı öldürüp açın ve ertesi gün sınırını test edin.
   4. Konum iznini reddedin; uygulamanın hangi şehri kullandığını ve planladığı bildirimleri kaydedin. Mevcut kodda İstanbul beklenir.

2. **Namaz widget'ı / exact alarm**
   1. Android 12, 13, 14, 15 ve mümkünse 16'da widget'ı ekleyin.
   2. Exact alarm izni vermeden statik fallback'i; verdikten sonra canlı geri sayımı doğrulayın.
   3. Bir vakit geçişini ekran kapalı, Doze ve uygulama zorla kapalı durumdayken izleyin.
   4. İzni sonradan geri alın; widget'ın negatif/stale sayaç göstermediğini kontrol edin.
   5. Widget varken telefonu yeniden başlatın; uygulamayı hiç açmadan görünümü ve sonraki geçişi kontrol edin.
   6. Sistem saatini ve saat dilimini değiştirin; eski programın güvenli mesaja düşmesini ve uygulama açılınca yenilenmesini doğrulayın.

3. **Bildirimler**
   1. Temiz kurulumda bildirim ver/konum reddet; bildirim ver/konum ver; ikisini de reddet kombinasyonlarını deneyin.
   2. Uygulama günlerce açılmadan günlük ayet ve namaz bildirimlerinin devamını kontrol edin.
   3. Bildirime uygulama kapalıyken dokunun; ayet deep link'inin tek kez ve doğru route'a açıldığını doğrulayın.
   4. Sistem ayarından bildirim iznini kapatıp uygulamadaki toggle durumunu yeniden kontrol edin.

4. **Bulut yedek ve silme**
   1. Favori/not/hatim verisi oluşturun; 20 saniyelik debounce dolmadan uygulamayı öldürün, yeniden açın ve yedek zamanını kontrol edin.
   2. Çevrimdışı değişiklik yapın, uygulamayı arka plana atın, sonra bağlantıyı açın; Firestore belgesinin güncellendiğini doğrulayın.
   3. Sistem yedeği kapalı ikinci cihaz/temiz kurulumda geri yüklemeyi deneyin; eski UID'ye erişilemediğini doğrulayın.
   4. Çok sayıda uzun notla snapshot'ı 1 MiB sınırına yaklaştırın; uygulamanın başarısızlığı kullanıcıya göstermesini bekleyin.
   5. Çevrimiçi ve çevrimdışı hesap/yedek silme yapın; Firebase Auth kullanıcı kaydı ile Firestore belgesinin ikisinin de gerçekten silindiğini Console'dan doğrulayın.
   6. Silme sonrası yedeklemeyi yeniden açın; yeni anonim UID ve yeni belge oluşumunu doğrulayın.

5. **Web/API güvenlik regresyonu**
   1. Next/React ağacı düzeltildikten sonra tüm App Router sayfaları, API route'ları, OG share image ve middleware'i production-benzeri ortamda test edin.
   2. `/api/version` anonim erişimi ve sorgu sayısını ölçün.
   3. Upstash env açık/kapalı iki senaryoda 200 istek sınırını birden fazla serverless instance üzerinden doğrulayın.
   4. Canlı origin ile OPTIONS preflight sonucundaki `Access-Control-Allow-Origin` değerini doğrulayın.

### P1 — Kapalı test süresince

6. **Güncelleme ve eski build uyumluluğu**
   1. Widget/native modül içermeyen son production build'i kurun, kullanıcı verisi oluşturun, sonra yeni build üzerine güncelleyin.
   2. MMKV migration sonrası favori/not/ilerleme bütünlüğünü; turu yeniden başlatma ve storage reset davranışını kontrol edin.
   3. Eski build'de JS OTA benzeri native modül yokluğu durumunda widget, Sentry, MMKV ve background refresh'in no-op fallback ile çökmediğini doğrulayın.

7. **Bozuk storage**
   1. `recentSearches` ve Zikirmatik kayıtlarına geçerli JSON fakat yanlış tip (`{}`, `"x"`) enjekte edin.
   2. Arama/Zikirmatik ekranlarının crash olmadan varsayılana dönmesini bekleyin; mevcut kodda crash riski vardır.
   3. AsyncStorage'dan migrate edilmiş `app_tour_completed` anahtarını resetleyip restart sonrası tekrar dirilip dirilmediğini ölçün.

8. **Offline / timeout / fallback**
   1. Temiz kurulumda tamamen offline açın; hangi ekranların embedded veri, hangilerinin hata/fallback gösterdiğini kaydedin.
   2. Warm cache oluşturup 8 günlük stale cache ve bozuk cache ile tekrar deneyin.
   3. Yavaş/packet-loss ağda 8–15 saniyelik Aladhan ve API timeout'larını, retry toplam süresini ve kullanıcıya verilen mesajı doğrulayın.

9. **App Links ve navigasyon**
   1. Final Play imzalı build ile Chrome, Gmail/mesajlaşma ve QR üzerinden `/surah/{id}/ayah/{n}` linkini açın.
   2. `adb shell pm get-app-links com.kuranapp.mobile` ile verified durumunu kontrol edin.
   3. Geçersiz sure/ayet, eksik parametre ve app yüklü değil fallback davranışını test edin.

10. **Gizlilik telemetrisi**
    1. Firebase DebugView ve Sentry event inspector ile bir oturum kaydedin.
    2. Arama metni, kişisel not, tam koordinat, Firebase UID ve Advertising ID alanlarını özellikle arayın.
    3. Android 12 ve 13+ cihazlarda Advertising ID davranışını ayrı doğrulayın.
    4. Sonuçları Play Data Safety formundaki her veri türü/amaç/saklama/silme cevabıyla eşleştirin.

### P2 — Yayın kalitesi

11. Düşük seviye Android cihazda cold start, ilk ekran render, büyük sure/tefsir ve Mushaf sayfa geçişlerini profiler ile ölçün.
12. TalkBack, dinamik font, küçük ekran, dark mode, bildirim metni taşması ve widget'ın farklı launcher/grid boyutlarını kontrol edin.
13. iOS yayınlanacaksa F-03 düzeltildikten sonra Firebase Auth, precise/reduced location, notification deep link ve privacy manifest/Store privacy cevaplarını gerçek cihazda doğrulayın.

## 6. Test ve doğrulama sonuçları

### Çalıştırılan kontroller

| Komut / kontrol | Sonuç | Gerçek çıktı özeti |
|---|---|---|
| `git status --short --branch` | Başarılı | Branch `feature/prayer-widget-chronometer`, başlangıçta temiz ve origin ile aynı. |
| `git diff --check` | Başarılı | Whitespace hatası yok. |
| `npm run typecheck -w @quran-app/mobile` | Başarılı | Mobil TypeScript hatası yok. |
| `npm run typecheck -w @quran-app/web` | Başarılı | Web TypeScript hatası yok. |
| `npm run typecheck -ws --if-present` | Başarılı | Mobil, web, core, types ve ui typecheck geçti. npm yalnız `-ws` kısaltması için uyarı verdi. |
| `npx eslint apps/mobile apps/web packages --ext .ts,.tsx` | Başarılı (uyarılarla) | 0 hata, 16 uyarı: 14 non-null assertion, 2 kullanılmayan değişken. |
| `npm test` | Ortam nedeniyle başarısız | Node test runner child process oluştururken `spawn EPERM`; kod assertion hatası değil. |
| `node --test --test-isolation=none "apps/web/src/lib/**/*.test.ts"` | Başarılı | 18/18 test geçti. |
| `npm run test:mobile` | Ortam nedeniyle başarısız | Aynı sandbox `spawn EPERM`. |
| `node --test --test-isolation=none "apps/mobile/src/**/*.test.ts"` | Başarılı | 90/90 test geçti. |
| `npm run test:data` | Ortam nedeniyle başarısız | İlk çalıştırma `spawn EPERM`; isolation kapalı doğrudan çalıştırmada ESM içinde `__dirname is not defined`. |
| `npm test -w @quran-app/web -- --runInBand` | Başarılı | Web Jest veri takımı 4/4 geçti; bu takım `__dirname` yolunu Jest ortamında doğru çalıştırıyor. |
| Core testini doğrudan `node --test --test-isolation=none` ile çalıştırma | Başarısız | Extension'sız `verseAnalysisContext` import'u Node ESM tarafından çözülemedi. Root package'da bu core test için çalışan npm script'i yok. |
| `npx expo install --check` (`apps/mobile`) | Başarılı | “Dependencies are up to date.” |
| `npx expo-doctor` (`apps/mobile`) | Başarılı | 21/21 kontrol geçti. |
| `npx expo config --type prebuild --json` (`apps/mobile`) | Başarılı | Config çözüldü; Android izinleri ve plugin listesi incelendi. Bu komut prebuild/build yazımı yapmadı. |
| `npx expo config --type introspect --json` (`apps/mobile`) | Başarısız | RNFirebase Auth: `ios.googleServicesFile` eksik; F-03. |
| Android-only programatik Expo manifest introspection | Başarılı | App config izinleri ve blocked permission `tools:node=remove` girdileri doğrulandı; dependency merge dahil değil. |
| Manifest kaynak taraması (`app.config.js`, local module ve dependency `AndroidManifest.xml`) | Başarılı | Bölüm 4'teki kaynak-temelli izin envanteri çıkarıldı. |
| `npm ls react react-dom next --workspace @quran-app/web --all` | Başarısız / bulgu | `ELSPROBLEMS`; Next 14 peer'ında React/ReactDOM 19 invalid, web tarafında ayrıca React 18 var. |
| Node `require.resolve` ile Next/web React yolu kontrolü | Başarılı / bulgu | Next → root React 19.2.3; web → nested React 18.3.1. |
| `npm audit --omit=dev --json` | Başarısız / bulgu | 14 production vulnerability paketi: 1 yüksek, 13 orta, 0 kritik. Yüksek doğrudan paket `next`. |
| Secret/tracked env taraması (`git ls-files`, `git check-ignore`, `rg`) | Başarılı | `.env`, `google-services.json` ignore; repoda canlı Turso/Sentry tokenı bulunmadı. |
| Statik asset/veri envanteri | Başarılı | Mobil assets 5,07 MiB/25 dosya; mobil source data 2,90 MiB/162 dosya; web source data 1,20 MiB; web public 2,88 MiB. |
| TODO/debug/placeholder/console ve route taraması | Başarılı | Production debug validator 404 ile kapalı; `/api/version` açık teşhis route'u F-13 olarak raporlandı. Kullanıcıyı etkileyen doğrulanmış placeholder bulunmadı. |

### İlk yanlış çalışma dizini notu

`expo install --check` ve Expo Doctor ilk kez monorepo kökünden çağrıldığında kökteki TypeScript 5.8.3 ile mobilin beklediği TypeScript 6 uyumsuzluğu raporladı. Bu sonuç mobil workspace'e ait değildi. Aynı komutlar doğru çalışma dizini `apps/mobile` içinde yeniden çalıştırıldı ve ikisi de başarılı oldu; kesin bulgu olarak kullanılmadı.

### Çalıştırılmayan kontroller ve nedeni

- `next build`, `expo export`, Android/iOS Gradle/Xcode build: kullanıcının build yasağı.
- EAS build, submit, deploy ve OTA update: açıkça yasak; hiçbir EAS işlemi başlatılmadı.
- `expo prebuild` yazma modu: dosya üreteceği/değiştireceği için çalıştırılmadı; yalnız config çözümleme/introspection yapıldı.
- Gradle merged release manifest / `processReleaseMainManifest`: build graph'ını çalıştıracağı için yapılmadı.
- Final AAB `apkanalyzer`, bundle size, signing cert ve App Links doğrulaması: artifact yok; manuel doğrulama gerekli.
- Firebase rules deploy durumu, Anonymous Auth console ayarı, Vercel env ve Play Data Safety formu: harici production console erişimi yok; manuel doğrulama gerekli.
- Gerçek cihaz boot, Doze, exact alarm, bildirim, widget, saat dilimi, offline ve update testleri: fiziksel cihaz/kurulabilir build gerektirir; Bölüm 5'e aktarıldı.
- iOS config'in düzeltme sonrası sonucu: mevcut config F-03'te daha introspection aşamasında duruyor.

## 7. Nihai karar

# Yayını engelleyen sorunlar var

Karar yalnız test sayısına değil, kullanıcıya ve production yüzeyine doğrudan etkisi kanıtlanmış bulgulara dayanır. Next güvenlik sürümü ve çift React runtime ağacı düzeltilmeden web production onayı verilmemelidir. iOS config mevcut haliyle yayınlanamaz. Android kapalı test için dahi namaz saat dilimi/İstanbul fallback davranışı ile bulut yedek ve gizlilik tutarsızlıkları giderilmeli; ardından Bölüm 5 P0 testleri final imzalı test artifact'i üzerinde tamamlanmalıdır.
