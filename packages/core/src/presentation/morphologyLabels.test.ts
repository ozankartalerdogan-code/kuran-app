import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  CORPUS_MORPHOLOGY_CODES,
  CORPUS_MORPHOLOGY_VALUE_KEYS,
  MORPHOLOGY_LABELS_TR,
  POS_LABELS_TR,
  formatMorphologyTr,
  getUnknownMorphologyCodes,
  translatePosTr,
} from "./morphologyLabels";

const REQUIRED_POS_LABELS = {
  N: "İsim",
  V: "Fiil",
  P: "Edat",
  PRON: "Zamir",
  PN: "Özel isim",
  ADJ: "Sıfat",
  ADV: "Zarf",
  CONJ: "Bağlaç",
  DET: "Belirleyici",
  REL: "İlgi zamiri",
  DEM: "İşaret zamiri",
  NEG: "Olumsuzluk edatı",
  INTG: "Soru edatı",
  COND: "Şart edatı",
  PREP: "Edat",
  ACC: "Nasb edatı",
  VOC: "Seslenme edatı",
} as const;

test("bilinen POS etiketlerinin tamamını Türkçeleştirir", () => {
  for (const [code, label] of Object.entries(REQUIRED_POS_LABELS)) {
    assert.equal(POS_LABELS_TR[code], label);
    assert.equal(translatePosTr(code), label);
  }
});

test("corpus envanterindeki her morphology kodu ve değer anahtarı eşlenmiştir", () => {
  for (const code of [...CORPUS_MORPHOLOGY_CODES, ...CORPUS_MORPHOLOGY_VALUE_KEYS]) {
    assert.ok(MORPHOLOGY_LABELS_TR[code], `Eksik eşleme: ${code}`);
  }
});

test("MOOD değerlerini yalnız MOOD bağlamında Türkçeleştirir", () => {
  const cases = [
    ["1:V:IMPF|MOOD:IND", "Kip: Merfû kip"],
    ["1:V:IMPF|MOOD:SUBJ", "Kip: Mansûb kip"],
    ["1:V:IMPF|MOOD:JUS", "Kip: Meczûm kip"],
  ] as const;

  for (const [raw, expectedMood] of cases) {
    const display = formatMorphologyTr(raw);
    assert.match(display, new RegExp(expectedMood));
    assert.doesNotMatch(display, /\b(?:IND|SUBJ|JUS)\b/);
  }
});

test("bilinmeyen MOOD değerinde canonical fallback kullanır", () => {
  const display = formatMorphologyTr("1:V:IMPF|MOOD:XYZ");
  assert.equal(display, "Tamamlanmamış görünüş (muzâri) · Kip: XYZ");
});

test("nominal ve particle ACC bağlamlarını ayırır", () => {
  assert.equal(formatMorphologyTr("1:N:ROOT:كتب|ACC"), "Kök: كتب · Mansûb hâl");
  assert.equal(formatMorphologyTr("1:P:ACC|LEM:إِنّ"), "Nasb edatı · Lemma: إِنّ");
});

test("particle ve fiil IMPV bağlamlarını ayırır", () => {
  assert.equal(formatMorphologyTr("1:P:IMPV|PREF|LEM:ل"), "Emir lâmı · Ön ek · Lemma: ل");
  assert.equal(formatMorphologyTr("1:V:IMPV|VF:1|ROOT:قول|2MS"), "Emir · Fiil kalıbı: 1 · Kök: قول · İkinci kişi eril tekil");
});

test("P edatı ile kişi-sayı kodlarındaki çoğulu karıştırmaz", () => {
  assert.equal(formatMorphologyTr("1:P:P|LEM:مِن"), "Edat · Lemma: مِن");
  assert.match(formatMorphologyTr("1:V:PERF|1P"), /Birinci kişi çoğul/);
  assert.match(formatMorphologyTr("1:V:IMPF|2MP"), /İkinci kişi eril çoğul/);
  assert.match(formatMorphologyTr("1:V:IMPF|3FP"), /Üçüncü kişi dişil çoğul/);
});

test("benzer canonical kodları tam kod eşleşmesiyle ayırır", () => {
  assert.equal(formatMorphologyTr("1:P:SUB"), "Mastar edatı");
  assert.match(formatMorphologyTr("1:V:IMPF|SUBJ"), /Mansûb kip/);
  assert.equal(formatMorphologyTr("1:V:ACT"), "Etken");
  assert.equal(formatMorphologyTr("1:N:ACT_PCPL"), "İsm-i fâil (etken ortaç)");
  assert.equal(formatMorphologyTr("1:P:PRO"), "Yasaklama edatı");
  assert.equal(formatMorphologyTr("1:N:PRON"), "Zamir");
});

test("production benzeri morphology çıktısında kip kodu bırakmaz", () => {
  const raw = "1:V:IMPF|MOOD:IND|ROOT:كتب|3MS | 2:V:IMPF|MOOD:SUBJ|ROOT:فعل|3MS | 3:V:IMPF|MOOD:JUS|ROOT:قول|3MS";
  const display = formatMorphologyTr(raw);
  assert.match(display, /Kip: Merfû kip/);
  assert.match(display, /Kip: Mansûb kip/);
  assert.match(display, /Kip: Meczûm kip/);
  assert.doesNotMatch(display, /\b(?:IND|SUBJ|JUS)\b/);
});

test("bilinmeyen etikette canonical fallback kullanır ve etiketi raporlar", () => {
  const raw = "1:N:BİLİNMEYEN_ETİKET|MS";
  assert.equal(formatMorphologyTr(raw), "BİLİNMEYEN_ETİKET · Eril tekil");
  assert.deepEqual(getUnknownMorphologyCodes(raw), ["BİLİNMEYEN_ETİKET"]);
  assert.equal(translatePosTr("X"), "X");
});

test("null ve boş değerleri güvenli işler", () => {
  assert.equal(translatePosTr(null), "—");
  assert.equal(translatePosTr("  "), "—");
  assert.equal(formatMorphologyTr(undefined), "");
  assert.deepEqual(getUnknownMorphologyCodes(""), []);
});

test("nihai POS sunumunu tekil ve birleşik kodlarda sıra koruyarak Türkçeleştirir", () => {
  const cases = [
    ["N", "İsim"],
    ["V", "Fiil"],
    ["P", "Edat"],
    ["P+N", "Edat + İsim"],
    ["P+V", "Edat + Fiil"],
    ["N+P+V", "İsim + Edat + Fiil"],
    ["P+XYZ+N", "Edat + XYZ + İsim"],
  ] as const;

  for (const [canonical, expected] of cases) {
    assert.equal(translatePosTr(canonical), expected);
  }

  const knownOutputs = cases.slice(0, -1).map(([canonical]) => translatePosTr(canonical));
  assert.ok(knownOutputs.every((display) => !["V (Fiil)", "N (İsim)", "P+N"].includes(display)));
  assert.ok(knownOutputs.every((display) => !/(?:^|\s|\+)N|V|P(?:$|\s|\+)/.test(display)));
});

test("POS erişilebilirlik metni yalnız Türkçe nihai formatter çıktısını okur", () => {
  assert.equal(`Kelime türü ${translatePosTr("V")}`, "Kelime türü Fiil");
  assert.equal(`Kelime türü ${translatePosTr("P+N")}`, "Kelime türü Edat + İsim");
});

test("web ve mobil aynı ortak sunum helperını kullanır", () => {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
  const webPage = fs.readFileSync(
    path.join(repoRoot, "apps/web/src/app/surah/[surahId]/ayah/[ayahNumber]/page.tsx"),
    "utf8",
  );
  const mobilePage = fs.readFileSync(
    path.join(repoRoot, "apps/mobile/app/ayah/[surahId]/[ayahNumber].tsx"),
    "utf8",
  );
  assert.match(webPage, /translatePosTr.+from "@quran-app\/core"/s);
  assert.match(mobilePage, /formatMorphologyTr, translatePosTr.+packages\/core\/src\/presentation\/morphologyLabels"/s);
  assert.match(webPage, /aria-label=\{`Kelime türü: \$\{label\}`\}/);
  assert.match(mobilePage, /accessibilityLabel=\{`Kelime türü \$\{translatePosTr\(w\.pos\)\}`\}/);
  assert.doesNotMatch(webPage, /\{(?:part\.)?code\}\s*\(\{(?:part\.)?label\}\)/);
  assert.doesNotMatch(mobilePage, /Kelime türü \$\{w\.pos\}/);
});

test("API biçimli raw alanları ve Arapça lemma/kök değerlerini değiştirmez", () => {
  const response = {
    pos: "P+N",
    morphology: "1:P:CONJ|PREF|LEM:و | 2:N:ROOT:أله|LEM:اللَّه|GEN",
  };
  const before = structuredClone(response);
  const display = formatMorphologyTr(response.morphology);

  assert.deepEqual(response, before);
  assert.match(display, /Lemma: و/);
  assert.match(display, /Kök: أله/);
  assert.match(display, /Lemma: اللَّه/);
  assert.equal(translatePosTr(response.pos), "Edat + İsim");
});

test("web word analysis shows raw lemma only when non-null", () => {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
  const webPage = fs.readFileSync(
    path.join(repoRoot, "apps/web/src/app/surah/[surahId]/ayah/[ayahNumber]/page.tsx"),
    "utf8",
  );

  assert.match(webPage, /\{word\.lemma \? \(/);
  assert.match(webPage, /Lemma: <span dir="rtl" lang="ar">\{word\.lemma\}<\/span>/);
  assert.doesNotMatch(webPage, /translate\w*Tr\(word\.lemma\)/);
  const webDbAdapter = fs.readFileSync(
    path.join(repoRoot, "apps/web/src/lib/getAyahDetailFromDb.ts"),
    "utf8",
  );
  assert.match(webDbAdapter, /MIN\(lemma\) AS lemma/);
  assert.match(webDbAdapter, /lemma: row\.lemma/);

});
