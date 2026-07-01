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
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewStyle,
} from "react-native";
import { router, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../hooks/useColors";
import { APP_TOUR_STEPS, type AppTourStep } from "./appTourSteps";
import { completeAppTour, hasCompletedAppTour, resetAppTour } from "./appTourStorage";

type TargetRect = { x: number; y: number; width: number; height: number };
type TargetHandle = { measure: () => Promise<TargetRect | null> };
type ScrollHandle = { scrollBy: (delta: number) => void };

type AppTourContextValue = {
  isActive: boolean;
  restartTour: () => Promise<void>;
  registerTarget: (id: string, handle: TargetHandle) => void;
  unregisterTarget: (id: string) => void;
  registerScroller: (route: string, handle: ScrollHandle) => void;
  unregisterScroller: (route: string) => void;
};

const AppTourContext = createContext<AppTourContextValue>({
  isActive: false,
  restartTour: async () => {},
  registerTarget: () => {},
  unregisterTarget: () => {},
  registerScroller: () => {},
  unregisterScroller: () => {},
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

const SPOT_PAD = 10;
const CARD_MARGIN = 16;
const ARROW = 11;

export function AppTourProvider({ children }: { children: ReactNode }) {
  const pathname = normalizePath(usePathname());
  const targets = useRef(new Map<string, TargetHandle>());
  const scrollers = useRef(new Map<string, ScrollHandle>());
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
  const registerScroller = useCallback((route: string, handle: ScrollHandle) => {
    scrollers.current.set(route, handle);
  }, []);
  const unregisterScroller = useCallback((route: string) => {
    scrollers.current.delete(route);
  }, []);

  const startTour = useCallback(() => {
    setStepIndex(0);
    setIsActive(true);
  }, []);

  const restartTour = useCallback(async () => {
    await resetAppTour();
    navigateTo(APP_TOUR_STEPS[0].route);
    // Farklı bir sekmeden (Daha Fazla) başlatıldığında home tab'a geçiş + mount +
    // anchor kaydı zaman alır. İlk-run'daki 650ms gecikmeyi burada da uygula ki
    // ilk hedefler ölçülebilsin (aksi halde oklar yanlış/boşa konumlanıyordu).
    setTimeout(() => startTour(), 650);
  }, [startTour]);

  const finishTour = useCallback(async () => {
    setIsActive(false);
    setTargetRect(undefined);
    await completeAppTour();
  }, []);

  // İlk açılışta (tamamlanmamışsa) turu otomatik başlat.
  useEffect(() => {
    if (checkedStartup.current || pathname === "/onboarding") return;
    checkedStartup.current = true;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    hasCompletedAppTour()
      .then((completed) => {
        if (cancelled || completed) return;
        timer = setTimeout(() => { if (!cancelled) startTour(); }, 650);
      })
      .catch(() => {});

    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [pathname, startTour]);

  // Adımın ekranında değilsek o ekrana götür (geri/ileri sonrası düzeltici).
  useEffect(() => {
    if (!step || pathname === "/onboarding") return;
    const targetRoute = normalizePath(step.route);
    if (pathname !== targetRoute) navigateTo(targetRoute);
  }, [pathname, step]);

  // Hedefi ölç — gerekirse fold dışındaki hedefi scroll ile görünür yap, sonra ölç.
  useEffect(() => {
    if (!step) return;
    let cancelled = false;
    setTargetRect(undefined);

    if (!step.targetId) {
      setTargetRect(null);
      return () => { cancelled = true; };
    }

    const { height } = Dimensions.get("window");

    const tryMeasure = async (attempt: number): Promise<void> => {
      if (cancelled || !step.targetId) return;
      const handle = targets.current.get(step.targetId);
      const rect = (await handle?.measure()) ?? null;
      if (cancelled) return;

      if (isUsableRect(rect)) {
        // Hedef rahat görünür bantta değilse (çok yukarı / fold altında),
        // ilgili ekranın scroll'unu hedef üst-üçte bir gelecek şekilde kaydır.
        const scroller = scrollers.current.get(pathname);
        const desiredY = 170;
        const tooHigh = rect.y < 100;
        const tooLow = rect.y + rect.height > height - 285;
        if (scroller && (tooHigh || tooLow) && attempt < 3) {
          const delta = rect.y - desiredY;
          if (Math.abs(delta) > 50) {
            scroller.scrollBy(delta);
            setTimeout(() => { void tryMeasure(attempt + 1); }, 420);
            return;
          }
        }
        setTargetRect(rect);
        return;
      }

      if (attempt < 5) {
        setTimeout(() => { void tryMeasure(attempt + 1); }, attempt === 0 ? 140 : 240);
      } else {
        setTargetRect(null);
      }
    };

    const handle = InteractionManager.runAfterInteractions(() => { void tryMeasure(0); });
    return () => { cancelled = true; handle.cancel?.(); };
  }, [step, pathname]);

  const goNext = useCallback(() => {
    if (!step) return;
    if (step.action === "finish" || stepIndex >= APP_TOUR_STEPS.length - 1) {
      void finishTour();
      return;
    }
    const next = stepIndex + 1;
    setStepIndex(next);
    navigateTo(APP_TOUR_STEPS[next].route);
  }, [finishTour, step, stepIndex]);

  const goBack = useCallback(() => {
    if (stepIndex <= 0) return;
    const prev = stepIndex - 1;
    setStepIndex(prev);
    navigateTo(APP_TOUR_STEPS[prev].route);
  }, [stepIndex]);

  const value = useMemo<AppTourContextValue>(() => ({
    isActive,
    restartTour,
    registerTarget,
    unregisterTarget,
    registerScroller,
    unregisterScroller,
  }), [isActive, restartTour, registerTarget, unregisterTarget, registerScroller, unregisterScroller]);

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
  const ref = useRef<View>(null);

  const measure = useCallback(() => new Promise<TargetRect | null>((resolve) => {
    const node = ref.current as unknown as {
      measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void;
    } | null;
    if (!node?.measureInWindow) { resolve(null); return; }
    node.measureInWindow((x, y, width, height) => {
      if (!Number.isFinite(x + y + width + height)) { resolve(null); return; }
      resolve({ x, y, width, height });
    });
  }), []);

  useEffect(() => {
    registerTarget(id, { measure });
    return () => unregisterTarget(id);
  }, [id, measure, registerTarget, unregisterTarget]);

  return { ref, collapsable: false as const };
}

// Ekranın ana ScrollView'ına spread edilir; fold dışı hedefleri tur otomatik
// görünür hale getirebilsin diye scroll yeteneğini kaydeder.
export function useTourScroller() {
  const { registerScroller, unregisterScroller } = useAppTour();
  const pathname = normalizePath(usePathname());
  const ref = useRef<ScrollView>(null);
  const offset = useRef(0);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = e.nativeEvent.contentOffset.y;
  }, []);

  const scrollBy = useCallback((delta: number) => {
    ref.current?.scrollTo({ y: Math.max(0, offset.current + delta), animated: true });
  }, []);

  useEffect(() => {
    registerScroller(pathname, { scrollBy });
    return () => unregisterScroller(pathname);
  }, [pathname, scrollBy, registerScroller, unregisterScroller]);

  return { ref, onScroll, scrollEventThrottle: 32 };
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
  const { width, height } = Dimensions.get("window");
  const hasTarget = isUsableRect(targetRect ?? null);

  // Hedef dikdörtgeni (pad'li, ekran içine sıkıştırılmış).
  const spot = hasTarget
    ? {
        x: clamp(targetRect!.x - SPOT_PAD, 6, width - 40),
        y: clamp(targetRect!.y - SPOT_PAD, insets.top + 2, height - 40),
        w: clamp(targetRect!.width + SPOT_PAD * 2, 36, width - 12),
        h: clamp(targetRect!.height + SPOT_PAD * 2, 36, height - insets.top - insets.bottom),
      }
    : null;

  // Pozisyon DOĞRUDAN ölçümden (animasyon yok → her zaman doğru yer).
  // Yeni adımda tüm overlay yumuşak fade-in olur.
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [fade, step.id]);

  // Kart konumu — gerçek yükseklik ölçülür (sihirli sayı yok).
  const [cardH, setCardH] = useState(0);
  const cardWidth = Math.min(width - CARD_MARGIN * 2, 360);
  const cardLeft = CARD_MARGIN;
  const ch = cardH || 210;

  let cardTop: number;
  let arrowSide: "up" | "down" | null = null;
  if (step.placement === "center" || !spot) {
    cardTop = clamp(height * 0.3, insets.top + 60, height - insets.bottom - ch - 16);
  } else {
    const below = spot.y + spot.h + ARROW + 6;
    const above = spot.y - ch - ARROW - 6;
    const fitsBelow = below + ch < height - insets.bottom - 12;
    const fitsAbove = above > insets.top + 12;
    if (step.placement === "top" && fitsAbove) { cardTop = above; arrowSide = "down"; }
    else if (fitsBelow) { cardTop = below; arrowSide = "up"; }
    else if (fitsAbove) { cardTop = above; arrowSide = "down"; }
    else { cardTop = clamp(height * 0.3, insets.top + 60, height - insets.bottom - ch - 16); }
  }

  const targetCenterX = spot ? spot.x + spot.w / 2 : width / 2;
  const arrowLeft = clamp(targetCenterX - cardLeft - ARROW, 18, cardWidth - 18 - ARROW * 2);

  const nextLabel = step.action === "finish" || stepIndex === totalSteps - 1
    ? "Uygulamayı Keşfet"
    : step.action === "navigate"
      ? "Devam Et"
      : "Devam";

  const dimColor = "rgba(5, 10, 20, 0.55)";

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, { opacity: fade }]} pointerEvents="box-none">
      {/* Üniform karartma — dikdörtgen highlight kaldırıldı; hedefi ok + kart gösterir. */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: dimColor }]} pointerEvents="none" />

      <View
        onLayout={(e) => setCardH(e.nativeEvent.layout.height)}
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
        {/* Hedefe işaret eden ok (beak) */}
        {arrowSide ? (
          <View
            pointerEvents="none"
            style={[
              styles.arrow,
              {
                left: arrowLeft,
                backgroundColor: c.card,
                borderColor: c.isDark ? "rgba(16,185,129,0.5)" : "rgba(5,150,105,0.35)",
                ...(arrowSide === "up"
                  ? { top: -ARROW + 1, borderTopWidth: 1, borderLeftWidth: 1 }
                  : { bottom: -ARROW + 1, borderBottomWidth: 1, borderRightWidth: 1 }),
              },
            ]}
          />
        ) : null}

        <View style={styles.cardHeader}>
          <Text style={[styles.kicker, { color: c.accent }]}>{stepIndex + 1}/{totalSteps}</Text>
          <TouchableOpacity onPress={onSkip} hitSlop={10} accessibilityRole="button" accessibilityLabel="Rehberi geç">
            <Text style={[styles.skipText, { color: c.textMuted }]}>Geç</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.title, { color: c.text }]}>{step.title}</Text>
        <Text style={[styles.description, { color: c.textSecondary }]}>{step.description}</Text>
        {targetRect === null && step.targetId ? (
          <Text style={[styles.fallbackText, { color: c.textMuted }]}>
            Bu alan şu an ölçülemedi; anlatıma güvenle devam edebilirsin.
          </Text>
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
  arrow: {
    position: "absolute",
    width: ARROW * 2,
    height: ARROW * 2,
    transform: [{ rotate: "45deg" }],
    borderRadius: 3,
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
