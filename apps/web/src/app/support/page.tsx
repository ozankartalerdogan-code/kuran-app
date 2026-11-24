import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Destek / Support",
  description: "Kuran Yolu için iletişim ve sık sorulan sorular. Contact and frequently asked questions for Kuran Yolu.",
};

const sectionTitleClass = "mt-10 scroll-mt-28 font-display text-xl font-bold text-navy-900 dark:text-stone-100";

export default function SupportPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-stone-700 dark:text-stone-300 sm:px-6 [&_a]:font-medium [&_a]:text-navy-700 [&_a]:underline [&_a]:underline-offset-2 dark:[&_a]:text-navy-300 [&_li]:pl-1 [&_ol]:ml-6 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_p]:mt-3 [&_p]:leading-7 [&_strong]:font-semibold [&_strong]:text-stone-900 dark:[&_strong]:text-stone-100 [&_ul]:ml-6 [&_ul]:list-disc [&_ul]:space-y-1.5">
      <h1 className="font-display text-3xl font-bold tracking-tight text-navy-900 dark:text-stone-50">Destek / Support — Kuran Yolu</h1>

      <section lang="tr" aria-labelledby="destek">
        <h2 id="destek" className={sectionTitleClass}>Türkçe — Destek</h2>
        <p><strong>Uygulama:</strong> Kuran Yolu<br/>
        <strong>Geliştirici:</strong> Kartal Studio<br/>
        <strong>İletişim:</strong> <a href="mailto:kuranyolu.iletisim@gmail.com">kuranyolu.iletisim@gmail.com</a></p>

        <h3 className={sectionTitleClass}>Verilerim nerede saklanıyor?</h3>
        <p>Favorileriniz, notlarınız ve ilerleme bilgileriniz cihazınızda saklanır ve kimlik bilgisi istemeyen anonim bir Firebase hesabıyla otomatik olarak buluta yedeklenir. Yedeği uygulama içinden istediğiniz an silebilirsiniz; sildiğinizde yedekleme kapanır.</p>

        <h3 className={sectionTitleClass}>Bulut yedeğimi ve verilerimi nasıl silerim?</h3>
        <p>Uygulamada <strong>Daha Fazla → Gizlilik Politikası → 7. Hesap ve Veri Silme</strong> bölümünü açın. <strong>Bulut yedeğimi sil</strong> düğmesine dokunun ve <strong>Sil</strong> ile onaylayın. Bulut yedeğiniz ve anonim hesabınız kalıcı olarak silinir; bulut yedekleme siz yeniden açana kadar kapalı kalır. Cihazınızdaki veriler etkilenmez. Yerel verileri uygulamayı kaldırarak veya cihaz ayarlarından uygulama verilerini temizleyerek silebilirsiniz.</p>

        <h3 className={sectionTitleClass}>Namaz vakitleri nereden geliyor?</h3>
        <p>Namaz vakitleri, T.C. Diyanet İşleri Başkanlığı&apos;nın Awqat Salah servisinden şehir bazında alınır. Bu servise ulaşılamadığında veya yakında bir Diyanet şehri bulunmadığında Aladhan servisi yedek olarak kullanılır ve vakitler yaklaşık hesaplanır.</p>

        <h3 className={sectionTitleClass}>Uygulama internetsiz çalışır mı?</h3>
        <p>Mushaf sayfalarının metni uygulamaya gömülü veriler sayesinde çevrimdışı okunabilir.</p>
        <p><Link href="/privacy" hrefLang="tr">Gizlilik Politikası</Link></p>
      </section>

      <section lang="en" aria-labelledby="support">
        <h2 id="support" className={sectionTitleClass}>English — Support</h2>
        <p><strong>App:</strong> Kuran Yolu<br/>
        <strong>Developer:</strong> Kartal Studio<br/>
        <strong>Contact:</strong> <a href="mailto:kuranyolu.iletisim@gmail.com">kuranyolu.iletisim@gmail.com</a></p>

        <h3 className={sectionTitleClass}>Where is my data stored?</h3>
        <p>Your favorites, notes, and progress are stored on your device and automatically backed up to the cloud using an anonymous Firebase account that does not require identifying information. You can delete the backup from within the app at any time; deleting it turns off cloud backup.</p>

        <h3 className={sectionTitleClass}>How do I delete my cloud backup and data?</h3>
        <p>In the app, open <strong>More → Privacy Policy → 7. Account and Data Deletion</strong>. Tap <strong>Delete my cloud backup</strong> and confirm with <strong>Delete</strong>. Your cloud backup and anonymous account are permanently deleted; cloud backup remains off until you turn it back on. Data on your device is not affected. You can delete local data by uninstalling the app or clearing the app data in your device settings.</p>

        <h3 className={sectionTitleClass}>Where do prayer times come from?</h3>
        <p>Prayer times are obtained per city from the Awqat Salah service of the Presidency of Religious Affairs of Türkiye (Diyanet). When this service is unavailable or there is no Diyanet city nearby, Aladhan is used as a fallback to calculate approximate times.</p>

        <h3 className={sectionTitleClass}>Does the app work without internet access?</h3>
        <p>Mushaf page text can be read offline using data bundled with the app.</p>
        <p><Link href="/privacy/en" hrefLang="en">Privacy Policy</Link></p>
      </section>
    </main>
  );
}
