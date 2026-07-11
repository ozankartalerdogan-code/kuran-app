"use client";

interface PaginationProps {
  currentPage: number;
  totalPages:  number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  // Gösterilecek sayfa numaraları: mevcut ± 2, her zaman ilk ve son
  function pageNumbers(): (number | "…")[] {
    const delta = 2;
    const range: number[] = [];

    for (
      let i = Math.max(1, currentPage - delta);
      i <= Math.min(totalPages, currentPage + delta);
      i++
    ) range.push(i);

    const withEnds: (number | "…")[] = [];
    if (range[0] > 1) {
      withEnds.push(1);
      if (range[0] > 2) withEnds.push("…");
    }
    withEnds.push(...range);
    if (range[range.length - 1] < totalPages) {
      if (range[range.length - 1] < totalPages - 1) withEnds.push("…");
      withEnds.push(totalPages);
    }
    return withEnds;
  }

  const btnBase  = "flex h-9 min-w-[2.25rem] items-center justify-center rounded-md border px-2.5 text-sm font-medium transition-colors";
  const btnActive = `${btnBase} border-navy-500 bg-navy-600 text-white`;
  const btnNormal = `${btnBase} border-stone-300 bg-white text-stone-700 hover:bg-stone-50`;
  const btnDisabled = `${btnBase} border-stone-200 bg-stone-100 text-stone-400 cursor-not-allowed`;

  return (
    <nav aria-label="Sayfalama" className="flex flex-wrap items-center justify-center gap-1.5">
      {/* İlk */}
      <button
        className={currentPage === 1 ? btnDisabled : btnNormal}
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        aria-label="İlk sayfa"
      >
        «
      </button>

      {/* Önceki */}
      <button
        className={currentPage === 1 ? btnDisabled : btnNormal}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Önceki sayfa"
      >
        ‹
      </button>

      {/* Numara listesi */}
      {pageNumbers().map((p, i) =>
        p === "…" ? (
          <span key={`dots-${i}`} className="px-1 text-stone-400 select-none">…</span>
        ) : (
          <button
            key={p}
            className={p === currentPage ? btnActive : btnNormal}
            onClick={() => onPageChange(p)}
            aria-current={p === currentPage ? "page" : undefined}
          >
            {p}
          </button>
        )
      )}

      {/* Sonraki */}
      <button
        className={currentPage === totalPages ? btnDisabled : btnNormal}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Sonraki sayfa"
      >
        ›
      </button>

      {/* Son */}
      <button
        className={currentPage === totalPages ? btnDisabled : btnNormal}
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        aria-label="Son sayfa"
      >
        »
      </button>
    </nav>
  );
}
