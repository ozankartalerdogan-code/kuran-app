/**
 * Native tecvid metninin JS tarafındaki yükseklik defteri. Mushaf sayfasının
 * tek satıra düşme arızasının JS ayağı buradaydı: ölçülen yükseklik, geldiği
 * native view'dan daha uzun yaşayıp başka bir metne uygulanabiliyordu.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { gecerliYukseklik, yukseklikAnahtari } from "../../modules/tajweed-text/yukseklik.ts";

const anahtar = (over: Partial<Parameters<typeof yukseklikAnahtari>[0]> = {}) =>
  yukseklikAnahtari({ genislik: 1080, fontSize: 23, lineHeight: 44, text: "بِسْمِ", ...over });

test("yükseklik anahtarı ölçümü etkileyen her girdiyi kapsar", () => {
  const temel = anahtar();
  assert.notEqual(temel, anahtar({ genislik: 720 }), "genişlik anahtarda olmalı");
  assert.notEqual(temel, anahtar({ fontSize: 26 }), "fontSize anahtarda olmalı");
  assert.notEqual(temel, anahtar({ lineHeight: 50 }), "lineHeight anahtarda olmalı");
  assert.notEqual(temel, anahtar({ text: "ٱلْحَمْدُ" }), "metin anahtarda olmalı");
  assert.equal(temel, anahtar(), "aynı girdiler aynı anahtarı vermeli");
});

test("fontSize/lineHeight verilmemesi ile 0 verilmesi karışmaz", () => {
  assert.notEqual(
    yukseklikAnahtari({ genislik: 1080, text: "x" }),
    yukseklikAnahtari({ genislik: 1080, fontSize: 0, lineHeight: 0, text: "x" }),
  );
});

test("saklanan ölçüm yalnız kendi anahtarına uygulanır", () => {
  const cache = new Map<string, number>();
  const eski = anahtar();
  const yeni = anahtar({ fontSize: 26 }); // A+ ile zoom

  // Eski anahtar için ölçüm geldi.
  cache.set(eski, 520);
  assert.equal(gecerliYukseklik({ key: eski, yukseklik: 520 }, eski, cache), 520);

  // Anahtar değişti: önceki bloğun yüksekliği TAŞINMAMALI.
  assert.equal(gecerliYukseklik({ key: eski, yukseklik: 520 }, yeni, cache), 10);

  // Yeni anahtarın bilinen ölçüsü varsa 10 yerine ondan başlanır.
  cache.set(yeni, 610);
  assert.equal(gecerliYukseklik({ key: eski, yukseklik: 520 }, yeni, cache), 610);
});

test("ölçüm yokken önbellek, önbellek de yokken varsayılan kullanılır", () => {
  const cache = new Map<string, number>([[anahtar(), 300]]);
  assert.equal(gecerliYukseklik(null, anahtar(), cache), 300);
  assert.equal(gecerliYukseklik(null, anahtar({ text: "yok" }), cache), 10);
});
