"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Star, Play, Lock, Trophy, BookOpen, Brain } from "lucide-react";
import { QuizView } from "./QuizView";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Harf = {
  harf_id: number;
  harf_adi: string;
  harf_sesi: string;
  tek_basina: string;
  basta: string;
  ortada: string;
  sonda: string;
  mahrec: string;
  kalin_ince: string;
  grup: string;
};

export type DersWithHarfler = {
  id: number;
  baslik: string;
  konu_sirasi: number;
  seviye: string;
  harfler: Harf[];
};

type QuizScore    = { score: number; total: number };
type LessonStatus = "completed" | "active" | "locked";

// ─── Constants & Storage ─────────────────────────────────────────────────────

const PROGRESS_KEY    = "elifbaProgress";
const QUIZ_SCORES_KEY = "elifbaQuizScores";
const QUIZ_LESSON_IDS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
const QUIZ_PASS       = 10;  // 15 sorudan

function loadProgress(): Record<string, number[]> {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "{}"); }
  catch { return {}; }
}
function saveProgress(p: Record<string, number[]>): void {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
}
function loadQuizScores(): Record<string, QuizScore> {
  try { return JSON.parse(localStorage.getItem(QUIZ_SCORES_KEY) ?? "{}"); }
  catch { return {}; }
}
function saveQuizScores(q: Record<string, QuizScore>): void {
  localStorage.setItem(QUIZ_SCORES_KEY, JSON.stringify(q));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function shortBaslik(b: string) {
  return b.replace(/^\d+\.\s*KONU:\s*/i, "");
}

const SEVIYE_CFG = {
  "başlangıç": {
    label: "Başlangıç",
    cls: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  },
  temel: {
    label: "Temel",
    cls: "bg-gold-100 text-gold-700 dark:bg-gold-900/40 dark:text-gold-300",
  },
  orta: {
    label: "Orta",
    cls: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  },
} as const;

function seviyeCfg(s: string) {
  return SEVIYE_CFG[s as keyof typeof SEVIYE_CFG] ?? SEVIYE_CFG.temel;
}

function checkCompleted(
  ders: DersWithHarfler,
  progress: Record<string, number[]>,
  quizScores: Record<string, QuizScore>,
): boolean {
  const seen     = progress[String(ders.id)] ?? [];
  const flashDone = ders.harfler.length > 0 && seen.length >= ders.harfler.length;
  if (QUIZ_LESSON_IDS.has(ders.id)) {
    const qs = quizScores[String(ders.id)];
    return flashDone && !!qs && qs.score >= QUIZ_PASS;
  }
  return flashDone;
}

function getStatus(
  ders: DersWithHarfler,
  idx: number,
  all: DersWithHarfler[],
  progress: Record<string, number[]>,
  quizScores: Record<string, QuizScore>,
): LessonStatus {
  if (checkCompleted(ders, progress, quizScores)) return "completed";
  if (idx === 0) return "active";
  if (checkCompleted(all[idx - 1], progress, quizScores)) return "active";
  return "locked";
}

// ─── Flashcard ────────────────────────────────────────────────────────────────

function useHarfAudio(harfId: number) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  function play(e: React.MouseEvent) {
    if (!audioRef.current) {
      audioRef.current = new Audio(
        `/audio/elifba/harf_${String(harfId).padStart(2, "0")}.mp3`,
      );
      audioRef.current.onended  = () => setPlaying(false);
      audioRef.current.onerror  = () => setPlaying(false);
    }
    if (playing) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
    } else {
      setPlaying(true);
      audioRef.current.play().catch(() => setPlaying(false));
    }
  }

  // Harf değişince önceki sesi durdur
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
      setPlaying(false);
    };
  }, [harfId]);

  return { playing, play };
}

function SpeakerButton({
  playing,
  onClick,
  size = "md",
}: {
  playing: boolean;
  onClick: (e: React.MouseEvent) => void;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={playing ? "Durdur" : "Sesi çal"}
      className={`flex shrink-0 items-center justify-center rounded-full border transition-colors ${dim} ${
        playing
          ? "border-navy-400 bg-navy-500 text-white"
          : "border-stone-200 bg-white text-stone-500 hover:border-navy-300 hover:bg-navy-50 hover:text-navy-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400 dark:hover:border-navy-700 dark:hover:bg-navy-900/30 dark:hover:text-navy-400"
      }`}
    >
      {playing ? (
        // Kare (durdur)
        <svg className={icon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <rect x="6" y="6" width="12" height="12" rx="1" />
        </svg>
      ) : (
        // Hoparlör
        <svg className={icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      )}
    </button>
  );
}

function Flashcard({
  harf,
  flipped,
  onFlip,
}: {
  harf: Harf;
  flipped: boolean;
  onFlip: () => void;
}) {
  const { playing, play } = useHarfAudio(harf.harf_id);

  const kalinCls =
    harf.kalin_ince === "kalın"
      ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
      : harf.kalin_ince === "ince"
        ? "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
        : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400";

  return (
    <button
      onClick={onFlip}
      aria-label="Kartı çevir"
      className="relative mx-auto h-72 w-full max-w-sm cursor-pointer"
      style={{ perspective: "1200px" }}
    >
      <div
        className="relative h-full w-full transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* ── Ön yüz ── */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-stone-200 bg-white shadow-md dark:border-stone-700 dark:bg-stone-900"
          style={{ backfaceVisibility: "hidden" }}
        >
          <span className="absolute left-3 top-3 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-400 dark:bg-stone-800 dark:text-stone-500">
            #{harf.harf_id}
          </span>
          {/* Ses butonu — sağ üst */}
          <span className="absolute right-3 top-3">
            <SpeakerButton playing={playing} onClick={play} />
          </span>
          <p
            className="select-none text-[88px] font-bold leading-none text-stone-900 dark:text-stone-50"
            dir="rtl"
            lang="ar"
          >
            {harf.tek_basina}
          </p>
          <p className="mt-5 text-xs text-stone-400 dark:text-stone-500">
            Detaylar için dokun
          </p>
        </div>

        {/* ── Arka yüz ── */}
        <div
          className="absolute inset-0 flex flex-col rounded-2xl border border-navy-200 bg-navy-50/80 px-5 py-4 shadow-md dark:border-navy-800/50 dark:bg-stone-900"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p
                className="text-4xl font-bold text-stone-900 dark:text-stone-50"
                dir="rtl"
                lang="ar"
              >
                {harf.tek_basina}
              </p>
              <p className="mt-1 text-lg font-bold text-navy-700 dark:text-navy-400">
                {harf.harf_adi}
              </p>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                {harf.harf_sesi}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <SpeakerButton playing={playing} onClick={play} size="sm" />
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${kalinCls}`}>
                {harf.kalin_ince}
              </span>
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                {harf.grup}
              </span>
            </div>
          </div>

          <div className="mb-3 grid grid-cols-3 gap-2">
            {(
              [
                { label: "Başta",  val: harf.basta  },
                { label: "Ortada", val: harf.ortada },
                { label: "Sonda",  val: harf.sonda  },
              ] as const
            ).map(({ label, val }) => (
              <div
                key={label}
                className="rounded-lg bg-white px-2 py-2 text-center dark:bg-stone-800"
              >
                <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
                  {label}
                </p>
                <p
                  className="text-xl font-medium text-stone-900 dark:text-stone-50"
                  dir="rtl"
                  lang="ar"
                >
                  {val}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-auto rounded-lg bg-white/70 px-3 py-2 text-xs dark:bg-stone-800/60">
            <span className="font-semibold text-stone-600 dark:text-stone-300">Mahreç: </span>
            <span className="text-stone-500 dark:text-stone-400">{harf.mahrec}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── FlashcardView ────────────────────────────────────────────────────────────

function FlashcardView({
  ders,
  currentIdx,
  flipped,
  seenIds,
  onBack,
  onFlip,
  onNavigate,
  onJumpTo,
}: {
  ders: DersWithHarfler;
  currentIdx: number;
  flipped: boolean;
  seenIds: number[];
  onBack: () => void;
  onFlip: () => void;
  onNavigate: (dir: 1 | -1) => void;
  onJumpTo: (idx: number) => void;
}) {
  const harf  = ders.harfler[currentIdx];
  const total = ders.harfler.length;
  const seen  = seenIds.length;
  const pct   = total > 0 ? Math.round((seen / total) * 100) : 0;
  const cfg   = seviyeCfg(ders.seviye);

  if (!harf) return null;

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-stone-800"
        >
          ← Dersler
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-bold text-stone-800 dark:text-stone-100">
            {shortBaslik(ders.baslik)}
          </h2>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.cls}`}>
            {cfg.label}
          </span>
        </div>
      </div>

      <div className="mb-5">
        <div className="mb-1 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
          <span>{currentIdx + 1} / {total} harf</span>
          <span>
            {seen} görüldü
            {pct === 100 && (
              <span className="ml-1.5 font-semibold text-navy-600 dark:text-navy-400">✓</span>
            )}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
          <div className="h-full rounded-full bg-navy-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="mb-5">
        <Flashcard harf={harf} flipped={flipped} onFlip={onFlip} />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => onNavigate(-1)}
          className="flex-1 rounded-xl border border-stone-200 bg-white py-2.5 text-sm font-semibold text-stone-700 transition-all hover:border-stone-300 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          ← Önceki
        </button>
        <button
          onClick={() => onNavigate(1)}
          className="flex-1 rounded-xl border border-stone-200 bg-white py-2.5 text-sm font-semibold text-stone-700 transition-all hover:border-stone-300 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          Sonraki →
        </button>
      </div>

      {total <= 30 && (
        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {ders.harfler.map((h, i) => (
            <button
              key={h.harf_id}
              onClick={() => onJumpTo(i)}
              aria-label={h.harf_adi}
              className={`h-2.5 w-2.5 rounded-full transition-all ${
                i === currentIdx
                  ? "scale-125 bg-navy-500"
                  : seenIds.includes(h.harf_id)
                    ? "bg-navy-200 dark:bg-navy-800"
                    : "bg-stone-200 dark:bg-stone-700"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Lesson Popup ─────────────────────────────────────────────────────────────

function LessonPopup({
  ders,
  status,
  seenCount,
  quizScore,
  onClose,
  onFlashcard,
  onQuiz,
}: {
  ders: DersWithHarfler;
  status: LessonStatus;
  seenCount: number;
  quizScore: QuizScore | null;
  onClose: () => void;
  onFlashcard: () => void;
  onQuiz: () => void;
}) {
  const total   = ders.harfler.length;
  const pct     = total > 0 ? Math.round((seenCount / total) * 100) : 0;
  const cfg     = seviyeCfg(ders.seviye);
  const hasQuiz = QUIZ_LESSON_IDS.has(ders.id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" />
      <div
        className="relative w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-5 shadow-xl dark:border-stone-700 dark:bg-stone-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                Konu {ders.konu_sirasi}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.cls}`}>
                {cfg.label}
              </span>
              {status === "completed" && (
                <span className="rounded-full bg-navy-100 px-2 py-0.5 text-[10px] font-bold text-navy-700 dark:bg-navy-900/40 dark:text-navy-400">
                  ✓ Tamamlandı
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-stone-800 dark:text-stone-100">
              {shortBaslik(ders.baslik)}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Flashcard progress */}
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
            <span>Kartlar: {seenCount} / {total}</span>
            {pct === 100 && (
              <span className="font-semibold text-navy-600 dark:text-navy-400">✓ Tamamlandı</span>
            )}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
            <div
              className="h-full rounded-full bg-navy-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Quiz score */}
        {hasQuiz && quizScore && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-navy-50 px-3 py-2 text-sm dark:bg-navy-900/20">
            <Brain aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
            <span className="text-navy-700 dark:text-navy-300">
              Test: {quizScore.score}/{quizScore.total}
              {quizScore.score >= QUIZ_PASS
                ? <span className="ml-1 font-semibold text-navy-600 dark:text-navy-400">✓ Geçti</span>
                : <span className="ml-1 text-stone-500 dark:text-stone-400"> — tekrar dene</span>}
            </span>
          </div>
        )}
        {hasQuiz && !quizScore && status !== "locked" && (
          <div className="mb-3 rounded-lg bg-gold-50 px-3 py-2 text-xs text-gold-700 dark:bg-gold-900/20 dark:text-gold-300">
            Bu dersi açmak için teste gir ve en az {QUIZ_PASS}/15 al.
          </div>
        )}

        {/* Locked notice */}
        {status === "locked" && (
          <div className="mb-3 rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-500 dark:bg-stone-800 dark:text-stone-400">
            Önceki dersi tamamla
          </div>
        )}

        {/* Action buttons */}
        {status !== "locked" && (
          <div className={`grid gap-2 ${hasQuiz ? "grid-cols-2" : "grid-cols-1"}`}>
            <button
              onClick={onFlashcard}
              className="rounded-xl bg-navy-500 py-2.5 text-sm font-semibold text-white transition-all hover:bg-navy-600"
            >
              Kartlar
            </button>
            {hasQuiz && (
              <button
                onClick={onQuiz}
                className="rounded-xl bg-navy-600 py-2.5 text-sm font-semibold text-white transition-all hover:bg-navy-700"
              >
                Test
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Path Node ────────────────────────────────────────────────────────────────

function PathNode({
  ders,
  status,
  seenCount,
  mounted,
  starBurst,
  onClick,
}: {
  ders: DersWithHarfler;
  status: LessonStatus;
  seenCount: number;
  mounted: boolean;
  starBurst: boolean;
  onClick: () => void;
}) {
  const total = ders.harfler.length;
  const pct   = mounted && total > 0 ? Math.round((seenCount / total) * 100) : 0;
  const circ  = 2 * Math.PI * 26; // r=26 for progress ring

  const circleCls =
    status === "completed"
      ? "border-navy-500 bg-navy-500 text-white shadow-md shadow-navy-200/80 dark:shadow-navy-900/50"
      : status === "active"
        ? "border-gold-400 bg-gold-400 text-white shadow-md shadow-gold-200/80 dark:shadow-gold-900/50"
        : "border-stone-300 bg-stone-100 text-stone-400 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-500 opacity-50 cursor-not-allowed";

  return (
    <button
      onClick={status !== "locked" ? onClick : undefined}
      disabled={status === "locked"}
      className="flex shrink-0 flex-col items-center gap-1 focus:outline-none"
    >
      {/* Circle */}
      <div
        className={`relative flex h-14 w-14 items-center justify-center rounded-full border-[3px] transition-all sm:h-16 sm:w-16 ${circleCls} ${
          status !== "locked" ? "hover:scale-110 active:scale-95" : ""
        } ${starBurst ? "star-pop" : ""}`}
      >
        {/* SVG progress ring */}
        {status !== "locked" && mounted && (
          <svg
            className="absolute inset-0 h-full w-full -rotate-90"
            viewBox="0 0 64 64"
          >
            <circle
              cx="32" cy="32" r="26"
              fill="none"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="3"
            />
            <circle
              cx="32" cy="32" r="26"
              fill="none"
              stroke="rgba(255,255,255,0.85)"
              strokeWidth="3"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - pct / 100)}
              strokeLinecap="round"
            />
          </svg>
        )}

        {/* Icon */}
        {status === "completed" ? (
          <Star aria-hidden="true" className="relative z-10 h-5 w-5 fill-current" strokeWidth={1.5} />
        ) : status === "active" ? (
          <Play aria-hidden="true" className="relative z-10 h-4 w-4 fill-current" strokeWidth={2} />
        ) : (
          <Lock aria-hidden="true" className="relative z-10 h-4 w-4" strokeWidth={2} />
        )}

        {/* Ping ring for active */}
        {status === "active" && (
          <span className="absolute inset-0 animate-ping rounded-full bg-gold-400 opacity-25" />
        )}
      </div>

      {/* Label */}
      <div className="max-w-[60px] text-center sm:max-w-[72px]">
        <p className="text-[9px] font-bold uppercase tracking-wide text-stone-400 dark:text-stone-500">
          {ders.konu_sirasi}
        </p>
        <p className="line-clamp-2 text-[10px] font-semibold leading-tight text-stone-600 dark:text-stone-300 sm:text-[11px]">
          {shortBaslik(ders.baslik).split(" ").slice(0, 2).join(" ")}
        </p>
        {status === "active" && (
          <p className="mt-0.5 text-[9px] font-bold text-gold-500 dark:text-gold-400">Devam</p>
        )}
      </div>
    </button>
  );
}

// ─── Path Row (3 nodes + 2 h-lines) ──────────────────────────────────────────

function PathRow({
  nodes,
  statuses,
  seenCounts,
  mounted,
  starBursts,
  onNodeClick,
}: {
  nodes: DersWithHarfler[];
  statuses: LessonStatus[];
  seenCounts: number[];
  mounted: boolean;
  starBursts: boolean[];
  onNodeClick: (ders: DersWithHarfler) => void;
}) {
  function lineColor(nodeIdx: number) {
    return statuses[nodeIdx] === "completed"
      ? "bg-navy-400"
      : "bg-stone-200 dark:bg-stone-700";
  }

  return (
    <div className="flex flex-row items-start">
      <PathNode
        ders={nodes[0]}
        status={statuses[0]}
        seenCount={seenCounts[0]}
        mounted={mounted}
        starBurst={starBursts[0]}
        onClick={() => onNodeClick(nodes[0])}
      />
      {/* H-line: colored if node[0] completed */}
      <div className="flex flex-1 items-center" style={{ paddingTop: "24px" }}>
        <div className={`h-[3px] w-full rounded-full ${lineColor(0)}`} />
      </div>
      <PathNode
        ders={nodes[1]}
        status={statuses[1]}
        seenCount={seenCounts[1]}
        mounted={mounted}
        starBurst={starBursts[1]}
        onClick={() => onNodeClick(nodes[1])}
      />
      {/* H-line: colored if node[1] completed */}
      <div className="flex flex-1 items-center" style={{ paddingTop: "24px" }}>
        <div className={`h-[3px] w-full rounded-full ${lineColor(1)}`} />
      </div>
      <PathNode
        ders={nodes[2]}
        status={statuses[2]}
        seenCount={seenCounts[2]}
        mounted={mounted}
        starBurst={starBursts[2]}
        onClick={() => onNodeClick(nodes[2])}
      />
    </div>
  );
}

// ─── Vertical Turn Connector ──────────────────────────────────────────────────

function PathVLine({ side, completed }: { side: "left" | "right"; completed: boolean }) {
  const color = completed ? "bg-navy-400" : "bg-stone-200 dark:bg-stone-700";
  // Mirror the row's node-column widths with invisible spacers so the line aligns
  const line = (
    <div className="w-14 shrink-0 sm:w-16 flex justify-center">
      <div className={`w-[3px] rounded-full ${color}`} style={{ height: "40px" }} />
    </div>
  );
  const spacer = <div className="flex-1" />;

  return (
    <div className="flex flex-row">
      {side === "right" ? (
        <>{spacer}{spacer}<div className="w-14 shrink-0 sm:w-16" />{spacer}<div className="w-14 shrink-0 sm:w-16" />{line}</>
      ) : (
        <>{line}<div className="w-14 shrink-0 sm:w-16" />{spacer}<div className="w-14 shrink-0 sm:w-16" />{spacer}</>
      )}
    </div>
  );
}

// ─── Overall Progress Bar ─────────────────────────────────────────────────────

function OverallProgress({
  dersler,
  progress,
  quizScores,
  mounted,
}: {
  dersler: DersWithHarfler[];
  progress: Record<string, number[]>;
  quizScores: Record<string, QuizScore>;
  mounted: boolean;
}) {
  if (!mounted) return null;
  const completed = dersler.filter((d, i) =>
    checkCompleted(d, progress, quizScores)
  ).length;
  const pct = Math.round((completed / dersler.length) * 100);

  return (
    <div className="mb-8 rounded-2xl border border-stone-200 bg-white px-5 py-4 dark:border-stone-700 dark:bg-stone-900">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Trophy aria-hidden="true" className="h-4 w-4 text-gold-500" strokeWidth={2} />
          <span className="text-sm font-bold text-stone-800 dark:text-stone-100">
            İlerleme
          </span>
        </div>
        <span className="text-sm font-semibold text-navy-600 dark:text-navy-400">
          {completed} / {dersler.length} ders
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-navy-400 to-navy-500 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      {pct === 100 && (
        <p className="mt-2 text-center text-xs font-bold text-navy-600 dark:text-navy-400">
          Tüm dersler tamamlandı!
        </p>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ElifbaClient({ dersler }: { dersler: DersWithHarfler[] }) {
  const [viewMode, setViewMode]     = useState<"path" | "flashcard" | "quiz">("path");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [popupId, setPopupId]       = useState<number | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped]       = useState(false);
  const [progress, setProgress]     = useState<Record<string, number[]>>({});
  const [quizScores, setQuizScores] = useState<Record<string, QuizScore>>({});
  const [mounted, setMounted]       = useState(false);
  const [starBursts, setStarBursts] = useState<Set<number>>(new Set());

  useEffect(() => {
    setProgress(loadProgress());
    setQuizScores(loadQuizScores());
    setMounted(true);
  }, []);

  const selectedDers = dersler.find((d) => d.id === selectedId) ?? null;
  const popupDers    = dersler.find((d) => d.id === popupId)    ?? null;

  const markSeen = useCallback((dersId: number, harfId: number) => {
    setProgress((prev) => {
      const key  = String(dersId);
      const seen = prev[key] ?? [];
      if (seen.includes(harfId)) return prev;
      const next = { ...prev, [key]: [...seen, harfId] };
      saveProgress(next);
      return next;
    });
  }, []);

  function handleQuizComplete(dersId: number, score: number, total: number) {
    setQuizScores((prev) => {
      const next = { ...prev, [String(dersId)]: { score, total } };
      saveQuizScores(next);
      // Trigger star burst if this completes the lesson
      const ders = dersler.find((d) => d.id === dersId);
      if (ders) {
        const seen = progress[String(dersId)] ?? [];
        const flashDone = seen.length >= ders.harfler.length;
        if (flashDone && score >= QUIZ_PASS) {
          setStarBursts((s) => new Set(s).add(dersId));
          setTimeout(() => {
            setStarBursts((s) => { const n = new Set(s); n.delete(dersId); return n; });
          }, 800);
        }
      }
      return next;
    });
  }

  function openFlashcard(dersId: number) {
    setSelectedId(dersId);
    setCurrentIdx(0);
    setFlipped(false);
    setPopupId(null);
    setViewMode("flashcard");
  }

  function openQuiz(dersId: number) {
    setSelectedId(dersId);
    setPopupId(null);
    setViewMode("quiz");
  }

  function handleBack() {
    if (selectedDers && viewMode === "flashcard") {
      const harf = selectedDers.harfler[currentIdx];
      if (harf) markSeen(selectedDers.id, harf.harf_id);
      // Check if flashcard completion unlocks the lesson
      const seen = progress[String(selectedDers.id)] ?? [];
      if (seen.length + 1 >= selectedDers.harfler.length && !QUIZ_LESSON_IDS.has(selectedDers.id)) {
        setStarBursts((s) => new Set(s).add(selectedDers.id));
        setTimeout(() => {
          setStarBursts((s) => { const n = new Set(s); n.delete(selectedDers.id!); return n; });
        }, 800);
      }
    }
    setSelectedId(null);
    setFlipped(false);
    setViewMode("path");
  }

  function handleNavigate(dir: 1 | -1) {
    if (!selectedDers) return;
    const harf = selectedDers.harfler[currentIdx];
    if (harf) markSeen(selectedDers.id, harf.harf_id);
    const total = selectedDers.harfler.length;
    setCurrentIdx((i) => (i + dir + total) % total);
    setFlipped(false);
  }

  function handleJumpTo(idx: number) {
    if (!selectedDers) return;
    const harf = selectedDers.harfler[currentIdx];
    if (harf) markSeen(selectedDers.id, harf.harf_id);
    setCurrentIdx(idx);
    setFlipped(false);
  }

  function handleFlip() {
    if (!flipped && selectedDers) {
      const harf = selectedDers.harfler[currentIdx];
      if (harf) markSeen(selectedDers.id, harf.harf_id);
    }
    setFlipped((f) => !f);
  }

  // Build status array (indexed by dersler position)
  const statuses: LessonStatus[] = dersler.map((ders, i) =>
    mounted ? getStatus(ders, i, dersler, progress, quizScores) : (i === 0 ? "active" : "locked")
  );

  // Snake row layout: [0,1,2], [5,4,3], [6,7,8]
  const row1 = [dersler[0], dersler[1], dersler[2]];
  const row2 = [dersler[5], dersler[4], dersler[3]]; // visual L→R but path R→L
  const row3 = [dersler[6], dersler[7], dersler[8]];

  function rowStatuses(nodes: DersWithHarfler[]) {
    return nodes.map((d) => statuses[dersler.indexOf(d)]);
  }
  function rowSeenCounts(nodes: DersWithHarfler[]) {
    return nodes.map((d) => mounted ? (progress[String(d.id)]?.length ?? 0) : 0);
  }
  function rowStarBursts(nodes: DersWithHarfler[]) {
    return nodes.map((d) => starBursts.has(d.id));
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      {/* Animation keyframes */}
      <style>{`
        @keyframes starPop {
          0%   { transform: scale(0.6) rotate(-15deg); }
          50%  { transform: scale(1.25) rotate(8deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        .star-pop { animation: starPop 0.55s cubic-bezier(.36,.07,.19,.97) both; }
      `}</style>

      <Link href="/ogren" className="mb-5 inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-stone-800">
        ← Konular
      </Link>

      {/* Hero */}
      <div className="mb-6 border-b border-stone-200 pb-6 dark:border-stone-700/60">
        <div className="mb-1 flex items-center gap-2.5">
          <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-700 dark:bg-navy-900/40 dark:text-navy-300">
            <BookOpen className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
            Elif-Ba Öğren
          </h1>
        </div>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Adım adım elif-ba içeriği &mdash; {dersler.length} konu
        </p>
      </div>

      {viewMode === "path" && (
        <>
          <OverallProgress
            dersler={dersler}
            progress={progress}
            quizScores={quizScores}
            mounted={mounted}
          />

          {/* Snake path */}
          <div className="mx-auto max-w-sm">
            {/* Row 1: L→R (konu 1,2,3) */}
            <PathRow
              nodes={row1}
              statuses={rowStatuses(row1)}
              seenCounts={rowSeenCounts(row1)}
              mounted={mounted}
              starBursts={rowStarBursts(row1)}
              onNodeClick={(d) => setPopupId(d.id)}
            />

            {/* VLine: right side — path turns at node 3 (dersler[2]) */}
            <PathVLine side="right" completed={statuses[2] === "completed"} />

            {/* Row 2: visual [5,4,3] = path nodes 6,5,4 (konu 6,5,4) */}
            <PathRow
              nodes={row2}
              statuses={rowStatuses(row2)}
              seenCounts={rowSeenCounts(row2)}
              mounted={mounted}
              starBursts={rowStarBursts(row2)}
              onNodeClick={(d) => setPopupId(d.id)}
            />

            {/* VLine: left side — path turns at node 6 (dersler[5]) */}
            <PathVLine side="left" completed={statuses[5] === "completed"} />

            {/* Row 3: L→R (konu 7,8,9) */}
            <PathRow
              nodes={row3}
              statuses={rowStatuses(row3)}
              seenCounts={rowSeenCounts(row3)}
              mounted={mounted}
              starBursts={rowStarBursts(row3)}
              onNodeClick={(d) => setPopupId(d.id)}
            />
          </div>

          {/* Lesson popup */}
          {popupDers && (
            <LessonPopup
              ders={popupDers}
              status={statuses[dersler.indexOf(popupDers)]}
              seenCount={mounted ? (progress[String(popupDers.id)]?.length ?? 0) : 0}
              quizScore={quizScores[String(popupDers.id)] ?? null}
              onClose={() => setPopupId(null)}
              onFlashcard={() => openFlashcard(popupDers.id)}
              onQuiz={() => openQuiz(popupDers.id)}
            />
          )}
        </>
      )}

      {viewMode === "flashcard" && selectedDers && (
        <FlashcardView
          ders={selectedDers}
          currentIdx={currentIdx}
          flipped={flipped}
          seenIds={progress[String(selectedDers.id)] ?? []}
          onBack={handleBack}
          onFlip={handleFlip}
          onNavigate={handleNavigate}
          onJumpTo={handleJumpTo}
        />
      )}

      {viewMode === "quiz" && selectedDers && (
        <QuizView
          dersId={selectedDers.id}
          dersBaslik={shortBaslik(selectedDers.baslik)}
          onBack={handleBack}
          onComplete={(score, total) => handleQuizComplete(selectedDers.id, score, total)}
        />
      )}
    </main>
  );
}
