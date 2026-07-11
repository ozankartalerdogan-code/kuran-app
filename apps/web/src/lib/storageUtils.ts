// Client-side localStorage utilities — all reads wrapped in try/catch for SSR safety.
// Import and use only inside useEffect or client components.

export function getFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem("favorites") ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function setFavorites(keys: string[]): void {
  localStorage.setItem("favorites", JSON.stringify(keys));
}

export function getNotes(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem("notes") ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

export function setNotes(notes: Record<string, string>): void {
  localStorage.setItem("notes", JSON.stringify(notes));
}

export function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem("recentSearches") ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function setRecentSearches(searches: string[]): void {
  try {
    localStorage.setItem("recentSearches", JSON.stringify(searches));
  } catch {
    // localStorage can be unavailable in private browsing or restricted contexts.
  }
}
