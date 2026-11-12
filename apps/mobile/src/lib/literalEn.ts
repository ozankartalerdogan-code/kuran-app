// Literal (kelime kelime) çevirinin İngilizce katmanı: uygulamanın Türkçe literal
// çevirisinden YZ destekli üretilmiş İngilizce karşılık. Sure başına gömülü dosya:
// literalEn/NNN.json => { "<sure>:<ayet>": "<English>" } (tembel, sure başına önbellek).
// Metin yoksa null döner; çağıran İngilizce modda bölümü gizler (Türkçe gösterilmez).
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */

export type LiteralEnMap = Record<string, string>;

const LOADERS: Record<number, () => LiteralEnMap> = {
  1: () => require("../data/literalEn/001.json"),
  2: () => require("../data/literalEn/002.json"),
  3: () => require("../data/literalEn/003.json"),
  4: () => require("../data/literalEn/004.json"),
  5: () => require("../data/literalEn/005.json"),
  6: () => require("../data/literalEn/006.json"),
  7: () => require("../data/literalEn/007.json"),
  8: () => require("../data/literalEn/008.json"),
  9: () => require("../data/literalEn/009.json"),
  10: () => require("../data/literalEn/010.json"),
  11: () => require("../data/literalEn/011.json"),
  12: () => require("../data/literalEn/012.json"),
  13: () => require("../data/literalEn/013.json"),
  14: () => require("../data/literalEn/014.json"),
  15: () => require("../data/literalEn/015.json"),
  16: () => require("../data/literalEn/016.json"),
  17: () => require("../data/literalEn/017.json"),
  18: () => require("../data/literalEn/018.json"),
  19: () => require("../data/literalEn/019.json"),
  20: () => require("../data/literalEn/020.json"),
  21: () => require("../data/literalEn/021.json"),
  22: () => require("../data/literalEn/022.json"),
  23: () => require("../data/literalEn/023.json"),
  24: () => require("../data/literalEn/024.json"),
  25: () => require("../data/literalEn/025.json"),
  26: () => require("../data/literalEn/026.json"),
  27: () => require("../data/literalEn/027.json"),
  28: () => require("../data/literalEn/028.json"),
  29: () => require("../data/literalEn/029.json"),
  30: () => require("../data/literalEn/030.json"),
  31: () => require("../data/literalEn/031.json"),
  32: () => require("../data/literalEn/032.json"),
  33: () => require("../data/literalEn/033.json"),
  34: () => require("../data/literalEn/034.json"),
  35: () => require("../data/literalEn/035.json"),
  36: () => require("../data/literalEn/036.json"),
  37: () => require("../data/literalEn/037.json"),
  38: () => require("../data/literalEn/038.json"),
  39: () => require("../data/literalEn/039.json"),
  40: () => require("../data/literalEn/040.json"),
  41: () => require("../data/literalEn/041.json"),
  42: () => require("../data/literalEn/042.json"),
  43: () => require("../data/literalEn/043.json"),
  44: () => require("../data/literalEn/044.json"),
  45: () => require("../data/literalEn/045.json"),
  46: () => require("../data/literalEn/046.json"),
  47: () => require("../data/literalEn/047.json"),
  48: () => require("../data/literalEn/048.json"),
  49: () => require("../data/literalEn/049.json"),
  50: () => require("../data/literalEn/050.json"),
  51: () => require("../data/literalEn/051.json"),
  52: () => require("../data/literalEn/052.json"),
  53: () => require("../data/literalEn/053.json"),
  54: () => require("../data/literalEn/054.json"),
  55: () => require("../data/literalEn/055.json"),
  56: () => require("../data/literalEn/056.json"),
  57: () => require("../data/literalEn/057.json"),
  58: () => require("../data/literalEn/058.json"),
  59: () => require("../data/literalEn/059.json"),
  60: () => require("../data/literalEn/060.json"),
  61: () => require("../data/literalEn/061.json"),
  62: () => require("../data/literalEn/062.json"),
  63: () => require("../data/literalEn/063.json"),
  64: () => require("../data/literalEn/064.json"),
  65: () => require("../data/literalEn/065.json"),
  66: () => require("../data/literalEn/066.json"),
  67: () => require("../data/literalEn/067.json"),
  68: () => require("../data/literalEn/068.json"),
  69: () => require("../data/literalEn/069.json"),
  70: () => require("../data/literalEn/070.json"),
  71: () => require("../data/literalEn/071.json"),
  72: () => require("../data/literalEn/072.json"),
  73: () => require("../data/literalEn/073.json"),
  74: () => require("../data/literalEn/074.json"),
  75: () => require("../data/literalEn/075.json"),
  76: () => require("../data/literalEn/076.json"),
  77: () => require("../data/literalEn/077.json"),
  78: () => require("../data/literalEn/078.json"),
  79: () => require("../data/literalEn/079.json"),
  80: () => require("../data/literalEn/080.json"),
  81: () => require("../data/literalEn/081.json"),
  82: () => require("../data/literalEn/082.json"),
  83: () => require("../data/literalEn/083.json"),
  84: () => require("../data/literalEn/084.json"),
  85: () => require("../data/literalEn/085.json"),
  86: () => require("../data/literalEn/086.json"),
  87: () => require("../data/literalEn/087.json"),
  88: () => require("../data/literalEn/088.json"),
  89: () => require("../data/literalEn/089.json"),
  90: () => require("../data/literalEn/090.json"),
  91: () => require("../data/literalEn/091.json"),
  92: () => require("../data/literalEn/092.json"),
  93: () => require("../data/literalEn/093.json"),
  94: () => require("../data/literalEn/094.json"),
  95: () => require("../data/literalEn/095.json"),
  96: () => require("../data/literalEn/096.json"),
  97: () => require("../data/literalEn/097.json"),
  98: () => require("../data/literalEn/098.json"),
  99: () => require("../data/literalEn/099.json"),
  100: () => require("../data/literalEn/100.json"),
  101: () => require("../data/literalEn/101.json"),
  102: () => require("../data/literalEn/102.json"),
  103: () => require("../data/literalEn/103.json"),
  104: () => require("../data/literalEn/104.json"),
  105: () => require("../data/literalEn/105.json"),
  106: () => require("../data/literalEn/106.json"),
  107: () => require("../data/literalEn/107.json"),
  108: () => require("../data/literalEn/108.json"),
  109: () => require("../data/literalEn/109.json"),
  110: () => require("../data/literalEn/110.json"),
  111: () => require("../data/literalEn/111.json"),
  112: () => require("../data/literalEn/112.json"),
  113: () => require("../data/literalEn/113.json"),
  114: () => require("../data/literalEn/114.json"),
};

const cache = new Map<number, LiteralEnMap>();

function loadSurah(surahId: number): LiteralEnMap {
  let m = cache.get(surahId);
  if (m === undefined) {
    try {
      const raw = LOADERS[surahId]?.();
      m = raw && typeof raw === "object" ? raw : {};
    } catch {
      m = {};
    }
    cache.set(surahId, m);
  }
  return m;
}

/** Saf iç fonksiyon: verilen sure haritasından ayet metni (boş/eksikse null). */
export function literalEnWith(map: LiteralEnMap, verseKey: string): string | null {
  if (!Object.prototype.hasOwnProperty.call(map, verseKey)) return null;
  const v = map[verseKey];
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

/** Ayet için İngilizce literal çeviri ("s:a"); yoksa null. */
export function literalEn(verseKey: string): string | null {
  const surahId = parseInt(verseKey.split(":")[0] ?? "", 10);
  return literalEnWith(loadSurah(surahId), verseKey);
}
