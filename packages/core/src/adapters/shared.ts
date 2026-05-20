import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function dbAll<T>(stmt: { all(...args: any[]): unknown[] }, ...params: any[]): T[] {
  return stmt.all(...params) as unknown as T[];
}

export function dbGet<T>(stmt: { get(...args: any[]): unknown }, ...params: any[]): T | undefined {
  return stmt.get(...params) as unknown as T | undefined;
}

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = path.resolve(currentDirectory, "../../../../data");

const fileCache = new Map<string, Promise<string>>();
const jsonCache = new Map<string, Promise<unknown>>();

export function resolveDataPath(...segments: string[]): string {
  return path.join(dataDirectory, ...segments);
}

export function getRelativeDataPath(...segments: string[]): string {
  return path.posix.join("data", ...segments);
}

export async function readCachedFile(...segments: string[]): Promise<string> {
  const absolutePath = resolveDataPath(...segments);
  const cached = fileCache.get(absolutePath);

  if (cached) {
    return cached;
  }

  const pending = readFile(absolutePath, "utf8");
  fileCache.set(absolutePath, pending);

  return pending;
}

export async function readJsonFile<T>(...segments: string[]): Promise<T> {
  const absolutePath = resolveDataPath(...segments);
  const cached = jsonCache.get(absolutePath);

  if (cached) {
    return cached as Promise<T>;
  }

  const pending = readCachedFile(...segments).then((content) => JSON.parse(content) as T);
  jsonCache.set(absolutePath, pending);

  return pending;
}

function getSuspiciousCharacterScore(value: string): number {
  const suspiciousMatches = value.match(/[ÃÂÅÄØÙÐÑþœž]/g) ?? [];
  const replacementMatches = value.match(/\uFFFD/g) ?? [];

  return suspiciousMatches.length + replacementMatches.length * 4;
}

function getReadableCharacterScore(value: string): number {
  const readableMatches =
    value.match(/[A-Za-z0-9çğıöşüÇĞİÖŞÜâîûÂÎÛء-ي\u0600-\u06FF]/g) ?? [];

  return readableMatches.length;
}

function normalizeTextValue(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .replace(/\u00A0/g, " ")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .normalize("NFC");
}

function decodeLatin1AsUtf8(value: string): string {
  return Buffer.from(value, "latin1").toString("utf8");
}

export interface RepairTextResult {
  text: string | null;
  changed: boolean;
}

export function repairTextDetailed(value: string | null | undefined): RepairTextResult {
  if (!value) {
    return {
      text: null,
      changed: false
    };
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return {
      text: null,
      changed: false
    };
  }

  let currentValue = normalizeTextValue(trimmedValue);
  let bestValue = currentValue;
  let bestSuspiciousScore = getSuspiciousCharacterScore(bestValue);
  let bestReadableScore = getReadableCharacterScore(bestValue);

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const decodedValue = normalizeTextValue(decodeLatin1AsUtf8(currentValue));

    if (!decodedValue || decodedValue === currentValue) {
      break;
    }

    const suspiciousScore = getSuspiciousCharacterScore(decodedValue);
    const readableScore = getReadableCharacterScore(decodedValue);
    const isBetterCandidate =
      suspiciousScore < bestSuspiciousScore ||
      (suspiciousScore === bestSuspiciousScore && readableScore > bestReadableScore);

    if (!isBetterCandidate) {
      break;
    }

    bestValue = decodedValue;
    bestSuspiciousScore = suspiciousScore;
    bestReadableScore = readableScore;
    currentValue = decodedValue;
  }

  return {
    text: bestValue || null,
    changed: bestValue !== trimmedValue
  };
}

export function repairText(value: string | null | undefined): string | null {
  return repairTextDetailed(value).text;
}

export function normalizeLookupKey(value: string | null | undefined): string | null {
  const repairedValue = repairText(value);

  if (repairedValue === null) {
    return null;
  }

  const normalized = repairedValue
    .replace(/[\u0640]/g, "")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[آأإٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, "")
    .trim()
    .normalize("NFC");

  return normalized || null;
}

export function hasResidualCorruption(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  return /(?:Ã.|Å.|Ä.|Ø.|Ù.|Ð.|Ñ.|\uFFFD)/u.test(value);
}

export function debugLog(scope: string, message: string, details?: unknown): void {
  if (process.env.QURAN_APP_DEBUG !== "1") {
    return;
  }

  if (details === undefined) {
    console.debug(`[${scope}] ${message}`);
    return;
  }

  console.debug(`[${scope}] ${message}`, details);
}
