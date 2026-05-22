/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@quran-app/core",
    "@quran-app/types",
    "@quran-app/ui",
    "styled-jsx",
  ],
  experimental: {
    forceSwcTransforms: true,
  },
};

export default nextConfig;
