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
    // Tip denetimi KAPATILMADI, DETERMİNİSTİK HALE GETİRİLDİ: build komutu
    // `next build`ten ÖNCE `tsc -p tsconfig.react18.json` çalıştırır
    // (bkz. vercel.json buildCommand + package.json build script'i).
    //
    // Neden: monorepo kökünde React Native yüzünden `@types/react` 19, apps/web
    // altında Next 14 ile uyumlu 18 duruyor. `next` kökte hoisted olduğu için
    // KENDİ prop tipleri 19'a, web dosyaları ise 18'e çözülüyor. Bu karışımda
    // `next build`in tip denetimi ortama göre farklı sonuç veriyordu: lokalde
    // temiz, Vercel'de TS2786 ve implicit-any. Aynı commit, iki sonuç.
    //
    // tsconfig.react18.json `paths` ile TÜM programı (next dahil) 18'e sabitler,
    // böylece denetim her yerde aynı. O `paths` ana tsconfig.json'a konamaz:
    // Next.js tsconfig paths'ini webpack alias'ına çevirir ve `react`'i bir
    // @types dizinine yönlendirmek bundle'ı bozar.
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
  async rewrites() {
    return [
      // /api/v1/* → /api/* — mevcut route'lar korunur, v1 prefix mobil için eklendi
      { source: "/api/v1/:path*", destination: "/api/:path*" },
    ];
  },
};

export default nextConfig;
