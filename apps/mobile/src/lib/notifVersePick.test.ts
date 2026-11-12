/**
 * notifVersePick.test.ts — bildirim ayetleri günler/vakitler arasında tekrar etmemeli.
 * Çalıştır: npm run test:mobile
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { dedupeVerses, pickFromPool } from "./notifVersePick.ts";

const pool = Array.from({ length: 12 }, (_, i) => ({ verse_key: `2:${i + 1}` }));

test("dedupeVerses: tekrarları ve boşları atar, sırayı korur", () => {
  const out = dedupeVerses([{ verse_key: "1:1" }, null, { verse_key: "2:3" }, { verse_key: "1:1" }, undefined]);
  assert.deepEqual(out.map((v) => v.verse_key), ["1:1", "2:3"]);
});

test("pickFromPool: aynı gün 5 vakit farklı, aynı vakit ardışık günlerde farklı", () => {
  for (let d = 0; d < 7; d++) {
    const day = new Set(Array.from({ length: 5 }, (_, s) => pickFromPool(pool, d, s, 5)!.verse_key));
    assert.equal(day.size, 5);
    for (let s = 0; s < 5; s++) {
      if (d > 0) assert.notEqual(pickFromPool(pool, d, s, 5), pickFromPool(pool, d - 1, s, 5));
    }
  }
});

test("pickFromPool: küçük havuz (5 ve 6 ayet) ardışık günlerde aynı vakitte tekrar etmez", () => {
  for (const n of [2, 3, 5, 6]) {
    const p = pool.slice(0, n);
    for (let d = 1; d < 7; d++) for (let s = 0; s < 5; s++) assert.notEqual(pickFromPool(p, d, s, 5), pickFromPool(p, d - 1, s, 5), `n=${n} d=${d} s=${s}`);
  }
});

test("pickFromPool: boş havuz → null; tek ayet → hep o", () => {
  assert.equal(pickFromPool([], 3, 1, 5), null);
  assert.equal(pickFromPool([{ verse_key: "1:1" }], 6, 4, 5)!.verse_key, "1:1");
});
