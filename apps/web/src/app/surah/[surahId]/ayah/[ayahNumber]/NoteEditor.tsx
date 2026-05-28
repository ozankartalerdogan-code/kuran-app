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
    <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm dark:border-amber-800/40 dark:bg-amber-950/20">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          📝 Kişisel Not
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
        className="w-full resize-y rounded-lg border border-amber-200 bg-white px-3 py-2.5 text-sm leading-relaxed text-stone-800 placeholder-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-amber-800/40 dark:bg-stone-900 dark:text-stone-200 dark:placeholder-stone-600 dark:focus:border-amber-600 dark:focus:ring-amber-800/40"
      />

      <div className="mt-2 flex items-center justify-between gap-2">
        <span
          className={`text-xs transition-opacity duration-300 ${
            status !== "idle" ? "opacity-100" : "opacity-0"
          } ${
            status === "deleted"
              ? "text-rose-500 dark:text-rose-400"
              : "text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {status === "saved" ? "✓ Kaydedildi" : "✗ Not silindi"}
        </span>
        <button
          onClick={save}
          disabled={!dirty}
          type="button"
          className="rounded-lg bg-amber-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-amber-700 dark:hover:bg-amber-600"
        >
          Kaydet
        </button>
      </div>
    </section>
  );
}
