import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildTourRoute,
  getSafeTourExitRoute,
  getTourNavigationTarget,
} from "./appTourSteps.ts";

test("builds a route identity without duplicating dynamic params and preserves query params", () => {
  assert.equal(
    buildTourRoute(
      "/ayah/1/1",
      ["ayah", "[surahId]", "[ayahNumber]"],
      { surahId: "1", ayahNumber: "1", word: "3", mode: "analysis" },
    ),
    "/ayah/1/1?mode=analysis&word=3",
  );
});

test("different tour routes navigate, while equivalent routes do not", () => {
  assert.equal(getTourNavigationTarget("/", "/kuran"), "/kuran");
  assert.equal(getTourNavigationTarget("/ayah/1/1?word=3&mode=analysis", "/ayah/1/1?mode=analysis&word=3"), null);
  assert.equal(getTourNavigationTarget("/root/%D8%AE%D9%84%D9%82", "/root/خلق"), null);
});

test("tour exit keeps a safe starting route and rejects unsafe targets", () => {
  assert.equal(getSafeTourExitRoute("/ayah/1/1?word=3"), "/ayah/1/1?word=3");
  assert.equal(getSafeTourExitRoute("/onboarding"), "/");
  assert.equal(getSafeTourExitRoute("https://example.com/surah/1"), "/");
  assert.equal(getSafeTourExitRoute("//example.com/surah/1"), "/");
});

test("provider uses replace and step-only forward/back controls", () => {
  const source = readFileSync(new URL("./AppTourProvider.tsx", import.meta.url), "utf8");
  const nextStart = source.indexOf("const goNext = useCallback");
  const backStart = source.indexOf("const goBack = useCallback");
  const valueStart = source.indexOf("const value = useMemo");
  const nextBlock = source.slice(nextStart, backStart);
  const backBlock = source.slice(backStart, valueStart);

  assert.doesNotMatch(source, /router\.push/);
  assert.match(source, /router\.replace/);
  assert.match(nextBlock, /setStepIndex/);
  assert.doesNotMatch(nextBlock, /replaceTourRoute/);
  assert.match(backBlock, /setStepIndex/);
  assert.doesNotMatch(backBlock, /replaceTourRoute/);
});

test("completion and skip restore the saved starting route without stacking tour screens", () => {
  const source = readFileSync(new URL("./AppTourProvider.tsx", import.meta.url), "utf8");
  const finishStart = source.indexOf("const finishTour = useCallback");
  const startupStart = source.indexOf("// İlk açılışta", finishStart);
  const finishBlock = source.slice(finishStart, startupStart);

  assert.match(source, /tourStartRoute\.current = getSafeTourExitRoute\(originRoute\)/);
  assert.match(finishBlock, /getSafeTourExitRoute\(tourStartRoute\.current\)/);
  assert.match(finishBlock, /replaceTourRoute\(exitTarget\)/);
  assert.match(source, /onSkip=\{finishTour\}/);
});
