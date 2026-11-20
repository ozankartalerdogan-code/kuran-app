import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadModule } from "../../test-support/loadModule.ts";

const { decodeMushafPage } = loadModule<typeof import("./offlineTrCodec")>(fileURLToPath(new URL("./offlineTrCodec.ts", import.meta.url)));
const surahs = [{ id: 1, name: "Fatiha", arabicName: "الفاتحة", translit: "Fatiha", verseCount: 7, revelationPlace: "Mekke" as const }];

test("empty compact page returns null before reading verse metadata", () => {
  assert.equal(decodeMushafPage(1, 1, [], [], [], [], []), null);
});

test("null Arabic override falls back to canonical Arabic, like an omitted override", () => {
  const canonical = [["بِسْمِ اللَّهِ"]];
  const omitted = decodeMushafPage(1, 1, [1, 1], [[[], null, null]], surahs, canonical, []);
  const explicitNull = decodeMushafPage(1, 1, [1, 1], [[[], null, null, null]], surahs, canonical, []);
  assert.ok(explicitNull);
  assert.deepEqual(explicitNull, omitted);
});
