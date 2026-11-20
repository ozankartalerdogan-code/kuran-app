import { cancelWidgetTick, scheduleWidgetTick } from "../../modules/exact-alarm";
import { nextWidgetRefreshAt } from "./namazWidgetData";
import type { NamazWidgetData } from "./namazWidgetData";

/** Shared by foreground refresh and the headless widget lifecycle. */
export function planPrayerWidgetTick(data: NamazWidgetData): void {
  if (!data.prayer) {
    cancelWidgetTick();
    return;
  }
  scheduleWidgetTick(nextWidgetRefreshAt(Date.now(), data.prayer.atMs));
}
