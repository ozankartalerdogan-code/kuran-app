/**
 * prepare-buckwalter-cleanup-v1_8.mjs
 *
 * words.lemma / words.root alanlarında kalan ASCII Buckwalter değerlerini
 * korpusun mevcut Arapça imla konvansiyonuna dönüştürür.
 *
 * Kapsam (doğrulanmış): 3327 lemma / 13 distinct + 45 root / 1 distinct = 3372 hücre / 14 distinct
 *
 * DOKUNULMAZ: arabic, meaning_tr, pos, morphology, confidence, source, role,
 *             root_meanings tablosu (hiç UPDATE yok), satır/token sayıları.
 *
 * Hedef değerler TRANSLİTERASYONLA DEĞİL, korpus içi kanıttan türetildi:
 * her lemma hücresinin `morphology` alanındaki `LEM:` etiketi (13/13 değerde
 * %100 kapsama). Bu yüzden ör. EalaY` → عَلَى (hançer elif YOK) iken
 * la`kin → لٰكِنّ (hançer elif VAR) — görsel/naif çeviri farkı yakalar.
 *
 *   node --env-file=apps/web/.env.local scripts/morphology/prepare-buckwalter-cleanup-v1_8.mjs         # DRY (yazma yok)
 *   node --env-file=apps/web/.env.local scripts/morphology/prepare-buckwalter-cleanup-v1_8.mjs --apply  # yerel + Turso
 */
import { createClient } from "@libsql/client";
import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(DIR, "../..");
const LOCAL_DB = path.join(REPO, "data", "app.db");
const OUT_DIR = path.join(REPO, "data", "candidates", "morphology", "final-v1_8", "buckwalter-cleanup-v1_8");
const BACKUP_DIR = path.join(REPO, "backups");
const APPLY = process.argv.includes("--apply");

const EXPECTED_LEMMA = 3327;
const EXPECTED_ROOT = 45;
const EXPECTED_TOTAL = EXPECTED_LEMMA + EXPECTED_ROOT;

// ── Dönüşüm tablosu — hedefler kod noktası kaçışlarıyla (normalizasyon-bağımsız)
// group: aynı lexical gruba düşen BW değerleri
const MAP_LEMMA = [
  { bw: "<in~", n: 757, to: "\u0625\u0650\u0646\u0651", group: "inna", ev: "morphology-LEM-exact" },
  { bw: "EalaY`", n: 731, to: "\u0639\u064e\u0644\u064e\u0649", group: "alaa", ev: "morphology-LEM-exact" },
  { bw: "min", n: 564, to: "\u0645\u0650\u0646", group: "min", ev: "morphology-LEM-exact" },
  { bw: "fiY", n: 423, to: "\u0641\u0650\u064a", group: "fii", ev: "morphology-LEM-exact" },
  { bw: "<ilaY`", n: 308, to: "\u0625\u0650\u0644\u064e\u0649", group: "ilaa", ev: "morphology-LEM-exact" },
  { bw: "Ean", n: 189, to: "\u0639\u064e\u0646", group: "an", ev: "morphology-LEM-exact" },
  { bw: ">an~", n: 184, to: "\u0623\u064e\u0646\u0651", group: "anna", ev: "morphology-LEM-exact" },
  { bw: "laEal~", n: 120, to: "\u0644\u064e\u0639\u064e\u0644\u0651", group: "laalla", ev: "morphology-LEM-exact" },
  { bw: "ka>an~", n: 22, to: "\u0643\u064e\u0623\u064e\u0646\u0651", group: "kaanna", ev: "morphology-LEM-exact" },
  { bw: "layot", n: 11, to: "\u0644\u064e\u064a\u0652\u062a", group: "layta", ev: "morphology-LEM-exact" },
  { bw: "l~aEal~", n: 6, to: "\u0644\u064e\u0639\u064e\u0644\u0651", group: "laalla", ev: "morphology-LEM-exact" },
  // Aşağıdaki iki değer kullanıcı kararıyla (kanıt yönünde) TEK gruba birleşir.
  // Ham BW, 8 `la`kin` kaydında şeddeyi eksik kodlamış; yüzey + morphology şeddeli.
  { bw: "la`kin", n: 8, to: "\u0644\u0670\u0643\u0650\u0646\u0651", group: "laakinna", ev: "morphology-LEM-exact+surface-shadda" },
  { bw: "la`kin~", n: 4, to: "\u0644\u0670\u0643\u0650\u0646\u0651", group: "laakinna", ev: "morphology-LEM-exact+surface-shadda" },
];
// root: morphology'de ROOT: etiketi YOK → kanıt sınıfı farklı (lexicon + paradigma)
const MAP_ROOT = [
  { bw: "Awl", n: 45, to: "\u0623\u0648\u0644", group: "awl", ev: "root-lexicon+lemma-paradigm" },
];

const SHADDA = "\u0651";
const LAAKIN_NOSHADDA = "\u0644\u0670\u0643\u0650\u0646"; // korunacak ayrı grup

function die(msg) { console.error(`\n✖ FAIL-CLOSED: ${msg}`); process.exit(1); }
const norm = (v) => (v === null || v === undefined ? "" : String(v));
const sqlStr = (v) => (v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
const cps = (v) => [...String(v)].map((c) => c.codePointAt(0).toString(16).padStart(4, "0")).join(" ");
const sha256 = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const isArabicCp = (cp) =>
  (cp >= 0x0600 && cp <= 0x06ff) || (cp >= 0x0750 && cp <= 0x077f) ||
  (cp >= 0x08a0 && cp <= 0x08ff) || (cp >= 0xfb50 && cp <= 0xfdff) || (cp >= 0xfe70 && cp <= 0xfeff);
const hasNonArabic = (s) => [...String(s)].some((ch) => !isArabicCp(ch.codePointAt(0)) && ch !== " ");

if (!fs.existsSync(LOCAL_DB)) die("local app.db yok");
const local = new DatabaseSync(LOCAL_DB, { readOnly: !APPLY });

// ── GATE 1: kapsam — tam olarak beklenen ASCII değer kümesi ──────────────────
const scan = (field) => {
  const rows = local.prepare(
    `SELECT id, verse_key, word_index, arabic, lemma, root, ${field} AS v, pos, morphology FROM words WHERE ${field} IS NOT NULL AND ${field} <> ''`
  ).all();
  const g = new Map();
  for (const r of rows) if (hasNonArabic(r.v)) {
    if (!g.has(r.v)) g.set(r.v, []);
    g.get(r.v).push(r);
  }
  return g;
};
const lemGroups = scan("lemma");
const rootGroups = scan("root");
const lemTotal = [...lemGroups.values()].reduce((s, a) => s + a.length, 0);
const rootTotal = [...rootGroups.values()].reduce((s, a) => s + a.length, 0);

console.log("── Buckwalter cleanup v1.8 — DRY / patch hazırlığı ──");
if (lemTotal !== EXPECTED_LEMMA) die(`lemma ASCII token ${lemTotal} ≠ ${EXPECTED_LEMMA}`);
if (rootTotal !== EXPECTED_ROOT) die(`root ASCII token ${rootTotal} ≠ ${EXPECTED_ROOT}`);
if (lemGroups.size !== MAP_LEMMA.length) die(`lemma distinct ${lemGroups.size} ≠ ${MAP_LEMMA.length}`);
if (rootGroups.size !== MAP_ROOT.length) die(`root distinct ${rootGroups.size} ≠ ${MAP_ROOT.length}`);
// başka ASCII değer hedeflenmiyor + sayılar birebir
for (const m of MAP_LEMMA) {
  if (!lemGroups.has(m.bw)) die(`beklenen lemma '${m.bw}' DB'de yok`);
  if (lemGroups.get(m.bw).length !== m.n) die(`lemma '${m.bw}' ${lemGroups.get(m.bw).length} ≠ beklenen ${m.n}`);
}
for (const m of MAP_ROOT) {
  if (!rootGroups.has(m.bw)) die(`beklenen root '${m.bw}' DB'de yok`);
  if (rootGroups.get(m.bw).length !== m.n) die(`root '${m.bw}' ${rootGroups.get(m.bw).length} ≠ beklenen ${m.n}`);
}
for (const k of lemGroups.keys()) if (!MAP_LEMMA.some((m) => m.bw === k)) die(`beklenmeyen ASCII lemma: ${JSON.stringify(k)}`);
for (const k of rootGroups.keys()) if (!MAP_ROOT.some((m) => m.bw === k)) die(`beklenmeyen ASCII root: ${JSON.stringify(k)}`);
console.log(`GATE kapsam : lemma ${lemTotal}/${lemGroups.size} distinct · root ${rootTotal}/${rootGroups.size} distinct · toplam ${lemTotal + rootTotal}/${lemGroups.size + rootGroups.size}`);

// ── GATE 2: kanıt — İKİ AYRI SINIF, birlikte raporlanmaz ────────────────────
//  (a) lemma  3327 hücre → morphology `LEM:` etiketi hedefle codepoint-eşit
//  (b) root     45 hücre → `ROOT:` etiketi YOK; kanıt = root-lexicon + lemma-paradigm
//      (45/45 lemma=ذُو, yüzey أُوْلِي/أُوْلُواْ, mevcut أول root'u 125 token,
//       root_meanings id=201 أولو/أولات paradigmasını kapsıyor)
//  Bu iki sınıf ASLA "3372/3372 LEM kanıtı" diye birleştirilmez.
const lemTagOf = (morph) => {
  const out = [];
  for (const seg of String(morph || "").split("|")) {
    const s = seg.trim();
    if (s.startsWith("LEM:")) out.push(s.slice(4).trim());
  }
  return out;
};
const cells = [];
let excluded = 0;
for (const m of MAP_LEMMA) {
  for (const r of lemGroups.get(m.bw)) {
    const tags = lemTagOf(r.morphology);
    const tagMatch = tags.includes(m.to);
    let ok = tagMatch, evClass = m.ev, note = "";
    // la`kin ailesi: ek şedde kanıtı; şeddesiz çıkan token fail-closed dışlanır
    if (m.group === "laakinna") {
      const surfaceShadda = String(r.arabic || "").includes(SHADDA);
      const tagIsNoShadda = tags.includes(LAAKIN_NOSHADDA);
      if (!surfaceShadda || tagIsNoShadda) { ok = false; note = "şeddesiz لٰكِن — patch dışı"; }
      evClass = `${m.ev}(surface_shadda=${surfaceShadda},pos=${r.pos})`;
    }
    if (!ok) { excluded++; console.log(`  ⚠ DIŞLANDI id=${r.id} ${r.verse_key}:${r.word_index} ${JSON.stringify(m.bw)} tags=${JSON.stringify(tags)} ${note}`); continue; }
    cells.push({
      id: r.id, ref: `${r.verse_key}:${r.word_index}`, field: "lemma",
      current_ascii: m.bw, current_ascii_cps: cps(m.bw),
      proposed_arabic: m.to, proposed_arabic_cps: cps(m.to),
      lexical_group: m.group, evidence_class: evClass,
      arabic_surface: r.arabic, arabic_surface_cps: cps(r.arabic || ""),
      pos: r.pos, morphology_lem_tags: tags,
    });
  }
}
const lemmaEvidenceCells = cells.length; // (a) sınıfı: LEM: etiketli
// (b) sınıfı: root — LEM kanıtı YOK, ayrı doğrulanır
let rootParadigmOk = 0;
for (const m of MAP_ROOT) {
  for (const r of rootGroups.get(m.bw)) {
    // paradigma kanıtı: bu tokenların lemma'sı ذُو ve yüzey أول paradigmasında
    if (norm(r.lemma) === "\u0630\u064f\u0648") rootParadigmOk++;
    cells.push({
      id: r.id, ref: `${r.verse_key}:${r.word_index}`, field: "root",
      current_ascii: m.bw, current_ascii_cps: cps(m.bw),
      proposed_arabic: m.to, proposed_arabic_cps: cps(m.to),
      lexical_group: m.group, evidence_class: m.ev,
      arabic_surface: r.arabic, arabic_surface_cps: cps(r.arabic || ""),
      pos: r.pos, morphology_lem_tags: lemTagOf(r.morphology),
    });
  }
}
if (excluded > 0) die(`${excluded} hücre kanıt kapısında dışlandı — kapsam ${EXPECTED_TOTAL} değil, patch üretilmedi`);
if (cells.length !== EXPECTED_TOTAL) die(`review hücre sayısı ${cells.length} ≠ ${EXPECTED_TOTAL}`);
if (lemmaEvidenceCells !== EXPECTED_LEMMA) die(`LEM kanıtlı lemma hücresi ${lemmaEvidenceCells} ≠ ${EXPECTED_LEMMA}`);
if (rootParadigmOk !== EXPECTED_ROOT) die(`root paradigma kanıtı ${rootParadigmOk}/${EXPECTED_ROOT} (lemma=ذُو değil)`);
console.log(`GATE kanıt (a): ${lemmaEvidenceCells}/${EXPECTED_LEMMA} lemma hücresi — morphology LEM: etiketi hedefle codepoint-eşit · dışlanan 0`);
console.log(`GATE kanıt (b): ${rootParadigmOk}/${EXPECTED_ROOT} root hücresi — ROOT: etiketi YOK; root-lexicon + lemma-paradigm (lemma=ذُو)`);
console.log(`                (a) ve (b) ayrı sınıflardır; "3372/3372 LEM kanıtı" GEÇERSİZ bir genellemedir.`);

// ── GATE 3: hedef değerler saf Arapça + çakışma/birleşme raporu ──────────────
const merges = [];
for (const m of [...MAP_LEMMA, ...MAP_ROOT]) {
  const field = MAP_ROOT.includes(m) ? "root" : "lemma";
  if (hasNonArabic(m.to)) die(`hedef değer ASCII içeriyor: ${JSON.stringify(m.to)}`);
  const existing = local.prepare(`SELECT COUNT(*) c FROM words WHERE ${field}=?`).get(m.to).c;
  merges.push({ field, bw: m.bw, to: m.to, to_cps: cps(m.to), group: m.group,
    incoming: m.n, existing_arabic: existing, merges_with_existing: existing > 0, after: existing + m.n });
}
// aynı gruba düşen BW değerleri (grup içi birleşme)
const byTarget = new Map();
for (const mg of merges) {
  const k = `${mg.field}|${mg.to}`;
  if (!byTarget.has(k)) byTarget.set(k, []);
  byTarget.get(k).push(mg.bw);
}
// şeddesiz لٰكِن grubu korunuyor mu?
const noShaddaBefore = local.prepare("SELECT COUNT(*) c FROM words WHERE lemma=?").get(LAAKIN_NOSHADDA).c;

// ── Yedek + pre-image (yerel + Turso) ────────────────────────────────────────
fs.mkdirSync(OUT_DIR, { recursive: true }); fs.mkdirSync(BACKUP_DIR, { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, "-");

const url = process.env.TURSO_DB_URL, authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) die("TURSO_DB_URL / TURSO_AUTH_TOKEN yok (--env-file=apps/web/.env.local?)");
const turso = createClient({ url: url.replace(/^libsql:\/\//, "https://"), authToken });
const tget = async (sql, args) => (await turso.execute({ sql, args })).rows;

// Turso tarafı kapsam doğrulaması + pre-image (id bazlı, parçalı IN sorgusu)
const ids = cells.map((c) => c.id);
const tursoPre = [];
for (let i = 0; i < ids.length; i += 400) {
  const chunk = ids.slice(i, i + 400);
  const rows = await tget(
    `SELECT id, verse_key, word_index, lemma, root FROM words WHERE id IN (${chunk.map(() => "?").join(",")})`, chunk);
  for (const r of rows) tursoPre.push({ id: Number(r.id), ref: `${r.verse_key}:${r.word_index}`, lemma: norm(r.lemma), root: norm(r.root) });
}
if (tursoPre.length !== cells.length) die(`Turso pre-image ${tursoPre.length} ≠ ${cells.length}`);
const tByIdemp = new Map(tursoPre.map((r) => [r.id, r]));
for (const c of cells) {
  const t = tByIdemp.get(c.id);
  if (!t) die(`Turso'da id=${c.id} yok`);
  if (t.ref !== c.ref) die(`Turso id=${c.id} konum ${t.ref} ≠ ${c.ref}`);
  const cur = c.field === "lemma" ? t.lemma : t.root;
  if (cur !== c.current_ascii) die(`Turso id=${c.id} ${c.field}=${JSON.stringify(cur)} ≠ beklenen ${JSON.stringify(c.current_ascii)}`);
}
// Turso'da başka ASCII lemma/root kalmadığını da doğrula (sayı bazlı)
const tLemAll = await tget("SELECT lemma v, COUNT(*) c FROM words WHERE lemma IS NOT NULL AND lemma<>'' GROUP BY lemma", []);
const tRootAll = await tget("SELECT root v, COUNT(*) c FROM words WHERE root IS NOT NULL AND root<>'' GROUP BY root", []);
const tLemAscii = tLemAll.filter((r) => hasNonArabic(r.v));
const tRootAscii = tRootAll.filter((r) => hasNonArabic(r.v));
const tLemN = tLemAscii.reduce((s, r) => s + Number(r.c), 0);
const tRootN = tRootAscii.reduce((s, r) => s + Number(r.c), 0);
if (tLemN !== EXPECTED_LEMMA || tLemAscii.length !== MAP_LEMMA.length) die(`Turso lemma ASCII ${tLemN}/${tLemAscii.length} ≠ ${EXPECTED_LEMMA}/${MAP_LEMMA.length}`);
if (tRootN !== EXPECTED_ROOT || tRootAscii.length !== MAP_ROOT.length) die(`Turso root ASCII ${tRootN}/${tRootAscii.length} ≠ ${EXPECTED_ROOT}/${MAP_ROOT.length}`);
console.log(`GATE Turso  : lemma ${tLemN}/${tLemAscii.length} · root ${tRootN}/${tRootAscii.length} — yerelle birebir`);

const localBackup = path.join(BACKUP_DIR, `app-before-buckwalter-cleanup-v1_8-${ts}.db`);
fs.copyFileSync(LOCAL_DB, localBackup);

// ── MANIFEST: dry-run pre-image'i KORU, mevcut değerlerle birebir karşılaştır ──
const preTursoPath = path.join(OUT_DIR, "pre-image-turso.json");
const preLocalPath = path.join(OUT_DIR, "pre-image-local.json");
const curLocalRows = cells.map((c) => ({ id: c.id, ref: c.ref, field: c.field, value: c.current_ascii }));
const cmpManifest = (file, rows, keyOf) => {
  if (!fs.existsSync(file)) return "yeni-yazıldı";
  const prev = JSON.parse(fs.readFileSync(file, "utf-8")).rows;
  if (prev.length !== rows.length) die(`manifest ${path.basename(file)} satır ${prev.length} ≠ ${rows.length}`);
  const pm = new Map(prev.map((r) => [r.id, keyOf(r)]));
  for (const r of rows) {
    const want = pm.get(r.id);
    if (want === undefined) die(`manifest ${path.basename(file)}: id=${r.id} yok`);
    if (want !== keyOf(r)) die(`manifest ${path.basename(file)}: id=${r.id} ${JSON.stringify(keyOf(r))} ≠ manifest ${JSON.stringify(want)}`);
  }
  return "eşleşti";
};
const mLocal = cmpManifest(preLocalPath, curLocalRows, (r) => `${r.field}|${r.value}`);
// Turso manifestosu satır başına {id, ref, lemma, root} tutar; hücrenin ALANINA
// göre doğru sütun seçilmeli (root hücresinde lemma'ya bakmak yanlış eşleşme verir).
const fieldById = new Map(cells.map((c) => [c.id, c.field]));
const tursoKeyOf = (r) => (fieldById.get(r.id) === "lemma" ? norm(r.lemma) : norm(r.root));
const mTurso = cmpManifest(preTursoPath, tursoPre, tursoKeyOf);
console.log(`GATE manifest: yerel=${mLocal} · turso=${mTurso} (dry-run pre-image korunuyor)`);
if (!fs.existsSync(preTursoPath)) fs.writeFileSync(preTursoPath,
  JSON.stringify({ schema_version: "bw-cleanup-v1_8-pre-image-turso", captured_at: new Date().toISOString(),
    turso: url.replace(/\?.*$/, ""), count: tursoPre.length, rows: tursoPre }, null, 2) + "\n", "utf-8");
if (!fs.existsSync(preLocalPath)) fs.writeFileSync(preLocalPath,
  JSON.stringify({ schema_version: "bw-cleanup-v1_8-pre-image-local", captured_at: new Date().toISOString(),
    local_db: "data/app.db", count: cells.length,
    rows: cells.map((c) => ({ id: c.id, ref: c.ref, field: c.field, value: c.current_ascii })) }, null, 2) + "\n", "utf-8");

// ── Review artefaktı (hücre başına) ──────────────────────────────────────────
fs.writeFileSync(path.join(OUT_DIR, "review-cells.jsonl"),
  cells.map((c) => JSON.stringify(c)).join("\n") + "\n", "utf-8");

// ── Guarded forward / reverse SQL ────────────────────────────────────────────
const fwd = ["-- Buckwalter cleanup v1.8 — FORWARD (guarded, değer bazlı)",
  `-- ${EXPECTED_TOTAL} hücre / ${MAP_LEMMA.length + MAP_ROOT.length} distinct · yalnız lemma+root`, "BEGIN;"];
const rev = ["-- Buckwalter cleanup v1.8 — REVERSE (guarded, id bazlı — grup birleşmesi nedeniyle değer bazlı geri alınamaz)", "BEGIN;"];
for (const m of MAP_LEMMA) fwd.push(`UPDATE words SET lemma=${sqlStr(m.to)} WHERE lemma=${sqlStr(m.bw)};`);
for (const m of MAP_ROOT) fwd.push(`UPDATE words SET root=${sqlStr(m.to)} WHERE root=${sqlStr(m.bw)};`);
fwd.push("COMMIT;");
for (const c of cells) rev.push(`UPDATE words SET ${c.field}=${sqlStr(c.current_ascii)} WHERE id=${c.id} AND ${c.field}=${sqlStr(c.proposed_arabic)};`);
rev.push("COMMIT;");
fs.writeFileSync(path.join(OUT_DIR, "forward.sql"), fwd.join("\n") + "\n", "utf-8");
fs.writeFileSync(path.join(OUT_DIR, "reverse.sql"), rev.join("\n") + "\n", "utf-8");

// ── Dönüşüm sonrası simülasyon (bellekte) ────────────────────────────────────
const lemDist0 = local.prepare("SELECT COUNT(DISTINCT lemma) c FROM words WHERE lemma IS NOT NULL AND lemma<>''").get().c;
const rootDist0 = local.prepare("SELECT COUNT(DISTINCT root) c FROM words WHERE root IS NOT NULL AND root<>''").get().c;
const wc0 = local.prepare("SELECT COUNT(*) c FROM words").get().c;
const rmc0 = local.prepare("SELECT COUNT(*) c FROM root_meanings").get().c;
// birleşme sonrası distinct: her BW değeri kalkar; hedefi yoksa +1
const newLemTargets = new Set(MAP_LEMMA.filter((m) => local.prepare("SELECT COUNT(*) c FROM words WHERE lemma=?").get(m.to).c === 0).map((m) => m.to));
const newRootTargets = new Set(MAP_ROOT.filter((m) => local.prepare("SELECT COUNT(*) c FROM words WHERE root=?").get(m.to).c === 0).map((m) => m.to));
const lemDist1 = lemDist0 - MAP_LEMMA.length + newLemTargets.size;
const rootDist1 = rootDist0 - MAP_ROOT.length + newRootTargets.size;

// hedef değer bazında beklenen son token sayısı (grup içi birleşme dahil)
const expectedFinal = new Map();
for (const mg of merges) {
  const k = `${mg.field}|${mg.to}`;
  if (!expectedFinal.has(k)) expectedFinal.set(k, { field: mg.field, to: mg.to, existing: mg.existing_arabic, incoming: 0 });
  expectedFinal.get(k).incoming += mg.incoming;
}

const summary = {
  schema_version: "bw-cleanup-v1_8-dry-run", applied: false, generated_at: new Date().toISOString(),
  scope: { lemma_cells: lemTotal, lemma_distinct: lemGroups.size, root_cells: rootTotal, root_distinct: rootGroups.size, total_cells: cells.length, total_distinct: lemGroups.size + rootGroups.size },
  gates: { coverage: "ok", evidence: "ok", excluded_cells: excluded, turso_parity: "ok" },
  artifacts: {
    local_backup: path.relative(REPO, localBackup).replace(/\\/g, "/"),
    review_cells: "…/buckwalter-cleanup-v1_8/review-cells.jsonl",
    forward_sql: "…/buckwalter-cleanup-v1_8/forward.sql",
    reverse_sql: "…/buckwalter-cleanup-v1_8/reverse.sql",
    pre_image_local: "…/buckwalter-cleanup-v1_8/pre-image-local.json",
    pre_image_turso: "…/buckwalter-cleanup-v1_8/pre-image-turso.json",
  },
  merges,
  distinct_projection: { lemma_before: lemDist0, lemma_after: lemDist1, root_before: rootDist0, root_after: rootDist1 },
  invariants: { words_rows: wc0, root_meanings_rows: rmc0, untouched_fields: ["arabic", "meaning_tr", "pos", "morphology", "confidence", "source", "role"], root_meanings_updates: 0 },
  laakin_no_shadda_group_preserved: { lemma: LAAKIN_NOSHADDA, cps: cps(LAAKIN_NOSHADDA), tokens: noShaddaBefore },
  local_sha_before: sha256(LOCAL_DB),
};
fs.writeFileSync(path.join(OUT_DIR, "dry-run-summary.json"), JSON.stringify(summary, null, 2) + "\n", "utf-8");

// ── Konsol raporu ────────────────────────────────────────────────────────────
console.log(`\n── Dönüşüm tablosu (14 distinct) ──`);
for (const mg of merges) {
  const tgt = byTarget.get(`${mg.field}|${mg.to}`);
  const grp = tgt.length > 1 ? ` [grup içi birleşme: ${tgt.join(" + ")}]` : "";
  console.log(`${mg.field.padEnd(6)} ${mg.bw.padEnd(9)} → ${mg.to.padEnd(8)} [${mg.to_cps}]`);
  console.log(`       ${String(mg.incoming).padStart(5)} token · mevcut Arapça ${String(mg.existing_arabic).padStart(5)} · sonra ${String(mg.after).padStart(5)} · ${mg.merges_with_existing ? "BİRLEŞİR" : "YENİ grup"}${grp}`);
}
console.log(`\ndistinct lemma ${lemDist0} → ${lemDist1} · distinct root ${rootDist0} → ${rootDist1}`);
console.log(`şeddesiz لٰكِن [${cps(LAAKIN_NOSHADDA)}] grubu korunuyor: ${noShaddaBefore} token (patch dışı)`);
console.log(`\nyerel yedek : ${path.relative(REPO, localBackup).replace(/\\/g, "/")}`);
console.log(`artefaktlar : data/candidates/morphology/final-v1_8/buckwalter-cleanup-v1_8/`);
console.log(`              review-cells.jsonl · forward.sql · reverse.sql · pre-image-local.json · pre-image-turso.json · dry-run-summary.json`);

if (!APPLY) {
  console.log(`\n✔ DRY bitti — yerel DB ve Turso'ya HİÇBİR yazma yapılmadı.`);
  local.close();
  process.exit(0);
}

// ── 1) YEREL uygulama (guard'lı: her UPDATE mevcut ASCII değeriyle korunur) ──
let la = 0;
local.exec("BEGIN");
try {
  for (const m of MAP_LEMMA) la += Number(local.prepare("UPDATE words SET lemma=? WHERE lemma=?").run(m.to, m.bw).changes);
  for (const m of MAP_ROOT) la += Number(local.prepare("UPDATE words SET root=? WHERE root=?").run(m.to, m.bw).changes);
  if (la !== EXPECTED_TOTAL) throw new Error(`rowsAffected ${la} ≠ ${EXPECTED_TOTAL}`);
  local.exec("COMMIT");
} catch (e) { local.exec("ROLLBACK"); die(`yerel uygulama hatası (rollback edildi): ${e.message}`); }

// ── 2) YEREL kapılar ────────────────────────────────────────────────────────
let la2 = 0;
for (const m of MAP_LEMMA) la2 += Number(local.prepare("UPDATE words SET lemma=? WHERE lemma=?").run(m.to, m.bw).changes);
for (const m of MAP_ROOT) la2 += Number(local.prepare("UPDATE words SET root=? WHERE root=?").run(m.to, m.bw).changes);
if (la2 !== 0) die(`yerel 2. çalıştırma no-op değil: ${la2}`);

const lemLeft = [...scan("lemma").values()].reduce((s, a) => s + a.length, 0);
const rootLeft = [...scan("root").values()].reduce((s, a) => s + a.length, 0);
if (lemLeft !== 0 || rootLeft !== 0) die(`kalan ASCII lemma=${lemLeft} root=${rootLeft} ≠ 0`);

const integrity = local.prepare("PRAGMA integrity_check").get().integrity_check;
if (integrity !== "ok") die(`integrity ${integrity}`);
const wc1 = local.prepare("SELECT COUNT(*) c FROM words").get().c;
const rmc1 = local.prepare("SELECT COUNT(*) c FROM root_meanings").get().c;
if (wc1 !== wc0) die(`words ${wc0} → ${wc1}`);
if (wc1 !== 77429) die(`words ${wc1} ≠ 77429`);
if (rmc1 !== rmc0) die(`root_meanings ${rmc0} → ${rmc1}`);
if (rmc1 !== 1703) die(`root_meanings ${rmc1} ≠ 1703`);

const lemDistA = local.prepare("SELECT COUNT(DISTINCT lemma) c FROM words WHERE lemma IS NOT NULL AND lemma<>''").get().c;
const rootDistA = local.prepare("SELECT COUNT(DISTINCT root) c FROM words WHERE root IS NOT NULL AND root<>''").get().c;
if (lemDistA !== lemDist1) die(`distinct lemma ${lemDistA} ≠ projeksiyon ${lemDist1}`);
if (rootDistA !== rootDist1) die(`distinct root ${rootDistA} ≠ projeksiyon ${rootDist1}`);

// hedef bazlı son sayılar
for (const [, e] of expectedFinal) {
  const got = local.prepare(`SELECT COUNT(*) c FROM words WHERE ${e.field}=?`).get(e.to).c;
  const want = e.existing + e.incoming;
  if (got !== want) die(`${e.field}=${JSON.stringify(e.to)} son sayı ${got} ≠ beklenen ${want}`);
}
// la`kin ailesi 12 token + şeddesiz لٰكِن 6 token korunuyor
const laakinnaTarget = MAP_LEMMA.find((m) => m.group === "laakinna").to;
const laakinnaN = local.prepare("SELECT COUNT(*) c FROM words WHERE lemma=?").get(laakinnaTarget).c;
if (laakinnaN !== 12) die(`لٰكِنّ grubu ${laakinnaN} ≠ 12`);
const noShaddaAfter = local.prepare("SELECT COUNT(*) c FROM words WHERE lemma=?").get(LAAKIN_NOSHADDA).c;
if (noShaddaAfter !== noShaddaBefore || noShaddaAfter !== 6) die(`şeddesiz لٰكِن ${noShaddaBefore} → ${noShaddaAfter} (6 olmalı)`);
// l~aEal~ + laEal~ birleşti mi
const laallaTarget = MAP_LEMMA.find((m) => m.group === "laalla").to;
const laallaN = local.prepare("SELECT COUNT(*) c FROM words WHERE lemma=?").get(laallaTarget).c;
if (laallaN !== 129) die(`لَعَلّ grubu ${laallaN} ≠ 129 (3 mevcut + 120 + 6)`);
// Awl → أول ve root meaning lookup
const awlTarget = MAP_ROOT[0].to;
const awlN = local.prepare("SELECT COUNT(*) c FROM words WHERE root=?").get(awlTarget).c;
if (awlN !== 170) die(`أول root ${awlN} ≠ 170`);
const awlRm = local.prepare("SELECT id, meaning_tr FROM root_meanings WHERE root=?").get(awlTarget);
if (!awlRm) die(`root_meanings'te ${awlTarget} yok — lookup çalışmaz`);

console.log(`\nYEREL apply : ${la} hücre · 2. çalıştırma no-op · kalan ASCII 0 · integrity=${integrity}`);
console.log(`              words=${wc1} · root_meanings=${rmc1} · distinct lemma=${lemDistA} root=${rootDistA}`);
console.log(`              لٰكِنّ=12 · şeddesiz لٰكِن=${noShaddaAfter} · لَعَلّ=${laallaN} · أول=${awlN} (root_meanings id=${awlRm.id})`);
const localShaAfter = sha256(LOCAL_DB);
local.close();

// ── 3) TURSO uygulama (aynı guard'lı patch) ─────────────────────────────────
const stmts = [
  ...MAP_LEMMA.map((m) => ({ sql: "UPDATE words SET lemma=? WHERE lemma=?", args: [m.to, m.bw] })),
  ...MAP_ROOT.map((m) => ({ sql: "UPDATE words SET root=? WHERE root=?", args: [m.to, m.bw] })),
];
const res = await turso.batch(stmts, "write");
const ta = res.reduce((s, r) => s + (r.rowsAffected ?? 0), 0);
if (ta !== EXPECTED_TOTAL) die(`Turso rowsAffected ${ta} ≠ ${EXPECTED_TOTAL} — reverse.sql ile geri al!`);

// 2. çalıştırma no-op
const res2 = await turso.batch(stmts, "write");
const ta2 = res2.reduce((s, r) => s + (r.rowsAffected ?? 0), 0);
if (ta2 !== 0) die(`Turso 2. çalıştırma no-op değil: ${ta2}`);

// Turso post-verify
const tLemAfter = (await tget("SELECT lemma v, COUNT(*) c FROM words WHERE lemma IS NOT NULL AND lemma<>'' GROUP BY lemma", [])).filter((r) => hasNonArabic(r.v));
const tRootAfter = (await tget("SELECT root v, COUNT(*) c FROM words WHERE root IS NOT NULL AND root<>'' GROUP BY root", [])).filter((r) => hasNonArabic(r.v));
if (tLemAfter.length || tRootAfter.length) die(`Turso'da ASCII kaldı: lemma=${tLemAfter.length} root=${tRootAfter.length}`);
const tWords = Number((await tget("SELECT COUNT(*) c FROM words", []))[0].c);
const tRm = Number((await tget("SELECT COUNT(*) c FROM root_meanings", []))[0].c);
if (tWords !== 77429) die(`Turso words ${tWords} ≠ 77429`);
if (tRm !== 1703) die(`Turso root_meanings ${tRm} ≠ 1703`);
for (const [, e] of expectedFinal) {
  const got = Number((await tget(`SELECT COUNT(*) c FROM words WHERE ${e.field}=?`, [e.to]))[0].c);
  if (got !== e.existing + e.incoming) die(`Turso ${e.field}=${JSON.stringify(e.to)} ${got} ≠ ${e.existing + e.incoming}`);
}
const tNoShadda = Number((await tget("SELECT COUNT(*) c FROM words WHERE lemma=?", [LAAKIN_NOSHADDA]))[0].c);
if (tNoShadda !== 6) die(`Turso şeddesiz لٰكِن ${tNoShadda} ≠ 6`);
console.log(`TURSO apply : ${ta} hücre · 2. çalıştırma no-op · kalan ASCII 0 · words=${tWords} · root_meanings=${tRm}`);

fs.writeFileSync(path.join(OUT_DIR, "apply-report.json"), JSON.stringify({
  schema_version: "bw-cleanup-v1_8-apply", applied: true, applied_at: new Date().toISOString(),
  cells: { lemma: EXPECTED_LEMMA, root: EXPECTED_ROOT, total: EXPECTED_TOTAL },
  evidence_classes: {
    "morphology-LEM-exact": lemmaEvidenceCells,
    "root-lexicon+lemma-paradigm": rootParadigmOk,
    note: "İki ayrı sınıf; birleştirilmiş '3372/3372 LEM' ifadesi geçersizdir.",
  },
  local: { rows_affected: la, second_run_noop: la2 === 0, ascii_left: 0, integrity,
    words: wc1, root_meanings: rmc1, distinct_lemma: lemDistA, distinct_root: rootDistA,
    sha_before: summary.local_sha_before, sha_after: localShaAfter },
  turso: { rows_affected: ta, second_run_noop: ta2 === 0, ascii_left: 0, words: tWords, root_meanings: tRm },
  group_checks: { laakinna_tokens: laakinnaN, laakin_no_shadda_tokens: noShaddaAfter, laalla_tokens: laallaN, awl_root_tokens: awlN, awl_root_meanings_id: awlRm.id },
  backup: path.relative(REPO, localBackup).replace(/\\/g, "/"),
  reverse_sql: "data/candidates/morphology/final-v1_8/buckwalter-cleanup-v1_8/reverse.sql",
}, null, 2) + "\n", "utf-8");

console.log(`\nyerel SHA öncesi: ${summary.local_sha_before}`);
console.log(`yerel SHA sonrası: ${localShaAfter}`);
console.log(`apply-report: buckwalter-cleanup-v1_8/apply-report.json`);
console.log("\n✔ Buckwalter cleanup v1.8 uygulandı (yerel + Turso).");
