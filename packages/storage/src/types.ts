/**
 * Platform-agnostic key-value storage interface.
 * Web  → localStorage adapter  (packages/storage/src/adapters/web.ts)
 * Mobile → AsyncStorage adapter (packages/storage/src/adapters/native.ts)
 */
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

// Typed helpers —kullanım: storage.getJSON<MyType>("key")
export interface TypedStorage {
  getJSON<T>(key: string): Promise<T | null>;
  setJSON<T>(key: string, value: T): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

export function createTypedStorage(adapter: StorageAdapter): TypedStorage {
  return {
    async getJSON<T>(key: string): Promise<T | null> {
      const raw = await adapter.getItem(key);
      if (raw === null) return null;
      try { return JSON.parse(raw) as T; }
      catch { return null; }
    },
    async setJSON<T>(key: string, value: T): Promise<void> {
      await adapter.setItem(key, JSON.stringify(value));
    },
    removeItem: (key) => adapter.removeItem(key),
    clear:      ()    => adapter.clear(),
    keys:       ()    => adapter.keys(),
  };
}
