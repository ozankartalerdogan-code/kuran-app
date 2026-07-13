import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Deep Link Testi",
  robots: { index: false, follow: false },
};
// Deep link test sayfası — kuranyolu:// scheme
export default function OpenPage() {
  const links = [
    { label: "Ana Sayfa",        url: "kuranyolu://"                     },
    { label: "Bakara 255 (Ayetel Kürsi)", url: "kuranyolu://ayah/2/255"  },
    { label: "Fatiha Suresi",    url: "kuranyolu://surah/1"              },
    { label: "Namaz Ayetleri",   url: "kuranyolu://search?tag=namaz-genel" },
    { label: "Keşfet",           url: "kuranyolu://kesfet"               },
  ];

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-10 sm:px-6">
      <h1 className="font-display text-2xl font-bold text-navy-900 dark:text-stone-50">Kuran Yolu — Deep Link Testi</h1>
      <p className="mb-6 mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
        Telefonunuzda Kuran Yolu kuruluysa aşağıdaki linkler uygulamayı açar.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {links.map(l => (
          <a
            key={l.url}
            href={l.url}
            className="block rounded-xl border border-navy-200 bg-white px-5 py-3.5 text-sm font-semibold text-navy-800 shadow-sm transition-colors hover:border-navy-300 hover:bg-navy-50 dark:border-stone-700 dark:bg-stone-900 dark:text-navy-300 dark:hover:bg-stone-800"
          >
            {l.label}
            <span className="mt-1 block break-all text-xs font-normal text-stone-500 dark:text-stone-400">
              {l.url}
            </span>
          </a>
        ))}
      </div>
    </main>
  );
}
