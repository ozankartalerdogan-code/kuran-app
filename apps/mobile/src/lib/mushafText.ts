const ARAP_RAKAM = "\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669";

export function arapRakam(n: number): string {
  return String(n).split("").map((digit) => ARAP_RAKAM[Number(digit)] ?? digit).join("");
}

const VAKIF_ONCESI_BOSLUK = /\u0020(?=[\u06D6-\u06DC])/g;
const TANZIL_KFGQPC_UYUM = /[\u06DF\u06E3\u06EB]/g;
const UYUM_TABLOSU: Record<string, string> = {
  "\u06DF": "\u0652",
  "\u06E3": "\u06DC",
  "\u06EB": "\u06EC",
};

export function mushafMetniHazirla(text: string): string {
  return text
    .replace(TANZIL_KFGQPC_UYUM, (character) => UYUM_TABLOSU[character] ?? character)
    .replace(VAKIF_ONCESI_BOSLUK, "\u00A0");
}
