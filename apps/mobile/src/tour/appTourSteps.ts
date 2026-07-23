export const APP_TOUR_VERSION = 6;

export type TourPlacement = "top" | "bottom" | "center";
export type TourAction = "next" | "navigate" | "finish";

export type AppTourStep = {
  id: string;
  screen: string;
  route: string;
  title: string;
  description: string;
  targetId?: string;
  action: TourAction;
  navigateTo?: string;
  placement?: TourPlacement;
};

type TourRouteParams = Record<string, string | string[] | undefined>;

function normalizedPath(path: string): string {
  if (!path || path === "/(tabs)") return "/";
  let normalized = path;
  try { normalized = decodeURIComponent(path); } catch { /* keep malformed encoding unchanged */ }
  return normalized.endsWith("/") && normalized.length > 1
    ? normalized.slice(0, -1)
    : normalized;
}

export function normalizeTourRoute(route: string): string {
  const withoutHash = route.split("#", 1)[0];
  const queryIndex = withoutHash.indexOf("?");
  const path = normalizedPath(queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash);
  if (queryIndex < 0) return path;

  const query = new URLSearchParams(withoutHash.slice(queryIndex + 1));
  query.sort();
  const serialized = query.toString();
  return serialized ? `${path}?${serialized}` : path;
}

export function buildTourRoute(
  pathname: string,
  segments: readonly string[],
  params: TourRouteParams,
): string {
  const dynamicKeys = new Set(
    segments
      .map((segment) => segment.match(/^\[(?:\.\.\.)?(.+)\]$/)?.[1])
      .filter((key): key is string => !!key),
  );
  const query = new URLSearchParams();

  for (const key of Object.keys(params).sort()) {
    if (dynamicKeys.has(key)) continue;
    const value = params[key];
    const values = Array.isArray(value) ? value : value === undefined ? [] : [value];
    for (const item of values) query.append(key, item);
  }

  const serialized = query.toString();
  return normalizeTourRoute(`${pathname}${serialized ? `?${serialized}` : ""}`);
}

export function getTourPath(route: string): string {
  return normalizeTourRoute(route).split("?", 1)[0];
}

export function getTourNavigationTarget(currentRoute: string, targetRoute: string): string | null {
  const current = normalizeTourRoute(currentRoute);
  const target = normalizeTourRoute(targetRoute);
  return current === target ? null : target;
}

export function getSafeTourExitRoute(route: string): string {
  if (!route || route !== route.trim() || !route.startsWith("/") || route.startsWith("//") || route.includes("\\")) {
    return "/";
  }
  const normalized = normalizeTourRoute(route);
  if (!normalized.startsWith("/") || normalized.startsWith("//") || normalized.includes("\\")) {
    return "/";
  }
  const path = getTourPath(normalized);
  if (path === "/onboarding" || path.split("/").some((part) => part === "." || part === "..")) return "/";
  return normalized;
}

export const APP_TOUR_STEPS: AppTourStep[] = [
  {
    id: "welcome",
    screen: "home",
    route: "/",
    title: "Kuran Yolu'na ho\u015f geldin",
    description: "Sana sadece ana b\u00f6l\u00fcmleri g\u00f6sterece\u011fim. Her ekrana tek tek sokmadan, nereden neye ula\u015faca\u011f\u0131n\u0131 \u00f6\u011frenelim.",
    action: "next",
    placement: "center",
  },
  {
    id: "home-prayer-times",
    screen: "home",
    route: "/",
    title: "Namaz vakitleri",
    description: "Bug\u00fcn\u00fcn vakitlerini ve s\u0131radaki namaz\u0131 buradan takip edebilirsin.",
    targetId: "home.prayerTimes",
    action: "next",
    placement: "bottom",
  },
  {
    id: "home-qibla-shortcut",
    screen: "home",
    route: "/",
    title: "K\u0131ble k\u0131sayolu",
    description: "K\u0131ble pusulas\u0131na ana sayfadaki bu k\u0131sayoldan h\u0131zl\u0131ca gidebilirsin.",
    targetId: "home.quick.qibla",
    action: "navigate",
    navigateTo: "/kuran",
    placement: "top",
  },
  {
    id: "kuran-section",
    screen: "kuran",
    route: "/kuran",
    title: "Kur'an b\u00f6l\u00fcm\u00fc",
    description: "Mushaf okuma (hatim takibiyle birlikte) ve sure listesi burada. Okuma i\u00e7in genelde bu ekrandan ba\u015flars\u0131n.",
    targetId: "kuran.surahList",
    action: "navigate",
    navigateTo: "/sure-listesi",
    placement: "bottom",
  },
  {
    id: "surah-list",
    screen: "sure-listesi",
    route: "/sure-listesi",
    title: "Sure listesi",
    description: "Sure arayabilir, Mushaf veya n\u00fczul s\u0131ras\u0131na g\u00f6re listeyi de\u011fi\u015ftirebilirsin.",
    targetId: "surahList.search",
    action: "navigate",
    navigateTo: "/surah/1",
    placement: "bottom",
  },
  {
    id: "surah-reader",
    screen: "surah",
    route: "/surah/1",
    title: "Sure ekran\u0131",
    description: "Ayetlere dokunarak detay\u0131 a\u00e7abilir, \u00fcstteki tefsir kart\u0131ndan sure a\u00e7\u0131klamas\u0131na ge\u00e7ebilirsin.",
    targetId: "surah.reader",
    action: "navigate",
    navigateTo: "/ayah/1/1",
    placement: "bottom",
  },
  {
    id: "ayah-detail",
    screen: "ayah",
    route: "/ayah/1/1",
    title: "Ayet detay\u0131",
    description: "Meal, kelime analizi, k\u00f6kler, favori ve not alma i\u015flemleri bu detay ekran\u0131nda.",
    targetId: "ayah.main",
    action: "navigate",
    navigateTo: "/ayah/1/1",
    placement: "bottom",
  },
  {
    id: "ayah-analysis",
    screen: "ayah",
    route: "/ayah/1/1",
    title: "Analiz sekmesi",
    description: "Ayetin kelime kelime kar\u015f\u0131l\u0131\u011f\u0131n\u0131 ve meal ile literal \u00e7eviri aras\u0131ndaki anlam farklar\u0131n\u0131 bu sekmeden inceleyebilirsin.",
    targetId: "ayah.analysis",
    action: "navigate",
    navigateTo: "/ogren",
    placement: "bottom",
  },
  {
    id: "ogren-tab",
    screen: "ogren",
    route: "/ogren",
    title: "\u00d6\u011fren b\u00f6l\u00fcm\u00fc",
    description: "Dersler, peygamber k\u0131ssalar\u0131, siyer, hadisler ve kelime k\u00f6k\u00fc analizi bu b\u00f6l\u00fcmde. \u00d6\u011frenmeye buradan ba\u015flayabilirsin.",
    targetId: "learn.dersler",
    action: "navigate",
    navigateTo: "/dersler",
    placement: "bottom",
  },
  {
    id: "lesson-list",
    screen: "dersler",
    route: "/dersler",
    title: "Ders se\u00e7imi",
    description: "Bir derse girerek konuyu kart kart okuyabilir, sonunda test varsa kendini deneyebilirsin.",
    targetId: "dersler.firstCard",
    action: "navigate",
    navigateTo: "/dersler/namaz",
    placement: "bottom",
  },
  {
    id: "lesson-detail",
    screen: "ders-detay",
    route: "/dersler/namaz",
    title: "Ders kartlar\u0131",
    description: "Sonraki butonuyla kartlar aras\u0131nda ilerlersin. Son kartta test ba\u015flar.",
    targetId: "lesson.next",
    action: "navigate",
    navigateTo: "/hadisler",
    placement: "top",
  },
  {
    id: "hadith-topics",
    screen: "hadisler",
    route: "/hadisler",
    title: "Hadisler",
    description: "Hadisleri konu gruplar\u0131 halinde a\u00e7abilir, kaynak ve ders notlar\u0131n\u0131 okuyabilirsin.",
    targetId: "hadith.topics",
    action: "navigate",
    navigateTo: "/root",
    placement: "bottom",
  },
  {
    id: "root-list",
    screen: "root",
    route: "/root",
    title: "Kelime K\u00f6k\u00fc Analizi",
    description: "Kur'an'da en s\u0131k ge\u00e7en 200 Arap\u00e7a k\u00f6k\u00fc buradan arayabilir; frekans, alfabe veya anlama g\u00f6re s\u0131ralayabilirsin.",
    targetId: "root.list",
    action: "navigate",
    navigateTo: "/root/\u062e\u0644\u0642",
    placement: "bottom",
  },
  {
    id: "root-detail",
    screen: "root-detail",
    route: "/root/\u062e\u0644\u0642",
    title: "K\u00f6k \u0131s\u0131 haritas\u0131",
    description: "Bir k\u00f6ke girince 114 surelik \u0131s\u0131 haritas\u0131nda nerede yo\u011funla\u015ft\u0131\u011f\u0131n\u0131 g\u00f6r\u00fcr; alt\u0131ndaki anlam gruplar\u0131ndan t\u00fcrev kelimelere ve ayetlere ula\u015f\u0131rs\u0131n.",
    targetId: "root.heatmap",
    action: "navigate",
    navigateTo: "/ibadet",
    placement: "bottom",
  },
  {
    id: "ibadet-tab",
    screen: "ibadet",
    route: "/ibadet",
    title: "\u0130badet b\u00f6l\u00fcm\u00fc",
    description: "Namaz rehberi, dualar, ibadet rehberi, k\u0131ble ve tespih ara\u00e7lar\u0131 burada toplan\u0131r.",
    targetId: "ibadet.main",
    action: "navigate",
    navigateTo: "/daha-fazla",
    placement: "bottom",
  },
  {
    id: "more-settings",
    screen: "daha-fazla",
    route: "/daha-fazla",
    title: "Daha Fazla",
    description: "Favoriler, notlar, kaynaklar ve uygulama ara\u00e7lar\u0131 bu b\u00f6l\u00fcmde toplan\u0131r.",
    targetId: "more.appSection",
    action: "next",
    placement: "bottom",
  },
  {
    id: "restart-tour",
    screen: "daha-fazla",
    route: "/daha-fazla",
    title: "Tan\u0131t\u0131m\u0131 tekrar g\u00f6ster",
    description: "Rehberi tekrar g\u00f6rmek istersen bu butonla ba\u015ftan ba\u015flatabilirsin.",
    targetId: "more.restartTour",
    action: "finish",
    placement: "top",
  },
];
