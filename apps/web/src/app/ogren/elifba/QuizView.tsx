"use client";

import { useState, useEffect } from "react";

type QuizSoru = {
  quiz_id: number;
  lesson_id: number;
  soru: string;
  secenekler: string[];
  dogru_cevap: string;
  ipucu: string | null;
  zorluk: number;
};

function isArabic(text: string): boolean {
  return /[؀-ۿ]/.test(text);
}

function ScoreScreen({
  score,
  total,
  onBack,
}: {
  score: number;
  total: number;
  onBack: () => void;
}) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const rating =
    pct === 100
      ? { emoji: "🌟", label: "Mükemmel!" }
      : pct >= 80
        ? { emoji: "🎉", label: "Harika!" }
        : pct >= 60
          ? { emoji: "👍", label: "İyi!" }
          : pct >= 40
            ? { emoji: "💪", label: "Devam et!" }
            : { emoji: "📚", label: "Tekrar çalış!" };

  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center">
      <span className="text-7xl leading-none">{rating.emoji}</span>
      <div>
        <p className="text-2xl font-bold text-stone-900 dark:text-stone-50">
          {rating.label}
        </p>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          {total} sorudan {score} doğru &mdash; %{pct}
        </p>
      </div>
      <div className="h-3 w-full max-w-xs overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <button
        onClick={onBack}
        className="rounded-xl border border-stone-200 bg-white px-6 py-2.5 text-sm font-semibold text-stone-700 transition-all hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
      >
        ← Derslere Dön
      </button>
    </div>
  );
}

export function QuizView({
  dersId,
  dersBaslik,
  onBack,
  onComplete,
}: {
  dersId: number;
  dersBaslik: string;
  onBack: () => void;
  onComplete?: (score: number, total: number) => void;
}) {
  const [sorular, setSorular]       = useState<QuizSoru[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected]     = useState<string | null>(null);
  const [answered, setAnswered]     = useState(false);
  const [score, setScore]           = useState(0);
  const [finished, setFinished]     = useState(false);
  const [notified, setNotified]     = useState(false);

  useEffect(() => {
    fetch(`/api/elifba/quiz/${dersId}`)
      .then((r) => r.json())
      .then((data: QuizSoru[]) => {
        if (!Array.isArray(data) || data.length === 0) {
          setError("Bu ders için soru bulunamadı.");
        } else {
          // 45'lik havuzdan her oturumda rastgele 15 soru
          const picked = [...data].sort(() => Math.random() - 0.5).slice(0, 15);
          setSorular(picked);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Sorular yüklenirken hata oluştu.");
        setLoading(false);
      });
  }, [dersId]);

  const soru = sorular[currentIdx];

  async function handleSelect(secenek: string) {
    if (answered) return;
    setSelected(secenek);
    setAnswered(true);

    if (secenek === soru?.dogru_cevap) {
      setScore((s) => s + 1);
      try {
        const confetti = (await import("canvas-confetti")).default;
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
          colors: ["#10b981", "#34d399", "#6ee7b7", "#fbbf24", "#f59e0b"],
        });
      } catch {
        // confetti optional
      }
    }
  }

  useEffect(() => {
    if (finished && !notified && sorular.length > 0) {
      setNotified(true);
      onComplete?.(score, sorular.length);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  function handleNext() {
    if (currentIdx + 1 >= sorular.length) {
      setFinished(true);
    } else {
      setCurrentIdx((i) => i + 1);
      setSelected(null);
      setAnswered(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-stone-400 dark:text-stone-500">
        Sorular yükleniyor…
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-10 text-center text-sm text-red-500">
        {error}
        <br />
        <button
          onClick={onBack}
          className="mt-4 rounded-lg border border-stone-200 bg-white px-4 py-2 text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400"
        >
          ← Geri
        </button>
      </div>
    );
  }

  if (finished) {
    return (
      <ScoreScreen score={score} total={sorular.length} onBack={onBack} />
    );
  }

  if (!soru) return null;

  const isCorrect = selected === soru.dogru_cevap;

  return (
    <div>
      {/* Başlık + geri */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-stone-800"
        >
          ← Dersler
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-bold text-stone-800 dark:text-stone-100">
            {dersBaslik} — Test
          </h2>
        </div>
      </div>

      {/* İlerleme */}
      <div className="mb-5">
        <div className="mb-1 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
          <span>
            Soru {currentIdx + 1} / {sorular.length}
          </span>
          <span className="text-emerald-600 dark:text-emerald-400">
            {score} doğru
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all"
            style={{
              width: `${Math.round((currentIdx / sorular.length) * 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Soru */}
      <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-900">
        <p
          className={`whitespace-pre-line text-base font-medium leading-relaxed text-stone-800 dark:text-stone-100 ${
            isArabic(soru.soru) ? "text-right text-2xl" : ""
          }`}
          dir={isArabic(soru.soru) ? "rtl" : "ltr"}
          lang={isArabic(soru.soru) ? "ar" : undefined}
        >
          {soru.soru}
        </p>
      </div>

      {/* Seçenekler */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        {soru.secenekler.map((sec) => {
          const isSelected = selected === sec;
          const isRight    = sec === soru.dogru_cevap;
          let cls =
            "rounded-xl border px-4 py-3 text-sm font-medium transition-all text-left ";

          if (!answered) {
            cls +=
              "border-stone-200 bg-white text-stone-700 hover:border-emerald-400 hover:bg-emerald-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/20";
          } else if (isRight) {
            cls +=
              "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300";
          } else if (isSelected && !isRight) {
            cls +=
              "border-red-400 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-900/30 dark:text-red-300";
          } else {
            cls +=
              "border-stone-200 bg-white text-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-600";
          }

          return (
            <button
              key={sec}
              onClick={() => handleSelect(sec)}
              disabled={answered}
              className={cls}
              dir={isArabic(sec) ? "rtl" : "ltr"}
              lang={isArabic(sec) ? "ar" : undefined}
            >
              {isSelected && answered && (isCorrect ? "✓ " : "✗ ")}
              {isRight && answered && !isSelected ? "✓ " : ""}
              {sec}
            </button>
          );
        })}
      </div>

      {/* İpucu (yanlış cevapta) */}
      {answered && !isCorrect && soru.ipucu && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-300">
          <span className="mr-1.5 font-semibold">💡 İpucu:</span>
          {soru.ipucu}
        </div>
      )}

      {/* Sonraki / Sonucu Gör */}
      {answered && (
        <button
          onClick={handleNext}
          className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition-all hover:bg-indigo-700"
        >
          {currentIdx + 1 >= sorular.length ? "Sonucu Gör →" : "Sonraki →"}
        </button>
      )}
    </div>
  );
}
