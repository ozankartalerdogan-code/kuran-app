"use client";

import { useEffect, useRef, useState } from "react";

interface ShareButtonProps {
  verseKey: string;
  meal: string | null;
  surahName: string | null;
  surahId: number;
  ayahNumber: number;
}

export function ShareButton({ verseKey, meal, surahName, surahId, ayahNumber }: ShareButtonProps) {
  const [open, setOpen]           = useState(false);
  const [copied, setCopied]       = useState<"text" | "link" | null>(null);
  const [pageUrl, setPageUrl]     = useState("");
  const [hasNative, setHasNative] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const ref  = `${surahName ?? `Sure ${surahId}`} ${surahId}:${ayahNumber}`;
  const text = meal ? `${meal} — ${ref} | Kuran App` : `${ref} | Kuran App`;
  const ogUrl = `/api/share/${verseKey}`;

  useEffect(() => {
    setPageUrl(window.location.href);
    setHasNative(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  const waUrl = `https://wa.me/?text=${encodeURIComponent(`${text}\n${pageUrl}`)}`;
  const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(pageUrl)}`;
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}&quote=${encodeURIComponent(text)}`;

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  async function nativeShare() {
    try {
      await navigator.share({ title: ref, text, url: pageUrl });
    } catch {
      /* kullanıcı iptal etti veya desteklenmiyor */
    }
    setOpen(false);
  }

  async function copyText() {
    await navigator.clipboard.writeText(text);
    setCopied("text");
    setTimeout(() => setCopied(null), 2000);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(pageUrl);
    setCopied("link");
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="relative" ref={wrapRef}>
      {/* Tetikleyici */}
      <button
        onClick={() => setOpen((p) => !p)}
        type="button"
        className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 shadow-sm transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        Paylaş
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl dark:border-stone-700 dark:bg-stone-900">
          <div className="border-b border-stone-100 px-4 py-2.5 dark:border-stone-800">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
              Paylaşım seçenekleri
            </p>
          </div>

          <div className="p-2">
            {/* ── Native Share (telefon) — Instagram dahil tüm uygulamalar ── */}
            {hasNative && (
              <button
                onClick={nativeShare}
                type="button"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-stone-700 transition-colors hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                </span>
                <span>
                  <span className="font-medium">Telefonda Paylaş</span>
                  <span className="ml-1.5 text-xs text-stone-400">Instagram, WhatsApp…</span>
                </span>
              </button>
            )}

            {/* ── WhatsApp ── */}
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-stone-700 transition-colors hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </span>
              <span>
                <span className="font-medium">WhatsApp</span>
                <span className="ml-2 text-xs text-stone-400">ile paylaş</span>
              </span>
            </a>

            {/* ── Facebook ── */}
            <a
              href={fbUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-stone-700 transition-colors hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </span>
              <span>
                <span className="font-medium">Facebook</span>
                <span className="ml-2 text-xs text-stone-400">ile paylaş</span>
              </span>
            </a>

            {/* ── X / Twitter ── */}
            <a
              href={twUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-stone-700 transition-colors hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-900 text-white dark:bg-stone-700">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.631L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
                </svg>
              </span>
              <span>
                <span className="font-medium">X (Twitter)</span>
                <span className="ml-2 text-xs text-stone-400">ile paylaş</span>
              </span>
            </a>

            <div className="my-1 border-t border-stone-100 dark:border-stone-800" />

            {/* ── Metni kopyala ── */}
            <button
              onClick={copyText}
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-stone-700 transition-colors hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400">
                {copied === "text" ? (
                  <svg className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                )}
              </span>
              <span className={copied === "text" ? "font-medium text-emerald-600 dark:text-emerald-400" : ""}>
                {copied === "text" ? "Kopyalandı!" : "Ayet metnini kopyala"}
              </span>
            </button>

            {/* ── Linki kopyala ── */}
            <button
              onClick={copyLink}
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-stone-700 transition-colors hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400">
                {copied === "link" ? (
                  <svg className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                )}
              </span>
              <span className={copied === "link" ? "font-medium text-emerald-600 dark:text-emerald-400" : ""}>
                {copied === "link" ? "Kopyalandı!" : "Sayfanın linkini kopyala"}
              </span>
            </button>
          </div>

          {/* OG görsel linki */}
          <div className="border-t border-stone-100 px-4 py-2.5 dark:border-stone-800">
            <a
              href={ogUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Paylaşım görselini görüntüle
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
