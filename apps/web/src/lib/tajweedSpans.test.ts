import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { RENK, segmentsFromSpans, type TajweedSpan } from "./tajweed.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const DB_PATH = path.join(REPO_ROOT, "data/app.db");

test("segmentsFromSpans canonical metni asla değiştirmez", () => {
  const text = "بِسْمِ ٱللَّهِ";
  const spans: TajweedSpan[] = [{ startCp: 0, endCp: 3, rule: "h" }];
  assert.equal(segmentsFromSpans(text, spans).map((s) => s.t).join(""), text);
});

test("kod noktası koordinatları UTF-16 değil, kod noktası bazlı kesilir", () => {
  // Astral karakter (2 UTF-16 birimi, 1 kod noktası) ile indeks kayması testi.
  const text = "\u{1F600}اب";
  const segs = segmentsFromSpans(text, [{ startCp: 1, endCp: 2, rule: "q" }]);
  assert.equal(segs.map((s) => s.t).join(""), text);
  const colored = segs.filter((s) => s.code === "q").map((s) => s.t).join("");
  assert.equal(colored, "ا");
});

test("geçersiz, ters ve taşan aralıklar sessizce yok sayılır", () => {
  const text = "ابج";
  for (const bad of [
    { startCp: 2, endCp: 1, rule: "q" },
    { startCp: -5, endCp: 0, rule: "q" },
    { startCp: 1.5, endCp: 2, rule: "q" },
  ] as TajweedSpan[]) {
    const segs = segmentsFromSpans(text, [bad]);
    assert.equal(segs.map((s) => s.t).join(""), text);
  }
  // Metin sonunu aşan aralık kırpılır, metin bozulmaz.
  const clipped = segmentsFromSpans(text, [{ startCp: 1, endCp: 99, rule: "q" }]);
  assert.equal(clipped.map((s) => s.t).join(""), text);
});

test("kapsanmayan aralık renksiz (code null) kalır", () => {
  const segs = segmentsFromSpans("ابج", [{ startCp: 1, endCp: 2, rule: "q" }]);
  assert.deepEqual(segs, [
    { code: null, t: "ا" },
    { code: "q", t: "ب" },
    { code: null, t: "ج" },
  ]);
});

test("tüm 6236 ayette span render canonical metni birebir korur ve renkler RENK ile eşleşir", () => {
  const db = new DatabaseSync(DB_PATH, { readOnly: true });
  try {
    const verses = db.prepare("SELECT verse_key, arabic_text FROM verses").all() as {
      verse_key: string;
      arabic_text: string | null;
    }[];
    const spansByVerse = new Map<string, TajweedSpan[]>();
    for (const s of db
      .prepare("SELECT verse_key, start_cp, end_cp, rule, color FROM tajweed_spans ORDER BY verse_key, start_cp")
      .all() as { verse_key: string; start_cp: number; end_cp: number; rule: string; color: string }[]) {
      const list = spansByVerse.get(s.verse_key) ?? [];
      list.push({ startCp: s.start_cp, endCp: s.end_cp, rule: s.rule, color: s.color });
      spansByVerse.set(s.verse_key, list);
    }

    assert.equal(verses.length, 6236, "ayet sayısı");

    let totalSpans = 0;
    let renderedVerses = 0;
    for (const v of verses) {
      const text = v.arabic_text ?? "";
      const spans = spansByVerse.get(v.verse_key) ?? [];
      totalSpans += spans.length;

      const segs = segmentsFromSpans(text, spans);
      // Canonical metin değişmemeli.
      assert.equal(segs.map((s) => s.t).join(""), text, `${v.verse_key} canonical metin`);
      // Üretilen her kural RENK tablosunda karşılığı olmalı.
      for (const seg of segs) {
        if (seg.code !== null) assert.ok(RENK[seg.code], `${v.verse_key} bilinmeyen kural: ${seg.code}`);
      }
      if (segs.some((s) => s.code !== null)) renderedVerses += 1;
    }

    assert.equal(totalSpans, 64196, "toplam span");
    // 6236 - 76 span'sız ayet = 6160 renklendirilmiş ayet.
    assert.equal(renderedVerses, 6160, "renklendirilen ayet");
  } finally {
    db.close();
  }
});

test("23 manuel override span'ı canonical render'da görünür", () => {
  const db = new DatabaseSync(DB_PATH, { readOnly: true });
  try {
    const overrides = JSON.parse(
      readFileSync(path.join(REPO_ROOT, "data/tajweed-span-overrides.json"), "utf8"),
    ) as { overrides: { surahId: number; ayahNumber: number; startCp: number; endCp: number; rule: string }[] };

    assert.equal(overrides.overrides.length, 23, "override span sayısı");
    const verseKeys = new Set(overrides.overrides.map((o) => `${o.surahId}:${o.ayahNumber}`));
    assert.equal(verseKeys.size, 14, "override ayet sayısı");

    for (const o of overrides.overrides) {
      const key = `${o.surahId}:${o.ayahNumber}`;
      const row = db.prepare("SELECT arabic_text FROM verses WHERE verse_key = ?").get(key) as
        | { arabic_text: string | null }
        | undefined;
      const spans = db
        .prepare("SELECT start_cp, end_cp, rule, color FROM tajweed_spans WHERE verse_key = ? ORDER BY start_cp")
        .all(key) as { start_cp: number; end_cp: number; rule: string; color: string }[];

      const segs = segmentsFromSpans(
        row?.arabic_text ?? "",
        spans.map((s) => ({ startCp: s.start_cp, endCp: s.end_cp, rule: s.rule, color: s.color })),
      );
      // Override aralığındaki her kod noktası, override kuralının rengini almalı.
      const chars = Array.from(row?.arabic_text ?? "");
      const rendered: (string | null)[] = [];
      for (const seg of segs) for (const _ of Array.from(seg.t)) rendered.push(seg.code);
      assert.equal(rendered.length, chars.length, `${key} uzunluk`);
      for (let i = o.startCp; i < o.endCp; i += 1) {
        assert.equal(rendered[i], o.rule, `${key} override [${o.startCp},${o.endCp}) kod noktası ${i}`);
      }
    }
  } finally {
    db.close();
  }
});
