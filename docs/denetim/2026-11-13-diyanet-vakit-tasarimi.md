# Diyanet Awqat Salah API ile Küresel Namaz Vakti Tasarımı

**Tarih:** 2026-11-13  
**Kapsam:** `apps/web` (Next.js + Turso/libSQL), `apps/mobile` (Expo/React Native), `data/diyanet/places.json`  
**Durum:** Mimari tasarım (kod değişikliği içermez)

---

## 1. Mevcut Durum (Kod Kanıtlı)

- **Ana Sayfa Vakit Akışı (`apps/mobile/src/hooks/useDailyContent.ts:313–384`):**
  - Ön plan konum izni yalnız önceden verilmişse okunur (`satır 315–316`); yoksa varsayılan `ISTANBUL` (`41.0082, 28.9784`, `satır 63`) kullanılır.
  - Önce 10 dakikaya kadar taze `getLastKnownPositionAsync`, yoksa 15 sn zaman aşımlı `getCurrentPositionAsync(Balanced)` çağrılır (`satır 318–325`).
  - `Location.reverseGeocodeAsync` arka planda çalışır; vakit isteğini bloke etmez ve yalnız görünen `prayerCity` etiketini günceller (`satır 328–335`, ana sayfa gösterimi: `apps/mobile/app/(tabs)/index.tsx:352`).
  - Telefondan doğrudan `https://api.aladhan.com/v1/timings/{DD-MM-YYYY}` ucuna 8 sn zaman aşımlı istek atılır (`useDailyContent.ts:346–354`).
- **Yöntem ve Saat Dilimi Seçimi (`apps/mobile/src/lib/prayerMethod.ts:20–41, 103–125`, `timeZone.ts:7–22`):**
  - `deviceTimeZone()` (`timeZone.ts:7–19`) cihazın IANA saat dilimini (`expo-localization` veya `Intl`) döndürür.
  - `aladhanMethodQuery(tz)` (`prayerMethod.ts:20–26`): `Europe/Istanbul` için `method=13&school=0&midnightMode=0`; yurt dışı için `method=99` (İmsak 18°, Yatsı ülkeye göre 16°/17°, Diyanet temkinleri `tune=0,0,-7,5,4,7,7,0,0`).
  - `adjustHighLatitude` (`prayerMethod.ts:103–125`): `|enlem| >= 44°` ve gece yarısı güneş derinliği `D < 30°` iken İmsak/Yatsı açılarını katsayı tablosuyla (`K_TABLE`, `satır 48–73`) küçültür. Yurt dışında Diyanet resmî takvimine göre 6–10 dk sapma kalmaktadır (`prayerMethod.ts:10`, `prayerMethod.test.ts:16–39`).
- **Önbellek (`apps/mobile/src/lib/storage.ts:16`, `useDailyContent.ts:70–74, 196–214, 365–369`):**
  - `STORAGE_KEYS.prayerCache` (`"prayerTimesCache"`) içinde yalnız **tek gün** (`{ date: "YYYY-M-D", timings, hijri }`) MMKV/AsyncStorage'da saklanır. Ertesi gün ağ yoksa vakit boş düşer.
- **Bildirim Planlaması (`apps/mobile/src/lib/namazNotifications.ts:38–40, 137, 150–223, 484–508`):**
  - `fetchPrayerDays` (`satır 189–223`), Aladhan `/v1/calendar/{year}/{month}` ucundan (`satır 150–181`) bugünden itibaren `SCHEDULE_DAYS = 7` günün (`satır 137`) vakitlerini çeker.
  - Her gün × 6 vakit için vakit girdikten `NOTIFY_AFTER_MIN = 2` dk sonrasına (`satır 258, 306–315`) tekil `DATE` tetikleyicili bildirim ve namaz boşluklarına (`computeGapSlots`, `satır 386–403`) 2 günlük ayet/dua bildirimi kurulur (toplam ≤ 56 bildirim < iOS 64 sınırı, `satır 412`).
  - Plan özeti `PLAN_CACHE_KEY` (`"namazNotifPlanCacheV1"`, `notificationRecovery.ts:4, 18–92`) ve `schedStamp()` (`gün|dil|saatDilimi|exactAlarm`, `namazNotifications.ts:38–40`) ile saklanır; her açılışta (`apps/mobile/app/_layout.tsx:337–345`) ve ~12 saatlik arka plan görevinde (`apps/mobile/src/lib/backgroundRefresh.ts:38–58`) tazelenir.

---

## 2. Konum → Diyanet Şehri Eşlemesi

### 2.1 Mevcut Yer Verisi (`data/diyanet/places.json` ve `scripts/diyanet-crawl-places.mjs`)
- `scripts/diyanet-crawl-places.mjs` (`satır 236–299`) ile çekilen `data/diyanet/places.json` içinde toplam **208 ülke**, **364 eyalet/bölge** ve **8.606 şehir/ilçe** kaydı vardır (`cityId, cityName, cityCode, stateId, stateName, countryId, countryName, countryCode`).
- **Türkiye (`countryId: 2`):** **81 il** (`stateId`) ve **869 ilçe/merkez** (`cityId`) bulunur.
  - Kritik bulgu: Büyükşehirlerin merkez ilçeleri Diyanet'te ayrı `cityId` taşımaz, il merkezine (`İSTANBUL` `cityId: 9541`) bağlıdır. Örneğin İstanbul'da (`stateId: 539`) yalnız **19 kayıt** vardır (`9541: İSTANBUL` + Arnavutköy, Avcılar, Başakşehir, Beylikdüzü, Büyükçekmece, Çatalca, Çekmeköy, Esenyurt, Kartal, Küçükçekmece, Maltepe, Pendik, Sancaktepe, Silivri, Sultanbeyli, Sultangazi, Şile, Tuzla). Kadıköy, Üsküdar, Fatih, Beşiktaş gibi merkez ilçeler `places.json` içinde ayrı ad olarak geçmez.
- **Aynı Adlı Şehirler:** Küresel listede **143 şehir adı** birden fazla kez geçer (ör. `LONDON` İngiltere `14096`, Kanada `9103`, ABD Ohio `8928`; Türkiye içinde **5 ilçe adı** iki farklı ilde tekrar eder: `BAYAT`, `ORTAKÖY`, `KEMALPAŞA`, `GÖNEN`, `YEŞİLYURT`).
- **Koordinat Eksikliği:** `/api/Place/CityDetail/{cityId}` koordinat döndürmez; `/api/Location/CityFromLocation` ve `/api/Place/CitiesByName` uçları `Developer` rolünde `403 Forbidden` verir.

### 2.2 Seçenekler ve Öneri

| Seçenek | Artıları | Eksileri |
| :--- | :--- | :--- |
| **A) Yalnız ters geocode metin eşlemesi** | Ek veri tablosu istemez. | Kadıköy → İstanbul gibi merkez ilçe birleştirmelerinde ve dil farklarında (`München` vs `MUNIH`) kırılır. |
| **B) Çevrimdışı GeoNames (`cities15000` / `allCountries` + TR il/ilçe koordinatları) ile `places.json` zenginleştirme + Haversine** | Koordinattan deterministik en yakın `cityId` bulur; ters geocode/dil bağımsızdır. | Derleme zamanında tek seferlik eşleştirme betiği (`scripts/build-diyanet-coords.mjs`) gerektirir. |
| **C) Yalnız kullanıcı elle seçimi** | Sıfır konum hatası. | İlk açılışta sürtünme yaratır; mevcut sessiz konum akışını (`useDailyContent.ts:307`) bozar. |

- **ÖNERİ (B + C Hibrit):**
  1. **Derleme Zamanı Koordinat Eşleme (`data/diyanet/places-with-coords.json`):** Açık lisanslı (CC-BY 4.0) GeoNames + Türkiye mülki idare koordinatlarıyla 8.606 Diyanet şehrine `lat, lon, ianaTz` eklenir. Türkçe dış adlar (`LONDRA`/`LONDON`, `MUNIH`/`MUNICH`) için `cityName` + `cityCode` birlikte normalize edilir ve ülke (`countryCode`) filtresi uygulanır.
  2. **Çalışma Zamanı Eşleme (Sunucu + Mobil):** Kullanıcının `(lat, lon)` koordinatına Haversine ile en yakın Diyanet şehri bulunur. Türkiye içinde Kadıköy (`40.99, 29.02`) koordinatı doğrudan en yakın Diyanet noktası olan `9541: İSTANBUL` (veya Anadolu yakası sınırında Kartal/Üsküdar mesafesine göre merkez) ile eşleşir; merkez ilçelerin `9541`'e düşmesi için il sınır kutusu + merkez koordinatı önceliği tanımlanır.
  3. **Belirsiz/Eşleşmeyen Adlar ve Aynı Adlı Şehirler:** Koordinat bazlı aramada `(lat, lon)` zaten ülkeyi ve ili belirlediği için `BAYAT` (Çorum vs Afyon) veya `LONDON` (UK vs Kanada) karışmaz. Elle aramada ise sonuçlar `cityName, stateName, countryName` (ör. `Bayat · Çorum` / `Bayat · Afyonkarahisar`) olarak listelenir.
  4. **En Yakın Şehir Uzaksa (`> 50 km`):** En yakın Diyanet şehri `> 50 km` (veya boylam farkı `> 0.5°`, yani `> 2 dk` yerel güneş zamanı farkı) ise sunucu yanıtında `distanceKm` döner; istemci **yerel Aladhan + `prayerMethod.ts` hesabına** düşer (çünkü 100 km doğu/batı farkı vakti 4–6 dk kaydırır ve Diyanet şehir tablosu o noktayı temsil etmez).
  5. **Kullanıcıya Gösterim ve Elle Değiştirme:** Ana sayfadaki namaz kartında (`index.tsx:352`) Diyanet'ten gelen resmi şehir/ilçe adı (ör. `İstanbul` veya `Berlin`) gösterilmeli; şehir adına dokununca açılan basit bir ülke/il/ilçe seçici (`Otomatik (Konum)` + arama) ile kullanıcı şehri elle sabitleyebilmelidir (`STORAGE_KEYS.prayerManualCity`).

---

## 3. Sunucu Mimarisi (`apps/web`, Next.js Route + Turso)

Cihazlar Diyanet API'sine doğrudan bağlanamaz (taahhüt ve gizli kimlik bilgisi). Tüm istekler `apps/web` üzerinden Turso önbelleğiyle sunulur.

### 3.1 Veritabanı Şema Taslağı (Turso / `data/app.db`)
Mevcut `apps/web/src/lib/dbUtils.ts` (`satır 125, 146, 181`) yalnız okuma (`dbAll`, `dbGet`) sunmaktadır; yerel `app.db` `{ readOnly: true }` açılmaktadır (`satır 125`). Vakit önbelleği için `dbUtils.ts` içine parametreli `dbRun(sql, ...args)` (Turso'da `client.execute`, yerelde yazılabilir bağlantı) eklenecektir:

```sql
-- 1. Diyanet şehir dizini ve koordinatları (8.606 satır, statik seed)
CREATE TABLE IF NOT EXISTS diyanet_cities (
  city_id      INTEGER PRIMARY KEY,
  city_name    TEXT NOT NULL,
  city_code    TEXT NOT NULL,
  state_id     INTEGER NOT NULL,
  state_name   TEXT NOT NULL,
  country_id   INTEGER NOT NULL,
  country_name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  lat          REAL,
  lon          REAL,
  iana_tz      TEXT
);
CREATE INDEX IF NOT EXISTS idx_diyanet_cities_coords ON diyanet_cities(lat, lon);

-- 2. Günlük vakit önbelleği (aylık/yıllık çekimlerle doldurulur)
CREATE TABLE IF NOT EXISTS diyanet_prayer_times (
  city_id       INTEGER NOT NULL,
  date_ymd      TEXT NOT NULL, -- 'YYYY-MM-DD' (Miladi, şehrin yerel günü)
  fajr          TEXT NOT NULL, -- 'HH:MM'
  sunrise       TEXT NOT NULL,
  dhuhr         TEXT NOT NULL,
  asr           TEXT NOT NULL,
  maghrib       TEXT NOT NULL,
  isha          TEXT NOT NULL,
  qibla_time    TEXT,
  hijri_short   TEXT,          -- ör. '4.6.1448'
  gmt_offset    INTEGER,       -- greenwichMeanTimeZone
  fetched_at    INTEGER NOT NULL, -- unix epoch sn
  PRIMARY KEY (city_id, date_ymd)
);

-- 3. Sunucusuz (serverless) ortam için paylaşımlı Diyanet oturum ve kota tablosu
CREATE TABLE IF NOT EXISTS diyanet_auth_state (
  id                 INTEGER PRIMARY KEY CHECK (id = 1),
  access_token       TEXT,
  access_expires_at  INTEGER, -- epoch sn (JWT ömrü 45 dk → 40. dk'da yenilenir)
  refresh_token      TEXT,
  refresh_expires_at INTEGER, -- epoch sn (7 gün)
  updated_at         INTEGER
);
```

### 3.2 API Uçları
- **`GET /api/vakit` (`apps/web/src/app/api/vakit/route.ts`):**
  - Parametreler: `?cityId=11002&month=2026-11` **veya** `?lat=52.52&lon=13.40&month=2026-11`. (`month` verilmezse içinde bulunulan ay + ayın son 7 günündeyse gelecek ay birlikte döner).
  - Yanıt: `{ source: "diyanet", city: { cityId, cityName, stateName, countryName, distanceKm }, days: Record<"YYYY-MM-DD", { Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha, hijri: { day, monthNumber, year } }> }`.
  - CDN Başlığı: `Cache-Control: public, s-maxage=86400, stale-while-revalidate=604800` (`cityId + month` bazında deterministik olduğu için Vercel Edge CDN aynı şehir için gelen binlerce isteği Turso'ya bile gitmeden karşılar).
- **`GET /api/vakit/sehirler?q=...`:** Elle şehir seçimi için `diyanet_cities` üzerinde hafif arama ucu.

### 3.3 Diyanet Token Yönetimi (Sunucusuz Ortam)
- Vercel fonksiyon örnekleri (instances) belleği paylaşmaz ve her an kapanabilir. Token yalnız bellekte tutulursa her soğuk başlangıçta `/Auth/Login` çağrılır.
- **Çözüm (2 Katmanlı Token):**
  1. Fonksiyon belleğinde (`globalThis.__diyanetToken`) 40 dk geçerli sıcak kopya tutulur.
  2. Bellekte yoksa veya süresi dolmuşsa Turso'daki `diyanet_auth_state` (`id = 1`) satırı okunur.
  3. `access_expires_at` geçmiş ama `refresh_expires_at` geçerliyse `GET /Auth/RefreshToken/{token}` çağrılır; o da `401` dönerse `POST /Auth/Login` (`DIYANET_API_USER` / `DIYANET_API_PASS` yalnız sunucu ortam değişkeninden) ile yeni token alınıp `diyanet_auth_state` güncellenir.

### 3.4 Aylık Önbellek, Yenileme Kuralı ve Kota Koruması
- **Neden `/api/PrayerTime/Monthly/{cityId}`:** Kota **uç nokta × şehir başına günde 100 istek**tir. Tek bir `Monthly/{cityId}` çağrısı ~30 günü tek istekte doldurur ve Turso'ya `INSERT OR REPLACE` ile toplu yazılır. Bir şehir ayda **yalnız 1 kez** Diyanet'ten çekilir.
  - *Not:* `/api/PrayerTime/Monthly/{cityId}` ucunun tam olarak hangi gün aralığını (takvim ayı mı, bugünden +30 gün mü) döndürdüğü ve `POST /api/PrayerTime/DateRange` gövde şeması yerel ortamda **doğrulanamadı**; ilk entegrasyon adımında tek bir test çağrısıyla doğrulanıp ay sınırları netleştirilecektir.
- **Eşzamanlı İsteklerde Tek Çekim (Singleflight + DB Kilidi):**
  - Aynı Node.js örneğinde `inflightCityMonth = new Map<string, Promise<...>>()` (`apps/mobile/src/lib/api.ts:340` deseninin aynısı) kullanılır.
  - Farklı sunucusuz örnekler arasında kota aşımını önlemek için çekim öncesi Turso'dan mevcut günler kontrol edilir; ayrıca Vercel CDN'de `?cityId=...&month=...` sorgusu önbelleklendiğinden aynı şehir/ay için eşzamanlı istekler Edge katmanında birleşir.
- **Hata Durumu:** Diyanet API `429`/`5xx` dönerse veya ağ hatası olursa:
  1. Turso'da o gün için önceden yazılmış kayıt varsa doğrudan sunulur.
  2. Kayıt yoksa sunucu `HTTP 503 { error: "upstream_unavailable", fallback: "aladhan" }` döner ve `Cache-Control: no-store` koyar (bozuk yanıt CDN'de önbelleklenmez).
- **Vercel Cron Gerekli mi?** **Hayır, zorunlu değildir.** Talep üzerine (lazy) aylık çekim + Turso kalıcı önbelleği + `s-maxage=86400` Edge önbelleği ile bir şehir ilk istendiğinde 30 günlük verisi yazılır. İsteğe bağlı olarak en popüler ~100 şehir (81 il + 19 Avrupa merkezi) ayda bir kez basit bir CLI/GitHub Actions veya cron ile ısıtılabilir ama mimari buna bağımlı değildir.

---

## 4. Mobil Mimari (`apps/mobile`)

- **Veri Biçimi ve Telefonda 1 Ay Saklama (`apps/mobile/src/lib/storage.ts`):**
  - Mevcut tek günlük `STORAGE_KEYS.prayerCache` (`storage.ts:16`) korunurken yanına aylık önbellek anahtarı `STORAGE_KEYS.prayerMonthCache = "prayerMonthCacheV1"` eklenir:
    ```ts
    export type PrayerMonthCache = {
      cityId: number;
      cityName: string;
      coords: { lat: number; lon: number };
      fetchedAt: number;
      days: Record<string, { timings: PrayerTimes; hijri: HijriDate | null }>; // anahtar: "YYYY-MM-DD"
    };
    ```
  - 30–60 günlük veri JSON olarak ~4 KB tutar; MMKV (`storage.ts:35–42`) üzerinden senkron/anında okunur.
- **Çevrimdışı Çalışma ve Aladhan'a Düşüş (Fallback Zinciri):**
  1. **Adım 1 (Yerel Aylık Önbellek):** Kullanıcının konumu son önbellekteki konumdan `< 15 km` uzaktaysa (veya elle seçili şehir değişmemişse) ve bugünün `YYYY-MM-DD` kaydı `prayerMonthCache` içinde varsa **ağa gitmeden anında** Diyanet vakti gösterilir.
  2. **Adım 2 (Kuran Yolu Sunucusu `/api/vakit`):** Önbellekte bugünün/gelecek 7 günün verisi yoksa `api.vakit.get(...)` çağrılır ve dönen ~30 gün `prayerMonthCache`'e kaydedilir.
  3. **Adım 3 (Aladhan + `prayerMethod.ts` Yedeği):** Sunucu `503` dönerse, en yakın Diyanet şehri `> 50 km` uzaksa veya sunucuya ulaşılamayıp yalnız Aladhan erişilebilirse mevcut `api.aladhan.com` + `aladhanMethodQuery` + `adjustHighLatitude` (`useDailyContent.ts:350–360`, `namazNotifications.ts:159–175`) yolu devreye girer. Tam çevrimdışında ise lokal astronomik/eski önbellek korunur.
- **Hicri Tarih Ayrıştırma:** Diyanet'in `hijriDateShort: "4.6.1448"` alanı `parseDiyanetHijri("4.6.1448")` saf fonksiyonuyla mevcut `HijriDate` (`{ day: 4, monthNumber: 6, year: 1448 }`, `useDailyContent.ts:25–35`) tipine dönüştürülür; mevcut `formatHijriDate` hiç değişmeden çalışır.
- **Bildirim Yeniden Planlama (`namazNotifications.ts:189–223`):**
  - `fetchPrayerDays(lat, lng)` önce `prayerMonthCache` ve `/api/vakit` üzerinden 7 günlük `DayTimes[]` dizisini üretir; başarısız olursa mevcut `fetchMonthCalendar` (Aladhan) yoluna düşer.
  - `schedStamp()` (`namazNotifications.ts:38–40`) sonuna aktif `cityId` (veya `"auto"`) eklenir: `${localDayStr()}|${getLang()}|${deviceTimeZone()}|${exact}|${cityId}`. Böylece şehir değiştiğinde `ensureNotificationsFresh()` bildirimleri otomatik yeniden kurar.
- **Saat Dilimi ve Yaz Saati (DST):**
  - Diyanet yanıtındaki saatler (`"fajr": "05:25"`) şehrin o günkü **yerel duvar saati**dir. `dateTriggerAfter` (`namazNotifications.ts:306–315`) `new Date(day); at.setHours(hour, minute + 2)` kullandığından, cihaz o şehirdeyse OS yaz/kış saati geçişini o günün yerel `Date` nesnesi üzerinde doğru çözer.
  - *Dikkat:* Kullanıcı **farklı saat dilimindeki** bir şehri elle seçerse (ör. Türkiye'deyken Berlin vaktine bakarsa), geri sayım (`useDailyContent.ts:406–428`) cihaz saati yerine seçilen şehrin saat dilimine (`iana_tz` veya `greenwichMeanTimeZone`) göre hesaplanmalıdır. `greenwichMeanTimeZone` alanının yaz saatini içerip içermediği **doğrulanamadı**; bu yüzden `diyanet_cities.iana_tz` üzerinde `Intl.DateTimeFormat` ile yerel saat çözülecektir.
- **Ay Sonu Geçişi:** Ayın 24'ünden itibaren (`kalan gün < 7`) `fetchPrayerDays` hem cari ayı hem gelecek ayı (`month=YYYY-MM,YYYY-MM+1`) ister; böylece 7 günlük bildirim penceresi ay sınırında kesilmez.
- **Seyahat (Konum Değişince):** Açılışta alınan `(lat, lon)` ile `prayerMonthCache.coords` arasındaki Haversine mesafesi `> 15 km` ise önbellek geçersiz sayılır, yeni şehrin aylık vakti çekilir ve `schedStamp` değiştiği için 7 günlük bildirimler yeni şehre göre yeniden planlanır.

---

## 5. Riskler ve Doğrulama Planı

- **Resmî Takvim Karşılaştırma Matrisi (Canlıya Geçiş Öncesi):**
  Aşağıdaki 5 nokta için `/api/vakit` çıktısı ile `namazvakitleri.diyanet.gov.tr` web tablosu (Kasım 2026 kış ve Haziran 2026 yaz/yüksek enlem) dakika dakika karşılaştırılacaktır (hedef: **0 dk fark**):
  1. **İstanbul Merkez** (`cityId: 9541`) ve sınır ilçesi **Şile** (`cityId: 9547` — merkezle 2–3 dk fark).
  2. **Anadolu İlçesi:** ör. Konya/Akşehir veya Çorum/Bayat (eş adlı ilçe doğrulaması).
  3. **Berlin** (`cityId: 11002`, `52.52°N`).
  4. **Londra** (`cityId: 14096`, `51.51°N` — `WATFORD (LONDRA)` `14036` ve Kanada `LONDON` `9103` ile karışmadığının kanıtı).
  5. **Yüksek Enlem:** **Oslo** (`cityId: 15702`, `59.91°N`), **Tromsø** (`cityId: 15689`, `69.65°N`) ve **Reykjavik** (`cityId: 14694`, `64.15°N`).
- **Kutup Bölgeleri ve Aşırı Enlemler (`> 65°`):**
  - Tromsø/Kiruna gibi şehirlerde yazın güneş batmadığında Diyanet API'nin bazı vakitleri boş/özel formatta döndürüp döndürmediği **doğrulanamadı**. İstemcide `isValidPrayerTimes` (`useDailyContent.ts:76–82`) `"HH:MM"` doğrulaması başarısız olursa otomatik olarak `adjustHighLatitude` (`prayerMethod.ts:103`) yedek hesabına düşülecektir.
- **Diyanet Hesabı Kapanırsa / Kota Dolarsa / Şifre Değişirse:**
  - Turso'da daha önce çekilmiş ayların verisi silinmez, sunulmaya devam eder.
  - Yeni ay çekilemezse sunucu `503` döner; mobil uygulama kullanıcıya hata göstermeden mevcut **Aladhan + `prayerMethod.ts`** hesabına düşer (kesintisiz hizmet).

---

## 6. Uygulama Planı (6 Bağımsız Commit Adımı)

> **Test Kısıtı:** `npm run test:mobile` (`node --test "apps/mobile/src/**/*.test.ts"`) büyük JSON'ları ve uzantısız göreli importları yükleyemez; uygulama kodunda `import.meta` ve `createRequire` yasaktır. Tüm yeni mobil mantık `apps/mobile/src/lib/` altında **importsuz (veya yalnız `.ts` saf yardımcı) ve bağımlılık enjeksiyonlu (veriyi parametreyle alan)** saf fonksiyonlar olarak yazılacaktır.

### Adım 1: Diyanet Şehir Koordinat Eşleme Veri Hattı
- **Dokunulacak Dosyalar:** `scripts/build-diyanet-coords.mjs` (yeni), `scripts/lib/diyanetCityMatch.mjs` (yeni), `scripts/diyanetCityMatch.test.mjs` (yeni), `data/diyanet/places-with-coords.json` (üretilen).
- **Test Edilecek Saf Fonksiyonlar:**
  - `normalizePlaceName(name: string): string` (Türkçe karakter, parantez içi `WATFORD (LONDRA)` ve boşluk temizliği).
  - `matchDiyanetCityToCoords(city: PlaceItem, geoCandidates: GeoPoint[], trDistrictCoords: Record<string, GeoPoint>): GeoPoint | null`.

### Adım 2: Konum → En Yakın Diyanet Şehri Seçici Saf Modül
- **Dokunulacak Dosyalar:** `apps/mobile/src/lib/diyanetCityLookup.ts` (yeni — importsuz saf modül), `apps/mobile/src/lib/diyanetCityLookup.test.ts` (yeni).
- **Test Edilecek Saf Fonksiyonlar:**
  - `haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number`
  - `findNearestDiyanetCity(lat: number, lon: number, candidates: readonly CityCoord[], maxDistanceKm?: number): { cityId: number; distanceKm: number } | null`
  - `parseDiyanetHijri(hijriDateShort: string | null | undefined): { day: number; monthNumber: number; year: number } | null`
  - `normalizeDiyanetDay(raw: Record<string, unknown>): { dateYmd: string; timings: Record<string, string>; hijri: { day: number; monthNumber: number; year: number } | null } | null`

### Adım 3: Veritabanı Şeması ve Yazma Yardımcısı (`apps/web`)
- **Dokunulacak Dosyalar:** `apps/web/src/lib/dbUtils.ts` (`dbRun` eklenmesi), `scripts/seed-diyanet-cities.mjs` (yeni — `diyanet_cities`, `diyanet_prayer_times`, `diyanet_auth_state` tablolarını oluşturup 8.606 şehri yükler).
- **Test Edilecek Saf Fonksiyonlar (`apps/web/src/lib/diyanetSql.ts` & `.test.ts`):**
  - `buildMonthlyUpsertSql(rowCount: number): string`
  - `isTokenFresh(expiresAtSec: number | null, nowSec: number,skewSec?: number): boolean`

### Adım 4: Sunucu Diyanet İstemcisi ve `/api/vakit` Route'u (`apps/web`)
- **Dokunulacak Dosyalar:** `apps/web/src/lib/diyanetServerClient.ts` (yeni — token yenileme + singleflight + kota korumalı çekim), `apps/web/src/lib/diyanetServerClient.test.ts` (yeni — sahte `fetch` ve sahte DB enjeksiyonlu birim testi), `apps/web/src/app/api/vakit/route.ts` (yeni).
- **Test Edilecek Saf / Enjeksiyonlu Fonksiyonlar:**
  - `resolveMonthWindow(nowYmd: string, requestedMonth?: string | null): string[]` (ay sonu son 7 günde iki ay döndürme kuralı).
  - `getOrFetchCityMonth(cityId: number, month: string, deps: { dbRead; dbWrite; fetchMonthly }): Promise<Record<string, DayVakit>>` (aynı anda gelen iki çağrının `fetchMonthly`'yi yalnız 1 kez tetiklediğinin testi).

### Adım 5: Mobil Aylık Vakit Önbelleği ve Fallback Yöneticisi
- **Dokunulacak Dosyalar:** `apps/mobile/src/lib/storage.ts` (`prayerMonthCache`, `prayerManualCity` anahtarları), `apps/mobile/src/lib/api.ts` (`api.vakit` ucu), `apps/mobile/src/lib/prayerCachePolicy.ts` (yeni — importsuz saf modül), `apps/mobile/src/lib/prayerCachePolicy.test.ts` (yeni).
- **Test Edilecek Saf Fonksiyonlar (`prayerCachePolicy.ts`):**
  - `shouldUseCachedMonth(cache: PrayerMonthCache | null, coords: { lat: number; lon: number }, manualCityId: number | null, requiredDates: string[]): boolean` (15 km seyahat eşiği + eksik gün kontrolü).
  - `extractScheduleDaysFromCache(cache: PrayerMonthCache, startYmd: string, count: number): { dateYmd: string; times: Record<string, string> }[] | null`.

### Adım 6: Ana Sayfa, Bildirim Planlayıcı ve Şehir Seçici Entegrasyonu
- **Dokunulacak Dosyalar:** `apps/mobile/src/hooks/useDailyContent.ts`, `apps/mobile/src/lib/namazNotifications.ts`, `apps/mobile/app/(tabs)/index.tsx`, `apps/mobile/app/bildirimler.tsx`.
- **Doğrulama:** `useDailyContent` ve `fetchPrayerDays` içinde önce `prayerMonthCache` → `/api/vakit` → Aladhan+`prayerMethod.ts` yedek zincirinin çalıştırılması; `npm run test:mobile`, `npm test` ve `npm run typecheck` doğrulamaları.

---

## 7. Onaylanan Ekler (Claude denetimi, kullanıcı onayı 2026-11-13)

1. **Gizlilik:** Konum artık kendi sunucumuza da gider. Gizlilik metni (`apps/mobile/src/data/content/gizlilik*.json`, `apps/web/src/app/privacy/page.tsx`) ve mağaza veri beyanları güncellenmeden canlıya çıkılmaz. Konum sunucuya **2 ondalığa yuvarlanmış** (~1 km) gönderilir; sunucu konumu kaydetmez/loglamaz.
2. **En yakın şehir sunucuda bulunur:** Mobil uygulamaya 8.606 şehirlik liste gömülmez. Akış: `GET /api/vakit/sehir?lat&lon` → `{ cityId, cityName, stateName, countryName, distanceKm }` (veya `> 50 km` ise `null`); telefon `cityId`'yi saklar ve vakitleri hep `GET /api/vakit?cityId&month` ile ister (CDN dostu). Böylece Adım 2'deki `findNearestDiyanetCity` sunucu tarafında (`apps/web/src/lib`) yaşar.
3. **GeoNames atıfı:** CC-BY 4.0 gereği uygulamadaki kaynaklar/lisanslar sayfasına ve `licenses/` altına atıf eklenir.
4. **Yaz saati (doğrulandı 2026-11-13):** Diyanet saatleri şehrin yerel duvar saatidir ve `greenwichMeanTimeZone` o günün yaz saati DAHİL UTC farkıdır (Sidney 13 Kasım → 11). Kurallar:
   - Sunucu her vakti o günün farkıyla **kesin an** olarak döner (ör. `2026-11-13T05:25:00+01:00`); telefon bildirim ve geri sayımı bu ana göre kurar. Ay ortasındaki geçişler gün bazında doğru kalır.
   - En yakın şehir seçilirken telefonun saat dilimi de gönderilir; yalnız o günkü UTC farkı aynı olan şehirler aday olur (saat dilimi sınırı koruması). Yoksa formüle düşülür.
   - Elle farklı saat dilimindeki şehir seçilirse vakitler o şehrin saatiyle ve "<şehir> saati" etiketiyle gösterilir.
   - Testlere geçiş günleri eklenir (Avrupa 2026-10-25 / 2027-03-28, Avustralya 2027-04-04); bir geçiş günü Diyanet'ten tek istekle doğrulanır.
5. **Koordinat doğrulaması (2026-11-14):** Riskli 2.030 eşleşme + 100 tek-adaylı örnek, Diyanet'in `astronomicalSunrise/Sunset` saatleriyle güneş hesabına karşı sınandı (eşik ±3 dk). Sonuç: 2.047 geçti, 82 reddedildi (`rejected-solar`), tek-adaylı örnekte 0 hata. Son durum: 8.606 şehrin 7.534'ü koordinatlı. Betik: `scripts/diyanet-verify-coords.mjs`.
   - **Diyanet'in saat farkı bazı yerlerde gerçek saatten 1 saat farklı** (ör. Vancouver −7, Edmonton −6, Memphis −6 — Kasım'da gerçek fark −8/−7/−6); ama Diyanet'in saati + kendi farkı güneşle tutarlı. Bu yüzden sunucu vakti **Diyanet'in kendi farkıyla kesin ana** çevirmeli, telefon da kesin anı **cihazın saat diliminde** göstermeli; Diyanet'in "HH:MM" metni olduğu gibi gösterilmemeli. Saat dilimi sınırı kontrolü kesin anlar üzerinden yapılmalı.
