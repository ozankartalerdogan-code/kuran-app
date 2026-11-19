# Kuran Yolu — Tema Etiketleri (Theme Tags) Analiz ve Uygulama Planı

## 1. Veri Envanteri & Mimari

- **Kanoni̇k DB:** `data/app.db` (prod'da `TURSO_DB_URL` ile Turso, local dev'de `data/app.db` — `apps/web/src/lib/dbUtils.ts`).
- **Tablolar:**
  - `verse_tags` (`verse_key` PK, `ana_tema` NOT NULL, `alt_taglar` JSON, `updated_at`): **6.236** satır (%0 etiketsiz, 0 bozuk JSON).
  - `verse_tag_items` (`verse_key`, `tag`, `isim`, `aciklama`): **21.045** satır, **3.255** tekil tag (421 satırda `isim`/`aciklama` dolu).
  - `verses.temalar`: eski kolon, yalnız 11 satır dolu (ölü veri).
  - **TR Meal kaynağı:** `translations` (`source='yazir'`, **6.236** ayet — Elmalılı Hamdi Yazır).
- **Dağılım:**
  - `ana_tema`: **28** kod; en küçük `B1_TAHARET_TEMIZLIK` (7), en büyük `A6_AHIRET_MEAD` (1.393 — Kur'an'ın **%22,3**'ü). >500 ayetli 3 ana tema: `A6_AHIRET_MEAD` (1.393), `F1_PEYGAMBER_KISSALARI` (802), `A1_ALLAH_ULUHIYET` (619).
  - `alt_taglar` (JSON): **3.158** tekil tag, **20.340** atama (ayet başı 1–9, ort. 3,26; `ana+alt` min=2, medyan=4, maks=10, ort. 4,26).
  - **<3 ayetli `alt_taglar`:** **2.098** adet (**%66,4**); **>500 ayetli `alt_taglar`:** 0 (en büyük `azap`: 467).
- **Köken & Senkron Kayması:**
  - İlk üretim: `commit 0963f74e` (`scripts/etiketle_gemini.py`, `kuran_tema_etiketleme_prompt.txt`) — Gemini 2.5 Flash (`temperature=0`, `thinking_budget=0`), Kural 5: *"Emin değilsen boş bırakma, en yakın ana temayı seç"*. Ardından `scripts/_tag_standardize.py` kısmi Türkçe karakter düzeltmesi yaptı.
  - Sonraki eklemeler (`c61712b2`, `2c4c8b9c`): kürasyonlu `namaz-*`, `korunma-*`, `ismiazam-*`, `dua-*` etiketleri doğrudan `verse_tag_items` tablosuna yazıldı (`859` çift `verse_tags.alt_taglar` içinde yok; `154` çift ise yalnız `alt_taglar`'da var).
- **TR / EN Başlıklar & Okuma Yolları:**
  - Web `/discover` (`apps/web/src/app/discover/DiscoverContent.tsx`): 28 `ana_tema` için **yalnız TR** başlıklar + 7 grup (`A–G`) + statik ayet sayıları hardcoded. **Hata:** UI `C4_ILIM_AKIL_TEFEKKUR` (ASCII `U`) sorguluyor, DB'de `C4_ILIM_AKIL_TEFEKKÜR` (`Ü`) var — link kırık!
  - Web ayet detay (`apps/web/src/app/surah/[surahId]/ayah/[ayahNumber]/page.tsx:1322`): `anaTema.replace(/_/g, " ")` basıyor.
  - Mobil (`apps/mobile/src/i18n/strings/tagLabels.ts`): yalnız 16 kürasyonlu `namaz-*`/`korunma-*`/`ismiazam-*` için TR+EN başlık var. **28 `ana_tema` ve 3.158 `alt_taglar` için EN başlık sıfır.**
  - Mobil okuma/offline: `SHOW_THEME_TAGS = false` (`apps/mobile/app/ayah/[surahId]/[ayahNumber].tsx:62`). Veriyi `/api/ayah` ve `/api/tags/filter` üzerinden çekip `AsyncStorage`'da 7 gün önbellekliyor (`apps/mobile/src/lib/api.ts:457-473`); bundle edilmiş offline tag verisi **yok**.

---

## 2. Kalite Denetimi (200 Örneklem, `seed=42` — `samples.csv`)

10 en büyük `ana_tema` + 5 en büyük `alt_tag` + 10 rastgele küçük `alt_tag` (8–25 ayet aralığı) × 8 ayet = **200 yargı**.

| Grup | Örnek | FIT | WEAK | WRONG | Hassasiyet (FIT%) | Öne Çıkan Sorunlar |
|---|---:|---:|---:|---:|---:|---|
| Top 10 `ana_tema` | 80 | 69 | 6 | 5 | **%86,2** | `A6_AHIRET_MEAD`, `F1`, `A1`, `C2` %75 FIT; `E1`, `C1`, `B3` %100 |
| Top 5 `alt_taglar` | 40 | 34 | 5 | 1 | **%85,0** | `iman` %62,5 (52:36 WRONG); `azap` & `cehennem` %100 |
| 10 Küçük `alt_tag` | 80 | 59 | 15 | 6 | **%73,8** | `yol` %50 (4 WRONG), `hristiyan` %62,5 (2 WRONG), `dua-tevekkul` %25 FIT |
| **TOPLAM** | **200** | **162** | **26** | **12** | **%81,0** | **WEAK %13,0 · WRONG %6,0** (hedef ≥%90 FIT) |

**Tespit Edilen Sistematik Hatalar:**
1. **Zorunlu Atama Şişmesi:** Boş bırakma yasağı kısa/bağlamsal ayetleri `A6_AHIRET_MEAD`'e (1.393) ve `C2_BIREYSEL_REZILETLER`'e (398) yığmış (`37:15`, `19:27`, `52:4`, `14:2`, `53:22` WRONG).
2. **Kelime Eşleşmesi / Çok Anlamlılık:** `yol` etiketi dağ geçitleri ve denizde açılan yolu (`21:31`, `20:77`, `16:15`, `71:20`) hidayet yoluyla karıştırmış. `ücret` tebliğde ücret istememe ile Hızır/sihirbaz ücretini birleştirmiş. `inkar` `40:84`'te "şirki inkâr" lafzından ötürü atanmış.
3. **Parantez İçi Tefsir & Bağlam Sızıntısı:** `hristiyan` etiketi `15:90` ayetinde Elmalılı'nın parantez içi `"(yahudi ve hıristiyanlara)"` yorumundan üretilip devamındaki genel hesap ayetlerine (`15:92`, `15:93`) sızmış (dini hassasiyet açısından yüksek risk).
4. **Adlandırma & Mükerrerlik:** 318 ASCII/Türkçe ikiz grubu (`es`/`eş`, `sabir`/`sabır`, `kafir`/`kâfir`, `kiyamet`/`kıyamet`, `rizik`/`rızık`), 18 boşluklu tag (`huruf-u mukatta'a` 3 farklı yazım), `deneme` (9) vs `imtihan` (45) eşanlamlı bölünmesi.
5. **Tüm Sureye Kör Etiketleme:** Yok (en yoğun `101 Kâria` 11/11 `A6_AHIRET_MEAD`, içerikle tutarlı).

---

## 3. Temizlik ve Minimal Ürün Planı

### A. Temiz Taksonomi (2 Seviye, TR + EN)
- **Seviye 1 (`ana_tema` — 24 kategori, `NULL` serbest):**
  - **Birleştir:** `B1_TAHARET_TEMIZLIK` (7) → `B2_SERI_IBADETLER`; `D2_CINSEL_AHLAK` (29) → `D1_AILE_HUKUKU`; `F3_SIYER_SAHABE` (29) → `F1_PEYGAMBER_KISSALARI`; `G3_MESELLER_TEMSILLER` (43) → `G1_KURAN_HAKKINDA`.
  - **Düzelt:** `C4_ILIM_AKIL_TEFEKKÜR` → ASCII `C4_ILIM_AKIL_TEFEKKUR` olarak standardize et.
  - **Kural:** Kısa/tek başına konusu belirsiz ayetlerde `ana_tema = NULL` bırak (özellikle `A6`, `C2`, `F1` şişmesini önler).
- **Seviye 2 (`alt_taglar` — ~120–150 kontrollü etiket):**
  - 2.098 adet `<3` ayetli gürültü etiketini **sil**; 318 ASCII/Türkçe ikizi birleştir (`es`→`eş`, `deneme`→`imtihan`); çok anlamlı tekil kelimeleri (`yol`, `ücret`) spesifikleştir (`hidayet-yolu`, `teblig-karsiliksiz`).
  - Mevcut kürasyonlu `namaz-*`, `korunma-*`, `ismiazam-*`, `dua-*` (421 kayıt) alt-etiketlerini koru ve `verse_tags.alt_taglar` ile senkronize et; `dua-tevekkul` içindeki emir ayetlerini `tevekkul` altına taşı.
  - Tüm Seviye 1 (24) ve Seviye 2 (~140) kodları için `packages/types` içinde tek **TR + EN başlık ve açıklama sözlüğü** tanımla.

### B. Ölçekli Yeniden Doğrulama (Maliyet & Eşik)
- **Yöntem:** Bağlam pencereli (`±2` komşu ayet metni + sure adı) LLM yeniden etiketleme (Gemini 2.5 Flash veya Claude Haiku/Sonnet): kapalı Seviye-1 (24 + `NULL`) ve kapalı Seviye-2 (~140) whitelist'i ile; **parantez içi meal eklerine dayanma yasağı** ve **dini hassasiyet kuralı** (Allah'ın sıfatları, peygamberler, ibadet ve din mensuplarında şüphelide bırakma).
- **Maliyet / Efor:** 6.236 ayet / 25'li batch = ~250 çağrı → Flash ile **~$1–3** (~20 dk). Ardından hassas gruplardan (`A1`, `A3`, `B2`, `G2`) **~300 ayet** insan/alan kontrolü (~2–3 saat).
- **Kabul Eşiği:** Yeni 200 ayetlik katmanlı örneklemde **≥%90 `FIT`**, **≤%2 `WRONG`**; Allah/Peygamber/İbadet alt örneklemlerinde **%0 `WRONG`**.

### C. UI ve Offline Stratejisi
- **Ayet Ekranı (Mobil + Web):** Doğrulama eşiği geçilince `SHOW_THEME_TAGS = true`; hem TR hem EN kullanıcılara (`lang !== "en"` kısıtını kaldır) okunur başlıklarla göster, dokununca `/search?tag=` açsın.
- **"Konular / Topics" Ekranı & Arama:** Web `/discover` ve Mobil yeni/güncel "Konular" ekranı ortak taksonomiden beslensin; arama filtresi hem Seviye-1 hem Seviye-2 kodlarını kabul edip okunur başlık göstersin.
- **Offline (Mobil):** `apps/mobile/src/data/themeTaxonomy.json` (~10 KB, 24+140 TR/EN başlık) ve `verseThemes.json` (~250 KB, `verse_key -> [ana, alts]`) bundle edilsin; böylece Ayet kartı ve Konular listesi %100 offline çalışır, sayfalı ayet sonuçları için `/api/tags/filter` + 7 gün `AsyncStorage` cache korunur.

### D. Adım Adım Uygulama Görevleri

| # | Görev | Dokunulan Dosyalar | Test & Doğrulama | Kabul Kriteri |
|---|---|---|---|---|
| 1 | **Ortak TR/EN Taksonomi Sözlüğü** | `packages/types/src/themes.ts` (yeni), `apps/mobile/src/i18n/strings/tagLabels.ts` | Unit test: tüm 24+140 kodda TR/EN başlık eksiksiz | `DiscoverContent`, Web & Mobil aynı sözlüğü import eder; `C4` ASCII uyumlu |
| 2 | **DB Şema & Senkron Temizliği** | `scripts/clean_theme_tags.py` (yeni), `data/app.db` | SQL check: `verse_tag_items` ≡ `verse_tags.alt_taglar` | 0 drift, 0 ASCII/diacritic ikizi, `<3` ayetli gürültü yok |
| 3 | **Bağlamlı LLM Yeniden Etiketleme + Spot-Check** | `scripts/relabel_themes.py` (yeni), `data/app.db` → Turso sync | 200 ayetlik kör örneklem denetimi | ≥%90 `FIT`, ≤%2 `WRONG`, hassas sınıflarda %0 `WRONG` |
| 4 | **Web & API Güncellemesi** | `apps/web/src/app/discover/DiscoverContent.tsx`, `.../ayah/[ayahNumber]/page.tsx`, `api/tags/filter/route.ts` | `next build` + `/discover`, `/search?tag=` smoke | Dinamik ayet sayıları, okunur TR/EN başlıklar, kırık `C4` linki yok |
| 5 | **Mobil Offline Bundle** | `scripts/build-mobile-themes.mjs` (yeni), `apps/mobile/src/data/themeTaxonomy.json`, `verseThemes.json` | Jest/node script: 6.236 ayet key kontrolü | Uçak modunda Ayet ekranı etiketleri ve Konular listesi açılır |
| 6 | **Mobil Ayet Kartı & Arama Başlıkları** | `apps/mobile/app/ayah/[surahId]/[ayahNumber].tsx`, `apps/mobile/app/search.tsx` | Expo typecheck + TR/EN ekran kontrolü | `SHOW_THEME_TAGS = true`, ham kod yerine TR/EN başlık, tag araması çalışır |
| 7 | **Mobil "Konular / Topics" Ekranı** | `apps/mobile/app/konular.tsx` (yeni), `apps/mobile/app/(tabs)/ogren.tsx` | Manuel akış: Konular → Kategori → Ayet listesi | 24 ana tema + popüler alt konular TR/EN gezilebilir |
