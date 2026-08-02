import type { Metadata } from "next";
import { SOURCE_LICENSE_CONTENT, getSourceLicenseLinks } from "@quran-app/core";

const CONTACT_MAIL = "kuranyolu.iletisim@gmail.com";

export const metadata: Metadata = {
  title: "Kaynaklar ve Lisanslar",
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

function Paragraph({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-sm leading-7 text-stone-600 dark:text-stone-300">{children}</p>;
}

export default function HakkindaPage() {
  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 border-b border-stone-200 pb-6 dark:border-stone-700">
          <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-50">{SOURCE_LICENSE_CONTENT.title}</h1>
          <p className="mt-2 text-sm leading-6 text-stone-500 dark:text-stone-400">
            {SOURCE_LICENSE_CONTENT.intro}
          </p>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          {SOURCE_LICENSE_CONTENT.sections.map((sourceSection) => {
            const links = getSourceLicenseLinks(sourceSection.linkIds);
            return (
              <div
                key={sourceSection.id}
                className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900"
              >
                <h2 className="mb-2 text-sm font-semibold text-stone-700 dark:text-stone-200">{sourceSection.title}</h2>
                <Paragraph>{sourceSection.body}</Paragraph>
                {links.length > 0 && (
                  <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-stone-200 pt-3 dark:border-stone-700">
                    {links.map((link) => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-navy-700 underline dark:text-navy-300"
                      >
                        {link.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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