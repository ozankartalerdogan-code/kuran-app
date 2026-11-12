// Kelime-kelime İngilizce anlam katmanı. Sunucu Türkçe anlam döner; İngilizce
// arayüzde gömülü sözlükler bindirilir, karşılığı yoksa Türkçe anlam kalır
// (iki dil yan yana gösterilmez).
//  - wordGlossEn/NNN.json: sure başına { "s:a:i": gloss } (tembel, sure başına önbellek)
//  - wordMeaningsEn.json: { meanings: {Türkçe anlam: İngilizce}, roots: {kök: İngilizce} }
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */

export type WordGloss = Record<string, string>;
export type WordMeaningsDict = {
  meanings?: Record<string, string>;
  roots?: Record<string, string>;
};

const GLOSS_LOADERS: Record<number, () => WordGloss> = {
  1: () => require("../data/wordGlossEn/001.json"),
  2: () => require("../data/wordGlossEn/002.json"),
  3: () => require("../data/wordGlossEn/003.json"),
  4: () => require("../data/wordGlossEn/004.json"),
  5: () => require("../data/wordGlossEn/005.json"),
  6: () => require("../data/wordGlossEn/006.json"),
  7: () => require("../data/wordGlossEn/007.json"),
  8: () => require("../data/wordGlossEn/008.json"),
  9: () => require("../data/wordGlossEn/009.json"),
  10: () => require("../data/wordGlossEn/010.json"),
  11: () => require("../data/wordGlossEn/011.json"),
  12: () => require("../data/wordGlossEn/012.json"),
  13: () => require("../data/wordGlossEn/013.json"),
  14: () => require("../data/wordGlossEn/014.json"),
  15: () => require("../data/wordGlossEn/015.json"),
  16: () => require("../data/wordGlossEn/016.json"),
  17: () => require("../data/wordGlossEn/017.json"),
  18: () => require("../data/wordGlossEn/018.json"),
  19: () => require("../data/wordGlossEn/019.json"),
  20: () => require("../data/wordGlossEn/020.json"),
  21: () => require("../data/wordGlossEn/021.json"),
  22: () => require("../data/wordGlossEn/022.json"),
  23: () => require("../data/wordGlossEn/023.json"),
  24: () => require("../data/wordGlossEn/024.json"),
  25: () => require("../data/wordGlossEn/025.json"),
  26: () => require("../data/wordGlossEn/026.json"),
  27: () => require("../data/wordGlossEn/027.json"),
  28: () => require("../data/wordGlossEn/028.json"),
  29: () => require("../data/wordGlossEn/029.json"),
  30: () => require("../data/wordGlossEn/030.json"),
  31: () => require("../data/wordGlossEn/031.json"),
  32: () => require("../data/wordGlossEn/032.json"),
  33: () => require("../data/wordGlossEn/033.json"),
  34: () => require("../data/wordGlossEn/034.json"),
  35: () => require("../data/wordGlossEn/035.json"),
  36: () => require("../data/wordGlossEn/036.json"),
  37: () => require("../data/wordGlossEn/037.json"),
  38: () => require("../data/wordGlossEn/038.json"),
  39: () => require("../data/wordGlossEn/039.json"),
  40: () => require("../data/wordGlossEn/040.json"),
  41: () => require("../data/wordGlossEn/041.json"),
  42: () => require("../data/wordGlossEn/042.json"),
  43: () => require("../data/wordGlossEn/043.json"),
  44: () => require("../data/wordGlossEn/044.json"),
  45: () => require("../data/wordGlossEn/045.json"),
  46: () => require("../data/wordGlossEn/046.json"),
  47: () => require("../data/wordGlossEn/047.json"),
  48: () => require("../data/wordGlossEn/048.json"),
  49: () => require("../data/wordGlossEn/049.json"),
  50: () => require("../data/wordGlossEn/050.json"),
  51: () => require("../data/wordGlossEn/051.json"),
  52: () => require("../data/wordGlossEn/052.json"),
  53: () => require("../data/wordGlossEn/053.json"),
  54: () => require("../data/wordGlossEn/054.json"),
  55: () => require("../data/wordGlossEn/055.json"),
  56: () => require("../data/wordGlossEn/056.json"),
  57: () => require("../data/wordGlossEn/057.json"),
  58: () => require("../data/wordGlossEn/058.json"),
  59: () => require("../data/wordGlossEn/059.json"),
  60: () => require("../data/wordGlossEn/060.json"),
  61: () => require("../data/wordGlossEn/061.json"),
  62: () => require("../data/wordGlossEn/062.json"),
  63: () => require("../data/wordGlossEn/063.json"),
  64: () => require("../data/wordGlossEn/064.json"),
  65: () => require("../data/wordGlossEn/065.json"),
  66: () => require("../data/wordGlossEn/066.json"),
  67: () => require("../data/wordGlossEn/067.json"),
  68: () => require("../data/wordGlossEn/068.json"),
  69: () => require("../data/wordGlossEn/069.json"),
  70: () => require("../data/wordGlossEn/070.json"),
  71: () => require("../data/wordGlossEn/071.json"),
  72: () => require("../data/wordGlossEn/072.json"),
  73: () => require("../data/wordGlossEn/073.json"),
  74: () => require("../data/wordGlossEn/074.json"),
  75: () => require("../data/wordGlossEn/075.json"),
  76: () => require("../data/wordGlossEn/076.json"),
  77: () => require("../data/wordGlossEn/077.json"),
  78: () => require("../data/wordGlossEn/078.json"),
  79: () => require("../data/wordGlossEn/079.json"),
  80: () => require("../data/wordGlossEn/080.json"),
  81: () => require("../data/wordGlossEn/081.json"),
  82: () => require("../data/wordGlossEn/082.json"),
  83: () => require("../data/wordGlossEn/083.json"),
  84: () => require("../data/wordGlossEn/084.json"),
  85: () => require("../data/wordGlossEn/085.json"),
  86: () => require("../data/wordGlossEn/086.json"),
  87: () => require("../data/wordGlossEn/087.json"),
  88: () => require("../data/wordGlossEn/088.json"),
  89: () => require("../data/wordGlossEn/089.json"),
  90: () => require("../data/wordGlossEn/090.json"),
  91: () => require("../data/wordGlossEn/091.json"),
  92: () => require("../data/wordGlossEn/092.json"),
  93: () => require("../data/wordGlossEn/093.json"),
  94: () => require("../data/wordGlossEn/094.json"),
  95: () => require("../data/wordGlossEn/095.json"),
  96: () => require("../data/wordGlossEn/096.json"),
  97: () => require("../data/wordGlossEn/097.json"),
  98: () => require("../data/wordGlossEn/098.json"),
  99: () => require("../data/wordGlossEn/099.json"),
  100: () => require("../data/wordGlossEn/100.json"),
  101: () => require("../data/wordGlossEn/101.json"),
  102: () => require("../data/wordGlossEn/102.json"),
  103: () => require("../data/wordGlossEn/103.json"),
  104: () => require("../data/wordGlossEn/104.json"),
  105: () => require("../data/wordGlossEn/105.json"),
  106: () => require("../data/wordGlossEn/106.json"),
  107: () => require("../data/wordGlossEn/107.json"),
  108: () => require("../data/wordGlossEn/108.json"),
  109: () => require("../data/wordGlossEn/109.json"),
  110: () => require("../data/wordGlossEn/110.json"),
  111: () => require("../data/wordGlossEn/111.json"),
  112: () => require("../data/wordGlossEn/112.json"),
  113: () => require("../data/wordGlossEn/113.json"),
  114: () => require("../data/wordGlossEn/114.json"),
};

const glossCache = new Map<number, WordGloss>();

function loadGloss(surahId: number): WordGloss {
  let g = glossCache.get(surahId);
  if (g === undefined) {
    try {
      const raw = GLOSS_LOADERS[surahId]?.();
      g = raw && typeof raw === "object" ? raw : {};
    } catch {
      g = {};
    }
    glossCache.set(surahId, g);
  }
  return g;
}

let dictCache: WordMeaningsDict | undefined;

function loadDict(): WordMeaningsDict {
  if (dictCache === undefined) {
    try {
      const raw = require("../data/wordMeaningsEn.json") as WordMeaningsDict | null;
      dictCache = raw && typeof raw === "object" ? raw : {};
    } catch {
      dictCache = {};
    }
  }
  return dictCache;
}

const own = (o: Record<string, string> | undefined, k: string): string | null => {
  if (!o || !Object.prototype.hasOwnProperty.call(o, k)) return null;
  const v = o[k];
  return typeof v === "string" && v.trim().length > 0 ? v : null;
};

export function wordMeaningWith(
  gloss: WordGloss,
  dict: WordMeaningsDict,
  verseKey: string,
  wordIndex: number,
  meaningTr: string | null,
): string | null {
  const g = own(gloss, verseKey + ":" + wordIndex);
  if (g) return g;
  return meaningTr ? own(dict.meanings, meaningTr.trim()) : null;
}

export function rootMeaningWith(dict: WordMeaningsDict, root: string): string | null {
  return own(dict.roots, root);
}

export function meaningTextWith(dict: WordMeaningsDict, meaningTr: string | null): string | null {
  return meaningTr ? own(dict.meanings, meaningTr.trim().normalize("NFC")) ?? own(dict.meanings, meaningTr.trim()) : null;
}

/** Kelime için İngilizce anlam (gloss, sonra Türkçe-anlam sözlüğü); yoksa null. */
export function wordMeaningEn(verseKey: string, wordIndex: number, meaningTr: string | null): string | null {
  const surahId = parseInt(verseKey.split(":")[0] ?? "", 10);
  return wordMeaningWith(loadGloss(surahId), loadDict(), verseKey, wordIndex, meaningTr);
}

/** Kök için İngilizce anlam; yoksa null. (meaningTr şimdilik yalnız imza uyumu için.) */
export function rootMeaningEn(root: string, _meaningTr: string | null): string | null {
  return rootMeaningWith(loadDict(), root);
}

/** Yalnız Türkçe anlam metni elde olan yerler (kök türev grupları) için. */
export function meaningTextEn(meaningTr: string | null): string | null {
  return meaningTextWith(loadDict(), meaningTr);
}
