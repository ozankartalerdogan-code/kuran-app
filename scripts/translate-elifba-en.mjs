// Elif-Ba İngilizce uyarlaması (Codex, salt-okunur sandbox).
//   1) node scripts/export-elifba-source.mjs        → content/elifba/source.tr.json
//   2) node scripts/translate-elifba-en.mjs letters  → content/elifba/letters.en.json (29 harf + 9 ders başlığı)
//      (insan/Claude kontrolünden geçirilir)
//   3) node scripts/translate-elifba-en.mjs strings  → content/elifba/strings.en.json (tr→en sözlük)
//   4) node scripts/build-elifba-en.mjs              → apps/mobile/src/data/elifba.en.json
// Var olan çıktı atlanır. CODEX_MODEL ile model seçilir.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "content", "elifba");
const src = JSON.parse(readFileSync(path.join(DIR, "source.tr.json"), "utf8"));
const step = process.argv[2];

function codex(prompt) {
  const r = spawnSync(process.platform === "win32" ? "codex.cmd" : "codex",
    ["exec", "--sandbox", "read-only", "--skip-git-repo-check", ...(process.env.CODEX_MODEL ? ["-m", process.env.CODEX_MODEL] : []), "-"],
    { input: prompt, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, windowsHide: true, shell: process.platform === "win32" });
  if (r.status !== 0) throw new Error(`codex exit ${r.status}: ${(r.stderr || "").slice(-500)}`);
  return r.stdout;
}
function jsonFrom(out, open, close) {
  const s = out.indexOf(open), e = out.lastIndexOf(close);
  if (s < 0 || e < s) throw new Error(`JSON yok: ${out.slice(0, 300)}`);
  return JSON.parse(out.slice(s, e + 1));
}
const TR = /[çğışöüÇĞİŞÖÜ]/;

if (step === "letters") {
  const out = path.join(DIR, "letters.en.json");
  if (existsSync(out)) { console.log("letters.en.json zaten var"); process.exit(0); }
  const prompt = `You are adapting a Turkish Arabic-alphabet (Elif-Ba) course for English-speaking beginners.

For each Arabic letter below you get its Turkish name, the Turkish sound hint and the Turkish place of articulation (makhraj). Produce the English version:
- "harf_adi": the standard English name of the letter (Alif, Ba, Ta, Tha, Jeem, Haa, Khaa, Dal, Dhal, Ra, Zay, Seen, Sheen, Sad, Dad, Taa, Dhaa, Ayn, Ghayn, Fa, Qaf, Kaf, Lam, Meem, Noon, Waw, Ha, Ya, Lam-Alif). Use these spellings exactly; the two "Ha"-type letters must stay distinguishable (Haa = ح, Ha = ه, Khaa = خ), and Ta (ت) vs Taa (ط), Dhal (ذ) vs Dhaa (ظ), Kaf (ك) vs Qaf (ق).
- "harf_sesi": a SHORT sound hint for an English speaker (max ~22 characters), e.g. "b", "th (as in think)", "h (breathy)", "q (deep k)", "s (heavy)". Be phonetically correct for Classical Arabic: ث = th as in think, ذ = th as in this, ج = j, ح = h (breathy, from mid-throat), خ = kh (like Scottish loch), ص/ض/ط/ظ heavy (emphatic), ع = ʿ (throat sound), غ = gh (like French r), ق = q (deep k), و = w, ي = y, ء/ا = a / glottal stop.
- "mahrec": the place of articulation in plain English (e.g. "Lips", "Tip of tongue – upper teeth", "Deepest part of the throat"). Translate the Turkish faithfully; keep the same granularity.

Also translate the 9 lesson titles ("baslik"). Keep the "N. KONU: " prefix structure as "N. LESSON: " and keep UPPERCASE. Use standard English tajweed/Arabic-reading terms with simple transliteration: harakat (vowel marks), sukun (cezm), shaddah, madd letters, tanween, isha', madd and qasr, pronoun and Lafzatullah (the word Allah).

Output ONLY JSON: {"harfler":[{"harf_id":1,"harf_adi":"...","harf_sesi":"...","mahrec":"..."}...],"dersler":[{"id":1,"baslik":"..."}...]} with the same ids and counts. No commentary.

LETTERS (with Arabic glyph for reference):
${JSON.stringify(src.harfler)}
Arabic glyphs by harf_id 1..29: ا ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن و ه ي لا

LESSON TITLES:
${JSON.stringify(src.dersler)}`;
  const res = jsonFrom(codex(prompt), "{", "}");
  if (res.harfler?.length !== src.harfler.length || res.dersler?.length !== src.dersler.length) throw new Error("sayı uyuşmuyor");
  writeFileSync(out, JSON.stringify(res, null, 2) + "\n");
  console.log(`✓ ${out}`);
} else if (step === "strings") {
  const out = path.join(DIR, "strings.en.json");
  if (existsSync(out)) { console.log("strings.en.json zaten var"); process.exit(0); }
  const letters = JSON.parse(readFileSync(path.join(DIR, "letters.en.json"), "utf8"));
  const glossary = src.harfler.map((h, i) => ({
    tr_name: h.harf_adi, en_name: letters.harfler[i].harf_adi,
    tr_sound: h.harf_sesi, en_sound: letters.harfler[i].harf_sesi,
    tr_mahrec: h.mahrec, en_mahrec: letters.harfler[i].mahrec,
  }));
  const PROMPT = `You are translating quiz questions, answer options and hints from a Turkish Arabic-alphabet (Elif-Ba) course into clear English for beginners.

Rules:
- Use the GLOSSARY below for every letter name, sound hint and makhraj. When the Turkish text contains a Turkish letter name (e.g. 'Şın', 'Hı', 'Tı'), sound hint (e.g. "T (kalın)") or makhraj (e.g. "Boğaz sonu"), replace it with EXACTLY the English value from the glossary. An answer option that is only a letter name / sound / makhraj must become exactly the glossary value.
- "Bu harfin Türkçe adı nedir?" means "What is the name of this letter?" (do not say "Turkish name").
- Keep Arabic script, line breaks (\\n), quotes and punctuation structure exactly. Keep emphasis words in UPPERCASE (SONRAKİ → AFTER, BAŞINDAKİ → at the BEGINNING of a word, etc.).
- Terms: hareke → haraka (vowel mark), üstün → fatha, esre → kasra, ötre → damma, cezm → sukun, şedde → shaddah, tenvin → tanween, med → madd, kasr → qasr, kalın → heavy, ince → light, Lafzatullah → the word Allah (Lafzatullah).
- "Evet, birleşir" → "Yes, it connects"; "Hayır, birleşmez" → "No, it does not connect". Translate identical Turkish strings identically.
- Input is a JSON array of strings. Output ONLY a JSON array of strings with EXACTLY the same number of elements in the same order. No commentary.

GLOSSARY:
${JSON.stringify(glossary)}`;
  const strings = src.strings;
  const map = {};
  const CH = 90;
  for (let i = 0; i < strings.length; i += CH) {
    const part = strings.slice(i, i + CH);
    let ok = false;
    for (let t = 1; t <= 3 && !ok; t++) {
      try {
        const res = jsonFrom(codex(`${PROMPT}\n\nINPUT (${part.length} strings):\n${JSON.stringify(part)}`), "[", "]");
        if (res.length !== part.length) throw new Error(`öğe ${res.length} ≠ ${part.length}`);
        res.forEach((d, j) => {
          if (typeof d !== "string" || !d.trim()) throw new Error(`boş #${j}`);
          if (TR.test(d.replace(/[؀-ۿ]/g, ""))) throw new Error(`#${j} Türkçe harf kalmış: ${d}`);
        });
        part.forEach((s, j) => { map[s] = res[j].trim(); });
        ok = true;
        console.log(`  parça ${i / CH + 1}/${Math.ceil(strings.length / CH)} tamam`);
      } catch (e) { console.warn(`  parça ${i / CH + 1} deneme ${t}: ${e.message}`); }
    }
    if (!ok) throw new Error("parça başarısız");
  }
  writeFileSync(out, JSON.stringify(map, null, 2) + "\n");
  console.log(`✓ ${out}: ${Object.keys(map).length} metin`);
} else {
  console.error("Kullanım: translate-elifba-en.mjs letters|strings");
  process.exit(1);
}
