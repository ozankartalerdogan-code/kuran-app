/**
 * hatim.test.ts — hatim veri modeli (parse) + cüz tablosu tutarlılık testleri.
 * Çalıştır: npm run test:mobile
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { JUZ_DATA, parseHatimStore, EMPTY_HATIM_STORE, hatimGunSayisi } from "./hatim.ts";

// mushafSayfa.ts JSON'u statik import eder (Metro için); node --test bu importu
// attribute'suz kabul etmediğinden aynı veri burada fs ile okunur ve cüz
// başlangıçları JUZ_DATA'yla çapraz doğrulanır.
const dataPath = join(dirname(fileURLToPath(import.meta.url)), "../data/mushaf_sayfalari.json");
const sayfaData = JSON.parse(readFileSync(dataPath, "utf8")) as {
  cuzBaslangiclari: [number, number][];
};

test("boş/null girdi → boş store", () => {
  assert.deepEqual(parseHatimStore(null), EMPTY_HATIM_STORE);
  assert.deepEqual(parseHatimStore(""), EMPTY_HATIM_STORE);
});

test("bozuk JSON → boş store (çökmez)", () => {
  assert.deepEqual(parseHatimStore("{bozuk"), EMPTY_HATIM_STORE);
  assert.deepEqual(parseHatimStore('{"hatims":"dizi-degil"}'), EMPTY_HATIM_STORE);
});

test("geçerli store aynen okunur, bozuk kayıtlar elenir", () => {
  const raw = JSON.stringify({
    hatims: [
      { id: "1", startDate: "2026-01-01", completedDate: null, readJuz: [1, 2] },
      { id: 2, startDate: "2026-01-01", completedDate: null, readJuz: [] }, // id sayı → elenir
    ],
    currentId: "1",
  });
  const store = parseHatimStore(raw);
  assert.equal(store.hatims.length, 1);
  assert.equal(store.currentId, "1");
  assert.deepEqual(store.hatims[0].readJuz, [1, 2]);
});

test("JUZ_DATA: 30 cüz, sınırlar art arda ve boşluksuz", () => {
  assert.equal(JUZ_DATA.length, 30);
  for (let i = 1; i < JUZ_DATA.length; i++) {
    const once = JUZ_DATA[i - 1];
    const simdi = JUZ_DATA[i];
    assert.equal(simdi.juz, once.juz + 1);
    // Bir cüzün başlangıcı, önceki cüzün bitişinden hemen sonraki ayet olmalı
    // (aynı sure içinde ayet+1, ya da sonraki surenin 1. ayeti).
    if (simdi.startSurah === once.endSurah) {
      assert.equal(simdi.startAyah, once.endAyah + 1, `cüz ${simdi.juz} başlangıcı`);
    } else {
      assert.ok(simdi.startSurah > once.endSurah, `cüz ${simdi.juz} sure sırası`);
      assert.equal(simdi.startAyah, 1, `cüz ${simdi.juz} yeni sure 1. ayetten başlamalı`);
    }
  }
  assert.deepEqual(
    [JUZ_DATA[0].startSurah, JUZ_DATA[0].startAyah, JUZ_DATA[29].endSurah, JUZ_DATA[29].endAyah],
    [1, 1, 114, 6],
  );
});

test("JUZ_DATA, mushaf_sayfalari.json'daki cüz başlangıçlarıyla birebir aynı", () => {
  assert.equal(sayfaData.cuzBaslangiclari.length, 30);
  for (const j of JUZ_DATA) {
    const [s, a] = sayfaData.cuzBaslangiclari[j.juz - 1];
    assert.deepEqual([s, a], [j.startSurah, j.startAyah], `cüz ${j.juz} başlangıcı`);
  }
});

test("hatimGunSayisi tam gün farkını yuvarlar", () => {
  assert.equal(hatimGunSayisi("2026-01-01T00:00:00Z", "2026-01-31T00:00:00Z"), 30);
});
