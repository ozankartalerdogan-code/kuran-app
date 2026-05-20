import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveDataPath } from "../adapters/shared";

export function formatSurahFileName(surahId: number): string {
  return `${surahId}`.padStart(3, "0") + ".json";
}

export async function writeDataJson(relativeSegments: string[], value: unknown): Promise<void> {
  const absolutePath = resolveDataPath(...relativeSegments);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, JSON.stringify(value, null, 2), "utf8");
}
