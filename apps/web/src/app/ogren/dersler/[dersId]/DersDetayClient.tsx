"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Trophy, Star, ThumbsUp, BookOpen, type LucideIcon } from "lucide-react";
import { DERS_DATA, BASLIKLAR, getQuiz, type DersKart } from "../../../../data/dersler/registry";
import { normalizeQuizSorular, shuffle, shuffleQuizOptions, type QuizSoru } from "../../../../data/dersler/quizUtils";
import { useDersProgress } from "../../../../hooks/useDersProgress";

const QUIZ_PASS_RATIO = 0.7;

const GORSEL_MAP: Record<string, string> = {
  namaz_tekbir: "/images/namaz/tekbir.jpg",
  namaz_kiyam: "/images/namaz/kıyam.jpg",
  namaz_ruku: "/images/namaz/ruku.jpg",
  namaz_kavme: "/images/namaz/kavme.jpg",
  namaz_secde: "/images/namaz/secde.jpg",
  namaz_celse: "/images/namaz/celse.jpg",
  namaz_tesehhud: "/images/namaz/tesehhüd.jpg",
  namaz_selam: "/images/namaz/selam.jpg",
};

type Mode = "kart" | "oku" | "quiz" | "sonuc";

function cleanText(value: string) {
  return value.replace(/\{\{link:[^|}]+\|([^}]+)}}/g, "$1");
}

function scoreIkon(score: number, total: number): LucideIcon {
  const pct = total > 0 ? score / total : 0;
  if (pct >= 0.9) return Trophy;
  if (pct >= 0.7) return Star;
  if (pct >= 0.5) return ThumbsUp;
  return BookOpen;
}

function ProgressBar({ pct, color = "bg-gold-500" }: { pct: number; color?: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

function LessonText({ children }: { children: string }) {
  return <p className="whitespace-pre-line text-[15px] leading-8 text-stone-700 dark:text-stone-300">{cleanText(children)}</p>;
}

function Highlight({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <div className="rounded-2xl border-l-4 border-gold-500 bg-gold-50 px-4 py-3 dark:bg-gold-950/20">
      <p className="whitespace-pre-line text-sm font-bold leading-6 text-gold-800 dark:text-gold-300">✦ {cleanText(text)}</p>
    </div>
  );
}

function LessonCard({ kart }: { kart: DersKart }) {
  const gorselSrc = kart.tip === "gorsel" && kart.gorsel ? GORSEL_MAP[kart.gorsel] : null;
  return (
    <div className="space-y-4">
      {gorselSrc ? (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900">
          <Image
            src={gorselSrc}
            alt={`${kart.baslik} görseli`}
            width={1300}
            height={720}
            className="h-auto w-full object-cover"
          />
        </div>
      ) : null}
      <article className="rounded-2xl border border-gold-200 bg-white p-5 shadow-sm dark:border-gold-900/50 dark:bg-stone-900">
        <LessonText>{kart.icerik ?? ""}</LessonText>
      </article>
      <Highlight text={kart.vurgu} />
    </div>
  );
}

function ResultScreen({ score, questions, wrongAnswers, onReturn, onRetry }: { score: number; questions: QuizSoru[]; wrongAnswers: QuizSoru[]; onReturn: () => void; onRetry: () => void }) {
  const total = questions.length;
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const SkorIkon = scoreIkon(score, total);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 rounded-3xl border border-stone-200 bg-white p-6 text-center shadow-sm dark:border-stone-700 dark:bg-stone-900">
        <div className="flex justify-center">
          <span aria-hidden="true" className="flex h-20 w-20 items-center justify-center rounded-full bg-gold-100 text-gold-600 dark:bg-gold-900/40 dark:text-gold-300">
            <SkorIkon className="h-10 w-10" strokeWidth={1.5} />
          </span>
        </div>
        <h1 className="mt-3 text-2xl font-black text-stone-950 dark:text-stone-50">{score} / {total} doğru</h1>
        <p className="mt-1 text-sm font-semibold text-stone-500 dark:text-stone-400">%{pct} başarı</p>
        <div className="mt-5"><ProgressBar pct={pct} color={pct >= 70 ? "bg-navy-500" : "bg-gold-500"} /></div>
        <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">%70 ve üzeri ders tamamlandı sayılır.</p>
      </div>

      {wrongAnswers.length > 0 ? (
        <section className="mb-6 space-y-3">
          <h2 className="text-xs font-black uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">Yanlış Cevapladıkların ({wrongAnswers.length})</h2>
          {wrongAnswers.map((soru, index) => (
            <div key={`${soru.id}-${index}`} className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
              <p className="text-sm font-bold leading-6 text-stone-900 dark:text-stone-50">{index + 1}. {soru.soru}</p>
              <p className="mt-2 text-sm font-semibold text-navy-700 dark:text-navy-400">✓ Doğru cevap: {soru.cevaplar.find((cevap) => cevap.harf === soru.dogru)?.metin}</p>
              {soru.aciklama ? <p className="mt-2 text-xs leading-5 text-stone-500 dark:text-stone-400">{soru.aciklama}</p> : null}
            </div>
          ))}
        </section>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={onReturn} className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-bold text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800">Derse Dön</button>
        <button type="button" onClick={onRetry} className="rounded-2xl bg-gold-500 px-4 py-3 text-sm font-black text-stone-950 hover:bg-gold-400">Tekrar Çöz</button>
      </div>
    </div>
  );
}

export function DersDetayClient({ dersId }: { dersId: string }) {
  const dersData = DERS_DATA[dersId];
  const quizData = getQuiz(dersId);
  const baslik = BASLIKLAR[dersId] ?? dersId;
  const { progress, hydrated, updateProgress, setQuizBitti } = useDersProgress();
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<Mode>("kart");
  const [quizQuestions, setQuizQuestions] = useState<QuizSoru[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState<QuizSoru[]>([]);
  const resumedRef = useRef(false);

  const kartlar = dersData?.kartlar ?? [];
  const total = kartlar.length;
  const kart = kartlar[index] ?? kartlar[0];
  const validQuiz = useMemo(() => normalizeQuizSorular(quizData?.sorular ?? []), [quizData]);
  const hasQuiz = validQuiz.length > 0;

  useEffect(() => {
    if (!hydrated || !dersData || total === 0) return;
    updateProgress(dersId, 0, total);
  }, [dersData, dersId, hydrated, total, updateProgress]);

  useEffect(() => {
    if (!hydrated || resumedRef.current || total === 0) return;
    resumedRef.current = true;
    const seen = progress[dersId]?.["görülen"] ?? 0;
    if (seen > 0) setIndex(Math.min(seen, total - 1));
  }, [dersId, hydrated, progress, total]);

  if (!dersData || !kart) {
    return (
      <main className="min-h-screen px-4 py-10">
        <div className="mx-auto max-w-2xl rounded-3xl border border-stone-200 bg-white p-8 text-center dark:border-stone-700 dark:bg-stone-900">
          <div className="flex justify-center">
            <BookOpen aria-hidden="true" className="h-12 w-12 text-stone-300 dark:text-stone-600" strokeWidth={1.5} />
          </div>
          <h1 className="mt-4 text-xl font-black text-stone-950 dark:text-stone-50">Ders bulunamadı</h1>
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">{baslik} içeriği şu anda görüntülenemiyor.</p>
          <Link href="/ogren/dersler" className="mt-5 inline-flex rounded-xl bg-gold-500 px-4 py-2 text-sm font-bold text-stone-950">Derslere Dön</Link>
        </div>
      </main>
    );
  }

  const lessonPct = Math.round(((index + 1) / total) * 100);
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const currentQuestion = quizQuestions[qIndex];
  const quizPass = Math.max(1, Math.ceil(quizQuestions.length * QUIZ_PASS_RATIO));

  function navigate(dir: 1 | -1) {
    const next = index + dir;
    if (next < 0 || next >= total) return;
    updateProgress(dersId, next, total);
    setIndex(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startQuiz() {
    if (!hasQuiz) return;
    const questions = shuffle(validQuiz).slice(0, Math.min(10, validQuiz.length)).map(shuffleQuizOptions);
    setQuizQuestions(questions);
    setQIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setWrongAnswers([]);
    setMode("quiz");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function answer(harf: string) {
    if (selectedAnswer || !currentQuestion) return;
    setSelectedAnswer(harf);
    setShowResult(true);
    if (harf === currentQuestion.dogru) setScore((current) => current + 1);
    else setWrongAnswers((current) => [...current, currentQuestion]);
  }

  function nextQuestion() {
    if (!showResult) return;
    if (qIndex + 1 >= quizQuestions.length) {
      if (score >= quizPass) setQuizBitti(dersId);
      setMode("sonuc");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setQIndex((current) => current + 1);
    setSelectedAnswer(null);
    setShowResult(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (mode === "sonuc") {
    return <ResultScreen score={score} questions={quizQuestions} wrongAnswers={wrongAnswers} onReturn={() => setMode("kart")} onRetry={startQuiz} />;
  }

  if (mode === "quiz" && currentQuestion) {
    const quizPct = Math.round(((qIndex + 1) / quizQuestions.length) * 100);
    return (
      <main className="min-h-screen px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-5 flex items-center gap-3">
            <button type="button" onClick={() => setMode("kart")} className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-stone-800">← Derse Dön</button>
            <div className="min-w-0 flex-1 text-right text-xs font-bold text-stone-500 dark:text-stone-400">Soru {qIndex + 1}/{quizQuestions.length}</div>
          </div>
          <ProgressBar pct={quizPct} />

          <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-900">
            <h1 className="text-lg font-black leading-7 text-stone-950 dark:text-stone-50">{currentQuestion.soru}</h1>
            {showResult && currentQuestion.aciklama ? (
              <div className="mt-4 rounded-2xl border border-gold-200 bg-gold-50 px-4 py-3 text-sm leading-6 text-stone-700 dark:border-gold-900/50 dark:bg-gold-950/20 dark:text-stone-300">{currentQuestion.aciklama}</div>
            ) : null}
          </section>

          <div className="mt-4 space-y-3">
            {currentQuestion.cevaplar.map((cevap) => {
              const correct = cevap.harf === currentQuestion.dogru;
              const picked = cevap.harf === selectedAnswer;
              const cls = !showResult
                ? "border-stone-200 bg-white text-stone-800 hover:border-gold-300 hover:bg-gold-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:border-gold-800 dark:hover:bg-gold-950/20"
                : correct
                  ? "border-navy-500 bg-navy-600 text-white"
                  : picked
                    ? "border-rose-500 bg-rose-600 text-white"
                    : "border-stone-200 bg-white text-stone-400 opacity-60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-500";
              return (
                <button key={cevap.harf} type="button" disabled={!!selectedAnswer} onClick={() => answer(cevap.harf)} className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${cls}`}>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-current text-sm font-black">{cevap.harf}</span>
                  <span className="text-sm font-semibold leading-5">{cevap.metin}</span>
                </button>
              );
            })}
          </div>

          <button type="button" disabled={!showResult} onClick={nextQuestion} className="mt-5 w-full rounded-2xl bg-gold-500 px-4 py-3 text-sm font-black text-stone-950 transition disabled:cursor-not-allowed disabled:opacity-40">
            {qIndex + 1 >= quizQuestions.length ? "Sonuçları Gör" : "Sonraki Soru →"}
          </button>
        </div>
      </main>
    );
  }

  if (mode === "oku") {
    return (
      <main className="min-h-screen px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-5 flex items-center gap-3">
            <Link href="/ogren/dersler" className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-stone-800">← Dersler</Link>
            <button type="button" onClick={() => setMode("kart")} className="ml-auto rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-stone-800">Kart Modu</button>
          </div>
          <header className="mb-6 border-b border-stone-200 pb-5 dark:border-stone-700">
            <h1 className="text-2xl font-black text-stone-950 dark:text-stone-50">{baslik}</h1>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Tüm kartları tek sayfada oku.</p>
          </header>
          <div className="space-y-8">
            {kartlar.map((item, itemIndex) => (
              <section key={item.id} className="space-y-4">
                <h2 className="text-xl font-black text-stone-950 dark:text-stone-50"><span className="mr-2 text-stone-400">{itemIndex + 1}.</span>{item.baslik}</h2>
                <LessonCard kart={item} />
              </section>
            ))}
          </div>
          {hasQuiz ? <button type="button" onClick={startQuiz} className="mt-8 w-full rounded-2xl bg-gold-500 px-4 py-3 text-sm font-black text-stone-950 hover:bg-gold-400">Teste Başla</button> : null}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex items-center gap-3">
          <Link href="/ogren/dersler" className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-stone-800">← Dersler</Link>
          <button type="button" onClick={() => setMode("oku")} className="ml-auto rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-stone-800">Tümünü Oku</button>
        </div>

        <header className="mb-5">
          <p className="mb-1 text-xs font-black uppercase tracking-[0.18em] text-gold-700 dark:text-gold-400">Kart {index + 1}/{total}</p>
          <h1 className="text-2xl font-black leading-tight text-stone-950 dark:text-stone-50">{kart.baslik}</h1>
          <div className="mt-4"><ProgressBar pct={lessonPct} /></div>
        </header>

        <LessonCard kart={kart} />

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" disabled={isFirst} onClick={() => navigate(-1)} className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-bold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800">← Önceki</button>
          {isLast ? (
            <button type="button" disabled={!hasQuiz} onClick={startQuiz} className="rounded-2xl bg-gold-500 px-4 py-3 text-sm font-black text-stone-950 transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40">Teste Başla</button>
          ) : (
            <button type="button" onClick={() => navigate(1)} className="rounded-2xl bg-gold-500 px-4 py-3 text-sm font-black text-stone-950 transition hover:bg-gold-400">Sonraki →</button>
          )}
        </div>
      </div>
    </main>
  );
}