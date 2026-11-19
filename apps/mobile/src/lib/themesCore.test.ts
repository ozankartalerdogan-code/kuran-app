/**
 * themesCore.test.ts — tema etiketi saf mantığı + gömülü paketlerin şema kontrolü.
 * Çalıştır: npm run test:mobile
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createThemeIndex, resolveThemeCode, getThemeTitle, getThemeDescription, humanizeThemeCode,
  getThemeKind, getGroups, getLevel1ByGroup, getLevel2ForParent, lookupVerseThemes,
  normalizeVerseThemes, countVersesByMain, topSubsForMain,
  isDuaCode, groupSubtopics, stripDuaPrefix, sortDuaCodes, countDuaVerses,
  type ThemeTaxonomy, type VerseThemesBundle,
} from "./themesCore.ts";

const here = dirname(fileURLToPath(import.meta.url));
const readJson = <T>(p: string) => JSON.parse(readFileSync(join(here, p), "utf8")) as T;

const tax: ThemeTaxonomy = {
  version: 1,
  groups: [{ code: "A", tr: "İnanç Esasları", en: "Faith" }, { code: "C", tr: "Ahlak", en: "Ethics" }],
  level1: [
    { code: "A1_ALLAH_ULUHIYET", group: "A", tr: "Allah & Uluhiyet", en: "Allah and Divinity", descTr: "kısa", descEn: "short" },
    { code: "C1_BIREYSEL_ERDEMLER", group: "C", tr: "Bireysel Erdemler", en: "Personal Virtues", descTr: "", descEn: "" },
    { code: "C4_ILIM_AKIL_TEFEKKUR", group: "C", tr: "İlim", en: "", descTr: "ilim", descEn: "" },
  ],
  level2: [
    { code: "sabir", parents: ["C1_BIREYSEL_ERDEMLER"], tr: "Sabır", en: "Patience" },
    { code: "tevhid", parents: ["A1_ALLAH_ULUHIYET"], tr: "Tevhid", en: "Oneness of Allah" },
  ],
  migration: {
    level1: { "C4_ILIM_AKIL_TEFEKKÜR": "C4_ILIM_AKIL_TEFEKKUR", B1_TAHARET_TEMIZLIK: "A1_ALLAH_ULUHIYET" },
    level2: { "sabır": "sabir", tevhit: "tevhid", yol: null },
  },
};
const idx = createThemeIndex(tax);

test("başlıklar TR/EN; EN boşsa TR'ye düşer", () => {
  assert.equal(getThemeTitle(idx, "A1_ALLAH_ULUHIYET", "tr"), "Allah & Uluhiyet");
  assert.equal(getThemeTitle(idx, "A1_ALLAH_ULUHIYET", "en"), "Allah and Divinity");
  assert.equal(getThemeTitle(idx, "sabir", "en"), "Patience");
  assert.equal(getThemeTitle(idx, "C4_ILIM_AKIL_TEFEKKUR", "en"), "İlim");
  assert.equal(getThemeTitle(idx, "A", "en"), "Faith");
});

test("eski kodlar migration ile çözülür; null = silinmiş", () => {
  assert.equal(resolveThemeCode(idx, "C4_ILIM_AKIL_TEFEKKÜR"), "C4_ILIM_AKIL_TEFEKKUR");
  assert.equal(resolveThemeCode(idx, "sabır"), "sabir");
  assert.equal(resolveThemeCode(idx, "yol"), null);
  assert.equal(resolveThemeCode(idx, "a1_allah_uluhiyet"), "A1_ALLAH_ULUHIYET");
  assert.equal(resolveThemeCode(idx, "A1_%"), "A1_ALLAH_ULUHIYET");
  assert.equal(resolveThemeCode(idx, "bilinmeyen"), "bilinmeyen");
  assert.equal(getThemeTitle(idx, "sabır", "tr"), "Sabır");
  assert.equal(getThemeTitle(idx, "B1_TAHARET_TEMIZLIK", "en"), "Allah and Divinity");
  assert.equal(getThemeKind(idx, "tevhit"), "level2");
  assert.equal(getThemeKind(idx, "bilinmeyen"), null);
});

test("bilinmeyen kod ham gösterilmez (okunur yedek)", () => {
  assert.equal(humanizeThemeCode("C2_BIREYSEL_REZILETLER", "tr"), "Bireysel reziletler");
  assert.equal(humanizeThemeCode("din_günü"), "Din günü");
  assert.equal(humanizeThemeCode("hidayet-yolu", "en"), "Hidayet yolu");
  assert.equal(getThemeTitle(idx, "F9_YENI_KOD_%", "tr"), "Yeni kod");
  assert.equal(getThemeTitle(idx, "yol", "tr"), "Yol");
  assert.equal(getThemeTitle(idx, "namaz-vakit", "en", { "namaz-vakit": "Prayer times" }), "Prayer times");
  for (const c of ["A1_ALLAH_ULUHIYET", "x_y", "abc-def", "D3_CEZA_HUKUKU_HUDUD"]) {
    assert.ok(!getThemeTitle(idx, c, "tr").includes("_"), c);
  }
});

test("açıklama, gruplar, level1/level2 listeleri", () => {
  assert.equal(getThemeDescription(idx, "A1_ALLAH_ULUHIYET", "en"), "short");
  assert.equal(getThemeDescription(idx, "C4_ILIM_AKIL_TEFEKKÜR", "en"), "ilim");
  assert.equal(getThemeDescription(idx, "C1_BIREYSEL_ERDEMLER", "tr"), null);
  assert.deepEqual(getGroups(idx).map((g) => g.code), ["A", "C"]);
  assert.deepEqual(getLevel1ByGroup(idx, "C").map((t) => t.code), ["C1_BIREYSEL_ERDEMLER", "C4_ILIM_AKIL_TEFEKKUR"]);
  assert.deepEqual(getLevel2ForParent(idx, "C1_BIREYSEL_ERDEMLER").map((t) => t.code), ["sabir"]);
});

const bundle: VerseThemesBundle = {
  v: 1,
  t: {
    "1:1": ["A1_ALLAH_ULUHIYET", "tevhit", "rahmet"],
    "2:255": [null, "tevhid", "yol"],
    "3:1": ["C4_ILIM_AKIL_TEFEKKÜR", "sabır", "sabir"],
    "3:2": ["A1_ALLAH_ULUHIYET", "tevhid", "rahmet"],
  },
};

test("ayet etiketleri paketten; eski kodlar eşlenir, silinenler ve tekrarlar atılır", () => {
  assert.deepEqual(lookupVerseThemes(idx, bundle, "1:1"), { main: "A1_ALLAH_ULUHIYET", subs: ["tevhid", "rahmet"] });
  assert.deepEqual(lookupVerseThemes(idx, bundle, "2:255"), { main: null, subs: ["tevhid"] });
  assert.deepEqual(lookupVerseThemes(idx, bundle, "3:1"), { main: "C4_ILIM_AKIL_TEFEKKUR", subs: ["sabir"] });
  assert.deepEqual(lookupVerseThemes(idx, bundle, "9:9"), { main: null, subs: [] });
  assert.deepEqual(normalizeVerseThemes(idx, "C4_ILIM_AKIL_TEFEKKÜR", ["sabır", "yol"]), { main: "C4_ILIM_AKIL_TEFEKKUR", subs: ["sabir"] });
});

test("sayım ve popüler alt konular", () => {
  assert.deepEqual(countVersesByMain(idx, bundle), { A1_ALLAH_ULUHIYET: 2, C4_ILIM_AKIL_TEFEKKUR: 1 });
  assert.deepEqual(topSubsForMain(idx, bundle, "A1_ALLAH_ULUHIYET"), [{ code: "rahmet", count: 2 }, { code: "tevhid", count: 2 }]);
  assert.deepEqual(topSubsForMain(idx, bundle, "A1_ALLAH_ULUHIYET", 1).length, 1);
});

test("gömülü themeTaxonomy.json + verseThemes.json sözleşmeye uyar", () => {
  const realTax = readJson<ThemeTaxonomy>("../data/themeTaxonomy.json");
  const realBundle = readJson<VerseThemesBundle>("../data/verseThemes.json");
  const ri = createThemeIndex(realTax);
  assert.ok(realTax.groups.length > 0 && realTax.level1.length > 0);
  for (const t of realTax.level1) {
    assert.ok(ri.groups.has(t.group), `${t.code} grubu yok`);
    assert.ok(t.tr.trim() && t.en.trim(), `${t.code} başlık eksik`);
  }
  for (const t of realTax.level2 ?? []) {
    assert.ok(t.tr.trim() && t.en.trim(), `${t.code} başlık eksik`);
    for (const p of t.parents) assert.ok(ri.level1.has(p), `${t.code} ebeveyni ${p} yok`);
  }
  assert.equal(realBundle.v, 1);
  for (const [key, row] of Object.entries(realBundle.t)) {
    assert.match(key, /^\d{1,3}:\d{1,3}$/);
    assert.ok(Array.isArray(row) && row.length > 0, key);
    assert.ok(row[0] === null || typeof row[0] === "string", key);
    const v = lookupVerseThemes(ri, realBundle, key);
    if (v.main) assert.ok(!getThemeTitle(ri, v.main, "tr").includes("_"), key);
  }
});

test("dua-* alt konuları ayrılır, önek atılır, TR sırası", () => {
  assert.equal(isDuaCode("dua-affetme"), true);
  assert.equal(isDuaCode("dualar"), false);
  assert.equal(isDuaCode("sabir"), false);
  assert.deepEqual(
    groupSubtopics(["sabir", "dua-sukur", "tevekkul", "dua-affetme"]),
    { regular: ["sabir", "tevekkul"], duas: ["dua-sukur", "dua-affetme"] },
  );
  assert.deepEqual(groupSubtopics([]), { regular: [], duas: [] });
  assert.equal(stripDuaPrefix("Dua: Bağışlanma ve Af"), "Bağışlanma ve Af");
  assert.equal(stripDuaPrefix("Sabır"), "Sabır");
  assert.equal(stripDuaPrefix("Dua:"), "Dua:");
  const titles: Record<string, string> = { "dua-c": "Dua: Şükür", "dua-a": "Dua: Çocuk", "dua-b": "Dua: Sabır", "dua-d": "Dua: İlim" };
  assert.deepEqual(
    sortDuaCodes(Object.keys(titles), (c) => titles[c], "tr").map((d) => d.title),
    ["Çocuk", "İlim", "Sabır", "Şükür"],
  );
});

test("dua ayeti sayımı: en az bir dua-* alt etiketi olan ayetler", () => {
  const b: VerseThemesBundle = {
    v: 1,
    t: {
      "1:5": ["B3_KALBI_IBADETLER", "dua-yardim", "dua-hidayet"],
      "2:201": ["B3_KALBI_IBADETLER", "dua-dunya-ahiret"],
      "2:255": ["A1_ALLAH_ULUHIYET", "tevhid"],
      "3:8": [null, "dua-sebat"],
    },
  };
  assert.equal(countDuaVerses(idx, b), 3);
  assert.equal(countDuaVerses(idx, { v: 1, t: {} }), 0);
  const realTax = readJson<ThemeTaxonomy>("../data/themeTaxonomy.json");
  const realBundle = readJson<VerseThemesBundle>("../data/verseThemes.json");
  const duas = realTax.level2.filter((t) => isDuaCode(t.code));
  assert.ok(duas.length >= 80, `dua sayısı ${duas.length}`);
  assert.ok(countDuaVerses(createThemeIndex(realTax), realBundle) > 0);
});
