import { getRootOccurrenceAyahHref, groupRootMeanings } from "../lib/rootMeaningGroups";
import { parseTargetWordIndex } from "../lib/wordTarget";

describe("root detail word deep links", () => {
  it("uses the raw wordIndex in the ayah target", () => {
    expect(getRootOccurrenceAyahHref({ surahId: 9, ayahNumber: 22, wordIndex: 0 })).toBe("/surah/9/ayah/22?word=0");
  });

  it("preserves separate targets for two occurrences in the same ayah", () => {
    const groups = groupRootMeanings([{ word: "و", meaning: "ve", surahId: 9, ayahNumber: 22, wordIndex: 2 }, { word: "و", meaning: "ve", surahId: 9, ayahNumber: 22, wordIndex: 5 }]);
    const verses = groups.primary[0][1].verses;
    expect(verses.map((verse) => verse.wordIndex)).toEqual([2, 5]);
    expect(verses.map(getRootOccurrenceAyahHref)).toEqual(["/surah/9/ayah/22?word=2", "/surah/9/ayah/22?word=5"]);
  });

  it("ignores invalid word query values", () => {
    expect(parseTargetWordIndex(undefined)).toBeNull();
    expect(parseTargetWordIndex("-1")).toBeNull();
    expect(parseTargetWordIndex("1.5")).toBeNull();
    expect(parseTargetWordIndex("word")).toBeNull();
    expect(parseTargetWordIndex(["1", "2"])).toBeNull();
    expect(parseTargetWordIndex("0")).toBe(0);
  });
});