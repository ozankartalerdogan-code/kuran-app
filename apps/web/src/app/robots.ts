import type { MetadataRoute } from "next";

const BASE = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://kuran-app-web-ozan-s-projects8.vercel.app").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Yalnız Google taransın (Googlebot-Image/News da bu gruba düşer)
        userAgent: "Googlebot",
        allow: "/",
        // Kullanıcıya özel / yardımcı sayfalar + API indekslenmesin
        disallow: ["/api/", "/favoriler", "/notlarim", "/offline", "/open"],
      },
      {
        // Diğer tüm botlar: Vercel kotasını korumak için kapalı (firewall da engelliyor)
        userAgent: "*",
        disallow: "/",
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
