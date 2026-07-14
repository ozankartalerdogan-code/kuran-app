import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseRecentSearches,
  parseSavedZikirList,
  parseZikirPresetTargets,
  parseZikirState,
} from "./storageSchemas.ts";

test("arama geçmişi yanlış JSON tiplerinde boş diziye döner", () => {
  assert.deepEqual(parseRecentSearches('{}'), []);
  assert.deepEqual(parseRecentSearches('"bozuk"'), []);
  assert.deepEqual(parseRecentSearches('["rahmet", 3, null]'), ["rahmet"]);
});

test("kayıtlı zikir listesi yalnız geçerli öğeleri kabul eder", () => {
  assert.deepEqual(parseSavedZikirList('{}'), []);
  assert.deepEqual(parseSavedZikirList('"bozuk"'), []);
  assert.deepEqual(
    parseSavedZikirList('[{"isim":"Salavat","hedef":10},{"isim":3,"hedef":"10"}]'),
    [{ isim: "Salavat", hedef: 10 }],
  );
});

test("zikirmatik preset ve aktif state yanlış üst tiplerde varsayılana döner", () => {
  assert.deepEqual(parseZikirPresetTargets('[]'), {});
  assert.deepEqual(parseZikirPresetTargets('{"Sübhanallah":33,"bozuk":"x"}'), { Sübhanallah: 33 });
  assert.equal(parseZikirState('null'), null);
  assert.equal(parseZikirState('"bozuk"'), null);
  assert.deepEqual(parseZikirState('{"zikirIdx":2,"count":"x","tur":1}'), { zikirIdx: 2, tur: 1 });
});
