import { API_BASE_URL } from "./runtimeConfig";
import { storage } from "./storage";
import type { DiyanetPrayerDeps } from "./diyanetPrayer";

async function getJson(
  path: string,
  timeoutMs: number,
): Promise<{ status: number; body: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

/** Cihazın şu anki UTC farkı (dakika) = -new Date().getTimezoneOffset(). */
export const deviceOffsetMin = (): number => -new Date().getTimezoneOffset();

/** Yerel takvim günü "YYYY-MM-DD". */
export function localYmdStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function diyanetDeps(): DiyanetPrayerDeps {
  return {
    getJson,
    readStore: (key) => storage.getJSON<unknown>(key),
    writeStore: (key, value) => storage.setJSON(key, value),
    nowMs: () => Date.now(),
  };
}
