import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
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
    <html lang="tr">
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
        <nav aria-label="Ana navigasyon" className="border-b border-stone-200 bg-white px-4 py-3 dark:border-stone-700 dark:bg-stone-900 sm:px-6">
          <NavbarMenu />
        </nav>
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
      </body>
    </html>
  );
}
