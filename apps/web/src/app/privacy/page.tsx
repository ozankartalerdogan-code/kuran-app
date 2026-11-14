const sectionTitleClass = "mt-10 scroll-mt-28 font-display text-xl font-bold text-navy-900 dark:text-stone-100";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-stone-700 dark:text-stone-300 sm:px-6 [&_a]:font-medium [&_a]:text-navy-700 [&_a]:underline [&_a]:underline-offset-2 dark:[&_a]:text-navy-300 [&_li]:pl-1 [&_ol]:ml-6 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_p]:mt-3 [&_p]:leading-7 [&_strong]:font-semibold [&_strong]:text-stone-900 dark:[&_strong]:text-stone-100 [&_ul]:ml-6 [&_ul]:list-disc [&_ul]:space-y-1.5">
      <h1 className="font-display text-3xl font-bold tracking-tight text-navy-900 dark:text-stone-50">Gizlilik Politikası</h1>
      <p className="mb-10 text-sm text-stone-500 dark:text-stone-400">Son Güncelleme: 14 Kasım 2026</p>

      <p><strong>Geliştirici:</strong> Kartal Studio<br/>
      <strong>İletişim:</strong> kuranyolu.iletisim@gmail.com<br/>
      <strong>Uygulama:</strong> Kuran Yolu - İslam'ı Öğren</p>

      <h2 className={sectionTitleClass}>1. Toplanan Veriler</h2>
      <p><strong>Firebase Analytics aracılığıyla otomatik toplanan:</strong></p>
      <ul>
        <li>Uygulama kullanım istatistikleri (hangi ekranlar açıldı)</li>
        <li>Cihaz türü ve işletim sistemi versiyonu</li>
        <li>Uygulama versiyonu</li>
        <li>Anonim kullanıcı kimliği</li>
      </ul>
      <p><strong>Cihazınızda saklanan ve bulut yedeğine dahil edilen:</strong></p>
      <ul>
        <li>Favori ayetler</li>
        <li>Kişisel notlar</li>
        <li>Hatim takibi ve okuma konumu (yer imi)</li>
        <li>Ders ve elifba ilerlemesi</li>
        <li>Günlük seri (streak) bilgisi</li>
        <li>Bazı uygulama tercihleri (gece modu, yazı boyutu, tecvid)</li>
      </ul>
      <p>Bu veriler öncelikle cihazınızda saklanır. Favori veya not eklenmiş ayetlerin meal ve ayet bilgilerini gösterebilmek için ilgili ayet anahtarları uygulama API&apos;sine iletilebilir.</p>
      <p><strong>Bulut yedekleme (Firebase):</strong> Yukarıdaki veriler, uygulamayı kaldırıp yeniden kurduğunuzda veya yeni bir cihaza geçtiğinizde ilerlemenizin kaybolmaması için Google Firebase (Cloud Firestore) altyapısında yedeklenir. Bu yedek; ad-soyad, e-posta veya telefon numarası gibi hiçbir kimlik bilgisi istenmeden oluşturulan <strong>anonim bir kimlikle</strong> (Firebase Anonymous Authentication) eşleştirilir. Yedeğinize erişim, güvenlik kurallarıyla yalnızca sizin anonim kimliğinizle sınırlandırılmıştır; iletim HTTPS ile şifrelenir. Not metinleriniz dahil yedek içeriği reklam, profilleme veya analitik amaçla kullanılmaz, üçüncü taraflarla paylaşılmaz. Yedeğinizi ve anonim hesabınızı dilediğiniz an uygulama içinden kalıcı olarak silebilirsiniz (aşağıdaki <a href="#hesap-silme">&quot;Hesap ve Veri Silme&quot;</a> bölümüne bakınız).</p>
      <p><strong>Cihaz sistem yedeği:</strong> Ayrıca cihazınızın sistem yedekleme özelliği açıksa bu cihaz-içi veriler otomatik yedeklenebilir: Android&apos;de cihazınızın bağlı olduğu Google Drive hesabına, iOS&apos;ta iCloud hesabınıza. Bu yedek Google veya Apple tarafından yönetilir ve cihaz ayarlarınızdan kapatılabilir.</p>
      <p><strong>Konum verisi:</strong> Namaz vakitleri ve kıble yönü için yaklaşık (şehir düzeyi) konum kullanılır; hassas (GPS) konum kullanılmaz. Kıble yönü tamamen cihazınızda hesaplanır. Namaz vakitleri için konumunuz yaklaşık 1 km hassasiyete yuvarlanarak uygulama sunucumuza gönderilir; sunucu bunu yalnızca size en yakın <strong>Diyanet İşleri Başkanlığı</strong> şehrini bulmak için kullanır ve vakitleri Diyanet&apos;ten şehir bazında alır (konumunuz Diyanet&apos;e gönderilmez). Bu hizmete ulaşılamazsa veya yakınınızda bir Diyanet şehri yoksa, yaklaşık konumunuz üçüncü taraf <strong>Aladhan.com</strong> servisine gönderilir (aşağıdaki &quot;Üçüncü Taraf Hizmetler&quot; bölümüne bakınız). Konumunuz sunucularımızda kaydedilmez; yalnızca barındırma sağlayıcımızın (Vercel) standart, kısa süreli istek kayıtlarında geçici olarak yer alabilir. Bulunan şehir ve vakitler cihazınızda saklanır.</p>
      <p><strong>Arama verisi:</strong> Uygulama içindeki arama özelliği kullanıldığında, arama sorgusu yalnızca arama sonuçlarını getirmek amacıyla uygulama sunucusuna iletilebilir. Arama sorguları reklam hedefleme veya kullanıcı profili oluşturma amacıyla kullanılmaz; Firebase Analytics&apos;e arama metni gönderilmez.</p>
      <p><strong>Reklam kimliği:</strong> Uygulama reklam içermez ve reklam kimliğinizi (Advertising ID) toplamaz.</p>
      <p><strong>Mikrofon:</strong> Uygulama mikrofon erişimi istemez ve ses kaydı yapmaz.</p>

      <h2 className={sectionTitleClass}>2. Verilerin Kullanımı</h2>
      <p>Toplanan veriler yalnızca şu amaçlarla kullanılır:</p>
      <ul>
        <li>Uygulama performansını iyileştirmek</li>
        <li>Hata tespiti ve düzeltme</li>
        <li>Kullanıcı deneyimini geliştirmek</li>
      </ul>
      <p><strong>Verileriniz asla üçüncü taraflara satılmaz.</strong></p>

      <h2 className={sectionTitleClass}>3. Üçüncü Taraf Hizmetler</h2>
      <p>Uygulama aşağıdaki üçüncü taraf hizmetleri kullanır:</p>
      <ul>
        <li><strong>Firebase Analytics</strong> — Kullanım istatistikleri (<a href="https://policies.google.com/privacy" target="_blank">Google Gizlilik Politikası</a>)</li>
        <li><strong>Firebase Authentication</strong> — Bulut yedeğin size özel eşleştirilmesi için anonim kimlik (<a href="https://firebase.google.com/support/privacy" target="_blank">Firebase Gizlilik Politikası</a>)</li>
        <li><strong>Cloud Firestore</strong> — Bulut yedek depolama (<a href="https://firebase.google.com/support/privacy" target="_blank">Firebase Gizlilik Politikası</a>)</li>
        <li><strong>Sentry</strong> — Hata raporlama (<a href="https://sentry.io/privacy/" target="_blank">Sentry Gizlilik Politikası</a>)</li>
        <li><strong>Diyanet İşleri Başkanlığı</strong> — Namaz vakitleri (şehir bazında; konumunuz gönderilmez)</li>
        <li><strong>Aladhan.com</strong> — Yedek namaz vakitleri API (<a href="https://aladhan.com/privacy" target="_blank">Aladhan Gizlilik Politikası</a>)</li>
        <li><strong>Vercel</strong> — Uygulama sunucusu (barındırma) (<a href="https://vercel.com/legal/privacy-policy" target="_blank">Vercel Gizlilik Politikası</a>)</li>
        <li><strong>Turso</strong> — Veritabanı (<a href="https://turso.tech/privacy" target="_blank">Turso Gizlilik Politikası</a>)</li>
      </ul>

      <h2 className={sectionTitleClass}>4. Veri Güvenliği</h2>
      <ul>
        <li>Tüm API iletişimleri HTTPS üzerinden şifrelenir</li>
        <li>Kullanıcı hesabı istenmez; ad-soyad, e-posta veya telefon numarası toplanmaz</li>
        <li>Not metinleriniz cihazınızda ve yalnızca size özel, anonim kimlikle korunan bulut yedeğinizde saklanır; başka hiçbir amaçla kullanılmaz</li>
        <li>Favori veya notlu ayetlerin ayet anahtarları yalnızca ilgili ayet bilgisini göstermek için API&apos;ye iletilebilir</li>
      </ul>

      <h2 className={sectionTitleClass}>5. Çocukların Gizliliği</h2>
      <p>Uygulama 13 yaş altı çocuklara yönelik değildir. 13 yaş altı kullanıcılardan bilerek veri toplamıyoruz.</p>

      <h2 className={sectionTitleClass}>6. KVKK Hakları</h2>
      <p>6698 sayılı KVKK kapsamında aşağıdaki haklara sahipsiniz:</p>
      <ul>
        <li>Verilerinize erişim hakkı</li>
        <li>Verilerinizin düzeltilmesini talep hakkı</li>
        <li>Verilerinizin silinmesini talep hakkı</li>
      </ul>
      <p>Bu haklarınızı kullanmak için: <a href="mailto:kuranyolu.iletisim@gmail.com">kuranyolu.iletisim@gmail.com</a></p>

      <h2 id="hesap-silme" className={sectionTitleClass}>7. Hesap ve Veri Silme</h2>
      <p>Uygulama, bulut yedeği için ad-soyad veya e-posta istemeyen <strong>anonim bir Firebase hesabı</strong> kullanır. Bu hesabı ve buluttaki tüm yedeğinizi uygulama içinden silebilirsiniz:</p>
      <ol>
        <li>Uygulamada <strong>Daha Fazla → Gizlilik Politikası</strong> ekranını açın.</li>
        <li>&quot;7. Hesap ve Veri Silme&quot; bölümündeki <strong>&quot;Bulut yedeğimi sil&quot;</strong> düğmesine dokunun ve onaylayın.</li>
      </ol>
      <p>Silme işlemi anında ve kalıcıdır: buluttaki yedek dokümanınız ve anonim Firebase hesabınız silinir; silinen veriler geri getirilemez. Cihazınızdaki yerel veriler etkilenmez — onları uygulamayı kaldırarak veya cihaz ayarlarından uygulama verilerini temizleyerek silebilirsiniz. Silme sonrası bulut yedekleme, siz uygulama içinden yeniden açana kadar kapalı kalır.</p>
      <p>Uygulamaya erişiminiz yoksa silme talebinizi <a href="mailto:kuranyolu.iletisim@gmail.com">kuranyolu.iletisim@gmail.com</a> adresine iletebilirsiniz; size yedeğinizin silinmesi konusunda yardımcı oluruz.</p>

      <h2 className={sectionTitleClass}>8. Değişiklikler</h2>
      <p>Bu gizlilik politikası zaman zaman güncellenebilir. Önemli değişikliklerde uygulama içinde bildirim yapılır.</p>

      <h2 className={sectionTitleClass}>9. İletişim</h2>
      <p>Sorularınız için: <a href="mailto:kuranyolu.iletisim@gmail.com">kuranyolu.iletisim@gmail.com</a></p>
    </main>
  );
}
