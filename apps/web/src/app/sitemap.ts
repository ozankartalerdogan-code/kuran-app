import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { dbAll } from "../lib/dbUtils";

// DB'den üretiliyor (6236 ayet + kökler). Günlük yenilenir.
export const revalidate = 86400;

const BASE = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://kuran-app-web-ozan-s-projects8.vercel.app").replace(/\/$/, "");

// DB sorgularını günlük cache'le — dbUtils'in no-store fetch'i sitemap'i her
// istekte yeniden ürettiriyordu (~2sn, cache MISS). unstable_cache sonucu
// memoize eder (iç fetch'ten bağımsız) → günde bir üretilir, kalan istekler hızlı.
const getSitemapRows = unstable_cache(
  async () => {
    let verses: { verse_key: string }[] = [];
    let roots: { root: string }[] = [];
    try {
      verses = await dbAll<{ verse_key: string }>(
        "SELECT verse_key FROM verses ORDER BY surah_id, ayah_number",
      );
    } catch { /* DB erişilemezse en azından statik sayfalar döner */ }
    try {
      roots = await dbAll<{ root: string }>(
        "SELECT DISTINCT root FROM root_meanings WHERE root IS NOT NULL AND TRIM(root) <> ''",
      );
    } catch { /* kök tablosu yoksa atla */ }
    return { verses, roots };
  },
  ["sitemap-rows-v1"],
  { revalidate: 86400 },
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // ── Statik içerik sayfaları ──────────────────────────────────────────────
  const staticPaths: Array<[string, MetadataRoute.Sitemap[number]["changeFrequency"], number]> = [
    ["", "daily", 1.0],
    ["/surah", "weekly", 0.9],
    ["/discover", "weekly", 0.8],
    ["/arama", "weekly", 0.6],
    ["/ogren", "weekly", 0.7],
    ["/ogren/harf-i-tarif", "weekly", 0.7],
    ["/namaz", "weekly", 0.7],
    ["/ibadet-rehberi", "weekly", 0.7],
    ["/manevi-siginak", "weekly", 0.7],
    ["/manevi-siginak/ismi-azam", "weekly", 0.7],
    ["/esma", "weekly", 0.8],
    ["/root", "weekly", 0.6],
    ["/hatim", "weekly", 0.6],
    ["/mushaf", "weekly", 0.6],
    ["/kible", "monthly", 0.4],
    ["/privacy", "yearly", 0.2],
  ];
  const entries: MetadataRoute.Sitemap = staticPaths.map(([p, changeFrequency, priority]) => ({
    url: `${BASE}${p}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  const { verses, roots } = await getSitemapRows();

  // ── 6236 ayet sayfası (çekirdek içerik) ──────────────────────────────────
  for (const v of verses) {
    const [s, a] = v.verse_key.split(":");
    entries.push({
      url: `${BASE}/surah/${s}/ayah/${a}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  // ── Kök sayfaları (/root/[root]) ─────────────────────────────────────────
  for (const r of roots) {
    entries.push({
      url: `${BASE}/root/${encodeURIComponent(r.root)}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    });
  }

  return entries;
}
