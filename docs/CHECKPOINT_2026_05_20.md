# Checkpoint — 2026-05-20

Mod: DENGELİ

---

## 1. Tamamlanan İşler

### Yeni Tablolar — app.db

| Tablo | Satır | Kaynak |
|---|---|---|
| `fidelity_comparisons` | 229.085 | `data/fidelity/by-surah/index.json` |
| `meal_comparisons` | 229.085 | `data/meal-comparison/by-surah/*.json` (114 dosya) |
| `root_meanings` (genişletildi) | 1.109 (+694 yeni, +39 güncelleme) | `root_explanations_review_batch_733_FINAL.csv` |

### JSON → SQLite Geçişi (Runtime Adapter'lar)

| Adapter | Önceki | Sonraki |
|---|---|---|
| `fidelityAdapter.ts` | `fidelity/by-surah/index.json` (153 MB, startup'ta Map'e yükleniyor) | `app.db/fidelity_comparisons` (singleton DB, per-request sorgu) |
| `mealComparisonAdapter.ts` | `meal-comparison/by-surah/{surah}.json` (per-surah JSON read + cache) | `app.db/meal_comparisons` (singleton DB, per-request sorgu) |

Singleton DB bağlantısı `packages/core/src/adapters/appDb.ts` modülüne taşındı.

### Şema Değişiklikleri

- `words` tablosuna `role TEXT` kolonu eklendi; `canonical_word_analysis.json` v1'den 77.424 kayıt güncellendi (5 NULL kaldı — kaynak veride de boş)
- `translations` tablosuna `idx_trans_verse_key` ve `UNIQUE idx_trans_uniq(verse_key, source)` index'leri eklendi (önceden hiç index yoktu, 229.085 satır full scan)
- `root_meanings` tablosuna `short_tr TEXT`, `summary_tr TEXT` kolonları ve `idx_root_meanings_root` index'i eklendi

### Import Scriptleri (scripts/)

| Script | İşlev |
|---|---|
| `import-fidelity-to-appdb.py` | `fidelity/by-surah/index.json` → `fidelity_comparisons` |
| `import-meal-comparison-to-appdb.py` | `meal-comparison/by-surah/*.json` → `meal_comparisons` |
| `add-role-to-words.py` | `canonical_word_analysis.json` v1 → `words.role` |
| `import-root-explanations-733.py` | 733 kök açıklaması → `root_meanings` |

### Test Durumu

```
typecheck @quran-app/web   ✔
typecheck @quran-app/core  ✔
test @quran-app/core       ✔  28/28 pass
```

---

## 2. app.db Mevcut Durum

**Boyut:** 294 MB  
**DB Path:** `data/app.db`

### Tablolar

| Tablo | Satır | Kolonlar |
|---|---|---|
| `verses` | 6.236 | `verse_key, surah_id, ayah_number, arabic_text, primary_translation` |
| `words` | 77.429 | `id, verse_key, word_index, segment_index, arabic, root, lemma, pos, morphology, meaning_tr, gloss_en, confidence, source, role` |
| `translations` | 229.085 | `id, verse_key, source, text` |
| `fidelity_comparisons` | 229.085 | `id, verse_key, surah_id, ayah_number, source_name, text, source_url, status, ayah_status` |
| `meal_comparisons` | 229.085 | `id, verse_key, surah_id, ayah_number, source_name, text, source_url, status, ayah_status` |
| `fidelity_signals` | 36.810 | `id, verse_key, word_index, root, lemma, signal_type, label_tr, confidence, note, raw_json` |
| `root_meanings` | 1.109 | `id, root, meaning_tr, source, short_tr, summary_tr` |
| `context_notes` | 12.472 | `id, verse_key, scope, type, source, text` |
| `morfoloji` | 130.030 | `sure, ayet, kelime_sira, segment, arapca, tag, kok, lemma, features` |
| `sureler` | 114 | `id, adi_arapca, translit, adi_turkce, tur, ayet_sayisi` |
| `ayet_fts` (FTS5) | — | tam metin arama |

### Indexler

| Index | Tablo | Tip |
|---|---|---|
| `idx_words_lookup` | `words(verse_key, word_index)` | normal |
| `idx_words_role` | `words(role)` | normal |
| `idx_trans_verse_key` | `translations(verse_key)` | normal |
| `idx_trans_uniq` | `translations(verse_key, source)` | UNIQUE |
| `idx_fc_verse_key` | `fidelity_comparisons(verse_key)` | normal |
| `idx_fc_source_name` | `fidelity_comparisons(source_name)` | normal |
| `idx_fc_uniq` | `fidelity_comparisons(verse_key, source_name)` | UNIQUE |
| `idx_mc_verse_key` | `meal_comparisons(verse_key)` | normal |
| `idx_mc_source_name` | `meal_comparisons(source_name)` | normal |
| `idx_mc_uniq` | `meal_comparisons(verse_key, source_name)` | UNIQUE |
| `idx_root_meanings_root` | `root_meanings(root)` | normal |

---

## 3. Kaldırılan JSON Bağımlılıkları

Aşağıdaki JSON dosyaları artık runtime adapter'lar tarafından okunmuyor; veriler `app.db`'de:

| Dosya | Boyut | Durum |
|---|---|---|
| `data/fidelity/by-surah/index.json` | 153.7 MB | `fidelityAdapter.ts` artık DB'den okuyor. Pipeline scriptleri hâlâ okur. |
| `data/meal-comparison/by-surah/*.json` | 153.7 MB (114 dosya) | `mealComparisonAdapter.ts` artık DB'den okuyor. Pipeline scriptleri hâlâ okur. |
| `data/normalized/translations.json` | ~40 MB | `translations` tablosunda mevcut (229.085 satır, 37 kaynak). `translationAdapter.ts` hâlâ JSON okuyor. |

---

## 4. Hâlâ JSON'dan Okunan Dosyalar

### Runtime (her istekte okunan):

| Dosya | Adapter / Kod | Not |
|---|---|---|
| `data/normalized/arabic.json` | `quranAdapter.ts` | — |
| `data/normalized/surah-meta.json` | `quranAdapter.ts` | — |
| `data/normalized/translations.json` | `translationAdapter.ts` | DB'de de mevcut; geçiş yapılabilir |
| `data/normalized/tafsir.json` | `tafsirAdapter.ts` | — |
| `data/tafsir/surah/index.json` | `tafsirAdapter.ts` | — |
| `data/tafsir/ayah-ranges/index.json` | `tafsirAdapter.ts` | — |
| `data/revelation-context/surah/index.json` | `revelationContextAdapter.ts` | — |
| `data/word-analysis/quran-morphology.txt` | `wordAnalysisAdapter.ts` | — |
| `data/word-analysis/word-translations-tr.json` | `wordAnalysisAdapter.ts` | — |
| `data/word-analysis/extended-roots.json` | `wordAnalysisAdapter.ts` | — |
| `data/word-analysis/reports/coverage-by-ayah.json` | `verseAnalysisContext.ts` | — |
| `data/word-analysis/reports/missing-meanings.json` | `verseAnalysisContext.ts` | — |
| `data/source-metadata/github-sources.json` | `githubSourceAdapter.ts` | — |
| `data/context/normalized/surah-context.json` | `surahContextAdapter.ts` | — |
| `data2/processed/canonical_word_analysis.json` | `verseAnalysisContext.ts` (default) | 68 MB — DB geçişi öncelikli aday |
| `data2/processed/canonical_word_analysis_v{2,3,4}.json` | `verseAnalysisContext.ts` (debug/audit) | Lazy load — sadece debug'da |
| `data2/processed/root_explanations_tr_v2_easy_only.json` | `canonicalWordAnalysisAdapter.ts` | — |

### Diğer DB'ler (runtime):

| Dosya | Kullanım |
|---|---|
| `data/kuran.db` | `apps/web/arama` sayfası (FTS arama) |
| `data/kuran_core.db` | `coreDb` modu (`verseAnalysisContext.ts`) |

---

## 5. Silme Bekleyen Dosyalar (Güvenli Liste)

Aşağıdaki dosya ve dizinler hiçbir runtime ya da pipeline kodunda referans edilmiyor; yeniden üretilebilir veya kullanım dışı:

| Yol | Boyut | Silme Sebebi |
|---|---|---|
| `data/kuran_sorgu.db` | 0 B | Sıfır byte, referans yok |
| `data/analysis-audit/` (4 dosya) | 8.4 MB | Script çıktısı, yeniden üretilebilir |
| `data/analysis-snapshots/` (39 dosya) | ~10 MB | Snapshot çıktıları, runtime referansı yok¹ |
| `data2/processed/canonical_word_analysis_enriched.json` | 70.5 MB | Runtime'da okunmuyor; v1–v4 ayrı dosyalar var |
| `data2/processed/reports/` (3 dosya) | 43.7 MB | Script rapor çıktıları |
| `data2/processed/meaning_candidates_batch.json` | 783 KB | Import tamamlandı |
| `data2/quran-json/` (tüm dizin) | ~75 MB | Hiç kod referansı yok |
| `data2/QURAN-NLP/` (tüm dizin) | ~280 MB | Araştırma dataseti, uygulama kodu kullanmaz |
| `data2/quran-morphology/` | 6 MB | `data/word-analysis/quran-morphology.txt` zaten var |
| `data2/scripts/` | 44 KB | Proje scriptlerinden bağımsız |

> ¹ `data/analysis-snapshots/` altındaki 11 dosya audit scriptlerince input olarak okunuyor — bunlar risky listesinde kalır.

**Tahmini kazanılacak alan: ~500 MB**

---

## 6. Sonraki Adım

Öncelik sırasıyla:

1. **`translationAdapter.ts` → DB geçişi**  
   `data/normalized/translations.json` (~40 MB) hâlâ runtime'da okunuyor. `app.db/translations` tablosu hazır (229.085 satır, index var) — adapter geçişi düşük riskli.

2. **`canonical_word_analysis.json` (v1) → DB geçişi**  
   68 MB JSON her istekte eager load. `app.db/words` tablosu tüm v1 verisini içeriyor (`role` dahil, drift sıfır). Geçiş `fidelityAdapter` örneği izlenebilir.

3. **Güvenli silme işlemi**  
   §5'teki liste onaylandıktan sonra `~500 MB` temizleme. `data2/QURAN-NLP/` (~280 MB) ve `data2/quran-json/` (~75 MB) en büyük kazanım.

4. **`words.role` NULL 5 kayıt**  
   Tüm morfoloji kaynakları bu 5 kelime için eksik (huruf-u mukatta ve birleşik formlar). Kabul edilebilir veri boşluğu olarak işaretlenebilir.
