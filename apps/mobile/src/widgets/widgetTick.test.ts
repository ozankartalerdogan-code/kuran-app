import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as ts from "typescript";
import type { NamazWidgetData } from "./namazWidgetData";
import type { WidgetTaskHandlerProps } from "react-native-android-widget";

// Exercise real orchestration with native/storage/rendering boundaries stubbed.
function load<T>(file: string, modules: Record<string, unknown>): T {
  const source = readFileSync(new URL(file, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText;
  const mod = { exports: {} };
  new Function("require", "exports", "module", compiled)((id: string) => {
    if (!(id in modules)) throw new Error(`Unexpected module: ${id}`);
    return modules[id];
  }, mod.exports, mod);
  return mod.exports as T;
}
const dataApi = load<typeof import("./namazWidgetData")>("./namazWidgetData.ts", {
  "../lib/homePrayer": {}, "../lib/prayerInstant": {}, "../lib/diyanetPrayer": {},
});

function harness(atMs: number | null) {
  const events: (string | number)[] = [];
  const data = { prayer: atMs === null ? null : { atMs } } as NamazWidgetData;
  const alarm = { scheduleWidgetTick: (at: number) => events.push(at), cancelWidgetTick: () => events.push("cancel") };
  const tick = load<typeof import("./widgetTick")>("./widgetTick.ts", {
    "../../modules/exact-alarm": alarm, "./namazWidgetData": dataApi,
  });
  let widgets = [{ widgetName: "NamazSerit", widgetId: 1 }, { widgetName: "NamazOdak", widgetId: 2 }];
  let failDraw = false;
  const androidWidget = {
    getWidgetInfo: async (name: string) => widgets.filter(w => w.widgetName === name),
    requestWidgetUpdateById: async ({ widgetId, renderWidget }: { widgetId: number; renderWidget: () => unknown }) => {
      await Promise.resolve();
      if (failDraw) throw new Error("draw failed");
      renderWidget();
      events.push(`draw:${widgetId}`);
    },
  };
  const modules = {
    "react-native": { Platform: { OS: "android" } },
    "react-native-android-widget": androidWidget,
    "expo-task-manager": { defineTask: () => {} }, "expo-background-task": {},
    "../../modules/exact-alarm": alarm,
    "./widgetTick": tick,
    "./namazWidgetData": { ...dataApi, readNamazWidgetData: async () => data },
    "./NamazWidget": { buildNamazWidgetRepresentation: () => ({}) },
    "./EmirAyetWidget": {}, "./emirRotation": {},
  };
  const refresh = load<typeof import("./widgetRefresh")>("./widgetRefresh.ts", modules);
  const handler = load<typeof import("./widget-task-handler")>("./widget-task-handler.tsx", modules);
  const props = (action: WidgetTaskHandlerProps["widgetAction"], widgetName = "NamazSerit") => ({
    widgetAction: action, widgetInfo: { widgetName, widgetId: 1 },
    renderWidget: () => {
      if (failDraw) throw new Error("draw failed");
      events.push("render");
    },
  }) as WidgetTaskHandlerProps;
  return { events, refresh, handler, props,
    setWidgets: (value: typeof widgets) => { widgets = value; },
    failDraw: () => { failDraw = true; },
  };
}

test("foreground plans after both draws: next prayer or now + five minutes", async t => {
  t.mock.method(Date, "now", () => 1_000);
  for (const [prayer, expected] of [[50_000, 50_000], [900_000, 301_000]]) {
    const h = harness(prayer);
    await h.refresh.refreshPrayerWidgetsNow();
    assert.deepEqual(h.events, ["draw:1", "draw:2", expected]);
  }
});

test("foreground empty data or no installed prayer widgets cancels", async () => {
  const empty = harness(null);
  await empty.refresh.refreshPrayerWidgetsNow();
  assert.deepEqual(empty.events, ["draw:1", "draw:2", "cancel"]);
  const absent = harness(50_000);
  absent.setWidgets([]);
  await absent.refresh.refreshPrayerWidgetsNow();
  assert.deepEqual(absent.events, ["cancel"]);
});

test("failed foreground drawing never schedules a successor", async () => {
  const h = harness(50_000);
  h.failDraw();
  await h.refresh.refreshPrayerWidgetsNow();
  assert.deepEqual(h.events, []);
});

test("headless added/update/resized continues chain after render for both prayer widgets", async t => {
  t.mock.method(Date, "now", () => 1_000);
  for (const name of dataApi.PRAYER_WIDGET_NAMES) {
    for (const action of ["WIDGET_ADDED", "WIDGET_UPDATE", "WIDGET_RESIZED"] as const) {
      for (const [prayer, expected] of [[50_000, 50_000], [900_000, 301_000], [null, "cancel"]] as const) {
        const h = harness(prayer);
        await h.handler.widgetTaskHandler(h.props(action, name));
        assert.deepEqual(h.events, ["render", expected]);
      }
    }
  }
});

test("failed headless drawing does not schedule; clicks and other widgets do not alter tick", async () => {
  const h = harness(50_000);
  h.failDraw();
  await h.handler.widgetTaskHandler(h.props("WIDGET_UPDATE"));
  await h.handler.widgetTaskHandler(h.props("WIDGET_CLICK"));
  await h.handler.widgetTaskHandler(h.props("WIDGET_UPDATE", "OtherWidget"));
  assert.deepEqual(h.events, []);
});

test("deletion cancels only when neither prayer widget has remaining IDs", async () => {
  for (const remaining of [[], [{ widgetName: "NamazSerit", widgetId: 1 }]]) {
    const h = harness(50_000);
    h.setWidgets(remaining);
    await h.handler.widgetTaskHandler(h.props("WIDGET_DELETED"));
    assert.deepEqual(h.events, ["cancel"]);
  }
  for (const name of dataApi.PRAYER_WIDGET_NAMES) {
    const h = harness(50_000);
    h.setWidgets([{ widgetName: name, widgetId: 3 }]);
    await h.handler.widgetTaskHandler(h.props("WIDGET_DELETED"));
    assert.deepEqual(h.events, []);
  }
});

test("native tick wrappers silently support iOS, missing/old native builds and native errors", () => {
  for (const os of ["android", "ios"]) {
    for (const native of [null, {}, {
      scheduleWidgetTick: () => { throw new Error("native unavailable"); },
      cancelWidgetTick: () => { throw new Error("native unavailable"); },
    }]) {
      const api = load<typeof import("../../modules/exact-alarm")>("../../modules/exact-alarm/index.ts", {
        "react-native": { Platform: { OS: os } },
        "expo-modules-core": { requireOptionalNativeModule: () => {
          assert.equal(os, "android");
          return native;
        } },
      });
      assert.doesNotThrow(() => { api.scheduleWidgetTick(50_000); api.cancelWidgetTick(); });
    }
  }
});
