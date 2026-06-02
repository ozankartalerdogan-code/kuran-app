import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import * as Sentry from "@sentry/react-native";
import React, { Component, type ErrorInfo, type ReactNode, useState, useEffect } from "react";
import ErrorFallback from "../src/components/ErrorFallback";
import { AppSplash } from "../src/components/AppSplash";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? "",
  enabled: !__DEV__,            // dev modda kapalı
  tracesSampleRate: 0.2,        // %20 performans izleme
  environment: __DEV__ ? "development" : "production",
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
      <Stack>
        <Stack.Screen name="(tabs)"                         options={{ headerShown: false }} />
        <Stack.Screen name="surah/[id]"                     options={{ headerShown: false }} />
        <Stack.Screen name="ayah/[surahId]/[ayahNumber]"    options={{ headerShown: false }} />
        <Stack.Screen name="ogren/index"                           options={{ title: "Elif-Ba Öğren", headerBackTitle: "Geri" }} />
        <Stack.Screen name="ogren/[dersId]"                       options={{ headerBackTitle: "Dersler" }} />
        <Stack.Screen name="ibadet-rehberi"                  options={{ title: "İbadet Rehberi", headerBackTitle: "Geri" }} />
        <Stack.Screen name="namaz"                          options={{ title: "Namaz & İbadet", headerBackTitle: "Geri" }} />
        <Stack.Screen name="manevi-siginak"                 options={{ title: "Manevi Sığınak", headerBackTitle: "Geri" }} />
        <Stack.Screen name="manevi-siginak/ismi-azam"       options={{ title: "İsmi Azam & Sekine", headerBackTitle: "Geri" }} />
        <Stack.Screen name="search"                         options={{ title: "Arama", headerBackTitle: "Geri" }} />
        <Stack.Screen name="mushaf/index"                         options={{ title: "Mushaf", headerBackTitle: "Geri", headerShown: false }} />
        <Stack.Screen name="mushaf/[surahId]/[ayahNumber]"        options={{ headerBackTitle: "Mushaf", headerShown: false }} />
        <Stack.Screen name="root/index"                           options={{ title: "Kelime Kökleri", headerBackTitle: "Geri" }} />
        <Stack.Screen name="root/[root]/index"                    options={{ headerBackTitle: "Kökler" }} />
        <Stack.Screen name="kible"                                options={{ title: "Kıble Yönü", headerBackTitle: "Geri" }} />
        <Stack.Screen name="hatim"                                options={{ title: "Hatim & Mushaf", headerBackTitle: "Geri" }} />
        <Stack.Screen name="kesfet"                               options={{ title: "Keşfet", headerBackTitle: "Geri" }} />
      </Stack>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Native splash gizle
    const timer = setTimeout(async () => {
      await SplashScreen.hideAsync();
      setReady(true);
    }, 1500);

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
      clearTimeout(timer);
      sub.remove();
    };
  }, []);

  if (!ready) return <AppSplash />;

  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
