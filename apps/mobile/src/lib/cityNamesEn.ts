/**
 * cityNamesEn.ts — Türkiye dışı Diyanet şehirlerinin İngilizce karşılıkları ve arama takma adları.
 *
 * Diyanet şehir adlarını Türkçe ve büyük harfle verir ("MEKKE", "LONDRA", "KAHIRE").
 * İngilizce arayüzde "Makkah", "London", "Cairo" hem aranabilsin hem de doğru
 * gösterilsin diye kullanılır. Anahtarlar apps/web/src/data/diyanetCities.json
 * içindeki şehir `id`'leridir (aynı ad farklı ülkede olabileceği için, ör. İtalya'daki
 * ROMA → Rome, Avustralya'daki ROMA olduğu gibi kalır). Yalnız İngilizcesi Diyanet
 * adından gerçekten farklı olan şehirler eklenir. Saf modül: değer importu yok.
 */

import type { ManualCity } from "./diyanetPrayer";

export type CityNameEnEntry = {
  readonly name: string;
  readonly en: string;
  readonly aliases?: readonly string[];
};

const CITY_NAMES_EN: Readonly<Record<number, CityNameEnEntry>> = {
  // Afganistan
  9972: { name: "KABIL", en: "Kabul" },
  9963: { name: "KONDOZ", en: "Kunduz" },

  // Almanya
  10661: { name: "BRUNSWICK (BRAUNSCHWEIG)", en: "Brunswick", aliases: ["Braunschweig"] },
  11019: { name: "KOLN", en: "Cologne", aliases: ["Koeln"] },
  11022: { name: "MUNCHEN", en: "Munich" },
  11024: { name: "NURNBERG", en: "Nuremberg" },

  // Arnavutluk
  11204: { name: "ISKODRA(shkoder)", en: "Shkodra", aliases: ["Shkoder"] },
  11203: { name: "TIRAN", en: "Tirana" },

  // Avusturya
  11618: { name: "VIYANA", en: "Vienna" },

  // Azerbaycan
  11634: { name: "GENCE", en: "Ganja" },
  11632: { name: "KUBA", en: "Quba" },
  11633: { name: "KUSARY", en: "Qusar" },
  11637: { name: "NAHCIVAN", en: "Nakhchivan" },
  11643: { name: "SAMAXI", en: "Shamakhi" },
  11635: { name: "SEKI", en: "Shaki" },
  11648: { name: "SUSA", en: "Shusha" },

  // Belarus
  11685: { name: "HOMEL", en: "Gomel" },
  11689: { name: "MAHILYOW", en: "Mogilev" },

  // Belçika
  11914: { name: "ANTWERPEN", en: "Antwerp" },
  11891: { name: "BRUGGE", en: "Bruges" },
  11915: { name: "BRUKSEL", en: "Brussels" },
  11916: { name: "GENT", en: "Ghent" },
  11706: { name: "LEUVEN (LOUVAIN)", en: "Leuven", aliases: ["Louvain"] },
  11705: { name: "OOSTENDE", en: "Ostend" },

  // Bosna Hersek
  12029: { name: "SARAYBOSNA(sarajevo)", en: "Sarajevo" },

  // Bulgaristan
  12239: { name: "DOBRUCA (Tolbukhin)", en: "Dobrich", aliases: ["Tolbukhin"] },
  12243: { name: "FILIBE(Plovdiv)", en: "Plovdiv" },
  12244: { name: "HASKOY (Khaskovo)", en: "Haskovo" },
  12246: { name: "ISLIMYELI(Sliven)", en: "Sliven" },
  12250: { name: "KAZANLUK", en: "Kazanlak" },
  12245: { name: "KIRCAALI", en: "Kardzhali" },
  12247: { name: "PAZARCIK (pazardzhik)", en: "Pazardzhik" },
  12248: { name: "PLEVNE (Pleven)", en: "Pleven" },
  12234: { name: "RUSCUK (Ruse)", en: "Ruse" },
  12237: { name: "SOFYA", en: "Sofia" },
  12235: { name: "SUMNU (shumen)", en: "Shumen" },

  // Çek Cumhuriyeti
  12335: { name: "PLZEN", en: "Pilsen", aliases: ["Plzen"] },
  12315: { name: "PRAG", en: "Prague" },

  // Cezayir
  12361: { name: "CEZAYIR", en: "Algiers" },

  // Cibuti
  12366: { name: "CIBUTI", en: "Djibouti" },

  // Çin
  12587: { name: "PEKIN", en: "Beijing", aliases: ["Peking"] },

  // Danimarka
  12618: { name: "KOPENHAG", en: "Copenhagen" },

  // Ermenistan
  12784: { name: "ERIVAN", en: "Yerevan" },

  // Etiyopya
  19018: { name: "ADIS ABABA", en: "Addis Ababa" },

  // Fas
  12806: { name: "KASABLANKA", en: "Casablanca" },
  12805: { name: "MARAKES", en: "Marrakesh", aliases: ["Marrakech"] },

  // Filistin
  12865: { name: "ERIHA", en: "Jericho" },
  12867: { name: "GAZZE", en: "Gaza" },

  // Fransa
  13017: { name: "DUNKERQUE", en: "Dunkirk" },

  // Güney Kore
  13500: { name: "PUSAN", en: "Busan" },
  13499: { name: "SEUL", en: "Seoul" },

  // Gürcistan
  16748: { name: "AHISKA", en: "Akhaltsikhe" },
  13555: { name: "BATUM", en: "Batumi" },
  13554: { name: "TIFLIS", en: "Tbilisi" },

  // Hindistan
  13681: { name: "BOMBAY", en: "Mumbai", aliases: ["Bombay"] },
  13586: { name: "CALCUTTA", en: "Kolkata", aliases: ["Calcutta"] },
  13631: { name: "CALICUT", en: "Kozhikode", aliases: ["Calicut"] },
  13591: { name: "COCHIN", en: "Kochi", aliases: ["Cochin"] },
  13672: { name: "TRIVANDRUM", en: "Thiruvananthapuram", aliases: ["Trivandrum"] },
  13680: { name: "YENI DELHI", en: "New Delhi", aliases: ["Delhi"] },

  // Hollanda
  13977: { name: "DEN HAAG", en: "The Hague" },

  // İngiltere
  14096: { name: "LONDRA", en: "London" },
  14036: { name: "WATFORD (LONDRA)", en: "Watford" },

  // Irak
  14170: { name: "BAGDAT", en: "Baghdad" },
  16770: { name: "CEMCEMAL", en: "Chamchamal" },
  14161: { name: "KERBELA", en: "Karbala" },
  14168: { name: "KERKUK", en: "Kirkuk" },
  14167: { name: "MUSUL", en: "Mosul" },
  16793: { name: "NECEF", en: "Najaf" },
  14158: { name: "SULEYMANIYE", en: "Sulaymaniyah" },

  // İran
  14203: { name: "ISFEHAN", en: "Isfahan" },
  16791: { name: "MEHABAD", en: "Mahabad" },
  16790: { name: "MERIVAN", en: "Marivan" },
  14177: { name: "TAHRAN", en: "Tehran" },

  // İsveç
  14320: { name: "GOTEBORG", en: "Gothenburg", aliases: ["Goteborg"] },

  // İsviçre
  14550: { name: "CENEVRE", en: "Geneva" },
  14551: { name: "LOZAN", en: "Lausanne" },
  14547: { name: "ZURIH", en: "Zurich" },

  // İtalya
  14563: { name: "GENOVA", en: "Genoa" },
  14586: { name: "MILANO", en: "Milan" },
  14589: { name: "NAPOLI", en: "Naples" },
  14690: { name: "PADOVA", en: "Padua" },
  14588: { name: "ROMA", en: "Rome" },
  14590: { name: "TORINO", en: "Turin" },
  14578: { name: "VENEDIK", en: "Venice" },

  // Japonya
  14842: { name: "HIROSIMA", en: "Hiroshima" },

  // Kanada
  9109: { name: "OTTAVA", en: "Ottawa" },

  // Kazakistan
  14997: { name: "ALMATI", en: "Almaty" },
  14910: { name: "CHIMKENT", en: "Shymkent", aliases: ["Chimkent"] },

  // Kırgızistan
  15071: { name: "BISKEK", en: "Bishkek" },

  // Kosova
  15123: { name: "FERİZOVİK", en: "Ferizaj" },
  16728: { name: "GİLAN", en: "Gjilan" },
  15125: { name: "MİTROVİÇE", en: "Mitrovica" },
  15126: { name: "PRİSTİNE", en: "Pristina" },

  // Kuzey Kıbrıs
  17914: { name: "BAF", en: "Paphos" },
  // KKTC şehirleri İngilizcede de Türkçe resmî adıyla gösterilir; uluslararası adlar yalnız aramada.
  15160: { name: "GAZI MAGOSA", en: "Gazimağusa", aliases: ["Famagusta", "Gazimagusa", "Magusa"] },
  15159: { name: "GIRNE", en: "Girne", aliases: ["Kyrenia"] },
  15155: { name: "GUZELYURT", en: "Güzelyurt", aliases: ["Morphou"] },
  15157: { name: "LARNAKA", en: "Larnaca" },
  15158: { name: "LEFKOSA", en: "Lefkoşa", aliases: ["Nicosia", "Lefkosa"] },
  17913: { name: "LIMASOL", en: "Limassol" },

  // Libya
  15190: { name: "BINGAZI", en: "Benghazi" },

  // Lübnan
  15216: { name: "BEYRUT", en: "Beirut" },
  15214: { name: "SAYDA", en: "Sidon" },
  15211: { name: "SUR", en: "Tyre" },
  15217: { name: "TRABLUSSAM", en: "Tripoli" },

  // Lüksemburg
  15234: { name: "LUKSEMBURG", en: "Luxembourg" },

  // Macaristan
  15267: { name: "BUDAPESTE", en: "Budapest" },

  // Makao
  15273: { name: "MAKAO", en: "Macau", aliases: ["Macao"] },

  // Makedonya
  15299: { name: "MANASTIR(bitola)", en: "Bitola" },
  15298: { name: "USKUP", en: "Skopje" },

  // Malezya
  15342: { name: "MELAKA", en: "Malacca", aliases: ["Melaka"] },

  // Mısır
  16711: { name: "DIMYAT", en: "Damietta" },
  15454: { name: "ISKENDERIYE", en: "Alexandria" },
  15474: { name: "KAHIRE", en: "Cairo" },

  // Moğolistan
  15534: { name: "ULAN BATOR", en: "Ulaanbaatar", aliases: ["Ulan Bator"] },

  // Moldavya
  15538: { name: "KISHINEV", en: "Chisinau", aliases: ["Kishinev"] },

  // Monako
  15543: { name: "MONAKO", en: "Monaco" },

  // Özbekistan
  15758: { name: "ANDIZHAN", en: "Andijan" },
  15757: { name: "BUHARA", en: "Bukhara" },
  15765: { name: "TASKENT", en: "Tashkent" },
  15764: { name: "URGENC", en: "Urgench" },

  // Pakistan
  15793: { name: "LAHOR", en: "Lahore" },

  // Polonya
  15884: { name: "VARSOVA", en: "Warsaw" },

  // Portekiz
  15905: { name: "LIZBON", en: "Lisbon" },

  // Romanya
  15944: { name: "BUKRES(bucharest)", en: "Bucharest" },
  15950: { name: "IBRAIL(braila)", en: "Braila" },
  15943: { name: "KOSTENCE(constanta)", en: "Constanta" },
  15941: { name: "KRAYOVA(CRAIO)", en: "Craiova" },
  15956: { name: "MECIDIYE", en: "Medgidia" },
  15947: { name: "SUBI(SIBIU)", en: "Sibiu" },
  15949: { name: "TEMISVAR", en: "Timisoara" },

  // Rusya
  16054: { name: "ARCHANGELSK", en: "Arkhangelsk" },
  22184: { name: "MOSKOVA", en: "Moscow" },

  // Suudi Arabistan
  16310: { name: "CIDDE", en: "Jeddah", aliases: ["Jiddah"] },
  16308: { name: "MEDINE", en: "Madinah", aliases: ["Medina"] },
  16309: { name: "MEKKE", en: "Makkah", aliases: ["Mecca", "Makka"] },
  16307: { name: "RIYAD", en: "Riyadh" },

  // Singapur
  16214: { name: "SINGAPUR", en: "Singapore" },

  // Sırbistan
  16234: { name: "BELGRAD", en: "Belgrade" },
  16226: { name: "YENİ PAZAR", en: "Novi Pazar" },

  // Sudan
  16285: { name: "HARTUM", en: "Khartoum" },

  // Suriye
  16298: { name: "AL LADHIQIYAH", en: "Latakia" },
  16299: { name: "AL QAMISHLI", en: "Qamishli" },
  16303: { name: "AR RAQQAH", en: "Raqqa" },
  16304: { name: "DAYR AZ ZAWR", en: "Deir ez-Zor" },
  16305: { name: "HALEP", en: "Aleppo" },
  16301: { name: "HAMAH", en: "Hama" },
  16784: { name: "HASEKE", en: "Al-Hasakah", aliases: ["Hasakah"] },
  16300: { name: "HIMS", en: "Homs" },
  16306: { name: "SAM", en: "Damascus" },

  // Tunus
  16382: { name: "AL QAYRAWAN", en: "Kairouan" },
  16381: { name: "SUSAH", en: "Sousse" },
  16385: { name: "TUNUS", en: "Tunis" },

  // Türkmenistan
  16408: { name: "ASKABAT", en: "Ashgabat" },
  16412: { name: "TURKMENBASI", en: "Turkmenbashi" },

  // Ukrayna ve Kırım
  16514: { name: "AKMESCIT (Simferopol)", en: "Simferopol" },
  16516: { name: "BAHCESARAY", en: "Bakhchysarai" },
  16450: { name: "DNIPROPETROVSK", en: "Dnipro", aliases: ["Dnipropetrovsk"] },
  16522: { name: "KEFE", en: "Feodosia" },
  16498: { name: "KIEV", en: "Kyiv", aliases: ["Kiev"] },

  // Umman
  16527: { name: "MASKAT", en: "Muscat" },
  16530: { name: "SUHAR", en: "Sohar" },

  // Vatikan
  16553: { name: "VATIKAN", en: "Vatican City" },

  // Yunanistan
  16685: { name: "ATINA", en: "Athens" },
  16682: { name: "DEDEAGAC", en: "Alexandroupoli" },
  16683: { name: "GUMULCINE(komotini)", en: "Komotini" },
  16686: { name: "ISKECE(xanthi)", en: "Xanthi" },
  16665: { name: "KERKIRA", en: "Corfu", aliases: ["Kerkyra"] },
  16673: { name: "KHANIA", en: "Chania" },
  16658: { name: "RODOS", en: "Rhodes" },
  16684: { name: "SELANIK(thessaloniki)", en: "Thessaloniki" },
};

function normalizeSearch(s: string): string {
  return s
    .trim()
    .replace(/İ/g, "i")
    .replace(/I/g, "i")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i");
}

const SEARCH_INDEX: readonly { target: string; terms: readonly string[] }[] = Object.values(CITY_NAMES_EN).map(
  (entry) => ({
    target: entry.name,
    terms: [entry.en, ...(entry.aliases ?? [])].map(normalizeSearch),
  }),
);

/** Diyanet şehir id'sinin İngilizce adı; tabloda yoksa null. */
export function cityNameEn(id: number): string | null {
  return CITY_NAMES_EN[id]?.en ?? null;
}

/**
 * İngilizce arama sorgusuyla eşleşen Diyanet şehir adlarını döndürür.
 * En az 3 karakter gerekir; aksan ve Türkçe harf farkı yok sayılır. En fazla 3 tekil sonuç.
 */
export function cityAliasTargets(query: string): string[] {
  const norm = normalizeSearch(query);
  if (norm.length < 3) return [];

  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of SEARCH_INDEX) {
    if (seen.has(item.target)) continue;
    if (item.terms.some((term) => term.startsWith(norm))) {
      seen.add(item.target);
      out.push(item.target);
      if (out.length >= 3) break;
    }
  }
  return out;
}

/**
 * Şehir aramasını İngilizce takma adlarla zenginleştirir.
 * Asıl sorgu ile takma ad sorgularını paralel çalıştırır; id'ye göre tekilleştirip
 * takma ad eşleşmelerini başa koyar. Takma ad aramalarındaki hata asıl sonucu bozmaz;
 * hepsi başarısız olursa null döner.
 */
export async function searchCitiesWithAliases(
  query: string,
  search: (q: string) => Promise<ManualCity[] | null>,
): Promise<ManualCity[] | null> {
  const targets = cityAliasTargets(query);
  if (targets.length === 0) {
    return search(query);
  }

  const safeSearch = (q: string): Promise<ManualCity[] | null> =>
    Promise.resolve()
      .then(() => search(q))
      .catch(() => null);

  const [mainResult, ...aliasResults] = await Promise.all([
    safeSearch(query),
    ...targets.map((target) => safeSearch(target)),
  ]);

  const anySuccess = mainResult !== null || aliasResults.some((list) => list !== null);
  if (!anySuccess) return null;

  const seen = new Set<number>();
  const merged: ManualCity[] = [];
  aliasResults.forEach((list, i) => {
    if (!list) return;
    const target = normalizeSearch(targets[i]);
    for (const city of list) {
      // Sunucu araması alt dize eşleşmesi de döndürür ("SUR" → Surabaya); takma addan yalnız o şehrin kendisi gelir.
      if (normalizeSearch(city.name) !== target) continue;
      if (seen.has(city.id)) continue;
      seen.add(city.id);
      merged.push(city);
    }
  });
  if (mainResult) {
    for (const city of mainResult) {
      if (seen.has(city.id)) continue;
      seen.add(city.id);
      merged.push(city);
    }
  }
  return merged;
}

/** Testler için: tablonun tüm kayıtları. */
export const CITY_NAME_EN_ENTRIES: Readonly<Record<number, CityNameEnEntry>> = CITY_NAMES_EN;
