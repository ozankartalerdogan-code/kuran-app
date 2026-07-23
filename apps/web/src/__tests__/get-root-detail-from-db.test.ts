jest.mock("../lib/dbUtils", () => ({
  dbAll: jest.fn(),
  dbGet: jest.fn(),
}));

import { dbAll, dbGet } from "../lib/dbUtils";
import { getRootDetailFromDb } from "../lib/getRootDetailFromDb";

const mockDbAll = dbAll as jest.MockedFunction<typeof dbAll>;
const mockDbGet = dbGet as jest.MockedFunction<typeof dbGet>;

beforeEach(() => {
  mockDbGet.mockResolvedValue({ root: "test-root", meaning_tr: "test meaning" });
  mockDbAll.mockReset();
});

it("keeps repeated occurrences in the same verse distinct by wordIndex", async () => {
  mockDbAll
    .mockResolvedValueOnce([{ surah_id: 2, count: 2 }])
    .mockResolvedValueOnce([
      { arabic: "word", meaning_tr: "first", verse_key: "2:3", word_index: 1 },
      { arabic: "word", meaning_tr: "second", verse_key: "2:3", word_index: 4 },
    ]);

  const result = await getRootDetailFromDb("test-root");

  expect(result?.derivedWords).toEqual([
    { word: "word", meaning: "first", surahId: 2, ayahNumber: 3, wordIndex: 1 },
    { word: "word", meaning: "second", surahId: 2, ayahNumber: 3, wordIndex: 4 },
  ]);
  expect(result).toMatchObject({ derivedTotal: 2, isTruncated: false });
});

it("reports the real total and truncation when the derived-word limit is reached", async () => {
  const derivedRows = Array.from({ length: 2000 }, (_, word_index) => ({
    arabic: "word",
    meaning_tr: "meaning",
    verse_key: "2:3",
    word_index,
  }));
  mockDbAll
    .mockResolvedValueOnce([{ surah_id: 2, count: 2001 }])
    .mockResolvedValueOnce(derivedRows);

  const result = await getRootDetailFromDb("test-root");

  expect(result?.derivedWords).toHaveLength(2000);
  expect(result).toMatchObject({ derivedTotal: 2001, isTruncated: true });
});

it("orders 9:22 before 33:53 by numeric surah and ayah", async () => {
  mockDbAll.mockResolvedValue([]);

  await getRootDetailFromDb("test-root");

  const derivedWordsSql = mockDbAll.mock.calls[1][0] as string;
  expect(derivedWordsSql).toMatch(/SELECT\s+arabic, meaning_tr, verse_key, word_index/);
  expect(derivedWordsSql).not.toMatch(/SELECT\s+DISTINCT/i);
  expect(derivedWordsSql).toMatch(
    /ORDER\s+BY\s+arabic,\s+CAST\(SUBSTR\(verse_key, 1, INSTR\(verse_key, ':'\) - 1\) AS INTEGER\),\s+CAST\(SUBSTR\(verse_key, INSTR\(verse_key, ':'\) \+ 1\) AS INTEGER\),\s+word_index/,
  );
});
