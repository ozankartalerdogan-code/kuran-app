export interface JuzInfo {
  juz: number;
  startSurah: number;
  startAyah: number;
  endSurah: number;
  endAyah: number;
  startName: string;
  endName: string;
}

// Kuran 30 cüz bölümü — standart Osmanlı mushafı
export const JUZ_DATA: JuzInfo[] = [
  { juz:  1, startSurah:  1, startAyah:  1, endSurah:  2, endAyah: 141, startName: "Fâtiha", endName: "Bakara" },
  { juz:  2, startSurah:  2, startAyah: 142, endSurah:  2, endAyah: 252, startName: "Bakara", endName: "Bakara" },
  { juz:  3, startSurah:  2, startAyah: 253, endSurah:  3, endAyah: 92,  startName: "Bakara", endName: "Âl-i İmrân" },
  { juz:  4, startSurah:  3, startAyah:  93, endSurah:  4, endAyah: 23,  startName: "Âl-i İmrân", endName: "Nisâ" },
  { juz:  5, startSurah:  4, startAyah:  24, endSurah:  4, endAyah: 147, startName: "Nisâ", endName: "Nisâ" },
  { juz:  6, startSurah:  4, startAyah: 148, endSurah:  5, endAyah: 81,  startName: "Nisâ", endName: "Mâide" },
  { juz:  7, startSurah:  5, startAyah:  82, endSurah:  6, endAyah: 110, startName: "Mâide", endName: "En'âm" },
  { juz:  8, startSurah:  6, startAyah: 111, endSurah:  7, endAyah: 87,  startName: "En'âm", endName: "A'râf" },
  { juz:  9, startSurah:  7, startAyah:  88, endSurah:  8, endAyah: 40,  startName: "A'râf", endName: "Enfâl" },
  { juz: 10, startSurah:  8, startAyah:  41, endSurah:  9, endAyah: 92,  startName: "Enfâl", endName: "Tevbe" },
  { juz: 11, startSurah:  9, startAyah:  93, endSurah: 11, endAyah:  5,  startName: "Tevbe", endName: "Hûd" },
  { juz: 12, startSurah: 11, startAyah:   6, endSurah: 12, endAyah: 52,  startName: "Hûd", endName: "Yûsuf" },
  { juz: 13, startSurah: 12, startAyah:  53, endSurah: 14, endAyah: 52,  startName: "Yûsuf", endName: "İbrâhîm" },
  { juz: 14, startSurah: 15, startAyah:   1, endSurah: 16, endAyah: 128, startName: "Hicr", endName: "Nahl" },
  { juz: 15, startSurah: 17, startAyah:   1, endSurah: 18, endAyah: 74,  startName: "İsrâ", endName: "Kehf" },
  { juz: 16, startSurah: 18, startAyah:  75, endSurah: 20, endAyah: 135, startName: "Kehf", endName: "Tâhâ" },
  { juz: 17, startSurah: 21, startAyah:   1, endSurah: 22, endAyah: 78,  startName: "Enbiyâ", endName: "Hac" },
  { juz: 18, startSurah: 23, startAyah:   1, endSurah: 25, endAyah: 20,  startName: "Mü'minûn", endName: "Furkân" },
  { juz: 19, startSurah: 25, startAyah:  21, endSurah: 27, endAyah: 55,  startName: "Furkân", endName: "Neml" },
  { juz: 20, startSurah: 27, startAyah:  56, endSurah: 29, endAyah: 45,  startName: "Neml", endName: "Ankebût" },
  { juz: 21, startSurah: 29, startAyah:  46, endSurah: 33, endAyah: 30,  startName: "Ankebût", endName: "Ahzâb" },
  { juz: 22, startSurah: 33, startAyah:  31, endSurah: 36, endAyah: 27,  startName: "Ahzâb", endName: "Yâsîn" },
  { juz: 23, startSurah: 36, startAyah:  28, endSurah: 39, endAyah: 31,  startName: "Yâsîn", endName: "Zümer" },
  { juz: 24, startSurah: 39, startAyah:  32, endSurah: 41, endAyah: 46,  startName: "Zümer", endName: "Fussilet" },
  { juz: 25, startSurah: 41, startAyah:  47, endSurah: 45, endAyah: 37,  startName: "Fussilet", endName: "Câsiye" },
  { juz: 26, startSurah: 46, startAyah:   1, endSurah: 51, endAyah: 30,  startName: "Ahkâf", endName: "Zâriyât" },
  { juz: 27, startSurah: 51, startAyah:  31, endSurah: 57, endAyah: 29,  startName: "Zâriyât", endName: "Hadîd" },
  { juz: 28, startSurah: 58, startAyah:   1, endSurah: 66, endAyah: 12,  startName: "Mücâdele", endName: "Tahrîm" },
  { juz: 29, startSurah: 67, startAyah:   1, endSurah: 77, endAyah: 50,  startName: "Mülk", endName: "Mürselât" },
  { juz: 30, startSurah: 78, startAyah:   1, endSurah: 114, endAyah: 6,  startName: "Nebe", endName: "Nâs" },
];
