import { test } from "node:test";
import assert from "node:assert/strict";
import { notificationTarget } from "./notificationTarget.ts";

test("namaz ve ayet rotalari kabul edilir, bastaki sifirlar normalize edilir", () => {
  const cases: [unknown, string][] = [
    [{ route: "/namaz" }, "/namaz"],
    [{ route: "/ayah/1/1" }, "/ayah/1/1"],
    [{ route: "/ayah/114/6" }, "/ayah/114/6"],
    [{ route: "/ayah/002/0255" }, "/ayah/2/255"],
    [{ route: "/ayah/1/999" }, "/ayah/1/999"],
    [{ route: "/namaz", surahId: 2, ayahNumber: 255 }, "/namaz"],
    [{ route: "/ayah/2/255", surahId: 1, ayahNumber: 1 }, "/ayah/2/255"],
  ];
  for (const [data, target] of cases) assert.equal(notificationTarget(data), target);
});

test("eski sayi ve sayisal string alanlari ayni araliklarla normalize edilir", () => {
  const cases: [unknown, string][] = [
    [{ surahId: 1, ayahNumber: 1 }, "/ayah/1/1"],
    [{ surahId: "114", ayahNumber: "6" }, "/ayah/114/6"],
    [{ surahId: "002", ayahNumber: "0255" }, "/ayah/2/255"],
    [{ surahId: 2, ayahNumber: "255" }, "/ayah/2/255"],
    [{ surahId: "2", ayahNumber: 255 }, "/ayah/2/255"],
    [{ surahId: 1, ayahNumber: 999 }, "/ayah/1/999"],
  ];
  for (const [data, target] of cases) assert.equal(notificationTarget(data), target);
});

test("eksik veya yanlis tipte veri ana sayfaya gider", () => {
  for (const data of [null, undefined, true, 42, "/namaz", [], {}, ["/namaz"],
    { route: null }, { route: 42 }, { route: true }, { route: {} }, { route: [] },
    { surahId: 2 }, { ayahNumber: 255 }]) {
    assert.equal(notificationTarget(data), "/(tabs)");
  }
});

test("bilinmeyen, harici veya ek iceren rotalar ana sayfaya gider", () => {
  for (const route of ["", "/", "/(tabs)", "/unknown", "https://example.com/namaz",
    "//", "//namaz", "//ayah/2/255", "quran://ayah/2/255", "/namaz?x=1",
    "/ayah/2/255?x=1", "/ayah/2/255#verse", "/ayah/2/255/", "/namaz/",
    " /namaz", "/ayah/2/255\n", "/ayah/2/255\r\n", "/ayah/2", "/ayah/a/1",
    "/ayah/2.5/1", "/ayah/2/1.5", "/ayah/+2/1", "/ayah/2/-1", "/ayah/%32/1",
    "/ayah/0/1", "/ayah/115/1", "/ayah/2/0", "/ayah/2/9007199254740992",
    `/ayah/2/${"9".repeat(400)}`]) {
    assert.equal(notificationTarget({ route }), "/(tabs)", route);
    assert.equal(notificationTarget({ route, surahId: 2, ayahNumber: 255 }), "/(tabs)", route);
  }
});

test("eski alanlarda aralik disi, kesirli veya bozuk degerler reddedilir", () => {
  const invalid = [null, undefined, true, false, {}, [], "", " ", "2x", "2.5",
    "1e2", "0x2", "+2", " 2", "2 ", "2\n", 0, "0", -1, "-1", 1.5,
    NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, "9007199254740992"];
  for (const value of invalid) {
    assert.equal(notificationTarget({ surahId: value, ayahNumber: 1 }), "/(tabs)");
    assert.equal(notificationTarget({ surahId: 1, ayahNumber: value }), "/(tabs)");
  }
  for (const surahId of [115, "115", "00115"]) {
    assert.equal(notificationTarget({ surahId, ayahNumber: 1 }), "/(tabs)");
  }
});
