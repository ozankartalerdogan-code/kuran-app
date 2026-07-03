import { Stack, router, useNavigationContainerRef } from "expo-router";
import { maybeAskReview } from '../src/hooks/useStoreReview';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import * as Font from "expo-font";
import React, { Component, type ErrorInfo, type ReactNode, useState, useEffect, useCallback } from "react";
import ErrorFallback from "../src/components/ErrorFallback";
import { AppSplash } from "../src/components/AppSplash";
import { AppTourProvider } from "../src/tour/AppTourProvider";

type NavigationIntegration = { registerNavigationContainer: (ref: unknown) => void };
type SentryLike = {
  init: (options: Record<string, unknown>) => void;
  captureException: (error: unknown, context?: Record<string, unknown>) => void;
  wrap: <T>(component: T) => T;
  reactNavigationIntegration: (options?: Record<string, unknown>) => NavigationIntegration;
};

// Gerçek @sentry/react-native native modüldür; yeni build gelene kadar (Expo Go
// veya Sentry'siz build) require başarısız olabilir → no-op stub'a düşer,
// uygulama çökmez (geri dönüşlü / build-gated).
let Sentry: SentryLike;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Sentry = require("@sentry/react-native");
} catch {
  Sentry = {
    init: () => {},
    captureException: () => {},
    wrap: (component) => component,
    reactNavigationIntegration: () => ({ registerNavigationContainer: () => {} }),
  };
}

// Sentry'nin otomatik expo-router algılaması (expoRouterIntegration), bu expo-router
// sürümünün store'unu Sentry.init() anında (React ağacı kurulmadan önce) senkron
// okuyor → navigationRef henüz boş, "incompatible" uyarısı verip pes ediyor (bilinen
// üçüncü parti zamanlama sorunu). Bunun yerine navigasyon entegrasyonunu kendimiz
// oluşturup, RootLayout mount olduktan SONRA (navigationRef gerçekten dolmuşken)
// elle kaydediyoruz — aynı navigasyon breadcrumb/performans takibini sağlar.
const navigationIntegration = Sentry.reactNavigationIntegration();

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  debug: __DEV__,
  environment: __DEV__ ? 'development' : 'production',
  tracesSampleRate: 0.2,
  integrations: [navigationIntegration],
  // DSN yoksa (env eksik) tamamen kapalı kalsın — boşa init olmasın.
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
});

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(error, errorInfo);
    Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      return <ErrorFallback error={this.state.error} resetError={this.handleReset} />;
    }

    return this.props.children;
  }
}

function AppContent() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <AppTourProvider>
      <Stack initialRouteName="(tabs)">
        <Stack.Screen name="(tabs)"                         options={{ headerShown: false }} />
        <Stack.Screen name="surah/[id]"                     options={{ headerBackTitle: "Geri" }} />
        <Stack.Screen name="ayah/[surahId]/[ayahNumber]"    options={{ headerShown: false }} />
        <Stack.Screen name="surah/[surahId]/ayah/[ayahNumber]" options={{ headerShown: false }} />
        <Stack.Screen name="tafsir/[surahId]"               options={{ headerBackTitle: "Geri" }} />
        <Stack.Screen name="ogren/index"                           options={{ title: "Elif-Ba Öğren", headerBackTitle: "Geri" }} />
        <Stack.Screen name="elifba"                                options={{ title: "Elif-Ba Öğren", headerBackTitle: "Geri" }} />
        <Stack.Screen name="ogren/[dersId]"                       options={{ headerBackTitle: "Dersler" }} />
        <Stack.Screen name="ibadet-rehberi"                  options={{ title: "İbadet Rehberi", headerBackTitle: "Geri" }} />
        <Stack.Screen name="namaz"                          options={{ title: "Namaz & İbadet", headerBackTitle: "Geri" }} />
        <Stack.Screen name="bildirimler"                    options={{ title: "Bildirimler", headerBackTitle: "Geri" }} />
        <Stack.Screen name="manevi-siginak"                 options={{ title: "Manevi Sığınak", headerBackTitle: "Geri" }} />
        <Stack.Screen name="manevi-siginak/ismi-azam"       options={{ title: "İsmi Azam ve Sekine", headerBackTitle: "Geri" }} />
        <Stack.Screen name="search"                         options={{ title: "Arama", headerBackTitle: "Geri" }} />
        <Stack.Screen name="mushaf/index"                         options={{ title: "Mushaf", headerBackTitle: "Geri", headerShown: false }} />
        <Stack.Screen name="mushaf/[surahId]/[ayahNumber]"        options={{ headerBackTitle: "Mushaf", headerShown: false }} />
        <Stack.Screen name="root/index"                           options={{ title: "Kelime Kökleri", headerBackTitle: "Geri" }} />
        <Stack.Screen name="root/[root]/index"                    options={{ headerBackTitle: "Kökler" }} />
        <Stack.Screen name="kible"                                options={{ title: "Kıble Yönü", headerBackTitle: "Geri" }} />
        <Stack.Screen name="hatim"                                options={{ title: "Hatim & Mushaf", headerBackTitle: "Geri" }} />
        <Stack.Screen name="kesfet"                               options={{ title: "Keşfet", headerBackTitle: "Geri" }} />
        <Stack.Screen name="siyer"                                options={{ title: "Siyer-i Nebî", headerBackTitle: "Geri" }} />
        <Stack.Screen name="peygamber-kissalari"                  options={{ title: "Peygamber Kıssaları", headerBackTitle: "Geri" }} />
        <Stack.Screen name="mubarek-gunler"                       options={{ title: "Mübarek Gün ve Geceler", headerBackTitle: "Geri" }} />
        <Stack.Screen name="hadisler"                             options={{ title: "Hadisler", headerBackTitle: "Geri" }} />

        <Stack.Screen name="sure-listesi"                         options={{ title: "Sure Listesi", headerBackTitle: "Geri" }} />
        <Stack.Screen name="favoriler"                           options={{ title: "Favorilerim", headerBackTitle: "Geri" }} />
        <Stack.Screen name="notlar"                              options={{ title: "Notlarım", headerBackTitle: "Geri" }} />
        <Stack.Screen name="ne-ogreneyim"                        options={{ headerShown: false }} />
        <Stack.Screen name="hakkinda"                            options={{ headerShown: false }} />
        <Stack.Screen name="elifba-dersleri"                     options={{ title: "Elif-Ba Öğren", headerBackTitle: "Geri" }} />
        <Stack.Screen name="namaz-rehberi"                       options={{ headerShown: false }} />
        <Stack.Screen name="dualar"                              options={{ title: "Dualar ve Zikirler", headerBackTitle: "Geri" }} />
        <Stack.Screen name="esma"                                options={{ title: "Esmaül Hüsna", headerBackTitle: "Geri" }} />
        <Stack.Screen name="ogren/harf-i-tarif"                  options={{ title: "Harf-i Tarif", headerBackTitle: "Geri" }} />
      </Stack>
      </AppTourProvider>
    </SafeAreaProvider>
  );
}

function RootLayout() {
  const [videoFinished, setVideoFinished] = useState(false);
  const [fontsLoaded] = Font.useFonts({
    "Amiri":      require("../assets/fonts/Amiri-Regular.ttf"),
    "Amiri-Bold": require("../assets/fonts/Amiri-Bold.ttf"),
  });
  const navigationRef = useNavigationContainerRef();

  const ready = videoFinished && !!fontsLoaded;

  const handleSplashFinish = useCallback(() => {
    setVideoFinished(true);
  }, []);

  // Sentry'nin otomatik expo-router algılaması bu sürümde çalışmıyor (yukarıdaki
  // yorum) — navigationRef burada, ağaç kurulduktan sonra, dolu haliyle elle
  // kaydediliyor.
  useEffect(() => {
    navigationIntegration.registerNavigationContainer(navigationRef);
  }, [navigationRef]);

  // Native splash'i mount'ta hemen kaldır — altındaki animasyonlu AppSplash görünsün.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    maybeAskReview();
  }, []);

  useEffect(() => {
    // Bildirime tıklanınca ilgili ekrana git (uygulama hazır olduktan sonra)
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      setTimeout(() => {
        if (data?.surahId && data?.ayahNumber) {
          router.push(`/ayah/${data.surahId}/${data.ayahNumber}` as any);
        } else if (data?.route) {
          router.push(data.route as any);
        }
      }, 500); // Stack mount'u için kısa bekleme
    });

    return () => {
      sub.remove();
    };
  }, []);

  if (!ready) return <AppSplash onFinish={handleSplashFinish} />;

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
      gcTime: 30 * 60 * 1000,
    },
  },
});

export default Sentry.wrap(RootLayout);
