# Words Tablosu Denetim Raporu

Tarih: 2026-05-21

## Özet

| Kontrol | Bulunan |
|---|---:|
| 1. Anlam eksikliği | 0 |
| 2a. İsim-mastar | 0 |
| 2b. Fiil-isim | 1 |
| 3. Olumsuzluk | 604 |
| 4. Soru anlamı | 129 |
| 5. Özel isim | 53 |
| 6. Seg. fark > 3 | 183 |

## 1. Anlam Eksikliği

**SQL:**
```sql
SELECT verse_key, word_index, arabic, meaning_tr
FROM words
WHERE meaning_tr IS NULL
   OR trim(meaning_tr) = ''
   OR lower(trim(meaning_tr)) = 'bilinmiyor'
ORDER BY verse_key, word_index
```

**Bulunan:** 0 kayıt


## 2a. İsim — Mastar Anlamlı

> pos=İSİM ama anlam fiil masteri gibi bitmiş.

**SQL:**
```sql
SELECT verse_key, word_index, arabic, pos, meaning_tr
FROM words
WHERE pos = 'İSİM'
  AND (meaning_tr LIKE '%mak' OR meaning_tr LIKE '%mek'
       OR meaning_tr LIKE '%mak,' OR meaning_tr LIKE '%mek,')
ORDER BY verse_key
```

**Bulunan:** 0 kayıt


## 2b. Fiil — İsim Anlamlı

> pos=FİİL ama anlam isim ekiyle bitiyor.

**SQL:**
```sql
SELECT verse_key, word_index, arabic, pos, meaning_tr
FROM words
WHERE pos LIKE '%V%'
  AND (meaning_tr LIKE '%lık' OR meaning_tr LIKE '%luk' OR meaning_tr LIKE '%lük' OR meaning_tr LIKE '%lik' OR meaning_tr LIKE '%ım' OR meaning_tr LIKE '%im' OR meaning_tr LIKE '%um' OR meaning_tr LIKE '%üm' OR meaning_tr LIKE '%ış' OR meaning_tr LIKE '%iş' OR meaning_tr LIKE '%uş' OR meaning_tr LIKE '%üş')
  AND instr(meaning_tr,' ') = 0   -- tek kelime
ORDER BY verse_key
```

**Bulunan:** 1 kayıt

| verse_key | word_index | arabic | pos | meaning_tr |
| --- | --- | --- | --- | --- |
| 40:37 | 3 | فَأَطَّلِعَ | P+V | ulaşayım |

## 3. Olumsuzluk Kontrolü

> Olumsuzluk edatı içeren kelimelerin anlamı olumsuz değil.

**SQL:**
```sql
-- Olumsuzluk edatı (لا, لن) olan kelimeler ama anlam olumlu
SELECT verse_key, word_index, arabic, meaning_tr
FROM words
WHERE (arabic LIKE '%لَا%' OR arabic LIKE '%لَّا%' OR arabic LIKE '%لَن%')
  AND meaning_tr IS NOT NULL
  AND meaning_tr NOT LIKE '%değil%'
  AND meaning_tr NOT LIKE '%mez%'
  AND meaning_tr NOT LIKE '%maz%'
  AND meaning_tr NOT LIKE '%yok%'
  AND meaning_tr NOT LIKE '%asla%'
  AND meaning_tr NOT LIKE '%hayır%'
ORDER BY verse_key
```

**Bulunan:** 604 kayıt

| verse_key | word_index | arabic | meaning_tr |
| --- | --- | --- | --- |
| 100:9 | 1 | ۞أَفَلَا | mı? (soru) |
| 109:3 | 1 | وَلَآ | ve |
| 109:4 | 1 | وَلَآ | ve |
| 109:5 | 1 | وَلَآ | ve |
| 10:103 | 3 | رُسُلَنَا | elçi |
| 10:104 | 10 | فَلَآ | ve, böylece |
| 10:16 | 8 | وَلَآ | ve |
| 10:16 | 17 | أَفَلَا | mı? (soru) |
| 10:18 | 11 | هَـٰٓؤُلَآءِ | İşte o |
| 10:19 | 8 | وَلَوۡلَا | ve |

## 4. Soru Anlamı Eksik

> Soru kelimesi ama anlam soru formatında değil.

**SQL:**
```sql
SELECT verse_key, word_index, arabic, meaning_tr
FROM words
WHERE (arabic LIKE '%مَنْ%' OR arabic LIKE '%مَاذَا%'
       OR arabic LIKE '%أَيَّانَ%' OR arabic LIKE '%كَيْفَ%'
       OR arabic LIKE '%لِمَ%' OR arabic LIKE '%لِمَاذَا%'
       OR arabic LIKE '%هَلْ%' OR arabic LIKE '%أَيْنَ%')
  AND meaning_tr IS NOT NULL
  AND meaning_tr NOT LIKE '%?%'
  AND meaning_tr NOT LIKE '%mı%'
  AND meaning_tr NOT LIKE '%mi%'
  AND meaning_tr NOT LIKE '%nedir%'
  AND meaning_tr NOT LIKE '%neden%'
  AND meaning_tr NOT LIKE '%nerede%'
  AND meaning_tr NOT LIKE '%nasıl%'
  AND meaning_tr NOT LIKE '%kim%'
ORDER BY verse_key
```

**Bulunan:** 129 kayıt

| verse_key | word_index | arabic | meaning_tr |
| --- | --- | --- | --- |
| 10:19 | 9 | كَلِمَةٞ | kelime, söz |
| 10:33 | 3 | كَلِمَتُ | kelime, söz |
| 10:64 | 10 | لِكَلِمَٰتِ | kelime, söz |
| 10:82 | 4 | بِكَلِمَٰتِهِۦ | kelime, söz |
| 10:92 | 5 | لِمَنۡ | -den, -dan |
| 10:96 | 5 | كَلِمَتُ | kelime, söz |
| 11:102 | 8 | ظَٰلِمَةٌۚ | zulmeder |
| 11:110 | 8 | كَلِمَةٞ | kelime, söz |
| 11:119 | 8 | كَلِمَةُ | kelime, söz |
| 12:72 | 5 | وَلِمَن | -den, -dan |

## 5. Özel İsim Kontrolü

> Uyarı: özel isimlerin anlamı beklenenden farklı. Değişiklik yapılmadı.

**SQL:**
```sql
-- Özel isim içeren kelimelerin anlamı değiştirilmiş mi?
SELECT verse_key, word_index, arabic, meaning_tr
FROM words
WHERE arabic LIKE '%جِبۡرِيلَ%'  -- Cebrail örneği
   OR arabic LIKE '%فِرۡعَوۡنَ%' -- Firavun örneği
   -- diğerleri...
```

**Bulunan:** 53 kayıt

| verse_key | word_index | arabic | meaning_tr | not |
| --- | --- | --- | --- | --- |
| 2:49 | 5 | فِرۡعَوۡنَ | firavun | Beklenen: Fir'avn |
| 2:50 | 8 | فِرۡعَوۡنَ | firavun | Beklenen: Fir'avn |
| 3:11 | 3 | فِرۡعَوۡنَ | firavun | Beklenen: Fir'avn |
| 7:103 | 8 | فِرۡعَوۡنَ | firavun | Beklenen: Fir'avn |
| 7:109 | 5 | فِرۡعَوۡنَ | firavun | Beklenen: Fir'avn |
| 7:113 | 3 | فِرۡعَوۡنَ | firavun | Beklenen: Fir'avn |
| 7:127 | 5 | فِرۡعَوۡنَ | firavun | Beklenen: Fir'avn |
| 7:130 | 4 | فِرۡعَوۡنَ | firavun | Beklenen: Fir'avn |
| 7:141 | 5 | فِرۡعَوۡنَ | firavun | Beklenen: Fir'avn |
| 8:52 | 3 | فِرۡعَوۡنَ | firavun | Beklenen: Fir'avn |

## 6. Segmentasyon Tutarsızlığı (fark > 3)

> Verse metnindeki boşlukla ayrılan kelime sayısı ile DB'deki kelime sayısı farklı.

**SQL:**
```sql
SELECT v.verse_key,
       LENGTH(v.arabic_text) - LENGTH(REPLACE(v.arabic_text,' ','')) + 1 AS verse_word_count,
       COUNT(w.id) AS db_word_count
FROM verses v
JOIN words w ON v.verse_key = w.verse_key
GROUP BY v.verse_key
HAVING verse_word_count != db_word_count
ORDER BY ABS(verse_word_count - db_word_count) DESC
```

**Bulunan:** 183 kayıt

| verse_key | verse_kelime | db_kelime | fark |
| --- | --- | --- | --- |
| 2:282 | 144 | 128 | 16 |
| 73:20 | 90 | 78 | 12 |
| 4:12 | 99 | 88 | 11 |
| 4:11 | 81 | 71 | 10 |
| 2:233 | 73 | 64 | 9 |
| 42:15 | 43 | 34 | 9 |
| 5:41 | 76 | 67 | 9 |
| 60:10 | 64 | 55 | 9 |
| 24:35 | 56 | 48 | 8 |
| 2:102 | 82 | 74 | 8 |
