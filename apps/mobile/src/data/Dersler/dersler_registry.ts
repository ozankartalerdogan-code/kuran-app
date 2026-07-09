// Update this registry to add lesson cards.
// DERS_DATA, getQuiz, BASLIKLAR, DERSLER_META and KATEGORILER are derived here.
// Ikon ve sure icin tek kaynak BURASI — ders JSON'larinda ikon alani tutulmaz.
// Yeni ders eklerken KATEGORILER listesine de id eklemeyi unutma (yoksa
// "Konuya Gore" sekmesinde gorunmez).
//
// Bu dosya doğası gereği yerel JSON dersleri require ile yükler (Metro bundle).
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Kayit = { id: string; ikon: string; sure: number; kategori: string; ders: any; quiz: () => any };

// For cards that route elsewhere instead of using local lesson JSON.
type EkstraKart = { id: string; baslik: string; ikon: string; kartSayisi: number; birim: string; sure: number; route: string };

function toStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function formatRefs(
  refs: unknown,
  formatter: (item: Record<string, unknown>) => string,
): string[] {
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
  if (body.length > 0) sections.push(body.map((item) => `\u2022 ${item}`).join("\n"));
  if (symptoms.length > 0) sections.push(`Belirtiler:\n${symptoms.map((item) => `\u2022 ${item}`).join("\n")}`);
  if (treatment.length > 0) sections.push(`Neler yap\u0131labilir:\n${treatment.map((item) => `\u2022 ${item}`).join("\n")}`);
  if (practice) sections.push(`Uygulama:\n${practice}`);
  if (reflection) sections.push(`Muhasebe sorusu:\n${reflection}`);
  if (shortDua) sections.push(`K\u0131sa dua:\n${shortDua}`);
  if (quranRefs.length > 0) sections.push(`Ayet dayanaklar\u0131:\n\u2022 ${quranRefs.join("\n\u2022 ")}`);
  if (hadithRefs.length > 0) sections.push(`Hadis dayanaklar\u0131:\n\u2022 ${hadithRefs.join("\n\u2022 ")}`);

  return sections.join("\n\n");
}

// methodology.importantNotice/classificationNote varsa (ör. nefsini-tani), bu bir
// dizi tasavvufi tasnifin Kur'an'da zorunlu tek şema gibi görünmesini önlemek için
// dersin İLK kartı olarak gösterilir — aksi halde bu not yalnız JSON'da kalır,
// kullanıcı hiç görmez.
function buildMethodologyIntroCard(raw: unknown, moduleId: string) {
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

function normalizeLessonModule(raw: unknown, fallbackIcon: string) {
  const r = toRecord(raw);
  if (r?.kartlar) return raw;

  const moduleId = typeof r?.moduleId === "string" ? r.moduleId : "module";
  const baslik = typeof r?.title === "string" ? r.title : moduleId;
  const aciklama = typeof r?.subtitle === "string" ? r.subtitle : "";
  const lessons = Array.isArray(r?.lessons) ? r.lessons : [];
  const methodologyCard = buildMethodologyIntroCard(raw, moduleId);

  const lessonCards = lessons
    .map((item: unknown, index: number) => {
      const lesson = toRecord(item);
      if (!lesson) return null;
      const lessonId = typeof lesson.id === "string" ? lesson.id : `${moduleId}_k${String(index + 1).padStart(2, "0")}`;
      const lessonTitle = typeof lesson.title === "string" ? lesson.title : `Ders ${index + 1}`;
      const summary = typeof lesson.summary === "string" ? lesson.summary : "";
      const mainMessage = typeof lesson.mainMessage === "string" ? lesson.mainMessage : "";
      return {
        id: lessonId,
        tip: "metin",
        baslik: lessonTitle,
        icerik: buildModuleLessonBody(lesson),
        vurgu: mainMessage || summary || lessonTitle,
      };
    })
    .filter(Boolean);

  return {
    ders_id: moduleId,
    baslik,
    aciklama,
    ikon: fallbackIcon,
    kartlar: methodologyCard ? [methodologyCard, ...lessonCards] : lessonCards,
    quiz_havuzu_id: moduleId,
  };
}

function normalizeQuizModule(raw: unknown, fallbackId: string, fallbackTitle: string) {
  const r = toRecord(raw);
  if (r?.sorular) return raw;

  const harfler = ["A", "B", "C", "D", "E", "F"];
  const questions = r?.questions;
  const sorular = Array.isArray(questions)
    ? questions
        .map((item: unknown) => {
          const question = toRecord(item);
          if (!question) return null;
          const options = toStringList(question.options);
          const answerIndex = typeof question.correctOptionIndex === "number" ? question.correctOptionIndex : -1;
          // Geçersiz correctOptionIndex → soru elenir. Sessizce "A doğru" saymak
          // yanlış şıkkı doğru göstermek demektir; eksik soru daha az zararlıdır.
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

function sumLessonMinutes(raw: unknown): number {
  const lessons = toRecord(raw)?.lessons;
  if (!Array.isArray(lessons)) return 10;
  return lessons.reduce((total: number, item: unknown) => {
    const lesson = toRecord(item);
    const minutes = typeof lesson?.estimatedMinutes === "number" ? lesson.estimatedMinutes : 0;
    return total + minutes;
  }, 0);
}

// JSON g\u00FCvenli y\u00FCkleyici \u2014 bozuk/eksik bir dosya t\u00FCm dersler b\u00F6l\u00FCm\u00FCn\u00FC
// d\u00FC\u015F\u00FCrmesin. Thunk literal require yolunu korur (Metro statik bundle eder);
// hata olursa o ders atlan\u0131r, b\u00F6l\u00FCm ayakta kal\u0131r.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeRequire<T = any>(loader: () => T, label: string): T | null {
  try {
    const mod = loader();
    return (mod ?? null) as T | null;
  } catch (err) {
    console.warn(`[dersler] y\u00FCklenemedi, atland\u0131: ${label} \u2014`, err instanceof Error ? err.message : err);
    return null;
  }
}

// Bir dersin kullan\u0131labilir say\u0131lmas\u0131: obje + string ba\u015Fl\u0131k + en az 1 kart.
function isValidDers(ders: unknown): boolean {
  const r = toRecord(ders);
  return !!r && typeof r.baslik === "string" && Array.isArray(r.kartlar) && r.kartlar.length > 0;
}

const nefsiniTaniDersModule = safeRequire(() => require("./nefsini_tani_ders_modulu.json"), "nefsini_tani_ders_modulu");

const RAW_KAYITLAR: Kayit[] = [
  { id: "namaz",         ikon: "\uD83D\uDD4C", sure: 15, kategori: "ibadet", ders: safeRequire(() => require("./namaz_dersi.json"), "namaz_dersi"),                quiz: () => require("./namaz_quiz.json") },
  { id: "namaz-dualar",  ikon: "\uD83D\uDCFF", sure: 10, kategori: "ibadet", ders: safeRequire(() => require("./namaz_dualar_dersi.json"), "namaz_dualar_dersi"),  quiz: () => require("./namaz_dualar_quiz.json") },
  { id: "oruc",          ikon: "\uD83C\uDF19", sure:  8, kategori: "ibadet", ders: safeRequire(() => require("./oruc_dersi.json"), "oruc_dersi"),                  quiz: () => require("./oruc_quiz.json") },
  { id: "kurban",        ikon: "\uD83D\uDC11", sure: 12, kategori: "ibadet", ders: safeRequire(() => require("./kurban_dersi.json"), "kurban_dersi"),              quiz: () => require("./kurban_quiz.json") },
  { id: "hac-umre",      ikon: "\uD83D\uDD4B", sure:  9, kategori: "ibadet", ders: safeRequire(() => require("./hac_umre_dersi.json"), "hac_umre_dersi"),          quiz: () => require("./hac_umre_quiz.json") },
  { id: "iman-esaslari", ikon: "\uD83D\uDCD6", sure: 10, kategori: "akaid",  ders: safeRequire(() => require("./iman_esaslari_dersi.json"), "iman_esaslari_dersi"), quiz: () => require("./iman_esaslari_quiz.json") },
  { id: "kitaplara-iman", ikon: "\uD83D\uDCDA", sure: 8, kategori: "akaid",  ders: safeRequire(() => require("./kitaplara_iman_dersi.json"), "kitaplara_iman_dersi"), quiz: () => require("./kitaplara_iman_quiz.json") },
  {
    id: "nefsini-tani",
    ikon: "\uD83E\uDE9E",
    // Sure moduldeki estimatedMinutes toplamindan turetilir -- elle sabitlenmis 12 dk
    // gercek sureyi (~57 dk) cok dusuk gosteriyor ve "Kolaydan Zora" siralamasini bozuyordu.
    sure: sumLessonMinutes(nefsiniTaniDersModule),
    kategori: "ahlak",
    ders: nefsiniTaniDersModule ? normalizeLessonModule(nefsiniTaniDersModule, "\uD83E\uDE9E") : null,
    quiz: () => {
      const m = safeRequire(() => require("./nefsini_tani_quiz.json"), "nefsini_tani_quiz");
      return m ? normalizeQuizModule(m, "nefsini-tani", "Nefsini Tan\u0131") : null;
    },
  },
  { id: "guzel-ahlak", ikon: "\uD83E\uDD1D", sure: 12, kategori: "ahlak", ders: safeRequire(() => require("./guzel_ahlak_dersi.json"), "guzel_ahlak_dersi"), quiz: () => require("./guzel_ahlak_quiz.json") },
  { id: "peygamberler",  ikon: "\u2B50",       sure: 14, kategori: "siyer",  ders: safeRequire(() => require("./peygamber_kissalari_dersi.json"), "peygamber_kissalari_dersi"), quiz: () => require("./peygamber_kissalari_quiz.json") },
  { id: "sahabe-hayatlari", ikon: "\uD83D\uDD4A", sure: 16, kategori: "siyer", ders: safeRequire(() => require("./sahabe_hayatlari_dersi.json"), "sahabe_hayatlari_dersi"), quiz: () => require("./sahabe_hayatlari_quiz.json") },
  { id: "siyer",         ikon: "\uD83C\uDF3F", sure: 10, kategori: "siyer",  ders: safeRequire(() => require("./siyer_dersi.json"), "siyer_dersi"),                quiz: () => require("./siyer_quiz.json") },
  { id: "tecvid",        ikon: "\uD83D\uDCDC", sure: 12, kategori: "kuran",  ders: safeRequire(() => require("./tecvid_dersi.json"), "tecvid_dersi"),              quiz: () => require("./tecvid_quiz.json") },
  { id: "abdest-gusul",  ikon: "\uD83D\uDCA7", sure: 10, kategori: "ibadet", ders: safeRequire(() => require("./abdest_dersi.json"), "abdest_dersi"),              quiz: () => require("./abdest_quiz.json") },
  { id: "ezan-kamet",    ikon: "\uD83D\uDD0A", sure:  7, kategori: "ibadet", ders: safeRequire(() => require("./ezan_kamet_dersi.json"), "ezan_kamet_dersi"),      quiz: () => require("./ezan_kamet_quiz.json") },
  { id: "zekat",         ikon: "\uD83E\uDD32", sure:  7, kategori: "ibadet", ders: safeRequire(() => require("./zekat_dersi.json"), "zekat_dersi"),                quiz: () => require("./zekat_quiz.json") },
];

// Yaln\u0131zca ge\u00E7erli dersleri tut \u2192 bozuk/eksik ders t\u00FCm b\u00F6l\u00FCm\u00FC d\u00FC\u015F\u00FCrmez, sadece gizlenir.
const KAYITLAR: Kayit[] = RAW_KAYITLAR.filter((k) => {
  if (isValidDers(k.ders)) return true;
  console.warn(`[dersler] ge\u00E7ersiz/eksik ders atland\u0131: ${k.id}`);
  return false;
});

const EKSTRA_KARTLAR: EkstraKart[] = [
  { id: "elifba", baslik: "Elif-Ba", ikon: "\uD83D\uDD24", kartSayisi: 9, birim: "ders", sure: 20, route: "/elifba" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DERS_DATA: Record<string, any> = Object.fromEntries(KAYITLAR.map((k) => [k.id, k.ders]));
// Quiz JSON'ları TEMBEL: yalnız teste girince (getQuiz) yüklenir → Dersler listesi
// ve ders okuma ~340KB quiz parse'ını atlar (ilk açılış stall'unu azaltır).
const QUIZ_LOADERS = Object.fromEntries(KAYITLAR.map((k) => [k.id, k.quiz])) as Record<string, () => unknown>;
const quizCache = new Map<string, unknown>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getQuiz(id: string): any {
  if (!quizCache.has(id)) {
    const loader = QUIZ_LOADERS[id];
    quizCache.set(id, loader ? safeRequire(loader, `${id}-quiz`) : null);
  }
  return quizCache.get(id);
}
export const BASLIKLAR: Record<string, string> = Object.fromEntries(KAYITLAR.map((k) => [k.id, (k.ders?.baslik as string) ?? k.id]));

export const DERSLER_META: { id: string; baslik: string; ikon: string; kartSayisi: number; birim?: string; sure: number; route?: string }[] = [
  ...KAYITLAR.map((k) => ({
    id: k.id,
    baslik: (k.ders?.baslik as string) ?? k.id,
    ikon: k.ikon,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kartSayisi: ((k.ders?.kartlar as any[]) ?? []).length,
    sure: k.sure,
  })),
  ...EKSTRA_KARTLAR.map((e) => ({ id: e.id, baslik: e.baslik, ikon: e.ikon, kartSayisi: e.kartSayisi, birim: e.birim, sure: e.sure, route: e.route })),
];

export const KATEGORILER: { label: string; ids: string[] }[] = [
  { label: "Temel \u0130badetler", ids: ["abdest-gusul", "namaz", "namaz-dualar", "ezan-kamet", "oruc", "zekat", "kurban", "hac-umre"] },
  { label: "\u0130man & Akaid",    ids: ["iman-esaslari", "kitaplara-iman"] },
  { label: "Ahlak & Terbiye",       ids: ["nefsini-tani", "guzel-ahlak"] },
  { label: "Tarih & Siyer",         ids: ["peygamberler", "sahabe-hayatlari", "siyer"] },
  { label: "Kur'an & Elifba",       ids: ["tecvid", "elifba"] },
];
