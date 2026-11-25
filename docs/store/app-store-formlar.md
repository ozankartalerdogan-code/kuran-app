# App Store Connect — yaş derecelendirmesi + App Privacy cevapları (taslak, 24 Kas)

Kaynak: koddaki gerçek davranış (apps/mobile: Firebase Analytics/Auth/Firestore, Sentry, expo-location, AsyncStorage) + docs/denetim/2026-11-23-ios-is-plani.md. ASC'ye kullanıcı onayıyla girilecek.

## Yaş derecelendirmesi (hedef: 4+)
- Şiddet, cinsellik, küfür, korku, uyuşturucu/alkol/tütün, kumar, yarışma: **Yok**.
- Tıbbi/tedavi bilgisi: **Yok**. ("Manevi şifa duaları" tıbbi tavsiye değildir.)
- Kullanıcı tarafından oluşturulan içerik / sosyal medya / sohbet / kullanıcılar arası iletişim: **Hayır**. (Notlar ve favoriler yalnız kullanıcının kendisinde; başkası göremez.)
- Konum paylaşımı (başka kullanıcılarla): **Hayır**.
- Sınırsız web erişimi: **Hayır** (uygulama içi tarayıcı yok; dış bağlantılar sistem tarayıcısında).
- Reklam: **Hayır**. Uygulama içi satın alma: **Hayır**. Kumar/sanal para: **Hayır**.
- Yaş doğrulama / ebeveyn denetimi: **Hayır**.
- "Made for Kids" (Çocuklar kategorisi): **İŞARETLENMEZ**.

## App Privacy
Genel: **İzleme (tracking) yok** — reklam kimliği yok, veri reklam/veri aracısıyla paylaşılmıyor (PrivacyInfo: NSPrivacyTracking=false).

| Veri türü | Kaynak | Amaç | Kullanıcıya bağlı mı | İzleme |
|---|---|---|---|---|
| Ürün etkileşimi (Usage Data › Product Interaction) | Firebase Analytics (ekran/özellik olayları) | Analitik | Hayır | Hayır |
| Çökme verisi + Performans (Diagnostics) | Sentry | Uygulama işlevi / analitik | Hayır | Hayır |
| Kullanıcı kimliği (Identifiers › User ID) | Firebase anonim giriş UID'i | Uygulama işlevi (bulut yedeği) | **Evet (öneri)** | Hayır |
| Diğer kullanıcı içeriği (User Content › Other) | Firestore bulut yedeği: favori, not, ilerleme | Uygulama işlevi | **Evet (öneri)** | Hayır |
| Yaklaşık konum (Location › Coarse) | Namaz vakti/Kıble; yurt dışında koordinat api.aladhan.com'a gider | Uygulama işlevi | Hayır | Hayır |

Not: Anonim hesap kişinin kimliğini bilmez, ama yedek bu hesaba bağlı. "Bağlı değil" demek de savunulabilir; fazla beyan ret sebebi olmaz, eksik beyan olur → kimlik ve yedek içeriği için **"bağlı"** öneriliyor. Hassas konum toplanmıyor (NSLocationDefaultAccuracyReduced=true).

Hesap silme (5.1.1(v)): Daha Fazla › Gizlilik Politikası ekranında bulut yedeği + anonim hesabı silme düğmesi.
