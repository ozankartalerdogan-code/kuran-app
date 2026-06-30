import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_JSON = path.join(ROOT, "content", "tafsir", "simplified-surah.json");
const ELMALILI_DIR = path.join(ROOT, "data", "tafsir", "elmalili");
const BUILD_ASSETS_SCRIPT = path.join(ROOT, "scripts", "build-simplified-tafsir-assets.mjs");
const API_URL = "https://api.deepseek.com/chat/completions";

const DEFAULT_MODEL = "deepseek-v4-flash";
const INPUT_USD_PER_M = 0.14;
const OUTPUT_USD_PER_M = 0.28;

const SURAH_NAMES = new Map([
  [1, "Fatiha"], [2, "Bakara"], [3, "Al-i Ã„Â°mran"], [4, "Nisa"], [5, "Maide"], [6, "Enam"], [7, "Araf"], [8, "Enfal"], [9, "Tevbe"], [10, "Yunus"],
  [11, "Hud"], [12, "Yusuf"], [13, "Rad"], [14, "Ã„Â°brahim"], [15, "Hicr"], [16, "Nahl"], [17, "Ã„Â°sra"], [18, "Kehf"], [19, "Meryem"], [20, "Taha"],
  [21, "Enbiya"], [22, "Hac"], [23, "Muminun"], [24, "Nur"], [25, "Furkan"], [26, "Ã…Âuara"], [27, "Neml"], [28, "Kasas"], [29, "Ankebut"], [30, "Rum"],
  [31, "Lokman"], [32, "Secde"], [33, "Ahzab"], [34, "Sebe"], [35, "FatÃ„Â±r"], [36, "Yasin"], [37, "Saffat"], [38, "Sad"], [39, "Zumer"], [40, "Mumin"],
  [41, "Fussilet"], [42, "Ã…Âura"], [43, "Zuhruf"], [44, "Duhan"], [45, "Casiye"], [46, "Ahkaf"], [47, "Muhammed"], [48, "Fetih"], [49, "Hucurat"], [50, "Kaf"],
  [51, "Zariyat"], [52, "Tur"], [53, "Necm"], [54, "Kamer"], [55, "Rahman"], [56, "VakÃ„Â±a"], [57, "Hadid"], [58, "Mucadele"], [59, "HaÃ…Å¸r"], [60, "Mumtehine"],
  [61, "Saf"], [62, "Cuma"], [63, "Munafikun"], [64, "Tegabun"], [65, "Talak"], [66, "Tahrim"], [67, "Mulk"], [68, "Kalem"], [69, "Hakka"], [70, "Mearic"],
  [71, "Nuh"], [72, "Cin"], [73, "Muzzemmil"], [74, "Muddessir"], [75, "KÃ„Â±yame"], [76, "Ã„Â°nsan"], [77, "Murselat"], [78, "Nebe"], [79, "Naziat"], [80, "Abese"],
  [81, "Tekvir"], [82, "Ã„Â°nfitar"], [83, "Mutaffifin"], [84, "Ã„Â°nÃ…Å¸ikak"], [85, "Buruc"], [86, "TarÃ„Â±k"], [87, "Ala"], [88, "GaÃ…Å¸iye"], [89, "Fecr"], [90, "Beled"],
  [91, "Ã…Âems"], [92, "Leyl"], [93, "Duha"], [94, "Ã„Â°nÃ…Å¸irah"], [95, "Tin"], [96, "Alak"], [97, "Kadir"], [98, "Beyyine"], [99, "Zilzal"], [100, "Adiyat"],
  [101, "Karia"], [102, "Tekasur"], [103, "Asr"], [104, "Humeze"], [105, "Fil"], [106, "KureyÃ…Å¸"], [107, "Maun"], [108, "Kevser"], [109, "Kafirun"], [110, "Nasr"],
  [111, "Tebbet"], [112, "Ã„Â°hlas"], [113, "Felak"], [114, "Nas"],
]);

function parseArgs(argv) {
  const args = {
    apply: false,
    force: false,
    rebuild: true,
    model: DEFAULT_MODEL,
    surahs: null,
    status: "draft",
    maxChars: 45000,
    maxOutputTokens: 2800,
    maxCostUsd: 0.85,
    sleepMs: 600,
  };

  for (const arg of argv) {
    if (arg === "--apply") args.apply = true;
    else if (arg === "--force") args.force = true;
    else if (arg === "--no-rebuild") args.rebuild = false;
    else if (arg.startsWith("--model=")) args.model = arg.slice("--model=".length);
    else if (arg.startsWith("--surahs=")) args.surahs = parseSurahs(arg.slice("--surahs=".length));
    else if (arg === "--remaining") args.surahs = "remaining";
    else if (arg.startsWith("--status=")) args.status = arg.slice("--status=".length);
    else if (arg.startsWith("--max-chars=")) args.maxChars = Number(arg.slice("--max-chars=".length));
    else if (arg.startsWith("--max-output-tokens=")) args.maxOutputTokens = Number(arg.slice("--max-output-tokens=".length));
    else if (arg.startsWith("--max-cost-usd=")) args.maxCostUsd = Number(arg.slice("--max-cost-usd=".length));
    else if (arg.startsWith("--sleep-ms=")) args.sleepMs = Number(arg.slice("--sleep-ms=".length));
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!args.surahs) args.surahs = "remaining";
  if (!Number.isFinite(args.maxChars) || args.maxChars < 10000) throw new Error("--max-chars must be >= 10000");
  if (!Number.isFinite(args.maxCostUsd) || args.maxCostUsd <= 0) throw new Error("--max-cost-usd must be positive");
  if (!Number.isFinite(args.maxOutputTokens) || args.maxOutputTokens < 500) throw new Error("--max-output-tokens must be >= 500");
  return args;
}

function parseSurahs(value) {
  const ids = new Set();
  for (const part of value.split(",").map((x) => x.trim()).filter(Boolean)) {
    const range = part.match(/^(\d+)-(\d+)$/u);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      for (let id = Math.min(start, end); id <= Math.max(start, end); id++) ids.add(id);
    } else {
      ids.add(Number(part));
    }
  }
  const list = [...ids].sort((a, b) => a - b);
  for (const id of list) {
    if (!Number.isInteger(id) || id < 1 || id > 114) throw new Error(`Invalid surah id: ${id}`);
  }
  return list;
}

function loadEnv() {
  for (const file of [".env.local", path.join("apps", "web", ".env.local")]) {
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) continue;
    const lines = fs.readFileSync(full, "utf8").split(/\r?\n/u);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const index = trimmed.indexOf("=");
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^[\x27"]|[\x27"]$/gu, "");
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

function readSourceEntries() {
  if (!fs.existsSync(SOURCE_JSON)) return [];
  const parsed = JSON.parse(fs.readFileSync(SOURCE_JSON, "utf8"));
  if (!Array.isArray(parsed)) throw new Error("Simplified tafsir source must be an array.");
  return parsed;
}

function writeSourceEntries(entries) {
  entries.sort((a, b) => Number(a.surahId) - Number(b.surahId));
  fs.mkdirSync(path.dirname(SOURCE_JSON), { recursive: true });
  fs.writeFileSync(SOURCE_JSON, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
}

function getExistingIds(entries) {
  return new Set(entries.filter((e) => e && e.status === "available").map((e) => Number(e.surahId)));
}

function readTafsir(surahId) {
  const file = path.join(ELMALILI_DIR, `${surahId}.md`);
  if (!fs.existsSync(file)) throw new Error(`Missing ElmalÃ„Â±lÃ„Â± file: ${file}`);
  return fs.readFileSync(file, "utf8").replace(/\r\n/gu, "\n").trim();
}

function normalizeOriginalText(text) {
  return text
    .replace(/^\s*\d+[-Ã¢â‚¬â€œ][^\n]+\n+[-\s]+/u, "")
    .replace(/[ \t]+\n/gu, "\n")
    .replace(/\n{4,}/gu, "\n\n\n")
    .trim();
}

function chunkText(text, maxChars) {
  if (text.length <= maxChars) return [text];
  const paragraphs = text.split(/\n{2,}/u).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let current = "";
  for (const paragraph of paragraphs) {
    if (paragraph.length > maxChars) {
      if (current) chunks.push(current.trim());
      current = "";
      for (let i = 0; i < paragraph.length; i += maxChars) {
        chunks.push(paragraph.slice(i, i + maxChars).trim());
      }
      continue;
    }
    const next = current ? `${current}\n\n${paragraph}` : paragraph;
    if (next.length > maxChars && current) {
      chunks.push(current.trim());
      current = paragraph;
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

function approxTokensFromChars(chars) {
  return Math.ceil(chars / 3);
}

function estimateJobCost(jobs, maxOutputTokens) {
  const inputTokens = jobs.reduce((sum, job) => sum + approxTokensFromChars(job.text.length + 2200), 0);
  const outputTokens = jobs.length * maxOutputTokens;
  return {
    inputTokens,
    outputTokens,
    usd: (inputTokens / 1_000_000) * INPUT_USD_PER_M + (outputTokens / 1_000_000) * OUTPUT_USD_PER_M,
  };
}

function buildJobs(surahIds, maxChars) {
  const jobs = [];
  for (const surahId of surahIds) {
    const source = normalizeOriginalText(readTafsir(surahId));
    const chunks = chunkText(source, maxChars);
    chunks.forEach((text, index) => {
      jobs.push({
        surahId,
        surahName: SURAH_NAMES.get(surahId) ?? `Sure ${surahId}`,
        chunkIndex: index + 1,
        chunkCount: chunks.length,
        text,
      });
    });
  }
  return jobs;
}

function systemPrompt() {
  return [
    "Sen deneyimli bir Turkce editoru ve Islami metin sadelestirme yardimcisisin.",
    "Gorevin Elmalili Hamdi Yazir tefsirini Turkceden Turkceye sadelestirmek; yeni hukum, yeni kaynak veya kendi yorumunu eklemek degil.",
    "Ayet bazli aciklamalari, sure icindeki ana basliklari, sebeb-i nuzul/kelime aciklamasi/fikhi veya akaid vurgusu gibi onemli noktalari atlama.",
    "Arapca ibareleri zorunlu degilse sade Turkce aciklamayla aktar; ozel kavramlari koru ve gerekiyorsa kisa acikla.",
    "Uzun alinti yapma; orijinal metni kopyalama. Okunur, sakin ve herkesin anlayacagi bir dil kullan.",
    "Sadece gecerli JSON dondur. Markdown, aciklama veya kod blogu kullanma.",
  ].join("\n");
}

function expectedParagraphCount(job) {
  return Math.max(5, Math.min(18, Math.ceil(job.text.length / 6000)));
}

function userPrompt(job) {
  return JSON.stringify({
    task: "Elmalili tefsirini sadelestir",
    surahId: job.surahId,
    surahName: job.surahName,
    part: `${job.chunkIndex}/${job.chunkCount}`,
    requirements: [
      "Bu parcada gecen ayet bazli tefsir notlarini ve onemli vurgulari koru.",
      "Paragraflar dogal sirada ilerlesin; her paragraf tek ana fikir tasisin.",
      "Cok kisa ozetleme yapma; atlama hissi olusmasin.",
      `Bu parca icin en az ${expectedParagraphCount(job)} paragraf uret; tek paragrafla yetinme.`,
      "Kaynak metnin basindan sonuna kadar ilerle; kelime aciklamasinda takilip sonraki ayetleri atlama.",
      "Orijinal metindeki tartisma/gorus ayrimi varsa sade bicimde belirt.",
      "Dini kesinlik iddiasini artirma; Elmalili'nin anlattigi cercevede kal.",
      "Cikti Turkce karakter kullanmali: ğ, ü, ş, ı, ö, ç, İ.",
      "Donus formati: {\"paragraphs\":[\"...\",\"...\"]}",
    ],
    sourceText: job.text,
  });
}
async function callDeepSeek(job, args) {
  // Bozuk/yarim JSON veya gecici HTTP hatasinda parcayi tekrar dene; aksi halde
  // tek kotu parca koca sureyi (orn. Bakara 65 parca) dusuruyor.
  const maxAttempts = 4;
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await callDeepSeekOnce(job, args);
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ! retry ${attempt}/${maxAttempts} surah ${job.surahId} part ${job.chunkIndex}/${job.chunkCount}: ${msg.slice(0, 100)}`);
      if (attempt < maxAttempts) await sleep(1200 * attempt);
    }
  }
  throw lastErr;
}

async function callDeepSeekOnce(job, args) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY missing. Put it in .env.local.");

  const body = {
    model: args.model,
    messages: [
      { role: "system", content: systemPrompt() },
      { role: "user", content: userPrompt(job) },
    ],
    temperature: 0.2,
    max_tokens: args.maxOutputTokens,
    response_format: { type: "json_object" },
  };

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`DeepSeek HTTP ${response.status}: ${text.slice(0, 1000)}`);
  }

  const payload = JSON.parse(text);
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error(`Missing model content for surah ${job.surahId} part ${job.chunkIndex}`);
  }

  const parsed = parseModelJson(content);
  if (!Array.isArray(parsed.paragraphs) || parsed.paragraphs.length === 0) {
    throw new Error(`Invalid paragraphs for surah ${job.surahId} part ${job.chunkIndex}`);
  }

  return {
    paragraphs: parsed.paragraphs.map((p) => String(p).trim()).filter(Boolean),
    usage: payload.usage ?? null,
  };
}

function parseModelJson(content) {
  const trimmed = content.trim().replace(/^```json\s*/u, "").replace(/\s*```$/u, "");
  return JSON.parse(trimmed);
}

function upsertEntry(entries, entry, force) {
  const index = entries.findIndex((item) => Number(item.surahId) === Number(entry.surahId));
  if (index >= 0) {
    if (!force && entries[index].status === "available") return false;
    entries[index] = entry;
    return true;
  }
  entries.push(entry);
  return true;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  loadEnv();
  const args = parseArgs(process.argv.slice(2));
  const entries = readSourceEntries();
  const availableIds = getExistingIds(entries);
  const allSurahs = Array.from({ length: 114 }, (_, i) => i + 1);
  const selectedSurahs = args.surahs === "remaining"
    ? allSurahs.filter((id) => !availableIds.has(id))
    : args.surahs;
  const targetSurahs = args.force ? selectedSurahs : selectedSurahs.filter((id) => !availableIds.has(id));

  if (targetSurahs.length === 0) {
    console.log("No surahs to process.");
    return;
  }

  const jobs = buildJobs(targetSurahs, args.maxChars);
  const estimate = estimateJobCost(jobs, args.maxOutputTokens);
  console.log(`Model: ${args.model}`);
  console.log(`Surahs: ${targetSurahs.join(",")}`);
  console.log(`Jobs: ${jobs.length}`);
  console.log(`Estimated tokens: input~${estimate.inputTokens}, output cap~${estimate.outputTokens}`);
  console.log(`Estimated max cost: $${estimate.usd.toFixed(4)} (limit $${args.maxCostUsd.toFixed(4)})`);

  if (estimate.usd > args.maxCostUsd) {
    throw new Error("Estimated cost exceeds --max-cost-usd. Use a smaller batch or raise the limit.");
  }
  if (!args.apply) {
    console.log("Dry run only. Add --apply to call DeepSeek and write results.");
    return;
  }

  const bySurah = new Map();
  let actualPromptTokens = 0;
  let actualCompletionTokens = 0;
  for (const job of jobs) {
    console.log(`Generating ${job.surahId} ${job.surahName} part ${job.chunkIndex}/${job.chunkCount}...`);
    const result = await callDeepSeek(job, args);
    if (!bySurah.has(job.surahId)) bySurah.set(job.surahId, []);
    bySurah.get(job.surahId).push(...result.paragraphs);
    if (result.usage) {
      actualPromptTokens += Number(result.usage.prompt_tokens ?? 0);
      actualCompletionTokens += Number(result.usage.completion_tokens ?? 0);
    }
    if (args.sleepMs > 0) await sleep(args.sleepMs);
  }

  for (const surahId of targetSurahs) {
    const paragraphs = (bySurah.get(surahId) ?? []).map((p) => p.trim()).filter(Boolean);
    if (paragraphs.length === 0) throw new Error(`No paragraphs generated for surah ${surahId}`);
    upsertEntry(entries, {
      surahId,
      source: "elmalili-simplified-deepseek-v4-flash",
      status: args.status,
      generatedAt: new Date().toISOString(),
      model: args.model,
      paragraphs,
    }, true);
  }

  writeSourceEntries(entries);
  console.log(`Wrote ${SOURCE_JSON}`);
  if (actualPromptTokens || actualCompletionTokens) {
    const actualUsd = (actualPromptTokens / 1_000_000) * INPUT_USD_PER_M + (actualCompletionTokens / 1_000_000) * OUTPUT_USD_PER_M;
    console.log(`Actual tokens: prompt=${actualPromptTokens}, completion=${actualCompletionTokens}, approx=$${actualUsd.toFixed(4)}`);
  }

  if (args.rebuild) {
    await import(`file://${BUILD_ASSETS_SCRIPT.replace(/\\/gu, "/")}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
