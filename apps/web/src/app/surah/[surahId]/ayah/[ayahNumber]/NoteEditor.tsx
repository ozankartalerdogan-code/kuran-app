"use client";

import { useEffect, useRef, useState } from "react";
import { getNotes, setNotes } from "../../../../../lib/storageUtils";

export function NoteEditor({ verseKey }: { verseKey: string }) {
  const [text, setText]     = useState("");
  const [saved, setSaved]   = useState("");
  const [status, setStatus] = useState<"idle" | "saved" | "deleted">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const existing = getNotes()[verseKey] ?? "";
    setText(existing);
    setSaved(existing);
  }, [verseKey]);

  function flash(s: "saved" | "deleted") {
    setStatus(s);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setStatus("idle"), 2000);
  }

  function save() {
    const notes   = getNotes();
    const trimmed = text.trim();
    if (trimmed) {
      notes[verseKey] = trimmed;
    } else {
      delete notes[verseKey];
    }
    setNotes(notes);
    setText(trimmed);
    setSaved(trimmed);
    flash(trimmed ? "saved" : "deleted");
  }

  function deleteNote() {
    const notes = getNotes();
    delete notes[verseKey];
    setNotes(notes);
    setText("");
    setSaved("");
    flash("deleted");
  }

  const dirty = text !== saved;

  return (
    <section className="rounded-xl border border-gold-200 bg-gold-50 p-5 shadow-sm dark:border-gold-800/40 dark:bg-gold-950/20">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gold-800 dark:text-gold-300">
          Kişisel Not
        </h2>
        {saved && (
          <button
            onClick={deleteNote}
            type="button"
            className="text-xs text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
          >
            Notu sil
          </button>
        )}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Bu ayet hakkında notunuzu buraya yazın…"
        rows={4}
        className="w-full resize-y rounded-lg border border-gold-200 bg-white px-3 py-2.5 text-sm leading-relaxed text-stone-800 placeholder-stone-400 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-200 dark:border-gold-800/40 dark:bg-stone-900 dark:text-stone-200 dark:placeholder-stone-600 dark:focus:border-gold-600 dark:focus:ring-gold-800/40"
      />

      <div className="mt-2 flex items-center justify-between gap-2">
        <span
          className={`text-xs transition-opacity duration-300 ${
            status !== "idle" ? "opacity-100" : "opacity-0"
          } ${
            status === "deleted"
              ? "text-rose-500 dark:text-rose-400"
              : "text-navy-600 dark:text-navy-400"
          }`}
        >
          {status === "saved" ? "✓ Kaydedildi" : "✗ Not silindi"}
        </span>
        <button
          onClick={save}
          disabled={!dirty}
          type="button"
          className="rounded-lg bg-gold-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gold-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-gold-700 dark:hover:bg-gold-600"
        >
          Kaydet
        </button>
      </div>
    </section>
  );
}
