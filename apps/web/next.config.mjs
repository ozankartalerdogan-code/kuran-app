/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@quran-app/core",
    "@quran-app/types",
    "@quran-app/ui",
    "@quran-app/storage",
  ],
  experimental: {
    forceSwcTransforms: true,
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          // TODO prod: ALLOWED_ORIGINS env'den spesifik domain listesi
          { key: "Access-Control-Allow-Origin",  value: "*" },
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
