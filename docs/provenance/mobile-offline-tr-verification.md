# Mobil Türkçe çevrimdışı veri — 2026-11-20

Yerel DB salt okunur açıldı; ağ isteği, DB yazımı, Android build/adb ve commit yapılmadı.

## Boyutlar

Değerler UTF-8 disk baytlarıdır; MB = 1.000.000 bayt.

| Bölüm | Dosya | Toplam bayt | Ortalama bayt/dosya |
| --- | ---: | ---: | ---: |
| Sure listesi | 1 | 13.497 | 13.497 |
| Sure meal/okunuş/literal | 114 | 2.295.059 | 20.132 |
| Mushaf cüzleri | 30 | 2.526.129 | 84.204 |
| Rule/color tablosu | 1 | 273 | 273 |
| Statik require index | 1 | 8.367 | 8.367 |
| **Yeni gömülü paket** | **147** | **4.843.325** | **32.948** |

Yeni paket 6 MB hedefinin altında. Tekrar kullanılmakta olan mevcut `quran_arabic.json` (1.363.621 bayt) ve `mushaf_sayfalari.json` (5.365 bayt) dahil bu veri kümesinin toplam disk boyutu 6.212.311 bayttır. Bu iki dosya önceden uygulamada bulunuyordu ve çoğaltılmadı. Test golden dosyası, provenance ve kaynak kod bu veri boyutuna dahil değildir.

## Birebirlik ve doğrulama

`node --no-warnings scripts/build-mobile-offline-tr.mjs --check` exit 0:

```text
deepStrictEqual PASS: 604/604 pages, 114/114 surahs, surah list; actual mobile decoder vs actual routes
Arabic exact comparison: 6124/6236 identical; 112 overrides stored
OK: 147 files checked
```

Betik gerçek web route handler'larını tutarlı, salt okunur SQLite snapshot üzerinde çalıştırır; yalnız DB erişimi ve Next yanıt sarmalayıcısı uyarlanır. `--check`, 147 dosyanın yeniden kodlanan içerikle bayt eşitliğini ve diskteki paketin gerçek mobil decoder üzerinden route yanıtlarıyla `deepStrictEqual` eşitliğini doğrular.

6236 DB Arapça metninin tamamı mevcut mobil metinle normalizasyon yapılmadan karşılaştırıldı. 112 farklı kayıt, 1 ve 9 hariç surelerin ilk ayetleridir. Bu kayıtların DB metni ayrıca aynen saklanır; kalan 6124 metin mevcut dosyadan okunur. Ham tecvid markup'ı da API sözleşmesi gereği korunur.

Mobil `npx tsc --noEmit` exit 0. `npx jest src/lib/offlineTr src/lib/api --runInBand`: 2 suite, 22 test geçti. Golden yanıtlar sayfa 1/187/604 ve sure 1/114 için sabittir; olağan üretim bunları yenilemez.

Mevcut cache testleri ve yeni paket provenance hash testi, Node test runner'ın `--experimental-test-isolation=none` seçeneğiyle 5/5 geçti. Varsayılan test isolation bu ortamda subprocess `spawn EPERM` hatası verdi.

## Dosyalar

- `scripts/build-mobile-offline-tr.mjs`
- `apps/mobile/src/data/offlineTr/{surahs.json,rules.json,index.ts}`
- `apps/mobile/src/data/offlineTr/verses/001.json` … `114.json`
- `apps/mobile/src/data/offlineTr/mushaf/juz01.json` … `juz30.json`
- `apps/mobile/src/lib/{offlineTr.ts,offlineTrCodec.ts,api.ts}`
- `packages/core/src/mushafCompat.ts`; web'deki eski konum ortak kaynağı re-export eder.
- `apps/mobile/src/lib/{offlineTr.test.ts,api.test.ts,apiCache.test.ts}`
- `apps/mobile/src/lib/__fixtures__/offlineTr.golden.json`
- `apps/mobile/jest.config.cjs`
- `scripts/{generate-source-provenance.mjs,source-provenance.test.mjs}`
- `docs/provenance/{source-content-provenance.json,mobile-offline-tr-verification.md}`

## Sınırlar

API/cache davranışı ve retry süreleri korunur; gömülü yanıt, ağ denemeleri ve cache fallback sonrasında gelir. Cihazda temiz kurulum/uçak modu testi yapılmadı.

Tam provenance üretimi worktree'de bulunmayan tarihsel Elmalılı vendor dizinine bağlıdır. `--offline-tr-only`, eski kayıtları koruyarak yeni paketin kaynak zincirini ve hash'lerini günceller. Yeni paketin hash testi geçer. Genel provenance testinde önceden kayıtlı `apps/mobile/src/data/dualar.en.json` için 118.070/118.062 bayt uyumsuzluğu vardır; bu görev dışındaki dosya ve eski hash kaydı değiştirilmedi. Mevcut kaynak/lisans kayıtlarındaki tecvid kapsam sınırları aynen geçerlidir.
