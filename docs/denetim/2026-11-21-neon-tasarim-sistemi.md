# Kuran Yolu — Tasarım Sistemi Önerisi (Görev G)

Bu rapor, önceki [2026-11-21-neon-gorsel-rapor.md](file:///C:/Projects/kuran_app/docs/denetim/2026-11-21-neon-gorsel-rapor.md) denetiminin üzerine kurulmuştur ve görev listesindeki **G paketi (maddeler 12, 26–32, 36)** için uygulanabilir tek tasarım standardını tanımlar. Hiçbir dosya değiştirilmemiştir; aşağıdaki A/B seçenekleri onaylandığında ortak bileşenler üretilip ekranlara aşama aşama uygulanacaktır.

> **Sade terim notu:** **Belirteç (token)** = renk kodu yerine `actionBg` gibi ortak ad kullanmak · **dp** = her telefon ekranında yaklaşık aynı fiziksel boyutu veren ölçü birimi · **WCAG AA (≥4,5:1)** = normal boyutta yazının her göz için rahat okunabilmesi için gereken en düşük açıklık-koyuluk farkı (kontrast) · **İç boşluk (padding)** = kutu kenarı ile içindeki metin arası · **Köşe yarıçapı (borderRadius)** = köşenin yuvarlaklık derecesi · **Dokunma alanı** = parmakla rahat basılabilen alan (en az **48×48 dp**).

---

## 1. Renk Belirteçleri (Mevcut `useColors` Üzerine Sade Palet)

Mevcut [useColors.ts](file:///C:/Projects/kuran_app/apps/mobile/src/hooks/useColors.ts) dosyasında sıcak krem kâğıt (`#f5f0e8` / `#fffdf6`) ve sıcak koyu taş (`#0f0f0f` / `#1c1917`) temeli ile yeni eklenen durum renkleri (`goldText`, `error*`, `note*`, `green*`, `emerald*`, `amber*`, `orange*`, `sky*`, `blue*`, `violet*`, `neutralBadge*`) iyi bir başlangıçtır. Yapılması gereken yeni renk eklemek değil, **rolleri sadeleştirip** kodda sabit yazılmış renkleri bu belirteçlere bağlamaktır.

### 1.1. Çekirdek Roller ve WCAG AA Kontrast Doğrulaması

| Rol | Belirteç Adı | Açık Tema | Koyu Tema | Kontrast (Açık / Koyu) | Not |
|---|---|---|---|---|---|
| **Zemin / Kart / İkincil Yüzey** | `bg` / `card` / `cardAlt` | `#f5f0e8` / `#fffdf6` / `#f5f0e8` | `#0f0f0f` / `#1c1917` / `#292524` | — | Mevcut [useColors.ts](file:///C:/Projects/kuran_app/apps/mobile/src/hooks/useColors.ts#L53-L103) korunur. |
| **Birincil Düğme** | `actionBg` + `actionText` | `#047857` + `#ffffff` | `#10b981` + `#052e21` | **5,48:1** / **5,83:1** ✅ | Tüm ana eylemlerde tek standart (koyu temada `#10b981` + `#fff` = 2,54:1 hatasını bitirir). |
| **Vurgu (İkon / Metin Bağlantısı)** | `accent` (ikon) · `actionBg` (açık tema metin) | `#059669` (ikon) / `#047857` (metin) | `#10b981` | **5,48:1** (metin) / **8,3:1** ✅ | `#059669` açık krem üstünde 3,70:1 kalır; küçük metin düğmelerinde açık temada `actionBg` (`#047857`) kullanılmalı. |
| **İkincil Düğme** | `cardAlt` + `border` + `text` | `#f5f0e8` + `#e7dfcc` + `#1c1917` | `#292524` + `#44403c` + `#fafaf9` | **15,2:1** / **14,1:1** ✅ | Çerçeveli nötr düğme. |
| **Tehlike (Sil / Sıfırla)** | `dangerBg` + `dangerText` *(yeni)* veya `errorBg/Border/Text` | Dolgulu: `#b91c1c` + `#ffffff` · Yumuşak: `errorBg` + `errorText` | Dolgulu: `#dc2626` + `#ffffff` · Yumuşak: `errorBg` + `errorText` | **6,52:1** / **4,83:1** ✅ | "Tümünü Sil" gibi yıkıcı işlemler için (`#ef4444` üstü beyaz 3,76:1 kalır, kullanılmamalı). |
| **Altın / Öne Çıkan Vurgu** | `goldText` + `amberBg` + `amberBorder` | `#92400e` + `#fffbeb` + `#fcd34d` | `#c9a84c` + `#451a03` + `#b45309` | **6,96:1** / **7,95:1** ✅ | Günün Ayeti, Dersler, Kaldığın Yerden Devam Et. |
| **Başarı / Olumlu Kutu** | `greenBg` + `greenBorder` + `greenText` | `#f0fdf4` + `#86efac` + `#15803d` | `#052e16` + `#16a34a` + `#86efac` | **4,92:1** / **10,6:1** ✅ | Sahih, tamamlandı, olumlu not. |
| **Bilgi Kutusu** | `skyBg` + `skyBorder` + `skyText` | `#f0f9ff` + `#7dd3fc` + `#0369a1` | `#082f49` + `#0284c7` + `#7dd3fc` | **5,61:1** / **8,4:1** ✅ | Kapsam notu, açıklama, kültürel bilgi. |
| **Uyarı / Not Kutusu** | `amberBg` + `amberBorder` + `amberText` | `#fffbeb` + `#fcd34d` + `#b45309` | `#451a03` + `#b45309` + `#fcd34d` | **4,88:1** / **9,1:1** ✅ | Dikkat notu, tartışmalı/hasen, ipucu. |
| **Hata / Yasak Kutusu** | `errorBg` + `errorBorder` + `errorText` | `#fef2f2` + `#fca5a5` + `#b91c1c` | `#450a0a` + `#7f1d1d` + `#fca5a5` | **5,89:1** / **8,0:1** ✅ | Hata şeridi, farz/uydurma/yapma uyarısı. |

### 1.2. Kategori Renkleri (En Fazla 5 Ton)
Menü ikon daireleri ve rozetler için mevcut `useColors` içindeki 5 ton yeterlidir; yeni renk icat edilmemelidir:
1. **Zümrüt (`emeraldBg` / `emeraldText`)** — Kur'an, Tespih, Korunma, Sahih.
2. **Kehribar/Altın (`amberBg` / `goldText`)** — Dersler, Günün Ayeti, Esmaül Hüsna, Hadisler.
3. **Mavi (`skyBg` / `skyText` veya `blueBg` / `blueText`)** — Sure Listesi, Namaz Rehberi, Mübarek Günler, Bilgi.
4. **Menekşe (`violetBg` / `violetText`)** — Namaz Vakitleri, Siyer, İbadet Rehberi, Bildirimler.
5. **Nötr (`neutralBadgeBg` / `neutralBadgeText`)** — Gizlilik, genel rozet, pasif etiketler.

*(Kırmızı `errorBg/Text` yalnızca hata, silme ve "farz / uydurma / yapma" gibi keskin sınıflamalarda kullanılır; süsleme kategorisi yapılmaz.)*

### 1.3. Sabit Yazılmış Renklerin Belirteçlere Eşleme Tablosu

| Sabit Renk Grubu | Kodda En Çok Tekrarlanan Kodlar | Örnek Dosya:Satır | Eşleneceği `useColors` Belirteci |
|---|---|---|---|
| **Yeşiller (12 ton)** | `#059669`, `#047857`, `#10b981`, `#4ade80`, `#15803d`, `#065f46`, `#166534`, `#f0fdf4`, `#dcfce7`, `#d1fae5`, `#ecfdf5`, `#022c22` | [sure-listesi.tsx](file:///C:/Projects/kuran_app/apps/mobile/app/sure-listesi.tsx#L25-L30), [dersler/index.tsx](file:///C:/Projects/kuran_app/apps/mobile/app/dersler/index.tsx#L63), [elifba/index.tsx](file:///C:/Projects/kuran_app/apps/mobile/app/elifba/index.tsx#L111), [namaz-rehberi.tsx](file:///C:/Projects/kuran_app/apps/mobile/app/namaz-rehberi.tsx#L61), [manevi-siginak.tsx](file:///C:/Projects/kuran_app/apps/mobile/app/manevi-siginak.tsx#L79), [kuran.tsx](file:///C:/Projects/kuran_app/apps/mobile/app/(tabs)/kuran.tsx#L47-L54) | Düğme: `actionBg` + `actionText` · İkon/çizgi: `accent` · Kutu/rozet: `greenBg/Border/Text` veya `emeraldBg/Border/Text` |
| **Altın / Kehribar / Turuncu (11 ton)** | `#c9a84c`, `#b45309`, `#d97706`, `#f59e0b`, `#92400e`, `#fbbf24`, `#fcd34d`, `#fde68a`, `#fffbeb`, `#fef3c7`, `#422006` | [dersler/index.tsx](file:///C:/Projects/kuran_app/apps/mobile/app/dersler/index.tsx#L63), [notlar.tsx](file:///C:/Projects/kuran_app/apps/mobile/app/notlar.tsx#L142), [ogren.tsx](file:///C:/Projects/kuran_app/apps/mobile/app/(tabs)/ogren.tsx#L70), [daha-fazla.tsx](file:///C:/Projects/kuran_app/apps/mobile/app/(tabs)/daha-fazla.tsx#L161-L162), [index.tsx](file:///C:/Projects/kuran_app/apps/mobile/app/(tabs)/index.tsx#L283-L340), [kuran.tsx](file:///C:/Projects/kuran_app/apps/mobile/app/(tabs)/kuran.tsx#L90-L99) | Başlık/vurgu metni: `goldText` · Kutu: `amberBg/Border/Text` · Seri/turuncu not: `orangeBg/Border/Text` · `notlar.tsx` ana düğmesi: `actionBg/actionText` |
| **Mor / İndigo / Lacivert (8 ton)** | `#4f46e5`, `#7c3aed`, `#6366f1`, `#3730a3`, `#0a1628`, `#ede9fe`, `#eef2ff`, `#0f0a2a` | [elifba/index.tsx](file:///C:/Projects/kuran_app/apps/mobile/app/elifba/index.tsx#L140), [HarfITarifContent.tsx](file:///C:/Projects/kuran_app/apps/mobile/src/components/HarfITarifContent.tsx#L413-L416), [index.tsx](file:///C:/Projects/kuran_app/apps/mobile/app/(tabs)/index.tsx#L346-L408), [sure-listesi.tsx](file:///C:/Projects/kuran_app/apps/mobile/app/sure-listesi.tsx#L53-L54), [ZikirMatik.tsx](file:///C:/Projects/kuran_app/apps/mobile/src/components/ZikirMatik.tsx#L53-L55) | Düğmeler (Elif-Ba, Harf-i Tarif): `actionBg/actionText` · Kart/rozet (Vakitler, Siyer): `violetBg/Text` · `ZikirMatik`: özel araç dairesi korunabilir ama üst/alt denetimler `useColors()` kullanmalı |
| **Yerel Tema Kopyası** | Kendi `useColors()` fonksiyonu | [ismi-azam.tsx](file:///C:/Projects/kuran_app/apps/mobile/app/manevi-siginak/ismi-azam.tsx#L34-L64) | Tamamen kaldırılıp global [useColors.ts](file:///C:/Projects/kuran_app/apps/mobile/src/hooks/useColors.ts) kullanılmalı |

---

## 2. Düğmeler (3 Ana Tür + Tek Tip Geri ve Kapat)

Uygulamada [Polish.tsx](file:///C:/Projects/kuran_app/apps/mobile/src/components/onboarding/Polish.tsx#L30-L50) içindeki `PolishButton` zaten erişilebilirlik (48–52 dp yükseklik, `accessibilityRole`, `busy` göstergesi, basılma gölgesi) açısından çok iyi bir temel sunar; yeni `Button` bileşeni bu temeli tüm uygulamaya yayacaktır.

### 2.1. Birincil Düğme (`variant="primary"`)
- **Kullanım:** Devam, Başla, Sonraki, Teste Başla, Surelere Göz At, Tekrar Dene, Kaydet.
- **Ortak kurallar:** Minimum yükseklik **50–52 dp** (≥48 dp), yatay iç boşluk **20 dp**, yazı **15 dp / kalın (700)**, ikonlu sürümde ikon **20 dp** ve metinle arası **8 dp**.
  - **Pasif (disabled) durumu:** Zemin `cardAlt`, kenarlık `1 dp border`, yazı/ikon `textMuted` (kullanıcı basılamayacağını anında anlar).
  - **Basılı (pressed) durumu:** `%10` koyu/açık perde (`PressShade`) + hafif küçülme yok veya `opacity: 0.88`.
- **Seçenek A — Yumuşak Dikdörtgen (ÖNERİLEN):** Köşe yarıçapı **14 dp**, yükseklik **52 dp**, zemin `actionBg`, yazı `actionText`.
- **Seçenek B — Tam Hap (Pill):** Köşe yarıçapı **999 dp** (tam yuvarlak), yükseklik **48 dp**, zemin `actionBg`, yazı `actionText`.
- **Neden A:** Karşılama ve rehber ekranlarındaki mevcut `PolishButton` (`14 dp`, `52 dp`) ile birebir uyumludur; kartların (`14 dp`) köşe diliyle çelişmez ve yan yana iki düğme (ör. `Önceki` / `Sonraki`) konduğunda dar ekranlarda daha dengeli durur.

### 2.2. İkincil Düğme (`variant="secondary"`)
- **Kullanım:** Önceki, İptal, Rehberi Aç, Sayacı Sıfırla, Sınavla Geç (ikincil eylem).
- **Ortak kurallar:** Minimum yükseklik **48 dp**, yatay iç boşluk **16 dp**, yazı **14 dp / yarı kalın (600)**, ikon **18 dp**, aralık **8 dp**.
  - **Pasif durumu:** `opacity: 0.4`, yazı `textMuted` (`081` Elif-Ba ilk karttaki `Önceki` sorununu çözer).
  - **Basılı durumu:** Zemin `cardAlt` üzerinde `%8` vurgu perdesi.
- **Seçenek A — Hafif Dolgulu + İnce Çerçeve (ÖNERİLEN):** Zemin `cardAlt`, kenarlık `1 dp border`, yazı `text`, köşe **12 dp**.
- **Seçenek B — Saydam + Yeşil Çerçeve (Outline):** Zemin saydam, kenarlık `1,5 dp actionBg`, yazı `actionBg` (koyu temada `accent`), köşe **12 dp**.
- **Neden A:** Birincil yeşil düğmeyle yan yana geldiğinde (ör. `← Önceki` ve `Sonraki →`) görsel olarak rekabet etmez; hiyerarşi anında anlaşılır.

### 2.3. Metin Düğmesi (`variant="ghost"`)
- **Kullanım:** Değiştir, Şimdi değil, Tümünü Oku, Daha fazla/az, Tümünü Sil (`tone="danger"`).
- **Ortak kurallar:** Minimum dokunma alanı **48×48 dp** (görünür metin küçük olsa bile dokunma kutusu 48 dp), köşe **10 dp**, yatay boşluk **12 dp**, yazı **14 dp / yarı kalın (600)**, ikon **18 dp**.
  - **Pasif durumu:** `opacity: 0.4`, yazı `textMuted`.
  - **Basılı durumu:** Arka planda hafif `cardAlt` dolgu belirir.
- **Seçenek A — Vurgu Renkli Metin (ÖNERİLEN):** Eylem bağlantılarında `actionBg` (açık) / `accent` (koyu), nötr ertelemelerde ("Şimdi değil") `textSecondary`, silmede `errorText`.
- **Seçenek B — Altı Çizgili Metin:** Aynı renkler + `textDecorationLine: "underline"`.
- **Neden A:** Sade mobil arayüzlerde alt çizgi ekranı kalabalıklaştırır; yarı kalın ağırlık + vurgu rengi yeterince nettir.

### 2.4. Tek Tip Geri (`BackButton`) ve Kapat (`CloseButton`)
- **Geri Düğmesi:**
  - **Seçenek A — Yalnız Ok İkonu `arrow-back` (ÖNERİLEN):** 48×48 dp dokunma alanı, `Ionicons` `arrow-back` (24 dp), renk `c.text`, zeminsiz.
  - **Seçenek B — `< Geri` İkon + Yazı:** `chevron-back` (20 dp) + "Geri" yazısı (`15 dp`, `c.accent`).
  - **Neden A:** Android kullanıcılarının doğal beklentisidir, Expo Stack varsayılan üst çubuğuyla tam eşleşir, uzun ekran başlıklarına (ör. "Abdest, Gusül ve Teyemmüm") daha fazla yer bırakır.
- **Kapat Düğmesi (`×`):**
  - **Seçenek A — Hafif Daire İçinde `close` İkonu (ÖNERİLEN):** 48×48 dp dokunma alanı içinde görünür **36×36 dp** daire (`cardAlt` zemin), ortasında `Ionicons` `close` (20 dp, `textSecondary`).
  - **Seçenek B — Çıplak `close` İkonu:** 48×48 dp zeminsiz dokunma alanı, `Ionicons` `close` (22 dp, `textMuted`).
  - **Neden A:** Modal ve kart üstünde (ör. Elif-Ba ders açılır penceresi `080`, Tespih `139`, Ruh Hali kartı) kapatma hedefini anında görünür kılar ve tüm ekranlarda tek tip olur.

---

## 3. Kartlar (3 Standart Tür)

Mevcut 7 kart kalıbı aşağıdaki **3 ortak türe** indirilir. Kartlar arası dikey boşluk tüm listelerde **10 dp**, ana sayfa bloklarında **12 dp**, bölümler arası **24 dp** olur.

### 3.1. Liste Satırı (`Card variant="row"`)
- **Kullanım:** Sure listesi (`007`), Arama sonuçları, Kök listesi, Favoriler/Notlar satırları.
- **Ölçüler:** Minimum yükseklik **56 dp**, iç boşluk **12 dp dikey × 16 dp yatay**, başlık **15 dp / 600** (`text`), alt başlık **12 dp / 400** (`textMuted`), sol numara/ikon kutusu **40×40 dp** daire (`borderRadius: 20`).
- **Seçenek A — Düz Satır + İnce Ayırıcı Çizgi (ÖNERİLEN):** Zemin `card`, köşe `0`, alt ayırıcı `1 dp border` (soldan 68 dp içeriden başlar), gölge yok.
- **Seçenek B — Ayrı Küçük Kartlar:** Her satır ayrı `12 dp` köşeli çerçeveli kart, aralarında `8 dp` boşluk.
- **Neden A:** 114 surelik veya uzun arama listelerinde satır başına dikey yer kazandırır, gözü yormaz ve okuma akışını hızlandırır.

### 3.2. Menü / İçerik Kartı (`Card variant="card"`)
- **Kullanım:** Ana sekmelerdeki menü kartları (`Kur'an`, `Öğren`, `İbadet`, `Daha Fazla`), 2 sütunlu ızgara kartları (`Hatim/Favoriler`, `Dersler`), Akordeon (açılır-kapanır) başlıkları, Günün Ayeti / Duası gibi öne çıkan kartlar (`tone="gold"` veya `tone="emerald"` seçeneğiyle).
- **Ölçüler:** İç boşluk **14 dp dikey × 16 dp yatay**, içerik elemanları arası (`gap`) **12 dp**, ikon kutusu **40×40 dp** daire (`borderRadius: 20`, ikon **20 dp**), başlık **15 dp / 700** (`text`), alt başlık **12 dp / 400** (`textMuted`), sağ ok `Ionicons` `chevron-forward` (18 dp, `textMuted`; akordeonda `chevron-down` / `chevron-up`).
- **Seçenek A — Düz + 1 dp İnce Kenarlık, Gölgesiz (ÖNERİLEN):** Köşe **14 dp**, kenarlık `1 dp border`, gölge **yok** (`elevation: 0`). Öne çıkan kartlarda (Günün Ayeti, Dersler) yalnızca zemin/kenarlık belirteci `amberBg/amberBorder` veya `greenBg/greenBorder` olur.
- **Seçenek B — Yumuşak Gölge + Kenarlıksız:** Köşe **16 dp**, kenarlık yok (koyu temada `1 dp border`), açık temada hafif gölge (`elevation: 2`).
- **Neden A:** Kuran Yolu'nun krem kâğıt dokusunda ince kenarlıklı gölgesiz kartlar (`258`, `259`, `260`) çok daha temiz, sakin ve her Android cihazda (düşük bütçeli Samsung A03 dahil) daha akıcı çizilir.

### 3.3. Bilgi / Uyarı Kutusu (`Card variant="callout"`)
- **Kullanım:** Kapsam notu (`144`), Dayanak (`128`), İpucu (`037`), Hata şeridi (`012`), Teselli/uyarı notları (`201`).
- **Ölçüler:** Köşe **12 dp**, iç boşluk **12 dp dikey × 14 dp yatay**, üst etiket **11 dp / 700** büyük harf, gövde **13 dp / 400** (`lineHeight: 20`), sol ikon **18 dp** `Ionicons` (`information-circle-outline`, `warning-outline`, `checkmark-circle-outline`, `alert-circle-outline`).
- **Seçenek A — Tam İnce Çerçeve + Tonlu Zemin (ÖNERİLEN):** `1 dp` ton kenarlığı (`skyBorder` / `amberBorder` / `greenBorder` / `errorBorder`) + yumuşak zemin (`skyBg` / `amberBg` / `greenBg` / `errorBg`).
- **Seçenek B — Sol 3 dp Kalın Vurgu Çizgisi + Nötr Zemin:** Zemin her zaman `cardAlt`, yalnız sol kenarda `3 dp` renkli çizgi.
- **Neden A:** Koyu ve açık temada zaten [useColors.ts](file:///C:/Projects/kuran_app/apps/mobile/src/hooks/useColors.ts#L69-L135) içinde eksiksiz tanımlı olan `Bg/Border/Text` üçlüsüyle birebir çalışır; "Dayanak" gibi kritik uyarıları düz metinden net ayırır.

---

## 4. Sekme ve Filtre Sistemi (7 Tasarımdan 2 Türe)

Şu an 7 farklı sekme/filtre görünümü (`005` Dil, `007` Mushaf/Nüzul, `037` Ayet sekmeleri, `061` Dersler, `081` Elif-Ba modları, `093` Elif-Ba/Harf-i Tarif, `144` Namaz Rehberi, `183` Daha Fazla Dil) var. Bunlar **yalnızca 2 bileşene** indirilir:

1. **Bölmeli Sekme (`Tabs variant="segmented"`) — 2 veya 3 seçenekli ekran içi geçişler:**
   - **Kullanım:** Dil seçici (`005`, `183`), Mushaf/Nüzul (`007`), Namaz Rehberi (`144`), Dersler sıralama (`061`), Elif-Ba / Harf-i Tarif (`093`).
   - **Ölçüler:** Dış kutu zemin `cardAlt`, kenarlık `1 dp border`, köşe **12 dp**, iç boşluk **4 dp**, toplam yükseklik **48 dp**. Aktif bölme: zemin `actionBg`, yazı `actionText` (`13 dp / 700`), köşe **8 dp**, yükseklik **40 dp**. Pasif bölme: saydam zemin, yazı `textSecondary` (`13 dp / 600`). **Emoji yok.**
2. **Hap Filtre (`Tabs variant="pill"`) — 4+ seçenekli veya yatay kaydırmalı filtreler:**
   - **Kullanım:** Ayet detay sekmeleri (`Meal / Kelimeler / Kökler / Analiz`), Elif-Ba 4 modu (`Kartlar / Test / Alıştırma / Dinle`), Ruh Hali satırı (`016`).
   - **Ölçüler:** Her hap `minHeight: 44 dp` (dikey 2 dp dış boşlukla 48 dp dokunma alanı), yatay iç boşluk **14 dp**, köşe **22 dp** (tam hap), aralık **8 dp**, yazı **13 dp / 600**. Aktif: `actionBg` + `actionText`; pasif: `card` + `1 dp border` + `textSecondary`. İkon gerekirse `16 dp` `Ionicons`.

---

## 5. Boşluk ve Tipografi Ölçeği

### 5.1. Ekran Kenar Boşluğu ve 4'ün Katı Boşluk Ölçeği
- **Tek Ekran Kenar Boşluğu (Gutter):** Tüm ekranlarda yatay kenar boşluğu **`16 dp`** (şu an 10, 12, 14, 16, 20, 24 dp karışık). Tablet/geniş ekran sınırı mevcut `READING_MAX_WIDTH` (`680 dp`) her listede (`notlar.tsx` dahil) uygulanır.
- **4'ün Katı Boşluk Ölçeği (`spacing`):**
  - `4 dp` — Çok yakın ikili (etiket-rozet, başlık-alt başlık)
  - `8 dp` — Küçük aralık (ikon-metin, haplar arası)
  - `12 dp` — Kart içi eleman aralığı, ana sayfa kartları arası
  - `16 dp` — Ekran dış kenar boşluğu, standart kart iç boşluğu
  - `24 dp` — Bölümler arası dikey boşluk
  - `32 dp` — Ekran alt son boşluğu (`insets.bottom` üzerine)

### 5.2. Tipografi (Yazı) Ölçeği (6 Basamak)
*(Arapça Kur'an/dua metinleri kullanıcının kendi yazı boyutu ayarına bağlı kalır; aşağıdaki ölçek Türkçe/İngilizce arayüz içindir.)*

| Basamak | Boyut / Satır Yüksekliği | Ağırlık | Kullanım Yeri |
|---|---|---|---|
| **Ekran Başlığı (`display`)** | `26 dp` / `32 dp` | `800` | Sekme ana başlıkları (Kur'an-ı Kerim, Öğren, İbadet, Daha Fazla) |
| **Üst Çubuk / Modal Başlığı (`title`)** | `19 dp` / `24 dp` | `700` | Alt ekran başlığı, açılır pencere başlığı |
| **Kart Başlığı (`cardTitle`)** | `15 dp` / `21 dp` | `700` | Menü kartı, akordeon başlığı, sure adı |
| **Gövde Metni (`body`)** | `14 dp` / `21 dp` | `400` | Meal, açıklamalar, ders metinleri, notlar |
| **Yardımcı Metin (`caption`)** | `12 dp` / `17 dp` | `400–600` | Kart alt başlığı, kaynak satırı, tarih |
| **Etiket / Rozet (`label`)** | `11 dp` / `14 dp` | `700` | Bölüm üst başlığı (büyük harf), Farz/Sünnet/Mekke rozetleri |

---

## 6. Emoji → Ionicons Dönüşüm Listesi

Ana sekmeler zaten temiz `Ionicons` çizgi ikonları kullanıyor; alt ekranlardaki emojiler iki ayrı uygulama hissi veriyor ve bazı dini başlıklarda uygunsuz görseller oluşturuyor.

### 6.1. Dini Başlıklarda Uygunsuz / Hatalı Emojiler (Öncelikli Değişim)

| Dosya:Satır | Mevcut Emoji ve Başlık | Sorun | Önerilen `Ionicons` Adı |
|---|---|---|---|
| [namaz-rehberi.tsx:361](file:///C:/Projects/kuran_app/apps/mobile/app/namaz-rehberi.tsx#L361) | `🧼` Namaza Başlamadan Önce | Sabun kalıbı, ibadet bağlamına uygunsuz | `water-outline` |
| [manevi-siginak.tsx:230](file:///C:/Projects/kuran_app/apps/mobile/app/manevi-siginak.tsx#L230) | `⚔️` Genel Korunma Kalkanı | Çapraz kılıç, manevi sığınak için sert/uygunsuz | `shield-checkmark-outline` |
| [manevi-siginak.tsx:237](file:///C:/Projects/kuran_app/apps/mobile/app/manevi-siginak.tsx#L237) | `🔱` Büyü ve Sihir | Mitolojik üç dişli çatal, dini içerikte uygunsuz | `shield-outline` |
| [manevi-siginak.tsx:281](file:///C:/Projects/kuran_app/apps/mobile/app/manevi-siginak.tsx#L281) | `💊` Şifa — Kur'an ile İyileşme | İlaç kapsülü, manevi şifa başlığıyla uyumsuz | `heart-outline` veya `medkit-outline` |
| [manevi-siginak.tsx:271](file:///C:/Projects/kuran_app/apps/mobile/app/manevi-siginak.tsx#L271) | `🌪️` Şeytan Vesvesesi | Hortum emojisi, ciddiyeti bozuyor | `cloudy-outline` veya `pulse-outline` |
| [ibadet_rehberi.json:878](file:///C:/Projects/kuran_app/apps/mobile/src/data/content/ibadet_rehberi.json#L878) | `🚿` Gusül (Boy Abdesti) | Duş başlığı görseli basit/uygunsuz | `water` |
| [namaz-rehberi.tsx:101](file:///C:/Projects/kuran_app/apps/mobile/app/namaz-rehberi.tsx#L101) | `🧘` Huşu ve Kalp | Yoga/meditasyon pozu, İslami huşu için uygunsuz | `heart-outline` |
| [siyer_i_nebi.json:71](file:///C:/Projects/kuran_app/apps/mobile/src/data/siyer_i_nebi.json#L71) | `⚔️` Medine — Savaşlar ve Antlaşmalar | Çapraz kılıç yerine tarihî/dengeli ikon | `flag-outline` veya `shield-half-outline` |
| [dersler_registry.ts:236](file:///C:/Projects/kuran_app/apps/mobile/src/data/Dersler/dersler_registry.ts#L236) | `🐑` Kurban | Karikatürize koyun emojisi | `gift-outline` veya `heart-circle-outline` |
| [dersler_registry.ts:245](file:///C:/Projects/kuran_app/apps/mobile/src/data/Dersler/dersler_registry.ts#L245) | `🪞` Nefsini Tanı | Aynalı dekor emojisi | `person-circle-outline` |

### 6.2. Genel Arayüz Emojileri ve Kararlar

| Ekran / Dosya | Mevcut Emojiler | Karar ve Önerilen `Ionicons` |
|---|---|---|
| **Elif-Ba mod sekmeleri** (`elifba/[dersId].tsx`, `strings/elifba.ts`) | `🃏` Kartlar, `🧠` Test, `🎧` Dinle (`🎧` koyu zeminde kayboluyor) | **İkona çevir:** `layers-outline`, `help-circle-outline`, `headset-outline`, `create-outline` |
| **Sure Listesi sekmeleri** ([sure-listesi.tsx](file:///C:/Projects/kuran_app/apps/mobile/app/sure-listesi.tsx#L173), `strings/surahs.ts`) | `📖` Mushaf Sırası, `🕰️` Nüzul Sırası | **Emojisiz sade metin** (veya `book-outline` / `time-outline`) |
| **Dersler ızgara kartları** ([dersler_registry.ts:233–282](file:///C:/Projects/kuran_app/apps/mobile/src/data/Dersler/dersler_registry.ts#L233-L282)) | `🕌`, `📿`, `🌙`, `🕋`, `📖`, `📚`, `🤝`, `⭐`, `🕊`, `🌿`, `📜`, `💧`, `🔊`, `🤲`, `🔤` | **İkona çevir:** `business-outline` (Namaz), `radio-button-on-outline` (Dualar), `moon-outline` (Oruç), `compass-outline` (Hac), `book-outline` (İman), `library-outline` (Kitaplar), `people-outline` (Ahlak), `star-outline` (Peygamberler), `ribbon-outline` (Sahabe), `leaf-outline` (Siyer), `document-text-outline` (Tecvid), `water-outline` (Abdest), `volume-high-outline` (Ezan), `hand-left-outline` (Zekât), `text-outline` (Elif-Ba) |
| **Namaz Rehberi vakit/bölüm** ([namaz-rehberi.tsx:84–104, 316–358](file:///C:/Projects/kuran_app/apps/mobile/app/namaz-rehberi.tsx#L84-L104)) | `🌅☀️🌤️🌆🌙🌌`, `🌱📘🕐`, `💚ℹ️` | **İkona çevir:** Vakitlerde Ana Sayfa'daki `PRAYER_ICONS` (`sunny-outline`, `sunny`, `partly-sunny-outline`, `cloudy-night-outline`, `moon`, `sparkles-outline`); bölümlerde `leaf-outline`, `book-outline`, `time-outline`, `information-circle-outline` |
| **İbadet Rehberi** ([ibadet-rehberi.tsx:196–248](file:///C:/Projects/kuran_app/apps/mobile/app/ibadet-rehberi.tsx#L196-L248), [ibadet_rehberi.json](file:///C:/Projects/kuran_app/apps/mobile/src/data/content/ibadet_rehberi.json#L5-L115)) | `🌙🕌🌟💛🕋💧🌿` | **İkona çevir:** `moon-outline`, `book-outline`, `star-outline`, `heart-outline`, `compass-outline`, `water-outline`, `leaf-outline` |
| **Manevi Sığınak & İsm-i Azam puanları** ([manevi-siginak.tsx:49–54, 219](file:///C:/Projects/kuran_app/apps/mobile/app/manevi-siginak.tsx#L49-L54), [ismi-azam.tsx:103–109](file:///C:/Projects/kuran_app/apps/mobile/app/manevi-siginak/ismi-azam.tsx#L103-L109)) | `🟢🟡🔴🟣`, `✨`, `👁️`, `💚`, `📖` | **Renkli nokta emojilerini kaldır** (rozet zaten renkli; gerekirse 6 dp dolu `View` noktası). `✨` → `sparkles-outline`, `👁️` → `eye-outline`, `💚` → `heart-outline`, `📖` → `book-outline` |
| **Siyer, Mübarek Günler, Dualar, Kıssalar** ([siyer_i_nebi.json:23–79](file:///C:/Projects/kuran_app/apps/mobile/src/data/siyer_i_nebi.json#L23-L79), [mubarek-gunler.tsx:140–174](file:///C:/Projects/kuran_app/apps/mobile/app/mubarek-gunler.tsx#L140-L174), [dualar.tsx:85–92](file:///C:/Projects/kuran_app/apps/mobile/app/dualar.tsx#L85-L92), [peygamber-kissalari.tsx:106](file:///C:/Projects/kuran_app/apps/mobile/app/peygamber-kissalari.tsx#L106)) | `🕌🌙⭐📖🌟🕊️🌍`, `📅📚`, `📎🕐ℹ️` | **İkona çevir:** `calendar-outline`, `moon-outline`, `star-outline`, `book-outline`, `time-outline`, `information-circle-outline`, `attach-outline` |
| **Ana Sayfa "Ruh Haline Göre"** ([index.tsx:57–68](file:///C:/Projects/kuran_app/apps/mobile/app/(tabs)/index.tsx#L57-L68)) | `😌💪🙏🌟⚖️💔🧭🤲📿🍃` | **Öneri: İkona çevir** (`leaf-outline`, `shield-outline`, `refresh-outline`, `sparkles-outline`, `scale-outline`, `heart-dislike-outline`, `compass-outline`, `hand-left-outline`, `radio-button-on-outline`, `sunny-outline`). *İstisna:* Kullanıcı sıcak/duygusal bulursa yalnızca bu yatay şeritte **emoji kalabilir**. |
| **Paylaşım metinleri (`Share.share`)** ([dualar.tsx:64](file:///C:/Projects/kuran_app/apps/mobile/app/dualar.tsx#L64), [mubarek-gunler.tsx:190](file:///C:/Projects/kuran_app/apps/mobile/app/mubarek-gunler.tsx#L190)) | `🤲`, `🌙` (WhatsApp/SMS metninde) | **Emoji kalsın** — uygulama dışı düz metin paylaşımında ikon gösterilemez. |

---

## 7. Ortak Bileşen API Önerisi (`src/components/ui/`)

Her bileşen `useColors()` kullanır, `accessibilityRole` / `accessibilityState` ve minimum **48 dp** dokunma alanını otomatik sağlar.

```ts
// 1. Button.tsx (PolishButton'ın genelleştirilmiş hali)
type ButtonProps = {
  label?: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  tone?: "default" | "danger";
  size?: "md" | "lg"; // md: 48dp, lg: 52dp
  icon?: IoniconName;
  trailingIcon?: IoniconName;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

// 2. Card.tsx
type CardProps = {
  variant?: "row" | "card" | "callout";
  tone?: "default" | "gold" | "emerald" | "info" | "warning" | "error";
  title?: string;
  subtitle?: string;
  icon?: IoniconName;
  iconTone?: "emerald" | "amber" | "sky" | "violet" | "neutral";
  trailing?: "chevron" | "none" | React.ReactNode;
  onPress?: () => void;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

// 3. Badge.tsx
type BadgeProps = {
  label: string;
  tone?: "emerald" | "amber" | "sky" | "violet" | "error" | "neutral";
  size?: "sm" | "md";
};

// 4. Tabs.tsx
type TabsProps<T extends string> = {
  variant?: "segmented" | "pill";
  items: { key: T; label: string; icon?: IoniconName }[];
  value: T;
  onChange: (key: T) => void;
};

// 5. BackButton.tsx & CloseButton.tsx
type BackButtonProps = { onPress?: () => void; accessibilityLabel?: string };
type CloseButtonProps = { onPress: () => void; accessibilityLabel?: string };
```

---

## 8. Aşamalı Geçiş Planı (5 Tur)

Her tur bağımsız test edilebilir ve geri alınabilir büyüklükte planlanmıştır:

| Tur | Kapsam ve Dosyalar | Risk | Cihazda (Samsung A03) Kontrol Edilecekler |
|---|---|---|---|
| **Tur 1: Temel Bileşenler + Ana Sekmeler** | `src/components/ui/` (`Button`, `Card`, `Badge`, `Tabs`, `BackButton`, `CloseButton`), `useColors.ts` (`dangerBg/Text` eklemesi), `app/(tabs)/index.tsx`, `kuran.tsx`, `ogren.tsx`, `ibadet.tsx`, `daha-fazla.tsx`, `HomeWelcomeCards.tsx` | **Düşük–Orta** (Ana sekmeler çok görünür; rehber turları `useTourTarget` ref'leri korunmalı) | 5 sekmenin açık + koyu temada görsel bütünlüğü, Dil seçicinin yeni `Tabs` hali, tema düğmesinin 48 dp dokunma alanı, Uygulama Rehberi vurgularının kaymaması. |
| **Tur 2: Kur'an Ekranları** | `app/sure-listesi.tsx`, `app/surah/[id].tsx`, `app/ayah/[surahId]/[ayahNumber].tsx`, `app/mushaf-sayfa.tsx`, `app/tafsir/[surahId].tsx`, `app/search.tsx`, `app/favoriler.tsx`, `app/notlar.tsx` | **Orta** (Okuma ve ayet alt çubuğu yoğun; `notlar.tsx` kahverengi→yeşil düğme + `READING_MAX_WIDTH`) | Sure listesi Mushaf/Nüzul sekmesi kontrastı, Ayet detayında Meal/Kelimeler/Kökler/Analiz hapları ve Önceki/Sonraki kontrastı, Favoriler ve Notlar boş/dolu eşitliği. |
| **Tur 3: Öğrenme Ekranları (Dersler & Elif-Ba)** | `app/dersler/index.tsx`, `app/dersler/[id].tsx`, `src/data/Dersler/dersler_registry.ts`, `app/elifba/index.tsx`, `app/elifba/[dersId].tsx`, `src/components/HarfITarifContent.tsx` | **Orta–Yüksek** (Ders ikonları emoji→Ionicons; Elif-Ba kart yüksekliği ve pasif `Önceki` durumu) | Dersler 2 sütunlu ızgara (açık/koyu), Elif-Ba modal kapatma (`CloseButton`), 1/28 harfinde `Önceki` pasif görünümü, `Kartlar/Test/Dinle` sekmesinde ikon görünürlüğü. |
| **Tur 4: İbadet ve Rehber Ekranları** | `app/namaz-rehberi.tsx`, `app/ibadet-rehberi.tsx`, `src/data/content/ibadet_rehberi.json`, `app/dualar.tsx`, `src/components/ZikirMatik.tsx` | **Orta** (Büyük dosyalar; 🧼 ve 🚿 emojilerinin değişimi; Tespih özel dairesini bozmadan üst/alt kontrolleri hizalama) | Namaz Rehberi 3 sekmesinin tek satıra sığması ve geri düğmesi, İbadet Rehberi akordeonları, Tespih `Sayacı Sıfırla` 48 dp yüksekliği. |
| **Tur 5: Kültür, Manevi Sığınak ve Kalanlar** | `app/manevi-siginak.tsx`, `app/manevi-siginak/ismi-azam.tsx` (yerel `useColors` kaldırılır), `app/mubarek-gunler.tsx`, `app/peygamber-kissalari.tsx`, `app/siyer.tsx`, `src/data/siyer_i_nebi.json`, `app/hadisler.tsx`, `app/esma.tsx`, `app/hakkinda.tsx`, `app/widget-ekle.tsx`, `app/gizlilik.tsx` | **Düşük–Orta** (⚔️, 🔱, 💊 emojilerinin değişimi; `ismi-azam.tsx` renk geçişi) | Manevi Sığınak ve İsm-i Azam'ın açık + koyu temada diğer ekranlarla aynı kâğıt/taş zeminine oturması, tüm bilgi/dayanak kutularında okunabilirlik. |

---

## 9. Kullanıcıya Kısa Özet ve Verilecek Kararlar

Uygulamanın 5 ana sekmesi düzenli görünse de alt ekranlarda ortak düğme ve kart bileşeni olmadığı için 4 farklı ana düğme rengi, 5 farklı Geri düğmesi, 7 farklı sekme tasarımı ve dini başlıklarda uygunsuz emojiler (🧼, 🔱, ⚔️, 🚿, 🧘) birikmiş durumda. Yeni bir kütüphane eklemeden, mevcut renk sisteminin üstüne **6 küçük ortak bileşen** kurarak tüm ekranları 5 turda tek ve sakin bir görünüme kavuşturabiliriz.

**Başlamadan önce onaylamanız gereken 6 kısa karar:**

1. **Birincil düğme şekli:** **A) Yumuşak köşeli dikdörtgen (14 dp — Önerilen)** mı, **B) Tam yuvarlak hap** mı?
2. **İkincil düğme görünümü:** **A) Hafif zeminli ince çerçeveli (Önerilen)** mi, **B) Saydam, yeşil kenarlıklı** mı?
3. **Geri düğmesi:** **A) Yalnız `←` oku (Önerilen, Android standardı)** mı, **B) `< Geri` yazılı** mı?
4. **Kapat (`×`) düğmesi:** **A) Hafif daire içinde `×` (Önerilen)** mi, **B) Zeminsiz çıplak `×`** mı?
5. **Kart görünümü:** **A) Gölgesiz, ince 1 dp kenarlıklı (Önerilen)** mi, **B) Kenarlıksız, hafif gölgeli** mi?
6. **Ruh Hali şeridi (Ana Sayfa):** Dini başlıklardaki tüm emojileri (🧼, 🔱, ⚔️, 🚿, 🧘 vb.) tek renkli temiz ikonlara çeviriyoruz; **yalnızca Ana Sayfa'daki "Huzur / Sabır / Şükür" ruh hali satırında** emojiler kalsın mı, yoksa onlar da temiz ikona dönsün mü? *(Öneri: Hepsi ikona dönsün, tam bütünlük sağlansın.)*
