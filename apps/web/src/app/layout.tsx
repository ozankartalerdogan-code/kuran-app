import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { NavbarMenu } from "./NavbarMenu";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default:  "Kuran Yolu — Kur'an'ı Okuyun, Anlayın, Keşfedin",
    template: "%s — Kuran Yolu",
  },
  description:
    "Türkçe meal, kelime analizi, kök açıklamaları, dua kategorileri ve günlük okuma takibi.",
  // Ölü "kuranapp.vercel.app" yerine canlı domain — OG görsel URL'leri buna göre çözülür.
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? "https://kuran-app-web-ozan-s-projects8.vercel.app"),
  openGraph: {
    siteName:    "Kuran Yolu",
    locale:      "tr_TR",
    type:        "website",
    title:       "Kuran Yolu",
    description: "Türkçe meal, kelime analizi, kök açıklamaları ve dua kategorileri.",
    images: [{ url: "/og-default.png", width: 1200, height: 630 }],
  },
  twitter: {
    card:        "summary_large_image",
    title:       "Kuran Yolu",
    description: "Türkçe meal, kelime analizi ve dua kategorileri.",
  },
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width:        "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor:   "#059669",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="tr" className="scroll-smooth">
      {/* Anti-flicker: React hydrate'dan önce gece modunu uygula */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('nightMode')==='1')document.documentElement.classList.add('night-mode')}catch(e){}`,
          }}
        />
      </head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            // Yayın öncesi: Service Worker DEVRE DIŞI. Kayıtlı eski SW'leri söker
            // ve tüm cache'leri siler — böylece bayat önbellek nedeniyle
            // güncellemelerin "kaybolması" sorunu kalıcı olarak biter.
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){r.unregister()})}).catch(function(){});if(self.caches){caches.keys().then(function(ks){ks.forEach(function(k){caches.delete(k)})}).catch(function(){})}}`,
          }}
        />
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:p-2">
          İçeriğe geç
        </a>
        <nav
          aria-label="Ana navigasyon"
          className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/90 px-4 py-3 backdrop-blur-md dark:border-stone-700 dark:bg-stone-900/90 sm:px-6"
        >
          <NavbarMenu />
        </nav>
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="mt-12 border-t border-stone-200 bg-white/60 px-4 py-10 dark:border-stone-700 dark:bg-stone-900/60 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <div className="grid gap-8 sm:grid-cols-3">
              {/* Marka */}
              <div>
                <p className="text-sm font-bold tracking-tight text-stone-800 dark:text-stone-200">
                  Kuran Yolu
                </p>
                <p className="mt-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                  Kur&apos;an&apos;ı okuyun, anlayın, keşfedin — Türkçe meal,
                  kelime analizi, kök açıklamaları ve günlük okuma takibi.
                </p>
              </div>
              {/* Keşfet */}
              <nav aria-label="Alt gezinme — içerik" className="text-xs">
                <p className="mb-2.5 font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
                  İçerik
                </p>
                <ul className="space-y-2 text-stone-600 dark:text-stone-400">
                  <li><Link href="/surah" className="hover:text-emerald-700 hover:underline dark:hover:text-emerald-400">Tüm Sureler</Link></li>
                  <li><Link href="/mushaf-sayfa" className="hover:text-emerald-700 hover:underline dark:hover:text-emerald-400">Mushaf</Link></li>
                  <li><Link href="/ogren" className="hover:text-emerald-700 hover:underline dark:hover:text-emerald-400">Konular</Link></li>
                  <li><Link href="/discover" className="hover:text-emerald-700 hover:underline dark:hover:text-emerald-400">Keşfet</Link></li>
                </ul>
              </nav>
              {/* Araçlar + kurumsal */}
              <nav aria-label="Alt gezinme — araçlar" className="text-xs">
                <p className="mb-2.5 font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
                  Araçlar
                </p>
                <ul className="space-y-2 text-stone-600 dark:text-stone-400">
                  <li><Link href="/hatim" className="hover:text-emerald-700 hover:underline dark:hover:text-emerald-400">Hatim Takibi</Link></li>
                  <li><Link href="/kible" className="hover:text-emerald-700 hover:underline dark:hover:text-emerald-400">Kıble Pusulası</Link></li>
                  <li><Link href="/namaz" className="hover:text-emerald-700 hover:underline dark:hover:text-emerald-400">Namaz Vakitleri</Link></li>
                  <li><Link href="/manevi-siginak/zikirmatik" className="hover:text-emerald-700 hover:underline dark:hover:text-emerald-400">Zikirmatik</Link></li>
                </ul>
              </nav>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-5 text-xs text-stone-500 dark:border-stone-700 dark:text-stone-400">
              <span>© {new Date().getFullYear()} Kuran Yolu</span>
              <span className="flex items-center gap-4">
                <Link href="/hakkinda" className="hover:text-emerald-700 hover:underline dark:hover:text-emerald-400">
                  Hakkında
                </Link>
                <Link href="/privacy" className="hover:text-emerald-700 hover:underline dark:hover:text-emerald-400">
                  Gizlilik
                </Link>
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
