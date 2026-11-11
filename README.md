# Kuran Yolu

Kuran Yolu; Kur’an okuma, Elmalılı Hamdi Yazır meali, kelime ve kök analizi,
tecvid gösterimi, tefsir açıklamaları, Elifba ve ders içerikleri, dua ve ibadet
rehberleri ile namaz vakitlerini bir araya getiren web ve mobil uygulamasıdır.

Proje, npm workspaces kullanan bir TypeScript monoreposudur. Web uygulaması
Next.js 14 ve React 18; mobil uygulama Expo SDK 56, React Native ve React 19
kullanır. Kesin bağımlılık sürümleri package.json dosyaları ve
package-lock.json içinde tutulur.

## Dizinler

| Yol | Sorumluluk |
|---|---|
| `apps/web` | Next.js web uygulaması ve HTTP API |
| `apps/mobile` | Expo / React Native mobil uygulaması |
| `packages/core` | Ortak analiz, veri adaptörleri, sunum ve kaynak bildirimleri |
| `packages/types` | Ortak TypeScript veri tipleri |
| `packages/storage` | Web ve native depolama adaptörleri |
| `packages/ui` | Ortak UI paketi |
| `content` | Paylaşılan içerik |
| `data` | Yerel DB, kaynak veri ve veri işleme çıktıları; büyük bölümü Git dışında |
| `data2` | Analiz kaynakları, yerel JSON girdileri ve veri üretim scriptleri; Git dışında |
| `scripts` | Test, denetim, veri hazırlama, bakım ve migration araçları |
| `docs` | Teknik belgeler ve provenance kayıtları |
| `licenses` | Üçüncü taraf lisansları ve bildirimleri |
| `_arsiv` | Yalnız yerelde tutulan arşiv; Git ve dağıtım paketleri dışında |

## Kurulum

Node.js 24 kullanılması önerilir: mevcut test komutları doğrudan TypeScript
dosyaları çalıştırır ve CI test işi Node 24 kullanır. CI tip kontrolü ayrıca
Node 22 üzerinde çalışır.

TODO: Desteklenen kesin Node/npm sürüm aralığını ve mobil geliştirme araç
zincirini belgeleyin.

Bağımlılıkları repo kökünden kurun:

```sh
npm ci
```

Yerel yapılandırma:

- Web DB erişiminde `TURSO_DB_URL` ve `TURSO_AUTH_TOKEN` birlikte tanımlıysa
  Turso kullanılır; aksi durumda yerel `data/app.db` gerekir.
- Web ortam ayarlarını `apps/web/.env.local` içinde tutun.
- Mobil API hedefi `EXPO_PUBLIC_WEB_URL` ve `EXPO_PUBLIC_API_URL` ile;
  ses hedefi `EXPO_PUBLIC_AUDIO_BASE_URL` ile ayarlanabilir.
- `EXPO_PUBLIC_*` değerleri istemciye açıktır; bu alanlara sır koymayın.
- Bazı bakım komutları kökteki `.env.local` dosyasını kullanır.
- Firebase ve diğer servislerin yerel yapılandırmalarını Git’e eklemeyin.

TODO: Değer içermeyen ortam şablonlarını, özelliklere göre gerekli değişkenleri
ve yerel DB’nin yetkili temin yöntemini ekleyin.

## Geliştirme ve komutlar

Aşağıdaki komutlar repo kökünden çalıştırılır ve mevcut package.json
scriptlerine karşılık gelir.

| Amaç | Komut |
|---|---|
| Web geliştirme | `npm run dev:web` |
| Mobil geliştirme sunucusu | `npm run dev:mobile` |
| Android geliştirme derlemesi | `npm run android -w @quran-app/mobile` |
| iOS geliştirme derlemesi | `npm run ios -w @quran-app/mobile` |
| Workspace tip kontrolü | `npm run typecheck` |
| Web Node testleri | `npm test` |
| Mobil testleri | `npm run test:mobile` |
| Core testleri | `npm run test:core` |
| Web Jest veri testleri | `npm run test:data` |
| Kur’an runtime testleri | `npm run test:quran` |
| Kaynak/provenance testleri | `npm run test:provenance` |
| Tecvid denetim testleri | `npm run test:tajweed-audit` |
| Fark analizi kalite kapısı testleri | `npm run gate:fark:test` |
| Workspace build | `npm run build` |
| Derlenmiş web uygulamasını başlatma | `npm run start -w @quran-app/web` |

Kök build komutu yalnız build scripti bulunan workspace’leri çalıştırır.
Mobil pakette build scripti bulunmadığından bu komut Android AAB veya iOS
paketi üretmez. Web build scripti önce kendi tip kontrolünü çalıştırır.

Bakım komutları:

| Amaç | Komut |
|---|---|
| DB yedeği | `npm run backup` |
| Kaynak provenance üretimi | `npm run provenance:sources` |
| Paket lisans bildirimleri üretimi | `npm run licenses:packages` |
| Canlı sistem doğrulaması | `npm run verify:live` |

Yedekleme ve üretim komutları dosya yazabilir; canlı doğrulama ağ erişimi
yapar. Migration, senkronizasyon ve upload işlemleri rutin test adımı değildir.

## Veri

Web runtime verisine Turso veya yerel SQLite üzerinden erişilir.
Üretim meal politikası yalnız Elmalılı Hamdi Yazır’dır. Bulaç, Diyanet,
Öztürk ve Vakfı mealleri runtime’dan kaldırılmış; kaynak geçmişi provenance
kayıtlarında korunmuştur.

Canonical Arapça metin Tanzil Uthmani 1.1 kaynağıdır. Kaynak Unicode metin
korunur; tecvid gösterimi hizalanmış span katmanıyla hazırlanır.

`data2/` kullanılmaktadır:

- Core adaptörü `processed/root_explanations_tr_v2_easy_only.json` dosyasını
  modül yüklenirken okur.
- Analiz ve audit akışları canonical v2/v3/v4 JSON’larını kullanabilir.
- Veri hazırlama ve karşılaştırma scriptlerinin girdileri burada bulunur.

Bu nedenle `data2/` topluca arşivlenmemelidir. package.json içindeki
`build:word-analysis:*` ve `build:canonical-word-analysis:*` komutlarının
istediği bazı eski kaynak dizinleri mevcut değildir.

TODO: Eksik legacy girdilerin teminini veya bu komutların geleceğini belirleyin.

Temiz clone bütün yerel veriyi içermez. Bazı DB testleri veri bulunmadığında
atlanır; başarılı test sonucu değerlendirilirken skip sayıları da incelenmelidir.

Kaynak ve dönüşüm kayıtları:
`docs/provenance/source-content-provenance.json`.

## Dağıtım

Web hedefi Vercel’dir. `apps/web/vercel.json`; Next.js build komutunu,
`.next` çıktısını ve `fra1` bölgesini tanımlar. Sahip notlarındaki proje adı
`kuran-app-web` olarak geçer.

Production web adresi: <https://kuran-app-web-ozan-s-projects8.vercel.app>.
Mobil uygulama bu adresi varsayılan API hedefi olarak kullanır
(`apps/mobile/src/lib/runtimeConfig.ts`; Android uygulama bağlantısı
`apps/mobile/app.config.js`). Özel alan adına geçilirse iki yer birlikte
güncellenmelidir.

Mobilde `apps/mobile/eas.json` geliştirme, preview ve production profillerini
tanımlar; production Android çıktı türü `app-bundle` olarak ayarlanmıştır.

Production Android AAB işlemlerinde mevcut
[yerel üretim prosedürü](.agents/skills/local-production-aab/SKILL.md)
kullanılır. Mevcut signing yöntemi korunur; yeni key veya keystore oluşturulmaz.

iOS paket kimliği `com.kuranapp.mobile`; App Store hazırlığı (izin metinleri,
privacy manifest, Firebase plist) yapılmıştır, gönderim `eas.json` içindeki
`submit.production` profiliyle yapılır.

TODO: App Store yayın durumunu belgeleyin.

## Lisans ve üçüncü taraf kaynaklar

Projeye ait özgün uygulama kodu proprietary’dir:
**All rights reserved — Tüm hakları saklıdır.** Ayrıntılar `LICENSE` içindedir.

Üçüncü taraf materyaller kendi lisans ve kullanım şartlarına tabidir;
proje kodunun lisansı bu hakları değiştirmez.

| Kaynak | Repoda kayıtlı lisans / durum |
|---|---|
| Tanzil Quran Text Uthmani 1.1 | CC BY 3.0; atıf, bağlantı, bildirim ve metni değiştirmeme şartları |
| Elmalılı dijital kaynak zinciri / Semar Ketir | Dijital JSON çalışması MIT; kullanılan kesin baskı/nüsha hakları TODO |
| Quranic Arabic Corpus / mustafa0x fork | GPL / Corpus Terms kaydı; kesin GPL sürümü ve fork lisans kanıtı TODO |
| CAMeL Tools | MIT |
| CAMeL Morph | CC BY 4.0 |
| AlQuran.cloud tecvid markerları | Sağlayıcı kullanım şartları; açık lisans tanımı TODO |
| Amiri, Figtree, Lora | SIL OFL 1.1 |
| UthmanicHafs | Font içindeki KFGQPC EULA |
| Üretim yazılım bağımlılıkları | Paketlerine göre MIT, Apache-2.0, ISC, BSD ve diğer kayıtlı lisanslar |

Tam bildirimler `NOTICE`, `THIRD_PARTY_LICENSES.md` ve `licenses/`
altındadır. Paket bildirimleri `licenses/PACKAGE-NOTICES.md`, lisans
metinleri `licenses/PACKAGE-LICENSE-TEXTS.txt` içindedir.

Klasik hadis referansları, Sunnah.com bağlantıları, Aladhan API kullanımı
ve dağıtılan ses/görseller için kesin kaynak ve yeniden dağıtım koşulları
eksiksizleştirilmelidir. AI destekli içeriklerin üretim ve kanıt sınırlamaları
provenance manifestinde kayıtlıdır.

## Arşiv politikası

`_arsiv/` yalnız yerelde tutulur; Git, EAS ve Vercel paketlerine dahil edilmez.
Dosyalar silinmez, taşınır. Taşıma sırasında eski/yeni yol, boyut ve hash
eşitliği yerel kayıtta doğrulanır.

Aktif veri, script girdisi ve provenance artefaktları tüketici yolları
incelenmeden taşınmaz. `data2/` ve `backups/` mevcut yerlerinde korunur.

Eski dalların uçları ileride `archive/<dal-adı>` tag’leriyle korunacak;
ardından eski dallar ve `old-onedrive` remote’u ayrı bakım adımında
kaldırılacaktır.
