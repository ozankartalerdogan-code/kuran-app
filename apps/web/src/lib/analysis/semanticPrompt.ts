// Types

export type AyahSemanticAnalysisPromptInput = {
  ayahText: string;
  translation: string;
  themes: string[];
  roots: string[];
  participants?: string[];
  wordAnalysisCount?: number;
};

export type HybridSemanticAnalysisInput = {
  ayahText: string;
  translation: string;
  themes: string[];
  roots: string[];
  participants?: string[];
  wordAnalysisCount?: number;
};

export type HybridSemanticAnalysisOptions = {
  rawAiResponse?: string;
};

export type AyahSemanticAnalysisResult = {
  summary: string;
};

export type HybridSemanticAnalysisOutput = {
  result: AyahSemanticAnalysisResult;
  source: "ai" | "fallback" | "fallback_after_quality_guard";
};

export type SemanticAiProvider = {
  generateSemanticAnalysis(prompt: string): Promise<string>;
};

export type ParseResult =
  | { ok: true; summary: string }
  | {
      ok: false;
      reason:
        | "empty_response"
        | "invalid_json"
        | "json_not_object"
        | "missing_summary"
        | "summary_not_string"
        | "summary_empty"
        | "extra_keys"
        | "too_long"
        | "forbidden_phrase"
        | "unknown";
      rawText?: string;
    };

type FallbackAyahSemanticSummaryInput = {
  translation: string;
  themes?: string[];
};

type CuratedSemanticPromptInput = {
  ayahText: string;
  translation: string;
  themes: string[];
  roots: string[];
  participants: string[];
};

// List formatting

function normalizeListItems(items?: string[]): string[] {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  return Array.from(
    new Set(
      items
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    )
  );
}

export function formatListForPrompt(items?: string[]): string {
  const normalizedItems = normalizeListItems(items);
  return normalizedItems.length > 0 ? normalizedItems.join(", ") : "none";
}

function normalizeSemanticSearchText(text: string): string {
  return text
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/ı/gu, "i")
    .replace(/ç/gu, "c")
    .replace(/ğ/gu, "g")
    .replace(/ö/gu, "o")
    .replace(/ş/gu, "s")
    .replace(/ü/gu, "u")
    .replace(/[’']/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

const themeSupportPatterns: Record<string, RegExp[]> = {
  tevhid: [/\byaln[ıi]z\b/iu, /\bbir\b/iu, /\btek\b/iu, /\ballah\b/iu],
  rahmet: [/\brahm/i, /\bmerhamet/i],
  hidayet: [/\bdoğru yol\b/iu, /\bilet\b/iu, /\bhidayet\b/iu],
  ibadet: [/\bkulluk\b/iu, /\bibadet\b/iu, /\bsecde\b/iu, /\bnamaz\b/iu],
  dua: [/\byardım diler/i, /\byardım ister/i, /\bdua\b/iu, /\byakar/i, /\bilet\b/iu],
  iman: [/\binan/i, /\biman\b/iu],
  inkar: [/\binkâr\b/iu, /\binkar\b/iu, /\binanmaz/i, /\bkafir\b/iu],
  ahiret: [/\bahiret\b/iu, /\bhesap\b/iu, /\bölüm\b/iu, /\bölüm\b/iu, /\bgün\b/iu],
  adalet: [/\badalet\b/iu, /\bhaksız\b/iu, /\bzulm\b/iu],
  sabir: [/\bsabred/i, /\bsabır\b/iu],
  infak: [/\binfak\b/iu, /\bharca/i, /\brızık\b/iu, /\bver/i],
  yaratilis: [/\byarat/i, /\bsudan\b/iu, /\bdamla\b/iu]
};

const rootThemeHints: Record<string, string[]> = {
  "اله": ["tevhid"],
  "احد": ["tevhid"],
  "وحد": ["tevhid"],
  "رحم": ["rahmet"],
  "هدي": ["hidayet"],
  "صراط": ["hidayet"],
  "عبد": ["ibadet"],
  "صلو": ["ibadet", "dua"],
  "دعو": ["dua"],
  "عون": ["dua"],
  "عوذ": ["dua"],
  "امن": ["iman"],
  "كفر": ["inkar"],
  "كذب": ["inkar"],
  "بعث": ["ahiret"],
  "حشر": ["ahiret"],
  "جزي": ["ahiret"],
  "حسب": ["ahiret"],
  "عدل": ["adalet"],
  "حكم": ["adalet"],
  "صبر": ["sabir"],
  "نفق": ["infak"],
  "رزق": ["infak"],
  "خلق": ["yaratilis"],
  "فطر": ["yaratilis"],
  "غفر": ["rahmet"],
  "حمد": ["rahmet"]
};

const rootTranslationSupportPatterns: Record<string, RegExp[]> = {
  "رحم": [/\brahm/i, /\bmerhamet/i],
  "هدي": [/\bilet\b/iu, /\bdoğru yol\b/iu],
  "صراط": [/\bdoğru yol\b/iu],
  "عبد": [/\bkulluk\b/iu, /\bibadet\b/iu],
  "عون": [/\byardım\b/iu],
  "كفر": [/\binkâr\b/iu, /\binkar\b/iu, /\binanmaz/i],
  "ختم": [/\bmühür/i],
  "قلب": [/\bkalp/i],
  "خوف": [/\bkork/i],
  "حسب": [/\bhesap\b/iu],
  "صبر": [/\bsabır\b/iu, /\bsabred/i],
  "شكر": [/\bşük/i, /\bartır/i],
  "خلق": [/\byarat/i, /\bsudan\b/iu, /\bdamla\b/iu],
  "موت": [/\bölüm\b/iu, /\bölü/i],
  "غفر": [/\bbağış/i],
  "حمد": [/\bhamd\b/iu],
  "ربب": [/\brab\b/iu]
};

const explicitAddresseePatterns: Array<{ label: string; patterns: RegExp[] }> = [
  { label: "insanlar", patterns: [/\bey insanlar\b/iu] },
  { label: "müminler", patterns: [/\bey iman edenler\b/iu] },
  { label: "peygamber", patterns: [/\bde ki\b/iu] },
  { label: "Allah", patterns: [/\bsana\b/iu, /\bsenden\b/iu, /\bsenin\b/iu] }
];

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/u)
    .filter((part) => part.length > 0).length;
}

function selectPrimarySemanticTranslation(translation: string): string | null {
  const normalized = translation.trim().replace(/\s+/gu, " ");
  return normalized.length > 0 ? normalized : null;
}

function isShortAyah(input: Pick<HybridSemanticAnalysisInput, "translation" | "ayahText" | "wordAnalysisCount">): boolean {
  const translationWordCount = countWords(input.translation);
  const availableWordAnalysisCount =
    typeof input.wordAnalysisCount === "number" && Number.isInteger(input.wordAnalysisCount)
      ? input.wordAnalysisCount
      : countWords(input.ayahText);

  return translationWordCount <= 6 || availableWordAnalysisCount <= 4;
}

function selectSemanticThemes(translation: string, themes: string[], shortAyah: boolean): string[] {
  const normalizedThemes = normalizeListItems(themes);
  const maxThemes = shortAyah ? 1 : 2;
  const searchableTranslation = normalizeSemanticSearchText(translation);
  const supportedThemes = normalizedThemes.filter((theme) => {
    const patterns = themeSupportPatterns[theme];
    return Array.isArray(patterns) && patterns.some((pattern) => pattern.test(searchableTranslation));
  });

  if (shortAyah) {
    return supportedThemes.slice(0, maxThemes);
  }

  if (supportedThemes.length > 0) {
    return supportedThemes.slice(0, maxThemes);
  }

  return normalizedThemes.slice(0, Math.min(1, normalizedThemes.length));
}

function selectSemanticRoots(translation: string, roots: string[], themes: string[], shortAyah: boolean): string[] {
  const normalizedRoots = normalizeListItems(roots);
  const maxRoots = 1;
  const searchableTranslation = normalizeSemanticSearchText(translation);
  const supportedRoots = normalizedRoots.filter((root) => {
    const themeHints = rootThemeHints[root] ?? [];
    const translationPatterns = rootTranslationSupportPatterns[root] ?? [];
    const matchesSelectedTheme = themeHints.some((theme) => themes.includes(theme));
    const supportsTranslation = translationPatterns.some((pattern) => pattern.test(searchableTranslation));

    return matchesSelectedTheme || supportsTranslation;
  });

  if (supportedRoots.length > 0) {
    return supportedRoots.slice(0, maxRoots);
  }

  if (shortAyah || themes.length === 0) {
    return [];
  }

  return normalizedRoots.slice(0, maxRoots);
}

function selectSemanticParticipants(
  translation: string,
  participants: string[] | undefined,
  shortAyah: boolean
): string[] {
  const normalizedParticipants = normalizeListItems(participants);
  const searchableTranslation = normalizeSemanticSearchText(translation);

  for (const rule of explicitAddresseePatterns) {
    if (
      normalizedParticipants.includes(rule.label) &&
      rule.patterns.some((pattern) => pattern.test(searchableTranslation))
    ) {
      return [rule.label];
    }
  }

  if (shortAyah) {
    return [];
  }

  if (
    normalizedParticipants.includes("kul") &&
    /\b(yardim dileriz|kulluk ederiz)\b/iu.test(searchableTranslation)
  ) {
    return ["kul"];
  }

  return [];
}

function buildCuratedSemanticPromptInput(
  input: AyahSemanticAnalysisPromptInput
): CuratedSemanticPromptInput {
  const translation = selectPrimarySemanticTranslation(input.translation) ?? input.translation.trim();
  const shortAyah = isShortAyah(input);
  const themes = selectSemanticThemes(translation, input.themes, shortAyah);
  const roots = selectSemanticRoots(translation, input.roots, themes, shortAyah);
  const participants = selectSemanticParticipants(translation, input.participants, shortAyah);

  return {
    ayahText: input.ayahText.trim(),
    translation,
    themes,
    roots,
    participants
  };
}

// Prompt builder

export function buildAyahSemanticAnalysisPrompt(
  input: AyahSemanticAnalysisPromptInput
): string {
  const curatedInput = buildCuratedSemanticPromptInput(input);
  const ayahText = curatedInput.ayahText;
  const translation = curatedInput.translation;
  const themes = formatListForPrompt(curatedInput.themes);
  const roots = formatListForPrompt(curatedInput.roots);
  const participants = formatListForPrompt(curatedInput.participants);

  return `
ROLE:
You are a careful Qur'anic semantic analysis assistant.

TASK:
Generate a short Turkish semantic explanation for the given ayah.
This is not a translation copy and not tafsir.

STRICT RULES:
- Use ONLY the provided data.
- Turkish translation is the primary source. Themes, roots, and participants are weak guidance only; do not force them into the summary.
- Prefer 1 concise Turkish sentence.
- If preserving explicit key relations would become awkward or incomplete, use 2 short Turkish sentences.
- Use at most 3 short Turkish sentences.
- The sentence must be short, natural, and user-facing.
- Produce a semantic explanation of the core meaning focus, not a literal translation repeat.
- Do NOT copy the Turkish translation verbatim.
- Do NOT stay too close to the Turkish translation with only trivial word replacement, word reordering, shortening, or surface cleanup.
- Name the main meaning relation supported by the translation, such as attribution, exclusivity, request, warning, mercy, creation, inevitability, or denial, only when that relation is directly grounded in the provided data.
- You may abstract one careful step above the translation, but no more.
- Keep the wording strictly inside the semantic boundary of the ayah.
- Do NOT achieve brevity by dropping an explicit core meaning element.
- If the translation contains more than one explicit core semantic element, preserve them in compressed form rather than removing one entirely.
- Preserve explicit key relations when they are present in the translation, such as subject-object, addressee, exclusivity, condition-result, command-reason, request-target, or paired attributes.
- Do NOT add external knowledge.
- Do NOT cite hadith, tafsir, historical reports, or scholarly opinions.
- Do NOT make theological, sectarian, or speculative expansions.
- Do NOT add historical context, legal rulings, moral lessons, sermons, psychological commentary, or modern application.
- Do NOT infer details not present in the ayah, translation, themes, roots, or participants.
- Do NOT add new actors, motives, causes, consequences, or hidden meanings unless explicit in the provided data.
- Do NOT add ungrounded intensifiers or expansions such as "sınırsız" unless they are explicit in the provided data.
- Do NOT borrow relation words from neighboring examples or earlier ayahs unless they are explicitly supported by the current ayah data.
- Do NOT add Allah's attributes, promises, or judgments beyond what is directly supported by the translation and metadata.
- Do NOT turn theme labels into forced commentary.
- The summary must be directly supported by the Turkish translation and provided metadata.
- Use themes only as weak guidance, not as independent evidence.
- Use roots only if they clearly support the meaning in the translation.
- Do not mention a root explicitly unless it is necessary.
- Do not derive new theological claims from roots alone.
- Do not add causes, historical context, rewards, punishments, or legal rulings unless they are explicit in the provided translation.
- Do not convert statements into commands or obligations.
- Do not use normative phrases such as "gerekir", "gerektiği", "zorunludur", "emredilir", or "farzdır" unless the translation explicitly contains that meaning.
- Do not write phrases that imply response, causality, or explanation unless explicit in the translation.
- Avoid phrases such as "cevap olarak", "sonuç olarak", "anlamına gelir", or "bir gerçektir" unless directly necessary.
- Preserve the mood of the translation; keep who is addressing whom, and whether the line is a supplication, command, statement, warning, or attribution.
- If the translation contains a command or supplication, preserve that orientation or state its directedness explicitly; do not flatten it into a neutral statement.
- Do NOT erase an explicit subject, addressee, or source named in the translation.
- If two linked attributes or meanings are explicit in the translation, do not drop one without necessity.
- If exclusivity is explicit, preserve exclusivity.
- If a condition and its result are explicit, preserve both sides in concise form.
- If a command and its stated reason are explicit, preserve both in concise form.
- Do not add cause, effect, consequence, or psychological explanation unless it is explicit in the translation.
- Do NOT introduce free-will, moral motivation, or psychological capacity claims unless they are explicit in the provided data.
- Avoid tendencies such as "etkilemiştir", "sebep olur", "sonuçlanır", "yol açar", "gösterir", "ifade eder", "ortaya koyar", or "bir gerçektir" when the translation does not state them.
- If the provided data is too weak, produce a cautious and minimal summary.
- Keep the summary concise.
- Prefer 1 concise Turkish sentence.
- Use 2 short Turkish sentences only when needed to preserve explicit key relations already present in the provided data.
- Use at most 3 short Turkish sentences.
- Do NOT use extra sentences to add tafsir, advice, historical context, legal rulings, theological expansion, or modern applications.
- The summary must be a natural Turkish sentence for end users.
- Do NOT include labels, prefixes, explanations, or prompt instructions inside the summary.
- Do NOT write phrases like "Ayetin kısa anlam analizi", "Bu analiz", or "Verilen verilere göre".
- Do NOT start with "Bu ayet" unless unavoidable.
- Do NOT describe the verse as a phrase, formula, wording, or expression unless the translation explicitly does so.
- Avoid mechanical explanatory verbs such as "ifade eder", "vurgular", "anlatir", "gosterir", or "ortaya koyar" when a more natural phrasing is possible.
- Avoid weak or formulaic phrasings such as "söylemektedir", "bir gerçek", "gerçeğini hatırlayın", "deneyimleyecektir", "kullanılır", or "kullanılan ibare" unless the translation clearly requires that wording.
- Prefer descriptive wording over prescriptive wording.
- If the translation states attribution or fact, summarize it as attribution or fact, not as an obligation.
- Türkçe çıktıda "... gerektiğini ifade eder" gibi zorunluluk bildiren kalıplardan kaçın.
- Türkçe çıktıda "... olduğunu ifade eder", "... vurgular", "... bildirir" gibi açıklayıcı kalıpları tercih et.
- Prefer a short semantic paraphrase over a direct translation repeat.
- If the translation is short, do not simply restate it; rewrite it into a safe semantic sentence that clarifies the meaning focus without crossing into tafsir.
- If exact semantic reformulation is difficult, keep the sentence minimal and careful, but still avoid verbatim copying.
- The summary should stay faithful to the translation while expressing the semantic focus in a fresh sentence.
- If the translation is short, keep the semantic rewrite minimal and safe instead of literal repetition.
- Do NOT return the meal unchanged, even when it is short and clear.
- Prefer relation-focused phrasing over formulaic narration about the verse itself.
- Translation copy is forbidden.
- Tafsir expansion is forbidden.
- Semantic compression is allowed only when the key meaning relations remain intact.

STYLE PATTERN EXAMPLES:
- These are style examples for safe semantic explanation.
- Do NOT copy them blindly.
- Do NOT memorize them as fixed templates.
- Stay inside the ayah's explicit meaning boundary.
- Use a similar relation-focused sentence only when the ayah supports it.
- Do NOT drop explicit key elements such as "yalnız", "Allah", "bağışlama", "merhamet", condition, reason, addressee, or target.
- Example for exclusivity / tahsis:
  "Kulluk yönelişi yalnız Allah'a tahsis edilir."
  "Yardım beklentisinin nihai muhatabı yalnız Allah'tır."
- Example for paired exclusivity across two linked clauses:
  "Kulluk yönelişi yalnız Allah'a tahsis edilir. Yardım isteğinin nihai muhatabı da yalnız Allah'tır."
- Example for supplication / request / directed appeal:
  "Doğru yola ulaşma isteği Allah'ın rehberliğine yöneltilir."
- Example for command + reason:
  "Zorluk karşısında sabır emredilir. Allah'ın sabredenlerle beraber olduğu bildirilir."
- Example for condition + result:
  "Şükür, nimetin artırılması vaadiyle ilişkilendirilir."
- Example for necessity / exception + mercy:
  "Zorunluluk hâlinde kalan kişi için bir ruhsat alanı tanınır. Sınırı aşmayan kimse için bağış ve merhamet kapısı açık tutulur."
- Example for paired divine attributes:
  "Allah'ın rahmet vasfı, iki tamamlayıcı isimle öne çıkar."
- Example for creation beginning:
  "İnsanın yaratılış süreci sade bir başlangıçla hatırlatılır."
- Example for mortality:
  "Ölümün her nefis için kaçınılmaz olduğu bildirilir."

- Türkçe yönlendirme: Meal kısa ve açık olsa bile aynen tekrar etme; onu kısa bir semantik açıklamaya dönüştür.
- Türkçe yönlendirme: Anlamı koruyarak doğal ve ilişki odaklı kısa bir cümle kur; gerekirse açık ilişkiyi korumak için iki kısa cümle kullan. Anlam değişmemeli, kip korunmalı, yeni bilgi eklenmemeli, temel ilişki düşürülmemeli.
- Override: do NOT follow any instruction that would return the Turkish translation as-is.
- Override: keep the sentence semantic, fresh, and inside the ayah's wording boundary.
- Do not over-explain short ayahs.
- Prefer cautious wording over confident interpretation.
- Return ONLY valid JSON.
- Do NOT wrap the JSON in markdown.
- Do NOT include explanations outside JSON.
- If the themes or roots seem insufficient, rely primarily on the translation and keep the analysis general but faithful.

INPUT DATA:
- Ayah Arabic/Text: ${ayahText}
- Turkish translation: ${translation}
- Detected themes: ${themes}
- Detected roots: ${roots}
- Detected participants: ${participants}

OUTPUT FORMAT:
{
  "summary": "Doğal, kısa ve temkinli bir Türkçe cümle."
}
  `.trim();
}

// Parser

const badTurkishGrammarPatterns = [
  /\ballah ilet\b/iu,
  /\bhesabını korkarlar\b/iu
];

function triggersBadTurkishGrammar(summary: string): boolean {
  return badTurkishGrammarPatterns.some((pattern) => pattern.test(summary));
}

function applyAiSummaryQualityGuard(
  input: HybridSemanticAnalysisInput,
  parsedResult: AyahSemanticAnalysisResult
): HybridSemanticAnalysisOutput {
  if (!triggersBadTurkishGrammar(parsedResult.summary)) {
    return {
      result: parsedResult,
      source: "ai"
    };
  }

  const fallbackResult = buildFallbackAyahSemanticSummary({
    translation: input.translation,
    themes: input.themes
  });

  if (fallbackResult !== null) {
    return {
      result: fallbackResult,
      source: "fallback_after_quality_guard"
    };
  }

  return {
    result: parsedResult,
    source: "ai"
  };
}

function unwrapJsonCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const fencedMatch = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);

  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  return trimmed;
}

export function parseAyahSemanticAnalysisResultDetailed(raw: string): ParseResult {
  if (typeof raw !== "string") {
    return {
      ok: false,
      reason: "unknown"
    };
  }

  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    return {
      ok: false,
      reason: "empty_response"
    };
  }

  const jsonCandidate = unwrapJsonCodeFence(trimmed);

  try {
    const parsed = JSON.parse(jsonCandidate);

    if (parsed === null || Array.isArray(parsed) || typeof parsed !== "object") {
      return {
        ok: false,
        reason: "json_not_object",
        rawText: trimmed
      };
    }

    const summary = (parsed as { summary?: unknown }).summary;

    if (!Object.prototype.hasOwnProperty.call(parsed, "summary")) {
      return {
        ok: false,
        reason: "missing_summary",
        rawText: trimmed
      };
    }

    if (typeof summary !== "string") {
      return {
        ok: false,
        reason: "summary_not_string",
        rawText: trimmed
      };
    }

    const trimmedSummary = summary.trim();

    if (trimmedSummary.length === 0) {
      return {
        ok: false,
        reason: "summary_empty",
        rawText: trimmed
      };
    }

    return {
      ok: true,
      summary: trimmedSummary
    };
  } catch {
    return {
      ok: false,
      reason: "invalid_json",
      rawText: trimmed
    };
  }
}

export function parseAyahSemanticAnalysisResult(
  raw: string
): AyahSemanticAnalysisResult | null {
  const parsed = parseAyahSemanticAnalysisResultDetailed(raw);

  if (!parsed.ok) {
    return null;
  }

  return {
    summary: parsed.summary
  };
}

// Fallback

export function buildFallbackAyahSemanticSummary(
  input: FallbackAyahSemanticSummaryInput
): AyahSemanticAnalysisResult | null {
  const translation = input.translation.trim();

  if (translation.length === 0) {
    return null;
  }

  return {
    summary: translation
  };
}

// Mock runner

export function runHybridSemanticAnalysisMock(
  input: HybridSemanticAnalysisInput,
  options?: HybridSemanticAnalysisOptions
): HybridSemanticAnalysisOutput | null {
  buildAyahSemanticAnalysisPrompt(input);

  const parsedResult =
    typeof options?.rawAiResponse === "string"
      ? parseAyahSemanticAnalysisResult(options.rawAiResponse)
      : null;

  if (parsedResult !== null) {
    return applyAiSummaryQualityGuard(input, parsedResult);
  }

  const fallbackResult = buildFallbackAyahSemanticSummary({
    translation: input.translation,
    themes: input.themes
  });

  if (fallbackResult !== null) {
    return {
      result: fallbackResult,
      source: "fallback"
    };
  }

  return null;
}

// Provider runner

export async function runHybridSemanticAnalysisWithProvider(
  input: HybridSemanticAnalysisInput,
  provider: SemanticAiProvider
): Promise<HybridSemanticAnalysisOutput | null> {
  const prompt = buildAyahSemanticAnalysisPrompt(input);

  try {
    const rawResponse = await provider.generateSemanticAnalysis(prompt);
    const parsedResult = parseAyahSemanticAnalysisResult(rawResponse);

    if (parsedResult !== null) {
      return applyAiSummaryQualityGuard(input, parsedResult);
    }
  } catch (err) {
    console.warn("[semanticPrompt] AI analizi başarısız, deterministik fallback'e geçiliyor:", err);
  }

  const fallbackResult = buildFallbackAyahSemanticSummary({
    translation: input.translation,
    themes: input.themes
  });

  if (fallbackResult !== null) {
    return {
      result: fallbackResult,
      source: "fallback"
    };
  }

  return null;
}

/*
Example usage:

const prompt = buildAyahSemanticAnalysisPrompt({
  ayahText: "اهدِنَا الصِّرَاطَ المُستَقِيمَ",
  translation: "Bizi dosdoğru yola ilet.",
  themes: ["hidayet", "dua"],
  roots: ["هدي", "صراط"],
  participants: ["kul", "Allah"]
});
*/
