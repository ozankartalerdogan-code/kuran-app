import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_PATH = path.join(ROOT, "content", "tafsir", "simplified-surah.json");
const TARGETS = [
  path.join(ROOT, "apps", "mobile", "src", "data", "tafsirSimplified.ts"),
  path.join(ROOT, "apps", "web", "src", "app", "api", "tafsir", "simplifiedContent.ts"),
];

function readEntries() {
  const raw = fs.readFileSync(SOURCE_PATH, "utf8");
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

function buildTypeScript(entries) {
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

const entries = readEntries();
const output = buildTypeScript(entries);
for (const target of TARGETS) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, output, "utf8");
}
console.log(`Generated simplified tafsir assets for ${entries.length} surah(s).`);