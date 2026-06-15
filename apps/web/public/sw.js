const CACHE_VERSION = "v2";
const STATIC_CACHE  = `kuranapp-static-${CACHE_VERSION}`;
const API_CACHE     = `kuranapp-api-${CACHE_VERSION}`;
const PAGE_CACHE    = `kuranapp-pages-${CACHE_VERSION}`;

// Kurulumda önbelleğe alınacak statik dosyalar
const PRECACHE_URLS = [
  "/",
  "/offline",
  "/surah",
  "/discover",
  "/ogren",
  "/ogren/harf-i-tarif",
  "/esma",
  "/namaz",
  "/ibadet-rehberi",
  "/manevi-siginak",
  "/favoriler",
  "/notlarim",
  "/hatim",
  "/kible",
];

// Kalıcı önbellekleme (hiç değişmez)
const IMMUTABLE_API = [
  "/api/surahs",
  "/api/elifba/dersler",
];

// ── Yükleme ──────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch(() => {})
    ).then(() => self.skipWaiting())
  );
});

// ── Aktivasyon — eski önbellekleri temizle ────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![STATIC_CACHE, API_CACHE, PAGE_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Sadece GET, aynı origin veya ses dosyaları
  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin && !url.pathname.startsWith("/audio/")) return;
  // Chrome devtools ve Vercel iç isteklerini atla
  if (url.pathname.startsWith("/_next/webpack-hmr")) return;
  if (url.pathname.startsWith("/__nextjs")) return;

  // 1. Statik _next varlıkları (JS/CSS/images) — cache-first
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/audio/elifba/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // 2. Kalıcı API'ler (sureler, elifba) — cache-first
  if (IMMUTABLE_API.some((p) => url.pathname === p || url.pathname.startsWith(p + "/"))) {
    event.respondWith(cacheFirst(request, API_CACHE));
    return;
  }

  // 3. Diğer API'ler — network-first, önbellek fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // 4. Sayfalar — network-first, offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      networkFirst(request, PAGE_CACHE).catch(() =>
        caches.match("/offline").then((r) => r ?? new Response("Çevrimdışısınız.", { status: 503 }))
      )
    );
    return;
  }
});

// ── Yardımcılar ───────────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    return new Response("", { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw new Error("offline");
  }
}
