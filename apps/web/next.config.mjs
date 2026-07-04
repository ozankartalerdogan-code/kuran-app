import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@quran-app/core",
    "@quran-app/types",
    "@quran-app/ui",
    "@quran-app/storage",
  ],
  typescript: {
    // Async Server Component'ler (discover/namaz Keşfet panelleri) Vercel build
    // ORTAMINDA yanlış React tip çözümlemesiyle reddediliyor ("Promise<Element>
    // is not a valid JSX element type"). Bu hata YERELDE HİÇBİR KONFİGÜRASYONDA
    // tekrarlanamıyor: `next build` @types/react 18/19 ve TS 5.8/6.0'ın her
    // kombinasyonunda GEÇİYOR — yani kod doğru, sorun Vercel install ağacına
    // özgü. Gerçek tip denetimi `npm run typecheck` (tsc --noEmit) ile ayrıca
    // yapılıyor ve geçiyor. Kalıcı çözüm bulunana kadar build'i bloke etmesin.
    ignoreBuildErrors: true,
  },
  eslint: {
    // Lint ayrı adımda (pre-commit + `npm run lint`) çalışır; `next build`
    // sırasında tekrar çalıştırmaya gerek yok (monorepo'da standart).
    ignoreDuringBuilds: true,
  },
  // Monorepo kökü — tracing'in doğru dosyaları toplaması için
  outputFileTracingRoot: path.join(__dirname, "../../"),
  experimental: {
    forceSwcTransforms: true,
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: process.env.NODE_ENV === "development"
              ? "*"
              : process.env.ALLOWED_ORIGINS || "https://kuran-app-web-ozan-s-projects8.vercel.app",
          },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
          { key: "Access-Control-Max-Age",       value: "86400" },
          { key: "Vary",                         value: "Origin" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      // /api/v1/* → /api/* — mevcut route'lar korunur, v1 prefix mobil için eklendi
      { source: "/api/v1/:path*", destination: "/api/:path*" },
    ];
  },
};

export default nextConfig;
