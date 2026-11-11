import { useState, useEffect, useCallback, useRef } from "react";
import { storage, STORAGE_KEYS, StorageQuotaError } from "../lib/storage";
import { getStrings } from "../i18n";
import storageErrorStrings from "../i18n/strings/storageErrors";

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
  const notesRef = useRef<NotesMap>({});
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await storage.getJSON<NotesMap>(STORAGE_KEYS.notes, {});
      const nextNotes = isValidNotesMap(data) ? data : {};
      notesRef.current = nextNotes;
      setNotes(nextNotes);
      setLoaded(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : getStrings(storageErrorStrings).notesLoad;
      setError(msg);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const queuePersist = useCallback((next: NotesMap) => {
    const queuedWrite = writeQueueRef.current
      .catch(() => {})
      .then(() => storage.setJSON(STORAGE_KEYS.notes, next));
    writeQueueRef.current = queuedWrite;
    return queuedWrite;
  }, []);

  /** Belirli bir ayetin notunu getir */
  const getNote = useCallback(
    (verseKey: string): string => notes[verseKey] ?? "",
    [notes],
  );

  /** Not kaydet — boş string gönderilirse siler. Başarılı ise true döner. */
  const saveNote = useCallback(async (verseKey: string, text: string): Promise<boolean> => {
    setError(null);
    const current = notesRef.current;
    const next = { ...current };
    const trimmed = text.trim();

    if (trimmed) {
      next[verseKey] = trimmed;
    } else {
      delete next[verseKey];
    }

    notesRef.current = next;
    setNotes(next);

    try {
      await queuePersist(next);
      return true;
    } catch (err) {
      await writeQueueRef.current.catch(() => {});
      await load();
      if (err instanceof StorageQuotaError) {
        setError(getStrings(storageErrorStrings).notesQuota);
      } else {
        const msg = err instanceof Error ? err.message : getStrings(storageErrorStrings).noteSave;
        setError(msg);
      }
      return false;
    }
  }, [load, queuePersist]);

  /** Not sil — başarılı ise true döner */
  const deleteNote = useCallback(async (verseKey: string): Promise<boolean> => {
    return saveNote(verseKey, "");
  }, [saveNote]);

  /** Tüm notları tek seferde sil */
  const clearAll = useCallback(async (): Promise<boolean> => {
    setError(null);
    notesRef.current = {};
    setNotes({});
    try {
      await queuePersist({});
      return true;
    } catch (err) {
      await writeQueueRef.current.catch(() => {});
      await load();
      setError(err instanceof Error ? err.message : "Notlar silinemedi");
      return false;
    }
  }, [load, queuePersist]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  return { notes, getNote, saveNote, deleteNote, clearAll, loading, loaded, error, refresh };
}
