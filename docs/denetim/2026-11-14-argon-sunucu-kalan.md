# Diyanet Sunucu Kalan Bulgular Düzeltme Raporu (2026-11-14)

## Bulguların Durumu
- **2.1 (Küresel hız sınırı / kilit):** **ÇÖZÜLDÜ** — `apps/web/src/app/api/vakit/route.ts` içinde mevcut Upstash Redis/Ratelimit altyapısıyla `(cityId, startYmd)` başına 15 sn kısa kilit (`nx`+`ex`) ve küresel 30 istek/60 sn kayan pencere sınırı eklendi; `diyanetClient.ts` içine `acquireSlot`, `maxQueue=10` ve `minIntervalMs=200` korumaları eklendi. Sınır/kilit aşımında Diyanet'e gidilmez (429 `rate_limit`/`queue_full` devre kesiciyi tetiklemez); önbellekte veri varsa döner, yoksa 503 (`fallback: "aladhan"`) döner. Upstash tanımlı değilse zarifçe tek örnek sınırına (küresel değil) düşer.
- **2.4 (Tam ayların tazelenmesi):** **ÇÖZÜLDÜ** — `vakitService.ts` içinde tam aylarda en eski `fetchedAt` 14 günü (`14 * 86400` sn) aşmışsa ve yalnız geçerli ay veya sonraki ay (`current` / `current + 1`) ise bir kez yeniden çekilir; hata veya sınır aşımında mevcut tam önbellek (`complete: true, fromCache: true`) korunarak döndürülür ve 300 sn tekrar deneme beklemesi uygulanır.
- **2.6 (Koordinat doğrulamasının eşleşmeye bağlanması):** **ÇÖZÜLDÜ** — `scripts/diyanet-verify-coords.mjs` çıktısına `lat`, `lon`, `tz`, `geonameId` eklendi; `scripts/build-diyanet-coords.mjs` içinde `isVerifyResultCurrent` ile doğrulama kaydının koordinat (`1e-6` tolerans) ve `tz` eşleşmesi kontrol edilerek uyuşmayan eski kayıtlar geçersiz sayıldı.
- **2.7 (`/api/vakit/sehir` önbellek süreleri):** **ÇÖZÜLDÜ** — `apps/web/src/app/api/vakit/sehir/route.ts` içinde `404 no_city` yanıtları `public, s-maxage=3600` (SWR yok) yapıldı; `200` yanıtlarında `stale-while-revalidate=86400`'e indirildi.
- **2.8 (Upstream hata mesajı sızıntısı):** **ÇÖZÜLDÜ** — `scripts/diyanet-verify-coords.mjs` içinde Diyanet `json.message` metninin hata ve loglara eklenmesi kaldırıldı; yalnız HTTP durum kodu ve izinli hata kodları (`ALLOWED_ERROR_CODES`) loglanır.

## Değişen Dosyalar
- `apps/web/src/lib/diyanetClient.ts`, `apps/web/src/lib/diyanetClient.test.ts`
- `apps/web/src/lib/vakitService.ts`, `apps/web/src/lib/vakitService.test.ts`
- `apps/web/src/app/api/vakit/route.ts`, `apps/web/src/app/api/vakit/sehir/route.ts`
- `scripts/diyanet-verify-coords.mjs`, `scripts/build-diyanet-coords.mjs`

## Doğrulama Sonuçları
- **Birim Testleri:** `node --test ...` → **56/56 geçti** (6 yeni senaryo dahil).
- **Typecheck & Lint:** `npx tsc --noEmit -p .` → **0 hata**; `npx eslint` (değişen dosyalar) → **0 hata**.

## Canlıya Çıkarken Risk Notu
- Upstash ortam değişkenleri (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) tanımlı olduğunda küresel kilit ve 30/dk hız sınırı aktiftir; tanımlı değilse yalnız örnek içi kuyruk (`maxQueue=10`) ve aralık (`200ms`) sınırı çalışır.
- `build-diyanet-coords.mjs` bir sonraki çalıştırıldığında eski `coords-verify.json` kayıtlarında `lat/lon/tz` bulunmadığı için `verified` bayrağı için yeniden doğrulama gerekecektir (`diyanetCities.json` bu görevde değiştirilmedi).
