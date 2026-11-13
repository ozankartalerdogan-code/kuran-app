import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useFocusEffect } from "expo-router";
import { AccessibilityInfo, findNodeHandle, useWindowDimensions } from "react-native";
import { useAppTour, useTourTarget } from "./AppTourProvider";
import { CONTEXTUAL_HINTS } from "./contextualHints";
import { AUTOMATIC_HINTS_ENABLED, canOpenHint, hintTargetVisible, hintAutoAnchorVisible } from "./tourPolicy";
import { isOverlayBusy, beginContextualHint } from "./overlayBusy";
import { logFeature } from "../lib/analytics";
import type { Rect } from "./tourGeometry";

export type HintId = "surahInteraction" | "ayahTabs" | "lessonProgress" | "rootMap";
type Measurable = { measureInWindow?: (callback: (x: number, y: number, width: number, height: number) => void) => void;
  getNativeScrollRef?: () => Measurable };
function measure(node: Measurable | null): Promise<Rect | null> {
  return new Promise(resolve => {
    const native = node?.getNativeScrollRef?.() ?? node;
    if (!native?.measureInWindow) { resolve(null); return; }
    native.measureInWindow((x, y, width, height) => resolve({ x, y, width, height }));
  });
}

export function useContextualHint<T>(id: HintId, dataReady: boolean, dataKey: string,
  externalScrollRef?: RefObject<T | null>, autoAnchor?: RefObject<Measurable | null>) {
  const hint = CONTEXTUAL_HINTS.find(item => item.id === id)!;
  const target = useTourTarget(hint.targetId);
  const [focused, setFocused] = useState(false);
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => { setFocused(false); };
  }, []));
  const { width, height, fontScale } = useWindowDimensions();
  const { hintBlocked, hintRevision, showHint, noteInteraction } = useAppTour();
  const viewport = useRef<Measurable | null>(null);
  const helpRef = useRef<import("react-native").View>(null);
  const [display, setDisplay] = useState<"auto" | "manual" | null>(null);
  useEffect(() => { if (display) return beginContextualHint(); }, [display]);
  const displayRef = useRef(display);
  const [revision, setRevision] = useState(0);
  const [targetVisible, setTargetVisible] = useState(false);
  const visitCount = useRef(0);
  const generation = useRef(0);
  const scrolling = useRef(false);
  const dragging = useRef(false);
  const momentum = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismiss = useCallback((restoreFocus = false) => {
    const previous = displayRef.current;
    if (!previous) return;
    displayRef.current = null;
    setDisplay(null);
    void logFeature("hint_dismiss", { id });
    if (restoreFocus && previous === "manual") {
      requestAnimationFrame(() => {
        const node = findNodeHandle(helpRef.current);
        if (node) AccessibilityInfo.setAccessibilityFocus(node);
      });
    }
  }, [id]);
  const invalidate = useCallback(() => {
    generation.current += 1;
    setRevision(value => value + 1);
  }, []);
  const viewportRef = useCallback((node: unknown) => {
    viewport.current = node as Measurable | null;
    if (externalScrollRef) externalScrollRef.current = node as T | null;
  }, [externalScrollRef]);
  const visible = useCallback(async (automatic = false) => {
    const [rect, bounds, anchor] = await Promise.all([measure(target.ref.current), measure(viewport.current),
      automatic && autoAnchor ? measure(autoAnchor.current) : Promise.resolve(null)]);
    return !!rect && !!bounds && hintTargetVisible(rect, bounds) &&
      (!automatic || !autoAnchor || hintAutoAnchorVisible(anchor, bounds));
  }, [target.ref, autoAnchor]);
  const allowed = focused && dataReady && !hintBlocked;
  const allowedRef = useRef(allowed);
  allowedRef.current = allowed;
  useEffect(() => {
    let cancelled = false;
    if (!allowed || scrolling.current) { setTargetVisible(false); return; }
    const frame = requestAnimationFrame(() => {
      void visible().then(isVisible => { if (!cancelled) setTargetVisible(isVisible); });
    });
    return () => { cancelled = true; cancelAnimationFrame(frame); };
  }, [allowed, dataKey, width, height, fontScale, revision, hintRevision, display, visible]);
  const open = useCallback(async (manual: boolean) => {
    const ticket = generation.current;
    const targetVisible = await visible(!manual);
    if (ticket !== generation.current || scrolling.current || isOverlayBusy() || displayRef.current ||
      !canOpenHint({ focused: allowedRef.current, dataReady: true, targetVisible, overlayOpen: false })) return;
    if (showHint(hint, visitCount.current, manual)) {
      if (!manual) visitCount.current += 1;
      displayRef.current = manual ? "manual" : "auto";
      setDisplay(displayRef.current);
    }
  }, [visible, showHint, hint]);
  useEffect(() => {
    if (focused) visitCount.current = 0;
    return () => { generation.current += 1; dismiss(); };
  }, [focused, dismiss]);
  useEffect(() => {
    generation.current += 1;
    if (!allowed) dismiss();
    if (!allowed || scrolling.current) return;
    if (displayRef.current) {
      let cancelled = false;
      void visible().then(isVisible => { if (!cancelled && !isVisible) dismiss(); });
      return () => { cancelled = true; };
    }
    if (!AUTOMATIC_HINTS_ENABLED) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ticket = generation.current;
    void visible(true).then(isVisible => {
      if (cancelled || !isVisible || ticket !== generation.current) return;
      // İlk ölçümden sonra hedef 600 ms kesintisiz görünür kalmalıdır.
      timer = setTimeout(() => { if (!cancelled) void open(false); }, 600);
    });
    return () => { cancelled = true; clearTimeout(timer); generation.current += 1; };
  }, [allowed, dataKey, width, height, fontScale, revision, hintRevision, visible, open, dismiss]);
  useEffect(() => { dismiss(); }, [dataKey, dismiss]);
  useEffect(() => () => { if (settleTimer.current) clearTimeout(settleTimer.current); }, []);
  const onScroll = useCallback(() => {
    noteInteraction();
    scrolling.current = true;
    setTargetVisible(false);
    generation.current += 1;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    if (dragging.current || momentum.current) return;
    settleTimer.current = setTimeout(() => {
      scrolling.current = false;
      invalidate();
      void visible().then(isVisible => { if (!isVisible) dismiss(); });
    }, 120);
  }, [noteInteraction, invalidate, visible, dismiss]);
  const dismissManual = useCallback(() => dismiss(true), [dismiss]);
  const targetAction = useCallback(() => dismiss(), [dismiss]);
  const openManual = useCallback(() => { void open(true); }, [open]);
  const targetRef = target.ref;
  const targetProps = useMemo(() => ({ ref: targetRef, collapsable: false as const, onLayout: invalidate }), [targetRef, invalidate]);
  const scrollProps = useMemo(() => ({ onScroll,
      onScrollBeginDrag: () => { dragging.current = true; onScroll(); },
      onMomentumScrollBegin: () => { momentum.current = true; onScroll(); },
      onScrollEndDrag: () => { dragging.current = false; onScroll(); },
      onMomentumScrollEnd: () => { momentum.current = false; onScroll(); },
      onLayout: invalidate, scrollEventThrottle: 32 }), [onScroll, invalidate]);
  return { id, display, helpRef, dismiss: dismissManual, targetAction, openManual,
    helpDisabled: !allowed || !targetVisible, targetProps, viewportRef, scrollProps };
}
