import { useState, useEffect, useCallback } from "react";
import { storage, STORAGE_KEYS } from "../lib/storage";

type NotesMap = Record<string, string>;

export function useNotes() {
  const [notes, setNotes] = useState<NotesMap>({});

  useEffect(() => {
    storage
      .getJSON<NotesMap>(STORAGE_KEYS.notes)
      .then((data) => setNotes(data ?? {}))
      .catch(() => {});
  }, []);

  /** Belirli bir ayetin notunu getir */
  const getNote = useCallback(
    (verseKey: string): string => notes[verseKey] ?? "",
    [notes],
  );

  /** Not kaydet — boş string gönderilirse siler */
  const saveNote = useCallback(async (verseKey: string, text: string): Promise<void> => {
    const current = (await storage.getJSON<NotesMap>(STORAGE_KEYS.notes)) ?? {};
    const trimmed = text.trim();
    if (trimmed) {
      current[verseKey] = trimmed;
    } else {
      delete current[verseKey];
    }
    await storage.setJSON(STORAGE_KEYS.notes, current);
    setNotes({ ...current });
  }, []);

  /** Not sil */
  const deleteNote = useCallback(async (verseKey: string): Promise<void> => {
    await saveNote(verseKey, "");
  }, [saveNote]);

  return { notes, getNote, saveNote, deleteNote };
}
