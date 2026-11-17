export type ListeningLetter = {
  harf_id: number;
  tek_basina: string;
  harf_adi: string;
};

export type ListeningOption = { id: number; label: string };

export type ListeningItem = {
  itemId: string;
  audioHarfId: number;
  options: ListeningOption[];
  correctId: number;
  fallbackLabel: string;
};

export const LISTENING_MAX_ITEMS = 15;

function shuffleCopy<T>(items: readonly T[], rng: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

export function buildListeningItems(
  letters: readonly ListeningLetter[],
  rng: () => number,
): ListeningItem[] {
  const seenIds = new Set<number>();
  const seenGlyphs = new Set<string>();
  const unique: ListeningLetter[] = [];
  for (const letter of letters) {
    if (!letter || !Number.isInteger(letter.harf_id)) continue;
    const glyph = typeof letter.tek_basina === "string" ? letter.tek_basina.trim() : "";
    if (glyph === "" || seenIds.has(letter.harf_id) || seenGlyphs.has(glyph)) continue;
    seenIds.add(letter.harf_id);
    seenGlyphs.add(glyph);
    unique.push({
      harf_id: letter.harf_id,
      tek_basina: letter.tek_basina,
      harf_adi: letter.harf_adi,
    });
  }

  const items: ListeningItem[] = [];
  for (const target of shuffleCopy(unique, rng)) {
    if (items.length >= LISTENING_MAX_ITEMS) break;

    const picked: ListeningLetter[] = [];
    const usedGlyphs = new Set<string>([target.tek_basina]);
    for (const candidate of shuffleCopy(unique, rng)) {
      if (picked.length >= 3) break;
      if (candidate.harf_id === target.harf_id) continue;
      if (usedGlyphs.has(candidate.tek_basina)) continue;
      usedGlyphs.add(candidate.tek_basina);
      picked.push(candidate);
    }
    if (picked.length < 3) continue;

    const options = shuffleCopy([target, ...picked], rng).map((letter) => ({
      id: letter.harf_id,
      label: letter.tek_basina,
    }));

    items.push({
      itemId: `listen:harf:${target.harf_id}`,
      audioHarfId: target.harf_id,
      options,
      correctId: target.harf_id,
      fallbackLabel: target.harf_adi,
    });
  }

  return items;
}
