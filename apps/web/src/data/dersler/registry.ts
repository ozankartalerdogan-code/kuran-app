import abdestDersi from "./abdest_dersi.json";
import abdestQuiz from "./abdest_quiz.json";
import ezanKametDersi from "./ezan_kamet_dersi.json";
import ezanKametQuiz from "./ezan_kamet_quiz.json";
import guzelAhlakDersi from "./guzel_ahlak_dersi.json";
import guzelAhlakQuiz from "./guzel_ahlak_quiz.json";
import hacUmreDersi from "./hac_umre_dersi.json";
import hacUmreQuiz from "./hac_umre_quiz.json";
import imanEsaslariDersi from "./iman_esaslari_dersi.json";
import imanEsaslariQuiz from "./iman_esaslari_quiz.json";
import kitaplaraImanDersi from "./kitaplara_iman_dersi.json";
import kitaplaraImanQuiz from "./kitaplara_iman_quiz.json";
import kurbanDersi from "./kurban_dersi.json";
import kurbanQuiz from "./kurban_quiz.json";
import namazDersi from "./namaz_dersi.json";
import namazQuiz from "./namaz_quiz.json";
import namazDualarDersi from "./namaz_dualar_dersi.json";
import namazDualarQuiz from "./namaz_dualar_quiz.json";
import nefsiniTaniDersModule from "./nefsini_tani_ders_modulu.json";
import nefsiniTaniQuiz from "./nefsini_tani_quiz.json";
import orucDersi from "./oruc_dersi.json";
import orucQuiz from "./oruc_quiz.json";
import peygamberKissalariDersi from "./peygamber_kissalari_dersi.json";
import peygamberKissalariQuiz from "./peygamber_kissalari_quiz.json";
import sahabeHayatlariDersi from "./sahabe_hayatlari_dersi.json";
import sahabeHayatlariQuiz from "./sahabe_hayatlari_quiz.json";
import siyerDersi from "./siyer_dersi.json";
import siyerQuiz from "./siyer_quiz.json";
import tecvidDersi from "./tecvid_dersi.json";
import tecvidQuiz from "./tecvid_quiz.json";
import zekatDersi from "./zekat_dersi.json";
import zekatQuiz from "./zekat_quiz.json";

export type DersKart = {
  id: string;
  tip: "metin" | "gorsel";
  baslik: string;
  icerik: string;
  vurgu?: string;
  gorsel?: string;
};

export type DersData = {
  ders_id: string;
  baslik: string;
  aciklama?: string;
  ikon?: string;
  kartlar: DersKart[];
  quiz_havuzu_id?: string;
};

export type QuizData = {
  quiz_id: string;
  baslik: string;
  toplam_soru: number;
  sorular: unknown[];
};

type Kayit = { id: string; ikon: string; sure: number; kategori: string; ders: unknown; quiz: unknown };
export type DersMeta = { id: string; baslik: string; ikon: string; kartSayisi: number; sure: number };

function toStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function formatRefs(refs: unknown, formatter: (item: Record<string, unknown>) => string): string[] {
  if (!Array.isArray(refs)) return [];
  return refs
    .map((item) => toRecord(item))
    .filter((item): item is Record<string, unknown> => !!item)
    .map(formatter)
    .filter(Boolean);
}

function buildModuleLessonBody(lesson: Record<string, unknown>): string {
  const appContent = toRecord(lesson.appContent);
  const body = toStringList(appContent?.body);
  const symptoms = toStringList(appContent?.symptoms);
  const treatment = toStringList(appContent?.treatment);
  const quranRefs = formatRefs(lesson.quranReferences, (item) => {
    const surah = typeof item.surah === "string" ? item.surah : "";
    const ayahRange = typeof item.ayahRange === "string" ? item.ayahRange : "";
    return [surah, ayahRange].filter(Boolean).join(" ");
  });
  const hadithRefs = formatRefs(lesson.hadithReferences, (item) => {
    const collection = typeof item.collection === "string" ? item.collection : "";
    const reference = typeof item.reference === "string" ? item.reference : "";
    return [collection, reference].filter(Boolean).join(" ");
  });

  const sections: string[] = [];
  const summary = typeof lesson.summary === "string" ? lesson.summary : "";
  const intro = typeof appContent?.intro === "string" ? appContent.intro : "";
  const practice = typeof appContent?.practice === "string" ? appContent.practice : "";
  const reflection = typeof appContent?.reflectionQuestion === "string" ? appContent.reflectionQuestion : "";
  const shortDua = typeof appContent?.shortDua === "string" ? appContent.shortDua : "";

  if (summary) sections.push(summary);
  if (intro && intro !== summary) sections.push(intro);
  if (body.length > 0) sections.push(body.map((item) => `• ${item}`).join("\n"));
  if (symptoms.length > 0) sections.push(`Belirtiler:\n${symptoms.map((item) => `• ${item}`).join("\n")}`);
  if (treatment.length > 0) sections.push(`Neler yapılabilir:\n${treatment.map((item) => `• ${item}`).join("\n")}`);
  if (practice) sections.push(`Uygulama:\n${practice}`);
  if (reflection) sections.push(`Muhasebe sorusu:\n${reflection}`);
  if (shortDua) sections.push(`Kısa dua:\n${shortDua}`);
  if (quranRefs.length > 0) sections.push(`Ayet dayanakları:\n• ${quranRefs.join("\n• ")}`);
  if (hadithRefs.length > 0) sections.push(`Hadis dayanakları:\n• ${hadithRefs.join("\n• ")}`);

  return sections.join("\n\n");
}

function buildMethodologyIntroCard(raw: unknown, moduleId: string): DersKart | null {
  const methodology = toRecord(toRecord(raw)?.methodology);
  if (!methodology) return null;
  const notice = typeof methodology.importantNotice === "string" ? methodology.importantNotice : "";
  const classification = typeof methodology.classificationNote === "string" ? methodology.classificationNote : "";
  const parts = [notice, classification].filter(Boolean);
  if (parts.length === 0) return null;
  return {
    id: `${moduleId}_metodoloji`,
    tip: "metin",
    baslik: "Bu Ders Nasıl Okunmalı?",
    icerik: parts.join("\n\n"),
    vurgu: notice || classification,
  };
}

function normalizeLessonModule(raw: unknown, fallbackIcon: string): DersData | unknown {
  const r = toRecord(raw);
  if (r?.kartlar) return raw;

  const moduleId = typeof r?.moduleId === "string" ? r.moduleId : "module";
  const baslik = typeof r?.title === "string" ? r.title : moduleId;
  const aciklama = typeof r?.subtitle === "string" ? r.subtitle : "";
  const lessons = Array.isArray(r?.lessons) ? r.lessons : [];
  const methodologyCard = buildMethodologyIntroCard(raw, moduleId);

  const lessonCards = lessons
    .map((item: unknown, index: number): DersKart | null => {
      const lesson = toRecord(item);
      if (!lesson) return null;
      const lessonId = typeof lesson.id === "string" ? lesson.id : `${moduleId}_k${String(index + 1).padStart(2, "0")}`;
      const lessonTitle = typeof lesson.title === "string" ? lesson.title : `Ders ${index + 1}`;
      const summary = typeof lesson.summary === "string" ? lesson.summary : "";
      const mainMessage = typeof lesson.mainMessage === "string" ? lesson.mainMessage : "";
      return {
        id: lessonId,
        tip: "metin" as const,
        baslik: lessonTitle,
        icerik: buildModuleLessonBody(lesson),
        vurgu: mainMessage || summary || lessonTitle,
      };
    })
    .filter((item): item is DersKart => !!item);

  return {
    ders_id: moduleId,
    baslik,
    aciklama,
    ikon: fallbackIcon,
    kartlar: methodologyCard ? [methodologyCard, ...lessonCards] : lessonCards,
    quiz_havuzu_id: moduleId,
  };
}

function normalizeQuizModule(raw: unknown, fallbackId: string, fallbackTitle: string): QuizData | unknown {
  const r = toRecord(raw);
  if (r?.sorular) return raw;

  const harfler = ["A", "B", "C", "D", "E", "F"];
  const sorular = Array.isArray(r?.questions)
    ? r.questions
        .map((item: unknown) => {
          const question = toRecord(item);
          if (!question) return null;
          const options = toStringList(question.options);
          const answerIndex = typeof question.correctOptionIndex === "number" ? question.correctOptionIndex : -1;
          if (answerIndex < 0 || answerIndex >= options.length || answerIndex >= harfler.length) return null;
          const difficulty = typeof question.difficulty === "string" ? question.difficulty : "easy";
          return {
            id: typeof question.id === "string" ? question.id : "",
            konu: typeof question.lessonId === "string" ? question.lessonId : fallbackId,
            soru: typeof question.question === "string" ? question.question : "",
            secenekler: options.map((option, index) => `${harfler[index] ?? String(index + 1)}) ${option}`),
            dogru_cevap: harfler[answerIndex],
            aciklama: typeof question.explanation === "string" ? question.explanation : "",
            zorluk: difficulty === "hard" ? "zor" : difficulty === "medium" ? "orta" : "kolay",
            kaynak: typeof question.lessonId === "string" ? question.lessonId : fallbackTitle,
          };
        })
        .filter(Boolean)
    : [];

  return {
    quiz_id: fallbackId,
    baslik: typeof r?.title === "string" ? r.title : fallbackTitle,
    toplam_soru: sorular.length,
    sorular,
  };
}

const DAKIKA_PER_KART = 0.61;
function estimateSure(kartSayisi: number): number {
  return Math.max(1, Math.round(kartSayisi * DAKIKA_PER_KART));
}

function isValidDers(ders: unknown): ders is DersData {
  const r = toRecord(ders);
  return !!r && typeof r.baslik === "string" && Array.isArray(r.kartlar) && r.kartlar.length > 0;
}

const nefsiniTaniDers = normalizeLessonModule(nefsiniTaniDersModule, "🪞");
const nefsiniTaniKartSayisi = Array.isArray(toRecord(nefsiniTaniDers)?.kartlar) ? (toRecord(nefsiniTaniDers)?.kartlar as unknown[]).length : 11;

const RAW_KAYITLAR: Kayit[] = [
  { id: "namaz", ikon: "🕌", sure: 15, kategori: "ibadet", ders: namazDersi, quiz: namazQuiz },
  { id: "namaz-dualar", ikon: "📿", sure: 10, kategori: "ibadet", ders: namazDualarDersi, quiz: namazDualarQuiz },
  { id: "oruc", ikon: "🌙", sure: 8, kategori: "ibadet", ders: orucDersi, quiz: orucQuiz },
  { id: "kurban", ikon: "🐑", sure: 12, kategori: "ibadet", ders: kurbanDersi, quiz: kurbanQuiz },
  { id: "hac-umre", ikon: "🕋", sure: 9, kategori: "ibadet", ders: hacUmreDersi, quiz: hacUmreQuiz },
  { id: "iman-esaslari", ikon: "📖", sure: 10, kategori: "akaid", ders: imanEsaslariDersi, quiz: imanEsaslariQuiz },
  { id: "kitaplara-iman", ikon: "📚", sure: 8, kategori: "akaid", ders: kitaplaraImanDersi, quiz: kitaplaraImanQuiz },
  { id: "nefsini-tani", ikon: "🪞", sure: estimateSure(nefsiniTaniKartSayisi), kategori: "ahlak", ders: nefsiniTaniDers, quiz: normalizeQuizModule(nefsiniTaniQuiz, "nefsini-tani", "Nefsini Tanı") },
  { id: "guzel-ahlak", ikon: "🤝", sure: 12, kategori: "ahlak", ders: guzelAhlakDersi, quiz: guzelAhlakQuiz },
  { id: "peygamberler", ikon: "⭐", sure: 14, kategori: "siyer", ders: peygamberKissalariDersi, quiz: peygamberKissalariQuiz },
  { id: "sahabe-hayatlari", ikon: "🕊", sure: 16, kategori: "siyer", ders: sahabeHayatlariDersi, quiz: sahabeHayatlariQuiz },
  { id: "siyer", ikon: "🌿", sure: 10, kategori: "siyer", ders: siyerDersi, quiz: siyerQuiz },
  { id: "tecvid", ikon: "📜", sure: 12, kategori: "kuran", ders: tecvidDersi, quiz: tecvidQuiz },
  { id: "abdest-gusul", ikon: "💧", sure: 10, kategori: "ibadet", ders: abdestDersi, quiz: abdestQuiz },
  { id: "ezan-kamet", ikon: "🔊", sure: 7, kategori: "ibadet", ders: ezanKametDersi, quiz: ezanKametQuiz },
  { id: "zekat", ikon: "🤲", sure: 7, kategori: "ibadet", ders: zekatDersi, quiz: zekatQuiz },
];

const KAYITLAR = RAW_KAYITLAR.filter((kayit): kayit is Kayit & { ders: DersData } => isValidDers(kayit.ders));

export const DERS_DATA: Record<string, DersData> = Object.fromEntries(KAYITLAR.map((kayit) => [kayit.id, kayit.ders]));
export const BASLIKLAR: Record<string, string> = Object.fromEntries(KAYITLAR.map((kayit) => [kayit.id, kayit.ders.baslik]));
export const DERSLER_META: DersMeta[] = KAYITLAR.map((kayit) => ({
  id: kayit.id,
  baslik: kayit.ders.baslik,
  ikon: kayit.ikon,
  kartSayisi: kayit.ders.kartlar.length,
  sure: kayit.sure,
}));

const QUIZ_DATA: Record<string, unknown> = Object.fromEntries(KAYITLAR.map((kayit) => [kayit.id, kayit.quiz]));
export function getQuiz(id: string): QuizData | null {
  const quiz = QUIZ_DATA[id];
  const r = toRecord(quiz);
  if (!r || !Array.isArray(r.sorular)) return null;
  return quiz as QuizData;
}

export const KATEGORILER: { label: string; ids: string[] }[] = [
  { label: "Temel İbadetler", ids: ["abdest-gusul", "namaz", "namaz-dualar", "ezan-kamet", "oruc", "zekat", "kurban", "hac-umre"] },
  { label: "İman & Akaid", ids: ["iman-esaslari", "kitaplara-iman"] },
  { label: "Ahlak & Terbiye", ids: ["nefsini-tani", "guzel-ahlak"] },
  { label: "Tarih & Siyer", ids: ["peygamberler", "sahabe-hayatlari", "siyer"] },
  { label: "Kur'an & Tecvid", ids: ["tecvid"] },
];