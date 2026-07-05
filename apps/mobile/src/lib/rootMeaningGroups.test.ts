/**
 * rootMeaningGroups.test.ts — kök anlam gruplama + baskın/nadir ayrımı testleri.
 * Çalıştır: npm run test:mobile
 *
 * Odak: bu oturumda düzeltilen KRİTİK frekans bug'ının regresyon kalkanı —
 * çok-anlamlı bir kelime formu, anlamların HİÇBİRİNİ kaybettirmemeli.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { groupRootMeanings, PRIMARY_MIN_VERSES, type DerivedWord } from "./rootMeaningGroups.ts";

function rep(word: string, meaning: string, n: number, surah = 1): DerivedWord[] {
  return Array.from({ length: n }, (_, i) => ({ word, meaning, surahId: surah, ayahNumber: i + 1 }));
}
function all(r: ReturnType<typeof groupRootMeanings>) {
  return [...r.primary, ...r.others];
}
function find(r: ReturnType<typeof groupRootMeanings>, meaning: string) {
  return all(r).find(([m]) => m === meaning);
}
function totalVerses(r: ReturnType<typeof groupRootMeanings>) {
  return all(r).reduce((n, [, g]) => n + g.verses.length, 0);
}

test("REGRESYON: aynı form + farklı anlamlar → hiçbir anlam 0'a düşüp kaybolmaz", () => {
  // Form "ف": "A" 3 ayette, "B" 2 ayette. Eski "form→ilk anlam" mantığı B'yi
  // yutup A:5/B:0 yapıyordu; doğrudan sayımda A:3, B:2 korunur.
  const dw: DerivedWord[] = [
    ...rep("ف", "A", 3, 1),
    ...rep("ف", "B", 2, 2),
  ];
  const r = groupRootMeanings(dw);
  assert.equal(totalVerses(r), 5, "toplam ayet kaybı olmamalı");
  assert.equal(find(r, "A")?.[1].verses.length, 3);
  assert.equal(find(r, "B")?.[1].verses.length, 2, "'B' anlamı kaybolmamalı");
});

test("baskın/nadir ayrımı: >=3 ayet baskın, <3 nadir; baskın azalan sıralı", () => {
  const dw: DerivedWord[] = [
    ...rep("a", "yaratır", 5),
    ...rep("b", "pay", 3),
    ...rep("c", "ahlak", 1),
    ...rep("d", "gelenek", 1),
  ];
  const r = groupRootMeanings(dw);
  assert.deepEqual(r.primary.map(([m]) => m), ["yaratır", "pay"]);
  assert.deepEqual(r.others.map(([m]) => m).sort(), ["ahlak", "gelenek"]);
});

test("hiç baskın anlam yoksa en sık geçen ana listeye alınır", () => {
  // Hepsi < eşik; ama en az bir tane baskın gösterilmeli (ekran boş kalmasın).
  const dw: DerivedWord[] = [
    ...rep("a", "x", 2),
    ...rep("b", "y", 1),
    ...rep("c", "z", 1),
  ];
  const r = groupRootMeanings(dw);
  assert.deepEqual(r.primary.map(([m]) => m), ["x"], "en sık geçen (x=2) baskın olmalı");
  assert.deepEqual(r.others.map(([m]) => m).sort(), ["y", "z"]);
});

test("tek 'diğer' anlamı katlanmaz, ana listede bırakılır", () => {
  const dw: DerivedWord[] = [
    ...rep("a", "x", 5),
    ...rep("b", "y", 1),
  ];
  const r = groupRootMeanings(dw);
  assert.equal(r.others.length, 0, "tek diğer için accordion açılmamalı");
  assert.deepEqual(r.primary.map(([m]) => m), ["x", "y"]);
});

test("formlar teklenir: aynı form+anlam bir kez, farklı formlar ayrı listelenir", () => {
  const dw: DerivedWord[] = [
    { word: "قَالَ", meaning: "dedi", surahId: 1, ayahNumber: 1 },
    { word: "قَالَ", meaning: "dedi", surahId: 1, ayahNumber: 2 },
    { word: "قُلْ", meaning: "dedi", surahId: 1, ayahNumber: 3 },
  ];
  const g = find(groupRootMeanings(dw), "dedi")?.[1];
  assert.equal(g?.verses.length, 3);
  assert.deepEqual(g?.forms, ["قَالَ", "قُلْ"], "form listesi tekrarsız, 2 farklı form");
});

test("anlam anahtarı normalize edilir (baştaki/sondaki boşluk aynı gruba düşer)", () => {
  const dw: DerivedWord[] = [
    { word: "a", meaning: "dedi", surahId: 1, ayahNumber: 1 },
    { word: "b", meaning: "  dedi  ", surahId: 1, ayahNumber: 2 },
  ];
  const r = groupRootMeanings(dw);
  assert.equal(all(r).length, 1, "boşluk farkı ayrı grup oluşturmamalı");
  assert.equal(find(r, "dedi")?.[1].verses.length, 2);
});

test("boş anlam '—' anahtarına düşer", () => {
  const dw: DerivedWord[] = [{ word: "a", meaning: "", surahId: 1, ayahNumber: 1 }];
  const r = groupRootMeanings(dw);
  assert.ok(find(r, "—"), "boş anlam '—' altında toplanmalı");
});

test("boş / tanımsız girdi → boş sonuç", () => {
  assert.deepEqual(groupRootMeanings(undefined), { primary: [], others: [] });
  assert.deepEqual(groupRootMeanings(null), { primary: [], others: [] });
  assert.deepEqual(groupRootMeanings([]), { primary: [], others: [] });
});

test("eşik parametrik: primaryMinVerses=1 ile hepsi baskın olur", () => {
  const dw: DerivedWord[] = [...rep("a", "x", 2), ...rep("b", "y", 1), ...rep("c", "z", 1)];
  const r = groupRootMeanings(dw, 1);
  assert.equal(r.others.length, 0);
  assert.equal(r.primary.length, 3);
});

test("varsayılan eşik 3", () => {
  assert.equal(PRIMARY_MIN_VERSES, 3);
});
