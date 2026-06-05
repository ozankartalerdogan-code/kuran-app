-- =============================================================================
-- Kuran App: Global Database Index Optimization
-- =============================================================================
-- Bu script, uygulamadaki TÜM aramaları, kelime eşleşmelerini, filtrelemeleri
-- ve sayfa geçişlerini hızlandırmak için eksik index'leri oluşturur.
--
-- Tüm komutlar IF NOT EXISTS ile çalışır — tekrar tekrar güvenle çalıştırılabilir.
-- Turso (libsql) ve SQLite ile uyumludur.
-- =============================================================================

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. VERSES — Metin aramaları (en kritik)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Literal çeviri üzerinde prefix aramaları (LIKE 'aranan%')
CREATE INDEX IF NOT EXISTS idx_verses_literal_ceviri ON verses(literal_ceviri);

-- Primary translation (varsayılan meal) metin aramaları
CREATE INDEX IF NOT EXISTS idx_verses_primary_translation ON verses(primary_translation);

-- Okunuş (transliterasyon) metin aramaları
CREATE INDEX IF NOT EXISTS idx_verses_reading_tr ON verses(reading_tr);

-- Arapça metin aramaları
CREATE INDEX IF NOT EXISTS idx_verses_arabic_text ON verses(arabic_text);

-- Partial index: Günlük ayet seçimi için "tam dolu" ayetleri hızlandırır
-- (arabic_text, reading_tr, literal_ceviri hepsi dolu olan ayetler)
CREATE INDEX IF NOT EXISTS idx_verses_complete_filter
  ON verses(surah_id, ayah_number)
  WHERE arabic_text IS NOT NULL
    AND reading_tr IS NOT NULL
    AND literal_ceviri IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. TRANSLATIONS — Meal kaynağı filtreleme
-- ═══════════════════════════════════════════════════════════════════════════════

-- Kaynak bazlı filtreleme (örn: 'yazir', 'diyanet' vb.)
CREATE INDEX IF NOT EXISTS idx_translations_source ON translations(source);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. WORDS — Kelime analizi aramaları
-- ═══════════════════════════════════════════════════════════════════════════════

-- Anlam (Türkçe) aramaları
CREATE INDEX IF NOT EXISTS idx_words_meaning_tr ON words(meaning_tr);

-- Arapça kelime aramaları
CREATE INDEX IF NOT EXISTS idx_words_arabic ON words(arabic);

-- POS (part-of-speech) filtreleme
CREATE INDEX IF NOT EXISTS idx_words_pos ON words(pos);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. VERSE_TAG_ITEMS — Etiket bağlantı tablosu
-- ═══════════════════════════════════════════════════════════════════════════════

-- verse_key ile doğrudan etiket arama (tag'siz)
CREATE INDEX IF NOT EXISTS idx_vti_verse_key ON verse_tag_items(verse_key);

-- tag ile filtreleme (ruh hali / mood etiketleri — /api/mood/random)
-- Bu olmadan her tıklama verse_tag_items'ta tam tablo taraması yapar.
CREATE INDEX IF NOT EXISTS idx_vti_tag ON verse_tag_items(tag);

-- ana_tema ile filtreleme (verse_tags — mood ana_tema dalı + isAnaTema yoklaması)
CREATE INDEX IF NOT EXISTS idx_verse_tags_ana_tema ON verse_tags(ana_tema);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. FIDELITY_COMPARISONS — Kaynak karşılaştırma
-- ═══════════════════════════════════════════════════════════════════════════════

-- Sure + ayet numarası ile toplu filtreleme
CREATE INDEX IF NOT EXISTS idx_fc_surah_ayah ON fidelity_comparisons(surah_id, ayah_number);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. FIDELITY_SIGNALS — Fidelity sinyalleri
-- ═══════════════════════════════════════════════════════════════════════════════

-- Kök bazlı sinyal araması
CREATE INDEX IF NOT EXISTS idx_fidelity_signals_root ON fidelity_signals(root);

-- Lemma bazlı sinyal araması
CREATE INDEX IF NOT EXISTS idx_fidelity_signals_lemma ON fidelity_signals(lemma);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. MORFOLOJI — Morfolojik analiz
-- ═══════════════════════════════════════════════════════════════════════════════

-- Kök (kok) araması
CREATE INDEX IF NOT EXISTS idx_morfoloji_kok ON morfoloji(kok);

-- Lemma (sözlük formu) araması
CREATE INDEX IF NOT EXISTS idx_morfoloji_lemma ON morfoloji(lemma);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. CONTEXT_NOTES — Bağlam notları
-- ═══════════════════════════════════════════════════════════════════════════════

-- verse_key ile not arama (scope olmadan)
CREATE INDEX IF NOT EXISTS idx_context_notes_verse_key ON context_notes(verse_key);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Optimizasyon sonu
-- ═══════════════════════════════════════════════════════════════════════════════
-- Toplam eklenen index: 18
-- Mevcut index'lerle birlikte tüm kritik sorgu yolları kapsanmıştır.
-- CRUD operasyonlarını minimal etkiler (INSERT/UPDATE/DELETE).
-- Turso/libsql ile %100 uyumlu, deadlock riski yoktur.
-- =============================================================================