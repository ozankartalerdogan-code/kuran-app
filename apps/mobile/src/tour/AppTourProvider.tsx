import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Animated,
  Dimensions,
  InteractionManager,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from "react-native";
import { router, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../hooks/useColors";
import { APP_TOUR_STEPS, type AppTourStep } from "./appTourSteps";
import { completeAppTour, hasCompletedAppTour, resetAppTour } from "./appTourStorage";

type TargetRect = { x: number; y: number; width: number; height: number };
type TargetHandle = { measure: () => Promise<TargetRect | null> };

type AppTourContextValue = {
  isActive: boolean;
  restartTour: () => Promise<void>;
  registerTarget: (id: string, handle: TargetHandle) => void;
  unregisterTarget: (id: string) => void;
};

const AppTourContext = createContext<AppTourContextValue>({
  isActive: false,
  restartTour: async () => {},
  registerTarget: () => {},
  unregisterTarget: () => {},
});

function normalizePath(path: string): string {
  if (!path || path === "/(tabs)") return "/";
  return path.endsWith("/") && path.length > 1 ? path.slice(0, -1) : path;
}

function navigateTo(path: string): void {
  (router.push as unknown as (href: string) => void)(path);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isUsableRect(rect: TargetRect | null): rect is TargetRect {
  return !!rect && rect.width > 4 && rect.height > 4;
}

export function AppTourProvider({ children }: { children: ReactNode }) {
  const pathname = normalizePath(usePathname());
  const targets = useRef(new Map<string, TargetHandle>());
  const [isActive, setIsActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null | undefined>(undefined);
  const checkedStartup = useRef(false);

  const step = isActive ? APP_TOUR_STEPS[stepIndex] : null;

  const registerTarget = useCallback((id: string, handle: TargetHandle) => {
    targets.current.set(id, handle);
  }, []);

  const unregisterTarget = useCallback((id: string) => {
    targets.current.delete(id);
  }, []);

  const startTour = useCallback(() => {
    setStepIndex(0);
    setIsActive(true);
  }, []);

  const restartTour = useCallback(async () => {
    await resetAppTour();
    startTour();
    navigateTo(APP_TOUR_STEPS[0].route);
  }, [startTour]);

  const finishTour = useCallback(async () => {
    setIsActive(false);
    setTargetRect(undefined);
    await completeAppTour();
  }, []);

  useEffect(() => {
    if (checkedStartup.current || pathname === "/onboarding") return;
    checkedStartup.current = true;

    let cancelled = false;
    hasCompletedAppTour()
      .then((completed) => {
        if (cancelled || completed) return;
        const timer = setTimeout(() => {
          if (!cancelled) startTour();
        }, 650);
        return () => clearTimeout(timer);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [pathname, startTour]);

  useEffect(() => {
    if (!step || pathname === "/onboarding") return;
    const targetRoute = normalizePath(step.route);
    if (pathname !== targetRoute) {
      navigateTo(targetRoute);
    }
  }, [pathname, step]);

  useEffect(() => {
    if (!step) return;
    let cancelled = false;
    setTargetRect(undefined);

    if (!step.targetId) {
      setTargetRect(null);
      return () => { cancelled = true; };
    }

    const measureTarget = (attempt: number) => {
      InteractionManager.runAfterInteractions(() => {
        setTimeout(async () => {
          if (cancelled || !step.targetId) return;
          const handle = targets.current.get(step.targetId);
          const rect = await handle?.measure();
          if (cancelled) return;
          if (isUsableRect(rect ?? null)) {
            setTargetRect(rect ?? null);
            return;
          }
          if (attempt < 4) {
            measureTarget(attempt + 1);
          } else {
            setTargetRect(null);
          }
        }, attempt === 0 ? 120 : 220);
      });
    };

    measureTarget(0);
    return () => { cancelled = true; };
  }, [step, pathname]);

  const goNext = useCallback(() => {
    if (!step) return;
    if (step.action === "finish" || stepIndex >= APP_TOUR_STEPS.length - 1) {
      void finishTour();
      return;
    }

    const nextIndex = stepIndex + 1;
    const nextStep = APP_TOUR_STEPS[nextIndex];
    setStepIndex(nextIndex);
    navigateTo(step.navigateTo ?? nextStep.route);
  }, [finishTour, step, stepIndex]);

  const goBack = useCallback(() => {
    if (stepIndex <= 0) return;
    const prevIndex = stepIndex - 1;
    const prevStep = APP_TOUR_STEPS[prevIndex];
    setStepIndex(prevIndex);
    navigateTo(prevStep.route);
  }, [stepIndex]);

  const value = useMemo<AppTourContextValue>(() => ({
    isActive,
    restartTour,
    registerTarget,
    unregisterTarget,
  }), [isActive, registerTarget, restartTour, unregisterTarget]);

  return (
    <AppTourContext.Provider value={value}>
      <View style={styles.root}>
        {children}
        {step ? (
          <AppTourOverlay
            step={step}
            stepIndex={stepIndex}
            totalSteps={APP_TOUR_STEPS.length}
            targetRect={targetRect}
            onBack={goBack}
            onNext={goNext}
            onSkip={finishTour}
          />
        ) : null}
      </View>
    </AppTourContext.Provider>
  );
}

export function useAppTour() {
  return useContext(AppTourContext);
}

export function useTourTarget(id: string) {
  const { registerTarget, unregisterTarget } = useAppTour();
  const ref = useRef<any>(null);

  const measure = useCallback(() => new Promise<TargetRect | null>((resolve) => {
    const node = ref.current;
    if (!node?.measureInWindow) {
      resolve(null);
      return;
    }

    node.measureInWindow((x: number, y: number, width: number, height: number) => {
      if (!Number.isFinite(x + y + width + height)) {
        resolve(null);
        return;
      }
      resolve({ x, y, width, height });
    });
  }), []);

  useEffect(() => {
    registerTarget(id, { measure });
    return () => unregisterTarget(id);
  }, [id, measure, registerTarget, unregisterTarget]);

  const onLayout = useCallback((_event: LayoutChangeEvent) => {}, []);

  return { ref, onLayout, collapsable: false as const };
}

export function TourTarget({ id, children, style }: { id: string; children: ReactNode; style?: ViewStyle }) {
  const target = useTourTarget(id);
  return (
    <View {...target} style={style}>
      {children}
    </View>
  );
}

function AppTourOverlay({
  step,
  stepIndex,
  totalSteps,
  targetRect,
  onBack,
  onNext,
  onSkip,
}: {
  step: AppTourStep;
  stepIndex: number;
  totalSteps: number;
  targetRect: TargetRect | null | undefined;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const fade = useRef(new Animated.Value(0)).current;
  const { width, height } = Dimensions.get("window");
  const hasTarget = isUsableRect(targetRect ?? null);
  const pad = 8;
  const spotlight = hasTarget
    ? {
        x: clamp((targetRect?.x ?? 0) - pad, 10, width - 20),
        y: clamp((targetRect?.y ?? 0) - pad, insets.top + 6, height - insets.bottom - 20),
        width: clamp((targetRect?.width ?? 0) + pad * 2, 32, width - 20),
        height: clamp((targetRect?.height ?? 0) + pad * 2, 32, height - insets.top - insets.bottom - 20),
      }
    : null;

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }, [fade, step.id]);

  const cardWidth = Math.min(width - 32, 360);
  const cardLeft = 16;
  const fallbackTop = Math.max(insets.top + 70, height * 0.28);
  const preferredTop = spotlight
    ? step.placement === "top"
      ? spotlight.y - 190
      : spotlight.y + spotlight.height + 14
    : fallbackTop;
  const cardTop = step.placement === "center"
    ? Math.max(insets.top + 80, height * 0.34)
    : clamp(preferredTop, insets.top + 16, height - insets.bottom - 245);

  const nextLabel = step.action === "finish" || stepIndex === totalSteps - 1
    ? "Uygulamayı Keşfet"
    : step.action === "navigate"
      ? "Devam Et"
      : "Devam";

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, { opacity: fade }]} pointerEvents="box-none">
      {spotlight ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={[styles.dim, { top: 0, left: 0, right: 0, height: spotlight.y }]} />
          <View style={[styles.dim, { top: spotlight.y + spotlight.height, left: 0, right: 0, bottom: 0 }]} />
          <View style={[styles.dim, { top: spotlight.y, left: 0, width: spotlight.x, height: spotlight.height }]} />
          <View style={[styles.dim, { top: spotlight.y, left: spotlight.x + spotlight.width, right: 0, height: spotlight.height }]} />
          <View
            style={[
              styles.spotlight,
              {
                top: spotlight.y,
                left: spotlight.x,
                width: spotlight.width,
                height: spotlight.height,
                borderColor: c.accent,
              },
            ]}
          />
        </View>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.dim]} pointerEvents="none" />
      )}

      <View
        style={[
          styles.card,
          {
            top: cardTop,
            left: cardLeft,
            width: cardWidth,
            backgroundColor: c.card,
            borderColor: c.isDark ? "rgba(16,185,129,0.5)" : "rgba(5,150,105,0.35)",
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.kicker, { color: c.accent }]}>{stepIndex + 1}/{totalSteps}</Text>
          <TouchableOpacity onPress={onSkip} hitSlop={10} accessibilityRole="button" accessibilityLabel="Rehberi geç">
            <Text style={[styles.skipText, { color: c.textMuted }]}>Geç</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.title, { color: c.text }]}>{step.title}</Text>
        <Text style={[styles.description, { color: c.textSecondary }]}>{step.description}</Text>
        {targetRect === null && step.targetId ? (
          <Text style={[styles.fallbackText, { color: c.textMuted }]}>Bu alan şu an ölçülemedi; anlatıma güvenli şekilde devam edebilirsin.</Text>
        ) : null}
        <View style={styles.controls}>
          <TouchableOpacity
            onPress={onBack}
            disabled={stepIndex === 0}
            style={[styles.secondaryButton, { borderColor: c.border, opacity: stepIndex === 0 ? 0.45 : 1 }]}
            accessibilityRole="button"
            accessibilityState={{ disabled: stepIndex === 0 }}
            accessibilityLabel="Önceki rehber adımı"
          >
            <Text style={[styles.secondaryText, { color: c.text }]}>Geri</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onNext}
            style={[styles.primaryButton, { backgroundColor: c.accent }]}
            accessibilityRole="button"
            accessibilityLabel={nextLabel}
          >
            <Text style={styles.primaryText}>{nextLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: { zIndex: 9999, elevation: 9999 },
  dim: { position: "absolute", backgroundColor: "rgba(5, 10, 20, 0.64)" },
  spotlight: {
    position: "absolute",
    borderWidth: 2,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    shadowColor: "#10b981",
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  card: {
    position: "absolute",
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 18,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  kicker: { fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
  skipText: { fontSize: 13, fontWeight: "700" },
  title: { fontSize: 19, fontWeight: "800", marginBottom: 8 },
  description: { fontSize: 14, lineHeight: 21 },
  fallbackText: { fontSize: 12, lineHeight: 18, marginTop: 10, fontStyle: "italic" },
  controls: { flexDirection: "row", gap: 10, marginTop: 18 },
  secondaryButton: { paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderRadius: 12 },
  secondaryText: { fontSize: 14, fontWeight: "700" },
  primaryButton: { flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, alignItems: "center" },
  primaryText: { color: "#fff", fontSize: 14, fontWeight: "800" },
});
