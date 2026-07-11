import type { Metadata } from "next";

const CONTACT_MAIL = "kuranyolu.iletisim@gmail.com";
const TANZIL_URL = "https://tanzil.net/";
const QAC_URL = "https://corpus.quran.com/";

export const metadata: Metadata = {
  title: "Kaynaklar ve Açıklamalar — Kuran Yolu",
  description: "Kuran Yolu uygulamasında kullanılan Kur'an metni, meal, tefsir, morfoloji ve hadis kaynakları hakkında açıklamalar.",
  alternates: { canonical: "/hakkinda" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-navy-700 dark:text-navy-400">{title}</h2>
      {children}
    </section>
  );
}

function SourceCard({ icon, title, url }: { icon: string; title: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-4 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800"
    >
      <span className="text-2xl leading-none">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-stone-900 dark:text-stone-50">{title}</span>
        <span className="block truncate text-xs text-stone-500 dark:text-stone-400">{url}</span>
      </span>
      <span className="text-stone-300 dark:text-stone-600">›</span>
    </a>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-sm leading-7 text-stone-600 dark:text-stone-300">{children}</p>;
}

export default function HakkindaPage() {
  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 border-b border-stone-200 pb-6 dark:border-stone-700">
          <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-50">Kaynaklar ve Açıklamalar</h1>
          <p className="mt-2 text-sm leading-6 text-stone-500 dark:text-stone-400">
            Kuran Yolu içeriğinde kullanılan kaynaklar ve kullanım açıklamaları.
          </p>
        </header>

        <Section title="Tanzil Quran Text">
          <SourceCard icon="🕌" title="Tanzil Quran Text" url={TANZIL_URL} />
        </Section>

        <Section title="Quranic Arabic Corpus">
          <SourceCard icon="🔬" title="Quranic Arabic Corpus" url={QAC_URL} />
        </Section>

        <section className="mt-8 border-y border-stone-200 py-5 dark:border-stone-700">
          <h2 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-200">Kaynaklar ve kullanım açıklamaları</h2>
          <Paragraph>
            <strong className="font-bold text-stone-800 dark:text-stone-100">Kur&apos;an-ı Kerim Arapça metni:</strong>
          </Paragraph>
          <Paragraph>
            Tanzil Quran Text esas alınarak sunulmaktadır. Tanzil metni, doğrulanmış Kur&apos;an-ı Kerim metni kaynaklarından biridir ve
            uygulamada değiştirilmeden kullanılmalıdır.
          </Paragraph>
          <Paragraph>
            <strong className="font-bold text-stone-800 dark:text-stone-100">Meal ve orijinal tefsir kaynağı:</strong> Elmalılı Hamdi Yazır, Hak Dini Kur&apos;an Dili.
          </Paragraph>
          <Paragraph>
            Sade tefsir açıklamaları, Elmalılı Hamdi Yazır&apos;ın orijinal tefsir metni esas alınarak Kuran Yolu için daha anlaşılır
            bir dille yeniden düzenlenmiştir. Bu açıklamalar bilgilendirme amaçlıdır; fetva niteliği taşımaz.
          </Paragraph>
          <Paragraph>
            Kelime kökleri ve morfolojik çözümlemelerde Quranic Arabic Corpus verilerinden yararlanılmıştır. Türkçe
            anlamlandırma, kök düzeltmeleri, veri temizliği ve kullanıcı dostu morfoloji gösterimi Kuran Yolu analiz altyapısı ile
            ayrıca hazırlanmıştır.
          </Paragraph>
          <Paragraph>
            Hadis içeriklerinde klasik hadis kaynaklarından yararlanılmıştır. Açıklama ve sunum metinleri Kuran Yolu için
            sadeleştirilmiş bilgilendirme diliyle hazırlanmıştır.
          </Paragraph>
        </section>

        <Section title="Uygulama Hakkında">
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900">
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <span className="text-sm text-stone-500 dark:text-stone-400">Geliştirici</span>
              <span className="text-sm font-semibold text-stone-900 dark:text-stone-50">Bağımsız geliştirici</span>
            </div>
            <p className="border-t border-stone-200 px-4 py-3 text-sm leading-6 text-stone-500 dark:border-stone-700 dark:text-stone-400">
              Bu bölümde yer alan kaynak ve açıklamalar kullanıcıya şeffaf referans sunmak için hazırlanmıştır. Metinler
              bilgilendirme amaçlıdır.
            </p>
          </div>
        </Section>

        <Section title="İletişim & Geri Bildirim">
          <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
            <p className="mb-3 text-sm leading-6 text-stone-500 dark:text-stone-400">Öneri ve geri bildirimleriniz için:</p>
            <a
              href={`mailto:${CONTACT_MAIL}`}
              className="inline-flex rounded-lg bg-navy-50 px-4 py-2 text-sm font-semibold text-navy-700 hover:bg-navy-100 dark:bg-navy-950/30 dark:text-navy-300 dark:hover:bg-navy-950/50"
            >
              {CONTACT_MAIL}
            </a>
          </div>
        </Section>
      </div>
    </main>
  );
}