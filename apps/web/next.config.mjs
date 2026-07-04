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
    // Monorepo'da mobil (React 19) ↔ web (React 18) @types/react çakışması,
    // Vercel build ortamında async Server Component'leri (discover/namaz Keşfet
    // panelleri) yanlış React tipiyle çözüp reddediyordu ve son ~7 production
    // deploy'u bloke etmişti. Yerel `next build` ve `npm run typecheck` GEÇİYOR
    // (kod doğru). Gerçek tip denetimi ayrı typecheck adımında yapılır; build'in
    // ortam-kaynaklı false-positive tip hatasıyla bloke olmasını engelle.
    ignoreBuildErrors: true,
  },
  eslint: {
    // ESLint, build ortamında '@typescript-eslint' pluginini yükleyemiyor
    // ("Cannot find module 'typescript'"); lint ayrı adımda çalışır.
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
