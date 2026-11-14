import type { DiyanetCity } from "./diyanetVakit";

export function foldTr(s: string): string {
  return s
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/\s+/g, " ")
    .trim();
}

type FoldedCity = {
  city: DiyanetCity;
  name: string;
  state: string;
  country: string;
  words: string[];
  isTurkey: boolean;
};

const foldCache = new WeakMap<DiyanetCity[], FoldedCity[]>();

function foldedCities(cities: DiyanetCity[]): FoldedCity[] {
  const cached = foldCache.get(cities);
  if (cached !== undefined) return cached;

  const folded = cities.map((city) => {
    const name = foldTr(city.name);
    const country = foldTr(city.country);
    return {
      city,
      name,
      state: foldTr(city.state),
      country,
      words: name.split(/[\s-]+/).filter((word) => word.length > 0),
      isTurkey: country === "turkiye",
    };
  });

  foldCache.set(cities, folded);
  return folded;
}

function scoreOf(entry: FoldedCity, query: string): number | null {
  if (entry.name.startsWith(query)) return 0;
  if (entry.words.some((word) => word.startsWith(query))) return 1;
  if (entry.name.includes(query)) return 2;
  if (entry.state.startsWith(query) || entry.country.startsWith(query)) return 3;
  return null;
}

export function searchCities(
  cities: DiyanetCity[],
  query: string,
  limit: number = 20,
): DiyanetCity[] {
  const folded = foldTr(query);
  if (folded.length < 2) return [];

  const max = Math.min(Math.max(0, Math.trunc(limit)), 50);
  if (max === 0) return [];

  const matches: { entry: FoldedCity; score: number }[] = [];
  for (const entry of foldedCities(cities)) {
    const score = scoreOf(entry, folded);
    if (score !== null) matches.push({ entry, score });
  }

  matches.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    // Aynı puanda Türkiye önce ("ist" → İSTANBUL, Rusya'daki ISTRA'dan önce).
    if (a.entry.isTurkey !== b.entry.isTurkey) return a.entry.isTurkey ? -1 : 1;
    if (a.entry.city.name.length !== b.entry.city.name.length) {
      return a.entry.city.name.length - b.entry.city.name.length;
    }
    return (
      a.entry.city.name.localeCompare(b.entry.city.name, "tr") ||
      a.entry.city.id - b.entry.city.id
    );
  });

  return matches.slice(0, max).map((match) => match.entry.city);
}
