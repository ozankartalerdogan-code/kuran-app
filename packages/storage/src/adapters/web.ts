import type { StorageAdapter } from "../types";

/**
 * localStorage adapter — web/Next.js için.
 * SSR sırasında localStorage yoktur; tüm işlemler sessizce no-op yapar.
 */
export const webStorageAdapter: StorageAdapter = {
  async getItem(key) {
    if (typeof window === "undefined") return null;
    try { return localStorage.getItem(key); }
    catch { return null; }
  },

  async setItem(key, value) {
    if (typeof window === "undefined") return;
    try { localStorage.setItem(key, value); }
    catch { /* SSR veya private mode'da localStorage erişilemez */ }
  },

  async removeItem(key) {
    if (typeof window === "undefined") return;
    try { localStorage.removeItem(key); }
    catch { /* SSR veya private mode'da localStorage erişilemez */ }
  },

  async clear() {
    if (typeof window === "undefined") return;
    try { localStorage.clear(); }
    catch { /* SSR veya private mode'da localStorage erişilemez */ }
  },

  async keys() {
    if (typeof window === "undefined") return [];
    try { return Object.keys(localStorage); }
    catch { return []; }
  },
};
