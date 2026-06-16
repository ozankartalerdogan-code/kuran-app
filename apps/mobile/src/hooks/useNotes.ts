import { useState, useEffect, useCallback } from "react";
import { storage, STORAGE_KEYS, StorageQuotaError } from "../lib/storage";

type NotesMap = Record<string, string>;

export interface UseNotesResult {
  notes: NotesMap;
  getNote: (verseKey: string) => string;
  saveNote: (verseKey: string, text: string) => Promise<boolean>;
  deleteNote: (verseKey: string) => Promise<boolean>;
  clearAll: () => Promise<boolean>;
  loading: boolean;
  loaded: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/** undefined/null güvenli NotesMap validator */
function isValidNotesMap(data: unknown): data is NotesMap {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  return Object.entries(data as Record<string, unknown>).every(
    ([, v]) => typeof v === "string",
  );
}

export function useNotes(): UseNotesResult {
  const [notes, setNotes] = useState<NotesMap>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await storage.getJSON<NotesMap>(STORAGE_KEYS.notes, {});
      setNotes(isValidNotesMap(data) ? data : {});
      setLoaded(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Notlar yüklenemedi";
      setError(msg);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Belirli bir ayetin notunu getir */
  const getNote = useCallback(
    (verseKey: string): string => notes[verseKey] ?? "",
    [notes],
  );

  /** Not kaydet — boş string gönderilirse siler. Başarılı ise true döner. */
  const saveNote = useCallback(async (verseKey: string, text: string): Promise<boolean> => {
    setError(null);
    try {
      const current = await storage.getJSON<NotesMap>(STORAGE_KEYS.notes, {});
      const safe = isValidNotesMap(current) ? { ...current } : {};
      const trimmed = text.trim();
      if (trimmed) {
        safe[verseKey] = trimmed;
      } else {
        delete safe[verseKey];
      }
      await storage.setJSON(STORAGE_KEYS.notes, safe);
      setNotes(safe);
      return true;
    } catch (err) {
      if (err instanceof StorageQuotaError) {
        setError("Depolama alanı dolu, not kaydedilemedi.");
      } else {
        const msg = err instanceof Error ? err.message : "Not kaydedilemedi";
        setError(msg);
      }
      return false;
    }
  }, []);

  /** Not sil — başarılı ise true döner */
  const deleteNote = useCallback(async (verseKey: string): Promise<boolean> => {
    return saveNote(verseKey, "");
  }, [saveNote]);

  /** Tüm notları tek seferde sil (forEach yarış koşulu olmadan) */
  const clearAll = useCallback(async (): Promise<boolean> => {
    setError(null);
    try {
      await storage.setJSON(STORAGE_KEYS.notes, {});
      setNotes({});
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Notlar silinemedi");
      return false;
    }
  }, []);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  return { notes, getNote, saveNote, deleteNote, clearAll, loading, loaded, error, refresh };
}
