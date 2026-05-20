import { getAyahAnalysisEngine } from "@quran-app/core";

type Case = {
  label: string;
  input: string;
  expectNull: boolean;
};

const expectedSource = "analysis-engine-v1:rule-based";

const allowedThemes = new Set([
  "tevhid",
  "rahmet",
  "hidayet",
  "ibadet",
  "dua",
  "iman",
  "inkar",
  "ahiret",
  "adalet",
  "sabir",
  "infak",
  "yaratilis"
]);

const allowedSpeakers = new Set<string | null>([null]);
const allowedAddressees = new Set<string | null>([null, "insanlar", "müminler"]);
const allowedMentioned = new Set(["Allah", "müminler", "inkar edenler", "insanlar", "peygamber"]);

const cases: Case[] = [
  { label: "valid first ayah", input: "1:1", expectNull: false },
  { label: "valid last surah sample", input: "114:1", expectNull: false },
  { label: "zero surah", input: "0:1", expectNull: true },
  { label: "zero ayah", input: "1:0", expectNull: true },
  { label: "non verse key", input: "abc", expectNull: true },
  { label: "non numeric ayah", input: "1:foo", expectNull: true },
  { label: "too many segments", input: "1:1:1", expectNull: true }
];

function validateResultShape(input: string, result: Awaited<ReturnType<typeof getAyahAnalysisEngine>>): string[] {
  const errors: string[] = [];

  if (result === null) {
    return ["expected data, got null"];
  }

  if (result.verseKey !== input) {
    errors.push(`expected verseKey ${input}, got ${result.verseKey}`);
  }

  if (result.source !== expectedSource) {
    errors.push(`expected source ${expectedSource}, got ${result.source}`);
  }

  if (!Array.isArray(result.themes)) {
    errors.push("themes is not an array");
  } else {
    for (const theme of result.themes) {
      if (!allowedThemes.has(theme)) {
        errors.push(`theme is not allowed: ${theme}`);
      }
    }
  }

  if (result.summary !== null && typeof result.summary !== "string") {
    errors.push("summary must be null or string");
  }

  if (!result.participants || typeof result.participants !== "object") {
    errors.push("participants is missing or invalid");
    return errors;
  }

  if (!allowedSpeakers.has(result.participants.speaker)) {
    errors.push(`speaker is not allowed: ${String(result.participants.speaker)}`);
  }

  if (!allowedAddressees.has(result.participants.addressee)) {
    errors.push(`addressee is not allowed: ${String(result.participants.addressee)}`);
  }

  if (!Array.isArray(result.participants.mentioned)) {
    errors.push("participants.mentioned is not an array");
  } else {
    for (const participant of result.participants.mentioned) {
      if (!allowedMentioned.has(participant)) {
        errors.push(`mentioned participant is not allowed: ${participant}`);
      }
    }
  }

  return errors;
}

async function main() {
  let failed = false;

  for (const testCase of cases) {
    try {
      const result = await getAyahAnalysisEngine(testCase.input);

      if (testCase.expectNull) {
        if (result !== null) {
          failed = true;
          console.error(`FAIL: ${testCase.label} -> expected null`);
        } else {
          console.log(`PASS: ${testCase.label}`);
        }

        continue;
      }

      const errors = validateResultShape(testCase.input, result);

      if (errors.length > 0) {
        failed = true;
        console.error(`FAIL: ${testCase.label} -> ${errors.join("; ")}`);
      } else {
        console.log(`PASS: ${testCase.label}`);
      }
    } catch (error) {
      failed = true;
      console.error(`FAIL: ${testCase.label} -> threw error`, error);
    }
  }

  if (failed) {
    process.exit(1);
  }

  console.log("All analysis engine V1 smoke checks passed.");
}

main().catch((error) => {
  console.error("Analysis engine V1 smoke script crashed.", error);
  process.exit(1);
});
