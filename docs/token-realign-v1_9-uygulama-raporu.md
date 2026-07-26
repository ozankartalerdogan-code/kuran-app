# token-realign-v1_9 — production uygulama raporu

**Karar: PASS.** Yerel `data/app.db` ve canlı Turso'ya uygulandı, tüm kapılar geçti.
Kapsam dışı (`37:130`, frozen token map, `opening_fatiha` kuralı, corpus geneli
gloss sorunları) hiçbir şeye dokunulmadı.

Tarih: 2026-07-25 · Kaynak artefaktlar: `data/candidates/morphology/token-realign-v1_9/`

---

## 1. rowsAffected

| Hedef | Statement | rowsAffected |
| --- | ---: | ---: |
| Yerel `data/app.db` | 77 | 77 |
| Canlı Turso | 77 | **77** |

Statement dağılımı: **71 UPDATE + 5 INSERT + 1 DELETE = 77**.
Her UPDATE/DELETE `id + verse_key + word_index + uygulama öncesi arabic` ile guard'lı.

## 2. Insert / delete kimlikleri

| İşlem | id | Ayet:idx | Yüzey |
| --- | ---: | --- | --- |
| INSERT | 77430 | 15:7:8 | `ٱلصَّـٰدِقِينَ` |
| INSERT | 77431 | 27:20:12 | `ٱلۡغَآئِبِينَ` |
| INSERT | 77432 | 36:22:8 | `تُرۡجَعُونَ` |
| INSERT | 77433 | 37:164:6 | `مَّعۡلُومٞ` |
| INSERT | 77434 | 41:47:28 | `شَهِيدٖ` |
| DELETE | 1149 | 2:72:11 | `تَكۡتُمُونَ` (fazla satır) |

Manifestodaki kimliklerin dışına çıkılmadı. Mevcut hiçbir `id` yeniden
numaralandırılmadı; `1149` boşluk olarak bırakıldı, `max(id)` 77429 → 77434.

Beş INSERT satırında yalnız kanıtlı alanlar yazıldı — `arabic`, `root`, `lemma`,
`confidence='low'`, `source='qac_tanzil_teacher'`, ve 37:164:6'da doğrulanmış
`meaning_tr='bilinen'`. `pos`, `morphology`, `gloss_en`, `role` **beşinde de SQL
NULL** (canlı DB'den doğrulandı).

## 3. 280 hücrenin alan dağılımı

| Sütun | Adet |
| --- | ---: |
| `meaning_tr` | 45 |
| `arabic` | 37 |
| `morphology` | 34 |
| `gloss_en` | 32 |
| `lemma` | 30 |
| `pos` | 29 |
| `role` | 27 |
| `source` | 17 |
| `confidence` | 16 |
| `root` | 13 |
| **Toplam** | **280** |

71 satırda dağılıyor.

Meaning kararları — beklenenle birebir: `MOVE_EXISTING_MEANING` **15**,
`REPLACE_WITH_VERIFIED_MEANING` **4**, `SET_NULL_FAIL_CLOSED` **35**, toplam **54**.

## 4. Dokuz ayetin önce/sonra token sayıları

| Ayet | Önce | Sonra | Canlı DB | Canlı API |
| --- | ---: | ---: | ---: | ---: |
| 2:72 | 11 | 10 | 10 | 10 |
| 2:181 | 14 | 14 | 14 | 14 |
| 8:6 | 12 | 12 | 12 | 12 |
| 13:37 | 20 | 20 | 20 | 20 |
| 15:7 | 7 | 8 | 8 | 8 |
| 27:20 | 11 | 12 | 12 | 12 |
| 36:22 | 7 | 8 | 8 | 8 |
| 37:164 | 5 | 6 | 6 | 6 |
| 41:47 | 27 | 28 | 28 | 28 |
| **Toplam** | **114** | **118** | **118** | **118** |

## 5. Corpus toplamı

**77.429 → 77.433** (hem yerel hem Turso). Resmî invariantla birebir.

---

## 6. Uygulama öncesi kapılar

`scripts/morphology/preflight-token-realign-v1_9.mjs` — **2.754 kontrol, 0 hata.**

- yerel başlangıç satır sayısı **77.429** ✅
- hedef ayet satır sayıları manifestoyla birebir (114) ✅
- her pre-image satırının 13 alanı canlı yerel DB ile birebir ✅
- her field-change'in `before` değeri canlı hücreyle birebir ✅
- insert id'leri boş, delete id'i mevcut ✅
- root/lemma'da ASCII/Buckwalter **0** ✅
- Turso başlangıç 77.429, dokuz ayette 114 satır, tüm alanlar yerelle birebir ✅
- Turso pre-image alındı → `turso-preimage.json` ✅
- `forward.sql` yalnız dokuz ayeti isimlendiriyor, insert/delete id'leri manifestoyla aynı ✅

## 7. Yerel uygulama sonrası kapılar

`local-apply-report.json`:

| Kapı | Sonuç |
| --- | --- |
| `SELECT COUNT(*) FROM words` = 77.433 | ✅ |
| Dokuz ayette token dizisi canonical Tanzil ile birebir | ✅ 0 sapma |
| 6.236 ayette `word_index` 1'den başlıyor, boşluk/duplicate/sıra bozukluğu 0 | ✅ |
| Hedef dışı 77.315 satır — sha256 parmak izi ve **satır satır** karşılaştırma | ✅ 0 drift |
| `PRAGMA integrity_check` | ✅ `ok` |
| `PRAGMA foreign_key_check` | ✅ boş |
| root/lemma ASCII sayısı | ✅ 0 |
| v1.8 / proper-name / meaning / Buckwalter düzeltmeleri | ✅ korundu (hedef dışı hiç dokunulmadı; hedef içinde `meaning_override` ve `proper_name_lexicon` yükleri taşındı, ezilmedi) |
| Beş NULL-pos/morphology satırı API/UI'da hata veya `"null"` metni üretmiyor | ✅ 10 hedefli test |
| Testler | ✅ **45/45** |

## 8. Turso ve canlı doğrulama

`turso-apply-report.json` — **0 hata**:

- words toplamı **77.433** ✅
- dokuz ayetin token sayıları ve `word_index` dizileri yerelle **birebir** ✅
- 118 hedef satırın **her hücresi** yerelle birebir (0 uyuşmazlık) ✅
- +5 insert / −1 delete, yalnız manifesto kimlikleri ✅
- hedef dışı 77.315 satır, içerik checksum'ı yerelle birebir ✅
- `max(id)` = 77434, root/lemma ASCII 0 ✅

`live-api-verification.json` — canlı mobil production API
(`https://kuran-app-web-ozan-s-projects8.vercel.app/api/v1/ayah`), **0 hata**:

- dokuz ayetin tamamı HTTP 200 ✅
- API kelime sayısı DB ile birebir (9/9) ✅
- sıra `word_index` 1..N dense ✅
- her token kendi `arabic` / `root` / `lemma` / `meaningTr` değerini taşıyor ✅
- NULL alanlar güvenli response üretiyor; payload'da `"null"` / `"undefined"` /
  `"NaN"` / `"[object Object]"` string değeri yok ✅

Örnek — `41:47` son token (yeni eklenen satır):

```json
{ "wordIndex": 28, "arabic": "شَهِيدٖ", "root": "شهد",
  "lemma": "شَهِيد", "pos": null, "morphology": null, "meaningTr": null }
```

`37:164` son token: `{ "wordIndex": 6, "arabic": "مَّعۡلُومٞ", "root": "علم",
"lemma": "مَعْلُوم", "pos": null, "morphology": null, "meaningTr": "bilinen" }`

## 9. İkinci çalıştırma

`rerun-and-reverse-verification.json`:

- **Yerel:** `forward.sql`'i migrate edilmiş bir kopyaya tekrar uygulamak
  `IntegrityError: UNIQUE constraint failed: words.id` veriyor; transaction
  geri alınıyor ve **net değişiklik sıfır** (77.433 → 77.433, hash aynı).
- **Turso:** ikinci çalıştırma precondition'da duruyor
  (`ABORT: expected 77429 rows before, found 77433`) — batch hiç gönderilmiyor.
- `--verify-only` ile Turso yeniden doğrulandı: **PASS, 0 hata**.

> **Sapma notu.** Talep edilen davranış "tam no-op"tu; gerçekleşen davranış
> **fail-closed abort + tam rollback**. `UPDATE`/`DELETE` guard'ları sessiz
> no-op, `INSERT`'ler ise primary key'e çarpıyor. Net etki aynı (çifte uygulama
> imkânsız, veri değişmiyor), ama mekanizma sessiz değil, hata veriyor. Bunu
> daha güvenli kabul edip olduğu gibi bıraktım.

## 10. Yedekler ve rollback

**Yerel tam yedek (SQLite `.backup`):**

```
C:\Dev\kuran_app\data\app.db.yedek_20260725_010115_pre_token_realign_v1_9
sha256 = 0df76b58560aea6afe91eaf47e92400cd5fb8bc0ec452b9825c147c0c03833d6
bytes  = 237.547.520 · rows = 77.429 · integrity_check = ok
```

**Turso pre-image:** `data/candidates/morphology/token-realign-v1_9/turso-preimage.json`
(dokuz ayetin 114 satırı, 13 alan, `id` dahil).

**Guarded reverse SQL:** `data/candidates/morphology/token-realign-v1_9/reverse.sql`

**Reverse doğrulaması (atılabilir kopyada, uygulama sonrası tekrar çalıştırıldı):**
`words` tablosu uygulama öncesi yedekle **byte-birebir** aynı —

```
reversed sha256 = 945f7eb18322e506e1ef39a4d42904d03c04d83481affb75b2e97d0354171271
backup   sha256 = 945f7eb18322e506e1ef39a4d42904d03c04d83481affb75b2e97d0354171271
rows after reverse = 77.429
```

### Rollback komutları

Yerel — guarded reverse:

```
sqlite3 data/app.db < data/candidates/morphology/token-realign-v1_9/reverse.sql
sqlite3 data/app.db "SELECT COUNT(*) FROM words;"   -- 77429 beklenir
```

Yerel — tam dosya geri dönüşü (nükleer seçenek):

```
copy /Y "data\app.db.yedek_20260725_010115_pre_token_realign_v1_9" "data\app.db"
```

Turso — guarded reverse:

```
node --env-file=apps/web/.env.local scripts/morphology/turso-run-sql.mjs \
  data/candidates/morphology/token-realign-v1_9/reverse.sql
node --env-file=apps/web/.env.local scripts/morphology/apply-token-realign-v1_9-turso.mjs --verify-only
```

---

## 11. Bilinen sapmalar (kabul edilmiş)

1. **İkinci çalıştırma sessiz no-op değil, fail-closed abort** — §9.
2. **Kök `npx tsc -p tsconfig.json` kırmızı: 1.315 hata.** Bu migration'dan
   önce de kırmızıydı; hataların 58'i `TS5097` (`.ts` uzantılı import), mevcut
   `mushafCompat.test.ts` ve `ftsQuery.test.ts` dahil. Yeni test dosyam aynı
   sınıftan **1** hata ekliyor, repo konvansiyonunu izlediği için. Regresyon
   değil. Reponun gerçek kapısı `npm test` → **45/45**.
3. **Preflight'ın taşıdığı fingerprint sabiti Python tarafında yeniden
   üretilemedi** (aynı görünen kod, farklı sha). Sabite güvenmek yerine yerel
   kapı **uygulama öncesi `.backup` dosyasıyla satır satır** karşılaştırmaya
   çevrildi — daha güçlü bir kanıt: hedef dışı 77.315 satırda 0 drift.

## 12. Dokunulmayanlar

`37:130`, frozen Tanzil token map, `opening_fatiha` kuralı ve corpus geneli
gloss sorunları (`إِن` 252/253, `وَمَا` 507/507) **değiştirilmedi** — hepsi ayrı
iş kalemi olarak açık duruyor.
