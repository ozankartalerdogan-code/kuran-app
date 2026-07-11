// Hatim takibi — localStorage tabanlı, /hatim sayfası ve mushaf sayfa görünümü
// (Hatim paneli) TEK bu modülü kullanır ki iki taraf sessizce ayrışmasın.

export interface Hatim {
  id: string;
  startDate: string;
  completedDate: string | null;
  readJuz: number[];
}

export interface HatimStore {
  hatims: Hatim[];
  currentId: string | null;
}

const STORAGE_KEY = "hatimTakibi";

export function loadHatimStore(): HatimStore {
  if (typeof window === "undefined") return { hatims: [], currentId: null };
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") ?? { hatims: [], currentId: null };
  } catch { return { hatims: [], currentId: null }; }
}

export function saveHatimStore(data: HatimStore): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* localStorage kullanılamıyor */ }
}

export function newHatim(): Hatim {
  return { id: Date.now().toString(), startDate: new Date().toISOString(), completedDate: null, readJuz: [] };
}

export function getCurrentHatim(store: HatimStore): Hatim | null {
  return store.hatims.find((h) => h.id === store.currentId) ?? null;
}

export function toggleHatimJuz(store: HatimStore, juzNo: number): HatimStore {
  const hatims = store.hatims.map((h) => {
    if (h.id !== store.currentId) return h;
    const already = h.readJuz.includes(juzNo);
    const readJuz = already ? h.readJuz.filter((j) => j !== juzNo) : [...h.readJuz, juzNo];
    const completedDate = readJuz.length === 30 ? (h.completedDate ?? new Date().toISOString()) : null;
    return { ...h, readJuz, completedDate };
  });
  return { ...store, hatims };
}
