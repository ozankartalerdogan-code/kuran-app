# Checkpoint — 2026-05-19

Mod: DENGELİ

---

## 1. Tamamlanan İşler

### Veritabanı Konsolidasyonu
- `data/app.db` oluşturuldu — `kuran.db` ve `kuran_core.db` birleştirildi
- `kuran.db` kaynaklı: `sureler`, `morfoloji`, `ayet_fts` (FTS5)
- `kuran_core.db` kaynaklı: `verses`, `words`, `translations`, `fidelity_signals`, `context_notes`, `root_meanings`
- Tüm kod `kuran.db` → `app.db`, `kuran_core.db` → `app.db` olarak güncellendi

### v4 Anlam Import'u
- `canonical_word_analysis_v4.json` → `app.db/words.meaning_tr` aktarımı
- 15.537 boş kayıttan 13.468'i v4 verisiyle dolduruldu
- Hâlâ boş: 2.069 (doğası gereği anlamsız: partikel, zamir ekleri)
- `idx_words_lookup` index'i `words(verse_key, word_index)` üzerine eklendi

### JSON → SQLite Geçişi

| Adapter | Önceki | Sonraki |
|---|---|---|
| `canonicalWordAnalysisAdapter.ts` | `canonical_word_analysis.json` (68 MB, eager load) | `app.db/words` (singleton DB bağlantısı) |
| `kuranSorguMorphologyAdapter.ts` | `kuran.db` (per-request open/close) | `app.db` (singleton bağlantı, per-request sorgu) |
| `coreDbVerseSource.ts` | `kuran_core.db` | `app.db` |
| `/api/search/route.ts` | `kuran.db` | `app.db` |

### v2/v3/v4 Lazy Loading
- `verseAnalysisContext.ts` içinde `canonical_word_analysis_v2/v3/v4.json` (73+71+71 = 215 MB) eager load'dan lazy load'a çevrildi
- Normal prod kullanımında bu üç dosya hiç yüklenmez

### Önbellekleme İyileştirmeleri
- `fidelityAdapter.ts`: 153 MB `index.json` için `array.find()` → pre-indexed `Map` (O(n) → O(1))
- `wordAnalysisAdapter.ts`: 6 MB morphology.txt her çağrıda parse → module-level Map index
- Toplam kaldırılan eager JSON yükü: **~283 MB** (v2/v3/v4 lazy + canonical adapter geçişi)

### Test Altyapısı
- `verseAnalysisQualitySet.test.ts` — 27 ayet, `node:test` ile bağlandı
- **28/28 test** sürekli geçiyor
- 27 test case + 1 suite = toplam 28

---

## 2. Değişen Ana Dosyalar

| Dosya | Değişiklik |
|---|---|
| `packages/core/src/adapters/canonicalWordAnalysisAdapter.ts` | JSON okuma tamamen kaldırıldı; DB singleton + per-query |
| `packages/core/src/adapters/kuranSorguMorphologyAdapter.ts` | Preload Map kaldırıldı; singleton bağlantı + per-request sorgu |
| `packages/core/src/adapters/fidelityAdapter.ts` | `find()` → pre-indexed Map |
| `packages/core/src/adapters/wordAnalysisAdapter.ts` | Per-call parse → module-level Map index |
| `packages/core/src/analysis/verseAnalysisContext.ts` | v2/v3/v4 eager → lazy; morfoloji fallback eklendi |
| `packages/core/src/analysis/coreDbVerseSource.ts` | `kuran_core.db` → `app.db` |
| `apps/web/src/app/api/search/route.ts` | `kuran.db` → `app.db`; FTS + sure araması |
| `apps/web/src/app/components/SearchBar.tsx` | Dropdown sadeleşti; Enter → `/arama` |
| `apps/web/src/app/arama/page.tsx` | Yeni sayfa: sure eşleşmesi + FTS sonuçları |
| `apps/web/src/app/surah/page.tsx` | Yeni sayfa: 114 sure listesi |
| `apps/web/src/app/layout.tsx` | Global nav + SearchBar |
| `packages/core/src/analysis/verseAnalysisQualitySet.test.ts` | node:test ile bağlandı |
| `scripts/v4-import.mjs` | v4 anlam import aracı |
| `scripts/import-v4-to-appdb.py` | v4 import Python alternatifi |

---

## 3. app.db Tabloları ve Satır Sayıları

| Tablo | Satır | Kaynak | Amaç |
|---|---|---|---|
| `ayet_fts` | 6.236 | kuran.db | FTS5 full-text search (meal araması) |
| `ayetler` | — | kuran.db | FTS için kaynak *(app.db'de yok, sadece FTS var)* |
| `context_notes` | 12.472 | kuran_core.db | Tefsir + nüzul notları |
| `fidelity_signals` | 36.810 | kuran_core.db | Meal tutarlılık sinyalleri |
| `morfoloji` | 130.030 | kuran.db | Segment bazlı morfoloji (kök, lemma, tag) |
| `root_meanings` | 415 | kuran_core.db | Kök → Türkçe anlam sözlüğü |
| `sureler` | 114 | kuran.db | Sure adları (Türkçe/Arapça/transliterasyon) |
| `translations` | 229.085 | kuran_core.db | Çoklu meal kaynakları |
| `verses` | 6.236 | kuran_core.db | Ayet başına birleşik kayıt |
| `words` | 77.429 | kuran_core.db + v4 import | Kelime analizi (meaning_tr %97 dolu) |

**Index:** `idx_words_lookup` → `words(verse_key, word_index)`  
**Toplam DB boyutu:** 148.5 MB  

**words.meaning_tr doluluk:**
- Dolu: 75.360 (%97.3)
- Boş: 2.069 (%2.7 — partikel/zamir ekleri)

---

## 4. Kaldırılan JSON Bağımlılıkları

| Dosya | Boyut | Kaldırıldı |
|---|---|---|
| `canonical_word_analysis.json` | 68 MB | `canonicalWordAnalysisAdapter.ts` artık `app.db/words` kullanıyor |
| `canonical_word_analysis_v2.json` | 73 MB | Lazy load (prod'da hiç yüklenmiyor) |
| `canonical_word_analysis_v3.json` | 71 MB | Lazy load (prod'da hiç yüklenmiyor) |
| `canonical_word_analysis_v4.json` | 71 MB | Lazy load (prod'da hiç yüklenmiyor) |
| `quran-morphology.txt` (per-call parse) | 6 MB | Module-level Map'e dönüştürüldü |
| `fidelity/by-surah/index.json` (array.find) | 153 MB | Pre-indexed Map |

**Kaldırılan aktif yük:** ~283 MB eager JSON (v2/v3/v4) + canonical adapter JSON  
**Kaldırılan per-call işlem:** 130K satır DB açma/kapama, 6 MB text parse

---

## 5. Hâlâ JSON'dan Okunan Dosyalar

Tüm bu dosyalar `shared.ts`'nin `readJsonFile`/`readCachedFile` ile module-level cache'li okunuyor.

| Dosya | Boyut | Adapter | Amaç |
|---|---|---|---|
| `data/normalized/translations.json` | 57 MB | `translationAdapter.ts` | Meal verileri (Map indexli) |
| `data/normalized/arabic.json` | 1.9 MB | `quranAdapter.ts` | Arapça metin (Map indexli) |
| `data/normalized/surah-meta.json` | 35 KB | `quranAdapter.ts` | Sure meta verisi |
| `data/fidelity/by-surah/index.json` | 153 MB | `fidelityAdapter.ts` | Fidelity cache (Map indexli) |
| `data/meal-comparison/by-surah/*.json` | 153 MB | `mealComparisonAdapter.ts` | Meal karşılaştırma (114 dosya, per-file cache) |
| `data/revelation-context/surah/index.json` | 75 KB | `revelationContextAdapter.ts` | Nüzul bağlamı |
| `data/revelation-context/tdv-methodology.json` | 438 B | `tdvReferenceAdapter.ts` | TDV metodoloji |
| `data/word-analysis/word-translations-tr.json` | 20 KB | `wordAnalysisShared.ts` | Kelime anlamı sözlüğü |
| `data/word-analysis/extended-roots.json` | 465 B | `wordAnalysisShared.ts` | Genişletilmiş kök sözlüğü |
| `data/word-analysis/quran-morphology.txt` | 6 MB | `wordAnalysisAdapter.ts` | Legacy morfoloji (Map indexli) |
| `data/word-analysis/reports/coverage-by-ayah.json` | 957 KB | `verseAnalysisContext.ts` | Kapsama raporu (Map indexli) |
| `data/word-analysis/reports/missing-meanings.json` | 4 MB | `verseAnalysisContext.ts` | Eksik anlam raporu (Map indexli) |
| `data2/processed/root_explanations_tr_v2_easy_only.json` | 200 KB | `canonicalWordAnalysisAdapter.ts` | Kök açıklamaları (Map) |
| `canonical_word_analysis.json` (v1) | 68 MB | `verseAnalysisContext.ts` | Analiz motoru wordByWord (eager, v1 prod) |

**En büyük kalan JSON yükleri:**
- `fidelity/by-surah/index.json`: 153 MB → DB'ye geçiş adayı
- `meal-comparison/by-surah/`: 153 MB → DB'ye geçiş adayı
- `translations.json`: 57 MB → `app.db/translations` zaten var
- `canonical_word_analysis.json` (v1): 68 MB → `verseAnalysisContext.ts`'te analiz motoru için kullanılıyor

---

## 6. Sonraki Adım: Fidelity + Meal-Comparison DB Geçişi

### Öncelikli Hedefler

**A. `fidelity/by-surah/index.json` (153 MB) → `app.db/fidelity_signals`**

`app.db`'de zaten `fidelity_signals` tablosu var (36.810 satır, `kuran_core.db`'den geldi). Yapılacak:
1. `fidelityAdapter.ts`'i `fidelity_signals` tablosunu kullanacak şekilde güncelle
2. `index.json` yüklemesini kaldır
3. Taşınacak veri: `fidelity_signals` tablosundaki `signal_type`, `confidence`, `note`, `raw_json` alanları

**B. `meal-comparison/by-surah/*.json` (153 MB, 114 dosya) → `app.db/translations`**

`app.db`'de zaten `translations` tablosu var (229.085 satır). Meal karşılaştırma verisi farklı formatta ama büyük ölçüde örtüşüyor. Yapılacak:
1. `meal-comparison` JSON yapısını `translations` tablosuyla eşleştir
2. Gerekirse `app.db`'ye `meal_comparison` tablosu ekle
3. `mealComparisonAdapter.ts`'i DB'ye geçir

**C. `translations.json` (57 MB) → `app.db/translations`**

`app.db/translations` tablosu zaten var (229.085 satır, aynı veri). Yapılacak:
1. `translationAdapter.ts`'i `app.db/translations` kullanacak şekilde güncelle
2. 57 MB JSON yüklemeyi kaldır
3. `verse_key` ile `source` kombinasyonu üzerine index ekle

**Beklenen Kazanım**

| Adım | Kaldırılacak Yük |
|---|---|
| fidelity JSON geçişi | 153 MB |
| meal-comparison JSON geçişi | 153 MB |
| translations JSON geçişi | 57 MB |
| **Toplam** | **363 MB** |

Bu üç geçiş tamamlanırsa startup'ta yüklenen JSON miktarı mevcut ~450 MB'dan (arabicIndex + fidelity + meal-comparison + translations) ~100 MB'ın altına düşer.
