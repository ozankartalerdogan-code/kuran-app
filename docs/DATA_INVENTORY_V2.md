# Veri Envanteri — DATA_INVENTORY_V2

Tarih: 2026-05-18  
Kapsam: `data/` ve `data2/` dizinlerinin tamamı

---

## Özet

| Dizin | Dosya sayısı | Toplam boyut |
|---|---|---|
| `data/` | ~11.482 | ~1.8 GB (aktif dosyalar) |
| `data2/` | ~15.330 | ~2.4 GB |
| **Toplam** | **~26.812** | **~4.15 GB** |

---

## data/ — Ana Veri Dizini

### Veritabanları

#### `data/kuran.db` — 26.2 MB — SQLite
Arama ve morfoloji için kullanılan ana SQLite veritabanı. FTS5 full-text search içerir.

| Tablo | Satır | Alanlar |
|---|---|---|
| `sureler` | 114 | id, adi_arapca, translit, adi_turkce, tur, ayet_sayisi |
| `ayetler` | 6.236 | sure, ayet, arapca, diyanet, bulac, elmalili, diyanet_isleri, diyanet_vakfi |
| `ayet_fts` | 6.236 | sure, ayet, diyanet, bulac, elmalili, diyanet_isleri, diyanet_vakfi *(FTS5 virtual table)* |
| `morfoloji` | 130.030 | sure, ayet, kelime_sira, segment, arapca, tag, kok, lemma, features |

**Kullanım:** `/api/search/route.ts` (FTS arama), `kuranSorguMorphologyAdapter.ts` (morfoloji).

---

#### `data/kuran_core.db` — 198.2 MB — SQLite
Analiz motoru için birleşik veri tabanı. `buildVerseAnalysisContext()` tarafından kullanılır.

| Tablo | Satır | Alanlar |
|---|---|---|
| `verses` | 6.236 | verse_key, surah_id, ayah_number, arabic_text, primary_translation |
| `translations` | 229.085 | id, verse_key, source, text *(çoklu meal kaynağı)* |
| `words` | 77.429 | id, verse_key, word_index, segment_index, arabic, root, lemma, pos, morphology, meaning_tr, gloss_en, confidence, source |
| `root_meanings` | 415 | id, root, meaning_tr, source |
| `translation_comparison` | 229.085 | id, verse_key, source, normalized_text, raw_json |
| `fidelity_signals` | 36.810 | id, verse_key, word_index, root, lemma, signal_type, label_tr, confidence, note, raw_json |
| `context_notes` | 12.472 | id, verse_key, scope, type, source, text |
| `build_meta` | 22 | key, value |

**Not:** `translations.text` alanında encoding sorunu mevcut (`ı` → `1` benzeri). `words.meaning_tr` temiz Türkçe içerir.

---

#### `data/kuran_sorgu.db` — 0 B — SQLite
**Boş.** Tablo içermiyor. Referans olarak tutuluyor; aktif değil.

---

### `data/normalized/` — Normalize Edilmiş Temel Veriler

#### `data/normalized/arabic.json` — 1.9 MB — JSON
**6.236 kayıt** — tüm Kuran ayetlerinin Arapça metni.

| Alan | Tip | Açıklama |
|---|---|---|
| surahId | number | Sure numarası (1–114) |
| ayahNumber | number | Ayet numarası |
| arabicText | string | Unicode Arapça metin |
| status | string | available / missing |

**Kullanım:** `quranAdapter.ts` — `arabicIndexPromise` (module-level Map cache).

---

#### `data/normalized/surah-meta.json` — 35 KB — JSON
**114 kayıt** — sure meta verileri.

| Alan | Tip | Açıklama |
|---|---|---|
| surahId | number | 1–114 |
| turkishName | string | Türkçe ad (ör. "Fâtiha") |
| arabicName | string | Arapça ad (ör. "الفاتحة") |
| revelationType | string | mekki / medeni |
| revelationOrder | number | Nüzul sırası |
| verseCount | number | Ayet sayısı |
| transliteration | string\|null | Latin transkripsiyonu |

---

#### `data/normalized/translations.json` — 57.1 MB — JSON
**6.236 kayıt** — tüm sure/ayet çiftleri için çoklu meal.

| Alan | Tip | Açıklama |
|---|---|---|
| surahId / ayahNumber | number | Konum |
| translations | array | Kaynak + metin çiftleri (diyanet, hayrat, yazir, vb.) |
| transliteration | string\|null | Okunuş |
| transliterationStatus | string | available / missing |

**Kullanım:** `translationAdapter.ts` — `translationIndexPromise` (module-level Map).

---

### `data/word-analysis/` — Kelime Analizi Kaynakları

#### `data/word-analysis/quran-morphology.txt` — 6.0 MB — TXT
**130.030 satır** — tab-separated morfoloji verisi (Kuran morphology corpus).

Format: `sure:ayet:kelime:segment TAB arapca TAB pos TAB özellikler`  
Özellikler `|` ile ayrılmış: `ROOT:xxx`, `LEM:xxx`, `PRON`, `VF:1`, vb.

**Kullanım:** `wordAnalysisAdapter.ts` — pre-indexed Map (module-level).

---

#### `data/word-analysis/word-translations-tr.json` — 20 KB — JSON
**dict, 2 ana anahtar:** `translations` ve `rootMeanings`

- `translations`: lemma/kök → Türkçe anlam sözlüğü
- `rootMeanings`: kök → anlam sözlüğü

**Kullanım:** `wordAnalysisShared.ts` — `wordTranslationLookupPromise`.

---

#### `data/word-analysis/extended-roots.json` — 465 B — JSON
**9 kayıt** — genişletilmiş kök açıklamaları (صلو, كتب, سلم, رحم, عبد, حمد, vb.).

---

#### `data/word-analysis/reports/coverage-by-ayah.json` — 957 KB — JSON
**6.236 kayıt** — ayet başına kelime analizi kapsama raporu.

| Alan | Açıklama |
|---|---|
| surahId, ayahNumber | Konum |
| totalWords | Toplam kelime sayısı |
| matchedWords | Eşleşen kelime sayısı |
| coverageRatio | 0.0–1.0 oran |
| hasMorphology | Morfoloji mevcut mu |

---

#### `data/word-analysis/reports/missing-meanings.json` — 4.0 MB — JSON
**24.338 kayıt** — anlam bulunamayan kelimeler.

| Alan | Açıklama |
|---|---|
| surahId, ayahNumber, wordIndex | Konum |
| lemma, root, arabic | Kelime bilgisi |
| reason | matching_gap / source_unavailable |

---

### `data/fidelity/`

#### `data/fidelity/by-surah/index.json` — 153.7 MB — JSON
**6.236 kayıt** — ayet başına meal tutarlılık (fidelity) analizi. Tüm Kuran.

| Alan | Açıklama |
|---|---|
| surahId, ayahNumber | Konum |
| status | available / missing / insufficient_data |
| comparisons | Meal kaynakları arası karşılaştırma dizisi |
| sources | Kaynak meta verileri |

**Not:** 153 MB büyük tek dosya. `fidelityAdapter.ts` içinde pre-indexed Map olarak yüklenir.

---

### `data/meal-comparison/by-surah/` — 153.7 MB toplam — JSON (114 dosya)
Sure başına bölünmüş meal karşılaştırma verisi (`001.json` … `114.json`).

Her dosya ayet başına kayıtlar içerir:

| Alan | Açıklama |
|---|---|
| surahId, ayahNumber | Konum |
| entries | Kaynak-metin çiftleri dizisi |
| status | available / insufficient_data |
| sources | Kaynak referansları |

**Kullanım:** `mealComparisonAdapter.ts` — sure başına `readJsonFile` cache.

---

### `data/revelation-context/`

#### `data/revelation-context/surah/index.json` — 75 KB — JSON
**114 kayıt** — sure başına nüzul bağlamı.

| Alan | Açıklama |
|---|---|
| surahId | Sure no |
| revelationType | mekki / medeni |
| revelationOrder | Nüzul sırası |
| summary | Türkçe özet metin |
| status | available / missing |

---

#### `data/revelation-context/tdv-methodology.json` — 438 B — JSON
**1 kayıt** — TDV metodoloji referansı (topic: "esbab_i_nuzul").

---

### `data/tafsir/`

#### `data/tafsir/ayah-ranges/index.json` — 2 B — JSON
**Boş dizi `[]`.** Tefsir veri seti henüz doldurulmamış; `parked` durumda.

---

### `data/context/normalized/`

#### `data/context/normalized/surah-context.json` — 40 KB — JSON
**114 kayıt** — Quran Foundation kaynaklı sure bağlam verileri.

| Alan | Açıklama |
|---|---|
| surahId | Sure no |
| revelationPlace | Mekke / Medine |
| revelationOrder | Nüzul sırası |
| shortIntroduction | Kısa Türkçe tanıtım |
| source | Kaynak referansı |

---

### `data/curation/` — Manuel Kürasyon Verileri

| Dosya | Format | Boyut | Kayıt | Açıklama |
|---|---|---|---|---|
| `ayah_curation_overlay_400_candidates.csv` | CSV | 491 KB | 400 | Profil/terim çakışması olan aday ayetler |
| `ayah_curation_overlay_approved_pilot_100.csv` | CSV | 123 KB | 100 | Onaylanmış pilot kürasyon seti |
| `ayah_curation_overlay_first400_curated_*.csv` | CSV | ~475 KB | 400 | v1/v2/v3 kürasyon geçmişi |
| `ayah_curation_overlay_manual_review_pool.csv` | CSV | 29 KB | ~200 | Manuel inceleme bekleyenler |

CSV kolonları (ortak): `verseKey`, `surahId`, `ayahNumber`, `currentProfile`, `primaryTranslation`, `requiredConcepts`, `suppressedTerms`, `profileBoundTerms`

---

### `data/analysis-audit/` — Motor Denetim Raporları

| Dosya | Boyut | Açıklama |
|---|---|---|
| `analysis-engine-v1-audit.json` | 2.7 MB | Motor çıktısı; metadata, totals, themes, combinations, summaries, participants |
| `analysis-engine-v1-sources-audit.json` | 5.7 MB | Kaynak kalitesi; metadata, totals, themeSources, participantSources, summaries, suspicious |
| `analysis-engine-v1-audit-summary.md` | 27 KB | İnsan okunabilir denetim özeti |
| `analysis-engine-v1-sources-audit-summary.md` | 19 KB | Kaynak denetim özeti |

---

### `data/analysis-snapshots/` — Anlık Görüntüler ve Audit Çıktıları

40+ dosya — geliştirme sürecindeki anlık analiz çıktıları. Aktif kod tarafından okunmaz; tarihsel referans.

Öne çıkan dosyalar:

| Dosya | Boyut | Açıklama |
|---|---|---|
| `vnext-evidence-layer.sample.json` | 1.6 MB | Evidence katmanı örnek çıktısı |
| `vnext-evidence-layer.v2-sources.sample.json` | 2.4 MB | v2 kaynak evidence örneği |
| `vnext-structured-classifier-audit.json` | 916 KB | Yapılandırılmış sınıflandırıcı denetimi |
| `vnext-structured-term-parse-pilot.json` | 532 KB | Terim parse pilot |
| `vnext-needs-manual-review-term-groups.json` | 215 KB | Manuel inceleme gereken terim grupları |
| `verse-analysis-context.sample.json` | 153 KB | VerseAnalysisContext örnek çıktısı |

---

### `data/context/raw/quran-foundation/` — Ham Bağlam Verisi

`chapters.json` (46 KB) + `chapter-info/001.json…114.json` — Quran Foundation API'sinden çekilmiş ham sure bağlamı. Import script: `data/context/scripts/import-quran-foundation-surah-context.js`.

---

### `data/quran/external/` — Harici Kütüphane Verileri

Büyük harici kaynak koleksiyonu (tahminen ~2 GB). İçerik:
- Kuran meta kütüphanesi (`quran-meta-master/`)
- Açık Kuran API kaynakları
- Diyanet ve diğer meal kaynakları

Proje kodu tarafından doğrudan okunmaz; import süreçlerinde kaynak olarak kullanılmıştır.

---

## data2/ — İşlenmiş Kelime Analizi Verileri

### `data2/processed/` — Canonical Kelime Analizi

#### `canonical_word_analysis.json` — 68 MB — JSON *(v1 — aktif, varsayılan)*
**6.236 anahtar** (verseKey → kelime dizisi). Tüm Kuran kelime analizi.

| Alan | Açıklama |
|---|---|
| position | Kelime sırası (1-tabanlı) |
| arabic | Arapça kelime |
| lemma | Sözlük formu |
| root | 3-harfli kök |
| pos | Kelime türü (N, V, P…) |
| role | noun, verb, particle, pronoun… |
| morphology | Morfoloji etiketi |
| meaning_tr | Türkçe anlam |
| root_explanation_tr | Kök açıklaması |
| gloss_en | İngilizce gloss |
| sources | Alan bazında kaynak kaydı |
| missing_fields | Eksik alanlar listesi |

**Kullanım:** `canonicalWordAnalysisAdapter.ts` — module-level promise (eager load, v1).

---

#### `canonical_word_analysis_enriched.json` — 70 MB — JSON
v1 üzerine zenginleştirilmiş intermediate versiyon. Aynı yapı.

#### `canonical_word_analysis_v2.json` — 73 MB — JSON *(debug/audit)*
#### `canonical_word_analysis_v3.json` — 71 MB — JSON *(debug/audit)*
#### `canonical_word_analysis_v4.json` — 71 MB — JSON *(debug/audit)*

v2/v3/v4 aynı yapıda, farklı meaning_tr/kök atama stratejileri. `verseAnalysisContext.ts`'te **lazy load** — sadece `source: "v2"/"v3"/"v4"` ile çağrıldığında yüklenir.

---

#### `root_explanations_tr.seed.json` — ~200 KB — JSON
**250 kayıt** — başlangıç kök açıklamaları tohum seti.

| Alan | Açıklama |
|---|---|
| root | Arapça kök |
| frequency | Kuran'daki geçiş sayısı |
| short_tr | Kısa Türkçe açıklama (3–5 kelime) |
| summary_tr | Uzun açıklama |
| sources | Kaynak referansları |
| review_status | reviewed / auto-filled |

---

#### `root_explanations_tr_v2.json` / `root_explanations_tr_v2_easy_only.json` — ~200 KB — JSON
**983 kayıt** — genişletilmiş kök açıklama seti. `easy_only` versiyonu production'da kullanılan filtrelenmiş set.

**Kullanım:** `canonicalWordAnalysisAdapter.ts` — `rootExplanationsV2Promise` (module-level).

---

#### `root_explanations_tr_enriched.json` — ~200 KB — JSON
**983 kayıt** — Anthropic API ile doldurulmuş genişletilmiş versiyon. Aynı yapı.

---

#### `meaning_candidates_batch.json` — ~500 KB — JSON
**3.000 kayıt** — anlam adayları değerlendirme seti.

| Alan | Açıklama |
|---|---|
| lemma | Sözlük formu |
| arabic | Arapça metin |
| root | Kök |
| gloss_en | İngilizce gloss |
| frequency | Frekans |
| confidence | Güven skoru |
| meaning_tr_candidate | Aday Türkçe anlam |
| reviewed | İncelendi mi |

---

#### `meaning_overrides_from_candidates.json` — ~400 KB — JSON
**3.000 anahtar** — lemma → override anlam sözlüğü. Aday listesinden onaylananlar.

---

#### `meaning_overrides_from_translation_batch_v4.json` — ~30 KB — JSON
**173 anahtar** — özel isim ve terim override'ları (Eyyüb, İdris, Lat, Berzah, Semud vb.).

---

#### `meaning_overrides_tr.json` — ~50 KB — JSON
**dict** — `generatedAt`, `scope`, `normalization`, `rules`, `items` anahtarları. Yapılandırılmış override kuralları.

---

#### `word_analysis.json` — ~1 KB — JSON
Tek ayet örnek çıktısı (1:1). Test/doğrulama amaçlı.

---

#### `word_analysis_report.json` — ~10 KB — JSON
Kelime analizi özet raporu: scope, sourceSummary, matchingStrategy, counts, missingFields.

---

### `data2/scripts/` — Veri İşleme Scriptleri

| Dosya | Boyut | Açıklama |
|---|---|---|
| `build_canonical_word_analysis.js` | 22 KB | Canonical kelime analizi oluşturma (--surah, --ayah, --all) |
| `build_word_analysis.js` | 14 KB | Ham kelime analizi pipeline |
| `build_root_explanations_seed.js` | 9 KB | Kök açıklaması tohum seti oluşturma |

---

## Kullanım Haritası

```
Üretim veri akışı:

data/normalized/arabic.json          → quranAdapter          → ArabicText
data/normalized/translations.json    → translationAdapter    → Meal
data/normalized/surah-meta.json      → quranAdapter          → Sure adı/meta
data2/processed/canonical_word_analysis.json  → canonicalWordAnalysisAdapter → Kelime analizi
data2/processed/root_explanations_tr_v2_easy_only.json → rootV2 fallback
data/word-analysis/quran-morphology.txt       → wordAnalysisAdapter → Legacy kelime
data/word-analysis/word-translations-tr.json  → wordAnalysisShared → Anlam sözlüğü
data/word-analysis/extended-roots.json        → wordAnalysisShared → Kök açıklaması
data/fidelity/by-surah/index.json    → fidelityAdapter       → Meal tutarlılık
data/meal-comparison/by-surah/*.json → mealComparisonAdapter → Meal karşılaştırma
data/revelation-context/surah/index.json      → revelationContextAdapter
data/kuran.db (morfoloji + FTS)      → kuranSorguMorphologyAdapter, /api/search
data/kuran_core.db                   → coreDbVerseSource     → Opt-in kaynağı

Debug/audit (runtime'da yüklenmez):
data2/processed/canonical_word_analysis_v2/v3/v4.json  → lazy, sadece debug
data/analysis-snapshots/             → geliştirici referansı
data/analysis-audit/                 → denetim raporları
data/curation/                       → manuel kürasyon geçmişi
data/tafsir/ayah-ranges/index.json   → boş (parked)
data/kuran_sorgu.db                  → boş (kullanılmıyor)
```
