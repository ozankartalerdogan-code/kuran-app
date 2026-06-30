# Kod Denetim Bulguları (Birleşik Liste)

Tarih: 2026-06-30 · Kaynak: mimari inceleme + 32 maddelik kod yazım kuralları taraması
Durum işaretleri: ⬜ açık · 🔧 üzerinde çalışılıyor · ✅ çözüldü

İki typecheck de geçiyor (web + mobil, exit 0). Aşağıdakiler kalan bulgular.

---

## 🔴 Yüksek öncelik

### 1. Veri kaynağı belirsizliği (bundle vs Turso) ✅
- **Kural:** 29
- **Dosya:** `apps/web/src/lib/dbUtils.ts`
- **Sorun:** `resolveBundlePath()` ile bundle→turso→local fallback kodu hâlâ duruyor. Yanlış bir `app_bundle.db` Turso'yu sessizce baypas edip bayat veri okutabilir.
- **Çözüm:** `/api/version`'dan `source: turso` doğrula; bundle yolu kullanılmıyorsa kodu sil.

### 2. Locale'siz büyük/küçük harf — Türkçe İ/i tuzağı ✅
- **Kural:** 27
- **Dosya:** 23 yer. Kritik olanlar: `app/root/index.tsx:95` (arama sorgusu), `app/hadisler.tsx:84` (koleksiyon eşleştirme), `app/ayah/[surahId]/[ayahNumber].tsx:73,77` (POS map)
- **Sorun:** `"İ".toLowerCase()` doğru sonuç vermez → arama/eşleştirme kaçar.
- **Çözüm:** Eşleştirme/aramada `toLocaleLowerCase("tr-TR")` veya collator.

### 3. Fetch race + cleanup yok ✅
- **Kural:** 6, 7
- **Dosya:** `apps/web/.../favoriler/FavorilerClient.tsx`, `apps/web/.../notlarim/NotlarimClient.tsx`; mobilde 54 useEffect → yalnız 18 cleanup
- **Sorun:** `fetch` var ama `AbortController`/cleanup yok → unmount sonrası state, race riski. `api.ts` `signal` destekliyor ama ekranların çoğu geçmiyor.
- **Çözüm:** Web client'larda AbortController + cleanup; mobil fetch'lere `signal` geçir.

### 4. `as any` kullanımı ✅ (dış veri düzeltildi; router workaround bilinçli bırakıldı)
- **Kural:** 3, 17, 23
- **Dosya / kırılım:**
  - Dış veriye `as any` (kritik): `namaz-rehberi.tsx:426` `ozelRaw as any`, `peygamber-kissalari.tsx:10` `rawData as any`, `dersler/[dersId].tsx:64` `normalizeQuizSorular(raw: any[])`
  - `router.push(... as any)` ×24 (Expo Router typed-routes workaround — pragmatik)
- **Çözüm:** Dış veri için tip + doğrulama/fallback. Router için typed-route helper.

---

## 🟡 Orta öncelik

### 5. Accessibility eksik ✅ (~30 ekran; accessibilityRole/Label/State eklendi)
- **Kural:** 14
- **Dosya:** 42 dosyada dokunulabilir öğe, yalnız 15'inde `accessibilityRole/Label` → ~27 ekran a11y'siz
- **Çözüm:** Buton/kart/favori/quiz öğelerine `accessibilityRole` + `accessibilityLabel`.

### 6. Test kapsamı çok düşük ⬜
- **Kural:** 18, 31
- **Durum:** Sadece 3 test dosyası. Favori/not/arama testsiz; quiz bütünlüğü kapsanmıyor.
- **Çözüm:** Kritik akışlar için smoke test; quiz veri bütünlüğü testi.

### 7. `ensureTursoIndexes` yol kırılganlığı ⬜
- **Kural:** 29
- **Dosya:** `apps/web/src/lib/dbUtils.ts`
- **Sorun:** `process.cwd()` bağımlı göreli yolla `indexes.sql` okuyor; bulamazsa sadece `warn` → sessiz yavaşlama.
- **Çözüm:** Canlı logda index'lerin uygulandığını doğrula.

### 8. Büyük dosyalar (bakım/regresyon riski) ⬜
- **Kural:** 8, 21
- **Dosya:** `surah/.../ayah/[ayahNumber]/page.tsx` (1568), `app/ayah/.../[ayahNumber].tsx` (1147), `ogren/OgrenClient.tsx` (1028)
- **Çözüm:** Yalnızca okunabilirliği artırıyorsa küçük parçalara ayır (madde 2/8 — zorlama yok).

### 9. Favori/Not senkron modeli net değil ⬜
- **Kural:** mimari/UX
- **Sorun:** Auth yok; favori/not cihaz-yerel (mobil AsyncStorage, web localStorage). Web↔mobil senkron YOK.
- **Çözüm:** "Her yerde aynı" bekleniyorsa eksik; yerel-only ise bilinçli karar olarak not düş.

---

## 🟢 Düşük / kozmetik

### 10. BOM'lu dosyalar ⬜
- **Kural:** 27
- **Dosya:** `apps/mobile/src/hooks/useFavorites.ts`, `apps/web/src/app/api/favorites-verses/route.ts`
- **Çözüm:** BOM'suz UTF-8 kaydet.

### 11. Çalışma dizini kirli ⬜
- **Kural:** 30
- **Dosya:** `._ob.db-shm`, `test_gtts.mp3`, `api_test.py`, `.tmp-*.log` kökte (gitignore'da, commit'li değil)
- **Çözüm:** Geçici dosyaları temizle.

---

## ✅ Kurala uygun (sorun yok, referans için)
- Typecheck (web+mobil) geçiyor — madde 22
- SQL tamamen parametreli; FTS `escapeFts`, ayah route int doğruluyor — madde 26/29
- Commit'li secret/`.env` yok — madde 26
- `dangerouslySetInnerHTML` yalnız sabit script (gece modu + SW temizleme) — madde 26
- React sürümü izole: web 18.3.1 / mobil 19.2.3 — madde 32
- Sessiz `catch{}` yok; hepsinde fallback/comment — madde 11
