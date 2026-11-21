# Tam denetim görev listesi — 21 Kasım 2026

Kaynak: Play 1.2.3 (vc 23), Samsung A03. Sol cihaz turu (270 görüntü) → Astra denetimi (görüntü + kod) → Claude cihaz doğrulaması → Neon içerik denetimi → Neon görsel denetimi (düğme/kart) → Claude internet araştırması.
Ham raporlar (bu klasörde): `2026-11-21-astra-rapor.md`, `2026-11-21-claude-cihaz-dogrulama.md`, `2026-11-21-neon-icerik-rapor.md`, `2026-11-21-neon-gorsel-rapor.md`. Ekran görüntüleri yalnız scratchpad'de (kalıcı değil).

İşaretler: ✅ = Claude cihazda/görüntüde/kodda doğruladı · 🔎 = internet araştırmasıyla kesinleşti · ◻ = yalnız denetçi bulgusu (doğrulanmadı)

## P0 — Acil (vc 24)
1. ✅ **Android geri tuşu hiçbir ekranda çalışmıyor** (yeni kurulum + onboarding sonrası; Ana Sayfa'da bile çıkmıyor). Tuş Activity'ye ulaşıyor, JS yutuyor. Şüpheli: `app/onboarding.tsx:43` / `src/tour/TourOverlay.tsx:36` BackHandler. Önce uygulamayı kapat-aç ile kalıcı mı test et, sonra kök neden.
2. ✅ **Tecvid renkleri açıkken Arapça harf bağları kopuyor** (Mushaf, ayet detay; Fâtiha'da açıkça). 🔎 Android'de renk sınırı kelime içinde şekillendirmeyi keser → renk kelime ortasında değişmemeli ya da metin bütün şekillendirilip sonra renklendirilmeli. `src/components/TajweedText.tsx`, `app/mushaf-sayfa.tsx`.
3. ✅🔎 **Hz. Âdem kıssasında İblis'in sözü bozuk/anlamı ters**: "Ben ondan hayırlıyım. Beni ateşten yarattın, onu ise çamurdan yarattın." (A'râf 12, Diyanet). `src/data/peygamber_kissalari.json`.
4. ✅ **Günün Duası kartında okunuş yerine ikinci meal** (Enbiyâ 83). Sunucu verisi (`apps/web/src/data/dailyDuaPool.json` / API `reading_tr`); tüm havuzda kontrol.
5. ✅ **Mübarek Günler "DAYANAK" kutusu koyu temada okunmuyor** (açık zemin + açık gri yazı). `app/mubarek-gunler.tsx:112-118, 258-260`.

## P1 — Yüksek
6. ✅ Geri düğmesi yok: Kaynaklar (`hakkinda`), Widget (`widget-ekle`), Namaz Rehberi → başlık + geri düğmesi.
7. ✅ İnternetsiz tefsir: yerel sade tefsir varken "Tefsir yüklenemedi". `app/tafsir/[surahId].tsx:50-118` (hata olunca sade sekmeye geç, sekmeler hep görünsün).
8. ✅ Arama: eski isteğin sonucu yeninin üzerine yazabiliyor (sıra numarası). `app/search.tsx:285-379`.
9. ✅ YENİ: İnternetsiz arama "Arama sırasında hata oluştu" — internet olmadığını söylesin.
10. ◻ İsm-i Azam ekranı: veride olan hadis kaynakları (Tirmizî, Ebû Dâvûd…) gösterilmiyor; "10/10", "Kesin Sünnet" puanlarının yöntemi yok. `app/manevi-siginak/ismi-azam.tsx`, `src/data/ismi_azam_dualari.ts`.
11. ✅ 🔎 **KARAR: Regaib etiketi yumuşatılacak** — tabloda "UYDURMA" yerine "Sahih Değil"; açıklama: "Bu geceye özel namaz rivayeti uydurmadır; Diyanet geceyi dua ve tövbe gecesi olarak anar." `src/data/mubarek_gunler.json` (+ .en), `src/i18n/strings/mubarekGunler.ts:24`.
12. ◻ Koyu temada birincil düğmelerde beyaz yazı yeşil zeminde düşük kontrast (~2,5:1) → `c.actionBg` + `c.actionText` (15+ ekran).
13. ◻ Elif-Ba kartı küçük ekranda altta kesiliyor, "Dokunarak çevir" görünmüyor; 2. ders açıklaması olmayan bir tabloyu tarif ediyor. `app/elifba/[dersId].tsx`, `src/components/ElifbaLessonContent.tsx:28`.

## P2 — Orta (içerik/dil)
14. ✅🔎 Harf-i Tarif q3: "Ed-Dâr(r)" Esmaül Hüsna'da **Dad (ض)** ile başlar → "Dal (د)" yerine "Dad (ض)". Ayrıca tek başına şedde kutu (□) çıkıyor. `src/data/content/harf_i_tarif.json:296, 320-325`.
15. ✅ 🔎 Cenaze namazı "zenitten geçiş" → "güneşin tam tepede olduğu (istiva)". `src/data/ozel_namazlar.json:19`.
16. ✅ Geliştirici adı çelişkisi → her yerde "Kartal Studio" (`src/i18n/strings/hakkinda.ts:16`). Menü "Kaynaklar ve Açıklamalar" ↔ ekran "Kaynaklar ve Lisanslar" eşitlensin.
17. ✅ Kaynaklar ekranında teknik dil ("Canonical Unicode", "provenance manifest", "insan incelemesi tamamlanmamıştır") → sade Türkçe. `packages/core/src/presentation/sourceLicenses.ts:100-148`.
18. ✅ 🔎 **KARAR: "İsm-i Azam"** yazımı (şu an 23 yerde "İsmi Azam") ve ekran adı her yerde **"İsm-i Azam ve Sekine"**.
19. 🔎 Yazım standardı: Kur'an / Kur'an-ı Kerim, zekât, Hz. Muhammed'in (s.a.v.), zikirmatik; "WİDGET" büyük harf dönüşümü düzeltilsin.
20. ✅ Dualar: "Fatiha Suresi (Fâtiha Sûresi)" tekrarı; Fâtiha mealinde ayet sonu noktaları eksik. `src/data/dualar.json:10-13`.
21. ✅ Esma araması şapkasız yazımı bulmuyor ("rahman" → sonuç yok): â/a, î/i, û/u eşdeğer. `app/esma.tsx:22-37`.
22. 🔎 **KARAR (21 Kasım): dersler kilitli/sıralı; seviye testiyle geçiş açık.** Kilitli Elif-Ba dersi bağlantıyla açılıyor; bağlantıyla açılınca başlık yalnız "Ders 5".
23. ◻ Namaz içeriği 3 yere dağınık (Namaz Rehberi / İbadet Rehberi > Namaz / Dersler > Namaz) → kapsam farkı alt yazıda veya çapraz bağlantı.
24. ◻ Kısa rehber İbadet sekmesini tanıtmıyor (bilinçli mi?).
25. ◻ Editör okuması: diğer peygamber kıssaları, Siyer, Hadisler ve yapay zekâ destekli İngilizce çeviriler (ilk kıssada anlam hatası çıktı).

## P2 — Orta (görsel / erişilebilirlik)
> **G paketi kararı (21 Kasım):** Neon raporu `2026-11-21-neon-tasarim-sistemi.md`; kullanıcı "hepsi A". 5 turluk geçiş: ✅ Tur 1 (ortak parçalar `src/components/ui` + 5 ana sekme, 5fbd81c4) · ✅ Tur 2 Kur'an ekranları (2a eea457c4, 2b 3e41dd37, 2c 2b2d9905; A03 açık+koyu) · ✅ Tur 3 Dersler/Elif-Ba (3a 0e3dc944, 3b 9f8627e5) · ✅ Tur 4 Namaz/İbadet Rehberi, Dualar, Tespih (A03 açık+koyu) · ◻ Tur 5 kalanlar.
26. 🔄 **Ortak bileşenler**: uygulamada ortak Button/Card yok. Öneri: `src/components/ui/` altında 3 düğme (birincil/ikincil/metin-ikon, min 48 dp) + 3 kart (menü/vurgu/bilgi kutusu); ölçüler `2026-11-21-neon-gorsel-rapor.md` §5.
27. 🔄 Aynı işlevde 4 farklı ana düğme rengi (yeşil/altın/mor/kahverengi); Favorilerim yeşil ↔ Notlarım kahverengi.
28. 🔄 5 farklı Geri, 4 farklı Kapat görünümü; Elif-Ba ✕ ~24 dp, tema düğmesi 36 dp, Sayacı Sıfırla ~30 dp, ayet ekranı düğmeleri 32–38 dp → 48 dp.
29. 🔄 7 farklı sekme/filtre tasarımı (30–38 dp) → en fazla 2 tür, 44–48 dp.
30. 🔄 Renk sistemi: 12 yeşil, 11 altın, 8 mor sabit kod; `ismi-azam.tsx` ve `ZikirMatik.tsx` kendi temalarını kullanıyor → tek `useColors` paleti + 2–3 anlam rengi.
31. 🔄 Emoji ↔ Ionicons karışımı; dini başlıklarda uygunsuz emojiler (🧼 sabun, 🔱 çatal, ⚔️ kılıç) → tek tip vektör ikon.
32. 🔄 Ekran kenar boşluğu 6 farklı değer → 16 dp; aynı tür kartlarda farklı köşe/ikon ölçüsü.
33. ✅ Kontrast: açık temada "Dersler" altın başlığı ~2,2:1; İsm-i Azam dua anlamı ~3,1:1.
34. ✅ Kök ekranı sure hücreleri ~31×22 dp (48 dp altı); 110/114 "Nas", 81/102 "Tek" aynı kısaltma; ekran okuyucu "1. sure Fât" diyor → az sütun + tam ad.
35. ✅ Sayısal girişlerde erişilebilirlik etiketi yok (sure/ayet no, tespih hedefi).
36. ◻ Elif-Ba "Önceki" ilk kartta pasif ama pasif görünmüyor.
37. ✅ Tespih hapları sabit genişlikte (uzun zikir kesilme riski); Namaz Rehberi sekmeleri tek satır.
38. ✅ Bazı rozet/hata kutuları tema duyarlı değil (kıssa/siyer rozetleri, ana sayfa hata şeridi, ErrorFallback).
41. ◻ Tam ekran `Modal` (Tespih vb.): uygulama teması sistem temasından farklıysa Android durum çubuğu simgeleri ters renkte (sistem koyu + uygulama açık → beyaz simge, açık zeminde kayboluyor). RN modal penceresi görünümü sistem moduna göre ayarlıyor; `expo-status-bar` etkilemiyor. Çözüm adayı: Tespih'i modal yerine route yapmak.

## P3 — Düşük
39. ✅ Mushaf üst çubuğunda "▾" alt satıra düşüyor (`numberOfLines={1}`).
40. 🔎 **KARAR: hitap "sen"** (mevcut çoğunluk ~60/20). Hitap birliği: "sen" / "siz" karışık (Favoriler ↔ Notlar).

## Denenmedi
Büyük yazı boyutu (font_scale), TalkBack, aramada yarış durumu (yavaş ağ), Kıble canlı pusula (konum izni verilmedi), favori/not/hatim dolu durumları.

---

# İş paketleri (araçlara verilecek gruplar)

Araçlar (21 Kasım kararı): Codex şu an yok. Uygulayıcı = **agy Hydrogen** (`gemini-4-hydrogen-*`), Claude denetler. agy'de **Neon kullanılmaz**. Toplu/mekanik işler ve taramalar için opencode ücretsiz modelleri (`opencode/deepseek-v4.1-flash-free`, `opencode/mimo-v2.6-flash-free`). Aynı anda tek uygulayıcı görevi; her paket bitince Claude diff + test/tsc + gerekirse A03 testi. Cihaz/derleme adımlarını Claude yapar.

| Paket | Maddeler | Ne | Kim | Not |
|---|---|---|---|---|
| **A. Geri tuşu ve gezinme** | 1, 6 | Geri tuşunu yutan dinleyiciyi bul/düzelt; 3 ekrana başlık + geri düğmesi | Claude teşhis (cihaz) → Hydrogen kod → Claude A03 testi | vc 24. Önce kapat-aç testi; yeni kurulum senaryosu ile doğrula |
| **B. Tecvid Arapça çizimi** | 2 | Renk kelime ortasında değişince harf bağı kopuyor | Hydrogen prototip → Claude A03 karşılaştırma | vc 24. Riskli; mushaf + ayet ekranı, açık/koyu, tecvid aç/kapa |
| **C. Kesin içerik düzeltmeleri** | 3, 11, 14, 15, 16, 20 | İblis sözü, Regaib etiketi, Ed-Dârr harfi, istiva, geliştirici adı, Fâtiha başlığı/noktalar (TR+EN veri) | Hydrogen (metinler görev metninde hazır verilir) → Claude diff | vc 24. Metinler bu listede kesinleşti |
| **D. Günün Duası okunuşu** | 4 | `reading_tr` alanında meal olan kayıtları bul, gerçek okunuşla düzelt | Claude betikle tara → kullanıcıya şüpheli liste → Hydrogen düzeltir | Sunucu (web) verisi; canlıya alma kullanıcı onaylı |
| **E. Hızlı renk/tema hataları** | 5, 33, 38 | Dayanak kutusu koyu tema, altın başlık ve dua anlamı kontrastı, tema duyarsız rozet/hata kutuları | Hydrogen → Claude açık/koyu kontrol | 5. madde vc 24 |
| **F. Çevrimdışı ve arama** | 7, 8, 9, 21 | Tefsir yerel yedeğe düşsün, arama yarışı, internetsiz arama mesajı, Esma şapkasız arama | Hydrogen → Claude test + uçak modu testi | |
| **G. Tasarım sistemi** | 26 → 12, 27, 28, 29, 30, 31, 32, 36 | Önce tasarım: 3 düğme + 3 kart + renk belirteçleri (Neon taslağı §5) → kullanıcı onayı → ortak bileşenler → ekranlara uygulama (birkaç tur) | Claude taslak (seçenekli) → kullanıcı → Hydrogen aşama aşama | En büyük paket; emoji→ikon (31) dahil. Uygulama turlarını ekran gruplarına böl |
| **H. Elif-Ba** | 13, 22, 36 | Kart küçük ekrana sığsın, 2. ders açıklaması, kilit kararı, pasif "Önceki" | Kullanıcı kararı (kilit) → Hydrogen → Claude A03 | |
| **I. Erişilebilirlik ve dokunma alanları** | 34, 35, 37, 39 | Kök ızgarası (az sütun + tam ad + etiket), sayısal giriş etiketleri, tespih/namaz rehberi taşma, mushaf ▾ | Hydrogen → Claude A03 + büyük yazı testi | "Denenmedi" bölümündeki büyük yazı/TalkBack testleri bu paketle |
| **J. Yazım birliği** | 18, 19, 40, 17 | İsm-i Azam (23 yer) + ekran adı, Kur'an/zekât/Hz. Muhammed'in (s.a.v.), WİDGET, sen/siz birliği, Kaynaklar ekranı sade dil | opencode ücretsiz model toplu düzenleme → Claude diff | Mekanik; sen/siz tercihi kullanıcı kararı |
| **K. İsm-i Azam kaynak gösterimi** | 10 | Hadis kaynaklarını göster, puan dilini kaynaklı ifadeye çevir | Claude içerik önerisi (web kaynaklı) → kullanıcı onayı → Hydrogen | Dini hassasiyet |
| **L. Bilgi mimarisi** | 23, 24 | Namaz içeriğinin 3 yeri, kısa rehberde İbadet sekmesi | Claude öneri → kullanıcı kararı → Hydrogen | Küçük, karar ağırlıklı |
| **M. Editör okuması** | 25 | Kıssalar, Siyer, Hadisler, EN çeviriler: anlam/atıf hatası taraması | opencode ücretsiz model / agy flash toplu tarama (parti parti) → Claude şüpheli liste → kullanıcı | Uzun soluklu; [[audit-claude-first]] düzeni |

**vc 24 önerilen kapsam:** A, B, C, E(5) + D (sunucu, uygulamadan bağımsız yayınlanabilir). Gerisi sonraki sürümler.
