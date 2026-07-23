import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const indexRoute = readFileSync(
  new URL("../../app/surah/index.tsx", import.meta.url),
  "utf8",
);
const dynamicRoute = readFileSync(
  new URL("../../app/surah/[id].tsx", import.meta.url),
  "utf8",
);

test("/surah redirects with Redirect so no extra history entry remains", () => {
  assert.match(indexRoute, /return <Redirect href="\/sure-listesi" \/>;/);
});

test("/surah redirect target is the existing surah list route", () => {
  const target = indexRoute.match(/<Redirect href="([^"]+)" \/>/)?.[1];
  assert.equal(target, "/sure-listesi");
});

test("dynamic /surah/1 route remains handled by [id].tsx", () => {
  assert.match(dynamicRoute, /export default function SurahDetailScreen\(\)/);
  assert.match(dynamicRoute, /useLocalSearchParams<\{ id: string \}>\(\)/);
});
