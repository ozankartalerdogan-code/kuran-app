import { getSurahContext } from "@quran-app/core";

type Case = {
  label: string;
  input: number;
  expectNull: boolean;
};

const cases: Case[] = [
  { label: "valid first surah", input: 1, expectNull: false },
  { label: "valid last surah", input: 114, expectNull: false },
  { label: "zero", input: 0, expectNull: true },
  { label: "too large", input: 999, expectNull: true },
  { label: "float", input: 1.5, expectNull: true },
  { label: "NaN", input: Number.NaN, expectNull: true }
];

async function main() {
  let failed = false;

  for (const testCase of cases) {
    try {
      const result = await getSurahContext(testCase.input);

      if (testCase.expectNull) {
        if (result !== null) {
          failed = true;
          console.error(`FAIL: ${testCase.label} -> expected null`);
        } else {
          console.log(`PASS: ${testCase.label}`);
        }

        continue;
      }

      if (result === null) {
        failed = true;
        console.error(`FAIL: ${testCase.label} -> expected data, got null`);
        continue;
      }

      const valid =
        result.surahId === testCase.input &&
        typeof result.shortIntroduction === "string" &&
        result.shortIntroduction.length > 0 &&
        typeof result.revelationPlace === "string" &&
        result.revelationPlace.length > 0 &&
        typeof result.revelationOrder === "number";

      if (!valid) {
        failed = true;
        console.error(`FAIL: ${testCase.label} -> invalid record shape`);
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

  console.log("All surah context smoke checks passed.");
}

main().catch((error) => {
  console.error("Smoke script crashed.", error);
  process.exit(1);
});
