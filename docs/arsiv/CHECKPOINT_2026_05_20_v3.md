# Checkpoint — 2026-05-20 v3

Mod: DENGELİ

---

## 1. Tamamlanan İşler

### JSON → SQLite Geçişi (Runtime)

| Adapter | Önceki | Sonraki |
|---|---|---|
| `fidelityAdapter.ts` | `fidelity/by-surah/index.json` (153 MB eager) | `app.db/fidelity_comparisons` |
| `mealComparisonAdapter.ts` | `meal-comparison/by-surah/*.json` (114 dosya) | `app.db/meal_comparisons` |
| `verseAnalysisContext.ts` (v1) | `canonical_word_analysis.json` (68 MB eager) | `app.db/words` |
| `translationAdapter.ts` | `normalized/translations.json` — hâlâ JSON | — |

Singleton DB bağlantısı: `packages/core/src/adapters/appDb.ts`  
(`import.meta.url` + `path.resolve` ile proje köküne mutlak yol)

### Yeni Tablolar / Şema Değişiklikleri

| Değişiklik | Detay |
|---|---|
| `fidelity_comparisons` tablosu eklendi | 229.085 satır, 3 index |
| `meal_comparisons` tablosu eklendi | 229.085 satır, 3 index |
| `words.role` kolonu eklendi | 77.429 satır güncellendi (5 NULL→manuel dolduruldu) |
| `translations` tablosuna 2 index eklendi | `idx_trans_verse_key`, `UNIQUE idx_trans_uniq` |
| `root_meanings` tablosuna `short_tr`, `summary_tr` eklendi | — |
| `root_meanings` tablosuna index eklendi | `idx_root_meanings_root` |

### Kök Açıklamaları (root_meanings)

- `root_explanations_review_batch_733_FINAL.csv` → 694 yeni kök + 39 güncelleme
- `fill-root-explanations.ts` scripti Anthropic API ile 1.361 kök doldurdu
- `root_explanations_tr_v2_easy_only.json` → `app.db/root_meanings` import: 376 UPDATE + 721 INSERT
- Sonuç: `short_tr IS NULL` kalan sıfır

### Silinen Dosyalar

| Dosya | Boyut | Durum |
|---|---|---|
| `data2/QURAN-NLP/` | 270 MB | Silindi (yedek: data_backup/) |
| `data2/quran-json/` | 96 MB | Silindi |
| `data/kuran_sorgu.db` | 0 B | Silindi |
| `data2/processed/canonical_word_analysis.json` | 68 MB | Silindi (runtime'da artık okunmuyor) |
| **Toplam** | **~434 MB** | — |

### UI Değişiklikleri

- **Analiz sekmesi**: `SemanticSummaryCard` kaldırıldı (meal metnini tekrar gösteriyordu)
- **Analiz sekmesi**: `RawMeaningSummaryCard` eklendi — `ProvenAnalysisCard`'ın üstünde, kelime anlamlarını düz metin olarak birleştirip gösteriyor

### fill-root-explanations.ts Güncellemeleri

- Groq → Anthropic SDK'ya döndürüldü
- `canonical_word_analysis.json` okuma → `app.db/words` SQL sorgusuna geçirildi
- Rate limit: 200ms → 100ms
- Kök kaynağı: DB'den 1.660 benzersiz kök

### Test Durumu

```
typecheck @quran-app/web   ✔
typecheck @quran-app/core  ✔
test @quran-app/core       ✔  28/28 pass
```

---

## 2. app.db Durumu

**Boyut:** 294 MB · **Path:** `data/app.db`

| Tablo | Satır |
|---|---|
| `verses` | 6.236 |
| `words` | 77.429 |
| `translations` | 229.085 |
| `fidelity_comparisons` | 229.085 |
| `meal_comparisons` | 229.085 |
| `fidelity_signals` | 36.810 |
| `root_meanings` | 1.830 |
| `context_notes` | 12.472 |
| `morfoloji` | 130.030 |
| `sureler` | 114 |
| `ayet_fts` (FTS5) | — |

**Indexler (11 adet):** `idx_words_lookup`, `idx_words_role`, `idx_trans_verse_key`, `idx_trans_uniq`, `idx_fc_verse_key`, `idx_fc_source_name`, `idx_fc_uniq`, `idx_mc_verse_key`, `idx_mc_source_name`, `idx_mc_uniq`, `idx_root_meanings_root`

---

## 3. Analiz Motoru V1 Durumu

### Veri akışı (runtime)

```
istek → verseAnalysisContext.ts
  ├── words tablosu (DB)        ← canonical word analysis [v1 JSON kaldırıldı]
  ├── meal_comparisons (DB)     ← meal adapter [JSON kaldırıldı]
  ├── fidelity_comparisons (DB) ← fidelity adapter [JSON kaldırıldı]
  ├── root_meanings (DB)        ← short_tr + summary_tr artık DB'de
  ├── normalized/arabic.json    ← hâlâ JSON
  ├── normalized/translations.json ← hâlâ JSON
  ├── tafsir/**.json            ← hâlâ JSON
  └── revelation-context/**.json ← hâlâ JSON
```

### words tablosu doluluk

| Alan | Dolu | Oran |
|---|---|---|
| `meaning_tr` | 75.360 | %97.3 |
| `role` | 77.429 | %100 |
| `root` | 50.336 | %65.0 |
| `lemma` | 74.141 | %95.8 |
| `gloss_en` | 53.918 | %69.6 |

`meaning_tr` NULL kalan 2.069 kelime yapısal eksiklik (zamir/edat ekleri, huruf-u mukatta) — kaynak veride de boş.

### root_meanings doluluk

| Alan | Dolu |
|---|---|
| `meaning_tr` | Kısmi (~415 orijinal kayıt) |
| `short_tr` | **1.830 / 1.830** (%100) |
| `summary_tr` | 733 (manuel incelenmiş) |

---

## 4. Sonraki Adım: AI Kısa Anlam Özeti Üretimi

### Hedef

Analiz sekmesinde şu an "Ham Anlam Özeti" bölümü kelimeleri düz birleştirerek gösteriyor. Bir sonraki adım bu ham çıktıdan **anlamlı, Türkçe özet bir cümle** üretmek:

> _"Rahman ve Rahim olan Allah'ın adıyla, kulları için rahmeti sonsuz olan…"_

### Önerilen yaklaşım

1. `wordByWord` kelime anlamlarını ve `mealComparison` verisini input olarak al
2. Kısa Türkçe özet cümle üret (Claude Haiku ile, max 60 token)
3. Üretilen özeti `context_notes` tablosuna `type='ai_meaning_summary'` olarak yaz (önbellek)
4. İkinci çağrıda DB'den oku, API çağrısı yapma

### Gereksinimler

- `context_notes` tablosu hazır (12.472 satır, `verse_key`, `type`, `text` alanları mevcut)
- Anthropic API key `.env.local`'da mevcut
- Rate limit: ayet başına tek çağrı + DB cache → production'da sıfır API maliyeti

### Kapsam dışı

- Büyük dil modeli fine-tuning
- Real-time streaming
- Kullanıcı bazlı cache
