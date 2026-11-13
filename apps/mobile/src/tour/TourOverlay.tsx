import { measureWithBudget } from "./targetMeasurement";
import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, AppState, BackHandler, findNodeHandle, ScrollView, StyleSheet,
  Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../hooks/useColors";
import { fmt, useStrings } from "../i18n";
import strings from "../i18n/strings/tour";
import type { AppTourStep } from "./appTourSteps";
import { clipTarget, placeTourCard, tourSpotlight, type Rect } from "./tourGeometry";
import { Entrance, Icon, PolishButton, StepIndicator } from "../components/onboarding/Polish";
import { logFeature } from "../lib/analytics";

type Props = {
  step: AppTourStep; stepIndex: number; ready: boolean; targetRevision: number;
  measureTarget: () => Promise<Rect | null>; onClose: () => void; onBack: () => void; onNext: () => void;
};
export function TourOverlay({ step, stepIndex, ready, targetRevision, measureTarget, onClose, onBack, onNext }: Props) {
  const c = useColors(), t = useStrings(strings), insets = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();
  const root = useRef<View>(null), title = useRef<Text>(null);
  const latestMeasure = useRef(measureTarget); latestMeasure.current = measureTarget;
  const [frame, setFrame] = useState<Rect | null>(null);
  const [measurementKey, setMeasurementKey] = useState("");
  const currentKey = `${ready}:${targetRevision}:${width}:${height}:${fontScale}:${insets.top}:${insets.bottom}`;
  const [target, setTarget] = useState<Rect | null>(null);
  const [cardHeight, setCardHeight] = useState(0);
  const logged = useRef(false);
  const [unavailable, setUnavailable] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  useEffect(() => {
    const sub = AppState.addEventListener("change", state => setForeground(state === "active"));
    return () => sub.remove();
  }, []);
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => { onClose(); return true; });
    return () => subscription.remove();
  }, [onClose]);
  useEffect(() => {
    let cancelled = false;
    setTarget(null); setFrame(null); setUnavailable(false);
    if (!ready || !foreground) return;
    const cancelMeasurement = measureWithBudget({
        active: () => !cancelled && AppState.currentState === "active",
        measure: async () => {
          const rect = await latestMeasure.current();
          if (cancelled || AppState.currentState !== "active" || !rect) return null;
          return new Promise<{ bounds: Rect; local: Rect } | null>(resolve => {
            if (!root.current) { resolve(null); return; }
            root.current.measureInWindow((x, y, w, h) => {
              if (cancelled || w <= 0 || h <= 0) { resolve(null); return; }
              // Alt sınır örtünün kendi yüksekliğidir; insets.bottom ayrıca çıkarılmaz.
              const bounds = { x: 0, y: Math.max(0, insets.top - y), width: w,
                height: h - Math.max(0, insets.top - y) };
              const local = clipTarget({ ...rect, x: rect.x - x, y: rect.y - y }, bounds);
              resolve(local ? { bounds, local } : null);
            });
          });
        },
        found: ({ bounds, local }) => { setFrame(bounds); setTarget(local); setMeasurementKey(currentKey); },
        unavailable: () => setUnavailable(true),
    });
    return () => { cancelled = true; cancelMeasurement?.(); };
  }, [ready, foreground, targetRevision, width, height, fontScale, insets.top, insets.bottom, currentKey]);
  const visible = foreground && ready && measurementKey === currentKey && !!target && !!frame && cardHeight > 0;
  useEffect(() => {
    if (!visible && !unavailable) return;
    if (visible && !logged.current) { logged.current = true; void logFeature("guide_step", { step: String(stepIndex + 1) }); }
    const task = requestAnimationFrame(() => {
      const node = findNodeHandle(title.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    });
    return () => cancelAnimationFrame(task);
  }, [visible, unavailable, stepIndex, t]);
  const spot = target && frame ? tourSpotlight(target, frame) : null;
  const placement = spot && frame ? placeTourCard(spot, frame, cardHeight) : null;
  // Çok kısa ekranda sabit kontroller bile sığmazsa tüm kart kaydırılabilir kalır.
  const scrollWholeCard = !!placement && placement.maxHeight < 180 + fontScale * 100;
  const dim = (style: object) => <View pointerEvents="none" style={[{ position: "absolute", backgroundColor: c.tourOverlay }, style]} />;
  return (
    <View ref={root} collapsable={false} style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]}
      accessibilityViewIsModal onStartShouldSetResponder={() => true}>
      {/* Kesit dahil bütün arka plan dokunmaları bu katmanda tutulur. */}
      <View style={StyleSheet.absoluteFill} onStartShouldSetResponder={() => true} />
      {visible && spot ? <>
        {dim({ left: 0, right: 0, top: 0, height: spot.y })}
        {dim({ left: 0, top: spot.y, width: spot.x, height: spot.height })}
        {dim({ left: spot.x + spot.width, right: 0, top: spot.y, height: spot.height })}
        {dim({ left: 0, right: 0, top: spot.y + spot.height, bottom: 0 })}
      </> : null}
      {visible && spot && <View pointerEvents="none" style={{ position: "absolute", left: spot.x, top: spot.y, width: spot.width, height: spot.height, borderWidth: 2, borderColor: c.actionBg, borderRadius: 8 }} />}
      {!visible && <PolishButton icon="close" accessibilityLabel={t.closeGuide} onPress={onClose}
        style={{ position: "absolute", top: insets.top + 8, right: 16 }} />}
      {unavailable && foreground && <View style={{ position: "absolute", top: insets.top + 72, left: 24, right: 24, padding: 20, borderRadius: 20, backgroundColor: c.card }}>
        <Text ref={title} accessible accessibilityRole="header" accessibilityLiveRegion="polite" style={[s.body, { color: c.text }]}>{t.targetUnavailable}</Text>
        <PolishButton primary label={t.skipStep} onPress={onNext} />
      </View>}
      {placement && <View pointerEvents={visible ? "auto" : "none"} accessibilityElementsHidden={!visible} importantForAccessibility={visible ? "yes" : "no-hide-descendants"}
        onLayout={e => setCardHeight(e.nativeEvent.layout.height)}
        style={{ position: "absolute", left: placement.x, top: placement.y, width: placement.width, maxHeight: placement.maxHeight, opacity: visible ? 1 : 0 }}>
        <Entrance active={visible} style={[s.card, { maxHeight: placement.maxHeight, backgroundColor: c.card, borderColor: c.border }]}>
          {visible && placement.arrow && <View pointerEvents="none" style={{ position: "absolute", width: 12, height: 12,
            left: placement.arrowX - 6, backgroundColor: c.card, transform: [{ rotate: "45deg" }],
            ...(placement.arrow === "up" ? { top: -6 } : { bottom: -6 }) }} />}
          <ScrollView bounces={false} scrollEnabled={scrollWholeCard} style={{ flexShrink: 1 }}
            contentContainerStyle={scrollWholeCard ? undefined : { maxHeight: Math.max(0, placement.maxHeight - 42) }}>
          <View style={s.row}>
            <StepIndicator step={stepIndex + 1} total={3} label={fmt(t.stepProgress, { step: stepIndex + 1, total: 3 })} />
            <PolishButton icon="close" accessibilityLabel={t.closeGuide} onPress={onClose} />
          </View>
          <ScrollView bounces={false} scrollEnabled={!scrollWholeCard} style={{ flexShrink: scrollWholeCard ? 0 : 1 }} contentContainerStyle={{ paddingTop: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.accentLight, justifyContent: "center", alignItems: "center", marginBottom: 12 }}>
              <Icon name={stepIndex === 0 ? "book-outline" : stepIndex === 1 ? "school-outline" : "menu-outline"} color={c.actionBg} />
            </View>
            <Text ref={title} accessible accessibilityRole="header" style={[s.title, { color: c.text }]}>{t[`${step.id}_title`]}</Text>
            <Text style={[s.body, { color: c.textSecondary }]}>{t[`${step.id}_desc`]}</Text>
          </ScrollView>
          <View style={{ flexDirection: fontScale >= 1.3 || placement.width < 320 ? "column" : "row", gap: 12, marginTop: 20 }}>
            {stepIndex > 0 && <PolishButton style={{ minWidth: 88 }} icon="chevron-back" label={t.back} onPress={onBack} />}
            <PolishButton primary style={fontScale < 1.3 && placement.width >= 320 ? { flex: 1 } : undefined} label={stepIndex === 2 ? t.finish : t.next} onPress={onNext} />
          </View>
          </ScrollView>
        </Entrance>
      </View>}
    </View>
  );
}
const s = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, padding: 20 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 20, lineHeight: 28, fontWeight: "700", marginBottom: 8 },
  body: { fontSize: 16, lineHeight: 24 },
});
