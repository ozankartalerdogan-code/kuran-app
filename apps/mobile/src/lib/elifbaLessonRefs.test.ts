import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  isValidElifbaLessonId,
  isValidElifbaLessonNumber,
} from "./elifbaLessonRefs.ts";

const registry = [{ id: 1 }, { id: 4 }, { id: 9 }];

test("accepts the first and last registered Elif-Ba lessons", () => {
  assert.equal(isValidElifbaLessonId(registry[0].id, registry), true);
  assert.equal(isValidElifbaLessonId(registry.at(-1)!.id, registry), true);
});

test("rejects the lesson after the registry and malformed lesson numbers", () => {
  assert.equal(isValidElifbaLessonId(registry.at(-1)!.id + 1, registry), false);

  for (const raw of ["", "0", "-1", "1.5", "Infinity", "not-a-number"]) {
    assert.equal(isValidElifbaLessonNumber(Number(raw)), false, `invalid lesson: ${raw}`);
    assert.equal(isValidElifbaLessonId(Number(raw), registry), false, `invalid lesson: ${raw}`);
  }
});

test("guards lesson content access until the route and registry checks pass", () => {
  const source = readFileSync(
    new URL("../../app/elifba/[dersId].tsx", import.meta.url),
    "utf8",
  );
  const numberGuard = source.indexOf("if (!isValidElifbaLessonNumber(dersId))");
  const registryAccess = source.indexOf("api.elifba.dersler()");
  const registryGuard = source.indexOf("if (!isValidElifbaLessonId(dersId, lessons))");
  const progressAccess = source.indexOf("storage.getJSON<unknown>(STORAGE_KEYS.elifbaProgress)");
  const lessonAccess = source.indexOf("return api.elifba.harfler(dersId)");

  assert.ok(numberGuard >= 0);
  assert.ok(numberGuard < registryAccess);
  assert.ok(registryAccess < registryGuard);
  assert.ok(registryGuard < progressAccess);
  assert.ok(registryGuard < lessonAccess);
  assert.match(source, /mode === "flashcard" \|\| lessonExists !== true/);
});

test("keeps valid dynamic Elif-Ba route content loading", () => {
  const source = readFileSync(
    new URL("../../app/elifba/[dersId].tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /const dersId = Number\(raw\)/);
  assert.match(source, /return api\.elifba\.harfler\(dersId\)/);
});
