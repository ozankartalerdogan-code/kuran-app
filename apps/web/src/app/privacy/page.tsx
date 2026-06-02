import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gizlilik Politikası — Kuran Yolu",
  description: "Kuran Yolu uygulamasının gizlilik politikası",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-stone-50 px-4 py-12 dark:bg-stone-950">
      <div className="mx-auto max-w-2xl">

        <h1 className="mb-2 text-3xl font-bold text-stone-900 dark:text-stone-100">
          Gizlilik Politikası
        </h1>
        <p className="mb-10 text-sm text-stone-400 dark:text-stone-500">
          Son güncelleme: Haziran 2026
        </p>

        <Section title="1. Genel Bakış">
          <p>
            Kuran Yolu uygulaması ("Uygulama"), kullanıcıların gizliliğine saygı duymayı temel ilke
            olarak benimsemiştir. Bu politika, uygulamamızın hangi verileri topladığını, bu verileri
            nasıl kullandığını ve koruduğunu açıklamaktadır.
          </p>
        </Section>

        <Section title="2. Toplanan Veriler">
          <SubTitle>2.1 Konum Verisi</SubTitle>
          <p>
            Uygulama, aşağıdaki amaçlarla cihazınızın konum bilgisine erişim talep eder:
          </p>
          <ul>
            <li>Namaz vakitlerini bulunduğunuz konuma göre hesaplamak</li>
            <li>Kıble yönünü tespit etmek</li>
          </ul>
          <p className="mt-2">
            Konum verisi yalnızca bu hesaplamalar için anlık olarak kullanılır.
            Sunucularımıza gönderilmez, saklanmaz veya üçüncü taraflarla paylaşılmaz.
          </p>

          <SubTitle>2.2 Cihazda Saklanan Veriler</SubTitle>
          <p>
            Aşağıdaki veriler yalnızca cihazınızda (yerel depolama) saklanır,
            hiçbir sunucuya gönderilmez:
          </p>
          <ul>
            <li>Favori ayetler</li>
            <li>Kişisel ayet notları</li>
            <li>Hatim takip bilgileri</li>
            <li>Okuma serisi (streak) verileri</li>
            <li>Gece modu tercihi</li>
            <li>Elif-Ba öğrenme ilerlemesi</li>
          </ul>

          <SubTitle>2.3 Kişisel Veri Toplanmaması</SubTitle>
          <p>
            Uygulama; ad, e-posta, telefon numarası veya herhangi bir kişisel kimlik bilgisi
            toplamaz. Kullanıcı hesabı veya kayıt sistemi bulunmamaktadır.
          </p>
        </Section>

        <Section title="3. Kullanılan Üçüncü Taraf Hizmetler">
          <p>Uygulama, aşağıdaki harici hizmetlere bağlantı kurar:</p>
          <ul>
            <li>
              <strong>Aladhan API (aladhan.com)</strong> — Namaz vakitlerini hesaplamak için
              koordinatlar gönderilir. Aladhan&apos;ın kendi gizlilik politikası geçerlidir.
            </li>
            <li>
              <strong>Kuran Yolu API (kuranapp.vercel.app)</strong> — Kur&apos;an metni,
              meal, kelime analizi ve dua kategorileri için kullanılır.
              Kişisel veri gönderilmez; yalnızca içerik sorguları yapılır.
            </li>
          </ul>
        </Section>

        <Section title="4. Bildirimler">
          <p>
            Namaz vakti bildirimlerini etkinleştirirseniz, uygulama bildirim izni talep eder.
            Bildirimler tamamen cihazda planlanır; sunucuya bağlantı kurulmaz.
            Bildirimleri istediğiniz zaman cihaz ayarlarından kapatabilirsiniz.
          </p>
        </Section>

        <Section title="5. Veri Güvenliği">
          <p>
            Cihazınızda saklanan veriler Android&apos;in standart uygulama depolama güvenliği
            ile korunur. Uygulama kaldırıldığında tüm yerel veriler otomatik olarak silinir.
          </p>
        </Section>

        <Section title="6. Çocukların Gizliliği">
          <p>
            Uygulama 13 yaşın altındaki çocuklardan bilerek veri toplamaz.
            Çocuklara yönelik özel bir hizmet sunulmamaktadır.
          </p>
        </Section>

        <Section title="7. Politika Değişiklikleri">
          <p>
            Bu gizlilik politikası zaman zaman güncellenebilir. Önemli değişiklikler
            uygulama içinde bildirilecektir. Güncel politikaya her zaman bu sayfadan
            ulaşabilirsiniz.
          </p>
        </Section>

        <Section title="8. İletişim">
          <p>
            Gizlilik politikamız hakkında sorularınız için:
          </p>
          <p className="mt-2">
            <strong>E-posta:</strong>{" "}
            <a
              href="mailto:ozankartalerdogan@gmail.com"
              className="text-emerald-600 hover:underline dark:text-emerald-400"
            >
              ozankartalerdogan@gmail.com
            </a>
          </p>
        </Section>

      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xl font-semibold text-stone-800 dark:text-stone-200">
        {title}
      </h2>
      <div className="space-y-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
        {children}
      </div>
    </section>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-1 mt-4 font-semibold text-stone-700 dark:text-stone-300">
      {children}
    </h3>
  );
}
