import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";
import type { NamazWidgetData, PrayerWidgetName } from "./namazWidgetData";

// Exact --wl-* / --wd-* values from widget-taslak.html.
const PALETTES = {
  light: { bg: "#fffdf6", border: "#e7dfcc", textSecondary: "#44403c", muted: "#78716c", accent: "#047857", soft: "#d1fae5", onSoft: "#065f46", track: "#ece5d5", past: "#78716c8c" },
  dark: { bg: "#1c1917", border: "#3a3532", textSecondary: "#d6d3d1", muted: "#a8a29e", accent: "#10b981", soft: "#064e3b", onSoft: "#a7f3d0", track: "#34302d", past: "#a8a29e8c" },
} as const;
type Theme = keyof typeof PALETTES;

// Draft card height. Launcher cells differ (A03 One UI: ~107dp per row, but the
// first ADDED render may report less), so the card keeps this height, sits
// centered in the cell, and only shrinks when the cell is smaller. Device fonts
// render taller than the HTML draft: Odak uses 6/7 padding and 20/14sp (draft
// 9/10, 22/15) and an 80dp card so label and progress bar fit (verified on A03).
const CARD_HEIGHT = { NamazSerit: 74, NamazOdak: 80 } as const;
// The library passes flex to LinearLayout weight via getInt, so fractional
// weights truncate to 0; scale the current-slice fill to integer weights.
const WEIGHT_SCALE = 1000;

export function NamazWidget({ data, widgetName, theme, cellHeight }: { data: NamazWidgetData; widgetName: PrayerWidgetName; theme: Theme; cellHeight?: number }) {
  const c = PALETTES[theme];
  const cardHeight = cellHeight && cellHeight > 0 ? Math.min(CARD_HEIGHT[widgetName], Math.floor(cellHeight)) : CARD_HEIGHT[widgetName];
  const p = data.prayer;
  const strip = widgetName === "NamazSerit";
  return (
    <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: "kuranyolu://" }}
      accessibilityLabel={p?.accessibilityLabel ?? data.emptyText}
      style={{ width: "match_parent", height: "match_parent", flexDirection: "column", justifyContent: "center" }}>
    <FlexWidget
      style={{ width: "match_parent", height: cardHeight, flexDirection: "column", justifyContent: p ? "space-between" : "center",
        backgroundColor: c.bg, borderColor: c.border, borderWidth: 1, borderRadius: 20, overflow: "hidden",
        paddingTop: strip ? 7 : 6, paddingHorizontal: strip ? 8 : 12, paddingBottom: strip ? 8 : 7 }}>
      {!p ? <TextWidget text={data.emptyText} style={{ fontSize: 10.5, color: c.muted, textAlign: "center" }} maxLines={3} /> : strip ? [
        <FlexWidget key="head" style={{ width: "match_parent", flexDirection: "row", paddingHorizontal: 4, flexGap: 8 }}>
          <FlexWidget style={{ flex: 1 }}><TextWidget text={p.heading} maxLines={1} truncate="END" style={{ fontSize: 10.5, color: c.muted }} /></FlexWidget>
          <TextWidget text={p.countdown} maxLines={1} style={{ fontSize: 10.5, fontWeight: "500", color: c.accent }} />
        </FlexWidget>,
        <FlexWidget key="cells" style={{ width: "match_parent", flexDirection: "row", flexGap: 2 }}>
          {p.cells.map(cell => <FlexWidget key={cell.key} style={{ flex: 1, width: 0, flexDirection: "column", alignItems: "center", borderRadius: 10,
            paddingTop: 3, paddingBottom: 4, ...(cell.next ? { backgroundColor: c.soft } : {}) }}>
            <TextWidget text={cell.name} maxLines={1} style={{ fontSize: 10, lineHeight: 11.5, color: cell.next ? c.onSoft : c.muted, fontWeight: cell.next ? "500" : "400" }} />
            <TextWidget text={cell.time} maxLines={1} style={{ fontSize: 13.5, lineHeight: 15.525, color: cell.next ? c.onSoft : cell.past ? c.muted : c.textSecondary, fontWeight: cell.next ? "700" : cell.past ? "400" : "500" }} />
          </FlexWidget>)}
        </FlexWidget>,
      ] : [
        <TextWidget key="head" text={p.focusHeading} maxLines={1} truncate="END" style={{ fontSize: 10, letterSpacing: 0.6, color: c.muted }} />,
        <FlexWidget key="main" style={{ width: "match_parent", flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
          <TextWidget text={p.name} maxLines={1} style={{ fontSize: 14, fontWeight: "500", color: c.textSecondary }} />
          <TextWidget text={p.time} maxLines={1} style={{ fontSize: 20, fontWeight: "700", letterSpacing: -0.2, color: c.accent, marginLeft: 6 }} />
        </FlexWidget>,
        <TextWidget key="left" text={p.remainingLabel} maxLines={1} style={{ fontSize: 10.5, color: c.muted }} />,
        <FlexWidget key="bar" style={{ width: "match_parent", flexDirection: "row", flexGap: 3 }}>
          {p.segments.map((segment, i) => <FlexWidget key={i} style={{ flex: 1, width: 0, height: 3, borderRadius: 2, overflow: "hidden", flexDirection: "row", backgroundColor: segment.state === "past" ? c.past : c.track }}>
            {segment.state === "current" ? fillParts(segment.fraction).map(([key, weight]) =>
              <FlexWidget key={key} style={{ width: 0, height: 3, flex: weight, ...(key === "done" ? { backgroundColor: c.accent } : {}) }} />) : null}
          </FlexWidget>)}
        </FlexWidget>,
      ]}
    </FlexWidget>
    </FlexWidget>
  );
}

export function fillParts(fraction: number): ["done" | "rest", number][] {
  const done = Math.round(Math.max(0, Math.min(1, fraction)) * WEIGHT_SCALE);
  return ([["done", done], ["rest", WEIGHT_SCALE - done]] as ["done" | "rest", number][]).filter(([, w]) => w > 0);
}

export function buildNamazWidgetRepresentation(widgetName: PrayerWidgetName, data: NamazWidgetData, cellHeight?: number) {
  return {
    light: <NamazWidget widgetName={widgetName} data={data} theme="light" cellHeight={cellHeight} />,
    dark: <NamazWidget widgetName={widgetName} data={data} theme="dark" cellHeight={cellHeight} />,
  };
}
