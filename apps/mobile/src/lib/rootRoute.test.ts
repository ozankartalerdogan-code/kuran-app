import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeRootRouteParam } from "./rootRoute.ts";

test("decodes a valid encoded root", () => {
  assert.equal(decodeRootRouteParam("%D8%AE%D9%84%D9%82"), "\u062e\u0644\u0642");
});

test("preserves an unencoded root", () => {
  assert.equal(decodeRootRouteParam("\u062e\u0644\u0642"), "\u062e\u0644\u0642");
});

test("malformed percent-encoding does not throw and falls back to the invalid-link value", () => {
  for (const value of ["%", "%ZZ"]) {
    assert.doesNotThrow(() => decodeRootRouteParam(value));
    assert.equal(decodeRootRouteParam(value), "");
  }
});
