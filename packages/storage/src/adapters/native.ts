import type { StorageAdapter } from "../types";

/**
 * React Native AsyncStorage adapter.
 *
 * Kullanım (mobil app'te):
 *   import AsyncStorage from "@react-native-async-storage/async-storage";
 *   import { createNativeAdapter } from "@quran-app/storage/native";
 *
 *   const storage = createNativeAdapter(AsyncStorage);
 *
 * AsyncStorage inject pattern: web bundle'ına RN bağımlılığı çekmemek için
 * adapter factory olarak tanımlandı.
 */

type AsyncStorageStatic = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
};

export function createNativeAdapter(
  AsyncStorage: AsyncStorageStatic,
): StorageAdapter {
  return {
    getItem:    (key)        => AsyncStorage.getItem(key),
    setItem:    (key, value) => AsyncStorage.setItem(key, value),
    removeItem: (key)        => AsyncStorage.removeItem(key),
    clear:      ()           => AsyncStorage.clear(),
    keys: async ()           => {
      const result = await AsyncStorage.getAllKeys();
      return Array.from(result);
    },
  };
}
