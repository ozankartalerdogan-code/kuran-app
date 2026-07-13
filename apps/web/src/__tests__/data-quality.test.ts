/**
 * data-quality.test.ts — VERİ KALİTE GÜVENCESİ (app.db gerektirir)
 * Çalıştır: npm run test:data
 *
 * Gösterilen/curate edilmiş alanların sağlamlığını üretimdeki gerçek
 * hasEncodingError mantığıyla doğrular. Gelecekte bir veri güncellemesi
 * encoding çöpü (Ã, Ø, rakam ikamesi) sokarsa bu test yakalar.
 * (Eski meal-no-ocr-errors.test.ti değiştirir: o, artık gösterimde kullanılmayan
 *  primary_translation'ı + %100 yanlış-pozitif '_' kalıbını test ediyordu.)
 */
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { hasEncodingError } from "../lib/cleanMeal.ts";

const DB_PATH = path.resolve(__dirname, "../../../../data/app.db");

interface Row { verse_key: string; surah_id: number; literal_ceviri: string | null; fark_analizi: string | null }

describe("Veri kalitesi — verses (literal + fark)", () => {
  let rows: Row[];
  beforeAll(() => {
    const db = new DatabaseSync(DB_PATH, { readOnly: true });
    rows = db.prepare("SELECT verse_key, surah_id, literal_ceviri, fark_analizi FROM verses").all() as unknown as Row[];
    db.close();
  });

  it("114 sure ve 6236 ayet mevcut", () => {
    assert.equal(rows.length, 6236, "ayet sayısı 6236 olmalı");
    assert.equal(new Set(rows.map((r) => r.surah_id)).size, 114, "114 sure olmalı");
  });

  it("hiçbir ayette literal_ceviri NULL değil", () => {
    const nulls = rows.filter((r) => r.literal_ceviri == null);
    assert.equal(nulls.length, 0, `literal_ceviri NULL: ${nulls.slice(0, 10).map((r) => r.verse_key).join(", ")}`);
  });

  it("literal_ceviri'de encoding hatası yok (Ã/Ø/rakam ikamesi)", () => {
    const bad = rows.filter((r) => r.literal_ceviri && hasEncodingError(r.literal_ceviri));
    assert.equal(bad.length, 0, `bozuk literal: ${bad.slice(0, 10).map((r) => r.verse_key).join(", ")}`);
  });

  it("fark_analizi'de encoding hatası yok", () => {
    const bad = rows.filter((r) => r.fark_analizi && hasEncodingError(r.fark_analizi));
    assert.equal(bad.length, 0, `bozuk fark: ${bad.slice(0, 10).map((r) => r.verse_key).join(", ")}`);
  });
});
