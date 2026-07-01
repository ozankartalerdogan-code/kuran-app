export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px', fontFamily: 'sans-serif', lineHeight: 1.7, color: '#1a1a1a' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Gizlilik Politikası</h1>
      <p style={{ color: '#666', marginBottom: 40 }}>Son Güncelleme: 2 Temmuz 2026</p>

      <p><strong>Geliştirici:</strong> Kartal Studio<br/>
      <strong>İletişim:</strong> kuranyolu.iletisim@gmail.com<br/>
      <strong>Uygulama:</strong> Kuran Yolu - İslam'ı Öğren</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 40, marginBottom: 12 }}>1. Toplanan Veriler</h2>
      <p><strong>Firebase Analytics aracılığıyla otomatik toplanan:</strong></p>
      <ul>
        <li>Uygulama kullanım istatistikleri (hangi ekranlar açıldı)</li>
        <li>Cihaz türü ve işletim sistemi versiyonu</li>
        <li>Uygulama versiyonu</li>
        <li>Anonim kullanıcı kimliği</li>
      </ul>
      <p><strong>Yalnızca cihazınızda saklanan (sunucuya gönderilmez):</strong></p>
      <ul>
        <li>Favori ayetler</li>
        <li>Kişisel notlar</li>
        <li>Hatim takibi</li>
        <li>Namaz vakti bildirimleri tercihi</li>
        <li>Günlük seri (streak) bilgisi</li>
      </ul>
      <p><strong>Yedekleme:</strong> Bu cihaz-içi veriler (favori, not, ilerleme), Android'in sistem yedekleme özelliği açıksa cihazınızın bağlı olduğu Google Drive hesabınıza otomatik yedeklenebilir; böylece uygulamayı yeniden kurduğunuzda veya yeni cihaza geçtiğinizde geri gelebilir. Bu yedek Google tarafından yönetilir, bizim sunucularımıza gönderilmez ve cihaz ayarlarınızdan kapatılabilir.</p>
      <p><strong>Konum verisi:</strong> Namaz vakitleri ve kıble yönü için yaklaşık (şehir düzeyi) konum kullanılır; hassas (GPS) konum kullanılmaz. Kıble yönü tamamen cihazınızda hesaplanır. Namaz vakitlerini hesaplamak için yaklaşık konumunuz, üçüncü taraf <strong>Aladhan.com</strong> servisine gönderilir (aşağıdaki &quot;Üçüncü Taraf Hizmetler&quot; bölümüne bakınız). Konum verisi bizim sunucularımızda saklanmaz.</p>
      <p><strong>Reklam kimliği:</strong> Uygulama reklam içermez ve reklam kimliğinizi (Advertising ID) toplamaz.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 40, marginBottom: 12 }}>2. Verilerin Kullanımı</h2>
      <p>Toplanan veriler yalnızca şu amaçlarla kullanılır:</p>
      <ul>
        <li>Uygulama performansını iyileştirmek</li>
        <li>Hata tespiti ve düzeltme</li>
        <li>Kullanıcı deneyimini geliştirmek</li>
      </ul>
      <p><strong>Verileriniz asla üçüncü taraflara satılmaz.</strong></p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 40, marginBottom: 12 }}>3. Üçüncü Taraf Hizmetler</h2>
      <p>Uygulama aşağıdaki üçüncü taraf hizmetleri kullanır:</p>
      <ul>
        <li><strong>Firebase Analytics</strong> — Kullanım istatistikleri (<a href="https://policies.google.com/privacy" target="_blank">Google Gizlilik Politikası</a>)</li>
        <li><strong>Sentry</strong> — Hata raporlama (<a href="https://sentry.io/privacy/" target="_blank">Sentry Gizlilik Politikası</a>)</li>
        <li><strong>Aladhan.com</strong> — Namaz vakitleri API (<a href="https://aladhan.com/privacy" target="_blank">Aladhan Gizlilik Politikası</a>)</li>
        <li><strong>Turso</strong> — Veritabanı (<a href="https://turso.tech/privacy" target="_blank">Turso Gizlilik Politikası</a>)</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 40, marginBottom: 12 }}>4. Veri Güvenliği</h2>
      <ul>
        <li>Tüm API iletişimleri HTTPS üzerinden şifrelenir</li>
        <li>Kişisel veriler sunucularımızda saklanmaz</li>
        <li>Favoriler ve notlar yalnızca cihazınızda tutulur</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 40, marginBottom: 12 }}>5. Çocukların Gizliliği</h2>
      <p>Uygulama 13 yaş altı çocuklara yönelik değildir. 13 yaş altı kullanıcılardan bilerek veri toplamıyoruz.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 40, marginBottom: 12 }}>6. KVKK Hakları</h2>
      <p>6698 sayılı KVKK kapsamında aşağıdaki haklara sahipsiniz:</p>
      <ul>
        <li>Verilerinize erişim hakkı</li>
        <li>Verilerinizin düzeltilmesini talep hakkı</li>
        <li>Verilerinizin silinmesini talep hakkı</li>
      </ul>
      <p>Bu haklarınızı kullanmak için: <a href="mailto:kuranyolu.iletisim@gmail.com">kuranyolu.iletisim@gmail.com</a></p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 40, marginBottom: 12 }}>7. Değişiklikler</h2>
      <p>Bu gizlilik politikası zaman zaman güncellenebilir. Önemli değişikliklerde uygulama içinde bildirim yapılır.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 40, marginBottom: 12 }}>8. İletişim</h2>
      <p>Sorularınız için: <a href="mailto:kuranyolu.iletisim@gmail.com">kuranyolu.iletisim@gmail.com</a></p>
    </main>
  );
}
