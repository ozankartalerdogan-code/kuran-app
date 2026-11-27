import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Kullanım Şartları",
  description: "Kuran Yolu kullanım şartları: hizmet kapsamı, dini içerik sınırları, namaz vakitleri, fikri mülkiyet ve sorumluluk sınırları.",
  alternates: { languages: { tr: "/terms", en: "/terms/en" } },
};

const sectionTitleClass = "mt-10 scroll-mt-28 font-display text-xl font-bold text-navy-900 dark:text-stone-100";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-stone-700 dark:text-stone-300 sm:px-6 [&_a]:font-medium [&_a]:text-navy-700 [&_a]:underline [&_a]:underline-offset-2 dark:[&_a]:text-navy-300 [&_li]:pl-1 [&_ol]:ml-6 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_p]:mt-3 [&_p]:leading-7 [&_strong]:font-semibold [&_strong]:text-stone-900 dark:[&_strong]:text-stone-100 [&_ul]:ml-6 [&_ul]:list-disc [&_ul]:space-y-1.5">
      <p className="mb-4 text-sm"><Link href="/terms/en" hrefLang="en" lang="en">English</Link></p>
      <h1 className="font-display text-3xl font-bold tracking-tight text-navy-900 dark:text-stone-50">Kullanım Şartları</h1>
      <p className="mb-10 text-sm text-stone-500 dark:text-stone-400">Yürürlük Tarihi: 27 Kasım 2026</p>

      <p><strong>Geliştirici:</strong> Kartal Studio<br/>
      <strong>İletişim:</strong> <a href="mailto:kuranyolu.iletisim@gmail.com">kuranyolu.iletisim@gmail.com</a><br/>
      <strong>Uygulama:</strong> Kuran Yolu</p>

      <h2 className={sectionTitleClass}>1. Hizmetin Tanımı</h2>
      <p>Kuran Yolu; Kur&apos;an okuma, meal ve tefsir inceleme, kelime ve kök analizi, elifba ve temel dinî dersler, dua ve ibadet rehberleri ile namaz vakitleri araçlarını sunan <strong>ücretsiz</strong> ve <strong>reklamsız</strong> bir web ve mobil uygulamasıdır. Uygulamayı kullanarak bu Kullanım Şartları&apos;nı kabul etmiş sayılırsınız.</p>

      <h2 className={sectionTitleClass}>2. Dinî İçeriğin Kaynakları ve Sınırları</h2>
      <ul>
        <li><strong>Meal ve tefsir:</strong> Kur&apos;an mealleri ve tefsir açıklamaları insan çevirisi ve yorumudur (Türkçede Elmalılı Hamdi Yazır meali, İngilizce arayüzde M. M. Pickthall çevirisi).</li>
        <li><strong>Yapay zekâ (AI) destekli içerikler:</strong> Sadeleştirilmiş tefsir açıklamaları, bazı ders/test/dua/hadis/siyer içerikleri ve İngilizce arayüzdeki içerik çevirileri gibi AI desteğiyle hazırlanan bölümler uygulama içinde ve kaynak bildirimlerinde ayrıca belirtilir. Otomatik ve insan kontrolleri yapılsa da bu metinlerde hata bulunabilir.</li>
        <li><strong>Bilgilendirme amaçlıdır:</strong> Uygulamadaki hiçbir içerik fetva, dinî hüküm veya resmî dinî/hukuki danışmanlık yerine geçmez. Dinî konularda kesin hüküm için yetkili din âlimlerine ve kurumlara başvurunuz.</li>
      </ul>

      <h2 className={sectionTitleClass}>3. Namaz Vakitleri ve Kıble Pusulası</h2>
      <p>Namaz vakitleri öncelikli olarak T.C. Diyanet İşleri Başkanlığı (Awqat Salah) şehir verisine dayanır. Diyanet hizmetine ulaşılamadığında veya yakınınızda bir Diyanet şehri bulunmadığında yedek olarak Aladhan.com üzerinden yaklaşık vakitler hesaplanır. Kıble yönü cihazınızın sensörleri ve yaklaşık konumunuz kullanılarak hesaplanır; manyetik parazit, sensör kalibrasyonu veya konum doğruluğuna bağlı olarak sapmalar olabilir. Vakitler ve kıble yönü bilgilendirme amaçlıdır ve yaklaşık olabilir.</p>

      <h2 className={sectionTitleClass}>4. Üçüncü Taraf İçerik ve Lisanslar</h2>
      <p>Uygulamada kullanılan Kur&apos;an Arapça metni (Tanzil Uthmani 1.1, CC BY 3.0), morfoloji veri setleri, tecvid işaretleri, yazı tipleri ve açık kaynaklı yazılım bileşenleri kendi lisans ve kullanım şartlarına tabidir. Kaynaklar ve lisans bildirimlerinin tam listesi için <Link href="/hakkinda">Hakkında (Kaynaklar ve Lisanslar)</Link> sayfasına bakabilirsiniz.</p>

      <h2 className={sectionTitleClass}>5. Fikri Mülkiyet</h2>
      <p>Üçüncü taraf açık lisanslı veri ve yazılımlar hariç olmak üzere, Kuran Yolu uygulamasına ait özgün kaynak kodu, tasarım, marka öğeleri ve özgün derlemelerin <strong>tüm hakları saklıdır (All rights reserved)</strong>. Önceden yazılı izin olmaksızın kopyalanamaz, dağıtılamaz, alt lisanslanamaz veya ticari amaçla kullanılamaz.</p>

      <h2 className={sectionTitleClass}>6. Kabul Edilebilir Kullanım</h2>
      <p>Uygulamayı yalnızca kişisel, ticari olmayan ve yürürlükteki yasalara uygun amaçlarla kullanabilirsiniz. Hizmetin güvenliğini, bütünlüğünü veya erişilebilirliğini bozacak şekilde otomatik aşırı istek (scraping/rate-limit aşımı), tersine mühendislik veya yetkisiz erişim girişimlerinde bulunamazsınız.</p>

      <h2 className={sectionTitleClass}>7. Garanti Yok ve Sorumluluk Sınırı</h2>
      <p>Kuran Yolu &quot;olduğu gibi&quot; ve &quot;mevcut olduğu şekliyle&quot; sunulmaktadır. Hizmetin kesintisiz, hatasız veya her zaman güncel olacağına dair açık ya da zımni hiçbir garanti verilmez. Uygulamanın kullanımından, içerikteki olası hatalardan, namaz vakti veya kıble sapmalarından ya da hizmet kesintilerinden doğabilecek doğrudan veya dolaylı zararlardan geliştirici sorumlu tutulamaz.</p>

      <h2 className={sectionTitleClass}>8. Hata Bildirme ve İçerik Düzeltme</h2>
      <p>Metin, meal, morfoloji veya teknik bir hata fark ettiğinizde <Link href="/support">Destek</Link> sayfasındaki bilgileri kullanarak veya doğrudan e-posta yoluyla bize bildirebilirsiniz. Bildirilen içerik hataları kaynak metinlerle karşılaştırılarak incelenir ve sonraki veri/uygulama güncellemelerinde düzeltilir.</p>

      <h2 className={sectionTitleClass}>9. Değişiklikler</h2>
      <p>Bu Kullanım Şartları zaman zaman güncellenebilir. Güncellenen metin bu sayfada yayımlandığı tarihten itibaren geçerli olur. Yürürlük tarihi sayfanın başında belirtilir.</p>

      <h2 className={sectionTitleClass}>10. İletişim</h2>
      <p>Sorularınız ve geri bildirimleriniz için: <a href="mailto:kuranyolu.iletisim@gmail.com">kuranyolu.iletisim@gmail.com</a></p>
    </main>
  );
}
