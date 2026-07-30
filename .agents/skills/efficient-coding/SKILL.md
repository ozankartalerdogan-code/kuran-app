---
name: efficient-coding
description: Kod yazma/değiştirme, repo inceleme, bug fix, feature, refactor, test, build, veri hattı veya değerlendirme görevlerinde otomatik kullan. En küçük doğru sistemi ve en az yeterli kanıtı üret; gereksiz bağlam, araç turu, alt ajan, log, çıktı, tekrar çalışma ve raporu azalt. Kaliteyi, güvenliği, reasoning seviyesini ve gerekli doğrulamayı asla azaltma.
---

# Verimli Kodlama ve Orkestrasyon

## Ana ilke

**En az satırı değil, ihtiyacı eksiksiz karşılayan en küçük doğru sistemi; en çok faaliyeti değil, kararı kanıtlayan en az yeterli doğrulamayı üret.**

Tasarruf; daha az düşünmek, gerekli bağlamı atlamak veya test/güvenlik azaltmak değildir. Yalnız israfı kaldır.

## 1. Tek yürütme sahibi

Bu skill kod görevinin ana yürütücüsüdür.

- Planı, dosya sahipliğini, değişiklikleri, doğrulamayı ve nihai raporu tek ana ajan yönetir.
- Başka skill'i yalnız gerçekten uzman ve proje-özel prosedür gerekiyorsa uygula; skill zinciri veya döngüsü kurma.
- Aynı işi iki ajan, iki script veya iki doğrulama yoluna paralel verme.
- Alt ajan varsayılan olarak kullanma.
- Alt ajan yalnız iş bağımsız kollara ayrılıyorsa, context izolasyonu belirgin fayda sağlıyorsa ve toplam maliyet düşüyorsa kullanılabilir.
- Alt ajana kesin soru, izinli dosyalar, beklenen artifact ve durma koşulu ver; başka alt ajan çağırmasına izin verme.
- Ortak dosya/veri yüzeyine eşzamanlı yazdırma. Ana context'e ham çıktı değil yalnız karar veren kısa delta getir.

## 2. Bağlam merdiveni

Şu sırayla ilerle ve karar desteklenince dur:

1. Konuşmada doğrulanmış bilgi, repo talimatı ve mevcut checkpoint
2. Hedef sembol/dosya için kesin arama
3. İlgili aralık ve doğrudan çağrı zinciri
4. En yakın çalışan repo pattern'i ve hedefli test
5. Yalnız gerçek belirsizlik kalırsa geniş tarama veya alt ajan

- Tüm repoyu “genel resim” için tarama.
- Aynı dosyayı girdiler değişmeden tekrar okuma.
- Büyük dosyada yalnız ilgili aralığı oku.
- Başarılı edit sonrası tüm dosyayı yeniden okuma; hedefli diff veya gerçek doğrulama kullan.
- Bir komutla alınabilecek kanıt için art arda küçük araç çağrıları yapma.

## 3. İş ve çıktı bütçesi

Başlamadan içinden maliyet çarpanlarını belirle: dosya, kayıt, varyant, eşik, test, build, rapor ve tekrar sayısı.

- Büyük işi atomik aşamalara böl; her aşama tek karar veya artifact üretsin.
- Hesaplamayı script/test içinde yap; modele binlerce kayıt, diff, log veya metriği anlattırma.
- Büyük sonuçları JSON/JSONL/CSV/manifestte tut; sohbete yalnız özet, istisna ve karar getir.
- Aynı veriyi farklı formatlarda çoğaltma; yalnız tüketici gerektiriyorsa üret.
- Başarılı komutun tam logunu context'e veya kullanıcıya dökme.
- Kullanıcı istemedikçe ara rapor, uzun metodoloji, tam diff veya dosya içeriği üretme.
- Nihai yanıt varsayılan olarak 300 kelimeyi geçmesin; kullanıcı belirli şema istediyse yalnız o alanları doldur.
- Hash'i kullanıcı mesajına yalnız istendiğinde veya artifact kimliğini ayırt etmek gerçekten gerektiğinde koy.

## 4. Kota ve context güvenli checkpoint

Uzun veri, adjudication, migration, build veya çok aşamalı görevlerde:

- Her pahalı ve tekrar edilmesi maliyetli aşamadan sonra atomik checkpoint yaz.
- Checkpoint yalnız gerekli alanları içersin: tamamlanan aşama, girdi/config kimliği, artifact yolları, gerekli hash'ler ve sıradaki tek adım.
- Hash'i yalnız freeze, provenance, determinism veya güvenli resume için gerekli artifact'lerde üret.
- Devam ederken önce checkpoint ve değişen girdileri kontrol et; tamamlanan keşif, adjudication, build veya raporu yeniden üretme.
- Context sıkışması veya kota baskısı belirirse yeni pahalı aşama başlatma. Mevcut atomik yazımı bitir, checkpoint'i doğrula ve dar devam talimatı bırak.
- Geçerli checkpoint varken “emin olmak için” tam hattı tekrar çalıştırma.

## 5. Uygulama modu

### Bug fix

Reproduction/kanıt → kök neden → en dar tutarlı patch → mümkünse regresyon testi → hedefli doğrulama.

### Mevcut sisteme özellik

En yakın repo pattern'ini, helper'ı ve public contract'ı koru. Yalnız kabul ölçütünü uygula; ilgisiz refactor yapma.

### Sıfırdan sistem

En ince çalışan dikey dilim: ana akış, gerçek hata yolları, minimum veri sınırı, tekrarlanabilir çalıştırma ve gerekli test.

### Büyük veri/değerlendirme hattı

- Geliştirme, diagnostic ve bağımsız holdout verisini ayır.
- Leakage önleyici freeze/hash kapısını kodla; yalnız prose ile vaat etme.
- Tekil kayıt ezberleyen kural yerine genellenebilir özellik kanıtı iste.
- Varyant × eşik × slice hesabını tek değerlendirme scriptinde üret.
- Adjudication paketini kör, kompakt ve deterministik tut; kayıt başına karar + kısa gerekçe yeterlidir.
- Normalizasyon, candidate generation, ranker ve lexicon sorunlarını birbirine gizletme.
- Holdout etiketlerini kod/config freeze öncesinde geliştirme akışından erişilemez tut.

## 6. Patch ve dependency disiplini

- En az sayıda tutarlı dosyayı değiştir; sorumlulukları yapay biçimde tek dosyaya sıkıştırma.
- Hedefli patch kullan; tüm dosyayı yeniden yazma.
- İlgisiz stil, rename veya refactor yapma.
- Dead code, debug, kullanılmayan import/dependency veya spekülatif TODO bırakma.
- Yeni abstraction için en az iki gerçek kullanım ve daha düşük zihinsel yük ara.
- Yeni dependency öncesi standart kütüphane, mevcut paket ve küçük lokal çözümü kontrol et.
- İlgisiz dirty worktree değişikliklerine dokunma.
- Üretilen veri/manifest yazımlarını atomik ve deterministik yap.

## 7. Uzun komut modu

Yaklaşık 30 saniyeden uzun, yüksek çıktılı veya artifact doğrulaması gereken non-interactive komutlarda:

- Tam komutu, çalışma dizinini, dış etkisini, başarı koşulunu ve beklenen artifact'i belirle.
- Aynı process zaten çalışıyorsa yenisini başlatma.
- Komutu bir kez çalıştır. Mümkünse tek uzun timeout kullan; session/polling gerekiyorsa seyrek kontrol et ve sessizliği hata sayma.
- Çıktıyı secret içermediği doğrulanmış geçici loga yönlendir; context'e yalnız yüksek sinyalli özet veya ilk gerçek hata çevresini al.
- Yaklaşık iki dakikayı aşan, pahalı veya context kesilmesi riski olan çalışmada `.agent-runs/<run-id>/status.json` receipt'i tut: komut, çalışma dizini, durum, exit code, log, beklenen artifact ve retry sayısı. `.agent-runs/` Git tarafından izlenmemelidir.
- Başarıyı yalnız exit code ile değil, gerekli success sinyali, test özeti, sıfırdan büyük artifact, hash/imza/invariant ile doğrula.
- Hata halinde önce yüksek sinyalli kalıpları ara, ilk gerçek hata çevresini oku; yetmezse ilgili daha geniş bölgeye açıl. Tail'i otomatik kök neden sayma.
- Retry en fazla bir kez ve yalnız geçici neden kanıtlı, işlem idempotent/read-only ve duplicate dış etki riski yoksa yapılabilir.
- Code/test/typecheck, CMake/Ninja/linker, signing, migration apply, production deploy veya destructive hata için otomatik retry yapma.
- Başarı sonrası gereksiz log/receipt'i kaldır; yüksek riskli işlemde postflight bitene, başarısızlıkta teşhis tamamlanana kadar kanıtı koru.
- Interactive auth, credentials, parola, 2FA, onay veya production-write komutlarını kör log yönlendirmesiyle çalıştırma.

## 8. Doğrulama merdiveni

Risk kadar yüksel:

1. Kabul örneği/reproduction
2. Syntax/compile
3. Hedefli test
4. İlgili suite
5. Typecheck/lint
6. Tam suite/build — yalnız geniş etki, repo kuralı veya release kanıtı gerekiyorsa

- Geçerli kanıtı tekrar etme.
- Kod/config/girdi/ortam değiştiyse yalnız etkilenen kanıtı yenile.
- Aynı başarısız komutu neden değişmeden tekrar çalıştırma.
- Yapılmayan kontrolü yapılmış gibi gösterme.

## 9. Güvenlik ve yetki sınırı

Açık yetki olmadan geniş refactor, major upgrade, public API kırma, gerçek migration, deploy/publish, production değişikliği, yeni signing key, zorunlu test silme/atlama, `git reset`, `git clean`, geniş checkout veya dirty worktree stash yapma.

Secret, 2FA, ödeme, belirsiz geri alınamaz seçim veya yetkisiz dış etki gerektiğinde dur.

## 10. Tamamlanma ve rapor

Bitirmeden hedefli diff ve gerekli artifact'leri kontrol et:

- Talep dışı dosya/davranış var mı?
- Daha küçük ve açık çözüm mümkün mü?
- Güvenlik, hata yönetimi veya edge-case eksildi mi?
- Kod gerçekten çalıştı mı?
- Deterministik olması gereken artifact eşdeğer iki çalıştırmada aynı sonucu veriyor mu?

Kullanıcıya yalnız şunları ver:

- ne değişti ve neden;
- geçen en küçük yeterli doğrulama;
- yapılmayan önemli kontrol;
- açık risk/blocker;
- varsa checkpoint ve sıradaki tek adım.
