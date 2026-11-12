import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_PATH = path.join(ROOT, "content", "tafsir", "simplified-surah.json");
// Web: tek sunucu-taraflı dosya (bundle'a gitmiyor, boyut sorun değil).
const WEB_TARGET = path.join(ROOT, "apps", "web", "src", "app", "api", "tafsir", "simplifiedContent.ts");
// Mobil: 114 sure ~1.3MB tek objede eagerly bundle'a giriyordu (her açılışta
// hepsi belleğe yükleniyordu, kullanıcı tek sure okusa bile). Sure başına ayrı
// JSON + tembel require lookup'a bölündü — dersler_registry.ts'teki safeRequire
// deseniyle aynı mantık.
// Klasör adı loader dosyasıyla (tafsirSimplified.ts) AYNI OLMAMALI — Metro'nun
// resolver'ı dosya mı klasör mü belirsiz kalıp "Unable to resolve" hatası veriyor.
const MOBILE_DATA_DIR   = path.join(ROOT, "apps", "mobile", "src", "data", "tafsirSimplifiedData");
const MOBILE_LOADER_PATH = path.join(ROOT, "apps", "mobile", "src", "data", "tafsirSimplified.ts");
// İngilizce arayüz: AI destekli çeviri (scripts/translate-tafsir-en.mjs). Varsa
// ayrı klasöre yazılır; yalnız mobilde, yoksa Türkçeye düşülür.
const EN_SOURCE_PATH = path.join(ROOT, "content", "tafsir", "simplified-surah.en.json");
const MOBILE_DATA_DIR_EN = path.join(ROOT, "apps", "mobile", "src", "data", "tafsirSimplifiedDataEn");

function readEntries(sourcePath = SOURCE_PATH) {
  if (!fs.existsSync(sourcePath)) return [];
  const raw = fs.readFileSync(sourcePath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Simplified tafsir source must be an array.");
  }

  return parsed
    .filter((entry) => entry && entry.status === "available")
    .map((entry) => {
      const surahId = Number(entry.surahId);
      if (!Number.isInteger(surahId) || surahId < 1 || surahId > 114) {
        throw new Error(`Invalid surahId: ${entry.surahId}`);
      }
      if (!Array.isArray(entry.paragraphs) || entry.paragraphs.length === 0) {
        throw new Error(`Missing paragraphs for surah ${surahId}`);
      }
      const paragraphs = entry.paragraphs.map((paragraph) => {
        if (typeof paragraph !== "string" || paragraph.trim().length === 0) {
          throw new Error(`Invalid paragraph in surah ${surahId}`);
        }
        return paragraph.trim();
      });
      return { surahId, text: paragraphs.join("\n\n") };
    })
    .sort((a, b) => a.surahId - b.surahId);
}

function buildWebTypeScript(entries) {
  const lines = [
    "// Generated from content/tafsir/simplified-surah.json.",
    "// Run: node scripts/build-simplified-tafsir-assets.mjs",
    "",
    "export const SIMPLIFIED_TAFSIR: Record<number, string> = {",
  ];

  for (const entry of entries) {
    lines.push(`  ${entry.surahId}: ${JSON.stringify(entry.text)},`);
  }

  lines.push("};", "");
  return lines.join("\n");
}

function fileName(surahId) {
  return `${String(surahId).padStart(3, "0")}.json`;
}

function buildMobileLoader(entries, enEntries) {
  const lines = [
    "// Generated from content/tafsir/simplified-surah.json.",
    "// Run: node scripts/build-simplified-tafsir-assets.mjs",
    "//",
    "// Sure başına ayrı JSON + tembel require — 114 sure tek objede (~1.3MB)",
    "// eagerly bundle'a girip her açılışta belleğe yüklenmesin diye.",
    "/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */",
    "",
    "const LOADERS: Record<number, () => string> = {",
  ];

  for (const entry of entries) {
    lines.push(`  ${entry.surahId}: () => require("./tafsirSimplifiedData/${fileName(entry.surahId)}"),`);
  }

  lines.push("};", "", "// İngilizce: AI destekli çeviri (content/tafsir/simplified-surah.en.json).");
  lines.push("const LOADERS_EN: Record<number, () => string> = {");
  for (const entry of enEntries) {
    lines.push(`  ${entry.surahId}: () => require("./tafsirSimplifiedDataEn/${fileName(entry.surahId)}"),`);
  }
  lines.push(
    "};",
    "",
    "function load(table: Record<number, () => string>, surahId: number): string | null {",
    "  const loader = table[surahId];",
    "  if (!loader) return null;",
    "  try {",
    "    return loader();",
    "  } catch {",
    "    return null;",
    "  }",
    "}",
    "",
    "export function getSimplifiedTafsir(surahId: number): string | null {",
    "  return load(LOADERS, surahId);",
    "}",
    "",
    "/** İngilizce sadeleştirilmiş tefsir; çevirisi olmayan surede null. */",
    "export function getSimplifiedTafsirEn(surahId: number): string | null {",
    "  return load(LOADERS_EN, surahId);",
    "}",
    "",
  );
  return lines.join("\n");
}

const entries = readEntries();
const enEntries = readEntries(EN_SOURCE_PATH);

fs.mkdirSync(path.dirname(WEB_TARGET), { recursive: true });
fs.writeFileSync(WEB_TARGET, buildWebTypeScript(entries), "utf8");

fs.mkdirSync(MOBILE_DATA_DIR, { recursive: true });
for (const entry of entries) {
  fs.writeFileSync(path.join(MOBILE_DATA_DIR, fileName(entry.surahId)), JSON.stringify(entry.text), "utf8");
}
fs.rmSync(MOBILE_DATA_DIR_EN, { recursive: true, force: true });
if (enEntries.length) {
  fs.mkdirSync(MOBILE_DATA_DIR_EN, { recursive: true });
  for (const entry of enEntries) {
    fs.writeFileSync(path.join(MOBILE_DATA_DIR_EN, fileName(entry.surahId)), JSON.stringify(entry.text), "utf8");
  }
}
fs.writeFileSync(MOBILE_LOADER_PATH, buildMobileLoader(entries, enEntries), "utf8");

console.log(`Generated simplified tafsir assets for ${entries.length} surah(s) (${enEntries.length} English).`);