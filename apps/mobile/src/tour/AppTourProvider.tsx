import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { AccessibilityInfo, AppState, findNodeHandle, ScrollView, View, type ViewStyle } from "react-native";
import { router, usePathname } from "expo-router";
import { APP_TOUR_STEPS } from "./appTourSteps";
import { loadGuideState, saveGuideStatus } from "./appTourStorage";
import { AUTOMATIC_HINTS_ENABLED, HintSession, shouldOfferGuide, isExistingGuideUser, readSeenHints, type GuideState, type GuideStatus } from "./tourPolicy";
import { TourOverlay } from "./TourOverlay";
import type { Rect } from "./tourGeometry";
import { logFeature } from "../lib/analytics";
import { maybeAskReview } from "../hooks/useStoreReview";
import { REVIEW_WAIT_MS, subscribeReviewCompletion } from "../hooks/storeReviewPolicy";

import { storage, STORAGE_KEYS } from "../lib/storage";
import { isOverlayBusy, isContextualHintOpen, useOverlayBusy, beginOverlay } from "./overlayBusy";
import { CONTEXTUAL_HINTS, type ContextualHint } from "./contextualHints";

type TargetHandle = { measure: () => Promise<Rect | null>; focus: () => void };
type TourContext = {
  isActive: boolean; offerVisible: boolean; onboarded: boolean;
  restartTour: () => Promise<void>; dismissOffer: () => void;
  completeOnboarding: () => void;
  hintBlocked: boolean; hintRevision: number;
  showHint: (hint: ContextualHint, visitCount: number, manual: boolean) => boolean;
  noteInteraction: () => void;
  registerTarget: (id: string, handle: TargetHandle) => void;
  unregisterTarget: (id: string, handle: TargetHandle) => void;
};
const AppTourContext = createContext<TourContext>({
  isActive: false, offerVisible: false, onboarded: false,
  restartTour: async () => {}, dismissOffer: () => {}, completeOnboarding: () => {},
  registerTarget: () => {}, unregisterTarget: () => {},
  hintBlocked: true, hintRevision: 0, showHint: () => false, noteInteraction: () => {},
});

export function AppTourProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const targets = useRef(new Map<string, TargetHandle>());
  const [targetRevision, setTargetRevision] = useState(0);
  const [state, setState] = useState<GuideState | null>(null);
  const [onboarded, setOnboarded] = useState(false);
  const onboardingFinished = useRef(false);
  const [isActive, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [visit, setVisit] = useState(0);
  const step = APP_TOUR_STEPS[stepIndex];
  const activeRef = useRef(false);
  const reachedHome = useRef(false);
  const reviewBusy = useRef(false);
  const reviewAttempted = useRef(false);
  const busy = useOverlayBusy();
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  const [hintRevision, reviseHints] = useState(0);
  const hintSession = useRef(new HintSession());
  const seenReady = useRef(false);
  const existingCohort = useRef(true);
  const hintBlocked = busy || isActive || !onboarded || !foreground || pathname === "/onboarding";
  useEffect(() => {
    const subscription = AppState.addEventListener("change", next => setForeground(next === "active"));
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (!isActive && onboarded && pathname !== "/onboarding") return;
    return beginOverlay();
  }, [isActive, onboarded, pathname]);
  useEffect(() => {
    storage.getString(STORAGE_KEYS.contextualHints).then(raw => {
      hintSession.current.seen = readSeenHints(raw, CONTEXTUAL_HINTS);
      seenReady.current = true;
      reviseHints(v => v + 1);
    }).catch(() => { /* Depo okunamazsa otomatik ipucu açılmaz. */ });
  }, []);
  const noteInteraction = useCallback(() => {
    if (!activeRef.current && !isOverlayBusy() && !hintSession.current.interactedSinceGuide) {
      hintSession.current.interactedSinceGuide = true;
      reviseHints(v => v + 1);
    }
  }, []);
  const previousPath = useRef(pathname);
  useEffect(() => {
    if (previousPath.current !== pathname) noteInteraction();
    previousPath.current = pathname;
  }, [pathname, noteInteraction]);
  const showHint = useCallback((hint: ContextualHint, visitCount: number, manual: boolean) => {
    if (hintBlocked || isOverlayBusy() || activeRef.current) return false;
    if (!manual && !seenReady.current) return false;
    if (!hintSession.current.show(hint, { enabled: AUTOMATIC_HINTS_ENABLED,
      existingUser: existingCohort.current, focused: true, dataReady: true,
      targetVisible: true, overlayOpen: false, hintsThisVisit: visitCount }, manual)) return false;
    if (!manual) {
      // Yazımlar sıraya alınır; sonraki ipucu önceki kaydı ezmez.
      const snapshot = { ...hintSession.current.seen };
      hintWrites.current = hintWrites.current.then(() => storage.setJSON(STORAGE_KEYS.contextualHints, snapshot)).catch(() => {});
    }
    void logFeature("hint_show", { id: hint.id });
    return true;
  }, [hintBlocked]);
  const hintWrites = useRef(Promise.resolve());
  const offerLogged = useRef(false);
  const offered = shouldOfferGuide(state, onboarded);
  const offerVisible = offered && pathname === "/" && !isActive;

  useEffect(() => {
    let cancelled = false;
    loadGuideState().then(({ state: saved, onboarded: done }) => {
      if (!cancelled) { existingCohort.current = isExistingGuideUser(saved); setState(saved); setOnboarded(done || onboardingFinished.current); }
    }).catch(() => {
      if (!cancelled) {
        setState({ version: 7, status: "existingUser" });
        setOnboarded(true);
      }
    });
    return () => { cancelled = true; };
  }, []);
  const persist = useCallback((status: GuideStatus) => {
    // Mevcut kullanıcı manuel rehberi bitirse de kohort bilgisi korunur.
    if (existingCohort.current) return;
    setState({ version: 7, status });
    void saveGuideStatus(status).catch(() => {});
  }, []);
  const completeOnboarding = useCallback(() => {
    onboardingFinished.current = true;
    setOnboarded(true);
  }, []);
  useEffect(() => {
    if (offerVisible && !offerLogged.current) {
      offerLogged.current = true;
      void logFeature("guide_offer");
    }
  }, [offerVisible]);
  // Sonuç ekranı kapanırsa veya bir örtü açılırsa bu fırsat iptal edilir.
  useEffect(() => {
    if (!state || !onboarded || offered || hintBlocked) return;
    const pending = new Set<() => void>();
    const unsubscribe = subscribeReviewCompletion(() => {
      let cancelled = false;
      const eligible = () => !cancelled && AppState.currentState === "active" &&
        !isOverlayBusy() && !isContextualHintOpen() && !activeRef.current;
      const timer = setTimeout(() => {
        if (!eligible() || reviewAttempted.current) return;
        reviewAttempted.current = true;
        reviewBusy.current = true;
        void maybeAskReview(eligible).finally(() => { reviewBusy.current = false; });
      }, REVIEW_WAIT_MS);
      const cancel = () => { cancelled = true; clearTimeout(timer); pending.delete(cancel); };
      pending.add(cancel);
      return cancel;
    });
    return () => { unsubscribe(); pending.forEach(cancel => cancel()); };
  }, [state, onboarded, offered, hintBlocked, pathname]);

  const close = useCallback((completed = false) => {
    if (!activeRef.current) return;
    hintSession.current.interactedSinceGuide = false;
    activeRef.current = false;
    setActive(false);
    persist(completed ? "completed" : "skipped");
    void logFeature(completed ? "guide_finish" : "guide_close");
    // Örtü kalktıktan sonra odak son hedefe döner.
    if (pathname === "/") requestAnimationFrame(() => targets.current.get(step.targetId)?.focus());
  }, [persist, step.targetId, pathname]);
  useEffect(() => {
    if (!isActive) return;
    if (pathname === "/") reachedHome.current = true;
    else if (reachedHome.current) close();
  }, [pathname, isActive, close]);
  const restartTour = useCallback(async () => {
    if (activeRef.current || reviewBusy.current || isOverlayBusy() || !onboarded) return;
    reachedHome.current = pathname === "/";
    activeRef.current = true;
    setStepIndex(0);
    setVisit(v => v + 1);
    setActive(true);
    void logFeature("guide_start");
    // Yalnız açık kullanıcı isteği ana sekmeye döner; adımlar gezinmez.
    if (pathname !== "/") router.navigate("/(tabs)");
  }, [onboarded, pathname]);
  const dismissOffer = useCallback(() => {
    persist("offerDismissed");
    void logFeature("guide_close", { source: "offer" });
  }, [persist]);
  const registerTarget = useCallback((id: string, handle: TargetHandle) => {
    targets.current.set(id, handle);
    setTargetRevision(v => v + 1);
  }, []);
  const unregisterTarget = useCallback((id: string, handle: TargetHandle) => {
    if (targets.current.get(id) === handle) {
      targets.current.delete(id);
      setTargetRevision(v => v + 1);
    }
  }, []);
  const value = useMemo(() => ({ isActive, offerVisible, onboarded, restartTour, dismissOffer,
    completeOnboarding, registerTarget, unregisterTarget, hintBlocked, hintRevision, showHint, noteInteraction }),
    [isActive, offerVisible, onboarded, restartTour, dismissOffer, completeOnboarding, registerTarget, unregisterTarget, hintBlocked, hintRevision, showHint, noteInteraction]);
  return (
    <AppTourContext.Provider value={value}>
      <View style={{ flex: 1 }} onTouchStart={noteInteraction}>
        <View style={{ flex: 1 }} accessibilityElementsHidden={isActive}
          importantForAccessibility={isActive ? "no-hide-descendants" : "auto"}>{children}</View>
        {isActive && <TourOverlay key={`${visit}:${stepIndex}`} step={step} stepIndex={stepIndex}
          ready={pathname === "/"} targetRevision={targetRevision}
          measureTarget={() => targets.current.get(step.targetId)?.measure() ?? Promise.resolve(null)}
          onClose={() => close()} onBack={() => setStepIndex(i => Math.max(0, i - 1))}
          onNext={() => stepIndex === APP_TOUR_STEPS.length - 1 ? close(true) : setStepIndex(i => i + 1)} />}
      </View>
    </AppTourContext.Provider>
  );
}
export function useAppTour() { return useContext(AppTourContext); }
export function useTourTarget(id: string, focusRef?: RefObject<View | null>) {
  const { registerTarget, unregisterTarget } = useAppTour();
  const ref = useRef<View>(null);
  useEffect(() => {
    const handle: TargetHandle = {
      measure: () => new Promise(resolve => {
        if (!ref.current) { resolve(null); return; }
        ref.current.measureInWindow((x, y, width, height) => resolve({ x, y, width, height }));
      }),
      // Odak gerçek (erişilebilir) hedefe gider; ölçüm sarmalayıcısı yalnız yedek.
      focus: () => { const node = findNodeHandle(focusRef?.current ?? ref.current); if (node) AccessibilityInfo.setAccessibilityFocus(node); },
    };
    registerTarget(id, handle);
    return () => unregisterTarget(id, handle);
  }, [id, focusRef, registerTarget, unregisterTarget]);
  return { ref, collapsable: false as const };
}
// Eski ekranların ref ve kaydırma sözleşmesi korunur; rehber ekranları kaydırmaz.
export function useTourScroller<T = ScrollView>() { return { ref: useRef<T>(null), scrollEventThrottle: 32 }; }
export function TourTarget({ id, children, style }: { id: string; children: ReactNode; style?: ViewStyle }) {
  const target = useTourTarget(id);
  return <View {...target} style={style}>{children}</View>;
}
