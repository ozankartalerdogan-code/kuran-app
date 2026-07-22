export type WordDeepLinkTarget = {
  wordIndex: number;
  tab: "words";
};

export function resolveWordDeepLink(
  words: ReadonlyArray<{ wordIndex: number }> | null | undefined,
  value: string | string[] | undefined,
): WordDeepLinkTarget | null {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const wordIndex = Number(value);
  if (!Number.isSafeInteger(wordIndex) || !words?.some((word) => word.wordIndex === wordIndex)) {
    return null;
  }
  return { wordIndex, tab: "words" };
}