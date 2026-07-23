export function parseTargetWordIndex(value: string | string[] | undefined): number | null {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const wordIndex = Number(value);
  return Number.isSafeInteger(wordIndex) ? wordIndex : null;
}
