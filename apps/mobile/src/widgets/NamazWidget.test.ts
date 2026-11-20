import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import * as homePrayer from "../lib/homePrayer.ts";
import * as instants from "../lib/prayerInstant.ts";
import * as diyanet from "../lib/diyanetPrayer.ts";
import { loadModule } from "../../test-support/loadModule.ts";

// Render through the library's real tree builder: it walks JSX by hand and
// does not understand Fragments, so a tree that throws here draws an empty
// widget on the device (the headless handler swallows the error).
const req = createRequire(import.meta.url);
const libDir = "react-native-android-widget/lib/commonjs";
const { buildWidgetTree } = req(`${libDir}/api/build-widget-tree.js`);
const widgetLib = { ...req(`${libDir}/widgets/FlexWidget.js`), ...req(`${libDir}/widgets/TextWidget.js`) };
const libs = { react: req("react"), "react-native-android-widget": widgetLib, "../lib/homePrayer": homePrayer, "../lib/prayerInstant": instants, "../lib/diyanetPrayer": diyanet };
const here = (f: string) => fileURLToPath(new URL(f, import.meta.url));
const dataApi = loadModule<typeof import("./namazWidgetData")>(here("./namazWidgetData.ts"), libs);
const view = loadModule<typeof import("./NamazWidget")>(here("./NamazWidget.tsx"), { ...libs, "./namazWidgetData": dataApi });

const wall = { Fajr: "06:12", Sunrise: "07:41", Dhuhr: "12:53", Asr: "15:22", Maghrib: "17:42", Isha: "19:06" };
const day = (date: string) => ({ sourceDate: date, cityKey: "m34", cityTimeZone: "Europe/Istanbul", cityDisplayName: "İstanbul", source: "diyanet" as const, revision: "1",
  atMs: instants.instantsFromWallTimes(date, wall, "Europe/Istanbul")!, hijri: { day: 10, monthNumber: 6, year: 1448 }, fetchedAt: 0 });
const records = [day("2026-11-18"), day("2026-11-19"), day("2026-11-20")];
const now = Date.parse("2026-11-19T11:15:00+03:00");

type Node = { type: string; props: { text?: string }; children?: Node[] };
const texts = (n: Node): string[] => [...(n.props?.text ? [n.props.text] : []), ...(n.children ?? []).flatMap(texts)];

for (const name of ["NamazSerit", "NamazOdak"] as const) {
  test(`${name} builds a real widget tree in light and dark, with and without data`, () => {
    for (const data of [dataApi.buildNamazWidgetData(records, "İstanbul", now, "tr"), dataApi.buildNamazWidgetData([], "", now, "tr")]) {
      for (const cellHeight of [undefined, 68, 107]) for (const theme of ["light", "dark"] as const) {
        const tree = buildWidgetTree(view.buildNamazWidgetRepresentation(name, data, cellHeight)[theme]) as Node;
        assert.equal(tree.type, "LinearLayoutWidget");
        const all = texts(tree);
        // Native side reads weight with getInt: a fraction would silently become 0.
        const weights = (n: Node): unknown[] => [...("weight" in (n.props as object) ? [(n.props as { weight: unknown }).weight] : []), ...(n.children ?? []).flatMap(weights)];
        for (const w of weights(tree)) assert.ok(Number.isInteger(w) && (w as number) > 0, `weight ${w}`);
        if (!data.prayer) assert.deepEqual(all, ["Vakitler için uygulamayı açın"]);
        else if (name === "NamazSerit") {
          assert.ok(all.includes("Öğle'ye 1 sa 38 dk"));
          for (const t of Object.values(wall)) assert.ok(all.includes(t), t);
        } else assert.deepEqual(all, ["SIRADAKİ · İSTANBUL", "Öğle", "12:53", "1 sa 38 dk kaldı"]);
      }
      // The card never grows past the draft height and shrinks to small cells.
      const card = (h?: number) => (buildWidgetTree(view.buildNamazWidgetRepresentation(name, data, h).light) as Node & { children: Node[] }).children[0].props as Record<string, unknown>;
      assert.notDeepEqual(card(107), card(68));
      assert.deepEqual(card(107), card(undefined));
    }
  });
}

