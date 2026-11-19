import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";
import type { NamazWidgetData, PrayerWidgetName } from "./namazWidgetData";

// Exact --wl-* / --wd-* values from widget-taslak.html.
const PALETTES = {
  light: { bg: "#fffdf6", border: "#e7dfcc", textSecondary: "#44403c", muted: "#78716c", accent: "#047857", soft: "#d1fae5", onSoft: "#065f46", track: "#ece5d5", past: "#78716c8c" },
  dark: { bg: "#1c1917", border: "#3a3532", textSecondary: "#d6d3d1", muted: "#a8a29e", accent: "#10b981", soft: "#064e3b", onSoft: "#a7f3d0", track: "#34302d", past: "#a8a29e8c" },
} as const;
type Theme = keyof typeof PALETTES;

export function NamazWidget({ data, widgetName, theme }: { data: NamazWidgetData; widgetName: PrayerWidgetName; theme: Theme }) {
  const c = PALETTES[theme];
  const p = data.prayer;
  const strip = widgetName === "NamazSerit";
  return (
    <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: "kuranyolu://" }}
      accessibilityLabel={p?.accessibilityLabel ?? data.emptyText}
      style={{ width: "match_parent", height: 74, flexDirection: "column", justifyContent: p ? "space-between" : "center",
        backgroundColor: c.bg, borderColor: c.border, borderWidth: 1, borderRadius: 20, overflow: "hidden",
        paddingTop: strip ? 7 : 9, paddingHorizontal: strip ? 8 : 12, paddingBottom: strip ? 8 : 10 }}>
      {!p ? <TextWidget text={data.emptyText} style={{ fontSize: 10.5, color: c.muted, textAlign: "center" }} maxLines={3} /> : strip ? <>
        <FlexWidget style={{ width: "match_parent", flexDirection: "row", paddingHorizontal: 4, flexGap: 8 }}>
          <FlexWidget style={{ flex: 1 }}><TextWidget text={p.heading} maxLines={1} truncate="END" style={{ fontSize: 10.5, color: c.muted }} /></FlexWidget>
          <TextWidget text={p.countdown} maxLines={1} style={{ fontSize: 10.5, fontWeight: "500", color: c.accent }} />
        </FlexWidget>
        <FlexWidget style={{ width: "match_parent", flexDirection: "row", flexGap: 2 }}>
          {p.cells.map(cell => <FlexWidget key={cell.key} style={{ flex: 1, width: 0, flexDirection: "column", alignItems: "center", borderRadius: 10,
            paddingTop: 3, paddingBottom: 4, ...(cell.next ? { backgroundColor: c.soft } : {}) }}>
            <TextWidget text={cell.name} maxLines={1} style={{ fontSize: 10, lineHeight: 11.5, color: cell.next ? c.onSoft : c.muted, fontWeight: cell.next ? "500" : "400" }} />
            <TextWidget text={cell.time} maxLines={1} style={{ fontSize: 13.5, lineHeight: 15.525, color: cell.next ? c.onSoft : cell.past ? c.muted : c.textSecondary, fontWeight: cell.next ? "700" : cell.past ? "400" : "500" }} />
          </FlexWidget>)}
        </FlexWidget>
      </> : <>
        <TextWidget text={p.focusHeading} maxLines={1} truncate="END" style={{ fontSize: 10, letterSpacing: 0.6, color: c.muted }} />
        <FlexWidget style={{ width: "match_parent", flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
          <TextWidget text={p.name} maxLines={1} style={{ fontSize: 15, fontWeight: "500", color: c.textSecondary }} />
          <TextWidget text={p.time} maxLines={1} style={{ fontSize: 22, fontWeight: "700", letterSpacing: -0.22, color: c.accent, marginLeft: 6 }} />
        </FlexWidget>
        <TextWidget text={p.remainingLabel} maxLines={1} style={{ fontSize: 10.5, color: c.muted, marginTop: -2 }} />
        <FlexWidget style={{ width: "match_parent", flexDirection: "row", flexGap: 3 }}>
          {p.segments.map((segment, i) => <FlexWidget key={i} style={{ flex: 1, width: 0, height: 3, borderRadius: 2, overflow: "hidden", flexDirection: "row", backgroundColor: segment.state === "past" ? c.past : c.track }}>
            {segment.state === "current" && segment.fraction > 0 ? <FlexWidget style={{ width: 0, height: 3, flex: segment.fraction, backgroundColor: c.accent }} /> : null}
            {segment.state === "current" && segment.fraction < 1 ? <FlexWidget style={{ width: 0, height: 3, flex: 1 - segment.fraction }} /> : null}
          </FlexWidget>)}
        </FlexWidget>
      </>}
    </FlexWidget>
  );
}

export function buildNamazWidgetRepresentation(widgetName: PrayerWidgetName, data: NamazWidgetData) {
  return {
    light: <NamazWidget widgetName={widgetName} data={data} theme="light" />,
    dark: <NamazWidget widgetName={widgetName} data={data} theme="dark" />,
  };
}
