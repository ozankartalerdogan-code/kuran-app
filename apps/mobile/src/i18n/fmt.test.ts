import { test } from "node:test";
import assert from "node:assert/strict";
import { fmt } from "./fmt.ts";

test("fmt: yer tutucuları doldurur, eksik olanı bırakır", () => {
  assert.equal(fmt("Next: {name} {x}", { name: "Asr" }), "Next: Asr {x}");
});
test("fmt: İngilizce çoğul isim 1 için tekile döner", () => {
  assert.equal(fmt("Record: {n} days", { n: 1 }), "Record: 1 day");
  assert.equal(fmt("Record: {n} days", { n: 2 }), "Record: 2 days");
  assert.equal(fmt(" — {n} verses", { n: "1" }), " — 1 verse");
  assert.equal(fmt("{n} verses · Page {p}", { n: 1, p: 3 }), "1 verse · Page 3");
  assert.equal(fmt("{n} results for \"{q}\"", { n: 1, q: "x" }), "1 result for \"x\"");
});
test("fmt: Türkçe şablon etkilenmez", () => {
  assert.equal(fmt("Rekor: {n} gün", { n: 1 }), "Rekor: 1 gün");
});
