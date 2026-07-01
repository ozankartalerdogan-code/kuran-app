// Update this registry to add lesson cards.
// DERS_DATA, QUIZ_MAP, BASLIKLAR, DERSLER_META and KATEGORILER are derived here.
//
// Bu dosya doğası gereği yerel JSON dersleri require ile yükler (Metro bundle).
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Kayit = { id: string; ikon: string; sure: number; kategori: string; ders: any; quiz: any };

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
  if (treatment.length > 0) sections.push(`Neler yapilabilir:\n${treatment.map((item) => `\u2022 ${item}`).join("\n")}`);
  if (practice) sections.push(`Uygulama:\n${practice}`);
  if (reflection) sections.push(`Muhasebe sorusu:\n${reflection}`);
  if (shortDua) sections.push(`K\u0131sa dua:\n${shortDua}`);
  if (quranRefs.length > 0) sections.push(`Ayet dayanaklar\u0131:\n\u2022 ${quranRefs.join("\n\u2022 ")}`);
  if (hadithRefs.length > 0) sections.push(`Hadis dayanaklar\u0131:\n\u2022 ${hadithRefs.join("\n\u2022 ")}`);

  return sections.join("\n\n");
}

function normalizeLessonModule(raw: any, fallbackIcon: string) {
  if (raw?.kartlar) return raw;

  const moduleId = typeof raw?.moduleId === "string" ? raw.moduleId : "module";
  const baslik = typeof raw?.title === "string" ? raw.title : moduleId;
  const aciklama = typeof raw?.subtitle === "string" ? raw.subtitle : "";
  const lessons = Array.isArray(raw?.lessons) ? raw.lessons : [];

  return {
    ders_id: moduleId,
    baslik,
    aciklama,
    ikon: fallbackIcon,
    kartlar: lessons
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
      .filter(Boolean),
    quiz_havuzu_id: moduleId,
  };
}

function normalizeQuizModule(raw: any, fallbackId: string, fallbackTitle: string) {
  if (raw?.sorular) return raw;

  const harfler = ["A", "B", "C", "D", "E", "F"];
  const sorular = Array.isArray(raw?.questions)
    ? raw.questions
        .map((item: unknown) => {
          const question = toRecord(item);
          if (!question) return null;
          const options = toStringList(question.options);
          const answerIndex = typeof question.correctOptionIndex === "number" ? question.correctOptionIndex : 0;
          const difficulty = typeof question.difficulty === "string" ? question.difficulty : "easy";
          return {
            id: typeof question.id === "string" ? question.id : "",
            konu: typeof question.lessonId === "string" ? question.lessonId : fallbackId,
            soru: typeof question.question === "string" ? question.question : "",
            secenekler: options.map((option, index) => `${harfler[index] ?? String(index + 1)}) ${option}`),
            dogru_cevap: harfler[answerIndex] ?? "A",
            aciklama: typeof question.explanation === "string" ? question.explanation : "",
            zorluk: difficulty === "hard" ? "zor" : difficulty === "medium" ? "orta" : "kolay",
            kaynak: typeof question.lessonId === "string" ? question.lessonId : fallbackTitle,
          };
        })
        .filter(Boolean)
    : [];

  return {
    quiz_id: fallbackId,
    baslik: typeof raw?.title === "string" ? raw.title : fallbackTitle,
    toplam_soru: sorular.length,
    sorular,
  };
}

function sumLessonMinutes(raw: any): number {
  if (!Array.isArray(raw?.lessons)) return 10;
  return raw.lessons.reduce((total: number, item: unknown) => {
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
const nefsiniTaniQuizModule = safeRequire(() => require("./nefsini_tani_50_soruluk_quiz.json"), "nefsini_tani_50_soruluk_quiz");

// eslint-disable-next-line @typescript-eslint/no-require-imports
const RAW_KAYITLAR: Kayit[] = [
  { id: "namaz",         ikon: "\uD83D\uDD4C", sure: 15, kategori: "ibadet", ders: safeRequire(() => require("./namaz_dersi.json"), "namaz_dersi"),                quiz: safeRequire(() => require("./namaz_quiz.json"), "namaz_quiz") },
  { id: "namaz-dualar",  ikon: "\uD83D\uDCFF", sure: 10, kategori: "ibadet", ders: safeRequire(() => require("./namaz_dualar_dersi.json"), "namaz_dualar_dersi"),  quiz: safeRequire(() => require("./namaz_dualar_quiz.json"), "namaz_dualar_quiz") },
  { id: "oruc",          ikon: "\uD83C\uDF19", sure:  8, kategori: "ibadet", ders: safeRequire(() => require("./oruc_dersi.json"), "oruc_dersi"),                  quiz: safeRequire(() => require("./oruc_quiz.json"), "oruc_quiz") },
  { id: "kurban",        ikon: "\uD83D\uDC11", sure: 12, kategori: "ibadet", ders: safeRequire(() => require("./kurban_dersi.json"), "kurban_dersi"),              quiz: safeRequire(() => require("./kurban_quiz.json"), "kurban_quiz") },
  { id: "hac-umre",      ikon: "\uD83D\uDD4B", sure:  9, kategori: "ibadet", ders: safeRequire(() => require("./hac_umre_dersi.json"), "hac_umre_dersi"),          quiz: safeRequire(() => require("./hac_umre_quiz.json"), "hac_umre_quiz") },
  { id: "iman-esaslari", ikon: "\uD83D\uDCD6", sure: 10, kategori: "akaid",  ders: safeRequire(() => require("./iman_esaslari_dersi.json"), "iman_esaslari_dersi"), quiz: safeRequire(() => require("./iman_esaslari_quiz.json"), "iman_esaslari_quiz") },
  {
    id: "nefsini-tani",
    ikon: "\uD83E\uDE9E",
    sure: sumLessonMinutes(nefsiniTaniDersModule),
    kategori: "ahlak",
    ders: nefsiniTaniDersModule ? normalizeLessonModule(nefsiniTaniDersModule, "\uD83E\uDE9E") : null,
    quiz: nefsiniTaniQuizModule ? normalizeQuizModule(nefsiniTaniQuizModule, "nefsini-tani", "Nefsini Tan\u0131") : null,
  },
  { id: "guzel-ahlak", ikon: "\uD83E\uDD1D", sure: 12, kategori: "ahlak", ders: safeRequire(() => require("./guzel_ahlak_dersi.json"), "guzel_ahlak_dersi"), quiz: safeRequire(() => require("./guzel_ahlak_quiz.json"), "guzel_ahlak_quiz") },
  { id: "peygamberler",  ikon: "\u2B50",       sure: 14, kategori: "siyer",  ders: safeRequire(() => require("./peygamber_kissalari_dersi.json"), "peygamber_kissalari_dersi"), quiz: safeRequire(() => require("./peygamber_kissalari_quiz.json"), "peygamber_kissalari_quiz") },
  { id: "sahabe-hayatlari", ikon: "\uD83D\uDD4A", sure: 16, kategori: "siyer", ders: safeRequire(() => require("./sahabe_hayatlari_dersi.json"), "sahabe_hayatlari_dersi"), quiz: safeRequire(() => require("./sahabe_hayatlari_quiz.json"), "sahabe_hayatlari_quiz") },
  { id: "siyer",         ikon: "\uD83C\uDF3F", sure: 10, kategori: "siyer",  ders: safeRequire(() => require("./siyer_dersi.json"), "siyer_dersi"),                quiz: safeRequire(() => require("./siyer_quiz.json"), "siyer_quiz") },
  { id: "tecvid",        ikon: "\uD83D\uDCDC", sure: 12, kategori: "kuran",  ders: safeRequire(() => require("./tecvid_dersi.json"), "tecvid_dersi"),              quiz: safeRequire(() => require("./tecvid_quiz.json"), "tecvid_quiz") },
  { id: "abdest-gusul",  ikon: "\uD83D\uDCA7", sure: 10, kategori: "ibadet", ders: safeRequire(() => require("./abdest_dersi.json"), "abdest_dersi"),              quiz: safeRequire(() => require("./abdest_quiz.json"), "abdest_quiz") },
  { id: "ezan-kamet",    ikon: "\uD83D\uDD0A", sure:  7, kategori: "ibadet", ders: safeRequire(() => require("./ezan_kamet_dersi.json"), "ezan_kamet_dersi"),      quiz: safeRequire(() => require("./ezan_kamet_quiz.json"), "ezan_kamet_quiz") },
  { id: "zekat",         ikon: "\uD83E\uDD32", sure:  7, kategori: "ibadet", ders: safeRequire(() => require("./zekat_dersi.json"), "zekat_dersi"),                quiz: safeRequire(() => require("./zekat_quiz.json"), "zekat_quiz") },
];

// Yaln\u0131zca ge\u00E7erli dersleri tut \u2192 bozuk/eksik ders t\u00FCm b\u00F6l\u00FCm\u00FC d\u00FC\u015F\u00FCrmez, sadece gizlenir.
const KAYITLAR: Kayit[] = RAW_KAYITLAR.filter((k) => {
  if (isValidDers(k.ders)) return true;
  console.warn(`[dersler] ge\u00E7ersiz/eksik ders atland\u0131: ${k.id}`);
  return false;
});

const EKSTRA_KARTLAR: EkstraKart[] = [
  { id: "elifba", baslik: "Elif-Ba", ikon: "\uD83D\uDD24", kartSayisi: 9, birim: "ders", sure: 20, route: "/ogren" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DERS_DATA: Record<string, any> = Object.fromEntries(KAYITLAR.map((k) => [k.id, k.ders]));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const QUIZ_MAP: Record<string, any> = Object.fromEntries(KAYITLAR.map((k) => [k.id, k.quiz]));
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
  { label: "\u0130man & Akaid",    ids: ["iman-esaslari"] },
  { label: "Ahlak & Terbiye",       ids: ["nefsini-tani", "guzel-ahlak"] },
  { label: "Tarih & Siyer",         ids: ["peygamberler", "sahabe-hayatlari", "siyer"] },
  { label: "Kur'an & Elifba",       ids: ["tecvid", "elifba"] },
];

