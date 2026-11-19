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
  // Access-Control-* başlıkları BURADA DEĞİL, apps/web/src/middleware.ts içinde
  // kurulur: statik headers() bloğu istek başına origin eşleştirmesi yapamıyor
  // ve ALLOWED_ORIGINS virgüllü liste olduğunda geçersiz bir tek-değerli
  // Access-Control-Allow-Origin üretiyordu; ayrıca middleware'deki preflight
  // fallback origin'inden ayrışmıştı.
  //
  // Vary: Origin de buradan VERİLEMİYOR: Next 14, app-router /api yanıtlarına
  // kendi Vary değerlerini (RSC, Next-Router-*) yazıp hem buradaki statik
  // başlığı hem middleware'deki set/append'i eziyor (ölçüldü). Origin'e göre
  // değişen ACAO'nun paylaşımlı cache'e düşmesi bu yüzden Vary ile değil,
  // middleware'de Cache-Control'ü private'a çekerek engelleniyor —
  // bkz. apps/web/src/middleware.ts applyCors().
  // 'unsafe-inline': Next App Router RSC inline script'leri ve layout tema/SW script'i için;
  // nonce tüm sayfaları dinamik yapar, statik önbellek kaybolur.
  // connect-src: HomeNamazWidget (Aladhan), KibleClient (Nominatim).
  // worker-src blob: canvas-confetti worker'ı için.
  // 2026-11-19: Report-Only ölçümünde (38 sayfa, istemci içi gezinme + ihlal dinleyicisi) 0 ihlal → engelleme modu.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data:",
              "font-src 'self'",
              "connect-src 'self' https://api.aladhan.com https://nominatim.openstreetmap.org",
              "media-src 'self'",
              "worker-src 'self' blob:",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
            ].join("; "),
          },
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
