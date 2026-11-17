# Elif-Ba Doğrulama Raporu: Bağımsız Çapraz Kontrol

**Tarih:** 17 Kasım 2026
**Kontrol edilen rapor:** `docs/denetim/2026-11-17-elifba-dogrulama-ve-paketler.md`
**Kapsam:** Kod ve veri dosyalarına dokunulmadan salt okunur doğrulama; yerel test/DB yazma çalıştırılmadı.

---

## 1) Arapça örneklem tablosu

`data/diyanetelifba.json` (**J**), `data/elifba_harfler.json` (**F**), `apps/mobile/src/data/content/harf_i_tarif.json` (**H**) ve `apps/mobile/src/data/quran_arabic.json` (**Q**) dosyalarında NFC normalize tam sözcük eşleşmesi (hareke dahil) kontrol edildi (21 örnek):

| # | Örnek | Rapor iddiası | Bağımsız kontrol bulgusu | Rapor |
|---|---|---|---|---|
| 1 | `بَ` | VERİDE YOK | 4 dosyada da bağımsız sözcük yok | DOĞRU |
| 2 | `بِ` | VERİDE YOK | 4 dosyada da bağımsız sözcük yok | DOĞRU |
| 3 | `بًا` | VERİDE YOK | 4 dosyada da bağımsız sözcük yok | DOĞRU |
| 4 | `رَ` | VERİDE YOK | 4 dosyada da bağımsız sözcük yok | DOĞRU |
| 5 | `شكر` | VERİDE YOK | 4 dosyada da bağımsız sözcük yok | DOĞRU |
| 6 | `حبل` | VERİDE YOK | 4 dosyada da bağımsız sözcük yok | DOĞRU |
| 7 | `جتل` | VERİDE YOK | 4 dosyada da bağımsız sözcük yok | DOĞRU |
| 8 | `خبل` | VERİDE YOK | 4 dosyada da bağımsız sözcük yok | DOĞRU |
| 9 | `أَبْ` | VAR; J:51 | J:51 içinde mevcut | DOĞRU |
| 10 | `أَىْ` | VAR; J:51 | J:51 içinde mevcut | DOĞRU |
| 11 | `جبل` | VAR; J:21 | J:21 içinde mevcut | DOĞRU |
| 12 | `احد` | VAR; J:21 | J:21 içinde mevcut | DOĞRU |
| 13 | `رَزَقَ` | VAR; J:45 | J:45 içinde mevcut | DOĞRU |
| 14 | `كُتُبُ` | VAR; J:45 | J:45 içinde mevcut | DOĞRU |
| 15 | `قُلْ` | VAR; J:57 | J:57 (ve J:111, Q) içinde mevcut | DOĞRU |
| 16 | `حَقَّ` | VAR; J:69 | J:69 (ve Q) içinde mevcut | DOĞRU |
| 17 | `بِاللَّهِ` | VAR; J:117 | J:117 içinde mevcut | DOĞRU |
| 18 | `رَبَّ` | J'de yok; Q (5:28), NFC | J'de yok; Q `5:28` (`q[4][27]`) içinde mevcut | DOĞRU |
| 19 | `رَبِّ` | J'de yok; Q (1:2), NFC | J'de yok; Q `1:2` (`q[0][1]`) içinde mevcut | DOĞRU |
| 20 | `غَفُورٌ` | J'de yok; Q (2:173) | J'de yok; Q `2:173` (`q[1][172]`) içinde mevcut | DOĞRU |
| 21 | `لَهُ` | J'de yok; Q (2:206) | J'de yok; Q `2:206` (`q[1][205]`) içinde mevcut | DOĞRU |

Ek olarak `F:6` (`ا`), `F:19` (`ب`), `F:129` (`kalin_ince: "her ikisi"`), `F:370` (`لا`) satırları açılıp doğrulandı. Örneklemde hata görülmedi.

---

## 2) Kanıt örneklem tablosu

Bölüm 1'deki 12 farklı `dosya:satır` kanıtı doğrudan açılarak incelendi:

| # | Rapor iddiası (özet) | Kontrol edilen dosya:satır | Gerçek kod durumu | Sonuç |
|---|---|---|---|---|
| 1 | Tamamlamak için tüm kartlar (`harf_sayisi > 0`) ve en az 10 puan; kilitli düğüm basılamaz | `apps/mobile/app/elifba/index.tsx:32,49-71,193` | `QUIZ_PASS = 10`, `ders.harf_sayisi > 0 && seen.length >= ders.harf_sayisi`, `disabled={isLocked}` | DOĞRU |
| 2 | `markSeen` ileri/geri/nokta geçişinde çağrılır; kart açmak/çevirmek kayıt değildir | `apps/mobile/app/elifba/[dersId].tsx:469-489,555-558` | `markSeen` yalnız `handleNext`, `handlePrev` ve nokta `onPress` içinde çağrılıyor | DOĞRU |
| 3 | Normalizasyon iki seçenek şartı koymaz; UI tüm seçenekleri çizer | `apps/mobile/app/elifba/[dersId].tsx:219-221,357` | `normalizeQuizSorular` yalnızca `uniqueSecenekler.includes(soru.dogru_cevap)` arıyor (tek şık geçer); UI `soru.secenekler.map` ile tümünü çiziyor | DOĞRU |
| 4 | `QuizView` export değil, API'yi kendisi çeker, `renderSoru` Arapça satırları ayırır | `apps/mobile/app/elifba/[dersId].tsx:226,253,334-347` | `function QuizView` export değil; `api.elifba.quiz(dersId)` çağırır; `renderSoru` `arabicLines`/`otherLines` ayırır | DOĞRU |
| 5 | Yeni öğede doğru cevap SRS kaydı oluşturmaz; yanlış Box 1'e, doğru 1→2→3 | `apps/mobile/src/lib/elifbaProgress.ts:93-120` | `if (isCorrect) { if (!prev) return next; ... }` ve yanlışta `box: 1, wrong: (prev?.wrong ?? 0) + 1` | DOĞRU |
| 6 | SRS seçici 5+3 öncelik kotasıdır, yetersizse fallback ile doldurur; yalnız `q:` okur | `apps/mobile/src/lib/elifbaProgress.ts:147-189` | `box1.slice(0,5)`, `box2.slice(0,3)`, ardından `rest`, yetmezse `fallback` ile `count` tamamlanır; tümü `srs[\`q:${item.quiz_id}\`]` okur | DOĞRU |
| 7 | Rozet 15'e normalize edilir; 15/15 + Kutu1>0 ise `master` döner | `apps/mobile/src/lib/elifbaProgress.ts:192-207` | `s = (score * 15) / total`; `s >= 15` iken `box1Count === 0 ? "crown" : "master"` | DOĞRU |
| 8 | `withCacheFallback` ağ hatasında süresi dolmuş cache'i de döndürebilir | `apps/mobile/src/lib/api.ts:372-387` | `catch` bloğunda `storage.getJSON(vkey(key))` TTL kontrolü olmadan döndürülüyor | DOĞRU |
| 9 | Ders API'si `icerik_json` seçmiyor; ders ve quiz route'larında 1 yıllık shared cache var | `apps/web/src/app/api/elifba/dersler/route.ts:15-23`, `apps/web/src/app/api/elifba/quiz/[lessonId]/route.ts:40` | `SELECT d.id, d.baslik, d.konu_sirasi, d.seviye, COUNT(...)` içinde `icerik_json` yok; her iki route `s-maxage=31536000` | DOĞRU |
| 10 | Quiz yalnız soru, tüm şıklar, doğru cevap ve ipucu çevrilebiliyorsa çevrilir | `apps/mobile/src/lib/elifbaEn.ts:50-70` | `localizeQuizWith` hepsi `has(m, ...)` sağlamazsa orijinal Türkçe `q` nesnesini döndürür | DOĞRU |
| 11 | `readingTr.ts` ve `translitEn.ts` Arapça okunuş üretmez, Latin→Latin çalışır | `packages/core/src/transliteration/readingTr.ts:322-350`, `apps/mobile/src/lib/translitEn.ts:1-13,28-49` | Her ikisi de mevcut Latin transliterasyonu normalize eder / EN yazıma çevirir | DOĞRU |
| 12 | `mushaf-sayfa.tsx` seri günceller; `export-elifba-source.mjs` DB okur, `build-elifba-en.mjs` hazır EN JSON ister | `apps/mobile/app/mushaf-sayfa.tsx:234`, `scripts/export-elifba-source.mjs:20-43`, `scripts/build-elifba-en.mjs:16-19,46-65` | `useStreak()` çağrısı var; export `app.db` okur; build `letters.en.json` ve `strings.en.json` gerektirir | DOĞRU |

---

## 3) Madde 9 sonucu

**Kod doğrulaması:** **DOĞRU.**
`scripts/_build-elifba-quiz.mjs:130-139` satırları `DELETE FROM elifba_quiz` çalıştırıp `let qid = 1` ile tüm soruları sıradan (`qid++`) yeniden ekliyor. Turso senkronizasyonu (`147-152`) da aynı şekilde `DELETE FROM elifba_quiz` yapıp yeni sıralı `quiz_id` değerlerini yazıyor. Ayrıca soru seçimi (`shuffle`, satır 107) ve `selectQuizQuestionsWithSrs` (`elifbaProgress.ts:152`) kimlikleri `q:${quiz_id}` üzerinden bağladığı için, betik yeniden çalıştırıldığında aynı `quiz_id` başka bir soruya denk gelir ve cihazdaki SRS geçmişi yanlış soruya bağlanır.

**Paket 1–2 etkisi:**
- **Kısa vadede (mevcut statik DB üzerinde):** Paket 1 ve Paket 2 bu betiği çalıştırmaz; yalnızca mevcut `elifba_quiz` (`1..405`) kayıtlarını okuyup cihazda `q:<quiz_id>` anahtarıyla SRS tutar. Bu nedenle `_build-elifba-quiz.mjs` çalıştırılmadığı sürece Paket 1–2 normal çalışır.
- **Orta vadede (DB güncellenirse):** Kimlik koruması yapılmadan `_build-elifba-quiz.mjs` bir kez bile çalıştırılırsa, Paket 1–2 ile biriken tüm kullanıcı `q:*` SRS kayıtları bozulur. Dolayısıyla Paket 1–2 kod olarak uygulanabilir durumdadır, ancak canlı DB'de betiğin mevcut haliyle çalıştırılmaması gerekir (rapordaki Paket 8 şartı yerindedir).

---

## 4) Paket 1–5 değerlendirmesi

**Genel sıralama:** `1 → 2 → 3 → 4 → 5` sırası mantıklı. Paket 1 sunum/SRS temelini atıyor, Paket 2 bunun üzerine katalog/tekrar/rozet ekliyor, Paket 3 aynı `ElifbaQuizView` ve `[dersId].tsx` yapısını dinleme moduna genişletiyor, Paket 4 bağımsız, Paket 5 `[dersId].tsx` üzerine opsiyonel içerik ekliyor.

**Paket bazlı netlik ve eksikler:**

- **Paket 1 (Mevcut quiz'i sunum bileşenine ayır ve SRS'i bağla):** Tek commit olarak DeepSeek için **yeterince net**. Saf modül imzaları (`QuizQuestion`, `normalizeQuizQuestions`, `answerOnce`), Promise kuyruğu ve snapshot tekrar deneme kuralı açık yazılmış.
- **Paket 2 (Ders rozetleri ve ayrı yanlış tekrar oturumu):** Büyük ölçüde net, ancak **2 küçük belirsizlik** var:
  1. Rozetlerin ana ekranda tam olarak nerede/nasıl gösterileceği (`PathNode` köşesi mi, `LessonPopup` içi mi, ikon/metin tercihi) serbest bırakılmış.
  2. `/elifba/tekrar` ekranının Paket 1'deki `ElifbaQuizView` ve `elifbaQuizSession` yardımcılarını kullanacağı belirtilmiş ama `ElifbaQuizView` prop sözleşmesiyle doğrudan eşleştirilerek örneklenmemiş (uygulanabilir, ancak modelin Paket 1 bileşenini tekrar çağırması gerekiyor).
- **Paket 3 (Mevcut 29 sesle Dinle-Seç):** **Bir arayüz uyumluluk eksikliği** var. Paket 1'de `ElifbaQuizView({questions, onAnswer, onFinish})` `QuizQuestion[]` alacak şekilde tanımlanıyor; Paket 3'te ise `ElifbaQuizView` için `kind: 'listening'` discriminant'ı ekleniyor. Paket 2'deki `tekrar.tsx` dosyası Paket 3'ün "Dokunulacak tam yollar" listesinde yok. DeepSeek Paket 3'te `kind`'i zorunlu prop yaparsa `tekrar.tsx` tip hatası verir; `kind` opsiyonel/varsayılan `'quiz'` bırakılmazsa dokunulmayacaklar kuralıyla çelişir.
- **Paket 4 (Harf-i Tarif son tamamlanmış testini sakla):** **Net bir dosya yolu çelişkisi** var (Bölüm 5'te detaylandırıldı). `HarfITarifContent.tsx:8` i18n için `apps/mobile/src/i18n/strings/harfITarif.ts` kullanıyor, ancak raporda dokunulacak yol olarak `strings/elifba.ts` verilmiş. Bunun dışında `HARF_I_TARIF_SCORE_ID = '1000'` sözleşmesi `parseElifbaQuizScores` (`/^\d+$/`) ve `BACKUP_KEYS` ile uyumlu.
- **Paket 5 (Opsiyonel ders içeriğini mobilde güvenle göster):** Tek commit olarak **gayet net**. `parseDersIcerik` kuralları, literal `\\n` dönüşümü, EN'de TR paragrafın gizlenmesi ve eski API fallback'i açık.

---

## 5) Codex raporunda bulduğun hatalar

1. **Paket 4 i18n dosya yolu uyumsuzluğu (bölüm 4, satır 248 ve 335):** Raporda genel kural olarak tüm yeni UI metinlerinin yalnız `apps/mobile/src/i18n/strings/elifba.ts` içine konulması istenmiş ve Paket 4'ün dokunulacak yollarına `elifba.ts` yazılmış. Oysa `apps/mobile/src/components/HarfITarifContent.tsx:8` kendi metinlerini `apps/mobile/src/i18n/strings/harfITarif.ts` (`harfStrings`) üzerinden okuyor. Paket 4 ya `harfITarif.ts` dosyasını dokunulacak yollara eklemeli ya da `HarfITarifContent.tsx` içinde `elifba.ts` importuna neden ihtiyaç duyulduğunu açıkça belirtmelidir.
2. **Paket 3 `ElifbaQuizView` geriye dönük uyumluluk boşluğu (bölüm 4, satır 318):** Paket 3'te `ElifbaQuizView` bileşenine `kind: 'listening'` discriminant'ı eklenirken, Paket 2'de oluşturulan `apps/mobile/app/elifba/tekrar.tsx` dosyasının kırılmaması için normal `quiz` modunun varsayılan/geriye uyumlu kalacağı açıkça şart koşulmamış (`tekrar.tsx` Paket 3'ün dokunulacaklar listesinde yer almıyor).
