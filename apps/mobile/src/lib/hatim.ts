/**
 * hatim.ts — hatim takibi veri modeli + cüz tablosu (SAF).
 *
 * Eski app/hatim.tsx ekranından çıkarıldı; artık mushaf sayfa görünümüne gömülü
 * HatimPanel bu modülü kullanır. Depo anahtarı ve veri şekli DEĞİŞMEDİ —
 * mevcut kullanıcıların hatim ilerlemesi aynen okunur.
 */

export interface JuzInfo {
  juz: number;
  startSurah: number; startAyah: number; startName: string;
  endSurah:   number; endAyah:   number; endName:   string;
}

export const JUZ_DATA: JuzInfo[] = [
  { juz:  1, startSurah:   1, startAyah:   1, startName: "Fâtiha",    endSurah:   2, endAyah: 141, endName: "Bakara"     },
  { juz:  2, startSurah:   2, startAyah: 142, startName: "Bakara",    endSurah:   2, endAyah: 252, endName: "Bakara"     },
  { juz:  3, startSurah:   2, startAyah: 253, startName: "Bakara",    endSurah:   3, endAyah:  92, endName: "Âl-i İmrân"},
  { juz:  4, startSurah:   3, startAyah:  93, startName: "Âl-i İmrân",endSurah:  4, endAyah:  23, endName: "Nisâ"       },
  { juz:  5, startSurah:   4, startAyah:  24, startName: "Nisâ",      endSurah:   4, endAyah: 147, endName: "Nisâ"       },
  { juz:  6, startSurah:   4, startAyah: 148, startName: "Nisâ",      endSurah:   5, endAyah:  81, endName: "Mâide"      },
  { juz:  7, startSurah:   5, startAyah:  82, startName: "Mâide",     endSurah:   6, endAyah: 110, endName: "En'âm"      },
  { juz:  8, startSurah:   6, startAyah: 111, startName: "En'âm",     endSurah:   7, endAyah:  87, endName: "A'râf"      },
  { juz:  9, startSurah:   7, startAyah:  88, startName: "A'râf",     endSurah:   8, endAyah:  40, endName: "Enfâl"      },
  { juz: 10, startSurah:   8, startAyah:  41, startName: "Enfâl",     endSurah:   9, endAyah:  92, endName: "Tevbe"      },
  { juz: 11, startSurah:   9, startAyah:  93, startName: "Tevbe",     endSurah:  11, endAyah:   5, endName: "Hûd"        },
  { juz: 12, startSurah:  11, startAyah:   6, startName: "Hûd",       endSurah:  12, endAyah:  52, endName: "Yûsuf"      },
  { juz: 13, startSurah:  12, startAyah:  53, startName: "Yûsuf",     endSurah:  14, endAyah:  52, endName: "İbrâhîm"    },
  { juz: 14, startSurah:  15, startAyah:   1, startName: "Hicr",      endSurah:  16, endAyah: 128, endName: "Nahl"       },
  { juz: 15, startSurah:  17, startAyah:   1, startName: "İsrâ",      endSurah:  18, endAyah:  74, endName: "Kehf"       },
  { juz: 16, startSurah:  18, startAyah:  75, startName: "Kehf",      endSurah:  20, endAyah: 135, endName: "Tâhâ"       },
  { juz: 17, startSurah:  21, startAyah:   1, startName: "Enbiyâ",    endSurah:  22, endAyah:  78, endName: "Hac"        },
  { juz: 18, startSurah:  23, startAyah:   1, startName: "Mü'minûn",  endSurah:  25, endAyah:  20, endName: "Furkân"     },
  { juz: 19, startSurah:  25, startAyah:  21, startName: "Furkân",    endSurah:  27, endAyah:  55, endName: "Neml"       },
  { juz: 20, startSurah:  27, startAyah:  56, startName: "Neml",      endSurah:  29, endAyah:  45, endName: "Ankebût"    },
  { juz: 21, startSurah:  29, startAyah:  46, startName: "Ankebût",   endSurah:  33, endAyah:  30, endName: "Ahzâb"      },
  { juz: 22, startSurah:  33, startAyah:  31, startName: "Ahzâb",     endSurah:  36, endAyah:  27, endName: "Yâsîn"      },
  { juz: 23, startSurah:  36, startAyah:  28, startName: "Yâsîn",     endSurah:  39, endAyah:  31, endName: "Zümer"      },
  { juz: 24, startSurah:  39, startAyah:  32, startName: "Zümer",     endSurah:  41, endAyah:  46, endName: "Fussilet"   },
  { juz: 25, startSurah:  41, startAyah:  47, startName: "Fussilet",  endSurah:  45, endAyah:  37, endName: "Câsiye"     },
  { juz: 26, startSurah:  46, startAyah:   1, startName: "Ahkâf",     endSurah:  51, endAyah:  30, endName: "Zâriyât"    },
  { juz: 27, startSurah:  51, startAyah:  31, startName: "Zâriyât",   endSurah:  57, endAyah:  29, endName: "Hadîd"      },
  { juz: 28, startSurah:  58, startAyah:   1, startName: "Mücâdele",  endSurah:  66, endAyah:  12, endName: "Tahrîm"     },
  { juz: 29, startSurah:  67, startAyah:   1, startName: "Mülk",      endSurah:  77, endAyah:  50, endName: "Mürselât"   },
  { juz: 30, startSurah:  78, startAyah:   1, startName: "Nebe",      endSurah: 114, endAyah:   6, endName: "Nâs"        },
];

export interface Hatim { id: string; startDate: string; completedDate: string | null; readJuz: number[] }
export interface HatimStore { hatims: Hatim[]; currentId: string | null }

export const EMPTY_HATIM_STORE: HatimStore = { hatims: [], currentId: null };

export function parseHatimStore(raw: string | null): HatimStore {
  if (!raw) return EMPTY_HATIM_STORE;
  try {
    const parsed = JSON.parse(raw) as Partial<HatimStore>;
    if (!Array.isArray(parsed.hatims)) return EMPTY_HATIM_STORE;

    const hatims = parsed.hatims.filter((h): h is Hatim =>
      typeof h?.id === "string" &&
      typeof h.startDate === "string" &&
      (h.completedDate === null || typeof h.completedDate === "string") &&
      Array.isArray(h.readJuz)
    );
    const currentId = typeof parsed.currentId === "string" ? parsed.currentId : null;
    return { hatims, currentId };
  } catch {
    return EMPTY_HATIM_STORE;
  }
}

export function hatimFmt(iso: string): string {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

export function hatimGunSayisi(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}
