# CHECKPOINT — 2026-05-20 v4

## 1. Tamamlanan İşler

### AI Anlam Özetleri (`ai_meaning_summary`)
- `generate-meaning-summaries.ts` scripti baştan yazıldı: stateless Anthropic API çağrısı, `particle`/`pronoun` rolleri filtrelendi (sadece noun/verb/adjective gönderilir), `--test` flag cache'siz ilk 5 ayeti seçecek şekilde düzeltildi, token raporlaması eklendi.
- Tüm 6.236 ayet için özet üretildi (5.029 yeni + 1.184 cache hit + 23 anlam yok).
- Kalite onarımı: 333 truncate/yabancı karakter içeren kayıt silindi ve `max_tokens=400`, "Sadece Türkçe yaz" prompt'uyla yeniden üretildi. Ardından tek kalan yabancı karakter kaydı (21:59) manuel düzeltildi.
- `verseAnalysisContext.ts` → `aiMeaningSummary: string | null` alanı eklendi, her iki build path'te (`buildCoreDbBaseData`, `buildJsonBaseData`) app.db'den okunuyor.
- Analiz sekmesine `AiMeaningSummaryCard` bileşeni eklendi, `ProvenAnalysisCard`'ın üstünde görünüyor.

### Sure Listesi Sayfası (`/surah`)
- `Surah` interface'e `revelationPlace`, `revelationOrder`, `shortIntroduction` eklendi.
- `quranAdapter.ts`: `data/revelation-context/surah/index.json` ve `data/tafsir/surah/index.json` paralel yükleniyor; Mekke/Medine etiketleme, 300 karakter özet üretimi.
- `/surah` sayfası her karta nüzul yeri + sırası + kısa özet gösteriyor.

### "Sure Hakkında" Accordion (`/surah/[id]/ayah/[no]`)
- `SurahAboutAccordion.tsx` client bileşeni oluşturuldu (`useState`, kapalı başlar).
- `getSurahFullTafsir(surahId)` fonksiyonu eklendi, `index.ts`'ten export edildi.
- Ayet detay sayfasında sure başlığının altına yerleştirildi.
- Kaynak etiketi: "Elmalılı Hamdi Yazır Tefsiri".

### `surah_tafsir` Tablosu (app.db)
- `data/tafsir/elmalili/` klasöründeki 114 `.md` dosyası app.db'ye import edildi.
- Tablo: `surah_tafsir (id, surah_id, source, content)` + UNIQUE index `(surah_id, source)`.
- `getSurahFullTafsir` JSON'dan değil doğrudan bu tablodan okuyor (sync).

### `data/tafsir/surah/index.json` Encoding Düzeltmesi
- 2 geçişte temizlendi: `\"` → `"` (49.077 adet), `\'` → `'` (38.638 adet), `€` → boşluk, `ÉÊ}` ve bozuk Arapça bloklar kaldırıldı.
- Yedek: `data/tafsir/surah/index.json.bak`.

---

## 2. app.db Durumu

| Tablo | Kayıt Sayısı | Not |
|---|---|---|
| `verses` | 6.236 | Tüm ayetler |
| `context_notes` (ai_meaning_summary) | 6.213 | 23 ayet anlamsız (harf-i mukattaa vb.) |
| `context_notes` (revelation_context) | 6.236 | Sure nüzul metadata |
| `context_notes` (tafsir_note) | 6.236 | Mevcut tafsir notları |
| `surah_tafsir` (elmalili) | **114** | Yeni — Elmalılı Hamdi Yazır tam tefsiri |
| `words` | ~77.000 | Kelime analizi (noun/verb/adjective/particle/pronoun) |

Diğer tablolar: `sureler`, `translations`, `morfoloji`, `root_meanings`, `meal_comparisons`, `fidelity_signals`, `ayet_fts` (full-text search).

---

## 3. Yarım Kalan İşler

### `SurahAboutAccordion` — Tefsir Metni
- Bileşende `tafsir` prop'u hâlâ tanımlı ama içerik gösterimi kullanıcı tarafından durduruldu (karar bekleniyor).
- `getSurahFullTafsir`'e `replace(/\\"/g, '"').replace(/\\'/g, "'")` cleanup eklenmesi askıda.

### Elmalılı `.md` Encoding Sorunu
- `data/tafsir/elmalili/` klasöründeki 114 `.md` dosyasında `\"` ve `\'` karakterleri orijinal kaynakta mevcut (GitHub'dan da bu şekilde geliyor).
- `docs/elmalili-missing-arabic.md` raporu oluşturuldu: 114 sure, 30.624 satır etkilenmiş.
- `\"` iki anlam taşıyor: (1) Türkçe tırnak işareti, (2) Arapça metin placeholder'ı — ikisi aynı escape desenini kullanıyor.
- Temizleme stratejisi henüz belirlenmedi.

### Diyanet API
- `https://acikkaynakkuran-dev.diyanet.gov.tr/api/v1/surah/{id}/tafsir` endpoint'i 404 döndürüyor.
- API key `.env.local`'da mevcut (`DIYANET_API_KEY`), sunucu ayakta, doğru endpoint bilinmiyor.
- `/docs` sayfası 200 döndürüyor ancak bağlantı koptu — tarayıcıdan incelenmesi gerekiyor.

### quran.com API
- Türkçe tafsir mevcut değil (19 tafsir içinde tr yok).

---

## 4. Tefsir Konusundaki Mevcut Durum

| Kaynak | Konum | Durum | Sorun |
|---|---|---|---|
| Elmalılı (tam metin) | `app.db → surah_tafsir` | ✅ Import tamam | `\"` escape karakterleri görünüyor |
| Elmalılı (kısa özet) | `data/tafsir/surah/index.json` | ✅ Encoding düzeltildi | Sadece sure başı özet |
| Diyanet tefsiri | `data/tafsir/surah/index.json` | ✅ Encoding düzeltildi | Sure seviyesi, ayet bazlı değil |
| AI anlam özeti | `app.db → context_notes` | ✅ 6.213/6.236 tam | Anlam yok olan 23 ayet hariç |
| Diyanet API | — | ❌ Endpoint bulunamadı | Dev ortamı, route bilinmiyor |
| quran.com API | — | ❌ Türkçe yok | 19 tafsirde tr dili yok |

---

## 5. Sonraki Adım

**Öncelik 1 — Elmalılı encoding:**
`getSurahFullTafsir`'e `.replace(/\\"/g, '"').replace(/\\'/g, "'")` cleanup ekle; bu `\'` → Türkçe kesme, `\"` → tırnak işareti haline getirir. Kaynaktaki Arapça metinler zaten sadece transliterasyon/çeviri olarak var, Arapça Unicode yok.

**Öncelik 2 — Accordion içeriği:**
`SurahAboutAccordion`'da tefsir metnini göster/gizle kararı verilmeli. Encoding temizlenince metin okunabilir hale gelecek.

**Öncelik 3 — Diyanet API:**
`https://acikkaynakkuran-dev.diyanet.gov.tr/docs` tarayıcıda açılarak mevcut endpoint listesi çıkarılmalı.
