import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Lora, Figtree } from "next/font/google";
import { NavbarMenu } from "./NavbarMenu";
import "./globals.css";

// Marka tipografisi — next/font: build sırasında indirilir, self-host edilir,
// CLS'siz yüklenir. Başlıklar Lora (kitap hissi veren serif), UI Figtree.
// latin-ext şart: Türkçe ğ/ş/ı karakterleri bu altkümede.
const fontDisplay = Lora({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const fontSans = Figtree({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});

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
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    // iOS SVG apple-touch-icon desteklemez — 180x180 PNG şart
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width:        "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor:   "#1e2c42",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="tr" className={`scroll-smooth ${fontDisplay.variable} ${fontSans.variable}`}>
      {/* Anti-flicker: React hydrate'dan önce gece modunu uygula */}
      <head>
        {/* Arapça font erken yüklensin — ayet metinleri fontla boyansın (FOUT engeli) */}
        <link
          rel="preload"
          href="/fonts/Amiri-Regular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
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
        {/* Lacivert navbar — hero ve footer ile aynı marka kimliği, altın alt çizgi */}
        <nav
          aria-label="Ana navigasyon"
          className="sticky top-0 z-40 border-b border-gold-500/25 bg-navy-950/95 px-4 py-3 backdrop-blur-md sm:px-6"
        >
          <NavbarMenu />
        </nav>
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="mt-12 border-t border-gold-500/20 bg-navy-950 px-4 py-10 text-navy-200 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <div className="grid gap-8 sm:grid-cols-3">
              {/* Marka */}
              <div>
                <p className="font-display text-base font-bold tracking-tight text-white">
                  Kuran Yolu
                </p>
                <p className="mt-2 text-xs leading-relaxed text-navy-300">
                  Kur&apos;an&apos;ı okuyun, anlayın, keşfedin — Türkçe meal,
                  kelime analizi, kök açıklamaları ve günlük okuma takibi.
                </p>
              </div>
              {/* Keşfet */}
              <nav aria-label="Alt gezinme — içerik" className="text-xs">
                <p className="mb-2.5 font-semibold uppercase tracking-widest text-gold-400/90">
                  İçerik
                </p>
                <ul className="space-y-2 text-navy-200">
                  <li><Link href="/surah" className="hover:text-white hover:underline">Tüm Sureler</Link></li>
                  <li><Link href="/mushaf-sayfa" className="hover:text-white hover:underline">Mushaf</Link></li>
                  <li><Link href="/ogren" className="hover:text-white hover:underline">Konular</Link></li>
                  <li><Link href="/discover" className="hover:text-white hover:underline">Keşfet</Link></li>
                </ul>
              </nav>
              {/* Araçlar + kurumsal */}
              <nav aria-label="Alt gezinme — araçlar" className="text-xs">
                <p className="mb-2.5 font-semibold uppercase tracking-widest text-gold-400/90">
                  Araçlar
                </p>
                <ul className="space-y-2 text-navy-200">
                  <li><Link href="/hatim" className="hover:text-white hover:underline">Hatim Takibi</Link></li>
                  <li><Link href="/kible" className="hover:text-white hover:underline">Kıble Pusulası</Link></li>
                  <li><Link href="/namaz" className="hover:text-white hover:underline">Namaz Vakitleri</Link></li>
                  <li><Link href="/manevi-siginak/zikirmatik" className="hover:text-white hover:underline">Zikirmatik</Link></li>
                </ul>
              </nav>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-navy-800 pt-5 text-xs text-navy-300">
              <span>© {new Date().getFullYear()} Kuran Yolu</span>
              <span className="flex items-center gap-4">
                <Link href="/hakkinda" className="hover:text-white hover:underline">
                  Hakkında
                </Link>
                <Link href="/privacy" className="hover:text-white hover:underline">
                  Gizlilik
                </Link>
                <a href="mailto:kuranyolu.iletisim@gmail.com" className="hover:text-white hover:underline">
                  İletişim
                </a>
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
