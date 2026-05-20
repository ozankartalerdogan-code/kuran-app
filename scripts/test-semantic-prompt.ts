import * as dotenv from "dotenv";
import assert from "node:assert/strict";
import {
  classifySemanticWarningSeverity,
  detectMechanicalOrAwkwardTurkish,
  detectMissingKeyRelation,
  detectPossibleSemanticDrift,
  detectSevereMechanicalOrAwkwardTurkish,
  detectTooGenericSummary,
  detectWeakSummary,
  getAdditionalSemanticWarnings,
  getSafeDeterministicSemanticSummary,
  selectSemanticSummaryForDisplay,
  shouldUseSafeSemanticFallback
} from "@quran-app/core";

dotenv.config({ path: ".env.local" });

import {
  buildFallbackAyahSemanticSummary,
  buildAyahSemanticAnalysisPrompt,
  formatListForPrompt,
  parseAyahSemanticAnalysisResult,
  parseAyahSemanticAnalysisResultDetailed,
  runHybridSemanticAnalysisMock,
  runHybridSemanticAnalysisWithProvider
} from "../apps/web/src/lib/analysis/semanticPrompt.ts";
import {
  buildUnavailableSemanticSummary,
  runSelectedSemanticAnalysisWithProvider,
  selectSemanticProviderSummary
} from "../apps/web/src/lib/analysis/semanticSelectedSummary.ts";
import {
  defaultSemanticAnalysisConfig,
  getSemanticAnalysisConfig
} from "../apps/web/src/lib/analysis/semanticConfig.ts";
import { createGeminiSemanticProvider } from "../apps/web/src/lib/analysis/geminiSemanticProvider.ts";
import { createGroqSemanticProvider } from "../apps/web/src/lib/analysis/groqSemanticProvider.ts";

type TestCase = {
  name: string;
  run: () => void | Promise<void>;
};

// Test helpers

const sampleInput = {
  ayahText: "Ø§Ù‡Ø¯ÙÙ†ÙØ§ Ø§Ù„ØµÙ‘ÙØ±ÙØ§Ø·Ù Ø§Ù„Ù…ÙØ³ØªÙÙ‚ÙÙŠÙ…Ù",
  translation: "Bizi dosdoÄŸru yola ilet.",
  themes: ["hidayet", "dua"],
  roots: ["Ù‡Ø¯ÙŠ", "ØµØ±Ø§Ø·"],
  participants: ["kul", "Allah"]
};

const sampleInputWithDuplicateLists = {
  ayahText: "???????????????? ???????????????? ???????????????????? ??????????????????????",
  translation: "Yaln??z sana kulluk eder ve yaln??z senden yard?m dileriz.",
  themes: ["ibadet", "dua", "ibadet"],
  roots: ["??????", "??????", "??????"],
  participants: ["Allah"],
  wordAnalysisCount: 6
};

const expectedFallbackSummary = "Bizi dosdoÄŸru yola ilet.";
const expectedGeneralFallbackSummary = "Hamd, Ã¢lemlerin Rabbi Allahâ€™a mahsustur.";
const validAiSummary =
  "Bu ayet, kulun Allahâ€™tan dosdoÄŸru yola iletilmeyi istemesini kÄ±sa ve aÃ§Ä±k biÃ§imde ifade eder.";
const validProviderSummary =
  "Bu ayet, kulun doÄŸru yola yÃ¶nelme isteÄŸini kÄ±sa biÃ§imde ifade eder.";
const invalidExplanatoryResponse = 'Ä°ÅŸte sonuÃ§:\n{"summary":"abc"}';

const tests: TestCase[] = [];

function addTest(name: string, run: () => void | Promise<void>): void {
  tests.push({ name, run });
}

function expectFallbackOutput(result: unknown): void {
  assert.deepEqual(result, {
    result: {
      summary: expectedFallbackSummary
    },
    source: "fallback"
  });
}

function extractDetectedList(prompt: string, label: string): string[] {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = prompt.match(new RegExp(`- ${escapedLabel}: (.+)`));

  if (!match) {
    return [];
  }

  const value = match[1].trim();
  return value === "none" ? [] : value.split(", ").filter(Boolean);
}

async function withFetchMock(
  mockFetch: typeof globalThis.fetch,
  run: () => Promise<void>
): Promise<void> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;

  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// Config tests

addTest("semantic config returns expected default values", () => {
  assert.deepEqual(getSemanticAnalysisConfig(), {
    provider: "none",
    model: "gemini-2.5-flash-lite",
    temperature: 0.2,
    maxTokens: 120,
    enableFallback: true
  });
});

addTest("semantic config default object is type-compatible at runtime shape level", () => {
  assert.equal(typeof defaultSemanticAnalysisConfig.provider, "string");
  assert.equal(typeof defaultSemanticAnalysisConfig.model, "string");
  assert.equal(typeof defaultSemanticAnalysisConfig.temperature, "number");
  assert.equal(typeof defaultSemanticAnalysisConfig.maxTokens, "number");
  assert.equal(typeof defaultSemanticAnalysisConfig.enableFallback, "boolean");
});

addTest("semantic config enableFallback defaults to true", () => {
  assert.equal(getSemanticAnalysisConfig().enableFallback, true);
});

// Gemini provider tests

addTest("Gemini provider throws when apiKey is empty", () => {
  assert.throws(() => createGeminiSemanticProvider({ apiKey: "" }), /Gemini API key is required\./u);
});

addTest("Gemini provider is created with a dummy apiKey", () => {
  const provider = createGeminiSemanticProvider({ apiKey: "dummy-key" });
  assert.ok(provider);
});

addTest("Gemini provider exposes generateSemanticAnalysis", () => {
  const provider = createGeminiSemanticProvider({ apiKey: "dummy-key" });
  assert.equal(typeof provider.generateSemanticAnalysis, "function");
});

addTest("Gemini provider returns raw text for a successful response", async () => {
  const provider = createGeminiSemanticProvider({ apiKey: "dummy-key" });

  await withFetchMock(
    (async () =>
      ({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: '{"summary":"abc"}' }]
              }
            }
          ]
        })
      }) as Response) as typeof globalThis.fetch,
    async () => {
      const result = await provider.generateSemanticAnalysis("test prompt");
      assert.equal(result, '{"summary":"abc"}');
    }
  );
});

addTest("Gemini provider throws on HTTP error", async () => {
  const provider = createGeminiSemanticProvider({ apiKey: "dummy-key" });

  await withFetchMock(
    (async () =>
      ({
        ok: false,
        status: 401,
        json: async () => ({})
      }) as Response) as typeof globalThis.fetch,
    async () => {
      await assert.rejects(
        provider.generateSemanticAnalysis("test prompt"),
        /Gemini request failed with status 401\./u
      );
    }
  );
});

addTest("Gemini provider throws when response text is empty", async () => {
  const provider = createGeminiSemanticProvider({ apiKey: "dummy-key" });

  await withFetchMock(
    (async () =>
      ({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: "   " }]
              }
            }
          ]
        })
      }) as Response) as typeof globalThis.fetch,
    async () => {
      await assert.rejects(
        provider.generateSemanticAnalysis("test prompt"),
        /Gemini response did not contain a usable text payload\./u
      );
    }
  );
});

// Groq provider tests

addTest("Groq provider throws when apiKey is empty", () => {
  assert.throws(() => createGroqSemanticProvider({ apiKey: "" }), /GROQ_API_KEY is required/u);
});

addTest("Groq provider is created with a dummy apiKey", () => {
  const provider = createGroqSemanticProvider({ apiKey: "dummy-key" });
  assert.ok(provider);
});

addTest("Groq provider exposes generateSemanticAnalysis", () => {
  const provider = createGroqSemanticProvider({ apiKey: "dummy-key" });
  assert.equal(typeof provider.generateSemanticAnalysis, "function");
});

// List formatting tests

addTest("formatListForPrompt returns none for empty input", () => {
  assert.equal(formatListForPrompt([]), "none");
  assert.equal(formatListForPrompt(undefined), "none");
});

addTest("formatListForPrompt removes duplicates and empty items", () => {
  assert.equal(
    formatListForPrompt([" hidayet ", "", "dua", "hidayet", "   ", "dua", undefined as unknown as string]),
    "hidayet, dua"
  );
});

// Prompt builder tests

addTest("prompt builder includes ayah text and translation", () => {
  const prompt = buildAyahSemanticAnalysisPrompt(sampleInput);
  assert.match(prompt, /Ayah Arabic\/Text: Ø§Ù‡Ø¯ÙÙ†ÙØ§ Ø§Ù„ØµÙ‘ÙØ±ÙØ§Ø·Ù Ø§Ù„Ù…ÙØ³ØªÙÙ‚ÙÙŠÙ…Ù/u);
  assert.match(prompt, /Turkish translation: Bizi dosdoÄŸru yola ilet\./u);
});

addTest("prompt builder formats themes and roots", () => {
  const prompt = buildAyahSemanticAnalysisPrompt(sampleInputWithDuplicateLists);
  const themes = extractDetectedList(prompt, "Detected themes");
  const roots = extractDetectedList(prompt, "Detected roots");

  assert.ok(themes.length >= 1);
  assert.ok(themes.length <= 2);
  assert.ok(themes.includes("ibadet"));
  assert.equal(roots.length, 1);
  assert.equal(new Set(roots).size, roots.length);
});

addTest("prompt builder writes none for empty participants", () => {
  const prompt = buildAyahSemanticAnalysisPrompt({
    ayahText: "Ù…ÙÙ°Ù„ÙÙƒÙ ÙŠÙÙˆÛ¡Ù…Ù Ù±Ù„Ø¯Ù‘ÙÙŠÙ†Ù",
    translation: "Din gÃ¼nÃ¼nÃ¼n sahibidir.",
    themes: ["ahiret"],
    roots: ["Ø¯ÙŠÙ†"],
    participants: []
  });

  assert.match(prompt, /Detected participants: none/u);
});

addTest("prompt builder writes none for empty themes and roots", () => {
  const prompt = buildAyahSemanticAnalysisPrompt({
    ayahText: "Ø¨ÙØ³Ù’Ù…Ù Ø§Ù„Ù„Ù‘ÙÙ‡Ù Ø§Ù„Ø±Ù‘ÙØ­Ù’Ù…ÙÙ°Ù†Ù Ø§Ù„Ø±Ù‘ÙØ­ÙÙŠÙ…Ù",
    translation: "Rahman ve Rahim olan Allahâ€™Ä±n adÄ±yla.",
    themes: [],
    roots: [],
    participants: undefined
  });

  assert.match(prompt, /Detected themes: none/u);
  assert.match(prompt, /Detected roots: none/u);
  assert.match(prompt, /Detected participants: none/u);
});

addTest("prompt builder includes strict JSON instructions", () => {
  const prompt = buildAyahSemanticAnalysisPrompt({
    ayahText: "Ù‚ÙÙ„Ù’ Ù‡ÙÙˆÙ Ø§Ù„Ù„Ù‘ÙÙ‡Ù Ø£ÙØ­ÙØ¯ÙŒ",
    translation: "De ki: O Allah birdir.",
    themes: ["tevhid"],
    roots: ["Ø§Ù„Ù‡", "Ø§Ø­Ø¯"],
    participants: ["Allah"]
  });

  assert.match(prompt, /Return ONLY valid JSON\./u);
  assert.match(prompt, /Do NOT wrap the JSON in markdown\./u);
  assert.match(prompt, /Do NOT include explanations outside JSON\./u);
});

addTest("prompt builder asks for a short Turkish single-sentence semantic explanation", () => {
  const prompt = buildAyahSemanticAnalysisPrompt(sampleInput);
  assert.match(prompt, /Generate a short Turkish semantic explanation/u);
  assert.match(prompt, /This is not a translation copy and not tafsir\./u);
  assert.match(prompt, /Prefer 1 concise Turkish sentence\./u);
  assert.match(
    prompt,
    /If preserving explicit key relations would become awkward or incomplete, use 2 short Turkish sentences\./u
  );
  assert.match(prompt, /Use at most 3 short Turkish sentences\./u);
});

addTest("prompt builder tells the model not to move meta phrases into the summary", () => {
  const prompt = buildAyahSemanticAnalysisPrompt(sampleInput);
  assert.match(prompt, /The summary must be a natural Turkish sentence for end users\./u);
  assert.match(prompt, /Do NOT include labels, prefixes, explanations, or prompt instructions inside the summary\./u);
  assert.ok(prompt.includes('Do NOT write phrases like "Ayetin k\u0131sa anlam analizi", "Bu analiz", or "Verilen verilere g\u00f6re".'));



  assert.match(
    prompt,
    /Do NOT use extra sentences to add tafsir, advice, historical context, legal rulings, theological expansion, or modern applications\./u
  );
});

addTest('prompt builder discourages opening with "Bu ayet"', () => {
  const prompt = buildAyahSemanticAnalysisPrompt(sampleInput);
  assert.match(prompt, /Do NOT start with "Bu ayet" unless unavoidable\./u);
  assert.match(
    prompt,
    /Do NOT describe the verse as a phrase, formula, wording, or expression unless the translation explicitly does so\./u
  );
});

addTest("prompt builder says the summary must be directly supported by translation and metadata", () => {
  const prompt = buildAyahSemanticAnalysisPrompt(sampleInput);
  assert.match(prompt, /The summary must be directly supported by the Turkish translation and provided metadata\./u);
  assert.match(prompt, /Use themes only as weak guidance, not as independent evidence\./u);
  assert.match(prompt, /Use roots only if they clearly support the meaning in the translation\./u);
  assert.match(prompt, /Do not derive new theological claims from roots alone\./u);
  assert.match(prompt, /If the themes or roots seem insufficient, rely primarily on the translation/u);
  assert.match(prompt, /Semantic compression is allowed only when the key meaning relations remain intact\./u);
  assert.ok(prompt.includes('Do NOT add ungrounded intensifiers or expansions such as "s\u0131n\u0131rs\u0131z" unless they are explicit in the provided data.'));
  assert.match(prompt, /Do NOT borrow relation words from neighboring examples or earlier ayahs unless they are explicitly supported by the current ayah data\./u);
});

addTest("prompt builder discourages normative language when translation does not explicitly support it", () => {
  const prompt = buildAyahSemanticAnalysisPrompt(sampleInput);
  assert.match(prompt, /Do not convert statements into commands or obligations\./u);
  assert.match(prompt, /Do not use normative phrases such as "gerekir"/u);
  assert.ok(prompt.includes('"gerekti\u011fi", "zorunludur", "emredilir", or "farzd\u0131r"'));


  assert.match(prompt, /Prefer descriptive wording over prescriptive wording\./u);
  assert.match(prompt, /If the translation states attribution or fact, summarize it as attribution or fact, not as an obligation\./u);
});

addTest("prompt builder discourages interpretive over-explanation", () => {
  const prompt = buildAyahSemanticAnalysisPrompt(sampleInput);
  assert.match(prompt, /Do not write phrases that imply response, causality, or explanation unless explicit in the translation\./u);
  assert.match(prompt, /Avoid phrases such as "cevap olarak"/u);
  assert.ok(prompt.includes('"sonu\u00e7 olarak", "anlam\u0131na gelir", or "bir ger\u00e7ektir" unless directly necessary.'));



  assert.match(prompt, /Do not over-explain short ayahs\./u);
});

addTest("prompt builder preserves translation mood and discourages semantic drift", () => {
  const prompt = buildAyahSemanticAnalysisPrompt(sampleInput);
  assert.match(
    prompt,
    /Preserve the mood of the translation; keep who is addressing whom, and whether the line is a supplication, command, statement, warning, or attribution\./u
  );
  assert.match(
    prompt,
    /If the translation contains a command or supplication, preserve that orientation or state its directedness explicitly; do not flatten it into a neutral statement\./u
  );
  assert.match(prompt, /Do NOT erase an explicit subject, addressee, or source named in the translation\./u);
  assert.match(prompt, /If exclusivity is explicit, preserve exclusivity\./u);
  assert.match(prompt, /If a condition and its result are explicit, preserve both sides in concise form\./u);
  assert.match(prompt, /If a command and its stated reason are explicit, preserve both in concise form\./u);
  assert.match(
    prompt,
    /Do not add cause, effect, consequence, or psychological explanation unless it is explicit in the translation\./u
  );
  assert.match(prompt, /Do NOT introduce free-will, moral motivation, or psychological capacity claims unless they are explicit in the provided data\./u);
  assert.ok(
    prompt.includes(
      'Avoid tendencies such as "etkilemiştir", "sebep olur", "sonuçlanır", "yol açar", "gösterir", "ifade eder", "ortaya koyar", or "bir gerçektir" when the translation does not state them.'
    )
  );
  assert.match(
    prompt,
    /Keep the wording strictly inside the semantic boundary of the ayah./u
  );
  assert.match(
    prompt,
    /Do NOT add new actors, motives, causes, consequences, or hidden meanings unless explicit in the provided data\./u
  );
});

addTest("prompt builder requires semantic paraphrase instead of meal repetition", () => {
  const prompt = buildAyahSemanticAnalysisPrompt(sampleInput);
  assert.match(prompt, /Do NOT copy the Turkish translation verbatim\./u);
  assert.match(
    prompt,
    /Do NOT stay too close to the Turkish translation with only trivial word replacement, word reordering, shortening, or surface cleanup\./u
  );
  assert.ok(prompt.includes('Meal k\u0131sa ve a\u00e7\u0131k olsa bile aynen tekrar etme; onu k\u0131sa bir semantik a\u00e7\u0131klamaya d\u00f6n\u00fc\u015ft\u00fcr.'));
  assert.ok(
    prompt.includes(
      'Anlam\u0131 koruyarak do\u011fal ve ili\u015fki odakl\u0131 k\u0131sa bir c\u00fcmle kur; gerekirse a\u00e7\u0131k ili\u015fkiyi korumak i\u00e7in iki k\u0131sa c\u00fcmle kullan. Anlam de\u011fi\u015fmemeli, kip korunmal\u0131, yeni bilgi eklenmemeli, temel ili\u015fki d\u00fc\u015f\u00fcr\u00fclmemeli.'
    )
  );
});
addTest("prompt builder explicitly forbids meal-copy semantic summaries", () => {
  const prompt = buildAyahSemanticAnalysisPrompt(sampleInput);
  assert.match(prompt, /Do NOT copy the Turkish translation verbatim\./u);
  assert.match(
    prompt,
    /Do NOT stay too close to the Turkish translation with only trivial word replacement, word reordering, shortening, or surface cleanup\./u
  );
  assert.match(prompt, /Prefer a short semantic paraphrase over a direct translation repeat\./u);
  assert.match(
    prompt,
    /If the translation is short, do not simply restate it; rewrite it into a safe semantic sentence that clarifies the meaning focus without crossing into tafsir\./u
  );
  assert.match(prompt, /Do NOT return the meal unchanged, even when it is short and clear\./u);
  assert.match(prompt, /Translation copy is forbidden\./u);
  assert.match(prompt, /Tafsir expansion is forbidden\./u);
});

addTest("prompt builder requires semantic completeness without tafsir expansion", () => {
  const prompt = buildAyahSemanticAnalysisPrompt(sampleInput);
  assert.match(prompt, /Do NOT achieve brevity by dropping an explicit core meaning element\./u);
  assert.match(
    prompt,
    /If the translation contains more than one explicit core semantic element, preserve them in compressed form rather than removing one entirely\./u
  );
  assert.match(
    prompt,
    /Preserve explicit key relations when they are present in the translation, such as subject-object, addressee, exclusivity, condition-result, command-reason, request-target, or paired attributes\./u
  );
});

addTest("prompt builder discourages mechanical weak phrasing", () => {
  const prompt = buildAyahSemanticAnalysisPrompt(sampleInput);
  assert.ok(
    prompt.includes(
      'Avoid weak or formulaic phrasings such as "s\u00f6ylemektedir", "bir ger\u00e7ek", "ger\u00e7e\u011fini hat\u0131rlay\u0131n", "deneyimleyecektir", "kullan\u0131l\u0131r", or "kullan\u0131lan ibare" unless the translation clearly requires that wording.'
    )
  );
});
addTest("smoke warning helper flags possible semantic drift phrases", () => {
  assert.equal(
    detectPossibleSemanticDrift("Allah’ın merhametinin sınırsız olduğu hatırlatılır."),
    true
  );
  assert.equal(
    detectPossibleSemanticDrift(
      "Allah’ın mührü, insanların kalplerini kapatarak onların iyilik yapma isteğini engeller."
    ),
    true
  );
  assert.equal(
    detectPossibleSemanticDrift(
      "Rahmân ve Rahîm'in vasfı, dua ve yardım beklentisinin nihai muhatabıdır.",
      "1:3"
    ),
    true
  );
  assert.equal(
    detectPossibleSemanticDrift(
      "Allah’ın mührü, insanların kalplerini kapatarak iradesini belirlemiştir.",
      "2:7"
    ),
    true
  );
  assert.equal(
    detectPossibleSemanticDrift(
      "Allah’ın koruması altında olan kalpler mühürlenmiştir.",
      "2:7"
    ),
    true
  );
});

addTest("smoke warning helper flags missing key relations for known samples", () => {
  assert.equal(
    detectMissingKeyRelation("8:46", "Sabredenlerle Allah’ın beraber olduğu vurgulanır."),
    true
  );
  assert.equal(detectMissingKeyRelation("2:173", "Allah merhametlidir."), true);
  assert.equal(detectMissingKeyRelation("1:5a", "Sana kulluk ediyoruz."), true);
  assert.equal(
    detectMissingKeyRelation("2:7", "Allah’ın mührü, insanların kalplerini kapatmıştır."),
    true
  );
});

addTest("smoke warning helper flags generic and awkward summaries", () => {
  assert.equal(detectTooGenericSummary("Allah merhametlidir."), true);
  assert.equal(
    detectTooGenericSummary("Allah’ın bağışlayıcılığı ve merhameti vardır.", "2:173"),
    true
  );
  assert.equal(
    detectTooGenericSummary("Allah’ın merhameti ve bağışlayıcılığı vardır.", "2:173"),
    true
  );
  assert.equal(detectMechanicalOrAwkwardTurkish("Allah’ın merhameti bir gerçek."), true);
  assert.equal(detectMechanicalOrAwkwardTurkish("Her nefis ölümü deneyimleyecektir."), true);
  assert.equal(
    detectMechanicalOrAwkwardTurkish("Düzenli yolda rehberlik isteği Allah'a yönelir."),
    true
  );
  assert.equal(
    detectSevereMechanicalOrAwkwardTurkish(
      "Sabredenlerle birlikte Allah’ın olduğu bilgisini sakınmak için sabredin.",
      "8:46"
    ),
    true
  );
});

addTest("smoke warning helper flags weak summaries for sample-specific blind spots", () => {
  assert.equal(
    detectWeakSummary("Allah’ın mührü, insanların kalplerine konulmuştur.", "2:7"),
    true
  );
  assert.equal(
    detectWeakSummary("Düzenli yolda rehberlik isteği Allah'a yönelir.", "1:6"),
    true
  );
  assert.equal(detectWeakSummary("Allah’ın adıyla başlanır.", "1:1"), true);
});

addTest("smoke warning helper combines new warning types", () => {
  const warnings = getAdditionalSemanticWarnings({
    sampleKey: "2:173",
    summary: "Allah’ın merhameti sınırsız bir gerçek.",
    translation: "Allah bağışlayandır, merhamet edendir."
  });

  assert.ok(warnings.includes("possible-semantic-drift"));
  assert.ok(warnings.includes("missing-key-relation"));
  assert.ok(warnings.includes("mechanical-or-awkward-turkish"));
});

addTest("smoke warning helper combines weak-summary with other sample-specific warnings", () => {
  const warnings = getAdditionalSemanticWarnings({
    sampleKey: "2:7",
    summary: "Allah’ın mührü, insanların kalplerine konulmuştur.",
    translation: "Allah onların kalplerini mühürlemiştir."
  });

  assert.ok(warnings.includes("weak-summary"));
  assert.ok(
    getAdditionalSemanticWarnings({
      sampleKey: "2:7",
      summary: "Allah’ın kalplerini mühürlediği bilinir.",
      translation: "Allah onların kalplerini mühürlemiştir."
    }).includes("weak-summary")
  );
});

addTest("smoke warning helper emits severe mechanical warning for broken 8:46 phrasing", () => {
  const warnings = getAdditionalSemanticWarnings({
    sampleKey: "8:46",
    summary: "Sabredenlerle birlikte Allah’ın olduğu bilgisini sakınmak için sabredin.",
    translation: "Sabredin, çünkü Allah sabredenlerle beraberdir."
  });

  assert.ok(warnings.includes("severe-mechanical-or-awkward-turkish"));
});

addTest("safe deterministic summary fixture returns expected smoke sample output", () => {
  assert.equal(
    getSafeDeterministicSemanticSummary("8:46"),
    "Zorluk karşısında sabır emredilir. Allah’ın sabredenlerle beraber olduğu bildirilir."
  );
  assert.equal(
    getSafeDeterministicSemanticSummary("2:173"),
    "Zorunluluk hâlinde kalan kimse için bir ruhsat alanı tanınır. Sınırı aşmayan kimse için bağış ve merhamet kapısı açık tutulur."
  );
  assert.equal(
    getSafeDeterministicSemanticSummary("1:5"),
    "Kulluk ve yardım isteği yalnız Allah’a yöneltilir."
  );
  assert.equal(getSafeDeterministicSemanticSummary("999:1"), null);
});

addTest("warning severity classification prioritizes severe semantic issues", () => {
  assert.equal(classifySemanticWarningSeverity([]), "none");
  assert.equal(classifySemanticWarningSeverity(["mechanical-or-awkward-turkish"]), "low");
  assert.equal(classifySemanticWarningSeverity(["weak-summary"]), "medium");
  assert.equal(classifySemanticWarningSeverity(["too-close-to-translation"]), "medium");
  assert.equal(classifySemanticWarningSeverity(["missing-key-relation"]), "high");
  assert.equal(
    classifySemanticWarningSeverity(["mechanical-or-awkward-turkish", "too-generic-summary"]),
    "high"
  );
});

addTest("safe fallback decision triggers only for severe semantic warnings", () => {
  assert.deepEqual(shouldUseSafeSemanticFallback(["missing-key-relation"]), {
    shouldUse: true,
    severity: "high",
    triggeringWarnings: ["missing-key-relation"],
    reasonCategory: "severe"
  });
  assert.deepEqual(shouldUseSafeSemanticFallback(["possible-semantic-drift", "weak-summary"]), {
    shouldUse: true,
    severity: "high",
    triggeringWarnings: ["possible-semantic-drift"],
    reasonCategory: "severe"
  });
  assert.deepEqual(shouldUseSafeSemanticFallback(["mechanical-or-awkward-turkish"]), {
    shouldUse: false,
    severity: "low",
    triggeringWarnings: [],
    reasonCategory: "none"
  });
  assert.deepEqual(shouldUseSafeSemanticFallback(["severe-mechanical-or-awkward-turkish"]), {
    shouldUse: true,
    severity: "high",
    triggeringWarnings: ["severe-mechanical-or-awkward-turkish"],
    reasonCategory: "severe"
  });
});

addTest("selected semantic summary uses deterministic fallback for severe warnings", () => {
  const sabirSelection = selectSemanticSummaryForDisplay({
    sampleKey: "8:46",
    aiSummary: "Sabredenlerle Allah’ın beraberliği vurgulanır.",
    warnings: ["missing-key-relation"]
  });

  assert.equal(sabirSelection.selectedSource, "safe_deterministic");
  assert.equal(
    sabirSelection.selectedSummary,
    "Zorluk karşısında sabır emredilir. Allah’ın sabredenlerle beraber olduğu bildirilir."
  );

  const bagislamaSelection = selectSemanticSummaryForDisplay({
    sampleKey: "2:173",
    aiSummary: "Allah’ın bağışlayıcılığı ve merhameti vardır.",
    warnings: ["missing-key-relation", "too-generic-summary"]
  });

  assert.equal(bagislamaSelection.selectedSource, "safe_deterministic");
  assert.equal(
    bagislamaSelection.selectedSummary,
    "Zorunluluk hâlinde kalan kimse için bir ruhsat alanı tanınır. Sınırı aşmayan kimse için bağış ve merhamet kapısı açık tutulur."
  );
});

addTest("selected semantic summary falls back safely on semantic drift but keeps AI for low-only warnings", () => {
  const driftSelection = selectSemanticSummaryForDisplay({
    sampleKey: "1:3",
    aiSummary: "Rahmân ve Rahîm'in vasfı, dua ve yardım beklentisinin nihai muhatabıdır.",
    warnings: ["possible-semantic-drift"]
  });

  assert.equal(driftSelection.selectedSource, "safe_deterministic");
  assert.equal(driftSelection.triggeringWarnings[0], "possible-semantic-drift");

  const lowOnlySelection = selectSemanticSummaryForDisplay({
    sampleKey: "1:1",
    aiSummary: "Allah’ın adıyla başlanır.",
    warnings: ["mechanical-or-awkward-turkish"]
  });

  assert.equal(lowOnlySelection.selectedSource, "ai");
  assert.equal(lowOnlySelection.selectedSummary, "Allah’ın adıyla başlanır.");

  const cleanSelection = selectSemanticSummaryForDisplay({
    sampleKey: "1:5b",
    aiSummary: "Yardım isteğinin nihai adresi yalnız Allah'tır.",
    warnings: []
  });

  assert.equal(cleanSelection.selectedSource, "ai");
  assert.equal(cleanSelection.selectedSummary, "Yardım isteğinin nihai adresi yalnız Allah'tır.");
});

addTest("selected semantic summary falls back safely on severe mechanical breakdowns", () => {
  const severeMechanicalSelection = selectSemanticSummaryForDisplay({
    sampleKey: "8:46",
    aiSummary: "Sabredenlerle birlikte Allah’ın olduğu bilgisini sakınmak için sabredin.",
    warnings: ["mechanical-or-awkward-turkish", "severe-mechanical-or-awkward-turkish"]
  });

  assert.equal(severeMechanicalSelection.selectedSource, "safe_deterministic");
  assert.equal(
    severeMechanicalSelection.selectedSummary,
    "Zorluk karşısında sabır emredilir. Allah’ın sabredenlerle beraber olduğu bildirilir."
  );
  assert.ok(
    severeMechanicalSelection.triggeringWarnings.includes("severe-mechanical-or-awkward-turkish")
  );
});

addTest("medium quality warnings select deterministic summaries when available", () => {
  const tooCloseSelection = selectSemanticSummaryForDisplay({
    sampleKey: "2:6",
    aiSummary: "İnkâr edenler için fark etmez, uyarsan da uyarmasan da inanmazlar.",
    warnings: ["too-close-to-translation"]
  });

  assert.equal(tooCloseSelection.selectedSource, "safe_deterministic");
  assert.equal(
    tooCloseSelection.selectedSummary,
    "Uyarı karşısında kapanmış inkâr tavrının değişmediği bildirilir."
  );
  assert.match(tooCloseSelection.selectionReason, /medium quality warnings with safe summary/u);

  const weakSelection = selectSemanticSummaryForDisplay({
    sampleKey: "1:1",
    aiSummary: "Allah'?n ad?yla ba?lan?r.",
    warnings: ["weak-summary"]
  });

  assert.equal(weakSelection.selectedSource, "safe_deterministic");
  assert.match(weakSelection.selectionReason, /medium quality warnings with safe summary/u);
});

addTest("app semantic selection bridge uses deterministic fallback for high warnings", () => {
  const selection = selectSemanticProviderSummary({
    verseKey: "2:173",
    translation: "Allah baÄŸÄ±ÅŸlayandÄ±r, merhamet edendir.",
    semanticOutput: {
      result: {
        summary: "Allah'Ä±n baÄŸÄ±ÅŸlayÄ±cÄ±lÄ±ÄŸÄ± ve merhameti vardÄ±r."
      },
      source: "ai"
    }
  });

  assert.equal(selection.selectedSource, "safe_deterministic");
  assert.match(selection.reason, /severe warnings/u);
  assert.ok(selection.warnings.includes("missing-key-relation"));
});

addTest("app semantic selection bridge uses deterministic fallback for medium warnings when available", () => {
  const selection = selectSemanticProviderSummary({
    verseKey: "1:1",
    translation: "Rahmân ve Rahîm olan Allah'ın adıyla.",
    semanticOutput: {
      result: {
        summary: "Allah'ın adıyla başlanır."
      },
      source: "ai"
    }
  });

  assert.equal(selection.selectedSource, "safe_deterministic");
  assert.match(selection.reason, /medium quality warnings with safe summary/u);
  assert.ok(selection.warnings.includes("weak-summary"));
});

addTest("app semantic selection bridge replaces combined 1:5 normative output with deterministic safe summary", () => {
  const selection = selectSemanticProviderSummary({
    verseKey: "1:5",
    translation: "Ancak sana ibadet ederiz ve ancak senden yardım dileriz.",
    semanticOutput: {
      result: {
        summary: "İbadet, yalnızca Allah'a yönelir ve Allah'tan yardım dilemek gerekir."
      },
      source: "ai"
    }
  });

  assert.equal(selection.selectedSource, "safe_deterministic");
  assert.equal(selection.selectedSummary, "Kulluk ve yardım isteği yalnız Allah’a yöneltilir.");
  assert.ok(selection.warnings.includes("possible-semantic-drift"));
});

addTest("app semantic selection bridge keeps AI when warnings are clean", () => {
  const selection = selectSemanticProviderSummary({
    verseKey: "1:5a",
    translation: "YalnÄ±z sana kulluk ederiz.",
    semanticOutput: {
      result: {
        summary: "Kulluk yÃ¶neliÅŸi yalnÄ±z Allah'a tahsis edilir."
      },
      source: "ai"
    }
  });

  assert.equal(selection.selectedSource, "ai");
  assert.equal(selection.selectedSummary, "Kulluk yÃ¶neliÅŸi yalnÄ±z Allah'a tahsis edilir.");
});

addTest("app semantic selection bridge keeps AI when safe summary is unavailable", () => {
  const selection = selectSemanticProviderSummary({
    verseKey: "999:1",
    translation: "KÄ±sa bir meal.",
    semanticOutput: {
      result: {
        summary: "KÄ±sa ama yÃ¼zeye yakÄ±n bir Ã¶zet."
      },
      source: "ai"
    },
    additionalWarnings: ["too-close-to-translation"]
  });

  assert.equal(selection.selectedSource, "ai");
  assert.match(selection.reason, /safe deterministic summary unavailable/u);
});

addTest("app semantic selection bridge replaces provider fallback with deterministic safe summary when available", () => {
  const selection = selectSemanticProviderSummary({
    verseKey: "2:7",
    translation: "Allah onların kalplerini ve kulaklarını mühürlemiştir; gözlerinde de perde vardır.",
    semanticOutput: {
      result: {
        summary:
          "Allah onların kalplerini ve kulaklarını mühürlemiştir; gözlerinde de perde vardır ve onlar için büyük azap vardır."
      },
      source: "fallback"
    }
  });

  assert.equal(selection.selectedSource, "safe_deterministic");
  assert.equal(
    selection.selectedSummary,
    "Kalp, işitme ve görme alanlarının kapanması inkâr tavrıyla ilişkilendirilir."
  );
  assert.equal(
    selection.rawSummary,
    "Allah onların kalplerini ve kulaklarını mühürlemiştir; gözlerinde de perde vardır ve onlar için büyük azap vardır."
  );
  assert.match(selection.reason, /provider fallback replaced by safe deterministic summary/u);
  assert.equal(selection.status, "ok");
});

addTest("app semantic selection bridge preserves provider fallback when safe summary is unavailable", () => {
  const selection = selectSemanticProviderSummary({
    verseKey: "999:1",
    translation: "Kısa bir meal.",
    semanticOutput: {
      result: {
        summary: "Uzun olmayan bir fallback özeti."
      },
      source: "fallback"
    }
  });

  assert.equal(selection.selectedSource, "fallback");
  assert.equal(selection.selectedSummary, "Uzun olmayan bir fallback özeti.");
  assert.equal(selection.rawSummary, "Uzun olmayan bir fallback özeti.");
  assert.match(selection.reason, /fallback summary is being shown/u);
  assert.equal(selection.status, "ok");
});

addTest("app semantic selection bridge can run provider output through selection", async () => {
  const selection = await runSelectedSemanticAnalysisWithProvider({
    verseKey: "2:173",
    semanticInput: {
      ayahText: "Ø¥ÙÙ†Ù‘Ù Ø§Ù„Ù„Ù‘ÙÙ‡Ù ØºÙÙÙÙˆØ±ÙŒ Ø±Ù‘ÙØ­ÙÙŠÙ…ÙŒ",
      translation: "Allah baÄŸÄ±ÅŸlayandÄ±r, merhamet edendir.",
      themes: ["baÄŸÄ±ÅŸlama", "rahmet"],
      roots: ["ØºÙØ±", "Ø±Ø­Ù…"],
      participants: ["Allah"]
    },
    provider: {
      generateSemanticAnalysis: async () =>
        '{"summary":"Allah\'Ä±n baÄŸÄ±ÅŸlayÄ±cÄ±lÄ±ÄŸÄ± ve merhameti vardÄ±r."}'
    }
  });

  assert.equal(selection.selectedSource, "safe_deterministic");
  assert.equal(
    selection.selectedSummary,
    "Zorunluluk hâlinde kalan kimse için bir ruhsat alanı tanınır. Sınırı aşmayan kimse için bağış ve merhamet kapısı açık tutulur."
  );
  assert.equal(selection.status, "ok");
});

addTest("app semantic selection bridge exposes unavailable statuses for debug usage", async () => {
  const noResultSelection = selectSemanticProviderSummary({
    verseKey: "1:1",
    translation: "RahmÃ¢n ve RahÃ®m olan Allah'Ä±n adÄ±yla.",
    semanticOutput: null
  });

  assert.equal(noResultSelection.status, "no_result");
  assert.equal(noResultSelection.selectedSummary, null);

  const unavailable = buildUnavailableSemanticSummary(
    "provider_missing",
    "semantic provider env not available"
  );

  assert.equal(unavailable.status, "provider_missing");
  assert.equal(unavailable.selectedSource, "none");

  const providerFallbackSelection = await runSelectedSemanticAnalysisWithProvider({
    verseKey: "1:1",
    semanticInput: {
      ayahText: "Ø¨ÙØ³Ù’Ù…Ù Ø§Ù„Ù„Ù‘ÙÙ‡Ù Ø§Ù„Ø±Ù‘ÙØ­Ù’Ù…ÙÙ°Ù†Ù Ø§Ù„Ø±Ù‘ÙØ­ÙÙŠÙ…Ù",
      translation: "Rahm?n ve Rah?m olan Allah'?n ad?yla.",
      themes: ["rahmet"],
      roots: ["Ø±Ø­Ù…"],
      participants: ["Allah"]
    },
    provider: {
      generateSemanticAnalysis: async () => {
        throw new Error("boom");
      }
    }
  });

  assert.equal(providerFallbackSelection.status, "ok");
  assert.equal(providerFallbackSelection.selectedSource, "safe_deterministic");
  assert.notEqual(providerFallbackSelection.rawSummary, null);
});

addTest("prompt builder includes style pattern examples for relation-focused summaries", () => {
  const prompt = buildAyahSemanticAnalysisPrompt(sampleInput);
  assert.match(prompt, /STYLE PATTERN EXAMPLES:/u);
  assert.match(prompt, /These are style examples for safe semantic explanation\./u);
  assert.match(prompt, /Do NOT copy them blindly\./u);
  assert.match(prompt, /Do NOT memorize them as fixed templates\./u);
  assert.match(prompt, /Use a similar relation-focused sentence only when the ayah supports it\./u);
});

addTest("prompt builder includes pattern guidance for key semantic relations", () => {
  const prompt = buildAyahSemanticAnalysisPrompt(sampleInput);
  assert.match(prompt, /Example for exclusivity \/ tahsis:/u);
  assert.match(prompt, /Example for paired exclusivity across two linked clauses:/u);
  assert.match(prompt, /Example for supplication \/ request \/ directed appeal:/u);
  assert.match(prompt, /Example for command \+ reason:/u);
  assert.match(prompt, /Example for condition \+ result:/u);
  assert.match(prompt, /Example for necessity \/ exception \+ mercy:/u);
  assert.ok(
    prompt.includes(
      'Zorluk kar\u015f\u0131s\u0131nda sab\u0131r emredilir. Allah\'\u0131n sabredenlerle beraber oldu\u011fu bildirilir.'
    )
  );
  assert.ok(
    prompt.includes(
      'Zorunluluk h\u00e2linde kalan ki\u015fi i\u00e7in bir ruhsat alan\u0131 tan\u0131n\u0131r. S\u0131n\u0131r\u0131 a\u015fmayan kimse i\u00e7in ba\u011f\u0131\u015f ve merhamet kap\u0131s\u0131 a\u00e7\u0131k tutulur.'
    )
  );
});
addTest("prompt builder keeps Turkish guidance aligned with semantic explanation goal", () => {
  const prompt = buildAyahSemanticAnalysisPrompt(sampleInput);
  assert.ok(prompt.includes('Meal k\u0131sa ve a\u00e7\u0131k olsa bile aynen tekrar etme; onu k\u0131sa bir semantik a\u00e7\u0131klamaya d\u00f6n\u00fc\u015ft\u00fcr.'));
  assert.ok(
    prompt.includes(
      'Anlam\u0131 koruyarak do\u011fal ve ili\u015fki odakl\u0131 k\u0131sa bir c\u00fcmle kur; gerekirse a\u00e7\u0131k ili\u015fkiyi korumak i\u00e7in iki k\u0131sa c\u00fcmle kullan. Anlam de\u011fi\u015fmemeli, kip korunmal\u0131, yeni bilgi eklenmemeli, temel ili\u015fki d\u00fc\u015f\u00fcr\u00fclmemeli.'
    )
  );
});
addTest("prompt builder curates short ayah metadata aggressively", () => {
  const prompt = buildAyahSemanticAnalysisPrompt({
    ayahText: "???????????? ?????????????? ???????????????????????? ????????????????????",
    translation: "Rahman ve Rahim olan Allah?????n ad??yla.",
    themes: ["rahmet", "dua", "tevhid"],
    roots: ["??????", "??????", "??????"],
    participants: ["Allah", "kul"],
    wordAnalysisCount: 4
  });

  const themes = extractDetectedList(prompt, "Detected themes");
  const roots = extractDetectedList(prompt, "Detected roots");
  const participants = extractDetectedList(prompt, "Detected participants");

  assert.deepEqual(themes, ["rahmet"]);
  assert.ok(roots.length <= 1);
  assert.equal(new Set(roots).size, roots.length);
  assert.deepEqual(participants, []);
});

addTest("prompt builder caps normal ayah metadata deterministically", () => {
  const prompt = buildAyahSemanticAnalysisPrompt({
    ayahText: "???????????????? ???????????????? ???????????????????? ??????????????????????",
    translation: "Yaln??z sana kulluk eder ve yaln??z senden yard?m dileriz.",
    themes: ["ibadet", "dua", "tevhid", "rahmet"],
    roots: ["??????", "??????", "????????", "??????"],
    participants: ["kul", "Allah", "insanlar"],
    wordAnalysisCount: 6
  });

  const themes = extractDetectedList(prompt, "Detected themes");
  const roots = extractDetectedList(prompt, "Detected roots");
  const participants = extractDetectedList(prompt, "Detected participants");

  assert.ok(themes.length <= 2);
  assert.equal(roots.length, 1);
  assert.equal(new Set(roots).size, roots.length);
  assert.ok(participants.length <= 1);
  assert.deepEqual(participants, ["Allah"]);
});

addTest("prompt builder drops mentioned-only participants on short ayahs", () => {
  const prompt = buildAyahSemanticAnalysisPrompt({
    ayahText: "Ã™â€¡Ã™ÂÃ™Ë†Ã™Â Ã˜Â§Ã™â€Ã˜Â±Ã™â€˜Ã™ÂÃ˜Â­Ã™â€™Ã™â€¦Ã™Å½Ã™â€ Ã™Â Ã˜Â§Ã™â€Ã˜Â±Ã™â€˜Ã™ÂÃ˜Â­Ã™ÂÃ™Å Ã™â€¦Ã™Â",
    translation: "O RahmandÃ„Â±r, Rahimdir.",
    themes: ["rahmet", "dua"],
    roots: ["Ã˜Â±Ã˜Â­Ã™â€¦", "Ã˜ÂºÃ™ÂÃ˜Â±"],
    participants: ["Allah"],
    wordAnalysisCount: 3
  });

  assert.match(prompt, /Detected participants: none/u);
});

// Parser tests

addTest("parser accepts valid JSON", () => {
  assert.deepEqual(parseAyahSemanticAnalysisResult('{"summary":"Bu ayet hidayet talebini ifade eder."}'), {
    summary: "Bu ayet hidayet talebini ifade eder."
  });
});

addTest("parser accepts markdown fenced JSON", () => {
  const raw = '```json\n{\n  "summary": "Bu ayet hidayet talebini ifade eder."\n}\n```';
  assert.deepEqual(parseAyahSemanticAnalysisResult(raw), {
    summary: "Bu ayet hidayet talebini ifade eder."
  });
});

addTest("parser returns null for blank summary", () => {
  assert.equal(parseAyahSemanticAnalysisResult('{"summary":"   "}'), null);
});

addTest("parser returns null for missing summary", () => {
  assert.equal(parseAyahSemanticAnalysisResult('{"text":"abc"}'), null);
});

addTest("parser returns null for non-string summary", () => {
  assert.equal(parseAyahSemanticAnalysisResult('{"summary":123}'), null);
});

addTest("parser returns null for invalid JSON", () => {
  assert.equal(parseAyahSemanticAnalysisResult('{summary:"abc"}'), null);
});

addTest("parser returns null for explanatory text outside JSON", () => {
  assert.equal(parseAyahSemanticAnalysisResult(invalidExplanatoryResponse), null);
});

addTest("parser ignores extra fields", () => {
  assert.deepEqual(parseAyahSemanticAnalysisResult('{"summary":"abc","confidence":0.8,"notes":"ignored"}'), {
    summary: "abc"
  });
});

addTest("parser returns null for array JSON", () => {
  assert.equal(parseAyahSemanticAnalysisResult('[{"summary":"abc"}]'), null);
});

addTest("parser returns null for null JSON", () => {
  assert.equal(parseAyahSemanticAnalysisResult("null"), null);
});

addTest("detailed parser reports empty_response", () => {
  assert.deepEqual(parseAyahSemanticAnalysisResultDetailed("   "), {
    ok: false,
    reason: "empty_response"
  });
});

addTest("detailed parser reports invalid_json", () => {
  assert.deepEqual(parseAyahSemanticAnalysisResultDetailed('{summary:"abc"}'), {
    ok: false,
    reason: "invalid_json",
    rawText: '{summary:"abc"}'
  });
});

addTest("detailed parser reports missing_summary", () => {
  assert.deepEqual(parseAyahSemanticAnalysisResultDetailed('{"text":"abc"}'), {
    ok: false,
    reason: "missing_summary",
    rawText: '{"text":"abc"}'
  });
});

addTest("detailed parser reports summary_not_string", () => {
  assert.deepEqual(parseAyahSemanticAnalysisResultDetailed('{"summary":123}'), {
    ok: false,
    reason: "summary_not_string",
    rawText: '{"summary":123}'
  });
});

addTest("detailed parser reports summary_empty", () => {
  assert.deepEqual(parseAyahSemanticAnalysisResultDetailed('{"summary":"   "}'), {
    ok: false,
    reason: "summary_empty",
    rawText: '{"summary":"   "}'
  });
});

addTest("detailed parser returns ok result for valid summary", () => {
  assert.deepEqual(
    parseAyahSemanticAnalysisResultDetailed('{"summary":"KÄ±sa ve doÄŸal bir Ã¶zet."}'),
    {
      ok: true,
      summary: "KÄ±sa ve doÄŸal bir Ã¶zet."
    }
  );
});

// Fallback tests

addTest("fallback returns translation when translation and themes exist", () => {
  assert.deepEqual(
    buildFallbackAyahSemanticSummary({
      translation: sampleInput.translation,
      themes: sampleInput.themes
    }),
    {
      summary: expectedFallbackSummary
    }
  );
});

addTest("fallback ignores duplicate and empty themes", () => {
  const result = buildFallbackAyahSemanticSummary({
    translation: sampleInput.translation,
    themes: [" hidayet ", "", "dua", "hidayet", "   "]
  });

  assert.deepEqual(result, {
    summary: expectedFallbackSummary
  });
});

addTest("fallback uses translation even when more than two themes exist", () => {
  const result = buildFallbackAyahSemanticSummary({
    translation: sampleInput.translation,
    themes: ["hidayet", "dua", "rahmet"]
  });

  assert.deepEqual(result, {
    summary: expectedFallbackSummary
  });
  assert.equal(result?.summary, sampleInput.translation);
});

addTest("fallback returns translation when themes are empty", () => {
  assert.deepEqual(
    buildFallbackAyahSemanticSummary({
      translation: expectedGeneralFallbackSummary,
      themes: []
    }),
    {
      summary: expectedGeneralFallbackSummary
    }
  );
});

addTest("fallback returns null when translation is blank", () => {
  assert.equal(
    buildFallbackAyahSemanticSummary({
      translation: "   ",
      themes: ["tevhid"]
    }),
    null
  );
});

addTest("fallback returns AyahSemanticAnalysisResult shape", () => {
  const result = buildFallbackAyahSemanticSummary({
    translation: sampleInput.translation,
    themes: ["hidayet"]
  });

  assert.ok(result !== null);
  assert.equal(typeof result?.summary, "string");
});

addTest("fallback produces a single sentence", () => {
  const result = buildFallbackAyahSemanticSummary({
    translation: sampleInput.translation,
    themes: sampleInput.themes
  });

  assert.ok(result !== null);
  const sentenceMatches = result.summary.match(/\./g) ?? [];
  assert.equal(sentenceMatches.length, 1);
  assert.ok(result.summary.endsWith("."));
});

addTest("fallback does not include none", () => {
  const withThemes = buildFallbackAyahSemanticSummary({
    translation: sampleInput.translation,
    themes: sampleInput.themes
  });
  const withoutThemes = buildFallbackAyahSemanticSummary({
    translation: expectedGeneralFallbackSummary,
    themes: []
  });

  assert.ok(!withThemes?.summary.toLowerCase().includes("none"));
  assert.ok(!withoutThemes?.summary.toLowerCase().includes("none"));
});

addTest('fallback does not include "verilen meal Ã§erÃ§evesinde"', () => {
  const result = buildFallbackAyahSemanticSummary({
    translation: sampleInput.translation,
    themes: sampleInput.themes
  });

  assert.ok(!result?.summary.includes("verilen meal Ã§erÃ§evesinde"));
});

addTest('fallback does not include "kÄ±sa bir yÃ¶neliÅŸi ifade eder"', () => {
  const result = buildFallbackAyahSemanticSummary({
    translation: sampleInput.translation,
    themes: sampleInput.themes
  });

  assert.ok(!result?.summary.includes("kÄ±sa bir yÃ¶neliÅŸi ifade eder"));
});

// Mock runner tests

addTest("mock runner returns ai source for valid raw AI response", () => {
  assert.deepEqual(
    runHybridSemanticAnalysisMock(sampleInput, {
      rawAiResponse: `{"summary":"${validAiSummary}"}`
    }),
    {
      result: {
        summary: validAiSummary
      },
      source: "ai"
    }
  );
});

addTest("mock runner returns fallback source for invalid raw AI response", () => {
  expectFallbackOutput(
    runHybridSemanticAnalysisMock(sampleInput, {
      rawAiResponse: invalidExplanatoryResponse
    })
  );
});

addTest("mock runner returns fallback source when raw AI response is missing", () => {
  expectFallbackOutput(runHybridSemanticAnalysisMock(sampleInput));
});

addTest("mock runner returns null when translation is blank and parse fails", () => {
  assert.equal(
    runHybridSemanticAnalysisMock(
      {
        ...sampleInput,
        translation: "   "
      },
      {
        rawAiResponse: invalidExplanatoryResponse
      }
    ),
    null
  );
});

addTest("mock runner returns result shape with summary string", () => {
  const result = runHybridSemanticAnalysisMock(sampleInput);
  assert.ok(result !== null);
  assert.equal(typeof result?.result.summary, "string");
  assert.ok(
    result?.source === "ai" ||
      result?.source === "fallback" ||
      result?.source === "fallback_after_quality_guard"
  );
});

addTest("mock runner falls back after quality guard on bad Turkish grammar", () => {
  const result = runHybridSemanticAnalysisMock(sampleInput, {
    rawAiResponse: '{"summary":"Bizi dosdoÄŸru yola Allah ilet."}'
  });

  assert.deepEqual(result, {
    result: {
      summary: expectedFallbackSummary
    },
    source: "fallback_after_quality_guard"
  });
});

// Provider runner tests

addTest("provider runner returns ai source for valid provider response", async () => {
  const result = await runHybridSemanticAnalysisWithProvider(sampleInput, {
    generateSemanticAnalysis: async () => `{"summary":"${validProviderSummary}"}`
  });

  assert.deepEqual(result, {
    result: {
      summary: validProviderSummary
    },
    source: "ai"
  });
});

addTest("provider runner returns fallback for invalid provider response", async () => {
  const result = await runHybridSemanticAnalysisWithProvider(sampleInput, {
    generateSemanticAnalysis: async () => invalidExplanatoryResponse
  });

  expectFallbackOutput(result);
});

addTest("provider runner returns fallback for empty provider response", async () => {
  const result = await runHybridSemanticAnalysisWithProvider(sampleInput, {
    generateSemanticAnalysis: async () => ""
  });

  expectFallbackOutput(result);
});

addTest("provider runner returns fallback when provider throws", async () => {
  const result = await runHybridSemanticAnalysisWithProvider(sampleInput, {
    generateSemanticAnalysis: async () => {
      throw new Error("Provider failed");
    }
  });

  expectFallbackOutput(result);
});

addTest("provider runner returns null when provider throws and translation is blank", async () => {
  const result = await runHybridSemanticAnalysisWithProvider(
    {
      ...sampleInput,
      translation: "   "
    },
    {
      generateSemanticAnalysis: async () => {
        throw new Error("Provider failed");
      }
    }
  );

  assert.equal(result, null);
});

addTest("provider runner falls back after quality guard on bad Turkish grammar", async () => {
  const result = await runHybridSemanticAnalysisWithProvider(sampleInput, {
    generateSemanticAnalysis: async () => '{"summary":"Bizi dosdoÄŸru yola Allah ilet."}'
  });

  assert.deepEqual(result, {
    result: {
      summary: expectedFallbackSummary
    },
    source: "fallback_after_quality_guard"
  });
});

addTest("provider runner passes ayah text and translation into prompt", async () => {
  let capturedPrompt = "";

  await runHybridSemanticAnalysisWithProvider(sampleInput, {
    generateSemanticAnalysis: async (prompt: string) => {
      capturedPrompt = prompt;
      return '{"summary":"KÄ±sa test sonucu."}';
    }
  });

  assert.match(capturedPrompt, /Ayah Arabic\/Text: Ø§Ù‡Ø¯ÙÙ†ÙØ§ Ø§Ù„ØµÙ‘ÙØ±ÙØ§Ø·Ù Ø§Ù„Ù…ÙØ³ØªÙÙ‚ÙÙŠÙ…Ù/u);
  assert.match(capturedPrompt, /Turkish translation: Bizi dosdoÄŸru yola ilet\./u);
});

let failed = false;

for (const test of tests) {
  try {
    await test.run();
    console.log(`PASS: ${test.name}`);
  } catch (error) {
    failed = true;
    console.error(`FAIL: ${test.name}`);
    console.error(error);
  }
}

if (failed) {
  process.exit(1);
}

console.log("All semantic prompt tests passed.");
