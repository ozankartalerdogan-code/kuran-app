"use client";

import { useState } from "react";
import Link from "next/link";
import {
  HARF_I_TARIF_DERSI,
  type HarfTarifBolum,
  type HarfTarifSoru,
} from "../../../data/harf-i-tarif-dersi";

// şemsiye = güneş (amber), kameriye = ay (indigo)
const TIP_CLS = {
  semsiye: "bg-gold-100 text-gold-700 dark:bg-gold-900/40 dark:text-gold-300",
  kameriye: "bg-navy-100 text-navy-700 dark:bg-navy-900/40 dark:text-navy-300",
} as const;
const TIP_LABEL = { semsiye: "☀️ Şemsiye", kameriye: "🌙 Kameriye" } as const;

function SectionShell({ id, baslik, alt, children }: { id?: string; baslik: string; alt?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-5 scroll-mt-20 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-700/60 dark:bg-stone-800/40">
      <h2 className="text-base font-bold text-stone-900 dark:text-stone-50">{baslik}</h2>
      {alt && <p className="mt-0.5 text-[12px] text-stone-500 dark:text-stone-400">{alt}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function HarfGrid({ b }: { b: HarfTarifBolum }) {
  const isS = b.id === "semsiye_harfler";
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {(b.harfler ?? []).map((h, i) => (
        <li key={i} className={`rounded-xl border px-3 py-2.5 ${isS ? "border-gold-200 bg-gold-50/50 dark:border-gold-800/40 dark:bg-gold-900/10" : "border-navy-200 bg-navy-50/50 dark:border-navy-800/40 dark:bg-navy-900/10"}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-stone-800 dark:text-stone-100">{h.ad}</span>
            <span className="font-scheherazade text-xl leading-none text-stone-800 dark:text-stone-100" dir="rtl">{h.arapca}</span>
          </div>
          <p className="mt-0.5 text-[12px] text-stone-500 dark:text-stone-400">{h.okunusu}</p>
          {h.ornek_esma && <p className="mt-1 text-[11px] leading-snug text-navy-700 dark:text-navy-400">{h.ornek_esma}</p>}
        </li>
      ))}
    </ul>
  );
}

function OrnekList({ b }: { b: HarfTarifBolum }) {
  return (
    <ul className="space-y-2.5">
      {(b.ornekler ?? []).map((o, i) => (
        <li key={i} className="rounded-xl border border-stone-200 px-4 py-3 dark:border-stone-700/60">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-sm font-bold text-stone-900 dark:text-stone-50">{o.isim}</span>
              <span className="ml-2 text-[12px] text-stone-500 dark:text-stone-400">{o.anlam}</span>
            </div>
            <span className="font-scheherazade text-xl leading-none text-stone-800 dark:text-stone-100" dir="rtl">{o.arapca}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${TIP_CLS[o.tip]}`}>{TIP_LABEL[o.tip]}</span>
            <span className="text-[12px] text-stone-600 dark:text-stone-300">{o.aciklama}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

// "A mı, B mı?" → ["A", "B"]
function parseOptions(soru: string): [string, string] | null {
  const parts = soru.split(",");
  if (parts.length !== 2) return null;
  const clean = (p: string) => p.replace(/\s*m[ıiuü]\s*\??\s*$/i, "").trim();
  const a = clean(parts[0]), c = clean(parts[1]);
  return a && c ? [a, c] : null;
}

function QuizQuestion({ q, idx, onAnswer }: { q: HarfTarifSoru; idx: number; onAnswer: (correct: boolean) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const opts = parseOptions(q.soru) ?? [q.dogru_cevap, "—"];

  return (
    <div className="rounded-xl border border-stone-200 px-4 py-3 dark:border-stone-700/60">
      <p className="mb-2.5 text-sm font-semibold text-stone-800 dark:text-stone-100">
        <span className="mr-1.5 text-stone-400">{idx + 1}.</span>{q.harf}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {opts.map((opt) => {
          const isCorrect = opt === q.dogru_cevap;
          const isPicked = picked === opt;
          let cls = "border-stone-200 bg-white text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300";
          if (picked) {
            if (isCorrect) cls = "border-navy-400 bg-navy-50 text-navy-800 dark:border-navy-600 dark:bg-navy-900/30 dark:text-navy-300";
            else if (isPicked) cls = "border-rose-400 bg-rose-50 text-rose-700 dark:border-rose-600 dark:bg-rose-900/30 dark:text-rose-300";
            else cls = "border-stone-200 bg-white text-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-600";
          }
          return (
            <button
              key={opt}
              disabled={picked !== null}
              onClick={() => { setPicked(opt); onAnswer(isCorrect); }}
              className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${cls}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {picked && (
        <p className="mt-2.5 flex items-center gap-2 text-[12px]">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${TIP_CLS[q.tip]}`}>{TIP_LABEL[q.tip]}</span>
          <span className="text-stone-600 dark:text-stone-300">{q.aciklama}</span>
        </p>
      )}
    </div>
  );
}

function Quiz({ b }: { b: HarfTarifBolum }) {
  const sorular = b.sorular ?? [];
  const [answered, setAnswered] = useState<Record<string, boolean>>({});
  const done = Object.keys(answered).length;
  const correct = Object.values(answered).filter(Boolean).length;

  return (
    <>
      <div className="mb-3 flex items-center justify-between rounded-xl bg-stone-100 px-4 py-2.5 text-sm dark:bg-stone-800/60">
        <span className="font-semibold text-stone-700 dark:text-stone-200">🧠 {done} / {sorular.length} yanıtlandı</span>
        <span className="font-bold text-navy-600 dark:text-navy-400">{correct} doğru</span>
      </div>
      <div className="space-y-2.5">
        {sorular.map((q, i) => (
          <QuizQuestion key={q.id} q={q} idx={i} onAnswer={(c) => setAnswered((p) => ({ ...p, [q.id]: c }))} />
        ))}
      </div>
      {done === sorular.length && (
        <div className="mt-4 rounded-xl border border-navy-300 bg-navy-50 px-4 py-3 text-center dark:border-navy-700/60 dark:bg-navy-900/20">
          <p className="text-sm font-bold text-navy-800 dark:text-navy-300">
            Bitti! {correct}/{sorular.length} doğru {correct === sorular.length ? "🎉 Tam puan!" : "— tekrar edebilirsin"}
          </p>
        </div>
      )}
    </>
  );
}

function Bolum({ b }: { b: HarfTarifBolum }) {
  switch (b.tip) {
    case "bilgi":
      return (
        <SectionShell baslik={b.baslik}>
          {b.icerik && <p className="text-[13.5px] leading-relaxed text-stone-700 dark:text-stone-300">{b.icerik}</p>}
          {b.ornek && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-navy-200 bg-navy-50/60 px-3 py-2 dark:border-navy-800/50 dark:bg-navy-900/15">
                <p className="text-sm font-bold text-navy-700 dark:text-navy-300">{b.ornek.dogru}</p>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50/60 px-3 py-2 dark:border-rose-800/50 dark:bg-rose-900/15">
                <p className="text-sm font-bold text-rose-600 dark:text-rose-300">{b.ornek.yanlis}</p>
              </div>
              <p className="text-[12px] text-stone-500 dark:text-stone-400 sm:col-span-2">{b.ornek.aciklama}</p>
            </div>
          )}
        </SectionShell>
      );
    case "kural":
      return (
        <SectionShell baslik={b.baslik}>
          {b.icerik && <p className="text-[13.5px] leading-relaxed text-stone-700 dark:text-stone-300">{b.icerik}</p>}
          {b.hafiza_ipucu && (
            <div className="mt-3 rounded-xl border border-gold-200 bg-gold-50/70 px-4 py-3 dark:border-gold-700/50 dark:bg-gold-900/15">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-gold-700 dark:text-gold-400">💡 Hafıza İpucu</p>
              <p className="text-[13px] leading-relaxed text-stone-700 dark:text-stone-300">{b.hafiza_ipucu}</p>
            </div>
          )}
          {b.gorsel_aciklama && <p className="mt-2 rounded-lg bg-stone-100 px-3 py-2 font-mono text-[12px] text-stone-600 dark:bg-stone-800 dark:text-stone-300">{b.gorsel_aciklama}</p>}
        </SectionShell>
      );
    case "liste":
      return <SectionShell baslik={b.baslik} alt={b.alt_baslik}><HarfGrid b={b} /></SectionShell>;
    case "ornekler":
      return <SectionShell baslik={b.baslik} alt={b.alt_baslik}><OrnekList b={b} /></SectionShell>;
    case "baglam":
      return (
        <SectionShell baslik={b.baslik}>
          {b.icerik && <p className="text-[13.5px] leading-relaxed text-stone-700 dark:text-stone-300">{b.icerik}</p>}
          {(b.not || b.gorsel_ipucu) && (
            <p className="mt-2.5 rounded-lg bg-navy-50 px-3 py-2 text-[12px] leading-relaxed text-navy-700 dark:bg-navy-900/20 dark:text-navy-300">
              {b.not || b.gorsel_ipucu}
            </p>
          )}
        </SectionShell>
      );
    case "quiz":
      return <SectionShell id="quiz" baslik={b.baslik}><Quiz b={b} /></SectionShell>;
    case "ozet":
      return (
        <SectionShell baslik={b.baslik}>
          <ul className="space-y-1.5">
            {(b.maddeler ?? []).map((m, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] leading-relaxed text-stone-700 dark:text-stone-300">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-navy-500" />{m}
              </li>
            ))}
          </ul>
        </SectionShell>
      );
    default:
      return null;
  }
}

export function HarfITarifLesson() {
  const d = HARF_I_TARIF_DERSI;
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/ogren" className="mb-5 inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-stone-800">
        ← Elif-Ba
      </Link>

      {/* Hero */}
      <div className="mb-5">
        <div className="mb-2 flex items-center gap-2.5">
          <span className="text-2xl leading-none">☀️🌙</span>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">{d.baslik}</h1>
        </div>
        <p className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">{d.aciklama}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
          <span className="rounded-full bg-stone-100 px-2.5 py-1 text-stone-600 dark:bg-stone-800 dark:text-stone-400">⏱️ {d.sure}</span>
          <span className="rounded-full bg-stone-100 px-2.5 py-1 text-stone-600 dark:bg-stone-800 dark:text-stone-400">📋 Ön koşul: {d.on_kosul}</span>
          <a
            href="#quiz"
            className="ml-auto rounded-full bg-navy-600 px-4 py-1.5 text-[12px] font-bold text-white transition-colors hover:bg-navy-700"
          >
            🧠 Teste Başla
          </a>
        </div>
      </div>

      {d.bolumler.map((b) => <Bolum key={b.id} b={b} />)}
    </main>
  );
}
